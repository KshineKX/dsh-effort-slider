#!/usr/bin/env node
/**
 * Verify that the prompt injection really reached the model.
 *
 * DSH stores every model-visible message in the session log. `system/message`
 * events are the rendered system prompt of each request, so the injected
 * sections show up there — not in the model's CoT / reasoning text.
 *
 * Usage:
 *   node tools/inspect-session.mjs                 # newest session log under $DSH_HOME
 *   node tools/inspect-session.mjs <file.zstd>     # a specific session log
 *
 * Read-only. Exit 0 always (2 when no log is found).
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import zlib from 'node:zlib'

const NEEDLES = ['你的用量是', '你处于快速模式']
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/** DSH appends one zstd frame per batch; concatenate the decoded frames. */
function decompress(file) {
  const buf = fs.readFileSync(file)
  const starts = []
  for (let i = 0; i + 4 <= buf.length; i += 1) {
    if (buf[i] === MAGIC[0] && buf[i + 1] === MAGIC[1] && buf[i + 2] === MAGIC[2] && buf[i + 3] === MAGIC[3]) starts.push(i)
  }
  let text = ''
  for (let k = 0; k < starts.length; k += 1) {
    const end = k + 1 < starts.length ? starts[k + 1] : buf.length
    try {
      text += zlib.zstdDecompressSync(buf.subarray(starts[k], end)).toString('utf8')
    } catch {
      /* a false-positive magic inside compressed data: skip that chunk */
    }
  }
  return text
}

/** Newest session log under $DSH_HOME/sessions (prefer the current session). */
function newestSessionFile() {
  const home = process.env.DSH_HOME && process.env.DSH_HOME.length > 0 ? process.env.DSH_HOME : path.join(os.homedir(), '.dsh')
  const sessionId = process.env.DSH_SESSION_ID
  const files = []
  const walk = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/^session\.v\d+\.jsonl\.zstd$/.test(entry.name)) files.push({ full, mtime: fs.statSync(full).mtimeMs })
    }
  }
  walk(path.join(home, 'sessions'))
  files.sort((a, b) => b.mtime - a.mtime)
  if (sessionId) {
    const own = files.find((candidate) => candidate.full.includes(sessionId))
    if (own) return own.full
  }
  return files[0] ? files[0].full : undefined
}

const file = process.argv[2] ?? newestSessionFile()
if (!file || !fs.existsSync(file)) {
  console.error('no session log found (pass a path explicitly)')
  process.exit(2)
}
const lines = decompress(file).split('\n').filter(Boolean)
let systemMessages = 0
let injected = 0
const rows = []
for (const line of lines) {
  let event
  try {
    event = JSON.parse(line)
  } catch {
    continue
  }
  if (event.type !== 'system/message') continue
  systemMessages += 1
  const data = JSON.stringify(event.data ?? {})
  const found = NEEDLES.filter((needle) => data.includes(needle))
  if (found.length === 0) continue
  injected += 1
  rows.push({
    seq: event.seq,
    time: new Date(event.time).toISOString(),
    sections: found.map((needle) => (needle === NEEDLES[0] ? 'Ultra/预算无上限' : 'Fast/快速模式')),
    source: /"kind":"system-prompt"/.test(data) ? 'system-prompt' : 'unknown',
  })
}

console.log('session log : ' + file)
console.log('system/message events: ' + systemMessages + '   with injection: ' + injected)
for (const row of rows) {
  console.log('  seq=' + row.seq + '  ' + row.time + '  ' + row.sections.join(' + ') + '  (' + row.source + ')')
}
if (injected === 0) {
  console.log('')
  console.log('No injected section in this log. Check the toggle state: GET /effort-slider/state?sessionId=<id>')
  console.log('or note that the log may only contain older requests.')
}
console.log('')
console.log('The injected text lives in the system prompt of each request; it is not echoed in the model CoT.')
