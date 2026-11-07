<template>
  <main class="auth">
    <form class="auth-form" @submit.prevent="onSubmit">
      <h2>{{ t('auth.loginTitle') }}</h2>

      <label for="email">{{ t('auth.email') }}</label>
      <input id="email" v-model="email" type="email" autocomplete="email" required />

      <label for="password">{{ t('auth.password') }}</label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        required
      />

      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

      <button type="submit" :disabled="loading">{{ t('auth.submitLogin') }}</button>
    </form>

    <button class="auth-google" type="button" :disabled="loading" @click="onGoogle">
      {{ t('auth.google') }}
    </button>

    <nav class="auth-links">
      <router-link to="/register">{{ t('auth.noAccount') }}</router-link>
      <router-link to="/reset">{{ t('auth.forgot') }}</router-link>
    </nav>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { loginWithGoogle } from '../api/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch {
    error.value = t('auth.loginFailed')
  } finally {
    loading.value = false
  }
}

async function onGoogle() {
  error.value = ''
  loading.value = true
  try {
    await loginWithGoogle()
    router.push('/')
  } catch {
    error.value = t('auth.googleError')
  } finally {
    loading.value = false
  }
}
</script>
