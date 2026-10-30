/** Bounded behavior corrections applied after the producer's visual patches. */
export function applyReviewPatches(input) {
  let source=input;
  function patch(name,before,after){if(source.split(before).length!==2)throw Error('Review patch anchor drift: '+name);source=source.replace(before,after);}
  function range(name,start,end,replacement){const from=source.indexOf(start),to=source.indexOf(end,from+start.length);if(from<0||to<0||source.lastIndexOf(start)!==from||source.lastIndexOf(end)!==to)throw Error('Review range drift: '+name);source=source.slice(0,from)+replacement+source.slice(to);}
  patch('intent refs','      const pendingRef = useRef(null);','      const pendingRef = useRef(null);\n      const selectionRef = useRef(null);\n      const fastWriteRef = useRef({ generation: 0, tail: Promise.resolve() });');
  patch('selection identity','      const savedEffort = selection?.reasoningEffort || model?.reasoning?.defaultEffort;',`      const savedEffort = selection?.reasoningEffort || model?.reasoning?.defaultEffort;
      const currentIdentity = { sessionId, provider: selection?.provider, model: selection?.model, effort: savedEffort };
      const previousIdentity = selectionRef.current;
      if (previousIdentity && ['sessionId', 'provider', 'model', 'effort'].some(key => previousIdentity[key] !== currentIdentity[key])) pendingRef.current = null;
      if (previousIdentity && previousIdentity.sessionId !== sessionId) { hostRef.current = undefined; fastWriteRef.current.generation++; }
      selectionRef.current = currentIdentity;
      function sameIdentity(identity) { const current = selectionRef.current; return identity && current && ['sessionId', 'provider', 'model', 'effort'].every(key => identity[key] === current[key]); }`);
  range('queue replay','      // 运行中被挂起的档位：','      useEffect(() => {\n        if (available) load();',`      // Keep a lightweight timer ready; a ref-only queued intent does not change disabled.
      useEffect(() => {
        if (disabled) return;
        let cancelled = false;
        const timer = setInterval(async () => {
          if (cancelled || busyRef.current || !pendingRef.current) return;
          const active = await sessionBusy();
          if (cancelled || active || busyRef.current || !pendingRef.current) return;
          const intent = pendingRef.current;
          if (!sameIdentity(intent.origin)) { pendingRef.current = null; return; }
          void commit(intent.next);
        }, 1200);
        return () => { cancelled = true; clearInterval(timer); };
      }, [disabled, sessionId, selection?.provider, selection?.model, savedEffort]);

`);
  range('busy probe','      async function sessionBusy() {','      async function commit(next) {',`      async function sessionBusy() {
        const probe = sessionsRef.current, key = sessionId;
        if (!probe || key === undefined) return true;
        try {
          if (typeof probe.turnOf === 'function') return Boolean(await probe.turnOf(key));
          if (typeof probe.state === 'function') return Boolean((await probe.state(key))?.turn);
          if (typeof probe.get === 'function') return Boolean((await probe.get(key))?.turn);
          if (typeof probe.isRunning === 'function') return Boolean(await probe.isRunning(key));
          if (typeof probe.running === 'function') return Boolean(await probe.running(key));
        } catch { return true; }
        return true;
      }
`);
  range('commit identity and complete intent','      async function commit(next) {','      function chooseEffort(id) {',`      async function commit(next) {
        if (disabled || busyRef.current || !next) return;
        const origin = selectionRef.current;
        busyRef.current = true; setBusy(true); setError('');
        try {
          const active = await sessionBusy();
          if (!mountedRef.current || !sameIdentity(origin)) return;
          if (active) { pendingRef.current = { origin, next: { ...next } }; return; }
          const result = await select(next);
          if (result && !result.ok) throw new Error(result.error?.message || t('failed'));
          if (result === undefined) throw new Error(t('unavailable'));
          const queued = pendingRef.current;
          if (queued && sameIdentity(queued.origin) && ['provider','model','reasoningEffort'].every(key => queued.next[key] === next[key])) pendingRef.current = null;
        } catch (cause) {
          pendingRef.current = null;
          if (mountedRef.current) setError(cause.message || t('failed'));
        } finally {
          busyRef.current = false;
          if (mountedRef.current) { setBusy(false); setPreview(null); previewRef.current = null; }
        }
      }
`);
  patch('queue full selection','        pendingRef.current = id;','        pendingRef.current = { origin: selectionRef.current, next: { ...selection, reasoningEffort: id } };');
  patch('fast helper','      function syncThrottle(effortId) {',`      function setFastIntent(nextFast) {
        if (!sessionId) { setError(t('unavailable')); return; }
        const id = sessionId, queue = fastWriteRef.current, generation = ++queue.generation;
        setFast(nextFast); setError('');
        const request = queue.tail.catch(() => {}).then(() => writeFastState(id, nextFast));
        queue.tail = request;
        request.then(payload => {
          if (!mountedRef.current || selectionRef.current?.sessionId !== id || queue.generation !== generation) return;
          hostRef.current = { ...hostRef.current, fast: payload.fast === true };
          setFast(payload.fast === true);
        }).catch(() => {
          if (!mountedRef.current || selectionRef.current?.sessionId !== id || queue.generation !== generation) return;
          setFast(hostRef.current?.fast === true); setError(t('failed'));
        });
      }
      function syncThrottle(effortId) {`);
  patch('fast callback',`onClick: () => {
                const nextFast = !fast;
                setFast(nextFast);
                if (sessionId) {
                  writeFastState(sessionId, nextFast).then(payload => {
                    hostRef.current = { ...hostRef.current, fast: payload.fast === true };
                    setFast(payload.fast === true);
                  }).catch(() => {});
                }
              } }`,`onClick: () => setFastIntent(!fast) }`);
  patch('reset host fast','onClick: () => { setFast(false); chooseEffort(model?.reasoning?.defaultEffort); }','onClick: () => { setFastIntent(false); chooseEffort(model?.reasoning?.defaultEffort); }');
  patch('truthful Ultra tooltip','Ultra = 火力全开（已注入预算无上限）','Ultra：请求使用 max 且 Host 状态已开启时附加提示词');
  patch('read version','        let alive = true;\n        readHostState(sessionId)',`        let alive = true;
        const readGeneration = fastWriteRef.current.generation;
        setFast(false);
        readHostState(sessionId)`);
  patch('read confirmation',`          hostRef.current = { enabled: payload.enabled === true, topEffortId: payload.topEffortId || undefined, fast: payload.fast === true };
          setFast(payload.fast === true);
          syncThrottleRef.current(savedEffort);`,`          const fresh = readGeneration === fastWriteRef.current.generation;
          hostRef.current = { enabled: payload.enabled === true, topEffortId: payload.topEffortId || undefined, fast: fresh ? payload.fast === true : hostRef.current?.fast === true };
          if (fresh) setFast(payload.fast === true);
          syncThrottleRef.current(selectionRef.current?.effort);`);
  return source;
}
