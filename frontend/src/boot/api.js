import { boot } from 'quasar/wrappers'

import { api, configureApi } from 'src/services/api'
import { useAuthStore } from 'src/stores/auth'


export default boot(({ app, router }) => {
  const authStore = useAuthStore()

  configureApi({
    getAccessToken: () => authStore.accessToken,
    onUnauthorized: () => {
      authStore.logout()
      const currentRoute = router.currentRoute.value
      if (currentRoute.name !== 'login') {
        router.push({ name: 'login' })
      }
    },
  })

  app.config.globalProperties.$api = api
})