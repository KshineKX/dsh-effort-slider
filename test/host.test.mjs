import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { apply, ROUTE_STATE } from '../index.js'
import { currentEffort, makeFastGate, makeGate, sessionIdOf } from '../lib/gate.js'
import { isEnabled, isFast, readState, recordOf, statePath, updateRecord } from '../lib/state.js'

/** A temporary DSH_HOME so tests never touch the real one. */
function withHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'effort-slider-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = home
  return {
    home,
    restore() {
      if (previous === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = previous
      fs.rmSync(home, { recursive: true, force: true })
    },
  }
}

/** Minimal Cordis-shaped context that records what the plugin registers. */
function fakeContext() {
  const sections = []
  const routes = []
  const ctx = {
    logger: { warn() {} },
    effect(fn) {
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    systemPrompt: {
      section(options) {
        sections.push(options)
        return () => {}
      },
    },
    inject(names, callback) {
      if (!names.includes('webServer')) throw new Error('unexpected injection ' + String(names))
      callback({
        webServer: {
          register(route) {
            routes.push(route)
            return () => {}
          },
        },
        effect(fn) {
          const dispose = fn()
          return typeof dispose === 'function' ? dispose : () => {}
        },
      })
    },
  }
  return { ctx, sections, routes }
}

/** Fake Node response capturing the JSON reply. */
function fakeResponse() {
  const out = { statusCode: 200, headers: {}, body: '' }
  return {
    out,
    get statusCode() {
      return out.statusCode
    },
    set statusCode(value) {
      out.statusCode = value
    },
    setHeader(name, value) {
      out.headers[name] = value
    },
    end(text) {
      out.body = text
    },
  }
}

/** Fake Node request option (async iterable body, loopback socket). */
function fakeRequest(options) {
  const chunks = options.body === undefined ? [] : [Buffer.from(JSON.stringify(options.body), 'utf8')]
  return {
    method: options.method ?? 'GET',
    url: options.url ?? ROUTE_STATE,
    socket: { remoteAddress: options.remoteAddress ?? '127.0.0.1' },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
  }
}

test('state: throttle arm, fast toggle, merge and clear', () => {
  const scope = withHome()
  try {
    const file = statePath()
    let state = readState(file)

    state = updateRecord(file, state, 'session-a', { enabled: true, topEffortId: 'max' })
    assert.equal(isEnabled(state, 'session-a'), true)
    assert.equal(isFast(state, 'session-a'), false)
    assert.equal(recordOf(state, 'session-a').topEffortId, 'max')

    state = updateRecord(file, state, 'session-a', { fast: true })
    assert.equal(isFast(state, 'session-a'), true)
    assert.equal(recordOf(state, 'session-a').topEffortId, 'max')

    state = updateRecord(file, state, 'session-a', { enabled: false })
    assert.equal(isEnabled(state, 'session-a'), false)
    assert.equal(isFast(state, 'session-a'), true)

    state = updateRecord(file, state, 'session-a', { fast: false })
    assert.equal(recordOf(state, 'session-a'), undefined)

    const reloaded = readState(file)
    assert.deepEqual(reloaded.sessions, {})
  } finally {
    scope.restore()
  }
})

test('state: a corrupt file reads as nothing recorded', () => {
  const scope = withHome()
  try {
    const file = statePath()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, '{not json', 'utf8')
    assert.deepEqual(readState(file).sessions, {})
  } finally {
    scope.restore()
  }
})

test('state: the map is bounded', () => {
  const scope = withHome()
  try {
    const file = statePath()
    let state = readState(file)
    for (let index = 0; index < 300; index += 1) state = updateRecord(file, state, 'session-' + String(index), { fast: true })
    assert.ok(Object.keys(state.sessions).length <= 256)
    assert.equal(recordOf(state, 'session-0'), undefined)
    assert.notEqual(recordOf(state, 'session-299'), undefined)
  } finally {
    scope.restore()
  }
})

test('gate: session id and effort resolution', () => {
  assert.equal(sessionIdOf(undefined), undefined)
  assert.equal(sessionIdOf({ agent: { session: { id: 'abc' } } }), 'abc')
  assert.equal(sessionIdOf({ agent: { id: 'plain' } }), 'plain')
  assert.equal(currentEffort({ agent: { options: { reasoningEffort: 'high' } } }), 'high')
  assert.equal(
    currentEffort({
      agent: {
        options: {},
        session: {
          requestHeader() {
            return { config: { reasoningEffort: 'max' } }
          },
        },
      },
    }),
    'max',
  )
})

