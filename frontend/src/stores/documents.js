import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import * as documentsService from 'src/services/documents'


export const useDocumentsStore = defineStore('documents', () => {
  const items = ref([])
  const loading = ref(false)
  const error = ref(null)

  const isEmpty = computed(() => !loading.value && items.value.length === 0)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      items.value = await documentsService.listDocuments()
    } catch (err) {
      error.value = err.response?.data?.detail || 'Failed to load documents'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function create(title) {
    const document = await documentsService.createDocument(title)
    items.value = [document, ...items.value]
    return document
  }

  async function remove(documentId) {
    await documentsService.deleteDocument(documentId)
    items.value = items.value.filter((d) => d.id !== documentId)
  }

  function reset() {
    items.value = []
    error.value = null
  }

  return {
    items,
    loading,
    error,
    isEmpty,
    fetchAll,
    create,
    remove,
    reset,
  }
})