<template>
  <main class="auth">
    <form class="auth-form" @submit.prevent="onSubmit">
      <h2>{{ t('auth.registerTitle') }}</h2>

      <label for="email">{{ t('auth.email') }}</label>
      <input id="email" v-model="email" type="email" autocomplete="email" required />

      <label for="password">{{ t('auth.password') }}</label>
      <input
        id="password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        required
      />

      <label for="passwordConfirm">{{ t('auth.passwordConfirm') }}</label>
      <input
        id="passwordConfirm"
        v-model="passwordConfirm"
        type="password"
        autocomplete="new-password"
        required
      />

      <label for="nome">{{ t('auth.nome') }}</label>
      <input id="nome" v-model="nome" type="text" autocomplete="name" required />

      <label for="studio">{{ t('auth.studio') }}</label>
      <input id="studio" v-model="studio" type="text" autocomplete="organization" />

      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

      <button type="submit" :disabled="loading">{{ t('auth.submitRegister') }}</button>
    </form>

    <nav class="auth-links">
      <router-link to="/login">{{ t('auth.haveAccount') }}</router-link>
    </nav>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const nome = ref('')
const studio = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  if (password.value !== passwordConfirm.value) {
    error.value = t('auth.passwordMismatch')
    return
  }
  loading.value = true
  try {
    await auth.register({
      email: email.value,
      password: password.value,
      passwordConfirm: passwordConfirm.value,
      nome: nome.value,
      studio: studio.value,
    })
    router.push('/')
  } catch {
    error.value = t('auth.registerFailed')
  } finally {
    loading.value = false
  }
}
</script>
