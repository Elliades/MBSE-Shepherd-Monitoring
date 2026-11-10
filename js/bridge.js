/* Link to the Cameo of the student, through the relay (protocol: relay/PROTOCOL.md of the
   MBSE Shepard monitoring project). The student types the 6-letter code shown by the plugin
   (Cameo menu OMF > Relay pairing code). Then "Open in Cameo" selects the element in Cameo.

   window.Bridge.state()          { status, code, error, problem, relay, relayDefault, relayCustom, relayForced,
                                    transport ('ws' | 'http'), transportPref, transportWhy (why it fell back to HTTP) }
                                  problem: '' | 'relay' (unreachable) | 'cameo' (not online) | 'code' | 'config'  status: off | connecting | connected | waiting
   window.Bridge.connect(code)    join the room of that code
   window.Bridge.disconnect()     leave and forget the code
   window.Bridge.open(id, type, spec)   show the element in Cameo (a Promise)
   window.Bridge.openByName(spec) same, for an element that has no id yet: Cameo finds it by its name.
                                  Rejects with Error('not-found') | Error('ambiguous') | another message
   window.Bridge.onChange(fn)     called with the state on every change
   window.Bridge.setRelay(addr)   use another relay address ('' = back to the default): { ok, error }
   window.Bridge.setTransport(t)  how to reach the relay: 'auto' (WebSocket, else HTTP), 'ws' or 'http' (js/relay-http.js)
   window.Bridge.onFrame(fn)      called with what Cameo sends on its own, for the simulation panel:
                                  { kind: 'signal', signal, id, seq } a signal of the simulation
                                  { kind: 'state', status, step }     where the simulation is now
                                                                      (+ drones: [{ id, step, role, name }], master, with several drones)
                                  { kind: 'hello', resumed }           joined the room (resumed: it replays what was missed)
                                  { kind: 'resync', reason }           signals were lost: start over
                                  { kind: 'peer', data }               what another page of the same code shared
   window.Bridge.call(category, name, args, timeoutMs)   any method of the plugin's relay allow-list (a Promise of
                                  its result; rejects with 'not-connected', 'timeout', 'unknown-method'…). Part 3
                                  uses simtest/start, send, states and stop for its "Validate in Cameo" button.
   window.Bridge.sendPeer(data)   share an object with the other pages of the same code (not Cameo): true if sent */
