const routes = [
  {
    path: '/',
    component: () => import('layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'documents',
        component: () => import('pages/DocumentsPage.vue'),
      },
    ],
  },
  {
    path: '/auth',
    component: () => import('layouts/AuthLayout.vue'),
    meta: { guestOnly: true },
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('pages/LoginPage.vue'),
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('pages/RegisterPage.vue'),
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes