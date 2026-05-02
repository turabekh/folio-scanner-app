<template>
  <q-page padding>
    <q-btn
      flat
      icon="arrow_back"
      label="Back"
      :to="{ name: 'documents' }"
      class="q-mb-sm"
      no-caps
    />

    <div v-if="loading" class="text-center q-mt-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <q-banner v-else-if="error" class="bg-red-1 text-red-9" rounded>
      {{ error }}
    </q-banner>

    <template v-else-if="document">
      <div class="row items-center q-mb-md q-gutter-sm">
        <div>
          <div class="text-h5">{{ document.title }}</div>
          <div class="text-caption text-grey-7">
            {{ pages.length }} {{ pages.length === 1 ? 'page' : 'pages' }}
          </div>
        </div>
        <q-space />
        <q-btn
          v-if="pages.length > 0"
          icon="picture_as_pdf"
          label="PDF"
          color="grey-8"
          flat
          no-caps
          @click="onDownloadPdf"
          :loading="generatingPdf"
        />
        <q-btn
          :label="isNative ? 'Scan' : 'Add page'"
          :icon="isNative ? 'document_scanner' : 'add_a_photo'"
          color="primary"
          unelevated
          @click="onCaptureClick"
          :loading="uploading"
        />
      </div>

      <div v-if="pages.length === 0" class="text-center q-mt-xl text-grey-7">
        <q-icon :name="isNative ? 'document_scanner' : 'add_a_photo'" size="64px" class="q-mb-md" />
        <div class="text-h6">No pages yet</div>
        <div class="text-body2 q-mt-sm">
          {{ isNative ? 'Tap "Scan" to capture a page.' : 'Tap "Add page" to upload a scan.' }}
        </div>
      </div>

      <div v-else class="row q-col-gutter-md">
        <PageThumbnail
          v-for="page in pages"
          :key="page.id"
          :document-id="document.id"
          :page="page"
          @delete="onDeletePage"
          @updated="onPageUpdated"
        />
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

import * as documentsService from 'src/services/documents'
import * as pagesService from 'src/services/pages'
import { captureDocument, isNativePlatform } from 'src/composables/useScanner'
import PageThumbnail from 'src/components/PageThumbnail.vue'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()

const documentId = route.params.id
const document = ref(null)
const pages = ref([])
const loading = ref(true)
const error = ref(null)
const uploading = ref(false)
const generatingPdf = ref(false)

const isNative = isNativePlatform()

onMounted(async () => {
  await loadDocument()
})

async function loadDocument() {
  loading.value = true
  error.value = null
  try {
    const [docData, pagesData] = await Promise.all([
      documentsService.getDocument(documentId),
      pagesService.listPages(documentId),
    ])
    document.value = docData
    pages.value = pagesData
  } catch (err) {
    if (err.response?.status === 404) {
      router.replace({ name: 'documents' })
      return
    }
    error.value = err.response?.data?.detail || 'Failed to load document'
  } finally {
    loading.value = false
  }
}

async function onCaptureClick() {
  let files = []
  try {
    files = await captureDocument()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err?.message || 'Failed to capture',
      position: 'top',
    })
    return
  }

  if (files.length === 0) return

  uploading.value = true
  try {
    for (const file of files) {
      const newPage = await pagesService.uploadPage(documentId, file)
      pages.value = [...pages.value, newPage]
    }
    if (document.value) {
      document.value = { ...document.value, page_count: pages.value.length }
    }
    $q.notify({
      type: 'positive',
      message: files.length === 1 ? 'Page added' : `${files.length} pages added`,
      position: 'top',
    })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail || 'Failed to upload page',
      position: 'top',
    })
  } finally {
    uploading.value = false
  }
}

async function onDeletePage(page) {
  $q.dialog({
    title: 'Delete page?',
    message: `Page ${page.page_number} will be permanently deleted.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await pagesService.deletePage(documentId, page.id)
      pages.value = pages.value.filter((p) => p.id !== page.id)
      if (document.value) {
        document.value = { ...document.value, page_count: pages.value.length }
      }
      $q.notify({ type: 'positive', message: 'Page deleted', position: 'top' })
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err.response?.data?.detail || 'Failed to delete page',
        position: 'top',
      })
    }
  })
}

function onPageUpdated(updated) {
  pages.value = pages.value.map((p) => (p.id === updated.id ? updated : p))
}

async function onDownloadPdf() {
  generatingPdf.value = true
  try {
    const blob = await documentsService.fetchDocumentPdfBlob(documentId)
    const url = URL.createObjectURL(blob)
    const safeName = (document.value?.title || 'document').replace(/[^\w\s-]/g, '_').slice(0, 80)
    const link = window.document.createElement('a')
    link.href = url
    link.download = `${safeName}.pdf`
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    $q.notify({ type: 'positive', message: 'PDF ready', position: 'top' })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail || 'Failed to generate PDF',
      position: 'top',
    })
  } finally {
    generatingPdf.value = false
  }
}
</script>