(function () {
  const CFG = window.COURSE_CONFIG || {};
  const KEY = 'mbse-shepherd:bridge-code';
  const RELAY_KEY = 'mbse-shepherd:relay';
  const STEPS = [500, 1000, 2000, 4000, 8000, 15000];
  const TRANSPORT_KEY = 'mbse-shepherd:transport';
  /* "auto": a WebSocket that opens but brings nothing in that time, or that fails to open twice, is
     replaced by the HTTP link (js/relay-http.js) for as long as the page stays open. */
  const HELLO_TIMEOUT_MS = 6000;
  const WS_FAILS_BEFORE_HTTP = 2;
  const LOCAL_RELAY = 'ws://127.0.0.1:8787';
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
  let onLocal = false;
  let probing = false;
  let viaHttp = false;
  let wsFails = 0;
  let fellBack = '';
  let helloTimer = null;
  let reqCounter = 0;
  const waiting = new Map();
  const listeners = [];
  const frameListeners = [];

  function isLocalHost(name) { return /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/.test(name); }
  /* "auto": the relay that is served next to the guide (/relay/), or the one of this computer when the
     guide itself runs on this computer. */
  function autoRelay() {
    if (isLocalHost(location.hostname)) return LOCAL_RELAY;
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
  /* The address of the page (?relay=) wins, then the one typed in the Cameo dialog, then content/config.js.
     On "auto", a code that the online relay does not know is tried on the relay of this computer (the Cameo
     "Local" mode): onLocal says that this is where we are now. */
  function relayBase() { return onLocal ? LOCAL_RELAY : toBase(forcedRelay() || storedRelay() || CFG.relayUrl); }
  function isAuto() { return !forcedRelay() && !storedRelay() && String(CFG.relayUrl || '').trim() === 'auto'; }
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
  /* How to reach the relay: 'auto' (WebSocket, else HTTP), 'ws' or 'http'. ?transport= wins, then the
     choice made in the Cameo dialog, then content/config.js (relayTransport). */
  function transportPref() {
    let stored = '';
    try { stored = localStorage.getItem(TRANSPORT_KEY) || ''; } catch (e) { /* no storage */ }
    const raw = new URLSearchParams(location.search).get('transport') || stored || CFG.relayTransport || 'auto';
    return ['ws', 'http'].includes(raw) ? raw : 'auto';
  }
  /* The relay inside Cameo (port 8787 of this computer) speaks WebSocket only; the Node relay has the HTTP link. */
  function httpPossible(base) {
    const u = new URL(base.replace(/^ws/, 'http'));
    return !!window.RelayHttpSocket && !(isLocalHost(u.hostname) && u.port === '8787');
  }
  function usesHttp(base) {
    const pref = transportPref();
    return httpPossible(base) && (pref === 'http' || (pref === 'auto' && viaHttp));
  }
  function state() {
    const base = relayBase();
    return {
      status, code, tried, error, problem, relay: base, relayDefault: toBase(CFG.relayUrl), relayCustom: !!storedRelay(), relayForced: !!forcedRelay(), relayLocal: onLocal,
      transport: base && usesHttp(base) ? 'http' : 'ws', transportPref: transportPref(), transportWhy: fellBack,
    };
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
    const http = usesHttp(base);
    const url = `${base}/v1/room/${code}${lastSeq ? `?lastSeq=${lastSeq}` : ''}`;
    try { ws = http ? new window.RelayHttpSocket(url) : new WebSocket(url); } catch (e) { return retry(`Cannot open ${base}.`); }
    socket = ws;
    let greeted = false;
    ws.onopen = () => {
      openedAt = Date.now();
      probing = false;
      /* A proxy may accept the WebSocket and then hold every frame: nothing ever comes in. */
      if (!http && transportPref() === 'auto' && httpPossible(base)) {
        clearTimeout(helloTimer);
        helloTimer = setTimeout(() => { if (socket === ws && !greeted) fallBackToHttp('The WebSocket opened but nothing came through it (a proxy?)'); }, HELLO_TIMEOUT_MS);
      }
    };
    ws.onmessage = (event) => {
      let frame;
      try { frame = JSON.parse(event.data); } catch (e) { return; }
      if (socket !== ws) return;
      if (frame.type === 'info') {
        if (frame.event === 'hello') {
          greeted = true;
          clearTimeout(helloTimer);
          if (!http) wsFails = 0;
          set(frame.pluginOnline ? 'connected' : 'waiting', frame.pluginOnline ? '' : 'Cameo is not connected to the relay yet.', 'cameo');
          emit({ kind: 'hello', resumed: lastSeq > 0 });
        }
        else if (frame.event === 'plugin-online') set('connected');
        else if (frame.event === 'plugin-offline') set('waiting', 'Cameo is not connected to the relay.', 'cameo');
        else if (frame.event === 'state' && typeof frame.step === 'string') {
          const st = { kind: 'state', status: String(frame.status || ''), step: frame.step };
          /* several drones (Part 4, js/sim-fleet.js): one { id, step, role, name } each, and who leads */
          if (Array.isArray(frame.drones)) st.drones = frame.drones.filter((d) => d && typeof d.id === 'string' && typeof d.step === 'string');
          if (typeof frame.master === 'string') st.master = frame.master;
          emit(st);
        }
        else if (frame.event === 'peer' && frame.data && typeof frame.data === 'object') emit({ kind: 'peer', data: frame.data });
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
      if (event.code === 4400 || event.code === 4404) {
        /* Not on the online relay: Cameo may be in Local mode, so look on this computer before giving up. */
        if (isAuto() && !onLocal && autoRelay() !== LOCAL_RELAY) { onLocal = true; probing = true; lastSeq = 0; attempt = 0; return open(); }
        return giveUp('This relay does not know that code. Check the code shown in Cameo, and that Cameo uses the same relay.');
      }
      /* The relay of this computer does not answer: either no Cameo in Local mode here, or the browser forbids it. */
      if (probing && !openedAt) {
        return giveUp(location.protocol === 'https:'
          ? 'No relay answers for that code. If Cameo is in Local mode, this browser may block a secure page from reaching this computer (Safari does): use Chrome or Firefox, or open the guide on this computer.'
          : 'The online relay does not know that code, and no relay runs on this computer. Check the code shown in Cameo.');
      }
      if (event.code === 4410) { code = ''; forget(); return set('off', 'The session ended. Get a new code from Cameo.', 'code'); }
      /* A WebSocket that never opens, twice in a row: try the same relay over plain HTTP requests. */
      if (!http && !openedAt && transportPref() === 'auto' && httpPossible(base) && ++wsFails >= WS_FAILS_BEFORE_HTTP) {
        return fallBackToHttp(`The WebSocket could not connect (${event.code || 'no code'})`);
      }
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
  function fallBackToHttp(why) {
    const ws = socket;
    socket = null;
    clearTimeout(helloTimer);
    if (ws) ws.close();
    failWaiting('connection-lost');
    viaHttp = true;
    fellBack = why;
    attempt = 0;
    open();
  }
  /* 'auto' | 'ws' | 'http', kept in this browser ('' = back to the default). Reconnects when a code is set. */
  function setTransport(pref) {
    try {
      if (pref && pref !== 'auto') localStorage.setItem(TRANSPORT_KEY, pref); else localStorage.removeItem(TRANSPORT_KEY);
    } catch (e) { /* not kept */ }
    viaHttp = false;
    wsFails = 0;
    fellBack = '';
    if (code) {
      const ws = socket;
      socket = null;
      clearTimeout(helloTimer);
      if (ws) ws.close();
      failWaiting('relay-changed');
      attempt = 0;
      open();
    } else {
      set(status, error, problem);
    }
  }
  function giveUp(message) { code = ''; onLocal = false; probing = false; forget(); set('off', message, 'code'); }
  function forget() { try { localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ } }

  function connect(text) {
    const c = normalize(text);
    if (!c) { tried = String(text || ''); set('off', 'A code is 6 letters (A to Z). Check what you typed.', 'code'); return false; }
    disconnect(true);
    code = c;
    tried = c;
    onLocal = false;
    probing = false;
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
    onLocal = false;
    probing = false;
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
      onLocal = false;
      probing = false;
      lastSeq = 0;
      attempt = 0;
      open();
    } else {
      set(status, error, problem);
    }
    return { ok: true };
  }

  function call(category, name, args, timeoutMs) {
    return new Promise((resolve, reject) => {
      if (!socket || socket.readyState !== 1 || status !== 'connected') return reject(new Error('not-connected'));
      const req = 'r' + (++reqCounter);
      const t = setTimeout(() => { waiting.delete(req); reject(new Error('timeout')); }, timeoutMs || 10000);
      waiting.set(req, { resolve, reject, timer: t });
      socket.send(JSON.stringify({ req, category, name, args: args || [] }));
    });
  }
  /* Shared with the other pages paired with the same code (the phone and the computer), not with Cameo.
     Works while Cameo is away too, as long as the room exists. false when not sent. */
  function sendPeer(data) {
    if (!socket || socket.readyState !== 1 || (status !== 'connected' && status !== 'waiting')) return false;
    try { socket.send(JSON.stringify({ peer: data })); } catch (e) { return false; }
    return true;
  }
  const NOT_REACHED = new Set(['not-connected', 'timeout']);
  /* Metaclass names Cameo reports (model/getElementsByName), per guide type. */
  const METACLASS = {
    package: ['Package'], block: ['Class'], iface: ['Class'], usecase: ['UseCase'], activity: ['Activity'],
    state: ['State'], signal: ['Signal'], stm: ['StateMachine'], actor: ['Actor'], choice: ['Pseudostate']
  };
  /* Last resort for an element selectByName does not find: list the elements with that name, keep the one
     that fits the type, then select it by id. Rejects with 'not-found' or 'ambiguous'. */
  function findThenSelect(spec) {
    return call('model', 'getElementsByName', [{ name: spec.name }]).then((list) => {
      list = Array.isArray(list) ? list.filter((e) => e && e.id && e.name === spec.name) : [];
      const kinds = METACLASS[spec.type];
      const fit = kinds ? list.filter((e) => kinds.indexOf(e.metaclass) >= 0) : list;
      const pick = fit.length ? fit : (list.length === 1 ? list : []);
      if (!pick.length) throw new Error('not-found');
      if (pick.length > 1) throw new Error('ambiguous');
      return call('browser', 'select', [{ elementId: pick[0].id }]);
    });
  }
  /* A diagram is opened; anything else is selected in the Model Browser.
     If the id is unknown to the model (it was edited), fall back to the name when spec is given. */
  function show(id, type, spec) {
    const arg = [{ elementId: id }];
    const select = () => call('browser', 'select', arg);
    const byId = DIAGRAMS.has(type) ? call('diagram', 'open', arg).catch(select) : select();
    return spec ? byId.catch((e) => (e && NOT_REACHED.has(e.message) ? Promise.reject(e) : showByName(spec))) : byId;
  }

  /* An element the student creates has no UUID in the guide: Cameo looks it up by its name.
     spec = { name, type, path, kinds, qualifiedName } (see "Links by name" in README.md). */
  function showByName(spec) {
    if (spec.strict) {
      return call('model', 'getByQualifiedName', [spec.qualifiedName])
        .catch((e) => Promise.reject(e && NOT_REACHED.has(e.message) ? e : new Error('not-found')))
        .then((found) => show(found.id, spec.type));
    }
    const arg = [spec];
    const select = () => call('browser', 'selectByName', arg)
      .catch((e) => (e && (e.message === 'ambiguous' || NOT_REACHED.has(e.message)) ? Promise.reject(e) : findThenSelect(spec)));
    return DIAGRAMS.has(spec.type) ? call('diagram', 'openByName', arg).catch(select) : select();
  }

  window.Bridge = {
    state,
    connect,
    setRelay,
    setTransport,
    disconnect: () => disconnect(false),
    open: show,
    openByName: showByName,
    call,
    onChange: (fn) => listeners.push(fn),
    onFrame: (fn) => frameListeners.push(fn),
    sendPeer,
    start() {
      let saved = '';
      try { saved = localStorage.getItem(KEY) || ''; } catch (e) { /* no storage */ }
      const fromUrl = new URLSearchParams(location.search).get('code');
      if (fromUrl) connect(fromUrl); else if (normalize(saved)) { code = normalize(saved); open(); }
    },
  };
})();
