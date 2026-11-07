import PocketBase from 'pocketbase'

// The only module allowed to import the PocketBase SDK. Everything else in the
// app talks to the thin wrappers in this directory.
const baseUrl: string = import.meta.env.VITE_PB_URL || 'http://127.0.0.1:8090'

export const pb = new PocketBase(baseUrl)

// Id of the signed-in user, required to stamp `user` on created records so no
// view can create a record it cannot later read.
export function currentUserId(): string {
  const id = pb.authStore.model?.id
  if (!id) {
    throw new Error('Not authenticated')
  }
  return id
}
