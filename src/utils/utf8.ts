/**
 * UTF-8 encoding and decoding utilities
 */

/**
 * Encode string to UTF-8 bytes
 *
 * @param str - String to encode
 * @returns UTF-8 encoded bytes
 */
export function encodeUTF8(str: string): Uint8Array {
  // Use TextEncoder if available (modern browsers and Node)
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str)
  }

  // Fallback implementation
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i)

    if (charCode < 0x80) {
      bytes.push(charCode)
    } else if (charCode < 0x800) {
      bytes.push(0xc0 | (charCode >> 6))
      bytes.push(0x80 | (charCode & 0x3f))
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      bytes.push(0xe0 | (charCode >> 12))
      bytes.push(0x80 | ((charCode >> 6) & 0x3f))
      bytes.push(0x80 | (charCode & 0x3f))
    } else {
      // UTF-16 surrogate pair
      i++
      const nextCharCode = str.charCodeAt(i)
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (nextCharCode & 0x3ff))
      bytes.push(0xf0 | (charCode >> 18))
      bytes.push(0x80 | ((charCode >> 12) & 0x3f))
      bytes.push(0x80 | ((charCode >> 6) & 0x3f))
      bytes.push(0x80 | (charCode & 0x3f))
    }
  }

  return new Uint8Array(bytes)
}

/**
 * Decode UTF-8 bytes to string
 *
 * @param bytes - UTF-8 bytes to decode
 * @returns Decoded string
 */
export function decodeUTF8(bytes: Uint8Array): string {
  // Use TextDecoder if available (modern browsers and Node)
  if (typeof TextDecoder !== 'undefined') {
    return new TextDecoder('utf-8').decode(bytes)
  }

  // Fallback implementation
  const chars: string[] = []
  let i = 0

  while (i < bytes.length) {
    const byte1 = bytes[i++] ?? 0

    if (byte1 < 0x80) {
      chars.push(String.fromCharCode(byte1))
    } else if ((byte1 & 0xe0) === 0xc0) {
      const byte2 = bytes[i++] ?? 0
      chars.push(String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f)))
    } else if ((byte1 & 0xf0) === 0xe0) {
      const byte2 = bytes[i++] ?? 0
      const byte3 = bytes[i++] ?? 0
      chars.push(
        String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f))
      )
    } else if ((byte1 & 0xf8) === 0xf0) {
      const byte2 = bytes[i++] ?? 0
      const byte3 = bytes[i++] ?? 0
      const byte4 = bytes[i++] ?? 0
      let charCode =
        ((byte1 & 0x07) << 18) |
        ((byte2 & 0x3f) << 12) |
        ((byte3 & 0x3f) << 6) |
        (byte4 & 0x3f)
      charCode -= 0x10000
      chars.push(String.fromCharCode(0xd800 | (charCode >> 10)))
      chars.push(String.fromCharCode(0xdc00 | (charCode & 0x3ff)))
    }
  }

  return chars.join('')
}
