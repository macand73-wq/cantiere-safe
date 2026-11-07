import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveSopralluogoDraft,
  loadSopralluogoDraft,
  clearSopralluogoDraft,
  sopralluogoDraftKey,
  serializeSopralluogoDraft,
  DRAFT_MAX_AGE_MS,
  DRAFT_VERSION,
  type SopralluogoDraftState,
} from '../draft'
import { cloneChecklist, checklistForLuogo } from '../checklist'

function state(overrides: Partial<SopralluogoDraftState> = {}): SopralluogoDraftState {
  return {
    azienda: 'Azienda S.p.A.',
    cantiereId: 'c1',
    indirizzo: 'Via Roma 1',
    rspp: 'Mario Rossi',
    luogo: 'cantiere',
    data: '2026-11-07',
    rischioGenerale: 'medio',
    noteLibere: 'nota',
    checklist: cloneChecklist(checklistForLuogo('cantiere')),
    generalPhotos: [],
    ...overrides,
  }
}

describe('draft persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips scalars, checklist and persisted filenames', () => {
    const s = state()
    s.checklist[0].valore = 'NO'
    s.checklist[0].commento = 'elmetto assente'
    s.checklist[0].foto = [{ clientId: 'a1', filename: 'a1_x.jpg' }]
    s.generalPhotos = [{ clientId: 'g1', filename: 'g1_y.jpg' }]

    saveSopralluogoDraft('rec1', s)
    const restored = loadSopralluogoDraft('rec1')

    expect(restored).not.toBeNull()
    expect(restored?.azienda).toBe('Azienda S.p.A.')
    expect(restored?.cantiereId).toBe('c1')
    expect(restored?.luogo).toBe('cantiere')
    expect(restored?.data).toBe('2026-11-07')
    expect(restored?.checklist[0]).toMatchObject({
      id: s.checklist[0].id,
      valore: 'NO',
      commento: 'elmetto assente',
      foto: [{ clientId: 'a1', filename: 'a1_x.jpg' }],
    })
    expect(restored?.generalPhotos).toEqual([{ clientId: 'g1', filename: 'g1_y.jpg' }])
  })

  it('drops pending File entries (no filename) on round-trip', () => {
    const s = state()
    s.checklist[0].foto = [{ clientId: 'pending1', file: new File(['x'], 'x.jpg') }]
    s.generalPhotos = [{ clientId: 'pending2', file: new File(['y'], 'y.jpg') }]

    saveSopralluogoDraft('rec1', s)
    const restored = loadSopralluogoDraft('rec1')

    expect(restored?.checklist[0].foto).toEqual([])
    expect(restored?.generalPhotos).toEqual([])
  })

  it('ignores malformed JSON', () => {
    localStorage.setItem(sopralluogoDraftKey('rec1'), '{not json')
    expect(loadSopralluogoDraft('rec1')).toBeNull()
  })

  it('ignores a version mismatch', () => {
    localStorage.setItem(
      sopralluogoDraftKey('rec1'),
      JSON.stringify({ v: DRAFT_VERSION + 1, savedAt: Date.now(), id: 'rec1', state: {} }),
    )
    expect(loadSopralluogoDraft('rec1')).toBeNull()
  })

  it('ignores a draft older than the retention window', () => {
    saveSopralluogoDraft('rec1', state())
    const old = loadSopralluogoDraft('rec1', Date.now() + DRAFT_MAX_AGE_MS + 1)
    expect(old).toBeNull()
  })

  it('ignores a draft whose record id does not match the requested id', () => {
    saveSopralluogoDraft('rec1', state())
    // Same key, but the payload was written for another record: must not restore.
    const key = sopralluogoDraftKey('rec1')
    const existing = JSON.parse(localStorage.getItem(key) as string)
    existing.id = 'rec2'
    localStorage.setItem(key, JSON.stringify(existing))
    expect(loadSopralluogoDraft('rec1')).toBeNull()
  })

  it('clearing removes the key and makes load return null', () => {
    saveSopralluogoDraft('rec1', state())
    clearSopralluogoDraft('rec1')
    expect(localStorage.getItem(sopralluogoDraftKey('rec1'))).toBeNull()
    expect(loadSopralluogoDraft('rec1')).toBeNull()
  })

  it('serializeSopralluogoDraft is stable and File-free', () => {
    const s = state()
    s.generalPhotos = [{ clientId: 'g1', file: new File(['x'], 'x.jpg') }]
    const a = serializeSopralluogoDraft(s)
    const b = serializeSopralluogoDraft(state())
    expect(a).toBe(b)
    expect(a).not.toContain('x.jpg')
  })
})
