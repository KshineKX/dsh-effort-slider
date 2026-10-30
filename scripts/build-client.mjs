/**
 * Build this plugin's browser bundle from the MIT-licensed Codex 1:1 replica
 * vendored under `vendor/codex-reasoning-effort-slider-client.js`, then apply
 * the small "full throttle / fast mode" integration.
 *
 * The vendored file is the UI wheel (structure, CSS, particles, animations,
 * model pane). Our additions are:
 *   - module id matches this package;
 *   - the far-right stop fills the whole rail (upstream stops half a knob short);
 *   - `/effort-slider/state` sync for two Host flags: effort `max` arms the
 *     "budget unlimited" injection, the bolt button arms a "fast mode"
 *     instruction, and both are reconciled against the live selection even when
 *     it changes through another entry (the `/model` command popup);
 *   - the Fast toggle is functional (it injects) instead of decorative;
 *   - the registration explicitly shadows the native composer model seat with
 *     priority -1 (the Host's documented way to replace a single slot).
 *
 * Run: node scripts/build-client.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const vendor = path.join(root, 'vendor', 'codex-reasoning-effort-slider-client.js')
const target = path.join(root, 'client.js')

if (!fs.existsSync(vendor)) {
  throw new Error('vendor source missing: ' + vendor)
}
let source = fs.readFileSync(vendor, 'utf8').replace(/\r\n/g, '\n')

/** Replace exactly once; a moved anchor should fail the build, not silently skip. */
function patch(label, before, after) {
  const hits = source.split(before).length - 1
  if (hits !== 1) throw new Error(`patch "${label}" expected 1 anchor, found ${hits}`)
  source = source.replace(before, after)
}

patch(
  'module id',
  "  id: '@local/dsh-codex-reasoning-effort-slider',",
  "  id: 'dsh-effort-slider',",
)

// Upstream geometry: a 30px knob rides a 26px rail (sticks out 2px top/bottom)
// and the fill stops at the knob centre (a crescent of empty rail stays visible
// at the far right). We keep the knob inside the rail and let the fill reach the
// knob's right edge at every stop.
patch(
  'knob fits inside the rail',
  'left:calc((100% - 30px)*var(--dsh-codex-reasoning-effort-slider-pos,0));top:-2px;width:30px;height:30px;border-radius:50%;',
  'left:calc((100% - 26px)*var(--dsh-codex-reasoning-effort-slider-pos,0));top:0;width:26px;height:26px;border-radius:50%;',
)
patch(
  'fill reaches the rail end',
  'width:calc((100% - 30px)*var(--dsh-codex-reasoning-effort-slider-pos,0) + 15px)',
  'width:calc((100% - 26px)*var(--dsh-codex-reasoning-effort-slider-pos,0) + 26px)',
)
patch(
  'solid stop dots on the rail centre line',
  '.dsh-codex-reasoning-effort-slider-dot{position:absolute;top:11px;left:calc((100% - 30px)*var(--dsh-codex-reasoning-effort-slider-tick) + 15px);width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--dsw-alias-label-caption);pointer-events:none;transition:opacity .18s ease .22s,transform .14s ease}',
  '.dsh-codex-reasoning-effort-slider-dot{position:absolute;top:10.5px;left:calc((100% - 26px)*var(--dsh-codex-reasoning-effort-slider-tick) + 13px);width:5px;height:5px;margin-left:-2.5px;border-radius:50%;background:#f5f6f8;box-shadow:0 0 0 1px rgba(0,0,0,.14),0 1px 2px rgba(0,0,0,.22);pointer-events:none;transition:opacity .18s ease .22s,transform .14s ease}',
)
patch(
  'solid passed dots',
  '.dsh-codex-reasoning-effort-slider-dot.passed{background:#ffffff65}',
  '.dsh-codex-reasoning-effort-slider-dot.passed{background:#ffffff;opacity:.98}',
)

