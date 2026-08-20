export function base64Encode(str: string): string {
  if (typeof window.btoa === 'function') return window.btoa(str)
  return Buffer.from(str).toString('base64')
}

export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const byteChars = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary')
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
  return bytes
}

export function b64ToBlob(b64: string, mime: string): Blob {
  return new Blob([base64ToBytes(b64)], { type: mime })
}
