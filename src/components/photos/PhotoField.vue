<template>
  <div class="photo-field">
    <p class="photo-label">{{ label }}</p>
    <ul v-if="photos.length" class="photo-thumbs">
      <li v-for="p in photos" :key="p.clientId" class="photo-thumb">
        <button type="button" class="photo-thumb-btn" @click="openLightbox(p.clientId)">
          <img :src="urlFor(p)" :alt="label" />
        </button>
        <button
          type="button"
          class="photo-remove"
          :aria-label="t('photos.remove')"
          @click="remove(p.clientId)"
        >
          ×
        </button>
      </li>
    </ul>
    <input
      ref="fileInput"
      type="file"
      class="photo-input"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
      multiple
      @change="onFiles"
    />
    <p v-if="message" class="auth-error" role="alert">{{ message }}</p>
    <div v-if="lightboxSrc" class="lightbox" @click="lightboxSrc = ''">
      <img :src="lightboxSrc" :alt="label" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  MAX_PHOTOS,
  validateImageFile,
  validateMagicBytes,
  compressImage,
  nextClientId,
  type PhotoDraft,
} from '../../lib/photos'

const props = withDefaults(
  defineProps<{
    photos: PhotoDraft[]
    used?: number
    label?: string
    getUrl?: (filename: string) => Promise<string>
  }>(),
  { used: 0, label: '' },
)

const emit = defineEmits<{ 'update:photos': [photos: PhotoDraft[]] }>()

const { t } = useI18n()

const fileInput = ref<HTMLInputElement | null>(null)
const message = ref('')
const urls = ref<Record<string, string>>({})
const lightboxSrc = ref('')

function urlFor(p: PhotoDraft): string {
  if (urls.value[p.clientId]) return urls.value[p.clientId]
  if (p.file) {
    const url = URL.createObjectURL(p.file)
    urls.value[p.clientId] = url
    return url
  }
  if (p.filename && props.getUrl) {
    props.getUrl(p.filename).then((url) => {
      urls.value[p.clientId] = url
    })
  }
  return ''
}

async function onFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  const added: PhotoDraft[] = []
  message.value = ''

  for (const file of files) {
    if (props.photos.length + props.used + added.length >= MAX_PHOTOS) {
      message.value = t('photos.maxReached')
      break
    }
    const valid = validateImageFile(file)
    if (!valid.ok) {
      message.value = valid.reason === 'mime' ? t('photos.invalidType') : t('photos.tooLarge')
      continue
    }
    if (!(await validateMagicBytes(file))) {
      message.value = t('photos.invalidImage')
      continue
    }
    let blob: Blob
    try {
      blob = await compressImage(file)
    } catch {
      message.value = t('photos.compressError')
      continue
    }
    added.push({ clientId: nextClientId(), file: new File([blob], file.name, { type: blob.type }) })
  }

  if (added.length) emit('update:photos', [...props.photos, ...added])
  input.value = ''
}

function remove(clientId: string) {
  const url = urls.value[clientId]
  if (url) URL.revokeObjectURL(url)
  delete urls.value[clientId]
  emit(
    'update:photos',
    props.photos.filter((p) => p.clientId !== clientId),
  )
}

function openLightbox(clientId: string) {
  const photo = props.photos.find((p) => p.clientId === clientId)
  if (photo) lightboxSrc.value = urlFor(photo)
}
</script>
