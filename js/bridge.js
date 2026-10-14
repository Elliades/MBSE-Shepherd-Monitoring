/* Link to the Cameo of the student, through the relay (protocol: relay/PROTOCOL.md of the
   MBSE Shepard monitoring project). The student types the 6-letter code shown by the plugin
   (Cameo menu OMF > Relay pairing code). Then "Open in Cameo" selects the element in Cameo.

   window.Bridge.state()          { status, code, error, problem, relay, relayDefault, relayCustom, relayForced }
                                  problem: '' | 'relay' (unreachable) | 'cameo' (not online) | 'code' | 'config'  status: off | connecting | connected | waiting
   window.Bridge.connect(code)    join the room of that code
   window.Bridge.disconnect()     leave and forget the code
   window.Bridge.open(id, type)   show the element in Cameo (a Promise)
   window.Bridge.onChange(fn)     called with the state on every change
   window.Bridge.setRelay(addr)   use another relay address ('' = back to the default): { ok, error }
   window.Bridge.onFrame(fn)      called with what Cameo sends on its own, for the simulation panel:
                                  { kind: 'signal', signal, id, seq } a signal of the simulation
                                  { kind: 'state', status, step }     where the simulation is now
                                  { kind: 'hello', resumed }           joined the room (resumed: it replays what was missed)
                                  { kind: 'resync', reason }           signals were lost: start over */
