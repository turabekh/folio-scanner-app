import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api.localhost'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let getAccessToken = () => null
let onUnauthorized = () => {}

export function configureApi(options) {
  if (options.getAccessToken) {
    getAccessToken = options.getAccessToken
  }
  if (options.onUnauthorized) {
    onUnauthorized = options.onUnauthorized
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorized()
    }
    return Promise.reject(error)
  },
)