// The knob must read as a solid physical puck. The theme token it used
// (--dsw-alias-bg-layer-2) is translucent in some skins (e.g. Herta), which let
// the fill show through; an explicit white puck is opaque in every theme.
patch(
  'opaque knob',
  'background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-panel);border:.5px solid var(--dsw-alias-border-l1);',
  'background:linear-gradient(180deg,#ffffff 0%,#eef0f3 100%);box-shadow:0 1px 3px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.9);border:1px solid rgba(0,0,0,.22);',
)

// Round both ends of the fill at every stop. Upstream keeps the right edge
// square and relies on an opaque knob to hide it; with a 26px knob riding the
// same-height rail the square corners peek out around the circle.
patch(
  'round the fill at every stop',
  'border-radius:16px 0 0 16px',
  'border-radius:16px',
)

// Per-stop accent colours: Low green, High blue, Ultra keeps the upstream
// purple glow. The rail/popup/trigger all carry data-effort so one attribute
// drives the fill, heading and trigger caption.
patch(
  'per-stop accent colours',
  '.dsh-codex-reasoning-effort-slider-fill{background:#3988f6;overflow:hidden}',
  '.dsh-codex-reasoning-effort-slider-fill{background:#3988f6;overflow:hidden}' +
    '.dsh-codex-reasoning-effort-slider-rail[data-effort="low"] .dsh-codex-reasoning-effort-slider-fill{background:linear-gradient(90deg,#34d399 0%,#22c55e 100%)}' +
    '.dsh-codex-reasoning-effort-slider-rail[data-effort="high"] .dsh-codex-reasoning-effort-slider-fill{background:linear-gradient(90deg,#60a5fa 0%,#3988f6 100%)}' +
    '.dsh-codex-reasoning-effort-slider-popup[data-effort="low"] .dsh-codex-reasoning-effort-slider-heading{color:#22c55e}' +
    '.dsh-codex-reasoning-effort-slider-popup[data-effort="high"] .dsh-codex-reasoning-effort-slider-heading{color:#3989e9}' +
    '.dsh-codex-reasoning-effort-slider-trigger[data-effort="low"] .dsh-codex-reasoning-effort-slider-trigger-effort{color:#22c55e}' +
    '.dsh-codex-reasoning-effort-slider-trigger[data-effort="high"] .dsh-codex-reasoning-effort-slider-trigger-effort{color:#3989e9}',
)

patch(
  'popup carries the effort as a data attribute',
  "const popupNode = h('section', { className: classes, ref: popupRef, role: 'dialog',",
  "const popupNode = h('section', { className: classes, ref: popupRef, role: 'dialog', 'data-effort': displayed || '',",
)

patch(
  'trigger carries the effort as a data attribute',
  "h('button', { className: `dsh-codex-reasoning-effort-slider-trigger${savedEffort === 'max' ? ' ultra' : ''}`, ref: triggerRef, disabled,",
  "h('button', { className: `dsh-codex-reasoning-effort-slider-trigger${savedEffort === 'max' ? ' ultra' : ''}`, 'data-effort': savedEffort || '', ref: triggerRef, disabled,",
)

// Same trap as the knob: the tooltip background was the theme token
// --dsw-alias-bg-layer-2, which some skins (Herta) set to transparent. The help
// text then floats over the page. Use an opaque menu surface + hairline border
// so both the Fast and Reset tooltips stay readable in every theme.
patch(
  'opaque tooltips',
  'white-space:nowrap;background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-panel);border-radius:8px;',
  'white-space:nowrap;background:var(--dsw-specific-menu,#24262d);box-shadow:0 8px 24px rgba(0,0,0,.45);border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.14));border-radius:8px;',
)

