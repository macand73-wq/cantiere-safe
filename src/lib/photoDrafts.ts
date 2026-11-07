// IndexedDB-backed recovery for pending camera photos in a sopralluogo draft.
// A phone may discard the tab around the camera intent; localStorage cannot hold
// File bytes, so the blob is kept here and re-attached to the draft's clientId
// slot on restore. Framework-free: no Vue, no PocketBase SDK.
//
// Every function resolves without throwing: IndexedDB can be unavailable
// (private mode) or fail (quota), and recovery must never break the form. Any
// failure surfaces as an empty load, a no-op sync, and so on.

import type { PhotoDraft } from './photos'

const DB_NAME = 'cantiere-safe'
const DB_VERSION = 1
const STORE = 'photo-drafts'
const INDEX = 'by-draftKey'

interface StoredPhotoDraft {
  key: string
  draftKey: string
  clientId: string
  name: string
  type: string
  blob: Blob
  savedAt: number
}

export interface RestoredPendingPhoto {
  clientId: string
  file: File
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' })
        store.createIndex(INDEX, 'draftKey', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
  })
}

// Runs a readwrite transaction that first reads the draftKey's records and then
// mutates the store inside `all.onsuccess`, keeping all requests within one
// transaction (no awaited gaps that would auto-commit it).
function mutateAll(
  db: IDBDatabase,
  draftKey: string,
  apply: (recs: StoredPhotoDraft[], store: IDBObjectStore) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const all = store.index(INDEX).getAll(draftKey)
    all.onsuccess = () => apply(all.result as StoredPhotoDraft[], store)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'))
  })
}

export async function syncPendingPhotos(
  draftKey: string,
  photos: PhotoDraft[],
): Promise<void> {
  try {
    const db = await openDb()
    try {
      const byClientId = new Map(photos.map((p) => [p.clientId, p]))
      await mutateAll(db, draftKey, (recs, store) => {
        const existing = new Map(recs.map((r) => [r.clientId, r]))
        for (const rec of recs) {
          const p = byClientId.get(rec.clientId)
          // Remove the record when the photo left the form, or once it has been
          // persisted (filename set, file cleared): a stale blob must never
          // re-attach over a filename on restore.
          if (!p || (p.filename && !p.file)) store.delete(rec.key)
        }
        for (const p of photos) {
          if (!p.file) continue
          // Blobs are immutable per clientId: keep the existing record (and its
          // original savedAt) instead of re-writing it on every persist.
          if (existing.has(p.clientId)) continue
          const record: StoredPhotoDraft = {
            key: `${draftKey}:${p.clientId}`,
            draftKey,
            clientId: p.clientId,
            name: p.file.name,
            type: p.file.type,
            blob: p.file,
            savedAt: Date.now(),
          }
          store.put(record)
        }
      })
    } finally {
      db.close()
    }
  } catch {
    // best-effort
  }
}

export async function loadPendingPhotos(draftKey: string): Promise<RestoredPendingPhoto[]> {
  try {
    const db = await openDb()
    try {
      const recs = await new Promise<StoredPhotoDraft[]>((resolve, reject) => {
        const all = db.transaction(STORE, 'readonly').objectStore(STORE).index(INDEX).getAll(draftKey)
        all.onsuccess = () => resolve(all.result as StoredPhotoDraft[])
        all.onerror = () => reject(all.error ?? new Error('indexedDB load failed'))
      })
      return recs.map((r) => ({
        clientId: r.clientId,
        file: new File([r.blob], r.name, { type: r.type }),
      }))
    } finally {
      db.close()
    }
  } catch {
    return []
  }
}

export async function clearPendingPhotos(draftKey: string): Promise<void> {
  try {
    const db = await openDb()
    try {
      await mutateAll(db, draftKey, (recs, store) => {
        for (const rec of recs) store.delete(rec.key)
      })
    } finally {
      db.close()
    }
  } catch {
    // best-effort
  }
}

export async function prunePendingPhotos(maxAgeMs: number): Promise<void> {
  try {
    const db = await openDb()
    try {
      await new Promise<void>((resolve, reject) => {
        const cutoff = Date.now() - maxAgeMs
        const tx = db.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        const all = store.getAll()
        all.onsuccess = () => {
          for (const rec of all.result as StoredPhotoDraft[]) {
            if (rec.savedAt < cutoff) store.delete(rec.key)
          }
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('prune failed'))
        tx.onabort = () => reject(tx.error ?? new Error('prune aborted'))
      })
    } finally {
      db.close()
    }
  } catch {
    // best-effort
  }
}
