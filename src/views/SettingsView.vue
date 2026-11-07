<template>
  <main class="cantieri">
    <h2>{{ t('settings.title') }}</h2>

    <form class="cantiere-form" @submit.prevent="onSubmit">
      <label for="recentDays">{{ t('settings.recentDays') }}</label>
      <input id="recentDays" v-model.number="recentDays" type="number" min="1" max="365" />

      <p v-if="validationError" class="auth-error" role="alert">{{ validationError }}</p>
      <p v-if="success" class="settings-success" role="status">{{ t('settings.saveSuccess') }}</p>
      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

      <button type="submit" :disabled="saving">{{ t('settings.save') }}</button>
    </form>
  </main>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const auth = useAuthStore()
const { user } = storeToRefs(auth)

const recentDays = ref<number>(user.value?.recent_days ?? 30)
const saving = ref(false)
const validationError = ref('')
const success = ref(false)
const error = ref('')

watch(recentDays, () => {
  validationError.value = ''
  success.value = false
  error.value = ''
})

async function onSubmit() {
  const value = recentDays.value
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 365) {
    validationError.value = t('settings.rangeError')
    return
  }
  saving.value = true
  success.value = false
  error.value = ''
  try {
    await auth.updateRecentDays(value)
    success.value = true
  } catch {
    error.value = t('settings.saveError')
  } finally {
    saving.value = false
  }
}
</script>