// Press/hover feedback must not make the puck overflow the rail again: scale
// stays 1, the ring carries the feedback instead.
patch(
  'hover ring instead of overshoot',
  '.dsh-codex-reasoning-effort-slider-knob:hover,.dsh-codex-reasoning-effort-slider-rail.dragging .dsh-codex-reasoning-effort-slider-knob{transform:scale(1.08)}',
  '.dsh-codex-reasoning-effort-slider-knob:hover,.dsh-codex-reasoning-effort-slider-rail.dragging .dsh-codex-reasoning-effort-slider-knob{transform:none;box-shadow:0 1px 3px rgba(0,0,0,.35),0 0 0 3px rgba(255,255,255,.22)}',
)
patch(
  'ultra burst centred on the smaller knob',
  'left:calc(100% - 41px);top:-13px;width:52px;height:52px',
  'left:calc(100% - 39px);top:-13px;width:52px;height:52px',
)

// Far right the square fill corner pokes past the rail's rounded cap because
// the knob is a circle: its diagonal corners show through. Round the fill only
// on the top stop, where it becomes the rail's own end cap.
patch(
  'round the far-right fill',
  '.dsh-codex-reasoning-effort-slider-fill{background:#3988f6;overflow:hidden}',
  '.dsh-codex-reasoning-effort-slider-fill{background:#3988f6;overflow:hidden}' +
    '.dsh-codex-reasoning-effort-slider-rail[data-effort="max"] .dsh-codex-reasoning-effort-slider-fill,' +
    '.dsh-codex-reasoning-effort-slider-rail[data-effort="max"] .dsh-codex-reasoning-effort-slider-sparks{border-radius:16px}',
)

// While the pointer is down the knob and fill must track the finger 1:1 (no
// stop-to-stop jumping); removing the class on release re-enables the CSS
// transition, which animates the short snap to the nearest stop.
patch(
  'drag follows the pointer without snapping',
  '.dsh-codex-reasoning-effort-slider-rail.dragging{cursor:grabbing}',
  '.dsh-codex-reasoning-effort-slider-rail.dragging{cursor:grabbing}' +
    '.dsh-codex-reasoning-effort-slider-rail.dragging .dsh-codex-reasoning-effort-slider-fill,' +
    '.dsh-codex-reasoning-effort-slider-rail.dragging .dsh-codex-reasoning-effort-slider-knob,' +
    '.dsh-codex-reasoning-effort-slider-rail.dragging .dsh-codex-reasoning-effort-slider-dot{transition:none}',
)

patch(
  'fast tooltip copy (zh)',
  "      choose: '选择模型', effort: '思考等级', fast: '1.5倍速', usage: '用量更多', visual: '(无实际作用)',",
  "      choose: '选择模型', effort: '思考等级', fast: '快速模式', usage: '优先交付，减少发散', visual: '(注入快速提示词)',",
)
patch(
  'fast tooltip copy (en)',
  "      choose: 'Select model', effort: 'Reasoning effort', fast: '1.5x speed', usage: 'Uses more quota', visual: '(No actual effect)',",
  "      choose: 'Select model', effort: 'Reasoning effort', fast: 'Fast mode', usage: 'Shortest path to usable', visual: '(Injects a prompt)',",
)

patch(
  'host sync helpers',
  "    // apply(ctx) 的 ctx 不会进入组件作用域，宿主服务通过这个模块级引用桥接。\n    const sessionsRef = { current: undefined };",
  `    // apply(ctx) 的 ctx 不会进入组件作用域，宿主服务通过这个模块级引用桥接。
    const sessionsRef = { current: undefined };
    // 本插件自己的 Host 半：/effort-slider/state 记录两条按会话的状态——
    // 「最右档已装填 → 注入预算无上限」和「快速模式 → 注入速度优先提示」。
    const ROUTE_STATE = '/effort-slider/state';
    const THROTTLE_EFFORT = 'max';
    function postHostState(body) {
      return fetch(ROUTE_STATE, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body)
      }).then(response => response.json()).then(payload => {
        if (!payload || payload.ok !== true) throw new Error('host rejected the switch');
        return payload;
      });
    }
    function readHostState(sessionId) {
      return fetch(ROUTE_STATE + '?sessionId=' + encodeURIComponent(sessionId), {
        headers: { accept: 'application/json' }, credentials: 'same-origin'
      }).then(response => response.json()).then(payload => payload && payload.ok === true ? payload : undefined);
    }
    function writeHostState(sessionId, enabled, topEffortId) {
      const body = { sessionId, enabled: enabled === true };
      if (enabled === true && typeof topEffortId === 'string' && topEffortId.length > 0) body.topEffortId = topEffortId;
      return postHostState(body);
    }
    function writeFastState(sessionId, fast) {
      return postHostState({ sessionId, fast: fast === true });
    }`,
)

