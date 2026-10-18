import { EventEmitter } from 'node:events'
import { randomBytes } from 'node:crypto'

const OPEN = 1
const CLOSED = 3

/**
 * One end of a room (plugin or browser) reached with plain HTTP requests instead of a WebSocket,
 * for networks whose proxy lets HTTPS through but not WebSocket frames.
 *
 * It looks like a `ws` socket to the rest of the relay (`readyState`, `bufferedAmount`, `send`,
 * `close`, `'message'` and `'close'` events), so rooms, fan-out and slow-consumer checks work
 * unchanged. What the relay sends waits in `outbox` until the peer polls for it; what the peer
 * posts is emitted as `'message'`.
 */
export class HttpPeer extends EventEmitter {
  /** @param {'plugin' | 'viewer'} role */
  constructor(role) {
    super()
    this.id = randomBytes(18).toString('base64url')
    this.role = role
    this.transport = 'http'
    this.readyState = OPEN
    this.bufferedAmount = 0
    this.isAlive = true
    /** @type {string[]} */
    this.outbox = []
    /** @type {{ close: { code: number, reason: string } } | null} */
    this.ended = null
    /** @type {(() => void) | null} */
    this.wake = null
    /** Set by the relay with its own clock. */
    this.lastSeen = 0
    this.polls = 0
    this.posts = 0
  }

  /** @param {string} text */
  send(text) {
    if (this.readyState !== OPEN) return
    this.outbox.push(text)
    this.bufferedAmount += Buffer.byteLength(text)
    this.wake?.()
  }

  /**
   * The frames waiting, up to about `maxBytes` (always at least one).
   * @param {number} maxBytes
   * @returns {string[]}
   */
  take(maxBytes) {
    let bytes = 0
    let count = 0
    while (count < this.outbox.length) {
      const size = Buffer.byteLength(this.outbox[count])
      if (count > 0 && bytes + size > maxBytes) break
      bytes += size
      count += 1
    }
    this.bufferedAmount = Math.max(0, this.bufferedAmount - bytes)
    return this.outbox.splice(0, count)
  }

  /**
   * @param {number} [code]
   * @param {string} [reason]
   */
  close(code = 1000, reason = '') {
    if (this.readyState === CLOSED) return
    this.readyState = CLOSED
    this.ended = { close: { code, reason } }
    this.wake?.()
    this.emit('close', code, Buffer.from(reason))
  }

  terminate() {
    this.close(1006, 'terminated')
  }

  /** Liveness comes from the polls, not from pings. */
  ping() {}
}
