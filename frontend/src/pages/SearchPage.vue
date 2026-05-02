<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Search</div>

    <q-input
      v-model="query"
      placeholder="Search documents and text..."
      outlined
      clearable
      autofocus
      @update:model-value="onQueryChange"
      class="q-mb-md"
    >
      <template v-slot:prepend>
        <q-icon name="search" />
      </template>
    </q-input>

    <div v-if="loading" class="text-center q-mt-xl">
      <q-spinner-dots size="40px" color="primary" />
    </div>

    <q-banner v-else-if="error" class="bg-red-1 text-red-9" rounded>
      {{ error }}
    </q-banner>

    <template v-else-if="query && results">
      <div v-if="results.hits.length === 0" class="text-center q-mt-xl text-grey-7">
        <q-icon name="search_off" size="64px" class="q-mb-md" />
        <div class="text-h6">No matches</div>
        <div class="text-body2 q-mt-sm">Try different keywords.</div>
      </div>

      <q-list v-else bordered separator class="rounded-borders">
        <q-item
          v-for="hit in results.hits"
          :key="hit.document_id"
          clickable
          v-ripple
          :to="{ name: 'document-detail', params: { id: hit.document_id } }"
        >
          <q-item-section avatar>
            <q-avatar color="grey-3" text-color="grey-8" icon="description" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ hit.document_title }}</q-item-label>
            <q-item-label caption v-if="hit.snippet">
              <span v-html="formatSnippet(hit.snippet)" />
            </q-item-label>
            <q-item-label caption v-else class="text-grey-6">
              Matches title only
            </q-item-label>
            <q-item-label caption class="text-grey-7 q-mt-xs">
              <span v-if="hit.matching_page_number">
                Page {{ hit.matching_page_number }}
                ·
              </span>
              {{ hit.page_count }} {{ hit.page_count === 1 ? 'page' : 'pages' }}
              · {{ formatDate(hit.document_created_at) }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </template>

    <div v-else-if="!query" class="text-center q-mt-xl text-grey-7">
      <q-icon name="search" size="64px" class="q-mb-md" />
      <div class="text-h6">Start typing to search</div>
      <div class="text-body2 q-mt-sm">
        Find documents by title or by text inside them.
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'

import { searchDocuments } from 'src/services/search'

const query = ref('')
const results = ref(null)
const loading = ref(false)
const error = ref(null)

let debounceTimer = null

function onQueryChange(value) {
  if (debounceTimer) clearTimeout(debounceTimer)

  if (!value || value.trim().length === 0) {
    results.value = null
    error.value = null
    return
  }

  debounceTimer = setTimeout(() => runSearch(value.trim()), 300)
}

async function runSearch(q) {
  loading.value = true
  error.value = null
  try {
    results.value = await searchDocuments(q)
  } catch (err) {
    error.value = err.response?.data?.detail || 'Search failed'
    results.value = null
  } finally {
    loading.value = false
  }
}

function formatSnippet(snippet) {
  return snippet.replace(/\n+/g, ' ')
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>