patch(
  'host state refs',
  '      const latest = useRef({});',
  '      const latest = useRef({});\n      const hostRef = useRef(undefined);\n      const syncThrottleRef = useRef(() => {});',
)

patch(
  'reconcile effects',
  '      latest.current = { open: present, fast, ultra, pane, disabled };',
  `      latest.current = { open: present, fast, ultra, pane, disabled };

      // 「最右档 = 火力全开」：effort 为 max 时让 Host 注入预算无上限，离开 max 立刻解除。
      // 快速模式是独立开关：Host 端另有一段「速度优先」提示，可与任意档位组合。
      // 两者都按 live selection / Host 记录对账，所以从 /model 命令弹窗改档也能保持一致。
      function syncThrottle(effortId) {
        if (!sessionId) return;
        const want = effortId === THROTTLE_EFFORT;
        const host = hostRef.current;
        if (host !== undefined && host.enabled === want && (!want || host.topEffortId === THROTTLE_EFFORT)) return;
        hostRef.current = { ...host, enabled: want, topEffortId: want ? THROTTLE_EFFORT : host ? host.topEffortId : undefined };
        writeHostState(sessionId, want, want ? THROTTLE_EFFORT : undefined).then(payload => {
          hostRef.current = { ...hostRef.current, enabled: payload.enabled === true, topEffortId: payload.topEffortId || undefined };
        }).catch(() => { hostRef.current = host; });
      }
      syncThrottleRef.current = syncThrottle;
      useEffect(() => {
        if (!sessionId) return undefined;
        let alive = true;
        readHostState(sessionId).then(payload => {
          if (!alive || !payload) return;
          hostRef.current = { enabled: payload.enabled === true, topEffortId: payload.topEffortId || undefined, fast: payload.fast === true };
          setFast(payload.fast === true);
          syncThrottleRef.current(savedEffort);
        }).catch(() => {});
        return () => { alive = false; };
      }, [sessionId]);
      useEffect(() => { syncThrottleRef.current(savedEffort); }, [savedEffort]);`,
)

patch(
  'fast toggle is functional',
  'onClick: () => setFast(!fast) }',
  `onClick: () => {
                const nextFast = !fast;
                setFast(nextFast);
                if (sessionId) {
                  writeFastState(sessionId, nextFast).then(payload => {
                    hostRef.current = { ...hostRef.current, fast: payload.fast === true };
                    setFast(payload.fast === true);
                  }).catch(() => {});
                }
              } }`,
)

// ---- 0.2.9: make the two Host-facing paths honest ----
// P1: Fast is a real injection now, so the reset button must also clear the
//     Host record. Upstream only flipped the (decorative) local state.
patch(
  'reset clears the host fast record',
  '              onClick: () => { setFast(false); chooseEffort(model?.reasoning?.defaultEffort); }',
  `              onClick: () => {
                setFast(false);
                if (sessionId) {
                  writeFastState(sessionId, false).then(payload => {
                    hostRef.current = { ...hostRef.current, fast: payload.fast === true };
                    setFast(payload.fast === true);
                  }).catch(() => {});
                }
                chooseEffort(model?.reasoning?.defaultEffort);
              }`,
)

