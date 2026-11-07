<template>
  <section class="checklist-section">
    <div v-for="group in grouped" :key="group.categoria" class="checklist-group">
      <h3 class="checklist-category">{{ t(group.categoria) }}</h3>
      <ChecklistItem
        v-for="item in group.items"
        :key="item.id"
        :item="item"
        :used="usedFor(item)"
        :get-url="getUrl"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChecklistItemDraft } from '../../lib/checklist'
import ChecklistItem from './ChecklistItem.vue'

const props = defineProps<{
  items: ChecklistItemDraft[]
  totalPhotos: number
  getUrl?: (filename: string) => Promise<string>
}>()

const { t } = useI18n()

// Group items by category while preserving their original order.
const grouped = computed(() => {
  const map: { categoria: string; items: ChecklistItemDraft[] }[] = []
  for (const item of props.items) {
    const group = map.find((g) => g.categoria === item.categoria)
    if (group) group.items.push(item)
    else map.push({ categoria: item.categoria, items: [item] })
  }
  return map
})

// The shared 20-photo budget is global: an item may add only what the other
// fields have not consumed.
function usedFor(item: ChecklistItemDraft): number {
  return props.totalPhotos - item.foto.length
}
</script>
