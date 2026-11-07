<template>
  <main class="auth">
    <form class="auth-form" @submit.prevent="onSubmit">
      <h2>{{ t('auth.resetTitle') }}</h2>

      <label for="email">{{ t('auth.email') }}</label>
      <input id="email" v-model="email" type="email" autocomplete="email" required />

      <p v-if="message" class="auth-message" role="status">{{ message }}</p>
      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

      <button type="submit" :disabled="loading">{{ t('auth.submitReset') }}</button>
    </form>

    <nav class="auth-links">
      <router-link to="/login">{{ t('auth.backToLogin') }}</router-link>
    </nav>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { resetPassword } from '../api/auth'

const { t } = useI18n()

const email = ref('')
const loading = ref(false)
const message = ref('')
const error = ref('')

async function onSubmit() {
  message.value = ''
  error.value = ''
  loading.value = true
  try {
    await resetPassword(email.value)
    // Neutral wording: do not reveal whether the address exists.
    message.value = t('auth.resetSent')
  } catch {
    error.value = t('auth.resetFailed')
  } finally {
    loading.value = false
  }
}
</script>
