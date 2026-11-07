<template>
  <main class="home">
    <p class="home-tagline">{{ t('app.tagline') }}</p>

    <div class="home-shortcuts">
      <router-link class="btn-new" to="/cantieri/new"><AppIcon name="plus" />{{ t('cantieri.new') }}</router-link>
      <router-link class="btn-new" to="/sopralluoghi/new"><AppIcon name="plus" />{{ t('sopralluoghi.new') }}</router-link>
    </div>

    <h2 class="home-recent-title">{{ t('home.recentTitle') }}</h2>

    <p v-if="loading" class="auth-message">{{ t('common.loading') }}</p>
    <p v-else-if="error" class="auth-error" role="alert">{{ error }}</p>
    <ul v-else-if="recent.length" class="cantiere-list">
      <li v-for="s in recent" :key="s.id" class="cantiere-row">
        <div>
          <div class="cantiere-name">{{ s.azienda }}</div>
          <div class="cantiere-meta">
            <span v-if="s.data">{{ s.data.slice(0, 10) }}</span>
            <span v-if="s.luogo">{{ luogoLabel(s.luogo) }}</span>
            <span v-if="cantiereName(s.cantiere)">{{ cantiereName(s.cantiere) }}</span>
          </div>
        </div>
        <div class="cantiere-actions">
          <router-link :to="`/sopralluoghi/${s.id}/edit`"><AppIcon name="edit" />{{ t('sopralluoghi.edit') }}</router-link>
        </div>
      </li>
    </ul>
    <p v-else class="cantiere-empty">{{ t('home.recentEmpty') }}</p>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useSopralluoghiStore } from '../stores/sopralluoghi'
import { useCantieriStore } from '../stores/cantieri'
import { useAuthStore } from '../stores/auth'
import { recentInspections } from '../lib/recent'
import AppIcon from '../components/ui/AppIcon.vue'

const { t } = useI18n()
const auth = useAuthStore()
const store = useSopralluoghiStore()
const cantieriStore = useCantieriStore()
const { items, loading } = storeToRefs(store)
const { items: cantieri } = storeToRefs(cantieriStore)
const error = ref('')

const cantiereById = computed(
  () => new Map(cantieri.value.map((c) => [c.id, c.nome])),
)

const recent = computed(() =>
  recentInspections(items.value, auth.user?.recent_days ?? 30, new Date()),
)

onMounted(async () => {
  error.value = ''
  cantieriStore.load().catch(() => {}) // names resolve to ids; list still loads
  try {
    await store.load()
  } catch {
    error.value = t('sopralluoghi.loadError')
  }
})

function cantiereName(id?: string): string {
  if (!id) return ''
  return cantiereById.value.get(id) ?? ''
}

function luogoLabel(luogo: string): string {
  const key =
    luogo === 'azienda'
      ? 'sopralluoghi.luogoAzienda'
      : luogo === 'edificio'
        ? 'sopralluoghi.luogoEdificio'
        : 'sopralluoghi.luogoCantiere'
  return t(key)
}
</script>