// P2a: DSH 0.2.x ISessions has no turnOf/state/get/isRunning/running; the live
//      turn flag is SessionBinding.session (a SessionFace snapshot) .running.
patch(
  'busy probe uses the session snapshot',
  `          if (typeof probe.turnOf === 'function') return Boolean(probe.turnOf(key));`,
  `          // DSH 0.2.x 的 ISessions 没有 turnOf/state/isRunning；真实运行状态在
          // binding(id).session（SessionFace = ISession & ObservableSnapshot<SessionSnapshot>）里。
          if (typeof probe.binding === 'function') {
            const bound = probe.binding(key);
            const face = bound && bound.session;
            const snapshot = face && typeof face.getSnapshot === 'function' ? face.getSnapshot() : undefined;
            if (snapshot !== undefined && typeof snapshot.running === 'boolean') return snapshot.running;
          }
          if (typeof probe.turnOf === 'function') return Boolean(probe.turnOf(key));`,
)

// P2b: queue the stop instead of silently applying it mid-turn, and poll until
//      the turn ends — the old effect only re-ran on `disabled` changes, which
//      never happen for a normal running turn.
patch(
  'deferred stop applies after the turn ends',
  `          if (await sessionBusy()) {
            pendingRef.current = next.reasoningEffort ?? null;
            return;
          }`,
  `          if (await sessionBusy()) {
            pendingRef.current = next.reasoningEffort ?? null;
            const wanted = next.reasoningEffort ?? null;
            if (deferTimerRef.current !== null) clearInterval(deferTimerRef.current);
            deferTimerRef.current = setInterval(async () => {
              if (pendingRef.current !== wanted) { clearInterval(deferTimerRef.current); deferTimerRef.current = null; return; }
              if (await sessionBusy()) return;
              if (pendingRef.current !== wanted) { clearInterval(deferTimerRef.current); deferTimerRef.current = null; return; }
              clearInterval(deferTimerRef.current);
              deferTimerRef.current = null;
              chooseEffort(wanted);
            }, 1200);
            return;
          }`,
)

patch(
  'deferred commit timer ref',
  '      const pendingRef = useRef(null);',
  '      const pendingRef = useRef(null);\n      const deferTimerRef = useRef(null);',
)

patch(
  'clear the deferred timer on unmount',
  `        return () => {
          mountedRef.current = false;
          timersRef.current.forEach(clearTimeout);
        };`,
  `        return () => {
          mountedRef.current = false;
          timersRef.current.forEach(clearTimeout);
          if (deferTimerRef.current !== null) clearInterval(deferTimerRef.current);
        };`,
)

patch(
  'slot priority',
  `          name: 'conversation.input.model',
          locale: NS,`,
  `          name: 'conversation.input.model',
          // single slot 的官方替换方式：不同 priority 可共存，最低的渲染。
          priority: -1,
          locale: NS,`,
)

patch(
  'ultra tooltip',
  "'aria-label': t('model'), title: modelName },",
  "'aria-label': t('model'), title: ultra ? modelName + ' · Ultra = 火力全开（已注入预算无上限）' : modelName },",
)

// ---- draggable feel: continuous finger tracking, snap only on release ----

patch(
  'drag position state',
  '      const [dragging, setDragging] = useState(false);',
  '      const [dragging, setDragging] = useState(false);\n      const [dragPos, setDragPos] = useState(null);',
)

patch(
  'pointer ratio helper (26px knob)',
  `      function nearest(event) {
        const box = railRef.current.getBoundingClientRect();
        return Math.round(Math.max(0, Math.min(1, (event.clientX - box.left - 15) / (box.width - 30))) * (efforts.length - 1));
      }`,
  `      function ratioAt(event) {
        const box = railRef.current.getBoundingClientRect();
        return Math.max(0, Math.min(1, (event.clientX - box.left - 13) / (box.width - 26)));
      }
      function nearest(event) {
        return Math.round(ratioAt(event) * (efforts.length - 1));
      }`,
)

