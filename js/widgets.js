/* Interactive pieces used by the scenes. Each widget is a function
   (element, options, api) that draws itself and may return a clean-up function. */
(function () {
  'use strict';

  const W = (window.WIDGETS = {});
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ───────── helpers ───────── */
  function svg(viewBox, label, cls) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', viewBox);
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', label);
    if (cls) s.setAttribute('class', cls);
    return s;
  }
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, lines, cls, anchor, lh) {
    lines = [].concat(lines);
    const t = el('text', { x, y, 'text-anchor': anchor || 'start', class: cls || '' }, parent);
    if (lines.length === 1) t.textContent = lines[0];
    else lines.forEach((l, i) => { el('tspan', { x, dy: i ? (lh || 12) : 0 }, t).textContent = l; });
    return t;
  }
  const pathD = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');
  function arrow(parent, pts, cls) {
    const g = el('g', { class: cls || '' }, parent);
    const line = el('path', { d: pathD(pts), class: 's-line' }, g);
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    el('path', { d: 'M1,0 L-8,-4.5 L-8,4.5 Z', class: 's-head', transform: `translate(${b[0]},${b[1]}) rotate(${ang})` }, g);
    g._line = line;
    return g;
  }
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  function life() {
    const offs = [];
    return {
      tween(ms, step, done) {
        if (reduced()) { step(1); if (done) done(); return; }
        let raf = 0;
        let t0 = 0;
        const tick = (t) => {
          if (!t0) t0 = t;
          const k = Math.min(1, (t - t0) / ms);
          step(ease(k));
          if (k < 1) raf = requestAnimationFrame(tick); else if (done) done();
        };
        raf = requestAnimationFrame(tick);
        offs.push(() => cancelAnimationFrame(raf));
      },
      loop(fn) {
        let raf = 0;
        let prev = 0;
        const tick = (t) => { const dt = prev ? Math.min(0.05, (t - prev) / 1000) : 0; prev = t; fn(dt); raf = requestAnimationFrame(tick); };
        raf = requestAnimationFrame(tick);
        offs.push(() => cancelAnimationFrame(raf));
      },
      wait(fn, ms) { const id = setTimeout(fn, reduced() ? 0 : ms); offs.push(() => clearTimeout(id)); return id; },
      end() { offs.forEach((f) => f()); offs.length = 0; }
    };
  }
  function drone(parent, scale) {
    const g = el('g', { class: 'drone' }, parent);
    const k = scale || 1;
    [[-7, -7], [7, -7], [-7, 7], [7, 7]].forEach((p) => el('circle', { cx: p[0] * k, cy: p[1] * k, r: 5.2 * k, class: 'drone-rotor' }, g));
    el('rect', { x: -6 * k, y: -6 * k, width: 12 * k, height: 12 * k, rx: 2 * k, class: 'drone-body' }, g);
    return g;
  }
  const move = (g, x, y) => g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
  function pressGroup(buttons, onPick) {
    buttons.forEach((b) => b.addEventListener('click', () => {
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onPick(b);
    }));
  }

  /* ───────── cover ───────── */
  W.cover = function (root, opts, api) {
    const cfg = api.config;
    const last = api.last && api.last !== api.scene.id ? api.scenes.find((s) => s.id === api.last) : null;
    const pts = [[40, 252], [98, 196], [58, 128], [124, 66], [196, 98], [238, 168], [176, 236], [268, 258], [330, 196], [356, 104]];
    const d = pathD(pts);
    const wps = api.chapters.map((c, i) => {
      const p = pts[i];
      const end = i === pts.length - 1;
      const lx = p[0] + (i % 2 ? 13 : -13);
      return `<g data-goto="${c.scenes[0].id}" style="cursor:pointer" role="link" tabindex="0" aria-label="${api.esc(c.code + ' ' + c.title)}"><title>${api.esc(c.title)}</title>
        <circle class="c-wp${end ? ' end' : ''}" cx="${p[0]}" cy="${p[1]}" r="7"/><circle cx="${p[0]}" cy="${p[1]}" r="16" fill="transparent"/>
        <text class="c-lbl" x="${lx}" y="${p[1] + 4}" text-anchor="${i % 2 ? 'start' : 'end'}">${api.esc(c.code)}</text></g>`;
    }).join('');
    const grid = Array.from({ length: 9 }).map((_, i) => `<line class="c-grid" x1="${i * 50}" y1="0" x2="${i * 50}" y2="300"/>`).join('') +
      Array.from({ length: 6 }).map((_, i) => `<line class="c-grid" x1="0" y1="${i * 50 + 25}" x2="400" y2="${i * 50 + 25}"/>`).join('');
    root.innerHTML = `<div class="cover">
      <div class="cover-hero">
        <div style="display:grid;gap:1rem;justify-items:start">
          <span class="cover-kicker">${api.esc(cfg.course)}</span>
          <h1>${api.esc(api.scene.title)}</h1>
          <p class="cover-sub">${api.esc(cfg.part)}, with Catia Magic (ex. Cameo Systems Modeler).</p>
          <p class="cover-authors">${api.esc(cfg.authors.join(' · '))}</p>
          <div class="btn-row">
            <button type="button" class="btn" data-action="start">${api.icon('play')}Start the briefing</button>
            ${last ? `<button type="button" class="btn ghost" data-goto="${last.id}">Resume: ${api.esc(last.title)}</button>` : ''}
          </div>
        </div>
        <div class="cover-art">
          <svg viewBox="0 0 400 300" role="img" aria-label="Map of the guide: a dashed route through ten waypoints, one per chapter. Select a waypoint to jump to its chapter.">
            ${grid}
            <rect class="c-zone" x="300" y="56" width="88" height="96" rx="6"/>
            <path class="c-route" d="${d}"/>
            ${wps}
            <g class="c-drone"></g>
          </svg>
        </div>
      </div>
      <div class="how">
        <div><span class="kind kind-read">${api.icon('eye')}</span><p><b>One scene, one idea</b>Move with Next, the arrow keys, or a swipe on a phone.</p></div>
        <div><span class="kind kind-do">${api.icon('cursor')}</span><p><b>Do it in Cameo</b>Tick each step as you go. Tap a pink chip to see where an element lives in the model.</p></div>
        <div><span class="kind kind-answer">${api.icon('pencil')}</span><p><b>Nothing gets lost</b>Ticks, notes and answers are saved on this device and gathered on a sheet at the end.</p></div>
      </div>
    </div>`;
    const host = root.querySelector('.c-drone');
    const g = drone(host, 1.15);
    const route = root.querySelector('.c-route');
    const L = route.getTotalLength();
    const at = (s) => { const p = route.getPointAtLength(s); move(g, p.x, p.y); };
    at(0);
    if (reduced()) return;
    const lf = life();
    let s = 0;
    lf.loop((dt) => { s = (s + dt * 46) % (L + 60); at(Math.min(s, L)); });
    return lf.end;
  };

  /* ───────── nine diagrams ───────── */
  const D9 = [
    { id: 'req', name: 'Requirement', fam: 'Requirements', g: '<rect x="6" y="5" width="36" height="26"/><path d="M6 13h36M12 19h24M12 25h14"/>' },
    { id: 'uc', name: 'Use case', fam: 'Behavior', used: 'a-use-cases', where: 'chapter A', g: '<ellipse cx="31" cy="18" rx="13" ry="8"/><circle cx="8" cy="9" r="3"/><path d="M8 12v10M3 16h10M8 22l-4 8M8 22l4 8"/>' },
    { id: 'act', name: 'Activity', fam: 'Behavior', used: 'd-create-ad', where: 'chapter D', g: '<rect x="3" y="11" width="16" height="14" rx="6"/><rect x="29" y="11" width="16" height="14" rx="6"/><path d="M19 18h9M25 15l3 3-3 3"/>' },
    { id: 'sd', name: 'Sequence', fam: 'Behavior', used: 'a-create-sd', where: 'chapter A', g: '<rect x="5" y="3" width="14" height="7"/><rect x="29" y="3" width="14" height="7"/><path d="M12 10v23M36 10v23" stroke-dasharray="3 3"/><path d="M12 17h23M32 14l3 3-3 3M36 27H13M16 24l-3 3 3 3"/>' },
    { id: 'stm', name: 'State machine', fam: 'Behavior', also: 'c-goal', where: 'chapter C', g: '<circle cx="6" cy="18" r="3.5" fill="currentColor"/><path d="M10 18h8M15 15l3 3-3 3"/><rect x="19" y="9" width="26" height="18" rx="7"/>' },
    { id: 'bdd', name: 'Block definition', fam: 'Structure', g: '<rect x="16" y="3" width="16" height="10"/><rect x="3" y="23" width="16" height="10"/><rect x="29" y="23" width="16" height="10"/><path d="M24 13v5M11 23v-5h26v5"/>' },
    { id: 'ibd', name: 'Internal block', fam: 'Structure', used: 'context-diagram', where: 'chapter 2', g: '<rect x="3" y="4" width="42" height="28"/><rect x="9" y="12" width="11" height="12"/><rect x="28" y="12" width="11" height="12"/><path d="M20 18h8"/><rect x="18.5" y="16.5" width="3" height="3" fill="currentColor"/><rect x="26.5" y="16.5" width="3" height="3" fill="currentColor"/>' },
    { id: 'par', name: 'Parametric', fam: 'Structure', g: '<rect x="6" y="6" width="36" height="24" rx="9"/><path d="M17 15h14M17 21h14"/>' },
    { id: 'pkg', name: 'Package', fam: 'Structure', g: '<path d="M4 11h40v21H4zM4 11V5h16l3 6"/>' }
  ];
  W.diagrams9 = function (root, opts, api) {
    let k = 0;
    root.className = 'w';
    root.innerHTML = '<div class="d9">' + D9.map((d) => {
      const cls = d.used ? ' used' : d.also ? ' also' : '';
      const tag = d.used ? 'You use it' : d.also ? 'Also in chapter C' : d.fam;
      return `<button type="button" class="d9-tile${cls}" data-id="${d.id}" aria-pressed="false"${d.used ? ` style="--k:${k++}"` : ''}>
        <svg viewBox="0 0 48 36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.g}</svg>
        <b>${d.name}</b><small>${tag}</small></button>`;
    }).join('') + '</div><p class="w-live" aria-live="polite">Four tiles are lit: the four diagrams of this exercise. Tap any tile.</p>';
    const live = root.querySelector('.w-live');
    pressGroup(Array.from(root.querySelectorAll('.d9-tile')), (b) => {
      const d = D9.find((x) => x.id === b.dataset.id);
      const target = d.used || d.also;
      live.innerHTML = `<strong>${d.name} diagram.</strong> ` + (d.used
        ? `One of your four. You meet it in ${d.where}. `
        : d.also ? 'Not in the list of four, but you complete one in chapter C. ' : `A ${d.fam.toLowerCase()} diagram. You will not need it in this exercise. `) +
        (target ? `<button type="button" class="btn ghost small" data-goto="${target}" style="margin-left:.4rem">Show me where</button>` : '');
    });
  };

  /* ───────── three stages ───────── */
  W.stages = function (root) {
    const rows = [
      ['1', 'Operational Analysis', 'Who uses the system and for what: use cases, scenarios, operational context.'],
      ['2', 'Functional Analysis', 'What the system has to do: functions, and the data they exchange.'],
      ['3', 'Physical Analysis', 'What the system is made of: subsystems, and which one carries out each function.']
    ];
    root.innerHTML = '<div class="stages">' + rows.map((r, i) => `<div class="stage-row" style="--k:${i}"><span class="num">${r[0]}</span><div><b>${r[1]}</b><span>${r[2]}</span></div></div>`).join('') + '</div>';
  };

  /* ───────── system of interest ───────── */
  W.scope = function (root) {
    root.className = 'w scope';
    const s = svg('0 0 360 176', 'The System of Interest is the drone, inside a dashed boundary. The Ground Station sits outside the boundary: it is out of scope.');
    el('rect', { x: 150, y: 16, width: 196, height: 144, rx: 14, class: 'soi' }, s);
    txt(s, 248, 36, 'SYSTEM OF INTEREST', 'tag', 'middle').setAttribute('style', 'fill:var(--route);font-weight:700');
    move(drone(s, 1.5), 248, 82);
    txt(s, 248, 124, ['A drone that follows', 'a flight plan autonomously'], 's-name', 'middle', 13);
    el('rect', { x: 12, y: 54, width: 106, height: 58, rx: 8, class: 'out' }, s);
    txt(s, 65, 80, 'Ground Station', 's-name', 'middle');
    txt(s, 65, 98, 'OUT OF SCOPE', 'tag', 'middle').setAttribute('style', 'fill:var(--ink-3)');
    el('path', { d: 'M118,83 H150', class: 's-line s-dash' }, s);
    root.appendChild(s);
  };

  /* ───────── model versus views ───────── */
  W.deleteDemo = function (root, opts, api) {
    const items = [['op', 'Mission Operator', 'actor'], ['gs', 'Ground station', 'block'], ['soi', 'SOI - Pasture Sentinel', 'block']];
    let model;
    let view;
    let sel = null;
    root.className = 'w dd';
    root.innerHTML = `<div class="dd-panes">
        <div class="dd-pane"><h3>Model browser</h3><div class="dd-tree"></div></div>
        <div class="dd-pane"><h3>Diagram view</h3><div class="dd-canvas"></div></div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn small" data-do="delete" disabled>Delete</button>
        <button type="button" class="btn ghost small" data-do="reset">Start again</button>
      </div>
      <p class="w-live" aria-live="polite"></p>`;
    const tree = root.querySelector('.dd-tree');
    const canvas = root.querySelector('.dd-canvas');
    const del = root.querySelector('[data-do="delete"]');
    const live = root.querySelector('.w-live');
    function draw() {
      const b = (pane, it) => `<button type="button" class="dd-el" data-pane="${pane}" data-id="${it[0]}" aria-pressed="${!!sel && sel.pane === pane && sel.id === it[0]}">${api.icon(it[2])}<span>${it[1]}</span></button>`;
      tree.innerHTML = items.filter((it) => model.has(it[0])).map((it) => b('model', it)).join('') || '<span class="mono-label">empty</span>';
      canvas.innerHTML = items.filter((it) => view.has(it[0])).map((it) => b('view', it)).join('') || '<span class="mono-label">nothing on this diagram</span>';
      del.disabled = !sel;
      del.textContent = !sel ? 'Select an element first' : sel.pane === 'view' ? 'Delete from the diagram' : 'Delete from the model';
    }
    function reset() {
      model = new Set(items.map((i) => i[0]));
      view = new Set(items.map((i) => i[0]));
      sel = null;
      live.className = 'w-live';
      live.innerHTML = 'The same three elements appear twice: in the model, and on a diagram. Select one on either side, then delete it.';
      draw();
    }
    root.addEventListener('click', (e) => {
      const b = e.target.closest('.dd-el');
      if (b) { sel = { pane: b.dataset.pane, id: b.dataset.id }; draw(); return; }
      const a = e.target.closest('[data-do]');
      if (!a) return;
      if (a.dataset.do === 'reset') { reset(); return; }
      if (!sel) return;
      const name = items.find((i) => i[0] === sel.id)[1];
      const gone = [];
      if (sel.pane === 'view') {
        view.delete(sel.id);
        gone.push(`.dd-canvas [data-id="${sel.id}"]`);
        live.className = 'w-live ok';
        live.innerHTML = `<strong>${name}</strong> left this diagram only. Look on the left: it is still in the model, and in every other view.`;
      } else {
        const wasShown = view.has(sel.id);
        model.delete(sel.id);
        view.delete(sel.id);
        gone.push(`[data-id="${sel.id}"]`);
        live.className = 'w-live no';
        live.innerHTML = `<strong>${name}</strong> is deleted from the model` + (wasShown ? ', so it vanished from the diagram too, and from all the other views.' : '. It no longer exists anywhere.');
      }
      sel = null;
      gone.forEach((q) => root.querySelectorAll(q).forEach((n) => n.classList.add('gone')));
      setTimeout(draw, reduced() ? 0 : 320);
    });
    reset();
  };

  /* ───────── model tree ───────── */
  W.modelTree = function (root, opts, api) {
    const top = { kids: new Map() };
    Object.keys(api.links).forEach((key) => {
      const L = api.links[key];
      const kinds = L.kinds || L.path.map((_, i) => (i === L.path.length - 1 ? L.type : 'package'));
      let node = top;
      L.path.forEach((name, i) => {
        if (!node.kids.has(name)) node.kids.set(name, { name, kind: kinds[i], kids: new Map() });
        node = node.kids.get(name);
      });
      node.link = key;
      node.kind = L.type;
      node.made = !!L.made;
    });
    const caret = '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
    function render(node, depth) {
      return '<ul>' + Array.from(node.kids.values()).map((n) => {
        const has = n.kids.size > 0;
        const cls = (depth === 0 ? 'mt-top ' : '') + (has ? '' : 'mt-leaf ') + (has && depth < 1 ? 'open' : '');
        const made = n.made ? '<span class="mt-made">you create it</span>' : '';
        const row = has
          ? `<button type="button" class="mt-row" data-fold aria-expanded="${depth < 1}">${caret}${api.icon(n.kind)}<span>${api.esc(n.name)}</span>${made}</button>`
          : `<button type="button" class="mt-row" data-link="${n.link}">${api.icon(n.kind)}<span>${api.esc(n.name)}</span>${made}</button>`;
        return `<li class="${cls}">${row}${has ? render(n, depth + 1) : ''}</li>`;
      }).join('') + '</ul>';
    }
    root.className = 'w';
    root.innerHTML = `<div class="mt">${render(top, 0)}</div>`;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-fold]');
      if (!b) return;
      const open = b.parentElement.classList.toggle('open');
      b.setAttribute('aria-expanded', String(open));
    });
  };

  /* ───────── the mission ───────── */
  W.mission = function (root) {
    const parts = [
      'According to a given flight plan, your system shall first join the predefined safe zone,',
      'then start patrolling around its perimeter until the end of the mission.',
      'During this patrol, the system shall track the sheep. If one goes outside the safe zone, it shall notify the Shepherd and continue patrolling.'
    ];
    root.className = 'w mission';
    root.innerHTML = `<div class="mission-text">${parts.map((p, i) => `<button type="button" class="mission-part" data-part="${i + 1}" aria-pressed="${i === 1}"><b>${i + 1}</b><span>${p}</span></button>`).join('')}
        <p class="w-caption">Tap a sentence to play that part of the mission.</p></div>
      <div class="mission-art" data-noswipe></div>`;
    const s = svg('0 0 360 300', 'A rectangular pasture, the safe zone, with seven sheep. A drone flies along a dashed route that follows the perimeter of the pasture.');
    root.querySelector('.mission-art').appendChild(s);
    el('rect', { x: 64, y: 22, width: 282, height: 222, class: 'm-zone' }, s);
    const route = el('path', { d: 'M73,235 L73,31 L337,31 L337,235 Z', class: 'm-path' }, s);
    el('path', { d: 'M24,276 L73,235', class: 'm-path', opacity: 0.5 }, s);
    el('rect', { x: 160, y: 42, width: 90, height: 20, rx: 3, class: 'm-tagbox' }, s);
    txt(s, 205, 56, 'SAFE ZONE', 'm-tag', 'middle');
    const drawSheep = (g) => {
      for (let i = 0; i < 8; i++) el('circle', { cx: Math.cos(i * Math.PI / 4) * 9, cy: Math.sin(i * Math.PI / 4) * 9, r: 5.5, class: 'm-wool' }, g);
      el('circle', { r: 10, class: 'm-wool' }, g);
      el('ellipse', { cx: -7, cy: -3, rx: 3.6, ry: 1.8, class: 'm-face' }, g);
      el('ellipse', { cx: 7, cy: -3, rx: 3.6, ry: 1.8, class: 'm-face' }, g);
      el('ellipse', { cy: 0, rx: 5.2, ry: 4.6, class: 'm-face' }, g);
      el('circle', { cx: -1.8, cy: -0.5, r: 0.8, class: 'm-eye' }, g);
      el('circle', { cx: 1.8, cy: -0.5, r: 0.8, class: 'm-eye' }, g);
    };
    [[118, 96], [200, 122], [244, 98], [170, 158], [256, 156], [146, 204], [224, 202]].forEach((p) => {
      drawSheep(el('g', { transform: `translate(${p[0]},${p[1]})` }, s));
    });
    /* shepherd, outside the pasture */
    const shep = el('g', { transform: 'translate(322,274)' }, s);
    const ping = el('circle', { r: 12, class: 'm-ping' }, shep);
    el('circle', { cy: -8, r: 5, class: 'm-shepherd' }, shep);
    el('path', { d: 'M-8,12 Q0,-6 8,12 Z', class: 'm-shepherd' }, shep);
    txt(s, 300, 292, 'Shepherd', 'm-tag', 'end');
    const linkLine = el('path', { d: '', class: 'm-link' }, s);
    /* a sheep that strays out of the safe zone */
    const strayer = el('g', {}, s);
    drawSheep(strayer);
    const alertG = el('g', {}, s);
    el('rect', { x: 196, y: 66, width: 124, height: 20, rx: 10, class: 'm-alert' }, alertG);
    txt(alertG, 258, 80, 'SHEEP OUTSIDE', 'm-tag', 'middle').setAttribute('style', 'fill:#fff');
    /* drone */
    const dg = el('g', {}, s);
    el('circle', { r: 44, class: 'm-range' }, dg);
    drone(dg, 1);

    const L = route.getTotalLength();
    const lf = life();
    const vis = (n, on) => { n.style.display = on ? '' : 'none'; };
    const st = { mode: 'patrol', s: 0, join: 0, stray: -1, pos: { x: 73, y: 235 } };
    function place() {
      if (st.mode === 'join') {
        const k = ease(Math.min(1, st.join));
        st.pos = { x: 24 + (73 - 24) * k, y: 276 + (235 - 276) * k };
      } else {
        const p = route.getPointAtLength(st.s % L);
        st.pos = { x: p.x, y: p.y };
      }
      move(dg, st.pos.x, st.pos.y);
      if (st.stray >= 0) {
        const k = ease(Math.min(1, st.stray));
        const sx = 300 + 76 * k;
        move(strayer, sx, 118 + 6 * k);
        vis(strayer, true);
        const outside = sx > 337;
        [alertG, ping, linkLine].forEach((n) => vis(n, outside));
        if (outside) linkLine.setAttribute('d', `M${st.pos.x.toFixed(1)},${st.pos.y.toFixed(1)} L322,268`);
      }
    }
    function clearStray() {
      st.stray = -1;
      [strayer, alertG, ping, linkLine].forEach((n) => vis(n, false));
    }
    const buttons = Array.from(root.querySelectorAll('.mission-part'));
    const press = (n) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.part === n)));
    buttons.forEach((b) => b.addEventListener('click', () => {
      const n = +b.dataset.part;
      press(n);
      if (n === 1) { clearStray(); st.mode = 'join'; st.join = reduced() ? 1 : 0; st.s = 0; }
      if (n === 2) { clearStray(); st.mode = 'patrol'; }
      if (n === 3) { st.mode = 'patrol'; st.stray = reduced() ? 1 : 0; }
      place();
    }));
    st.s = 120;
    clearStray();
    place();
    if (reduced()) return;
    lf.loop((dt) => {
      if (st.mode === 'join') {
        st.join += dt / 1.6;
        if (st.join >= 1) { st.mode = 'patrol'; st.s = 0; press(2); }
      } else st.s += dt * 62;
      if (st.stray >= 0 && st.stray < 1) st.stray += dt / 2.2;
      place();
    });
    return lf.end;
  };

  /* ───────── scenario text ───────── */
  W.scenario = function (root) {
    /* One step per message, the same seven messages as the sequence diagram below. */
    const a = (k, t) => `<span class="a-${k}">${t}</span>`;
    const STEPS = [
      `${a('op', 'The operator')} starts the SOI using ${a('gs', 'the ground station')}.`,
      `Then, still using ${a('gs', 'the ground station')}, ${a('op', 'the operator')} sends the flight plan to ${a('soi', 'the SOI-drone')}.`,
      `${a('gs', 'The ground station')} sends the flight plan to ${a('soi', 'the drone')} by WiFi.`,
      `${a('soi', 'The drone')} loads the flight plan into memory.`,
      `${a('soi', 'The drone')} checks the perimeter of the flight plan.`,
      `Upon successful loading, ${a('gs', 'the ground station')} receives a notification.`,
      `${a('op', 'The operator')} is informed that the mission is ready to start.`
    ];
    root.className = 'w scn hl-op hl-gs hl-soi';
    root.innerHTML = `<span class="mono-label">“Parameter Mission” scenario</span>
      <ol class="scn-steps">${STEPS.map((s) => `<li>${s}</li>`).join('')}</ol>
      <div class="chips" role="group" aria-label="Highlight a participant">
        <button type="button" class="chip c-op" data-a="op" aria-pressed="true">Mission Operator</button>
        <button type="button" class="chip c-gs" data-a="gs" aria-pressed="true">Ground station</button>
        <button type="button" class="chip" data-a="soi" aria-pressed="true">The drone</button>
      </div>
      <p class="w-caption">Three participants speak in this text. They will be the three lifelines of your diagram. Tap a name to hide or show its part.</p>`;
    root.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      root.classList.toggle('hl-' + b.dataset.a, on);
    }));
  };

  /* ───────── sunny day, rainy day ───────── */
  W.weather = function (root) {
    root.innerHTML = `<div class="weather">
      <div class="wx sun">
        <svg class="wx-art" viewBox="0 0 80 80" aria-hidden="true"><g class="rays" stroke-width="5" stroke-linecap="round"><path d="M40 6v10M40 64v10M6 40h10M64 40h10M16 16l7 7M57 57l7 7M64 16l-7 7M23 57l-7 7"/></g><circle class="disc" cx="40" cy="40" r="15"/></svg>
        <span class="wx-code">SD</span><b>Sunny Day</b><p>The nominal scenario: everything is OK.</p><p><code>[SD1] Loading Flight Plan success</code></p>
      </div>
      <div class="wx rain">
        <svg class="wx-art" viewBox="0 0 80 80" aria-hidden="true"><path class="cloud" d="M22 44a12 12 0 0 1 2-23.8A16 16 0 0 1 54 16a13 13 0 0 1 4 28z"/><path class="drop" d="M28 54l-3 8"/><path class="drop" d="M42 54l-3 8"/><path class="drop" d="M56 54l-3 8"/></svg>
        <span class="wx-code">RD</span><b>Rainy Day</b><p>The dysfunctional scenario: something went wrong.</p><p><code>[RD 1] Flight plan out of range</code></p>
      </div>
    </div>`;
  };

  /* ───────── sequence diagram replay ───────── */
  W.sequence = function (root) {
    const X = { op: 50, gs: 160, soi: 262 };
    const M = [
      { from: 'op', to: 'gs', y: 84, label: ['1: Start SOI'], cap: 'The operator starts the SOI using the ground station.' },
      { from: 'op', to: 'gs', y: 122, label: ['2: FlightPlan'], cap: 'Still using the ground station, the operator sends the flight plan.' },
      { from: 'gs', to: 'soi', y: 160, label: ['3: FlightPlan'], cap: 'The ground station sends the flight plan to the drone by WiFi.' },
      { self: 'soi', y: 200, label: ['4: Load FlightPlan'], cap: 'The drone loads the flight plan into memory.' },
      { self: 'soi', y: 264, label: ['5: Check FlightPlan', 'Perimeter'], cap: 'The drone checks the perimeter of the flight plan.' },
      { from: 'soi', to: 'gs', y: 332, label: ['6: Success FlightPlan', 'Loading Notification'], cap: 'Upon successful loading, the ground station receives a notification.' },
      { from: 'gs', to: 'op', y: 386, label: ['7: Mission Ready', 'To Start Notification'], cap: 'The operator is informed that the mission is ready to start.' }
    ];
    root.className = 'w seq';
    root.innerHTML = `<div class="seq-art" data-noswipe></div>
      <div class="seq-side">
        <ol class="seq-steps">${M.map((m, i) => `<li class="shown"><b>${i + 1}</b><span>${m.cap}</span></li>`).join('')}</ol>
        <div class="btn-row">
          <button type="button" class="btn small" data-do="step">Replay step by step</button>
          <button type="button" class="btn ghost small" data-do="all">Show everything</button>
        </div>
      </div>`;
    const s = svg('0 0 380 420', 'Sequence diagram with three lifelines: Mission Operator, Ground station and SOI - Pasture Sentinel, and seven messages.');
    root.querySelector('.seq-art').appendChild(s);
    [['op', ['Mission Operator']], ['gs', ['Ground station']], ['soi', ['SOI - Pasture', 'Sentinel']]].forEach((l) => {
      const x = X[l[0]];
      el('line', { x1: x, y1: 40, x2: x, y2: 410, class: 'll-line' }, s);
      el('rect', { x: x - 46, y: 8, width: 92, height: 32, rx: 3, class: 'll-head' }, s);
      txt(s, x, l[1].length > 1 ? 21 : 28, l[1], 's-sub', 'middle', 11).setAttribute('style', 'font-weight:700;fill:var(--ink)');
    });
    [[X.op, 80, 50], [X.gs, 80, 88], [X.soi, 156, 184], [X.gs, 328, 62], [X.op, 382, 14]].forEach((b) => el('rect', { x: b[0] - 4, y: b[1], width: 8, height: b[2], class: 'act-bar' }, s));
    const groups = M.map((m) => {
      let g;
      if (m.self) {
        const x = X[m.self] + 4;
        g = arrow(s, [[x, m.y], [x + 28, m.y], [x + 28, m.y + 24], [x + 2, m.y + 24]], 'msg');
        txt(g, x + 4, m.y - 6 - (m.label.length - 1) * 12, m.label, '', 'start', 12);
      } else {
        const a = X[m.from];
        const b = X[m.to];
        const dir = b > a ? 1 : -1;
        g = arrow(s, [[a + 4 * dir, m.y], [b - 5 * dir, m.y]], 'msg');
        txt(g, (a + b) / 2, m.y - 6 - (m.label.length - 1) * 12, m.label, '', 'middle', 12);
      }
      return g;
    });
    const items = Array.from(root.querySelectorAll('.seq-steps li'));
    const stepBtn = root.querySelector('[data-do="step"]');
    const lf = life();
    let cur = -1;
    function paint(n, now) {
      groups.forEach((g, i) => {
        g.classList.toggle('hidden', i > n);
        g.classList.toggle('now', i === now);
        items[i].classList.toggle('shown', i <= n);
        items[i].classList.toggle('now', i === now);
      });
    }
    function draw(i) {
      const line = groups[i]._line;
      const len = line.getTotalLength();
      line.style.strokeDasharray = len;
      lf.tween(450, (k) => { line.style.strokeDashoffset = len * (1 - k); }, () => { line.style.strokeDasharray = ''; line.style.strokeDashoffset = ''; });
    }
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-do]');
      if (!b) return;
      if (b.dataset.do === 'all') { cur = -1; paint(M.length - 1, -1); stepBtn.textContent = 'Replay step by step'; return; }
      cur = cur >= M.length - 1 ? -1 : cur;
      cur += 1;
      paint(cur, cur);
      draw(cur);
      stepBtn.textContent = cur >= M.length - 1 ? 'Replay from the start' : `Next message (${cur + 2} of ${M.length})`;
      items[cur].scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    });
    return lf.end;
  };

  /* ───────── message to function ───────── */
  W.msgToFn = function (root) {
    root.className = 'w m2f';
    const s = svg('0 0 360 132', 'On the left, a message on a lifeline of the sequence diagram. An arrow leads to a rounded box on the right: a function, modeled as an activity.');
    txt(s, 70, 16, 'IN THE SCENARIO', 'hint', 'middle');
    el('line', { x1: 70, y1: 26, x2: 70, y2: 122, class: 's-line s-dash' }, s);
    arrow(s, [[74, 50], [108, 50], [108, 84], [77, 84]]);
    txt(s, 116, 64, ['a message', 'the drone sends', 'to itself'], 's-sub', 'start', 12);
    el('path', { d: 'M196,68 H232', class: 'flow' }, s);
    el('path', { d: 'M234,68 l-9,-5 v10 z', fill: 'var(--sky)' }, s);
    txt(s, 296, 16, 'IN THE MODEL', 'hint', 'middle');
    el('rect', { x: 244, y: 44, width: 104, height: 48, rx: 20, class: 'fn' }, s);
    txt(s, 296, 65, ['a function', '(Activity)'], 's-name', 'middle', 13);
    root.appendChild(s);
    const p = document.createElement('p');
    p.className = 'w-caption';
    p.textContent = 'What a participant does in the scenario becomes something the system must be able to do: a function.';
    root.appendChild(p);
  };

  /* ───────── state machine: shared drawing ───────── */
  const ST = {
    off: { x: 24, y: 78, w: 108, h: 42, name: 'Off', zone: 'und' },
    unconf: { x: 196, y: 78, w: 140, h: 42, name: 'Unconfigured', zone: 'und' },
    conf: { x: 196, y: 164, w: 140, h: 54, name: 'Configured', act: 'Load Flight Plan', zone: 'und' },
    ready: { x: 196, y: 250, w: 140, h: 50, name: 'Ready for Mission', act: 'Start subsystems', zone: 'und' },
    safe: { x: 20, y: 372, w: 104, h: 30, name: 'Going to Safe Area', pill: true, zone: 'dep' },
    patrol: { x: 142, y: 372, w: 70, h: 30, name: 'Patrolling', pill: true, zone: 'dep' },
    pred: { x: 230, y: 372, w: 110, h: 30, name: 'Predator Detected', pill: true, zone: 'dep' },
    crashed: { x: 196, y: 440, w: 140, h: 34, name: 'Crashed', zone: 'out' }
  };
  const TR = {
    t0: { pts: [[78, 27], [78, 76]] },
    t1: { from: 'off', to: 'unconf', sig: 'Start SOI', pts: [[132, 99], [194, 99]], lx: 163, ly: 91, anchor: 'middle' },
    t2: { from: 'unconf', to: 'conf', sig: 'FlightPlan', pts: [[306, 120], [306, 162]], lx: 299, ly: 145, anchor: 'end' },
    t3: { from: 'conf', to: 'unconf', sig: 'FlightPlan Check Failed', pts: [[226, 164], [226, 122]], lx: 219, ly: 145, anchor: 'end' },
    t4: { from: 'conf', to: 'ready', sig: 'Ready for mission', pts: [[266, 218], [266, 248]], lx: 259, ly: 238, anchor: 'end' },
    t5: { from: 'ready', to: 'safe', sig: 'Start Sheep Guard Mission', pts: [[266, 300], [266, 342]], lx: 259, ly: 326, anchor: 'end' },
    t6: { from: 'safe', to: 'patrol', sig: 'Start Patrolling', pts: [[124, 387], [140, 387]] },
    t7: { from: 'patrol', to: 'pred', sig: 'Predator Detected inside tracking perimeter', pts: [[212, 387], [228, 387]] },
    t8: { from: ['safe', 'patrol', 'pred'], to: 'crashed', sig: 'Crashed Detected', pts: [[266, 414], [266, 438]], lx: 259, ly: 431, anchor: 'end' }
  };
  const FULLNAME = { off: 'Off', unconf: 'Unconfigured', conf: 'Configured', ready: 'Ready for Mission', safe: 'Deployed › Going to Safe Area', patrol: 'Deployed › Patrolling', pred: 'Deployed › Predator Detected', crashed: 'Crashed' };
  const SIG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h12l4.5 6-4.5 6H4z"/></svg>';

  function buildSM(s, crop) {
    const out = { st: {}, tr: {}, frames: {} };
    const und = el('g', { class: 'frame' }, s);
    el('rect', { x: 10, y: 44, width: 340, height: 268, rx: 12, class: 's-frame' }, und);
    txt(und, 180, 62, 'Undeployed', 's-name', 'middle');
    out.frames.und = und;
    if (!crop) {
      const dep = el('g', { class: 'frame' }, s);
      el('rect', { x: 10, y: 344, width: 340, height: 70, rx: 12, class: 's-frame' }, dep);
      txt(dep, 180, 361, 'Deployed', 's-name', 'middle');
      out.frames.dep = dep;
    }
    el('circle', { cx: 78, cy: 20, r: 7, class: 's-dot' }, s);
    Object.keys(TR).forEach((id) => {
      const t = TR[id];
      if (crop && !/t[0-4]/.test(id)) return;
      const g = arrow(s, t.pts, 'tr');
      g.dataset.tr = id;
      if (t.sig && t.lx != null) txt(g, t.lx, t.ly, t.sig, 'sig', t.anchor);
      const a = t.pts[0];
      const b = t.pts[t.pts.length - 1];
      const q = el('g', { class: 'q' }, g);
      el('circle', { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, r: 10 }, q);
      txt(q, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 4, '?', '', 'middle');
      el('path', { d: pathD(t.pts), class: 'hit' }, g);
      out.tr[id] = g;
    });
    Object.keys(ST).forEach((id) => {
      const d = ST[id];
      if (crop && d.zone !== 'und') return;
      const g = el('g', { class: 'st' }, s);
      g.dataset.st = id;
      el('rect', { x: d.x, y: d.y, width: d.w, height: d.h, rx: d.pill ? 15 : 9, class: 's-box' }, g);
      if (d.act) {
        txt(g, d.x + d.w / 2, d.y + 18, d.name, 's-name', 'middle');
        el('line', { x1: d.x, y1: d.y + 26, x2: d.x + d.w, y2: d.y + 26, class: 's-line act-rule' }, g);
        txt(g, d.x + d.w / 2, d.y + 42, 'do / ' + d.act, 's-sub act', 'middle');
      } else txt(g, d.x + d.w / 2, d.y + d.h / 2 + 4, d.name, d.pill ? 's-sub' : 's-name', 'middle');
      out.st[id] = g;
    });
    return out;
  }

  /* ───────── state machine: put the signals on the transitions ───────── */
  W.smAssign = function (root, opts, api) {
    const doMode = opts.mode === 'doActivity';
    root.className = 'w sm';
    root.innerHTML = `<div class="sm-art" data-noswipe></div>
      <div class="sm-panel">
        <p class="w-caption">${doMode
          ? 'Pick the activity, then drop it on the state it belongs to.'
          : 'Three transitions are still waiting for their signal. Pick a signal, then tap the transition it triggers.'}</p>
        <div class="chips"></div>
        <p class="w-live" aria-live="polite"></p>
        <button type="button" class="btn ghost small" data-do="reset" style="justify-self:start">Start again</button>
      </div>`;
    const art = root.querySelector('.sm-art');
    const chips = root.querySelector('.chips');
    const live = root.querySelector('.w-live');
    const s = svg('0 0 360 320', 'The Undeployed part of the state machine: Off, Unconfigured, Configured and Ready for Mission.');
    art.appendChild(s);
    const sm = buildSM(s, true);
    const targets = ['t2', 't3', 't4'];
    const order = ['t4', 't2', 't3'];
    let placed;
    let picked = null;
    let menu = null;
    const say = (cls, html) => { live.className = 'w-live ' + cls; live.innerHTML = html; };
    const nope = (node) => { node.classList.remove('shake'); void node.getBoundingClientRect(); node.classList.add('shake'); };
    function closeMenu() { if (menu) { menu.remove(); menu = null; } }

    function reset(solved) {
      closeMenu();
      picked = null;
      placed = new Set(solved ? targets : []);
      if (doMode) {
        sm.st.conf.classList.toggle('no-act', !solved);
        sm.st.conf.classList.remove('target', 'act-in');
        chips.innerHTML = `<button type="button" class="chip" data-chip="act" aria-pressed="false"${solved ? ' disabled' : ''}>${api.icon('activity')}Load Flight Plan</button>`;
        say(solved ? 'ok' : '', solved ? '<strong>Done.</strong> While the system is in Configured, it runs Load Flight Plan.' : 'The state Configured does nothing yet.');
      } else {
        sm.st.conf.classList.add('no-act');
        targets.forEach((id) => { sm.tr[id].classList.toggle('todo', !solved); sm.tr[id].classList.remove('placed'); });
        chips.innerHTML = order.map((id) => `<button type="button" class="chip" data-chip="${id}" aria-pressed="false"${solved ? ' disabled' : ''}>${SIG_ICON}${TR[id].sig}</button>`).join('');
        say(solved ? 'ok' : '', solved ? '<strong>All three signals are in place.</strong> Your diagram in Cameo should read the same.' : 'Start with any signal.');
      }
    }
    function finish() {
      api.set(true);
      say('ok', doMode
        ? '<strong>Exactly.</strong> “do / Load Flight Plan” now shows inside the state: the function runs while the system is Configured.'
        : '<strong>All three signals are in place.</strong> Compare with your diagram in Cameo.');
    }

    chips.addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c || c.disabled) return;
      closeMenu();
      picked = picked === c.dataset.chip ? null : c.dataset.chip;
      chips.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.chip === picked)));
      if (doMode) {
        sm.st.conf.classList.toggle('target', !!picked);
        say('', picked ? 'Now tap the state <strong>Configured</strong> to drop the activity on it.' : 'The state Configured does nothing yet.');
      } else if (picked) say('', `<strong>${TR[picked].sig}</strong> selected. Which transition does it trigger?`);
    });

    s.addEventListener('click', (e) => {
      if (doMode) {
        const st = e.target.closest('.st');
        if (!st || st.dataset.st !== 'conf' || placed.size) { if (st && picked) nope(art); return; }
        if (!picked) { say('no', 'Pick the activity <strong>Load Flight Plan</strong> first, as you would grab it in the Model Browser.'); nope(chips); return; }
        closeMenu();
        const r = st.getBoundingClientRect();
        const h = art.getBoundingClientRect();
        menu = document.createElement('div');
        menu.className = 'sm-menu';
        menu.setAttribute('role', 'menu');
        menu.style.left = Math.max(0, r.left - h.left + 8) + 'px';
        menu.style.top = (r.bottom - h.top - 8) + 'px';
        menu.innerHTML = ['Entry', 'Do Activity', 'Exit'].map((x) => `<button type="button" role="menuitem" data-pick="${x}">${x}</button>`).join('');
        art.appendChild(menu);
        menu.querySelector('button').focus({ preventScroll: true });
        say('', 'Cameo asks when the activity should run. The guide asks for one of these three.');
        return;
      }
      const tr = e.target.closest('.tr.todo');
      if (!tr) return;
      if (!picked) { say('no', 'Pick a signal first, in the list below the diagram.'); nope(chips); return; }
      const id = tr.dataset.tr;
      if (id === picked) {
        tr.classList.remove('todo');
        tr.classList.add('placed');
        placed.add(id);
        const c = chips.querySelector(`[data-chip="${id}"]`);
        c.disabled = true;
        c.setAttribute('aria-pressed', 'false');
        picked = null;
        if (placed.size === targets.length) finish();
        else say('ok', `<strong>Yes.</strong> ${TR[id].sig} takes the system from ${ST[TR[id].from].name} to ${ST[TR[id].to].name}. ${targets.length - placed.size} to go.`);
      } else {
        nope(art);
        say('no', `Not this one. This arrow goes from <strong>${ST[TR[id].from].name}</strong> to <strong>${ST[TR[id].to].name}</strong>. Would “${TR[picked].sig}” cause that?`);
      }
    });

    art.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      if (b.dataset.pick === 'Do Activity') {
        closeMenu();
        placed = new Set(targets);
        picked = null;
        sm.st.conf.classList.remove('no-act', 'target');
        sm.st.conf.classList.add('act-in');
        chips.querySelector('.chip').disabled = true;
        chips.querySelector('.chip').setAttribute('aria-pressed', 'false');
        finish();
      } else {
        nope(menu);
        say('no', `Not “${b.dataset.pick}”. The step asks for the choice that makes the function run while the system stays in the state.`);
      }
    });
    root.querySelector('[data-do="reset"]').addEventListener('click', () => { api.set(false); reset(false); });
    reset(!!api.get());
    return closeMenu;
  };

  /* ───────── state machine: simulator ───────── */
  W.smSim = function (root, opts) {
    const cross = !!opts.cross;
    const TRIGGERS = ['Crashed Detected', 'FlightPlan', 'FlightPlan Check Failed', 'Predator Detected inside tracking perimeter', 'Ready for mission', 'Start Patrolling', 'Start Sheep Guard Mission', 'Start SOI'];
    root.className = 'w sm';
    root.innerHTML = `<div class="sm-art" data-noswipe></div>
      <div class="sm-panel">
        <div><span class="mono-label">Trigger: send a signal</span>
          <div class="sm-triggers" style="margin-top:.4rem">${TRIGGERS.map((t) => `<button type="button" class="sm-trigger" data-sig="${t}">${SIG_ICON}<span>${t}</span></button>`).join('')}</div></div>
        ${cross ? '<label class="switch"><input type="checkbox" checked data-valid><i></i>The flight plan is valid</label>' : ''}
        <div class="sm-now"><span class="mono-label">Active state</span><strong></strong></div>
        <div><span class="mono-label">What happened</span><ol class="sm-log" aria-live="polite" style="margin-top:.4rem"></ol></div>
        <button type="button" class="btn ghost small" data-do="reset" style="justify-self:start">Restart the simulation</button>
      </div>`;
    const s = svg('0 0 360 484', 'State machine of SOI - Pasture Sentinel. Undeployed contains Off, Unconfigured, Configured and Ready for Mission. Deployed contains Going to Safe Area, Patrolling and Predator Detected. Crashed is apart.');
    root.querySelector('.sm-art').appendChild(s);
    const sm = buildSM(s, false);
    const token = el('circle', { r: 6, class: 's-token', opacity: 0 }, s);
    const nowEl = root.querySelector('.sm-now strong');
    const log = root.querySelector('.sm-log');
    const lf = life();
    let cur;
    let busy = false;
    let autoTimer = 0;

    function note(cls, text) {
      const li = document.createElement('li');
      li.className = cls;
      li.innerHTML = `<span>${cls === 'no' ? '×' : cls === 'auto' ? '⟳' : '→'}</span><span>${text}</span>`;
      log.prepend(li);
      while (log.children.length > 4) log.lastChild.remove();
    }
    function enter(id, quiet) {
      cur = id;
      Object.keys(sm.st).forEach((k) => {
        const on = k === id;
        if (sm.st[k].classList.contains('on') && !on) sm.st[k].classList.add('was');
        sm.st[k].classList.toggle('on', on);
        sm.st[k].classList.remove('pulse', 'busy');
        if (on && !quiet) { void sm.st[k].getBoundingClientRect(); sm.st[k].classList.add('pulse'); }
      });
      sm.frames.und.classList.toggle('on', ST[id].zone === 'und');
      sm.frames.dep.classList.toggle('on', ST[id].zone === 'dep');
      nowEl.textContent = FULLNAME[id];
      if (cross && id === 'conf') {
        sm.st.conf.classList.add('busy');
        note('auto', 'Entering Configured starts <strong>do / Load Flight Plan</strong>. The activity diagram runs…');
        clearTimeout(autoTimer);
        autoTimer = lf.wait(() => {
          if (cur !== 'conf' || busy) return;
          const ok = root.querySelector('[data-valid]').checked;
          const sig = ok ? 'Ready for mission' : 'FlightPlan Check Failed';
          note('auto', `Load Flight Plan ${ok ? 'succeeded' : 'failed'}: the activity sends <strong>${sig}</strong> by itself.`);
          fire(sig, true);
        }, 1700);
      }
    }
    function fire(sig, auto) {
      if (busy) return;
      const id = Object.keys(TR).find((k) => TR[k].sig === sig && [].concat(TR[k].from).includes(cur));
      const btn = root.querySelector(`.sm-trigger[data-sig="${sig}"]`);
      const flash = (c) => { btn.classList.add(c); setTimeout(() => btn.classList.remove(c), 600); };
      if (!id) {
        flash('flash-no');
        const final = cur === 'crashed' || cur === 'pred';
        note('no', `<strong>${sig}</strong> is ignored: ${FULLNAME[cur]} has no transition triggered by this signal${final && cur === 'crashed' ? '. Nothing leaves Crashed' : ''}.`);
        return;
      }
      clearTimeout(autoTimer);
      sm.st.conf.classList.remove('busy');
      flash('flash-ok');
      const t = TR[id];
      const g = sm.tr[id];
      busy = true;
      g.classList.add('fire');
      token.setAttribute('opacity', 1);
      const L = g._line.getTotalLength();
      lf.tween(520, (k) => { const p = g._line.getPointAtLength(L * k); token.setAttribute('cx', p.x); token.setAttribute('cy', p.y); }, () => {
        token.setAttribute('opacity', 0);
        g.classList.remove('fire');
        g.classList.add('was');
        busy = false;
        if (!auto) note('', `<strong>${sig}</strong>: ${FULLNAME[cur]} → ${FULLNAME[t.to]}`);
        enter(t.to);
      });
    }
    function reset() {
      clearTimeout(autoTimer);
      busy = false;
      token.setAttribute('opacity', 0);
      Object.keys(sm.st).forEach((k) => sm.st[k].classList.remove('on', 'was', 'pulse', 'busy'));
      Object.keys(sm.tr).forEach((k) => sm.tr[k].classList.remove('was', 'fire'));
      log.innerHTML = '';
      sm.tr.t0.classList.add('was');
      enter('off', true);
      note('', 'The simulation starts in <strong>Off</strong>. Which signal wakes the drone up?');
    }
    root.addEventListener('click', (e) => {
      const b = e.target.closest('.sm-trigger');
      if (b) { fire(b.dataset.sig); return; }
      if (e.target.closest('[data-do="reset"]')) reset();
    });
    reset();
    return lf.end;
  };

  /* ───────── anatomy of a state machine ───────── */
  W.anatomy = function (root) {
    const KEYS = [
      ['state', 'State', 'A situation the system stays in for a while, like Unconfigured or Configured.'],
      ['transition', 'Transition', 'The arrow that takes the system from one state to another.'],
      ['signal', 'Signal', 'Allocated on a transition. When the system receives it, the transition fires.'],
      ['do', 'Do activity', 'A function assigned to a state. It runs while the system is in that state.']
    ];
    root.className = 'w anat';
    root.innerHTML = `<div class="anat-art"></div><div class="anat-keys">${KEYS.map((k, i) => `<button type="button" class="anat-key" data-key="${k[0]}" aria-pressed="false"><i>${i + 1}</i><span><b>${k[1]}</b><span>${k[2]}</span></span></button>`).join('')}</div>`;
    const s = svg('0 0 360 200', 'Two states, Unconfigured and Configured, linked by a transition labelled FlightPlan. Configured contains do / Load Flight Plan. Four numbered pins point at a state, the transition, the signal and the do activity.');
    root.querySelector('.anat-art').appendChild(s);
    const part = (name) => el('g', { 'data-part': name }, s);
    const s1 = part('state');
    el('rect', { x: 22, y: 34, width: 132, height: 44, rx: 9, class: 's-box' }, s1);
    txt(s1, 88, 61, 'Unconfigured', 's-name', 'middle');
    const tr = part('transition');
    arrow(tr, [[154, 56], [272, 56], [272, 116]]);
    const sg = part('signal');
    txt(sg, 213, 48, 'FlightPlan', 's-lbl', 'middle');
    const s2 = part('state');
    el('rect', { x: 204, y: 118, width: 136, height: 58, rx: 9, class: 's-box' }, s2);
    txt(s2, 272, 138, 'Configured', 's-name', 'middle');
    el('line', { x1: 204, y1: 147, x2: 340, y2: 147, class: 's-line' }, s2);
    const d = part('do');
    txt(d, 272, 165, 'do / Load Flight Plan', 's-sub', 'middle');
    [['state', 22, 34], ['transition', 272, 86], ['signal', 170, 30], ['do', 204, 162]].forEach((p, i) => {
      const g = el('g', { 'data-part': p[0], class: 'pin' }, s);
      el('circle', { cx: p[1], cy: p[2], r: 9 }, g);
      txt(g, p[1], p[2] + 3.5, String(i + 1), '', 'middle');
    });
    const keys = Array.from(root.querySelectorAll('.anat-key'));
    keys.forEach((b) => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      keys.forEach((x) => x.setAttribute('aria-pressed', String(on && x === b)));
      root.classList.toggle('focus', on);
      s.querySelectorAll('[data-part]').forEach((n) => n.classList.toggle('hot', on && n.getAttribute('data-part') === b.dataset.key));
    }));
  };

  /* ───────── one scenario versus all scenarios ───────── */
  W.sdVsAd = function (root) {
    root.innerHTML = `<div class="duo">
      <div class="duo-card">
        <svg viewBox="0 0 240 90" aria-hidden="true"><path class="way hot" d="M20,45 H196"/><circle class="node" cx="20" cy="45" r="7"/><circle class="node" cx="100" cy="45" r="7"/><circle class="sunny" cx="206" cy="45" r="12"/></svg>
        <b>Sequence diagram: one scenario</b>
        <p>It describes only one scenario. For example “The plan was successfully loaded”: a sunny day.</p>
      </div>
      <div class="duo-card">
        <svg viewBox="0 0 240 90" aria-hidden="true"><path class="way" d="M20,45 H96"/><path class="way hot" d="M118,38 L150,20 H196"/><path class="way wet" d="M118,52 L150,70 H196"/><circle class="node" cx="20" cy="45" r="7"/><path class="node" d="M108,31 l14,14 -14,14 -14,-14 z"/><circle class="sunny" cx="206" cy="20" r="12"/><circle class="rainy" cx="206" cy="70" r="12"/></svg>
        <b>Activity diagram: all the scenarios</b>
        <p>It is supposed to represent all the possible scenarios: the sunny day, and the rainy day “The plan was not successfully loaded”.</p>
      </div>
    </div>`;
  };

  /* ───────── decision node ───────── */
  W.decision = function (root) {
    root.className = 'w dec';
    root.innerHTML = `<div class="dec-art" data-noswipe></div>
      <div class="dec-ctl" data-noswipe>
        <label for="dec-wind"><span>Wind speed</span><output for="dec-wind"></output></label>
        <input type="range" id="dec-wind" min="0" max="100" step="1" value="30">
      </div>
      <p class="w-live" aria-live="polite"></p>`;
    const s = svg('0 0 360 176', 'A decision node with two guarded flows: wind above 50 km/h leads to Emergency landing, else leads to Go to next point.');
    root.querySelector('.dec-art').appendChild(s);
    arrow(s, [[12, 46], [52, 46]]);
    const A = el('g', { class: 'branch' }, s);
    arrow(A, [[84, 46], [212, 46]]);
    txt(A, 148, 37, '[wind > 50km/h]', 'guard', 'middle');
    el('rect', { x: 214, y: 24, width: 134, height: 44, rx: 16, class: 's-box' }, A);
    txt(A, 281, 50, 'Emergency landing', 's-name', 'middle');
    const B = el('g', { class: 'branch' }, s);
    arrow(B, [[68, 62], [68, 116]]);
    txt(B, 77, 94, '[else]', 'guard', 'start');
    el('rect', { x: 12, y: 118, width: 134, height: 44, rx: 16, class: 's-box' }, B);
    txt(B, 79, 144, 'Go to next point', 's-name', 'middle');
    el('path', { d: 'M68,30 l16,16 -16,16 -16,-16 z', class: 'diamond' }, s);
    const token = el('circle', { r: 6, cx: 68, cy: 46, class: 's-token' }, s);
    const input = root.querySelector('input');
    const out = root.querySelector('output');
    const live = root.querySelector('.w-live');
    const lf = life();
    let side = null;
    function update(animate) {
      const v = +input.value;
      const hi = v > 50;
      out.textContent = v + ' km/h';
      A.classList.toggle('on', hi); A.classList.toggle('off', !hi);
      B.classList.toggle('on', !hi); B.classList.toggle('off', hi);
      live.innerHTML = hi
        ? `wind = ${v} km/h, so the guard <b>[wind > 50km/h]</b> is true: the token goes to <strong>Emergency landing</strong>.`
        : `wind = ${v} km/h, so <b>[wind > 50km/h]</b> is false. The token takes <b>[else]</b>: <strong>Go to next point</strong>.`;
      if (side === hi) return;
      side = hi;
      const to = hi ? [214, 46] : [68, 118];
      if (!animate) { token.setAttribute('cx', to[0]); token.setAttribute('cy', to[1]); return; }
      lf.end();
      lf.tween(500, (k) => { token.setAttribute('cx', 68 + (to[0] - 68) * k); token.setAttribute('cy', 46 + (to[1] - 46) * k); });
    }
    input.addEventListener('input', () => update(true));
    update(false);
    return lf.end;
  };

  /* ───────── fork node ───────── */
  W.fork = function (root) {
    root.className = 'w fk';
    root.innerHTML = `<div class="fk-art"></div>
      <div class="btn-row"><button type="button" class="btn small" data-do="run">Send a token</button></div>
      <p class="w-live" aria-live="polite">One flow arrives on the bar. Send a token to see what leaves it.</p>`;
    const s = svg('0 0 360 176', 'A fork node: one flow enters a thick bar, three flows leave it towards three actions.');
    root.querySelector('.fk-art').appendChild(s);
    el('circle', { cx: 180, cy: 14, r: 7, class: 's-dot' }, s);
    arrow(s, [[180, 22], [180, 50]]).querySelector('.s-line').classList.add('s-dash');
    el('rect', { x: 28, y: 52, width: 304, height: 7, rx: 2, class: 'bar' }, s);
    const acts = [[63, ['get safe area', 'starting point']], [180, ['get flight plan']], [297, ['get current', 'position']]].map((a) => {
      arrow(s, [[a[0], 60], [a[0], 106]]).querySelector('.s-line').classList.add('s-dash');
      const g = el('g', { class: 'act' }, s);
      el('rect', { x: a[0] - 53, y: 108, width: 106, height: 46, rx: 16, class: 's-box' }, g);
      txt(g, a[0], a[1].length > 1 ? 128 : 135, a[1], 's-name', 'middle', 13);
      return { x: a[0], g };
    });
    const tokens = [0, 1, 2].map(() => el('circle', { r: 6, class: 's-token', opacity: 0 }, s));
    const live = root.querySelector('.w-live');
    const btn = root.querySelector('[data-do="run"]');
    const lf = life();
    btn.addEventListener('click', () => {
      lf.end();
      btn.disabled = true;
      acts.forEach((a) => a.g.classList.remove('run'));
      tokens.forEach((t, i) => { t.setAttribute('opacity', i ? 0 : 1); t.setAttribute('cx', 180); t.setAttribute('cy', 14); });
      live.className = 'w-live';
      live.innerHTML = 'One token travels towards the fork…';
      lf.tween(500, (k) => tokens[0].setAttribute('cy', 14 + 41 * k), () => {
        tokens.forEach((t) => { t.setAttribute('opacity', 1); t.setAttribute('cy', 55); });
        live.innerHTML = '…and the fork gives <b>one token to each outgoing flow</b>.';
        lf.tween(700, (k) => tokens.forEach((t, i) => {
          const half = Math.min(1, k * 2);
          const rest = Math.max(0, k * 2 - 1);
          t.setAttribute('cx', 180 + (acts[i].x - 180) * half);
          t.setAttribute('cy', 55 + 53 * rest);
        }), () => {
          acts.forEach((a) => a.g.classList.add('run'));
          tokens.forEach((t) => t.setAttribute('opacity', 0));
          live.className = 'w-live ok';
          live.innerHTML = '<strong>Three functions run at the same time.</strong> None of them waits for the others.';
          btn.disabled = false;
          btn.textContent = 'Send another token';
        });
      });
    });
    return lf.end;
  };

  /* ───────── crud ───────── */
  W.crud = function (root) {
    root.innerHTML = '<div class="crud">' + [['C', 'Create'], ['R', 'Read'], ['U', 'Update'], ['D', 'Delete']].map((x) => `<div><i>${x[0]}</i><b>${x[1]}</b></div>`).join('') + '</div>';
  };

  /* ───────── recap ───────── */
  let celebrated = false;
  W.recap = function (root, opts, api) {
    const rows = api.chapters.filter((c) => c.id !== 'end').map((c) => {
      const done = c.scenes.filter((s) => api.status(s) === 'done').length;
      const all = done === c.scenes.length;
      return `<button type="button" class="recap-row${all ? ' done' : ''}" data-goto="${c.scenes[0].id}"><span class="crumb-code">${api.esc(c.code)}</span><b>${api.esc(c.title)}</b><span>${all ? 'complete' : done + ' / ' + c.scenes.length}</span></button>`;
    });
    root.innerHTML = `<div class="recap">${rows.join('')}</div>`;
    const total = api.scenes.length;
    const done = api.scenes.filter((s) => api.status(s) === 'done').length;
    if (!celebrated && done >= total * 0.6) { celebrated = true; api.confetti(70); }
  };
})();
