import zlib from 'node:zlib'

/** Decode complete frames by bytes consumed, never by searching compressed data. */
export function decodeSessionFrames(input, decode = zlib.zstdDecompressSync) {
  if (typeof decode !== 'function') throw new Error('Session inspection requires Node with zstd support (22.15+ or 24+); this does not disable the plugin')
  if (!Buffer.isBuffer(input) || input.length === 0) throw new Error('Session log is empty or invalid')
  if (input.length > 128 * 1024 * 1024) throw new Error('Compressed session log exceeds the 128 MiB inspection limit')
  const chunks = []
  let offset = 0, total = 0
  while (offset < input.length) {
    const result = decode(input.subarray(offset), { info: true, maxOutputLength: 256 * 1024 * 1024 - total })
    const consumed = result?.engine?.bytesWritten
    if (!Buffer.isBuffer(result?.buffer) || !Number.isSafeInteger(consumed) || consumed <= 0 || consumed > input.length - offset) throw new Error('Decoder did not report a complete frame boundary')
    offset += consumed
    total += result.buffer.length
    if (total > 256 * 1024 * 1024) throw new Error('Decoded session log exceeds the 256 MiB inspection limit')
    chunks.push(result.buffer)
  }
  return Buffer.concat(chunks, total)
}
