import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api.localhost'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let getAccessToken = () => null
let getRefreshToken = () => null
let onTokensRefreshed = () => {}
let onUnauthorized = () => {}

export function configureApi(options) {
  if (options.getAccessToken) getAccessToken = options.getAccessToken
  if (options.getRefreshToken) getRefreshToken = options.getRefreshToken
  if (options.onTokensRefreshed) onTokensRefreshed = options.onTokensRefreshed
  if (options.onUnauthorized) onUnauthorized = options.onUnauthorized
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

async function performRefresh() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token')
  }
  const { data } = await axios.post(
    `${baseURL}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  )
  onTokensRefreshed(data.access_token, data.refresh_token)
  return data.access_token
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      getRefreshToken()
    ) {
      originalRequest._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh().finally(() => {
            refreshPromise = null
          })
        }
        const newAccessToken = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch {
        onUnauthorized()
        return Promise.reject(error)
      }
    }

    if (status === 401) {
      onUnauthorized()
    }

    return Promise.reject(error)
  },
)