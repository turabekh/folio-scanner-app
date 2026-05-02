<template>
  <q-page class="flex flex-center bg-grey-2">
    <q-card flat bordered class="q-pa-md" style="width: 380px; max-width: 90vw;">
      <q-card-section class="text-center">
        <div class="text-h5 q-mb-xs">Create account</div>
        <div class="text-body2 text-grey-7">Sign up to start scanning</div>
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="email"
            type="email"
            label="Email"
            outlined
            :rules="[(v) => !!v || 'Email is required']"
            autocomplete="email"
            :disable="auth.loading"
          />
          <q-input
            v-model="password"
            type="password"
            label="Password"
            outlined
            hint="At least 8 characters"
            :rules="[
              (v) => !!v || 'Password is required',
              (v) => v.length >= 8 || 'Minimum 8 characters',
            ]"
            autocomplete="new-password"
            :disable="auth.loading"
          />

          <q-banner v-if="errorMessage" class="bg-red-1 text-red-9" rounded>
            {{ errorMessage }}
          </q-banner>

          <q-btn
            label="Create account"
            type="submit"
            color="primary"
            class="full-width"
            unelevated
            :loading="auth.loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center text-body2">
        Already have an account?
        <router-link :to="{ name: 'login' }" class="text-primary">Sign in</router-link>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAuthStore } from 'src/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  try {
    await auth.register(email.value, password.value)
    router.replace({ name: 'documents' })
  } catch (err) {
    errorMessage.value = err.response?.data?.detail || 'Registration failed'
  }
}
</script>