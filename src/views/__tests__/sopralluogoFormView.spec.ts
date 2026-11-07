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
import { cloneChecklist, checklistForLuogo } from '../../lib/checklist'
import { saveSopralluogoDraft } from '../../lib/draft'
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
    localStorage.clear()
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

  it('restores a saved draft on mount and shows the notice', async () => {
    saveSopralluogoDraft('new', {
      azienda: 'Bozza Azienda',
      cantiereId: '',
      indirizzo: '',
      rspp: '',
      luogo: 'cantiere',
      data: '2026-11-07',
      rischioGenerale: 'medio',
      noteLibere: 'nota bozza',
      checklist: cloneChecklist(checklistForLuogo('cantiere')),
      generalPhotos: [],
    })

    const wrapper = mountView()
    await flushPromises()

    expect((wrapper.find('#azienda').element as HTMLInputElement).value).toBe('Bozza Azienda')
    expect((wrapper.find('#noteLibere').element as HTMLTextAreaElement).value).toBe('nota bozza')
    expect(wrapper.text()).toContain('A saved draft was restored.')
    wrapper.unmount()
  })

  it('restores retryId and submits as an update, not a create', async () => {
    vi.mocked(saveSopralluogo).mockResolvedValue(savedRecord())
    saveSopralluogoDraft('new', {
      azienda: 'Azienda Persa',
      cantiereId: '',
      indirizzo: '',
      rspp: '',
      luogo: 'cantiere',
      data: '2026-11-07',
      rischioGenerale: 'medio',
      noteLibere: 'nota',
      checklist: cloneChecklist(checklistForLuogo('cantiere')),
      generalPhotos: [],
      retryId: 'rec1',
    })

    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(saveSopralluogo).toHaveBeenCalledTimes(1)
    expect(vi.mocked(saveSopralluogo).mock.calls[0][0].id).toBe('rec1')
    wrapper.unmount()
  })

  it('discarding a draft clears storage and resets the form', async () => {
    saveSopralluogoDraft('new', {
      azienda: 'Bozza Azienda',
      cantiereId: '',
      indirizzo: '',
      rspp: '',
      luogo: 'cantiere',
      data: '',
      rischioGenerale: 'medio',
      noteLibere: '',
      checklist: cloneChecklist(checklistForLuogo('cantiere')),
      generalPhotos: [],
    })

    const wrapper = mountView()
    await flushPromises()

    const discard = wrapper.findAll('button').find((b) => b.text().includes('Discard draft'))
    expect(discard).toBeDefined()
    await discard!.trigger('click')
    await flushPromises()

    expect((wrapper.find('#azienda').element as HTMLInputElement).value).toBe('')
    expect(localStorage.getItem('sopralluogo-draft:new')).toBeNull()
    wrapper.unmount()
  })
})
