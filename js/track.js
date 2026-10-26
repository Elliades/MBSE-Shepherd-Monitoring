/* Timing of the practical session: tells the relay which scene the student is on, under an anonymous
   code drawn by this browser (shown in the Flight plan). No name, no answer is ever sent.
   The relay folds the events into runs that monitor/ shows to the teachers.
   Off with ?track=0 (kept in this browser, for the teachers' own machines), back on with ?track=1. */
(function () {
  'use strict';

  const CFG = window.COURSE_CONFIG || {};
  const CODE_KEY = 'mbse-shepherd:track:code';
  const OFF_KEY = 'mbse-shepherd:track:off';
  const PING_MS = 60000;
  const MAX_QUEUE = 200;
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function stored(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
    } catch (e) { /* private mode: nothing kept */ }
    return value;
  }

  const q = /[?&]track=([^&#]*)/.exec(location.search);
  const asked = q ? decodeURIComponent(q[1]) : null;
  if (asked === '0') stored(OFF_KEY, '1');
  if (asked === '1') stored(OFF_KEY, null);

  function endpoint() {
    if (asked && /^https?:\/\//.test(asked)) return asked.replace(/\/+$/, '') + '/v1/track';
    const set = CFG.trackUrl == null ? 'auto' : CFG.trackUrl;
    if (!set) return null;
    if (set !== 'auto') return set.replace(/\/+$/, '') + '/v1/track';
    return /^https?:$/.test(location.protocol) ? location.origin + '/relay/v1/track' : null;
  }

  function code() {
    let c = stored(CODE_KEY);
    if (!c || !/^[A-Z0-9]{4,8}$/.test(c)) {
      const r = new Uint32Array(4);
      (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : r.forEach((_, i) => { r[i] = Math.random() * 1e9; });
      c = Array.from(r, (n) => ALPHABET[n % ALPHABET.length]).join('');
      stored(CODE_KEY, c);
    }
    return c;
  }

  const url = endpoint();
  const off = stored(OFF_KEY) === '1';
  let where = null;
  let queue = [];
  let sending = false;
  let timer = 0;

  function push(type) {
    if (!url || off || !where) return;
    const w = where();
    queue.push(Object.assign({ t: Date.now(), type, code: code(), part: CFG.trackPart || 'guide', v: CFG.tpVersion || '' }, w));
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  }

  function flush(leaving) {
    if (!queue.length || sending) return;
    const events = queue;
    queue = [];
    const body = JSON.stringify({ sentAt: Date.now(), events });
    if (leaving && navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return;
    sending = true;
    fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } })
      .then((res) => { if (!res.ok && res.status >= 500) throw new Error(res.status); })
      .catch(() => { queue = events.concat(queue).slice(-MAX_QUEUE); })
      .then(() => { sending = false; });
  }

  function tick() {
    if (document.visibilityState === 'visible') push('ping');
    flush();
  }

  window.Track = {
    /** The engine hands a function that tells where the student is: { scene, index, title, total, fp, done, steps }. */
    start(provider) {
      where = provider;
      if (!url || off || timer) return;
      timer = setInterval(tick, PING_MS);
      document.addEventListener('visibilitychange', () => {
        push(document.visibilityState === 'visible' ? 'show' : 'hide');
        flush(document.visibilityState !== 'visible');
      });
      window.addEventListener('pagehide', () => { push('hide'); flush(true); });
    },
    /** A new scene is shown. */
    scene() { push('scene'); flush(); },
    code() { return url && !off ? code() : null; }
  };
})();
