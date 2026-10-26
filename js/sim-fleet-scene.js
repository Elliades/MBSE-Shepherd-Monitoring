/* The pasture of the fleet simulation (Part 3): the field and its fence, the flock, the base station,
   one drone per drone of the fleet, the predator, and the command links from the master (the base station
   or the lead drone of the swarm) to the drones it pilots. Everything is placed in % of the field and
   moved by one frame loop; the behaviours come from js/sim-fleet-core.js.

   const scene = window.FleetScene.create(hostElement)
   scene.setFleet(snapshot)   the fleet changed (snapshot of FleetCore.createFleet)
   scene.setVisible(bool)     the frame loop only runs while the scene is on screen */
(function () {
  const ASSET = ((window.COURSE_CONFIG || {}).sharedBase || '') + 'assets/sim/';

  /* Places, in % of the field (the field is 800 x 720, as the one-drone pasture). */
  const FENCE = { x: 12, y: 9, w: 76, h: 76 };
  const ZONE = { x: 32, y: 31, w: 36, h: 34 };
  const CENTER = { x: 50, y: 48 };
  const BASE = { x: 8, y: 92 };
  const PATROL = { rx: 30, ry: 29, period: 18000 };
  const GUARD = { r: 11, period: 9000 };
  const BEAR = { enter: { x: 106, y: 28 }, near: { x: 74, y: 35 }, out: { x: 120, y: 10 } };
  const SHEEP = [
    { x: 41, y: 40 }, { x: 52, y: 52 }, { x: 59, y: 42 }, { x: 44, y: 58 }, { x: 50, y: 45 }
  ];
  const SPEED = 24;          /* % of the field per second, for a drone */
  const BEAR_SPEED = { track: 7, counter: 5, pursue: 9 };
  /* the drones that work on the field; one of them outside the fence is shown OUT */
  const FIELD_WORK = ['patrol', 'guard', 'track', 'counter', 'pursue'];
  const AT_BASE = ['off', 'ready', 'return'];
  const ACTIVE = ['deploy', 'patrol', 'guard', 'track', 'counter', 'pursue', 'return', 'unknown'];
  const CRIES = ['shoo!', 'bzzt!', 'go away!'];
  const BLEATS = ['baa', 'beeeh', 'baaah', 'mehh'];

  const insideFence = (p) => p.x > FENCE.x && p.x < FENCE.x + FENCE.w && p.y > FENCE.y && p.y < FENCE.y + FENCE.h;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const around = (c, r, a) => ({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });

  /* Write to the DOM only what changed: the frame loop renders every frame. */
  function put(el, key, value, apply) {
    const cache = el.__put || (el.__put = {});
    if (cache[key] === value) return;
    cache[key] = value;
    apply(value);
  }
  const setText = (el, v) => put(el, 'text', v, () => { el.textContent = v; });
  const setHidden = (el, v) => put(el, 'hidden', v, () => { el.hidden = v; });
  const setClass = (el, v) => put(el, 'class', v, () => { el.className = v; });
  const setStyle = (el, name, v) => put(el, 's:' + name, v, () => { el.style.setProperty(name, v); });
  const setAttr = (el, name, v) => put(el, 'a:' + name, v, () => { el.setAttribute(name, v); });

  const HTML = `
    <div class="flt-field">
      <div class="flt-outside" aria-hidden="true"></div>
      <div class="flt-fence"><span class="flt-label">FIELD</span></div>
      <div class="flt-perimeter" hidden></div>
      <div class="flt-zone"><span class="flt-label">FLOCK</span></div>
      ${SHEEP.map((p, i) => `<div class="flt-sheep" style="left:${p.x}%;top:${p.y}%"><span class="flt-bleat" hidden></span><img src="${ASSET}sheep.svg" alt="" style="animation-delay:${(i * 0.4).toFixed(1)}s"></div>`).join('')}
      <svg class="flt-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="flt-base"><span class="flt-crown" hidden>MASTER</span><img src="${ASSET}BaseStation.svg" alt=""><span>BASE</span></div>
      <div class="flt-bear" hidden><span class="flt-bubble" hidden></span><img src="${ASSET}bear.svg" alt=""></div>
      <div class="flt-drones"></div>
      <div class="flt-chip"></div>
      <div class="flt-rule" hidden></div>
    </div>`;

  function create(host) {
    host.classList.add('flt-scene');
    host.innerHTML = HTML;
    const q = (sel) => host.querySelector(sel);
    const el = {
      fence: q('.flt-fence'),
      zone: q('.flt-zone'),
      perimeter: q('.flt-perimeter'),
      sheep: [...host.querySelectorAll('.flt-sheep')],
      links: q('.flt-links'),
      base: q('.flt-base'),
      crown: q('.flt-crown'),
      bear: q('.flt-bear'),
      bearBubble: q('.flt-bear .flt-bubble'),
      drones: q('.flt-drones'),
      chip: q('.flt-chip'),
      rule: q('.flt-rule')
    };
    el.bleats = el.sheep.map((s) => s.querySelector('.flt-bleat'));

    let fleet = { drones: [], master: '', rule: { tone: 'idle', text: '' } };
    /* per drone id: { pos, node, parts, cry } */
    const live = new Map();
    const bear = { x: BEAR.enter.x, y: BEAR.enter.y, shown: false, gone: false };
    let visible = false;
    let frame = 0;
    let last = 0;
    let bleatTimer = 0;

    function parkedSpot(i) {
      return { x: BASE.x + 6 + (i % 5) * 6, y: BASE.y - 1 - Math.floor(i / 5) * 7 };
    }

    function droneNode(d) {
      const node = document.createElement('div');
      node.innerHTML = `
        <span class="flt-sensor"></span>
        <span class="flt-fx" hidden></span>
        <img class="flt-body" src="${ASSET}Drone-without-circle.svg" alt="">
        <span class="flt-star" hidden>★</span>
        <span class="flt-cry" hidden></span>
        <span class="flt-tag"></span>`;
      el.drones.appendChild(node);
      return {
        node,
        tag: node.querySelector('.flt-tag'),
        fx: node.querySelector('.flt-fx'),
        star: node.querySelector('.flt-star'),
        cry: node.querySelector('.flt-cry'),
        pos: parkedSpot(d.index),
        cryText: '',
        cryUntil: 0
      };
    }

    function setFleet(snap) {
      fleet = snap;
      const ids = new Set(snap.drones.map((d) => d.id));
      live.forEach((v, id) => { if (!ids.has(id)) { v.node.remove(); live.delete(id); } });
      snap.drones.forEach((d) => {
        let v = live.get(d.id);
        if (!v) { v = droneNode(d); live.set(d.id, v); }
        if (v.behaviour !== d.behaviour) {
          v.behaviour = d.behaviour;
          if (d.behaviour === 'counter') say(v, CRIES[d.index % CRIES.length], 2400);
          if (d.behaviour === 'track') say(v, 'huh!', 1500);
          if (d.behaviour === 'pursue') say(v, 'after it!', 1800);
          if (d.behaviour === 'return') say(v, 'back home', 1500);
        }
      });
      render(performance.now());
      wake();
    }
    function say(v, text, ms) { v.cryText = text; v.cryUntil = performance.now() + ms; }

    /* ───────── where each one goes ───────── */
    function groups() {
      const by = {};
      fleet.drones.forEach((d) => { (by[d.behaviour] = by[d.behaviour] || []).push(d.id); });
      return by;
    }
    function bearMode(by) {
      if (by.pursue) return 'pursue';
      if (by.counter) return 'counter';
      if (by.track) return 'track';
      return '';
    }
    function moveBear(mode, dt, now) {
      if (!mode) { bear.shown = false; bear.gone = false; bear.x = BEAR.enter.x; bear.y = BEAR.enter.y; return; }
      if (bear.gone) return;
      bear.shown = true;
      let target;
      if (mode === 'track') {
        target = { x: BEAR.near.x + Math.sin(now / 1700) * 5, y: BEAR.near.y + Math.cos(now / 2300) * 6 };
      } else if (mode === 'counter') {
        /* pushed away from the flock, to the edge of the fence */
        const dx = bear.x - CENTER.x;
        const dy = bear.y - CENTER.y;
        const k = Math.hypot(dx, dy) || 1;
        target = { x: CENTER.x + (dx / k) * 40, y: CENTER.y + (dy / k) * 40 };
      } else {
        target = BEAR.out;
      }
      step(bear, target, BEAR_SPEED[mode], dt);
      if (mode === 'pursue' && bear.x > 104) { bear.gone = true; bear.shown = false; }
    }
    function step(p, target, speed, dt) {
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.hypot(dx, dy);
      const max = speed * dt / 1000;
      if (dist <= max) { p.x = target.x; p.y = target.y; return; }
      p.x += (dx / dist) * max;
      p.y += (dy / dist) * max;
    }
    function targetOf(d, by, now) {
      const list = by[d.behaviour] || [d.id];
      const k = list.indexOf(d.id);
      const n = list.length;
      const all = fleet.drones.length || 1;
      const patrolAt = (a) => ({ x: CENTER.x + Math.cos(a) * PATROL.rx, y: CENTER.y + Math.sin(a) * PATROL.ry });
      switch (d.behaviour) {
        case 'patrol': return patrolAt((now / PATROL.period) * Math.PI * 2 + (Math.PI * 2 * k) / n);
        case 'guard': return around(CENTER, GUARD.r, -(now / GUARD.period) * Math.PI * 2 + (Math.PI * 2 * k) / n);
        case 'deploy':
        case 'unknown': return patrolAt(Math.PI * 0.75 + (Math.PI * 2 * d.index) / all);
        case 'track': return around(bear, 10, Math.PI * (1.05 + 0.3 * k));
        case 'counter': return around(bear, 7, Math.PI * (1.1 + 0.35 * k));
        case 'pursue': {
          const p = around(bear, 8, Math.PI * (1.1 + 0.25 * k));
          return { x: clamp(p.x, 6, 91), y: clamp(p.y, 6, 90) };
        }
        default: return parkedSpot(d.index);
      }
    }

    /* ───────── drawing ───────── */
    function render(now) {
      const by = groups();
      const mode = bearMode(by);
      const stressed = !!mode;
      setClass(el.zone, `flt-zone${by.counter ? ' flt-zone--danger' : stressed ? ' flt-zone--warning' : ''}`);
      setHidden(el.perimeter, !stressed);
      setClass(el.perimeter, `flt-perimeter${by.counter || by.pursue ? ' flt-perimeter--alert' : ''}`);
      el.sheep.forEach((s) => setClass(s, `flt-sheep${stressed ? ' flt-sheep--nervous' : ''}`));

      setHidden(el.bear, !bear.shown);
      setClass(el.bear, `flt-bear${by.counter ? ' flt-bear--danger' : ''}`);
      setStyle(el.bear, 'left', `${bear.x.toFixed(2)}%`);
      setStyle(el.bear, 'top', `${bear.y.toFixed(2)}%`);

      const master = fleet.master;
      setHidden(el.crown, master !== 'base');
      setClass(el.base, `flt-base${master === 'base' ? ' flt-base--master' : ''}`);

      fleet.drones.forEach((d) => {
        const v = live.get(d.id);
        if (!v) return;
        const out = !insideFence(v.pos) && FIELD_WORK.includes(d.behaviour);
        /* near a side, the tag hangs inward so it stays in view */
        const edge = v.pos.x > 78 ? ' flt-drone--right' : v.pos.x < 16 ? ' flt-drone--left' : '';
        setClass(v.node, `flt-drone flt-drone--${d.behaviour}${master === d.id ? ' flt-drone--master' : ''}${out ? ' flt-drone--out' : ''}${edge}`);
        setStyle(v.node, 'left', `${v.pos.x.toFixed(2)}%`);
        setStyle(v.node, 'top', `${v.pos.y.toFixed(2)}%`);
        setStyle(v.node, '--role', d.color);
        /* at the base the drones stand close: their role tag only */
        setText(v.tag, AT_BASE.includes(d.behaviour) ? d.tag : `${d.tag} · ${d.name}${out ? ' · OUT' : ''}`);
        setHidden(v.star, master !== d.id);
        setHidden(v.fx, d.behaviour !== 'counter');
        const talking = v.cryText && now < v.cryUntil;
        setHidden(v.cry, !talking);
        if (talking) setText(v.cry, v.cryText);
      });

      renderLinks(by);
      const n = fleet.drones.length;
      const lead = master === 'base' ? 'base station' : master ? (fleet.drones.find((d) => d.id === master) || {}).name : 'none';
      setText(el.chip, `${n} drone${n === 1 ? '' : 's'} · master: ${lead}`);
      const r = fleet.rule || {};
      setHidden(el.rule, !(r.tone === 'ok' || r.tone === 'alarm'));
      setClass(el.rule, `flt-rule flt-rule--${r.tone}`);
      setText(el.rule, r.text || '');
      setAttr(host, 'aria-label', `The pasture: ${fleet.drones.map((d) => `${d.name} (${d.roleLabel}) ${d.step}`).join('; ')}. ${r.text || ''}`);
    }

    /* One line from the master to every drone it pilots (the ones out of the base, not crashed). */
    function renderLinks() {
      const master = fleet.master;
      let from = null;
      if (master === 'base') from = { x: BASE.x, y: BASE.y - 4 };
      else if (master && live.has(master)) {
        const lead = fleet.drones.find((d) => d.id === master);
        if (lead && lead.behaviour !== 'crashed') from = live.get(master).pos;
      }
      const lines = [];
      if (from) {
        fleet.drones.forEach((d) => {
          if (d.id === master || !ACTIVE.includes(d.behaviour)) return;
          const p = live.get(d.id).pos;
          const away = d.behaviour === 'pursue';
          lines.push(`<line x1="${from.x.toFixed(2)}" y1="${from.y.toFixed(2)}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}" class="${away ? 'away' : ''}"/>`);
        });
      }
      put(el.links, 'html', lines.join(''), (v) => { el.links.innerHTML = v; });
    }

    /* ───────── frame loop ───────── */
    function wake() {
      if (!visible || frame) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
    function tick(now) {
      frame = 0;
      if (!visible) return;
      const dt = Math.min(40, now - last);
      last = now;
      const by = groups();
      moveBear(bearMode(by), dt, now);
      fleet.drones.forEach((d) => {
        const v = live.get(d.id);
        if (!v || d.behaviour === 'crashed') return;
        step(v.pos, targetOf(d, by, now), d.behaviour === 'pursue' ? SPEED * 1.2 : SPEED, dt);
      });
      render(now);
      frame = requestAnimationFrame(tick);
    }

    /* A sheep bleats now and then. */
    function bleat() {
      clearTimeout(bleatTimer);
      if (!visible) return;
      const i = Math.floor(Math.random() * el.bleats.length);
      el.bleats[i].textContent = BLEATS[Math.floor(Math.random() * BLEATS.length)];
      el.bleats[i].hidden = false;
      setTimeout(() => { el.bleats[i].hidden = true; }, 900);
      bleatTimer = setTimeout(bleat, (bearMode(groups()) ? 900 : 2200) + Math.random() * 2500);
    }

    function setVisible(on) {
      if (on === visible) return;
      visible = on;
      if (!on) { cancelAnimationFrame(frame); frame = 0; clearTimeout(bleatTimer); return; }
      bleat();
      wake();
    }

    render(performance.now());
    return { setFleet, setVisible };
  }

  window.FleetScene = { create };
})();
