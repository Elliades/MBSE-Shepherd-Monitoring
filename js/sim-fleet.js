/* The simulation panel of Part 4: the same drawer as js/sim.js, for a fleet of drones. It follows the
   state Cameo publishes ({ step, drones: [{ id, step, role, name }], master }, see js/bridge.js) and,
   with simPreview, lets the author move each drone by hand and play the scenario of the config.

   Needs js/sim-fleet-core.js, js/sim-fleet-scene.js and js/bridge.js. Loaded instead of js/sim.js:
   Part 1 and Part 2 do not load it. */
(function () {
  const top = document.querySelector('.top');
  const btn = document.getElementById('sim-btn');
  if (!top || !btn) return;

  const B = window.Bridge;
  const F = window.FleetCore;
  const CFG = (window.COURSE_CONFIG || {}).fleet || {};
  const fleet = F.createFleet();
  const PREVIEW = (window.COURSE_CONFIG || {}).simPreview !== false;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ───────── markup ───────── */
  const drawer = document.createElement('div');
  drawer.className = 'sim-drawer';
  drawer.id = 'sim-drawer';
  drawer.hidden = true;
  drawer.setAttribute('inert', '');
  drawer.innerHTML = `
    <section class="sim-panel" aria-label="Fleet simulation">
      <div class="sim-body">
        <div class="sim-side">
          <div class="sim-head">
            <div>
              <span class="mono-label">Simulation</span>
              <h2>${esc(CFG.title || 'Pasture fleet')}</h2>
            </div>
            <button type="button" class="sim-link" id="sim-link" data-status="off"><i class="sim-dot"></i><span></span></button>
          </div>
          <div class="sim-tabs" role="tablist" aria-label="Simulation panels">
            <button type="button" role="tab" class="sim-tab" id="sim-tab-go" data-tab="go" aria-selected="true" aria-controls="sim-pane-go">Fleet</button>
            <button type="button" role="tab" class="sim-tab" id="sim-tab-mission" data-tab="mission" aria-selected="false" aria-controls="sim-pane-mission" tabindex="-1">Mission</button>
            <button type="button" role="tab" class="sim-tab" id="sim-tab-log" data-tab="log" aria-selected="false" aria-controls="sim-pane-log" tabindex="-1">Event log <span class="sim-count" id="sim-count">0</span></button>
          </div>
          <div class="sim-pane sim-scroll" role="tabpanel" id="sim-pane-go" aria-labelledby="sim-tab-go">
            <div id="flt-rule"></div>
            <div id="flt-master"></div>
            <ol class="flt-list" id="flt-list"></ol>
            <div class="sim-quiet">
              <button type="button" id="sim-nominal"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg><span></span></button>
              <button type="button" id="sim-reset"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4.5V9h4.5"/></svg><span>Restart</span></button>
            </div>
            <p class="sim-hint">The lists above only move this preview. Cameo is not told.</p>
          </div>
          <div class="sim-pane sim-scroll" role="tabpanel" id="sim-pane-mission" aria-labelledby="sim-tab-mission" hidden>
            <div id="sim-objectives"></div>
          </div>
          <div class="sim-pane sim-scroll" role="tabpanel" id="sim-pane-log" aria-labelledby="sim-tab-log" hidden>
            <ol id="sim-log-list"></ol>
          </div>
        </div>
        <div class="sim-stage" id="sim-stage" role="img" aria-label="The drones and the flock in the pasture" aria-describedby="sim-live"></div>
      </div>
      <p class="sr-only" id="sim-live" aria-live="polite"></p>
      <button type="button" class="sim-handle" id="sim-close" aria-label="Hide the simulation"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg><span>Hide</span></button>
    </section>`;
  top.appendChild(drawer);

  const $ = (sel) => drawer.querySelector(sel);
  if (!PREVIEW) {
    $('#sim-nominal').remove();
    $('.sim-hint').textContent = 'This panel only follows Cameo: link it with the Cameo button.';
  }
  const scene = window.FleetScene.create($('#sim-stage'));

  /* ───────── what the fleet tells us ───────── */
  const OBJECTIVES = CFG.objectives || [
    ['Deploy the fleet', ['patrol', 'guard']],
    ['Guard the flock', ['guard']],
    ['Track the predator', ['track']],
    ['Repel the predator', ['counter']],
    ['Follow it out while a drone keeps the field', ['pursue-covered']]
  ];

  function stepsOf(d) {
    const steps = ((F.ROLES[d.role] || {}).steps || []).slice();
    if (!steps.includes(d.step)) steps.push(d.step);
    return steps;
  }
  function renderRule(snap) {
    const r = snap.rule;
    $('#flt-rule').innerHTML = `<div class="sim-step flt-state flt-state--${esc(r.tone)}"><span class="mono-label">Field</span><strong>${esc(r.text)}</strong></div>`;
  }
  function renderMaster(snap) {
    const who = snap.master === 'base' ? 'Base station' : snap.master ? (snap.drones.find((d) => d.id === snap.master) || {}).name : 'None';
    if (!PREVIEW) {
      $('#flt-master').innerHTML = `<p class="flt-master"><span class="mono-label">Master</span> ${esc(who)}</p>`;
      return;
    }
    const opts = [['base', 'Base station'], ['', 'None']].concat(snap.drones.map((d) => [d.id, `${d.name} (swarm lead)`]));
    $('#flt-master').innerHTML = `<label class="flt-master"><span class="mono-label">Master</span>
      <select data-master>${opts.map(([v, t]) => `<option value="${esc(v)}"${v === snap.master ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  }
  function renderList(snap) {
    const focused = drawer.contains(document.activeElement) ? document.activeElement.dataset.drone : undefined;
    $('#flt-list').innerHTML = snap.drones.map((d) => {
      const lead = snap.master === d.id;
      const where = F.AWAY.includes(d.behaviour) ? 'out of the field' : F.ON_FIELD.includes(d.behaviour) ? 'on the field' : '';
      const step = PREVIEW
        ? `<select data-drone="${esc(d.id)}" aria-label="Step of ${esc(d.name)}">${stepsOf(d).map((s) => `<option${s === d.step ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>`
        : `<strong>${esc(d.step)}</strong>`;
      return `<li class="flt-card flt-card--${esc(d.behaviour)}" style="--role:${esc(d.color)}">
        <div class="flt-card-head"><span class="flt-role">${esc(d.tag)}</span><b>${esc(d.name)}</b>${lead ? '<span class="flt-lead">★ master</span>' : ''}<small>${esc(d.roleLabel)}</small></div>
        ${step}
        <span class="flt-does">${esc(F.BEHAVIOURS[d.behaviour])}${where ? ` · ${where}` : ''}</span>
      </li>`;
    }).join('') || '<li class="sim-none">No drone yet.</li>';
    if (focused !== undefined) {
      const same = $(`[data-drone="${CSS.escape(focused)}"]`);
      if (same) same.focus({ preventScroll: true });
    }
  }
  function renderObjectives(snap) {
    $('#sim-objectives').innerHTML = `<div class="sim-lane"><p class="sim-mission">${esc(CFG.mission || 'Protect the flock with several drones: some keep the field while another one follows the predator away.')}</p><ul class="sim-goals">${OBJECTIVES.map(([label, keys]) => {
      const done = keys.some((k) => snap.seen.has(k));
      return `<li class="${done ? 'done' : ''}"><span aria-hidden="true">${done ? '✓' : '○'}</span>${esc(label)}<span class="sr-only">${done ? ' (done)' : ' (to do)'}</span></li>`;
    }).join('')}</ul></div>`;
  }
  function renderLog(snap) {
    $('#sim-count').textContent = snap.log.length;
    $('#sim-log-list').innerHTML = snap.log.slice().reverse().map((e) => `<li class="${esc(e.type)}"><time>${esc(e.time)}</time><span>${esc(e.message)}</span></li>`).join('');
  }

  let lastRule = '';
  function onSnapshot(snap) {
    renderRule(snap);
    renderMaster(snap);
    renderList(snap);
    renderObjectives(snap);
    renderLog(snap);
    const nominal = $('#sim-nominal');
    if (nominal) {
      nominal.querySelector('span').textContent = snap.running ? 'Stop the scenario' : 'Play the scenario';
      nominal.querySelector('path').setAttribute('d', snap.running ? 'M6 6h12v12H6z' : 'M7 4.5v15l12-7.5z');
    }
    scene.setFleet(snap);
    if (snap.rule.text !== lastRule) {
      if (lastRule) $('#sim-live').textContent = snap.rule.text;
      lastRule = snap.rule.text;
    }
  }
  fleet.subscribe(onSnapshot);
  onSnapshot(fleet.getSnapshot());

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
      if (lastStatus && st === 'connected') fleet.note('success', 'Linked to Cameo.');
      else if (lastStatus === 'connected') fleet.note('info', 'Lost the link to Cameo.');
      lastStatus = st;
    }
  }
  $('#sim-link').addEventListener('click', () => {
    const st = B ? B.state().status : 'off';
    if (st === 'connected') return;
    document.getElementById('cameo-btn').click();
  });

  function markNews() {
    if (open || news) return;
    news = true;
    btn.classList.add('has-news');
  }
  /* The state Cameo publishes at each change says where every drone is: it moves the fleet, whatever the
     signals are named. A signal is only written in the log. */
  let lastState = null;
  if (B) {
    B.onChange(renderLink);
    B.onFrame((f) => {
      if (f.kind === 'state') {
        lastState = f;
        fleet.fromCameo(f);
        markNews();
      } else if (f.kind === 'signal') {
        fleet.note('info', `Cameo: ${f.signal}`);
        markNews();
      } else if (f.kind === 'resync') {
        fleet.reset('Cameo asked to start over: some signals were lost.');
        if (lastState) fleet.fromCameo(lastState);
      }
    });
  }
  renderLink();

  /* ───────── buttons ───────── */
  drawer.addEventListener('change', (e) => {
    const pick = e.target.closest('[data-drone]');
    if (pick) { fleet.stopScenario(); fleet.setStep(pick.dataset.drone, pick.value); return; }
    const lead = e.target.closest('[data-master]');
    if (lead) fleet.setMaster(lead.value);
  });
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('#sim-nominal')) {
      if (fleet.getSnapshot().running) fleet.stopScenario(); else fleet.runScenario();
      return;
    }
    if (e.target.closest('#sim-reset')) {
      fleet.reset();
      /* following Cameo: start again from where Cameo is */
      if (lastState) fleet.fromCameo(lastState);
      return;
    }
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
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key)) e.stopPropagation();
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
    closing = setTimeout(() => { drawer.hidden = true; scene.setVisible(false); }, 520);
  }
  btn.addEventListener('click', () => setOpen(!open, false));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !open || document.getElementById('overlay-root').firstChild) return;
    setOpen(false, true);
  });
  window.Sim = { open: () => setOpen(true), close: () => setOpen(false), toggle: () => setOpen(!open), fleet };
})();
