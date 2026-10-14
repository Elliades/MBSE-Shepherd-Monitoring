import { createServer, ServerResponse } from 'node:http'
import { WebSocketServer } from 'ws'
import { normalizeCode } from './codes.js'
import { broadcast } from './fanout.js'
import {
  info,
  parseJson,
  pluginResponse,
  pluginState,
  serializeSignal,
  signalsFrom,
  viewerRequest,
  viewerSignal,
} from './frames.js'
import { createRegistry } from './rooms.js'

export const PROTOCOL_VERSION = 1

/** Application close codes, see PROTOCOL.md section 7. */
export const CLOSE = {
  BAD_REQUEST: 4400,
  UNKNOWN_CODE: 4404,
  SLOW_CONSUMER: 4408,
  REPLACED: 4409,
  ROOM_EXPIRED: 4410,
}

export const DEFAULTS = {
  maxFrameBytes: 64 * 1024,
  maxPendingRequests: 500,
  bufferSignals: 5000,
  bufferBytes: 1024 * 1024,
  slowBytes: 2 * 1024 * 1024,
  roomTtlMs: 6 * 60 * 60 * 1000,
  pingMs: 20_000,
  sweepMs: 60_000,
  closeGraceMs: 1000,
  now: Date.now,
  log: () => {},
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const ROOM_PATH = /^\/v1\/room\/([^/]+)$/

/**
 * @param {Partial<typeof DEFAULTS>} [options]
 */
export function createRelay(options = {}) {
  const config = { ...DEFAULTS, ...options }
  const registry = createRegistry({
    bufferSignals: config.bufferSignals,
    bufferBytes: config.bufferBytes,
    ttlMs: config.roomTtlMs,
    now: config.now,
  })

  const http = createServer(handleHttp)
  const wss = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
    maxPayload: config.maxFrameBytes,
  })
  http.on('upgrade', handleUpgrade)

  let nextConnectionId = 0

  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (socket.isAlive === false) {
        socket.terminate()
        continue
      }
      socket.isAlive = false
      socket.ping()
    }
  }, config.pingMs)
  const sweeper = setInterval(sweep, config.sweepMs)
  heartbeat.unref()
  sweeper.unref()

  // ── HTTP ────────────────────────────────────────────────────────────────

  /**
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  function handleHttp(req, res) {
    const { pathname } = new URL(req.url ?? '/', 'http://relay')
    if (req.method === 'OPTIONS') {
      res.writeHead(204, CORS).end()
      return
    }
    if (req.method !== 'GET') {
      reply(res, 405, { error: 'method-not-allowed' })
      return
    }
    if (pathname === '/health') {
      reply(res, 200, { ok: true, ...stats() })
      return
    }
    const match = ROOM_PATH.exec(pathname)
    if (!match) {
      reply(res, 404, { error: 'not-found' })
      return
    }
    const code = normalizeCode(decode(match[1]))
    if (!code) {
      reply(res, 400, { error: 'bad-code' })
      return
    }
    const room = registry.get(code)
    if (!room) {
      reply(res, 404, { error: 'unknown-code' })
      return
    }
    reply(res, 200, {
      code,
      pluginOnline: room.plugin !== null,
      viewers: room.viewers.size,
      seq: room.seq,
    })
  }

  /**
   * @param {import('node:http').ServerResponse} res
   * @param {number} status
   * @param {unknown} body
   */
  function reply(res, status, body) {
    res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' })
    res.end(JSON.stringify(body))
  }

  function stats() {
    let plugins = 0
    let viewers = 0
    for (const room of registry.all()) {
      if (room.plugin) plugins += 1
      viewers += room.viewers.size
    }
    return { rooms: registry.size, plugins, viewers }
  }

  // ── Upgrade ─────────────────────────────────────────────────────────────

  /**
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:stream').Duplex} socket
   * @param {Buffer} head
   */
  function handleUpgrade(req, socket, head) {
    // Node sends every request that carries an `Upgrade` header here, whatever it asks for. Some
    // HTTP clients ask for `h2c` on a plain GET: answer those as the ordinary HTTP calls they are.
    if (String(req.headers.upgrade).toLowerCase() !== 'websocket') {
      const res = new ServerResponse(req)
      res.assignSocket(socket)
      res.shouldKeepAlive = false
      // Outside the server's own request path nothing closes the socket after the answer.
      res.once('finish', () => socket.destroySoon())
      handleHttp(req, res)
      return
    }
    const url = new URL(req.url ?? '/', 'http://relay')
    /** @type {((ws: import('ws').WebSocket) => void) | null} */
    let attach = null
    if (url.pathname === '/v1/plugin') {
      attach = (ws) => onPlugin(ws, url.searchParams.get('code'))
    } else {
      const match = ROOM_PATH.exec(url.pathname)
      if (match) attach = (ws) => onViewer(ws, decode(match[1]), url.searchParams.get('lastSeq'))
    }
    if (!attach) {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n')
      return
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.isAlive = true
      ws.on('pong', () => {
        ws.isAlive = true
      })
      // ws emits 'error' for protocol violations (oversized frame...) and closes on its own.
      ws.on('error', (error) => config.log(`socket error: ${error.message}`))
      attach(ws)
    })
  }

  // ── Plugin ──────────────────────────────────────────────────────────────

  /**
   * @param {import('ws').WebSocket} ws
   * @param {string | null} codeParam
   */
  function onPlugin(ws, codeParam) {
    let requested
    if (codeParam) {
      requested = normalizeCode(codeParam) ?? undefined
      if (!requested) {
        ws.close(CLOSE.BAD_REQUEST, 'bad-code')
        return
      }
    }
    const { room, reused, replaced } = registry.attachPlugin(requested, ws)
    if (replaced) {
      replaced.close(CLOSE.REPLACED, 'replaced')
      failPending(room, 'plugin-gone')
    }
    config.log(`plugin ${room.code} ${reused ? 'resumed' : 'created'}${replaced ? ', replaced the previous connection' : ''}`)

    ws.send(
      info('hello', {
        v: PROTOCOL_VERSION,
        role: 'plugin',
        code: room.code,
        reused,
        viewers: room.viewers.size,
      }),
    )
    broadcast(room.viewers, info('plugin-online'), Infinity, () => {})

    ws.on('message', (raw, isBinary) => {
      if (isBinary || room.plugin !== ws) return
      const frame = parseJson(raw.toString())
      if (!frame) return
      if (typeof frame.res === 'string') {
        deliverResponse(room, frame)
        return
      }
      const state = pluginState(frame)
      if (state) {
        room.state = info('state', state)
        broadcast(room.viewers, room.state, Infinity, () => {})
        return
      }
      for (const signal of signalsFrom(frame)) publish(room, signal)
    })

    ws.on('close', () => {
      if (room.plugin !== ws) return
      registry.detachPlugin(room)
      failPending(room, 'plugin-gone')
      config.log(`plugin ${room.code} left`)
      broadcast(room.viewers, info('plugin-offline'), Infinity, () => {})
    })
  }

  /**
   * @param {import('./rooms.js').Room} room
   * @param {import('./frames.js').Signal} signal
   */
  function publish(room, signal) {
    room.seq += 1
    const text = serializeSignal(signal, room.seq)
    room.ring.push(room.seq, text)
    broadcast(room.viewers, text, config.slowBytes, (viewer) => dropSlow(room, viewer))
  }

  /**
   * Hands the plugin's answer to the browser that asked, under the id that browser used.
   * @param {import('./rooms.js').Room} room
   * @param {Record<string, unknown>} frame
   */
  function deliverResponse(room, frame) {
    const response = pluginResponse(frame)
    const entry = response && room.pending.get(response.res)
    if (!response || !entry) return
    room.pending.delete(response.res)
    send(entry.viewer, JSON.stringify({ ...response, res: entry.req }))
  }

  /**
   * Answers every request still waiting for the plugin with an error.
   * @param {import('./rooms.js').Room} room
   * @param {string} error
   */
  function failPending(room, error) {
    for (const { viewer, req } of room.pending.values()) {
      send(viewer, JSON.stringify({ res: req, ok: false, error }))
    }
    room.pending.clear()
  }

  // ── Viewer ──────────────────────────────────────────────────────────────

  /**
   * @param {import('ws').WebSocket} ws
   * @param {string} codeParam
   * @param {string | null} lastSeqParam
   */
  function onViewer(ws, codeParam, lastSeqParam) {
    const code = normalizeCode(codeParam)
    if (!code) {
      ws.close(CLOSE.BAD_REQUEST, 'bad-code')
      return
    }
    const room = registry.get(code)
    if (!room) {
      ws.close(CLOSE.UNKNOWN_CODE, 'unknown-code')
      return
    }

    ws.send(
      info('hello', {
        v: PROTOCOL_VERSION,
        role: 'viewer',
        code,
        pluginOnline: room.plugin !== null,
        seq: room.seq,
      }),
    )
    if (room.state) ws.send(room.state)
    // Replay and join in the same tick: no live signal can slip between them.
    const lastSeq = parseLastSeq(lastSeqParam)
    if (lastSeq !== undefined) replay(ws, room, lastSeq)
    room.viewers.add(ws)
    ws.connectionId = (nextConnectionId += 1).toString(36)
    notifyViewerCount(room)
    config.log(`viewer joined ${code} (${room.viewers.size})`)

    ws.on('message', (raw, isBinary) => {
      if (isBinary) return
      const frame = parseJson(raw.toString())
      if (frame) onViewerFrame(room, ws, frame)
    })

    ws.on('close', () => {
      for (const [key, entry] of room.pending) {
        if (entry.viewer === ws) room.pending.delete(key)
      }
      if (!room.viewers.delete(ws)) return
      notifyViewerCount(room)
    })
  }

  /**
   * A browser sends either a signal to inject into the simulation or a call for the plugin.
   * @param {import('./rooms.js').Room} room
   * @param {import('ws').WebSocket} viewer
   * @param {Record<string, unknown>} frame
   */
  function onViewerFrame(room, viewer, frame) {
    if (typeof frame.req === 'string') {
      forwardRequest(room, viewer, frame)
      return
    }
    if (typeof frame.signal !== 'string') return
    const signal = viewerSignal(frame)
    if (!signal) {
      const id = typeof frame.id === 'string' ? { id: frame.id.slice(0, 128) } : {}
      send(viewer, info('dropped', { reason: 'bad-frame', ...id }))
      return
    }
    if (!pluginReady(room)) {
      send(viewer, info('dropped', { reason: 'plugin-offline', id: signal.id }))
      return
    }
    room.plugin.send(JSON.stringify(signal))
  }

  /**
   * Sends a call to the plugin under an id that is unique in the room, so two browsers can both
   * use `r-1`. The answer comes back through `deliverResponse`.
   * @param {import('./rooms.js').Room} room
   * @param {import('ws').WebSocket} viewer
   * @param {Record<string, unknown>} frame
   */
  function forwardRequest(room, viewer, frame) {
    const request = viewerRequest(frame)
    const fail = (req, error) => send(viewer, JSON.stringify({ res: req, ok: false, error }))
    if (!request) {
      fail(String(frame.req).slice(0, 64), 'bad-request')
      return
    }
    if (!pluginReady(room)) {
      fail(request.req, 'plugin-offline')
      return
    }
    const key = `${viewer.connectionId}:${request.req}`
    if (room.pending.has(key)) {
      fail(request.req, 'duplicate-request')
      return
    }
    if (room.pending.size >= config.maxPendingRequests) {
      fail(request.req, 'busy')
      return
    }
    room.pending.set(key, { viewer, req: request.req })
    room.plugin.send(
      JSON.stringify({ req: key, category: request.category, name: request.name, args: request.args }),
    )
  }

  /**
   * @param {import('ws').WebSocket} ws
   * @param {import('./rooms.js').Room} room
   * @param {number} lastSeq
   */
  function replay(ws, room, lastSeq) {
    /** @type {string[]} */
    let missed = []
    if (lastSeq > room.seq) {
      ws.send(info('resync', { reason: 'room-reset', seq: room.seq }))
    } else {
      const oldest = room.ring.oldestSeq()
      if (oldest !== null && lastSeq + 1 < oldest) {
        ws.send(info('resync', { reason: 'gap', oldest, seq: room.seq }))
      }
      missed = room.ring.since(lastSeq)
    }
    for (const text of missed) ws.send(text)
    ws.send(info('replay-end', { count: missed.length, seq: room.seq }))
  }

  /**
   * @param {import('./rooms.js').Room} room
   * @param {import('ws').WebSocket} viewer
   */
  function dropSlow(room, viewer) {
    room.viewers.delete(viewer)
    viewer.close(CLOSE.SLOW_CONSUMER, 'slow-consumer')
    config.log(`viewer of ${room.code} too slow, closed`)
    notifyViewerCount(room)
  }

  /** @param {import('./rooms.js').Room} room */
  function notifyViewerCount(room) {
    if (pluginReady(room)) {
      room.plugin.send(info('viewers', { count: room.viewers.size }))
    }
  }

  /** @param {import('./rooms.js').Room} room */
  function pluginReady(room) {
    return room.plugin?.readyState === 1
  }

  /**
   * @param {import('ws').WebSocket} socket
   * @param {string} text
   */
  function send(socket, text) {
    if (socket.readyState === 1) socket.send(text)
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  function sweep() {
    for (const room of registry.sweep()) {
      config.log(`room ${room.code} expired`)
      for (const viewer of room.viewers) viewer.close(CLOSE.ROOM_EXPIRED, 'room-expired')
      room.viewers.clear()
    }
  }

  /**
   * @param {number} port
   * @param {string} [host]
   * @returns {Promise<{ port: number }>}
   */
  function listen(port, host = '0.0.0.0') {
    return new Promise((resolve, reject) => {
      http.once('error', reject)
      http.listen(port, host, () => {
        http.off('error', reject)
        const address = http.address()
        resolve({ port: typeof address === 'object' && address ? address.port : port })
      })
    })
  }

  async function close() {
    clearInterval(heartbeat)
    clearInterval(sweeper)
    for (const socket of wss.clients) socket.close(1001, 'relay-shutdown')
    const force = setTimeout(() => {
      for (const socket of wss.clients) socket.terminate()
      http.closeAllConnections()
    }, config.closeGraceMs)
    await new Promise((resolve) => http.close(resolve))
    clearTimeout(force)
  }

  return { listen, close, sweep, registry }
}

/**
 * @param {string | null} raw
 * @returns {number | undefined}
 */
function parseLastSeq(raw) {
  return raw !== null && /^\d{1,15}$/.test(raw) ? Number(raw) : undefined
}

/**
 * @param {string} segment
 * @returns {string}
 */
function decode(segment) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return ''
  }
}
