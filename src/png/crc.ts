/**
 * CRC-32 implementation for PNG chunks
 */

/** Pre-computed CRC-32 lookup table */
let crcTable: Uint32Array | null = null

/**
 * Generate CRC-32 lookup table
 */
function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  return table
}

/**
 * Compute CRC-32 for given data
 *
 * @param data - Data to compute CRC for
 * @returns CRC-32 value as unsigned 32-bit integer
 */
export function computeCRC32(...data: Uint8Array[]): number {
  crcTable ??= makeCrcTable()

  let crc = 0xffffffff

  for (const chunk of data) {
    for (let i = 0; i < chunk.length; i++) {
      const byte = chunk[i]
      if (byte !== undefined) {
        crc = (crc >>> 8) ^ (crcTable[(crc ^ byte) & 0xff] ?? 0)
      }
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Verify CRC-32 matches expected value
 *
 * @param expected - Expected CRC value
 * @param data - Data to verify
 * @returns True if CRC matches
 */
export function verifyCRC32(expected: number, ...data: Uint8Array[]): boolean {
  return computeCRC32(...data) === expected
}
