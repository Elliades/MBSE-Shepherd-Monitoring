/* The article "L'IA suit la démarche MBSE" (article/ia/index.html): its figures.

   - ia-thread : one requirement of the shepherd drone followed through the three layers; its links appear one layer
                 at a time and its status is computed (open → allocated → designed → verified → met);
   - ia-mission: the mission state machine, simplified (modes, three regions, services), four scenarios played on it,
                 and the branch coverage adding up; the fourth scenario is the one the coverage asks for;
   - ia-drivers: the weights of the six axes of the Part 3 trade-off (archs.axes and archs[k].score of
                 part3/content/config.js), the ranking of the three candidates, and the tradeoff {} block it gives;
   - ia-gen    : a generator excerpt run line by line, the right-clicks of the plugin it calls, the internal block
                 diagram of architecture 2 before its patch (part3/content/archs.js, layout of config.js, stage "raw")
                 and the plan / apply / plan console, counted on that specification;
   - ia-verify : the validator on that architecture: the full scenario replayed with js/logical-engine.js without the
                 patch (2 expected states missed), the diagnosis and the fix, then replayed with it;
   - ia-metrics: the full scenario replayed on the three candidates, measured;
   - ia-swarm  : option A of Part 4 on its scenario (timeline copied from part4/content/config.js), and the measure
                 of the swarm: drones on the flock.
   The table of contents, the theme and the language are those of ../article.js. Every figure works alone. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isFr = () => document.documentElement.lang === 'fr';
  const tr = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? (isFr() ? v.fr : v.en) : v);
  const L = (en, fr) => (isFr() ? fr : en);
  const num = (n) => Number(n).toLocaleString(isFr() ? 'fr-FR' : 'en-US');
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));
  function el(name, attrs, parent, text) {
    const n = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function whenSeen(node, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: 0.35 });
    io.observe(node);
  }
  function wrap(text, max) {
    const out = [];
    let cur = '';
    String(text).split(' ').forEach((w) => {
      if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
    });
    if (cur) out.push(cur);
    return out;
  }
  function arrowHead(s, id) {
    const d = el('defs', {}, s);
    const m = el('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, d);
    el('path', { d: 'M0 0 L10 5 L0 10 z', class: 'a-head' }, m);
  }
  const roundTop = (x, y, w, h, r) => (h <= 0 ? '' : `M${x} ${y + h}V${y + Math.min(r, h)}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + Math.min(r, h)}V${y + h}Z`);

  /* the specs of Part 3, when the page has them */
  const ARCHS = window.LOGICAL_ARCHS || null;
  const CONF = (window.COURSE_CONFIG && window.COURSE_CONFIG.archs) || null;
  const ENGINE = window.LogicalEngine || null;
  const KEYS = ['1', '2', '3'];
  const ARCH_NAME = {
    1: { en: 'Feature orchestrator', fr: 'Orchestrateur de fonctionnalités' },
    2: { en: 'Decentralised patch', fr: 'Patch décentralisé' },
    3: { en: 'Central orchestrator', fr: 'Orchestrateur central' }
  };
  const steps = (arch) => arch.scenario.phases.reduce((a, p) => a.concat(p.steps), []);
  function allStates(block) {
    const out = [];
    (function walk(r) { (r.states || []).forEach((s) => { out.push(s.name); walk(s); (s.regions || []).forEach(walk); }); }(block.stm));
    return out;
  }
  const blockOf = (arch, type) => arch.blocks.find((b) => b.name === type);
  /* architecture 2 before its patch: the stage "raw" of Part 3 (muted signals, a state not made yet) */
  function rawStage() {
    const st = CONF && CONF.stages && CONF.stages.list.find((s) => s.id === 'raw');
    return {
      mute: (st && st.mute && st.mute['2']) || ['Deactivate Sheep Monitoring', 'Reactivate Sheep Monitoring', 'Resume Patrolling'],
      drop: (st && st.drop && st.drop['2']) || { SheepMonitoring: ['Deactivated'] }
    };
  }
  /* what an architecture holds, optionally without some signals and states */
  function bill(arch, cut) {
    const mute = (cut && cut.mute) || [];
    const drop = (cut && cut.drop) || {};
    const gone = new Set();
    const o = { parts: 0, ports: 0, flows: 0, states: 0, fns: 0, conns: 0 };
    arch.soi.parts.forEach((p) => {
      const b = blockOf(arch, p.type);
      if (!b) return;
      o.parts++;
      b.ports.forEach((pt) => {
        const n = pt.in.filter((s) => mute.indexOf(s) < 0).length + pt.out.filter((s) => mute.indexOf(s) < 0).length;
        if (n) { o.ports++; o.flows += n; } else gone.add(p.name + '.' + pt.name);
      });
      o.states += allStates(b).length - ((drop[b.name] || []).length);
      o.fns += b.functions.length;
    });
    o.conns = arch.soi.connectors.filter((c) => !c.some((e) => gone.has(e))).length;
    o.gone = gone;
    o.elements = o.parts + 2 * o.ports + o.flows + o.states + o.fns + o.conns;
    return o;
  }

  /* ════════════════ figure 1: the thread ════════════════ */
  const TH = {
    W: 240, H: 58, cols: { lc: 20, fn: 360, lg: 700 }, rows: [122, 196, 270, 344],
    colName: { lc: { en: '1 · Lifecycle (operational)', fr: '1 · Cycle de vie (opérationnel)' }, fn: { en: '2 · Functional', fr: '2 · Fonctionnel' }, lg: { en: '3 · Logical', fr: '3 · Logique' } },
    layer: { lc: 1, fn: 2, lg: 3 },
    nodes: [
      { id: 'uc', col: 'lc', row: 0, k: { en: 'Use case · phase 4 Execute', fr: 'Cas d’utilisation · phase 4 Exécuter' }, n: { en: 'Protect the flock from a predator', fr: 'Protéger le troupeau d’un prédateur' }, chip: '«refine»' },
      { id: 'sd', col: 'lc', row: 1, k: { en: 'Scenario · nominal', fr: 'Scénario · nominal' }, n: { en: 'A bear comes close, then backs off', fr: 'Un ours approche, puis recule' }, chip: '«verify»' },
      { id: 'mop', col: 'lc', row: 2, k: { en: 'MOP · measure of performance', fr: 'MOP · mesure de performance' }, n: { en: 'Chain from detection to deterrence', fr: 'Chaîne de la détection à la dissuasion' }, chip: '«refine»' },
      { id: 'ex', col: 'lc', row: 3, k: { en: 'Exchange · pasture → drone', fr: 'Échange · pâturage → drone' }, n: { en: 'Predator inside the safe perimeter', fr: 'Prédateur dans la zone de sécurité' } },
      { id: 'mode', col: 'fn', row: 0, k: { en: 'Mission mode', fr: 'Mode de la mission' }, n: 'Predator counteraction', chip: '«satisfy»' },
      { id: 'scn', col: 'fn', row: 1, k: { en: 'Functional scenario · black box', fr: 'Scénario fonctionnel · boîte noire' }, n: { en: 'the same, played on the mission', fr: 'le même, joué sur la mission' }, chip: '«verify»' },
      { id: 'fnc', col: 'fn', row: 2, k: { en: 'Service function', fr: 'Fonction de service' }, n: { en: 'Deter the predator: light, sound', fr: 'Dissuader le prédateur : lumière, son' } },
      { id: 'sig', col: 'fn', row: 3, k: { en: 'Mission signal', fr: 'Signal de la mission' }, n: { en: 'the exchange itself, reused', fr: 'l’échange lui-même, réutilisé' } },
      { id: 'lst', col: 'lg', row: 0, k: { en: 'Logical state', fr: 'État logique' }, n: 'Predator counteraction' },
      { id: 'wb', col: 'lg', row: 1, k: { en: 'White-box scenario', fr: 'Scénario boîte blanche' }, n: { en: 'the same again, part by part', fr: 'encore le même, part par part' }, chip: '«verify»' },
      { id: 'lfn', col: 'lg', row: 2, k: { en: 'Logical function', fr: 'Fonction logique' }, n: 'Trigger predator counter actions' },
      { id: 'comp', col: 'lg', row: 3, k: { en: 'Component', fr: 'Composant' }, n: 'Predator Management', chip: '«satisfy»' }
    ],
    links: [
      { a: 'sd', b: 'uc', v: true, rel: { en: 'scenario of', fr: 'scénario du' } },
      { a: 'sd', b: 'mop', v: true, down: true, rel: '«trace»' },
      { a: 'sig', b: 'ex', eq: true, rel: { en: 'same element', fr: 'même élément' } },
      { a: 'scn', b: 'sd', rel: 'refines:' },
      { a: 'lst', b: 'mode', rel: '«refine»' },
      { a: 'wb', b: 'scn', rel: { en: 'replays', fr: 'rejoue' } },
      { a: 'lfn', b: 'fnc', rel: '«refine»' },
      { a: 'fnc', b: 'comp', fwd: true, rel: '«allocate»' }
    ],
    status: {
      open: { en: 'open', fr: 'ouverte' }, allocated: { en: 'allocated', fr: 'allouée' }, designed: { en: 'designed', fr: 'conçue' },
      verified: { en: 'verified', fr: 'vérifiée' }, met: { en: 'met ✓', fr: 'tenue ✓' }
    },
    steps: [
      { tab: { en: 'Requirement', fr: 'Exigence' }, layer: 0, status: 'open',
        say: { en: 'The engineer writes the requirement. Nothing refines it yet: its status is <b>open</b>.', fr: 'L’ingénieur écrit l’exigence. Rien ne la raffine encore : son statut est <b>ouverte</b>.' } },
      { tab: { en: 'Lifecycle', fr: 'Cycle de vie' }, layer: 1, status: 'allocated',
        say: { en: 'Lifecycle layer: a use case of the <i>Execute</i> phase refines it, a scenario will verify it, a MOP sets its target. Status: <b>allocated</b>.', fr: 'Couche cycle de vie : un cas d’utilisation de la phase <i>Exécuter</i> la raffine, un scénario la vérifiera, un MOP fixe sa cible. Statut : <b>allouée</b>.' } },
      { tab: { en: 'Functional', fr: 'Fonctionnel' }, layer: 2, status: 'designed',
        say: { en: 'Functional layer: the exchange becomes a mission signal, <i>the same element</i>; a mode satisfies the requirement; the scenario is played on the mission. Status: <b>designed</b>.', fr: 'Couche fonctionnelle : l’échange devient un signal de la mission, <i>le même élément</i> ; un mode satisfait l’exigence ; le scénario se joue sur la mission. Statut : <b>conçue</b>.' } },
      { tab: { en: 'Logical', fr: 'Logique' }, layer: 3, status: 'designed',
        say: { en: 'Logical layer: <i>Logical Transition</i> clones the mode and the function into a component, each copy with its «refine», and allocates the function. The component satisfies the requirement.', fr: 'Couche logique : <i>Logical Transition</i> copie le mode et la fonction dans un composant, chaque copie avec son «refine», et alloue la fonction. Le composant satisfait l’exigence.' } },
      { tab: { en: 'Verify', fr: 'Vérifier' }, layer: 3, status: 'met', verify: true,
        say: { en: 'The scenario passes in every layer and the MOP is measured: the validator walks the thread back up and marks the requirement <b>met</b>. One broken link anywhere, and it says where.', fr: 'Le scénario passe dans chaque couche et le MOP est mesuré : le validateur remonte le fil et marque l’exigence <b>tenue</b>. Un seul lien cassé, n’importe où, et il dit lequel.' } }
    ]
  };

  function threadFigure(root) {
    const st = { cur: 0, status: 'open', pass: new Set(), drawn: new Set() };
    let token = 0;
    const node = (id) => TH.nodes.find((n) => n.id === id);
    const box = (n) => ({ x: TH.cols[n.col], y: TH.rows[n.row] });

    function render() {
      root.innerHTML = `<div class="fig-bar"><div class="seg" role="group" aria-label="${L('Layers', 'Couches')}">${TH.steps.map((s, i) => `<button type="button" data-i="${i}" aria-pressed="false"><small>${i}</small>${esc(tr(s.tab))}</button>`).join('')}</div>
        <button type="button" class="btn ghost" data-play>▶ ${L('Play it all', 'Tout dérouler')}</button></div>
        <p class="say" aria-live="polite"></p><div class="th-art"></div>`;
      const s = el('svg', { viewBox: '0 0 960 414', role: 'img', 'aria-label': L('A requirement traced through the lifecycle, functional and logical layers', 'Une exigence tracée à travers les couches cycle de vie, fonctionnelle et logique') });
      arrowHead(s, 'th-a');
      const req = el('g', { class: 'th-req' }, s);
      el('rect', { x: 20, y: 14, width: 920, height: 58, rx: 12 }, req);
      el('text', { x: 38, y: 37, class: 'k' }, req, L('REQ-07 · REQUIREMENT', 'REQ-07 · EXIGENCE'));
      el('text', { x: 38, y: 58, class: 't' }, req, L('The drone deters a predator that enters the safe perimeter', 'Le drone dissuade un prédateur qui entre dans la zone de sécurité'));
      const stg = el('g', { class: 'th-status' }, s);
      el('rect', { x: 776, y: 29, width: 148, height: 28, rx: 14 }, stg);
      el('text', { x: 850, y: 47.5, 'text-anchor': 'middle', 'data-status': '' }, stg, '');
      Object.keys(TH.cols).forEach((c) => el('text', { x: TH.cols[c], y: 108, class: 'th-col', 'data-show': '', 'data-layer': TH.layer[c] }, s, tr(TH.colName[c])));
      TH.links.forEach((lk, i) => {
        const a = node(lk.a), b = node(lk.b), A = box(a), B = box(b);
        const g = el('g', { class: 'th-link' + (lk.eq ? ' eq' : ''), 'data-show': '', 'data-layer': Math.max(TH.layer[a.col], TH.layer[b.col]), 'data-link': i }, s);
        let d, lx, ly;
        if (lk.v) {
          const x = A.x + TH.W / 2;
          const y1 = lk.down ? A.y + TH.H : A.y, y2 = lk.down ? B.y : B.y + TH.H;
          d = `M${x} ${y1} V${y2}`; lx = x - 8; ly = (y1 + y2) / 2 + 4;
          el('path', { d, class: 'm', 'marker-end': 'url(#th-a)' }, g);
          el('text', { x: lx, y: ly, 'text-anchor': 'end' }, g, tr(lk.rel));
          return;
        }
        const from = lk.fwd ? { x: A.x + TH.W, y: A.y + TH.H / 2 } : { x: A.x, y: A.y + TH.H / 2 };
        const to = lk.fwd ? { x: B.x, y: B.y + TH.H / 2 } : { x: B.x + TH.W, y: B.y + TH.H / 2 };
        const mx = (from.x + to.x) / 2;
        d = `M${from.x} ${from.y} C${mx} ${from.y} ${mx} ${to.y} ${to.x} ${to.y}`;
        if (lk.eq) {
          el('path', { d: `M${from.x} ${from.y - 2.5} H${to.x}`, class: 'm' }, g);
          el('path', { d: `M${from.x} ${from.y + 2.5} H${to.x}`, class: 'm' }, g);
        } else el('path', { d, class: 'm', 'marker-end': 'url(#th-a)' }, g);
        el('text', { x: mx, y: Math.min(from.y, to.y) - 7 + (lk.fwd ? 22 : 0), 'text-anchor': 'middle' }, g, tr(lk.rel));
      });
      TH.nodes.forEach((n) => {
        const { x, y } = box(n);
        const g = el('g', { class: `th-node th-${n.col}`, 'data-show': '', 'data-layer': TH.layer[n.col], 'data-node': n.id }, s);
        el('rect', { x, y, width: TH.W, height: TH.H, rx: 9, class: 'b' }, g);
        el('rect', { x, y: y + 8, width: 4, height: TH.H - 16, rx: 2, class: 'band' }, g);
        el('text', { x: x + 14, y: y + 18, class: 'k' }, g, tr(n.k));
        wrap(tr(n.n), 31).slice(0, 2).forEach((ln, i) => el('text', { x: x + 14, y: y + 36 + i * 15, class: 'n' }, g, ln));
        if (n.chip) {
          const c = el('g', { class: 'chip' }, g);
          el('rect', { x: x + TH.W - 104, y: y - 9, width: 98, height: 17, rx: 8.5 }, c);
          el('text', { x: x + TH.W - 55, y: y + 3.5, 'text-anchor': 'middle' }, c, n.chip + ' REQ-07');
        }
        const ok = el('g', { class: 'ok', 'data-ok': '' }, g);
        el('circle', { cx: x + TH.W - 16, cy: y + TH.H - 16, r: 9 }, ok);
        el('text', { x: x + TH.W - 16, y: y + TH.H - 12, 'text-anchor': 'middle' }, ok, '✓');
      });
      $('.th-art', root).appendChild(s);
      $$('[data-i]', root).forEach((b) => b.addEventListener('click', () => go(+b.dataset.i)));
      $('[data-play]', root).addEventListener('click', play);
      st.drawn = new Set();
      paint(true);
    }
    function paint(instant) {
      const step = TH.steps[st.cur];
      $$('[data-layer]', root).forEach((n) => {
        const on = +n.dataset.layer <= step.layer;
        n.classList.toggle('off', !on);
        if (n.dataset.link != null) {
          if (on && !st.drawn.has(n.dataset.link)) { st.drawn.add(n.dataset.link); if (!instant) n.classList.add('draw'); }
          if (!on) { st.drawn.delete(n.dataset.link); n.classList.remove('draw'); }
        }
      });
      $$('[data-node]', root).forEach((n) => {
        const p = st.pass.has(n.dataset.node);
        n.classList.toggle('pass', p);
        $('[data-ok]', n).style.display = p ? '' : 'none';
      });
      const sg = $('.th-status', root);
      sg.classList.toggle('met', st.status === 'met');
      $('[data-status]', root).textContent = L('status: ', 'statut : ') + tr(TH.status[st.status]);
      $('.say', root).innerHTML = tr(step.say);
      $$('[data-i]', root).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === st.cur)));
    }
    async function go(i, my) {
      if (my == null) my = ++token;
      st.cur = i;
      st.pass = new Set();
      const step = TH.steps[i];
      st.status = step.verify ? 'designed' : step.status;
      paint();
      if (!step.verify) return;
      for (const id of ['sd', 'scn', 'wb']) {
        await wait(650);
        if (my !== token) return;
        st.pass.add(id);
        paint();
      }
      st.status = 'verified';
      paint();
      await wait(800);
      if (my !== token) return;
      st.pass.add('mop');
      st.status = 'met';
      paint();
    }
    async function play() {
      const my = ++token;
      for (let i = 0; i < TH.steps.length; i++) {
        if (my !== token) return;
        await go(i, my);
        if (i < TH.steps.length - 1) await wait(2600);
      }
    }
    render();
    window.addEventListener('article-lang', render);
    if (!reduced()) whenSeen(root, play);
    else go(TH.steps.length - 1);
  }

  /* ════════════════ figure 2: the mission ════════════════ */
  const MS = {
    states: [
      { id: 'U', x: 44, y: 26, w: 150, h: 56, n: 'Undeployed', d: { en: 'prepare the mission', fr: 'préparer la mission' } },
      { id: 'G', x: 262, y: 26, w: 158, h: 56, n: 'Going to Safe Area', d: { en: 'reach the safe area', fr: 'rejoindre la zone' } },
      { id: 'R', x: 458, y: 26, w: 158, h: 56, n: 'Returning to base', d: { en: 'fly home', fr: 'rentrer' } },
      { id: 'FWP', x: 150, y: 134, w: 186, h: 42, n: 'Following watch path', d: { en: 'patrol the perimeter', fr: 'patrouiller le périmètre' } },
      { id: 'SW', x: 150, y: 206, w: 150, h: 42, n: 'Sheep watch', d: { en: 'count the flock', fr: 'compter le troupeau' } },
      { id: 'TS', x: 400, y: 206, w: 200, h: 42, n: 'Tracking stray sheep', d: { en: 'follow it, warn the operator', fr: 'la suivre, prévenir l’opérateur' } },
      { id: 'NP', x: 142, y: 300, w: 100, h: 42, n: 'No predator', d: '' },
      { id: 'PT', x: 284, y: 300, w: 136, h: 42, n: 'Predator tracking', d: { en: 'follow it', fr: 'le suivre' } },
      { id: 'PC', x: 458, y: 300, w: 152, h: 42, n: 'Predator counteraction', d: { en: 'light, sound', fr: 'lumière, son' } }
    ],
    tr: {
      a: { from: 'U', to: 'G', d: 'M194 54 H214 M238 54 H262', lx: 250, ly: 46 },
      k: { from: 'U', to: 'U', d: 'M226 66 C226 104 120 104 120 84', lx: 176, ly: 106 },
      b: { from: 'G', to: 'P', d: 'M341 82 V116', lx: 348, ly: 104 },
      i: { from: 'P', to: 'R', d: 'M537 116 V82', lx: 544, ly: 104 },
      c: { from: 'SW', to: 'TS', d: 'M300 220 H400', lx: 350, ly: 215 },
      d: { from: 'TS', to: 'SW', d: 'M400 236 H300', lx: 350, ly: 250 },
      e: { from: 'NP', to: 'PT', d: 'M242 314 H284', lx: 263, ly: 309 },
      h: { from: 'PT', to: 'NP', d: 'M284 330 H242', lx: 263, ly: 344 },
      f: { from: 'PT', to: 'PC', d: 'M420 314 H458', lx: 439, ly: 309 },
      g: { from: 'PC', to: 'PT', d: 'M458 330 H420', lx: 439, ly: 344 }
    },
    trName: {
      a: { en: 'plan correct → Going to Safe Area', fr: 'plan correct → Going to Safe Area' },
      k: { en: 'plan refused → Undeployed', fr: 'plan refusé → Undeployed' },
      b: { en: 'arrived → Patrolling', fr: 'arrivé → Patrolling' },
      i: { en: 'end of mission → Returning to base', fr: 'fin de mission → Returning to base' },
      c: { en: 'Sheep watch → Tracking stray sheep', fr: 'Sheep watch → Tracking stray sheep' },
      d: { en: 'Tracking stray sheep → Sheep watch', fr: 'Tracking stray sheep → Sheep watch' },
      e: { en: 'No predator → Predator tracking', fr: 'No predator → Predator tracking' },
      h: { en: 'Predator tracking → No predator', fr: 'Predator tracking → No predator' },
      f: { en: 'Predator tracking → Predator counteraction', fr: 'Predator tracking → Predator counteraction' },
      g: { en: 'Predator counteraction → Predator tracking', fr: 'Predator counteraction → Predator tracking' }
    },
    reqs: [
      { id: 'REQ-01', t: { en: 'Prepare the mission from a checked flight plan', fr: 'Préparer la mission à partir d’un plan de vol vérifié' } },
      { id: 'REQ-04', t: { en: 'Watch the flock and report a stray sheep', fr: 'Surveiller le troupeau et signaler une brebis égarée' } },
      { id: 'REQ-06', t: { en: 'Track a predator in the tracking perimeter', fr: 'Suivre un prédateur dans le périmètre de suivi' } },
      { id: 'REQ-07', t: { en: 'Deter a predator that enters the safe perimeter', fr: 'Dissuader un prédateur qui entre dans la zone de sécurité' } },
      { id: 'REQ-09', t: { en: 'Return to base at the end of the mission', fr: 'Rentrer à la base en fin de mission' } }
    ],
    kinds: { nominal: { en: 'nominal', fr: 'nominal' }, alternative: { en: 'alternative', fr: 'alternatif' }, dysfunctional: { en: 'dysfunctional', fr: 'dysfonctionnel' } },
    scs: [
      { kind: 'nominal', n: { en: 'A bear passes by', fr: 'Un ours passe' }, seq: ['a', 'b', 'e', 'h'], ver: ['REQ-01', 'REQ-06'] },
      { kind: 'alternative', n: { en: 'The bear comes too close, then backs off', fr: 'L’ours approche trop près, puis recule' }, seq: ['a', 'b', 'e', 'f', 'g', 'h'], ver: ['REQ-07'] },
      { kind: 'dysfunctional', n: { en: 'The flight plan is refused', fr: 'Le plan de vol est refusé' }, seq: ['k'], ver: ['REQ-01'] },
      { kind: 'nominal', n: { en: 'A sheep strays, then back to base', fr: 'Une brebis s’écarte, puis retour à la base' }, seq: ['a', 'b', 'c', 'd', 'i'], ver: ['REQ-04', 'REQ-09'], late: true }
    ],
    inner: ['FWP', 'SW', 'TS', 'NP', 'PT', 'PC'],
    inits: ['FWP', 'SW', 'NP']
  };

  function missionFigure(root) {
    const st = { active: new Set(['U']), cov: new Set(), played: new Set(), ver: new Set(), now: null, running: -1 };
    let token = 0;
    const total = Object.keys(MS.tr).length;

    function render() {
      root.innerHTML = `<div class="ms-wrap"><div><div class="ms-art"></div>
        <span class="label">${L('Requirements', 'Exigences')}</span><ul class="ms-reqs">${MS.reqs.map((r) => `<li data-req="${r.id}"><b>${r.id}</b>${esc(tr(r.t))}</li>`).join('')}</ul></div>
        <div class="ms-side"><div><span class="label">${L('Scenarios', 'Scénarios')}</span><ul class="ms-scs">${MS.scs.map((s, i) => `<li><button type="button" data-sc="${i}"><small>${esc(tr(MS.kinds[s.kind]))} · ${L('verifies', 'vérifie')} ${s.ver.join(', ')}</small>${esc(tr(s.n))}</button></li>`).join('')}</ul></div>
        <div class="ms-cov" aria-live="polite"><b data-cov></b><div class="bar"><i></i></div><div class="miss"></div></div>
        <div class="btn-row"><button type="button" class="btn" data-all>▶ ${L('Play them all', 'Tous les jouer')}</button><button type="button" class="btn ghost" data-reset>↻</button></div>
      </div></div>`;
      const s = el('svg', { viewBox: '0 0 640 390', role: 'img', 'aria-label': L('The mission state machine of the shepherd drone, simplified', 'La machine d’états de la mission du drone berger, simplifiée') });
      arrowHead(s, 'ms-a');
      const P = el('g', { class: 'ms-comp', 'data-st': 'P' }, s);
      el('rect', { x: 24, y: 116, width: 592, height: 262, rx: 14 }, P);
      el('text', { x: 40, y: 134, class: 'n' }, P, 'Patrolling');
      el('line', { x1: 24, x2: 616, y1: 188, y2: 188, class: 'ms-sep' }, s);
      el('line', { x1: 24, x2: 616, y1: 274, y2: 274, class: 'ms-sep' }, s);
      [[L('perimeter', 'périmètre'), 160], [L('flock', 'troupeau'), 206], [L('predator', 'prédateur'), 292]].forEach(([t, y]) => el('text', { x: 36, y, class: 'ms-reg' }, s, t));
      el('circle', { cx: 22, cy: 54, r: 5, class: 'ms-init' }, s);
      el('path', { d: 'M27 54 H44', class: 'a-arrow', 'marker-end': 'url(#ms-a)' }, s);
      [['FWP', 128, 155], ['SW', 128, 227], ['NP', 120, 321]].forEach(([, x, y]) => {
        el('circle', { cx: x, cy: y, r: 4, class: 'ms-init' }, s);
        el('path', { d: `M${x + 4} ${y} H${x + 18}`, class: 'a-arrow', 'marker-end': 'url(#ms-a)' }, s);
      });
      el('path', { d: 'M226 42 L238 54 L226 66 L214 54 Z', class: 'ms-dec' }, s);
      Object.keys(MS.tr).forEach((k) => {
        const t = MS.tr[k];
        const g = el('g', { class: 'ms-tr', 'data-tr': k }, s);
        el('path', { d: t.d, 'marker-end': 'url(#ms-a)' }, g);
        el('text', { x: t.lx, y: t.ly, 'text-anchor': 'middle' }, g, k === 'k' ? L('refused', 'refusé') : k === 'a' ? 'OK' : k);
      });
      MS.states.forEach((m) => {
        const g = el('g', { class: 'ms-st', 'data-st': m.id }, s);
        el('rect', { x: m.x, y: m.y, width: m.w, height: m.h, rx: 10 }, g);
        el('text', { x: m.x + m.w / 2, y: m.y + (m.h > 50 ? 25 : 18), 'text-anchor': 'middle', class: 'n' }, g, m.n);
        if (m.d) el('text', { x: m.x + m.w / 2, y: m.y + (m.h > 50 ? 42 : 33), 'text-anchor': 'middle', class: 'd' }, g, 'do: ' + tr(m.d));
      });
      $('.ms-art', root).appendChild(s);
      $$('[data-sc]', root).forEach((b) => b.addEventListener('click', () => playSc(+b.dataset.sc)));
      $('[data-all]', root).addEventListener('click', playAll);
      $('[data-reset]', root).addEventListener('click', reset);
      paint();
    }
    function paint() {
      $$('[data-st]', root).forEach((n) => n.classList.toggle('on', st.active.has(n.dataset.st)));
      $$('[data-tr]', root).forEach((n) => { n.classList.toggle('cov', st.cov.has(n.dataset.tr)); n.classList.toggle('now', st.now === n.dataset.tr); });
      $$('[data-req]', root).forEach((n) => n.classList.toggle('ver', st.ver.has(n.dataset.req)));
      const firstThree = [0, 1, 2].every((i) => st.played.has(i));
      $$('[data-sc]', root).forEach((b) => {
        const i = +b.dataset.sc;
        b.classList.toggle('done', st.played.has(i));
        b.disabled = st.running >= 0 || (MS.scs[i].late && !firstThree);
        b.classList.toggle('ask', !!MS.scs[i].late && firstThree && !st.played.has(i));
      });
      $('[data-all]', root).disabled = st.running >= 0;
      $('[data-cov]', root).textContent = `${L('Branches covered', 'Branches couvertes')} : ${st.cov.size} / ${total} (${Math.round(100 * st.cov.size / total)} %)`.replace(' :', isFr() ? ' :' : ':');
      $('.ms-cov .bar i', root).style.width = (100 * st.cov.size / total) + '%';
      const miss = Object.keys(MS.tr).filter((k) => !st.cov.has(k));
      const unver = MS.reqs.filter((r) => !st.ver.has(r.id)).map((r) => r.id);
      let msg = '';
      if (!st.played.size) msg = L('Play a scenario: each one lights the modes it goes through.', 'Jouez un scénario : chacun allume les modes qu’il traverse.');
      else if (!miss.length) msg = L('100 %: every branch is taken by a passing scenario, every requirement is verified.', '100 % : chaque branche est prise par un scénario qui passe, chaque exigence est vérifiée.');
      else if (firstThree) msg = `${L('Never taken', 'Jamais prises')} : ${miss.map((k) => tr(MS.trName[k])).join(' · ')}. ${L('Nothing verifies', 'Rien ne vérifie')} ${unver.join(', ')} : ${L('the coverage asks for a scenario.', 'la couverture réclame un scénario.')}`;
      else msg = `${L('Not taken yet', 'Pas encore prises')} : ${miss.length}`;
      $('.miss', root).textContent = msg;
    }
    function enter(id) { st.active.add(id); if (id === 'P') MS.inits.forEach((s) => st.active.add(s)); }
    function leave(id) { st.active.delete(id); if (id === 'P') MS.inner.forEach((s) => st.active.delete(s)); }
    async function playSc(i, my) {
      if (my == null) my = ++token;
      const sc = MS.scs[i];
      st.running = i;
      st.active = new Set(['U']);
      st.now = null;
      paint();
      await wait(350);
      for (const k of sc.seq) {
        if (my !== token) return;
        st.now = k;
        paint();
        await wait(420);
        if (my !== token) return;
        const t = MS.tr[k];
        leave(t.from);
        enter(t.to);
        st.cov.add(k);
        paint();
        await wait(520);
      }
      if (my !== token) return;
      st.now = null;
      st.played.add(i);
      sc.ver.forEach((r) => st.ver.add(r));
      st.running = -1;
      paint();
    }
    async function playAll() {
      const my = ++token;
      for (let i = 0; i < MS.scs.length; i++) {
        if (my !== token) return;
        if (st.played.has(i)) continue;
        await playSc(i, my);
        await wait(700);
      }
    }
    function reset() {
      token++;
      Object.assign(st, { active: new Set(['U']), cov: new Set(), played: new Set(), ver: new Set(), now: null, running: -1 });
      paint();
    }
    render();
    window.addEventListener('article-lang', render);
  }

  /* ════════════════ figure 3: the drivers ════════════════ */
  const AX_FR = {
    'Rules in one place': 'Règles au même endroit', 'Cheap to change': 'Peu coûteuse à modifier', 'Room for new features': 'Place pour de nouvelles fonctionnalités',
    'Few messages': 'Peu de messages', 'No single point of failure': 'Pas de point unique de défaillance', 'Simple components': 'Composants simples'
  };
  const PRESETS = [
    { n: { en: 'Balanced', fr: 'Équilibré' }, w: [1, 1, 1, 1, 1, 1] },
    { n: { en: 'Evolvability', fr: 'Évolutivité' }, w: [1, 2, 3, 0, 1, 0] },
    { n: { en: 'Robustness', fr: 'Robustesse' }, w: [0, 0, 1, 2, 3, 1] },
    { n: { en: 'Readable rules', fr: 'Règles lisibles' }, w: [3, 0, 1, 0, 0, 2] }
  ];

  function driversFigure(root) {
    if (!CONF || !CONF.axes || !KEYS.every((k) => CONF[k] && CONF[k].score)) { root.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; return; }
    const axes = CONF.axes;
    const st = { w: PRESETS[0].w.slice(), preset: 0 };
    const short = (k) => CONF[k].short || CONF[k].name;

    function score(k) {
      const sw = st.w.reduce((a, b) => a + b, 0);
      return sw ? st.w.reduce((a, w, i) => a + w * CONF[k].score[i], 0) / (5 * sw) : 0;
    }
    function render() {
      root.innerHTML = `<div class="fig-bar"><div class="seg" role="group" aria-label="${L('Presets', 'Préréglages')}">${PRESETS.map((p, i) => `<button type="button" data-p="${i}" aria-pressed="false">${esc(tr(p.n))}</button>`).join('')}</div></div>
        <div class="dr-wrap"><div><span class="label">${L('Drivers and their weight', 'Les drivers et leur poids')}</span><ul class="dr-axes">${axes.map((a, i) => `<li><span>${esc(isFr() ? AX_FR[a] || a : a)}</span><span class="dr-w" role="group" aria-label="${esc(a)}">${[0, 1, 2, 3].map((v) => `<button type="button" data-a="${i}" data-v="${v}" aria-pressed="false">${v}</button>`).join('')}</span></li>`).join('')}</ul></div>
        <div><span class="label">${L('Weighted score of the candidates', 'Score pondéré des candidates')}</span><div class="dr-res ia">${KEYS.map((k) => `<div class="dr-bar" data-k="${k}"><span class="l">${esc(tr(ARCH_NAME[k]))}</span><span class="t"><i style="background:var(--a${k})"></i></span><span class="v"></span></div>`).join('')}</div>
        </div></div><div class="dr-code"><span class="label">${L('What the generator keeps', 'Ce que le générateur garde')}</span><pre class="code"><code></code></pre></div>`;
      $$('[data-p]', root).forEach((b) => b.addEventListener('click', () => { st.preset = +b.dataset.p; st.w = PRESETS[st.preset].w.slice(); paint(); }));
      $$('[data-a]', root).forEach((b) => b.addEventListener('click', () => { st.w[+b.dataset.a] = +b.dataset.v; st.preset = -1; paint(); }));
      paint();
    }
    function paint() {
      $$('[data-p]', root).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.p === st.preset)));
      $$('[data-a]', root).forEach((b) => b.setAttribute('aria-pressed', String(st.w[+b.dataset.a] === +b.dataset.v)));
      const sc = {};
      KEYS.forEach((k) => { sc[k] = score(k); });
      const best = Math.max.apply(null, KEYS.map((k) => sc[k]));
      const win = KEYS.filter((k) => Math.abs(sc[k] - best) < 1e-9 && best > 0);
      $$('.dr-bar', root).forEach((row) => {
        const k = row.dataset.k;
        $('.t i', row).style.width = Math.round(100 * sc[k]) + '%';
        $('.v', row).textContent = Math.round(100 * sc[k]) + ' %';
        row.classList.toggle('win', win.indexOf(k) >= 0);
      });
      const q = (s) => `"${s}"`;
      const lines = [`tradeoff("Logical architecture", candidates = listOf(${KEYS.map((k) => q(short(k))).join(', ')})) {`];
      const zero = [];
      axes.forEach((a, i) => {
        if (!st.w[i]) { zero.push(a); return; }
        const ev = a === 'Few messages' ? '   // evidence: replay, fig. 6' : '';
        lines.push(`    criterion(${q(a)}, weight = ${st.w[i]}) {${ev}`);
        lines.push(`        ${KEYS.map((k) => `score(${q(short(k))}, ${CONF[k].score[i]})`).join('; ')}`);
        lines.push('    }');
      });
      if (zero.length) lines.push(`    // weight 0, set by the engineer: ${zero.join(', ')}`);
      lines.push(win.length === 1
        ? `    choose(${q(short(win[0]))}, because = "best weighted score, ${Math.round(100 * best)} %")`
        : `    // tie: ${win.map(short).join(' / ')}. The engineer decides, the LLM does not.`);
      lines.push('}');
      $('.dr-code code', root).innerHTML = lines.map((ln) => esc(ln).replace(/(choose\(|criterion\(|tradeoff\()/g, '<mark>$1</mark>')).join('\n');
    }
    render();
    window.addEventListener('article-lang', render);
  }

  /* ════════════════ figure 4: the generator ════════════════ */
  const GN_TOOLS = [['lt', 'Logical Transition'], ['del', 'Delegate to external systems'], ['ports', 'Create All Missing Signal Ports'], ['merge', 'Merge Ports'], ['ac', 'Auto Connect']];
  const GN_LINES = [
    { t: '// shepherd/Patch.kt · written by the LLM', cm: true },
    { t: 'override fun describe(view: ModelView) =' },
    { t: '  logical(view, into = "Logical::Patch") {' },
    { t: '  val fn = view.functional' },
    { t: '  val lc = view.lifecycle' },
    { t: '  val ready = lc.signal("Ready for mission")' },
    { t: '  val mi = component("Manual Initialization")', parts: ['mi'] },
    { t: '  val mc = component("Mission Configuration")', parts: ['mc'] },
    { t: '  val bsrc = component("Base station remote communication")', parts: ['bsrc'] },
    { t: '  val ap = component("AutoPilot")', parts: ['ap'] },
    { t: '  val zs = component("Zone Surveillance")', parts: ['zs'] },
    { t: '  val sm = component("SheepMonitoring")', parts: ['sm'] },
    { t: '  val pm = component("Predator Management")', parts: ['pm'] },
    { t: '' },
    { t: '  allocate(fn.state("Undeployed"), to = mc)', tool: 'lt', clone: 'mc' },
    { t: '  allocate(fn.region("Patrolling", "Perimeter"), to = zs)', tool: 'lt', clone: 'zs' },
    { t: '  allocate(fn.region("Patrolling", "Flock"), to = sm)', tool: 'lt', clone: 'sm' },
    { t: '  allocate(fn.region("Patrolling", "Predator"), to = pm)', tool: 'lt', clone: 'pm' },
    { t: '' },
    { t: '  signals(mc) {' },
    { t: '    input(lc.signal("FlightPlan"), port = "p_BaseStation")' },
    { t: '    selfSend(ready); delegate(ready, port = "p_Verdict")', tool: 'del' },
    { t: '  }' },
    { t: '  context("Logical SOI 2 - Patch") {' },
    { t: '    parts(mi, mc, bsrc, ap, zs, sm, pm)  // ports derived', tool: 'ports', ports: 'many' },
    { t: '    mergePortsByPartner()', tool: 'merge', ports: 'one' },
    { t: '    autoConnect()', tool: 'ac', conns: true },
    { t: '    boundary(lc.exchanges)  // SoI ports = exchanges', boundary: true },
    { t: '  }' },
    { t: '}' }
  ];
  const GN_CTX = GN_LINES.findIndex((l) => l.t.indexOf('context(') >= 0);

  function genFigure(root) {
    const arch = ARCHS && ARCHS['2'];
    const lay = CONF && CONF['2'] && CONF['2'].layout;
    if (!arch || !lay) { root.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; return; }
    const cut = rawStage();
    const b = bill(arch, cut);
    const tech = (CONF.stages && CONF.stages.tech) || [];
    const conns = arch.soi.connectors.filter((c) => !c.some((e) => b.gone.has(e)));
    const st = { line: -1, parts: new Set(), clones: new Set(), used: new Set(), tool: null, ports: null, conns: false, boundary: false, con: [] };
    let token = 0;
    const PW = 128, PH = 44;

    function consoleLines() {
      return [
        ['p', '$ arch.sh shepherd.patch plan'],
        ['', `  CREATE  ${b.parts} ${L('components', 'composants')} · ${b.ports} ports · ${b.ports} interfaces · ${b.flows} ${L('flow properties', 'propriétés de flux')}`],
        ['', `  CREATE  ${b.states} ${L('states', 'états')} · ${b.fns} ${L('functions', 'fonctions')} · ${b.conns} ${L('connectors', 'connecteurs')}`],
        ['c', `  ${L('rules on the description: 0 error', 'règles sur la description : 0 erreur')}`],
        ['p', '$ arch.sh shepherd.patch apply'],
        ['c', `  ${L('one undoable session · model read back · rules: 0 error', 'une session annulable · modèle relu · règles : 0 erreur')}`],
        ['p', '$ arch.sh shepherd.patch plan'],
        ['c', `  ${L('KEEP everything · 0 change: the generator is idempotent', 'KEEP partout · 0 changement : le générateur est idempotent')}`]
      ];
    }
    function render() {
      root.innerHTML = `<div class="fig-bar"><button type="button" class="btn" data-run>▶ ${L('Run the generator', 'Lancer le générateur')}</button></div>
        <div class="gn-wrap"><pre class="gn-code" aria-label="Kotlin">${GN_LINES.map((ln, i) => `<span data-l="${i}" class="${ln.cm ? 'cm' : ''}">${esc(ln.t) || ' '}</span>`).join('')}</pre>
        <div><div class="gn-tools">${GN_TOOLS.map(([id, n]) => `<span data-tool="${id}">${n}</span>`).join('')}</div><div class="gn-ibd"></div></div></div>
        <div class="gn-con" aria-live="polite"></div>
        <div class="kinds gn-tiles">
          <div><b>${num(b.elements)}</b><span>${L('SysML elements written in Cameo', 'éléments SysML écrits dans Cameo')}</span></div>
          <div><b>1</b><span>${L('Kotlin file of', 'fichier Kotlin de')} ${GN_LINES.length} ${L('lines, reviewed by the engineer', 'lignes, relu par l’ingénieur')}</span></div>
          <div><b>3</b><span>${L('commands: plan, apply, plan', 'commandes : plan, apply, plan')}</span></div>
          <div><b>≥ ${num(b.elements)}</b><span>${L('MCP calls, had it gone element by element', 'appels MCP, s’il avait fallu y aller élément par élément')}</span></div>
        </div>`;
      $('[data-run]', root).addEventListener('click', run);
      drawIbd();
      paint();
    }
    function center(id) { const p = lay[id]; return { x: p[0], y: p[1] }; }
    function edgePoint(id, toward) {
      const c = center(id), dx = toward.x - c.x, dy = toward.y - c.y;
      if (!dx && !dy) return c;
      const s = Math.min(dx ? (PW / 2) / Math.abs(dx) : Infinity, dy ? (PH / 2) / Math.abs(dy) : Infinity);
      return { x: c.x + dx * s, y: c.y + dy * s, nx: dx * s, ny: dy * s };
    }
    function boundaryPoint(name, part) {
      const side = (CONF.ports && CONF.ports[name]) || 'L';
      const same = conns.filter((c) => c[0].indexOf('.') < 0 && c[1].split('.')[0] === part);
      const idx = same.findIndex((c) => c[0] === name);
      const y = center(part).y + (idx - (same.length - 1) / 2) * 16;
      return { x: side === 'R' ? 700 : 100, y };
    }
    function flowsOf(end) {
      const [part, port] = end.split('.');
      const p = arch.soi.parts.find((x) => x.name === part);
      const blk = p && blockOf(arch, p.type);
      const pt = blk && blk.ports.find((x) => x.name === port);
      return pt ? pt.in.concat(pt.out).filter((s) => cut.mute.indexOf(s) < 0).length : 1;
    }
    function drawIbd() {
      const host = $('.gn-ibd', root);
      host.innerHTML = '';
      const s = el('svg', { viewBox: '88 6 626 404', role: 'img', 'aria-label': L('Internal block diagram of the generated architecture', 'Diagramme de blocs interne de l’architecture générée') });
      el('rect', { x: 100, y: 20, width: 600, height: 380, rx: 10, class: 'frame' }, s);
      el('text', { x: 112, y: 36, class: 'ftitle' }, s, ': Logical SOI 2 - Patch');
      const gc = el('g', { 'data-conns': '' }, s);
      const gp = el('g', { 'data-parts': '' }, s);
      el('g', { 'data-ports': '' }, s);
      Object.keys(lay).forEach((id) => {
        const c = center(id);
        const meta = (CONF.parts && CONF.parts[id]) || { label: id, color: '#888' };
        const g = el('g', { class: 'part' + (tech.indexOf(id) >= 0 ? ' tech' : ''), 'data-part': id, style: `--c:${meta.color}` }, gp);
        el('rect', { x: c.x - PW / 2, y: c.y - PH / 2, width: PW, height: PH, rx: 7, class: 'b' }, g);
        el('rect', { x: c.x - PW / 2 + 5, y: c.y - PH / 2 + 6, width: 3.5, height: PH - 12, rx: 1.5, class: 'band' }, g);
        const ls = wrap(':' + meta.label, 15);
        ls.forEach((ln, i) => el('text', { x: c.x + 3, y: c.y + 4.5 + (i - (ls.length - 1) / 2) * 14, 'text-anchor': 'middle' }, g, ln));
        el('text', { x: c.x + PW / 2 - 4, y: c.y - PH / 2 - 4, 'text-anchor': 'end', class: 'cl', 'data-clone': '' }, g, L('cloned + «refine»', 'copié + «refine»'));
      });
      conns.forEach((cn) => {
        const [a, bb] = cn;
        let p1, p2;
        if (a.indexOf('.') < 0) { const part = bb.split('.')[0]; p1 = boundaryPoint(a, part); p2 = edgePoint(part, p1); } else {
          const pa = a.split('.')[0], pb = bb.split('.')[0];
          p1 = edgePoint(pa, center(pb)); p2 = edgePoint(pb, center(pa));
        }
        el('path', { d: `M${p1.x} ${p1.y} L${p2.x} ${p2.y}`, class: 'con', 'data-con': a.indexOf('.') < 0 ? 'b' : 'i' }, gc);
      });
      host.appendChild(s);
    }
    function drawPorts() {
      const g = $('[data-ports]', root);
      g.innerHTML = '';
      if (!st.ports) return;
      conns.forEach((cn) => {
        cn.forEach((end, j) => {
          const other = cn[1 - j];
          if (end.indexOf('.') < 0) {
            if (!st.boundary) return;
            const part = other.split('.')[0], p = boundaryPoint(end, part);
            el('rect', { x: p.x - 5, y: p.y - 5, width: 10, height: 10, class: 'bport' }, g);
            return;
          }
          const part = end.split('.')[0];
          const toward = other.indexOf('.') < 0 ? boundaryPoint(other, part) : center(other.split('.')[0]);
          const p = edgePoint(part, toward);
          const n = st.ports === 'many' ? flowsOf(end) : 1;
          const horiz = Math.abs(p.nx || 0) * (PH / 2) < Math.abs(p.ny || 0) * (PW / 2);
          for (let i = 0; i < n; i++) {
            const off = (i - (n - 1) / 2) * 9;
            el('rect', { x: p.x - 4 + (horiz ? off : 0), y: p.y - 4 + (horiz ? 0 : off), width: 8, height: 8, class: 'port' }, g);
          }
        });
      });
    }
    function paint() {
      $$('[data-l]', root).forEach((n) => {
        const i = +n.dataset.l;
        n.classList.toggle('now', i === st.line);
        n.classList.toggle('run', st.line >= 0 && i < st.line);
        n.classList.toggle('wait', st.line >= 0 && i > st.line);
      });
      $$('[data-tool]', root).forEach((n) => { n.classList.toggle('used', st.used.has(n.dataset.tool)); n.classList.toggle('now', st.tool === n.dataset.tool); });
      $$('[data-part]', root).forEach((n) => {
        n.classList.toggle('hide', !st.parts.has(n.dataset.part));
        n.classList.toggle('new', st.clones.has(n.dataset.part) && st.line >= 0 && st.line < GN_CTX);
        n.classList.toggle('clone', st.clones.has(n.dataset.part));
        $('[data-clone]', n).style.display = st.clones.has(n.dataset.part) && st.line < GN_CTX && st.line >= 0 ? '' : 'none';
      });
      $$('[data-con]', root).forEach((n) => {
        const on = n.dataset.con === 'b' ? st.boundary : st.conns;
        if (on && n.classList.contains('hide')) { n.classList.remove('hide'); if (!reduced() && st.line >= 0) n.classList.add('draw'); }
        if (!on) { n.classList.add('hide'); n.classList.remove('draw'); }
      });
      drawPorts();
      $('.gn-con', root).innerHTML = st.con.map(([c, t]) => `<span class="${c}">${esc(t)}</span>`).join('\n');
    }
    async function run() {
      const my = ++token;
      Object.assign(st, { line: -1, parts: new Set(), clones: new Set(), used: new Set(), tool: null, ports: null, conns: false, boundary: false, con: [] });
      $('[data-run]', root).disabled = true;
      paint();
      for (let i = 0; i < GN_LINES.length; i++) {
        if (my !== token) return;
        const ln = GN_LINES[i];
        st.line = i;
        st.tool = ln.tool || null;
        if (ln.tool) st.used.add(ln.tool);
        (ln.parts || []).forEach((p) => st.parts.add(p));
        if (ln.clone) st.clones.add(ln.clone);
        if (ln.ports) st.ports = ln.ports;
        if (ln.conns) st.conns = true;
        if (ln.boundary) st.boundary = true;
        paint();
        await wait(!ln.t ? 120 : ln.tool ? 900 : 330);
      }
      st.line = GN_LINES.length;
      st.tool = null;
      paint();
      for (const c of consoleLines()) {
        if (my !== token) return;
        st.con.push(c);
        paint();
        await wait(c[0] === 'p' ? 650 : 380);
      }
      $('[data-run]', root).disabled = false;
      $('[data-run]', root).textContent = '↻ ' + L('Run it again', 'Relancer');
    }
    function showDone() {
      Object.assign(st, { line: GN_LINES.length, parts: new Set(Object.keys(lay)), clones: new Set(['mc', 'zs', 'sm', 'pm']), used: new Set(GN_TOOLS.map((t) => t[0])), tool: null, ports: 'one', conns: true, boundary: true, con: consoleLines() });
      paint();
    }
    render();
    window.addEventListener('article-lang', () => { const done = st.line >= GN_LINES.length; render(); if (done) showDone(); });
    if (!reduced()) whenSeen(root, run);
    else showDone();
  }

  /* ════════════════ figure 5: the validator ════════════════ */
  const VF_ROWS = [
    { t: { en: 'Kotlin compilation', fr: 'Compilation Kotlin' }, d: { en: 'the API is used right, no reference is lost', fr: 'l’API est bien utilisée, aucune référence n’est perdue' } },
    { t: { en: 'Method rules on the description, before writing', fr: 'Règles de méthode sur la description, avant écriture' }, d: { en: 'every mode has one owner, every decision one decider', fr: 'chaque mode a un seul propriétaire, chaque décision un seul décideur' } },
    { t: { en: 'Idempotence', fr: 'Idempotence' }, d: { en: 'a second plan gives 0 change', fr: 'un second plan donne 0 changement' } },
    { t: { en: 'SysML validation in Cameo, plugin checks', fr: 'Validation SysML de Cameo, contrôles du plugin' }, d: { en: 'on the model read back: typed ports, routes of the signals', fr: 'sur le modèle relu : ports typés, routes des signaux' } },
    { t: { en: 'Traceability and completeness', fr: 'Traçabilité et complétude' }, d: { en: '«refine», «allocate», «satisfy» in place; every functional scenario has its white-box replay', fr: '«refine», «allocate», «satisfy» en place ; chaque scénario fonctionnel a son rejeu boîte blanche' } },
    { t: { en: 'Simulation: the full scenario, white box', fr: 'Simulation : le scénario complet, boîte blanche' }, d: { en: '10 events, the expected state of every part after each one', fr: '10 événements, l’état attendu de chaque part après chacun' }, sim: true },
    { t: { en: 'Coverage', fr: 'Couverture' }, d: { en: 'every state of every component reached', fr: 'chaque état de chaque composant atteint' }, cov: true }
  ];
  const EV_SHORT = [
    { en: 'Power on', fr: 'Mise sous tension' }, { en: 'Bad plan', fr: 'Plan refusé' }, { en: 'Good plan', fr: 'Plan accepté' }, { en: 'Start', fr: 'Départ' },
    { en: 'Flock seen', fr: 'Troupeau vu' }, { en: 'Sheep out', fr: 'Brebis sortie' }, { en: 'Bear in', fr: 'Ours détecté' }, { en: 'Too close', fr: 'Trop près' },
    { en: 'Backs off', fr: 'Recule' }, { en: 'Bear gone', fr: 'Ours parti' }
  ];

  function replay(arch, opts) {
    const sim = ENGINE.create(arch, opts || {});
    const reached = new Set();
    const see = () => sim.paths().forEach((p) => sim.states(p).forEach((s) => reached.add(p + '/' + s)));
    see();
    const out = steps(arch).map((stp) => {
      const ev = sim.inject(stp.signal, stp.into);
      ev.filter((e) => e.kind === 'state').forEach((e) => e.states.forEach((s) => reached.add(e.path + '/' + s)));
      see();
      const ko = sim.check(stp.expect).filter((c) => !c.ok).map((c) => ({ path: c.path, want: c.want, have: sim.leaves(c.path) }));
      return { signal: stp.signal, msgs: ev.filter((e) => e.kind === 'msg'), ko };
    });
    let total = 0, hit = 0;
    const drop = (opts && opts.drop) || {};
    arch.soi.parts.forEach((p) => {
      const blk = blockOf(arch, p.type);
      if (!blk) return;
      allStates(blk).filter((s) => (drop[blk.name] || []).indexOf(s) < 0).forEach((s) => { total++; if (reached.has('soi.' + p.name + '/' + s)) hit++; });
    });
    return { steps: out, total, hit };
  }

  function verifyFigure(root) {
    const arch = ARCHS && ARCHS['2'];
    if (!arch || !ENGINE) { root.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; return; }
    const cut = rawStage();
    const before = bill(arch, cut), after = bill(arch);
    const label = (path) => { const id = path.replace('soi.', ''); return (CONF && CONF.parts && CONF.parts[id] && CONF.parts[id].label) || id; };
    const st = { iter: 0, rows: VF_ROWS.map(() => ''), ev: [], ko: [], cov: '', verdict: '', diag: false, busy: false };
    let token = 0;

    function render() {
      root.innerHTML = `<ol class="vf-rows">${VF_ROWS.map((r, i) => `<li data-r="${i}"><span class="mk"></span><span><b>${esc(tr(r.t))}</b><small>${esc(tr(r.d))}</small>${r.sim ? '<ul class="vf-ev"></ul><div class="vf-ko"></div>' : ''}${r.cov ? '<small data-cov></small>' : ''}</span></li>`).join('')}</ol>
        <div class="vf-foot"><span><span class="label">${L('Verdict', 'Verdict')}</span><span class="vf-verdict" aria-live="polite"></span> <small data-iter></small></span>
        <div class="btn-row"><button type="button" class="btn" data-go>▶ ${L('Run the validator', 'Lancer le validateur')}</button><button type="button" class="btn" data-fix hidden>${L('Fix the generator, then plan, apply, replay', 'Corriger le générateur, puis plan, apply, rejouer')}</button><button type="button" class="btn ghost" data-reset>↻</button></div></div>
        <div class="vf-diag" hidden>
          <h4>${L('Who is wrong: the scenario, or the architecture?', 'Qui a tort : le scénario, ou l’architecture ?')}</h4>
          <p>${L('The expectations come from the lifecycle scenario: while a bear is tracked, the flock watch is suspended; when it is gone, the drone goes back to its watch path. Nobody tells <i>SheepMonitoring</i>, nobody hands the <i>AutoPilot</i> back. <b>The architecture is wrong.</b> The fix goes into the generator, not into the model, and certainly not into the scenario.', 'Les attendus viennent du scénario du cycle de vie : tant qu’un ours est suivi, la garde du troupeau est suspendue ; quand il est parti, le drone reprend son chemin de ronde. Personne ne prévient <i>SheepMonitoring</i>, personne ne rend l’<i>AutoPilot</i>. <b>C’est l’architecture qui a tort.</b> Le correctif va dans le générateur, pas dans le modèle, et surtout pas dans le scénario.')}</p>
<pre class="code"><code><span class="add">+   signals(sm) {
+       input(fn.signal("Deactivate Sheep Monitoring"), port = "p_PredatorManagement")
+       input(fn.signal("Reactivate Sheep Monitoring"), port = "p_PredatorManagement")
+   }
+   signals(ap) {
+       input(fn.signal("Resume Patrolling"), port = "p_PredatorManagement")
+   }</span></code></pre>
          <p class="fig-note">${L('The next plan', 'Le plan suivant')} : CREATE ${after.states - before.states} ${L('state', 'état')} · ${after.ports - before.ports} ports · ${after.ports - before.ports} interfaces · ${after.flows - before.flows} ${L('flow properties', 'propriétés de flux')} · ${after.conns - before.conns} ${L('connector', 'connecteur')}. ${L('Nothing else moves.', 'Rien d’autre ne bouge.')}</p>
        </div>`;
      $('[data-go]', root).addEventListener('click', () => runIter(1));
      $('[data-fix]', root).addEventListener('click', () => runIter(2));
      $('[data-reset]', root).addEventListener('click', reset);
      paint();
    }
    function paint() {
      $$('[data-r]', root).forEach((li) => {
        const s = st.rows[+li.dataset.r];
        li.className = s;
        $('.mk', li).textContent = s === 'ok' ? '✓' : s === 'ko' ? '✗' : s === 'skip' ? '–' : s === 'run' ? '…' : '';
      });
      const evs = $('.vf-ev', root);
      evs.innerHTML = st.ev.map((e, i) => `<li class="${e}">${esc(tr(EV_SHORT[i]))}</li>`).join('');
      $('.vf-ko', root).innerHTML = st.ko.map((k) => `${esc(k.ev)} : ${esc(label(k.path))} ${L('should be in', 'devrait être en')} <b>${esc(k.want.join(', '))}</b>, ${L('it is in', 'il est en')} ${esc(k.have.join(', '))}`).join('<br>');
      $('[data-cov]', root).textContent = st.cov;
      const v = $('.vf-verdict', root);
      v.textContent = st.verdict || '—';
      v.className = 'vf-verdict' + (st.verdict === 'PASS' ? ' pass' : st.verdict === 'FAIL' ? ' fail' : '');
      $('[data-iter]', root).textContent = st.iter ? `${L('iteration', 'itération')} ${st.iter}` : '';
      $('.vf-diag', root).hidden = !st.diag;
      $('[data-fix]', root).hidden = !(st.diag && !st.busy && st.iter === 1);
      $('[data-go]', root).hidden = st.iter > 0;
      $('[data-go]', root).disabled = st.busy;
    }
    async function runIter(n) {
      const my = ++token;
      Object.assign(st, { iter: n, rows: VF_ROWS.map(() => ''), ev: [], ko: [], cov: '', verdict: '', diag: n === 2 ? false : st.diag, busy: true });
      if (n === 1) st.diag = false;
      paint();
      const res = replay(arch, n === 1 ? cut : null);
      for (let i = 0; i < VF_ROWS.length; i++) {
        if (my !== token) return;
        const row = VF_ROWS[i];
        st.rows[i] = 'run';
        paint();
        if (row.sim) {
          for (let j = 0; j < res.steps.length; j++) {
            await wait(240);
            if (my !== token) return;
            const s = res.steps[j];
            st.ev.push(s.ko.length ? 'ko' : 'ok');
            s.ko.forEach((k) => st.ko.push(Object.assign({ ev: tr(EV_SHORT[j]) }, k)));
            paint();
          }
          st.rows[i] = st.ko.length ? 'ko' : 'ok';
        } else if (row.cov) {
          await wait(400);
          if (st.ko.length) { st.rows[i] = 'skip'; st.cov = L('not evaluated: a scenario fails', 'non évaluée : un scénario échoue'); } else {
            st.rows[i] = res.hit === res.total ? 'ok' : 'ko';
            st.cov = `${res.hit} / ${res.total} ${L('states reached', 'états atteints')}`;
          }
        } else {
          await wait(n === 2 ? 180 : 380);
          st.rows[i] = 'ok';
        }
        if (my !== token) return;
        paint();
      }
      st.verdict = st.rows.some((r) => r === 'ko') ? 'FAIL' : st.rows.some((r) => r === 'skip') ? 'INCOMPLETE' : 'PASS';
      st.busy = false;
      if (n === 1 && st.verdict !== 'PASS') { await wait(500); st.diag = true; }
      paint();
    }
    function reset() {
      token++;
      Object.assign(st, { iter: 0, rows: VF_ROWS.map(() => ''), ev: [], ko: [], cov: '', verdict: '', diag: false, busy: false });
      paint();
    }
    render();
    window.addEventListener('article-lang', render);
    if (!reduced()) whenSeen(root, () => runIter(1));
  }

  /* ════════════════ figure 6: the metrics ════════════════ */
  function measure(arch) {
    const tech = (CONF && CONF.stages && CONF.stages.tech) || ['mi', 'mc', 'bsrc', 'ap'];
    const r = replay(arch);
    const inbound = {};
    let msgs = 0, woken = 0, chain = { n: 0, i: 0 };
    r.steps.forEach((s, i) => {
      msgs += s.msgs.length;
      if (s.msgs.length > chain.n) chain = { n: s.msgs.length, i };
      const to = new Set();
      s.msgs.forEach((m) => { if (m.to.indexOf('soi.') === 0) { inbound[m.to] = (inbound[m.to] || 0) + 1; to.add(m.to); } });
      woken += to.size;
    });
    let hub = { n: 0, part: '' };
    Object.keys(inbound).forEach((p) => { const id = p.replace('soi.', ''); if (tech.indexOf(id) < 0 && inbound[p] > hub.n) hub = { n: inbound[p], part: id }; });
    const checks = steps(arch).reduce((n, s) => n + Object.keys(s.expect || {}).length, 0);
    const failed = r.steps.reduce((n, s) => n + s.ko.length, 0);
    return { msgs, chain, hub, woken: woken / r.steps.length, checks, okc: checks - failed, hit: r.hit, total: r.total, per: r.steps.map((s) => s.msgs.length) };
  }
  const MT = [
    { id: 'msgs', n: { en: 'Messages', fr: 'Messages' }, v: (m) => m.msgs, low: true,
      say: { en: 'Messages exchanged to play the full scenario. Each one is an interface to maintain, and a delay.', fr: 'Messages échangés pour jouer le scénario complet. Chacun est une interface à maintenir, et un délai.' } },
    { id: 'chain', n: { en: 'Longest reaction', fr: 'Plus longue réaction' }, v: (m) => m.chain.n, low: true, at: (m) => tr(EV_SHORT[m.chain.i]),
      say: { en: 'Messages triggered by a single event: the length of the chain behind a response-time MOP.', fr: 'Messages déclenchés par un seul événement : la longueur de la chaîne derrière un MOP de temps de réaction.' } },
    { id: 'hub', n: { en: 'Busiest component', fr: 'Composant le plus sollicité' }, v: (m) => m.hub.n, low: true, at: (m) => (CONF && CONF.parts[m.hub.part] ? CONF.parts[m.hub.part].label : m.hub.part),
      say: { en: 'Messages received by the busiest feature component: where a single point of failure shows.', fr: 'Messages reçus par le composant métier le plus sollicité : c’est là que se voit un point unique de défaillance.' } },
    { id: 'woken', n: { en: 'Components per event', fr: 'Composants par événement' }, v: (m) => Math.round(m.woken * 10) / 10, low: true,
      say: { en: 'Components that receive something, per event, on average: the coupling, seen in motion.', fr: 'Composants qui reçoivent quelque chose, par événement, en moyenne : le couplage, vu en mouvement.' } },
    { id: 'checks', n: { en: 'Expected states held', fr: 'États attendus tenus' }, v: (m) => m.okc, of: (m) => m.checks,
      say: { en: 'The verdict, as a measure: every expected state of every step, held. The central orchestrator is checked on more parts, because more parts move.', fr: 'Le verdict, comme mesure : chaque état attendu de chaque étape, tenu. L’orchestrateur central est contrôlé sur plus de parts, parce que plus de parts bougent.' } },
    { id: 'states', n: { en: 'States reached', fr: 'États atteints' }, v: (m) => m.hit, of: (m) => m.total,
      say: { en: 'Coverage: every state of every component is reached at least once by the full scenario.', fr: 'La couverture : chaque état de chaque composant est atteint au moins une fois par le scénario complet.' } }
  ];

  function metricsFigure(root) {
    if (!ARCHS || !ENGINE || !KEYS.every((k) => ARCHS[k])) { root.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; return; }
    const M = {};
    KEYS.forEach((k) => { M[k] = measure(ARCHS[k]); });
    const st = { m: 0, shown: false };
    const fmt = (v) => (Number.isInteger(v) ? num(v) : v.toLocaleString(isFr() ? 'fr-FR' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

    function render() {
      root.innerHTML = `<div class="fig-bar"><div class="seg" role="group" aria-label="${L('Measure', 'Mesure')}">${MT.map((m, i) => `<button type="button" data-m="${i}" aria-pressed="false">${esc(tr(m.n))}</button>`).join('')}</div></div>
        <div class="mt-bars">${KEYS.map((k) => `<div class="mt-bar k${k}" data-k="${k}"><span class="l"><i></i>${esc(tr(ARCH_NAME[k]))}</span><span class="t"><i></i></span><span class="v"></span></div>`).join('')}</div>
        <p class="mt-note" aria-live="polite"></p>
        <p class="mt-ev-title">${L('Messages per event of the scenario', 'Messages par événement du scénario')}</p>
        <div class="mt-ev"><div class="tip" role="status"></div></div>
        <div class="mt-legend">${KEYS.map((k) => `<span class="k${k}"><i></i>${esc(tr(ARCH_NAME[k]))}</span>`).join('')}</div>
        <details class="mt-table"><summary>${L('The numbers, as a table', 'Les chiffres, en tableau')}</summary><table><thead><tr><th>${L('Measure', 'Mesure')}</th>${KEYS.map((k) => `<th>${esc(tr(ARCH_NAME[k]))}</th>`).join('')}</tr></thead><tbody>${MT.map((m) => `<tr><td>${esc(tr(m.n))}</td>${KEYS.map((k) => `<td>${fmt(m.v(M[k]))}${m.of ? ' / ' + m.of(M[k]) : ''}${m.at ? ' (' + esc(m.at(M[k])) + ')' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
      $$('[data-m]', root).forEach((b) => b.addEventListener('click', () => { st.m = +b.dataset.m; paint(); }));
      drawEvents();
      paint();
    }
    function paint() {
      const m = MT[st.m];
      $$('[data-m]', root).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.m === st.m)));
      const vals = KEYS.map((k) => m.v(M[k]));
      const max = m.of ? Math.max.apply(null, KEYS.map((k) => m.of(M[k]))) : Math.max.apply(null, vals);
      $$('.mt-bar', root).forEach((row) => {
        const k = row.dataset.k, v = m.v(M[k]);
        const w = m.of ? v / m.of(M[k]) : v / max;
        $('.t i', row).style.width = st.shown ? Math.round(100 * w) + '%' : '0%';
        $('.v', row).textContent = fmt(v) + (m.of ? ' / ' + m.of(M[k]) : '');
      });
      let note = tr(m.say);
      if (m.low) {
        const lo = KEYS.reduce((a, k) => (m.v(M[k]) < m.v(M[a]) ? k : a), KEYS[0]);
        const hi = KEYS.reduce((a, k) => (m.v(M[k]) > m.v(M[a]) ? k : a), KEYS[0]);
        note += ` <b>${L('Lowest', 'Le plus bas')} : ${esc(tr(ARCH_NAME[lo]))}</b> (${fmt(m.v(M[lo]))}${m.at ? ', ' + esc(m.at(M[lo])) : ''}) · ${L('highest', 'le plus haut')} : ${esc(tr(ARCH_NAME[hi]))} (${fmt(m.v(M[hi]))}${m.at ? ', ' + esc(m.at(M[hi])) : ''}).`;
      }
      $('.mt-note', root).innerHTML = note;
    }
    function drawEvents() {
      const host = $('.mt-ev', root);
      const tip = $('.tip', host);
      const n = M['1'].per.length, W = 640, H = 190, x0 = 26, y0 = 12, ph = 120, gw = (W - x0) / n;
      const vmax = Math.max.apply(null, KEYS.map((k) => Math.max.apply(null, M[k].per)));
      const top = Math.ceil(vmax / 4) * 4;
      const s = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': L('Messages per event, for the three candidates', 'Messages par événement, pour les trois candidates') });
      for (let v = 0; v <= top; v += 4) {
        const y = y0 + ph - (v / top) * ph;
        el('line', { x1: x0, x2: W, y1: y, y2: y, class: 'ax' }, s);
        el('text', { x: x0 - 6, y: y + 3.5, 'text-anchor': 'end', class: 'tick' }, s, v);
      }
      const bw = Math.min(12, (gw - 16) / 3);
      for (let i = 0; i < n; i++) {
        const gx = x0 + i * gw;
        const col = el('g', { class: 'col' }, s);
        el('rect', { x: gx + 2, y: y0, width: gw - 4, height: ph, class: 'bg', rx: 4 }, col);
        KEYS.forEach((k, j) => {
          const v = M[k].per[i], h = (v / top) * ph;
          const x = gx + gw / 2 - (3 * bw + 4) / 2 + j * (bw + 2);
          el('path', { d: roundTop(x, y0 + ph - h, bw, h, 3), class: 'm k' + k, style: `fill:var(--a${k})` }, col);
        });
        wrap(tr(EV_SHORT[i]), 9).forEach((ln, li) => el('text', { x: gx + gw / 2, y: y0 + ph + 16 + li * 12, 'text-anchor': 'middle', class: 'lab' }, col, ln));
        const hit = el('rect', { x: gx, y: 0, width: gw, height: H, class: 'hit' }, col);
        const show = () => {
          $$('.col', s).forEach((c) => c.classList.toggle('hl', c === col));
          tip.innerHTML = `<b>${esc(tr(EV_SHORT[i]))}</b><br>${KEYS.map((k) => `${esc(tr(ARCH_NAME[k]))} : ${M[k].per[i]}`).join('<br>')}`;
          const r = host.getBoundingClientRect(), b = hit.getBoundingClientRect();
          tip.style.left = Math.min(Math.max(b.left - r.left + b.width / 2, 80), r.width - 80) + 'px';
          tip.style.top = (y0 / H) * r.height + 'px';
          tip.classList.add('on');
        };
        hit.addEventListener('mouseenter', show);
        hit.addEventListener('click', show);
      }
      s.addEventListener('mouseleave', () => { tip.classList.remove('on'); $$('.col', s).forEach((c) => c.classList.remove('hl')); });
      host.appendChild(s);
    }
    render();
    window.addEventListener('article-lang', render);
    const show = () => { st.shown = true; paint(); };
    if (reduced()) show(); else whenSeen(root, show);
  }

  /* ════════════════ figure 7: the swarm ════════════════ */
  /* option A of part4/content/config.js (swarm.options[0].scenario): [delay ms, drone, state] */
  const SW_A = [
    [600, 'D1', 'Ready for Mission'], [150, 'D2', 'Ready for Mission'], [150, 'D3', 'Ready for Mission'],
    [900, 'D1', 'Going to Safe Area'], [250, 'D2', 'Going to Safe Area'], [250, 'D3', 'Going to Safe Area'],
    [3200, 'D1', 'Patrolling'], [200, 'D2', 'Patrolling'], [200, 'D3', 'Patrolling'],
    [2500, 'D1', 'Tracking stray sheep'],
    [2200, 'D3', 'Predator tracking'],
    [3000, 'D1', 'Patrolling'],
    [1500, 'D3', 'Predator counteraction'],
    [4500, 'D3', 'Returning to base']
  ];
  const SW_SAY = {
    0: { en: 'Three Wardens on the ground. The base station is the master.', fr: 'Trois Wardens au sol. La station sol est le maître.' },
    3: { en: 'The swarm deploys to the safe area.', fr: 'L’essaim se déploie vers la zone de sécurité.' },
    8: { en: 'On patrol: three drones around the flock.', fr: 'En patrouille : trois drones autour du troupeau.' },
    9: { en: 'A sheep strays: the base sends D1 after it.', fr: 'Une brebis s’écarte : la base envoie D1 la suivre.' },
    10: { en: 'A bear: the base sends D3. D2 stays on the flock.', fr: 'Un ours : la base envoie D3. D2 reste sur le troupeau.' },
    11: { en: 'The sheep is back: D1 returns to the flock.', fr: 'La brebis est revenue : D1 retourne au troupeau.' },
    12: { en: 'The bear comes too close: light and sound.', fr: 'L’ours approche trop : lumière et son.' },
    13: { en: 'The bear is gone: D3 flies back to base.', fr: 'L’ours est parti : D3 rentre à la base.' }
  };
  const SW_POS = {
    base: { D1: [74, 222], D2: [104, 238], D3: [134, 222] },
    'Going to Safe Area': { D1: [196, 168], D2: [214, 196], D3: [232, 168] },
    Patrolling: { D1: [300, 74], D2: [222, 196], D3: [378, 196] },
    'Tracking stray sheep': { D1: [470, 86] },
    'Predator tracking': { D3: [548, 196] },
    'Predator counteraction': { D3: [520, 214] }
  };
  const SW_OPTS = [
    { code: 'A', n: { en: 'The base leads 3 complete drones', fr: 'La base mène 3 drones complets' },
      pro: { en: ['Any drone can replace any other', 'One design to build and maintain'], fr: ['Tout drone remplace n’importe quel autre', 'Un seul modèle à concevoir et maintenir'] },
      con: { en: ['Every drone carries every sensor: heavy, short endurance', 'Everything depends on the radio link'], fr: ['Chaque drone porte tous les capteurs : lourd, faible endurance', 'Tout dépend de la liaison radio'] },
      tag: { en: 'played in this figure', fr: 'jouée dans cette figure' } },
    { code: 'B', n: { en: 'The base leads 3 specialised drones', fr: 'La base mène 3 drones spécialisés' },
      pro: { en: ['Scout, Herder, Ranger: lighter, longer flights', 'One state machine per role'], fr: ['Scout, Herder, Ranger : plus légers, vols plus longs', 'Une machine d’états par rôle'] },
      con: { en: ['If the Ranger is down, nobody repels the bear'], fr: ['Si le Ranger tombe, personne ne repousse l’ours'] },
      tag: { en: 'next for the LLM', fr: 'prochaine pour le LLM' } },
    { code: 'C', n: { en: 'A drone leads the others', fr: 'Un drone mène les autres' },
      pro: { en: ['Keeps working when the base link is lost', 'Decisions close to the action'], fr: ['Continue quand la liaison avec la base est perdue', 'Décisions au plus près de l’action'] },
      con: { en: ['The master needs a successor: a new behaviour to design'], fr: ['Le maître doit avoir un successeur : un nouveau comportement à concevoir'] },
      tag: { en: 'next for the LLM', fr: 'prochaine pour le LLM' } }
  ];

  function swarmFigure(root) {
    const BASE = '../../assets/sim/';
    const times = [];
    SW_A.reduce((t, e) => { times.push(t + e[0]); return t + e[0]; }, 0);
    const T = times[times.length - 1] + 1500;
    const st = { i: -1, state: { D1: 'base', D2: 'base', D3: 'base' }, hist: [[0, 0]], t: 0 };
    let token = 0;
    const onFlock = () => ['D1', 'D2', 'D3'].filter((d) => st.state[d] === 'Patrolling').length;
    const firstPatrol = times[SW_A.findIndex((e) => e[2] === 'Patrolling')];

    function render() {
      root.innerHTML = `<div class="fig-bar"><button type="button" class="btn" data-play>▶ ${L('Play the scenario', 'Jouer le scénario')}</button></div>
        <div class="sw-scene"><div class="sw-cap" aria-live="polite"></div></div>
        <div class="sw-chart"></div>
        <div class="kinds"><div><b data-min>–</b><span>${L('drones on the flock at the worst moment of the mission (rule: at least 1)', 'drones sur le troupeau au pire moment de la mission (règle : au moins 1)')}</span></div>
          <div><b>2</b><span>${L('events at once: a stray sheep and a bear', 'événements à la fois : une brebis égarée et un ours')}</span></div>
          <div><b>3</b><span>${L('identical drones, the master on the ground', 'drones identiques, le maître au sol')}</span></div>
          <div><b data-now>–</b><span>${L('drones on the flock right now', 'drones sur le troupeau en ce moment')}</span></div></div>
        <div class="sw-opts">${SW_OPTS.map((o, i) => `<div class="sw-opt${i === 0 ? ' on' : ''}"><b>${o.code} · ${esc(tr(o.n))}</b><ul>${tr(o.pro).map((p) => `<li class="pro">${esc(p)}</li>`).join('')}${tr(o.con).map((p) => `<li class="con">${esc(p)}</li>`).join('')}</ul><span class="tag">${esc(tr(o.tag))}</span></div>`).join('')}</div>`;
      const s = el('svg', { viewBox: '0 0 640 290', role: 'img', 'aria-label': L('The pasture, the flock and three drones', 'Le pâturage, le troupeau et trois drones') });
      el('rect', { x: 0, y: 0, width: 640, height: 290, class: 'sw-grass' }, s);
      el('circle', { cx: 300, cy: 150, r: 100, class: 'sw-zone' }, s);
      el('text', { x: 300, y: 270, 'text-anchor': 'middle', class: 'sw-zone-t' }, s, L('SAFE AREA', 'ZONE DE SÉCURITÉ'));
      el('image', { href: BASE + 'BaseStation.svg', x: 18, y: 236, width: 48, height: 48 }, s);
      [[285, 140], [312, 128], [330, 152], [296, 166], [268, 156], [318, 174], [342, 132]].forEach(([x, y]) => el('image', { href: BASE + 'sheep.svg', x: x - 13, y: y - 11, width: 26, height: 22 }, s));
      const stray = el('g', { class: 'sw-actor hide', 'data-actor': 'stray', style: 'transform: translate(500px, 66px)' }, s);
      el('image', { href: BASE + 'sheep.svg', x: -13, y: -11, width: 26, height: 22 }, stray);
      const bear = el('g', { class: 'sw-actor bear hide', 'data-actor': 'bear', style: 'transform: translate(612px, 252px)' }, s);
      el('image', { href: BASE + 'bear.svg', x: -24, y: -20, width: 48, height: 40 }, bear);
      el('circle', { cx: 0, cy: 0, r: 6, class: 'sw-burst' }, bear);
      ['D1', 'D2', 'D3'].forEach((d) => {
        const g = el('g', { class: 'sw-drone', 'data-drone': d }, s);
        el('circle', { cx: 0, cy: 0, r: 25, class: 'ring' }, g);
        el('image', { href: BASE + 'Drone-without-circle.svg', x: -18, y: -18, width: 36, height: 36 }, g);
        el('text', { x: 0, y: 32, 'text-anchor': 'middle' }, g, d);
        el('text', { x: 0, y: 43, 'text-anchor': 'middle', class: 's', 'data-s': '' }, g, '');
      });
      $('.sw-scene', root).appendChild(s);
      $('[data-play]', root).addEventListener('click', play);
      paint(true);
    }
    function posOf(d) {
      const s = st.state[d];
      if (s === 'base' || s === 'Ready for Mission' || s === 'Returning to base') return SW_POS.base[d];
      return (SW_POS[s] && SW_POS[s][d]) || SW_POS.Patrolling[d];
    }
    function stateLabel(s) {
      return s === 'base' ? '' : s;
    }
    function paint(instant) {
      ['D1', 'D2', 'D3'].forEach((d) => {
        const g = $(`[data-drone="${d}"]`, root);
        const [x, y] = posOf(d);
        if (instant) g.style.transition = 'none';
        g.style.transform = `translate(${x}px, ${y}px)`;
        if (instant) { g.getBoundingClientRect(); g.style.transition = ''; }
        const s = st.state[d];
        g.classList.toggle('guard', s === 'Patrolling');
        g.classList.toggle('away', /Tracking|Predator/.test(s));
        $('[data-s]', g).textContent = stateLabel(s);
      });
      const strayOn = st.state.D1 === 'Tracking stray sheep';
      $('[data-actor="stray"]', root).classList.toggle('hide', !strayOn);
      const b = st.state.D3;
      const bear = $('[data-actor="bear"]', root);
      bear.classList.toggle('hide', !/Predator/.test(b));
      bear.style.transform = b === 'Predator counteraction' ? 'translate(574px, 236px)' : 'translate(600px, 248px)';
      const said = Object.keys(SW_SAY).map(Number).filter((k) => k <= st.i).pop();
      $('.sw-cap', root).textContent = said != null ? tr(SW_SAY[said]) : L('Press play: two events at once, one rule.', 'Lancez : deux événements à la fois, une règle.');
      $('[data-now]', root).textContent = st.i >= 0 ? onFlock() : '–';
      const after = st.hist.filter(([t]) => t >= firstPatrol);
      $('[data-min]', root).textContent = after.length && st.t >= firstPatrol + 600 ? Math.min.apply(null, after.map((h) => h[1])) + ' ✓' : '–';
      drawChart();
    }
    function drawChart() {
      const host = $('.sw-chart', root);
      host.innerHTML = '';
      const W = 640, H = 118, x0 = 26, y0 = 10, ph = 74;
      const X = (t) => x0 + (t / T) * (W - x0 - 6), Y = (v) => y0 + ph - (v / 3) * ph;
      const s = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': L('Drones on the flock over time', 'Drones sur le troupeau au fil du temps') });
      [0, 1, 2, 3].forEach((v) => { el('line', { x1: x0, x2: W - 6, y1: Y(v), y2: Y(v), class: 'ax' }, s); el('text', { x: x0 - 6, y: Y(v) + 3.5, 'text-anchor': 'end', class: 'tick' }, s, v); });
      el('line', { x1: X(firstPatrol), x2: W - 6, y1: Y(1), y2: Y(1), class: 'rule' }, s);
      el('text', { x: W - 8, y: Y(1) - 4, 'text-anchor': 'end', class: 'rule-t' }, s, L('rule: ≥ 1 on the flock', 'règle : ≥ 1 sur le troupeau'));
      [[9, { en: 'sheep', fr: 'brebis' }], [10, { en: 'bear', fr: 'ours' }], [12, { en: 'deter', fr: 'dissuasion' }]].forEach(([i, t]) => {
        if (i > st.i) return;
        const x = X(times[i]);
        el('line', { x1: x, x2: x, y1: y0, y2: y0 + ph, class: 'evl' }, s);
        el('text', { x: x + 3, y: y0 + ph + 14, class: 'ev' }, s, tr(t));
      });
      if (st.hist.length) {
        let d = '';
        st.hist.forEach(([t, v], j) => { d += (j ? ` H${X(t)} V${Y(v)}` : `M${X(t)} ${Y(v)}`); });
        d += ` H${X(st.t)}`;
        el('path', { d, class: 'ln' }, s);
      }
      host.appendChild(s);
    }
    async function play() {
      const my = ++token;
      Object.assign(st, { i: -1, state: { D1: 'base', D2: 'base', D3: 'base' }, hist: [[0, 0]], t: 0 });
      $('[data-play]', root).disabled = true;
      paint(true);
      for (let i = 0; i < SW_A.length; i++) {
        await wait(SW_A[i][0] * 0.8);
        if (my !== token) return;
        st.i = i;
        st.state[SW_A[i][1]] = SW_A[i][2];
        st.t = times[i];
        if (onFlock() !== st.hist[st.hist.length - 1][1]) st.hist.push([st.t, onFlock()]);
        if (SW_A[i][2] === 'Predator counteraction') {
          const burst = $('.sw-burst', root);
          burst.classList.remove('on'); burst.getBoundingClientRect(); burst.classList.add('on');
        }
        paint();
      }
      await wait(1200);
      if (my !== token) return;
      st.t = T;
      paint();
      $('[data-play]', root).disabled = false;
      $('[data-play]', root).textContent = '↻ ' + L('Play it again', 'Rejouer');
    }
    render();
    window.addEventListener('article-lang', () => { render(); });
    if (!reduced()) whenSeen(root, play);
  }

  const FIGS = { 'ia-thread': threadFigure, 'ia-mission': missionFigure, 'ia-drivers': driversFigure, 'ia-gen': genFigure, 'ia-verify': verifyFigure, 'ia-metrics': metricsFigure, 'ia-swarm': swarmFigure };
  document.querySelectorAll('[data-fig]').forEach((n) => {
    const f = FIGS[n.dataset.fig];
    if (!f) return;
    try { f(n); } catch (e) { n.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; if (window.console) console.error(e); }
  });
}());
