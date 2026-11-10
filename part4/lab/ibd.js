/* Part 4 lab (POC): the internal block diagram of the drone being assembled.
   Parts are dropped into the frame (each block has its own place), connectors are drawn from port to port.
   Power connectors go along two bus lanes, the others are drawn as elbows, as in Cameo. */
(function () {
  'use strict';
  const L = window.LAB;
  const NS = 'http://www.w3.org/2000/svg';
  const VB = { w: 1000, h: 680 };
  const FRAME = { x: 20, y: 28, w: 960, h: 636 };
  const BUS_L = 254;      /* power lane on the left of the Mission Computer */
  const BUS_R = 746;      /* power lane on the left of the sensor column */
  const LANE_LOW = 646;   /* power lane under everything, from the left lane to the right one */
  const STUB = 14;

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const NORM = { t: [0, -1], r: [1, 0], b: [0, 1], l: [-1, 0] };
  const wireKey = (w) => `${w.a.part}.${w.a.port}>${w.b.part}.${w.b.port}`;

  function portDef(part, port) {
    const b = L.BY[part];
    return b && b.ports ? b.ports.find((p) => p.id === port) : null;
  }
  function portPos(part, port) {
    const b = L.BY[part]; const p = portDef(part, port); const r = b.ibd;
    const [nx, ny] = NORM[p.side];
    const x = p.side === 'l' ? r.x : p.side === 'r' ? r.x + r.w : r.x + r.w * p.at;
    const y = p.side === 't' ? r.y : p.side === 'b' ? r.y + r.h : r.y + r.h * p.at;
    return { x, y, nx, ny };
  }

  /* The path of a connector, from its source port to its target port. */
  function route(w) {
    const A = portPos(w.a.part, w.a.port), B = portPos(w.b.part, w.b.port);
    const a = { x: A.x + A.nx * STUB, y: A.y + A.ny * STUB };
    const b = { x: B.x + B.nx * STUB, y: B.y + B.ny * STUB };
    const pts = [[A.x, A.y], [a.x, a.y]];
    if (portDef(w.a.part, w.a.port).iface === 'IF_Power') {
      if (b.x > BUS_R - 20) pts.push([BUS_L, a.y], [BUS_L, LANE_LOW], [BUS_R, LANE_LOW], [BUS_R, b.y]);
      else pts.push([BUS_L, a.y], [BUS_L, b.y]);
    } else if (A.nx !== 0 && B.nx !== 0) {
      const mx = (a.x + b.x) / 2; pts.push([mx, a.y], [mx, b.y]);
    } else if (A.ny !== 0 && B.ny !== 0) {
      const my = (a.y + b.y) / 2; pts.push([a.x, my], [b.x, my]);
    } else if (A.nx !== 0) pts.push([b.x, a.y]);
    else pts.push([a.x, b.y]);
    pts.push([b.x, b.y], [B.x, B.y]);
    return rounded(pts, 7);
  }
  /* A polyline with rounded corners. */
  function rounded(pts, r) {
    const q = pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
    let d = `M${q[0][0]} ${q[0][1]}`;
    for (let i = 1; i < q.length - 1; i++) {
      const [x0, y0] = q[i - 1], [x1, y1] = q[i], [x2, y2] = q[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1);
      const k = Math.min(r, l1 / 2, l2 / 2);
      if (!k) { d += ` L${x1} ${y1}`; continue; }
      const p1 = [x1 - ((x1 - x0) / l1) * k, y1 - ((y1 - y0) / l1) * k];
      const p2 = [x1 + ((x2 - x1) / l2) * k, y1 + ((y2 - y1) / l2) * k];
      d += ` L${p1[0].toFixed(1)} ${p1[1].toFixed(1)} Q${x1} ${y1} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    const z = q[q.length - 1];
    return d + ` L${z[0]} ${z[1]}`;
  }

  /* Can these two ports be connected? Returns the connector in the direction of the flow, or why not. */
  function check(p1, p2, wires) {
    if (p1.part === p2.part) return { ok: false, why: 'A part is not connected to itself here.' };
    const d1 = portDef(p1.part, p1.port), d2 = portDef(p2.part, p2.port);
    if (d1.iface !== d2.iface) return { ok: false, why: `Not the same interface block: ${d1.iface} and ${d2.iface}.` };
    let w;
    if (d1.dir === 'out' && d2.dir === 'in') w = { a: p1, b: p2 };
    else if (d1.dir === 'in' && d2.dir === 'out') w = { a: p2, b: p1 };
    else if (d1.dir === 'inout' && d2.dir === 'inout') {
      /* keep the direction of the recipe when there is one, so the item flows read the same way */
      const known = L.CAPS.some((c) => c.wires.some((x) => x.a.part === p2.part && x.a.port === p2.port && x.b.part === p1.part));
      w = known ? { a: p2, b: p1 } : { a: p1, b: p2 };
    } else return { ok: false, why: `Both ports are ${d1.dir}: the flow needs one out and one in.` };
    const k = wireKey(w);
    if (wires.some((x) => wireKey(x) === k)) return { ok: false, why: 'These two ports are already connected.' };
    const taken = (p, def) => def.dir !== 'out' && wires.some((x) => (x.a.part === p.part && x.a.port === p.port) || (x.b.part === p.part && x.b.port === p.port));
    if (taken(w.b, portDef(w.b.part, w.b.port))) return { ok: false, why: `${L.BY[w.b.part].name}.${portDef(w.b.part, w.b.port).name} already receives a connector.` };
    if (portDef(w.a.part, w.a.port).dir === 'inout' && taken(w.a, portDef(w.a.part, w.a.port))) return { ok: false, why: `${L.BY[w.a.part].name}.${portDef(w.a.part, w.a.port).name} is already connected.` };
    return { ok: true, wire: w };
  }

  /* Arrow inside a port square, for its direction, drawn for a port on the left side, then turned. */
  const ROT = { l: 0, t: 90, r: 180, b: 270 };
  function portGlyph(g, p, pos) {
    const s = el('g', { transform: `translate(${pos.x} ${pos.y}) rotate(${ROT[p.side]})` }, g);
    el('rect', { x: -7, y: -7, width: 14, height: 14, rx: 2.5, class: 'ibd-port-box' }, s);
    const d = p.dir === 'in' ? 'M-4 -3.4 L2.6 0 L-4 3.4Z' : p.dir === 'out' ? 'M3.4 -3.4 L-3.2 0 L3.4 3.4Z' : 'M-4.4 0 L-1 -3.4 V3.4Z M4.4 0 L1 -3.4 V3.4Z';
    el('path', { d, class: 'ibd-port-arrow' }, s);
  }

  function create(host, cb) {
    const svg = el('svg', { viewBox: `0 0 ${VB.w} ${VB.h}`, class: 'ibd', role: 'img', 'aria-label': 'Internal block diagram of the drone' });
    host.appendChild(svg);
    const defs = el('defs', null, svg);
    defs.innerHTML = `<pattern id="ibd-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" class="ibd-dot"/></pattern>`;
    el('rect', { x: 0, y: 0, width: VB.w, height: VB.h, fill: 'url(#ibd-dots)' }, svg);
    const frame = el('g', { class: 'ibd-frame' }, svg);
    el('rect', { x: FRAME.x, y: FRAME.y, width: FRAME.w, height: FRAME.h, rx: 4 }, frame);
    const tab = el('path', { class: 'ibd-tab', d: '' }, frame);
    const title = el('text', { x: FRAME.x + 10, y: FRAME.y + 17, class: 'ibd-title' }, frame);
    const slotG = el('g', { class: 'ibd-slots' }, svg);
    const wireG = el('g', { class: 'ibd-wires' }, svg);
    const partG = el('g', { class: 'ibd-parts' }, svg);
    const flowG = el('g', { class: 'ibd-flows' }, svg);
    const packetG = el('g', { class: 'ibd-packets' }, svg);
    const tempG = el('g', { class: 'ibd-temp' }, svg);

    const wireEls = new Map();   /* key -> path */
    const partEls = new Map();   /* id -> g */
    let last = null;             /* the last state rendered */
    let selected = null;

    function setTitle(text) {
      title.textContent = text;
      const w = Math.min(FRAME.w - 20, title.getComputedTextLength ? title.getComputedTextLength() + 26 : 300);
      tab.setAttribute('d', `M${FRAME.x} ${FRAME.y + 25} H${FRAME.x + w} L${FRAME.x + w + 10} ${FRAME.y + 15} V${FRAME.y}`);
    }

    function toSvg(e) {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }

    /* The ghost places of the parts still to drop (when a target variant is chosen). */
    function renderSlots(need, parts, dragging) {
      slotG.textContent = '';
      L.BLOCKS.forEach((b) => {
        if (!b.ibd || parts.has(b.id)) return;
        const wanted = need.has(b.id) || dragging === b.id;
        if (!wanted) return;
        const g = el('g', { class: 'ibd-slot' + (dragging === b.id ? ' is-target' : '') }, slotG);
        el('rect', { x: b.ibd.x, y: b.ibd.y, width: b.ibd.w, height: b.ibd.h, rx: 6 }, g);
        const t = el('text', { x: b.ibd.x + b.ibd.w / 2, y: b.ibd.y + b.ibd.h / 2 + 4, 'text-anchor': 'middle' }, g);
        t.textContent = b.short;
      });
    }

    function renderParts(st) {
      partG.textContent = '';
      partEls.clear();
      L.BLOCKS.forEach((b) => {
        if (!b.ibd || !st.parts.has(b.id)) return;
        const r = b.ibd;
        const g = el('g', { class: `ibd-part${st.powered.has(b.id) ? ' is-on' : ''}${st.fresh === b.id ? ' is-fresh' : ''}`, 'data-part': b.id }, partG);
        g.style.transformOrigin = `${r.x + r.w / 2}px ${r.y + r.h / 2}px`;
        el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: 6, class: 'ibd-box' }, g);
        const nm = el('text', { x: r.x + r.w / 2, y: r.y + 19, 'text-anchor': 'middle', class: 'ibd-name' }, g);
        nm.textContent = r.w < 140 ? b.short : b.name;
        const sub = el('text', { x: r.x + r.w / 2, y: r.y + 33, 'text-anchor': 'middle', class: 'ibd-sub' }, g);
        sub.textContent = `${b.id} : ${b.name.replace(/ /g, '')}`;
        el('circle', { cx: r.x + r.w - 11, cy: r.y + 11, r: 4, class: 'ibd-led' }, g);
        const x = el('g', { class: 'ibd-del', 'data-del': b.id, transform: `translate(${r.x + 11} ${r.y + 11})` }, g);
        el('circle', { r: 8 }, x); el('path', { d: 'M-3 -3 L3 3 M3 -3 L-3 3' }, x);
        if (b.id === 'mc') renderBays(g, r, st);
        b.ports.forEach((p) => {
          const pos = portPos(b.id, p.id);
          const used = st.wires.some((w) => (w.a.part === b.id && w.a.port === p.id) || (w.b.part === b.id && w.b.port === p.id));
          const pg = el('g', { class: `ibd-port fam-${L.IF[p.iface].fam}${used ? ' is-used' : ''}`, 'data-part': b.id, 'data-port': p.id }, g);
          el('circle', { cx: pos.x, cy: pos.y, r: 15, class: 'ibd-port-hit' }, pg);
          portGlyph(pg, p, pos);
          /* names of side ports inside the box, of top and bottom ports outside, next to the connector */
          const lx = pos.ny ? pos.x + 10 : pos.x - pos.nx * 12, ly = pos.ny ? pos.y + (pos.ny > 0 ? 16 : -8) : pos.y + 3.5;
          const t = el('text', { x: lx, y: ly, class: 'ibd-port-name', 'text-anchor': p.side === 'l' || pos.ny ? 'start' : 'end' }, pg);
          t.textContent = p.name;
          const tt = el('title', null, pg); tt.textContent = `${b.name}.${p.name} : ${p.iface} (${p.dir})`;
        });
        partEls.set(b.id, g);
      });
    }

    /* The bays of the Mission Computer: one card per software block. */
    function renderBays(g, r, st) {
      const x = r.x + 66, w = r.w - 132;
      el('text', { x: r.x + r.w / 2, y: r.y + 52, 'text-anchor': 'middle', class: 'ibd-bay-title' }, g).textContent = 'software bays';
      L.SW_SLOTS.forEach((id, i) => {
        const y = r.y + 62 + i * 45;
        const has = st.parts.has(id);
        const c = el('g', { class: `ibd-card${has ? ' is-in' : ''}${st.need.has(id) && !has ? ' is-need' : ''}${st.fresh === id ? ' is-fresh' : ''}`, 'data-card': id }, g);
        el('rect', { x, y, width: w, height: 36, rx: 5 }, c);
        const t = el('text', { x: x + w / 2, y: y + (has ? 15 : 22), 'text-anchor': 'middle', class: 'ibd-card-name' }, c);
        t.textContent = has ? L.BY[id].name : `bay ${i + 1}`;
        if (has) {
          el('text', { x: x + w / 2, y: y + 29, 'text-anchor': 'middle', class: 'ibd-card-sub' }, c).textContent = '«software» on mc';
          const d = el('g', { class: 'ibd-del', 'data-del': id, transform: `translate(${x + w - 10} ${y + 10})` }, c);
          el('circle', { r: 7 }, d); el('path', { d: 'M-2.6 -2.6 L2.6 2.6 M2.6 -2.6 L-2.6 2.6' }, d);
        }
      });
    }

    function renderWires(st) {
      wireG.textContent = ''; flowG.textContent = '';
      wireEls.clear();
      st.wires.forEach((w) => {
        const def = portDef(w.a.part, w.a.port); const f = L.IF[def.iface];
        const k = wireKey(w);
        const vis = st.view === 'both' || (st.view === 'energy') === (f.fam === 'power');
        const g = el('g', { class: `ibd-wire fam-${f.fam}${vis ? '' : ' is-hidden'}${st.live.has(k) ? ' is-live' : ''}${selected === k ? ' is-sel' : ''}${st.fresh === k ? ' is-fresh' : ''}`, 'data-wire': k }, wireG);
        const d = route(w);
        el('path', { d, class: 'ibd-wire-hit' }, g);
        const p = el('path', { d, class: 'ibd-wire-line' }, g);
        wireEls.set(k, p);
        const t = el('title', null, g); t.textContent = `${L.BY[w.a.part].name}.${def.name} → ${L.BY[w.b.part].name}.${portDef(w.b.part, w.b.port).name} · item flow ${f.flow}${f.back ? ' / ' + f.back : ''}`;
        if (f.fam !== 'power' && vis) {
          /* the item flow: a small black triangle in the middle, pointing to the target */
          const len = p.getTotalLength();
          const m = p.getPointAtLength(len / 2), n = p.getPointAtLength(len / 2 + 1);
          const ang = Math.atan2(n.y - m.y, n.x - m.x) * 180 / Math.PI;
          const fg = el('g', { class: `ibd-flow fam-${f.fam}`, transform: `translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) rotate(${ang.toFixed(1)})` }, flowG);
          el('path', { d: f.back ? 'M-9 0 L-3 -4.5 V4.5Z M9 0 L3 -4.5 V4.5Z' : 'M5 0 L-4 -5 V5Z' }, fg);
          const lb = el('text', { x: m.x, y: m.y - 9, class: 'ibd-flow-name', 'text-anchor': 'middle' }, flowG);
          lb.textContent = f.flow;
          if (Math.abs(ang) > 45 && Math.abs(ang) < 135) { lb.setAttribute('x', m.x + 10); lb.setAttribute('y', m.y + 4); lb.setAttribute('text-anchor', 'start'); }
        }
      });
    }

    function render(st) {
      last = st;
      setTitle(st.title);
      svg.classList.toggle('view-energy', st.view === 'energy');
      svg.classList.toggle('view-data', st.view === 'data');
      renderSlots(st.need, st.parts, st.dragging);
      renderWires(st);
      renderParts(st);
    }

    /* ── drawing a connector ── */
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) { e.stopPropagation(); cb.removePart(del.getAttribute('data-del')); return; }
      const port = e.target.closest('[data-port]');
      if (port) {
        e.preventDefault();
        const from = { part: port.getAttribute('data-part'), port: port.getAttribute('data-port') };
        const pos = portPos(from.part, from.port);
        const line = el('path', { class: `ibd-rubber fam-${L.IF[portDef(from.part, from.port).iface].fam}`, d: '' }, tempG);
        drag = { from, pos, line, id: e.pointerId, over: null };
        svg.setPointerCapture(e.pointerId);
        markCandidates(from);
        return;
      }
      const wire = e.target.closest('[data-wire]');
      selected = wire ? wire.getAttribute('data-wire') : null;
      if (last) renderWires(last);
      if (selected) cb.select && cb.select(selected);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const p = toSvg(e);
      const near = nearest(p, drag.from);
      drag.over = near;
      const end = near ? portPos(near.part, near.port) : { x: p.x, y: p.y };
      const c1 = { x: drag.pos.x + drag.pos.nx * 60, y: drag.pos.y + drag.pos.ny * 60 };
      const c2 = near ? { x: end.x + end.nx * 60, y: end.y + end.ny * 60 } : end;
      drag.line.setAttribute('d', `M${drag.pos.x} ${drag.pos.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`);
      svg.querySelectorAll('.ibd-port.is-over').forEach((n) => n.classList.remove('is-over'));
      if (near) { const n = svg.querySelector(`.ibd-port[data-part="${near.part}"][data-port="${near.port}"]`); if (n) n.classList.add('is-over'); }
    });
    const end = (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      d.line.remove();
      svg.querySelectorAll('.ibd-port.is-can, .ibd-port.is-over, .ibd-port.is-no').forEach((n) => n.classList.remove('is-can', 'is-over', 'is-no'));
      if (e.type === 'pointercancel') return;
      let to = d.over;
      if (!to) {
        const t = document.elementFromPoint(e.clientX, e.clientY);
        const port = t && t.closest && t.closest('[data-port]');
        if (port) to = { part: port.getAttribute('data-part'), port: port.getAttribute('data-port') };
      }
      if (to && !(to.part === d.from.part && to.port === d.from.port)) cb.connect(d.from, to);
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    function markCandidates(from) {
      svg.querySelectorAll('.ibd-port').forEach((n) => {
        const p = { part: n.getAttribute('data-part'), port: n.getAttribute('data-port') };
        if (p.part === from.part && p.port === from.port) return;
        n.classList.add(check(from, p, last.wires).ok ? 'is-can' : 'is-no');
      });
    }
    /* the closest port that would accept the connector, within reach of the pointer */
    function nearest(p, from) {
      let best = null, bd = 30;
      last.parts.forEach((id) => {
        const b = L.BY[id]; if (!b.ports) return;
        b.ports.forEach((q) => {
          const pp = { part: id, port: q.id };
          if (!check(from, pp, last.wires).ok) return;
          const pos = portPos(id, q.id); const dd = Math.hypot(pos.x - p.x, pos.y - p.y);
          if (dd < bd) { bd = dd; best = pp; }
        });
      });
      return best;
    }

    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !/input|textarea/i.test(document.activeElement.tagName)) {
        const k = selected; selected = null; cb.removeWire(k);
      }
    });

    function shake(part) {
      const g = partEls.get(part); if (!g) return;
      g.classList.remove('is-shake'); void g.getBBox(); g.classList.add('is-shake');
    }
    function pulse(part) {
      const g = partEls.get(part) || svg.querySelector(`[data-card="${part}"]`);
      if (!g) return;
      g.classList.remove('is-pulse'); void g.getBBox(); g.classList.add('is-pulse');
    }
    /* Is a client point over the frame? (drop of a palette card) */
    function hit(x, y) {
      const r = svg.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    return { render, wireEls, packetLayer: packetG, shake, pulse, hit, svg, deselect() { selected = null; } };
  }

  Object.assign(L, { IBD: { create, check, wireKey, portDef } });
})();
