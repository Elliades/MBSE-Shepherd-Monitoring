import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRelay } from '../src/relay.js'
import { IDLE_MS } from '../src/track.js'

const T0 = Date.parse('2026-10-20T08:00:00Z')

async function start(options = {}) {
  let clock = T0
  const relay = createRelay({ now: () => clock, ...options })
  const { port } = await relay.listen(0, '127.0.0.1')
  const http = `http://127.0.0.1:${port}`
  const send = (events, sentAt = clock) =>
    fetch(`${http}/v1/track`, { method: 'POST', body: JSON.stringify({ sentAt, events }) }).then((r) => r.json())
  const get = (path) => fetch(`${http}${path}`).then(async (r) => ({ status: r.status, body: await r.json() }))
  return { relay, send, get, at: (t) => { clock = t } }
}

const ev = (t, type, index, extra = {}) => ({
  t, code: 'k7qx', part: 'part1', type, v: '2026.10', fp: 'abc1', total: 50, index, scene: `s${index}`, title: `Scene ${index}`, ...extra,
})

test('the events of a student fold into one run per day, breaks left out', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'track-'))
  const { relay, send, get, at } = await start({ trackDir: dir })
  t.after(() => relay.close())

  const min = 60_000
  at(T0 + 30 * min)
  const r = await send([
    ev(T0, 'scene', 0),
    ev(T0 + 2 * min, 'scene', 1),
    ev(T0 + 4 * min, 'ping', 1),
    ev(T0 + 5 * min, 'hide', 1),
    ev(T0 + 20 * min, 'show', 1),
    ev(T0 + 22 * min, 'scene', 2, { done: 3, steps: 120 }),
    { code: '??', part: 'part1', type: 'scene', t: T0 },
  ])
  assert.equal(r.count, 6)

  const { body } = await get('/v1/track/runs?day=2026-10-20')
  assert.equal(body.runs.length, 1)
  const run = body.runs[0]
  assert.equal(run.code, 'K7QX')
  assert.equal(run.maxIndex, 2)
  assert.equal(run.cur, 2)
  assert.equal(run.done, 3)
  // 2 min on scene 0, 3 min on scene 1 before the tab was hidden, 2 min after it came back.
  assert.equal(run.scenes[0].dwell, 2 * min)
  assert.equal(run.scenes[1].dwell, 5 * min)
  assert.equal(run.active, 7 * min)
  assert.deepEqual(run.path.map(([, i]) => i), [0, 1, 2])
  assert.equal(body.catalog['part1|2026.10|abc1'].scenes[2].title, 'Scene 2')

  // A silence longer than IDLE_MS is not time on the scene.
  at(T0 + 22 * min + IDLE_MS + 60_000)
  await send([ev(T0 + 22 * min + IDLE_MS + 60_000, 'ping', 2)])
  const again = (await get('/v1/track/runs')).body.runs[0]
  assert.equal(again.active, 7 * min)

  const days = (await get('/v1/track/days')).body.days
  assert.deepEqual(days.map((d) => [d.day, d.runs]), [['2026-10-20', 1]])

  // The events are kept on disk and read again by the next relay.
  const lines = (await readFile(join(dir, 'track.jsonl'), 'utf8')).trim().split('\n')
  assert.equal(lines.length, 7)
  const next = await start({ trackDir: dir })
  t.after(() => next.relay.close())
  const reloaded = (await next.get('/v1/track/runs')).body.runs[0]
  assert.equal(reloaded.active, 7 * min)
})

test('the clock of the browser is corrected, reading can need a key', async (t) => {
  const { relay, send, get } = await start({ trackKey: 'secret' })
  t.after(() => relay.close())

  // The browser is one hour late: its events are moved by the gap seen when they arrive.
  const late = T0 - 3_600_000
  await send([ev(late, 'scene', 0)], late)
  assert.equal((await get('/v1/track/runs')).status, 403)
  const { body } = await get('/v1/track/runs?key=secret')
  assert.equal(body.runs[0].start, T0)
})
