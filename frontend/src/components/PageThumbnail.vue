<template>
  <q-card flat bordered class="page-thumbnail">
    <div class="thumbnail-wrap" @click="$emit('preview', page)">
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
      <q-inner-loading :showing="enhancing || ocrRunning">
        <q-spinner-dots color="primary" size="32px" />
        <div v-if="ocrRunning" class="text-caption q-mt-sm text-primary">Reading text...</div>
      </q-inner-loading>
    </div>
    <div class="thumb-actions row no-wrap">
      <q-btn-dropdown
        flat
        dense
        no-caps
        icon="palette"
        class="col"
        :disable="enhancing || ocrRunning"
        no-icon-animation
        dropdown-icon=""
      >
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
        dense
        :icon="page.ocr_text ? 'text_fields' : 'text_fields'"
        :color="page.ocr_text ? 'green-7' : ''"
        class="col"
        @click.stop="onOcrClick"
        :disable="enhancing || ocrRunning"
      >
        <q-tooltip>{{ page.ocr_text ? 'View text' : 'Extract text' }}</q-tooltip>
      </q-btn>
      <q-btn
        flat
        dense
        icon="delete"
        color="orange-4"
        class="col"
        @click.stop="$emit('delete', page)"
        :disable="enhancing || ocrRunning"
      />
    </div>

    <q-dialog v-model="textDialog">
      <q-card style="min-width: 320px; max-width: 600px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Page {{ page.page_number }} text</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div v-if="!page.ocr_text" class="text-grey-7 text-body2">No text extracted yet.</div>
          <q-input v-else type="textarea" :model-value="page.ocr_text" readonly outlined autogrow />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-if="page.ocr_text" flat label="Copy" icon="content_copy" @click="onCopyText" />
          <q-btn
            unelevated
            color="primary"
            :label="page.ocr_text ? 'Re-extract' : 'Extract text'"
            @click="onExtractClick"
            :loading="ocrRunning"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup>
import { ref, toRef } from 'vue'
import { useQuasar, copyToClipboard } from 'quasar'

import { usePageImage } from 'src/composables/usePageImage'
import { extractTextForPage } from 'src/composables/useOcr'
import { enhancePage } from 'src/services/pages'

const props = defineProps({
  documentId: { type: String, required: true },
  page: { type: Object, required: true },
})

const emit = defineEmits(['delete', 'updated', 'preview'])

const $q = useQuasar()
const image = usePageImage(props.documentId, toRef(props, 'page'))

const enhancing = ref(false)
const ocrRunning = ref(false)
const textDialog = ref(false)

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

function onOcrClick() {
  textDialog.value = true
  if (!props.page.ocr_text) {
    onExtractClick()
  }
}

async function onExtractClick() {
  ocrRunning.value = true
  try {
    const updated = await extractTextForPage(props.documentId, props.page.id)
    emit('updated', updated)
    $q.notify({ type: 'positive', message: 'Text extracted', position: 'top' })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail || err.message || 'Failed to extract text',
      position: 'top',
    })
  } finally {
    ocrRunning.value = false
  }
}

async function onCopyText() {
  try {
    await copyToClipboard(props.page.ocr_text || '')
    $q.notify({ type: 'positive', message: 'Copied to clipboard', position: 'top' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to copy', position: 'top' })
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
  cursor: pointer;
  transition: opacity 0.15s;
}

.thumbnail-wrap:hover {
  opacity: 0.85;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumb-actions {
  border-top: 1px solid #e0e0e0;
}

.thumb-actions :deep(.q-btn) {
  min-width: 0;
  padding: 6px 0;
  border-radius: 0;
}

.thumb-actions :deep(.q-btn:not(:last-child)) {
  border-right: 1px solid #e0e0e0;
}
</style>