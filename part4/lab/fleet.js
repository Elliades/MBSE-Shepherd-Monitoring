/* Part 4 lab (POC): the fleet mission. The drones built in the assembly bay (or a default fleet) guard
   the flock; a bear comes out of the forest. Who sees it, who engages it and who keeps the field depends
   only on the capabilities of the drones: change the fleet, the story changes.
   Every message between drones is drawn on the pasture and written in a live sequence diagram;
   tapping a message opens it: which subsystems inside each drone took part. */
(function () {
  'use strict';
  const L = window.LAB;
  const NS = 'http://www.w3.org/2000/svg';
  const KEY = 'mbse-shepherd:part4-lab:fleet:v1';
  const MAP = { w: 1000, h: 600 };
  const FENCE = { x: 120, y: 70, w: 740, h: 470 };
  const BASE = { x: 64, y: 548 };
  const FOREST = { x: 948, y: 70 };
  const FLOCK0 = { x: 470, y: 340 };
  const MAX_DRONES = 5;

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* private window */ } }
  };
  const SHORT = { zone: 'Zone', sheep: 'Sheep', predator: 'Predator', engage: 'Engage', master: 'Master' };
  const preset = (v, m) => ({ name: L.variantName(v, m), variant: v, color: L.VAR[v].color, caps: L.variantCaps(v, m) });
  const DEFAULT = [preset('guard', true), preset('herder', false), preset('ranger', false)];

  function create(o) {
    let roster = (store.get() || DEFAULT).slice(0, MAX_DRONES);
    let playing = false, speed = 1, visible = false;
    let sim = null;

    /* ── the map ── */
    const svg = el('svg', { viewBox: `0 0 ${MAP.w} ${MAP.h}`, class: 'map', role: 'img', 'aria-label': 'The pasture, seen from above' });
    o.map.appendChild(svg);
    svg.innerHTML = `
      <defs>
        <pattern id="map-grass" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M4 20l2-6M13 9l1-6M20 22l2-5" class="map-blade"/></pattern>
        <radialGradient id="map-tree"><stop offset="0" class="map-tree-a"/><stop offset="1" class="map-tree-b"/></radialGradient>
      </defs>
      <rect width="${MAP.w}" height="${MAP.h}" class="map-bg"/>
      <rect width="${MAP.w}" height="${MAP.h}" fill="url(#map-grass)"/>
      <path class="map-path" d="M${BASE.x + 20} ${BASE.y - 8} C 200 520, 260 470, 330 450"/>
      <g class="map-forest">${[[930, 40, 46], [985, 95, 40], [890, 0, 38], [985, 10, 34], [940, 140, 30], [860, 40, 22], [990, 180, 32], [900, 100, 24]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#map-tree)"/>`).join('')}</g>
      <rect class="map-fence" x="${FENCE.x}" y="${FENCE.y}" width="${FENCE.w}" height="${FENCE.h}" rx="26"/>
      <text class="map-tag" x="${FENCE.x + 14}" y="${FENCE.y + 22}">PASTURE</text>
      <text class="map-tag" x="908" y="228">FOREST</text>`;
    const patrolG = el('g', { class: 'map-patrol' }, svg);
    const linkG = el('g', { class: 'map-links' }, svg);
    const sheepG = el('g', { class: 'map-sheep' }, svg);
    const fxG = el('g', { class: 'map-fx' }, svg);
    const baseG = el('g', { class: 'map-base', transform: `translate(${BASE.x} ${BASE.y})` }, svg);
    baseG.innerHTML = '<rect x="-26" y="-18" width="52" height="34" rx="5"/><path d="M-8 -18 V-40 M-8 -40 l-8 -8 M-8 -40 l8 -8" class="ant"/><circle cx="-8" cy="-40" r="3" class="tip"/><text y="34" text-anchor="middle">Base station</text><text y="5" text-anchor="middle" class="ico">⌂</text>';
    const bearG = el('g', { class: 'map-bear' }, svg);
    bearG.innerHTML = '<ellipse rx="17" ry="13"/><circle cx="-9" cy="-11" r="5"/><circle cx="9" cy="-11" r="5"/><circle cx="-5" cy="-2" r="2" class="eye"/><circle cx="5" cy="-2" r="2" class="eye"/><ellipse cy="5" rx="6" ry="4" class="snout"/>';
    const droneG = el('g', { class: 'map-drones' }, svg);
    const msgG = el('g', { class: 'map-msgs' }, svg);
    const banner = document.createElement('div');
    banner.className = 'map-banner';
    o.map.appendChild(banner);

    /* the flock */
    const sheep = Array.from({ length: 30 }, (_, i) => {
      const a = i * 2.4, r = 14 + (i % 7) * 7;
      const p = { x: FLOCK0.x + Math.cos(a) * r * 1.4, y: FLOCK0.y + Math.sin(a) * r, vx: 0, vy: 0 };
      p.g = el('ellipse', { rx: 6, ry: 4.4, class: 'sheep' }, sheepG);
      return p;
    });

    /* ── the sequence diagram ── */
    const seqHead = document.createElement('div'); seqHead.className = 'seq-head';
    const seqBody = document.createElement('div'); seqBody.className = 'seq-body';
    const seqSvg = el('svg', { class: 'seq' }, seqBody);
    o.seq.append(seqHead, seqBody);
    let rows = [];
    let picked = -1;

    function lifelines() { return [{ id: 'base', name: 'Base station', color: 'var(--ink-2)' }].concat(sim ? sim.drones.map((d) => ({ id: d.id, name: d.name, color: d.color, master: d.master })) : []); }
    function renderSeqHead() {
      const ll = lifelines();
      seqHead.style.gridTemplateColumns = `repeat(${ll.length}, 1fr)`;
      seqHead.innerHTML = ll.map((l) => `<div style="--vc:${l.color}"><b>${l.id === 'base' ? 'Base' : l.id}</b><span>${l.name}${l.master ? ' ♛' : ''}</span></div>`).join('');
    }
    function renderSeq() {
      const ll = lifelines();
      const W = Math.max(280, seqBody.clientWidth || 360), col = W / ll.length, RH = 30;
      const H = Math.max(seqBody.clientHeight || 300, 16 + rows.length * RH + 20);
      seqSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      seqSvg.setAttribute('width', W); seqSvg.setAttribute('height', H);
      seqSvg.textContent = '';
      const X = (id) => (ll.findIndex((l) => l.id === id) + 0.5) * col;
      ll.forEach((l) => el('line', { x1: X(l.id), x2: X(l.id), y1: 0, y2: H, class: 'seq-life' }, seqSvg));
      rows.forEach((r, i) => {
        const y = 22 + i * RH;
        const g = el('g', { class: `seq-row fam-${r.fam || 'fleet'}${picked === i ? ' is-picked' : ''}${r.hot ? ' is-hot' : ''}`, 'data-row': i }, seqSvg);
        el('rect', { x: 0, y: y - 17, width: W, height: RH, class: 'seq-hit' }, g);
        if (r.self) {
          const x = X(r.from);
          el('path', { d: `M${x} ${y - 6} h18 v10 h-16`, class: 'seq-arrow' }, g);
          el('path', { d: `M${x + 2} ${y + 4} l6 -3.5 v7z`, class: 'seq-head-tri' }, g);
          const t = el('text', { x: x + 24, y: y + 2, class: 'seq-label' }, g); t.textContent = r.label;
          if (x + 24 + r.label.length * 6.5 > W) { t.setAttribute('x', x - 6); t.setAttribute('text-anchor', 'end'); }
        } else {
          (r.to === '*' ? ll.filter((l) => l.id !== r.from && l.id !== 'base').map((l) => l.id) : [r.to]).forEach((to, k, all) => {
            const x1 = X(r.from), x2 = X(to), dir = Math.sign(x2 - x1) || 1;
            el('line', { x1, x2: x2 - dir * 4, y1: y, y2: y, class: 'seq-arrow' + (r.reply ? ' is-reply' : '') }, g);
            el('path', { d: `M${x2} ${y} l${-dir * 8} -4 v8z`, class: 'seq-head-tri' }, g);
            if (k === all.length - 1 || all.length === 1) {
              const lx = all.length > 1 ? (X(r.from) + X(all[0])) / 2 : (x1 + x2) / 2;
              const t = el('text', { x: lx, y: y - 5, 'text-anchor': 'middle', class: 'seq-label' }, g);
              t.textContent = r.label + (all.length > 1 ? ' (all)' : '');
            }
          });
        }
        el('text', { x: 4, y: y + 4, class: 'seq-time' }, g).textContent = r.t.toFixed(0) + 's';
      });
      seqBody.scrollTop = seqBody.scrollHeight;
    }
    seqBody.addEventListener('click', (e) => {
      const r = e.target.closest('[data-row]'); if (!r) return;
      picked = +r.getAttribute('data-row');
      renderSeq(); renderInside(rows[picked]);
    });

    /* ── inside a drone: the subsystems a message goes through ── */
    const NAME = (id) => L.BY[id].name;
    function linkOf(d, other) {
      if (other === 'base') return d.caps.includes('master') ? 'relay' : 'wifi';
      return 'fleet';
    }
    /* chains per message: what happens in the sender, what happens in the receiver */
    const CH = {
      MissionStart: { rx: (d, from) => [[linkOf(d, from), 'FlightPlan', 'mc', 'sw-swarm']] },
      Assign: { tx: (d, to) => [['mc', 'Assign', linkOf(d, to), 'sw-swarm']], rx: (d, from, m) => [[linkOf(d, from), 'Assign', 'mc', m.sw]] },
      Status: { tx: (d, to) => [['nav', 'Position', 'mc'], ['mc', 'Status', linkOf(d, to)]], rx: (d, from) => [[linkOf(d, from), 'Status', 'mc', d.caps.includes('master') ? 'sw-swarm' : null]] },
      Intrusion: { tx: (d, to) => [['eo', 'VideoFrame', 'mc', 'sw-zone'], ['mc', 'Intrusion', linkOf(d, to)]] },
      PredatorAlert: { tx: (d, to) => [['ir', 'ThermalFrame', 'mc', 'sw-pred'], ['mc', 'PredatorAlert', linkOf(d, to)]] },
      Engage: { tx: (d, to) => [['mc', 'Engage', linkOf(d, to), 'sw-swarm']], rx: (d, from) => [[linkOf(d, from), 'Engage', 'mc', 'sw-engage'], ['mc', 'Waypoint', 'fc'], ['fc', 'MotorCmd', 'prop']] },
      Tracking: { tx: (d, to) => [['ir', 'ThermalFrame', 'mc', 'sw-pred'], ['mc', 'Tracking', linkOf(d, to)]] },
      Deter: { self: (d) => [['mc', 'Deter', 'det', 'sw-engage']] },
      FlockStatus: { tx: (d, to) => [['eo', 'VideoFrame', 'mc', 'sw-flock'], ['mc', 'FlockStatus', linkOf(d, to)]] },
      RequestFollow: { tx: (d, to) => [['mc', 'RequestFollow', linkOf(d, to), 'sw-engage']] },
      FollowGranted: { tx: (d, to) => [['mc', 'FollowGranted', linkOf(d, to), 'sw-swarm']], rx: (d, from) => [[linkOf(d, from), 'FollowGranted', 'mc', 'sw-engage'], ['mc', 'Waypoint', 'fc']] },
      HoldAtFence: { tx: (d, to) => [['mc', 'HoldAtFence', linkOf(d, to), 'sw-swarm']], rx: (d, from) => [[linkOf(d, from), 'HoldAtFence', 'mc', 'sw-engage'], ['mc', 'Waypoint', 'fc']] },
      AlertShepherd: { tx: (d) => [['mc', 'AlertShepherd', 'relay', 'sw-swarm']] },
      ReturnToBase: { tx: (d, to) => [['mc', 'ReturnToBase', linkOf(d, to), 'sw-swarm']], rx: (d, from) => [[linkOf(d, from), 'ReturnToBase', 'mc'], ['mc', 'Waypoint', 'fc']] }
    };
    function hopsHtml(d, hops) {
      return hops.filter((h) => d.has(h[0]) && d.has(h[2])).map((h, i) => `${i ? '' : `<span class="blk">${NAME(h[0])}${h[3] && h[0] === 'mc' && d.has(h[3]) ? ` <em>${NAME(h[3])}</em>` : ''}</span>`}<span class="flow">${h[1]}</span><span class="blk">${NAME(h[2])}${h[3] && h[2] === 'mc' && d.has(h[3]) ? ` <em>${NAME(h[3])}</em>` : ''}</span>`).join('');
    }
    function renderInside(r) {
      if (!r) { o.inside.innerHTML = '<p class="inside-empty">Tap a message of the diagram to see which subsystems carried it, inside each drone.</p>'; return; }
      const D = (id) => sim.drones.find((x) => x.id === id);
      const kind = CH[r.kind] || {};
      const parts = [];
      const from = D(r.from), to = r.to === '*' ? null : D(r.to);
      if (r.self && from && kind.self) parts.push(`<div class="in-drone" style="--vc:${from.color}"><b>${from.id} · ${from.name}</b><div class="hops">${hopsHtml(from, kind.self(from))}</div></div>`);
      if (!r.self && from && kind.tx) parts.push(`<div class="in-drone" style="--vc:${from.color}"><b>${from.id} · ${from.name} <small>sends</small></b><div class="hops">${hopsHtml(from, kind.tx(from, r.to, r))}</div></div>`);
      if (!r.self && r.from === 'base') parts.push(`<div class="in-drone" style="--vc:var(--ink-2)"><b>Base station <small>sends</small></b><div class="hops"><span class="blk">Ground station</span><span class="flow">${r.label}</span><span class="blk">radio</span></div></div>`);
      const rxs = r.to === '*' ? sim.drones.filter((x) => x.id !== r.from) : to ? [to] : [];
      rxs.slice(0, 2).forEach((t) => { if (kind.rx) parts.push(`<div class="in-drone" style="--vc:${t.color}"><b>${t.id} · ${t.name} <small>receives</small></b><div class="hops">${hopsHtml(t, kind.rx(t, r.from, r))}</div></div>`); });
      if (r.to === 'base') parts.push(`<div class="in-drone" style="--vc:var(--ink-2)"><b>Base station <small>receives</small></b><div class="hops"><span class="blk">radio</span><span class="flow">${r.label}</span><span class="blk">Operator screen</span></div></div>`);
      const open = actFor(r);
      o.inside.innerHTML = (open ? `<button class="lab-btn in-open" data-open="${open.d.id}" data-act="${open.act}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>Watch it inside ${open.d.id}</button>` : '') + `<div class="in-title"><span class="mono">${r.t.toFixed(1)} s</span> <strong>${r.label}</strong> ${r.why ? `<span class="why">${r.why}</span>` : ''}</div>${parts.join('<div class="air">))) radio (((</div>') || '<p class="inside-empty">Nothing inside a drone for this one.</p>'}`;
    }

    /* Which drone to open in the assembly bay for a message, and what to play in it. */
    function actFor(r) {
      const D = (id) => sim.drones.find((x) => x.id === id);
      const tx = { PredatorAlert: 'bear', Tracking: 'bear', Deter: 'bear', FlockStatus: 'flock', Intrusion: 'zone', AlertShepherd: 'order', Status: 'plan', RequestFollow: 'plan' };
      let d, act;
      if (tx[r.kind]) { d = D(r.from); act = tx[r.kind]; }
      else if (r.kind === 'Engage') { d = D(r.to) || D(r.from); act = 'bear'; }
      else { d = D(r.from) && D(r.from).master ? D(r.from) : D(r.to === '*' ? (sim.drones.find((x) => x.id !== r.from) || {}).id : r.to); act = d && d.master ? 'order' : 'plan'; }
      const need = { bear: 'predator', flock: 'sheep', zone: 'zone', order: 'master', plan: 'ground' }[act];
      return d && d.caps.includes(need) ? { d, act } : null;
    }
    o.inside.addEventListener('click', (e) => {
      const b = e.target.closest('[data-open]'); if (!b || !o.openDrone) return;
      const d = sim.drones.find((x) => x.id === b.getAttribute('data-open'));
      setPlaying(false);
      o.openDrone(d, b.getAttribute('data-act'));
    });

    /* ── the hangar (the drones of the fleet) ── */
    function renderHangar() {
      const masterId = sim ? (sim.drones.find((d) => d.master) || {}).id : null;
      o.hangar.innerHTML = roster.map((d, i) => `
        <div class="hg-drone" style="--vc:${d.color}">
          <span class="hg-id">D${i + 1}</span>
          <span class="hg-txt"><strong>${d.name}${sim && masterId === 'D' + (i + 1) ? ' ♛' : ''}</strong><small>${d.caps.filter((c) => SHORT[c]).map((c) => SHORT[c]).join(' · ') || 'flies'}</small></span>
          <button class="hg-x" data-rm="${i}" aria-label="Remove ${d.name} from the fleet">×</button>
        </div>`).join('') +
        (roster.length < MAX_DRONES ? `<label class="hg-add"><span>+ add</span><select id="hg-pick" aria-label="Add a drone">
          <option value="">variant…</option>${L.VARIANTS.map((v) => `<option value="${v.id}">${v.name}</option><option value="${v.id}:m">${v.name} Lead</option>`).join('')}</select></label>` : '') +
        `<p class="hg-note">${masterId ? `Master: <strong>${masterId}</strong>, it has the Swarm Coordinator.` : 'No drone can lead: the <strong>base station</strong> is the master.'}</p>`;
    }
    o.hangar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rm]'); if (!b) return;
      roster.splice(+b.getAttribute('data-rm'), 1); save(); reset();
    });
    o.hangar.addEventListener('change', (e) => {
      if (e.target.id !== 'hg-pick' || !e.target.value) return;
      const [v, m] = e.target.value.split(':');
      roster.push(preset(v, m === 'm')); save(); reset();
    });
    function save() { store.set(roster.map((d) => ({ name: d.name, variant: d.variant, color: d.color, caps: d.caps }))); }

    /* ── the simulation ── */
    function reset() {
      const drones = roster.map((r, i) => ({
        ...r, id: 'D' + (i + 1), p: { x: BASE.x + 40 + i * 26, y: BASE.y - 30 - (i % 2) * 18 }, target: null, role: 'idle', g: null,
        has(id) { return id === 'fly' || this.caps.some((c) => L.CAP[c].parts.includes(id)) || ['energy', 'prop', 'fc', 'nav', 'mc', 'wifi', 'fleet'].includes(id); },
        phase: 0, busy: null, out: false
      }));
      const lead = drones.find((d) => d.caps.includes('master'));
      if (lead) lead.master = true;
      sim = { t: 0, drones, master: lead ? lead.id : 'base', bear: null, msgs: [], events: [], done: new Set(), log: [], end: false };
      rows = []; picked = -1;
      sheep.forEach((s, i) => { const a = i * 2.4, r = 14 + (i % 7) * 7; s.x = FLOCK0.x + Math.cos(a) * r * 1.4; s.y = FLOCK0.y + Math.sin(a) * r; });
      droneG.textContent = ''; msgG.textContent = ''; fxG.textContent = ''; patrolG.textContent = '';
      drones.forEach((d) => {
        d.g = el('g', { class: 'map-drone' + (d.master ? ' is-master' : ''), style: `--vc:${d.color}` }, droneG);
        d.g.innerHTML = `<circle r="25" class="reach"/>${[[-9, -9], [9, -9], [-9, 9], [9, 9]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" class="rotor"/>`).join('')}<rect x="-6" y="-6" width="12" height="12" rx="3" class="core"/>${d.master ? '<circle r="19" class="crown"/>' : ''}<text y="31" text-anchor="middle" class="name">${d.id} ${d.name}</text><text y="43" text-anchor="middle" class="role"></text>`;
      });
      bearG.style.display = 'none';
      setPlaying(false);
      renderSeqHead(); renderSeq(); renderInside(null); renderHangar(); place();
      say('Press Play: the fleet takes off from the base station.');
      o.onCount && o.onCount(roster.length);
    }

    function say(t, tone) { banner.textContent = t; banner.dataset.tone = tone || ''; }
    function at(id) { if (id === 'base') return BASE; const d = sim.drones.find((x) => x.id === id); return d ? d.p : BASE; }
    const nameOf = (id) => id === 'base' ? 'Base' : id;

    /* Send a message: on the map (a dot flying from sender to receiver) and in the sequence diagram. */
    function msg(kind, from, to, label, extra) {
      const r = { kind, from, to, label: label || kind, t: sim.t, fam: 'fleet', ...extra };
      if (from === to || (to === '*' && !sim.drones.some((d) => d.id !== from))) r.self = true;
      rows.push(r);
      if (rows.length > 60) rows.shift();
      renderSeq();
      o.sfx && o.sfx('hop');
      if (r.self) { ring(at(from), 'self'); return; }
      (to === '*' ? sim.drones.filter((d) => d.id !== from).map((d) => d.id) : [to]).forEach((t) => {
        const g = el('g', { class: `map-msg${r.hot ? ' is-hot' : ''}` }, msgG);
        el('circle', { r: 5.5 }, g);
        const tx = el('text', { y: -9, 'text-anchor': 'middle' }, g); tx.textContent = r.label;
        sim.msgs.push({ from, to: t, k: 0, g });
      });
    }
    function ring(p, cls, big) {
      const c = el('circle', { cx: p.x, cy: p.y, r: 6, class: 'map-ring ' + (cls || '') }, fxG);
      c.style.setProperty('--to', (big || 34) + 'px');
      setTimeout(() => c.remove(), 1200);
    }
    function later(dt, fn) { sim.events.push({ at: sim.t + dt, fn }); }
    function once(k, fn) { if (sim.done.has(k)) return; sim.done.add(k); fn(); }

    /* Roles, given by the master: one drone over the flock, the zone drones on the fence, the predator ones near the forest. */
    function assign() {
      const ds = sim.drones;
      const flockers = ds.filter((d) => d.caps.includes('sheep')).sort((a, b) => a.caps.length - b.caps.length);
      const keeper = flockers[0];
      ds.forEach((d, i) => {
        if (d === keeper) { d.role = 'flock'; d.sw = 'sw-flock'; }
        else if (d.caps.includes('predator') && !ds.some((x) => x !== d && x.role === 'watch')) { d.role = 'watch'; d.sw = 'sw-pred'; }
        else if (d.caps.includes('zone')) { d.role = 'zone'; d.sw = 'sw-zone'; }
        else if (d.caps.includes('predator')) { d.role = 'watch'; d.sw = 'sw-pred'; }
        else { d.role = 'flock'; d.sw = 'sw-flock'; }
        d.phase = i * 1.7;
      });
      /* patrol loop of the zone drones */
      if (ds.some((d) => d.role === 'zone')) el('rect', { x: FENCE.x + 26, y: FENCE.y + 26, width: FENCE.w - 52, height: FENCE.h - 52, rx: 18 }, patrolG);
    }
    const ROLE = { flock: 'over the flock', zone: 'zone patrol', watch: 'predator watch', engage: 'engaging', follow: 'following the bear', hold: 'holding at the fence', home: 'back to base', idle: 'on the pad' };

    function post(d, t) {
      const fl = flockCentre();
      if (d.role === 'flock') return { x: fl.x + Math.cos(t * 0.6 + d.phase) * 60, y: fl.y + Math.sin(t * 0.6 + d.phase) * 40 };
      if (d.role === 'zone') {
        /* along the patrol loop */
        const x0 = FENCE.x + 26, y0 = FENCE.y + 26, w = FENCE.w - 52, h = FENCE.h - 52, per = 2 * (w + h);
        let s = ((t * 70 + d.phase * 300) % per + per) % per;
        if (s < w) return { x: x0 + s, y: y0 }; s -= w;
        if (s < h) return { x: x0 + w, y: y0 + s }; s -= h;
        if (s < w) return { x: x0 + w - s, y: y0 + h }; s -= w;
        return { x: x0, y: y0 + h - s };
      }
      if (d.role === 'watch') return { x: 700 + Math.sin(t * 0.5 + d.phase) * 110, y: 150 + Math.cos(t * 0.5 + d.phase) * 40 };
      if (d.role === 'engage' || d.role === 'follow') return sim.bear ? { x: sim.bear.x - 34, y: sim.bear.y + 30 } : d.p;
      if (d.role === 'hold') return { x: FENCE.x + FENCE.w - 30, y: Math.min(Math.max(sim.bear ? sim.bear.y : 120, FENCE.y + 30), FENCE.y + FENCE.h - 30) };
      if (d.role === 'home') { const i = sim.drones.indexOf(d); return { x: BASE.x + 40 + i * 26, y: BASE.y - 30 - (i % 2) * 18 }; }
      return d.p;
    }
    function flockCentre() {
      let x = 0, y = 0; sheep.forEach((s) => { x += s.x; y += s.y; });
      return { x: x / sheep.length, y: y / sheep.length };
    }
    const inField = (p) => p.x > FENCE.x && p.x < FENCE.x + FENCE.w && p.y > FENCE.y && p.y < FENCE.y + FENCE.h;

    /* The story, driven by capabilities. */
    function script() {
      const s = sim, M = s.master;
      const lead = s.drones.find((d) => d.master);
      once('start', () => {
        say(M === 'base' ? 'The base station is the master: it gives every order.' : `${lead.name} (${M}) leads the swarm: the base talks to it only.`);
        if (M === 'base') msg('Assign', 'base', '*', 'Assign(role)', { why: 'No drone has a Swarm Coordinator: the base station assigns the roles.' });
        else {
          msg('MissionStart', 'base', M, 'MissionStart', { why: 'Through the Relay Antenna of the master.' });
          later(0.9, () => msg('Assign', M, '*', 'Assign(role)', { why: 'The Swarm Coordinator gives one role per drone, from their capabilities.' }));
        }
        assign();
      });
      if (s.t > 7) once('status', () => {
        s.drones.filter((d) => d.id !== M).forEach((d, i) => later(i * 0.35, () => msg('Status', d.id, M, 'Status', { reply: true })));
      });
      const keeper = s.drones.find((d) => d.role === 'flock' && d.caps.includes('sheep'));
      if (keeper && s.t > 10) once('flock1', () => msg('FlockStatus', keeper.id, M, 'FlockStatus(30/30)', { why: 'The Flock Tracker counts the sheep on the video.' }));
      if (s.t > 11) once('bear', () => {
        s.bear = { x: FOREST.x, y: FOREST.y + 20, mode: 'come' };
        bearG.style.display = '';
        say('A bear comes out of the forest…', 'warn');
      });
      if (s.bear && !s.seen) {
        const eye = s.drones.find((d) => (d.caps.includes('predator') && dist(d.p, s.bear) < 260) || (d.caps.includes('zone') && dist(d.p, s.bear) < 190 && inField(s.bear)));
        if (eye) {
          s.seen = eye;
          const pred = eye.caps.includes('predator');
          ring(s.bear, 'seen', 60);
          msg(pred ? 'PredatorAlert' : 'Intrusion', eye.id, M, pred ? 'PredatorAlert(bear)' : 'Intrusion(x, y)', { hot: true, fam: pred ? 'heat' : 'video',
            why: pred ? 'Seen in the thermal image, recognised as a bear.' : 'Something moves on the video: the zone drone cannot tell what it is.' });
          say(`${eye.id} ${pred ? 'recognises a bear' : 'sees something move'}: it tells ${nameOf(M)}.`, 'warn');
          later(1.2, decide);
        }
      }
      if (s.engager && s.engager.role === 'engage' && s.bear && dist(s.engager.p, s.bear) < 80) once('deter', () => {
        msg('Deter', s.engager.id, s.engager.id, 'Deter: light + sound', { self: true, hot: true, fam: 'cmd', why: 'The Engage Manager drives the Deterrent System.' });
        say(`${s.engager.id} scares the bear with light and sound. The bear runs away.`, 'warn');
        s.bear.mode = 'flee'; s.deterT = s.t;
        later(2.2, () => msg('RequestFollow', s.engager.id, M, 'RequestFollow', { why: 'A drone may follow the predator out only while another one stays on the field.' }));
        later(3.2, () => {
          const keeperOn = s.drones.some((d) => d !== s.engager && (d.role === 'flock' || d.role === 'zone') && inField(d.p));
          if (keeperOn) {
            msg('FollowGranted', M, s.engager.id, 'FollowGranted', { why: 'Another drone keeps the field: the rule allows it.' });
            s.engager.role = 'follow';
            say(`${s.engager.id} follows the bear out; the flock is still guarded.`);
            later(6, () => { if (s.engager.role === 'follow') { s.engager.role = s.engager.caps.includes('predator') ? 'watch' : 'zone'; msg('Tracking', s.engager.id, M, 'BearGone', { why: 'Back in the forest: the drone comes back to its post.' }); } });
          } else {
            msg('HoldAtFence', M, s.engager.id, 'HoldAtFence', { hot: true, why: 'No other drone on the field: following the bear would leave the flock alone.' });
            s.engager.role = 'hold';
            say(`${s.engager.id} stays at the fence: no other drone would keep the flock.`, 'warn');
            later(5, () => { if (s.engager.role === 'hold') s.engager.role = s.engager.caps.includes('predator') ? 'watch' : 'zone'; });
          }
        });
        if (keeper) later(1.6, () => msg('FlockStatus', keeper.id, M, 'FlockStatus(30/30)', { why: 'The flock is complete.' }));
      });
      if (s.bear && s.bear.mode === 'flee' && dist(s.bear, FOREST) < 30 && s.t > (s.deterT || 0) + 6) once('wrap', () => {
        bearG.style.display = 'none'; s.bear = null;
        later(2, () => {
          msg('ReturnToBase', M, '*', 'ReturnToBase', { why: 'Mission over.' });
          s.drones.forEach((d) => { d.role = 'home'; });
          say('Mission over: every drone flies back to the base station.', 'ok');
          later(6, () => { setPlaying(false); s.end = true; play.querySelector('span').textContent = 'Replay'; });
        });
      });
    }
    /* What the master decides when it learns there is a bear. */
    function decide() {
      const s = sim, M = s.master;
      const cand = s.drones.filter((d) => d.caps.includes('engage')).sort((a, b) => dist(a.p, s.bear) - dist(b.p, s.bear));
      if (cand.length) {
        const e = cand[0]; s.engager = e;
        if (M === e.id) msg('Engage', M, M, 'Engage (itself)', { self: true, hot: true, fam: 'cmd', why: 'The master is the closest drone that can engage.' });
        else msg('Engage', M, e.id, 'Engage(bear)', { hot: true, fam: 'cmd', why: `${e.name} is the closest drone with an Engage Manager and a Deterrent System.` });
        e.role = 'engage';
        if (!s.seen.caps.includes('predator') && e !== s.seen) later(0.8, () => msg('Tracking', e.id, M, 'Tracking(bear)', { fam: 'heat', why: 'Its thermal camera now follows the bear.' }));
      } else {
        msg('AlertShepherd', M, 'base', 'AlertShepherd', { hot: true, why: 'No drone of the fleet can engage a predator: only the shepherd can.' });
        say('No drone can engage the bear: the shepherd is alerted.', 'bad');
        s.bear.mode = 'linger';
        later(7, () => { if (s.bear) { s.bear.mode = 'flee'; s.deterT = s.t - 6; say('The shepherd arrives: the bear goes back to the forest.'); } });
      }
    }

    function step(dt) {
      const s = sim;
      s.t += dt;
      s.events.filter((e) => e.at <= s.t).forEach((e) => { s.events.splice(s.events.indexOf(e), 1); e.fn(); });
      script();
      /* drones */
      s.drones.forEach((d) => {
        if (d.role === 'idle') return;
        const tg = post(d, s.t);
        const dx = tg.x - d.p.x, dy = tg.y - d.p.y, l = Math.hypot(dx, dy);
        const v = Math.min(l, (d.role === 'zone' || d.role === 'flock' || d.role === 'watch' ? 150 : 190) * dt);
        if (l > 0.5) { d.p.x += (dx / l) * v; d.p.y += (dy / l) * v; }
      });
      /* bear */
      const b = s.bear;
      if (b) {
        const fl = flockCentre();
        let tg = b.mode === 'come' || b.mode === 'linger' ? { x: fl.x + 140, y: fl.y - 90 } : FOREST;
        if (b.mode === 'flee' && s.engager && s.engager.role === 'follow') tg = { x: FOREST.x + 60, y: FOREST.y - 40 };
        const dx = tg.x - b.x, dy = tg.y - b.y, l = Math.hypot(dx, dy);
        const v = (b.mode === 'flee' ? 120 : 42) * dt;
        if (l > 2) { b.x += (dx / l) * Math.min(v, l); b.y += (dy / l) * Math.min(v, l); }
      }
      /* sheep: keep together, move away from the bear */
      const fl = flockCentre();
      sheep.forEach((p, i) => {
        let ax = (FLOCK0.x - p.x) * 0.006 + (fl.x - p.x) * 0.008 + Math.sin(s.t * 0.7 + i) * 0.5;
        let ay = (FLOCK0.y - p.y) * 0.006 + (fl.y - p.y) * 0.008 + Math.cos(s.t * 0.5 + i * 1.3) * 0.5;
        if (b) { const d = dist(p, b); if (d < 220) { ax += ((p.x - b.x) / d) * (220 - d) * 0.06; ay += ((p.y - b.y) / d) * (220 - d) * 0.06; } }
        sheep.forEach((q) => { if (q === p) return; const d = dist(p, q); if (d < 22 && d > 0) { ax += ((p.x - q.x) / d) * (22 - d) * 0.12; ay += ((p.y - q.y) / d) * (22 - d) * 0.12; } });
        p.vx = (p.vx + ax * dt * 8) * 0.9; p.vy = (p.vy + ay * dt * 8) * 0.9;
        p.x += p.vx * dt * 10; p.y += p.vy * dt * 10;
      });
      /* messages */
      for (let i = s.msgs.length - 1; i >= 0; i--) {
        const m = s.msgs[i]; m.k += dt / 0.9;
        if (m.k >= 1) { ring(at(m.to), 'rx', 24); m.g.remove(); s.msgs.splice(i, 1); }
      }
      /* deterrent */
      if (s.engager && s.deterT && s.t - s.deterT < 2.4 && Math.floor(s.t * 4) !== Math.floor((s.t - dt) * 4)) ring(s.engager.p, 'sound', 70);
    }

    function place() {
      const s = sim;
      s.drones.forEach((d) => {
        d.g.setAttribute('transform', `translate(${d.p.x.toFixed(1)} ${d.p.y.toFixed(1)})`);
        d.g.querySelector('.role').textContent = ROLE[d.role] || '';
        d.g.classList.toggle('is-out', !inField(d.p) && d.role !== 'home' && d.role !== 'idle');
        d.g.classList.toggle('is-hot', d.role === 'engage' || d.role === 'follow');
      });
      if (s.bear) bearG.setAttribute('transform', `translate(${s.bear.x.toFixed(1)} ${s.bear.y.toFixed(1)})`);
      sheep.forEach((p) => { p.g.setAttribute('cx', p.x.toFixed(1)); p.g.setAttribute('cy', p.y.toFixed(1)); });
      s.msgs.forEach((m) => {
        const a = at(m.from), b = at(m.to), k = m.k;
        m.g.setAttribute('transform', `translate(${(a.x + (b.x - a.x) * k).toFixed(1)} ${(a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * 26).toFixed(1)})`);
      });
      /* links: the master to the drones it pilots, the mesh between the drones */
      linkG.textContent = '';
      const M = at(s.master);
      s.drones.forEach((d) => {
        if (d.role === 'idle' || d.id === s.master) return;
        el('line', { x1: M.x, y1: M.y, x2: d.p.x, y2: d.p.y, class: 'map-cmd' + (s.master === 'base' ? ' from-base' : '') }, linkG);
      });
      if (s.master !== 'base' && s.drones.some((d) => d.role !== 'idle')) el('line', { x1: BASE.x, y1: BASE.y, x2: M.x, y2: M.y, class: 'map-relay' }, linkG);
      if (s.seen && s.bear) el('line', { x1: s.seen.p.x, y1: s.seen.p.y, x2: s.bear.x, y2: s.bear.y, class: 'map-beam' }, linkG);
      if (s.engager && s.bear && s.engager !== s.seen) el('line', { x1: s.engager.p.x, y1: s.engager.p.y, x2: s.bear.x, y2: s.bear.y, class: 'map-beam' }, linkG);
    }

    const play = document.getElementById('fleet-play');
    function setPlaying(v) {
      playing = v;
      play.querySelector('span').textContent = v ? 'Pause' : (sim && sim.t > 0 ? 'Resume' : 'Play');
      play.classList.toggle('lab-btn--route', !v);
    }
    play.addEventListener('click', () => { if (sim.end) reset(); if (!sim.drones.length) { o.toast('The fleet is empty: add a drone.'); return; } setPlaying(!playing); });
    document.getElementById('fleet-restart').addEventListener('click', () => { reset(); setPlaying(true); });
    document.getElementById('speed-seg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-speed]'); if (!b) return;
      speed = +b.getAttribute('data-speed');
      document.querySelectorAll('#speed-seg button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    });
    window.addEventListener('resize', () => { if (visible) renderSeq(); });

    function tick(dt) {
      if (!visible || !sim) return;
      if (playing) { const h = dt * speed; step(h / 2); step(h / 2); }
      place();
    }

    reset();
    return {
      tick,
      show(v) { visible = v; if (v) { renderSeqHead(); renderSeq(); } },
      count: () => roster.length,
      add(d) {
        if (roster.length >= MAX_DRONES) roster.shift();
        roster.push({ name: d.name, variant: d.variant, color: d.color, caps: d.caps });
        save(); reset();
        return roster.length;
      }
    };
  }

  Object.assign(L, { Fleet: { create } });
})();
