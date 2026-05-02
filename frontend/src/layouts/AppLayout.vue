<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          <router-link
            :to="{ name: 'documents' }"
            class="text-white"
            style="text-decoration: none; color: inherit;"
          >
            Folio
          </router-link>
        </q-toolbar-title>
        <q-btn
          flat
          round
          dense
          icon="search"
          :to="{ name: 'search' }"
          aria-label="Search"
        />
        <q-btn-dropdown flat icon="account_circle">
          <q-list>
            <q-item v-if="auth.hasAccount" disable>
              <q-item-section>
                <q-item-label class="text-caption text-grey-7">Signed in as</q-item-label>
                <q-item-label>{{ auth.user?.email }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-else disable>
              <q-item-section>
                <q-item-label class="text-caption text-grey-7">Account</q-item-label>
                <q-item-label class="text-grey-7">No account yet</q-item-label>
              </q-item-section>
            </q-item>

            <q-separator />

            <q-item v-if="auth.isAnonymous" clickable v-close-popup @click="onCreateAccount">
              <q-item-section avatar>
                <q-icon name="person_add" />
              </q-item-section>
              <q-item-section>Create account</q-item-section>
            </q-item>

            <q-item v-if="auth.isAnonymous" clickable v-close-popup :to="{ name: 'login' }">
              <q-item-section avatar>
                <q-icon name="login" />
              </q-item-section>
              <q-item-section>Sign in</q-item-section>
            </q-item>

            <q-item clickable v-close-popup @click="onShowBatteryHelp" v-if="isNative">
              <q-item-section avatar>
                <q-icon name="battery_charging_full" />
              </q-item-section>
              <q-item-section>Battery settings</q-item-section>
            </q-item>

            <q-separator v-if="auth.hasAccount" />

            <q-item v-if="auth.hasAccount" clickable v-close-popup @click="onSignOut">
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
    <UpgradeAccountDialog v-model="upgradeDialogOpen" />
  </q-layout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { Capacitor } from '@capacitor/core'

import { useAuthStore } from 'src/stores/auth'
import { hasShownBatteryOnboarding } from 'src/composables/useBatteryOptimization'
import BatteryOptimizationDialog from 'src/components/BatteryOptimizationDialog.vue'
import UpgradeAccountDialog from 'src/components/UpgradeAccountDialog.vue'

const auth = useAuthStore()

const batteryDialogOpen = ref(false)
const upgradeDialogOpen = ref(false)
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

function onCreateAccount() {
  upgradeDialogOpen.value = true
}

async function onSignOut() {
  await auth.logout()
  // Stay on the same page — user has a fresh anonymous session
}
</script>