<template>
  <main class="cantieri">
    <h2>{{ isEdit ? t('sopralluoghi.editTitle') : t('sopralluoghi.newTitle') }}</h2>

    <p v-if="loading" class="auth-message">{{ t('common.loading') }}</p>
    <p v-else-if="loadError" class="auth-error" role="alert">{{ loadError }}</p>
    <form v-else class="cantiere-form" @submit.prevent="onSubmit">
      <label for="azienda">{{ t('sopralluoghi.azienda') }}</label>
      <input id="azienda" v-model="azienda" type="text" />

      <label for="cantiere">{{ t('sopralluoghi.cantiere') }}</label>
      <select id="cantiere" v-model="cantiereId">
        <option value="">{{ t('sopralluoghi.cantiereNone') }}</option>
        <option v-for="c in cantieri" :key="c.id" :value="c.id">{{ c.nome }}</option>
      </select>

      <label for="indirizzo">{{ t('sopralluoghi.indirizzo') }}</label>
      <input id="indirizzo" v-model="indirizzo" type="text" />

      <label for="rspp">{{ t('sopralluoghi.rspp') }}</label>
      <input id="rspp" v-model="rspp" type="text" />

      <label for="luogo">{{ t('sopralluoghi.luogo') }}</label>
      <select id="luogo" :value="luogo" @change="onLuogoChange">
        <option value="cantiere">{{ t('sopralluoghi.luogoCantiere') }}</option>
        <option value="azienda">{{ t('sopralluoghi.luogoAzienda') }}</option>
        <option value="edificio">{{ t('sopralluoghi.luogoEdificio') }}</option>
      </select>

      <label for="data">{{ t('sopralluoghi.data') }}</label>
      <input id="data" v-model="data" type="date" />

      <label for="rischioGenerale">{{ t('sopralluoghi.rischioGenerale') }}</label>
      <select id="rischioGenerale" v-model="rischioGenerale">
        <option value="basso">{{ t('sopralluoghi.rischioBasso') }}</option>
        <option value="medio">{{ t('sopralluoghi.rischioMedio') }}</option>
        <option value="alto">{{ t('sopralluoghi.rischioAlto') }}</option>
      </select>

      <label for="noteLibere">{{ t('sopralluoghi.noteLibere') }}</label>
      <textarea id="noteLibere" v-model="noteLibere"></textarea>

      <h3 class="form-section-title">{{ t('sopralluoghi.generalPhotos') }}</h3>
      <PhotoField
        v-model:photos="generalPhotos"
        :used="totalPhotos - generalPhotos.length"
        :get-url="isEdit ? resolvePhotoUrl : undefined"
        :label="t('sopralluoghi.generalPhotos')"
      />

      <h3 class="form-section-title">{{ t('sopralluoghi.checklist') }}</h3>
      <ChecklistSection
        :items="checklist"
        :total-photos="totalPhotos"
        :get-url="isEdit ? resolvePhotoUrl : undefined"
      />

      <p v-if="saveError" class="auth-error" role="alert">{{ saveError }}</p>

      <button type="submit" :disabled="saving">
        {{ isEdit ? t('sopralluoghi.save') : t('sopralluoghi.create') }}
      </button>
    </form>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSopralluoghiStore } from '../stores/sopralluoghi'
import { useCantieriStore } from '../stores/cantieri'
import { photoUrl, SopralluogoSaveError, type SopralluogoDraft } from '../api/sopralluoghi'
import {
  cloneChecklist,
  checklistForLuogo,
  type ChecklistItemDraft,
  type Luogo,
} from '../lib/checklist'
import { nextClientId, type PhotoDraft } from '../lib/photos'
import type { Sopralluogo, ChecklistItem } from '../types'
import PhotoField from '../components/photos/PhotoField.vue'
import ChecklistSection from '../components/checklist/ChecklistSection.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useSopralluoghiStore()
const cantieriStore = useCantieriStore()
const { items: cantieri } = storeToRefs(cantieriStore)

const isEdit = computed(() => typeof route.params.id === 'string')

const azienda = ref('')
const cantiereId = ref('')
const indirizzo = ref('')
const rspp = ref('')
const luogo = ref<Luogo>('cantiere')
const data = ref('')
const rischioGenerale = ref('medio')
const noteLibere = ref('')
const checklist = ref<ChecklistItemDraft[]>([])
const generalPhotos = ref<PhotoDraft[]>([])

