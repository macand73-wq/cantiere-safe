<template>
  <div class="app-shell">
    <header class="app-header">
      <span class="brand">CantiereSafe</span>
      <h1>{{ t('app.title') }}</h1>
      <select v-model="locale" aria-label="Language">
        <option value="en">English</option>
        <option value="it">Italiano</option>
      </select>
    </header>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

watch(locale, (value) => localStorage.setItem('locale', value))
</script>
