import { boot } from 'quasar/wrappers'

import { api, configureApi } from 'src/services/api'
import { useAuthStore } from 'src/stores/auth'


export default boot(async ({ app }) => {
  const authStore = useAuthStore()

  configureApi({
    getAccessToken: () => authStore.accessToken,
    getRefreshToken: () => authStore.refreshToken,
    onTokensRefreshed: (access, refresh) => {
      authStore.setTokens(access, refresh)
    },
    onUnauthorized: () => {
      authStore.setTokens(null, null)
      authStore.user = null
    },
  })

  app.config.globalProperties.$api = api

  // Boot session: silent anonymous if needed
  try {
    await authStore.ensureSession()
  } catch (err) {
    console.error('[boot] failed to establish session', err)
  }
})