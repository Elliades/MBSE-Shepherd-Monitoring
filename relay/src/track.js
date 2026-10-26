import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { readBody } from './diag.js'

/**
 * Timing of the practical sessions: the guides send where a student is (an anonymous code, the scene,
 * the version of the guide), the relay keeps the events in `track.jsonl` and folds them into one "run"
 * per code, part and day. `monitor/` of the site shows the runs of a day and the stats of every day.
 * Nothing names the student: the code is drawn at random by the browser, no address is kept.
 */

const MAX_BODY_BYTES = 32 * 1024
const MAX_EVENTS_PER_POST = 50
/** A gap longer than this (no event, hidden tab) is a break: it does not count as time on the scene. */
export const IDLE_MS = 5 * 60_000
const CODE = /^[A-Z0-9]{3,8}$/
const PART = /^[a-z0-9-]{1,20}$/
const TYPES = new Set(['scene', 'ping', 'hide', 'show'])
const TIME_ZONE = 'Europe/Paris'

/**
 * @param {{ dir?: string, log: (line: string) => void, now: () => number, key?: string }} options
 */
export function createTrack({ dir, log, now, key }) {
  /** @type {Map<string, Run>} by code|part|day */
  const runs = new Map()
  /** @type {Map<string, { total: number, scenes: { id: string, title: string }[] }>} by part|version */
  const catalog = new Map()
  const file = dir ? join(dir, 'track.jsonl') : null
  const loaded = file ? load(file) : Promise.resolve()

  async function load(path) {
    try {
      await mkdir(dir, { recursive: true })
      const text = await readFile(path, 'utf8').catch(() => '')
      let n = 0
      for (const line of text.split('\n')) {
        if (!line.trim()) continue
        try {
          apply(JSON.parse(line))
          n += 1
        } catch {
          // A line cut by a crash: skip it.
        }
      }
      log(`track: ${n} events, ${runs.size} runs loaded from ${path}`)
    } catch (error) {
      log(`track: cannot read ${path}: ${error.message}`)
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
    if (path !== '/v1/track' && !path.startsWith('/v1/track/')) return false

    if (path === '/v1/track' && req.method === 'POST') {
      readBody(req, MAX_BODY_BYTES)
        .then((body) => receive(body))
        .then((count) => reply(res, 200, { ok: true, count }))
        .catch((error) => reply(res, 400, { error: error.message }))
      return true
    }
    if (req.method !== 'GET') {
      reply(res, 405, { error: 'method-not-allowed' })
      return true
    }
    if (key && url.searchParams.get('key') !== key) {
      reply(res, 403, { error: 'key' })
      return true
    }
    if (path === '/v1/track/days') {
      loaded.then(() => reply(res, 200, { now: now(), idleMs: IDLE_MS, days: days() }))
      return true
    }
    if (path === '/v1/track/runs') {
      loaded.then(() => {
        const day = url.searchParams.get('day')
        const part = url.searchParams.get('part')
        const list = [...runs.values()].filter((r) => (!day || r.day === day) && (!part || r.part === part))
        reply(res, 200, { now: now(), idleMs: IDLE_MS, runs: list.map(view), catalog: Object.fromEntries(catalog) })
      })
      return true
    }
    reply(res, 404, { error: 'not-found' })
    return true
  }

  /** @param {Buffer} body */
  async function receive(body) {
    let data
    try {
      data = JSON.parse(body.toString('utf8'))
    } catch {
      throw new Error('not-json')
    }
    const list = Array.isArray(data?.events) ? data.events.slice(0, MAX_EVENTS_PER_POST) : null
    if (!list) throw new Error('no-events')
    // The clock of the browser may be off: its events are moved by the gap seen at the time of sending.
    const received = now()
    const sentAt = Number(data.sentAt)
    const shift = Number.isFinite(sentAt) ? received - sentAt : 0
    await loaded
    const lines = []
    for (const raw of list) {
      const event = clean(raw, shift, received)
      if (!event) continue
      apply(event)
      lines.push(JSON.stringify(event))
    }
    if (file && lines.length) {
      await appendFile(file, `${lines.join('\n')}\n`).catch((error) => log(`track: cannot write ${file}: ${error.message}`))
    }
    return lines.length
  }

  /**
   * @param {any} raw
   * @param {number} shift
   * @param {number} received
   */
  function clean(raw, shift, received) {
    if (!raw || typeof raw !== 'object') return null
    const code = String(raw.code ?? '').toUpperCase()
    const part = String(raw.part ?? '')
    const type = String(raw.type ?? '')
    if (!CODE.test(code) || !PART.test(part) || !TYPES.has(type)) return null
    let t = Number(raw.t) + shift
    // An event queued offline keeps its time; one from the future or older than a day takes the arrival time.
    if (!Number.isFinite(t) || t > received + 60_000 || t < received - 86_400_000) t = received
    const event = {
      t: Math.round(t),
      code,
      part,
      type,
      v: String(raw.v ?? '').slice(0, 32),
      fp: String(raw.fp ?? '').slice(0, 16),
    }
    const index = Number(raw.index)
    if (Number.isInteger(index) && index >= 0 && index < 1000) {
      event.index = index
      event.scene = String(raw.scene ?? '').slice(0, 80)
    }
    if (Number.isInteger(Number(raw.total)) && Number(raw.total) > 0) event.total = Number(raw.total)
    if (raw.title != null) event.title = String(raw.title).slice(0, 140)
    if (Number.isInteger(Number(raw.done)) && Number(raw.done) >= 0) event.done = Number(raw.done)
    if (Number.isInteger(Number(raw.steps)) && Number(raw.steps) >= 0) event.steps = Number(raw.steps)
    return event
  }

  /**
   * Folds one event into its run: the time since the last event goes to the scene that was shown, unless
   * it is a break (tab hidden, or no news for IDLE_MS).
   * @param {any} e
   */
  function apply(e) {
    const day = dayOf(e.t)
    const id = `${e.code}|${e.part}|${day}`
    let run = runs.get(id)
    if (!run) {
      run = {
        id, code: e.code, part: e.part, day, v: e.v, fp: e.fp, start: e.t, last: e.t, lastT: null, cur: null,
        maxIndex: -1, total: 0, active: 0, done: 0, steps: 0, scenes: {}, path: [], hidden: false, events: 0,
      }
      runs.set(id, run)
    }
    run.events += 1
    if (e.t < run.start) run.start = e.t
    if (e.v) run.v = e.v
    if (e.fp) run.fp = e.fp
    if (e.total) run.total = e.total
    if (e.done != null) run.done = e.done
    if (e.steps != null) run.steps = e.steps

    if (run.lastT != null && run.cur != null) {
      const gap = e.t - run.lastT
      if (gap > 0 && gap <= IDLE_MS) {
        run.active += gap
        run.scenes[run.cur].dwell += gap
      }
    }
    if (e.t >= run.last) run.last = e.t

    if (e.index != null) {
      if (e.index !== run.cur) run.path.push([e.t, e.index])
      run.cur = e.index
      const s = (run.scenes[e.index] ??= { id: e.scene, first: e.t, dwell: 0, visits: 0 })
      if (e.type === 'scene') s.visits += 1
      if (e.t < s.first) s.first = e.t
      if (e.index > run.maxIndex) run.maxIndex = e.index
      if (e.title != null) {
        const ck = `${e.part}|${e.v}|${e.fp}`
        const cat = catalog.get(ck) ?? { part: e.part, v: e.v, fp: e.fp, total: 0, scenes: [] }
        cat.scenes[e.index] = { id: e.scene, title: e.title }
        if (e.total) cat.total = e.total
        catalog.set(ck, cat)
      }
    }
    run.hidden = e.type === 'hide'
    run.lastT = e.type === 'hide' ? null : Math.max(run.lastT ?? 0, e.t)
  }

  function days() {
    /** @type {Map<string, { day: string, runs: number, parts: Record<string, number>, versions: string[], first: number, last: number }>} */
    const byDay = new Map()
    for (const r of runs.values()) {
      const d = byDay.get(r.day) ?? { day: r.day, runs: 0, parts: {}, versions: [], first: r.start, last: r.last }
      d.runs += 1
      d.parts[r.part] = (d.parts[r.part] ?? 0) + 1
      if (!d.versions.includes(`${r.part} ${r.v}`)) d.versions.push(`${r.part} ${r.v}`)
      d.first = Math.min(d.first, r.start)
      d.last = Math.max(d.last, r.last)
      byDay.set(r.day, d)
    }
    return [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1))
  }

  /** @param {Run} r */
  function view(r) {
    const { lastT, ...rest } = r
    return rest
  }

  return { handleHttp, receive, runs }
}

/**
 * The day of a time, in the time zone of the school.
 * @param {number} t
 */
export function dayOf(t) {
  return new Date(t).toLocaleDateString('sv-SE', { timeZone: TIME_ZONE })
}

/**
 * @typedef {{ id: string, code: string, part: string, day: string, v: string, fp: string, start: number,
 *   last: number, lastT: number | null, cur: number | null, maxIndex: number, total: number, active: number,
 *   done: number, steps: number, scenes: Record<number, { id: string, first: number, dwell: number, visits: number }>,
 *   path: [number, number][], hidden: boolean, events: number }} Run
 */
