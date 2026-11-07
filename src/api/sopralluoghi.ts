import { pb, currentUserId } from './client'
import type { Sopralluogo, SopralluogoInput } from '../types'

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