patch(
  'pointer down starts continuous drag',
  '        setDragging(true); setHovered(-1);\n        showEffort(efforts[nearest(event)].id);',
  '        setDragging(true); setHovered(-1);\n        setDragPos(ratioAt(event));\n        showEffort(efforts[nearest(event)].id);',
)

patch(
  'pointer move tracks the finger',
  '        if (dragRef.current && event.pointerId === dragPointerRef.current) {\n          showEffort(efforts[nearest(event)].id);',
  '        if (dragRef.current && event.pointerId === dragPointerRef.current) {\n          setDragPos(ratioAt(event));\n          showEffort(efforts[nearest(event)].id);',
)

patch(
  'hover tick uses the 26px knob geometry',
  '          const tickX = box.left + 15 + i / Math.max(1, efforts.length - 1) * (box.width - 30);',
  '          const tickX = box.left + 13 + i / Math.max(1, efforts.length - 1) * (box.width - 26);',
)

patch(
  'release snaps to the nearest stop',
  '        setDragging(false);\n        chooseEffort(next);',
  '        setDragging(false);\n        setDragPos(null);\n        chooseEffort(next);',
)

patch(
  'discarding a drag clears the finger position',
  '        setDragging(false);\n        previewRef.current = null;',
  '        setDragging(false);\n        setDragPos(null);\n        previewRef.current = null;',
)

patch(
  'rail position follows the finger while dragging',
  "style: { '--dsh-codex-reasoning-effort-slider-pos': fraction }, role: 'slider', tabIndex: 0,",
  "style: { '--dsh-codex-reasoning-effort-slider-pos': dragPos === null ? fraction : dragPos }, role: 'slider', tabIndex: 0,",
)

// Fast mode should also make the spark dots drift leftwards, slower than the
// Ultra flow. Upstream only moves the dots when Ultra+Fast are both on.
patch(
  'spark dots move in fast mode too (slower than ultra)',
  'const target = current.ultra && current.fast ? 1 : 0;',
  'const target = current.ultra ? (current.fast ? 1 : 0.65) : current.fast ? 0.3 : 0;',
)

// Within Fast mode the drift follows the selected effort: Low is gentle, High
// clearly quicker (about 2.5x), so the difference is visible at a glance while
// still staying slower than Ultra.
patch(
  'fast drift scales with the effort stop',
  'const target = current.ultra ? (current.fast ? 1 : 0.65) : current.fast ? 0.3 : 0;',
  'const effortSpeed = current.effort === \'low\' ? 0.18 : current.effort === \'high\' ? 0.45 : 0.3;\n          const target = current.ultra ? (current.fast ? 1 : 0.65) : current.fast ? effortSpeed : 0;',
)

patch(
  'latest state carries the effort id for the drift speed',
  'latest.current = { open: present, fast, ultra, pane, disabled };',
  'latest.current = { open: present, fast, ultra, pane, disabled, effort: displayed };',
)
patch(
  'spark travel accumulates for fast as well',
  '          if (current.ultra) m.travel += delta * m.speed;',
  '          if (current.ultra || current.fast) m.travel += delta * m.speed;',
)
patch(
  'spark opacity follows the fast speed',
  '            const t = time / 1000, speed = current.ultra ? m.speed : 0;',
  '            const t = time / 1000, speed = current.ultra || current.fast ? m.speed : 0;',
)
patch(
  'fast spark drift is slower than ultra',
  '              const offset = current.ultra ? m.travel * (145 + i % 6 * 17) : 0;',
  '              const offset = current.ultra ? m.travel * (145 + i % 6 * 17) : current.fast ? m.travel * (70 + i % 6 * 9) : 0;',
)

fs.writeFileSync(target, source, 'utf8')
console.log('built ' + target + ' (' + String(Buffer.byteLength(source)) + ' bytes)')
