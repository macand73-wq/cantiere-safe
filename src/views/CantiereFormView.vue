<template>
  <main class="cantieri">
    <h2>{{ isEdit ? t('cantieri.editTitle') : t('cantieri.newTitle') }}</h2>

    <p v-if="loading" class="auth-message">{{ t('common.loading') }}</p>
    <p v-else-if="loadError" class="auth-error" role="alert">{{ loadError }}</p>
    <CantiereForm
      v-else
      :initial="initial"
      :submit-label="isEdit ? t('cantieri.save') : t('cantieri.create')"
      :disabled="saving"
      @submit="onSubmit"
    />

    <p v-if="saveError" class="auth-error" role="alert">{{ saveError }}</p>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCantieriStore } from '../stores/cantieri'
import CantiereForm from '../components/cantiere/CantiereForm.vue'
import type { CantiereInput } from '../types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useCantieriStore()

const isEdit = computed(() => typeof route.params.id === 'string')
const initial = ref<CantiereInput | undefined>(undefined)
// Local to the load phase only: the store's shared `loading` also flips during
// save, which would unmount the form and drop the user's typed input on failure.
const loading = ref(false)
const loadError = ref('')
const saveError = ref('')
const saving = ref(false)

onMounted(async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    await store.load()
    const found = store.items.find((c) => c.id === route.params.id)
    if (!found) {
      loadError.value = t('cantieri.notFound')
      return
    }
    initial.value = found
  } catch {
    loadError.value = t('cantieri.loadError')
  } finally {
    loading.value = false
  }
})

async function onSubmit(payload: CantiereInput) {
  saveError.value = ''
  saving.value = true
  try {
    if (isEdit.value) {
      await store.update(route.params.id as string, payload)
    } else {
      await store.create(payload)
    }
    router.push('/cantieri')
  } catch {
    saveError.value = t('cantieri.saveError')
  } finally {
    saving.value = false
  }
}
</script>
