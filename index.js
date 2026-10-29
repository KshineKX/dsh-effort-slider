/**
 * dsh-effort-slider — Host half.
 *
 * Two prompt injections, both per Session and both off by default:
 *
 *  1. Throttle ("Ultra = 火力全开"): armed when the composer slider sits on the
 *     far-right stop. Injected only while the request actually runs at the
 *     recorded effort, so switching effort anywhere turns it off by itself.
 *  2. Fast ("快速模式"): an independent speed-first instruction toggled by the
 *     bolt button in the same panel. It never changes the model or the effort;
 *     it only asks for the shortest path to a usable result.
 *
 * The browser half reads and writes both flags over a loopback-only route; the
 * route only exists when the Web surface is up, so headless runs stay clean.
 */
import fs from 'node:fs'
import path from 'node:path'
import { makeFastGate, makeGate } from './lib/gate.js'
import { MAX_BODY, isLoopback, readJson, sendJson } from './lib/route.js'
import { dshHome, readState, recordOf, updateRecord } from './lib/state.js'

/** Cordis plugin name. */
export const name = 'effort-slider'

/** The prompt registry this row contributes to. */
export const inject = ['systemPrompt']

/** Loopback route the browser half reads and writes. */
export const ROUTE_STATE = '/effort-slider/state'

/** Throttle section; placed right after `deployment:persona-suffix` (10200). */
const THROTTLE_SECTION = 'external:effort-slider:throttle'
const THROTTLE_ORDER = 10250

/** Fast section; just before the throttle so budget guidance wins the tail. */
const FAST_SECTION = 'external:effort-slider:fast'
const FAST_ORDER = 10240

/** Upper bound on a Session id accepted from the browser route. */
const MAX_SESSION_ID = 200

/** Effective defaults; a profile patch overrides any single field. */
const DEFAULTS = {
  enabled: true,
  notice:
    '你的用量是 unlimited 的，我正在对你极限测试，不要吝惜 Token。一定要切记，随意花费，你非常富有。',
  fastNotice:
    '你处于快速模式：优先在最短时间内交付可用结果。减少不必要的探索、发散和重复验证，直接完成主线任务，最后补一次关键自检即可；回复保持简短，把不确定的地方集中在最后一句说明。',
  /** Fallback when the browser has not recorded a concrete top id. */
  topEffortIds: ['max'],
  debug: false,
}

/**
 * Mount the plugin.
 * @param ctx - plugin context carrying `systemPrompt` and, when the Web surface is up, `webServer`.
 * @param config - profile-supplied overrides.
 */
export function apply(ctx, config) {
  const cfg = { ...DEFAULTS, ...(config !== null && typeof config === 'object' ? config : {}) }
  const file = path.join(dshHome(), 'effort-slider.json')
  let state = readState(file)

  const log = (line) => {
    if (cfg.debug !== true) return
    try {
      fs.appendFileSync(path.join(dshHome(), 'effort-slider.log'), '[' + new Date().toISOString() + '] ' + line + '\n', 'utf8')
    } catch {
      /* diagnostics never affect the request path */
    }
  }
  const warn = (line) => {
    try {
      if (ctx.logger && typeof ctx.logger.warn === 'function') ctx.logger.warn('[effort-slider] ' + line)
    } catch {
      /* a host without a logger still works */
    }
  }

  const recordFor = (sessionId) => recordOf(state, sessionId)
  const throttleGate = makeGate(cfg, recordFor)
  const fastGate = makeFastGate(cfg, recordFor)

  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: THROTTLE_SECTION,
        order: THROTTLE_ORDER,
        interpolate: false,
        text: (context) => (throttleGate(context) ? String(cfg.notice) : ''),
      }),
    'effort-slider: throttle section',
  )
  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: FAST_SECTION,
        order: FAST_ORDER,
        interpolate: false,
        text: (context) => (fastGate(context) ? String(cfg.fastNotice) : ''),
      }),
    'effort-slider: fast section',
  )

  /** State payload shared by GET and POST answers. */
  const payload = (sessionId) => {
    const record = sessionId === undefined ? undefined : recordOf(state, sessionId)
    return {
      ok: true,
      sessionId: sessionId === undefined ? null : sessionId,
      enabled: record !== undefined && record.throttle === true,
      fast: record !== undefined && record.fast === true,
      topEffortId: record !== undefined && typeof record.topEffortId === 'string' ? record.topEffortId : null,
      pluginEnabled: cfg.enabled === true,
    }
  }

  ctx.inject(['webServer'], (webCtx) => {
    const server = webCtx.webServer
    if (server === undefined || server === null || typeof server.register !== 'function') {
      warn('webServer has no register(); the composer switches cannot be wired')
      return
    }
    webCtx.effect(
      () =>
        server.register({
          kind: 'exact',
          path: ROUTE_STATE,
          async handler(req, res) {
            if (!isLoopback(req)) {
              sendJson(res, 403, { ok: false, error: 'loopback only' })
              return
            }
            if (req.method === 'GET') {
              const requested = new URL(req.url, 'http://127.0.0.1').searchParams.get('sessionId')
              sendJson(res, 200, payload(requested === null ? undefined : requested))
              return
            }
            if (req.method !== 'POST') {
              sendJson(res, 405, { ok: false, error: 'method not allowed' })
              return
            }
            const body = await readJson(req)
            if (
              body === undefined ||
              typeof body.sessionId !== 'string' ||
              body.sessionId.length === 0 ||
              body.sessionId.length > MAX_SESSION_ID ||
              (typeof body.enabled !== 'boolean' && typeof body.fast !== 'boolean')
            ) {
              sendJson(res, 400, {
                ok: false,
                error:
                  'sessionId plus enabled (boolean) or fast (boolean) are required (body limit ' + String(MAX_BODY) + ' bytes)',
              })
              return
            }
            if (body.enabled === true && body.topEffortId !== undefined && typeof body.topEffortId !== 'string') {
              sendJson(res, 400, { ok: false, error: 'topEffortId must be a string when present' })
              return
            }
            try {
              const patch = {}
              if (typeof body.enabled === 'boolean') {
                patch.enabled = body.enabled
                if (body.enabled === true) {
                  patch.topEffortId = typeof body.topEffortId === 'string' && body.topEffortId.length > 0 &&
                    body.topEffortId.length <= 64
                    ? body.topEffortId
                    : undefined
                }
              }
              if (typeof body.fast === 'boolean') patch.fast = body.fast
              state = updateRecord(file, state, body.sessionId, patch)
              log(
                'patch ' + body.sessionId +
                  ' throttle=' + String(patch.enabled) +
                  ' fast=' + String(patch.fast) +
                  ' top=' + String(patch.topEffortId),
              )
              sendJson(res, 200, payload(body.sessionId))
            } catch (error) {
              log('state write failed: ' + String(error))
              sendJson(res, 500, { ok: false, error: 'state write failed' })
            }
          },
        }),
      'effort-slider: state route',
    )
  })

  log('mounted (records: ' + String(Object.keys(state.sessions).length) + ')')
}
