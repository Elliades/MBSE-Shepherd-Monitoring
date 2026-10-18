import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'

/**
 * Network check: endpoints that tell which ways of talking to the relay a network lets through
 * (WebSocket, server-sent events, long requests, POST), and a store for the reports the browsers
 * and the Cameo plugin send after running them. See `diag/` of the site and the plugin's
 * "Relay network check".
 */

export const MAX_REPORT_BYTES = 256 * 1024
const KEEP_REPORTS = 500
const MAX_WAIT_MS = 55_000
const MAX_TICKS = 60

/**
 * @param {{ dir?: string, log: (line: string) => void, now: () => number }} options
 */
export function createDiag({ dir, log, now }) {
  /** @type {Record<string, unknown>[]} newest last */
  const reports = []
  const file = dir ? join(dir, 'reports.jsonl') : null
  const loaded = file ? load(file) : Promise.resolve()

  async function load(path) {
    try {
      await mkdir(dir, { recursive: true })
      const text = await readFile(path, 'utf8').catch(() => '')
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        try {
          reports.push(JSON.parse(line))
        } catch {
          // A line cut by a crash: skip it.
        }
      }
      reports.splice(0, Math.max(0, reports.length - KEEP_REPORTS))
      log(`diag: ${reports.length} reports loaded from ${path}`)
    } catch (error) {
      log(`diag: cannot read ${path}: ${error.message}`)
    }
  }

  /**
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   * @param {URL} url
   * @param {(res: import('node:http').ServerResponse, status: number, body: unknown) => void} reply
   * @returns {boolean} true when the request was one of ours
   */
  function handleHttp(req, res, url, reply) {
    const path = url.pathname
    if (!path.startsWith('/v1/diag/')) return false
    const name = path.slice('/v1/diag/'.length)

    if (name === 'echo' && req.method === 'GET') {
      reply(res, 200, { now: now(), ...seenBy(req) })
      return true
    }
    if (name === 'echo' && req.method === 'POST') {
      readBody(req, MAX_REPORT_BYTES)
        .then((body) => reply(res, 200, { now: now(), bytes: body.length, ...seenBy(req) }))
        .catch((error) => reply(res, 413, { error: error.message }))
      return true
    }
    if (name === 'poll' && req.method === 'GET') {
      const wait = clamp(Number(url.searchParams.get('wait')), 0, MAX_WAIT_MS, 20_000)
      const started = now()
      const timer = setTimeout(() => reply(res, 200, { waited: now() - started }), wait)
      res.on('close', () => clearTimeout(timer))
      return true
    }
    if (name === 'sse' && req.method === 'GET') {
      streamEvents(req, res, url)
      return true
    }
    if (name === 'report' && req.method === 'POST') {
      readBody(req, MAX_REPORT_BYTES)
        .then((body) => saveReport(req, body))
        .then((id) => reply(res, 200, { ok: true, id }))
        .catch((error) => reply(res, 400, { error: error.message }))
      return true
    }
    if (name === 'reports' && req.method === 'GET') {
      loaded.then(() => {
        const limit = clamp(Number(url.searchParams.get('limit')), 1, KEEP_REPORTS, 100)
        reply(res, 200, { reports: reports.slice(-limit).reverse() })
      })
      return true
    }
    reply(res, 404, { error: 'not-found' })
    return true
  }

  /**
   * Ticks every `every` ms, `n` times, after a first event at once and 2 KiB of padding: a proxy that
   * holds the answer until it is complete shows up as all the ticks arriving together.
   */
  function streamEvents(req, res, url) {
    const n = clamp(Number(url.searchParams.get('n')), 1, MAX_TICKS, 5)
    const every = clamp(Number(url.searchParams.get('every')), 100, 10_000, 1000)
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    })
    res.write(`: ${' '.repeat(2048)}\n\n`)
    res.write(`event: hello\ndata: ${JSON.stringify({ t: now() })}\n\n`)
    let sent = 0
    const timer = setInterval(() => {
      sent += 1
      res.write(`event: tick\ndata: ${JSON.stringify({ i: sent, t: now() })}\n\n`)
      if (sent >= n) {
        clearInterval(timer)
        res.end(`event: end\ndata: {}\n\n`)
      }
    }, every)
    req.on('close', () => clearInterval(timer))
  }

  /**
   * The WebSocket test: a hello at once, `n` ticks every `every` ms, and every text received is
   * echoed back with the server time, so the client measures the round trip.
   * @param {import('ws').WebSocket} ws
   * @param {URL} url
   */
  function onSocket(ws, url) {
    const n = clamp(Number(url.searchParams.get('n')), 1, MAX_TICKS, 5)
    const every = clamp(Number(url.searchParams.get('every')), 100, 10_000, 1000)
    ws.send(JSON.stringify({ type: 'hello', t: now() }))
    let sent = 0
    const timer = setInterval(() => {
      sent += 1
      if (ws.readyState !== 1) return clearInterval(timer)
      ws.send(JSON.stringify({ type: 'tick', i: sent, t: now() }))
      if (sent >= n) {
        clearInterval(timer)
        setTimeout(() => ws.close(1000, 'done'), 1500)
      }
    }, every)
    ws.on('message', (raw) => {
      const text = raw.toString().slice(0, 4096)
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'echo', data: text, t: now() }))
    })
    ws.on('close', () => clearInterval(timer))
  }

  async function saveReport(req, body) {
    let report
    try {
      report = JSON.parse(body.toString('utf8'))
    } catch {
      throw new Error('not-json')
    }
    if (typeof report !== 'object' || report === null || Array.isArray(report)) throw new Error('not-an-object')
    const id = randomBytes(6).toString('base64url')
    const entry = { ...report, id, receivedAt: new Date(now()).toISOString(), seenBy: seenBy(req) }
    await loaded
    reports.push(entry)
    reports.splice(0, Math.max(0, reports.length - KEEP_REPORTS))
    if (file) {
      await appendFile(file, `${JSON.stringify(entry)}\n`).catch((error) => log(`diag: cannot write ${file}: ${error.message}`))
    }
    log(`diag: report ${id} from ${String(report.kind ?? '?')} "${String(report.label ?? '').slice(0, 60)}"`)
    return id
  }

  return { handleHttp, onSocket }
}

/**
 * What the relay sees of a request: the address (last number masked), the proxies on the way.
 * @param {import('node:http').IncomingMessage} req
 */
export function seenBy(req) {
  const header = (name) => {
    const value = req.headers[name]
    return Array.isArray(value) ? value.join(', ') : value ?? null
  }
  const chain = String(header('x-forwarded-for') ?? req.socket.remoteAddress ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return {
    ip: maskIp(chain[0] ?? ''),
    hops: chain.length,
    via: header('via'),
    forwarded: header('forwarded'),
    userAgent: header('user-agent'),
    httpVersion: req.httpVersion,
  }
}

/** @param {string} ip */
export function maskIp(ip) {
  const v4 = /^(?:::ffff:)?(\d+\.\d+\.\d+)\.\d+$/.exec(ip)
  if (v4) return `${v4[1]}.x`
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}:…`
  return ip
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {number} max
 * @returns {Promise<Buffer>}
 */
export function readBody(req, max) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const parts = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > max) {
        reject(new Error('too-large'))
        req.destroy()
        return
      }
      parts.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(parts)))
    req.on('error', reject)
  })
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 */
function clamp(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}
