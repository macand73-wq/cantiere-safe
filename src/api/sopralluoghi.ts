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

// Serializes a draft item to the persisted shape. Pending photos keep their
// client id as a placeholder that `saveSopralluogo` resolves after upload.
function itemForServer(item: ChecklistItemDraft): ChecklistItem {
  return {
    id: item.id,
    testo: item.testo,
    categoria: item.categoria,
    ...(item.personalizzabile ? { personalizzabile: true } : {}),
    valore: item.valore,
    commento: item.commento,
    foto: item.foto.map((p) => p.filename ?? p.clientId),
    nascosta: item.nascosta,
  }
}

// Creates or updates a sopralluogo with its photos. PocketBase replaces the
// file selection on update unless existing filenames are re-submitted, and it
// appends a random suffix to uploaded names, so the path here:
//  1. sends existing filenames plus renamed new Files (one shared `foto` list),
//  2. maps returned filenames back to their owners by a deterministic prefix,
//  3. re-saves the checklist with the resolved filenames when new photos exist.
export async function saveSopralluogo(draft: SopralluogoDraft): Promise<Sopralluogo> {
  const ordered = [...draft.generalPhotos, ...draft.checklist.flatMap((i) => i.foto)]

  const fotoField: Array<string | File> = ordered.map((p) =>
    p.file ? new File([p.file], uploadName(p.clientId), { type: p.file.type }) : (p.filename as string),
  )

  const checklist = draft.checklist.map(itemForServer)

  const body: SopralluogoInput = {
    ...draft.fields,
    cantiere: draft.fields.cantiere || undefined,
    checklist,
    foto: fotoField,
  }

  const record = draft.id
    ? await updateSopralluogo(draft.id, body)
    : await createSopralluogo(body)

  const newIds = ordered.filter((p) => p.file).map((p) => p.clientId)
  if (newIds.length === 0) return record

  const resolved = matchUploadedFilenames(record.foto, newIds)
  const resolvedChecklist = checklist.map((item) => ({
    ...item,
    foto: item.foto.map((key) => resolved.get(key) ?? key),
  }))

  return updateSopralluogo(record.id, { checklist: resolvedChecklist, foto: record.foto })
}
