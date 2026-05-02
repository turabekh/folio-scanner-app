<template>
  <q-page class="flex flex-center bg-grey-2">
    <q-card flat bordered class="q-pa-md" style="width: 380px; max-width: 90vw;">
      <q-card-section class="text-center">
        <div class="text-h5 q-mb-xs">Welcome back</div>
        <div class="text-body2 text-grey-7">Sign in to your account</div>
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
            :rules="[(v) => !!v || 'Password is required']"
            autocomplete="current-password"
            :disable="auth.loading"
          />

          <q-banner v-if="errorMessage" class="bg-red-1 text-red-9" rounded>
            {{ errorMessage }}
          </q-banner>

          <q-btn
            label="Sign in"
            type="submit"
            color="primary"
            class="full-width"
            unelevated
            :loading="auth.loading"
          />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center text-body2">
        Don't have an account?
        <router-link :to="{ name: 'register' }" class="text-primary">Create one</router-link>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from 'src/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const errorMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  try {
    await auth.login(email.value, password.value)
    const redirect = route.query.redirect || { name: 'documents' }
    router.replace(redirect)
  } catch (err) {
    errorMessage.value = err.response?.data?.detail || 'Sign in failed'
  }
}
</script>