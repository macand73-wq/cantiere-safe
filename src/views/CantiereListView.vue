<template>
  <main class="cantieri">
    <div class="cantieri-header">
      <h2>{{ t('cantieri.title') }}</h2>
      <router-link class="btn-new" to="/cantieri/new">{{ t('cantieri.new') }}</router-link>
    </div>

    <p v-if="loading" class="auth-message">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="auth-error" role="alert">{{ error }}</p>
    <CantiereList v-else :items="items" @delete="onDelete" />
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useCantieriStore } from '../stores/cantieri'
import CantiereList from '../components/cantiere/CantiereList.vue'

const { t } = useI18n()
const store = useCantieriStore()
const { items, loading } = storeToRefs(store)
const error = ref('')

onMounted(async () => {
  error.value = ''
  try {
    await store.load()
  } catch {
    error.value = t('cantieri.loadError')
  }
})

async function onDelete(id: string) {
  if (!window.confirm(t('cantieri.deleteConfirm'))) return
  error.value = ''
  try {
    await store.remove(id)
  } catch {
    error.value = t('cantieri.deleteError')
  }
}
</script>
