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
  log('readNativeFile uri:', uri)
  const { Filesystem } = await import('@capacitor/filesystem')
  const result = await Filesystem.readFile({ path: uri })
  log('readNativeFile got result, length:', result?.data?.length)
  return base64ToBlob(result.data, 'image/jpeg')
}


async function scanWithMlKit() {
  log('scanWithMlKit START')
  const { DocumentScanner } = await import('@capacitor-mlkit/document-scanner')
  log('plugin imported, calling scanDocument...')

  let result
  try {
    result = await DocumentScanner.scanDocument({
      resultFormats: 'JPEG',
      pageLimit: 50,
      scannerMode: 'FULL',
      galleryImportAllowed: false,
    })
  } catch (err) {
    log('scanDocument THREW:', err?.message, err)
    throw err
  }

  log('scanDocument RETURNED. typeof:', typeof result, 'keys:', result ? Object.keys(result) : 'null')
  log('scanDocument full result:', JSON.stringify(result))

  const uris = collectImageUris(result)
  log('collected', uris.length, 'uris:', uris)

  if (uris.length === 0) {
    log('no image uris found in result, returning empty')
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
      log('file created, size:', file.size)
    } catch (err) {
      log('FAILED to read image at', uri, err?.message, err)
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
  log('captureDocument called, native:', isNativePlatform())
  if (isNativePlatform()) {
    try {
      const files = await scanWithMlKit()
      log('captureDocument returning', files.length, 'files')
      return files
    } catch (err) {
      log('captureDocument ERROR:', err?.message, err)
      const message = err?.message || ''
      if (message.toLowerCase().includes('cancel')) {
        return []
      }
      throw err
    }
  }
  return pickFromBrowser()
}