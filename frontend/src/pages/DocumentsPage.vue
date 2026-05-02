<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Your documents</div>
    <q-banner class="bg-blue-1 text-blue-9" rounded>
      Documents list coming in the next step. You're authenticated as
      <strong>{{ auth.user?.email }}</strong>.
    </q-banner>
  </q-page>
</template>

<script setup>
import { useAuthStore } from 'src/stores/auth'

const auth = useAuthStore()
</script>