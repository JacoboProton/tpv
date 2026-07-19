export function base64Encode(str: string): string {
  if (typeof window.btoa === 'function') return window.btoa(str)
  return Buffer.from(str).toString('base64')
}

export function base64ToBytes(b64: string): Uint8Array {
  const byteChars = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
  const byteNums = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i)
  return new Uint8Array(byteNums)
}

export function b64ToBlob(b64: string, mime: string): Blob {
  return new Blob([base64ToBytes(b64) as unknown as BlobPart], { type: mime })
}
