import { nativeImage } from 'electron'
import type { NativeImage } from 'electron'
import { deflateSync } from 'zlib'

// CRC32 per PNG spec (ISO 3309 polynomial, bit-reversed)
function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (const byte of data) {
    let c = (crc ^ byte) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])))
  return Buffer.concat([len, typeBytes, data, crcBuf])
}

function buildCirclePNG(size: number, radius: number): Buffer {
  const rows: Buffer[] = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4) // filter byte 0x00 (None) + RGBA pixels
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - size / 2
      const dy = y + 0.5 - size / 2
      if (dx * dx + dy * dy <= radius * radius) {
        row[1 + x * 4 + 3] = 255 // alpha = opaque; RGB stays 0x00 (black template)
      }
    }
    rows.push(row)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))), // deflateSync = zlib RFC 1950 (required by PNG)
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// Returns a 22pt filled-circle template image built at 2× (44 × 44 px) for Retina sharpness.
// macOS auto-inverts template images between light and dark menu bars.
export function createTrayIcon(): NativeImage {
  const image = nativeImage.createFromBuffer(buildCirclePNG(44, 16), { scaleFactor: 2 })
  image.setTemplateImage(true)
  return image
}
