<template>
  <div class="checklist-item" :class="{ 'is-hidden': item.nascosta }">
    <div class="checklist-item-head">
      <div class="checklist-item-text">
        <input
          v-if="item.personalizzabile"
          v-model="item.testo"
          type="text"
          :placeholder="t('checklist.customPlaceholder')"
        />
        <span v-else>{{ t(item.testo) }}</span>
      </div>
      <div class="checklist-item-actions">
        <button
          type="button"
          class="val-btn"
          :class="{ active: item.valore === 'SI' }"
          @click="item.valore = 'SI'"
        >
          {{ t('checklist.yes') }}
        </button>
        <button
          type="button"
          class="val-btn"
          :class="{ active: item.valore === 'NO' }"
          @click="item.valore = 'NO'"
        >
          {{ t('checklist.no') }}
        </button>
        <button
          type="button"
          class="val-btn"
          :class="{ active: item.valore === 'NA' }"
          @click="item.valore = 'NA'"
        >
          {{ t('checklist.na') }}
        </button>
        <button type="button" class="hide-btn" @click="item.nascosta = !item.nascosta">
          {{ item.nascosta ? t('checklist.show') : t('checklist.hide') }}
        </button>
      </div>
    </div>

    <textarea
      v-model="item.commento"
      :placeholder="t('checklist.commento')"
      class="checklist-comment"
    ></textarea>

    <PhotoField
      v-model:photos="item.foto"
      :used="used"
      :get-url="getUrl"
      :label="t('checklist.itemPhotos')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ChecklistItemDraft } from '../../lib/checklist'
import PhotoField from '../photos/PhotoField.vue'

// Mutating the item's answer fields in place is deliberate: the parent owns a
// reactive array and these objects are never shared outside it.
defineProps<{
  item: ChecklistItemDraft
  used: number
  getUrl?: (filename: string) => Promise<string>
}>()

const { t } = useI18n()
</script>
