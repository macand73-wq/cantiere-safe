import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import SopralluogoFormView from '../SopralluogoFormView.vue'
import en from '../../locales/en.json'

// Mock the API boundary (the store's backend) but keep the real error class so
// the view's `instanceof SopralluogoSaveError` check works. The real store still
// flips its `loading` during a rejected save, so this guards against the view
// keying the form's mount off that shared flag and dropping typed input.
vi.mock('../../api/sopralluoghi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/sopralluoghi')>()
  return {
    ...actual,
    listSopralluoghi: vi.fn(),
    getSopralluogo: vi.fn(),
    createSopralluogo: vi.fn(),
    updateSopralluogo: vi.fn(),
    deleteSopralluogo: vi.fn(),
    photoUrl: vi.fn(),
    saveSopralluogo: vi.fn(),
  }
})

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

import { saveSopralluogo, SopralluogoSaveError } from '../../api/sopralluoghi'
import { listCantieri } from '../../api/cantieri'
import type { Sopralluogo } from '../../types'

const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } })

function mountView() {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(SopralluogoFormView, { global: { plugins: [i18n, pinia] } })
}

function savedRecord(): Sopralluogo {
  return {
    id: 'rec1',
    user: 'user-1',
    azienda: 'Azienda Persa',
    indirizzo: '',
    rspp: '',
    luogo: 'cantiere',
    data: '',
    rischio_generale: 'medio',
    note_libere: '',
    checklist: [],
    foto: [],
    created: '',
    updated: '',
  }
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

  it('retries a failed finalize as an update, not a create', async () => {
    vi.mocked(saveSopralluogo)
      .mockRejectedValueOnce(new SopralluogoSaveError('finalize failed', 'rec1'))
      .mockResolvedValueOnce(savedRecord())

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('#azienda').setValue('Azienda Persa')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Could not save the inspection.')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(saveSopralluogo).toHaveBeenCalledTimes(2)
    const first = vi.mocked(saveSopralluogo).mock.calls[0][0]
    const second = vi.mocked(saveSopralluogo).mock.calls[1][0]
    expect(first.id).toBeUndefined()
    expect(second.id).toBe('rec1')
  })
})
