import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '../api/cantieri'
import type { Cantiere, CantiereInput } from '../types'

export const useCantieriStore = defineStore('cantieri', () => {
  const items = ref<Cantiere[]>([])
  const loading = ref(false)
  // Last failure's raw message. Views render localised labels keyed off this
  // being set; the raw detail stays available for debugging.
  const error = ref('')

  function fail(e: unknown): never {
    error.value = e instanceof Error ? e.message : String(e)
    throw e
  }

  async function load(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      items.value = await api.listCantieri()
    } catch (e) {
      fail(e)
    } finally {
      loading.value = false
    }
  }

  async function create(input: CantiereInput): Promise<Cantiere> {
    loading.value = true
    error.value = ''
    try {
      const created = await api.createCantiere(input)
      items.value.push(created)
      return created
    } catch (e) {
      fail(e)
    } finally {
      loading.value = false
    }
  }

  async function update(id: string, input: CantiereInput): Promise<Cantiere> {
    loading.value = true
    error.value = ''
    try {
      const updated = await api.updateCantiere(id, input)
      const index = items.value.findIndex((c) => c.id === id)
      if (index !== -1) items.value[index] = updated
      return updated
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
      await api.deleteCantiere(id)
      items.value = items.value.filter((c) => c.id !== id)
    } catch (e) {
      fail(e)
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, load, create, update, remove }
})
