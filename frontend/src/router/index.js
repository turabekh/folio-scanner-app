import { defineRouter } from '#q-app/wrappers'
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router'

import { useAuthStore } from 'src/stores/auth'
import routes from './routes'


export default defineRouter(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  })

  Router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (auth.isAuthenticated && !auth.user) {
      try {
        await auth.loadCurrentUser()
      } catch {
        auth.logout()
      }
    }

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (to.meta.guestOnly && auth.isAuthenticated) {
      return { name: 'documents' }
    }

    return true
  })

  return Router
})