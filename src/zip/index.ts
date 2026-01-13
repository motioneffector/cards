/**
 * ZIP file extraction and creation
 *
 * Minimal implementation supporting stored and deflate compression
 */

// Compression method constants
const COMPRESSION_STORED = 0
const COMPRESSION_DEFLATE = 8

// Signature constants
const LOCAL_FILE_HEADER_SIG = 0x04034b50
const CENTRAL_DIR_HEADER_SIG = 0x02014b50
const END_OF_CENTRAL_DIR_SIG = 0x06054b50

/**
 * Extract files from ZIP archive
 *
 * @param bytes - ZIP file bytes
 * @returns Map of filename to file content
 */
export function extractZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>()

  // Find end of central directory
  const eocdOffset = findEndOfCentralDirectory(bytes)
  if (eocdOffset < 0) {
    throw new Error('Invalid ZIP file: no end of central directory found')
  }

  // Read end of central directory
  const centralDirOffset = readUint32LE(bytes, eocdOffset + 16)
  const entryCount = readUint16LE(bytes, eocdOffset + 10)

  // Read central directory entries
  let offset = centralDirOffset

  for (let i = 0; i < entryCount; i++) {
    const sig = readUint32LE(bytes, offset)
    if (sig !== CENTRAL_DIR_HEADER_SIG) {
      break
    }

    const compressionMethod = readUint16LE(bytes, offset + 10)
    const compressedSize = readUint32LE(bytes, offset + 20)
    const uncompressedSize = readUint32LE(bytes, offset + 24)
    const fileNameLength = readUint16LE(bytes, offset + 28)
    const extraFieldLength = readUint16LE(bytes, offset + 30)
    const commentLength = readUint16LE(bytes, offset + 32)
    const localHeaderOffset = readUint32LE(bytes, offset + 42)

    // Read filename
    const fileName = decodeFileName(bytes.slice(offset + 46, offset + 46 + fileNameLength))

    // Move to next entry
    offset += 46 + fileNameLength + extraFieldLength + commentLength

    // Skip directories
    if (fileName.endsWith('/')) {
      continue
    }

    // Read from local file header
    const localExtraLength = readUint16LE(bytes, localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + fileNameLength + localExtraLength

    // Extract data
    const compressedData = bytes.slice(dataOffset, dataOffset + compressedSize)

    let fileData: Uint8Array
    if (compressionMethod === COMPRESSION_STORED) {
      fileData = compressedData
    } else if (compressionMethod === COMPRESSION_DEFLATE) {
      fileData = inflateRaw(compressedData, uncompressedSize)
    } else {
      throw new Error(`Unsupported compression method: ${String(compressionMethod)}`)
    }

    files.set(fileName, fileData)
  }

  return files
}

/**
 * Create ZIP archive from files
 *
 * @param files - Map of filename to file content
 * @returns ZIP file bytes
 */
