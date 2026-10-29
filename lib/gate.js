/**
 * Injection predicates. Everything here is deliberately total — a prompt
 * contribution that throws would fail the whole assembly and take the Session
 * down with it.
 *
 *  - Throttle ("Ultra = 火力全开") injects only for a Session whose far-right
 *    stop is armed AND whose request actually runs at the recorded effort.
 *  - Fast injects for a Session whose Fast toggle is on (effort independent).
 *
 * This module is a rewrite of the gate in lizilong1993/dsh-unlimited-effort
 * (MIT); see NOTICE.md.
 */

/**
 * The Session identity behind one assembly.
 * @param context - the prompt assembly context.
 * @returns the Session id, or undefined when the context carries none.
 */
export function sessionIdOf(context) {
  const agent = context === undefined || context === null ? undefined : context.agent
  if (agent === undefined || agent === null) return undefined
  const direct = agent.session !== undefined && agent.session !== null ? agent.session.id : undefined
  if (typeof direct === 'string' && direct.length > 0) return direct
  if (typeof agent.id === 'string' && agent.id.length > 0) return agent.id
  return undefined
}

/**
 * The reasoning effort in force for one assembly.
 * `agent.options` is the live per-Session selection (selectForNextRequest
 * updates it before the next request), so it wins over the last logged request
 * header, which lags one step behind.
 * @param context - the prompt assembly context.
 * @returns the effort id, or undefined when none is selected yet.
 */
export function currentEffort(context) {
  const agent = context === undefined || context === null ? undefined : context.agent
  const live = agent && agent.options ? agent.options.reasoningEffort : undefined
  if (typeof live === 'string' && live.length > 0) return live
  try {
    const header = agent && agent.session && typeof agent.session.requestHeader === 'function'
      ? agent.session.requestHeader()
      : undefined
    const logged = header && header.config ? header.config.reasoningEffort : undefined
    if (typeof logged === 'string' && logged.length > 0) return logged
  } catch {
    /* a Session without a logged header simply has no effort yet */
  }
  return undefined
}

/**
 * Whether one effort id is in the configured top set (fallback when the
 * browser did not record a concrete top id for this Session).
 * @param current - the effort id in force for the current request.
 * @param topIds - configured ids that count as "the top tier".
 * @returns true only for a non-empty current id contained in topIds.
 */
export function isTopEffort(current, topIds) {
  if (typeof current !== 'string' || current.length === 0) return false
  if (!Array.isArray(topIds) || topIds.length === 0) return false
  return topIds.includes(current)
}

/**
 * Build the throttle ("full throttle") predicate.
 * @param cfg - effective plugin configuration.
 * @param readRecord - reads one Session's persisted record.
 * @returns a total predicate over the assembly context.
 */
export function makeGate(cfg, readRecord) {
  return (context) => {
    try {
      if (cfg.enabled !== true) return false
      const sessionId = sessionIdOf(context)
      if (sessionId === undefined) return false
      const record = readRecord(sessionId)
      if (record === undefined || record.throttle !== true) return false
      const effort = currentEffort(context)
      if (typeof record.topEffortId === 'string' && record.topEffortId.length > 0) {
        return effort === record.topEffortId
      }
      return isTopEffort(effort, cfg.topEffortIds)
    } catch {
      return false
    }
  }
}

/**
 * Build the Fast ("speed first") predicate: independent of the effort, so it
 * can be combined with any stop, including Ultra.
 * @param cfg - effective plugin configuration.
 * @param readRecord - reads one Session's persisted record.
 * @returns a total predicate over the assembly context.
 */
export function makeFastGate(cfg, readRecord) {
  return (context) => {
    try {
      if (cfg.enabled !== true) return false
      const sessionId = sessionIdOf(context)
      if (sessionId === undefined) return false
      const record = readRecord(sessionId)
      return record !== undefined && record.fast === true
    } catch {
      return false
    }
  }
}
