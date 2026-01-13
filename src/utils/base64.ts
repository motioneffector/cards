/**
 * Base64 encoding and decoding utilities
 *
 * Uses built-in btoa/atob in browser, manual implementation for Node
 */

/**
 * Encode bytes to base64 string
 *
 * @param bytes - Bytes to encode
 * @returns Base64 encoded string
 */
export function encodeBase64(bytes: Uint8Array): string {
  // Check if we're in a browser environment with btoa
  if (typeof btoa !== 'undefined') {
    // Convert Uint8Array to binary string
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0)
    }
    return btoa(binary)
  }

  // Node.js environment
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }

  // Manual implementation as fallback
  return manualBase64Encode(bytes)
}

/**
 * Decode base64 string to bytes
 *
 * @param base64 - Base64 string to decode
 * @returns Decoded bytes
 */
export function decodeBase64(base64: string): Uint8Array {
  // Check if we're in a browser environment with atob
  if (typeof atob !== 'undefined') {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  // Node.js environment
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }

  // Manual implementation as fallback
  return manualBase64Decode(base64)
}

/**
 * Manual base64 encoding implementation
 */
function manualBase64Encode(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  let i = 0

  while (i < bytes.length) {
    const a = bytes[i++] ?? 0
    const b = bytes[i++] ?? 0
    const c = bytes[i++] ?? 0

    const bitmap = (a << 16) | (b << 8) | c

    result += chars[(bitmap >> 18) & 0x3f]
    result += chars[(bitmap >> 12) & 0x3f]
    result += i > bytes.length + 1 ? '=' : chars[(bitmap >> 6) & 0x3f]
    result += i > bytes.length ? '=' : chars[bitmap & 0x3f]
  }

  return result
}

/**
 * Manual base64 decoding implementation
 */
function manualBase64Decode(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const lookup = new Map<string, number>()
  for (let i = 0; i < chars.length; i++) {
    lookup.set(chars[i], i)
  }

  // Remove padding and whitespace
  base64 = base64.replace(/[=\s]/g, '')

  const bytes: number[] = []
  let i = 0

  while (i < base64.length) {
    const a = lookup.get(base64[i++] ?? '') ?? 0
    const b = lookup.get(base64[i++] ?? '') ?? 0
    const c = lookup.get(base64[i++] ?? '') ?? 0
    const d = lookup.get(base64[i++] ?? '') ?? 0

    const bitmap = (a << 18) | (b << 12) | (c << 6) | d

    bytes.push((bitmap >> 16) & 0xff)
    if (i <= base64.length + 1) bytes.push((bitmap >> 8) & 0xff)
    if (i <= base64.length) bytes.push(bitmap & 0xff)
  }

  return new Uint8Array(bytes)
}
