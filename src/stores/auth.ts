import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '../api/auth'
import type { RegisterInput } from '../api/auth'
import type { Profile } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Profile | null>(null)

  async function login(email: string, password: string): Promise<void> {
    user.value = await api.login(email, password)
  }

  // PocketBase's record-create returns no token, so register then log in.
  async function register(input: RegisterInput): Promise<void> {
    await api.register(input)
    await login(input.email, input.password)
  }

  function logout(): void {
    api.logout()
    user.value = null
  }

  // Persists the per-account setting and mirrors the returned profile. Errors
  // propagate to the caller so the view can surface them.
  async function updateRecentDays(days: number): Promise<void> {
    user.value = await api.updateProfile({ recent_days: days })
  }

  // Restores a persisted session and keeps `user` in sync with the SDK store.
  function init(): void {
    user.value = api.currentUser()
    api.onAuthChange((profile) => {
      user.value = profile
    })
  }

  return { user, login, register, logout, init, updateRecentDays }
})
