import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import SopralluogoFormView from '../SopralluogoFormView.vue'
import en from '../../locales/en.json'

// Mock the API boundary (the store's backend): the real store still flips its
// `loading` during a rejected save, so this guards against the view keying the
// form's mount off that shared flag and dropping typed input.
vi.mock('../../api/sopralluoghi', () => ({
  listSopralluoghi: vi.fn(),
  getSopralluogo: vi.fn(),
  createSopralluogo: vi.fn(),
  updateSopralluogo: vi.fn(),
  deleteSopralluogo: vi.fn(),
  photoUrl: vi.fn(),
  saveSopralluogo: vi.fn(),
}))

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

import { saveSopralluogo } from '../../api/sopralluoghi'
import { listCantieri } from '../../api/cantieri'

const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } })

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(SopralluogoFormView, { global: { plugins: [i18n, pinia] } })
}

describe('SopralluogoFormView', () => {
  beforeEach(() => {
    vi.mocked(saveSopralluogo).mockReset()
    vi.mocked(listCantieri).mockReset()
    vi.mocked(listCantieri).mockResolvedValue([])
  })

  it('keeps typed input visible and re-enables save when a save is rejected', async () => {
    vi.mocked(saveSopralluogo).mockRejectedValue(new Error('boom'))
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('#azienda').setValue('  Azienda Persa  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const input = wrapper.find('#azienda')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('  Azienda Persa  ')
    expect(wrapper.text()).toContain('Could not save the inspection.')

    const submit = wrapper.find('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeUndefined()
  })
})
