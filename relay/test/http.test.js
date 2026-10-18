import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRelay } from '../src/relay.js'

async function start(options = {}) {
  const relay = createRelay({ maxPollWaitMs: 2000, ...options })
  const { port } = await relay.listen(0, '127.0.0.1')
  return { relay, http: `http://127.0.0.1:${port}`, ws: `ws://127.0.0.1:${port}` }
}

const post = (url, body) =>
  fetch(url, { method: 'POST', body: JSON.stringify(body) }).then(async (res) => ({ status: res.status, body: await res.json() }))
const get = (url) => fetch(url).then(async (res) => ({ status: res.status, body: await res.json() }))
const frames = (list) => list.map((text) => JSON.parse(text))

test('a plugin and a viewer talk over HTTP only', async (t) => {
  const { relay, http } = await start()
  t.after(() => relay.close())

  const plugin = await post(`${http}/v1/http/open`, { role: 'plugin' })
  assert.equal(plugin.status, 200)
  const hello = frames(plugin.body.frames)[0]
  assert.equal(hello.event, 'hello')
  assert.equal(hello.role, 'plugin')
  const code = hello.code

  const viewer = await post(`${http}/v1/http/open`, { role: 'viewer', code })
  assert.equal(frames(viewer.body.frames)[0].pluginOnline, true)
  const room = await get(`${http}/v1/room/${code}`)
  assert.equal(room.body.pluginTransport, 'http')

  // The plugin learns that a viewer came.
  const p1 = await get(`${http}/v1/http/poll?s=${plugin.body.session}&wait=500`)
  assert.deepEqual(frames(p1.body.frames).map((f) => f.event), ['viewers'])

  // A poll waiting for nothing is answered when the plugin publishes.
  const waiting = get(`${http}/v1/http/poll?s=${viewer.body.session}&wait=2000`)
  await new Promise((r) => setTimeout(r, 100))
  const batch = JSON.stringify({ batch: [{ signal: 'a', id: '1' }, { signal: 'b', id: '2' }] })
  const state = JSON.stringify({ type: 'info', event: 'state', status: 'running', step: 'S1' })
  await post(`${http}/v1/http/send?s=${plugin.body.session}`, { frames: [batch, state] })
  const got = frames((await waiting).body.frames)
  assert.deepEqual(got.map((f) => f.signal ?? f.event), ['a', 'b', 'state'])
  assert.deepEqual(got.map((f) => f.seq), [1, 2, undefined])

  // A call from the viewer reaches the plugin, the answer comes back under the viewer's id.
  await post(`${http}/v1/http/send?s=${viewer.body.session}`, { frames: [JSON.stringify({ req: 'r-1', category: 'browser', name: 'select', args: ['x'] })] })
  const call = frames((await get(`${http}/v1/http/poll?s=${plugin.body.session}&wait=500`)).body.frames)[0]
  assert.equal(call.name, 'select')
  await post(`${http}/v1/http/send?s=${plugin.body.session}`, { frames: [JSON.stringify({ res: call.req, ok: true, result: 42 })] })
  const answer = frames((await get(`${http}/v1/http/poll?s=${viewer.body.session}&wait=500`)).body.frames)[0]
  assert.deepEqual(answer, { res: 'r-1', ok: true, result: 42 })

  // Closing the plugin session tells the viewer.
  await post(`${http}/v1/http/close?s=${plugin.body.session}`, {})
  const off = frames((await get(`${http}/v1/http/poll?s=${viewer.body.session}&wait=500`)).body.frames)
  assert.equal(off[0].event, 'plugin-offline')
})

