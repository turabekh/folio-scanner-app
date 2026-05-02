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
      <q-inner-loading :showing="enhancing || ocrRunning">
        <q-spinner-dots color="primary" size="32px" />
        <div v-if="ocrRunning" class="text-caption q-mt-sm text-primary">
          Reading text...
        </div>
      </q-inner-loading>
    </div>
    <q-card-section class="q-py-xs row items-center">
      <div class="text-caption">
        Page {{ page.page_number }}
        <q-icon
          v-if="page.ocr_text"
          name="text_fields"
          size="14px"
          color="green-7"
          class="q-ml-xs"
        >
          <q-tooltip>Has extracted text</q-tooltip>
        </q-icon>
      </div>
      <q-space />
      <q-btn-dropdown flat dense size="sm" icon="palette" :disable="enhancing || ocrRunning">
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
        size="sm"
        icon="text_fields"
        @click.stop="onOcrClick"
        :disable="enhancing || ocrRunning"
      >
        <q-tooltip>{{ page.ocr_text ? 'View text' : 'Extract text' }}</q-tooltip>
      </q-btn>
      <q-btn
        flat
        round
        dense
        size="sm"
        icon="delete"
        color="grey-7"
        @click.stop="$emit('delete', page)"
        :disable="enhancing || ocrRunning"
      />
    </q-card-section>

    <q-dialog v-model="textDialog">
      <q-card style="min-width: 320px; max-width: 600px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Page {{ page.page_number }} text</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div v-if="!page.ocr_text" class="text-grey-7 text-body2">
            No text extracted yet.
          </div>
          <q-input
            v-else
            type="textarea"
            :model-value="page.ocr_text"
            readonly
            outlined
            autogrow
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            v-if="page.ocr_text"
            flat
            label="Copy"
            icon="content_copy"
            @click="onCopyText"
          />
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

const emit = defineEmits(['delete', 'updated'])

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
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>