/* Two modes for the simulation widgets of the guide.

   Cameo mode (paired, by default): a signal clicked in the page goes to the simulation of Cameo, and the
   page moves only when Cameo answers. The page draws what Cameo's state machine really did: a wrong model
   shows up here as it is, with an error when Cameo does not move.
   Demo mode (not paired, or chosen): the page plays its own copy of the machine, and a banner says so.

   Plugin calls (relay allow-list): simtest/start runs the simulation of the SOI block, simtest/send injects
   a signal, simtest/states gives the active states (entries and exits are tracked, unlike the state frames
   of the pasture, which never go back), simtest/stop ends it. The plugin only sends into a simulation it
   started itself, so the first signal starts one when Cameo answers "no execution".

   window.CameoSim.ready()          Cameo mode: paired and not switched to the demo
   window.CameoSim.send(signal)     a Promise of { moved, states, before }; rejects when Cameo refuses
   window.CameoSim.restart()        stop, then start again from the initial state
   window.CameoSim.onStates(fn)     fn(names) at every change of the active states Cameo reports
                                    (leaf state first, then the states around it)
   window.CameoSim.bar(el)          the mode banner (demo, or linked to Cameo) and the last answer, inside el
   The block comes from MODEL_LINKS[COURSE_CONFIG.simBlock || 'soi-block'] (id, else its name). */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const KEY = 'mbse-shepherd.cameoDrive';
  const ROOT = '<root>';
  const listeners = [];
  const stateListeners = [];
  let demo = false;
  try { demo = localStorage.getItem(KEY) === 'demo'; } catch (e) { /* Cameo mode by default */ }
  let started = false;
  let starting = null;
  let queue = Promise.resolve();
  let last = { kind: '', text: '' };
  let known = null; /* active states last reported by Cameo, as a string key */
  let watchId = 0;

  const linked = () => B.state().status === 'connected';
  const ready = () => !demo && linked();
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  function tell(kind, text) { last = { kind, text }; listeners.forEach((fn) => { try { fn(last); } catch (e) { /* next */ } }); }

  function block() {
    const L = (window.MODEL_LINKS || {})[(window.COURSE_CONFIG || {}).simBlock || 'soi-block'] || { name: 'SOI - Pasture Sentinel' };
    if (L.id) return Promise.resolve(L.id);
    return B.call('model', 'getElementsByName', [{ name: L.name }]).then((list) => {
      const hit = (Array.isArray(list) ? list : []).find((e) => e && e.id && e.name === L.name && e.metaclass === 'Class');
      if (!hit) throw new Error(`no block named "${L.name}" in the open project`);
      return hit.id;
    });
  }
  function start() {
    if (!starting) {
      tell('busy', 'Starting the simulation in Cameo…');
      starting = block()
        .then((id) => B.call('simtest', 'start', [{ elementId: id }], 30000))
        .then(() => { started = true; known = null; })
        .finally(() => { starting = null; });
    }
    return starting;
  }
  /* The root object of a fresh execution takes a moment to exist ("retry in a second"). */
  async function retrying(fn) {
    for (let i = 0; i < 8; i++) {
      try { return await fn(); } catch (e) {
        const m = String(e && e.message);
        if (/no execution/i.test(m)) { started = false; await start(); continue; }
        if (/not available yet|retry/i.test(m)) { await pause(500); continue; }
        throw e;
      }
    }
    throw new Error('Cameo did not answer in time');
  }
  async function read() {
    const r = await B.call('simtest', 'states', [{ paths: [ROOT] }]);
    const names = (((r || {}).states || {})[ROOT] || []).filter((n) => n && !/^error:/.test(n));
    const key = names.join('|');
    if (key !== known) {
      known = key;
      stateListeners.forEach((fn) => { try { fn(names.slice()); } catch (e) { /* next */ } });
    }
    return names;
  }
  /* After a signal, the machine can go on by itself (a do activity sends the next signal): keep reading
     for a while so the page sees every step. A newer watch ends this one. */
  async function watch(before, ms) {
    const id = ++watchId;
    const end = Date.now() + ms;
    let names = before;
    let moved = false;
    while (Date.now() < end && id === watchId) {
      await pause(350);
      try { names = await read(); } catch (e) { break; }
      if (names.join('|') !== before.join('|')) moved = true;
    }
    return { moved, states: names };
  }
  async function push(signal) {
    const before = await retrying(read);
    await retrying(() => B.call('simtest', 'send', [signal, null]));
    /* the answer is in as soon as the states change; the watch goes on in the background */
    const first = await new Promise((resolve) => {
      let done = false;
      const off = onStatesOnce((names) => { if (!done) { done = true; resolve({ moved: true, states: names }); } });
      watch(before, 6000).then((r) => { off(); if (!done) { done = true; resolve(r); } });
    });
    return Object.assign({ before }, first);
  }
  function onStatesOnce(fn) {
    const wrap = (names) => { const i = stateListeners.indexOf(wrap); if (i >= 0) stateListeners.splice(i, 1); fn(names); };
    stateListeners.push(wrap);
    return () => { const i = stateListeners.indexOf(wrap); if (i >= 0) stateListeners.splice(i, 1); };
  }
  const leaf = (names) => (names && names[0]) || 'no state';
  function send(signal) {
    if (!ready()) return Promise.reject(new Error(demo ? 'demo' : 'not-connected'));
    tell('busy', `Sending ${signal} to Cameo…`);
    const run = queue.then(() => push(signal)).then((r) => {
      if (r.moved) tell('ok', `Cameo: ${signal} → ${leaf(r.states)}`);
      else tell('no', `Cameo received ${signal} but stayed in ${leaf(r.before)}. Check, in your state machine, that a transition leaves ${leaf(r.before)} with the trigger ${signal}.`);
      return r;
    }, (e) => {
      tell('no', `Cameo refused ${signal}: ${e && e.message}`);
      throw e;
    });
    queue = run.catch(() => {});
    return run;
  }
  function restart() {
    if (!ready()) return Promise.resolve();
    const run = queue.then(async () => {
      await B.call('simtest', 'stop', []).catch(() => {});
      started = false;
      await start();
      const names = await retrying(read);
      tell('ok', `Cameo restarted the simulation: ${leaf(names)}.`);
    }).catch((e) => tell('no', `Cameo could not restart the simulation: ${e && e.message}`));
    queue = run;
    return run;
  }
  function setDemo(v) {
    demo = !!v;
    try { localStorage.setItem(KEY, demo ? 'demo' : 'cameo'); } catch (e) { /* not kept */ }
    tell('', '');
    if (ready() && started) { known = null; read().catch(() => {}); }
  }
  /* The student may click in Cameo's own Trigger list too: a frame from Cameo means "read the states again". */
  B.onFrame((f) => {
    if (!ready() || !started || (f.kind !== 'signal' && f.kind !== 'state')) return;
    read().then((names) => watch(names, 2500)).catch(() => {});
  });
  B.onChange(() => { if (!linked()) { started = false; known = null; } tell(last.kind, last.text); });

  /* The banner: big and plain in demo mode, so nobody thinks Cameo is playing. */
  function bar(el) {
    el.classList.add('cameo-mode');
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-pair]')) document.getElementById('cameo-btn').click();
      else if (e.target.closest('[data-to-demo]')) setDemo(true);
      else if (e.target.closest('[data-to-cameo]')) setDemo(false);
    });
    const paint = (news) => {
      if (!el.isConnected) return;
      const on = ready();
      el.dataset.mode = on ? 'cameo' : 'demo';
      if (!on) {
        el.innerHTML = `<div class="cm-head"><b class="cm-tag">Demo</b><strong>Not connected to Cameo</strong></div>
          <p>This copy of the state machine plays by itself: Cameo is not told, and your model is not checked.</p>
          ${linked() ? '<button type="button" class="btn small" data-to-cameo>Drive the Cameo simulation</button>' : '<button type="button" class="btn small" data-pair>Pair with Cameo</button>'}`;
        return;
      }
      if (!el.querySelector('.cm-note')) {
        el.innerHTML = `<div class="cm-head"><b class="cm-tag">Cameo</b><strong>Driving the Cameo simulation</strong></div>
          <p>Each signal goes to Cameo. What you see here is what your state machine did there.</p>
          <p class="cm-note" aria-live="polite"></p>
          <button type="button" class="btn ghost small" data-to-demo>Switch to the demo</button>`;
      }
      const n = (news && news.text) ? news : last;
      const note = el.querySelector('.cm-note');
      note.textContent = n.text || '';
      note.dataset.kind = n.kind || '';
    };
    listeners.push(paint);
    paint(last);
  }

  window.CameoSim = {
    ready, send, restart, bar, linked,
    isDemo: () => demo, started: () => started,
    onChange: (fn) => listeners.push(fn),
    onStates: (fn) => stateListeners.push(fn)
  };
})();
