<template>
  <q-dialog v-model="open" persistent>
    <q-card style="min-width: 320px; max-width: 480px;">
      <q-card-section class="text-center q-pt-lg">
        <q-icon name="battery_charging_full" size="64px" color="primary" />
        <div class="text-h6 q-mt-md">Help Scanner work reliably</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p class="text-body2">
          Android's battery saver can interrupt scanning, causing pages to be lost when filters are applied.
        </p>
        <p class="text-body2 q-mt-md">
          To prevent this, please allow Scanner to run without battery restrictions.
        </p>
        <q-banner class="bg-blue-1 text-blue-9 q-mt-md" rounded>
          <template v-slot:avatar>
            <q-icon name="info" />
          </template>
          On the next screen, find <strong>Scanner</strong> and select
          <strong>"No restrictions"</strong> or <strong>"Don't optimize"</strong>.
        </q-banner>
      </q-card-section>

      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn
          flat
          label="Skip for now"
          color="grey-7"
          @click="onSkip"
        />
        <q-btn
          unelevated
          label="Open settings"
          color="primary"
          icon-right="open_in_new"
          @click="onOpenSettings"
          :loading="opening"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref } from 'vue'

import {
  markBatteryOnboardingShown,
  openBatterySettings,
} from 'src/composables/useBatteryOptimization'

const open = defineModel({ type: Boolean, default: false })
const opening = ref(false)

async function onOpenSettings() {
  opening.value = true
  try {
    const success = await openBatterySettings()
    await markBatteryOnboardingShown()
    if (success) {
      open.value = false
    }
  } finally {
    opening.value = false
  }
}

async function onSkip() {
  await markBatteryOnboardingShown()
  open.value = false
}
</script>