test('gate: throttle injects only for an armed session at its recorded stop', () => {
  const cfg = { enabled: true, topEffortIds: ['max'] }
  const records = { armed: { throttle: true, topEffortId: 'max' }, fallback: { throttle: true }, fastOnly: { fast: true } }
  const gate = makeGate(cfg, (sessionId) => records[sessionId])
  assert.equal(gate(undefined), false)
  assert.equal(gate({ agent: { session: { id: 'unarmed' }, options: { reasoningEffort: 'max' } } }), false)
  assert.equal(gate({ agent: { session: { id: 'armed' }, options: { reasoningEffort: 'high' } } }), false)
  assert.equal(gate({ agent: { session: { id: 'armed' }, options: { reasoningEffort: 'max' } } }), true)
  assert.equal(gate({ agent: { session: { id: 'fallback' }, options: { reasoningEffort: 'max' } } }), true)
  assert.equal(gate({ agent: { session: { id: 'fallback' }, options: { reasoningEffort: 'high' } } }), false)
  assert.equal(gate({ agent: { session: { id: 'fastOnly' }, options: { reasoningEffort: 'max' } } }), false)
  assert.equal(
    makeGate({ enabled: false, topEffortIds: ['max'] }, () => ({ throttle: true, topEffortId: 'max' }))({
      agent: { session: { id: 'armed' }, options: { reasoningEffort: 'max' } },
    }),
    false,
  )
})

test('gate: fast injects independently of effort', () => {
  const records = { fast: { fast: true }, throttle: { throttle: true, topEffortId: 'max' } }
  const gate = makeFastGate({ enabled: true }, (sessionId) => records[sessionId])
  const at = (reasoningEffort) => ({ agent: { session: { id: 'fast' }, options: { reasoningEffort } } })
  assert.equal(gate(undefined), false)
  assert.equal(gate(at('low')), true)
  assert.equal(gate(at('max')), true)
  assert.equal(gate({ agent: { session: { id: 'throttle' }, options: { reasoningEffort: 'max' } } }), false)
})

test('host: two sections and the loopback route drive both flags per session', async () => {
  const scope = withHome()
  try {
    const { ctx, sections, routes } = fakeContext()
    apply(ctx, {})
    assert.equal(sections.length, 2)
    const throttle = sections.find((section) => section.name.endsWith(':throttle'))
    const fast = sections.find((section) => section.name.endsWith(':fast'))
    assert.ok(throttle && fast)
    assert.equal(routes.length, 1)
    assert.equal(routes[0].path, ROUTE_STATE)

    const contextAt = (reasoningEffort) => ({ agent: { session: { id: 'session-a' }, options: { reasoningEffort } } })
    assert.equal(throttle.text(contextAt('max')), '')
    assert.equal(fast.text(contextAt('max')), '')

    const handler = routes[0].handler
    const get = async () => {
      const res = fakeResponse()
      await handler(fakeRequest({ url: ROUTE_STATE + '?sessionId=session-a' }), res)
      return { status: res.out.statusCode, payload: JSON.parse(res.out.body) }
    }
    const post = async (body) => {
      const res = fakeResponse()
      await handler(fakeRequest({ method: 'POST', body }), res)
      return { status: res.out.statusCode, payload: JSON.parse(res.out.body) }
    }

    let reply = await get()
    assert.equal(reply.payload.enabled, false)
    assert.equal(reply.payload.fast, false)

    reply = await post({ sessionId: 'session-a', enabled: true, topEffortId: 'max' })
    assert.equal(reply.payload.enabled, true)
    assert.equal(reply.payload.topEffortId, 'max')
    assert.match(throttle.text(contextAt('max')), /unlimited/)
    assert.equal(throttle.text(contextAt('high')), '')
    assert.equal(fast.text(contextAt('max')), '')

    reply = await post({ sessionId: 'session-a', fast: true })
    assert.equal(reply.payload.fast, true)
    assert.equal(reply.payload.enabled, true, 'fast does not disarm the throttle')
    assert.match(fast.text(contextAt('low')), /快速模式/)

    reply = await post({ sessionId: 'session-a', enabled: false })
    assert.equal(reply.payload.enabled, false)
    assert.equal(reply.payload.fast, true, 'disarming the throttle keeps fast')
    assert.equal(throttle.text(contextAt('max')), '')
    assert.match(fast.text(contextAt('low')), /快速模式/)

    reply = await post({ sessionId: 'session-a', fast: false })
    assert.equal(reply.payload.fast, false)
    assert.equal(fast.text(contextAt('low')), '')
  } finally {
    scope.restore()
  }
})

test('host: the route refuses non-loopback callers and bad bodies', async () => {
  const scope = withHome()
  try {
    const { ctx, routes } = fakeContext()
    apply(ctx, {})
    const handler = routes[0].handler

    const denied = fakeResponse()
    await handler(fakeRequest({ url: ROUTE_STATE, remoteAddress: '10.0.0.7' }), denied)
    assert.equal(denied.out.statusCode, 403)

    const badBody = fakeResponse()
    await handler(fakeRequest({ method: 'POST', body: { sessionId: '', enabled: true } }), badBody)
    assert.equal(badBody.out.statusCode, 400)

    const badMethod = fakeResponse()
    await handler(fakeRequest({ method: 'PUT' }), badMethod)
    assert.equal(badMethod.out.statusCode, 405)
  } finally {
    scope.restore()
  }
})
