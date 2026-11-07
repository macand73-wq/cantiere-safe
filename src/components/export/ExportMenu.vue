<template>
  <div class="export-menu">
    <button type="button" :disabled="busy" @click="onExport('pdf')">{{ t('export.pdf') }}</button>
    <button type="button" :disabled="busy" @click="onExport('doc')">{{ t('export.doc') }}</button>
    <button type="button" :disabled="busy" @click="onExport('txt')">{{ t('export.txt') }}</button>
    <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Sopralluogo } from '../../types'
import { exportTxt, exportDoc, exportPdf, exportFilename } from '../../lib/export'
import { photoUrl } from '../../api/sopralluoghi'

const props = defineProps<{ sopralluogo: Sopralluogo }>()

const { t } = useI18n()
const busy = ref(false)
const error = ref('')

type Format = 'pdf' | 'doc' | 'txt'

// Resolves a persisted photo filename to a data URL for the PDF: protected
// files go through `photoUrl` (file token), then fetch + FileReader.
async function resolveImage(filename: string): Promise<string> {
  const url = await photoUrl(props.sopralluogo.id, filename)
  const res = await fetch(url)
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('read failed'))
    reader.readAsDataURL(blob)
  })
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function onExport(format: Format) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (format === 'pdf') {
      const blob = await exportPdf(props.sopralluogo, t, resolveImage)
      download(blob, exportFilename(props.sopralluogo, 'pdf'))
    } else if (format === 'doc') {
      const html = exportDoc(props.sopralluogo, t)
      download(new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' }), exportFilename(props.sopralluogo, 'doc'))
    } else {
      const text = exportTxt(props.sopralluogo, t)
      download(new Blob([text], { type: 'text/plain;charset=utf-8' }), exportFilename(props.sopralluogo, 'txt'))
    }
  } catch {
    error.value = t('export.error')
  } finally {
    busy.value = false
  }
}
</script>
