/* Network check of the browser: which ways of reaching the relay this device and its network let
   through. Each test gives a verdict (ok, warn, fail, skip), a line for the student and data for the
   report, which is posted to the relay (relay/src/diag.js) and listed in reports.html. */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  /* The relay served next to this page, or another one with ?relay=https://host/relay. */
  const RELAY = (params.get('relay') || `${location.origin}/relay`).replace(/\/+$/, '').replace(/^ws/, 'http');
  const WS_RELAY = RELAY.replace(/^http/, 'ws');
  const LOCAL_RELAY = 'ws://127.0.0.1:8787';
  const VERSION = 1;

  const $ = (id) => document.getElementById(id);
  const started = Date.now();
  const lines = [];
  let results = [];
  let running = false;
  let lastReport = null;

  function log(text) {
    const line = `${((Date.now() - started) / 1000).toFixed(2).padStart(7)}s  ${text}`;
    lines.push(line);
    const el = $('log');
    el.textContent += line + '\n';
    el.scrollTop = el.scrollHeight;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ms = (n) => `${Math.round(n)} ms`;
  function median(list) { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; }
  function p95(list) { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : null; }

  async function fetchJson(url, options = {}, timeoutMs = 10000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const t0 = performance.now();
    try {
      const res = await fetch(url, { cache: 'no-store', ...options, signal: ctrl.signal });
      const text = await res.text();
      let body = null;
      try { body = JSON.parse(text); } catch (e) { /* not JSON */ }
      return { status: res.status, ok: res.ok, body, text: body ? '' : text.slice(0, 300), ms: performance.now() - t0 };
    } finally { clearTimeout(timer); }
  }
  function errorText(e) { return e && e.name === 'AbortError' ? 'timed out' : String(e && e.message || e); }

  // ── The tests ─────────────────────────────────────────────────────────────

  const TESTS = [
    { id: 'site', name: 'This site over HTTPS', run: testSite },
    { id: 'relay', name: 'The relay answers', run: testRelay },
    { id: 'echo', name: 'What the relay sees (proxy?)', run: testEcho },
    { id: 'post', name: 'Sending data (POST 32 KB)', run: testPost },
    { id: 'ws', name: 'WebSocket (wss)', run: testWs },
    { id: 'sse', name: 'Server-sent events', run: testSse },
    { id: 'longpoll', name: 'Long request (held 20 s)', run: testLongPoll },
    { id: 'http-link', name: 'Cameo link over HTTP requests', run: () => testLink('http') },
    { id: 'ws-link', name: 'Cameo link over WebSocket', run: () => testLink('ws') },
    { id: 'local', name: 'Relay inside Cameo on this computer', run: testLocal },
    { id: 'room', name: 'The room of the code typed above', run: testRoom },
  ];

  let longPoll = null;

  async function testSite() {
    const r = await fetchJson(`${location.origin}/api/health`);
    if (!r.ok) return { verdict: 'warn', text: `HTTP ${r.status} (normal when the page is not served by the site)`, data: { status: r.status } };
    return { verdict: 'ok', text: `Reached in ${ms(r.ms)}`, data: { ms: r.ms } };
  }

  async function testRelay() {
    const r = await fetchJson(`${RELAY}/health`);
    if (!r.ok || !r.body) return { verdict: 'fail', text: `HTTP ${r.status} ${r.text}`, data: { status: r.status } };
    const b = r.body;
    return { verdict: 'ok', text: `${ms(r.ms)}. ${b.plugins} Cameo online (${b.httpPlugins ?? 0} over HTTP), ${b.viewers} guides.`, data: { ms: r.ms, ...b } };
  }

  async function testEcho() {
    const t0 = Date.now();
    const r = await fetchJson(`${RELAY}/v1/diag/echo`);
    if (!r.ok || !r.body) return { verdict: 'fail', text: `HTTP ${r.status} ${r.text}` };
    const b = r.body;
    const skew = b.now - (t0 + r.ms / 2);
    /* The site's own Caddy adds "Via: 1.1 Caddy": only another entry means a proxy on the way. */
    const otherVia = String(b.via || '').split(',').map((v) => v.trim()).filter((v) => v && !/^1\.1 Caddy$/i.test(v));
    b.via = otherVia.join(', ') || null;
    const proxy = b.via || b.hops > 1 || b.forwarded;
    return {
      verdict: proxy ? 'warn' : 'ok',
      text: `Seen from ${b.ip}${b.via ? `, through "${b.via}"` : ''}${b.hops > 1 ? `, ${b.hops} addresses in X-Forwarded-For` : ''}. Clock gap ${ms(skew)}.`,
      data: { ...b, clockSkewMs: Math.round(skew) },
    };
  }

  async function testPost() {
    const body = 'x'.repeat(32 * 1024);
    const r = await fetchJson(`${RELAY}/v1/diag/echo`, { method: 'POST', body, headers: { 'Content-Type': 'text/plain' } });
    if (!r.ok || !r.body) return { verdict: 'fail', text: `HTTP ${r.status} ${r.text}` };
    if (r.body.bytes !== body.length) return { verdict: 'warn', text: `${r.body.bytes} bytes arrived out of ${body.length}`, data: r.body };
    return { verdict: 'ok', text: `32 KB in ${ms(r.ms)}`, data: { ms: r.ms } };
  }

  /* hello at once, 5 ticks every 500 ms, an echo of what we send: a proxy that opens the WebSocket
     and then holds the frames shows up as "open, silent". */
  function testWs() {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const d = { openMs: null, helloMs: null, ticks: 0, echoMs: null, closeCode: null, closeReason: '' };
      let ws;
      let sentAt = 0;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try { ws.close(); } catch (e) { /* closed */ }
        if (d.openMs === null) return resolve({ verdict: 'fail', text: `Does not open (close ${d.closeCode ?? 'none'} ${d.closeReason}). Blocked or no proxy support.`, data: d });
        if (d.helloMs === null) return resolve({ verdict: 'fail', text: `Opens in ${ms(d.openMs)} but nothing comes through: a proxy holds the frames.`, data: d });
        if (d.ticks < 4 || d.echoMs === null) return resolve({ verdict: 'warn', text: `Opens, but ${d.ticks}/5 ticks and ${d.echoMs === null ? 'no' : 'an'} echo: frames held or lost.`, data: d });
        resolve({ verdict: 'ok', text: `Open ${ms(d.openMs)}, first frame ${ms(d.helloMs)}, 5/5 ticks, round trip ${ms(d.echoMs)}.`, data: d });
      };
      try { ws = new WebSocket(`${WS_RELAY}/v1/diag/ws?n=5&every=500`); } catch (e) { return resolve({ verdict: 'fail', text: errorText(e) }); }
      ws.onopen = () => { d.openMs = performance.now() - t0; log(`ws: open after ${ms(d.openMs)}`); };
      ws.onmessage = (event) => {
        const f = JSON.parse(event.data);
        const at = performance.now() - t0;
        if (f.type === 'hello') { d.helloMs = at; sentAt = performance.now(); ws.send('ping'); log(`ws: hello after ${ms(at)}`); }
        if (f.type === 'tick') { d.ticks += 1; log(`ws: tick ${f.i} at ${ms(at)}`); }
        if (f.type === 'echo') { d.echoMs = performance.now() - sentAt; log(`ws: echo in ${ms(d.echoMs)}`); }
      };
      ws.onclose = (event) => { d.closeCode = event.code; d.closeReason = event.reason; log(`ws: closed ${event.code} ${event.reason}`); setTimeout(finish, 50); };
      setTimeout(finish, 8000);
    });
  }

  /* A buffering proxy delivers every event at once at the end, instead of one every 500 ms. */
  function testSse() {
    return new Promise((resolve) => {
      if (!window.EventSource) return resolve({ verdict: 'skip', text: 'Not available in this browser' });
      const t0 = performance.now();
      const arrivals = [];
      let helloMs = null;
      let done = false;
      const es = new EventSource(`${RELAY}/v1/diag/sse?n=5&every=500`);
      const finish = (why) => {
        if (done) return;
        done = true;
        es.close();
        const spread = arrivals.length > 1 ? arrivals[arrivals.length - 1] - arrivals[0] : 0;
        const d = { helloMs, ticks: arrivals.length, spreadMs: Math.round(spread), why };
        if (helloMs === null && !arrivals.length) return resolve({ verdict: 'fail', text: `Nothing arrived (${why}).`, data: d });
        if (arrivals.length >= 4 && spread < 800) return resolve({ verdict: 'warn', text: `All events arrived together (${ms(spread)} apart): a proxy buffers the stream.`, data: d });
        if (arrivals.length < 4) return resolve({ verdict: 'warn', text: `${arrivals.length}/5 events.`, data: d });
        resolve({ verdict: 'ok', text: `First event ${ms(helloMs)}, 5/5 ticks spread over ${ms(spread)}.`, data: d });
      };
      es.addEventListener('hello', () => { helloMs = performance.now() - t0; log(`sse: hello after ${ms(helloMs)}`); });
      es.addEventListener('tick', () => { arrivals.push(performance.now() - t0); log(`sse: tick at ${ms(performance.now() - t0)}`); });
      es.addEventListener('end', () => finish('end'));
      es.onerror = () => { if (!done && arrivals.length >= 5) finish('end'); else if (!done && es.readyState === 2) finish('error'); };
      setTimeout(() => finish('timeout'), 9000);
    });
  }

  function startLongPoll() {
    const t0 = performance.now();
    longPoll = fetchJson(`${RELAY}/v1/diag/poll?wait=20000`, {}, 45000)
      .then((r) => ({ ...r, total: performance.now() - t0 }))
      .catch((e) => ({ error: errorText(e), total: performance.now() - t0 }));
  }
  async function testLongPoll() {
    const r = await longPoll;
    const d = { ms: Math.round(r.total), status: r.status ?? null, error: r.error ?? null };
    if (r.error) return { verdict: 'fail', text: `Cut after ${ms(r.total)} (${r.error}). Use short polling.`, data: d };
    if (!r.ok) return { verdict: 'fail', text: `HTTP ${r.status} after ${ms(r.total)}: a proxy cuts long requests.`, data: d };
    return { verdict: 'ok', text: `Held ${ms(r.total)} and answered.`, data: d };
  }

  /* What the plugin and the guide would do: a fake Cameo (plugin) and a guide (viewer) on the relay,
     40 signals at 20 per second from the "Cameo", one signal back from the "guide". */
  function testLink(kind) {
    return new Promise((resolve) => {
      if (kind === 'ws' && results.find((r) => r.id === 'ws')?.verdict === 'fail') {
        return resolve({ verdict: 'skip', text: 'The WebSocket test failed.' });
      }
      const Make = kind === 'http' ? window.RelayHttpSocket : WebSocket;
      const t0 = performance.now();
      const d = { kind, openMs: null, joinMs: null, sent: 0, received: 0, latencies: [], backMs: null, error: null };
      let plugin;
      let viewer;
      let done = false;
      const finish = (why) => {
        if (done) return;
        done = true;
        try { plugin && plugin.close(); } catch (e) { /* closed */ }
        try { viewer && viewer.close(); } catch (e) { /* closed */ }
        const lat = d.latencies;
        const data = { ...d, latencies: undefined, p50: median(lat), p95: p95(lat), why, stats: viewer && viewer.stats };
        if (d.joinMs === null) return resolve({ verdict: 'fail', text: `Could not join (${why}${d.error ? `: ${d.error}` : ''}).`, data });
        const loss = d.sent ? 1 - d.received / d.sent : 1;
        const line = `${d.received}/${d.sent} signals, latency ${ms(data.p50 ?? 0)} median, ${ms(data.p95 ?? 0)} p95; guide → Cameo ${d.backMs === null ? 'lost' : ms(d.backMs)}.`;
        if (loss > 0.05 || d.backMs === null) return resolve({ verdict: 'warn', text: line, data });
        resolve({ verdict: 'ok', text: line, data });
      };
      try { plugin = new Make(`${WS_RELAY}/v1/plugin`); } catch (e) { d.error = errorText(e); return finish('plugin'); }
      plugin.onclose = (e) => { if (!done) { d.error = `plugin closed ${e.code} ${e.reason || ''}`; finish('closed'); } };
      plugin.onmessage = (event) => {
        const f = JSON.parse(event.data);
        if (f.type === 'info' && f.event === 'hello') {
          d.openMs = performance.now() - t0;
          log(`${kind}-link: fake Cameo got code ${f.code} after ${ms(d.openMs)}`);
          joinAs(f.code);
        }
        if (f.signal === 'diag-back') { d.backMs = performance.now() - backAt; log(`${kind}-link: guide → Cameo in ${ms(d.backMs)}`); setTimeout(() => finish('done'), 300); }
      };
      let backAt = 0;
      function joinAs(code) {
        try { viewer = new Make(`${WS_RELAY}/v1/room/${code}`); } catch (e) { d.error = errorText(e); return finish('viewer'); }
        viewer.onclose = (e) => { if (!done) { d.error = `guide closed ${e.code} ${e.reason || ''}`; finish('closed'); } };
        viewer.onmessage = (event) => {
          const f = JSON.parse(event.data);
          if (f.type === 'info' && f.event === 'hello') { d.joinMs = performance.now() - t0; log(`${kind}-link: guide joined after ${ms(d.joinMs)}`); publish(); }
          if (f.signal === 'diag') {
            d.received += 1;
            d.latencies.push(Date.now() - f.t);
            if (d.received === 40) { backAt = performance.now(); viewer.send(JSON.stringify({ signal: 'diag-back', id: 'b1' })); }
          }
        };
      }
      async function publish() {
        for (let i = 0; i < 40 && !done; i += 1) {
          plugin.send(JSON.stringify({ signal: 'diag', id: String(i), t: Date.now() }));
          d.sent += 1;
          await sleep(50);
        }
        await sleep(4000);
        if (!done && d.received < 40) { backAt = performance.now(); try { viewer.send(JSON.stringify({ signal: 'diag-back', id: 'b1' })); } catch (e) { /* closed */ } }
      }
      setTimeout(() => finish('timeout'), 16000);
    });
  }

  /* A relay inside Cameo (Local mode) answers an unknown code with 4404; nothing there closes at once. */
  function testLocal() {
    return new Promise((resolve) => {
      const t0 = performance.now();
      let ws;
      let opened = false;
      let done = false;
      const finish = (verdict, text, data) => { if (done) return; done = true; try { ws.close(); } catch (e) { /* closed */ } resolve({ verdict, text, data }); };
      try { ws = new WebSocket(`${LOCAL_RELAY}/v1/room/AAAAAA`); } catch (e) { return resolve({ verdict: 'skip', text: `The browser refuses it: ${errorText(e)}` }); }
      ws.onopen = () => { opened = true; };
      ws.onclose = (e) => {
        const t = performance.now() - t0;
        if (e.code === 4404 || opened) return finish('ok', `A relay answers on ${LOCAL_RELAY} (${ms(t)}): Cameo is in Local mode here.`, { code: e.code, ms: t });
        finish('skip', `Nothing on ${LOCAL_RELAY} (normal unless Cameo runs here in Local mode).`, { code: e.code, ms: t });
      };
      setTimeout(() => finish('skip', `No answer from ${LOCAL_RELAY}.`, {}), 4000);
    });
  }

  async function testRoom() {
    const raw = $('code').value.replace(/[\s-]/g, '').toUpperCase();
    if (!raw) return { verdict: 'skip', text: 'No code typed.' };
    if (!/^[A-Z]{6}$/.test(raw)) return { verdict: 'warn', text: `"${raw}" is not 6 letters.` };
    const r = await fetchJson(`${RELAY}/v1/room/${raw}`);
    if (r.status === 404) return { verdict: 'fail', text: `The relay does not know ${raw}: Cameo is not on this relay, or the code changed.`, data: r.body };
    if (!r.ok || !r.body) return { verdict: 'fail', text: `HTTP ${r.status}`, data: r.body };
    const b = r.body;
    const kind = results.find((x) => x.id === 'ws')?.verdict === 'ok' ? 'ws' : 'http';
    const Make = kind === 'http' ? window.RelayHttpSocket : WebSocket;
    const joined = await new Promise((resolve) => {
      const t0 = performance.now();
      const got = { hello: null, state: null };
      let s;
      try { s = new Make(`${WS_RELAY}/v1/room/${raw}`); } catch (e) { return resolve(got); }
      s.onmessage = (event) => {
        const f = JSON.parse(event.data);
        if (f.event === 'hello') got.hello = performance.now() - t0;
        if (f.event === 'state') got.state = `${f.status} / ${f.step}`;
      };
      setTimeout(() => { try { s.close(); } catch (e) { /* closed */ } resolve(got); }, 4000);
    });
    const data = { ...b, joinedWith: kind, ...joined };
    if (!b.pluginOnline) return { verdict: 'warn', text: `${raw} exists but its Cameo is offline.`, data };
    if (joined.hello === null) return { verdict: 'fail', text: `${raw}: Cameo online (${b.pluginTransport}), but joining over ${kind} failed.`, data };
    return { verdict: 'ok', text: `${raw}: Cameo online over ${b.pluginTransport}; joined over ${kind} in ${ms(joined.hello)}${joined.state ? `, simulation ${joined.state}` : ''}.`, data };
  }

  // ── Running, the verdict, the report ──────────────────────────────────────

  function drawTests() {
    $('tests').innerHTML = TESTS.map((t) => `<li class="test" id="t-${t.id}"><span class="chip">waiting</span><div><h3>${t.name}</h3><p></p></div></li>`).join('');
  }
  function show(id, verdict, text) {
    const li = $(`t-${id}`);
    const chip = li.querySelector('.chip');
    chip.className = `chip ${verdict}`;
    chip.textContent = verdict === 'run' ? 'running' : verdict;
    li.querySelector('p').textContent = text || '';
  }

  function conclude() {
    const v = (id) => results.find((r) => r.id === id)?.verdict;
    if (v('relay') === 'fail') return { tone: 'fail', title: 'The relay cannot be reached at all', text: 'Even plain HTTPS to the relay fails here. Use another network (phone hotspot), or ask the IT team to allow this site.' };
    if (v('ws') === 'ok' && v('ws-link') !== 'fail') return { tone: 'ok', title: 'WebSocket works here', text: 'Nothing to change: the guide and Cameo can use the normal link.' };
    if (v('http-link') === 'ok' || v('http-link') === 'warn') {
      const lp = v('longpoll') === 'ok' ? '' : ' Long requests are cut: the HTTP link may reconnect often.';
      return { tone: 'warn', title: 'Use the HTTP link', text: `WebSocket does not pass, plain HTTP requests do. The guide switches to them on its own (Link to the relay: Auto); Cameo needs the plugin with the HTTP transport (option "Relay transport").${lp}` };
    }
    if (v('local') === 'ok') return { tone: 'warn', title: 'Only the relay inside Cameo works', text: 'The online relay is blocked; the guide must be open on this same computer, with Cameo in Local mode.' };
    return { tone: 'fail', title: 'No way through found', text: 'Neither WebSocket nor HTTP requests to the relay pass here. Use a phone hotspot or ask the IT team to allow the site.' };
  }

  function environment() {
    const c = navigator.connection || {};
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      connection: c.effectiveType ? { type: c.type || null, effectiveType: c.effectiveType, downlink: c.downlink, rtt: c.rtt } : null,
      page: location.href.split('?')[0],
      relay: RELAY,
      screen: `${screen.width}x${screen.height}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  async function run() {
    if (running) return;
    running = true;
    $('run').disabled = true;
    $('verdict').hidden = true;
    $('log').textContent = '';
    lines.length = 0;
    results = [];
    drawTests();
    log(`relay ${RELAY}, page ${location.href}`);
    startLongPoll();
    for (const t of TESTS) {
      show(t.id, 'run', '');
      log(`── ${t.name}`);
      let r;
      try { r = await t.run(); } catch (e) { r = { verdict: 'fail', text: errorText(e) }; }
      results.push({ id: t.id, name: t.name, verdict: r.verdict, text: r.text, data: r.data || null });
      show(t.id, r.verdict, r.text);
      log(`${r.verdict.toUpperCase()}: ${r.text}`);
    }
    const c = conclude();
    const box = $('verdict');
    box.hidden = false;
    box.dataset.tone = c.tone;
    $('verdict-title').textContent = c.title;
    $('verdict-text').textContent = c.text;
    lastReport = {
      kind: 'browser', v: VERSION, label: $('label').value.trim() || '(no label)',
      startedAt: new Date(started).toISOString(), finishedAt: new Date().toISOString(),
      conclusion: c, env: environment(), results, log: lines.slice(-400),
    };
    $('report-status').textContent = '';
    if ($('send').checked) {
      try {
        const r = await fetchJson(`${RELAY}/v1/diag/report`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(lastReport) });
        $('report-status').textContent = r.ok ? `Report sent (id ${r.body.id}). See All reports.` : `The report could not be sent (HTTP ${r.status}): use Copy the report.`;
      } catch (e) {
        $('report-status').textContent = `The report could not be sent (${errorText(e)}): use Copy the report.`;
      }
    }
    try { localStorage.setItem('mbse-shepherd:diag-label', $('label').value); } catch (e) { /* not kept */ }
    running = false;
    $('run').disabled = false;
  }

  $('relay-url').textContent = RELAY;
  try { $('label').value = localStorage.getItem('mbse-shepherd:diag-label') || ''; } catch (e) { /* no storage */ }
  if (params.get('code')) $('code').value = params.get('code');
  if (params.get('label')) $('label').value = params.get('label');
  drawTests();
  $('setup').addEventListener('submit', (e) => { e.preventDefault(); run(); });
  $('copy').addEventListener('click', async () => {
    const text = JSON.stringify(lastReport || { log: lines }, null, 2);
    try { await navigator.clipboard.writeText(text); $('copy').textContent = 'Copied'; } catch (e) { $('log').textContent = text; }
    setTimeout(() => { $('copy').textContent = 'Copy the report'; }, 1500);
  });
  if (params.get('auto') === '1') run();
})();
