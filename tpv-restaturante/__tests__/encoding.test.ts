import { describe, it, expect } from 'vitest'
import { base64Encode, base64ToBytes, b64ToBlob } from '../lib/encoding'

describe('base64Encode', () => {
  it('encodes a string', () => {
    expect(base64Encode('hello')).toBe('aGVsbG8=')
  })

  it('encodes empty string', () => {
    expect(base64Encode('')).toBe('')
  })

  it('encodes any string', () => {
    expect(base64Encode('ñ')).toEqual(expect.any(String))
    expect(base64Encode('ñ').length).toBeGreaterThan(0)
  })
})

describe('base64ToBytes', () => {
  it('decodes base64 to bytes', () => {
    const bytes = base64ToBytes('aGVsbG8=')
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(5)
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111])
  })

  it('decodes empty string', () => {
    const bytes = base64ToBytes('')
    expect(bytes.length).toBe(0)
  })
})

describe('b64ToBlob', () => {
  it('creates a blob from base64', () => {
    const blob = b64ToBlob('aGVsbG8=', 'text/plain')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain')
  })

  it('creates application/pdf blob', () => {
    const blob = b64ToBlob('', 'application/pdf')
    expect(blob.type).toBe('application/pdf')
  })
})
