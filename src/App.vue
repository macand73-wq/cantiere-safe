<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="brand">CantiereSafe</span>
      <h1>{{ t('app.title') }}</h1>
      <select v-model="locale" :aria-label="t('app.language')">
        <option value="en">{{ t('app.lang.en') }}</option>
        <option value="it">{{ t('app.lang.it') }}</option>
      </select>
    </header>
    <nav v-if="auth.user" class="app-nav">
      <router-link to="/"><AppIcon name="home" />{{ t('nav.home') }}</router-link>
      <router-link to="/cantieri"><AppIcon name="cantieri" />{{ t('nav.cantieri') }}</router-link>
      <router-link to="/sopralluoghi"><AppIcon name="sopralluoghi" />{{ t('nav.sopralluoghi') }}</router-link>
      <button type="button" @click="onLogout"><AppIcon name="logout" />{{ t('nav.logout') }}</button>
    </nav>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from './stores/auth'
import AppIcon from './components/ui/AppIcon.vue'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()

function onLogout() {
  auth.logout()
  router.push('/login')
}

watch(locale, (value) => localStorage.setItem('locale', value))
</script>
