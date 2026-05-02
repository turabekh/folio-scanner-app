<template>
  <q-dialog v-model="open" persistent>
    <q-card style="min-width: 320px; max-width: 480px;">
      <q-card-section class="text-center q-pt-lg">
        <q-icon name="cloud_upload" size="64px" color="primary" />
        <div class="text-h6 q-mt-md">Save your scans</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <p class="text-body2 q-mb-md">
          Create an account to keep your scans safe and access them on any device.
        </p>
        <q-form @submit.prevent="onSubmit" class="q-gutter-md">
          <q-input
            v-model="email"
            type="email"
            label="Email"
            outlined
            autofocus
            :rules="[(v) => !!v || 'Email is required']"
          />
          <q-input
            v-model="password"
            type="password"
            label="Password (8+ characters)"
            outlined
            :rules="[(v) => v.length >= 8 || 'At least 8 characters']"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat label="Cancel" color="grey-7" @click="onCancel" />
        <q-btn
          unelevated
          label="Create account"
          color="primary"
          @click="onSubmit"
          :loading="submitting"
          :disable="!canSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useQuasar } from 'quasar'

import { useAuthStore } from 'src/stores/auth'

const open = defineModel({ type: Boolean, default: false })
const $q = useQuasar()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const submitting = ref(false)

const canSubmit = computed(
  () => email.value.includes('@') && password.value.length >= 8
)

watch(open, (val) => {
  if (val) {
    email.value = ''
    password.value = ''
  }
})

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    await auth.upgradeAccount(email.value.trim(), password.value)
    open.value = false
    $q.notify({
      type: 'positive',
      message: 'Account created. Your scans are saved.',
      position: 'top',
    })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail || 'Failed to create account',
      position: 'top',
    })
  } finally {
    submitting.value = false
  }
}

function onCancel() {
  open.value = false
}
</script>