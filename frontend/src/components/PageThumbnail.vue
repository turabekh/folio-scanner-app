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
      <q-inner-loading :showing="enhancing">
        <q-spinner-dots color="primary" size="32px" />
      </q-inner-loading>
    </div>
    <q-card-section class="q-py-xs row items-center">
      <div class="text-caption">
        Page {{ page.page_number }}
      </div>
      <q-space />
      <q-btn-dropdown flat dense size="sm" icon="palette" :disable="enhancing">
        <q-list>
          <q-item
            v-for="option in filterOptions"
            :key="option.value"
            clickable
            v-close-popup
            @click="onFilterSelect(option.value)"
            :active="(page.filter_applied || 'original') === option.value"
          >
            <q-item-section avatar>
              <q-icon :name="option.icon" />
            </q-item-section>
            <q-item-section>{{ option.label }}</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <q-btn
        flat
        round
        dense
        size="sm"
        icon="delete"
        color="grey-7"
        @click.stop="$emit('delete', page)"
        :disable="enhancing"
      />
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { useQuasar } from 'quasar'

import { usePageImage } from 'src/composables/usePageImage'
import { enhancePage } from 'src/services/pages'

const props = defineProps({
  documentId: { type: String, required: true },
  page: { type: Object, required: true },
})

const emit = defineEmits(['delete', 'updated'])

const $q = useQuasar()
const image = usePageImage(props.documentId, toRef(props, 'page'))
const enhancing = ref(false)

const filterOptions = [
  { value: 'original', label: 'Original', icon: 'image' },
  { value: 'magic', label: 'Magic', icon: 'auto_fix_high' },
  { value: 'bw', label: 'Black & white', icon: 'contrast' },
  { value: 'gray', label: 'Grayscale', icon: 'gradient' },
]

async function onFilterSelect(filter) {
  if (filter === (props.page.filter_applied || 'original')) return

  enhancing.value = true
  try {
    const updated = await enhancePage(props.documentId, props.page.id, filter)
    emit('updated', updated)
    $q.notify({ type: 'positive', message: 'Filter applied', position: 'top' })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail || 'Failed to apply filter',
      position: 'top',
    })
  } finally {
    enhancing.value = false
  }
}
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