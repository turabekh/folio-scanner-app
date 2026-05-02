import { api } from 'src/services/api'

export async function listDocuments() {
  const { data } = await api.get('/documents')
  return data
}

export async function getDocument(documentId) {
  const { data } = await api.get(`/documents/${documentId}`)
  return data
}

export async function createDocument(title, kind = 'document') {
  const { data } = await api.post('/documents', { title, kind })
  return data
}

export async function updateDocument(documentId, { title }) {
  const { data } = await api.patch(`/documents/${documentId}`, { title })
  return data
}

export async function deleteDocument(documentId) {
  await api.delete(`/documents/${documentId}`)
}

export async function fetchDocumentPdfBlob(documentId) {
  const response = await api.get(`/documents/${documentId}/pdf`, {
    responseType: 'blob',
  })
  return response.data
}