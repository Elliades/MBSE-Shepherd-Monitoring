/* Part 4 lab (POC): the assembly bay. Holds the drone being built (its parts and connectors),
   works out what is powered and which capabilities are complete, and keeps the three views in step:
   the palette, the internal block diagram and the 3D drone. */
(function () {
  'use strict';
  const L = window.LAB;
  const $ = (s) => document.querySelector(s);
  const KEY = 'mbse-shepherd:part4-lab:v1';
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private window */ } }
  };

  const ORDER = ['energy', 'prop', 'fc', 'nav', 'mc', 'wifi', 'fleet', 'eo', 'ir', 'det', 'relay', 'sw-zone', 'sw-flock', 'sw-pred', 'sw-engage', 'sw-swarm'];
  const saved = store.get() || {};
  const st = {
    target: saved.target === undefined ? 'guard' : saved.target,
    master: !!saved.master,
    parts: new Set(),
    wires: [],
    view: 'both',
    mode: 'solid',
    fresh: null,
    dragging: null,
    running: true,
    busy: false
  };

  /* ── what follows from the parts and connectors ── */
  const key = L.IBD.wireKey;
  function derive() {
    const ws = new Set(st.wires.map(key));
    const powered = new Set();
    if (st.parts.has('energy')) {
      powered.add('energy');
      st.parts.forEach((id) => { if (ws.has(`energy.pwr>${id}.pwr`)) powered.add(id); });
      if (powered.has('mc')) st.parts.forEach((id) => { if (L.BY[id].kind === 'sw') powered.add(id); });
    }
    const caps = new Set();
    const done = (c) => c.parts.every((p) => st.parts.has(p)) && c.wires.every((w) => ws.has(key(w)));
    for (let pass = 0; pass < 2; pass++) L.CAPS.forEach((c) => { if (done(c) && (c.needs || []).every((n) => caps.has(n))) caps.add(c.id); });
    const live = new Set();
    st.wires.forEach((w) => { if (powered.has(w.a.part) && powered.has(w.b.part)) live.add(key(w)); });
    const tcaps = st.target ? L.variantCaps(st.target, st.master) : [];
    const rec = L.recipe(tcaps);
    return { wireSet: ws, powered, caps, live, need: new Set(rec.parts), recipe: rec, tcaps };
  }
  function matchVariant(caps) {
    for (const v of L.VARIANTS) for (const m of [false, true]) {
      const c = L.variantCaps(v.id, m);
      if (c.length === caps.size && c.every((x) => caps.has(x))) return { v, m, name: L.variantName(v.id, m) };
    }
    return null;
  }

  let D = derive();
  const ibd = L.IBD.create($('#ibd-host'), {
    connect: (a, b) => connect(a, b, true),
    removePart: (id) => removePart(id),
    removeWire: (k) => { st.wires = st.wires.filter((w) => key(w) !== k); render(); sfx('pop'); }
  });
  const d3 = L.Drone3D.create($('#drone-host'));
  const traffic = L.Traffic.create({ ibd, d3, onHop: () => {} });

  /* ── sound: a few synthesised clicks, nothing to download ── */
  let actx = null, soundOn = saved.sound !== false;
  function sfx(kind) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
      o.connect(g); g.connect(actx.destination);
      const S = {
        drop: ['triangle', 180, 70, 0.22, 0.16], snap: ['square', 900, 1400, 0.05, 0.06], pop: ['sine', 500, 200, 0.06, 0.08],
        bad: ['sawtooth', 140, 110, 0.18, 0.06], cap: ['sine', 660, 1320, 0.32, 0.09], hop: ['sine', 1200, 1500, 0.04, 0.025]
      }[kind];
      o.type = S[0]; o.frequency.setValueAtTime(S[1], t); o.frequency.exponentialRampToValueAtTime(S[2], t + S[3]);
      g.gain.setValueAtTime(S[4], t); g.gain.exponentialRampToValueAtTime(0.0001, t + S[3] + 0.05);
      o.start(t); o.stop(t + S[3] + 0.06);
    } catch (e) { /* no audio */ }
  }

  let toastT = 0;
  function toast(text, tone) {
    const t = $('#toast');
    t.textContent = text; t.dataset.tone = tone || '';
    t.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2600);
  }

  /* ── changes ── */
  function addPart(id, quiet) {
    if (st.parts.has(id)) { ibd.pulse(id); return false; }
    const b = L.BY[id];
    if (b.kind === 'sw' && !st.parts.has('mc')) { toast('Software runs on the Mission Computer: drop the Mission Computer first.', 'bad'); sfx('bad'); return false; }
    const before = D.caps;
    st.parts.add(id); st.fresh = id;
    render(before);
    if (!quiet) sfx('drop');
    return true;
  }
  function removePart(id) {
    const gone = new Set([id]);
    if (id === 'mc') st.parts.forEach((p) => { if (L.BY[p].kind === 'sw') gone.add(p); });
    gone.forEach((p) => st.parts.delete(p));
    st.wires = st.wires.filter((w) => !gone.has(w.a.part) && !gone.has(w.b.part));
    render(); sfx('pop');
  }
  function connect(a, b, byHand) {
    const r = L.IBD.check(a, b, st.wires);
    if (!r.ok) { if (byHand) { toast(r.why, 'bad'); ibd.shake(a.part); ibd.shake(b.part); sfx('bad'); } return false; }
    const before = D.caps;
    st.wires.push(r.wire); st.fresh = key(r.wire);
    render(before);
    sfx('snap');
    return true;
  }

  /* ── render ── */
  let lastCaps = new Set();
  function render(before) {
    D = derive();
    const view = { ...st, ...D, title: ibdTitle() };
    ibd.render(view);
    d3.render({ ...view, airborne: true, color: st.target ? L.VAR[st.target].color : '' });
    renderPalette(); renderCaps(); renderNext(); renderBudget(); renderActs(); renderIdentity();
    /* a capability just completed: say it */
    const was = before || lastCaps;
    const fresh = [...D.caps].filter((c) => !was.has(c));
    if (fresh.length && before) {
      const c = L.CAP[fresh[fresh.length - 1]];
      toast(c.id === 'fly' ? 'Fly: complete. The drone takes off.' : `${c.name}: complete.`, 'ok');
      setTimeout(() => sfx('cap'), 120);
      const n = $(`#caps [data-cap="${c.id}"]`); if (n) { n.classList.add('is-new'); setTimeout(() => n.classList.remove('is-new'), 1200); }
    }
    lastCaps = D.caps;
    st.fresh = null;
    store.set({ target: st.target, master: st.master, sound: soundOn, parts: [...st.parts], wires: st.wires.map(key) });
  }

  function renderTargets() {
    const host = $('#targets');
    host.innerHTML = L.VARIANTS.map((v) => `
      <button role="radio" aria-checked="${st.target === v.id}" data-target="${v.id}" style="--vc:${v.color}">
        <i></i><span><strong>${v.name}</strong>${v.note ? `<small>${v.note}</small>` : ''}</span>
        <span class="cap-dots">${v.caps.filter((c) => !['fly', 'ground', 'fleet'].includes(c)).map((c) => `<b class="cap-${c}" title="${L.CAP[c].name}"></b>`).join('')}</span>
      </button>`).join('') +
      `<button role="radio" aria-checked="${!st.target}" data-target="" class="free"><i></i><span><strong>Free build</strong><small>no target, see what you get</small></span></button>`;
    $('#master-toggle').checked = st.master;
    const v = st.target && L.VAR[st.target];
    $('#target-blurb').textContent = v ? v.blurb + (st.master ? ' Master derivative: it also leads the swarm.' : '') : 'Drop any block. The lab tells you which variant you built.';
  }

  function renderPalette() {
    const groups = {};
    L.BLOCKS.forEach((b) => { (groups[b.group] = groups[b.group] || []).push(b); });
    $('#palette').innerHTML = Object.keys(groups).map((g) => `
      <div class="pal-group"><h3>${g}</h3>${groups[g].map((b) => {
        const placed = st.parts.has(b.id), need = D.need.has(b.id), extra = st.target && placed && !need;
        return `<button class="pal-card kind-${b.kind}${placed ? ' is-placed' : ''}${need && !placed ? ' is-need' : ''}${extra ? ' is-extra' : ''}" data-block="${b.id}"
          title="${b.what}${extra ? ' (not needed by the target)' : ''}">
          <span class="pal-ico">${icon(b.id)}</span>
          <span class="pal-txt"><strong>${b.name}</strong><small>${b.kind === 'sw' ? '«software»' : b.mass + ' g'}${b.master ? ' · master' : ''}</small></span>
          <span class="pal-state">${placed ? '✓' : need ? '' : ''}</span>
        </button>`;
      }).join('')}</div>`).join('');
  }

  function missingOf(c) {
    const ws = D.wireSet;
    const parts = c.parts.filter((p) => !st.parts.has(p)).map((p) => ({ part: p }));
    const wires = c.wires.filter((w) => !ws.has(key(w))).map((w) => ({ wire: w }));
    return parts.concat(wires);
  }
  const wireText = (w) => `${L.BY[w.a.part].name}.${L.IBD.portDef(w.a.part, w.a.port).name} → ${L.BY[w.b.part].name}.${L.IBD.portDef(w.b.part, w.b.port).name}`;

  function renderCaps() {
    const list = st.target ? D.tcaps.map((c) => L.CAP[c]) : L.CAPS;
    $('#caps').innerHTML = list.map((c) => {
      const ok = D.caps.has(c.id);
      const miss = ok ? [] : missingOf(c);
      const total = c.parts.length + c.wires.length;
      const pct = Math.round(((total - miss.length) / total) * 100);
      return `<div class="cap${ok ? ' is-ok' : ''}" data-cap="${c.id}" style="--p:${pct}%" title="${ok ? 'Complete' : miss.slice(0, 6).map((m) => m.part ? 'Add ' + L.BY[m.part].name : 'Connect ' + wireText(m.wire)).join('\n')}">
        <span class="cap-ico cap-${c.id}">${capIcon(c.id)}</span><span class="cap-name">${c.name}</span><span class="cap-bar"><i></i></span>
      </div>`;
    }).join('');
  }

  /* The next thing to do for the target, said in plain words. */
  function renderNext() {
    const n = $('#next-hint');
    if (!st.target) { n.innerHTML = D.caps.size ? `Capabilities: <strong>${[...D.caps].map((c) => L.CAP[c].name).join(', ')}</strong>` : 'Free build: drop a block to start. The <strong>Energy System</strong> feeds all the others.'; return; }
    for (const c of D.tcaps.map((x) => L.CAP[x])) {
      if (D.caps.has(c.id)) continue;
      const parts = c.parts.filter((p) => !st.parts.has(p));
      const order = parts.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
      if (order.length) { n.innerHTML = `<span class="mono">next</span> Drop <strong>${L.BY[order[0]].name}</strong> <em>(for ${c.name})</em>`; return; }
      const w = c.wires.find((x) => !D.wireSet.has(key(x)));
      if (w) {
        const f = L.IF[L.IBD.portDef(w.a.part, w.a.port).iface];
        n.innerHTML = `<span class="mono">next</span> Connect <strong>${wireText(w)}</strong> <em>${L.IBD.portDef(w.a.part, w.a.port).iface} · ${f.flow}</em>`;
        return;
      }
    }
    n.innerHTML = `<span class="mono ok">done</span> <strong>${L.variantName(st.target, st.master)}</strong> is complete. Try it on the right, or add it to the fleet.`;
  }

  function budget() {
    /* a rough model, enough to show the trade-off: the airframe is 700 g, hover power grows with mass^1.3 */
    let mass = 700, pw = 0;
    st.parts.forEach((id) => { mass += L.BY[id].mass; if (D.powered.has(id)) pw += L.BY[id].power; });
    const kg = mass / 1000, hover = 110 * Math.pow(kg, 1.3);
    const can = st.parts.has('energy') && st.parts.has('prop');
    return { mass, pw, hover, endurance: can ? (222 * 0.85 * 60) / (hover + pw) : 0 };
  }
  function renderBudget() {
    const b = budget();
    const end = b.endurance ? Math.round(b.endurance) + ' min' : '–';
    $('#budget').innerHTML = `
      <div><span>Mass</span><strong>${(b.mass / 1000).toFixed(2)} kg</strong></div>
      <div><span>Payload power</span><strong>${b.pw} W</strong></div>
      <div><span>Endurance</span><strong class="${b.endurance && b.endurance < 23 ? 'warn' : ''}">${end}</strong></div>`;
  }

  function renderIdentity() {
    const m = matchVariant(D.caps);
    const badge = $('#drone-badge');
    const t = st.target ? L.VAR[st.target] : null;
    let html;
    if (m && t && m.v.id === st.target && m.m === st.master) html = `<b style="--vc:${m.v.color}">${m.name}</b><span>ready</span>`;
    else if (m) html = `<b style="--vc:${m.v.color}">${m.name}</b><span>${t ? 'not the target yet' : 'this is the variant you built'}</span>`;
    else if (D.caps.has('fly')) html = `<b>Custom drone</b><span>flies, but no variant has these capabilities</span>`;
    else html = `<b>${st.parts.size ? 'On the bench' : 'Empty airframe'}</b><span>${st.parts.size} part${st.parts.size === 1 ? '' : 's'} · ${st.wires.length} connector${st.wires.length === 1 ? '' : 's'}</span>`;
    badge.innerHTML = html;
    $('#drone-name').textContent = m ? m.name : st.target ? L.variantName(st.target, st.master) : 'Your drone';
    const can = D.caps.has('fly') && D.caps.has('fleet');
    const hb = $('#hangar-btn');
    hb.disabled = !can;
    hb.querySelector('span').textContent = can ? `Add ${m ? m.name : 'this drone'} to the fleet` : 'Add to the fleet (needs Fly and Fleet link)';
  }

  /* ── things to try on the built drone: each one is a chain of item flows ── */
  let heading = 0;
  const ACTS = [
    { id: 'plan', label: 'Send a flight plan', cap: 'ground', run: () => [
      { wire: 'wifi.gnd>mc.gnd', dir: 1, label: 'FlightPlan', from: 'wifi', to: 'mc' },
      ...(D.caps.has('zone') ? [{ at: 'sw-zone', note: 'Zone Patrol: route over the zone', wait: 500 }] : [{ at: 'mc', wait: 300 }]),
      { wire: 'mc.guid>fc.guid', dir: 1, label: 'Waypoint', from: 'mc', to: 'fc' },
      { wire: 'nav.nav2>fc.nav', dir: 1, label: 'Position', from: 'nav', to: 'fc' },
      { wire: 'fc.mot>prop.cmd', dir: 1, label: 'MotorCmd', from: 'fc', to: 'prop' },
      { at: 'prop', note: 'The drone turns to its first waypoint', fx: () => d3.turn(heading += 90), wait: 900 }
    ] },
    { id: 'flock', label: 'Count the flock', cap: 'sheep', run: () => [
      { wire: 'eo.vid>mc.vid', dir: 1, label: 'VideoFrame', from: 'eo', to: 'mc' },
      { at: 'sw-flock', note: 'Flock Tracker: 30 / 30 sheep', wait: 650 },
      { wire: 'wifi.gnd>mc.gnd', dir: -1, label: 'FlockReport', from: 'mc', to: 'wifi' },
      { at: 'wifi', act: 'radio', wait: 300 },
      { wire: 'fleet.fleet>mc.fleet', dir: -1, label: 'FlockStatus', from: 'mc', to: 'fleet' },
      { at: 'fleet', act: 'radio', note: 'Told to the fleet', wait: 300 }
    ] },
    { id: 'zone', label: 'Watch the zone', cap: 'zone', run: () => [
      { wire: 'eo.vid>mc.vid', dir: 1, label: 'VideoFrame', from: 'eo', to: 'mc' },
      { at: 'sw-zone', note: 'Zone Patrol: something moves near the fence', wait: 650 },
      { wire: 'fleet.fleet>mc.fleet', dir: -1, label: 'Intrusion(x, y)', from: 'mc', to: 'fleet' },
      { at: 'fleet', act: 'radio', wait: 300 }
    ] },
    { id: 'bear', label: 'A bear!', cap: 'predator', hot: true, run: () => [
      { wire: 'ir.ir>mc.ir', dir: 1, label: 'ThermalFrame', from: 'ir', to: 'mc' },
      { at: 'sw-pred', note: 'Predator Recognition: bear, 94 %', act: 'beam', wait: 700 },
      ...(D.caps.has('engage') ? [
        { at: 'sw-engage', note: 'Engage Manager: scare it away', wait: 500 },
        { wire: 'mc.det>det.det', dir: 1, label: 'Deter', from: 'mc', to: 'det' },
        { at: 'det', act: 'sound', note: 'Light and sound', wait: 900 }
      ] : []),
      { wire: 'fleet.fleet>mc.fleet', dir: -1, label: 'PredatorAlert', from: 'mc', to: 'fleet' },
      { at: 'fleet', act: 'radio', wait: 300 },
      ...(D.caps.has('master') ? [
        { wire: 'relay.relay>fleet.relay', dir: -1, label: 'AlertToBase', from: 'fleet', to: 'relay' },
        { at: 'relay', act: 'radio', note: 'Relayed to the base station', wait: 300 }
      ] : [])
    ] },
    { id: 'order', label: 'Lead the swarm', cap: 'master', run: () => [
      { wire: 'relay.relay>fleet.relay', dir: 1, label: 'MissionOrder', from: 'relay', to: 'fleet' },
      { wire: 'fleet.fleet>mc.fleet', dir: 1, label: 'MissionOrder', from: 'fleet', to: 'mc' },
      { at: 'sw-swarm', note: 'Swarm Coordinator: one zone per drone', wait: 700 },
      { wire: 'fleet.fleet>mc.fleet', dir: -1, label: 'Assign ×3', from: 'mc', to: 'fleet' },
      { at: 'fleet', act: 'radio', wait: 400 }
    ] }
  ];
  function renderActs() {
    $('#acts').innerHTML = ACTS.map((a) => {
      const ok = D.caps.has(a.cap);
      return `<button class="act${a.hot ? ' act--hot' : ''}" data-act="${a.id}" ${ok ? '' : 'disabled'} title="${ok ? '' : 'Needs ' + L.CAP[a.cap].name}">
        <span class="cap-ico cap-${a.cap}">${capIcon(a.cap)}</span>${a.label}</button>`;
    }).join('');
  }
  async function runAct(id) {
    const a = ACTS.find((x) => x.id === id);
    if (!a || st.busy) return;
    st.busy = true;
    document.body.classList.add('is-busy');
    await traffic.chain(a.run(), () => D, (h) => {
      if (h.from) { trace(`${L.BY[h.from].short} → ${L.BY[h.to].short}`, h.text, h.fam); sfx('hop'); }
      else if (h.note) trace('', h.text, 'note');
      else if (h.broken) trace('', h.text, 'bad');
    });
    st.busy = false;
    document.body.classList.remove('is-busy');
  }
  function trace(who, what, fam) {
    const ol = $('#trace');
    const li = document.createElement('li');
    li.className = 'tr-' + (fam || 'x');
    li.innerHTML = who ? `<span class="who">${who}</span><span class="what">${what}</span>` : `<span class="what">${what}</span>`;
    ol.prepend(li);
    while (ol.children.length > 5) ol.lastChild.remove();
  }

  /* ── automatic building ── */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function autoBuild(onlyWires) {
    if (st.busy) return;
    if (!st.target && !onlyWires) { toast('Choose a target first, then the lab can build it.'); return; }
    st.busy = true; document.body.classList.add('is-busy');
    const rec = st.target ? D.recipe : L.recipe(L.CAPS.map((c) => c.id));
    if (!onlyWires) {
      for (const p of ORDER) if (rec.parts.includes(p) && !st.parts.has(p)) { addPart(p); await wait(430); }
    }
    for (const w of rec.wires) {
      if (st.parts.has(w.a.part) && st.parts.has(w.b.part) && !D.wireSet.has(key(w))) { connect(w.a, w.b, false); await wait(onlyWires ? 160 : 210); }
    }
    st.busy = false; document.body.classList.remove('is-busy');
  }

  /* ── palette drag and drop (pointer events: mouse, pen and touch alike) ── */
  let pd = null;
  $('#palette').addEventListener('pointerdown', (e) => {
    const card = e.target.closest('[data-block]');
    if (!card || card.classList.contains('is-placed')) return;
    e.preventDefault();
    pd = { id: card.getAttribute('data-block'), x: e.clientX, y: e.clientY, moved: false, ghost: null, card };
    card.setPointerCapture(e.pointerId);
  });
  $('#palette').addEventListener('pointermove', (e) => {
    if (!pd) return;
    if (!pd.moved && Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 6) {
      pd.moved = true;
      pd.ghost = pd.card.cloneNode(true); pd.ghost.classList.add('pal-ghost');
      document.body.appendChild(pd.ghost);
      st.dragging = pd.id; ibd.render({ ...st, ...D, title: ibdTitle() });
      document.body.classList.add('is-dragging');
    }
    if (pd.ghost) {
      pd.ghost.style.transform = `translate(${e.clientX - 40}px, ${e.clientY - 22}px) rotate(-3deg)`;
      const over = ibd.hit(e.clientX, e.clientY) || overDrone(e);
      document.body.classList.toggle('is-over-drop', over);
    }
  });
  const pdEnd = (e) => {
    if (!pd) return;
    const d = pd; pd = null;
    document.body.classList.remove('is-dragging', 'is-over-drop');
    st.dragging = null;
    if (d.ghost) d.ghost.remove();
    if (e.type === 'pointercancel') { render(); return; }
    if (!d.moved || ibd.hit(e.clientX, e.clientY) || overDrone(e)) { if (!addPart(d.id)) render(); }
    else render();
  };
  $('#palette').addEventListener('pointerup', pdEnd);
  $('#palette').addEventListener('pointercancel', pdEnd);
  function overDrone(e) { const r = $('#drone-host').getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }
  function ibdTitle() { return st.target ? `ibd [Block] ${L.variantName(st.target, st.master)} [Drone]` : 'ibd [Block] Drone [Drone]'; }

  /* ── controls ── */
  $('#targets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-target]'); if (!b) return;
    st.target = b.getAttribute('data-target') || null;
    renderTargets(); render();
  });
  $('#master-toggle').addEventListener('change', (e) => { st.master = e.target.checked; renderTargets(); render(); });
  $('#view-seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]'); if (!b) return;
    st.view = b.getAttribute('data-view');
    $('#view-seg').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    render();
  });
  $('#mode-seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]'); if (!b) return;
    st.mode = b.getAttribute('data-mode'); d3.setMode(st.mode);
    $('#mode-seg').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  $('#wire-btn').addEventListener('click', () => autoBuild(true));
  $('#auto-btn').addEventListener('click', () => autoBuild(false));
  $('#reset-btn').addEventListener('click', () => { traffic.clear(); st.parts.clear(); st.wires = []; heading = 0; d3.turn(0); render(); sfx('pop'); });
  $('#acts').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) runAct(b.getAttribute('data-act')); });
  $('#sound-btn').addEventListener('click', (e) => { soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', soundOn); render(); });
  $('#sound-btn').setAttribute('aria-pressed', soundOn);
  $('#theme-btn').addEventListener('click', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark');
  });

  /* ── the fleet ── */
  const fleet = L.Fleet ? L.Fleet.create({ map: $('#map-host'), seq: $('#seq-host'), inside: $('#inside'), hangar: $('#hangar'), toast, sfx, onCount: (n) => { const c = document.getElementById('hangar-count'); if (c) c.textContent = n; }, openDrone }) : null;
  /* A drone of the fleet, opened on the bench in x-ray, to watch one message go through its subsystems. */
  function openDrone(d, act) {
    traffic.clear();
    st.target = d.variant || null; st.master = d.caps.includes('master');
    const rec = L.recipe(d.caps);
    st.parts = new Set(rec.parts); st.wires = rec.wires.map((w) => ({ a: { ...w.a }, b: { ...w.b } }));
    selectTab('build');
    renderTargets(); render();
    st.mode = 'xray'; d3.setMode('xray');
    $('#mode-seg').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x.getAttribute('data-mode') === 'xray'));
    toast(`${d.id} ${d.name} on the bench, in x-ray.`);
    setTimeout(() => runAct(act), 900);
  }
  $('#hangar-btn').addEventListener('click', () => {
    const m = matchVariant(D.caps);
    if (!fleet) return;
    const n = fleet.add({ caps: [...D.caps], name: m ? m.name : 'Custom', color: m ? m.v.color : '#64748b', variant: m ? m.v.id : null, parts: [...st.parts] });
    $('#hangar-count').textContent = n;
    toast(`${m ? m.name : 'Custom drone'} joins the fleet (${n} drones).`, 'ok');
    sfx('cap');
  });
  if (fleet) $('#hangar-count').textContent = fleet.count();
  function selectTab(t) {
    document.querySelectorAll('.lab-tabs [data-tab]').forEach((x) => x.setAttribute('aria-selected', x.getAttribute('data-tab') === t));
    $('#view-build').hidden = t !== 'build';
    $('#view-fleet').hidden = t !== 'fleet';
    if (fleet) fleet.show(t === 'fleet');
  }
  document.querySelector('.lab-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]'); if (b) selectTab(b.getAttribute('data-tab'));
  });

  /* ── the clock ── */
  let prev = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    try {
      if (!$('#view-build').hidden) {
        d3.frameTick(dt);
        traffic.tick(dt, { ...st, ...D });
      }
      if (fleet) fleet.tick(dt);
    } catch (e) { console.error(e); }
  }

  /* ── icons ── */
  function icon(id) {
    const I = {
      energy: '<rect x="4" y="7" width="15" height="10" rx="2"/><path d="M21 10v4M9 9.5 7.5 12H11l-1.5 2.5"/>',
      prop: '<circle cx="12" cy="12" r="2"/><path d="M12 10c-1-4-5-5-7-4 1 2 4 4 7 4zM12 14c1 4 5 5 7 4-1-2-4-4-7-4z"/>',
      fc: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
      nav: '<circle cx="12" cy="12" r="8"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3M10 14l1.2-3.8L15 9l-1.2 3.8z"/>',
      wifi: '<path d="M4 9.5a12 12 0 0 1 16 0M7 13a7.5 7.5 0 0 1 10 0M10 16.4a3 3 0 0 1 4 0"/><circle cx="12" cy="19" r="1"/>',
      mc: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4M7 9h2M7 12h5"/>',
      fleet: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
      relay: '<path d="M12 21V8M8 21h8M12 8l-4-5M12 8l4-5"/><circle cx="12" cy="8" r="1.6"/><path d="M6 11a7 7 0 0 1 0-6M18 11a7 7 0 0 0 0-6"/>',
      eo: '<rect x="3" y="7" width="18" height="12" rx="2"/><circle cx="12" cy="13" r="3.4"/><path d="M8 7l1.5-2.5h5L16 7"/>',
      ir: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M12 9.5c-2 2-2 3.2 0 4.5 2-1.3 2-2.5 0-4.5zM10 16.5h4"/><path d="M8 7l1.5-2.5h5L16 7"/>',
      det: '<path d="M4 9h3l5-4v14l-5-4H4z"/><path d="M16 8l3-2M16 12h4M16 16l3 2"/>',
      'sw-zone': '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/>',
      'sw-flock': '<ellipse cx="11" cy="13" rx="6" ry="4"/><circle cx="18" cy="10.5" r="2"/><path d="M8 17v2M14 17v2"/>',
      'sw-pred': '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
      'sw-engage': '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/>',
      'sw-swarm': '<path d="M5 17l3-9 4 5 4-5 3 9z"/><path d="M5 20h14"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${I[id] || ''}</svg>`;
  }
  function capIcon(id) {
    const I = {
      fly: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>',
      ground: '<path d="M12 20V11M8 20h8M7 8a7 7 0 0 1 10 0M9.5 10.5a3.5 3.5 0 0 1 5 0"/>',
      fleet: '<circle cx="5" cy="12" r="2.4"/><circle cx="19" cy="6" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M7 11l10-4M7 13l10 4"/>',
      zone: '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/>',
      sheep: '<ellipse cx="11" cy="13" rx="6" ry="4"/><circle cx="18" cy="10.5" r="2"/>',
      predator: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/>',
      engage: '<path d="M4 9h3l5-4v14l-5-4H4z"/><path d="M16 8l3-2M16 16l3 2"/>',
      master: '<path d="M5 17l3-9 4 5 4-5 3 9z"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${I[id] || ''}</svg>`;
  }
  L.icon = icon; L.capIcon = capIcon;

  /* start: the saved build, or an empty airframe */
  renderTargets();
  if (saved.parts) {
    saved.parts.forEach((p) => { if (L.BY[p]) st.parts.add(p); });
    (saved.wires || []).forEach((k) => {
      const [a, b] = k.split('>'); const [ap, aq] = a.split('.'); const [bp, bq] = b.split('.');
      if (st.parts.has(ap) && st.parts.has(bp) && L.IBD.portDef(ap, aq) && L.IBD.portDef(bp, bq)) st.wires.push({ a: { part: ap, port: aq }, b: { part: bp, port: bq } });
    });
  }
  render();
  requestAnimationFrame(frame);
})();
