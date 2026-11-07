import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import SettingsView from '../SettingsView.vue'
import en from '../../locales/en.json'
import { useAuthStore } from '../../stores/auth'
import { updateProfile } from '../../api/auth'
import type { Profile } from '../../types'

vi.mock('../../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  currentUser: vi.fn(),
  onAuthChange: vi.fn(),
  loginWithGoogle: vi.fn(),
  resetPassword: vi.fn(),
  updateProfile: vi.fn(),
}))

const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } })

const profile: Profile = {
  id: 'user-1',
  email: 'test@example.com',
  verified: false,
  created: '',
  updated: '',
  recent_days: 30,
}

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  useAuthStore().user = { ...profile }
  return mount(SettingsView, { global: { plugins: [i18n, pinia] } })
}

beforeEach(() => {
  vi.mocked(updateProfile).mockReset()
})

describe('SettingsView', () => {
  it('saves the setting through the auth store and shows success', async () => {
    vi.mocked(updateProfile).mockResolvedValue({ ...profile, recent_days: 45 })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('#recentDays').setValue(45)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(updateProfile).toHaveBeenCalledWith({ recent_days: 45 })
    expect(wrapper.text()).toContain('Saved.')
  })

  it('shows the failure state when the save is rejected', async () => {
    vi.mocked(updateProfile).mockRejectedValue(new Error('boom'))
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('#recentDays').setValue(45)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Could not save settings.')
  })

  it('rejects out-of-range values with a visible error and does not save', async () => {
    vi.mocked(updateProfile).mockResolvedValue({ ...profile })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('#recentDays').setValue(0)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(updateProfile).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Enter a whole number between 1 and 365.')
  })
})
