import { api } from 'src/services/api'

export async function createAnonymous() {
  const { data } = await api.post('/auth/anonymous')
  return data
}

export async function register(email, password) {
  const { data } = await api.post('/auth/register', { email, password })
  return data
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function upgradeAccount(email, password) {
  const { data } = await api.post('/auth/upgrade', { email, password })
  return data
}

export async function refresh(refreshToken) {
  const { data } = await api.post('/auth/refresh', { refresh_token: refreshToken })
  return data
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me')
  return data
}