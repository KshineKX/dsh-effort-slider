import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(here, '..', 'client.js'), 'utf8')

test('client bundle keeps the ModuleLoader contract and the package id', () => {
  assert.match(source, /window\.__ModuleLoader__\.load\(/)
  assert.match(source, /id: 'dsh-effort-slider'/)
  assert.match(source, /inject: \['slots', 'modelDirectories', 'sessions', 'locale'/)
  assert.match(source, /apply\(ctx\)/)
})

test('client bundle replaces the composer model seat through the documented priority rule', () => {
  assert.match(source, /name: 'conversation\.input\.model'/)
  assert.match(source, /priority: -1/)
})

test('client bundle copies the Codex replica structure', () => {
  for (const needle of [
    'dsh-codex-reasoning-effort-slider-trigger',
    'dsh-codex-reasoning-effort-slider-rail',
    'dsh-codex-reasoning-effort-slider-knob',
    'dsh-codex-reasoning-effort-slider-popup',
    'Ultra',
    '快速模式',
    'requestAnimationFrame',
  ]) {
    assert.ok(source.includes(needle), 'missing replica detail: ' + needle)
  }
})

test('the rail geometry is self-consistent: 26px knob inside a 26px rail, fill reaches the end', () => {
  assert.match(source, /\*var\(--dsh-codex-reasoning-effort-slider-pos,0\) \+ 26px\)/)
  assert.match(source, /top:0;width:26px;height:26px;border-radius:50%/)
  assert.ok(!source.includes('top:-2px;width:30px;height:30px'), 'knob must not stick out of the rail')
  assert.ok(!source.includes('*var(--dsh-codex-reasoning-effort-slider-pos,0) + 15px)'), 'old half-knob fill width must be gone')
})

test('the knob is an opaque white puck and the fill is rounded at every stop', () => {
  assert.match(source, /background:linear-gradient\(180deg,#ffffff 0%,#eef0f3 100%\)/)
  assert.ok(
    !/\.dsh-codex-reasoning-effort-slider-knob\{[^}]*var\(--dsw-alias-bg-layer-2\)/.test(source),
    'knob must not use a theme token that can be translucent',
  )
  assert.match(source, /border-radius:16px;overflow:hidden/)
  assert.ok(!source.includes('border-radius:16px 0 0 16px'), 'fill must not keep a square right edge')
})

test('tooltips use an opaque menu surface instead of a possibly transparent token', () => {
  const tooltipRule = /\.dsh-codex-reasoning-effort-slider-tooltip\{[^}]*\}/.exec(source)
  assert.ok(tooltipRule, 'tooltip rule must exist')
  assert.ok(tooltipRule[0].includes('background:var(--dsw-specific-menu,#24262d)'), 'tooltip needs an opaque background')
  assert.ok(!tooltipRule[0].includes('var(--dsw-alias-bg-layer-2)'), 'tooltip must not use a possibly transparent token')
})

test('stop dots are solid and dragging tracks the finger before snapping', () => {
  assert.match(source, /background:#f5f6f8;box-shadow/)
  assert.match(source, /\.dsh-codex-reasoning-effort-slider-dot\.passed\{background:#ffffff;opacity:\.98\}/)
  assert.match(source, /function ratioAt\(event\)/)
  assert.match(source, /setDragPos\(ratioAt\(event\)\)/)
  assert.match(source, /dragPos === null \? fraction : dragPos/)
  assert.ok(source.includes('dragging .dsh-codex-reasoning-effort-slider-fill'))
  assert.ok(source.includes('dragging .dsh-codex-reasoning-effort-slider-knob'))
  assert.ok(source.includes('{transition:none}'))
})

test('ultra stop arms the throttle and the bolt toggles a real fast-mode prompt', () => {
  assert.match(source, /'\/effort-slider\/state'/)
  assert.match(source, /THROTTLE_EFFORT = 'max'/)
  assert.match(source, /writeHostState\(sessionId, want/)
  assert.match(source, /readHostState\(sessionId\)/)
  assert.match(source, /syncThrottleRef\.current\(savedEffort\)/)
  assert.match(source, /writeFastState\(sessionId, nextFast\)/)
  assert.match(source, /setFast\(payload\.fast === true\)/)
})

test('client bundle only talks to the loopback host route and same-origin', () => {
  assert.equal((source.match(/fetch\(/g) ?? []).length, 2, 'GET + POST helpers are expected')
  assert.match(source, /credentials: 'same-origin'/)
})
