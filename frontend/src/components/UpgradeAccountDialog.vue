<template>
  <q-dialog v-model="open" persistent>
    <q-card style="min-width: 320px; max-width: 480px;">
      <q-card-section class="text-center q-pt-lg">
        <q-icon name="cloud_upload" size="64px" color="primary" />
        <div class="text-h6 q-mt-md">{{ resolvedTitle }}</div>
      </q-card-section>

      <q-tabs
        v-model="mode"
        dense
        align="justify"
        active-color="primary"
        indicator-color="primary"
      >
        <q-tab name="signup" label="Sign up" />
        <q-tab name="signin" label="Sign in" />
      </q-tabs>
      <q-separator />

      <q-card-section class="q-pt-md">
        <p v-if="mode === 'signup'" class="text-body2 q-mb-md">
          {{ resolvedDescription }}
        </p>
        <p v-else class="text-body2 q-mb-md">
          Sign in with your existing account.
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
            :label="mode === 'signup' ? 'Password (8+ characters)' : 'Password'"
            outlined
            :rules="passwordRules"
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat label="Cancel" color="grey-7" @click="onCancel" />
        <q-btn
          unelevated
          :label="mode === 'signup' ? 'Create account' : 'Sign in'"
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

const props = defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
})

const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['upgraded', 'signed-in', 'cancelled'])

const $q = useQuasar()
const auth = useAuthStore()

const mode = ref('signup')
const email = ref('')
const password = ref('')
const submitting = ref(false)

const canSubmit = computed(() => {
  if (!email.value.includes('@')) return false
  if (mode.value === 'signup') return password.value.length >= 8
  return password.value.length > 0
})

const passwordRules = computed(() => {
  if (mode.value === 'signup') {
    return [(v) => v.length >= 8 || 'At least 8 characters']
  }
  return [(v) => !!v || 'Password is required']
})

const resolvedTitle = computed(() => props.title || 'Save your scans')
const resolvedDescription = computed(
  () =>
    props.description ||
    'Create an account to keep your scans safe and access them on any device.'
)

watch(open, (val) => {
  if (val) {
    mode.value = 'signup'
    email.value = ''
    password.value = ''
  }
})

async function onSubmit() {
  if (!canSubmit.value) return
  submitting.value = true
  try {
    if (mode.value === 'signup') {
      await auth.upgradeAccount(email.value.trim(), password.value)
      $q.notify({ type: 'positive', message: 'Account created', position: 'top' })
      open.value = false
      emit('upgraded')
    } else {
      await auth.login(email.value.trim(), password.value)
      $q.notify({ type: 'positive', message: 'Signed in', position: 'top' })
      open.value = false
      emit('signed-in')
    }
  } catch (err) {
    const detail = err.response?.data?.detail
    let message = detail
    if (!message) {
      message =
        mode.value === 'signup'
          ? 'Failed to create account'
          : 'Failed to sign in'
    }
    $q.notify({ type: 'negative', message, position: 'top' })
  } finally {
    submitting.value = false
  }
}

function onCancel() {
  open.value = false
  emit('cancelled')
}
</script>