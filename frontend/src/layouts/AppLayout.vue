<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>Scanner</q-toolbar-title>
        <q-btn-dropdown flat :label="auth.user?.email || 'Account'">
          <q-list>
            <q-item clickable v-close-popup @click="onLogout">
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>Sign out</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { useRouter } from 'vue-router'

import { useAuthStore } from 'src/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function onLogout() {
  auth.logout()
  router.replace({ name: 'login' })
}
</script>