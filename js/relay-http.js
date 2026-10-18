/* ───────── The relay over plain HTTP requests ─────────
   For networks whose proxy lets https through but not WebSocket frames (a school proxy that opens the
   WebSocket and then holds every frame). RelayHttpSocket behaves like a WebSocket on the relay
   addresses (`wss://host/relay/v1/room/CODE?lastSeq=N`, `.../v1/plugin?code=`), so bridge.js and the
   network check use it in place of one: it opens a session with a POST, long-polls for what the relay
   has (one GET held up to 25 s), and posts what it sends: at once, or gathered with what follows when
   the last post is less than 100 ms old (≤ 10 posts/s, however many frames).
   Wire format: relay/PROTOCOL-HTTP.md. */
(function () {
  'use strict';

  const CONNECTING = 0, OPEN = 1, CLOSING = 2, CLOSED = 3;
  const SEND_EVERY_MS = 100;
  const POLL_TIMEOUT_MS = 40000;

  /* `wss://host/relay/v1/room/ABCDEF?lastSeq=3` → { base: 'https://host/relay', role, code, lastSeq } */
  function parse(url) {
    const u = new URL(url.replace(/^ws/, 'http'));
    const room = /^(.*)\/v1\/room\/([^/]+)$/.exec(u.pathname);
    const plugin = /^(.*)\/v1\/plugin$/.exec(u.pathname);
    if (!room && !plugin) throw new SyntaxError(`Not a relay address: ${url}`);
    const prefix = (room || plugin)[1];
    const lastSeq = u.searchParams.get('lastSeq');
    return {
      base: `${u.protocol}//${u.host}${prefix}`,
      role: room ? 'viewer' : 'plugin',
      code: room ? decodeURIComponent(room[2]) : (u.searchParams.get('code') || ''),
      lastSeq: lastSeq !== null && /^\d+$/.test(lastSeq) ? Number(lastSeq) : undefined,
    };
  }

  class RelayHttpSocket {
    /* options.wait: how long the relay may hold a poll (ms); 0 = short polling every options.every ms. */
    constructor(url, options = {}) {
      this.url = url;
      this.transport = 'http';
      this.readyState = CONNECTING;
      this.onopen = null; this.onmessage = null; this.onclose = null; this.onerror = null;
      this.stats = { polls: 0, posts: 0, framesIn: 0, framesOut: 0, startedAt: Date.now() };
      this._wait = options.wait === undefined ? 25000 : options.wait;
      this._every = options.every || 1000;
      this._target = parse(url);
      this._session = null;
      this._outbox = [];
      this._lastPost = 0;
      this._sendTimer = null;
      this._abort = null;
      this._closed = false;
      setTimeout(() => this._open(), 0);
    }

    send(text) {
      if (this.readyState !== OPEN) throw new Error('RelayHttpSocket is not open');
      this._outbox.push(String(text));
      /* At once when the last post is old enough, else with the next one: at most 10 posts a second. */
      if (!this._sendTimer) this._sendTimer = setTimeout(() => this._flush(), Math.max(0, this._lastPost + SEND_EVERY_MS - Date.now()));
    }

    close(code = 1000, reason = '') {
      if (this.readyState >= CLOSING) return;
      const session = this._session;
      if (session) {
        this._flush();
        fetch(`${this._target.base}/v1/http/close?s=${encodeURIComponent(session)}`, { method: 'POST', body: '{}', keepalive: true }).catch(() => {});
      }
      this._finish(code, reason, true);
    }

    async _open() {
      const { base, role, code, lastSeq } = this._target;
      let body;
      try {
        const res = await fetch(`${base}/v1/http/open`, {
          method: 'POST', cache: 'no-store',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ role, code, ...(lastSeq !== undefined && { lastSeq }) }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        body = await res.json();
      } catch (e) {
        return this._fail(e);
      }
      if (this._closed) return;
      if (!body.session) {
        this._deliver(body.frames);
        return this._finish(body.closed ? body.closed.code : 1006, body.closed ? body.closed.reason : 'refused', false);
      }
      this._session = body.session;
      this.readyState = OPEN;
      if (this.onopen) this.onopen({ type: 'open' });
      this._deliver(body.frames);
      this._poll();
    }

    async _poll() {
      while (!this._closed) {
        const ctrl = new AbortController();
        this._abort = ctrl;
        const guard = setTimeout(() => ctrl.abort(), POLL_TIMEOUT_MS);
        let body;
        try {
          const res = await fetch(`${this._target.base}/v1/http/poll?s=${encodeURIComponent(this._session)}&wait=${this._wait}&n=${this.stats.polls}`, { cache: 'no-store', signal: ctrl.signal });
          if (res.status === 410) { body = await res.json(); }
          else if (!res.ok) throw new Error(`HTTP ${res.status}`);
          else body = await res.json();
        } catch (e) {
          clearTimeout(guard);
          if (this._closed) return;
          return this._fail(e);
        }
        clearTimeout(guard);
        if (this._closed) return;
        this.stats.polls += 1;
        this._deliver(body.frames);
        if (body.closed) return this._finish(body.closed.code, body.closed.reason, false);
        if (this._wait === 0) await new Promise((r) => setTimeout(r, this._every));
      }
    }

    /* One post at a time, so the frames reach the relay in order; what comes meanwhile goes with the next. */
    async _flush() {
      clearTimeout(this._sendTimer);
      this._sendTimer = null;
      if (!this._outbox.length || !this._session || this._posting) return;
      const frames = this._outbox.splice(0, this._outbox.length);
      this._lastPost = Date.now();
      this._posting = true;
      this.stats.posts += 1;
      this.stats.framesOut += frames.length;
      try {
        const res = await fetch(`${this._target.base}/v1/http/send?s=${encodeURIComponent(this._session)}`, {
          method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ frames }),
        });
        if (res.status === 410) return this._finish(1006, 'session-lost', false);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        if (!this._closed) this._fail(e);
        return;
      } finally {
        this._posting = false;
      }
      if (this._outbox.length && !this._sendTimer && !this._closed) {
        this._sendTimer = setTimeout(() => this._flush(), Math.max(0, this._lastPost + SEND_EVERY_MS - Date.now()));
      }
    }

    _deliver(frames) {
      for (const text of frames || []) {
        if (this._closed && this.readyState === CLOSED) return;
        this.stats.framesIn += 1;
        if (this.onmessage) this.onmessage({ type: 'message', data: text });
      }
    }

    _fail(error) {
      if (this.onerror) this.onerror({ type: 'error', error });
      this._finish(1006, String(error && error.message || error), false);
    }

    _finish(code, reason, wasClean) {
      if (this._closed) return;
      this._closed = true;
      this.readyState = CLOSED;
      clearTimeout(this._sendTimer);
      if (this._abort) this._abort.abort();
      if (this.onclose) this.onclose({ type: 'close', code, reason: reason || '', wasClean });
    }
  }

  RelayHttpSocket.CONNECTING = CONNECTING;
  RelayHttpSocket.OPEN = OPEN;
  RelayHttpSocket.CLOSING = CLOSING;
  RelayHttpSocket.CLOSED = CLOSED;
  window.RelayHttpSocket = RelayHttpSocket;
})();
