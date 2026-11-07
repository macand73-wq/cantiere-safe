import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../App.vue'
import { i18n } from '../i18n'

const router = createRouter({ history: createMemoryHistory(), routes: [] })

function mountApp() {
  i18n.global.locale.value = 'en'
  return mount(App, {
    global: {
      plugins: [i18n, createPinia(), router],
      stubs: { RouterView: true, RouterLink: true },
    },
  })
}

describe('App shell', () => {
  it('renders the English title', () => {
    const wrapper = mountApp()
    expect(wrapper.text()).toContain('Workplace safety inspections')
  })

  it('switches to the Italian title', async () => {
    const wrapper = mountApp()
    await wrapper.find('select').setValue('it')
    expect(wrapper.text()).toContain('Sopralluoghi di sicurezza sul lavoro')
    expect(wrapper.text()).not.toContain('Workplace safety inspections')
  })
})
