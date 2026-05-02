import { Capacitor } from '@capacitor/core'

import {
  fetchPageImageBlob,
  runServerOcr,
  setPageOcrText,
} from 'src/services/pages'


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


async function runMlKitOcr(documentId, pageId) {
  const { CapacitorPluginMlKitTextRecognition } = await import(
    '@pantrist/capacitor-plugin-ml-kit-text-recognition'
  )

  const blob = await fetchPageImageBlob(documentId, pageId, 'auto')
  const base64 = await blobToBase64(blob)

  const result = await CapacitorPluginMlKitTextRecognition.detectText({
    base64Image: base64,
  })
  return result.text || ''
}


export async function extractTextForPage(documentId, pageId) {
  if (Capacitor.isNativePlatform()) {
    const text = await runMlKitOcr(documentId, pageId)
    const updated = await setPageOcrText(documentId, pageId, text)
    return updated
  }
  return runServerOcr(documentId, pageId)
}