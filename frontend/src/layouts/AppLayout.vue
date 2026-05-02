<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          <router-link
            :to="{ name: 'documents' }"
            class="text-white text-decoration-none"
            style="text-decoration: none; color: inherit"
          >
            Folio
          </router-link>
        </q-toolbar-title>
        <q-btn flat round dense icon="search" :to="{ name: 'search' }" aria-label="Search" />
        <q-btn-dropdown flat :label="auth.user?.email? auth.user?.email[0] : 'A' || 'Account'">
          <q-list>
            <q-item clickable v-close-popup @click="onShowBatteryHelp" v-if="isNative">
              <q-item-section avatar>
                <q-icon name="battery_charging_full" />
              </q-item-section>
              <q-item-section>Battery settings</q-item-section>
            </q-item>
            <q-separator v-if="isNative" />
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

    <BatteryOptimizationDialog v-model="batteryDialogOpen" />
  </q-layout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'

import { useAuthStore } from 'src/stores/auth'
import { hasShownBatteryOnboarding } from 'src/composables/useBatteryOptimization'
import BatteryOptimizationDialog from 'src/components/BatteryOptimizationDialog.vue'

const auth = useAuthStore()
const router = useRouter()

const batteryDialogOpen = ref(false)
const isNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

onMounted(async () => {
  const alreadyShown = await hasShownBatteryOnboarding()
  if (!alreadyShown) {
    setTimeout(() => {
      batteryDialogOpen.value = true
    }, 800)
  }
})

function onShowBatteryHelp() {
  batteryDialogOpen.value = true
}

function onLogout() {
  auth.logout()
  router.replace({ name: 'login' })
}
</script>
