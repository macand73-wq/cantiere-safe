/// <reference types="node" />
import 'fake-indexeddb/auto'
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer'
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  syncPendingPhotos,
  loadPendingPhotos,
  clearPendingPhotos,
  prunePendingPhotos,
} from '../photoDrafts'
import type { PhotoDraft } from '../photos'

// happy-dom's File/Blob are not structured-cloneable by fake-indexeddb (they
// collapse to a plain object), which would corrupt the stored bytes. Swap in the
// native Node constructors so the blob survives the round-trip, matching how a
// real browser's IndexedDB handles it.
globalThis.Blob = NodeBlob as unknown as typeof globalThis.Blob
globalThis.File = NodeFile as unknown as typeof globalThis.File

function photo(clientId: string, name = 'p.jpg'): PhotoDraft {
  return { clientId, file: new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' }) }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('photoDrafts', () => {
  it('put/load round-trip preserves name, type and bytes', async () => {
    await syncPendingPhotos('rt1', [photo('c1', 'foto.jpg')])

    const loaded = await loadPendingPhotos('rt1')

    expect(loaded).toHaveLength(1)
    expect(loaded[0].clientId).toBe('c1')
    expect(loaded[0].file.name).toBe('foto.jpg')
    expect(loaded[0].file.type).toBe('image/jpeg')
    expect([...new Uint8Array(await loaded[0].file.arrayBuffer())]).toEqual([1, 2, 3])
  })

  it('sync removes the record of a deleted photo', async () => {
    await syncPendingPhotos('dk1', [photo('a'), photo('b')])
    await syncPendingPhotos('dk1', [photo('a')])

    expect((await loadPendingPhotos('dk1')).map((p) => p.clientId)).toEqual(['a'])
  })

  it('leaves filename-only photos without touching IndexedDB', async () => {
    await syncPendingPhotos('fk1', [
      photo('a'),
      { clientId: 'b', filename: 'b_x.jpg' },
    ])

    expect((await loadPendingPhotos('fk1')).map((p) => p.clientId)).toEqual(['a'])
  })

  it('clear removes only the given draftKey', async () => {
    await syncPendingPhotos('ck1', [photo('a')])
    await syncPendingPhotos('ck2', [photo('b')])

    await clearPendingPhotos('ck1')

    expect(await loadPendingPhotos('ck1')).toEqual([])
    expect((await loadPendingPhotos('ck2')).map((p) => p.clientId)).toEqual(['b'])
  })

  it('prune removes records older than maxAgeMs', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    await syncPendingPhotos('pr1', [photo('a')])

    now.mockReturnValue(1_000_000 + 10_000)
    await prunePendingPhotos(5_000) // cutoff = 1_005_000, a.savedAt = 1_000_000

    expect(await loadPendingPhotos('pr1')).toEqual([])
  })

  it('prune keeps recent records', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    await syncPendingPhotos('pr2', [photo('a')])

    now.mockReturnValue(1_000_000 + 10_000)
    await prunePendingPhotos(60_000) // cutoff = 950_000

    expect((await loadPendingPhotos('pr2')).map((p) => p.clientId)).toEqual(['a'])
  })
})
