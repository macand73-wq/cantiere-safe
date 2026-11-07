<template>
  <main class="home">
    <p>{{ t('app.tagline') }}</p>
  </main>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
