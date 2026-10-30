/**
 * Persisted per-Session state: whether the far-right stop armed the "full
 * throttle" prompt injection, and whether the Fast (speed-first) prompt is on.
 *
 * One record per Session: `{ topEffortId?, throttle?, fast? }`.
 *  - `throttle: true` + `topEffortId`: the far-right stop is armed; the Host
 *    only injects while the request actually runs at that effort.
 *  - `fast: true`: the Fast toggle is on; an independent prompt section runs.
 *
 * Writes go through a temporary file and a rename so a crash never leaves a
 * half-written state file behind. The file is bounded: dropping the oldest
 * recorded Session keeps a long-lived install from growing the map forever.
 *
 * This module is a rewrite of the state helper in
 * lizilong1993/dsh-unlimited-effort (MIT); see NOTICE.md.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** Current on-disk shape. */
export const STATE_VERSION = 2

/** How many Session choices are remembered before the oldest is dropped. */
export const MAX_SESSIONS = 256

/**
 * The Harness home directory.
 * @returns the absolute DSH home path.
 */
export function dshHome() {
  return process.env.DSH_HOME && process.env.DSH_HOME.length > 0
    ? process.env.DSH_HOME
    : path.join(os.homedir(), '.dsh')
}

/**
 * Where this plugin keeps its switch state.
 * @param home - Harness home override, for tests.
 * @returns the absolute state file path.
 */
export function statePath(home = dshHome()) {
  return path.join(home, 'effort-slider.json')
}

/** The state a Session sees when it has never been recorded. */
export function emptyState() {
  return { version: STATE_VERSION, sessions: {} }
}

/** Effort ids are adapter-owned opaque strings; bound what we persist. */
function normaliseEffort(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return undefined
  return value
}

/**
 * Normalise one stored Session value into a record.
 * Legacy shapes (`true`, `{topEffortId}`) are tolerated; a broken entry can
 * never turn anything on.
 * @param value - raw stored value.
 * @returns the normalised record, or undefined when nothing is on.
 */
function normaliseRecord(value) {
  if (value === true) return { throttle: true }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = {}
  const topEffortId = normaliseEffort(value.topEffortId)
  if (topEffortId !== undefined) record.topEffortId = topEffortId
  if (value.throttle === true || topEffortId !== undefined) record.throttle = true
  if (value.fast === true) record.fast = true
  if (record.throttle !== true && record.fast !== true) return undefined
  return record
}

/**
 * Read the state.
 * A missing, unreadable or malformed file is not an error: it reads as
 * "nothing recorded", so everything is off.
 * @param file - state file path.
 * @returns the normalised state.
 */
export function readState(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    const raw = parsed !== null && typeof parsed === 'object' && parsed.sessions !== null && typeof parsed.sessions === 'object'
      ? parsed.sessions
      : {}
    const sessions = {}
    for (const [id, value] of Object.entries(raw)) {
      if (typeof id !== 'string' || id.length === 0 || id.length > 200) continue
      const record = normaliseRecord(value)
      if (record !== undefined) Object.defineProperty(sessions, id, { value: record, enumerable: true, writable: true, configurable: true })
    }
    return { version: STATE_VERSION, sessions }
  } catch {
    return emptyState()
  }
}

/**
 * The record for one Session.
 * @param state - normalised state.
 * @param sessionId - the Session identity.
 * @returns the record, or undefined.
 */
export function recordOf(state, sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) return undefined
  if (state === null || typeof state !== 'object' || state.sessions === null || typeof state.sessions !== 'object') return undefined
  if (!Object.prototype.hasOwnProperty.call(state.sessions, sessionId)) return undefined
  const value = state.sessions[sessionId]
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined
}

/** Whether the Session's far-right stop is armed. */
export function isEnabled(state, sessionId) {
  const record = recordOf(state, sessionId)
  return record !== undefined && record.throttle === true
}

/** Whether the Session's Fast toggle is on. */
export function isFast(state, sessionId) {
  const record = recordOf(state, sessionId)
  return record !== undefined && record.fast === true
}

/** Atomically replace the whole state file. */
function persist(file, sessions) {
  const value = { version: STATE_VERSION, sessions }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = file + '.' + process.pid + '.' + Date.now() + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8')
  fs.renameSync(tmp, file)
  return value
}

/**
 * Merge a partial change into one Session's record and persist it.
 *
 * `enabled: true` arms the throttle at `topEffortId`; `enabled: false` disarms
 * it but keeps Fast. `fast: true/false` toggles Fast but keeps the throttle.
 * A record with nothing on is removed.
 *
 * @param file - state file path.
 * @param state - current normalised state.
 * @param sessionId - the Session identity.
 * @param patch - partial update.
 * @returns the normalised state that was written.
 */
export function updateRecord(file, state, sessionId, patch) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    throw new Error('effort-slider: a Session id is required to record state')
  }
  const record = { ...(recordOf(state, sessionId) ?? {}) }
  if (patch.fast !== undefined) {
    if (patch.fast === true) record.fast = true
    else delete record.fast
  }
  if (patch.enabled !== undefined) {
    if (patch.enabled === true) {
      const top = normaliseEffort(patch.topEffortId)
      record.throttle = true
      if (top !== undefined) record.topEffortId = top
      else delete record.topEffortId
    } else {
      delete record.throttle
      delete record.topEffortId
    }
  }
  const sessions = { ...state.sessions }
  delete sessions[sessionId]
  if (record.throttle === true || record.fast === true) {
    Object.defineProperty(sessions, sessionId, { value: record, enumerable: true, writable: true, configurable: true })
    while (Object.keys(sessions).length > MAX_SESSIONS) {
      const oldest = Object.keys(sessions)[0]
      if (oldest === undefined) break
      delete sessions[oldest]
    }
  }
  return persist(file, sessions)
}
