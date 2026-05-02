<template>
  <q-card flat bordered class="page-thumbnail">
    <div class="thumbnail-wrap">
      <q-spinner-dots
        v-if="image.loading.value && !image.url.value"
        class="absolute-center"
        color="primary"
        size="32px"
      />
      <img
        v-if="image.url.value"
        :src="image.url.value"
        :alt="`Page ${page.page_number}`"
        class="thumbnail-img"
      />
      <q-icon
        v-else-if="image.error.value"
        name="broken_image"
        size="48px"
        color="grey-5"
        class="absolute-center"
      />
    </div>
    <q-card-section class="q-py-xs row items-center">
      <div class="text-caption">Page {{ page.page_number }}</div>
      <q-space />
      <q-btn
        flat
        round
        dense
        size="sm"
        icon="delete"
        color="grey-7"
        @click.stop="$emit('delete', page)"
      />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { toRef } from 'vue'

import { usePageImage } from 'src/composables/usePageImage'

const props = defineProps({
  documentId: { type: String, required: true },
  page: { type: Object, required: true },
})

defineEmits(['delete'])

const image = usePageImage(props.documentId, toRef(props, 'page'))
</script>

<style scoped>
.page-thumbnail {
  width: 160px;
}

.thumbnail-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1.4;
  background: #f4f4f4;
  overflow: hidden;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>