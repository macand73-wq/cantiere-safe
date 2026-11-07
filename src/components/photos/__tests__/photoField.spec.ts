import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import PhotoField from '../PhotoField.vue'
import en from '../../../locales/en.json'
import type { PhotoDraft } from '../../../lib/photos'

// Stub only the browser-dependent lib helpers (FileReader sniff and canvas
// re-encode); the MIME validation and the 20-photo cap stay real.
vi.mock('../../../lib/photos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/photos')>()
  return {
    ...actual,
    validateMagicBytes: vi.fn(async () => true),
    compressImage: vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })),
  }
})

const i18n = createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } })

// Minimal parent that v-models the photo list, mirroring how the form owns it.
const Parent = defineComponent({
  components: { PhotoField },
  setup() {
    const photos = ref<PhotoDraft[]>([])
    return () =>
      h(PhotoField, {
        photos: photos.value,
        used: 0,
        'onUpdate:photos': (v: PhotoDraft[]) => {
          photos.value = v
        },
      })
  },
})

function mountField() {
  return mount(Parent, { global: { plugins: [i18n] } })
}

function setFiles(wrapper: ReturnType<typeof mountField>, count: number) {
  const input = wrapper.find('input[type="file"]')
  const files = Array.from(
    { length: count },
    (_, i) => new File(['x'], `p${i}.jpg`, { type: 'image/jpeg' }),
  )
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  return input.trigger('change')
}

describe('PhotoField', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the first 20 photos and rejects the 21st', async () => {
    const wrapper = mountField()

    await setFiles(wrapper, 21)
    await flushPromises()

    expect(wrapper.findAll('.photo-thumb').length).toBe(20)
    expect(wrapper.text()).toContain('Maximum of 20 photos reached.')
  })
})
