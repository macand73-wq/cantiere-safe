import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import HomeView from '../HomeView.vue'
import en from '../../locales/en.json'
import { useAuthStore } from '../../stores/auth'
import { listSopralluoghi } from '../../api/sopralluoghi'
import { listCantieri } from '../../api/cantieri'
import type { Profile, Sopralluogo } from '../../types'

vi.mock('../../api/sopralluoghi', () => ({ listSopralluoghi: vi.fn() }))
vi.mock('../../api/cantieri', () => ({ listCantieri: vi.fn() }))

const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } })

const profile: Profile = {
  id: 'user-1',
  email: 'test@example.com',
  verified: false,
  created: '',
  updated: '',
  recent_days: 7,
}

function sopralluogo(id: string, azienda: string, data: string): Sopralluogo {
  return {
    id,
    user: 'user-1',
    azienda,
    indirizzo: '',
    rspp: '',
    luogo: 'cantiere',
    data,
    rischio_generale: 'medio',
    note_libere: '',
    checklist: [],
    foto: [],
    created: '',
    updated: '',
  }
}

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
}

function mountView(pinia = createPinia()) {
  setActivePinia(pinia)
  return mount(HomeView, {
    global: {
      plugins: [i18n, pinia],
      stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
    },
  })
}

beforeEach(() => {
  vi.mocked(listSopralluoghi).mockReset()
  vi.mocked(listCantieri).mockReset()
  vi.mocked(listCantieri).mockResolvedValue([])
})

describe('HomeView', () => {
  it('renders the two shortcut links', async () => {
    vi.mocked(listSopralluoghi).mockResolvedValue([])
    const wrapper = mountView()
    await flushPromises()

    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('/cantieri/new')
    expect(hrefs).toContain('/sopralluoghi/new')
  })

  it('shows recent rows and hides rows older than N days', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().user = { ...profile, recent_days: 7 }
    vi.mocked(listSopralluoghi).mockResolvedValue([
      sopralluogo('r1', 'Azienda Recente', iso(1)),
      sopralluogo('r2', 'Azienda Vecchia', iso(10)),
    ])

    const wrapper = mountView(pinia)
    await flushPromises()

    expect(wrapper.text()).toContain('Azienda Recente')
    expect(wrapper.text()).not.toContain('Azienda Vecchia')
    expect(wrapper.findAll('li.cantiere-row').length).toBe(1)
  })

  it('defaults to 30 days when recent_days is unset', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useAuthStore().user = { ...profile, recent_days: undefined }
    vi.mocked(listSopralluoghi).mockResolvedValue([
      sopralluogo('r1', 'Azienda 25', iso(25)),
      sopralluogo('r2', 'Azienda 40', iso(40)),
    ])

    const wrapper = mountView(pinia)
    await flushPromises()

    expect(wrapper.text()).toContain('Azienda 25')
    expect(wrapper.text()).not.toContain('Azienda 40')
  })

  it('shows the localized empty state when there are no recent inspections', async () => {
    vi.mocked(listSopralluoghi).mockResolvedValue([])
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('No recent inspections.')
  })
})
