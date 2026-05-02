import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import * as authService from 'src/services/auth'


const ACCESS_TOKEN_KEY = 'scanner.access_token'
const REFRESH_TOKEN_KEY = 'scanner.refresh_token'


export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem(ACCESS_TOKEN_KEY))
  const refreshToken = ref(localStorage.getItem(REFRESH_TOKEN_KEY))
  const user = ref(null)
  const loading = ref(false)
  const initializing = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value)
  const isAnonymous = computed(() => user.value?.is_anonymous === true)
  const hasAccount = computed(
    () => isAuthenticated.value && user.value && user.value.is_anonymous === false
  )

  function setTokens(access, refresh) {
    accessToken.value = access
    refreshToken.value = refresh
    if (access) {
      localStorage.setItem(ACCESS_TOKEN_KEY, access)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
    if (refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  }

  async function ensureSession() {
    if (initializing.value) return
    initializing.value = true
    try {
      if (!accessToken.value) {
        const tokens = await authService.createAnonymous()
        setTokens(tokens.access_token, tokens.refresh_token)
      }
      await loadCurrentUser()
    } catch (err) {
      console.error('[auth] ensureSession failed', err)
      setTokens(null, null)
      user.value = null
      throw err
    } finally {
      initializing.value = false
    }
  }

  async function login(email, password) {
    loading.value = true
    try {
      const tokens = await authService.login(email, password)
      setTokens(tokens.access_token, tokens.refresh_token)
      await loadCurrentUser()
    } finally {
      loading.value = false
    }
  }

  async function register(email, password) {
    loading.value = true
    try {
      await authService.register(email, password)
      const tokens = await authService.login(email, password)
      setTokens(tokens.access_token, tokens.refresh_token)
      await loadCurrentUser()
    } finally {
      loading.value = false
    }
  }

  async function upgradeAccount(email, password) {
    loading.value = true
    try {
      const updated = await authService.upgradeAccount(email, password)
      user.value = updated
    } finally {
      loading.value = false
    }
  }

  async function loadCurrentUser() {
    if (!accessToken.value) {
      user.value = null
      return null
    }
    user.value = await authService.fetchMe()
    return user.value
  }

  async function logout() {
    setTokens(null, null)
    user.value = null
    // Immediately set up a fresh anonymous session
    try {
      await ensureSession()
    } catch {
      // best-effort
    }
  }

  return {
    accessToken,
    refreshToken,
    user,
    loading,
    initializing,
    isAuthenticated,
    isAnonymous,
    hasAccount,
    ensureSession,
    register,
    login,
    upgradeAccount,
    logout,
    loadCurrentUser,
    setTokens,
  }
})