(function () {
  const CFG = window.COURSE_CONFIG || {};
  const KEY = 'mbse-shepherd:bridge-code';
  const RELAY_KEY = 'mbse-shepherd:relay';
  const STEPS = [500, 1000, 2000, 4000, 8000, 15000];
  const DIAGRAMS = new Set(['ucd', 'ibd', 'sd', 'ad', 'stm', 'bdd', 'req']);

  let socket = null;
  let code = '';
  let tried = '';
  let status = 'off';
  let error = '';
  let problem = '';
  let attempt = 0;
  let timer = null;
  let lastSeq = 0;
  let reqCounter = 0;
  const waiting = new Map();
  const listeners = [];
  const frameListeners = [];

  function isLocalHost(name) { return /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/.test(name); }
  /* "auto": the relay that is served next to the guide (/relay/), or the one of this computer when the
     guide itself runs on this computer. */
  function autoRelay() {
    if (isLocalHost(location.hostname)) return 'ws://127.0.0.1:8787';
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/relay`;
  }
  function toBase(text) {
    const raw = String(text || '').trim().replace(/\/+$/, '');
    if (raw === 'auto') return autoRelay();
    return raw ? raw.replace(/^http/, 'ws') : '';
  }
  function forcedRelay() { return new URLSearchParams(location.search).get('relay') || ''; }
  function storedRelay() {
    try { return localStorage.getItem(RELAY_KEY) || ''; } catch (e) { return ''; }
  }
  /* The address of the page (?relay=) wins, then the one typed in the Cameo dialog, then content/config.js. */
  function relayBase() { return toBase(forcedRelay() || storedRelay() || CFG.relayUrl); }
  function normalize(text) {
    const c = String(text || '').replace(/[\s-]/g, '').toUpperCase();
    return /^[A-Z]{6}$/.test(c) ? c : '';
  }
  function set(next, message, kind) {
    status = next;
    error = message || '';
    problem = message ? (kind || '') : '';
    listeners.forEach((fn) => { try { fn(state()); } catch (e) { /* a listener must not break the others */ } });
  }
  function state() {
    return { status, code, tried, error, problem, relay: relayBase(), relayDefault: toBase(CFG.relayUrl), relayCustom: !!storedRelay(), relayForced: !!forcedRelay() };
  }
  function emit(frame) {
    frameListeners.forEach((fn) => { try { fn(frame); } catch (e) { /* a listener must not break the others */ } });
  }
  function failWaiting(reason) {
    waiting.forEach((w) => w.reject(new Error(reason)));
    waiting.clear();
  }

  function open() {
    clearTimeout(timer);
    const base = relayBase();
    if (!code) return set('off');
    if (!base) return set('off', 'The relay address is not set (relayUrl in content/config.js).', 'config');
    /* A secure page may not open an insecure socket to another machine: it would retry for ever. */
    if (location.protocol === 'https:' && /^ws:\/\//.test(base) && !isLocalHost(new URL(base.replace(/^ws/, 'http')).hostname)) {
      return set('off', `This page is secure (https) but the relay address is not (${base}). Use a wss:// address.`, 'config');
    }
    set('connecting');
    let ws;
    let openedAt = 0;
    try { ws = new WebSocket(`${base}/v1/room/${code}${lastSeq ? `?lastSeq=${lastSeq}` : ''}`); } catch (e) { return retry(`Cannot open ${base}.`); }
    socket = ws;
    ws.onopen = () => { openedAt = Date.now(); };
    ws.onmessage = (event) => {
      let frame;
      try { frame = JSON.parse(event.data); } catch (e) { return; }
      if (socket !== ws) return;
      if (frame.type === 'info') {
        if (frame.event === 'hello') {
          set(frame.pluginOnline ? 'connected' : 'waiting', frame.pluginOnline ? '' : 'Cameo is not connected to the relay yet.', 'cameo');
          emit({ kind: 'hello', resumed: lastSeq > 0 });
        }
        else if (frame.event === 'plugin-online') set('connected');
        else if (frame.event === 'plugin-offline') set('waiting', 'Cameo is not connected to the relay.', 'cameo');
        else if (frame.event === 'state' && typeof frame.step === 'string') emit({ kind: 'state', status: String(frame.status || ''), step: frame.step });
        else if (frame.event === 'resync') {
          /* The relay no longer has what we missed. A reset room starts counting again from its own seq. */
          if (frame.reason === 'room-reset') lastSeq = typeof frame.seq === 'number' ? frame.seq : 0;
          emit({ kind: 'resync', reason: String(frame.reason || '') });
        }
        return;
      }
      if (typeof frame.signal === 'string') {
        /* Signals are in order; one we have already seen (replay after a reconnection) is ignored. */
        if (typeof frame.seq === 'number') {
          if (frame.seq <= lastSeq) return;
          lastSeq = frame.seq;
        }
        emit({ kind: 'signal', signal: frame.signal, id: typeof frame.id === 'string' ? frame.id : '', seq: frame.seq });
        return;
      }
      if (typeof frame.seq === 'number') lastSeq = Math.max(lastSeq, frame.seq);
      if (typeof frame.res === 'string' && waiting.has(frame.res)) {
        const w = waiting.get(frame.res);
        waiting.delete(frame.res);
        clearTimeout(w.timer);
        if (frame.ok) w.resolve(frame.result); else w.reject(new Error(typeof frame.error === 'string' ? frame.error : 'Cameo refused'));
      }
    };
    ws.onclose = (event) => {
      if (socket !== ws) return;
      socket = null;
      failWaiting('connection-lost');
      if (event.code === 4400 || event.code === 4404) { code = ''; forget(); return set('off', 'This relay does not know that code. Check the code shown in Cameo, and that Cameo uses the same relay.', 'code'); }
      if (event.code === 4410) { code = ''; forget(); return set('off', 'The session ended. Get a new code from Cameo.', 'code'); }
      /* Start the waiting over only after a connection that held; one that drops at once must not retry at once. */
      if (openedAt && Date.now() - openedAt > 30000) attempt = 0;
      retry(openedAt ? 'The connection to the relay was lost.' : `Cannot reach the relay at ${base}.`);
    };
    ws.onerror = () => { /* onclose follows */ };
  }
  function retry(why) {
    const base = STEPS[Math.min(attempt, STEPS.length - 1)];
    attempt += 1;
    set('waiting', `${why || 'Connection lost.'} Retrying...`, 'relay');
    timer = setTimeout(open, base * (0.8 + Math.random() * 0.4));
  }
  function forget() { try { localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ } }

  function connect(text) {
    const c = normalize(text);
    if (!c) { tried = String(text || ''); set('off', 'A code is 6 letters (A to Z). Check what you typed.', 'code'); return false; }
    disconnect(true);
    code = c;
    tried = c;
    lastSeq = 0;
    attempt = 0;
    try { localStorage.setItem(KEY, c); } catch (e) { /* private mode */ }
    open();
    return true;
  }
  function disconnect(keepError) {
    clearTimeout(timer);
    const ws = socket;
    socket = null;
    if (ws) ws.close();
    failWaiting('disconnected');
    code = '';
    forget();
    if (!keepError) set('off');
  }

  /* Another relay address, kept in this browser. '' goes back to the default. Reconnects when a code is set. */
  function setRelay(text) {
    const raw = String(text || '').trim();
    if (raw && raw !== 'auto' && !/^(wss?|https?):\/\/[^\s/?#]+/i.test(raw)) {
      return { ok: false, error: 'An address looks like wss://host or wss://host/relay.' };
    }
    try {
      if (raw) localStorage.setItem(RELAY_KEY, raw); else localStorage.removeItem(RELAY_KEY);
    } catch (e) { return { ok: false, error: 'This browser does not let the guide remember the address.' }; }
    if (code) {
      const ws = socket;
      socket = null;
      if (ws) ws.close();
      failWaiting('relay-changed');
      lastSeq = 0;
      attempt = 0;
      open();
    } else {
      set(status, error, problem);
    }
    return { ok: true };
  }

  function call(category, name, args) {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== 1 || status !== 'connected') return reject(new Error('not-connected'));
      const req = 'r' + (++reqCounter);
      const t = setTimeout(() => { waiting.delete(req); reject(new Error('timeout')); }, 10000);
      waiting.set(req, { resolve, reject, timer: t });
      socket.send(JSON.stringify({ req, category, name, args: args || [] }));
    });
  }
  /* A diagram is opened; anything else is selected in the Model Browser. */
  function show(id, type) {
    const arg = [{ elementId: id }];
    const select = () => call('browser', 'select', arg);
    return DIAGRAMS.has(type) ? call('diagram', 'open', arg).catch(select) : select();
  }

  window.Bridge = {
    state,
    connect,
    setRelay,
    disconnect: () => disconnect(false),
    open: show,
    onChange: (fn) => listeners.push(fn),
    onFrame: (fn) => frameListeners.push(fn),
    start() {
      let saved = '';
      try { saved = localStorage.getItem(KEY) || ''; } catch (e) { /* no storage */ }
      const fromUrl = new URLSearchParams(location.search).get('code');
      if (fromUrl) connect(fromUrl); else if (normalize(saved)) { code = normalize(saved); open(); }
    },
  };
})();
