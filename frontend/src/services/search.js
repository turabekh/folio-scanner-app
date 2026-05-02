import { api } from 'src/services/api'

export async function searchDocuments(query) {
  const { data } = await api.get('/search', { params: { q: query } })
  return data
}