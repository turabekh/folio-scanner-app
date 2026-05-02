import { Capacitor } from '@capacitor/core'


export function isNativePlatform() {
  return Capacitor.isNativePlatform()
}


function log(...args) {
  console.log('[scanner]', new Date().toISOString().slice(11, 23), ...args)
}


function base64ToBlob(base64, contentType) {
  const byteChars = atob(base64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i)
  }
  return new Blob([bytes], { type: contentType })
}


async function readNativeFile(uri) {
  const { Filesystem } = await import('@capacitor/filesystem')
  const result = await Filesystem.readFile({ path: uri })
  return base64ToBlob(result.data, 'image/jpeg')
}


async function withKeepAlive(fn) {
  if (!Capacitor.isNativePlatform()) return fn()
  const { registerPlugin } = await import('@capacitor/core')
  const KeepAlive = registerPlugin('KeepAlive')
  try {
    log('starting keep-alive service')
    await KeepAlive.start()
  } catch (err) {
    log('keep-alive start failed (continuing):', err?.message)
  }
  try {
    return await fn()
  } finally {
    try {
      log('stopping keep-alive service')
      await KeepAlive.stop()
    } catch (err) {
      log('keep-alive stop failed:', err?.message)
    }
  }
}


async function scanWithMlKit() {
  log('scanWithMlKit START')
  const { DocumentScanner } = await import('@capacitor-mlkit/document-scanner')

  const result = await withKeepAlive(() =>
    DocumentScanner.scanDocument({
      resultFormats: 'JPEG',
      pageLimit: 50,
      scannerMode: 'FULL',
      galleryImportAllowed: false,
    })
  )

  log('scanDocument returned:', JSON.stringify(result))

  const uris = collectImageUris(result)
  if (uris.length === 0) {
    log('no image uris in result')
    return []
  }

  const files = []
  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i]
    log('processing image', i, uri)
    try {
      const blob = await readNativeFile(uri)
      const file = new File([blob], `scan-${Date.now()}-${i}.jpg`, {
        type: 'image/jpeg',
      })
      files.push(file)
    } catch (err) {
      log('failed to read image at', uri, err?.message)
    }
  }
  log('returning', files.length, 'files')
  return files
}


function collectImageUris(result) {
  if (!result || typeof result !== 'object') return []
  const candidates = []
  if (Array.isArray(result.scannedImages)) candidates.push(...result.scannedImages)
  if (Array.isArray(result.images)) candidates.push(...result.images)
  return candidates.filter((u) => typeof u === 'string' && u.length > 0)
}


function pickFromBrowser() {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp'
    input.capture = 'environment'
    input.multiple = false
    input.onchange = () => {
      const file = input.files?.[0]
      resolve(file ? [file] : [])
    }
    input.oncancel = () => resolve([])
    input.click()
  })
}


export async function captureDocument() {
  if (isNativePlatform()) {
    try {
      return await scanWithMlKit()
    } catch (err) {
      log('captureDocument error:', err?.message)
      const message = err?.message || ''
      if (message.toLowerCase().includes('cancel')) {
        return []
      }
      throw err
    }
  }
  return pickFromBrowser()
}