<template>
  <form class="cantiere-form" @submit.prevent="onSubmit">
    <label for="nome">{{ t('cantieri.nome') }}</label>
    <input id="nome" v-model="nome" type="text" required />

    <label for="indirizzo">{{ t('cantieri.indirizzo') }}</label>
    <input id="indirizzo" v-model="indirizzo" type="text" />

    <label for="comune">{{ t('cantieri.comune') }}</label>
    <input id="comune" v-model="comune" type="text" />

    <label for="committente">{{ t('cantieri.committente') }}</label>
    <input id="committente" v-model="committente" type="text" />

    <label for="impresaAffidataria">{{ t('cantieri.impresaAffidataria') }}</label>
    <input id="impresaAffidataria" v-model="impresaAffidataria" type="text" />

    <label for="cse">{{ t('cantieri.cse') }}</label>
    <input id="cse" v-model="cse" type="text" />

    <label for="dl">{{ t('cantieri.dl') }}</label>
    <input id="dl" v-model="dl" type="text" />

    <label for="responsabileLavori">{{ t('cantieri.responsabileLavori') }}</label>
    <input id="responsabileLavori" v-model="responsabileLavori" type="text" />

    <label for="importo">{{ t('cantieri.importo') }}</label>
    <input id="importo" v-model="importo" type="text" />

    <label for="dataInizio">{{ t('cantieri.dataInizio') }}</label>
    <input id="dataInizio" v-model="dataInizio" type="date" />

    <label for="dataFine">{{ t('cantieri.dataFine') }}</label>
    <input id="dataFine" v-model="dataFine" type="date" />

    <label class="cantiere-check">
      <input v-model="notificaPreliminare" type="checkbox" />
      {{ t('cantieri.notificaPreliminare') }}
    </label>

    <p v-if="error" class="auth-error" role="alert">{{ error }}</p>

    <button type="submit" :disabled="disabled">{{ submitLabel }}</button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CantiereInput } from '../../types'

const props = withDefaults(
  defineProps<{
    initial?: CantiereInput
    submitLabel: string
    disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{ submit: [payload: CantiereInput] }>()

const { t } = useI18n()

const nome = ref(props.initial?.nome ?? '')
const indirizzo = ref(props.initial?.indirizzo ?? '')
const comune = ref(props.initial?.comune ?? '')
const committente = ref(props.initial?.committente ?? '')
const impresaAffidataria = ref(props.initial?.impresa_affidataria ?? '')
const cse = ref(props.initial?.cse ?? '')
const dl = ref(props.initial?.dl ?? '')
const responsabileLavori = ref(props.initial?.responsabile_lavori ?? '')
const importo = ref(props.initial?.importo ?? '')
// Date inputs require YYYY-MM-DD; PocketBase stores a full timestamp.
const dataInizio = ref((props.initial?.data_inizio ?? '').slice(0, 10))
const dataFine = ref((props.initial?.data_fine ?? '').slice(0, 10))
const notificaPreliminare = ref(props.initial?.notifica_preliminare ?? false)
const error = ref('')

function onSubmit() {
  const trimmedNome = nome.value.trim()
  if (!trimmedNome) {
    error.value = t('cantieri.nomeRequired')
    return
  }
  error.value = ''
  emit('submit', {
    nome: trimmedNome,
    indirizzo: indirizzo.value.trim(),
    comune: comune.value.trim(),
    committente: committente.value.trim(),
    impresa_affidataria: impresaAffidataria.value.trim(),
    cse: cse.value.trim(),
    dl: dl.value.trim(),
    responsabile_lavori: responsabileLavori.value.trim(),
    importo: importo.value.trim(),
    data_inizio: dataInizio.value,
    data_fine: dataFine.value,
    notifica_preliminare: notificaPreliminare.value,
  })
}
</script>