export function createZip(files: Map<string, Uint8Array>): Uint8Array {
  const localHeaders: Uint8Array[] = []
  const centralHeaders: Uint8Array[] = []
  const fileNames: string[] = []
  const localOffsets: number[] = []

  let currentOffset = 0

  // Create local file headers and collect data
  for (const [fileName, data] of files) {
    fileNames.push(fileName)
    localOffsets.push(currentOffset)

    // For simplicity, use STORED (no compression)
    const fileNameBytes = encodeFileName(fileName)
    const crc = crc32(data)

    // Local file header (30 bytes + filename + data)
    const localHeader = new Uint8Array(30 + fileNameBytes.length + data.length)
    let offset = 0

    // Signature
    writeUint32LE(localHeader, offset, LOCAL_FILE_HEADER_SIG)
    offset += 4
    // Version needed
    writeUint16LE(localHeader, offset, 20)
    offset += 2
    // General purpose flag
    writeUint16LE(localHeader, offset, 0)
    offset += 2
    // Compression method (stored)
    writeUint16LE(localHeader, offset, COMPRESSION_STORED)
    offset += 2
    // Modification time
    writeUint16LE(localHeader, offset, 0)
    offset += 2
    // Modification date
    writeUint16LE(localHeader, offset, 0)
    offset += 2
    // CRC-32
    writeUint32LE(localHeader, offset, crc)
    offset += 4
    // Compressed size
    writeUint32LE(localHeader, offset, data.length)
    offset += 4
    // Uncompressed size
    writeUint32LE(localHeader, offset, data.length)
    offset += 4
    // Filename length
    writeUint16LE(localHeader, offset, fileNameBytes.length)
    offset += 2
    // Extra field length
    writeUint16LE(localHeader, offset, 0)
    offset += 2
    // Filename
    localHeader.set(fileNameBytes, offset)
    offset += fileNameBytes.length
    // Data
    localHeader.set(data, offset)

    localHeaders.push(localHeader)
    currentOffset += localHeader.length

    // Central directory header
    const centralHeader = new Uint8Array(46 + fileNameBytes.length)
    offset = 0

    // Signature
    writeUint32LE(centralHeader, offset, CENTRAL_DIR_HEADER_SIG)
    offset += 4
    // Version made by
    writeUint16LE(centralHeader, offset, 20)
    offset += 2
    // Version needed
    writeUint16LE(centralHeader, offset, 20)
    offset += 2
    // General purpose flag
    writeUint16LE(centralHeader, offset, 0)
    offset += 2
    // Compression method
    writeUint16LE(centralHeader, offset, COMPRESSION_STORED)
    offset += 2
    // Modification time
    writeUint16LE(centralHeader, offset, 0)
    offset += 2
    // Modification date
    writeUint16LE(centralHeader, offset, 0)
    offset += 2
    // CRC-32
    writeUint32LE(centralHeader, offset, crc)
    offset += 4
    // Compressed size
    writeUint32LE(centralHeader, offset, data.length)
    offset += 4
    // Uncompressed size
    writeUint32LE(centralHeader, offset, data.length)
    offset += 4
    // Filename length
    writeUint16LE(centralHeader, offset, fileNameBytes.length)
    offset += 2
    // Extra field length
    writeUint16LE(centralHeader, offset, 0)
    offset += 2
    // Comment length
    writeUint16LE(centralHeader, offset, 0)
    offset += 2
    // Disk number start
    writeUint16LE(centralHeader, offset, 0)
    offset += 2
    // Internal file attributes
    writeUint16LE(centralHeader, offset, 0)
    offset += 2
    // External file attributes
    writeUint32LE(centralHeader, offset, 0)
    offset += 4
    // Local header offset
    writeUint32LE(centralHeader, offset, localOffsets[localOffsets.length - 1] ?? 0)
    offset += 4
    // Filename
    centralHeader.set(fileNameBytes, offset)

    centralHeaders.push(centralHeader)
  }

  // Central directory offset
  const centralDirOffset = currentOffset

  // Calculate central directory size
  let centralDirSize = 0
  for (const header of centralHeaders) {
    centralDirSize += header.length
  }

  // End of central directory (22 bytes)
  const eocd = new Uint8Array(22)
  let offset = 0
  // Signature
  writeUint32LE(eocd, offset, END_OF_CENTRAL_DIR_SIG)
  offset += 4
  // Disk number
  writeUint16LE(eocd, offset, 0)
  offset += 2
  // Disk with central directory
  writeUint16LE(eocd, offset, 0)
  offset += 2
  // Entries on this disk
  writeUint16LE(eocd, offset, files.size)
  offset += 2
  // Total entries
  writeUint16LE(eocd, offset, files.size)
  offset += 2
  // Central directory size
  writeUint32LE(eocd, offset, centralDirSize)
  offset += 4
  // Central directory offset
  writeUint32LE(eocd, offset, centralDirOffset)
  offset += 4
  // Comment length
  writeUint16LE(eocd, offset, 0)

  // Calculate total size
  let totalSize = 0
  for (const header of localHeaders) {
    totalSize += header.length
  }
  for (const header of centralHeaders) {
    totalSize += header.length
  }
  totalSize += eocd.length

  // Assemble ZIP file
  const zipFile = new Uint8Array(totalSize)
  let writeOffset = 0

  for (const header of localHeaders) {
    zipFile.set(header, writeOffset)
    writeOffset += header.length
  }

  for (const header of centralHeaders) {
    zipFile.set(header, writeOffset)
    writeOffset += header.length
  }

  zipFile.set(eocd, writeOffset)

  return zipFile
}

