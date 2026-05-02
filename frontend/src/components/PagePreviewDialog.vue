<template>
  <q-dialog
    v-model="open"
    maximized
    transition-show="fade"
    transition-hide="fade"
    @before-show="onBeforeShow"
    @hide="onHide"
  >
    <q-card class="preview-card column">
      <q-toolbar class="preview-toolbar">
        <q-btn flat dense round icon="close" v-close-popup />
        <q-toolbar-title class="text-body1">
          Page {{ currentPage?.page_number }} of {{ pages.length }}
        </q-toolbar-title>
        <q-space />
        <q-btn
          flat
          dense
          round
          icon="zoom_out_map"
          @click="resetZoom"
          aria-label="Reset zoom"
        >
          <q-tooltip>Reset zoom</q-tooltip>
        </q-btn>
      </q-toolbar>

      <div class="preview-stage" ref="stageRef">
        <div v-if="loading" class="absolute-center text-white">
          <q-spinner-dots size="48px" />
        </div>
        <img
          v-show="!loading && imageUrl"
          ref="imgRef"
          :src="imageUrl"
          :alt="`Page ${currentPage?.page_number}`"
          class="preview-img"
          draggable="false"
        />
      </div>

      <div class="preview-nav">
        <q-btn
          flat
          dense
          round
          icon="chevron_left"
          color="white"
          @click="goPrev"
          :disable="!canGoPrev"
          aria-label="Previous page"
        />
        <div class="text-white q-mx-md text-body2">
          {{ (currentIndex ?? 0) + 1 }} / {{ pages.length }}
        </div>
        <q-btn
          flat
          dense
          round
          icon="chevron_right"
          color="white"
          @click="goNext"
          :disable="!canGoNext"
          aria-label="Next page"
        />
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch, nextTick } from 'vue'

import { fetchPageImageBlob } from 'src/services/pages'

const props = defineProps({
  documentId: { type: String, required: true },
  pages: { type: Array, required: true },
  startIndex: { type: Number, default: 0 },
})

const open = defineModel({ type: Boolean, default: false })

const currentIndex = ref(props.startIndex)
const imageUrl = ref(null)
const loading = ref(false)
const imgRef = ref(null)
const stageRef = ref(null)

let panzoomInstance = null
let currentObjectUrl = null

const currentPage = computed(() => props.pages[currentIndex.value] ?? null)
const canGoPrev = computed(() => currentIndex.value > 0)
const canGoNext = computed(() => currentIndex.value < props.pages.length - 1)

watch(() => props.startIndex, (idx) => {
  currentIndex.value = idx
})

watch(currentPage, async (page) => {
  if (!page) return
  await loadImage(page)
}, { immediate: false })

async function onBeforeShow() {
  currentIndex.value = props.startIndex
  await loadImage(currentPage.value)
}

function onHide() {
  destroyPanzoom()
  revokeUrl()
  imageUrl.value = null
}

async function loadImage(page) {
  if (!page) return
  loading.value = true
  destroyPanzoom()
  revokeUrl()
  try {
    const blob = await fetchPageImageBlob(props.documentId, page.id, 'auto')
    currentObjectUrl = URL.createObjectURL(blob)
    imageUrl.value = currentObjectUrl
    await nextTick()
    initPanzoom()
  } catch (err) {
    console.error('[preview] failed to load image', err)
    imageUrl.value = null
  } finally {
    loading.value = false
  }
}

function initPanzoom() {
  if (!imgRef.value) return
  import('panzoom').then(({ default: panzoom }) => {
    if (!imgRef.value) return
    panzoomInstance = panzoom(imgRef.value, {
      maxZoom: 6,
      minZoom: 1,
      bounds: true,
      boundsPadding: 0.2,
      smoothScroll: false,
      zoomDoubleClickSpeed: 1.5,
    })
  })
}

function destroyPanzoom() {
  if (panzoomInstance) {
    panzoomInstance.dispose()
    panzoomInstance = null
  }
}

function revokeUrl() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

function resetZoom() {
  if (panzoomInstance) {
    panzoomInstance.zoomAbs(0, 0, 1)
    panzoomInstance.moveTo(0, 0)
  }
}

function goPrev() {
  if (canGoPrev.value) currentIndex.value -= 1
}

function goNext() {
  if (canGoNext.value) currentIndex.value += 1
}

function onKey(e) {
  if (!open.value) return
  if (e.key === 'ArrowLeft') goPrev()
  if (e.key === 'ArrowRight') goNext()
  if (e.key === 'Escape') open.value = false
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', onKey)
}

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKey)
  }
  destroyPanzoom()
  revokeUrl()
})
</script>

<style scoped>
.preview-card {
  background: #000;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.preview-toolbar {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 2;
  flex: 0 0 auto;
}

.preview-stage {
  flex: 1 1 auto;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  cursor: grab;
}

.preview-img:active {
  cursor: grabbing;
}

.preview-nav {
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
</style>