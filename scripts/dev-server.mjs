// The site and its relay on one local address, as nginx serves them online: static files, and /relay/
// handed to the relay (relay/src/relay.js) running in this same process.
//   node scripts/dev-server.mjs [port]      → http://127.0.0.1:5180/  (needs `npm ci` in relay/)
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRelay } from '../relay/src/relay.js'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const port = Number(process.argv[2] || process.env.PORT || 5180)
// --silent-ws: what the school proxy does: the WebSocket opens, then no frame ever comes through.
const silentWs = process.argv.includes('--silent-ws')
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.zip': 'application/zip', '.mdzip': 'application/octet-stream',
}

const relay = createRelay({ log: (line) => console.log(`[relay] ${line}`), diagDir: join(root, 'relay', '.data'), trackDir: join(root, 'relay', '.data') })
const relayPort = (await relay.listen(0, '127.0.0.1')).port

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://local')
  if (url.pathname.startsWith('/relay/')) return forward(req, res, url)
  let path = normalize(join(root, decodeURIComponent(url.pathname)))
  if (!path.startsWith(root) || /[\\/]\.(git|claude)([\\/]|$)/.test(path)) return res.writeHead(403).end()
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html')
    const body = await readFile(path)
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found')
  }
})

/** The relay listens on its own port; requests and WebSocket upgrades go there without the /relay prefix. */
function forward(req, res, url) {
  const target = `http://127.0.0.1:${relayPort}${url.pathname.slice('/relay'.length)}${url.search}`
  import('node:http').then(({ request }) => {
    const out = request(target, { method: req.method, headers: req.headers }, (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers)
      answer.pipe(res)
    })
    out.on('error', () => res.writeHead(502).end())
    req.pipe(out)
  })
}

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://local')
  if (!url.pathname.startsWith('/relay/')) return socket.destroy()
  if (silentWs) return answerSilently(req, socket)
  import('node:net').then(({ connect }) => {
    const upstream = connect(relayPort, '127.0.0.1', () => {
      const lines = [`${req.method} ${url.pathname.slice('/relay'.length)}${url.search} HTTP/1.1`]
      for (let i = 0; i < req.rawHeaders.length; i += 2) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`)
      upstream.write(`${lines.join('\r\n')}\r\n\r\n`)
      if (head.length) upstream.write(head)
      upstream.pipe(socket).pipe(upstream)
    })
    upstream.on('error', () => socket.destroy())
    socket.on('error', () => upstream.destroy())
  })
})

function answerSilently(req, socket) {
  const accept = createHash('sha1').update(`${req.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64')
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`)
  socket.on('data', () => {})
  socket.on('error', () => {})
}

server.listen(port, '127.0.0.1', () => console.log(`site + relay on http://127.0.0.1:${port}/  (relay also on ws://127.0.0.1:${relayPort})`))
