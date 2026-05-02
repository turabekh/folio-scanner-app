import { Capacitor } from '@capacitor/core'


function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
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


async function compositeHorizontal(blobs) {
  const images = await Promise.all(blobs.map(loadImageFromBlob))

  const targetHeight = Math.max(...images.map((img) => img.height))
  const widths = images.map((img) =>
    Math.round(img.width * (targetHeight / img.height))
  )
  const gap = Math.round(targetHeight * 0.02)
  const totalWidth = widths.reduce((sum, w) => sum + w, 0) + gap * (images.length - 1)

  const canvas = document.createElement('canvas')
  canvas.width = totalWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, totalWidth, targetHeight)

  let x = 0
  images.forEach((img, i) => {
    ctx.drawImage(img, x, 0, widths[i], targetHeight)
    x += widths[i] + gap
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Composite failed'))
      },
      'image/jpeg',
      0.92,
    )
  })
}


async function scanWithMlKit() {
  const { DocumentScanner } = await import('@capacitor-mlkit/document-scanner')
  const { registerPlugin } = await import('@capacitor/core')
  const KeepAlive = registerPlugin('KeepAlive')

  try {
    await KeepAlive.start()
  } catch {
    // best-effort
  }
  try {
    return await DocumentScanner.scanDocument({
      resultFormats: 'JPEG',
      pageLimit: 2,
      scannerMode: 'FULL',
      galleryImportAllowed: false,
    })
  } finally {
    try {
      await KeepAlive.stop()
    } catch {
      // best-effort
    }
  }
}


function pickFromBrowser(label) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp'
    input.capture = 'environment'
    input.multiple = false
    input.dataset.label = label
    input.onchange = () => {
      const file = input.files?.[0]
      resolve(file || null)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}


async function captureNativeIdCard() {
  const result = await scanWithMlKit()
  if (!result?.scannedImages?.length) return null

  const blobs = []
  for (const uri of result.scannedImages) {
    const blob = await readNativeFile(uri)
    blobs.push(blob)
  }

  if (blobs.length === 0) return null
  return blobs
}


async function captureWebIdCard({ onProgress }) {
  onProgress?.({ stage: 'front' })
  const front = await pickFromBrowser('front')
  if (!front) return null

  onProgress?.({ stage: 'back' })
  const back = await pickFromBrowser('back')
  if (!back) return null

  return [front, back]
}


export async function captureIdCard({ onProgress } = {}) {
  let blobs = null

  if (Capacitor.isNativePlatform()) {
    onProgress?.({ stage: 'scanning' })
    blobs = await captureNativeIdCard()
  } else {
    blobs = await captureWebIdCard({ onProgress })
  }

  if (!blobs || blobs.length === 0) return null

  onProgress?.({ stage: 'composing' })
  const composite = await compositeHorizontal(blobs)
  return new File([composite], `id-card-${Date.now()}.jpg`, {
    type: 'image/jpeg',
  })
}