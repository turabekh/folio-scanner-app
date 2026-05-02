<template>
  <q-page padding>
    <div v-if="loading" class="text-center q-mt-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <q-banner v-else-if="error" class="bg-red-1 text-red-9" rounded>
      {{ error }}
    </q-banner>

    <template v-else-if="document">
      <div class="row q-gutter-sm q-mb-sm justify-center items-center q-gutter-lg">
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
          v-if="pages.length > 0"
          icon="share"
          label="Share"
          color="grey-8"
          flat
          no-caps
          @click="onSharePdf"
          :loading="sharing"
        />
        <q-btn
          :label="isNative ? 'Scan' : 'Add'"
          :icon="isNative ? 'document_scanner' : 'add_a_photo'"
          color="primary"
          unelevated
          no-caps
          rounded
          @click="onCaptureClick"
          :loading="uploading"
        />
      </div>
      <q-separator class="q-my-sm" />
      <div class="row items-center q-mb-md">
        <q-input
          v-model="titleDraft"
          dense
          borderless
          class="text-h5 doc-title-input col"
          input-class="text-h5"
          :readonly="!editingTitle"
          @focus="editingTitle = true"
          @blur="onTitleBlur"
          @keyup.enter="onTitleEnter"
        />
        <q-btn
          v-if="!editingTitle"
          flat
          round
          dense
          icon="edit"
          color="grey-7"
          size="sm"
          @click="onStartEditTitle"
          aria-label="Rename"
        />
      </div>
      <div v-if="pages.length === 0" class="text-center q-mt-xl text-grey-7">
        <q-icon :name="isNative ? 'document_scanner' : 'add_a_photo'" size="64px" class="q-mb-md" />
        <div class="text-h6">No pages yet</div>
        <div class="text-body2 q-mt-sm">
          {{ isNative ? 'Tap "Scan" to capture a page.' : 'Tap "Add" to upload a scan.' }}
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
          @preview="onPreviewPage"
        />
      </div>

      <PagePreviewDialog
        v-if="document"
        v-model="previewOpen"
        :document-id="document.id"
        :pages="pages"
        :start-index="previewIndex"
      />
    </template>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { Capacitor } from '@capacitor/core'
import { shareBlob, ShareUnsupportedError } from 'src/composables/useShare'

import * as documentsService from 'src/services/documents'
import * as pagesService from 'src/services/pages'
import { captureDocument, isNativePlatform } from 'src/composables/useScanner'
import PageThumbnail from 'src/components/PageThumbnail.vue'
import PagePreviewDialog from 'src/components/PagePreviewDialog.vue'

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
const sharing = ref(false)

const previewOpen = ref(false)
const previewIndex = ref(0)
const titleDraft = ref('')
const editingTitle = ref(false)

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
    titleDraft.value = docData.title
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

function onStartEditTitle() {
  editingTitle.value = true
  setTimeout(() => {
    const input = window.document.querySelector('.doc-title-input input')
    input?.focus()
    input?.select()
  }, 50)
}

async function onTitleBlur() {
  if (!editingTitle.value) return
  editingTitle.value = false
  const trimmed = titleDraft.value.trim()
  if (!trimmed || trimmed === document.value?.title) {
    titleDraft.value = document.value?.title || ''
    return
  }
  try {
    const updated = await documentsService.updateDocument(documentId, {
      title: trimmed,
    })
    document.value = updated
    titleDraft.value = updated.title
  } catch (err) {
    titleDraft.value = document.value?.title || ''
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail || 'Failed to rename',
      position: 'top',
    })
  }
}

function onTitleEnter(event) {
  event.target.blur()
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

function onPreviewPage(page) {
  const idx = pages.value.findIndex((p) => p.id === page.id)
  if (idx >= 0) {
    previewIndex.value = idx
    previewOpen.value = true
  }
}

async function onDownloadPdf() {
  generatingPdf.value = true
  try {
    const blob = await documentsService.fetchDocumentPdfBlob(documentId)
    const safeName = (document.value?.title || 'document').replace(/[^\w\s-]/g, '_').slice(0, 80)
    const filename = `${safeName}.pdf`

    if (Capacitor.isNativePlatform()) {
      await savePdfNative(blob, filename)
    } else {
      saveOnWeb(blob, filename)
    }

    $q.notify({ type: 'positive', message: 'PDF saved', position: 'top' })
  } catch (err) {
    console.error('[pdf] failed:', err)
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail || err.message || 'Failed to generate PDF',
      position: 'top',
    })
  } finally {
    generatingPdf.value = false
  }
}

async function onSharePdf() {
  sharing.value = true
  try {
    const blob = await documentsService.fetchDocumentPdfBlob(documentId)
    const safeName = (document.value?.title || 'document').replace(/[^\w\s-]/g, '_').slice(0, 80)
    const filename = `${safeName}.pdf`
    const title = document.value?.title || 'Document'

    await shareBlob({
      blob,
      filename,
      title,
      text: `Sharing ${title}`,
    })
  } catch (err) {
    if (err instanceof ShareUnsupportedError) {
      $q.notify({
        type: 'info',
        message: err.message,
        position: 'top',
      })
      return
    }
    if (err?.message?.toLowerCase().includes('cancel') || err?.message?.toLowerCase().includes('abort')) {
      // User cancelled the share sheet — silent
      return
    }
    console.error('[share] failed:', err)
    $q.notify({
      type: 'negative',
      message: err?.message || 'Failed to share',
      position: 'top',
    })
  } finally {
    sharing.value = false
  }
}

function saveOnWeb(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = filename
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function savePdfNative(blob, filename) {
  const [{ Filesystem, Directory }, { FileOpener }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor-community/file-opener'),
  ])

  const base64 = await blobToBase64(blob)
  const writeResult = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Documents,
    recursive: true,
  })

  try {
    await FileOpener.open({
      filePath: writeResult.uri,
      contentType: 'application/pdf',
    })
  } catch (err) {
    console.warn('[pdf] open failed, file is saved at', writeResult.uri, err)
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
</script>

<style scoped>
.doc-title-input :deep(.q-field__control) {
  padding: 0;
  min-height: 0;
}
.doc-title-input :deep(.q-field__native) {
  padding: 0;
  min-height: 1.6em;
  font-weight: 500;
}
.doc-title-input :deep(.q-field__control:before) {
  border: none;
}
</style>