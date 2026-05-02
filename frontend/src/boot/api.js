import { boot } from 'quasar/wrappers'

import { api, configureApi } from 'src/services/api'
import { useAuthStore } from 'src/stores/auth'


export default boot(({ app, router }) => {
  console.log('[boot] api boot starting at', new Date().toISOString())

  const authStore = useAuthStore()

  configureApi({
    getAccessToken: () => authStore.accessToken,
    getRefreshToken: () => authStore.refreshToken,
    onTokensRefreshed: (access, refresh) => {
      authStore.setTokens(access, refresh)
    },
    onUnauthorized: () => {
      authStore.logout()
      const currentRoute = router.currentRoute.value
      if (currentRoute.name !== 'login') {
        router.push({ name: 'login' })
      }
    },
  })

  app.config.globalProperties.$api = api

  if (typeof window !== 'undefined') {
    window.__appBootCount = (window.__appBootCount || 0) + 1
    console.log('[boot] app boot count:', window.__appBootCount)

    window.addEventListener('beforeunload', () => {
      console.log('[boot] beforeunload fired')
    })

    window.addEventListener('pagehide', () => {
      console.log('[boot] pagehide fired')
    })

    document.addEventListener('visibilitychange', () => {
      console.log('[boot] visibility:', document.visibilityState)
    })
  }
})