import { generateCode } from './codes.js'
import { createRing } from './ring.js'

/**
 * @typedef {import('ws').WebSocket} Socket
 * @typedef {{
 *   code: string,
 *   plugin: Socket | null,
 *   pluginOffSince: number,
 *   seq: number,
 *   ring: ReturnType<typeof createRing>,
 *   viewers: Set<Socket>,
 *   state: string | null,
 *   pending: Map<string, { viewer: Socket, req: string }>,
 * }} Room
 * `state` is the last state frame the plugin published, already serialized.
 * `pending` holds the requests sent to the plugin and not answered yet, by relay-side id.
 */

/**
 * Rooms live in memory. A room is created by a plugin and removed by `sweep` once its plugin has
 * been away for longer than `ttlMs`.
 * @param {{ bufferSignals: number, bufferBytes: number, ttlMs: number, now: () => number }} options
 */
export function createRegistry({ bufferSignals, bufferBytes, ttlMs, now }) {
  /** @type {Map<string, Room>} */
  const rooms = new Map()

  /**
   * @param {string} code
   * @returns {Room}
   */
  function createRoom(code) {
    /** @type {Room} */
    const room = {
      code,
      plugin: null,
      pluginOffSince: now(),
      seq: 0,
      ring: createRing({ maxItems: bufferSignals, maxBytes: bufferBytes }),
      viewers: new Set(),
      state: null,
      pending: new Map(),
    }
    rooms.set(code, room)
    return room
  }

  /**
   * The plugin takes `requestedCode` if it asks for one, otherwise gets a fresh code.
   * The newest plugin connection always wins; the one it replaces is returned so the caller
   * can close it.
   * @param {string | undefined} requestedCode
   * @param {Socket} socket
   * @returns {{ room: Room, reused: boolean, replaced: Socket | null }}
   */
  function attachPlugin(requestedCode, socket) {
    let room = requestedCode ? rooms.get(requestedCode) : undefined
    const reused = room !== undefined
    room ??= createRoom(requestedCode ?? generateCode((code) => rooms.has(code)))
    const replaced = room.plugin
    room.plugin = socket
    return { room, reused, replaced }
  }

  /** @param {Room} room */
  function detachPlugin(room) {
    room.plugin = null
    room.pluginOffSince = now()
  }

  /**
   * Removes the rooms whose plugin stayed away longer than the TTL.
   * @returns {Room[]} the removed rooms, so the caller can close their viewers
   */
  function sweep() {
    /** @type {Room[]} */
    const expired = []
    for (const [code, room] of rooms) {
      if (room.plugin === null && now() - room.pluginOffSince > ttlMs) {
        rooms.delete(code)
        expired.push(room)
      }
    }
    return expired
  }

  return {
    get: (code) => rooms.get(code),
    attachPlugin,
    detachPlugin,
    sweep,
    all: () => rooms.values(),
    get size() {
      return rooms.size
    },
  }
}
