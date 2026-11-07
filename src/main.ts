import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { useAuthStore } from './stores/auth'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(PrimeVue, { unstyled: true })

// Restore the persisted session before the router guards first navigation.
useAuthStore().init()

app.use(router)

app.mount('#app')
