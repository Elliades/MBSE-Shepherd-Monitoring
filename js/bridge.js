/* Link to the Cameo of the student, through the relay (protocol: relay/PROTOCOL.md of the
   MBSE Shepard monitoring project). The student types the 6-letter code shown by the plugin
   (Cameo menu OMF > Relay pairing code). Then "Open in Cameo" selects the element in Cameo.

   window.Bridge.state()          { status, code, error }  status: off | connecting | connected | waiting
   window.Bridge.connect(code)    join the room of that code
   window.Bridge.disconnect()     leave and forget the code
   window.Bridge.open(id, type)   show the element in Cameo (a Promise)
   window.Bridge.onChange(fn)     called with the state on every change */
(function () {
  const CFG = window.COURSE_CONFIG || {};
  const KEY = 'mbse-shepherd:bridge-code';
  const STEPS = [500, 1000, 2000, 4000, 8000, 15000];
  const DIAGRAMS = new Set(['ucd', 'ibd', 'sd', 'ad', 'stm', 'bdd', 'req']);

  let socket = null;
  let code = '';
  let tried = '';
  let status = 'off';
  let error = '';
  let attempt = 0;
  let timer = null;
  let lastSeq = 0;
  let reqCounter = 0;
  const waiting = new Map();
  const listeners = [];

  function relayBase() {
    let raw = new URLSearchParams(location.search).get('relay') || CFG.relayUrl || '';
    try { raw = raw || localStorage.getItem('mbse-shepherd:relay') || ''; } catch (e) { /* no storage */ }
    raw = raw.trim().replace(/\/+$/, '');
    if (!raw) return '';
    return raw.replace(/^http/, 'ws');
  }
  function normalize(text) {
    const c = String(text || '').replace(/[\s-]/g, '').toUpperCase();
    return /^[A-Z]{6}$/.test(c) ? c : '';
  }
  function set(next, message) {
    status = next;
    error = message || '';
    listeners.forEach((fn) => { try { fn(state()); } catch (e) { /* a listener must not break the others */ } });
  }
  function state() { return { status, code, tried, error, relay: relayBase() }; }
  function failWaiting(reason) {
    waiting.forEach((w) => w.reject(new Error(reason)));
    waiting.clear();
  }

  function open() {
    clearTimeout(timer);
    const base = relayBase();
    if (!code) return set('off');
    if (!base) return set('off', 'The relay address is not set (relayUrl in content/config.js).');
    set('connecting');
    let ws;
    try { ws = new WebSocket(`${base}/v1/room/${code}?lastSeq=${lastSeq}`); } catch (e) { return retry(); }
    socket = ws;
    ws.onopen = () => { attempt = 0; };
    ws.onmessage = (event) => {
      let frame;
      try { frame = JSON.parse(event.data); } catch (e) { return; }
      if (socket !== ws) return;
      if (frame.type === 'info') {
        if (frame.event === 'hello') set(frame.pluginOnline ? 'connected' : 'waiting', frame.pluginOnline ? '' : 'Cameo is not connected to the relay yet.');
        else if (frame.event === 'plugin-online') set('connected');
        else if (frame.event === 'plugin-offline') set('waiting', 'Cameo is not connected to the relay.');
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
      if (event.code === 4400 || event.code === 4404) { code = ''; forget(); return set('off', 'This relay does not know that code. Check the code shown in Cameo, and that Cameo uses the same relay.'); }
      if (event.code === 4410) { code = ''; forget(); return set('off', 'The session ended. Get a new code from Cameo.'); }
      retry();
    };
    ws.onerror = () => { /* onclose follows */ };
  }
  function retry() {
    const base = STEPS[Math.min(attempt, STEPS.length - 1)];
    attempt += 1;
    set('waiting', 'Reconnecting...');
    timer = setTimeout(open, base * (0.8 + Math.random() * 0.4));
  }
  function forget() { try { localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ } }

  function connect(text) {
    const c = normalize(text);
    if (!c) { tried = String(text || ''); set('off', 'A code is 6 letters (A to Z). Check what you typed.'); return false; }
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
    disconnect: () => disconnect(false),
    open: show,
    onChange: (fn) => listeners.push(fn),
    start() {
      let saved = '';
      try { saved = localStorage.getItem(KEY) || ''; } catch (e) { /* no storage */ }
      const fromUrl = new URLSearchParams(location.search).get('code');
      if (fromUrl) connect(fromUrl); else if (normalize(saved)) { code = normalize(saved); open(); }
    },
  };
})();