const loading = ref(false)
const loadError = ref('')
const saveError = ref('')
const saving = ref(false)
// Record id from a partial save whose finalize failed; a retry must update it,
// not create a duplicate.
const retryId = ref<string | undefined>(undefined)

const totalPhotos = computed(
  () => generalPhotos.value.length + checklist.value.reduce((n, i) => n + i.foto.length, 0),
)

async function resolvePhotoUrl(filename: string): Promise<string> {
  return photoUrl(route.params.id as string, filename)
}

function itemToDraft(item: ChecklistItem): ChecklistItemDraft {
  return {
    id: item.id,
    testo: item.testo,
    categoria: item.categoria,
    ...(item.personalizzabile ? { personalizzabile: true } : {}),
    valore: item.valore,
    commento: item.commento,
    foto: (item.foto ?? []).map((filename) => ({ clientId: nextClientId(), filename })),
    nascosta: item.nascosta ?? false,
  }
}

function populate(s: Sopralluogo) {
  azienda.value = s.azienda
  cantiereId.value = s.cantiere ?? ''
  indirizzo.value = s.indirizzo
  rspp.value = s.rspp
  luogo.value = (s.luogo as Luogo) || 'cantiere'
  data.value = (s.data ?? '').slice(0, 10)
  rischioGenerale.value = s.rischio_generale || 'medio'
  noteLibere.value = s.note_libere

  const items = (s.checklist ?? []) as ChecklistItem[]
  checklist.value = items.map(itemToDraft)

  const referenced = new Set(items.flatMap((i) => i.foto ?? []))
  generalPhotos.value = (s.foto ?? [])
    .filter((f) => !referenced.has(f))
    .map((f) => ({ clientId: nextClientId(), filename: f }))
}

onMounted(async () => {
  loading.value = true
  cantieriStore.load().catch(() => {}) // the cantiere select just stays empty
  try {
    if (isEdit.value) {
      await store.load()
      const found = store.items.find((s) => s.id === route.params.id)
      if (!found) {
        loadError.value = t('sopralluoghi.notFound')
        return
      }
      populate(found)
    } else {
      checklist.value = cloneChecklist(checklistForLuogo(luogo.value))
    }
  } catch {
    loadError.value = t('sopralluoghi.loadError')
  } finally {
    loading.value = false
  }
})

function checklistDirty(): boolean {
  return checklist.value.some(
    (i) =>
      i.valore !== 'NA' ||
      i.commento.trim() !== '' ||
      i.foto.length > 0 ||
      (i.personalizzabile && i.testo.trim() !== ''),
  )
}

function onLuogoChange(event: Event) {
  const select = event.target as HTMLSelectElement
  const next = select.value as Luogo
  if (next === luogo.value) return
  if (checklistDirty() && !window.confirm(t('sopralluoghi.luogoChangeConfirm'))) {
    select.value = luogo.value // snap the select back without touching the checklist
    return
  }
  luogo.value = next
  checklist.value = cloneChecklist(checklistForLuogo(next))
}

async function onSubmit() {
  const trimmedAzienda = azienda.value.trim()
  if (!trimmedAzienda) {
    saveError.value = t('sopralluoghi.aziendaRequired')
    return
  }
  saveError.value = ''
  saving.value = true
  try {
    const draft: SopralluogoDraft = {
      id: isEdit.value ? (route.params.id as string) : retryId.value,
      fields: {
        cantiere: cantiereId.value || undefined,
        azienda: trimmedAzienda,
        indirizzo: indirizzo.value.trim(),
        rspp: rspp.value.trim(),
        luogo: luogo.value,
        data: data.value,
        rischio_generale: rischioGenerale.value,
        note_libere: noteLibere.value,
      },
      checklist: checklist.value,
      generalPhotos: generalPhotos.value,
    }
    await store.save(draft)
    retryId.value = undefined
    router.push('/sopralluoghi')
  } catch (e) {
    if (e instanceof SopralluogoSaveError) retryId.value = e.recordId
    saveError.value = t('sopralluoghi.saveError')
  } finally {
    saving.value = false
  }
}
</script>
