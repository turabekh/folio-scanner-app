import { Capacitor } from '@capacitor/core'


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


async function shareNative({ blob, filename, title, text }) {
  const [{ Share }, { Filesystem, Directory }] = await Promise.all([
    import('@capacitor/share'),
    import('@capacitor/filesystem'),
  ])

  const base64 = await blobToBase64(blob)
  const writeResult = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  })

  await Share.share({
    title,
    text,
    url: writeResult.uri,
    dialogTitle: title,
  })
}


async function shareWeb({ blob, filename, title, text }) {
  const file = new File([blob], filename, { type: blob.type || 'application/pdf' })

  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    await navigator.share({
      title,
      text,
      files: [file],
    })
    return
  }

  // Fallback: trigger download
  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = filename
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  throw new ShareUnsupportedError(
    'Sharing not supported in this browser. The file was downloaded instead.',
  )
}


export class ShareUnsupportedError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ShareUnsupportedError'
  }
}


export async function shareBlob({ blob, filename, title, text }) {
  if (Capacitor.isNativePlatform()) {
    return shareNative({ blob, filename, title, text })
  }
  return shareWeb({ blob, filename, title, text })
}


export async function isShareSupported() {
  if (Capacitor.isNativePlatform()) return true
  if (typeof navigator === 'undefined') return false
  if (typeof navigator.share !== 'function') return false
  // Check files-sharing capability
  if (typeof navigator.canShare === 'function') {
    try {
      const probeFile = new File(['test'], 'probe.txt', { type: 'text/plain' })
      return navigator.canShare({ files: [probeFile] })
    } catch {
      return false
    }
  }
  return true
}