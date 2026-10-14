/* The simulation panel: a drawer that slides out from under the top bar and shows the drone
   reacting to the simulation of Cameo (signals come through js/bridge.js). It sits on top of the
   page instead of pushing it, so opening and closing it never moves the guide underneath.

   Needs js/sim-core.js, js/sim-motion.js, js/sim-scene.js and js/bridge.js.
   The button is #sim-btn in index.html; the drawer is built here. */
(function () {
  const { STEPS, LANES } = window.SimCore;
  const top = document.querySelector('.top');
  const btn = document.getElementById('sim-btn');
  if (!top || !btn) return;

  const B = window.Bridge;
  const pilot = window.SimCore.createPilot();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ───────── markup ───────── */
  const drawer = document.createElement('div');
  drawer.className = 'sim-drawer';
  drawer.id = 'sim-drawer';
  drawer.hidden = true;
  drawer.setAttribute('inert', '');
  drawer.innerHTML = `
    <section class="sim-panel" aria-label="Drone simulation">
      <div class="sim-body">
        <div class="sim-side">
          <div class="sim-head">
            <div>
              <span class="mono-label">Simulation</span>
              <h2>Pasture Sentinel</h2>
            </div>
            <button type="button" class="sim-link" id="sim-link" data-status="off"><i class="sim-dot"></i><span></span></button>
          </div>
          <div class="sim-tabs" role="tablist" aria-label="Simulation panels">
            <button type="button" role="tab" class="sim-tab" id="sim-tab-go" data-tab="go" aria-selected="true" aria-controls="sim-pane-go">Signals</button>
            <button type="button" role="tab" class="sim-tab" id="sim-tab-mission" data-tab="mission" aria-selected="false" aria-controls="sim-pane-mission" tabindex="-1">Mission</button>
            <button type="button" role="tab" class="sim-tab" id="sim-tab-log" data-tab="log" aria-selected="false" aria-controls="sim-pane-log" tabindex="-1">Event log <span class="sim-count" id="sim-count">0</span></button>
          </div>
          <div class="sim-pane sim-scroll" role="tabpanel" id="sim-pane-go" aria-labelledby="sim-tab-go">
            <div id="sim-now"></div>
            <div id="sim-lanes"></div>
            <div class="sim-quiet">
              <button type="button" id="sim-nominal"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg><span></span></button>
              <button type="button" id="sim-reset"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4.5V9h4.5"/></svg><span>Restart</span></button>
            </div>
            <p class="sim-hint">The buttons above only move this preview. Cameo is not told.</p>
          </div>
          <div class="sim-pane sim-scroll" role="tabpanel" id="sim-pane-mission" aria-labelledby="sim-tab-mission" hidden>
            <div id="sim-objectives"></div>
          </div>
          <div class="sim-pane sim-scroll" role="tabpanel" id="sim-pane-log" aria-labelledby="sim-tab-log" hidden>
            <ol id="sim-log-list"></ol>
          </div>
        </div>
        <div class="sim-stage" id="sim-stage" role="img" aria-label="The drone and the flock in the pasture" aria-describedby="sim-live"></div>
      </div>
      <p class="sr-only" id="sim-live" aria-live="polite"></p>
      <button type="button" class="sim-handle" id="sim-close" aria-label="Hide the simulation"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg><span>Hide</span></button>
    </section>`;
  top.appendChild(drawer);

  const $ = (sel) => drawer.querySelector(sel);
  const scene = window.SimScene.create($('#sim-stage'));

  /* ───────── what the pilot tells us ───────── */
  const OBJECTIVES = [
    ['Deploy to safe area', STEPS.GoingToSafeArea],
    ['Begin patrolling', STEPS.Patrolling],
    ['Monitor sheep', STEPS.Patrolling],
    ['Detect predators', STEPS.PredatorTracking]
  ];
  const ORDER = LANES.flatMap((lane) => lane.steps);

  function renderNow(snap) {
    const focused = drawer.contains(document.activeElement) ? document.activeElement.dataset.signal : undefined;
    let h = `<div class="sim-step"><span class="mono-label">Now</span><strong>${esc(snap.step)}</strong></div>`;
    if (!snap.outgoing.length) {
      h += `<p class="sim-none">${snap.crashed ? 'The drone crashed: the mission is over.' : 'No signal leaves this step.'}</p>`;
    } else {
      const edges = snap.outgoing.slice().sort((a, b) => /crash/i.test(a.signal) - /crash/i.test(b.signal));
      h += '<div class="sim-edges"><span class="mono-label">Click to send the next signal</span>';
      edges.forEach((e) => {
        h += `<button type="button" class="sim-edge${/crash/i.test(e.signal) ? ' danger' : ''}" data-signal="${esc(e.signal)}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg><span class="txt"><span class="sig">${esc(e.signal)}</span><span class="to">→ ${esc(e.target)}</span></span></button>`;
      });
      h += '</div>';
    }
    $('#sim-now').innerHTML = h;
    if (focused !== undefined) {
      const same = $(`[data-signal="${CSS.escape(focused)}"]`) || $('.sim-edge');
      if (same) same.focus({ preventScroll: true });
    }
  }
  function renderLanes(snap) {
    const at = ORDER.indexOf(snap.step);
    $('#sim-lanes').innerHTML = LANES.map((lane) => `
      <div class="sim-lane"><span class="mono-label">${esc(lane.title)}</span><ol>${lane.steps.map((name) => {
        const i = ORDER.indexOf(name);
        const cls = name === snap.step ? ' now' : i < at ? ' past' : '';
        return `<li class="sim-node${cls}"${name === snap.step ? ' aria-current="step"' : ''}>${esc(name)}</li>`;
      }).join('')}</ol></div>`).join('');
  }
  function renderObjectives(snap) {
    const at = ORDER.indexOf(snap.step);
    $('#sim-objectives').innerHTML = `<div class="sim-lane"><p class="sim-mission">Protect the flock by monitoring the perimeter and responding to predator threats.</p><ul class="sim-goals">${OBJECTIVES.map(([label, step]) => {
      const done = at >= ORDER.indexOf(step);
      return `<li class="${done ? 'done' : ''}"><span aria-hidden="true">${done ? '✓' : '○'}</span>${esc(label)}<span class="sr-only">${done ? ' (done)' : ' (to do)'}</span></li>`;
    }).join('')}</ul></div>`;
  }
  function renderLog(snap) {
    $('#sim-count').textContent = snap.log.length;
    $('#sim-log-list').innerHTML = snap.log.slice().reverse().map((e) => `<li class="${esc(e.type)}"><time>${esc(e.time)}</time><span>${esc(e.message)}</span></li>`).join('');
  }

  let lastStep = '';
  function onSnapshot(snap) {
    renderNow(snap);
    renderLanes(snap);
    renderObjectives(snap);
    renderLog(snap);
    const nominal = $('#sim-nominal');
    nominal.querySelector('span').textContent = snap.running ? 'Stop the scenario' : 'Play the nominal scenario';
    nominal.querySelector('path').setAttribute('d', snap.running ? 'M6 6h12v12H6z' : 'M7 4.5v15l12-7.5z');
    scene.setStep(snap.step);
    if (snap.step !== lastStep) {
      if (lastStep) $('#sim-live').textContent = `Step: ${snap.step}`;
      lastStep = snap.step;
    }
  }
  pilot.subscribe(onSnapshot);
  onSnapshot(pilot.getSnapshot());

  /* ───────── link with Cameo ───────── */
  const LINK_TEXT = {
    off: 'Not linked to Cameo',
    connecting: 'Linking to Cameo…',
    waiting: 'Cameo not reachable',
    connected: 'Following Cameo'
  };
  let news = false;
  let lastStatus = '';
  function renderLink() {
    const st = B ? B.state().status : 'off';
    const link = $('#sim-link');
    link.dataset.status = st;
    link.querySelector('span').textContent = LINK_TEXT[st] || LINK_TEXT.off;
    link.title = st === 'off' ? 'Enter your pairing code' : (B.state().error || '');
    if (st !== lastStatus) {
      if (lastStatus && st === 'connected') pilot.note('success', 'Linked to Cameo.');
      else if (lastStatus === 'connected') pilot.note('info', 'Lost the link to Cameo.');
      lastStatus = st;
    }
  }
  $('#sim-link').addEventListener('click', () => {
    const st = B ? B.state().status : 'off';
    if (st === 'connected') return;
    document.getElementById('cameo-btn').click();
  });

  /* The first state Cameo sends after we join says where the simulation is now. */
  let lastState = null;
  let awaitingState = false;
  function markNews() {
    if (open || news) return;
    news = true;
    btn.classList.add('has-news');
  }
  if (B) {
    B.onChange(renderLink);
    B.onFrame((f) => {
      if (f.kind === 'hello') {
        awaitingState = !f.resumed;
      } else if (f.kind === 'state') {
        lastState = f;
        if (awaitingState) { awaitingState = false; pilot.jumpTo(f.step); markNews(); }
      } else if (f.kind === 'signal') {
        awaitingState = false;
        pilot.remote(f.signal, f.id);
        markNews();
      } else if (f.kind === 'resync') {
        pilot.reset('Cameo asked to start over: some signals were lost.');
        if (lastState) pilot.jumpTo(lastState.step);
      }
    });
  }
  renderLink();

  /* ───────── buttons ───────── */
  drawer.addEventListener('click', (e) => {
    const edge = e.target.closest('[data-signal]');
    if (edge) { pilot.play(edge.dataset.signal); return; }
    if (e.target.closest('#sim-nominal')) {
      if (pilot.getSnapshot().running) pilot.stopNominal(); else pilot.runNominal();
      return;
    }
    if (e.target.closest('#sim-reset')) { pilot.reset(); return; }
    if (e.target.closest('#sim-close')) { setOpen(false, true); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) selectTab(tab.dataset.tab, false);
  });
  drawer.addEventListener('keydown', (e) => {
    const tab = e.target.closest && e.target.closest('[data-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = [...drawer.querySelectorAll('[data-tab]')];
    const at = tabs.indexOf(tab);
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (at + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault();
    selectTab(tabs[to].dataset.tab, true);
  });
  function selectTab(name, focus) {
    drawer.querySelectorAll('[data-tab]').forEach((b) => {
      const on = b.dataset.tab === name;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    drawer.querySelectorAll('.sim-pane').forEach((p) => { p.hidden = p.id !== `sim-pane-${name}`; });
  }
  /* The arrow keys flip the scenes of the guide; inside the panel they should not. */
  drawer.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'].includes(e.key)) e.stopPropagation();
  });

  /* ───────── open and close ───────── */
  let open = false;
  let closing = 0;
  function setOpen(on, returnFocus) {
    if (on === open) return;
    open = on;
    btn.setAttribute('aria-expanded', String(on));
    clearTimeout(closing);
    if (on) {
      news = false;
      btn.classList.remove('has-news');
      drawer.hidden = false;
      drawer.removeAttribute('inert');
      scene.setVisible(true);
      void drawer.offsetHeight; /* the drawer must be laid out closed once, or it will not slide */
      drawer.classList.add('open');
      return;
    }
    drawer.classList.remove('open');
    drawer.setAttribute('inert', '');
    if (returnFocus) btn.focus({ preventScroll: true });
    /* hide it for good (and stop the animations) once it has slid away */
    closing = setTimeout(() => { drawer.hidden = true; scene.setVisible(false); }, 520);
  }
  btn.addEventListener('click', () => setOpen(!open, false));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open || document.getElementById('overlay-root').firstChild) return;
    setOpen(false, true);
  });
  window.Sim = { open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(!open), pilot };
})();
