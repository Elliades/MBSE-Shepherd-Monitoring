/* Widgets of Part 3 (logical architecture) and Part 4 (the swarm). Loaded after js/widgets.js, only by
   part3/ and part4/: Part 1 and Part 2 do not load this file.

   Part 3: logicalIntro, makeOrBuy, archSim (needs js/logical-engine.js and part3/content/archs.js), tradeOff,
           behaviourAB, mcTransition, mcPorts, whatFor, safetyChain, perfChain, seqCheck, archVersions, mcCut,
           logicSpot, tidyDemo, signalTable, mcStatesFix, mcPortsMagic, mcDelegate, scenarioGrow, deciderStm,
           stageIbd, interactions
           (settings in COURSE_CONFIG.archs)
   Part 4: swarmScope, strayDilemma, parallelRegions, swarmOptions (settings in COURSE_CONFIG.swarm)

   A widget is (element, options, api) and may return a clean-up function (see js/widgets.js). */
(function () {
  'use strict';

  const W = window.WIDGETS;
  const K = window.WidgetKit;
  if (!W || !K) return;
  const { svg, el, txt, arrow, life, ease, reduced, drone, move } = K;
  const CFG = window.COURSE_CONFIG || {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ───────── shared pieces ───────── */

  /* A drawing told in stages: the elements with data-from="k" show from stage k on, data-only="k" at stage k
     only. Chips pick a stage; it plays by itself until the student picks one. */
  function stager(root, s, stages, o) {
    o = o || {};
    const L = life();
    const bar = document.createElement('div');
    bar.className = 'chips lg-chips';
    bar.innerHTML = stages.map((st, i) => `<button type="button" class="chip" aria-pressed="false" data-st="${i + 1}"><b class="lg-chip-n">${i + 1}</b>${esc(st.label)}</button>`).join('') +
      '<button type="button" class="chip lg-auto" aria-pressed="true" data-auto>▶ Auto</button>';
    const live = document.createElement('p');
    live.className = 'w-live lg-live';
    live.setAttribute('aria-live', 'polite');
    root.append(bar, live);
    const chips = Array.from(bar.querySelectorAll('[data-st]'));
    const autoBtn = bar.querySelector('[data-auto]');
    let at = 0;
    let auto = !reduced();
    let t = 0;
    let api = null;
    function show(k) {
      at = k;
      t = 0;
      s.querySelectorAll('[data-from]').forEach((n) => n.classList.toggle('on', +n.dataset.from <= k));
      s.querySelectorAll('[data-only]').forEach((n) => n.classList.toggle('on', +n.dataset.only === k));
      chips.forEach((c, i) => c.setAttribute('aria-pressed', String(i + 1 === k)));
      const st = stages[k - 1];
      live.innerHTML = `<b>${k} · ${esc(st.label)}</b> ${st.text}`;
      if (o.onStage) o.onStage(k, api);
    }
    function setAuto(v) { auto = v; autoBtn.setAttribute('aria-pressed', String(v)); }
    chips.forEach((c) => c.addEventListener('click', () => { setAuto(false); show(+c.dataset.st); }));
    autoBtn.addEventListener('click', () => { setAuto(!auto); if (auto && at === stages.length) show(1); });
    api = { L, get at() { return at; }, get t() { return t; } };
    show(o.start || 1);
    L.loop((dt) => {
      t += dt;
      if (o.onTick) o.onTick(at, t, dt);
      const dwell = (stages[at - 1].dwell || 3.6);
      if (auto && t > dwell) show(at === stages.length ? 1 : at + 1);
    });
    return () => L.end();
  }

  /* A box of an internal block diagram: «stereotype» name : Type, with its compartment line. */
  function part(s, x, y, w, h, name, type, cls) {
    const g = el('g', { class: 'lg-part ' + (cls || '') }, s);
    el('rect', { x, y, width: w, height: h, rx: 4, class: 's-box lg-box' }, g);
    txt(g, x + w / 2, y + 16, (name ? name + ' : ' : '') + type, 's-name', 'middle');
    g._box = { x, y, w, h };
    return g;
  }
  /* A port on the border of a box, with the direction of what flows (in / out) and its label name : Type. */
  function port(s, x, y, dir, side, label, from) {
    const g = el('g', { class: 'lg-port lg-fade', 'data-from': from }, s);
    el('rect', { x: x - 6, y: y - 6, width: 12, height: 12, class: 'lg-port-sq' }, g);
    const out = dir === 'out';
    const rot = { right: 0, left: 180, down: 90, up: -90 }[side];
    const flip = out ? 0 : 180;
    el('path', { d: 'M-3.5,-3 L3.5,0 L-3.5,3 Z', class: 'lg-port-dir', transform: `translate(${x},${y}) rotate(${rot + flip})` }, g);
    if (label) {
      const pos = { right: [x + 9, y - 8, 'start'], left: [x - 9, y - 8, 'end'], down: [x + 9, y + 14, 'start'], up: [x + 9, y - 9, 'start'] }[side];
      txt(g, pos[0], pos[1], label, 'lg-port-t', pos[2]);
    }
    return g;
  }
  /* The point of a path at k (0..1), for a token that travels along it. */
  function along(path, k) {
    const p = path.getPointAtLength(path.getTotalLength() * k);
    return [p.x, p.y];
  }

  /* ═════════════════════════ Part 3 · logical architecture ═════════════════════════ */

  /* What a logical architecture is, in five stages: parts, behaviour, ports, connections, a run. */
  W.logicalIntro = function (root) {
    root.className = 'w lg-intro';
    const s = svg('0 0 400 262', 'A logical architecture in five stages. Three subsystems appear inside the logical system: Refuel Strategy, Refuel and Tank. Each gets a state machine whose state runs a function. Ports are added, typed name : Type. Connectors with item flows join them. In the run, Refuel Strategy sends a refuel request to Refuel, which pumps fuel from the Tank.');
    root.appendChild(s);
    el('rect', { x: 6, y: 6, width: 388, height: 250, rx: 8, class: 's-frame lg-soi' }, s);
    txt(s, 16, 22, 'Logical SoI', 'lg-tag');

    const strat = part(s, 22, 40, 132, 86, '', 'Refuel Strategy', 'lg-fade');
    const refuel = part(s, 262, 40, 120, 86, '', 'Refuel', 'lg-fade');
    const tank = part(s, 262, 172, 120, 66, '', 'Tank', 'lg-fade');
    [strat, refuel, tank].forEach((g) => g.setAttribute('data-from', 1));
    el('line', { x1: 22, y1: 62, x2: 154, y2: 62, class: 's-line lg-fade', 'data-from': 1 }, s);
    el('line', { x1: 262, y1: 62, x2: 382, y2: 62, class: 's-line lg-fade', 'data-from': 1 }, s);
    el('line', { x1: 262, y1: 194, x2: 382, y2: 194, class: 's-line lg-fade', 'data-from': 1 }, s);

    /* behaviour: a state with its do / function in each part */
    function state(x, y, w, name, fn) {
      const g = el('g', { class: 'lg-state lg-fade', 'data-from': 2 }, s);
      el('rect', { x, y, width: w, height: 40, rx: 9, class: 'lg-st-box' }, g);
      txt(g, x + w / 2, y + 15, name, 's-name', 'middle');
      el('line', { x1: x, y1: y + 21, x2: x + w, y2: y + 21, class: 's-line' }, g);
      txt(g, x + w / 2, y + 34, 'do / ' + fn, 'lg-do', 'middle');
      return g;
    }
    const stStrat = state(36, 74, 104, 'Monitoring', 'Compute Need');
    const stRefuel = state(274, 74, 96, 'Pumping', 'Pump Fuel');
    state(274, 200, 96, 'Storing', 'Supply Fuel');

    /* ports and connections */
    port(s, 154, 100, 'out', 'right', 'req : RefuelRequest', 3);
    port(s, 262, 100, 'in', 'left', '', 3);
    port(s, 322, 126, 'in', 'down', '', 3);
    port(s, 322, 172, 'out', 'up', 'fuel : Fuel', 3);
    const c1 = el('path', { d: 'M160,100 H256', class: 's-line lg-conn lg-fade', 'data-from': 4 }, s);
    const c2 = el('path', { d: 'M322,166 V132', class: 's-line lg-conn lg-fade', 'data-from': 4 }, s);
    const f1 = el('g', { class: 'lg-fade', 'data-from': 4 }, s);
    el('path', { d: 'M204,96 l8,4 l-8,4 z', class: 'lg-flow' }, f1);
    txt(f1, 208, 116, 'RefuelRequest', 'lg-flow-t', 'middle');
    const f2 = el('g', { class: 'lg-fade', 'data-from': 4 }, s);
    el('path', { d: 'M318,153 l4,-8 l4,8 z', class: 'lg-flow' }, f2);
    txt(f2, 312, 153, 'Fuel', 'lg-flow-t', 'end');

    /* the run */
    const tokA = el('circle', { r: 6, class: 'lg-token', opacity: 0 }, s);
    const tokB = el('circle', { r: 6, class: 'lg-token lg-token-fuel', opacity: 0 }, s);
    const gauge = el('g', { class: 'lg-fade', 'data-only': 5 }, s);
    el('rect', { x: 30, y: 146, width: 116, height: 12, rx: 6, class: 'lg-gauge' }, gauge);
    const fill = el('rect', { x: 30, y: 146, width: 30, height: 12, rx: 6, class: 'lg-gauge-fill' }, gauge);
    txt(gauge, 88, 176, 'fuel level', 'lg-do', 'middle');

    return stager(root, s, [
      { label: 'Parts', text: 'The system is cut into **subsystems**, one level only. Each one is a part of the logical SoI, typed by a logical component.' },
      { label: 'Behaviour', text: 'Each subsystem gets **its own state machine**. Its states call the functions it is given, with **do /**.' },
      { label: 'Ports', text: 'Whatever a subsystem sends or receives goes through a **port**, named **name : Type**. The arrow says in or out.' },
      { label: 'Connections', text: '**Connectors** join the ports. An **item flow** says what travels: a refuel request, fuel.' },
      { label: 'Run', text: 'Refuel Strategy sees the level drop and sends a **RefuelRequest**. Refuel starts **Pumping** and draws **Fuel** from the Tank.', dwell: 5.2 }
    ].map((x) => Object.assign(x, { text: x.text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') })), {
      onStage(k) {
        tokA.setAttribute('opacity', 0);
        tokB.setAttribute('opacity', 0);
        stStrat.classList.remove('lit');
        stRefuel.classList.remove('lit');
        if (k !== 5) fill.setAttribute('width', 30);
      },
      onTick(k, t) {
        if (k !== 5) return;
        stStrat.classList.toggle('lit', t > 0.3 && t < 1.8);
        if (t < 1.8) fill.setAttribute('width', (30 - t * 10).toFixed(1));
        if (t > 0.8 && t < 1.8) { const p = along(c1, ease((t - 0.8) / 1)); tokA.setAttribute('cx', p[0]); tokA.setAttribute('cy', p[1]); tokA.setAttribute('opacity', 1); } else tokA.setAttribute('opacity', 0);
        stRefuel.classList.toggle('lit', t > 1.8);
        if (t > 2.2 && t < 4.6) {
          const k2 = ((t - 2.2) % 0.8) / 0.8;
          const p = along(c2, k2);
          tokB.setAttribute('cx', p[0]); tokB.setAttribute('cy', p[1]); tokB.setAttribute('opacity', 1);
          fill.setAttribute('width', Math.min(116, 12 + (t - 2.2) * 44).toFixed(1));
        } else tokB.setAttribute('opacity', 0);
      }
    });
  };

  /* After the logical level: make or buy, a specification, and the check at the physical level. */
  W.makeOrBuy = function (root) {
    root.className = 'w lg-mob';
    const s = svg('0 0 400 150', 'Each logical subsystem becomes a specification. Engineers either design it (make) or buy it (buy). At the physical level, the delivered solution is checked against the specification: compatible, consistent.');
    root.appendChild(s);
    const L = life();
    const box = (x, y, w, h, t, sub, cls) => { const g = el('g', { class: cls || '' }, s); el('rect', { x, y, width: w, height: h, rx: 6, class: 's-box lg-box' }, g); txt(g, x + w / 2, y + (sub ? 18 : 23), t, 's-name', 'middle'); if (sub) txt(g, x + w / 2, y + 32, sub, 's-sub', 'middle'); return g; };
    box(6, 52, 92, 42, 'Logical', 'subsystem', 'lg-phase-lg');
    arrow(s, [[98, 73], [124, 73]]);
    const spec = box(126, 52, 70, 42, 'Spec', 'what it must do');
    arrow(s, [[196, 66], [226, 34]]);
    arrow(s, [[196, 80], [226, 112]]);
    const make = box(228, 12, 80, 40, 'Make', 'design it');
    const buy = box(228, 94, 80, 40, 'Buy', 'off the shelf');
    arrow(s, [[308, 32], [330, 64]]);
    arrow(s, [[308, 114], [330, 82]]);
    const phys = box(332, 52, 62, 42, 'Physical', 'check it', 'lg-phase-ph');
    const tick = el('path', { d: 'M350,104 l8,8 l14,-16', class: 'lg-tick' }, s);
    let t = 0;
    let round = 0;
    L.loop((dt) => {
      t += dt;
      if (t > 6) { t = 0; round += 1; }
      spec.classList.toggle('lit', t > 0.6 && t < 2);
      make.classList.toggle('lit', t > 2 && t < 3.6 && round % 2 === 0);
      buy.classList.toggle('lit', t > 2 && t < 3.6 && round % 2 === 1);
      phys.classList.toggle('lit', t > 3.6);
      tick.style.opacity = t > 4.2 ? 1 : 0;
    });
    return () => L.end();
  };

  /* The package 3 - Logical Analysis, one node at a time. */

  /* ───────── the three architectures of the drone (part3/content/archs.js, COURSE_CONFIG.archs) ───────── */

  const ARCHS = window.LOGICAL_ARCHS || {};
  const AC = CFG.archs || {};
  const PARTS = AC.parts || {};
  const VB = { w: 800, h: 420, x0: 100, x1: 700, y0: 20, y1: 400 };
  const BOX = { w: 124, h: 58 };
  const DRIVER = { operator: { x: 14, w: 62 }, pasture: { x: 724, w: 62 }, y0: 40, y1: 380 };
  const partInfo = (name) => PARTS[name] || { label: name, color: '#8a949c' };
  const short = (path) => path.replace(/^soi\./, '');
  /* What a part is called on screen: the name of what it does. Parts have no name of their own in the model. */
  const lab = (path) => {
    const n = short(path);
    return n === 'operator' ? 'Operator' : n === 'pasture' ? 'Pasture' : (PARTS[n] || {}).label || n;
  };

  /* Where everything sits in the drawing of one architecture. */
  function geometry(key, only) {
    const arch = ARCHS[key];
    const lay = (AC[key] || {}).layout || {};
    const show = (name) => !only || only.indexOf(name) >= 0;
    const centre = {};
    arch.soi.parts.forEach((p) => { if (lay[p.name] && show(p.name)) centre[p.name] = lay[p.name]; });
    /* boundary ports: on the side of the frame named in COURSE_CONFIG.archs.ports, level with their part */
    const ports = {};
    const count = {};
    arch.soi.connectors.forEach(([a, b]) => {
      const bare = a.indexOf('.') < 0 ? a : b.indexOf('.') < 0 ? b : null;
      if (!bare) return;
      const inner = (bare === a ? b : a).split('.')[0];
      if (!centre[inner]) return;
      const side = (AC.ports || {})[bare] || 'L';
      const k = side + inner;
      const n = (count[k] = (count[k] || 0) + 1) - 1;
      const c = centre[inner];
      ports[bare] = side === 'L' ? [VB.x0, c[1] + n * 14, side] : side === 'R' ? [VB.x1, c[1] + n * 14, side]
        : side === 'T' ? [c[0] + n * 14, VB.y0, side] : [c[0] + n * 14, VB.y1, side];
    });
    const drivers = { operator: show('operator'), pasture: show('pasture') };
    return { arch, centre, ports, drivers };
  }
  /* The points of one connector, or of one hop of a message: a part, a boundary port, a driver. */
  function hop(g, a, b) {
    const pt = (x) => (g.centre[x] ? g.centre[x] : g.ports[x] ? g.ports[x].slice(0, 2) : null);
    const drv = (x) => x === 'operator' || x === 'pasture';
    if (drv(a) || drv(b)) {
      const d = drv(a) ? a : b;
      if (!g.drivers[d]) return null;
      const p = g.ports[drv(a) ? b : a];
      if (!p) return null;
      const dx = d === 'operator' ? DRIVER.operator.x + DRIVER.operator.w : DRIVER.pasture.x;
      let pts;
      if (p[2] === 'L' || p[2] === 'R') pts = [[dx, p[1]], [p[0], p[1]]];
      else {
        const edge = p[2] === 'T' ? 8 : VB.h - 8;
        const mid = d === 'operator' ? DRIVER.operator.x + DRIVER.operator.w / 2 : DRIVER.pasture.x + DRIVER.pasture.w / 2;
        pts = [[mid, p[2] === 'T' ? DRIVER.y0 : DRIVER.y1], [mid, edge], [p[0], edge], [p[0], p[1]]];
      }
      return drv(a) ? pts : pts.reverse();
    }
    const pa = pt(a);
    const pb = pt(b);
    return pa && pb ? [pa, pb] : null;
  }
  const poly = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

  /* Draws the internal block diagram of the logical SOI: frame, boundary ports, connectors, parts, drivers. */
  function drawIbd(s, key, o) {
    o = o || {};
    const g = geometry(key, o.only);
    const arch = g.arch;
    el('rect', { x: VB.x0, y: VB.y0, width: VB.x1 - VB.x0, height: VB.y1 - VB.y0, rx: 8, class: 's-frame lg-soi' }, s);
    txt(s, VB.x0 + 10, VB.y1 - 8, arch.soi.name, 'lg-tag');
    const lines = el('g', {}, s);
    const conn = {};
    const norm = (e) => { e = e.replace(/^soi\./, ''); return e.indexOf('.') < 0 ? e : e.split('.')[0]; };
    arch.soi.connectors.concat(arch.context.connectors).forEach(([a, b]) => {
      const pts = hop(g, norm(a), norm(b));
      const off = o.built && [norm(a), norm(b)].some((x) => g.centre[x] && o.built.indexOf(x) < 0);
      if (pts) conn[a + '|' + b] = el('path', { d: poly(pts), class: 'lg-conn-line' + (off ? ' ghost' : '') }, lines);
    });
    Object.keys(g.ports).forEach((name) => {
      const p = g.ports[name];
      el('rect', { x: p[0] - 5, y: p[1] - 5, width: 10, height: 10, class: 'lg-port-sq' }, s);
    });
    const boxes = {};
    arch.soi.parts.forEach((p) => {
      const c = g.centre[p.name];
      if (!c) return;
      const info = partInfo(p.name);
      const gg = el('g', { class: 'lg-ap' + (info.tech ? ' lg-ap-tech' : '') + (o.built && o.built.indexOf(p.name) < 0 ? ' lg-ap-ghost' : '') }, s);
      gg.style.setProperty('--pc', info.color);
      const x = c[0] - BOX.w / 2;
      const y = c[1] - BOX.h / 2;
      el('rect', { x, y, width: BOX.w, height: BOX.h, rx: 5, class: 'lg-ap-box' }, gg);
      el('path', { d: `M${x},${y + 13} V${y + 5} a5,5 0 0 1 5,-5 H${x + BOX.w - 5} a5,5 0 0 1 5,5 V${y + 13} Z`, class: 'lg-ap-band' }, gg);
      const hide = o.blank && o.built && o.built.indexOf(p.name) < 0;
      if (hide) { gg.classList.add('lg-ap-blank'); gg.classList.remove('lg-ap-ghost'); gg.style.setProperty('--pc', 'var(--ph-lg)'); }
      txt(gg, c[0], y + (hide ? 36 : 27), hide ? '?' : info.label || p.type, hide ? 'lg-q' : 'lg-ap-name', 'middle');
      const st = txt(gg, c[0], y + 41, '', 'lg-ap-state', 'middle');
      const st2 = txt(gg, c[0], y + 52, '', 'lg-ap-state', 'middle');
      const title = el('title', {}, gg);
      title.textContent = hide ? 'a mission subsystem' : `: ${p.type}`;
      boxes['soi.' + p.name] = { g: gg, st, st2 };
    });
    ['operator', 'pasture'].forEach((d) => {
      if (!g.drivers[d]) return;
      const D = DRIVER[d];
      const gg = el('g', { class: 'lg-driver' }, s);
      el('rect', { x: D.x, y: DRIVER.y0, width: D.w, height: DRIVER.y1 - DRIVER.y0, rx: 6, class: 'lg-driver-box' }, gg);
      const t = txt(gg, D.x + D.w / 2, (DRIVER.y0 + DRIVER.y1) / 2, d === 'operator' ? 'Operator' : 'Pasture', 'lg-driver-t', 'middle');
      t.setAttribute('transform', `rotate(-90 ${D.x + D.w / 2} ${(DRIVER.y0 + DRIVER.y1) / 2})`);
      boxes[d] = { g: gg };
    });
    return { g, boxes, conn };
  }
  function setStates(box, list) {
    if (!box || !box.st) return;
    const text = list.join(' · ');
    if (text.length <= 24) { box.st.textContent = text; box.st2.textContent = ''; return; }
    const half = Math.ceil(list.length / 2);
    const a = list.length > 1 ? list.slice(0, half).join(' · ') : text.slice(0, 24);
    const b = list.length > 1 ? list.slice(half).join(' · ') : text.slice(24);
    box.st.textContent = a.length > 26 ? a.slice(0, 25) + '…' : a;
    box.st2.textContent = b.length > 26 ? b.slice(0, 25) + '…' : b;
  }

  /* The architecture the student chose in the scene "choose" (question q-arch), or null. */
  function chosenArch(api) {
    const a = (((api.answers && api.answers()) || {})['q-arch'] || {}).choice || '';
    const k = a.trim().charAt(0);
    return ARCHS[k] ? k : null;
  }
  /* One stage of the build (COURSE_CONFIG.archs.stages): the parts built so far, the steps played before
     (setup) and the steps measured. Without a stage: every part, every step. */
  function stageOf(key, id) {
    const ST = AC.stages || {};
    const list = ST.list || [];
    const at = list.findIndex((x) => x.id === id);
    if (at < 0) return null;
    const def = list[at];
    let built = (ST.tech || []).slice();
    let made = [];
    list.slice(0, at + 1).forEach((x) => {
      built = built.concat(((x.add || {})[key]) || []);
      made = made.concat(((x.states || {})[key]) || []);
    });
    const drop = Object.assign({}, (def.drop || {})[key]);
    if (def.id === 'full') built = null;
    else if ((AC[key] || {}).decider) {
      const type = partType(key, AC[key].decider);
      drop[type] = stateNames(ARCHS[key].blocks.find((b) => b.name === type).stm).filter((n) => made.indexOf(n) < 0);
    }
    return { def, built, drop, setup: def.setup || [], steps: def.steps || [], mute: (def.mute || {})[key] || [], expect: (def.expect || {})[key] || {} };
  }
  const partType = (key, name) => ARCHS[key].soi.parts.find((p) => p.name === name).type;
  /* Every state of a state machine, or of a region. */
  function stateNames(r) {
    const out = [];
    (r.states || []).forEach((s) => { out.push(s.name); out.push(...stateNames(s)); (s.regions || []).forEach((x) => out.push(...stateNames(x))); });
    return out;
  }
  const allSteps = (arch) => {
    const out = [];
    arch.scenario.phases.forEach((ph) => ph.steps.forEach((st) => out.push(Object.assign({ phase: ph.name }, st))));
    return out;
  };
  const keepBuilt = (expect, built) => {
    const o = {};
    Object.keys(expect || {}).forEach((p) => { if (!built || built.indexOf(short(p)) >= 0) o[p] = expect[p]; });
    return o;
  };
  /* What to check at step i of a stage: what the stage says, else the scenario; only the parts built so far. */
  const stageExpect = (key, stage, i, st) => {
    const any = (AC[key] || {}).anyName || {};
    const o = keepBuilt(stage.expect[i] || st.expect, stage.built);
    Object.keys(o).forEach((p) => { o[p] = [].concat(o[p]).map((w) => any[w] || w); });
    return o;
  };
  const wantOk = (want, have) => window.LogicalEngine.wantOk(want, have);
  const wantText = (want) => [].concat(want).map((w) => (w.charAt(0) === '!' ? 'not ' + w.slice(1) : w)).join(', ');
  /* The scenario file of one stage, in the format of MBSE Shepherd > Simulation Scenarios: the steps of
     the earlier stages as preconditions (setup, not measured), then the steps of this stage, each expecting
     only the parts built so far. */
  function scenarioFile(key, stage, cameo) {
    const arch = ARCHS[key];
    const steps = allSteps(arch);
    /* the file names states: "not in this one" stays with the guide */
    const clean = (i) => {
      const st = steps[i];
      const ex = stageExpect(key, stage, i, st);
      Object.keys(ex).forEach((p) => { ex[p] = ex[p].filter((w) => w.charAt(0) !== '!'); if (!ex[p].length) delete ex[p]; });
      return { signal: st.signal, into: st.into, note: st.note, expect: ex };
    };
    const phases = [];
    if (stage.setup.length) phases.push({ name: 'Before', goal: 'Played to get there, not measured.', setup: true, steps: stage.setup.map(clean) });
    stage.steps.forEach((i) => {
      const st = steps[i];
      let ph = phases[phases.length - 1];
      if (!ph || ph.setup || ph.name !== st.phase) { ph = { name: st.phase, steps: [] }; phases.push(ph); }
      ph.steps.push(clean(i));
    });
    const systems = (arch.scenario.systems || []).filter((x) => !stage.built || stage.built.indexOf(short(x.path)) >= 0)
      .map((x) => ({ path: x.path, label: (PARTS[short(x.path)] || {}).label || x.type, type: x.type }));
    return {
      title: `${arch.package} · ${stage.def.title}`,
      objective: stage.def.event,
      context: (cameo && cameo.context) || arch.context.name,
      cut: (cameo && cameo.soi) || arch.soi.name,
      settle: 2,
      systems,
      drivers: arch.context.parts.filter((p) => p.name !== 'soi').map((p) => ({ path: p.name, label: p.type, type: p.type })),
      phases
    };
  }

  /* Where a part is in Cameo: by the name of its type, its parts having no name of their own. */
  function cameoPath(key, path, cameo) {
    const arch = ARCHS[key];
    const [top, sub] = path.split('.');
    const first = (top === 'soi' && cameo && cameo.soi) || (arch.context.parts.find((p) => p.name === top) || {}).type || top;
    if (!sub) return first;
    return first + '.' + ((arch.soi.parts.find((p) => p.name === sub) || {}).type || sub);
  }
  /* ── a stage in Cameo, through the relay ──
     Starts the simulation of the context block (simtest/start), sends each signal into the operator or the
     pasture as the scenario does (simtest/send), reads the states of the parts back (simtest/states) and
     says what is wrong, in red. If the plugin cannot do it, or the guide is not linked, it offers the scenario
     as a file for MBSE Shepherd > Simulation Scenarios.
     hooks: { start(), part(path, ok), mark(stepIndex, path, ok, want, have) (else a list in .lg-validate-res),
              cameo: { context, soi } (names of the blocks in the model, when they are not those of the architecture) } */
  function cameoCheck(root, key, stage, api, hooks) {
    hooks = hooks || {};
    let alive = true;
    const pause = (ms) => new Promise((res) => setTimeout(res, ms));
    const SETTLE = 2000;
    const POLL = 500;
    const PATIENCE = 20000;
    const where = (p) => cameoPath(key, p, hooks.cameo);
    function scenario(st) {
      const f = scenarioFile(key, st, hooks.cameo);
      const addr = (o) => { const out = {}; Object.keys(o).forEach((p) => { out[where(p)] = o[p]; }); return out; };
      f.systems = f.systems.map((x) => Object.assign({}, x, { path: where(x.path) }));
      f.drivers = f.drivers.map((x) => Object.assign({}, x, { path: x.type }));
      f.phases.forEach((ph) => ph.steps.forEach((step) => { step.into = where(step.into); step.expect = addr(step.expect); }));
      return f;
    }
    async function validate() {
      const out = root.querySelector('.lg-validate-out');
      const res = root.querySelector('.lg-validate-res');
      const dl = root.querySelector('[data-download]');
      const btn = root.querySelector('[data-validate]');
      const st = stage || stageOf(key, 'full');
      const name = `part3-arch${key}-${st.def.id}`;
      const offer = (why) => {
        try {
          if (dl.getAttribute('href')) URL.revokeObjectURL(dl.href);
          dl.href = URL.createObjectURL(new Blob([JSON.stringify(scenario(st), null, 2)], { type: 'application/json' }));
          dl.download = name + '.scenario.json';
          dl.hidden = false;
        } catch (err) { /* no Blob: no link */ }
        out.innerHTML = why + ' ' + api.inline('You can also download the scenario, and open it in {{MBSE Shepherd > Simulation Scenarios}}.');
      };
      res.innerHTML = '';
      dl.hidden = true;
      if (hooks.start) hooks.start();
      const B = window.Bridge;
      if (!(B && B.call && B.state && B.state().status === 'connected')) { offer('The guide is not linked to Cameo: use the <b>Cameo</b> button at the top.'); return; }
      const arch = ARCHS[key];
      const every = allSteps(arch);
      btn.disabled = true;
      let started = false;
      let wrong = 0;
      let right = 0;
      try {
        out.textContent = 'Starting the simulation in Cameo…';
        const ctxName = (hooks.cameo && hooks.cameo.context) || arch.context.name;
        const found = await B.call('model', 'getElementsByName', [{ name: ctxName }]);
        const ctx = (Array.isArray(found) ? found : []).find((e) => e && e.metaclass === 'Class');
        if (!ctx) { out.innerHTML = `<b class="lg-red-t">Your model has no block named “${esc(ctxName)}”.</b>`; return; }
        await B.call('simtest', 'start', [{ elementId: ctx.id }], 30000);
        started = true;
        await pause(1000);
        for (const i of st.setup) {
          if (!alive) return;
          out.textContent = `Getting there: ${every[i].signal}…`;
          await B.call('simtest', 'send', [every[i].signal, where(every[i].into)]);
          await pause(SETTLE);
        }
        for (const i of st.steps) {
          if (!alive) return;
          const step = every[i];
          out.textContent = `Sending ${step.signal}…`;
          await B.call('simtest', 'send', [step.signal, where(step.into)]);
          await pause(SETTLE);
          const expect = stageExpect(key, st, i, step);
          for (const path of Object.keys(expect)) {
            const want = [].concat(expect[path]);
            const addr = where(path);
            /* The simulation may run slower than expected: read again until the state is there, or give up. */
            let have = null;
            let ok = false;
            for (let waited = 0; ; waited += POLL) {
              try {
                const r = await B.call('simtest', 'states', [{ paths: [addr] }]);
                have = ((r && r.states) || {})[addr] || [];
              } catch (err) { have = null; }
              ok = !!have && wantOk(want, have);
              if (ok || waited >= PATIENCE || !alive) break;
              await pause(POLL);
            }
            if (ok) right += 1; else wrong += 1;
            if (hooks.part) hooks.part(path, ok);
            if (hooks.mark) hooks.mark(i, path, ok, want, have);
            else {
              const li = document.createElement('li');
              li.className = ok ? 'ok' : 'no';
              li.innerHTML = `${ok ? '✓' : '✗'} <b>${esc(lab(path))}</b> ${esc(wantText(want))}${ok ? '' : ` <span class="lg-validate-have">${have ? `is in ${esc(have.join(', ') || 'no state')}` : 'not found in your model'}</span>`}`;
              res.appendChild(li);
            }
          }
        }
        out.innerHTML = wrong ? `<b class="lg-red-t">✗ ${wrong} wrong, in red.</b> ${right} right.` : `<b>✓ All ${right} checks pass in Cameo.</b>`;
        if (!wrong && api.confetti) api.confetti();
      } catch (e) {
        const m = e && e.message ? e.message : 'error';
        if (m === 'unknown-method') offer('Your plugin is too old to run this from the guide: install the latest one.');
        else if (m === 'not-connected') offer('The link to Cameo was lost.');
        else out.innerHTML = `<b class="lg-red-t">Cameo stopped: ${esc(m)}.</b>`;
      } finally {
        if (started) B.call('simtest', 'stop', []).catch(() => {});
        btn.disabled = false;
      }
    }
    const v = root.querySelector('[data-validate]');
    if (v) v.addEventListener('click', validate);
    return () => { alive = false; };
  }
  const CHECK_HTML = (api) => `<div class="lg-validate"><div class="btn-row"><button type="button" class="btn small" data-validate>${api.icon('play')}Validate in Cameo</button><a class="btn ghost small" data-download hidden>Download the scenario</a></div><p class="lg-validate-out" aria-live="polite"></p><ul class="lg-validate-res"></ul></div>`;

  /* One architecture running its scenario: each signal travels along the connectors, each part shows its
     active states, and the expected states of the scenario step are ticked. What happens in the pasture is
     said big over the drawing; the messages worth reading pop over the part that receives them.
     opts: { arch: "3" | "chosen" (else chips for the three), stage: id in COURSE_CONFIG.archs.stages
             (the parts built so far, the others drawn faded; the earlier steps already played),
             validate: true (a button that runs the same stage in Cameo),
             cameo: { context, soi } (the blocks it runs on, when they are not those of the architecture), or
             "tp" (the starting model: TP1 SOI Simulation, TP Logical SOI),
             only / phases: older form, the parts drawn and the phases played } */
  W.archSim = function (root, opts, api) {
    const keys = (AC.order || Object.keys(ARCHS)).filter((k) => ARCHS[k]);
    if (!keys.length || !window.LogicalEngine) { root.textContent = ''; return undefined; }
    const chosen = opts.arch === 'chosen' ? chosenArch(api) : null;
    const fixed = opts.arch && opts.arch !== 'chosen' ? opts.arch : chosen;
    const STORY = AC.story || {};
    const BADGES = AC.badges || {};
    root.className = 'w lg-arch';
    root.innerHTML = `${fixed ? '' : `<div class="chips">${keys.map((k, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-k="${k}"><b class="lg-chip-n">${k}</b>${esc((AC[k] || {}).name || ARCHS[k].package)}</button>`).join('')}</div>`}
      ${opts.arch === 'chosen' && !chosen ? '<p class="lg-arch-warn">You have not chosen your architecture yet: pick one to see it here.</p>' : ''}
      <div class="lg-grow-w"></div>
      <p class="lg-arch-sum"></p>
      <div class="lg-arch-art" data-noswipe><div class="lg-story" aria-live="polite"><span class="lg-story-i" aria-hidden="true"></span><span class="lg-story-t"></span></div></div>
      <div class="lg-arch-ctl">
        <div class="lg-arch-step"><span class="mono-label"></span><strong></strong><span class="lg-arch-note"></span></div>
        <div class="btn-row"><button type="button" class="btn small" data-next>▶ Next step</button><button type="button" class="btn ghost small" data-all>Play to the end</button>${opts.validate ? '<label class="lg-live-toggle"><input type="checkbox" data-live> Play in Cameo too</label>' : ''}<button type="button" class="btn ghost small" data-reset>Restart</button></div>
      </div>
      <div class="lg-arch-cols">
        <div><span class="mono-label">Expected (scenario)</span><ul class="lg-expect"></ul></div>
        <div><span class="mono-label">Messages <b class="lg-count">0</b></span><ol class="lg-msgs"></ol></div>
      </div>
      ${opts.validate ? '<p class="lg-live-out" aria-live="polite"></p>' : ''}
      ${opts.validate ? CHECK_HTML(api) : ''}`;
    const art = root.querySelector('.lg-arch-art');
    const story = root.querySelector('.lg-story');
    const sum = root.querySelector('.lg-arch-sum');
    const stepEl = root.querySelector('.lg-arch-step');
    const expectEl = root.querySelector('.lg-expect');
    const msgsEl = root.querySelector('.lg-msgs');
    const countEl = root.querySelector('.lg-count');
    const L = life();
    let key = fixed || keys[0];
    let sim;
    let ibd;
    let steps = [];
    let stage = null;
    let at = 0;
    let busy = false;
    let total = 0;
    let all = false;
    let stack = {};
    let offCheck = null;
    const cameo = () => (opts.cameo === 'tp' ? { context: 'TP1 SOI Simulation', soi: 'TP Logical SOI' } : opts.cameo);

    /* "Play in Cameo too": each step also sends its signal to the simulation in Cameo, and what Cameo answers
       (the states of the parts) is written under the expected states, so you see where it differs. */
    const liveBox = root.querySelector('[data-live]');
    const liveOut = root.querySelector('.lg-live-out');
    const lpause = (ms) => new Promise((res) => setTimeout(res, ms));
    let liveRun = null;
    let liveChain = Promise.resolve();
    const liveOn = () => !!(liveBox && liveBox.checked);
    const liveSay = (html) => { if (liveOut) liveOut.innerHTML = html; };
    function liveStop() {
      const B = window.Bridge;
      if (liveRun && B && B.call) B.call('simtest', 'stop', []).catch(() => {});
      liveRun = null;
      liveChain = Promise.resolve();
      if (liveOut) liveOut.textContent = '';
    }
    async function liveStart() {
      const B = window.Bridge;
      if (!(B && B.call && B.state && B.state().status === 'connected')) throw new Error('not linked');
      const arch = ARCHS[key];
      const ctxName = (cameo() && cameo().context) || arch.context.name;
      const found = await B.call('model', 'getElementsByName', [{ name: ctxName }]);
      const ctx = (Array.isArray(found) ? found : []).find((e) => e && e.metaclass === 'Class');
      if (!ctx) throw new Error(`no block named “${ctxName}” in your model`);
      await B.call('simtest', 'start', [{ elementId: ctx.id }], 30000);
      liveRun = { setupDone: false };
      await lpause(1000);
    }
    async function liveSend(st, res, idx) {
      const B = window.Bridge;
      const every = allSteps(ARCHS[key]);
      const where = (p) => cameoPath(key, p, cameo());
      if (!liveRun) await liveStart();
      if (!liveRun.setupDone) {
        liveRun.setupDone = true;
        for (const i of (stage ? stage.setup : [])) {
          liveSay(`Cameo: getting there, ${esc(every[i].signal)}…`);
          await B.call('simtest', 'send', [every[i].signal, where(every[i].into)]);
          await lpause(2000);
        }
      }
      liveSay(`Cameo: sending <b>${esc(st.signal)}</b>…`);
      await B.call('simtest', 'send', [st.signal, where(st.into)]);
      await lpause(2000);
      const seen = {};
      const paths = Object.keys(st.expect);
      for (let waited = 0; ; waited += 500) {
        let allOk = true;
        for (const path of paths) {
          const addr = where(path);
          let have = null;
          try { have = (((await B.call('simtest', 'states', [{ paths: [addr] }])) || {}).states || {})[addr] || []; } catch (err) { have = null; }
          const ok = !!have && wantOk(st.expect[path], have);
          seen[path] = { ok, have };
          if (!ok) allOk = false;
        }
        if (allOk || waited >= 20000 || !liveRun) break;
        await lpause(500);
      }
      const lis = expectEl.querySelectorAll('li');
      paths.forEach((path, n) => {
        const li = lis[n];
        const r = seen[path];
        if (!li || !r) return;
        li.insertAdjacentHTML('beforeend', ` <span class="${r.ok ? 'lg-live-ok' : 'lg-validate-have'}">Cameo: ${r.ok ? '✓' : '✗'} ${r.have ? esc(r.have.join(', ') || 'no state') : 'not found in your model'}</span>`);
      });
      const bad = paths.filter((p) => !seen[p].ok).length;
      liveSay(bad ? `<b class="lg-red-t">Cameo, after ${esc(st.signal)}: ${bad} different from the expected.</b>` : `Cameo, after ${esc(st.signal)}: as expected.`);
    }
    function liveStep(st) {
      if (!liveOn()) return;
      liveChain = liveChain.then(() => liveSend(st)).catch((e) => {
        liveRun = null;
        liveSay(`<b class="lg-red-t">Cameo: ${esc(e && e.message ? e.message : 'error')}.</b> Link the guide with the Cameo button at the top.`);
        if (liveBox) liveBox.checked = false;
      });
    }
    if (liveBox) liveBox.addEventListener('change', () => { if (!liveBox.checked) liveStop(); });

    function load(k) {
      key = k;
      L.end();
      if (offCheck) offCheck();
      liveStop();
      busy = false;
      all = false;
      total = 0;
      const arch = ARCHS[k];
      const every = allSteps(arch);
      stage = opts.stage ? stageOf(k, opts.stage) : null;
      const built = stage ? stage.built : opts.only || null;
      sim = window.LogicalEngine.create(arch, stage ? { only: built, drop: stage.drop, mute: stage.mute } : built ? { only: built } : undefined);
      if (stage) {
        stage.setup.forEach((i) => sim.inject(every[i].signal, every[i].into));
        steps = stage.steps.map((i) => Object.assign({}, every[i], { expect: stageExpect(k, stage, i, every[i]) }));
      } else {
        const phases = arch.scenario.phases.filter((_, i) => !opts.phases || opts.phases.indexOf(i) >= 0);
        steps = [];
        phases.forEach((ph) => ph.steps.forEach((st) => steps.push(Object.assign({ phase: ph.name }, st))));
        steps = steps.filter((st) => (AC.leaveOut || []).indexOf(st.signal) < 0);
      }
      at = 0;
      const info = AC[k] || {};
      root.querySelector('.lg-grow-w').innerHTML = stage ? growHTML(stage.def.id) : '';
      sum.innerHTML = stage || opts.only
        ? `<b>${esc(info.short || arch.package)}</b>${stage ? ` · ${esc(stage.def.title)}: ${esc(stage.def.event)}.` : ''}${stage && stage.built ? ' Faded: not built yet.' : ''}`
        : `<b>${esc(info.name || arch.package)}.</b> ${api.inline(info.decides || '')}`;
      art.querySelectorAll('svg').forEach((n) => n.remove());
      story.querySelector('.lg-story-i').textContent = '▶';
      story.querySelector('.lg-story-t').textContent = 'Press Next step';
      story.className = 'lg-story on idle';
      const s = svg(`0 0 ${VB.w} ${VB.h}`, `Internal block diagram of ${arch.soi.name}: ${arch.soi.parts.map((p) => p.type).join(', ')}, between the operator and the pasture.`);
      art.insertBefore(s, story);
      ibd = drawIbd(s, k, stage ? { built } : { only: opts.only });
      ibd.keep = el('g', {}, s);
      ibd.tokens = el('g', {}, s);
      ibd.badges = el('g', {}, s);
      Object.keys(ibd.boxes).forEach((path) => { if (sim.has(path)) setStates(ibd.boxes[path], sim.leaves(path)); });
      msgsEl.innerHTML = '';
      countEl.textContent = '0';
      const res = root.querySelector('.lg-validate-res');
      if (res) {
        res.innerHTML = '';
        root.querySelector('.lg-validate-out').textContent = '';
        const box = root.querySelector('.lg-validate');
        const fresh = box.cloneNode(true);
        box.replaceWith(fresh);
        offCheck = cameoCheck(fresh, k, stage, api, {
          cameo: cameo(),
          start() { liveStop(); Object.keys(ibd.boxes).forEach((path) => ibd.boxes[path].g.classList.remove('lg-ap-bad', 'lg-ap-good')); },
          part(path, ok) {
            const b = ibd.boxes[path];
            if (!b) return;
            b.g.classList.remove('lg-ap-good');
            b.g.classList.add(ok && !b.g.classList.contains('lg-ap-bad') ? 'lg-ap-good' : 'lg-ap-bad');
          }
        });
      }
      showStep();
    }
    function showStep(done) {
      const st = steps[at];
      const label = stepEl.querySelector('.mono-label');
      const strong = stepEl.querySelector('strong');
      const note = stepEl.querySelector('.lg-arch-note');
      root.querySelector('[data-next]').disabled = !st || busy;
      root.querySelector('[data-all]').disabled = !st || busy;
      if (!st) {
        label.textContent = stage && stage.def.id !== 'full' ? 'End of this stage' : 'End of the scenario';
        strong.textContent = `${total} messages`;
        note.textContent = fixed ? 'Restart to see it again.' : 'Restart, or pick another architecture.';
        return;
      }
      const tell = STORY[st.signal];
      label.textContent = `Step ${at + 1} / ${steps.length} · ${st.phase}`;
      strong.textContent = tell ? tell.text : st.signal;
      note.innerHTML = `${esc((stage && stage.def.quiet) || !st.note ? '' : st.note)} <small>Injected: <code>${esc(st.signal)}</code> into ${esc(st.into)}.</small>`;
      if (!done) expectEl.innerHTML = Object.keys(st.expect).map((p) => `<li><b>${esc(lab(p))}</b> ${esc(wantText(st.expect[p]))}</li>`).join('') || '<li>Nothing to check at this stage.</li>';
    }
    function tellStory(st) {
      const tell = STORY[st.signal] || { icon: '•', text: st.signal };
      story.querySelector('.lg-story-i').textContent = tell.icon;
      story.querySelector('.lg-story-t').textContent = tell.text;
      story.className = 'lg-story';
      void story.offsetWidth;
      story.classList.add('on');
    }
    function log(e) {
      total += 1;
      countEl.textContent = String(total);
      const li = document.createElement('li');
      li.innerHTML = `<b>${esc(lab(e.from))}</b> → <b>${esc(lab(e.to))}</b> <span class="lg-sig-name">${esc(e.signal)}</span>`;
      msgsEl.prepend(li);
      while (msgsEl.children.length > 7) msgsEl.lastChild.remove();
    }
    function pulse(path) {
      const b = ibd.boxes[path];
      if (!b) return;
      b.g.classList.remove('pulse');
      void b.g.getBoundingClientRect();
      b.g.classList.add('pulse');
    }
    /* The label of a message worth reading, over the part that receives it (once per signal and step). */
    function badge(e, hot) {
      const b = BADGES[e.signal];
      const to = short(e.to);
      if (!b || (b.to && b.to !== to)) return;
      const once = to + '|' + e.signal;
      if (stack[once]) return;
      stack[once] = true;
      const drv = to === 'operator' || to === 'pasture';
      let x;
      let y;
      if (drv) {
        const D = DRIVER[to];
        x = to === 'operator' ? D.x + D.w + 4 : D.x - 4;
        y = 64;
      } else {
        const c = ibd.g.centre[to];
        if (!c) return;
        x = c[0];
        y = c[1] - BOX.h / 2 - 4;
      }
      const n = (stack[to] = (stack[to] || 0) + 1) - 1;
      y += drv ? n * 26 : -n * 24;
      const anchor = to === 'operator' ? 'start' : to === 'pasture' ? 'end' : 'middle';
      const g = el('g', { class: 'lg-badge' + (hot ? ' hot' : '') }, ibd.badges);
      const t = txt(g, x, y, `${b.icon} ${b.text}`, 'lg-badge-t', anchor);
      let w = b.text.length * 7 + 30;
      try { w = t.getComputedTextLength() + 16 || w; } catch (err) { /* not rendered yet */ }
      const bx = anchor === 'start' ? x - 8 : anchor === 'end' ? x - w + 8 : x - w / 2;
      g.insertBefore(el('rect', { x: bx, y: y - 15, width: w, height: 21, rx: 10.5, class: 'lg-badge-box' }), t);
      if (!reduced() && !hot) L.wait(() => g.remove(), all ? 1700 : 2800);
    }
    function animate(e, next) {
      const chain = [short(e.from)].concat(e.via.map(short)).concat([short(e.to)]);
      let pts = [];
      for (let i = 0; i < chain.length - 1; i++) {
        const h = hop(ibd.g, chain[i], chain[i + 1]);
        if (!h) { pts = null; break; }
        pts = pts.length ? pts.concat(h.slice(1)) : h;
      }
      log(e);
      /* the exchanges that make an architecture what it is (COURSE_CONFIG.archs[k].highlight): slower,
         thick, and their path stays drawn until the next step */
      const hot = ((AC[key] || {}).highlight || []).indexOf(e.signal) >= 0;
      if (!pts || reduced()) {
        if (hot && pts) el('path', { d: poly(pts), class: 'lg-msg-path hot' }, ibd.keep);
        pulse(e.to); badge(e, hot); next(); return;
      }
      const path = el('path', { d: poly(pts), class: 'lg-msg-path' + (hot ? ' hot' : '') }, hot ? ibd.keep : ibd.tokens);
      const dot = el('g', { class: hot ? 'hot' : '' }, ibd.tokens);
      el('circle', { r: hot ? 7 : 5, class: 'lg-token' }, dot);
      txt(dot, 0, hot ? -11 : -9, e.signal, 'lg-tok-t', 'middle');
      const ms = hot ? 1300 : all ? 240 : 460;
      L.tween(ms, (k) => { const p = along(path, k); dot.setAttribute('transform', `translate(${p[0].toFixed(1)},${p[1].toFixed(1)})`); }, () => {
        if (!hot) path.remove();
        dot.remove();
        pulse(e.to);
        badge(e, hot);
        if (hot) L.wait(next, 700); else next();
      });
    }
    function play(list, done) {
      if (!list.length) { done(); return; }
      const e = list.shift();
      if (e.kind === 'state') { setStates(ibd.boxes[e.path], e.states); pulse(e.path); play(list, done); return; }
      if (e.kind === 'self') { play(list, done); return; }
      animate(e, () => play(list, done));
    }
    function stepOnce(then) {
      const st = steps[at];
      if (!st || busy) return;
      busy = true;
      stack = {};
      while (ibd.badges.firstChild) ibd.badges.firstChild.remove();
      while (ibd.keep.firstChild) ibd.keep.firstChild.remove();
      showStep();
      tellStory(st);
      const events = sim.inject(st.signal, st.into);
      L.wait(() => play(events.slice(), () => {
        Object.keys(ibd.boxes).forEach((path) => { if (sim.has(path)) setStates(ibd.boxes[path], sim.leaves(path)); });
        const res = sim.check(st.expect);
        expectEl.innerHTML = res.map((r) => `<li class="${r.ok ? 'ok' : 'no'}">${r.ok ? '✓' : '✗'} <b>${esc(lab(r.path))}</b> ${esc(wantText(r.want))}</li>`).join('') || '<li>Nothing to check at this stage.</li>';
        at += 1;
        busy = false;
        showStep(true);
        liveStep(st);
        if (then) then();
      }), reduced() ? 0 : all ? 350 : 700);
    }
    function toEnd() { if (steps[at]) stepOnce(() => L.wait(toEnd, 900)); else all = false; }

    root.querySelector('[data-next]').addEventListener('click', () => stepOnce());
    root.querySelector('[data-all]').addEventListener('click', () => { all = true; toEnd(); });
    root.querySelector('[data-reset]').addEventListener('click', () => load(key));
    root.querySelectorAll('[data-k]').forEach((c) => c.addEventListener('click', () => {
      root.querySelectorAll('[data-k]').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      load(c.dataset.k);
    }));
    load(key);
    return () => { L.end(); if (offCheck) offCheck(); liveStop(); };
  };

  /* Trade-off: the three architectures, their internal block diagram and a star diagram of criteria. */
  W.tradeOff = function (root) {
    const keys = (AC.order || Object.keys(ARCHS)).filter((k) => ARCHS[k] && (AC[k] || {}).score);
    const AXES = AC.axes || [];
    if (!keys.length || !AXES.length) { root.textContent = ''; return undefined; }
    root.className = 'w lg-trade';
    root.innerHTML = `<div class="chips">${keys.map((k, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-k="${k}"><b class="lg-chip-n">${k}</b>${esc(AC[k].short || AC[k].name)}</button>`).join('')}</div>
      <div class="lg-trade-grid"><div class="lg-radar"></div><div class="lg-ibd"></div></div><div class="w-live lg-trade-txt" aria-live="polite"></div>`;
    const R = svg('-96 -6 432 236', 'Star diagram of the criteria: ' + AXES.join(', ') + '. The further out, the better.');
    root.querySelector('.lg-radar').appendChild(R);
    const C = [120, 112];
    const RAD = 80;
    const pt = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length; return [C[0] + Math.cos(a) * RAD * v / 5, C[1] + Math.sin(a) * RAD * v / 5]; };
    [1, 2, 3, 4, 5].forEach((v) => el('polygon', { points: AXES.map((_, i) => pt(i, v).join(',')).join(' '), class: 'lg-ring' }, R));
    AXES.forEach((a, i) => {
      const e = pt(i, 5);
      el('line', { x1: C[0], y1: C[1], x2: e[0], y2: e[1], class: 'lg-ring' }, R);
      const l = pt(i, 6.1);
      txt(R, l[0], l[1] + 3, a, 'lg-axis', l[0] < C[0] - 5 ? 'end' : l[0] > C[0] + 5 ? 'start' : 'middle');
    });
    const ghosts = keys.map((k) => el('polygon', { points: AC[k].score.map((v, i) => pt(i, v).join(',')).join(' '), class: 'lg-ghost-poly' }, R));
    const shape = el('polygon', { points: '', class: 'lg-poly' }, R);
    const dots = AXES.map(() => el('circle', { r: 3, class: 'lg-poly-dot' }, R));
    const box = root.querySelector('.lg-ibd');
    const out = root.querySelector('.lg-trade-txt');
    const L = life();
    let cur = AC[keys[0]].score.slice();
    function pick(k) {
      const info = AC[k];
      root.querySelectorAll('[data-k]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.k === k)));
      keys.forEach((x, j) => ghosts[j].classList.toggle('on', x !== k));
      box.innerHTML = '';
      const s = svg(`0 0 ${VB.w} ${VB.h}`, `Internal block diagram of architecture ${k}.`);
      box.appendChild(s);
      drawIbd(s, k, { mini: true });
      out.innerHTML = `<b>${esc(info.name)}</b> ${api_inline(info.decides || '')}<ul class="lg-pc">${(info.pros || []).map((x) => `<li class="pro">${api_inline(x)}</li>`).join('')}${(info.cons || []).map((x) => `<li class="con">${api_inline(x)}</li>`).join('')}</ul>`;
      const from = cur.slice();
      L.tween(600, (t) => {
        cur = from.map((v, j) => v + (info.score[j] - v) * t);
        const pts = cur.map((v, j) => pt(j, v));
        shape.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
        pts.forEach((p, j) => { dots[j].setAttribute('cx', p[0]); dots[j].setAttribute('cy', p[1]); });
      });
    }
    root.querySelectorAll('[data-k]').forEach((c) => c.addEventListener('click', () => pick(c.dataset.k)));
    pick(keys[0]);
    return () => L.end();
  };
  const api_inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');

  /* A small state, drawn for the step-by-step animations: name, and do / function under a line. */
  function mstate(g, x, y, w, name, fn, cls) {
    const h = fn ? 36 : 24;
    const gg = el('g', { class: 'lg-mst ' + (cls || '') }, g);
    el('rect', { x, y, width: w, height: h, rx: 8, class: 'lg-st-box' }, gg);
    txt(gg, x + w / 2, y + 15, name, 'lg-st-t', 'middle');
    if (fn) {
      el('line', { x1: x, y1: y + 20, x2: x + w, y2: y + 20, class: 's-line' }, gg);
      txt(gg, x + w / 2, y + 31, 'do / ' + fn, 'lg-do', 'middle');
    }
    return gg;
  }
  const dot = (g, x, y) => el('circle', { cx: x, cy: y, r: 4.5, class: 'lg-initial' }, g);

  /* Guided example, first idea: the same states do not behave the same once they are in a subsystem. The
     current state is lit, and moves as the signals arrive. In the mission everything happens inside. In
     Mission Configuration, the plan comes from outside; the verdict is still told to itself, and also to the
     operator; the operator then answers with the start order, which is passed on to the decider. */
  W.behaviourAB = function (root) {
    root.className = 'w lg-mc lg-ab';
    const s = svg('0 0 440 300', 'Left, in the functional mission: the state Configured runs Load Flight Plan, which acquires and checks the plan, decides, and sends Ready for mission to itself, on no port; that signal fires its transition to Ready for Mission. Right, in the subsystem Mission Configuration: from Unconfigured, FlightPlan comes in from the base station, the state becomes Configured. Load Flight Plan still sends Ready for mission to itself, the state becomes Ready for Mission, and its effect tells the operator through the base station, on Ready for mission_ext. The operator then sends Start Sheep Guard Mission: the state becomes Deployed and its effect passes the order on to the orchestrator.');
    root.appendChild(s);
    txt(s, 108, 14, 'A · IN THE MISSION', 'lg-tag', 'middle');
    txt(s, 331, 14, 'B · IN THE SUBSYSTEM', 'lg-tag', 'middle');

    /* A: the functional mission, talking to itself */
    const a = el('g', { class: 'lg-ab-a' }, s);
    el('rect', { x: 6, y: 22, width: 204, height: 272, rx: 8, class: 's-frame' }, a);
    txt(a, 14, 36, 'SOI - Pasture Sentinel', 's-name');
    const aConf = mstate(a, 20, 46, 176, 'Configured', 'Load Flight Plan');
    const flow = el('g', {}, a);
    const node = (x, y, w, t, cls) => { el('rect', { x, y, width: w, height: 20, rx: 5, class: 'lg-act ' + (cls || '') }, flow); txt(flow, x + w / 2, y + 14, t, 'lg-act-t', 'middle'); };
    node(22, 94, 62, 'Acquire');
    node(96, 94, 56, 'Check');
    el('path', { d: 'M168,94 l10,10 l-10,10 l-10,-10 Z', class: 'lg-act' }, flow);
    arrow(flow, [[84, 104], [96, 104]]);
    arrow(flow, [[152, 104], [158, 104]]);
    el('path', { d: 'M74,134 h86 l10,10 l-10,10 h-86 Z', class: 'lg-act lg-act-send' }, flow);
    txt(flow, 118, 148, 'send Ready for mission', 'lg-act-t', 'middle');
    arrow(flow, [[168, 114], [168, 124], [130, 124], [130, 134]]);
    txt(flow, 176, 166, 'to itself', 'lg-trig lg-red', 'end');
    const aReady = mstate(a, 40, 222, 140, 'Ready for Mission', 'Start subsystems');
    arrow(a, [[110, 170], [110, 222]]);
    txt(a, 116, 200, 'Ready for mission', 'lg-trig');
    const loop = el('path', { d: 'M74,144 C30,150 30,196 104,196', class: 'lg-ab-loop' }, a);
    txt(a, 14, 286, 'Everything happens inside.', 'lg-do');

    /* B: the subsystem, between the base station and the decider */
    const b = el('g', { class: 'lg-fade', 'data-from': 2 }, s);
    el('rect', { x: 228, y: 22, width: 206, height: 214, rx: 6, class: 's-box lg-box' }, b);
    txt(b, 236, 36, 'Mission Configuration', 's-name');
    const bUnc = mstate(b, 272, 40, 120, 'Unconfigured');
    const bConf = mstate(b, 272, 76, 150, 'Configured', 'Load Flight Plan');
    const bReady = mstate(b, 272, 146, 150, 'Ready for Mission', 'Start subsystems');
    const bDep = mstate(b, 272, 208, 90, 'Deployed');
    arrow(b, [[300, 64], [300, 76]]);
    txt(b, 306, 73, 'FlightPlan Correct', 'lg-trig');
    arrow(b, [[300, 112], [300, 146]]);
    txt(b, 306, 126, 'Ready for mission', 'lg-trig');
    arrow(b, [[300, 182], [300, 208]]);
    txt(b, 306, 193, 'Start Sheep Guard Mission', 'lg-trig');
    /* its own self-send, from stage 3 */
    const selfB = el('path', { d: 'M422,98 C438,112 420,122 384,123', class: 'lg-ab-loop lg-fade', 'data-from': 3 }, s);
    const e4 = el('g', { class: 'lg-fade', 'data-from': 4 }, s);
    txt(e4, 306, 138, '/ tell the operator', 'lg-eff');
    const e5 = el('g', { class: 'lg-fade', 'data-from': 5 }, s);
    txt(e5, 306, 204, '/ tell the decider', 'lg-eff');
    /* the ports and who is outside */
    const pBs = [250, 236];
    const pOr = [404, 236];
    [pBs, pOr].forEach((p) => el('rect', { x: p[0] - 6, y: p[1] - 6, width: 12, height: 12, class: 'lg-port-sq' }, b));
    el('line', { x1: pBs[0], y1: 242, x2: pBs[0], y2: 262, class: 's-line' }, b);
    el('line', { x1: pOr[0], y1: 242, x2: pOr[0], y2: 262, class: 's-line' }, b);
    const outside = (x, w, t1, t2) => { el('rect', { x, y: 262, width: w, height: 32, rx: 5, class: 's-box lg-box lg-ab-out' }, b); txt(b, x + w / 2, 275, t1, 's-name', 'middle'); txt(b, x + w / 2, 288, t2, 'lg-do', 'middle'); };
    outside(228, 104, 'Base station', 'and the operator');
    outside(348, 86, 'Orchestrator', 'the decider');
    const t6 = el('g', { class: 'lg-fade', 'data-from': 6 }, s);
    el('rect', { x: 14, y: 236, width: 190, height: 40, rx: 6, class: 'lg-ab-note' }, t6);
    txt(t6, 22, 252, 'Ready for mission_ext…:', 'lg-eff');
    txt(t6, 22, 266, 'signals of their own, to the outside', 'lg-do');

    /* the messages of each stage */
    const routes = {
      2: [{ d: `M${pBs[0]},290 V52 H272`, t: 'FlightPlan Correct' }],
      4: [{ d: `M272,164 H${pBs[0]} V290`, t: 'Ready for mission_ext' }],
      5: [{ d: `M${pBs[0]},290 V174 H272`, t: 'Start Sheep Guard Mission' }, { d: `M362,220 H${pOr[0]} V290`, t: 'Start Sheep Guard Mission_ext' }]
    };
    const tokens = el('g', {}, s);
    const lines = Object.keys(routes).reduce((m, k) => { m[k] = routes[k].map((r) => el('path', { d: r.d, class: 'lg-ab-route' }, tokens)); return m; }, {});
    const tok = el('g', { class: 'lg-ab-tok' }, tokens);
    el('circle', { r: 5.5, class: 'lg-token' }, tok);
    const tokT = txt(tok, 0, -9, '', 'lg-tok-t lg-ab-tok-t', 'middle');
    const selfTok = el('circle', { r: 5.5, class: 'lg-token' }, s);
    const nowIs = (g, on) => g.classList.toggle('now', on);
    const PER = 1.8;
    const stages = [
      { label: 'In the mission', text: 'Load Flight Plan acquires the plan, checks it, decides, and sends **Ready for mission to itself**. That signal fires its own transition. Everything happens inside the drone.', dwell: 4 },
      { label: 'Who gives the plan?', text: 'In the subsystem the plan is not there: **FlightPlan Correct comes in** from the operator, through the base station. The state goes from Unconfigured to **Configured**.', dwell: 3.6 },
      { label: 'Who fires the transition?', text: 'Load Flight Plan still decides, and **still tells itself**: this is internal, it stays as it is. The state becomes **Ready for Mission**.', dwell: 3.6 },
      { label: 'Who else wants to know?', text: 'The **operator** must know the plan is good. So the effect of that transition also sends a signal out, **Ready for mission_ext**, through the base station.', dwell: 3.6 },
      { label: 'Who starts the mission?', text: 'A new message, not the same one: the operator now answers **Start Sheep Guard Mission**. The state becomes **Deployed**, and the effect of that transition passes the order on to the decider.', dwell: 4.4 },
      { label: 'So: more behaviour', text: 'Same states, **more behaviour**: what only concerns the subsystem stays a self-send; what others need goes through a port, on a signal of its own, marked **_ext**.', dwell: 5 }
    ].map((x) => Object.assign(x, { text: x.text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>') }));
    return stager(root, s, stages, {
      onTick(at, t) {
        const moved = t > PER;
        nowIs(aConf, at === 1 && !moved);
        nowIs(aReady, at !== 1 || moved);
        nowIs(bUnc, at === 2 && !moved);
        nowIs(bConf, (at === 2 && moved) || (at === 3 && !moved));
        nowIs(bReady, (at === 3 && moved) || at === 4 || (at === 5 && !moved));
        nowIs(bDep, (at === 5 && moved) || at === 6);
        Object.keys(lines).forEach((k) => lines[k].forEach((p) => p.classList.toggle('on', +k === at)));
        a.classList.toggle('lg-dim', at > 1 && at < 6);
        const self = (at === 1 || at === 3) && t < PER && !reduced();
        selfTok.style.display = self ? '' : 'none';
        if (self) { const p = along(at === 1 ? loop : selfB, t / PER); selfTok.setAttribute('cx', p[0]); selfTok.setAttribute('cy', p[1]); }
        const r = routes[at];
        if (!r || reduced() || t >= PER * r.length) { tok.style.display = 'none'; return; }
        const i = Math.floor(t / PER);
        const p = along(lines[at][i], ease((t % PER) / PER));
        tok.style.display = '';
        tok.setAttribute('transform', `translate(${p[0].toFixed(1)},${p[1].toFixed(1)})`);
        tokT.textContent = r[i].t;
      }
    });
  };

  /* Guided example, part 1: Logical Transition of Undeployed into Mission Configuration, then the rework. */
  W.mcTransition = function (root) {
    root.className = 'w lg-mc';
    const s = svg('0 0 440 300', 'First, a logical component named Mission Configuration is created, right. Left, the composite state Undeployed of the functional mission: Off, Unconfigured, Configured (do Load Flight Plan), Ready for Mission (do Start subsystems), and Start Sheep Guard Mission towards Deployed. It is selected and sent with MBSE Shepherd, Logical Transition, to the block Mission Configuration, right. The clone points to off-TO RENAME, which becomes Deployed; initial states are added by hand, the effects by Delegate to external systems.');
    root.appendChild(s);
    txt(s, 108, 14, 'FUNCTIONAL MISSION', 'lg-tag', 'middle');
    txt(s, 332, 14, 'LOGICAL · Mission Configuration', 'lg-tag', 'middle');
    /* source */
    const src = el('g', {}, s);
    el('rect', { x: 6, y: 22, width: 204, height: 218, rx: 8, class: 's-frame' }, src);
    txt(src, 14, 36, 'Undeployed', 's-name');
    mstate(src, 16, 46, 80, 'Off');
    mstate(src, 110, 46, 94, 'Unconfigured');
    mstate(src, 104, 96, 100, 'Configured', 'Load Flight Plan');
    mstate(src, 64, 170, 132, 'Ready for Mission', 'Start subsystems');
    arrow(src, [[96, 58], [110, 58]]);
    arrow(src, [[157, 70], [157, 96]]);
    arrow(src, [[157, 132], [157, 170]]);
    txt(src, 151, 154, 'Ready for mission', 'lg-trig', 'end');
    arrow(src, [[130, 206], [130, 262]], 'lg-out');
    txt(src, 124, 254, 'Start Sheep Guard Mission', 'lg-trig', 'end');
    el('rect', { x: 84, y: 262, width: 92, height: 24, rx: 8, class: 'lg-st-box lg-ghosted' }, src);
    txt(src, 130, 278, 'Deployed', 'lg-st-t', 'middle');
    el('rect', { x: 2, y: 18, width: 212, height: 226, rx: 10, class: 'lg-select lg-fade', 'data-from': 2 }, s);
    /* target */
    el('rect', { x: 228, y: 22, width: 206, height: 272, rx: 6, class: 's-box lg-box' }, s);
    const fresh = el('g', { class: 'lg-fade' }, s);
    el('rect', { x: 252, y: 118, width: 158, height: 52, rx: 5, class: 's-box lg-box lg-new' }, fresh);
    txt(fresh, 331, 138, '«Logical Component»', 'lg-do', 'middle');
    txt(fresh, 331, 156, 'Mission Configuration', 's-name', 'middle');
    pointer(el('g', { class: 'lg-fade', 'data-only': 1 }, s), 396, 156);
    const clone = el('g', { class: 'lg-fade', 'data-from': 4 }, s);
    el('rect', { x: 236, y: 30, width: 190, height: 172, rx: 8, class: 's-frame' }, clone);
    txt(clone, 244, 44, 'Undeployed', 's-name');
    mstate(clone, 244, 52, 74, 'Off');
    mstate(clone, 330, 52, 92, 'Unconfigured');
    mstate(clone, 322, 94, 100, 'Configured', 'Load Flight Plan');
    mstate(clone, 280, 152, 140, 'Ready for Mission', 'Start subsystems');
    arrow(clone, [[318, 64], [330, 64]]);
    arrow(clone, [[372, 76], [372, 94]]);
    arrow(clone, [[372, 130], [372, 152]]);
    txt(clone, 366, 141, 'Ready for mission', 'lg-trig', 'end');
    arrow(clone, [[300, 188], [300, 222]]);
    const old = el('g', { class: 'lg-fade', 'data-only': 4 }, s);
    el('rect', { x: 250, y: 222, width: 108, height: 24, rx: 8, class: 'lg-st-box lg-rename' }, old);
    txt(old, 304, 238, 'off-TO RENAME', 'lg-st-t lg-red', 'middle');
    txt(old, 236, 268, '+ the functions they run: copied, «refine»,', 'lg-do');
    txt(old, 236, 280, 'and the originals allocated to the block', 'lg-do');
    const fixed = el('g', { class: 'lg-fade', 'data-from': 5 }, s);
    el('rect', { x: 250, y: 222, width: 80, height: 24, rx: 8, class: 'lg-st-box' }, fixed);
    txt(fixed, 290, 238, 'Deployed', 'lg-st-t', 'middle');
    dot(fixed, 281, 92);
    arrow(fixed, [[281, 88], [281, 77]]);
    const eff = el('g', { class: 'lg-fade', 'data-from': 6 }, s);
    txt(eff, 366, 150, '/ tell the operator', 'lg-eff', 'end');
    txt(eff, 306, 210, '/ tell the decider', 'lg-eff');
    txt(eff, 236, 268, 'Each sends a signal of its own to the outside,', 'lg-do');
    txt(eff, 236, 280, 'marked _ext. A plugin command does it.', 'lg-do');
    /* menu */
    const menu = el('g', { class: 'lg-fade lg-menu', 'data-only': 3 }, s);
    el('rect', { x: 110, y: 110, width: 214, height: 72, rx: 6, class: 'lg-menu-box' }, menu);
    txt(menu, 120, 128, 'MBSE Shepherd ▸', 's-name');
    el('rect', { x: 114, y: 135, width: 206, height: 18, rx: 3, class: 'lg-menu-hl' }, menu);
    txt(menu, 122, 148, 'Logical Transition… → Mission Configuration', 's-name');
    txt(menu, 122, 172, 'Delegate to external systems', 'lg-do');
    return stager(root, s, [
      { label: 'Create logical component', text: 'In the package <b>Components</b> of <b>TP - Logical Architecture</b>, create a <b>logical component</b> (a block with the stereotype «Logical Component»), named <b>Mission Configuration</b>. Logical Transition needs a target.', dwell: 5 },
      { label: 'Select', text: 'In the functional mission, select the composite <b>Undeployed</b>. One state is enough: its sub-states come with it.' },
      { label: 'Logical Transition', text: 'Right-click <b>MBSE Shepherd ▸ Logical Transition</b>, and pick the block <b>Mission Configuration</b>.' },
      { label: 'Cloned', text: 'The composite, its 4 sub-states and their transitions are copied into the state machine of the block, with the functions they run. Each copy gets a <b>«refine»</b> to its original, and the original is <b>allocated</b> to the block. The transition that left towards Deployed points to <b>off-TO RENAME</b>. The mission is never changed.', dwell: 5.4 },
      { label: 'Rework the states', text: 'By hand: <b>off-TO RENAME</b> becomes <b>Deployed</b>; add the two initial states. Nothing else moves: the transitions fired by Load Flight Plan stay as they are.', dwell: 5 },
      { label: 'Add what others need', text: 'The self-sends of <b>Load Flight Plan</b> stay: they fire this subsystem\'s own transitions. New <b>effects</b> tell the others, on ports, each with a signal of its own: <b>Ready for mission_ext</b>, <b>FlightPlan Check Failed_ext</b>, <b>Start Sheep Guard Mission_ext</b>.', dwell: 5 }
    ], { onStage(k) { fresh.classList.toggle('on', k < 4); } });
  };

  /* A plain table: { head: [...], rows: [[...]] }, inline marks allowed in the cells. */
  W.signalTable = function (root, opts, api) {
    root.className = 'lg-table-w';
    root.innerHTML = `<table class="lg-table"><thead><tr>${(opts.head || []).map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(opts.rows || []).map((r) => `<tr>${r.map((c) => `<td>${api.inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  };

  /* Guided example, part 2: the plugin made one port per signal; you group the signals that make one
     exchange with one partner, then connect and propagate. */
  W.mcPorts = function (root) {
    root.className = 'w lg-mcp';
    const s = svg('0 0 380 270', 'A part typed Mission Configuration has one port per signal: start_soi, flight_plan, start_sheep_guard in, and ready_mission_ext, flightplan_check_failed_ext, start_sheep_guard_mission_ext out. The signals of one exchange are grouped on one port: p_Init with Manual Initialization, p_BaseStation with the base station link (FlightPlan, Ready for mission_ext, FlightPlan Check Failed_ext, Start Sheep Guard Mission), p_Orchestrator with the decider. Connectors join them, and Propagate gives the port in front the same interface, conjugated.');
    root.appendChild(s);
    /* partners */
    const partner = (x, y, w, name, type, cls) => {
      const g = el('g', { class: cls || '' }, s);
      el('rect', { x, y, width: w, height: 40, rx: 5, class: 's-box lg-box' }, g);
      txt(g, x + w / 2, y + 17, name, 's-name', 'middle');
      txt(g, x + w / 2, y + 31, type, 'lg-do', 'middle');
      return g;
    };
    partner(6, 4, 96, 'Manual Init.', 'power-on');
    partner(6, 226, 96, 'Base station', 'and the operator');
    partner(300, 226, 76, 'Orchestrator', 'the decider, later', 'lg-ghosted');
    /* mc */
    el('rect', { x: 140, y: 30, width: 160, height: 190, rx: 6, class: 's-box lg-box lg-mcp-mc' }, s);
    txt(s, 220, 52, ': Mission Configuration', 's-name', 'middle');
    /* stage 1: one port per signal */
    const one = el('g', { class: 'lg-fade', 'data-only': 1 }, s);
    const sig = [['start_soi', 'in', 'L', 76], ['flight_plan', 'in', 'L', 104], ['start_sheep_guard', 'in', 'L', 132], ['ready_mission_ext', 'out', 'L', 160], ['flightplan_check_failed_ext', 'out', 'L', 188], ['start_sheep_guard_mission_ext', 'out', 'R', 110]];
    sig.forEach(([n, dir, side, y]) => {
      const x = side === 'L' ? 140 : 300;
      el('rect', { x: x - 5, y: y - 5, width: 10, height: 10, class: 'lg-port-sq' }, one);
      txt(one, side === 'L' ? x - 9 : x - 9, y + 3, `${n} ${dir === 'in' ? '◂' : '▸'}`, 'lg-mcp-t', 'end');
    });
    txt(one, 220, 262, '6 ports: one per signal', 'lg-do', 'middle');
    /* stage 2+: grouped */
    const grp = el('g', { class: 'lg-fade', 'data-from': 2 }, s);
    const gp = (x, y, name, lines, side) => {
      const tx = x + (side === 'L' ? 11 : -11);
      const an = side === 'L' ? 'start' : 'end';
      el('rect', { x: x - 6, y: y - 6, width: 12, height: 12, class: 'lg-port-sq lg-port-big' }, grp);
      txt(grp, tx, y - 4, name, 'lg-mcp-name', an);
      lines.forEach((l, i) => txt(grp, tx, y + 9 + i * 11, l, 'lg-mcp-t', an));
    };
    gp(140, 76, 'p_Init', ['◂ Start SOI'], 'L');
    gp(140, 136, 'p_BaseStation', ['◂ FlightPlan Correct', '◂ FlightPlan Incorrect', '▸ Ready for mission_ext', '▸ FlightPlan Check Failed_ext', '◂ Start Sheep Guard Mission'], 'L');
    gp(300, 110, 'p_Orchestrator', ['▸ Start Sheep Guard Mission_ext'], 'R');
    /* stage 3: connected and propagated */
    const con = el('g', { class: 'lg-fade', 'data-from': 3 }, s);
    el('path', { d: 'M102,24 H118 V76 H134', class: 's-line lg-mcp-c' }, con);
    el('path', { d: 'M102,246 H118 V136 H134', class: 's-line lg-mcp-c' }, con);
    el('path', { d: 'M306,110 H338 V226', class: 's-line lg-ghosted' }, con);
    return stager(root, s, [
      { label: 'One port per signal', text: 'Where you stand: <b>Create All Missing Signal Ports</b> made one port per signal coming in, <b>Delegate to external systems</b> one per signal going out. A self-send has no port: it stays inside.' },
      { label: 'Group what belongs together', text: 'One port = one <b>exchange with one partner</b>. Everything said with the base station (the plan, the verdict, the start order) is one dialogue: one port <b>p_BaseStation</b>. Power-on is <b>p_Init</b>; the hand-over is <b>p_Orchestrator</b>.', dwell: 5.2 },
      { label: 'Connect, propagate', text: 'Connect each port to its partner, then <b>Propagate Interface To Connected Port</b>: the port in front gets the same interface, conjugated, and the connector its item flows. <b>p_Orchestrator</b> waits for the decider.', dwell: 5 }
    ]);
  };

  /* A mouse pointer, for the animations that show a gesture. */
  const pointer = (g, x, y) => el('path', { d: `M${x},${y} l0,14 l3.6,-3.2 l2.6,6.2 l2.6,-1.2 l-2.6,-6 l4.8,-0.4 Z`, class: 'lg-pointer' }, g);

  /* A context menu: first level with MBSE Shepherd lit, then its flyout with one command lit. */
  function pluginMenu(g, x, y, items, lit) {
    const w1 = 92;
    el('rect', { x, y, width: w1, height: 56, rx: 5, class: 'lg-menu-box' }, g);
    txt(g, x + 8, y + 15, 'Specification', 'lg-do');
    txt(g, x + 8, y + 31, 'Symbol', 'lg-do');
    el('rect', { x: x + 3, y: y + 36, width: w1 - 6, height: 17, rx: 3, class: 'lg-menu-hl' }, g);
    txt(g, x + 8, y + 48, 'MBSE Shepherd ▸', 'lg-act-t');
    const w2 = 158;
    const x2 = x + w1 - 2;
    const y2 = y + 30;
    el('rect', { x: x2, y: y2, width: w2, height: 8 + items.length * 17, rx: 5, class: 'lg-menu-box' }, g);
    items.forEach((t, i) => {
      if (t === lit) el('rect', { x: x2 + 3, y: y2 + 4 + i * 17, width: w2 - 6, height: 17, rx: 3, class: 'lg-menu-hl' }, g);
      txt(g, x2 + 8, y2 + 16 + i * 17, t, t === lit ? 'lg-act-t' : 'lg-do');
    });
  }

  /* Guided example: the two gestures left on the states, small, under the steps. */
  W.mcStatesFix = function (root) {
    root.className = 'w lg-mc lg-mini';
    const s = svg('0 0 440 118', 'Gesture 1: the state off-TO RENAME, reached from Ready for Mission on Start Sheep Guard Mission, is renamed Deployed. Gesture 2: an initial state is added towards the composite Undeployed, and another one inside it towards Off.');
    root.appendChild(s);
    txt(s, 6, 11, '1 · RENAME', 'lg-tag');
    mstate(s, 6, 18, 112, 'Ready for Mission');
    arrow(s, [[62, 42], [62, 84]]);
    txt(s, 68, 66, 'Start Sheep Guard Mission', 'lg-trig');
    el('rect', { x: 6, y: 84, width: 96, height: 24, rx: 8, class: 'lg-st-box lg-rename' }, s);
    txt(s, 54, 100, 'off-TO RENAME', 'lg-st-t lg-red', 'middle');
    arrow(s, [[106, 96], [126, 96]]);
    el('rect', { x: 128, y: 84, width: 76, height: 24, rx: 8, class: 'lg-st-box lg-new' }, s);
    txt(s, 166, 100, 'Deployed', 'lg-st-t', 'middle');
    txt(s, 232, 11, '2 · TWO INITIAL STATES', 'lg-tag');
    el('rect', { x: 256, y: 18, width: 178, height: 90, rx: 8, class: 's-frame' }, s);
    txt(s, 264, 32, 'Undeployed', 's-name');
    dot(s, 236, 62);
    arrow(s, [[241, 62], [256, 62]]);
    el('circle', { cx: 236, cy: 62, r: 9, fill: 'none', class: 'lg-new' }, s);
    dot(s, 274, 62);
    arrow(s, [[279, 62], [300, 62]]);
    el('circle', { cx: 274, cy: 62, r: 9, fill: 'none', class: 'lg-new' }, s);
    mstate(s, 302, 50, 44, 'Off');
    arrow(s, [[346, 62], [358, 62]]);
    mstate(s, 360, 50, 68, 'Unconfigured');
  };

  /* Guided example: from the architecture to the ports. In theory many gestures; here one command, and each
     port comes wired to its interface, its signal and the transition that waits for it. */
  W.mcPortsMagic = function (root) {
    root.className = 'w lg-mc';
    const s = svg('0 0 420 244', 'The block Mission Configuration is dragged from the Model Browser and dropped on the IBD, which makes the part. The part is right-clicked, then MBSE Shepherd, Create All Missing Signal Ports. Three ports appear: start_soi, flight_plan and start_sheep_guard. Each is typed by an interface whose flow property carries the signal, which fires a transition of the state machine. Ready for mission and FlightPlan Check Failed get no port: they are internal.');
    root.appendChild(s);
    txt(s, 6, 13, 'IBD · TP Logical SOI', 'lg-tag');
    /* the drop */
    const drop = el('g', { class: 'lg-fade', 'data-only': 1 }, s);
    el('rect', { x: 150, y: 22, width: 262, height: 130, rx: 6, class: 'lg-ab-note' }, drop);
    txt(drop, 281, 142, 'Drop it here', 'lg-do', 'middle');
    txt(drop, 6, 44, 'MODEL BROWSER', 'lg-tag');
    const chip = el('g', { class: 'lg-fade', 'data-only': 1 }, s);
    el('rect', { x: 0, y: 0, width: 130, height: 22, rx: 4, class: 's-box lg-box lg-new' }, chip);
    txt(chip, 65, 15, 'Mission Configuration', 's-name', 'middle');
    pointer(chip, 112, 12);
    /* the part */
    const partG = el('g', { class: 'lg-fade', 'data-from': 2 }, s);
    el('rect', { x: 150, y: 22, width: 262, height: 130, rx: 6, class: 's-box lg-box' }, partG);
    txt(partG, 281, 40, ': Mission Configuration', 's-name', 'middle');
    const ROWS = [
      ['start_soi', 'Start SOI', 'Off → Unconfigured', 66],
      ['flight_plan', 'FlightPlan Correct', 'Unconfigured → Configured', 96],
      ['start_sheep_guard', 'Start Sheep Guard Mission', 'Ready for Mission → Deployed', 126]
    ];
    const rows = ROWS.map(([, sig, tr, y]) => {
      const g = el('g', { class: 'lg-mp-row' }, partG);
      txt(g, 164, y + 3, sig, 'lg-trig');
      txt(g, 404, y + 3, tr, 'lg-do', 'end');
      return g;
    });
    /* the gesture */
    const pick = el('g', { class: 'lg-fade', 'data-only': 2 }, s);
    el('rect', { x: 146, y: 18, width: 270, height: 138, rx: 8, class: 'lg-select' }, pick);
    pointer(pick, 300, 112);
    /* the ports */
    const ports = el('g', { class: 'lg-fade', 'data-from': 4 }, s);
    ROWS.forEach(([n, , , y]) => {
      el('rect', { x: 145, y: y - 5, width: 10, height: 10, class: 'lg-port-sq' }, ports);
      txt(ports, 139, y + 3, `${n} ◂`, 'lg-mcp-t', 'end');
    });
    /* everything linked, on one port */
    const chain = el('g', { class: 'lg-fade', 'data-only': 5 }, s);
    txt(chain, 6, 172, 'WHAT flight_plan COMES WITH', 'lg-tag');
    const CH = [['port', 'flight_plan'], ['interface', 'IF_flight_plan'], ['flow property, in', 'FlightPlan Correct'], ['signal', 'FlightPlan Correct']];
    CH.forEach(([k, v], i) => {
      const x = 6 + i * 104;
      el('rect', { x, y: 180, width: 92, height: 36, rx: 5, class: 'lg-ab-note' }, chain);
      txt(chain, x + 46, 193, k, 'lg-do', 'middle');
      txt(chain, x + 46, 207, v, 'lg-act-t', 'middle');
      if (i < 3) arrow(chain, [[x + 92, 198], [x + 104, 198]]);
    });
    txt(chain, 6, 234, '✓ Same for each port, and each one reaches the transition that waits for its signal.', 'lg-do');
    const route = el('path', { d: 'M126,96 H156', class: 'lg-mp-route' }, s);
    const tok = el('circle', { r: 5, class: 'lg-token' }, s);
    /* what is still missing */
    const miss = el('g', { class: 'lg-fade', 'data-only': 6 }, s);
    el('rect', { x: 6, y: 176, width: 408, height: 58, rx: 6, class: 'lg-fha' }, miss);
    txt(miss, 18, 196, '✗ Ready for mission, ✗ FlightPlan Check Failed: no port', 'lg-act-t lg-red');
    txt(miss, 18, 214, 'Sent and consumed inside the subsystem. They are for the next scene.', 'lg-do');
    /* the menu, over everything */
    const menu = el('g', { class: 'lg-fade', 'data-only': 3 }, s);
    pluginMenu(menu, 120, 72, ['Logical Transition', 'Create All Missing Signal Ports', 'Create Signal Proxy Ports', 'Delegate to external systems'], 'Create All Missing Signal Ports');
    return stager(root, s, [
      { label: 'Drag it in', text: 'From the Model Browser, drag the block <b>Mission Configuration</b> and drop it on the IBD. The drop makes the part: do not create one by hand.' },
      { label: 'Right-click the part', text: 'On the IBD, right-click the part <b>Mission Configuration</b>.' },
      { label: 'The command', text: '<b>MBSE Shepherd ▸ Create All Missing Signal Ports</b>. It reads what the state machine waits for and sends.' },
      { label: 'The ports', text: 'One port per signal coming from outside. The port, the interface and the flow property are all made for you.' },
      { label: 'All linked', text: 'Each port is typed by its interface, whose <b>flow property</b> carries the signal, in the right direction. The signal reaches the transition. Only the connectors to the partners remain, in two scenes.', dwell: 5.4 },
      { label: 'Still missing', text: 'The verdict for the operator has no port. That is normal, and it is the next scene.' }
    ], {
      onTick(at, t) {
        const k = reduced() ? 1 : ease(Math.min(1, t / 2.4));
        chip.setAttribute('transform', `translate(${6 + 210 * k},${52 + 28 * k})`);
        rows.forEach((r, i) => r.classList.toggle('lg-mp-on', at === 5 && i === 1));
        const on = at === 5 && !reduced();
        tok.style.display = on ? '' : 'none';
        if (on) { const p = along(route, ease(Math.min(1, (t % 2.4) / 1.2))); tok.setAttribute('cx', p[0]); tok.setAttribute('cy', p[1]); }
      }
    });
  };

  /* Guided example: a signal the state machine consumes is internal, so it has no port. Delegate to external
     systems gives it a twin for the outside: a signal, a send in the effect, a port with its interface. */
  W.mcDelegate = function (root) {
    root.className = 'w lg-mc';
    const s = svg('0 0 440 250', 'Left, in the state machine: Configured runs Load Flight Plan, which sends Ready for mission to itself; that signal fires the transition to Ready for Mission, so it is internal and has no port. The transition is right-clicked, then MBSE Shepherd, Delegate to external systems. The effect now sends Ready for mission_ext. Right, the part Mission Configuration then has an output port ready_mission_ext, towards the base station and the operator.');
    root.appendChild(s);
    txt(s, 108, 13, 'STATE MACHINE', 'lg-tag', 'middle');
    txt(s, 352, 13, 'THE COMPONENT', 'lg-tag', 'middle');
    /* the state machine */
    el('rect', { x: 6, y: 20, width: 204, height: 172, rx: 8, class: 's-frame' }, s);
    mstate(s, 24, 30, 150, 'Configured', 'Load Flight Plan');
    mstate(s, 24, 146, 150, 'Ready for Mission', 'Start subsystems');
    arrow(s, [[70, 66], [70, 146]]);
    txt(s, 76, 92, 'Ready for mission', 'lg-trig');
    el('rect', { x: 62, y: 80, width: 88, height: 18, rx: 4, class: 'lg-select lg-fade', 'data-only': 3 }, s);
    const loop = el('path', { d: 'M174,50 C204,62 204,108 72,110', class: 'lg-ab-loop lg-fade', 'data-only': 2 }, s);
    const inner = el('g', { class: 'lg-fade', 'data-only': 2 }, s);
    txt(inner, 204, 130, 'sent here, consumed here', 'lg-trig lg-red', 'end');
    const eff = el('g', { class: 'lg-fade', 'data-from': 4 }, s);
    txt(eff, 76, 118, '/ send Ready for mission_ext', 'lg-eff');
    /* the component */
    el('rect', { x: 270, y: 20, width: 164, height: 118, rx: 6, class: 's-box lg-box' }, s);
    txt(s, 352, 36, ': Mission Configuration', 's-name', 'middle');
    ['start_soi', 'flight_plan', 'start_sheep_guard'].forEach((n, i) => {
      const y = 54 + i * 18;
      el('rect', { x: 265, y: y - 5, width: 10, height: 10, class: 'lg-port-sq' }, s);
      txt(s, 281, y + 3, `◂ ${n}`, 'lg-mcp-t');
    });
    el('rect', { x: 288, y: 206, width: 146, height: 36, rx: 5, class: 's-box lg-box' }, s);
    txt(s, 361, 221, 'Base station', 's-name', 'middle');
    txt(s, 361, 235, 'relay to the operator', 'lg-do', 'middle');
    const none = el('g', { class: 'lg-fade', 'data-only': 1 }, s);
    el('rect', { x: 347, y: 133, width: 10, height: 10, class: 'lg-port-sq lg-rename' }, none);
    txt(none, 346, 172, 'Expected here: nothing yet', 'lg-trig lg-red', 'end');
    el('path', { d: 'M352,143 V206', class: 'lg-ab-loop' }, none);
    /* what the command makes */
    const made = el('g', { class: 'lg-fade', 'data-only': 4 }, s);
    el('rect', { x: 6, y: 198, width: 272, height: 48, rx: 6, class: 'lg-ab-note' }, made);
    txt(made, 16, 212, '✓ signal Ready for mission_ext', 'lg-act-t');
    txt(made, 16, 226, '✓ send in the effect, On Port set', 'lg-act-t');
    txt(made, 16, 240, '✓ port, interface, flow property', 'lg-act-t');
    const port = el('g', { class: 'lg-fade', 'data-from': 5 }, s);
    el('rect', { x: 347, y: 133, width: 10, height: 10, class: 'lg-port-sq lg-new' }, port);
    txt(port, 352, 126, 'ready_mission_ext ▸', 'lg-mcp-t', 'middle');
    const out = el('path', { d: 'M352,143 V206', class: 's-line lg-mcp-c lg-fade', 'data-from': 5 }, s);
    const tok = el('circle', { r: 5, class: 'lg-token' }, s);
    /* the gesture and the menu, over everything */
    const menu = el('g', { class: 'lg-fade', 'data-only': 3 }, s);
    pointer(menu, 112, 90);
    pluginMenu(menu, 96, 96, ['Logical Transition', 'Delegate to external systems'], 'Delegate to external systems');
    return stager(root, s, [
      { label: 'Expected', text: 'The operator expects <b>Ready for mission</b>, through the base station. But Mission Configuration has no port for it: only the three that come in.' },
      { label: 'Why', text: 'Load Flight Plan sends it, and the state machine of the same subsystem consumes it. It starts and ends inside: an <b>internal signal</b>. So no port, and rightly so.' },
      { label: 'Delegate', text: 'No panic, another magic button. Right-click the transition, <b>MBSE Shepherd ▸ Delegate to external systems</b>.' },
      { label: 'What it makes', text: 'A <b>new signal</b>, dedicated to the outside, <b>Ready for mission_ext</b>. The transition sends it in its effect. The port, the interface and the flow property come with it.', dwell: 5 },
      { label: 'Back on the component', text: 'This time there is an <b>output port</b>, with the signal <b>_ext</b>. The original signal still fires the transition inside; the new one goes to the base station.', dwell: 5 }
    ], {
      onTick(at, t) {
        const inside = at === 2 && !reduced();
        const going = at === 5 && !reduced();
        tok.style.display = inside || going ? '' : 'none';
        if (inside || going) { const p = along(inside ? loop : out, ease(Math.min(1, (t % 2.4) / 1.8))); tok.setAttribute('cx', p[0]); tok.setAttribute('cy', p[1]); }
      }
    });
  };

  /* What the logical level is for, in four stages: easy to change, exchanges first, behaviours at the same
     time, still checked against the mission. */
  W.whatFor = function (root) {
    root.className = 'w lg-mc lg-wf';
    const s = svg('0 0 420 230', 'Three subsystems inside the logical SoI: Patrol, Sheep watch and Predator. A function Count sheep moves from Patrol to Sheep watch. Then the exchanges appear between them, with their signals. Then each subsystem shows its state changing at the same time. Then a scenario is checked step by step.');
    root.appendChild(s);
    el('rect', { x: 6, y: 6, width: 280, height: 218, rx: 8, class: 's-frame lg-soi' }, s);
    txt(s, 16, 22, 'Logical SoI', 'lg-tag');
    const B = [[22, 40, 'Patrol'], [160, 40, 'Sheep watch'], [92, 148, 'Predator']];
    const states = [['Path', 'Watch'], ['Counting', 'Alert'], ['Watch', 'Track']];
    const stT = [];
    B.forEach(([x, y, n], i) => {
      el('rect', { x, y, width: 108, height: 74, rx: 5, class: 's-box lg-box' }, s);
      txt(s, x + 54, y + 16, n, 's-name', 'middle');
      const st = el('g', { class: 'lg-fade', 'data-from': 3 }, s);
      el('rect', { x: x + 22, y: y + 50, width: 64, height: 18, rx: 7, class: 'lg-st-box' }, st);
      stT.push(txt(st, x + 54, y + 63, states[i][0], 'lg-st-t', 'middle'));
    });
    const chip = el('g', {}, s);
    el('rect', { x: -36, y: -9, width: 72, height: 18, rx: 9, class: 'pf-fn' }, chip);
    txt(chip, 0, 4, 'Count sheep', 'lg-act-t', 'middle');
    const ex = el('g', { class: 'lg-fade', 'data-from': 2 }, s);
    arrow(ex, [[130, 70], [158, 70]]);
    txt(ex, 145, 36, 'Patrolling', 'lg-trig', 'middle');
    arrow(ex, [[146, 146], [180, 116]]);
    txt(ex, 168, 134, 'Deactivate', 'lg-trig', 'start');
    arrow(ex, [[76, 116], [110, 146]]);
    txt(ex, 86, 132, 'Bear seen', 'lg-trig', 'end');
    const sc = el('g', { class: 'lg-fade', 'data-from': 4 }, s);
    el('rect', { x: 298, y: 6, width: 116, height: 218, rx: 8, class: 's-frame' }, sc);
    txt(sc, 306, 22, 'Scenario', 'lg-tag');
    const checks = ['Patrol starts', 'Sheep counted', 'Bear tracked', 'Back to patrol'].map((t, i) => {
      const g = el('g', { class: 'lg-wf-check' }, sc);
      txt(g, 308, 50 + i * 40, '✓', 'lg-wf-ok');
      txt(g, 322, 50 + i * 40, t, 'lg-do');
      return g;
    });
    return stager(root, s, [
      { label: 'Easy to change', text: 'A handful of subsystems on one page. Moving a function from one to another costs a drag: nothing is designed nor bought yet.' },
      { label: 'Exchanges first', text: 'Every exchange is explicit: who sends what to whom. In the functional mission, the drone only talked to itself.' },
      { label: 'At the same time', text: 'Each subsystem runs its own state machine, at the same time as the others. What you check is how they play together.' },
      { label: 'Checked', text: 'The scenario of the mission runs on the architecture: if a subsystem waits for a signal nobody sends, you see it now, not on the drone.' }
    ], {
      onTick(at, t) {
        const k = at === 1 ? Math.min(1, Math.max(0, (t - 0.8) / 1.4)) : 1;
        const e = ease(k);
        chip.setAttribute('transform', `translate(${(76 + (214 - 76) * e).toFixed(1)},74)`);
        stT.forEach((n, i) => { n.textContent = states[i][Math.floor(t / 1.1 + i * 0.5) % 2]; });
        checks.forEach((g, i) => g.classList.toggle('on', at === 4 && t > 0.4 + i * 0.6));
      }
    });
  };

  /* Safety: a functional chain, its failure analysis (FHA), and the same function allocated three times. */
  W.safetyChain = function (root) {
    root.className = 'w lg-mc lg-safe';
    const s = svg('0 0 420 250', 'A functional chain: Measure position, Compute speed, Command motors. The functional hazard analysis says: Compute speed lost means the drone is out of control, catastrophic. In the architecture, Compute speed is allocated to three subsystems, and a vote keeps two out of three. When one copy fails, the drone still flies: the effect becomes minor.');
    root.appendChild(s);
    const fn = (x, y, t, cls) => { const g = el('g', { class: cls || '' }, s); el('rect', { x, y, width: 104, height: 26, rx: 13, class: 'pf-fn' }, g); txt(g, x + 52, y + 17, t, 'lg-act-t', 'middle'); return g; };
    txt(s, 8, 18, 'FUNCTIONAL CHAIN', 'lg-tag');
    fn(8, 30, 'Measure position');
    const cs = fn(158, 30, 'Compute speed');
    fn(308, 30, 'Command motors');
    arrow(s, [[112, 43], [156, 43]]);
    arrow(s, [[262, 43], [306, 43]]);
    const x1 = el('g', { class: 'lg-fade', 'data-only': 2 }, s);
    el('path', { d: 'M196,34 l26,18 M222,34 l-26,18', class: 'lg-x' }, x1);
    /* FHA row */
    const fha = el('g', { class: 'lg-fade', 'data-from': 2 }, s);
    el('rect', { x: 8, y: 70, width: 404, height: 44, rx: 6, class: 'lg-fha' }, fha);
    txt(fha, 16, 86, 'FHA · failure', 'lg-tag');
    txt(fha, 16, 104, 'Compute speed lost', 'lg-act-t');
    txt(fha, 160, 86, 'effect', 'lg-tag');
    const eff = txt(fha, 160, 104, 'drone out of control', 'lg-act-t');
    txt(fha, 320, 86, 'severity', 'lg-tag');
    const sev = txt(fha, 320, 104, 'Catastrophic', 'lg-sev');
    /* allocation */
    const al = el('g', { class: 'lg-fade', 'data-from': 3 }, s);
    txt(al, 8, 136, 'LOGICAL ARCHITECTURE', 'lg-tag');
    ['AutoPilot', 'Backup computer', 'Safety monitor'].forEach((n, i) => {
      const x = 8 + i * 106;
      el('rect', { x, y: 144, width: 96, height: 60, rx: 5, class: 's-box lg-box' }, al);
      txt(al, x + 48, 160, n, 's-name', 'middle');
      el('rect', { x: x + 8, y: 170, width: 80, height: 22, rx: 11, class: 'pf-fn' }, al);
      txt(al, x + 48, 185, 'Compute speed', 'lg-act-t', 'middle');
      arrow(al, [[x + 48, 204], [x + 48, 214], [358, 214]].slice(0, i === 2 ? 3 : 3));
    });
    el('rect', { x: 330, y: 150, width: 82, height: 48, rx: 24, class: 'lg-vote' }, al);
    txt(al, 371, 170, 'vote', 's-name', 'middle');
    txt(al, 371, 184, '2 out of 3', 'lg-do', 'middle');
    el('path', { d: 'M358,214 H371 V198', class: 's-line' }, al);
    const x2 = el('g', { class: 'lg-fade', 'data-from': 4 }, s);
    el('path', { d: 'M130,170 l60,22 M190,170 l-60,22', class: 'lg-x' }, x2);
    txt(x2, 371, 240, '✓ still flies', 'lg-wf-ok', 'middle');
    return stager(root, s, [
      { label: 'A functional chain', text: 'At the functional level, a chain: measure the position, compute the speed, command the motors.' },
      { label: 'What if it fails?', text: 'The <b>Functional Hazard Analysis</b> asks, function by function: what if it is lost? Compute speed lost: the drone is out of control. <b>Catastrophic</b>.' },
      { label: 'Allocate it three times', text: 'In the logical architecture you decide where it runs: here, in <b>three subsystems</b>, with a vote that keeps two answers out of three.' },
      { label: 'One fails, it flies', text: 'One copy fails, the two others agree: the drone still flies. The same failure is now <b>minor</b>. The diagram shows it: no single point of failure.', dwell: 4.6 }
    ], {
      onStage(k) {
        eff.textContent = k >= 4 ? 'one copy out, the others carry on' : 'drone out of control';
        sev.textContent = k >= 4 ? 'Minor' : 'Catastrophic';
        sev.classList.toggle('ok', k >= 4);
        cs.classList.toggle('lg-bad', k === 2);
      }
    });
  };

  /* Performance: the chain of reactions from the camera to the AutoPilot, its latency, and what merging two
     subsystems saves. */
  W.perfChain = function (root) {
    root.className = 'w lg-mc lg-perf';
    const s = svg('0 0 420 230', 'From the camera to the AutoPilot, in the central orchestrator architecture: camera, Zone Patrolling, orchestrator, Predator Management, orchestrator, Tracking, orchestrator, AutoPilot. Each interface costs 8 milliseconds and each subsystem 4. Merging Predator Management and Tracking into one Predator Defense that drives the AutoPilot itself leaves camera, Zone Surveillance, Predator Defense, AutoPilot: fewer interfaces, less latency.');
    root.appendChild(s);
    const IF = 8;
    const PR = 4;
    const chain = (y, names, cls) => {
      const g = el('g', { class: cls }, s);
      const w = 400 / names.length;
      names.forEach((n, i) => {
        const x = 10 + i * w;
        el('rect', { x, y, width: w - 12, height: 30, rx: 5, class: i === 0 ? 'lg-cam' : 's-box lg-box' }, g);
        const lines = n.split('|');
        lines.forEach((t, l) => txt(g, x + (w - 12) / 2, y + (lines.length > 1 ? 13 + l * 9 : 19), t, 'lg-perf-t', 'middle'));
        if (i) arrow(g, [[x - 12, y + 15], [x - 1, y + 15]]);
      });
      return g;
    };
    const a = ['Camera', 'Zone|Patrol', 'Orches-|trator', 'Predator|Mgmt', 'Orches-|trator', 'Tracking', 'Orches-|trator', 'Auto-|Pilot'];
    const b = ['Camera', 'Zone Surveillance', 'Predator Defense', 'AutoPilot'];
    txt(s, 10, 20, 'BEAR SEEN → DRONE FOLLOWS IT', 'lg-tag');
    chain(30, a, '');
    const sumA = el('g', { class: 'lg-fade', 'data-from': 2 }, s);
    const ta = (a.length - 1) * IF + (a.length - 2) * PR;
    txt(sumA, 10, 82, `${a.length - 1} interfaces × ${IF} ms + ${a.length - 2} subsystems × ${PR} ms`, 'lg-do');
    txt(sumA, 410, 82, `≈ ${ta} ms`, 'lg-ms', 'end');
    const merged = el('g', { class: 'lg-fade', 'data-from': 3 }, s);
    txt(merged, 10, 116, 'MERGE PREDATOR + TRACKING', 'lg-tag');
    chain(126, b, '');
    const tb = (b.length - 1) * IF + (b.length - 2) * PR;
    txt(merged, 10, 178, `${b.length - 1} interfaces × ${IF} ms + ${b.length - 2} subsystems × ${PR} ms`, 'lg-do');
    txt(merged, 410, 178, `≈ ${tb} ms`, 'lg-ms ok', 'end');
    const tr = el('g', { class: 'lg-fade', 'data-from': 4 }, s);
    el('rect', { x: 10, y: 192, width: 400, height: 32, rx: 6, class: 'lg-ab-note' }, tr);
    txt(tr, 20, 206, 'Fewer subsystems, fewer interfaces, less latency…', 'lg-eff');
    txt(tr, 20, 218, '…but a bigger subsystem, harder to change and to reuse: a trade-off.', 'lg-do');
    const tok = el('circle', { r: 5, class: 'lg-token' }, s);
    return stager(root, s, [
      { label: 'A chain of reactions', text: 'How long from the camera seeing the bear to the drone following it? Follow the chain through the subsystems of the central orchestrator.' },
      { label: 'Count it', text: `Each interface costs time (here ${IF} ms: a message, a bus, a queue), each subsystem too (${PR} ms). This chain costs about <b>${ta} ms</b>.` },
      { label: 'Merge two', text: `Put Predator Management and Tracking in one subsystem that drives the AutoPilot itself: <b>${tb} ms</b>.`, dwell: 4.4 },
      { label: 'A trade-off', text: 'Fewer subsystems means fewer interfaces and less latency, but bigger subsystems, harder to change, test and reuse. The logical level is where you weigh it.', dwell: 4.6 }
    ], {
      onTick(at, t) {
        const row = at >= 3 ? b : a;
        const y = at >= 3 ? 141 : 45;
        const w = 400 / row.length;
        const k = (t % 2.4) / 2.4;
        const x = 10 + (w - 12) / 2 + k * (row.length - 1) * w;
        tok.setAttribute('cx', x.toFixed(1));
        tok.setAttribute('cy', y);
        tok.style.display = reduced() ? 'none' : '';
      }
    });
  };

  /* Checking the flows: a scenario played as a sequence diagram in a second, then a broken flow. */
  W.seqCheck = function (root) {
    root.className = 'w lg-mc lg-seq';
    const s = svg('0 0 420 250', 'A sequence diagram with the lifelines Operator, Base station, Mission Configuration, Orchestrator and AutoPilot. The messages of the start of the mission appear one after the other in a second: FlightPlan, Ready for mission, Start Sheep Guard Mission, Go To Safe Area, Arrived At Safe Area. Each lifeline ends in the expected state, ticked. Then a broken flow: the orchestrator never receives Arrived At Safe Area, and stays in Transit, shown in red.');
    root.appendChild(s);
    const L = ['Operator', 'Base station', 'Mission Config.', 'Orchestrator', 'AutoPilot'];
    const X = L.map((_, i) => 40 + i * 85);
    L.forEach((n, i) => {
      el('rect', { x: X[i] - 34, y: 8, width: 68, height: 20, rx: 4, class: 's-box lg-box' }, s);
      txt(s, X[i], 22, n, 'lg-act-t', 'middle');
      el('path', { d: `M${X[i]},28 V210`, class: 's-line s-dash' }, s);
    });
    const M = [[0, 1, 'FlightPlan Correct'], [1, 2, 'FlightPlan Correct'], [2, 1, 'Ready for mission_ext'], [0, 2, 'Start Sheep Guard'], [2, 3, 'Start Sheep Guard_ext'], [3, 4, 'Go To Safe Area'], [4, 3, 'Arrived At Safe Area']];
    const msgs = M.map(([a, b, t], i) => {
      const y = 46 + i * 22;
      const g = el('g', { class: 'lg-seq-m' + (i === 6 ? ' last' : '') }, s);
      arrow(g, [[X[a], y], [X[b] + (b > a ? -2 : 2), y]]);
      txt(g, (X[a] + X[b]) / 2, y - 4, t, 'lg-trig', 'middle');
      return g;
    });
    const end = ['', '', 'Deployed', 'Patrolling', 'Watch path'];
    const ticks = end.map((t, i) => {
      if (!t) return null;
      const g = el('g', { class: 'lg-seq-end' }, s);
      el('rect', { x: X[i] - 38, y: 214, width: 76, height: 20, rx: 9, class: 'lg-st-box' }, g);
      txt(g, X[i], 228, t, 'lg-st-t', 'middle');
      return g;
    });
    const bad = el('g', { class: 'lg-fade', 'data-only': 3 }, s);
    el('path', { d: `M${X[4]},178 H${X[3] + 30}`, class: 'lg-broken' }, bad);
    txt(bad, X[3] + 26, 174, '✗ no connector', 'lg-trig lg-red', 'end');
    el('rect', { x: X[3] - 38, y: 214, width: 76, height: 20, rx: 9, class: 'lg-st-box lg-rename' }, bad);
    txt(bad, X[3], 228, 'stuck: Transit', 'lg-st-t lg-red', 'middle');
    return stager(root, s, [
      { label: 'Play the scenario', text: 'The scenario is played on the architecture and drawn as a <b>sequence diagram</b>: every message, in order, between the subsystems. It takes a second.' },
      { label: 'Flows checked', text: 'At the end of each step, each subsystem must be in the expected state. All ticked: the flows are right, and the architecture holds the mission.' },
      { label: 'A broken flow', text: 'A missing connector: the AutoPilot\'s answer goes nowhere, the orchestrator <b>stays in Transit</b>. Found in a second, on the model, long before the drone exists.', dwell: 4.6 }
    ], {
      onTick(at, t) {
        const n = at === 1 ? Math.floor(t / 0.35) : M.length;
        msgs.forEach((g, i) => g.classList.toggle('on', i < n && !(at === 3 && i === 6)));
        ticks.forEach((g, i) => { if (g) g.classList.toggle('on', at === 2 || (at === 3 && i !== 3) || (at === 1 && n >= M.length)); });
      }
    });
  };

  /* Several versions of the architecture side by side: the point of the logical level is the trade-off. */
  W.archVersions = function (root) {
    const keys = (AC.order || Object.keys(ARCHS)).filter((k) => ARCHS[k]);
    if (!keys.length) { root.textContent = ''; return; }
    root.className = 'w lg-versions';
    root.innerHTML = keys.map((k) => `<figure><div class="lg-versions-art" data-k="${k}"></div><figcaption><b>V${k}</b> ${esc((AC[k] || {}).short || '')}</figcaption></figure>`).join('');
    keys.forEach((k) => {
      const s = svg(`0 0 ${VB.w} ${VB.h}`, `Version ${k} of the architecture: ${ARCHS[k].soi.parts.map((p) => p.type).join(', ')}.`);
      root.querySelector(`[data-k="${k}"]`).appendChild(s);
      drawIbd(s, k, { mini: true });
    });
  };

  /* Guided example: Mission Configuration takes the top of the mission, Undeployed; the rest goes elsewhere. */
  W.mcCut = function (root) {
    root.className = 'w lg-mc lg-cut';
    const s = svg('0 0 420 240', 'The functional mission, simplified: Undeployed with Off, Unconfigured, Configured and Ready for Mission; Deployed with Going to Safe Area, Patrolling and Predator Detected. Undeployed is highlighted. A new empty block Mission Configuration is created. Then Undeployed is copied into it by a transition. The original stays in the mission. Deployed is greyed: it will go to other subsystems.');
    root.appendChild(s);
    txt(s, 8, 14, 'FUNCTIONAL MISSION', 'lg-tag');
    const mission = el('g', {}, s);
    const und = el('g', { class: 'lg-cut-und' }, mission);
    el('rect', { x: 8, y: 22, width: 190, height: 96, rx: 8, class: 's-frame' }, und);
    txt(und, 16, 36, 'Undeployed', 's-name');
    [['Off', 16, 44, 70], ['Unconfigured', 92, 44, 100], ['Configured', 16, 82, 70], ['Ready for Mission', 92, 82, 100]].forEach(([n, x, y, w]) => mstate(und, x, y, w, n));
    const rest = el('g', { class: 'lg-cut-rest' }, mission);
    el('rect', { x: 8, y: 128, width: 190, height: 74, rx: 8, class: 's-frame' }, rest);
    txt(rest, 16, 142, 'Deployed', 's-name');
    [['Safe Area', 16, 150], ['Patrolling', 104, 150], ['Predator Detected', 16, 176]].forEach(([n, x, y]) => mstate(rest, x, y, n === 'Predator Detected' ? 174 : 86, n));
    el('rect', { x: 4, y: 18, width: 198, height: 104, rx: 10, class: 'lg-select lg-fade', 'data-from': 1 }, s);
    /* the block, empty first */
    const blk = el('g', { class: 'lg-fade', 'data-from': 2 }, s);
    el('rect', { x: 226, y: 22, width: 188, height: 132, rx: 6, class: 's-box lg-box' }, blk);
    txt(blk, 234, 36, '«Logical Component»', 'lg-do');
    txt(blk, 234, 50, 'Mission Configuration', 's-name');
    const empty = el('g', { class: 'lg-fade', 'data-only': 2 }, s);
    txt(empty, 320, 100, 'empty: no behaviour yet', 'lg-do', 'middle');
    /* its states, by transition */
    const copy = el('g', { class: 'lg-fade', 'data-from': 3 }, s);
    el('rect', { x: 234, y: 58, width: 172, height: 88, rx: 8, class: 's-frame' }, copy);
    txt(copy, 242, 72, 'Undeployed', 's-name');
    [['Off', 240, 80, 66], ['Unconfigured', 310, 80, 92], ['Configured', 240, 114, 66], ['Ready for Mission', 310, 114, 92]].forEach(([n, x, y, w]) => mstate(copy, x, y, w, n));
    arrow(s, [[204, 70], [224, 70]], 'lg-fade').setAttribute('data-from', 3);
    const oth = el('g', { class: 'lg-fade', 'data-from': 4 }, s);
    el('rect', { x: 226, y: 168, width: 188, height: 54, rx: 6, class: 's-box lg-box lg-ghosted' }, oth);
    txt(oth, 320, 190, 'other subsystems', 's-name', 'middle');
    txt(oth, 320, 206, 'Deployed: chapter 6', 'lg-do', 'middle');
    return stager(root, s, [
      { label: 'The preparation', text: 'Mission Configuration is the <b>preparation</b> of the mission: from power-on to ready to fly. In the functional mission, that is the composite <b>Undeployed</b>.' },
      { label: 'Create the subsystem', text: 'First, a new block: <b>Mission Configuration</b>, stereotype «Logical Component». It is empty: it does not do anything yet.' },
      { label: 'Transition its states', text: 'Then <b>Logical Transition</b> copies Undeployed into its state machine, with the functions those states run. The functional mission is <b>not changed</b>: it stays the reference.', dwell: 4.6 },
      { label: 'The rest, later', text: 'Deployed (patrol, sheep, bear) goes to <b>other subsystems</b>: that is the architecture you will choose.' }
    ], {
      onStage(k) { rest.classList.toggle('lg-dim', k >= 2); }
    });
  };

  /* Where the logic is in one architecture: its deciders, and the exchanges that carry their decisions. */
  W.logicSpot = function (root, opts) {
    const k = opts.arch;
    const info = AC[k] || {};
    if (!ARCHS[k] || !info.spot) { root.textContent = ''; return; }
    root.className = 'w lg-spot-w';
    const s = svg(`0 0 ${VB.w} ${VB.h}`, `Architecture ${k}: the decisions are in ${info.spot.parts.map(lab).join(', ')}.`);
    root.appendChild(s);
    const ibd = drawIbd(s, k, { mini: true });
    s.classList.add('lg-spotting');
    info.spot.parts.forEach((p) => { const b = ibd.boxes['soi.' + p]; if (b) b.g.classList.add('spot'); });
    (info.spot.also || []).forEach((p) => { const b = ibd.boxes['soi.' + p]; if (b) b.g.classList.add('near'); });
    const on = (a, b) => (info.spot.links || []).some(([x, y]) => (x === a && y === b) || (x === b && y === a));
    Object.keys(ibd.conn).forEach((key) => {
      const [a, b] = key.split('|').map((e) => e.replace(/^soi\./, '').split('.')[0]);
      if (on(a, b)) ibd.conn[key].classList.add('spot');
      if ((info.spot.hot || []).some(([x, y]) => (x === a && y === b) || (x === b && y === a))) ibd.conn[key].classList.add('hot');
    });
    if (info.spot.note && !opts.noNote) {
      const p = document.createElement('p');
      p.className = 'w-live';
      p.innerHTML = api_inline(info.spot.note);
      root.appendChild(p);
    }
  };

  /* ───────── the build, stage by stage: what to reach, what to connect, the scenario that grows ───────── */

  /* The scenario so far, one chip per stage: played and checked, being built, still to come. */
  function growHTML(id) {
    const all = (AC.stages || {}).list || [];
    const list = all.filter((x) => x.short);
    const at = list.findIndex((x) => x.id === ((all.find((y) => y.id === id) || {}).growAs || id));
    const whole = id === 'full';
    return `<ol class="lg-grow" aria-label="The scenario, stage by stage">${list.map((x, i) => {
      const cls = whole || i < at ? 'done' : i === at ? 'now' : '';
      return `<li class="${cls}"><i aria-hidden="true">${x.icon}</i><span>${esc(x.short)}</span></li>`;
    }).join('')}</ol>`;
  }
  W.scenarioGrow = function (root, opts) {
    root.className = 'w lg-grow-only';
    root.innerHTML = growHTML((opts || {}).stage);
  };

  const boldText = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  /* The order of a stage in the build; what is given comes before all of them. */
  const stageRank = (id) => ((AC.stages || {}).list || []).findIndex((x) => x.id === id);

  /* The state machine to reach. opts: { arch, stage } draws what the earlier stages made, then adds the items of
     this stage gesture by gesture, in green; { arch, grow: true } adds the stages one after the other. */
  W.deciderStm = function (root, opts, api) {
    const k = opts.arch === 'chosen' ? chosenArch(api) : opts.arch;
    const T = (AC[k] || {}).target;
    if (!T) { root.textContent = ''; return undefined; }
    root.className = 'w lg-mc lg-target';
    const s = svg(T.vb, `The state machine of ${T.block} to reach${opts.stage ? ', with what this stage adds in green' : ''}.`);
    root.appendChild(s);
    const rank = opts.stage ? stageRank(opts.stage) : Infinity;
    const list = ((AC.stages || {}).list || []).filter((x) => T.items.some((it) => it.s === x.id));
    const items = T.items.filter((it) => stageRank(it.s) <= rank);
    const drawn = (it) => {
      const fresh = opts.stage ? it.s === opts.stage : false;
      const from = opts.grow ? (it.s === 'given' ? 1 : list.findIndex((x) => x.id === it.s) + 1) : fresh ? (it.g || 1) : 0;
      const g = el('g', { class: (from ? 'lg-fade ' : '') + (fresh ? 'lg-tnew' : '') }, s);
      if (from) g.setAttribute('data-from', from);
      return g;
    };
    /* Only as tall as what is in it so far: the composite grows with the stages. */
    const low = (it) => (it.t === 'state' ? it.y + (it.do ? 36 : 24) : it.t === 'arrow' ? Math.max(...it.pts.map((p) => p[1])) : it.y);
    const fit = opts.stage ? Math.max(...items.filter((it) => it.t !== 'frame').map(low)) + 12 : null;
    if (fit) { const v = T.vb.split(' '); s.setAttribute('viewBox', `${v[0]} ${v[1]} ${v[2]} ${fit + 8}`); }
    /* The frames first, so that what is inside stays on top of them. */
    items.filter((it) => it.t === 'frame').forEach((it) => {
      const g = drawn(it);
      el('rect', { x: it.x, y: it.y, width: it.w, height: fit ? fit - it.y : it.h, rx: 8, class: 's-frame' }, g);
      txt(g, it.x + 8, it.y + 14, it.name, 's-name');
    });
    items.filter((it) => it.t !== 'frame').forEach((it) => {
      const g = drawn(it);
      if (it.t === 'dot') dot(g, it.x, it.y);
      else if (it.t === 'arrow') arrow(g, it.pts);
      else if (it.t === 'state') mstate(g, it.x, it.y, it.w, it.name, it.do);
      else if (it.t === 'region') el('line', { x1: it.x1, y1: it.y, x2: it.x2, y2: it.y, class: 'lg-region' }, g);
      else if (it.t === 'on') txt(g, it.x, it.y, it.text, 'lg-trig', it.a);
      else if (it.t === 'eff') txt(g, it.x, it.y, it.text, 'lg-eff', it.a);
    });
    if (opts.grow) {
      return stager(root, s, list.map((x) => ({ label: x.short, text: x.event + '.', dwell: 3 })), { start: 1 });
    }
    const gestures = (T.gestures || {})[opts.stage] || [];
    if (!gestures.length) return undefined;
    return stager(root, s, gestures.map((x) => ({ label: x.label, text: boldText(x.text), dwell: 4.4 })));
  };

  /* The connectors of an architecture at a stage: both ends built, and not waiting for a later stage (connAt). */
  function connectorsAt(key, stage) {
    const ST = AC.stages || {};
    const rank = stageRank(stage.def.id);
    const inner = (e) => (e.indexOf('.') < 0 ? null : e.split('.')[0]);
    return ARCHS[key].soi.connectors.filter(([a, b]) => {
      const later = [a, b].some((e) => { const at = (ST.connAt || {})[e]; return at && stageRank(at) > rank; });
      if (later) return false;
      return [a, b].every((e) => !inner(e) || !stage.built || stage.built.indexOf(inner(e)) >= 0);
    });
  }
  /* What travels on a connector, from the ports of its two ends. */
  function connectorSignals(key, a, b) {
    const arch = ARCHS[key];
    const out = [];
    [[a, b], [b, a]].forEach(([from, to]) => {
      if (from.indexOf('.') < 0) return;
      const [p, port] = from.split('.');
      const type = (arch.soi.parts.find((x) => x.name === p) || {}).type;
      const sp = ((arch.blocks.find((x) => x.name === type) || {}).ports || []).find((x) => x.name === port);
      /* What Mission Configuration passes on leaves it under its own name, marked _ext. */
      ((sp || {}).out || []).forEach((sig) => out.push(`${sig}${type === 'Mission Configuration' && to.split('.')[0] !== 'bsrc' ? '_ext' : ''}`));
    });
    return [...new Set(out)];
  }
  const endLabel = (e) => (e.indexOf('.') < 0 ? `the ${e.replace('_', ' ')} port of the drone` : lab(e.split('.')[0]));

  /* The internal block diagram at a stage: what is there, what this stage adds in green, what is to come faded;
     and the list of what to connect, with what travels. opts: { arch, stage }. */
  W.stageIbd = function (root, opts, api) {
    const k = opts.arch === 'chosen' ? chosenArch(api) : opts.arch;
    if (!ARCHS[k]) { root.textContent = ''; return; }
    const stage = stageOf(k, opts.stage);
    const list = (AC.stages || {}).list || [];
    const at = list.findIndex((x) => x.id === opts.stage);
    const before = at > 0 ? stageOf(k, list[at - 1].id) : null;
    const was = before ? connectorsAt(k, before).map((c) => c.join('|')) : [];
    const fresh = connectorsAt(k, stage).filter((c) => was.indexOf(c.join('|')) < 0);
    const newParts = (stage.built || []).filter((p) => !before || before.built.indexOf(p) < 0);
    root.className = 'w lg-arch lg-stage-ibd';
    const box = document.createElement('div');
    box.className = 'lg-arch-art';
    root.appendChild(box);
    const s = svg(`0 0 ${VB.w} ${VB.h}`, `Internal block diagram of architecture ${k}. New at this stage: ${newParts.map(lab).join(', ') || 'no part'}, and the connectors listed below.`);
    box.appendChild(s);
    const ibd = drawIbd(s, k, { built: stage.built });
    /* A connector the diagram draws from the start: faded until its stage, whatever its parts. */
    connectorsOff(k, stage).forEach((key) => { if (ibd.conn[key]) ibd.conn[key].classList.add('ghost'); });
    newParts.forEach((p) => { const b = ibd.boxes['soi.' + p]; if (b) b.g.classList.add('lg-ap-new'); });
    fresh.forEach((c) => { const n = ibd.conn[c.join('|')]; if (n) n.classList.add('fresh'); });
    const ul = document.createElement('ul');
    ul.className = 'lg-conn-list';
    ul.innerHTML = fresh.map(([a, b]) => {
      const sig = connectorSignals(k, a, b);
      return `<li><b>${esc(endLabel(a))}</b> <span aria-hidden="true">↔</span> <b>${esc(endLabel(b))}</b>${sig.length ? `<small>${sig.map((x) => `<code>${esc(x)}</code>`).join(' · ')}</small>` : ''}</li>`;
    }).join('') || '<li>Nothing to connect at this stage.</li>';
    root.appendChild(ul);
  };
  /* The keys, in drawIbd, of the connectors not there yet at this stage. */
  function connectorsOff(key, stage) {
    const on = connectorsAt(key, stage).map((c) => c.join('|'));
    return ARCHS[key].soi.connectors.map((c) => c.join('|')).filter((c) => on.indexOf(c) < 0);
  }

  /* Who a block talks to, from its ports: partner, what it receives, what it sends. opts: { arch, part }. */
  W.interactions = function (root, opts) {
    const arch = ARCHS[opts.arch];
    const type = arch && partType(opts.arch, opts.part);
    const block = arch && arch.blocks.find((b) => b.name === type);
    if (!block) { root.textContent = ''; return; }
    const code = (l) => l.map((x) => `<code>${esc(x)}</code>`).join(' · ') || '–';
    root.className = 'lg-table-w';
    root.innerHTML = `<table class="lg-table"><thead><tr><th>With</th><th>Receives</th><th>Sends</th></tr></thead><tbody>${block.ports.map((p) => `<tr><td><b>${esc((PARTS[p.name] || {}).label || p.name)}</b></td><td>${code(p.in)}</td><td>${code(p.out)}</td></tr>`).join('')}</tbody></table>`;
  };

  /* Tidy up: what each command does to the model, and why. */
  W.tidyDemo = function (root) {
    root.className = 'w lg-mc lg-tidy';
    const s = svg('0 0 420 240', 'Five commands on a small internal block diagram with the parts Base station link and Mission Configuration. Show Port Type Only hides the port names. Show STM Overview in Parts draws the state machine of each part inside it. Apply Layer Stereotypes marks blocks Logical Component and states Logical Mode. Logical Organizer sorts the elements of the model into packages. Check Signal Flow ticks every exchange and flags a signal sent nowhere.');
    root.appendChild(s);
    const part = (x, n, type) => {
      const g = el('g', {}, s);
      el('rect', { x, y: 40, width: 156, height: 130, rx: 6, class: 's-box lg-box' }, g);
      txt(g, x + 78, 58, `${n} : ${type}`, 's-name', 'middle');
      return g;
    };
    part(8, '', 'Base station link');
    part(256, '', 'Mission Configuration');
    el('rect', { x: 159, y: 95, width: 10, height: 10, class: 'lg-port-sq' }, s);
    el('rect', { x: 251, y: 95, width: 10, height: 10, class: 'lg-port-sq' }, s);
    el('path', { d: 'M169,100 H251', class: 's-line' }, s);
    const full = el('g', { class: 'lg-fade lg-tidy-full' }, s);
    txt(full, 172, 90, 'p_Config : IF_Base…', 'lg-mcp-t');
    txt(full, 248, 118, 'p_BaseStation : ~IF_Base…', 'lg-mcp-t', 'end');
    const short = el('g', { class: 'lg-fade lg-tidy-short' }, s);
    txt(short, 172, 90, 'IF_Base…', 'lg-mcp-t');
    txt(short, 248, 118, '~IF_Base…', 'lg-mcp-t', 'end');
    const stm = el('g', { class: 'lg-fade', 'data-from': 2 }, s);
    mstate(stm, 30, 112, 112, 'Relaying');
    mstate(stm, 266, 70, 62, 'Off');
    mstate(stm, 338, 70, 66, 'Ready');
    mstate(stm, 286, 120, 96, 'Deployed');
    const ster = el('g', { class: 'lg-fade', 'data-from': 3 }, s);
    txt(ster, 86, 34, '«Logical Component»', 'lg-eff', 'middle');
    txt(ster, 334, 34, '«Logical Component»', 'lg-eff', 'middle');
    txt(ster, 334, 162, '«Logical Mode» on each state', 'lg-do', 'middle');
    const org = el('g', { class: 'lg-fade', 'data-only': 4 }, s);
    el('rect', { x: 6, y: 176, width: 408, height: 58, rx: 6, class: 'lg-ab-note' }, org);
    ['Blocks', 'Logical Functions', 'Interfaces', 'Signals'].forEach((n, i) => {
      txt(org, 20 + i * 100, 196, '▸ ' + n, 'lg-act-t');
    });
    txt(org, 20, 220, 'Each element moved to the package of its kind: easy to find, easy to review.', 'lg-do');
    const chk = el('g', { class: 'lg-fade', 'data-only': 5 }, s);
    txt(chk, 210, 94, '✓', 'lg-wf-ok', 'middle');
    el('rect', { x: 6, y: 176, width: 408, height: 58, rx: 6, class: 'lg-fha' }, chk);
    txt(chk, 20, 196, '✓ FlightPlan, Ready for mission_ext delivered', 'lg-act-t');
    txt(chk, 20, 216, '✗ Start Sheep Guard Mission_ext: sent nowhere (no decider yet)', 'lg-act-t lg-red');
    return stager(root, s, [
      { label: 'Show Port Type Only', text: 'Hides the port names, keeps their type. <b>Why</b>: the diagram stays readable, the type already says who talks.' },
      { label: 'STM Overview in Parts', text: 'Draws the state machine of each part inside its box. <b>Why</b>: structure and behaviour on one page, the way a reviewer reads it.' },
      { label: 'Layer Stereotypes', text: 'Marks every block «Logical Component», every state «Logical Mode». <b>Why</b>: each element says which level it belongs to, for traceability and checks.' },
      { label: 'Logical Organizer', text: 'Moves each element to the package of its kind. <b>Why</b>: the model is found and reviewed by someone else than you.' },
      { label: 'Check Signal Flow', text: 'Follows every send to a receiver, and every awaited signal to a sender. <b>Why</b>: the wiring is right before you simulate.', dwell: 4.6 }
    ], {
      onTick(at, t) { const before = at === 1 && t < 1.6; full.classList.toggle('on', before); short.classList.toggle('on', !before); }
    });
  };

  /* ═════════════════════════ Part 4 · the swarm ═════════════════════════ */

  /* The new system of interest: the UAVs, the base station and the weather station. */
  W.swarmScope = function (root) {
    root.className = 'w lg-scope';
    const ASSET = (CFG.sharedBase || '') + 'assets/sim/';
    const s = svg('0 0 400 240', 'The system of interest is now a whole solution: three UAVs, the base station and the weather station, inside one border. Outside: the shepherd, the flock and the predator.');
    root.appendChild(s);
    el('rect', { x: 92, y: 14, width: 216, height: 212, rx: 14, class: 'soi lg-soi-big' }, s);
    txt(s, 200, 34, 'SYSTEM OF INTEREST', 'lg-tag', 'middle');
    const img = (x, y, w, f) => el('image', { href: ASSET + f, x, y, width: w, height: w }, s);
    img(116, 150, 52, 'BaseStation.svg');
    txt(s, 142, 214, 'Base station', 's-name', 'middle');
    const ws = el('g', {}, s);
    el('rect', { x: 236, y: 160, width: 50, height: 36, rx: 6, class: 's-box lg-box' }, ws);
    el('path', { d: 'M248,186 a8,8 0 0 1 4,-15 a10,10 0 0 1 19,4 a6,6 0 0 1 -2,11 z', class: 'lg-cloud' }, ws);
    txt(s, 261, 214, 'Weather station', 's-name', 'middle');
    const drones = [[140, 76], [200, 62], [260, 76]].map((p) => { const g = drone(s, 1.2); move(g, p[0], p[1]); return g; });
    txt(s, 200, 110, '3 UAVs', 's-name', 'middle');
    const lines = [[142, 150, 140, 90], [150, 150, 200, 76], [160, 150, 260, 90], [236, 176, 168, 176]].map((l) => el('line', { x1: l[0], y1: l[1], x2: l[2], y2: l[3], class: 's-line s-dash lg-cmd' }, s));
    void lines;
    const outside = [['Shepherd', 10, 40], ['Flock', 10, 150], ['Predator', 318, 150], ['Operator', 318, 40]];
    outside.forEach(([n, x, y]) => { el('rect', { x, y, width: 72, height: 34, rx: 6, class: 'out' }, s); txt(s, x + 36, y + 21, n, 's-name', 'middle'); });
    const L = life();
    let t = 0;
    L.loop((dt) => { t += dt; drones.forEach((g, i) => { const base = [[140, 76], [200, 62], [260, 76]][i]; move(g, base[0] + Math.sin(t * 1.3 + i) * 4, base[1] + Math.cos(t * 1.1 + i * 2) * 3); }); });
    return () => L.end();
  };

  /* The problem: a sheep strays, a bear comes. How many drones keep the flock guarded? */
  W.strayDilemma = function (root) {
    root.className = 'w lg-dilemma';
    root.innerHTML = `<div class="lg-dil-ctl"><div><span class="mono-label">Drones</span><div class="chips" data-n>${[1, 2, 3].map((n) => `<button type="button" class="chip" aria-pressed="${n === 1}" data-v="${n}">${n}</button>`).join('')}</div></div>
      <div><span class="mono-label">What happens</span><div class="chips" data-e>
        <button type="button" class="chip" aria-pressed="false" data-v="stray">A sheep strays out</button>
        <button type="button" class="chip" aria-pressed="false" data-v="bear">A bear comes</button>
        <button type="button" class="chip" aria-pressed="false" data-v="both">Both at once</button></div></div></div>
      <div class="lg-dil-art"></div><p class="w-live" aria-live="polite"></p>`;
    const ASSET = (CFG.sharedBase || '') + 'assets/sim/';
    const s = svg('0 0 400 220', 'A field with the flock in the middle. Drones guard it. A sheep can stray out to the left, a bear can come from the right: a drone that follows one of them leaves the field.');
    root.querySelector('.lg-dil-art').appendChild(s);
    el('rect', { x: 90, y: 20, width: 220, height: 180, rx: 10, class: 'lg-field' }, s);
    const zone = el('rect', { x: 150, y: 70, width: 100, height: 80, rx: 40, class: 'lg-flock' }, s);
    [[175, 95], [200, 110], [225, 98], [190, 125], [214, 130]].forEach((p) => el('image', { href: ASSET + 'sheep.svg', x: p[0] - 9, y: p[1] - 9, width: 18, height: 18 }, s));
    const stray = el('image', { href: ASSET + 'sheep.svg', x: 140, y: 150, width: 18, height: 18 }, s);
    const bear = el('image', { href: ASSET + 'bear.svg', x: 380, y: 40, width: 30, height: 30 }, s);
    const dr = [0, 1, 2].map(() => drone(s, 1));
    const live = root.querySelector('.w-live');
    const L = life();
    let n = 1;
    let ev = '';
    let t = 0;
    const cur = dr.map(() => [200, 110]);
    function pick(group, v) {
      root.querySelectorAll(`[data-${group}] .chip`).forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.v === String(v))));
    }
    function verdict() {
      const need = ev === 'both' ? 2 : ev ? 1 : 0;
      const left = n - need;
      zone.classList.toggle('alone', !!ev && left < 1);
      zone.classList.toggle('kept', !!ev && left >= 1);
      if (!ev) live.innerHTML = `<b>${n} drone${n > 1 ? 's' : ''} on the field.</b> Pick what happens.`;
      else if (n < need) live.innerHTML = `<b>Not enough drones.</b> ${n} drone${n > 1 ? 's' : ''} for ${need} things to follow: one of them is lost, <b>and</b> the flock is alone.`;
      else if (left < 1) live.innerHTML = `<b>The flock is alone.</b> ${n > 1 ? 'Every drone is busy following: none keeps the field.' : 'The drone that leaves to follow takes the guard with it.'} Let something go, or add a drone?`;
      else live.innerHTML = `<b>The flock is still guarded.</b> ${need} drone${need > 1 ? 's' : ''} follow${need > 1 ? '' : 's'}, ${left} keep${left > 1 ? '' : 's'} the field. Who decided which one goes?`;
    }
    root.querySelectorAll('[data-n] .chip').forEach((c) => c.addEventListener('click', () => { n = +c.dataset.v; pick('n', n); verdict(); }));
    root.querySelectorAll('[data-e] .chip').forEach((c) => c.addEventListener('click', () => { ev = ev === c.dataset.v ? '' : c.dataset.v; pick('e', ev); t = 0; verdict(); }));
    verdict();
    L.loop((dt) => {
      t += dt;
      const strayOn = ev === 'stray' || ev === 'both';
      const bearOn = ev === 'bear' || ev === 'both';
      const k = Math.min(1, t / 2.5);
      stray.setAttribute('x', (140 - (strayOn ? k * 120 : 0)).toFixed(1));
      bear.setAttribute('x', (bearOn ? 380 - k * 40 : 420).toFixed(1));
      const jobs = [];
      if (strayOn) jobs.push([28 + 10, 152]);
      if (bearOn) jobs.push([350, 48]);
      dr.forEach((g, i) => {
        if (i >= n) { g.style.opacity = 0; return; }
        g.style.opacity = 1;
        let target;
        if (i < jobs.length) target = jobs[i];
        else {
          const guards = n - Math.min(n, jobs.length);
          const j = i - Math.min(n, jobs.length);
          const a = t * 0.9 + (j * 2 * Math.PI) / Math.max(1, guards);
          target = [200 + Math.cos(a) * 80, 110 + Math.sin(a) * 62];
        }
        cur[i][0] += (target[0] - cur[i][0]) * Math.min(1, dt * 3);
        cur[i][1] += (target[1] - cur[i][1]) * Math.min(1, dt * 3);
        move(g, cur[i][0], cur[i][1]);
      });
    });
    return () => L.end();
  };

  /* The mission state machine with parallel regions, against one region where the states exclude each other. */
  W.parallelRegions = function (root, opts) {
    const REG = opts.regions || [
      { name: 'Flock', states: ['Patrolling', 'Guarding flock'], ev: { 'Predator in safe zone': 1, 'Predator gone': 0 } },
      { name: 'Stray sheep', states: ['No stray', 'Tracking stray sheep'], ev: { 'Sheep leaves the zone': 1, 'Sheep back': 0 } },
      { name: 'Predator', states: ['No predator', 'Predator tracking', 'Predator counteraction'], ev: { 'Predator detected': 1, 'Predator in safe zone': 2, 'Predator gone': 0 } }
    ];
    const EVENTS = ['Sheep leaves the zone', 'Sheep back', 'Predator detected', 'Predator in safe zone', 'Predator gone'];
    root.className = 'w lg-par';
    root.innerHTML = `<div class="chips" data-mode><button type="button" class="chip" aria-pressed="true" data-v="par">Parallel regions</button><button type="button" class="chip" aria-pressed="false" data-v="seq">One region</button></div>
      <div class="lg-par-art"></div>
      <div><span class="mono-label">Send an event</span><div class="chips lg-par-ev">${EVENTS.map((e) => `<button type="button" class="chip" data-ev="${esc(e)}">${esc(e)}</button>`).join('')}</div></div>
      <p class="w-live" aria-live="polite"></p>`;
    const art = root.querySelector('.lg-par-art');
    const live = root.querySelector('.w-live');
    let mode = 'par';
    let cur = REG.map(() => 0);
    let seq = 'Patrolling';
    const SEQ = { Patrolling: { 'Sheep leaves the zone': 'Tracking stray sheep', 'Predator detected': 'Predator tracking' }, 'Tracking stray sheep': { 'Sheep back': 'Patrolling' }, 'Predator tracking': { 'Predator in safe zone': 'Predator counteraction', 'Predator gone': 'Patrolling' }, 'Predator counteraction': { 'Predator gone': 'Patrolling' } };
    function draw() {
      const s = svg('0 0 400 ' + (mode === 'par' ? 210 : 170), mode === 'par' ? 'The state Mission split into three parallel regions separated by dashed lines: Flock, Stray sheep, Predator. Each region has its own active state.' : 'The state Mission with one region: Patrolling, Tracking stray sheep, Predator tracking and Predator counteraction exclude each other.');
      art.innerHTML = '';
      art.appendChild(s);
      el('rect', { x: 4, y: 4, width: 392, height: mode === 'par' ? 202 : 162, rx: 12, class: 's-frame' }, s);
      txt(s, 16, 22, 'Mission', 's-name');
      if (mode === 'par') {
        REG.forEach((r, i) => {
          const y = 30 + i * 58;
          if (i) el('line', { x1: 4, y1: y - 2, x2: 396, y2: y - 2, class: 's-line s-dash' }, s);
          txt(s, 16, y + 30, r.name, 'lg-reg-t');
          r.states.forEach((n, j) => {
            const x = 112 + j * 96;
            const g = el('g', { class: 'lg-st' + (cur[i] === j ? ' on' : '') }, s);
            el('rect', { x, y: y + 10, width: 90, height: 34, rx: 9, class: 'lg-st-box' }, g);
            txt(g, x + 45, y + 31, n, 'lg-st-t', 'middle');
          });
        });
      } else {
        const ALL = ['Patrolling', 'Tracking stray sheep', 'Predator tracking', 'Predator counteraction'];
        ALL.forEach((n, j) => {
          const x = 14 + (j % 2) * 196;
          const y = 40 + Math.floor(j / 2) * 60;
          const g = el('g', { class: 'lg-st' + (seq === n ? ' on' : '') }, s);
          el('rect', { x, y, width: 180, height: 40, rx: 9, class: 'lg-st-box' }, g);
          txt(g, x + 90, y + 25, n, 'lg-st-t', 'middle');
        });
      }
    }
    function send(e) {
      if (mode === 'par') {
        const moved = [];
        REG.forEach((r, i) => { if (e in r.ev && cur[i] !== r.ev[e]) { cur[i] = r.ev[e]; moved.push(r.name); } });
        live.innerHTML = moved.length ? `<b>${esc(e)}</b>: ${moved.map(esc).join(' and ')} changed. The other regions <b>carry on</b>.` : `<b>${esc(e)}</b>: nothing to do in any region.`;
      } else {
        const next = (SEQ[seq] || {})[e];
        if (next) { seq = next; live.innerHTML = `<b>${esc(e)}</b>: now <b>${esc(next)}</b>, and nothing else.`; } else {
          live.innerHTML = `<b>${esc(e)} is refused</b> in ${esc(seq)}: one region holds one state at a time. The drone cannot follow a sheep <b>and</b> watch a bear.`;
          art.classList.remove('shake'); void art.offsetWidth; art.classList.add('shake');
        }
      }
      draw();
    }
    root.querySelectorAll('[data-mode] .chip').forEach((c) => c.addEventListener('click', () => {
      mode = c.dataset.v;
      root.querySelectorAll('[data-mode] .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
      cur = REG.map(() => 0); seq = 'Patrolling';
      live.innerHTML = mode === 'par' ? 'Three regions, three active states at the same time. Send events.' : 'One region: one active state for the whole mission. Send events.';
      draw();
    }));
    root.querySelectorAll('[data-ev]').forEach((c) => c.addEventListener('click', () => send(c.dataset.ev)));
    live.innerHTML = 'Three regions, three active states at the same time. Send events.';
    draw();
  };

  /* The options of the swarm: who leads, which drones. Each one can be loaded in the fleet simulation. */
  W.swarmOptions = function (root, opts, api) {
    const SW = CFG.swarm || {};
    const OPTS = SW.options || [];
    const ROLES = (CFG.fleet || {}).roles || {};
    if (!OPTS.length) { root.textContent = ''; return; }
    root.className = 'w lg-swarm';
    root.innerHTML = `<div class="chips">${OPTS.map((o, i) => `<button type="button" class="chip" aria-pressed="${i === (opts.start || 0)}" data-i="${i}"><b class="lg-chip-n">${esc(o.code)}</b>${esc(o.name)}</button>`).join('')}</div>
      <div class="lg-swarm-art"></div><div class="lg-swarm-txt"></div>`;
    const art = root.querySelector('.lg-swarm-art');
    const out = root.querySelector('.lg-swarm-txt');
    const ASSET = (CFG.sharedBase || '') + 'assets/sim/';
    const L = life();
    let lines = [];
    function draw(o) {
      const ds = o.demo.drones;
      const s = svg('0 0 400 200', `${o.name}. Master: ${o.demo.master === 'base' ? 'the base station' : 'a drone'}. Drones: ${ds.map((d) => (ROLES[d.role] || {}).label || d.role).join(', ')}.`);
      art.innerHTML = '';
      art.appendChild(s);
      const base = [60, 150];
      el('image', { href: ASSET + 'BaseStation.svg', x: base[0] - 26, y: base[1] - 26, width: 52, height: 52 }, s);
      txt(s, base[0], base[1] + 40, 'Base station', 's-name', 'middle');
      const xs = ds.map((_, i) => 170 + i * (200 / Math.max(1, ds.length - 1 || 1)));
      const pts = ds.map((d, i) => [ds.length === 1 ? 270 : xs[i], 70 + (i % 2) * 34]);
      const master = o.demo.master;
      const from = master === 'base' ? base : pts[ds.findIndex((d) => d.id === master)];
      lines = [];
      ds.forEach((d, i) => {
        if (d.id === master) return;
        lines.push(el('line', { x1: from[0], y1: from[1], x2: pts[i][0], y2: pts[i][1], class: 'lg-cmd-line' }, s));
      });
      if (master !== 'base') el('line', { x1: base[0], y1: base[1], x2: from[0], y2: from[1], class: 's-line s-dash' }, s);
      ds.forEach((d, i) => {
        const r = ROLES[d.role] || {};
        const g = drone(s, 1.4);
        move(g, pts[i][0], pts[i][1]);
        g.style.setProperty('--role', r.color || 'var(--sky)');
        g.classList.add('lg-role-drone');
        txt(s, pts[i][0], pts[i][1] + 30, r.tag || d.role, 'lg-role-tag', 'middle').style.fill = r.color || '';
        if (d.id === master) txt(s, pts[i][0], pts[i][1] - 20, '★ master', 'lg-master', 'middle');
      });
      if (master === 'base') txt(s, base[0], base[1] - 32, '★ master', 'lg-master', 'middle');
    }
    function pick(i) {
      const o = OPTS[i];
      root.querySelectorAll('[data-i]').forEach((c) => c.setAttribute('aria-pressed', String(+c.dataset.i === i)));
      draw(o);
      out.innerHTML = `<p class="b-p">${api.inline(o.summary || '')}</p>
        <div class="lg-proscons"><div><span class="mono-label">For</span><ul class="b-list">${(o.pros || []).map((x) => `<li>${api.inline(x)}</li>`).join('')}</ul></div>
        <div><span class="mono-label">Against</span><ul class="b-list">${(o.cons || []).map((x) => `<li>${api.inline(x)}</li>`).join('')}</ul></div></div>
        ${window.Sim && window.Sim.fleet && window.Sim.fleet.useDemo ? `<button type="button" class="btn small" data-load>▶ Load option ${esc(o.code)} in the simulation</button>` : ''}`;
      const load = out.querySelector('[data-load]');
      if (load) load.addEventListener('click', () => { window.Sim.fleet.useDemo(o.demo, o.scenario, `Option ${o.code}: ${o.name}.`); window.Sim.open(); });
    }
    root.querySelectorAll('[data-i]').forEach((c) => c.addEventListener('click', () => pick(+c.dataset.i)));
    pick(opts.start || 0);
    let t = 0;
    L.loop((dt) => { t += dt; lines.forEach((l, i) => l.style.strokeDashoffset = String(-((t * 20 + i * 3) % 14))); });
    return () => L.end();
  };
})();
