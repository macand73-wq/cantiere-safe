import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pb, currentUserId } from '../client'
import { saveSopralluogo, SopralluogoSaveError } from '../sopralluoghi'
import type { SopralluogoDraft } from '../sopralluoghi'
import type { Sopralluogo } from '../../types'

vi.mock('../client', () => ({
  pb: { collection: vi.fn() },
  currentUserId: vi.fn(),
}))

const collection = { create: vi.fn(), update: vi.fn() }

const png = new File(['x'], 'x.png', { type: 'image/png' })

function makeDraft(): SopralluogoDraft {
  return {
    fields: {
      azienda: 'A',
      indirizzo: '',
      rspp: '',
      luogo: 'cantiere',
      data: '',
      rischio_generale: 'medio',
      note_libere: '',
    },
    generalPhotos: [{ clientId: 'tokg', file: png }],
    checklist: [
      {
        id: 'ca01',
        testo: 'checklist.ca01',
        categoria: 'checklist.cat.dpi',
        valore: 'NO',
        commento: '',
        foto: [{ clientId: 'toki', file: png }],
        nascosta: false,
      },
    ],
  }
}

const record: Sopralluogo = {
  id: 'rec1',
  user: 'user-1',
  azienda: 'A',
  indirizzo: '',
  rspp: '',
  luogo: 'cantiere',
  data: '',
  rischio_generale: 'medio',
  note_libere: '',
  checklist: [],
  foto: ['tokg_aaaa111111.jpg', 'toki_bbbb222222.jpg'],
  created: '2026-11-07 10:00:00.000Z',
  updated: '2026-11-07 10:00:00.000Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(pb.collection).mockReturnValue(
    collection as unknown as ReturnType<typeof pb.collection>,
  )
  vi.mocked(currentUserId).mockReturnValue('user-1')
})

describe('saveSopralluogo', () => {
  it('writes empty refs first, then resolves; a step-2 failure surfaces the id for an idempotent retry', async () => {
    collection.create.mockResolvedValueOnce(record)
    collection.update.mockRejectedValueOnce(new Error('boom'))

    const draft = makeDraft()

    let thrown: unknown
    try {
      await saveSopralluogo(draft)
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBeInstanceOf(SopralluogoSaveError)
    expect((thrown as SopralluogoSaveError).recordId).toBe('rec1')

    // The first round-trip persisted empty per-item refs, never a placeholder.
    const createBody = collection.create.mock.calls[0][0]
    expect(createBody.checklist[0].foto).toEqual([])

    // The pending photos were mutated to filenames so a retry does not re-upload.
    expect(draft.generalPhotos[0].file).toBeUndefined()
    expect(draft.generalPhotos[0].filename).toBe('tokg_aaaa111111.jpg')
    expect(draft.checklist[0].foto[0].filename).toBe('toki_bbbb222222.jpg')

    // Retry reuses the record id (update, not create) and succeeds.
    draft.id = 'rec1'
    collection.update.mockResolvedValueOnce({
      ...record,
      checklist: [
        {
          id: 'ca01',
          testo: 'checklist.ca01',
          categoria: 'checklist.cat.dpi',
          valore: 'NO',
          commento: '',
          foto: ['toki_bbbb222222.jpg'],
          nascosta: false,
        },
      ],
    })

    const final = await saveSopralluogo(draft)

    expect(collection.create).toHaveBeenCalledTimes(1)
    expect(final.checklist[0].foto).toEqual(['toki_bbbb222222.jpg'])
    const lastUpdate = collection.update.mock.calls[collection.update.mock.calls.length - 1]
    expect(lastUpdate[0]).toBe('rec1')
  })
})
