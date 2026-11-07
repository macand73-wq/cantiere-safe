import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import * as api from '../../api/auth'
import type { Profile } from '../../types'

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  currentUser: vi.fn(),
  onAuthChange: vi.fn(),
  loginWithGoogle: vi.fn(),
  resetPassword: vi.fn(),
}))

const profile: Profile = {
  id: 'user-1',
  email: 'test@example.com',
  verified: false,
  created: '2026-11-07 10:00:00.000Z',
  updated: '2026-11-07 10:00:00.000Z',
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('auth store', () => {
  it('login calls api.login and sets user', async () => {
    vi.mocked(api.login).mockResolvedValue(profile)

    await useAuthStore().login('test@example.com', 'secret')

    expect(api.login).toHaveBeenCalledWith('test@example.com', 'secret')
    expect(useAuthStore().user).toEqual(profile)
  })

  it('failed login leaves user null and propagates the error', async () => {
    vi.mocked(api.login).mockRejectedValue(new Error('bad credentials'))

    const store = useAuthStore()
    await expect(store.login('test@example.com', 'wrong')).rejects.toThrow('bad credentials')
    expect(store.user).toBeNull()
  })

  it('logout clears the user', () => {
    const store = useAuthStore()
    store.user = profile

    store.logout()

    expect(store.user).toBeNull()
    expect(api.logout).toHaveBeenCalledOnce()
  })
})