test('a WebSocket viewer follows an HTTP plugin, and a lastSeq replay works over HTTP', async (t) => {
  const { relay, http, ws } = await start()
  t.after(() => relay.close())
  const plugin = await post(`${http}/v1/http/open`, { role: 'plugin' })
  const code = frames(plugin.body.frames)[0].code
  await post(`${http}/v1/http/send?s=${plugin.body.session}`, { frames: [JSON.stringify({ signal: 'x', id: '1' })] })

  const socket = new WebSocket(`${ws}/v1/room/${code}`)
  const received = []
  socket.onmessage = (event) => received.push(JSON.parse(event.data))
  await new Promise((resolve) => { socket.onopen = resolve })
  await new Promise((r) => setTimeout(r, 50))
  await post(`${http}/v1/http/send?s=${plugin.body.session}`, { frames: [JSON.stringify({ signal: 'y', id: '2' })] })
  await new Promise((r) => setTimeout(r, 100))
  assert.deepEqual(received.filter((f) => f.signal).map((f) => f.signal), ['y'])
  socket.close()

  const late = await post(`${http}/v1/http/open`, { role: 'viewer', code, lastSeq: 0 })
  const replayed = frames(late.body.frames)
  assert.deepEqual(replayed.filter((f) => f.signal).map((f) => f.signal), ['x', 'y'])
})

test('unknown codes and sessions are refused like on the WebSocket', async (t) => {
  const { relay, http } = await start()
  t.after(() => relay.close())
  const viewer = await post(`${http}/v1/http/open`, { role: 'viewer', code: 'ABCDEF' })
  assert.equal(viewer.body.session, null)
  assert.equal(viewer.body.closed.code, 4404)
  const lost = await get(`${http}/v1/http/poll?s=nope`)
  assert.equal(lost.status, 410)
})

test('an HTTP peer that stops polling leaves the room', async (t) => {
  let clock = 1_000_000
  const { relay, http } = await start({ now: () => clock, httpIdleMs: 1000 })
  t.after(() => relay.close())
  const plugin = await post(`${http}/v1/http/open`, { role: 'plugin' })
  const code = frames(plugin.body.frames)[0].code
  clock += 5000
  await new Promise((r) => setTimeout(r, 5200))
  const room = await get(`${http}/v1/room/${code}`)
  assert.equal(room.body.pluginOnline, false)
})

test('diag endpoints and reports', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'relay-diag-'))
  const { relay, http, ws } = await start({ diagDir: dir })
  t.after(() => relay.close())

  const echo = await fetch(`${http}/v1/diag/echo`, { headers: { 'x-forwarded-for': '10.1.2.3, 172.16.0.1', via: '1.1 proxy' } }).then((r) => r.json())
  assert.equal(echo.ip, '10.1.2.x')
  assert.equal(echo.hops, 2)
  assert.equal(echo.via, '1.1 proxy')

  const posted = await fetch(`${http}/v1/diag/echo`, { method: 'POST', body: 'x'.repeat(32 * 1024) }).then((r) => r.json())
  assert.equal(posted.bytes, 32 * 1024)

  const started = Date.now()
  await get(`${http}/v1/diag/poll?wait=300`)
  assert.ok(Date.now() - started >= 280)

  const text = await fetch(`${http}/v1/diag/sse?n=2&every=100`).then((r) => r.text())
  assert.equal((text.match(/event: tick/g) ?? []).length, 2)

  const socket = new WebSocket(`${ws}/v1/diag/ws?n=2&every=100`)
  const got = []
  socket.onmessage = (event) => {
    const frame = JSON.parse(event.data)
    got.push(frame.type)
    if (frame.type === 'hello') socket.send('ping')
  }
  await new Promise((resolve) => { socket.onclose = resolve })
  assert.deepEqual(got.sort(), ['echo', 'hello', 'tick', 'tick'])

  const saved = await post(`${http}/v1/diag/report`, { kind: 'browser', label: 'test', results: [] })
  assert.equal(saved.body.ok, true)
  const list = await get(`${http}/v1/diag/reports`)
  assert.equal(list.body.reports[0].label, 'test')
  const file = await readFile(join(dir, 'reports.jsonl'), 'utf8')
  assert.match(file, /"label":"test"/)
})
