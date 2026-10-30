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
 * Read-only. Exit 0 on a complete inspection; exit 2 when missing, unsupported or corrupt.
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { decodeSessionFrames } from '../lib/session-log.js'

const NEEDLES = ['你的用量是', '你处于快速模式']
function decompress(file) {
  if (fs.statSync(file).size > 128 * 1024 * 1024) throw new Error('Compressed session log exceeds the 128 MiB inspection limit')
  return decodeSessionFrames(fs.readFileSync(file)).toString('utf8')
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

try {
const file = process.argv[2] ?? newestSessionFile()
if (!file || !fs.existsSync(file)) {
  console.error('no session log found (pass a path explicitly)')
  process.exit(2)
}
const lines = decompress(file).split('\n').filter(Boolean)
let systemMessages = 0
let injected = 0
let invalidLines = 0
const rows = []
for (const line of lines) {
  let event
  try {
    event = JSON.parse(line)
  } catch {
    invalidLines += 1
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

if (invalidLines > 0) throw new Error('Decoded log contains invalid JSON lines; no complete injection conclusion is available')
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
console.log('The rendered system/message log records prompt assembly, not provider receipt or model compliance; CoT is not an injection receipt.')

} catch (error) {
  console.error('Session inspection failed: ' + error.message)
  process.exitCode = 2
}
