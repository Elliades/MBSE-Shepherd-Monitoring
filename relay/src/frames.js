export const MAX_SIGNAL_LENGTH = 256
export const MAX_ID_LENGTH = 128
export const MAX_BATCH = 500

/**
 * @typedef {{ signal: string, id?: string, t?: number, data?: Record<string, unknown> }} Signal
 */

export const MAX_REQ_ID_LENGTH = 64
export const MAX_NAME_LENGTH = 128
export const MAX_PEER_BYTES = 16384

/**
 * @param {string} text
 * @returns {Record<string, unknown> | null} the JSON object, or null for anything else
 */
export function parseJson(text) {
  try {
    const value = JSON.parse(text)
    return isRecord(value) ? value : null
  } catch {
    return null
  }
}

/**
 * The signals carried by a frame sent by the plugin. A batch is unpacked in order.
 * Anything that is not a valid signal is dropped.
 * @param {Record<string, unknown>} frame
 * @returns {Signal[]}
 */
export function signalsFrom(frame) {
  const items = Array.isArray(frame.batch) ? frame.batch.slice(0, MAX_BATCH) : [frame]
  /** @type {Signal[]} */
  const signals = []
  for (const item of items) {
    const signal = toSignal(item)
    if (signal) signals.push(signal)
  }
  return signals
}

/**
 * @param {string} text
 * @returns {Signal[]}
 */
export function parsePluginFrame(text) {
  const frame = parseJson(text)
  return frame ? signalsFrom(frame) : []
}

/**
 * A signal a browser wants to inject into the simulation. The plugin only reads flat objects of
 * strings, so only `signal` and `id` are kept, and `id` is required.
 * @param {Record<string, unknown>} frame
 * @returns {{ signal: string, id: string } | null}
 */
export function viewerSignal(frame) {
  const signal = toSignal(frame)
  return signal && signal.id !== undefined ? { signal: signal.signal, id: signal.id } : null
}

/**
 * A call a browser wants the plugin to run (`POST /mcp/<category>/<name>` in the plugin).
 * @param {Record<string, unknown>} frame
 * @returns {{ req: string, category: string, name: string, args: unknown[] } | null}
 */
export function viewerRequest(frame) {
  const { req, category, name } = frame
  const args = frame.args === undefined ? [] : frame.args
  if (!isText(req, MAX_REQ_ID_LENGTH) || !isText(category, MAX_NAME_LENGTH)) return null
  if (!isText(name, MAX_NAME_LENGTH) || !Array.isArray(args)) return null
  return { req, category, name, args }
}

/**
 * What a browser shares with the other browsers of its room (`{"peer":{...}}`), as text, or null when
 * it is not an object or is too big. The relay does not read it.
 * @param {Record<string, unknown>} frame
 * @returns {string | null}
 */
export function viewerPeer(frame) {
  if (!isRecord(frame.peer)) return null
  const text = JSON.stringify(frame.peer)
  return text.length <= MAX_PEER_BYTES ? text : null
}

/**
 * The answer of the plugin to a request.
 * @param {Record<string, unknown>} frame
 * @returns {{ res: string, ok: true, result: unknown } | { res: string, ok: false, error: unknown } | null}
 */
export function pluginResponse(frame) {
  if (typeof frame.res !== 'string' || typeof frame.ok !== 'boolean') return null
  return frame.ok
    ? { res: frame.res, ok: true, result: frame.result ?? null }
    : { res: frame.res, ok: false, error: frame.error ?? 'error' }
}

export const MAX_DRONES = 16
export const MAX_DRONE_ID_LENGTH = 64

/**
 * @typedef {{ id: string, step: string, role?: string, name?: string }} DroneState
 */

/**
 * The state snapshot the plugin publishes: `{"type":"info","event":"state","status","step"}`.
 * A simulation with several drones (Part 4) adds `drones: [{ id, step, role?, name? }]`, one per drone
 * instance, and `master`: "base" or the id of the drone that leads the others. Both are optional and
 * left out when absent, so a single-drone frame comes out as it went in.
 * @param {Record<string, unknown>} frame
 * @returns {{ status: string, step: string, drones?: DroneState[], master?: string } | null}
 */
export function pluginState(frame) {
  if (frame.type !== 'info' || frame.event !== 'state') return null
  const { status, step } = frame
  if (!isText(status, MAX_NAME_LENGTH) || !isText(step, MAX_NAME_LENGTH)) return null
  /** @type {{ status: string, step: string, drones?: DroneState[], master?: string }} */
  const state = { status, step }
  if (Array.isArray(frame.drones)) {
    state.drones = frame.drones.slice(0, MAX_DRONES).map(toDrone).filter((d) => d !== null)
  }
  if (isText(frame.master, MAX_DRONE_ID_LENGTH)) state.master = frame.master
  return state
}

/**
 * @param {unknown} item
 * @returns {DroneState | null}
 */
function toDrone(item) {
  if (!isRecord(item) || !isText(item.id, MAX_DRONE_ID_LENGTH) || !isText(item.step, MAX_NAME_LENGTH)) return null
  /** @type {DroneState} */
  const drone = { id: item.id, step: item.step }
  if (isText(item.role, MAX_DRONE_ID_LENGTH)) drone.role = item.role
  if (isText(item.name, MAX_NAME_LENGTH)) drone.name = item.name
  return drone
}

/**
 * @param {unknown} value
 * @param {number} max
 * @returns {value is string}
 */
function isText(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}

/**
 * The frame viewers receive: only the known fields, `seq` last.
 * @param {Signal} signal
 * @param {number} seq
 * @returns {string}
 */
export function serializeSignal(signal, seq) {
  return JSON.stringify({
    signal: signal.signal,
    ...(signal.id !== undefined && { id: signal.id }),
    ...(signal.t !== undefined && { t: signal.t }),
    ...(signal.data !== undefined && { data: signal.data }),
    seq,
  })
}

/**
 * @param {string} event
 * @param {Record<string, unknown>} [fields]
 * @returns {string}
 */
export function info(event, fields = {}) {
  return JSON.stringify({ type: 'info', event, ...fields })
}

/**
 * @param {unknown} item
 * @returns {Signal | null}
 */
function toSignal(item) {
  if (!isRecord(item)) return null
  const name = item.signal
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_SIGNAL_LENGTH) return null
  /** @type {Signal} */
  const signal = { signal: name }
  if (typeof item.id === 'string' && item.id.length > 0 && item.id.length <= MAX_ID_LENGTH) {
    signal.id = item.id
  }
  if (typeof item.t === 'number' && Number.isFinite(item.t)) signal.t = item.t
  if (isRecord(item.data)) signal.data = item.data
  return signal
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
