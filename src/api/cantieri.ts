import { pb, currentUserId } from './client'
import type { Cantiere, CantiereInput } from '../types'

const COLLECTION = 'cantieri'

// Per-user filtering is enforced server-side by PocketBase collection rules;
// do not add a client-side filter here, it would silently hide records.
export async function listCantieri(): Promise<Cantiere[]> {
  return pb.collection(COLLECTION).getFullList<Cantiere>()
}

export async function getCantiere(id: string): Promise<Cantiere> {
  return pb.collection(COLLECTION).getOne<Cantiere>(id)
}

export async function createCantiere(input: CantiereInput): Promise<Cantiere> {
  return pb.collection(COLLECTION).create<Cantiere>({ ...input, user: currentUserId() })
}

export async function updateCantiere(id: string, input: CantiereInput): Promise<Cantiere> {
  return pb.collection(COLLECTION).update<Cantiere>(id, input)
}

export async function deleteCantiere(id: string): Promise<boolean> {
  return pb.collection(COLLECTION).delete(id)
}
