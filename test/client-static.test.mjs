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
  assert.ok(source.includes('const triggerLabel = labels[displayed]'), 'trigger label must follow the previewed stop, like the popup')
})

test('fast mode drifts the spark dots on the compositor, high faster than low', () => {
  assert.match(source, /\.dsh-codex-reasoning-effort-slider-sparks-track\{[^}]*animation:dsh-codex-reasoning-effort-slider-sparkdrift/)
  assert.match(source, /@keyframes dsh-codex-reasoning-effort-slider-sparkdrift\{from\{transform:translate3d\(0,0,0\)\}to\{transform:translate3d\(-50%,0,0\)\}\}/)
  assert.match(source, /const effortSpeed = current\.effort === 'low' \? 0\.18 : current\.effort === 'high' \? 0\.45 : 0\.3/)
  assert.match(source, /const speed = current\.ultra \? \(current\.fast \? 1 : 0\.65\) : current\.fast \? effortSpeed : 0\.65/)
  assert.match(source, /current\.ultra\s*\n?\s*\? \(current\.fast \? 95 : 68\)/)
  assert.match(source, /const seconds = m\.speed > 0\.5 \? fillWidth \/ m\.speed : 2\.75/)
  assert.match(source, /const blend = Math\.min\(1, Math\.max\(0, \(time - m\.changedAt\) \/ 600\)\)/)
  assert.match(source, /seconds\.toFixed\(2\) \+ 's'/)
  assert.match(source, /effort: displayed/)
  assert.ok(!source.includes('m.travel'), 'the per-frame particle travel must be gone; CSS owns the drift')
  assert.ok(/paintDots\(width\)/.test(source), 'the dot sprite must be painted once, not every frame')
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
  assert.match(source, /writeFastState\(targetSession, nextFast\)/)
  assert.match(source, /setFast\(payload\.fast === true\)/)
})

test('reset to default also clears the host fast record and rolls back on failure', () => {
  assert.match(
    source,
    /onClick: \(\) => \{\s*const previousFast = fast;\s*const targetSession = sessionId;\s*setFast\(false\);\s*if \(targetSession\) \{\s*writeFastState\(targetSession, false\)\.then\(/,
    'reset must POST fast:false, not only flip the local state',
  )
  assert.match(
    source,
    /writeFastState\(targetSession, false\)\.then\(payload => \{[^]*?setFast\(payload\.fast === true\)/,
    'reset must adopt the host answer, like the bolt toggle does',
  )
  assert.match(
    source,
    /setFast\(previousFast\);\s*setError\(t\('failed'\)\)/,
    'a failed host write must restore the previous Fast state and surface an error',
  )
})

test('busy probe reads the real session snapshot instead of the removed turnOf helpers', () => {
  assert.match(source, /probe\.binding\(key\)/)
  assert.match(source, /face\.getSnapshot\(\)/)
  assert.match(source, /typeof snapshot\.running === 'boolean'\) return snapshot\.running/)
})

test('a stop picked mid-turn queues the full selection and keeps its preview', () => {
  assert.match(source, /const deferTimerRef = useRef\(null\)/)
  assert.match(source, /pendingRef\.current = next/)
  assert.match(source, /function scheduleDeferredCommit\(\)/)
  assert.match(source, /void commit\(target\)/)
  assert.match(source, /if \(await sessionBusy\(\)\) return;/)
  assert.match(source, /if \(!queued\) \{ setPreview\(null\); previewRef\.current = null; \}/)
  assert.match(source, /stopDeferTimer\(\);\s*pendingRef\.current = null;/, 'session change and unmount must clear the queue')
})

test('client bundle only talks to the loopback host route and same-origin', () => {
  assert.equal((source.match(/fetch\(/g) ?? []).length, 2, 'GET + POST helpers are expected')
  assert.match(source, /credentials: 'same-origin'/)
})
