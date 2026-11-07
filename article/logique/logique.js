/* The article "Dompter la couche logique" (article/logique/index.html): its own figures.

   - bill    : what one logical architecture of the TP contains, counted on the specs of part3/content/archs.js,
               and the messages of the whole scenario, replayed with js/logical-engine.js;
   - method  : the four steps of the method, from the mission state machine to the subsystems of the central
               orchestrator architecture: identify, the inside, the outside, iterate;
   - gallery : the guide of Part 3 in a phone, on one scene; the buttons switch its scene and scroll to its widget.
   The incremental replay (data-fig="build"), the table of contents and the theme are those of ../article.js.

   As article/tp/tp.js does, this page saves the keys of the site before any guide opens and puts them back when it
   is left: the guides open untracked, and leave no trace in the progress or the pairing of whoever reads. */
(function () {
  'use strict';

  const BASE = '../../';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function el(name, attrs, parent, text) {
    const n = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ───────── the guides leave no trace ───────── */
  const KEEP = ['mbse-shepherd:', 'sysml-tool:'];
  const saved = {};
  const ours = (k) => k && KEEP.some((p) => k.startsWith(p));
  try {
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ours(k)) saved[k] = localStorage.getItem(k); }
    localStorage.removeItem('mbse-shepherd:bridge-code');
    localStorage.setItem('mbse-shepherd:track:off', '1');
  } catch (e) { /* no storage: nothing to keep */ }
  addEventListener('pagehide', () => {
    try {
      const now = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ours(k)) now.push(k); }
      now.forEach((k) => { if (!(k in saved)) localStorage.removeItem(k); });
      Object.keys(saved).forEach((k) => localStorage.setItem(k, saved[k]));
    } catch (e) { /* nothing to put back */ }
  });

  /* ───────── the guide of Part 3 in a phone ───────── */
  const docOf = (f) => { try { const d = f.contentDocument; return d && d.documentElement ? d : null; } catch (e) { return null; } };
  async function waitFor(f, sel, ms) {
    const end = Date.now() + (ms || 4000);
    while (Date.now() < end) {
      const d = docOf(f);
      const n = d && $$(sel, d).filter((x) => x.getBoundingClientRect().width > 0).pop();
      if (n) return n;
      await sleep(120);
    }
    return null;
  }
  const guideUrl = (scene) => `${BASE}part3/index.html?author=0#${scene}`;
  const PHONE = { iw: 390, ih: 800 };
  function phone(host) {
    host.innerHTML = '<div class="phone"><span class="notch"></span><div class="phone-screen"></div></div>';
    const box = $('.phone-screen', host);
    const f = document.createElement('iframe');
    f.title = 'Le guide de la partie 3, sur un téléphone';
    box.appendChild(f);
    const fit = () => {
      const w = box.clientWidth;
      if (!w) return;
      const k = w / PHONE.iw;
      Object.assign(f.style, { width: PHONE.iw + 'px', height: PHONE.ih + 'px', transform: `scale(${k})` });
      box.style.height = Math.round(PHONE.ih * k) + 'px';
    };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(box);
    else addEventListener('resize', fit);
    return f;
  }
  function whenNear(node, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: '400px 0px' });
    io.observe(node);
  }

  function galleryFigure(root) {
    const slot = $('[data-phone]', root);
    const f = phone(slot);
    const btns = $$('[data-scene]', root);
    const current = () => btns.find((b) => b.getAttribute('aria-pressed') === 'true') || btns[0];
    /* the widget of the scene, under its title: what the button promises is on screen */
    async function align(b) {
      if (!b || !b.dataset.widget) return;
      await sleep(150);
      const node = await waitFor(f, `[data-widget="${b.dataset.widget}"]`, 3000);
      if (!node || !f.contentWindow) return;
      const top = docOf(f) && $('.top', docOf(f));
      const y = node.getBoundingClientRect().top + f.contentWindow.scrollY - ((top ? top.offsetHeight : 50) + 12);
      f.contentWindow.scrollTo({ top: Math.max(0, y), behavior: reduced() ? 'auto' : 'smooth' });
    }
    whenNear(slot, () => {
      try { localStorage.removeItem('mbse-shepherd:bridge-code'); } catch (e) { /* no storage */ }
      if (!f.src) f.src = guideUrl(current().dataset.scene);
    });
    f.addEventListener('load', () => align(current()));
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (!f.src) { f.src = guideUrl(b.dataset.scene); return; }
      try { if (f.contentWindow.location.hash !== '#' + b.dataset.scene) f.contentWindow.location.hash = b.dataset.scene; } catch (e) { /* not reachable */ }
      align(b);
    }));
  }

  /* ───────── figure 1: the bill ───────── */
  const ARCH_FR = { 1: 'Orchestrateur et fonctionnalités autonomes', 2: 'Patch décentralisé', 3: 'Orchestrateur central' };
  const TILES = [
    ['parts', 'composants'],
    ['ports', 'ports, et autant d’interfaces'],
    ['flows', 'propriétés de flux, une par signal et par sens'],
    ['states', 'états'],
    ['fns', 'fonctions'],
    ['conns', 'connecteurs'],
    ['msgs', 'messages échangés pour jouer le scénario complet']
  ];
  function countArch(arch) {
    const types = arch.soi.parts.map((p) => p.type);
    const blocks = arch.blocks.filter((b) => types.indexOf(b.name) >= 0);
    const states = (r) => (r.states || []).reduce((n, s) => n + 1 + states(s) + (s.regions || []).reduce((m, x) => m + states(x), 0), 0);
    const o = { parts: types.length, ports: 0, flows: 0, states: 0, fns: 0, conns: arch.soi.connectors.length, msgs: 0 };
    blocks.forEach((b) => {
      o.ports += b.ports.length;
      b.ports.forEach((p) => { o.flows += p.in.length + p.out.length; });
      o.states += states(b.stm);
      o.fns += b.functions.length;
    });
    const sim = window.LogicalEngine.create(arch);
    arch.scenario.phases.forEach((ph) => ph.steps.forEach((st) => {
      o.msgs += sim.inject(st.signal, st.into).filter((e) => e.kind === 'msg').length;
    }));
    return o;
  }
  const elements = (o) => o.parts + 2 * o.ports + o.flows + o.states + o.fns + o.conns;

  function billFigure(root) {
    const A = window.LOGICAL_ARCHS;
    if (!A || !window.LogicalEngine || !A['1']) { root.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; return; }
    const keys = ['1', '2', '3'].filter((k) => A[k]);
    const per = {};
    keys.forEach((k) => { per[k] = countArch(A[k]); });
    per.all = TILES.reduce((o, [id]) => { o[id] = keys.reduce((n, k) => n + per[k][id], 0); return o; }, {});
    root.innerHTML = `
      <div class="fig-bar"><div class="seg" role="group" aria-label="Architecture">
        ${keys.map((k, i) => `<button type="button" data-k="${k}" aria-pressed="${i === 2}"><small>Architecture ${k}</small>${ARCH_FR[k]}</button>`).join('')}
        <button type="button" data-k="all" aria-pressed="false"><small>Le TP</small>Les trois candidates</button>
      </div></div>
      <div class="kinds bill">${TILES.map(([id, label]) => `<div class="bill-${id}"><b data-n="${id}">0</b><span>${label}</span></div>`).join('')}</div>
      <p class="fig-note bill-note" aria-live="polite"></p>`;
    const note = $('.bill-note', root);
    const shown = {};
    let tween = 0;
    function show(k) {
      const o = per[k];
      const my = ++tween;
      const from = Object.assign({}, shown);
      const t0 = performance.now();
      const dur = reduced() ? 0 : 650;
      const step = (now) => {
        if (my !== tween) return;
        const t = dur ? Math.min(1, (now - t0) / dur) : 1;
        const e = 1 - Math.pow(1 - t, 3);
        TILES.forEach(([id]) => {
          const v = Math.round((from[id] || 0) + (o[id] - (from[id] || 0)) * e);
          shown[id] = v;
          $(`[data-n="${id}"]`, root).textContent = v.toLocaleString('fr-FR');
        });
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      const n = elements(o).toLocaleString('fr-FR');
      note.innerHTML = k === 'all'
        ? `<b>Les trois candidates du TP : ${n} éléments</b> à créer, typer et relier dans Cameo, avant la première simulation.`
        : `<b>Une seule candidate : ${n} éléments</b> à créer, typer et relier dans Cameo (composants, ports, interfaces, propriétés de flux, états, fonctions, connecteurs), avant la première simulation. Et aucun ne doit manquer.`;
      $$('[data-k]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === k)));
    }
    $$('[data-k]', root).forEach((b) => b.addEventListener('click', () => show(b.dataset.k)));
    TILES.forEach(([id]) => { shown[id] = 0; });
    if (!reduced() && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); show('3'); } }, { threshold: 0.4 });
      io.observe(root);
    } else show('3');
  }

  /* ───────── figure 2: the method, in four steps ───────── */
  const METHOD = [
    { tab: 'Identifier', say: 'On part de la machine d’états de la mission. Les trois régions parallèles de <i>Patrolling</i> donnent trois sous-systèmes. Toute la préparation, <i>Undeployed</i>, fait émerger <i>Mission Configuration</i>. Les modes de la mission vont à un orchestrateur, et le suivi de l’ours à <i>Tracking</i>.' },
    { tab: 'L’interne', say: '<i>Logical Transition</i> copie <i>Undeployed</i> dans <i>Mission Configuration</i>, avec ses fonctions, chaque copie liée à l’original par «refine». On fait d’abord tourner l’intérieur : <i>Load Flight Plan</i> s’envoie <i>Ready for mission</i> à elle-même, et c’est très bien ainsi.' },
    { tab: 'L’externe', say: 'Puis le dehors : qu’est-ce que je reçois, qu’est-ce que j’envoie, et à qui ? Le plan de vol arrive de l’opérateur. Le verdict repart vers lui. L’ordre de départ est passé à l’orchestrateur.' },
    { tab: 'Itérer', say: 'Sous-système suivant, puis fonctionnalité par fonctionnalité : départ, patrouille, moutons, ours, dissuasion. À chaque fonctionnalité testable, on connecte et on rejoue le scénario.' }
  ];
  const NOTE = {
    2: 'L’intérieur tourne. Un signal qui part et arrive dans le même composant n’a besoin d’aucun port.',
    3: 'Trois échanges, trois ports. Ce qui ne sort pas reste dedans.',
    4: 'Une architecture complète, construite par petites marches, chacune vérifiée par la mission.'
  };
  /* which states of the mission go to which subsystem, in the order step 1 shows them */
  const ALLOC = [[['und'], 'mc'], [['gsa', 'pat', 'pd'], 'orch'], [['pw'], 'zp'], [['smon'], 'sm'], [['pmon'], 'pm'], [['pd'], 'trk']];
  const FEATURES = ['Départ', 'Patrouille', 'Moutons', 'Ours', 'Dissuasion'];

  function drawMethod(s) {
    const R = { left: {}, comp: {}, geo: {} };
    el('text', { x: 8, y: 16, class: 'dm-tag' }, s, 'FONCTIONNEL · LA MISSION');
    el('text', { x: 372, y: 16, class: 'dm-tag' }, s, 'LOGIQUE · LES SOUS-SYSTÈMES');
    el('rect', { x: 8, y: 26, width: 338, height: 406, rx: 12, class: 'dm-frame' }, s);

    const left = (key, x, y, w, h, name, sub, target, opts) => {
      opts = opts || {};
      const g = el('g', { class: 'dm-st c-' + target + (opts.frame ? ' dm-fr' : '') }, s);
      el('rect', { x, y, width: w, height: h, rx: 9, class: 'dm-box' }, g);
      el('rect', { x, y, width: 6, height: h, rx: 3, class: 'dm-band' }, g);
      el('text', { x: x + 14, y: y + 19, class: 'dm-name' }, g, name);
      if (sub) el('text', { x: x + 14, y: y + 35, class: 'dm-sub' }, g, sub);
      if (opts.sub2) el('text', { x: x + 14, y: y + 51, class: 'dm-do' }, g, opts.sub2);
      R.left[key] = g;
      R.geo[key] = { x, y, w, h };
      return g;
    };
    left('und', 22, 38, 310, 66, 'Undeployed', 'Off → Unconfigured → Configured → Ready for Mission', 'mc', { sub2: 'do / Load Flight Plan' });
    el('text', { x: 322, y: 57, class: 'dm-badge', 'text-anchor': 'end', 'data-from': 2 }, s, 'copié · «refine»');
    el('rect', { x: 22, y: 116, width: 310, height: 306, rx: 10, class: 'dm-frame2' }, s);
    el('text', { x: 34, y: 134, class: 'dm-name' }, s, 'Deployed');
    left('gsa', 34, 144, 138, 42, 'Going to Safe Area', 'un mode', 'orch');
    left('pd', 184, 144, 136, 42, 'Predator Detected', 'tracking ⇄ counteraction', 'orch');
    left('pat', 34, 198, 286, 212, 'Patrolling', null, 'orch', { frame: true });
    left('pw', 46, 226, 262, 50, 'Perimeter watch', 'région 1 · la patrouille', 'zp');
    left('smon', 46, 288, 262, 50, 'Sheep Monitoring', 'région 2 · les moutons', 'sm');
    left('pmon', 46, 350, 262, 50, 'Predator Monitoring', 'région 3 · le prédateur', 'pm');
    el('line', { x1: 46, x2: 308, y1: 282, y2: 282, class: 'dm-dash' }, s);
    el('line', { x1: 46, x2: 308, y1: 344, y2: 344, class: 'dm-dash' }, s);

    const comp = (key, x, y, w, h, name, delay) => {
      const g = el('g', { class: 'dm-comp c-' + key }, s);
      el('rect', { x, y, width: w, height: h, rx: 9, class: 'dm-ghost' }, g);
      const solid = el('rect', { x, y, width: w, height: h, rx: 9, class: 'dm-solid', 'data-from': delay == null ? 2 : 4 }, g);
      if (delay != null) solid.setAttribute('data-delay', delay);
      el('rect', { x, y, width: 6, height: h, rx: 3, class: 'dm-band' }, g);
      el('text', { x: x + 14, y: y + 19, class: 'dm-name' }, g, name);
      R.comp[key] = g;
      R.geo[key] = { x, y, w, h };
      return g;
    };
    const inner = (key, text, delay) => {
      const g = R.geo[key];
      el('text', { x: g.x + 14, y: g.y + g.h - 13, class: 'dm-states', 'data-from': 4, 'data-delay': delay }, s, text);
    };

    comp('mc', 372, 62, 378, 90, 'Mission Configuration');
    el('text', { x: 740, y: 81, class: 'dm-sub', 'text-anchor': 'end' }, s, '«Logical Component»');
    const mini = el('g', { 'data-from': 2 }, s);
    const ms = (x, w, t) => { el('rect', { x, y: 94, width: w, height: 22, rx: 6, class: 'dm-mini' }, mini); el('text', { x: x + w / 2, y: 109, class: 'dm-mini-t', 'text-anchor': 'middle' }, mini, t); };
    ms(384, 50, 'Off');
    ms(446, 92, 'Unconfigured');
    ms(550, 84, 'Configured');
    ms(646, 96, 'Ready for Mission');
    [[434, 446], [538, 550], [634, 646]].forEach(([a, b]) => el('path', { d: `M${a} 105 H${b - 2}`, class: 'dm-arrow', 'marker-end': 'url(#dm-head)' }, mini));
    R.self = el('path', { d: 'M592 116 C 600 140, 684 140, 694 118', class: 'dm-loop', 'marker-end': 'url(#dm-head)' }, mini);
    el('text', { x: 643, y: 146, class: 'dm-sig', 'text-anchor': 'middle' }, mini, 'Ready for mission, à soi-même');

    const out = el('g', { 'data-from': 3 }, s);
    el('rect', { x: 372, y: 24, width: 158, height: 24, rx: 12, class: 'dm-pill' }, out);
    el('text', { x: 451, y: 40, class: 'dm-mini-t', 'text-anchor': 'middle' }, out, 'Opérateur · base sol');
    el('line', { x1: 452, x2: 452, y1: 48, y2: 57, class: 'dm-con' }, out);
    el('rect', { x: 447, y: 57, width: 10, height: 10, class: 'dm-port' }, out);
    el('text', { x: 540, y: 34, class: 'dm-sig' }, out, '▾ FlightPlan Correct');
    el('text', { x: 540, y: 48, class: 'dm-sig' }, out, '▴ Ready for mission_ext');
    el('rect', { x: 447, y: 147, width: 10, height: 10, class: 'dm-port' }, out);
    el('line', { x1: 452, x2: 452, y1: 157, y2: 168, class: 'dm-con' }, out);
    el('text', { x: 464, y: 165, class: 'dm-sig' }, out, '▾ Start Sheep Guard Mission_ext');

    [['orch', 372, 170, 378, 56, 'Mission Orchestrator', 'Transit → Patrolling → Predator tracking ⇄ counteraction', 0],
      ['zp', 372, 240, 184, 52, 'Zone Patrolling', 'Path Standby ⇄ Perimeter watch', 700],
      ['sm', 566, 240, 184, 52, 'SheepMonitoring', 'Sheep Monitoring ⇄ Deactivated', 1300],
      ['pm', 372, 304, 184, 52, 'Predator Management', 'Monitoring · Deterring', 1900],
      ['trk', 566, 304, 184, 52, 'Tracking', 'Tracking Idle ⇄ Tracking Target', 2500]
    ].forEach(([key, x, y, w, h, name, states, delay]) => { comp(key, x, y, w, h, name, delay); inner(key, states, delay); });
    [['M464 226 V240', 700], ['M658 226 V240', 1300], ['M561 226 V330 H556', 1900], ['M561 330 H566', 2500]].forEach(([d, delay]) =>
      el('path', { d, class: 'dm-con', 'data-from': 4, 'data-delay': delay }, s));

    el('text', { x: 372, y: 382, class: 'dm-tag', 'data-from': 4, 'data-delay': 3000 }, s, 'PUIS, UNE FONCTIONNALITÉ À LA FOIS');
    FEATURES.forEach((f, i) => {
      const g = el('g', { class: 'dm-chip', 'data-from': 4, 'data-delay': 3300 + i * 450 }, s);
      const x = 372 + i * 76;
      el('rect', { x, y: 392, width: 70, height: 26, rx: 13 }, g);
      el('text', { x: x + 35, y: 409, 'text-anchor': 'middle' }, g, '✓ ' + f);
    });
    return R;
  }

  function methodFigure(root) {
    root.innerHTML = `
      <div class="fig-bar"><div class="seg" role="group" aria-label="Étape">
        ${METHOD.map((m, i) => `<button type="button" data-step="${i + 1}" aria-pressed="false"><small>Étape ${i + 1}</small>${m.tab}</button>`).join('')}
      </div></div>
      <p class="m-story dm-say" aria-live="polite"></p>
      <svg class="dm-art" viewBox="0 0 760 440" role="img" aria-label="À gauche, la machine d’états de la mission : Undeployed, puis Deployed avec Going to Safe Area, Predator Detected et Patrolling à trois régions, Perimeter watch, Sheep Monitoring et Predator Monitoring. À droite, les sous-systèmes de l’architecture à orchestrateur central : Mission Configuration, Mission Orchestrator, Zone Patrolling, SheepMonitoring, Predator Management et Tracking."></svg>
      <div class="btn-row"><button type="button" class="btn" data-replay>↻ Rejouer l’étape</button><button type="button" class="btn ghost" data-all>▶ Tout depuis le début</button></div>
      <p class="bd-note dm-note" aria-live="polite"></p>`;
    const s = $('.dm-art', root);
    const mk = el('marker', { id: 'dm-head', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, el('defs', {}, s));
    el('path', { d: 'M0 0L10 5L0 10z', class: 'a-head' }, mk);
    const R = drawMethod(s);
    const tabs = $$('[data-step]', root);
    const say = $('.dm-say', root);
    const note = $('.dm-note', root);
    const STOP = {};
    let step = 1;
    let gen = 0;

    function setStep(n) {
      step = n;
      tabs.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.step === n)));
      say.innerHTML = METHOD[n - 1].say;
      note.innerHTML = '';
      $$('.hl', s).forEach((g) => g.classList.remove('hl'));
      $$('.dm-tok, .dm-link', s).forEach((g) => g.remove());
      let k = 0;
      $$('[data-from]', s).forEach((node) => {
        const show = +node.dataset.from <= n;
        const fresh = show && !node.classList.contains('in');
        node.style.transitionDelay = fresh ? (node.dataset.delay != null && n === 4 ? +node.dataset.delay : k++ * 90) + 'ms' : '0ms';
        node.classList.toggle('in', show);
      });
      return k * 90 + 450;
    }
    async function wait(my, ms) {
      await sleep(reduced() ? 0 : ms);
      if (my !== gen) throw STOP;
    }
    /* a signal travelling along a path, with its name; nothing moves when motion is reduced */
    function travel(my, d, label) {
      if (reduced()) return Promise.resolve();
      const p = el('path', { d, class: 'dm-route' }, s);
      const g = el('g', { class: 'dm-tok' }, s);
      el('circle', { r: 5.5 }, g);
      el('text', { y: -9, 'text-anchor': 'middle' }, g, label);
      const len = p.getTotalLength();
      const t0 = performance.now();
      return new Promise((res, rej) => {
        const f = (now) => {
          if (my !== gen) { g.remove(); p.remove(); rej(STOP); return; }
          const t = Math.min(1, (now - t0) / 1300);
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const pt = p.getPointAtLength(len * e);
          g.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
          if (t < 1) requestAnimationFrame(f);
          else { g.remove(); p.remove(); res(); }
        };
        requestAnimationFrame(f);
      });
    }
    function link(from, to, cls) {
      const a = R.geo[from];
      const b = R.geo[to];
      const y1 = a.y + Math.min(a.h, 50) / 2;
      const y2 = b.y + b.h / 2;
      el('path', { d: `M${a.x + a.w} ${y1} C ${a.x + a.w + 30} ${y1}, ${b.x - 30} ${y2}, ${b.x} ${y2}`, class: 'dm-link c-' + cls }, s);
    }

    async function play(n, my) {
      await wait(my, setStep(n));
      if (n === 1) {
        for (const [from, to] of ALLOC) {
          from.forEach((k) => { R.left[k].classList.add('hl'); link(k, to, to); });
          R.comp[to].classList.add('hl');
          await wait(my, 1300);
          from.forEach((k) => R.left[k].classList.remove('hl'));
          R.comp[to].classList.remove('hl');
          $$('.dm-link', s).forEach((x) => x.remove());
        }
        note.innerHTML = 'Six sous-systèmes, et chaque état de la mission sait où il va.';
      }
      if (n === 2) {
        R.left.und.classList.add('hl');
        R.comp.mc.classList.add('hl');
        await wait(my, 600);
        for (let i = 0; i < 2; i++) await travel(my, R.self.getAttribute('d'), 'Ready for mission');
        R.left.und.classList.remove('hl');
        R.comp.mc.classList.remove('hl');
        note.innerHTML = NOTE[2];
      }
      if (n === 3) {
        await travel(my, 'M452 48 V100', 'FlightPlan Correct');
        await travel(my, R.self.getAttribute('d'), 'Ready for mission');
        await travel(my, 'M452 100 V48', 'Ready for mission_ext');
        await travel(my, 'M452 140 V172', 'Start Sheep Guard Mission_ext');
        note.innerHTML = NOTE[3];
      }
      if (n === 4) {
        await wait(my, 5800);
        note.innerHTML = NOTE[4];
      }
    }
    async function go(from, to) {
      const my = ++gen;
      try {
        for (let n = from; n <= to; n++) { await play(n, my); if (n < to) await wait(my, 1800); }
      } catch (e) { if (e !== STOP) throw e; }
    }

    tabs.forEach((b) => b.addEventListener('click', () => go(+b.dataset.step, +b.dataset.step)));
    $('[data-replay]', root).addEventListener('click', () => go(step, step));
    $('[data-all]', root).addEventListener('click', () => go(1, 4));
    setStep(1);
    if (!reduced() && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        go(1, 4);
      }, { threshold: 0.45 });
      io.observe(root);
    }
  }

  const FIGS = { bill: billFigure, method: methodFigure, gallery: galleryFigure };
  $$('[data-fig]').forEach((n) => {
    const fn = FIGS[n.dataset.fig];
    if (!fn) return;
    try { fn(n); } catch (e) { n.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; if (window.console) console.error(e); }
  });
}());
