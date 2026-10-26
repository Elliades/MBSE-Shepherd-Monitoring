/* Part 4 lab (POC): the drone itself, in 3D with plain CSS (no library).
   The airframe is always there; each block dropped in the diagram falls into its place on it.
   Modes: solid, exploded (the parts move apart), x-ray (see-through, with the connectors between parts).
   The x-ray overlay is an SVG in screen space: the anchors of the parts are projected by the browser
   (getBoundingClientRect of a 1 px element inside each part), so the lines follow the orbit. */
(function () {
  'use strict';
  const L = window.LAB;
  const R = 104;            /* motor distance on each axis, in px */

  const div = (cls, parent, style) => {
    const n = document.createElement('div');
    if (cls) n.className = cls;
    if (style) Object.assign(n.style, style);
    if (parent) parent.appendChild(n);
    return n;
  };

  /* A box: w along x, d along y, h up; (x, y, z) is the centre of its bottom face. */
  function box(parent, o) {
    const c = div('b3 ' + (o.cls || ''), parent);
    c.style.transform = `translate3d(${o.x || 0}px, ${o.y || 0}px, ${o.z || 0}px) rotateZ(${o.rz || 0}deg)`;
    const { w, d, h } = o;
    const f = (cls, st) => div('f ' + cls, c, st);
    const rr = o.round ? { borderRadius: typeof o.round === 'number' ? o.round + 'px' : o.round } : {};
    f('f-bot', { width: w + 'px', height: d + 'px', left: -w / 2 + 'px', top: -d / 2 + 'px', ...rr });
    if (h > 0) {
      const ins = o.round ? Math.min(typeof o.round === 'number' ? o.round : w / 2, w / 2, d / 2) * 0.7 : 0;
      f('f-fr', { width: w - 2 * ins + 'px', height: h + 'px', left: -w / 2 + ins + 'px', top: -d / 2 + 'px', transformOrigin: '50% 0', transform: 'rotateX(90deg)' });
      f('f-fr f-bk', { width: w - 2 * ins + 'px', height: h + 'px', left: -w / 2 + ins + 'px', top: d / 2 + 'px', transformOrigin: '50% 0', transform: 'rotateX(90deg)' });
      f('f-sd', { width: h + 'px', height: d - 2 * ins + 'px', left: -w / 2 + 'px', top: -d / 2 + ins + 'px', transformOrigin: '0 50%', transform: 'rotateY(-90deg)' });
      f('f-sd f-rt', { width: h + 'px', height: d - 2 * ins + 'px', left: w / 2 + 'px', top: -d / 2 + ins + 'px', transformOrigin: '0 50%', transform: 'rotateY(-90deg)' });
    }
    const top = f('f-top', { width: w + 'px', height: d + 'px', left: -w / 2 + 'px', top: -d / 2 + 'px', transform: `translateZ(${h}px)`, ...rr });
    c.top = top;
    return c;
  }
  /* A flat thing lying at height z (a disc, a ring, a label). */
  function flat(parent, cls, x, y, z, w, d, extra) {
    const n = div('flat ' + cls, parent, { width: w + 'px', height: d + 'px', left: -w / 2 + 'px', top: -d / 2 + 'px', transform: `translate3d(${x}px, ${y}px, ${z}px)${extra || ''}` });
    return n;
  }
  /* A thin upright thing (a mast, an antenna): a box seen from every side. */
  const post = (parent, x, y, z, h, t, cls) => box(parent, { x, y, z, w: t, d: t, h, cls: 'post ' + (cls || '') });

  /* ── the parts ── */
  const SHAPES = {
    battery(g, m) {
      box(g, { ...m, cls: 'c-battery', round: 6 });
      const lab = flat(g, 'battery-label', m.x, m.y, m.z + m.h + 0.5, m.w - 18, m.d - 20);
      lab.innerHTML = '<span>6S · 10 Ah</span>';
      box(g, { x: m.x + m.w / 2 - 8, y: m.y, z: m.z + m.h, w: 8, d: 14, h: 3, cls: 'c-led' });
      return [m.x, m.y, m.z + m.h / 2];
    },
    rotors(g) {
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sy], i) => {
        box(g, { x: sx * R, y: sy * R, z: 0, w: 24, d: 24, h: 14, cls: 'c-motor', round: 12 });
        box(g, { x: sx * R, y: sy * R, z: 14, w: 8, d: 8, h: 4, cls: 'c-hub', round: 4 });
        const p = flat(g, 'prop', sx * R, sy * R, 19, 122, 122);
        const s = div('prop-spin' + (i % 2 ? ' ccw' : ''), p);
        s.innerHTML = '<svg viewBox="-60 -60 120 120"><path class="blade" d="M-58 -3 C-30 -9 -8 -5 0 0 C8 5 30 9 58 3 C30 -2 8 -1 0 0 C-8 1 -30 2 -58 -3Z"/><circle class="disc" r="57"/></svg>';
        if (i < 2) box(g, { x: sx * R, y: sy * R + 2, z: -3, w: 5, d: 5, h: 3, cls: 'c-navlight ' + (sy > 0 ? 'is-rear' : 'is-front') });
      });
      return [R, -R, 10];
    },
    box(g, m) {
      box(g, { ...m, cls: 'c-' + (m.tone || 'part') });
      const s = flat(g, 'fc-strip', m.x, m.y, m.z + m.h + 0.5, m.w - 10, m.d - 12);
      s.innerHTML = '<i></i><i></i><i></i>';
      return [m.x, m.y, m.z + m.h / 2];
    },
    mast(g, m) {
      post(g, m.x, m.y, m.z, m.h, 4, 'c-mast');
      box(g, { x: m.x, y: m.y, z: m.z + m.h, w: m.r * 2, d: m.r * 2, h: 6, cls: 'c-gnss', round: '50%' });
      flat(g, 'gnss-top', m.x, m.y, m.z + m.h + 6.5, m.r * 1.3, m.r * 1.3);
      return [m.x, m.y, m.z + m.h];
    },
    antennas(g, m) {
      [-1, 1].forEach((s) => {
        const a = div('b3 ant', g, { transform: `translate3d(${s * 52}px, ${m.y + 22}px, 0px) rotateY(${s * 14}deg)` });
        post(a, 0, 0, 0, m.h, 3, 'c-ant');
        box(a, { x: 0, y: 0, z: m.h, w: 6, d: 6, h: 6, cls: 'c-ant-tip', round: 3 });
      });
      return [52, m.y + 22, m.h];
    },
    computer(g, m) {
      box(g, { ...m, cls: 'c-mc', round: 4 });
      const t = flat(g, 'mc-top', m.x, m.y, m.z + m.h + 0.5, m.w - 6, m.d - 6);
      t.innerHTML = L.SW_SLOTS.map(() => '<i></i>').join('');
      return [m.x, m.y, m.z + m.h];
    },
    dome(g, m) {
      box(g, { x: m.x, y: m.y, z: m.z, w: m.r * 2, d: m.r * 2, h: 8, cls: 'c-dome-base', round: '50%' });
      box(g, { x: m.x, y: m.y, z: m.z + 8, w: m.r * 1.6, d: m.r * 1.6, h: 7, cls: 'c-dome', round: '50%' });
      box(g, { x: m.x, y: m.y, z: m.z + 15, w: m.r * 0.9, d: m.r * 0.9, h: 3, cls: 'c-dome c-dome-top', round: '50%' });
      return [m.x, m.y, m.z + 10];
    },
    relay(g, m) {
      post(g, m.x, m.y, m.z, m.h, 5, 'c-mast c-relay');
      box(g, { x: m.x, y: m.y, z: m.z, w: 18, d: 18, h: 6, cls: 'c-dome-base', round: '50%' });
      [0.55, 0.8].forEach((k) => flat(g, 'halo', m.x, m.y, m.z + m.h * k, 30 - k * 10, 30 - k * 10));
      box(g, { x: m.x, y: m.y, z: m.z + m.h, w: 9, d: 9, h: 7, cls: 'c-beacon', round: '50%' });
      return [m.x, m.y, m.z + m.h];
    },
    camera(g, m) {
      post(g, m.x, m.y, m.z + m.h, -m.z - m.h, 6, 'c-mast');
      box(g, { ...m, cls: 'c-cam' + (m.tone ? ' c-' + m.tone : ''), round: 5 });
      const lens = div('lens' + (m.tone ? ' lens-' + m.tone : ''), g, {
        width: m.w * 0.62 + 'px', height: m.w * 0.62 + 'px', left: -m.w * 0.31 + 'px', top: -m.w * 0.31 + 'px',
        transform: `translate3d(${m.x}px, ${m.y - m.d / 2 - 0.6}px, ${m.z + m.h / 2}px) rotateX(90deg)`
      });
      lens.innerHTML = '<i></i>';
      return [m.x, m.y, m.z + m.h / 2];
    },
    deterrent(g, m) {
      post(g, m.x - 12, m.y, m.z + m.h, -m.z - m.h, 5, 'c-mast');
      post(g, m.x + 12, m.y, m.z + m.h, -m.z - m.h, 5, 'c-mast');
      box(g, { ...m, cls: 'c-det', round: 5 });
      const grill = div('grill', g, { width: m.w - 10 + 'px', height: m.h - 6 + 'px', left: -(m.w - 10) / 2 + 'px', top: -(m.h - 6) / 2 + 'px',
        transform: `translate3d(${m.x}px, ${m.y + m.d / 2 + 0.6}px, ${m.z + m.h / 2}px) rotateX(90deg)` });
      grill.innerHTML = '<i></i>';
      box(g, { x: m.x, y: m.y, z: m.z - 8, w: 14, d: 14, h: 8, cls: 'c-strobe', round: '50%' });
      return [m.x, m.y, m.z + m.h / 2];
    },
    cart(g, m) {
      box(g, { ...m, cls: 'c-cart' });
      return [m.x, m.y, m.z + m.h];
    }
  };

  /* Where each part flies to in the exploded view, as a push away from the centre. */
  const EXPLODE = {
    energy: [0, 0, -70], prop: [0, 0, 26], fc: [0, 36, 48], nav: [0, 40, 90], wifi: [0, 30, 60], mc: [0, -24, 70],
    fleet: [-40, 24, 64], relay: [44, 20, 60], eo: [20, -60, -60], ir: [-36, -56, -54], det: [0, 64, -66]
  };
  const SW_COL = { 'sw-zone': 'zone', 'sw-flock': 'sheep', 'sw-pred': 'predator', 'sw-engage': 'engage', 'sw-swarm': 'master' };

  function create(host) {
    const stage = div('d3', host);
    const view = div('d3-view', stage);
    const world = div('d3-world', view);
    const ground = div('d3-ground', world);
    div('d3-shadow', world);
    const body = div('d3-body', world);        /* take-off height */
    const bob = div('d3-bob', body);           /* the slow bobbing of a hovering drone */
    const lift = div('d3-lift', bob);          /* the heading of the drone */
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlay.setAttribute('class', 'd3-overlay');
    stage.appendChild(overlay);
    const linkG = document.createElementNS(overlay.namespaceURI, 'g');
    const fxG = document.createElementNS(overlay.namespaceURI, 'g');
    const labelG = document.createElementNS(overlay.namespaceURI, 'g');
    const packetG = document.createElementNS(overlay.namespaceURI, 'g');
    overlay.append(linkG, labelG, packetG, fxG);
    ground.innerHTML = '<i class="ring r1"></i><i class="ring r2"></i><i class="ring r3"></i><b class="pad">H</b>';

    /* the airframe, always there */
    const frame = div('p3 frame', lift);
    box(frame, { x: 0, y: 0, z: -6, w: 128, d: 128, h: 6, cls: 'c-plate', round: 24 });
    box(frame, { x: 0, y: 0, z: -4, w: 2 * R * 1.414 + 18, d: 13, h: 7, rz: 45, cls: 'c-arm', round: 6 });
    box(frame, { x: 0, y: 0, z: -4, w: 2 * R * 1.414 + 18, d: 13, h: 7, rz: -45, cls: 'c-arm', round: 6 });
    [-1, 1].forEach((s) => {
      box(frame, { x: s * 50, y: 0, z: -54, w: 8, d: 160, h: 5, cls: 'c-skid', round: 4 });
      post(frame, s * 50, -42, -50, 44, 6, 'c-leg');
      post(frame, s * 50, 42, -50, 44, 6, 'c-leg');
    });
    flat(frame, 'plate-mark', 0, 0, 0.6, 108, 108).innerHTML = '<span>FRONT</span>';

    const parts = new Map();    /* id -> { node, anchor, ghost } */
    let yaw = -32, tilt = 62, zoom = 1, ex = 0;
    let mode = 'solid';
    let autoSpin = true;

    /* the drone is drawn in px: fit it to the size of its pane */
    let fit = 1;
    function applyView() {
      const k = zoom * fit;
      world.style.transform = `rotateX(${tilt}deg) rotateZ(${yaw}deg) scale3d(${k}, ${k}, ${k})`;
    }
    if (window.ResizeObserver) new ResizeObserver(() => {
      fit = Math.max(0.55, Math.min(1.15, Math.min(stage.clientWidth / 430, stage.clientHeight / 360)));
      applyView();
    }).observe(stage);
    applyView();

    function build(id, ghost) {
      const node = div('p3' + (ghost ? ' ghost' : ''), lift);
      node.dataset.part = id;
      const b = L.BY[id];
      node.title = b.name;
      let at;
      if (b.kind === 'sw') {
        const i = L.SW_SLOTS.indexOf(id), mc = L.MOUNTS.mc;
        const m = { x: mc.x - 28 + i * 14, y: mc.y, z: mc.h - 6, w: 7, d: 28, h: 18 };
        node.classList.add('cap-' + SW_COL[id]);
        at = SHAPES.cart(node, m);
        node.style.setProperty('--ox', '0px'); node.style.setProperty('--oy', -24 + 'px'); node.style.setProperty('--oz', 120 + 'px');
      } else {
        const m = L.MOUNTS[id];
        const r = SHAPES[m.shape](node, m);
        at = Array.isArray(r) ? r : [m.x, m.y, m.z + m.h / 2];
        const e = EXPLODE[id] || [0, 0, 40];
        node.style.setProperty('--ox', e[0] + 'px'); node.style.setProperty('--oy', e[1] + 'px'); node.style.setProperty('--oz', e[2] + 'px');
      }
      const anchor = div('anchor', node, { transform: `translate3d(${at[0]}px, ${at[1]}px, ${at[2]}px)` });
      return { node, anchor };
    }

    function render(st) {
      const want = new Set(st.parts);
      /* drop the parts that left */
      parts.forEach((v, id) => {
        if (!want.has(id) && !v.ghost) { v.node.remove(); parts.delete(id); }
        else if (v.ghost && (want.has(id) || !st.need.has(id))) { v.node.remove(); parts.delete(id); }
      });
      st.parts.forEach((id) => {
        if (parts.has(id)) return;
        const v = build(id, false);
        parts.set(id, v);
        /* fall from above into place */
        v.node.style.setProperty('--drop', (L.BY[id].kind === 'sw' ? 170 : 230) + 'px');
        v.node.style.opacity = '0';
        v.node.classList.add('dropping');
        /* a timer rather than a frame: frames stop in a hidden tab, and the part would stay up there */
        setTimeout(() => {
          void v.node.offsetWidth;
          v.node.style.setProperty('--drop', '0px'); v.node.style.opacity = '';
          setTimeout(() => { v.node.classList.remove('dropping'); thud(id); }, 560);
        }, 30);
      });
      /* ghosts of the parts the target still needs */
      st.need.forEach((id) => {
        if (st.parts.has(id) || parts.has(id)) return;
        if (L.BY[id].kind === 'sw' && !st.parts.has('mc')) return;
        const v = build(id, true); v.ghost = true; parts.set(id, v);
      });
      parts.forEach((v, id) => {
        if (v.ghost) return;
        v.node.classList.toggle('is-on', st.powered.has(id));
      });
      stage.classList.toggle('spin', st.caps.has('fly'));
      stage.classList.toggle('fly', st.caps.has('fly') && st.airborne);
      stage.classList.toggle('master', st.caps.has('master'));
      stage.style.setProperty('--accent', st.color || 'var(--route)');
      last = st;
    }
    let last = null;

    /* ── modes and orbit ── */
    function setMode(m) {
      mode = m;
      /* the x-ray opens the drone a little, so the links between parts can be told apart */
      ex = m === 'exploded' ? 1 : m === 'xray' ? 0.6 : 0;
      world.style.setProperty('--ex', ex);
      stage.classList.toggle('xray', m === 'xray');
      stage.classList.toggle('exploded', m === 'exploded');
    }
    let drag = null;
    stage.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw, tilt, id: e.pointerId };
      stage.setPointerCapture(e.pointerId);
      autoSpin = false; stage.classList.add('grab');
    });
    stage.addEventListener('pointermove', (e) => {
      if (!drag) return;
      yaw = drag.yaw + (e.clientX - drag.x) * 0.45;
      tilt = Math.max(8, Math.min(86, drag.tilt - (e.clientY - drag.y) * 0.3));
      applyView();
    });
    const up = () => { drag = null; stage.classList.remove('grab'); };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(0.55, Math.min(1.7, zoom * (e.deltaY > 0 ? 0.92 : 1.08))); applyView(); }, { passive: false });
    stage.addEventListener('dblclick', () => { autoSpin = !autoSpin; });

    /* ── projection of the anchors, links of the x-ray, effects ── */
    const linkEls = new Map();
    function anchorXY(id) {
      const v = parts.get(id);
      if (!v || v.ghost) return null;
      const r = v.anchor.getBoundingClientRect(), s = stage.getBoundingClientRect();
      return { x: r.left + r.width / 2 - s.left, y: r.top + r.height / 2 - s.top };
    }
    function frameTick(dt) {
      if (autoSpin && !drag) { yaw += dt * 9; applyView(); }
      const s = stage.getBoundingClientRect();
      overlay.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`);
      if (!last) return;
      const keep = new Set();
      last.wires.forEach((w) => {
        const k = L.IBD.wireKey(w);
        const A = anchorXY(w.a.part), B = anchorXY(w.b.part);
        if (!A || !B) return;
        keep.add(k);
        let p = linkEls.get(k);
        if (!p) {
          p = document.createElementNS(overlay.namespaceURI, 'path');
          p.setAttribute('class', `d3-link fam-${L.IF[L.IBD.portDef(w.a.part, w.a.port).iface].fam}`);
          linkG.appendChild(p); linkEls.set(k, p);
        }
        p.classList.toggle('is-live', last.live.has(k));
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2 - Math.min(60, Math.hypot(B.x - A.x, B.y - A.y) * 0.35);
        p.setAttribute('d', `M${A.x.toFixed(1)} ${A.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${B.x.toFixed(1)} ${B.y.toFixed(1)}`);
      });
      linkEls.forEach((p, k) => { if (!keep.has(k)) { p.remove(); linkEls.delete(k); } });
      /* names of the parts in x-ray */
      if (mode === 'xray') {
        labelG.textContent = '';
        parts.forEach((v, id) => {
          if (v.ghost || L.BY[id].kind === 'sw') return;
          const a = anchorXY(id); if (!a) return;
          const t = document.createElementNS(overlay.namespaceURI, 'text');
          t.setAttribute('x', a.x + 7); t.setAttribute('y', a.y - 6); t.setAttribute('class', 'd3-label');
          t.textContent = L.BY[id].short; labelG.appendChild(t);
          const c = document.createElementNS(overlay.namespaceURI, 'circle');
          c.setAttribute('cx', a.x); c.setAttribute('cy', a.y); c.setAttribute('r', 3.2); c.setAttribute('class', 'd3-node' + (last.powered.has(id) ? ' is-on' : ''));
          labelG.appendChild(c);
        });
      } else if (labelG.firstChild) labelG.textContent = '';
    }

    function ring(id, cls, big) {
      const a = anchorXY(id); if (!a) return;
      const c = document.createElementNS(overlay.namespaceURI, 'circle');
      c.setAttribute('cx', a.x); c.setAttribute('cy', a.y); c.setAttribute('r', 4);
      c.setAttribute('class', 'd3-ring ' + (cls || ''));
      c.style.setProperty('--to', (big || 40) + 'px');
      fxG.appendChild(c);
      setTimeout(() => c.remove(), 1300);
    }
    function thud(id) {
      ring(id, 'thud', 34);
      const v = parts.get(id); if (!v) return;
      v.node.classList.add('landed'); setTimeout(() => v.node.classList.remove('landed'), 500);
    }
    /* a part that does something: strobe, sound, radio, processing */
    function act(id, kind) {
      const v = parts.get(id); if (!v || v.ghost) return;
      v.node.classList.remove('act'); void v.node.offsetWidth; v.node.classList.add('act');
      setTimeout(() => v.node.classList.remove('act'), 900);
      if (kind === 'radio') { ring(id, 'radio', 70); setTimeout(() => ring(id, 'radio', 70), 260); }
      if (kind === 'sound') { ring(id, 'sound', 90); setTimeout(() => ring(id, 'sound', 90), 220); setTimeout(() => ring(id, 'sound', 90), 440); }
      if (kind === 'beam') ring(id, 'beam', 26);
    }
    function turn(deg) {
      lift.style.setProperty('--turn', deg + 'deg');
    }

    return { render, setMode, frameTick, linkEls, packetLayer: packetG, act, turn, stage, anchorXY, get mode() { return mode; } };
  }

  Object.assign(L, { Drone3D: { create } });
})();
