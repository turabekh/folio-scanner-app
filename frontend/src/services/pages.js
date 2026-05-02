import { api } from 'src/services/api'

export async function listPages(documentId) {
  const { data } = await api.get(`/documents/${documentId}/pages`)
  return data
}

export async function uploadPage(documentId, file) {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post(
    `/documents/${documentId}/pages`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data
}

export async function deletePage(documentId, pageId) {
  await api.delete(`/documents/${documentId}/pages/${pageId}`)
}

export async function fetchPageImageBlob(documentId, pageId) {
  const response = await api.get(
    `/documents/${documentId}/pages/${pageId}/image`,
    { responseType: 'blob' },
  )
  return response.data
}