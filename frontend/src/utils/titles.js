export function defaultScanTitle(now = new Date()) {
  const date = now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const time = now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `Scan ${date}, ${time}`
}


export function defaultIdCardTitle(now = new Date()) {
  const date = now.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  return `ID Card — ${date}`
}