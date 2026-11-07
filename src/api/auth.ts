import { pb } from './client'
import type { Profile } from '../types'

const USERS = 'users'

export interface RegisterInput {
  email: string
  password: string
  passwordConfirm: string
  nome: string
  studio: string
}

export async function login(email: string, password: string): Promise<Profile> {
  const { record } = await pb.collection(USERS).authWithPassword<Profile>(email, password)
  return record
}

// Creates the auth record. PocketBase does not return a token from signup, so
// the caller logs in separately afterward.
export async function register(input: RegisterInput): Promise<Profile> {
  return pb.collection(USERS).create<Profile>(input)
}

export function logout(): void {
  pb.authStore.clear()
}

// Blocked on the project owner's Google credentials (no OAuth2 provider is
// configured); wired here so enabling the provider is the only remaining step.
export async function loginWithGoogle(): Promise<Profile> {
  const { record } = await pb.collection(USERS).authWithOAuth2<Profile>({ provider: 'google' })
  return record
}

export async function resetPassword(email: string): Promise<void> {
  await pb.collection(USERS).requestPasswordReset(email)
}

// Subscribes to auth-store changes. Returns an unsubscribe function.
export function onAuthChange(cb: (profile: Profile | null) => void): () => void {
  return pb.authStore.onChange((_token, model) => cb(model as Profile | null))
}

// Reads the persisted session synchronously; null when unauthenticated or the
// token is expired/invalid. The store treats null as logged out.
export function currentUser(): Profile | null {
  return pb.authStore.isValid ? (pb.authStore.model as unknown as Profile) : null
}
