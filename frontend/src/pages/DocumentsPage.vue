<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Documents</div>
      <q-space />
    </div>

    <div v-if="loading" class="text-center q-mt-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <q-banner v-else-if="error" class="bg-red-1 text-red-9" rounded>
      {{ error }}
    </q-banner>

    <template v-else-if="documents.length === 0">
      <div class="text-center q-mt-xl text-grey-7">
        <q-icon name="folder_open" size="64px" class="q-mb-md" />
        <div class="text-h6">No documents yet</div>
        <div class="text-body2 q-mt-sm">Tap the + button to start your first scan.</div>
      </div>
    </template>

    <q-list v-else bordered separator class="rounded-borders">
      <q-item
        v-for="doc in documents"
        :key="doc.id"
        clickable
        v-ripple
        :to="{ name: 'document-detail', params: { id: doc.id } }"
      >
        <q-item-section avatar>
          <q-avatar
            :color="doc.kind === 'id_card' ? 'amber-3' : 'grey-3'"
            :text-color="doc.kind === 'id_card' ? 'amber-9' : 'grey-8'"
            :icon="doc.kind === 'id_card' ? 'badge' : 'description'"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ doc.title }}</q-item-label>
          <q-item-label caption>
            {{ doc.page_count }} {{ doc.page_count === 1 ? 'page' : 'pages' }} ·
            {{ formatDate(doc.created_at) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            round
            dense
            icon="more_vert"
            @click.stop.prevent="onConfirmDelete(doc)"
            aria-label="More"
          />
        </q-item-section>
      </q-item>
    </q-list>

    <q-page-sticky position="bottom-right" :offset="[24, 24]">
      <q-fab icon="add" color="primary" direction="up" vertical-actions-align="right">
        <q-fab-action
          color="primary"
          icon="document_scanner"
          label="Smart Scan"
          label-position="left"
          external-label
          @click="onSmartScan"
        />
        <q-fab-action
          color="amber-8"
          icon="badge"
          label="ID Card"
          label-position="left"
          external-label
          @click="onIdCard"
        />
      </q-fab>
    </q-page-sticky>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

import * as documentsService from 'src/services/documents'
import * as pagesService from 'src/services/pages'
import { captureDocument } from 'src/composables/useScanner'
import { captureIdCard } from 'src/composables/useIdCardCapture'
import { defaultScanTitle, defaultIdCardTitle } from 'src/utils/titles'

const $q = useQuasar()
const router = useRouter()

const documents = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  await loadDocuments()
})

async function loadDocuments() {
  loading.value = true
  error.value = null
  try {
    documents.value = await documentsService.listDocuments()
  } catch (err) {
    error.value = err.response?.data?.detail || 'Failed to load documents'
  } finally {
    loading.value = false
  }
}

async function onSmartScan() {
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

  await createDocAndUpload({
    title: defaultScanTitle(),
    kind: 'document',
    files,
  })
}

async function onIdCard() {
  const isNative = (await import('@capacitor/core')).Capacitor.isNativePlatform()

  let dismiss
  if (isNative) {
    dismiss = $q.notify({
      type: 'ongoing',
      message:
        'Capture the FRONT and BACK of your ID. Tap Save after the front if there is no back.',
      position: 'top',
      timeout: 4000,
    })
  } else {
    dismiss = $q.notify({
      type: 'ongoing',
      message: 'Capture the FRONT of your ID',
      position: 'top',
      timeout: 2000,
    })
  }

  let file = null
  try {
    file = await captureIdCard({
      onProgress: ({ stage }) => {
        if (stage === 'back' && !isNative) {
          $q.notify({
            type: 'ongoing',
            message: 'Now capture the BACK',
            position: 'top',
            timeout: 2000,
          })
        }
      },
    })
  } catch (err) {
    dismiss && dismiss()
    $q.notify({
      type: 'negative',
      message: err?.message || 'Failed to capture ID card',
      position: 'top',
    })
    return
  }
  dismiss && dismiss()

  if (!file) return

  await createDocAndUpload({
    title: defaultIdCardTitle(),
    kind: 'id_card',
    files: [file],
  })
}

async function createDocAndUpload({ title, kind, files }) {
  const dismissProgress = $q.notify({
    type: 'ongoing',
    message: 'Saving...',
    position: 'top',
  })

  try {
    const doc = await documentsService.createDocument(title, kind)
    for (const file of files) {
      await pagesService.uploadPage(doc.id, file)
    }
    dismissProgress && dismissProgress()
    $q.notify({
      type: 'positive',
      message: 'Saved',
      position: 'top',
    })
    router.push({ name: 'document-detail', params: { id: doc.id } })
  } catch (err) {
    dismissProgress && dismissProgress()
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail || 'Failed to save',
      position: 'top',
    })
  }
}

async function onConfirmDelete(doc) {
  $q.dialog({
    title: 'Delete document?',
    message: `"${doc.title}" and its ${doc.page_count} ${doc.page_count === 1 ? 'page' : 'pages'} will be deleted.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await documentsService.deleteDocument(doc.id)
      documents.value = documents.value.filter((d) => d.id !== doc.id)
      $q.notify({ type: 'positive', message: 'Deleted', position: 'top' })
    } catch (err) {
      $q.notify({
        type: 'negative',
        message: err.response?.data?.detail || 'Failed to delete',
        position: 'top',
      })
    }
  })
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>
