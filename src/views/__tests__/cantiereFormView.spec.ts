import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import CantiereFormView from '../CantiereFormView.vue'
import en from '../../locales/en.json'

// Mock the API layer (the store boundary): the real store's `loading` still
// flips during a rejected save, so this test guards against the view keying the
// form's mount off that shared flag and dropping typed input.
vi.mock('../../api/cantieri', () => ({
  listCantieri: vi.fn(),
  getCantiere: vi.fn(),
  createCantiere: vi.fn(),
  updateCantiere: vi.fn(),
  deleteCantiere: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: {} }),
  useRouter: () => ({ push: vi.fn() }),
}))

import { createCantiere } from '../../api/cantieri'

const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } })

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(CantiereFormView, { global: { plugins: [i18n, pinia] } })
}

describe('CantiereFormView', () => {
  beforeEach(() => {
    vi.mocked(createCantiere).mockReset()
  })

  it('keeps typed input visible when a save is rejected', async () => {
    vi.mocked(createCantiere).mockRejectedValue(new Error('boom'))
    const wrapper = mountView()

    await wrapper.find('#nome').setValue('  Cantiere Perso  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const input = wrapper.find('#nome')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('  Cantiere Perso  ')
    expect(wrapper.text()).toContain('Could not save the cantiere.')
  })
})
