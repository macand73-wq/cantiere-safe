import { pb, currentUserId } from './client'
import type { Sopralluogo, SopralluogoInput, ChecklistItem } from '../types'
import { uploadName, matchUploadedFilenames, type PhotoDraft } from '../lib/photos'
import type { ChecklistItemDraft } from '../lib/checklist'

const COLLECTION = 'sopralluoghi'

export async function listSopralluoghi(): Promise<Sopralluogo[]> {
  return pb.collection(COLLECTION).getFullList<Sopralluogo>()
}

export async function getSopralluogo(id: string): Promise<Sopralluogo> {
  return pb.collection(COLLECTION).getOne<Sopralluogo>(id)
}

export async function createSopralluogo(input: SopralluogoInput): Promise<Sopralluogo> {
  return pb.collection(COLLECTION).create<Sopralluogo>({ ...input, user: currentUserId() })
}

export async function updateSopralluogo(id: string, input: SopralluogoInput): Promise<Sopralluogo> {
  return pb.collection(COLLECTION).update<Sopralluogo>(id, input)
}

export async function deleteSopralluogo(id: string): Promise<boolean> {
  return pb.collection(COLLECTION).delete(id)
}

// The `foto` field is protected, so a bare /api/files/... URL is a 404. Obtain
// a file token and append it so the URL authorizes against the record's rules.
// Callers consume this instead of importing the SDK.
export async function photoUrl(recordId: string, filename: string): Promise<string> {
  const token = await pb.files.getToken()
  return pb.files.getURL({ id: recordId, collectionName: COLLECTION }, filename, { token })
}

// The form's in-progress state, before the photo filenames are known.
export interface SopralluogoDraft {
  id?: string
  fields: {
    cantiere?: string
    azienda: string
    indirizzo: string
    rspp: string
    luogo: string
    data: string
    rischio_generale: string
    note_libere: string
  }
  checklist: ChecklistItemDraft[]
  generalPhotos: PhotoDraft[]
}

// Serializes a draft item to the persisted shape. Pending uploads map to '' and
// are dropped, so the first round-trip never persists an unresolvable client-id
// placeholder; only already-known filenames are written.
function itemForServer(item: ChecklistItemDraft): ChecklistItem {
  return {
    id: item.id,
    testo: item.testo,
    categoria: item.categoria,
    ...(item.personalizzabile ? { personalizzabile: true } : {}),
    valore: item.valore,
    commento: item.commento,
    foto: item.foto.map((p) => p.filename ?? '').filter(Boolean),
    nascosta: item.nascosta,
  }
}

// Thrown when the finalize update (step 2) fails after the record and its files
// were already written. Carries the record id so the caller can retry as an
// update instead of creating a duplicate.
export class SopralluogoSaveError extends Error {
  constructor(message: string, readonly recordId: string) {
    super(message)
    this.name = 'SopralluogoSaveError'
  }
}

// Creates or updates a sopralluogo with its photos. PocketBase replaces the
// file selection on update unless existing filenames are re-submitted, and it
// appends a random suffix to uploaded names, so the path here:
//  1. writes existing filenames plus renamed new Files, with per-item photo refs
//     left EMPTY (no placeholders),
//  2. maps the returned filenames back to their owners by their unique token,
//  3. mutates the draft's pending photos into persisted filenames so a retry
//     re-submits filenames (not the files), then finalizes the checklist refs.
// A failed step 3 throws SopralluogoSaveError; retry resumes as an update.
export async function saveSopralluogo(draft: SopralluogoDraft): Promise<Sopralluogo> {
  const ordered = [...draft.generalPhotos, ...draft.checklist.flatMap((i) => i.foto)]

  const fotoField: Array<string | File> = ordered.map((p) =>
    p.file ? new File([p.file], uploadName(p.clientId), { type: p.file.type }) : (p.filename as string),
  )

  const body: SopralluogoInput = {
    ...draft.fields,
    cantiere: draft.fields.cantiere || undefined,
    checklist: draft.checklist.map(itemForServer),
    foto: fotoField,
  }

  const record = draft.id
    ? await updateSopralluogo(draft.id, body)
    : await createSopralluogo(body)

  const newIds = ordered.filter((p) => p.file).map((p) => p.clientId)
  if (newIds.length === 0) return record

  const resolved = matchUploadedFilenames(record.foto, newIds)
  for (const id of newIds) {
    if (!resolved.has(id)) throw new Error('photo filename resolution failed')
  }

  // Mark the uploaded photos as persisted in place: these objects are shared
  // with the form state, so a retry rebuilds the draft with filenames and does
  // not re-upload the files.
  for (const p of ordered) {
    if (p.file) {
      p.filename = resolved.get(p.clientId)
      p.file = undefined
    }
  }

  try {
    return await updateSopralluogo(record.id, {
      checklist: draft.checklist.map(itemForServer),
      foto: record.foto,
    })
  } catch (e) {
    throw new SopralluogoSaveError(e instanceof Error ? e.message : String(e), record.id)
  }
}
