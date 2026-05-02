<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Your documents</div>
      <q-space />
      <q-btn
        label="New document"
        icon="add"
        color="primary"
        unelevated
        @click="onCreateClick"
      />
    </div>

    <q-banner v-if="documents.error" class="bg-red-1 text-red-9 q-mb-md" rounded>
      {{ documents.error }}
    </q-banner>

    <q-inner-loading :showing="documents.loading">
      <q-spinner-dots size="40px" color="primary" />
    </q-inner-loading>

    <div v-if="documents.isEmpty" class="text-center q-mt-xl text-grey-7">
      <q-icon name="description" size="64px" class="q-mb-md" />
      <div class="text-h6">No documents yet</div>
      <div class="text-body2 q-mt-sm">Tap "New document" to start scanning.</div>
    </div>

    <q-list v-else bordered separator class="rounded-borders">
      <q-item
        v-for="doc in documents.items"
        :key="doc.id"
        clickable
        v-ripple
      >
        <q-item-section avatar>
          <q-avatar color="grey-3" text-color="grey-8" icon="description" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ doc.title }}</q-item-label>
          <q-item-label caption>
            {{ doc.page_count }} {{ doc.page_count === 1 ? 'page' : 'pages' }}
            · {{ formatDate(doc.created_at) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-btn
            flat
            round
            dense
            icon="more_vert"
            @click.stop="onMoreClick(doc)"
          />
        </q-item-section>
      </q-item>
    </q-list>

    <q-dialog v-model="createDialog">
      <q-card style="min-width: 320px;">
        <q-card-section>
          <div class="text-h6">New document</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form @submit="onCreateSubmit" id="create-doc-form">
            <q-input
              v-model="newTitle"
              label="Title"
              outlined
              autofocus
              :rules="[(v) => !!v || 'Title is required']"
              :disable="creating"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup :disable="creating" />
          <q-btn
            unelevated
            color="primary"
            label="Create"
            type="submit"
            form="create-doc-form"
            :loading="creating"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <q-card style="min-width: 320px;">
        <q-card-section>
          <div class="text-h6">Delete document?</div>
          <div class="text-body2 q-mt-sm text-grey-8">
            "{{ docToDelete?.title }}" and all its pages will be permanently deleted.
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup :disable="deleting" />
          <q-btn
            unelevated
            color="negative"
            label="Delete"
            :loading="deleting"
            @click="onDeleteConfirm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useQuasar } from 'quasar'

import { useDocumentsStore } from 'src/stores/documents'

const $q = useQuasar()
const documents = useDocumentsStore()

const createDialog = ref(false)
const newTitle = ref('')
const creating = ref(false)

const deleteDialog = ref(false)
const docToDelete = ref(null)
const deleting = ref(false)

onMounted(async () => {
  try {
    await documents.fetchAll()
  } catch {
    // error already surfaced via store; nothing more to do
  }
})

function onCreateClick() {
  newTitle.value = ''
  createDialog.value = true
}

async function onCreateSubmit() {
  creating.value = true
  try {
    await documents.create(newTitle.value)
    createDialog.value = false
    $q.notify({ type: 'positive', message: 'Document created', position: 'top' })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail || 'Failed to create document',
      position: 'top',
    })
  } finally {
    creating.value = false
  }
}

function onMoreClick(doc) {
  docToDelete.value = doc
  deleteDialog.value = true
}

async function onDeleteConfirm() {
  deleting.value = true
  try {
    await documents.remove(docToDelete.value.id)
    deleteDialog.value = false
    $q.notify({ type: 'positive', message: 'Document deleted', position: 'top' })
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: err.response?.data?.detail || 'Failed to delete document',
      position: 'top',
    })
  } finally {
    deleting.value = false
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>