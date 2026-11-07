<template>
  <ul v-if="items.length" class="cantiere-list">
    <li v-for="cantiere in items" :key="cantiere.id" class="cantiere-row">
      <div>
        <div class="cantiere-name">{{ cantiere.nome }}</div>
        <div class="cantiere-meta">
          <span v-if="cantiere.comune">{{ cantiere.comune }}</span>
          <span v-if="dates(cantiere)">{{ dates(cantiere) }}</span>
        </div>
      </div>
      <div class="cantiere-actions">
        <router-link :to="`/cantieri/${cantiere.id}/edit`">{{ t('cantieri.edit') }}</router-link>
        <button type="button" @click="emit('delete', cantiere.id)">
          {{ t('cantieri.delete') }}
        </button>
      </div>
    </li>
  </ul>
  <p v-else class="cantiere-empty">{{ t('cantieri.empty') }}</p>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Cantiere } from '../../types'

defineProps<{ items: Cantiere[] }>()
const emit = defineEmits<{ delete: [id: string] }>()

const { t } = useI18n()

function dates(cantiere: Cantiere): string {
  return [cantiere.data_inizio, cantiere.data_fine].filter(Boolean).join(' - ')
}
</script>
