import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(here, '..', 'client.js'), 'utf8')

/** Run the browser bundle in a bare VM with just enough globals to mount. */
function loadBundle() {
  let captured
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(mod) {
          captured = mod
        },
      },
    },
    document: { addEventListener() {}, removeEventListener() {} },
    navigator: { language: 'zh-CN' },
    console,
    Node: class Node {},
    requestAnimationFrame() {
      return 0
    },
    cancelAnimationFrame() {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    performance,
    ResizeObserver: class ResizeObserver {
      observe() {}
      disconnect() {}
    },
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'client.js' })
  assert.ok(captured, 'the bundle must call window.__ModuleLoader__.load')
  assert.equal(captured.id, 'dsh-effort-slider')

  const React = {
    createElement() {
      return {}
    },
    createPortal() {
      return {}
    },
    useState(value) {
      return [value, () => {}]
    },
    useEffect() {},
    useLayoutEffect() {},
    useRef(value) {
      return { current: value }
    },
    useSyncExternalStore() {
      return {}
    },
  }
  const mod = captured.factory((name) => {
    if (name === 'react') return React
    if (name === 'react-dom') return { createPortal: React.createPortal }
    throw new Error('unexpected module ' + name)
  })
  return mod
}

test('client bundle mounts the model seat and registers the loopback sync', async () => {
  const mod = loadBundle()
  const registrations = []
  const effects = []
  const ctx = {
    sessions: { subagentAddress() { return undefined; } },
    modelDirectories: { directoryFor() { return {}; } },
    effect(fn) {
      effects.push(fn)
      const dispose = fn()
      return typeof dispose === 'function' ? dispose : () => {}
    },
    locale: {
      register() {},
    },
    slots: {
      inject(name, fn) {
        assert.equal(name, 'conversation.input.model')
        fn()
      },
      register(options, component) {
        registrations.push({ options, component })
        return () => {}
      },
    },
  }
  await mod.apply(ctx)
  assert.equal(registrations.length, 1)
  assert.equal(registrations[0].options.name, 'conversation.input.model')
  assert.equal(registrations[0].options.priority, -1)
  assert.equal(typeof registrations[0].options.inject, 'function')
  assert.equal(typeof registrations[0].component, 'function')
  assert.ok(effects.length >= 2, 'sessions and locale are bridged through ctx.effect')

  const face = registrations[0].options.inject('session-1')
  assert.equal(face.sessionId, 'session-1')
  assert.equal(face.available, true)
  assert.equal(typeof face.select, 'function')
})
