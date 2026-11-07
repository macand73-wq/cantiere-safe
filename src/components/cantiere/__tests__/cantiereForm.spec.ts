import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import CantiereForm from '../CantiereForm.vue'
import en from '../../../locales/en.json'
import type { CantiereInput } from '../../../types'

const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } })

// A minimal parent mirroring CantiereFormView: forwards the form's `submit`
// payload straight to the store's `create`. This is the store boundary mocked
// here; the form's own logic is left untouched.
const Parent = defineComponent({
  components: { CantiereForm },
  props: { create: { type: Function, required: true } },
  setup(props) {
    return () => h(CantiereForm, { submitLabel: 'Create', onSubmit: props.create })
  },
})

function mountForm(create: (payload: CantiereInput) => void) {
  return mount(Parent, { global: { plugins: [i18n] }, props: { create } })
}

describe('CantiereForm', () => {
  it('emits one trimmed payload on submit with a valid name', async () => {
    const create = vi.fn()
    const wrapper = mountForm(create)

    await wrapper.find('#nome').setValue('  Cantiere Nord  ')
    await wrapper.find('#comune').setValue('  Milano  ')
    await wrapper.find('form').trigger('submit')

    expect(create).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledWith({
      nome: 'Cantiere Nord',
      indirizzo: '',
      comune: 'Milano',
      committente: '',
      impresa_affidataria: '',
      cse: '',
      dl: '',
      responsabile_lavori: '',
      importo: '',
      data_inizio: '',
      data_fine: '',
      notifica_preliminare: false,
    })
  })

  it('rejects an empty or whitespace-only name without emitting', async () => {
    const create = vi.fn()
    const wrapper = mountForm(create)

    await wrapper.find('#nome').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(create).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Name is required.')
  })
})
