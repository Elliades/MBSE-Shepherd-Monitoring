/* The browser bridge: this page joins the relay inside Cameo (ws://127.0.0.1:8787, Cameo in Local
   mode) as a guide, and the online relay as a Cameo, then carries the frames between the two:
     Cameo → online: signals (without their local seq) and the simulation state;
     online → Cameo: signals and calls of the guides (calls get a local id; the answer goes back
                     under the id the online relay gave).
     Both ways: what the guides share with each other (their answers, `peer` frames), so the phone on
     the online code and the guide on this PC see the same answers.
   The browser reaches the online relay with its own proxy and certificates, which a school proxy lets
   through when it blocks MagicDraw's Java. */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const LOCAL = params.get('local') || 'ws://127.0.0.1:8787';
  const ONLINE = (params.get('relay') || `${location.origin}/relay`).replace(/\/+$/, '').replace(/^http/, 'ws');
  const ONLINE_CODE_KEY = 'mbse-shepherd:bridge-online-code';
  const $ = (id) => document.getElementById(id);
  const t0 = Date.now();

  let running = false;
  let local = null;
  let online = null;
  let localCode = '';
  let onlineCode = '';
  let localUp = false;
  let lastState = null;
  let reqCounter = 0;
  const pending = new Map(); // local request id → online request key
  const counts = { down: 0, up: 0 };
  let timers = { local: null, online: null };

  function log(text) {
    const el = $('log');
    el.textContent += `${((Date.now() - t0) / 1000).toFixed(1).padStart(7)}s  ${text}\n`;
    el.scrollTop = el.scrollHeight;
  }
  const sides = { local: false, online: false };
  function show(side, verdict, text) {
    sides[side] = verdict === 'ok';
    $(`${side}-text`).textContent = text;
    refreshDot();
  }
  function refreshDot() {
    const up = running && sides.local && sides.online;
    $('bridge-dot').className = `dot${up ? ' up' : ''}`;
    $('bridge-text').textContent = up ? 'Bridge is up' : 'Bridge is down';
  }
  function showCode(code) {
    $('online-code').innerHTML = code.split('').map((c) => `<span>${c}</span>`).join('');
  }
  showCode('······');
  function counters() {
    $('n-down').textContent = counts.down;
    $('n-up').textContent = counts.up;
    $('n-http').textContent = online && online.stats ? `${online.stats.posts} / ${online.stats.polls}` : '– / –';
  }
  setInterval(counters, 1000);
  const send = (socket, frame) => { if (socket && socket.readyState === 1) socket.send(typeof frame === 'string' ? frame : JSON.stringify(frame)); };

  // ── Cameo on this PC (we are a guide of its local relay) ────────────────

  function openLocal() {
    if (!running) return;
    show('local', 'run', `Joining ${LOCAL} …`);
    let ws;
    try { ws = new WebSocket(`${LOCAL}/v1/room/${localCode}`); } catch (e) { return retryLocal(`refused by the browser: ${e.message}`); }
    local = ws;
    ws.onmessage = (event) => {
      let f;
      try { f = JSON.parse(event.data); } catch (e) { return; }
      if (f.type === 'info') {
        if (f.event === 'hello') { localUp = !!f.pluginOnline; show('local', localUp ? 'ok' : 'warn', localUp ? `Cameo ${localCode} is online.` : 'The room exists but Cameo is offline.'); }
        if (f.event === 'plugin-online') { localUp = true; show('local', 'ok', `Cameo ${localCode} is online.`); }
        if (f.event === 'plugin-offline') { localUp = false; show('local', 'warn', 'Cameo went offline.'); }
        if (f.event === 'state') { lastState = { type: 'info', event: 'state', status: f.status, step: f.step }; send(online, lastState); counts.down += 1; }
        /* What a guide on this PC shares (its answers) goes to the guides of the online code (the phone). */
        if (f.event === 'peer' && f.data) send(online, { peer: f.data });
        return;
      }
      if (typeof f.res === 'string') {
        const key = pending.get(f.res);
        if (key === undefined) return;
        pending.delete(f.res);
        send(online, { ...f, res: key });
        counts.down += 1;
        return;
      }
      if (typeof f.signal === 'string') {
        const { seq, ...signal } = f;
        send(online, signal);
        counts.down += 1;
      }
    };
    ws.onclose = (event) => {
      if (local !== ws) return;
      local = null;
      localUp = false;
      failPending('plugin-gone');
      if (event.code === 4404 || event.code === 4400) { show('local', 'fail', `Cameo's relay does not know ${localCode}: check the code in Cameo (Local mode).`); return stop(); }
      retryLocal(`closed ${event.code}`);
    };
  }
  function retryLocal(why) {
    if (!running) return;
    show('local', 'fail', `Cannot reach Cameo on this PC (${why}). Is Cameo in Local mode? Retrying…`);
    clearTimeout(timers.local);
    timers.local = setTimeout(openLocal, 3000);
  }
  function failPending(error) {
    for (const key of pending.values()) send(online, { res: key, ok: false, error });
    pending.clear();
  }

  // ── The online relay (we are the plugin there) ──────────────────────────

  /* Auto: WebSocket, and HTTP requests for the rest of the session once it failed to open twice or
     opened without bringing anything in (a proxy holding the frames). */
  let viaHttp = false;
  let wsFails = 0;
  function openOnline() {
    if (!running) return;
    const mode = $('transport').value;
    const http = mode === 'http' || (mode === 'auto' && viaHttp);
    const url = `${ONLINE}/v1/plugin${onlineCode ? `?code=${onlineCode}` : ''}`;
    show('online', 'run', `Joining ${ONLINE} over ${http ? 'HTTP requests' : 'WebSocket'} …`);
    let ws;
    try { ws = http ? new window.RelayHttpSocket(url) : new WebSocket(url); } catch (e) { return retryOnline(e.message); }
    online = ws;
    let opened = false;
    let greeted = false;
    const goHttp = (why) => {
      if (viaHttp || mode !== 'auto') return false;
      viaHttp = true;
      log(`${why}: using HTTP requests`);
      return true;
    };
    ws.onopen = () => {
      opened = true;
      if (!http) setTimeout(() => { if (online === ws && !greeted && goHttp('the WebSocket opened but nothing came through')) { online = null; ws.close(); openOnline(); } }, 6000);
    };
    ws.onmessage = (event) => {
      let f;
      try { f = JSON.parse(event.data); } catch (e) { return; }
      if (f.type === 'info') {
        if (f.event === 'hello') {
          greeted = true;
          if (!http) wsFails = 0;
          onlineCode = f.code;
          try { localStorage.setItem(ONLINE_CODE_KEY, onlineCode); } catch (e) { /* not kept */ }
          showCode(onlineCode);
          const guide = `${location.origin}/?code=${onlineCode}`;
          $('guide-link').innerHTML = `On the phone: scan the code, open <a href="${guide}" target="_blank" rel="noopener">${guide}</a>, or type the 6 letters in the guide.`;
          drawQr(guide);
          document.title = `● Bridge ${onlineCode}`;
          show('online', 'ok', `Online as ${onlineCode} (${http ? 'HTTP requests' : 'WebSocket'}).`);
          log(`online code ${onlineCode}${f.reused ? ' (same as before)' : ''}`);
          if (lastState) send(online, lastState);
        }
        if (f.event === 'viewers') $('n-viewers').textContent = f.count;
        if (f.event === 'peer' && f.data) send(local, { peer: f.data });
        return;
      }
      if (typeof f.req === 'string') {
        if (!localUp) { send(online, { res: f.req, ok: false, error: 'plugin-offline' }); return; }
        const id = `b${++reqCounter}`;
        pending.set(id, f.req);
        send(local, { req: id, category: f.category, name: f.name, args: f.args || [] });
        counts.up += 1;
        log(`call ${f.category}/${f.name} → Cameo`);
        return;
      }
      if (typeof f.signal === 'string') {
        send(local, { signal: f.signal, id: f.id });
        counts.up += 1;
        log(`signal ${f.signal} → Cameo`);
      }
    };
    ws.onclose = (event) => {
      if (online !== ws) return;
      online = null;
      if (event.code === 4409) { show('online', 'fail', 'Another bridge or Cameo took this online code.'); return stop(); }
      if (event.code === 4400) { onlineCode = ''; }
      if (!http && !opened && ++wsFails >= 2 && goHttp('the WebSocket could not connect twice')) { openOnline(); return; }
      retryOnline(`closed ${event.code} ${event.reason || ''}`);
    };
  }
  function retryOnline(why) {
    if (!running) return;
    show('online', 'fail', `Online relay lost (${why}). Retrying…`);
    log(`online relay: ${why}`);
    clearTimeout(timers.online);
    timers.online = setTimeout(openOnline, 3000);
  }

  /* The guide's address with the online code, as a QR code the phone scans (js/vendor/qrcode.js, MIT). */
  function drawQr(text) {
    const box = $('qr');
    if (!window.qrcode) return;
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    box.hidden = false;
  }

  /* A page holding a Web Lock is not frozen by the browser when its tab is in the background. */
  let releaseLock = null;
  function holdLock() {
    if (!navigator.locks || releaseLock) return;
    navigator.locks.request('mbse-shepherd-bridge', () => new Promise((resolve) => { releaseLock = resolve; })).catch(() => {});
  }

  // ── Start, stop ─────────────────────────────────────────────────────────

  function start() {
    const code = $('local-code').value.replace(/[\s-]/g, '').toUpperCase();
    if (!/^[A-Z]{6}$/.test(code)) { show('local', 'fail', 'A code is 6 letters, as shown by Cameo.'); return; }
    localCode = code;
    running = true;
    $('start').disabled = true;
    $('stop').disabled = false;
    log(`bridge ${LOCAL} (${localCode}) ⇄ ${ONLINE}`);
    holdLock();
    openLocal();
    openOnline();
  }
  function stop() {
    running = false;
    clearTimeout(timers.local);
    clearTimeout(timers.online);
    const l = local, o = online;
    local = null; online = null;
    try { l && l.close(); } catch (e) { /* closed */ }
    try { o && o.close(); } catch (e) { /* closed */ }
    $('start').disabled = false;
    $('stop').disabled = true;
    if (releaseLock) { releaseLock(); releaseLock = null; }
    document.title = 'Cameo browser bridge';
    sides.local = sides.online = false;
    refreshDot();
    log('stopped');
  }

  /* Opened by Cameo (Open the browser bridge): ?code=<local code>&start=1[&transport=auto|ws|http]. */
  try { onlineCode = localStorage.getItem(ONLINE_CODE_KEY) || ''; } catch (e) { /* no storage */ }
  if (params.get('code')) $('local-code').value = params.get('code');
  if (['auto', 'ws', 'http'].includes(params.get('transport'))) $('transport').value = params.get('transport');
  if (params.get('start') === '1' && params.get('code')) setTimeout(start, 0);
  $('setup').addEventListener('submit', (e) => { e.preventDefault(); start(); });
  $('stop').addEventListener('click', stop);
  $('gear').addEventListener('click', () => { const open = $('conf').hidden; $('conf').hidden = !open; $('gear').setAttribute('aria-expanded', String(open)); });
  window.addEventListener('beforeunload', () => { if (running) stop(); });
})();
