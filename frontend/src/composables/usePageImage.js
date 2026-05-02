import { ref, watchEffect, onScopeDispose } from 'vue'

import { fetchPageImageBlob } from 'src/services/pages'


export function usePageImage(documentId, pageRef) {
  const url = ref(null)
  const loading = ref(false)
  const error = ref(null)

  let currentObjectUrl = null

  function revoke() {
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = null
    }
  }

  watchEffect(async () => {
    const page = pageRef.value
    if (!page || !page.id) {
      revoke()
      url.value = null
      return
    }

    loading.value = true
    error.value = null
    try {
      const blob = await fetchPageImageBlob(documentId, page.id)
      revoke()
      currentObjectUrl = URL.createObjectURL(blob)
      url.value = currentObjectUrl
    } catch (err) {
      error.value = err
      url.value = null
    } finally {
      loading.value = false
    }
  })

  onScopeDispose(revoke)

  return { url, loading, error }
}