import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import it from './locales/it.json'

const saved = localStorage.getItem('locale')
const locale = saved === 'it' ? 'it' : 'en'

export const i18n = createI18n({
  legacy: false,
  locale,
  fallbackLocale: 'en',
  messages: { en, it },
})

export default i18n
