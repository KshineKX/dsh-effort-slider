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

test('per-stop accent colours: Low green, High blue, Ultra purple, via data-effort', () => {
  assert.match(source, /rail\[data-effort="low"\] \.dsh-codex-reasoning-effort-slider-fill\{background:linear-gradient\(90deg,#34d399 0%,#22c55e 100%\)\}/)
  assert.match(source, /rail\[data-effort="high"\] \.dsh-codex-reasoning-effort-slider-fill\{background:linear-gradient\(90deg,#60a5fa 0%,#3988f6 100%\)\}/)
  assert.match(source, /popup\[data-effort="low"\] .*heading\{color:#22c55e\}/)
  assert.match(source, /popup\[data-effort="high"\] .*heading\{color:#3989e9\}/)
  assert.match(source, /trigger\[data-effort="low"\] .*trigger-effort\{color:#22c55e\}/)
  assert.match(source, /trigger\[data-effort="high"\] .*trigger-effort\{color:#3989e9\}/)
  assert.ok(source.includes("'data-effort': displayed || ''"))
  assert.ok(source.includes("'data-effort': savedEffort || ''"))
})

test('fast mode makes the spark dots drift left, slower than ultra, high a bit faster than low', () => {
  assert.match(source, /const effortSpeed = current\.effort === 'low' \? 0\.18 : current\.effort === 'high' \? 0\.45 : 0\.3/)
  assert.match(source, /effort: displayed/)
  assert.match(source, /if \(current\.ultra \|\| current\.fast\) m\.travel \+= delta \* m\.speed/)
  assert.match(source, /current\.fast \? m\.travel \* \(70 \+ i % 6 \* 9\)/)
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

test('reset to default also clears the host fast record', () => {
  assert.match(
    source,
    /onClick: \(\) => \{\s*setFast\(false\);\s*if \(sessionId\) \{\s*writeFastState\(sessionId, false\)\.then\(/,
    'reset must POST fast:false, not only flip the local state',
  )
  assert.match(
    source,
    /writeFastState\(sessionId, false\)\.then\(payload => \{[^]*?setFast\(payload\.fast === true\)/,
    'reset must adopt the host answer, like the bolt toggle does',
  )
})

test('busy probe reads the real session snapshot instead of the removed turnOf helpers', () => {
  assert.match(source, /probe\.binding\(key\)/)
  assert.match(source, /face\.getSnapshot\(\)/)
  assert.match(source, /typeof snapshot\.running === 'boolean'\) return snapshot\.running/)
})

test('a stop picked mid-turn is queued and applied after the turn ends', () => {
  assert.match(source, /const deferTimerRef = useRef\(null\)/)
  assert.match(source, /pendingRef\.current = next\.reasoningEffort \?\? null/)
  assert.match(source, /deferTimerRef\.current = setInterval\(async \(\) => \{/)
  assert.match(source, /if \(await sessionBusy\(\)\) return;/)
  assert.match(source, /chooseEffort\(wanted\)/)
})

test('client bundle only talks to the loopback host route and same-origin', () => {
  assert.equal((source.match(/fetch\(/g) ?? []).length, 2, 'GET + POST helpers are expected')
  assert.match(source, /credentials: 'same-origin'/)
})
