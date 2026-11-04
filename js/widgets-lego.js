/* Part 4: the box of Lego. Needs part4/content/lego.js, js/lego-run.js and the 3D drone of part4/lab (catalog.js, drone3d.js).
     legoBay       the drones and the base station, following what is assembled in Cameo: bricks, 3D, links still to make,
                   and the regions of the mission against what carries them
     missionBoard  plays the missions on that assembly, moves the simulation panel, and compares the solutions tried
     missionCheck  chapter 3: plays the mission alone, to prove its regions
     enduranceLab  the bonus: four hours on the pasture with batteries and chargers, computed in js/lego-endurance.js, no Cameo needed
   Linked to Cameo, the bay only follows: the bricks are dragged in the IBD. Not linked, it is a preview: a click plugs a brick,
   so that the guide can be read without Cameo. The missions need Cameo. Part 1, 2 and 3 do not load this file. */
(function () {
  'use strict';
  const W = window.WIDGETS;
  if (!W) return;
  const LEGO = window.LEGO || {};
  const RUN = window.LegoRun;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pause = (ms) => new Promise((res) => setTimeout(res, ms));
  const POLL = 2000;
  const BRICK = Object.fromEntries((LEGO.bricks || []).map((b) => [b.type, b]));
  const linked = () => !!(window.Bridge && window.Bridge.state && window.Bridge.state().status === 'connected');

  /* ───────── what is assembled, one source for every widget of the page ───────── */
  const store = {
    key: () => ((window.COURSE_CONFIG || {}).storageKey || 'mbse-shepherd:part4') + ':lego',
    read() { try { return JSON.parse(localStorage.getItem(this.key()) || '{}'); } catch (e) { return {}; } },
    write(v) { try { localStorage.setItem(this.key(), JSON.stringify(v)); } catch (e) { /* private window */ } }
  };
  const emptyPreview = () => Object.fromEntries([...(LEGO.drones || []).map((d) => d.name), (LEGO.base || {}).name].map((n) => [n, []]));
  const Assembly = {
    listeners: new Set(),
    timer: 0,
    preview: store.read().preview || emptyPreview(),
    now: null,
    problem: '',
    subscribe(fn) {
      this.listeners.add(fn);
      fn(this.now || this.fromPreview(), this.problem);
      if (!this.timer) { this.tick(); this.timer = setInterval(() => this.tick(), POLL); }
      return () => {
        this.listeners.delete(fn);
        if (!this.listeners.size) { clearInterval(this.timer); this.timer = 0; }
      };
    },
    emit() { this.listeners.forEach((fn) => fn(this.now || this.fromPreview(), this.problem)); },
    /* The same shape as assembly/read. */
    fromPreview() {
      const host = (name, path, given) => ({ path, type: name, parts: [{ type: given, connectors: 1 }].concat(this.preview[name].map((type) => ({ type, connectors: 1 }))) });
      return {
        preview: true, missing: [], extra: [], connectors: [],
        hosts: [host(LEGO.base.name, 'base', 'Ground Control')].concat(LEGO.drones.map((d) => host(d.name, d.path, 'Flight Orchestrator')))
      };
    },
    async tick() {
      if (this.busy) return;
      if (!linked()) {
        const was = !!this.now || !!this.problem;
        this.now = null; this.problem = '';
        if (was) this.emit();
        return;
      }
      this.busy = true;
      try {
        const next = await window.Bridge.call('assembly', 'read', [LEGO.soi], 8000);
        const changed = JSON.stringify(next) !== JSON.stringify(this.now) || this.problem;
        this.now = next; this.problem = '';
        if (changed) this.emit();
      } catch (e) {
        const m = (e && e.message) || 'error';
        const text = m === 'unknown-method' ? 'Your plugin is too old for this part: install the latest one.'
          : /No block named/.test(m) ? 'Open the model of Part 4 in Cameo: this project has no block named “' + LEGO.soi + '”.' : 'Cameo does not answer: ' + m;
        const changed = text !== this.problem;
        this.problem = text; this.now = null;
        if (changed) this.emit();
      } finally { this.busy = false; }
    },
    toggle(host, type) {
      const list = this.preview[host];
      const at = list.indexOf(type);
      if (at >= 0) list.splice(at, 1); else list.push(type);
      store.write(Object.assign(store.read(), { preview: this.preview }));
      this.emit();
    },
    async autoConnect() {
      const r = await window.Bridge.call('assembly', 'autoConnect', [LEGO.soi], 30000);
      await this.tick();
      return r;
    }
  };

  /* ───────── what a drone weighs and costs, from the blocks it carries ───────── */
  function bricksOf(assembly, name) {
    return RUN.hostOf(assembly, name).parts.map((p) => p.type).filter((t) => BRICK[t]);
  }
  function gearOf(types) {
    return [...new Set((LEGO.airframe || []).concat(...types.map((t) => BRICK[t].gear)))];
  }
  function budget(types, battery) {
    const L = window.LAB;
    const gear = gearOf(types);
    const pick = (id, field) => (L && L.BY[id] && L.BY[id][field]) || 0;
    /* Another battery changes the energy system of the drone, and so everything it lifts. */
    const grams = gear.reduce((n, id) => n + pick(id, 'mass'), 0) + (battery ? battery.grams - pick('energy', 'mass') : 0);
    const watts = gear.reduce((n, id) => n + pick(id, 'power'), 0);
    const price = gear.reduce((n, id) => n + (LEGO.prices[id] || 0), 0) + (battery ? battery.price - LEGO.prices.energy : 0);
    const e = LEGO.endurance;
    const hover = e.hoverWatts * Math.pow(grams / e.hoverGrams, 1.5);
    return { grams, watts, price, minutes: Math.round((battery ? battery.wh : e.batteryWh) * e.usable / (hover + watts) * 60) };
  }
  /* The name of an assembly: the same bricks, the same solution. */
  function signature(assembly) {
    const part = (name, short) => {
      const types = bricksOf(assembly, name);
      return types.length ? `${short}: ${types.map((t) => BRICK[t].short).sort().join('+')}` : `${short}: -`;
    };
    return [...LEGO.drones.map((d, i) => part(d.name, `D${i + 1}`)), part(LEGO.base.name, 'Base')].join(' · ');
  }
  const roleLabel = (assembly, drone) => {
    const roles = ((window.COURSE_CONFIG || {}).fleet || {}).roles || {};
    const id = RUN.roleOf(LEGO, drone, assembly);
    return (roles[id] || {}).label || 'Drone';
  };

  /* What is wrong with the intelligence, in words. */
  function brainNote(assembly) {
    const where = (type) => [LEGO.base].concat(LEGO.drones).filter((h) => bricksOf(assembly, h.name).includes(type)).map((h) => h.name);
    const masters = where('Swarm Master');
    const reflexes = where('Swarm Reflex');
    if (masters.length > 1) return { tone: 'bad', text: `Two masters (${masters.join(', ')}): each request gets two answers. Keep one.` };
    if (masters.length && reflexes.length) return { tone: 'bad', text: `A master and a reflex in ${reflexes.join(', ')}: that drone no longer listens to the master.` };
    if (masters.length) return { tone: 'ok', text: `Swarm Master in ${masters[0]}.` };
    if (reflexes.length === LEGO.drones.length) return { tone: 'warn', text: 'A reflex in each drone: nobody coordinates them.' };
    if (reflexes.length) return { tone: 'warn', text: `A reflex in ${reflexes.join(', ')} only: the other drones have nobody to ask.` };
    return { tone: 'warn', text: 'No intelligence yet: a drone asks for a job, and nobody answers.' };
  }

  /* ───────── one drone, in 3D ───────── */
  function droneView(host) {
    const L = window.LAB;
    if (!L || !L.Drone3D) return null;
    const d3 = L.Drone3D.create(host);
    const none = new Set();
    let raf = 0;
    let before = performance.now();
    function frame(now) {
      d3.frameTick(Math.min(0.05, (now - before) / 1000));
      before = now;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return {
      show(types) {
        const parts = new Set(gearOf(types));
        const brain = types.includes('Swarm Master');
        d3.render({
          parts, need: none, powered: parts, wires: [], live: none, airborne: types.length > 0,
          caps: new Set(brain ? ['fly', 'master'] : ['fly']), color: types.length ? BRICK[types[0]].tone : ''
        });
      },
      stop() { cancelAnimationFrame(raf); }
    };
  }

  /* ───────── the assembly bay ───────── */
  W.legoBay = function (root, opts, api) {
    if (!LEGO.drones || !RUN) { root.textContent = ''; return undefined; }
    const views = new Map();
    root.innerHTML = `<div class="lego">
      <div class="lego-status" data-status></div>
      <div class="lego-box" data-box></div>
      <div class="lego-hangar">
        ${LEGO.drones.map((d) => `<article class="lego-card" data-host="${esc(d.name)}"><header><b>${esc(d.name)}</b><small data-role></small></header><div class="lego-3d" data-3d></div><div class="lego-chips" data-chips></div><p class="lego-budget" data-budget></p></article>`).join('')}
        <article class="lego-card lego-card--base" data-host="${esc(LEGO.base.name)}"><header><b>${esc(LEGO.base.name)}</b><small>Ground Control is given</small></header><div class="lego-mast" data-mast aria-hidden="true"><svg viewBox="0 0 120 90"><path d="M60 14 V72 M38 72 H82 M46 72 L60 34 L74 72"/><path class="wave" d="M44 20 a22 22 0 0 0 0 26 M76 20 a22 22 0 0 1 0 26"/><circle cx="60" cy="14" r="4"/></svg></div><div class="lego-chips" data-chips></div></article>
      </div>
      <table class="lego-regions" data-regions></table>
    </div>`;
    const $ = (s, n) => (n || root).querySelector(s);
    root.querySelectorAll('.lego-card[data-host]').forEach((card) => {
      const host = $('[data-3d]', card);
      if (host) views.set(card.dataset.host, droneView(host));
    });

    function renderBox(assembly) {
      $('[data-box]').innerHTML = (LEGO.bricks || []).map((b) => `<span class="lego-brick" style="--tone:${esc(b.tone)}" title="${esc(b.what)}"><i>${brickIcon(b)}</i>${esc(b.type)}</span>`).join('') +
        (assembly.preview ? '' : '<span class="lego-hint">In Cameo: <b>3 - Logical Analysis &gt; TP - Swarm &gt; Library</b></span>');
    }
    function renderCards(assembly) {
      root.querySelectorAll('.lego-card[data-host]').forEach((card) => {
        const name = card.dataset.host;
        const have = bricksOf(assembly, name);
        const isBase = name === LEGO.base.name;
        const offer = (LEGO.bricks || []).filter((b) => (isBase ? b.kind === 'ground' || b.type === 'Swarm Master' : b.kind !== 'ground'));
        const parts = RUN.hostOf(assembly, name).parts;
        $('[data-chips]', card).innerHTML = assembly.preview
          ? offer.map((b) => `<button type="button" class="lego-chip${have.includes(b.type) ? ' is-in' : ''}" style="--tone:${esc(b.tone)}" data-plug="${esc(b.type)}" aria-pressed="${have.includes(b.type)}">${esc(b.short)}</button>`).join('')
          : (have.length ? have.map((t) => {
            const part = parts.find((p) => p.type === t);
            const open = part && !part.connectors;
            return `<span class="lego-chip is-in${open ? ' is-open' : ''}" style="--tone:${esc(BRICK[t].tone)}" title="${open ? 'Not connected yet' : 'Connected'}">${esc(BRICK[t].short)}${open ? ' ·' : ''}</span>`;
          }).join('') : '<span class="lego-empty">Nothing plugged</span>');
        const view = views.get(name);
        if (view) view.show(have);
        const role = $('[data-role]', card);
        const drone = LEGO.drones.find((d) => d.name === name);
        if (role && drone) role.textContent = have.length ? roleLabel(assembly, drone) : 'Flight Orchestrator only';
        const b = $('[data-budget]', card);
        if (b) { const x = budget(have); b.textContent = `${(x.grams / 1000).toFixed(2)} kg · ${x.minutes} min · ${x.price}\u00a0€`; }
        card.classList.toggle('has-brain', have.includes('Swarm Master'));
      });
    }
    function renderRegions(assembly) {
      const carriers = (type) => LEGO.drones.filter((d) => RUN.carries(assembly, d, type)).map((d) => d.name.replace('Drone ', 'D'));
      const rows = (LEGO.bricks || []).filter((b) => b.region).map((b) => {
        const who = carriers(b.type);
        return `<tr class="${who.length ? 'ok' : 'no'}"><td><span class="mono-label">Region</span> ${esc(b.region)}</td><td>${esc(b.type)}</td><td>${who.length ? `✓ ${esc(who.join(', '))}` : '✗ nobody'}</td></tr>`;
      });
      const base = bricksOf(assembly, LEGO.base.name);
      (LEGO.bricks || []).filter((b) => b.kind === 'ground').forEach((b) => {
        const ok = base.includes(b.type);
        rows.push(`<tr class="${ok ? 'ok' : 'no'}"><td><span class="mono-label">Base station</span></td><td>${esc(b.type)}</td><td>${ok ? '✓ plugged' : '✗ missing'}</td></tr>`);
      });
      const n = brainNote(assembly);
      $('[data-regions]').innerHTML = `<caption>Is the mission covered?</caption><tbody>${rows.join('')}<tr class="${n.tone === 'ok' ? 'ok' : 'no'}"><td><span class="mono-label">Who decides</span></td><td colspan="2">${n.tone === 'ok' ? '✓' : '✗'} ${esc(n.text)}</td></tr></tbody>`;
    }
    function renderStatus(assembly, problem) {
      const el = $('[data-status]');
      if (problem) { el.innerHTML = `<span class="lego-pill is-bad">${esc(problem)}</span>`; return; }
      if (assembly.preview) { el.innerHTML = `<span class="lego-pill">Preview: not linked to Cameo. Click a brick to plug it, or link the guide with the <b>Cameo</b> button.</span>`; return; }
      const missing = assembly.missing.length + assembly.extra.length;
      el.innerHTML = `<span class="lego-pill ${missing ? 'is-warn' : 'is-ok'}">${missing ? `${assembly.missing.length} connector${assembly.missing.length > 1 ? 's' : ''} to make, ${assembly.extra.length} that lead${assembly.extra.length > 1 ? '' : 's'} nowhere` : 'Following Cameo: everything is connected'}</span>
        <button type="button" class="btn small" data-auto ${missing ? '' : 'disabled'}>${api.icon('play')}Auto Connect</button>
        <span class="lego-auto-out" data-auto-out aria-live="polite"></span>`;
      if (missing) {
        el.insertAdjacentHTML('beforeend', `<details class="lego-missing"><summary>Which ones?</summary><ul>${assembly.missing.map((m) => `<li>+ ${esc(m)}</li>`).concat(assembly.extra.map((m) => `<li>− ${esc(m)}</li>`)).join('')}</ul></details>`);
      }
    }
    const off = Assembly.subscribe((assembly, problem) => {
      renderStatus(assembly, problem);
      renderBox(assembly);
      renderCards(assembly);
      renderRegions(assembly);
    });
    root.addEventListener('click', async (e) => {
      const plug = e.target.closest('[data-plug]');
      if (plug) { Assembly.toggle(plug.closest('[data-host]').dataset.host, plug.dataset.plug); return; }
      const auto = e.target.closest('[data-auto]');
      if (auto) {
        auto.disabled = true;
        try {
          const r = await Assembly.autoConnect();
          const out = $('[data-auto-out]');
          if (out) out.textContent = `${r.added.length} connector${r.added.length > 1 ? 's' : ''} added, ${r.removed.length} removed.`;
        } catch (err) {
          const out = $('[data-auto-out]');
          if (out) out.textContent = err.message === 'unknown-method' ? 'Your plugin is too old: install the latest one.' : `Cameo stopped: ${err.message}`;
          auto.disabled = false;
        }
      }
    });
    return () => { off(); views.forEach((v) => v && v.stop()); };
  };

  /* ───────── the missions ───────── */
  W.missionBoard = function (root, opts, api) {
    if (!LEGO.missions || !RUN) { root.textContent = ''; return undefined; }
    let alive = true;
    let running = false;
    let assembly = null;
    const saved = () => store.read().results || {};
    const remember = (sig, mission, ok) => {
      const all = store.read();
      all.results = all.results || {};
      all.results[sig] = all.results[sig] || { missions: {}, price: 0, minutes: 0 };
      all.results[sig].missions[mission] = ok;
      const per = LEGO.drones.map((d) => budget(bricksOf(assembly, d.name)));
      all.results[sig].price = per.reduce((n, x) => n + x.price, 0);
      all.results[sig].minutes = Math.min(...per.map((x) => x.minutes));
      store.write(all);
    };
    root.innerHTML = `<div class="lego-board">
      <div class="lego-missions">${LEGO.missions.map((m) => `<article class="lego-mission" data-mission="${esc(m.id)}"><div class="lego-mission-head"><b>${esc(m.title)}</b><span data-verdict></span></div><p>${esc(m.story)}</p><button type="button" class="btn small" data-play="${esc(m.id)}">${api.icon('play')}Play</button><ul class="lego-checks" data-checks></ul></article>`).join('')}</div>
      <p class="lego-caption" data-caption aria-live="polite"></p>
      <div class="lego-compare" data-compare></div>
    </div>`;
    const $ = (s, n) => (n || root).querySelector(s);

    function renderCompare() {
      const results = saved();
      const keys = Object.keys(results);
      const box = $('[data-compare]');
      if (!keys.length) { box.innerHTML = ''; return; }
      const ids = LEGO.missions.map((m) => m.id);
      box.innerHTML = `<table class="lego-table"><caption>The solutions you tried</caption><thead><tr><th>Solution</th>${LEGO.missions.map((m) => `<th>${esc(m.title)}</th>`).join('')}<th>Fleet</th><th>Shortest flight</th></tr></thead><tbody>${keys.map((k) => {
        const r = results[k];
        const current = assembly && signature(assembly) === k;
        return `<tr class="${current ? 'is-now' : ''}"><td>${esc(k)}</td>${ids.map((id) => `<td class="${r.missions[id] === true ? 'ok' : r.missions[id] === false ? 'no' : ''}">${r.missions[id] === true ? '✓' : r.missions[id] === false ? '✗' : '·'}</td>`).join('')}<td>${esc(r.price)} €</td><td>${esc(r.minutes)} min</td></tr>`;
      }).join('')}</tbody></table><button type="button" class="sim-link" data-forget>Forget these results</button>`;
    }
    function renderVerdicts() {
      const here = assembly ? (saved()[signature(assembly)] || { missions: {} }).missions : {};
      root.querySelectorAll('[data-mission]').forEach((card) => {
        const v = here[card.dataset.mission];
        $('[data-verdict]', card).innerHTML = v === true ? '<span class="lego-ok">✓ holds</span>' : v === false ? '<span class="lego-no">✗ fails</span>' : '';
      });
    }
    function renderButtons() {
      const can = !running && linked() && assembly && !assembly.preview;
      root.querySelectorAll('[data-play]').forEach((b) => { b.disabled = !can; });
      const cap = $('[data-caption]');
      if (!running && !linked()) cap.textContent = 'The missions run in Cameo: link the guide with the Cameo button.';
    }
    const off = Assembly.subscribe((a) => {
      assembly = a;
      renderButtons();
      if (!running) { renderVerdicts(); renderCompare(); }
    });

    /* What happens in the pasture, big, over the simulation panel: the board is hidden behind it. */
    function sayOverPasture(text) {
      const stage = document.getElementById('sim-stage');
      if (!stage) return;
      let n = stage.querySelector('.lego-say');
      if (!n) { n = document.createElement('p'); n.className = 'lego-say'; stage.appendChild(n); }
      n.textContent = text;
      n.hidden = !text;
    }
    /* What the pasture shows of a mission, whatever the drones do about it. */
    const SHEEP_OUT = { 'Sheep Out Of Zone': true, 'Sheep Back In Zone': false };
    /* The state of the swarm goes to the simulation panel. */
    function pushFleet(states) {
      if (!window.Sim || !window.Sim.fleet) return;
      window.Sim.fleet.fromCameo({
        master: RUN.masterOf(LEGO, assembly),
        drones: LEGO.drones.map((d) => ({ id: d.id, name: d.name, role: RUN.roleOf(LEGO, d, assembly), step: RUN.stepOf(LEGO, d, assembly, states) }))
      });
    }
    async function play(id) {
      const mission = LEGO.missions.find((m) => m.id === id);
      const card = root.querySelector(`[data-mission="${id}"]`);
      const list = $('[data-checks]', card);
      const cap = $('[data-caption]');
      list.innerHTML = '';
      running = true;
      renderButtons();
      if (window.Sim) window.Sim.open();
      if (window.Sim && window.Sim.fleet) window.Sim.fleet.setSheepOut(false);
      try {
        const res = await RUN.play(LEGO, mission, assembly, {
          call: (c, t, a, ms) => window.Bridge.call(c, t, a, ms),
          pause,
          alive: () => alive,
          onStep: (say) => { cap.textContent = say; sayOverPasture(say); if (window.Sim && window.Sim.fleet) window.Sim.fleet.note('info', say); },
          onSignal: (signal) => { if (signal in SHEEP_OUT && window.Sim && window.Sim.fleet) window.Sim.fleet.setSheepOut(SHEEP_OUT[signal]); },
          onStates: pushFleet,
          onCheck: (r) => { list.insertAdjacentHTML('beforeend', `<li class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✓' : '✗'} ${esc(r.text)}</li>`); }
        });
        if (!alive) return;
        const ok = res.length > 0 && res.every((r) => r.ok);
        remember(signature(assembly), id, ok);
        cap.textContent = ok ? `${mission.title}: it holds.` : `${mission.title}: it fails. Change something, and play again.`;
        sayOverPasture(cap.textContent);
        if (window.Sim && window.Sim.fleet) window.Sim.fleet.note(ok ? 'success' : 'info', cap.textContent);
        if (ok && api.confetti && Object.values((saved()[signature(assembly)] || {}).missions || {}).filter(Boolean).length === LEGO.missions.length) api.confetti();
      } catch (e) {
        const m = (e && e.message) || 'error';
        cap.textContent = m === 'unknown-method' ? 'Your plugin is too old for this part: install the latest one.' : `Cameo stopped: ${m}`;
        sayOverPasture('');
      } finally {
        running = false;
        renderButtons();
        renderVerdicts();
        renderCompare();
      }
    }
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-play]');
      if (b && !b.disabled) { play(b.dataset.play); return; }
      if (e.target.closest('[data-forget]')) {
        const all = store.read();
        delete all.results;
        store.write(all);
        renderVerdicts();
        renderCompare();
      }
    });
    return () => {
      alive = false;
      off();
      sayOverPasture('');
      if (running && linked()) window.Bridge.call('simtest', 'stop', []).catch(() => {});
    };
  };

  /* ───────── the bonus: a whole mission, batteries included ───────── */
  const STATE_LABEL = { field: 'On the field', job: 'On a job', transit: 'On the way, or landing', charging: 'Charging', queue: 'Waiting for a charger', ready: 'At the base, ready', lost: 'Battery empty: lost' };
  const clockOf = (min) => `${Math.floor(min / 60)} h ${String(Math.floor(min % 60)).padStart(2, '0')}`;
  const minutesText = (m) => (m === null ? 'never' : `${(Math.round(m * 10) / 10).toLocaleString('en')} min`);

  W.enduranceLab = function (root, opts, api) {
    const DAY = LEGO.day;
    const E = window.LegoEndurance;
    if (!DAY || !E) { root.textContent = ''; return undefined; }
    const kept = store.read().endurance || {};
    const settings = Object.assign({}, DAY.settings, kept.settings);
    delete settings.chargeMinutes;
    let source = kept.source || DAY.presets[0].id;
    let assembly = null;
    let result = null;
    let label = '';
    const SLIDERS = [
      { id: 'returnAt', label: 'Fly home at', min: 5, max: 60, step: 5, unit: '% battery' },
      { id: 'km', label: 'Base to field', min: 0.5, max: 6, step: 0.1, unit: 'km' },
      { id: 'speed', label: 'Flight speed', min: 6, max: 20, step: 1, unit: 'm/s' },
      { id: 'slots', label: 'Charging places', min: 1, max: 3, step: 1, unit: '' }
    ];
    root.innerHTML = `<div class="lg-end">
      <div class="lg-end-fleets" role="group" aria-label="Which fleet" data-fleets></div>
      <div class="lg-end-controls">${SLIDERS.map((s) => `<label><span>${esc(s.label)} <b data-value="${s.id}"></b></span><input type="range" min="${s.min}" max="${s.max}" step="${s.step}" data-set="${s.id}"></label>`).join('')}
        <label><span>Battery <b data-value="battery"></b></span><select data-battery>${DAY.batteries.map((b) => `<option value="${esc(b.id)}">${esc(b.label)}: ${b.wh} Wh, ${(b.grams / 1000).toFixed(2)} kg, ${b.price} €</option>`).join('')}</select></label>
        <label class="lg-end-check"><input type="checkbox" data-stagger> Take off in turn</label></div>
      <p class="lg-end-verdict" data-verdict aria-live="polite"></p>
      <div class="lg-end-tiles" data-tiles></div>
      <div class="lg-end-chart" data-chart></div>
      <details class="lg-end-table"><summary>The same, in tables</summary><div data-tables></div></details>
      <div class="btn-row"><button type="button" class="btn small" data-pin>${api.icon('flag')}Keep this one to compare</button></div>
      <div class="lego-compare" data-compare></div>
    </div>`;
    const $ = (s) => root.querySelector(s);

    function fleetNow() {
      const battery = E.batteryOf(settings, DAY);
      if (source === 'mine') {
        const a = assembly || Assembly.fromPreview();
        return { label: 'Your assembly', masterInBase: bricksOf(a, LEGO.base.name).includes('Swarm Master'), drones: LEGO.drones.map((d) => ({ name: d.name, bricks: bricksOf(a, d.name), ...budget(bricksOf(a, d.name), battery) })) };
      }
      const p = DAY.presets.find((x) => x.id === source) || DAY.presets[0];
      return { label: p.label, drones: Object.entries(p.hosts).map(([name, bricks]) => ({ name, bricks, ...budget(bricks, battery) })) };
    }
    function renderFleets() {
      const all = DAY.presets.concat({ id: 'mine', label: 'Your assembly' });
      $('[data-fleets]').innerHTML = all.map((p) => `<button type="button" class="btn small ${p.id === source ? '' : 'ghost'}" aria-pressed="${p.id === source}" data-fleet="${esc(p.id)}">${esc(p.label)}</button>`).join('');
    }
    function renderControls() {
      SLIDERS.forEach((s) => {
        $(`[data-set="${s.id}"]`).value = settings[s.id];
        $(`[data-value="${s.id}"]`).textContent = `${settings[s.id]}${s.unit ? ` ${s.unit}` : ''}`;
      });
      $('[data-value="speed"]').textContent += `, ${E.cruiseEffort(settings.speed, DAY).toFixed(1)}× hover power`;
      const battery = E.batteryOf(settings, DAY);
      $('[data-battery]').value = battery.id;
      $('[data-value="battery"]').textContent = `full charge ${Math.round(E.chargeMinutes(battery, DAY))} min`;
      $('[data-stagger]').checked = !!settings.stagger;
    }
    function verdict(k) {
      if (!k.bricks) return { tone: 'warn', text: '▲ Nothing is plugged in your assembly yet: go back to the drones, or pick a fleet here.' };
      if (k.lost) return { tone: 'bad', text: `✗ ${k.lost} drone${k.lost > 1 ? 's' : ''} out of battery in flight: it never made it home.` };
      if (k.bearsLate) return { tone: 'bad', text: `✗ The bear reached the flock ${k.bearsLate} time${k.bearsLate > 1 ? 's' : ''} before a drone got there.` };
      if (k.sheepLate) return { tone: 'warn', text: `▲ ${k.sheepLate} stray sheep reached too late${k.flock < 60 ? ': nobody was watching when it left' : ''}.` };
      if (k.flock < 50) return { tone: 'warn', text: '▲ Every event is answered, but the flock is alone most of the time.' };
      return { tone: 'ok', text: '✓ Nothing lost, nobody late. What did it cost?' };
    }
    function renderTiles(k) {
      const tile = (name, value, note) => `<div class="lg-end-tile"><small>${esc(name)}</small><b>${esc(value)}</b>${note ? `<small>${esc(note)}</small>` : ''}</div>`;
      $('[data-tiles]').innerHTML = [
        tile('Flock watched', `${k.flock}%`, `perimeter ${k.zone}%`),
        tile('Slowest to a sheep', minutesText(k.worstSheep), `${k.sheepLate} too late`),
        tile('Slowest to a bear', minutesText(k.worstBear), `${k.bearsLate} too late`),
        tile('Drones lost', String(k.lost), ''),
        tile('Stress on the flock', `${k.stress}/100`, 'weight and noise overhead'),
        tile('Energy', `${(k.wh / 1000).toFixed(1)} kWh`, 'over the 4 hours'),
        tile('Price', `${k.price.toLocaleString('en')} €`, 'drones and chargers'),
        tile('Complexity', `${k.bricks} bricks`, `${k.designs} drone design${k.designs > 1 ? 's' : ''}`)
      ].join('');
    }
    function renderChart(r) {
      const at = (min) => (min / r.minutes) * 100;
      const hours = [];
      for (let h = 0; h <= r.minutes / 60; h += 1) hours.push(h);
      const legend = E.STATES.map((s) => `<span><i class="lg-st lg-st--${s}"></i>${esc(STATE_LABEL[s])}</span>`).join('');
      const rows = r.drones.map((d, i) => {
        const pts = d.trace.map((v, m) => `${m},${100 - v}`).join(' ');
        const segs = d.segments.map((s) => `<i class="lg-st lg-st--${s.state}" style="left:${at(s.from).toFixed(2)}%;width:calc(${at(s.to - s.from).toFixed(2)}% - 2px)"></i>`).join('');
        const types = d.bricks.map((t) => BRICK[t].short).join(' + ') || 'nothing plugged';
        return `<div class="lg-end-row" data-row="${i}"><div class="lg-end-name"><b>${esc(d.name)}</b><small>${esc(types)}</small><small>${esc(d.minutes)} min of flight</small>${d.lostAt === null ? '' : `<small class="lg-no">✗ lost at ${esc(clockOf(d.lostAt))}</small>`}</div>
          <div class="lg-end-plot"><svg class="lg-end-line" viewBox="0 0 ${r.minutes} 100" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="${r.minutes}" y1="${100 - settings.returnAt}" y2="${100 - settings.returnAt}" vector-effect="non-scaling-stroke"/><polyline points="${pts}" vector-effect="non-scaling-stroke"/></svg>
          <div class="lg-end-strip">${segs}</div><span class="lg-end-cross" hidden></span>${r.events.map((e) => `<span class="lg-end-mark" style="left:${at(e.at).toFixed(2)}%"></span>`).join('')}</div></div>`;
      }).join('');
      $('[data-chart]').innerHTML = `<div class="lg-end-legend">${legend}<span><i class="lg-end-key"></i>Battery, dashed where it flies home</span></div>
        <div class="lg-end-row lg-end-row--head"><div class="lg-end-name"></div><div class="lg-end-events">${r.events.map((e) => `<span class="lg-end-event lg-end-event--${e.kind}" style="left:${at(e.at).toFixed(2)}%" title="${esc(clockOf(e.at))}: ${esc(e.say)}">${e.kind === 'bear' ? 'Bear' : 'Sheep'}</span>`).join('')}</div></div>
        ${rows}
        <div class="lg-end-row lg-end-row--axis"><div class="lg-end-name"></div><div class="lg-end-axis">${hours.map((h) => `<span style="left:${at(h * 60).toFixed(2)}%">${h} h</span>`).join('')}</div></div>
        <div class="lg-end-tip" hidden></div>`;
    }
    function renderTables(r) {
      const time = (s) => Math.round(s.to - s.from);
      const events = `<table class="lego-table"><caption>What happened</caption><thead><tr><th>When</th><th>What</th><th>First drone there</th><th>In time?</th></tr></thead><tbody>${r.events.map((e) => `<tr><td>${esc(clockOf(e.at))}</td><td>${esc(e.say)}</td><td>${esc(e.reaction === null ? 'nobody' : `after ${minutesText(e.reaction)}`)}</td><td class="${e.late ? 'no' : 'ok'}">${e.late ? `✗ (${e.grace} min allowed)` : '✓'}</td></tr>`).join('')}</tbody></table>`;
      const spent = `<table class="lego-table"><caption>Minutes in each state</caption><thead><tr><th>Drone</th>${E.STATES.map((s) => `<th>${esc(STATE_LABEL[s])}</th>`).join('')}</tr></thead><tbody>${r.drones.map((d) => `<tr><td>${esc(d.name)}</td>${E.STATES.map((s) => `<td>${d.segments.filter((x) => x.state === s).reduce((n, x) => n + time(x), 0)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      $('[data-tables]').innerHTML = events + spent;
    }
    function renderCompare() {
      const runs = store.read().enduranceRuns || [];
      const box = $('[data-compare]');
      if (!runs.length) { box.innerHTML = ''; return; }
      box.innerHTML = `<table class="lego-table"><caption>Your trade-offs</caption><thead><tr><th>Solution</th><th>Flock watched</th><th>To a sheep</th><th>To a bear</th><th>Too late</th><th>Lost</th><th>Stress</th><th>Energy</th><th>Price</th><th>Bricks</th></tr></thead><tbody>${runs.map((x) => `<tr><td>${esc(x.label)}</td><td>${x.k.flock}%</td><td>${esc(minutesText(x.k.worstSheep))}</td><td>${esc(minutesText(x.k.worstBear))}</td><td>${x.k.sheepLate + x.k.bearsLate}</td><td>${x.k.lost}</td><td>${x.k.stress}</td><td>${(x.k.wh / 1000).toFixed(1)} kWh</td><td>${x.k.price.toLocaleString('en')} €</td><td>${x.k.bricks}</td></tr>`).join('')}</tbody></table><button type="button" class="sim-link" data-forget-runs>Forget these results</button>`;
    }
    function run() {
      const fleet = fleetNow();
      label = fleet.label;
      result = E.simulate(fleet, settings, DAY);
      renderFleets();
      renderControls();
      const v = verdict(result.kpi);
      const line = $('[data-verdict]');
      line.textContent = v.text;
      line.className = `lg-end-verdict is-${v.tone}`;
      renderTiles(result.kpi);
      renderChart(result);
      renderTables(result);
      store.write(Object.assign(store.read(), { endurance: { settings, source } }));
    }
    function hover(e) {
      const plot = e.target.closest && e.target.closest('.lg-end-plot');
      const tip = $('.lg-end-tip');
      root.querySelectorAll('.lg-end-cross').forEach((c) => { c.hidden = true; });
      if (!plot || !result) { if (tip) tip.hidden = true; return; }
      const box = plot.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width));
      const min = x * result.minutes;
      const row = Number(plot.parentElement.dataset.row);
      const d = result.drones[row];
      const seg = d.segments.find((s) => min >= s.from && min < s.to) || d.segments[d.segments.length - 1];
      root.querySelectorAll('.lg-end-cross').forEach((c) => { c.hidden = false; c.style.left = `${(x * 100).toFixed(2)}%`; });
      const chart = $('[data-chart]').getBoundingClientRect();
      tip.hidden = false;
      tip.innerHTML = `<b>${esc(d.name)}</b> at ${esc(clockOf(min))}<br>${esc(STATE_LABEL[seg.state])}<br>Battery ${Math.round(d.trace[Math.min(d.trace.length - 1, Math.floor(min))])}%`;
      tip.style.left = `${Math.min(chart.width - 190, Math.max(0, e.clientX - chart.left + 12))}px`;
      tip.style.top = `${box.top - chart.top - 8}px`;
    }
    root.addEventListener('input', (e) => {
      const id = e.target.dataset && e.target.dataset.set;
      if (id) { settings[id] = Number(e.target.value); run(); return; }
      if (e.target.matches('[data-battery]')) { settings.battery = e.target.value; run(); return; }
      if (e.target.matches('[data-stagger]')) { settings.stagger = e.target.checked; run(); }
    });
    root.addEventListener('click', (e) => {
      const f = e.target.closest('[data-fleet]');
      if (f) { source = f.dataset.fleet; run(); return; }
      if (e.target.closest('[data-pin]')) {
        const all = store.read();
        const name = `${label} · home at ${settings.returnAt}% · ${settings.km} km · ${settings.slots} charger${settings.slots > 1 ? 's' : ''} · ${E.batteryOf(settings, DAY).label.toLowerCase()} battery · ${settings.speed} m/s${settings.stagger ? '' : ' · together'}`;
        all.enduranceRuns = (all.enduranceRuns || []).filter((x) => x.label !== name).concat({ label: name, k: result.kpi }).slice(-8);
        store.write(all);
        renderCompare();
        return;
      }
      if (e.target.closest('[data-forget-runs]')) {
        const all = store.read();
        delete all.enduranceRuns;
        store.write(all);
        renderCompare();
      }
    });
    root.addEventListener('pointermove', hover);
    root.addEventListener('pointerleave', () => { const t = $('.lg-end-tip'); if (t) t.hidden = true; root.querySelectorAll('.lg-end-cross').forEach((c) => { c.hidden = true; }); });
    const off = Assembly.subscribe((a) => {
      const was = assembly && signature(assembly);
      assembly = a;
      if (source === 'mine' && was !== signature(a)) run();
    });
    run();
    renderCompare();
    return off;
  };

  /* ───────── the mission alone (chapter 3) ───────── */
  W.missionCheck = function (root, opts, api) {
    const CHECK = LEGO.missionCheck;
    if (!CHECK) { root.textContent = ''; return undefined; }
    let alive = true;
    root.innerHTML = `<div class="lg-validate"><div class="btn-row"><button type="button" class="btn small" data-go>${api.icon('play')}Check my regions in Cameo</button></div><p class="lg-validate-out" aria-live="polite" data-out></p><ul class="lg-validate-res" data-res></ul></div>`;
    const out = root.querySelector('[data-out]');
    const res = root.querySelector('[data-res]');
    const B = window.Bridge;
    async function read() {
      try { return ((await B.call('simtest', 'states', [{ paths: [CHECK.mission] }])).states || {})[CHECK.mission] || []; } catch (e) { return null; }
    }
    async function until(ok, patience) {
      for (let waited = 0; alive; waited += 500) {
        const have = await read();
        if (have && ok(have)) return have;
        if (waited >= patience) return have || [];
        await pause(500);
      }
      return [];
    }
    async function go(btn) {
      res.innerHTML = '';
      if (!linked()) { out.textContent = 'The guide is not linked to Cameo: use the Cameo button at the top.'; return; }
      btn.disabled = true;
      let started = false;
      let wrong = 0;
      try {
        out.textContent = 'Starting the mission in Cameo…';
        const found = await B.call('model', 'getElementsByName', [{ name: CHECK.context }]);
        const block = (Array.isArray(found) ? found : []).find((e) => e && e.metaclass === 'Class');
        if (!block) { out.textContent = `This project has no block named “${CHECK.context}”: open the model of Part 4.`; return; }
        await B.call('simtest', 'start', [{ elementId: block.id }], 30000);
        started = true;
        await until((h) => h.length > 0, 20000);
        await pause(1000);
        out.textContent = 'The operator starts the system and sends the flight plan…';
        const ready = await until((h) => h.includes(CHECK.until), CHECK.patience);
        if (!ready.includes(CHECK.until)) { out.innerHTML = `<b class="lg-red-t">✗ The mission did not reach ${esc(CHECK.until)}.</b>`; return; }
        await pause(CHECK.settle || 0);
        for (const step of CHECK.steps) {
          if (!alive) return;
          out.textContent = step.say;
          await B.call('simtest', 'send', [step.signal, step.into]);
          const have = await until((h) => step.want.every((w) => h.includes(w)), 10000);
          const ok = step.want.every((w) => have.includes(w));
          if (!ok) wrong += 1;
          res.insertAdjacentHTML('beforeend', `<li class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✗'} <b>${esc(step.say)}</b> ${esc(step.want.join(', '))}${ok ? '' : ` <span class="lg-validate-have">${esc(step.no)}</span>`}</li>`);
        }
        out.innerHTML = wrong ? `<b class="lg-red-t">✗ Not in parallel yet.</b>` : '<b>✓ Your regions hold: all three concerns live at the same time.</b>';
        if (!wrong && api.confetti) api.confetti();
      } catch (e) {
        const m = (e && e.message) || 'error';
        out.textContent = m === 'unknown-method' ? 'Your plugin is too old to run this from the guide: install the latest one.' : `Cameo stopped: ${m}.`;
      } finally {
        if (started) B.call('simtest', 'stop', []).catch(() => {});
        btn.disabled = false;
      }
    }
    root.querySelector('[data-go]').addEventListener('click', (e) => go(e.currentTarget));
    return () => { alive = false; };
  };

  /* ───────── the components, one click each ─────────
     Every brick of the box and the two given blocks: its icon (the same drawing as the image of the block in the model), its
     name; a click says what it does, which region of the mission it answers to and where it can go. opts.given: false hides
     the given blocks. */
  const brickIcon = (b) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b.icon || ''}</svg>`;
  const WHERE = { feature: 'In a drone, as many drones as you want', post: 'In a drone', brain: '', ground: 'In the Base Station, once' };
  W.brickPanel = function (root, opts) {
    opts = opts || {};
    const all = (LEGO.bricks || []).map((b) => Object.assign({ group: b.kind === 'ground' ? 'Bricks for the base station' : 'Bricks for the drones' }, b))
      .concat(opts.given === false ? [] : (LEGO.given || []).map((b) => Object.assign({ group: 'Given, already in the model', kind: 'given' }, b)));
    if (!all.length) { root.textContent = ''; return; }
    root.className = 'w lego-panel';
    const groups = [...new Set(all.map((b) => b.group))];
    root.innerHTML = groups.map((g) => `<p class="mono-label">${esc(g)}</p><div class="lego-panel-grid" role="group" aria-label="${esc(g)}">${all.map((b, i) => (b.group !== g ? '' :
      `<button type="button" class="lego-panel-btn${b.kind === 'given' ? ' is-given' : ''}" style="--tone:${esc(b.tone)}" aria-pressed="false" data-i="${i}"><span class="lego-panel-ico">${brickIcon(b)}</span><span>${esc(b.type)}</span></button>`)).join('')}</div>`).join('') +
      '<div class="lego-panel-out" aria-live="polite"></div>';
    const out = root.querySelector('.lego-panel-out');
    const where = (b) => b.where || (b.type === 'Swarm Master' ? 'Once: in the base station, or in one drone' : b.type === 'Swarm Reflex' ? 'One in each drone' : WHERE[b.kind] || '');
    function show(i) {
      const b = all[i];
      root.querySelectorAll('[data-i]').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.i === i)));
      out.style.setProperty('--tone', b.tone);
      out.innerHTML = `<span class="lego-panel-ico big">${brickIcon(b)}</span><div><b>${esc(b.type)}</b><p>${esc(b.what || '')}</p><ul>${b.region ? `<li>Region of the mission: <b>${esc(b.region)}</b></li>` : ''}${where(b) ? `<li>${esc(where(b))}</li>` : ''}${b.state ? `<li>At work in the state <code>${esc(b.state)}</code></li>` : ''}</ul></div>`;
    }
    root.addEventListener('click', (e) => { const btn = e.target.closest('[data-i]'); if (btn) show(+btn.dataset.i); });
    show(0);
  };
})();
