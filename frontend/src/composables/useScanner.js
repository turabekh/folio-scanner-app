import { Capacitor } from '@capacitor/core'


export function isNativePlatform() {
  return Capacitor.isNativePlatform()
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


async function scanWithMlKit() {
  const { DocumentScanner } = await import('@capacitor-mlkit/document-scanner')

  const result = await DocumentScanner.scanDocument({
    resultFormats: 'JPEG',
    pageLimit: 50,
  })

  if (!result?.scannedImages?.length) {
    return []
  }

  const files = []
  for (let i = 0; i < result.scannedImages.length; i++) {
    const uri = result.scannedImages[i]
    const blob = await readNativeFile(uri)
    const file = new File([blob], `scan-${Date.now()}-${i}.jpg`, {
      type: 'image/jpeg',
    })
    files.push(file)
  }
  return files
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
      const message = err?.message || ''
      if (message.toLowerCase().includes('cancel')) {
        return []
      }
      throw err
    }
  }
  return pickFromBrowser()
}