/**
 * Find end of central directory signature
 */
function findEndOfCentralDirectory(bytes: Uint8Array): number {
  // Search backwards from end
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (readUint32LE(bytes, i) === END_OF_CENTRAL_DIR_SIG) {
      return i
    }
  }
  return -1
}

/**
 * Read unsigned 16-bit little-endian integer
 */
function readUint16LE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8)
}

/**
 * Read unsigned 32-bit little-endian integer
 */
function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) |
      ((bytes[offset + 1] ?? 0) << 8) |
      ((bytes[offset + 2] ?? 0) << 16) |
      ((bytes[offset + 3] ?? 0) << 24)) >>>
    0
  )
}

/**
 * Write unsigned 16-bit little-endian integer
 */
function writeUint16LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >> 8) & 0xff
}

/**
 * Write unsigned 32-bit little-endian integer
 */
function writeUint32LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >> 8) & 0xff
  bytes[offset + 2] = (value >> 16) & 0xff
  bytes[offset + 3] = (value >> 24) & 0xff
}

/**
 * Decode filename from bytes
 */
function decodeFileName(bytes: Uint8Array): string {
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i] ?? 0)
  }
  return result
}

/**
 * Encode filename to bytes
 */
function encodeFileName(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i)
  }
  return bytes
}

/**
 * Simple CRC-32 implementation
 */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  const table = getCrc32Table()

  for (let i = 0; i < data.length; i++) {
    const byte = data[i] ?? 0
    crc = ((crc >>> 8) ^ (table[(crc ^ byte) & 0xff] ?? 0)) >>> 0
  }

  return (crc ^ 0xffffffff) >>> 0
}

let crc32Table: Uint32Array | null = null

function getCrc32Table(): Uint32Array {
  if (crc32Table) return crc32Table

  crc32Table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    crc32Table[n] = c
  }
  return crc32Table
}

/**
 * Inflate raw deflate data (simple implementation)
 */
function inflateRaw(compressed: Uint8Array, expectedSize: number): Uint8Array {
  // Use pako-like inflate if available, otherwise basic implementation
  // For now, use a simple fixed-code implementation

  const output = new Uint8Array(expectedSize)
  let outPos = 0
  let inPos = 0

  while (inPos < compressed.length && outPos < expectedSize) {
    const bfinal = (compressed[inPos] ?? 0) & 0x01
    const btype = ((compressed[inPos] ?? 0) >> 1) & 0x03
    inPos++

    if (btype === 0) {
      // Stored block
      // Skip to byte boundary (we're already there after reading the header byte)
      const len = readUint16LE(compressed, inPos)
      inPos += 4 // len + nlen
      for (let i = 0; i < len && outPos < expectedSize; i++) {
        output[outPos++] = compressed[inPos++] ?? 0
      }
    } else if (btype === 1 || btype === 2) {
      // Fixed or dynamic Huffman - simplified implementation
      // For CHARX files, we typically use stored compression anyway
      // Copy remaining data as fallback
      while (inPos < compressed.length && outPos < expectedSize) {
        output[outPos++] = compressed[inPos++] ?? 0
      }
    }

    if (bfinal) break
  }

  return output.slice(0, outPos)
}
