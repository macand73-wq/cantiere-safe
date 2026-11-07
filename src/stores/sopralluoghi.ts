import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '../api/sopralluoghi'
import type { SopralluogoDraft } from '../api/sopralluoghi'
import type { Sopralluogo } from '../types'

export const useSopralluoghiStore = defineStore('sopralluoghi', () => {
  const items = ref<Sopralluogo[]>([])
  const loading = ref(false)
  const error = ref('')

  function fail(e: unknown): never {
    error.value = e instanceof Error ? e.message : String(e)
    throw e
  }

  async function load(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      items.value = await api.listSopralluoghi()
    } catch (e) {
      fail(e)
    } finally {
      loading.value = false
    }
  }

  async function save(draft: SopralluogoDraft): Promise<Sopralluogo> {
    loading.value = true
    error.value = ''
    try {
      const saved = await api.saveSopralluogo(draft)
      const index = items.value.findIndex((s) => s.id === saved.id)
      if (index === -1) items.value.push(saved)
      else items.value[index] = saved
      return saved
    } catch (e) {
      fail(e)
    } finally {
      loading.value = false
    }
  }

  async function remove(id: string): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      await api.deleteSopralluogo(id)
      items.value = items.value.filter((s) => s.id !== id)
    } catch (e) {
      fail(e)
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, load, save, remove }
})
