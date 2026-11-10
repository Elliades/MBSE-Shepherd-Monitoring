import { createRelay, DEFAULTS } from './relay.js'

/**
 * @param {string} name
 * @param {number} fallback
 */
function numberFromEnv(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const relay = createRelay({
  log: (line) => console.log(`[relay] ${new Date().toISOString()} ${line}`),
  bufferSignals: numberFromEnv('RELAY_BUFFER_SIGNALS', DEFAULTS.bufferSignals),
  roomTtlMs: numberFromEnv('RELAY_ROOM_TTL_HOURS', DEFAULTS.roomTtlMs / 3_600_000) * 3_600_000,
  diagDir: process.env.DIAG_DIR ?? '',
  trackDir: process.env.TRACK_DIR ?? process.env.DIAG_DIR ?? '',
  trackKey: process.env.TRACK_KEY ?? '',
})

const host = process.env.HOST ?? '0.0.0.0'
const { port } = await relay.listen(numberFromEnv('PORT', 8787), host)
console.log(`[relay] listening on ${host}:${port}`)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`[relay] ${signal}, shutting down`)
    await relay.close()
    process.exit(0)
  })
}
