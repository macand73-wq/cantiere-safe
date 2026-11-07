// Durable draft persistence for the sopralluogo form: crash recovery only, no
// offline queue, no server sync. The state lives in localStorage under a key
// per record context so a reload (or a mobile browser discarding the tab around
// the camera intent) can restore it.
//
// Framework-free: no Vue, no PocketBase SDK. Only `localStorage` is touched.
//
// Pending `File` objects cannot be serialized, so they are dropped on save; a
// restored draft keeps only already-persisted filenames (edit-mode photos).

import type { ChecklistItemDraft, Luogo } from './checklist'
import type { PhotoDraft } from './photos'

export const DRAFT_VERSION = 1
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// The serializable form state. Mirrors the view's refs: scalars, the full
// checklist drafts and the general photos.
export interface SopralluogoDraftState {
  azienda: string
  cantiereId: string
  indirizzo: string
  rspp: string
  luogo: Luogo
  data: string
  rischioGenerale: string
  noteLibere: string
  checklist: ChecklistItemDraft[]
  generalPhotos: PhotoDraft[]
}

// Key per context: `sopralluogo-draft:new` for create, `...:<recordId>` for edit.
export function sopralluogoDraftKey(id: string): string {
  return `sopralluogo-draft:${id}`
}

interface StoredPhoto {
  clientId: string
  filename: string
}

interface StoredItem {
  id: string
  testo: string
  categoria: string
  personalizzabile?: boolean
  valore: 'SI' | 'NO' | 'NA'
  commento: string
  nascosta: boolean
  foto: StoredPhoto[]
}

interface StoredState {
  azienda: string
  cantiereId: string
  indirizzo: string
  rspp: string
  luogo: string
  data: string
  rischioGenerale: string
  noteLibere: string
  checklist: StoredItem[]
  generalPhotos: StoredPhoto[]
}

function normalizePhoto(p: PhotoDraft): StoredPhoto | null {
  // A pending File has no filename yet and cannot be serialized: drop it.
  return p.filename ? { clientId: p.clientId, filename: p.filename } : null
}

function normalizeItem(item: ChecklistItemDraft): StoredItem {
  return {
    id: item.id,
    testo: item.testo,
    categoria: item.categoria,
    ...(item.personalizzabile ? { personalizzabile: true } : {}),
    valore: item.valore,
    commento: item.commento,
    nascosta: item.nascosta,
    foto: item.foto.map(normalizePhoto).filter((p): p is StoredPhoto => p !== null),
  }
}

function normalizeState(state: SopralluogoDraftState): StoredState {
  return {
    azienda: state.azienda,
    cantiereId: state.cantiereId,
    indirizzo: state.indirizzo,
    rspp: state.rspp,
    luogo: state.luogo,
    data: state.data,
    rischioGenerale: state.rischioGenerale,
    noteLibere: state.noteLibere,
    checklist: state.checklist.map(normalizeItem),
    generalPhotos: state.generalPhotos
      .map(normalizePhoto)
      .filter((p): p is StoredPhoto => p !== null),
  }
}

// Deterministic, File-free JSON of the state. The view uses it as a baseline so
// it never writes (or restores) a draft that equals the pristine/loaded form.
export function serializeSopralluogoDraft(state: SopralluogoDraftState): string {
  return JSON.stringify(normalizeState(state))
}

export function saveSopralluogoDraft(id: string, state: SopralluogoDraftState): void {
  localStorage.setItem(
    sopralluogoDraftKey(id),
    JSON.stringify({ v: DRAFT_VERSION, savedAt: Date.now(), id, state: normalizeState(state) }),
  )
}

export function clearSopralluogoDraft(id: string): void {
  localStorage.removeItem(sopralluogoDraftKey(id))
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function asLuogo(v: unknown): Luogo {
  return v === 'azienda' || v === 'edificio' || v === 'cantiere' ? v : 'cantiere'
}

function restorePhotos(v: unknown): PhotoDraft[] {
  if (!Array.isArray(v)) return []
  const out: PhotoDraft[] = []
  for (const raw of v) {
    if (typeof raw !== 'object' || raw === null) continue
    const { clientId, filename } = raw as { clientId?: unknown; filename?: unknown }
    if (typeof clientId !== 'string' || typeof filename !== 'string') continue
    out.push({ clientId, filename })
  }
  return out
}

function restoreChecklist(v: unknown): ChecklistItemDraft[] {
  if (!Array.isArray(v)) return []
  const out: ChecklistItemDraft[] = []
  for (const raw of v) {
    if (typeof raw !== 'object' || raw === null) continue
    const item = raw as Record<string, unknown>
    if (typeof item.id !== 'string') continue
    out.push({
      id: item.id,
      testo: asString(item.testo),
      categoria: asString(item.categoria),
      ...(item.personalizzabile ? { personalizzabile: true } : {}),
      valore: item.valore === 'SI' || item.valore === 'NO' ? item.valore : 'NA',
      commento: asString(item.commento),
      foto: restorePhotos(item.foto),
      nascosta: item.nascosta === true,
    })
  }
  return out
}

// Reads and validates a draft for `id`, returning null (no draft) for malformed
// JSON, a version mismatch, a record id mismatch, or a draft older than the
// retention window. Never throws.
export function loadSopralluogoDraft(
  id: string,
  now: number = Date.now(),
): SopralluogoDraftState | null {
  const raw = localStorage.getItem(sopralluogoDraftKey(id))
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null

  const d = parsed as { v?: unknown; savedAt?: unknown; id?: unknown; state?: unknown }
  if (d.v !== DRAFT_VERSION) return null
  if (typeof d.savedAt !== 'number' || !Number.isFinite(d.savedAt)) return null
  if (now - d.savedAt > DRAFT_MAX_AGE_MS) return null
  if (d.id !== id) return null
  if (typeof d.state !== 'object' || d.state === null) return null

  const s = d.state as Record<string, unknown>
  return {
    azienda: asString(s.azienda),
    cantiereId: asString(s.cantiereId),
    indirizzo: asString(s.indirizzo),
    rspp: asString(s.rspp),
    luogo: asLuogo(s.luogo),
    data: asString(s.data),
    rischioGenerale: asString(s.rischioGenerale),
    noteLibere: asString(s.noteLibere),
    checklist: restoreChecklist(s.checklist),
    generalPhotos: restorePhotos(s.generalPhotos),
  }
}
