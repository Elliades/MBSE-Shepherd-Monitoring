/* The home page: the pasture of the hero, the film, the layers of the method, the real simulation panel, the charts.
   Everything that moves stops when it is off screen, and stays still with prefers-reduced-motion. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* What each scene asks, per part: the `kind` of the scenes of partN/content/scenes.js (counted on 2026-11-02). */
  const PARTS = [
    { name: 'Part 1', read: 25, do: 37, try: 10, answer: 3 },
    { name: 'Part 2', read: 9, do: 19, try: 1, answer: 3 },
    { name: 'Part 3', read: 9, do: 21, try: 12, answer: 5 },
    { name: 'Part 4', read: 3, do: 6, try: 5, answer: 4 }
  ];
  const KINDS = [
    { key: 'read', label: 'Read', color: 'var(--c-read)' },
    { key: 'do', label: 'Do it in Cameo', color: 'var(--c-do)' },
    { key: 'try', label: 'Try it in the page', color: 'var(--c-try)' },
    { key: 'answer', label: 'Answer', color: 'var(--c-answer)' }
  ];

  /* ───────── day and night ───────── */
  const isDark = () => document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  $('h-theme').addEventListener('click', () => {
    const t = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('mbse-shepherd:home-theme', t); } catch (e) { /* not kept */ }
  });

  /* ───────── the bleats: made on the fly with Web Audio, no sound file. On until muted;
     the browser lets them out only after a first click or key on the page. ───────── */
  const sound = (() => {
    const btn = $('h-sound');
    const KEY = 'mbse-shepherd:home-sound';
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { btn.hidden = true; return { baa() {} }; }
    let on = true, ctx = null;
    try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { /* on */ }
    const paint = () => { btn.setAttribute('aria-pressed', String(on)); btn.setAttribute('aria-label', on ? 'Mute the sheep' : 'Let the sheep bleat'); };
    const wake = () => {
      if (!on) return;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
    };
    /* capture: a click on a sheep stops there, and its bleat needs the sound already awake */
    ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, wake, { capture: true, passive: true }));

    /* a sawtooth voice that shakes about 25 times a second (the warble of a sheep), through the formants of an "eh" */
    function baa(pan, big) {
      if (!on || !ctx || document.hidden) return;
      const t = ctx.currentTime + 0.01;
      const dur = big ? rnd(1, 1.25) : rnd(0.5, 0.8);
      const f = big ? rnd(290, 340) : rnd(380, 520);
      const out = ctx.createGain();
      out.gain.value = 0.16;
      let tail = out;
      if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1) * 0.7; out.connect(p); tail = p; }
      tail.connect(ctx.destination);
      const voice = ctx.createOscillator();
      voice.type = 'sawtooth';
      voice.frequency.setValueAtTime(f * 0.85, t);
      voice.frequency.linearRampToValueAtTime(f, t + 0.08);
      voice.frequency.linearRampToValueAtTime(f * 0.9, t + dur);
      const shake = ctx.createOscillator();
      shake.frequency.value = rnd(22, 30);
      const trem = ctx.createGain();
      trem.gain.value = 0.55;
      const deep = ctx.createGain();
      deep.gain.value = 0.45;
      shake.connect(deep).connect(trem.gain);
      const wobble = ctx.createGain();
      wobble.gain.value = f * 0.03;
      shake.connect(wobble).connect(voice.frequency);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(1, t + 0.05);
      env.gain.setValueAtTime(1, t + dur * 0.6);
      env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      voice.connect(trem);
      [[700, 5, 3], [1800, 8, 1.8], [2700, 10, 0.9]].forEach(([fr, q, g]) => {
        const band = ctx.createBiquadFilter();
        band.type = 'bandpass'; band.frequency.value = fr; band.Q.value = q;
        const k = ctx.createGain();
        k.gain.value = g;
        trem.connect(band).connect(k).connect(env);
      });
      env.connect(out);
      voice.start(t); shake.start(t);
      voice.stop(t + dur + 0.05); shake.stop(t + dur + 0.05);
    }

    paint();
    btn.addEventListener('click', () => {
      on = !on;
      paint();
      try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* not kept */ }
      if (on) { wake(); baa(0, false); }
    });
    return { baa };
  })();

  /* ───────── things that appear as they come on screen ───────── */
  const reveal = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach((el) => reveal.observe(el));

  const whenSeen = (el, on, off) => new IntersectionObserver(([e]) => (e.isIntersecting ? on : off)()).observe(el);
  document.querySelectorAll('.h-hop, .h-beats, .h-part-art, .h-foot-flock').forEach((el) => {
    whenSeen(el, () => el.classList.add('run'), () => el.classList.remove('run'));
  });

  /* ───────── the pasture of the hero ───────── */
  function pasture() {
    const field = $('h-field');
    const stateEl = $('h-state');
    const N = innerWidth < 640 ? 9 : 16;
    let W = 1, H = 1;
    const flock = [];
    const size = () => {
      const kx = field.clientWidth / W, ky = field.clientHeight / H;
      W = field.clientWidth; H = field.clientHeight;
      /* a phone turned on its side: the flock stays where it was on the field */
      flock.forEach((s) => { s.x *= kx; s.y *= ky; s.tx *= kx; s.ty *= ky; });
    };
    W = field.clientWidth; H = field.clientHeight;
    addEventListener('resize', size);
    /* the safe zone: the dashed ellipse of .h-route */
    const zone = () => ({ cx: W * 0.5, cy: H * 0.56, rx: W * 0.37, ry: H * 0.33 });
    const depth = (y) => 0.62 + 0.62 * clamp(y / H, 0, 1);

    const add = (src, cls) => {
      const wrap = document.createElement('div');
      wrap.className = cls;
      const img = document.createElement('img');
      img.src = src; img.alt = ''; img.draggable = false;
      wrap.appendChild(img);
      field.appendChild(wrap);
      return wrap;
    };
    const bubble = (x, y, text, cls) => {
      const b = document.createElement('span');
      b.className = 'h-baa' + (cls ? ' ' + cls : '');
      b.textContent = text;
      b.style.left = x + 'px'; b.style.top = y + 'px';
      field.appendChild(b);
      setTimeout(() => b.remove(), 1500);
    };

    for (let i = 0; i < N; i++) {
      const a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 0.72, z = zone();
      const s = {
        el: add('home/lamb.svg', 'h-sheep'),
        x: z.cx + Math.cos(a) * z.rx * r, y: z.cy + Math.sin(a) * z.ry * r,
        vx: 0, vy: 0, tx: 0, ty: 0, wait: rnd(0, 3), phase: rnd(0, 6), hop: 0, flip: Math.random() < 0.5, stray: 0
      };
      s.tx = s.x; s.ty = s.y;
      const poke = (ev) => {
        ev.stopPropagation();
        s.hop = 1;
        const big = Math.random() < 0.12;
        bubble(s.x, s.y - 40 * depth(s.y), big ? 'BAAAA!' : 'baa!');
        sound.baa(side(s.x), big);
        flock.forEach((o) => { if (o !== s && Math.hypot(o.x - s.x, o.y - s.y) < 90) o.hop = Math.max(o.hop, 0.6); });
      };
      s.el.addEventListener('pointerdown', poke);
      flock.push(s);
    }
    const drone = add('assets/sim/Drone-without-circle.svg', 'h-drone');
    const bearEl = add('assets/sim/bear.svg', 'h-bear');
    /* left or right of the field, for the stereo of the bleats */
    const side = (x) => (x / W) * 2 - 1;
    /* a sheep of the flock bleats now and then, by itself */
    let chatter = rnd(3, 6);
    const chat = (s, text, big) => { bubble(s.x, s.y - 40 * depth(s.y), text); sound.baa(side(s.x), big); };
    const pointer = { x: -999, y: -999, on: false };
    field.addEventListener('pointermove', (e) => { const r = field.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.on = true; });
    field.addEventListener('pointerleave', () => { pointer.on = false; });

    let angle = -1.2;
    const dr = { x: W / 2, y: H / 2, z: 1 };
    const bear = { x: -200, y: H * 0.6, on: false, phase: 'out', t: 0, side: 1 };
    let bearIn = 7, strayIn = 5, step = 'Patrolling';
    const setState = (name, tone) => {
      if (step === name) return;
      step = name;
      stateEl.querySelector('span').textContent = name;
      stateEl.dataset.tone = tone || '';
    };

    function bearTick(dt) {
      const z = zone();
      if (!bear.on) {
        bearIn -= dt;
        if (bearIn <= 0) {
          bear.on = true; bear.phase = 'come'; bear.t = 0;
          bear.side = Math.random() < 0.5 ? -1 : 1;
          bear.x = bear.side < 0 ? -60 : W + 60;
          bear.y = H * rnd(0.55, 0.85);
          bearEl.classList.add('on');
        }
        return;
      }
      bear.t += dt;
      if (bear.phase === 'come') {
        bear.x += -bear.side * 62 * dt;
        const dx = (bear.x - z.cx) / (z.rx * 1.05), dy = (bear.y - z.cy) / (z.ry * 1.05);
        if (dx * dx + dy * dy < 1) {
          bear.phase = 'track'; bear.t = 0; setState('Predator tracking', 'warn');
          /* the flock panics */
          [0, 350, 800].forEach((ms, i) => setTimeout(() => chat(flock[Math.floor(rnd(0, flock.length))], i ? 'baa!' : 'BAAAA!', !i), ms));
        }
      } else if (bear.phase === 'track') {
        bear.x += -bear.side * 8 * dt;
        if (bear.t > 2.4) { bear.phase = 'scare'; bear.t = 0; setState('Predator counteraction', 'alert'); }
      } else if (bear.phase === 'scare') {
        if (bear.t > 1.3) { bear.phase = 'flee'; bear.t = 0; bubble(bear.x, bear.y - 40, 'grrr…', 'bear'); }
        else if (Math.random() < dt * 5) bubble(dr.x + rnd(-30, 30), dr.y + rnd(-20, 20), '〰', 'wave');
      } else {
        bear.x += bear.side * 210 * dt;
        if (bear.x < -90 || bear.x > W + 90) {
          bear.on = false; bearEl.classList.remove('on');
          bearIn = rnd(16, 26);
          setState('Patrolling');
          bubble(W / 2, H * 0.2, 'Mission success!', 'win');
        }
      }
    }

    function sheepTick(s, dt, t) {
      const z = zone();
      let ax = 0, ay = 0, scared = false;
      /* graze: walk to a spot, stop, choose another one */
      s.wait -= dt;
      if (s.stray > 0) s.stray -= dt;
      if (s.wait <= 0) {
        const a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 0.82;
        const out = s.stray > 0 ? 1.28 : 1;
        s.tx = z.cx + Math.cos(s.stray > 0 ? s.strayA : a) * z.rx * (s.stray > 0 ? out : r);
        s.ty = z.cy + Math.sin(s.stray > 0 ? s.strayA : a) * z.ry * (s.stray > 0 ? out : r);
        s.wait = rnd(2.5, 7);
      }
      const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy);
      if (d > 6) { ax += dx / d * 26; ay += dy / d * 26; }
      /* run from the mouse and from the bear */
      const flee = (fx, fy, radius, force) => {
        const ex = s.x - fx, ey = s.y - fy, e = Math.hypot(ex, ey) || 1;
        if (e < radius) { const k = (1 - e / radius) * force; ax += ex / e * k; ay += ey / e * k; scared = true; }
      };
      if (pointer.on) flee(pointer.x, pointer.y, 120, 620);
      if (bear.on && bear.phase !== 'flee') flee(bear.x, bear.y, 190, 520);
      /* keep apart */
      flock.forEach((o) => {
        if (o === s) return;
        const ex = s.x - o.x, ey = s.y - o.y, e = Math.hypot(ex, ey) || 1;
        if (e < 42) { ax += ex / e * (42 - e) * 3; ay += ey / e * (42 - e) * 3; }
      });
      /* a sheep is not a cat: it stays on the field */
      if (s.x < 24) ax += 300; if (s.x > W - 24) ax -= 300; if (s.y < 16) ay += 300; if (s.y > H - 10) ay -= 300;
      s.vx = (s.vx + ax * dt) * Math.pow(0.12, dt);
      s.vy = (s.vy + ay * dt) * Math.pow(0.12, dt);
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (scared) s.wait = Math.min(s.wait, 0.8);
      const sp = Math.hypot(s.vx, s.vy);
      if (Math.abs(s.vx) > 5) s.flip = s.vx > 0;
      s.hop = Math.max(0, s.hop - dt * 1.9);
      const trot = sp > 8 ? Math.abs(Math.sin(t * (6 + sp / 14) + s.phase)) * Math.min(7, 2 + sp / 16) : 0;
      const jump = Math.sin(s.hop * Math.PI) * 34;
      const k = depth(s.y);
      s.el.style.transform = `translate(${s.x}px,${s.y - (trot + jump) * k}px) scale(${s.flip ? k : -k},${k})`;
      s.el.style.zIndex = Math.round(s.y) + 10;
    }

    function strayTick(dt) {
      strayIn -= dt;
      if (strayIn > 0 || bear.on) return;
      strayIn = rnd(11, 19);
      const s = flock[Math.floor(rnd(0, flock.length))];
      s.stray = 6; s.wait = 0; s.strayA = rnd(0.1, Math.PI - 0.1) * (Math.random() < 0.5 ? 1 : -1);
      setTimeout(() => chat(s, 'baa?'), 1400);
      setTimeout(() => { if (step === 'Patrolling') bubble(s.x, s.y - 44, 'Shepherd notified', 'ping'); }, 3200);
    }

    let last = performance.now(), running = false, frame = 0;
    function draw(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = now / 1000, z = zone();
      flock.forEach((s) => sheepTick(s, dt, t));
      bearTick(dt);
      strayTick(dt);
      chatter -= dt;
      if (chatter <= 0) { chatter = rnd(5, 12); chat(flock[Math.floor(rnd(0, flock.length))], 'baa!'); }
      /* the drone: on the route, or next to the bear */
      angle += dt * 0.28;
      let gx = z.cx + Math.cos(angle) * z.rx, gy = z.cy + Math.sin(angle) * z.ry;
      if (bear.on && bear.phase !== 'come' && bear.phase !== 'flee') { gx = bear.x + (bear.x < z.cx ? 70 : -70); gy = bear.y - 26; }
      const pull = 1 - Math.pow(0.02, dt);
      dr.x += (gx - dr.x) * pull; dr.y += (gy - dr.y) * pull;
      const hover = Math.sin(t * 2.3) * 5, k = depth(dr.y);
      drone.style.transform = `translate(${dr.x}px,${dr.y - 54 * k + hover}px) scale(${k})`;
      drone.style.zIndex = 9999;
      drone.style.setProperty('--shadow', `${54 * k - hover}px`);
      if (bear.on) {
        const b = depth(bear.y);
        const trot = Math.abs(Math.sin(t * (bear.phase === 'flee' ? 15 : 7))) * 4;
        const heading = bear.phase === 'flee' ? bear.side : -bear.side;
        bearEl.style.transform = `translate(${bear.x}px,${bear.y - trot}px) scale(${heading < 0 ? -b * 1.25 : b * 1.25},${b * 1.25})`;
        bearEl.style.zIndex = Math.round(bear.y) + 10;
      }
      frame = requestAnimationFrame(draw);
    }
    if (CALM) { running = true; draw(performance.now()); running = false; return; }
    whenSeen(field, () => { if (!running) { running = true; last = performance.now(); frame = requestAnimationFrame(draw); } }, () => { running = false; cancelAnimationFrame(frame); });
  }

  /* ───────── the film ───────── */
  function film() {
    const v = $('h-video'), p = $('h-play');
    p.addEventListener('click', () => { v.controls = true; p.hidden = true; v.play(); });
    v.addEventListener('ended', () => { v.controls = false; p.hidden = false; v.load(); });
  }

  /* ───────── the layers of the method: the diagram follows the text ───────── */
  function method() {
    const dias = [...document.querySelectorAll('.h-dia')];
    const tabs = [...document.querySelectorAll('.h-stage-tabs i')];
    const show = (layer) => {
      document.querySelectorAll('.h-step').forEach((s) => s.classList.toggle('on', s.dataset.layer === layer));
      tabs.forEach((t) => t.classList.toggle('on', t.dataset.c === layer));
      dias.forEach((d) => {
        const on = d.dataset.layer === layer;
        d.classList.toggle('on', on);
        if (!d.pauseAnimations) return;
        if (on && !CALM) { d.setCurrentTime(0); d.unpauseAnimations(); } else { d.pauseAnimations(); if (CALM) d.setCurrentTime(6); }
      });
    };
    show('op');
    /* the band of the page that decides: a line a bit above the middle */
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) show(e.target.dataset.layer); }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.h-step').forEach((s) => io.observe(s));
  }

  /* ───────── what follows the scroll ───────── */
  function scrolled() {
    const ridges = [...document.querySelectorAll('.h-ridge')].map((el) => [el, parseFloat(el.dataset.depth)]);
    const path = $('h-curve-path'), sheep = $('h-curve-sheep'), curve = $('h-curve');
    const len = path.getTotalLength();
    const list = $('h-route-list'), walker = $('h-route-sheep');
    let queued = false;
    const place = (p) => {
      const pt = path.getPointAtLength(len * p);
      sheep.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
      path.style.strokeDashoffset = String(len * (1 - p));
    };
    path.style.strokeDasharray = String(len);
    function update() {
      queued = false;
      const y = scrollY, vh = innerHeight;
      if (!CALM && y < vh * 1.3) ridges.forEach(([el, k]) => { el.style.transform = `translate3d(0,${y * k}px,0)`; });
      const c = curve.getBoundingClientRect();
      place(CALM ? 1 : clamp((vh * 0.92 - c.top) / (vh * 0.8), 0, 1));
      const r = list.getBoundingClientRect();
      const q = clamp((vh * 0.55 - r.top) / r.height, 0, 1);
      walker.style.top = q * 100 + '%';
      walker.classList.toggle('left', q > 0.999);
    }
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ───────── the real simulation panel (js/sim-core.js, js/sim-scene.js), driven by the visitor ───────── */
  function demo() {
    const { LANES, createPilot, STEPS } = window.SimCore;
    const pilot = createPilot();
    const scene = window.SimScene.create($('h-sim-stage'));
    /* Not the predator steps: what comes after tracking is a question of the marked seminar. */
    const PATH = LANES.flatMap((l) => l.steps).filter((s) => s !== STEPS.Crashed && s !== STEPS.PredatorCounteraction);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const NOTES = {
      [STEPS.Off]: 'The drone is off. Switch it on.',
      [STEPS.Unconfigured]: 'It waits for a flight plan. A wrong one and it stays here: that is the rainy day.',
      [STEPS.Configured]: 'The plan is checked.',
      [STEPS.ReadyForMission]: 'Ready. The operator can send it.',
      [STEPS.GoingToSafeArea]: 'On its way to the safe zone.',
      [STEPS.Patrolling]: 'Now it patrols, and the flock is watched.',
      [STEPS.PredatorTracking]: 'The bear is inside the perimeter. And now? That is Part 2, and it is marked.',
      [STEPS.Crashed]: 'Crashed. Better to learn it here than in the Pyrenees.'
    };
    function onSnap(snap) {
      $('h-sim-step').textContent = snap.step;
      const at = PATH.indexOf(snap.step);
      $('h-sim-track').innerHTML = PATH.map((s, i) => `<li class="${i === at ? 'now' : i < at ? 'past' : ''}" title="${esc(s)}"></li>`).join('');
      const edges = snap.step === STEPS.PredatorTracking ? [] : snap.outgoing.slice().sort((a, b) => /crash|fail/i.test(a.signal) - /crash|fail/i.test(b.signal));
      const focused = $('h-sim-signals').contains(document.activeElement);
      $('h-sim-signals').innerHTML = edges.map((e) => `<button type="button" class="${/crash|fail/i.test(e.signal) ? 'bad' : ''}" data-signal="${esc(e.signal)}">${esc(e.signal)}</button>`).join('');
      if (focused) { const b = $('h-sim-signals').querySelector('button'); if (b) b.focus({ preventScroll: true }); }
      $('h-sim-note').textContent = NOTES[snap.step] || '';
      $('h-sim-reset').hidden = snap.step === STEPS.Off;
      scene.setStep(snap.step);
    }
    pilot.subscribe(onSnap);
    onSnap(pilot.getSnapshot());
    $('h-sim-signals').addEventListener('click', (e) => { const b = e.target.closest('[data-signal]'); if (b) pilot.play(b.dataset.signal); });
    $('h-sim-reset').addEventListener('click', () => pilot.reset());
    whenSeen($('h-sim'), () => scene.setVisible(true), () => scene.setVisible(false));
  }

  /* ───────── the chart of the scenes ───────── */
  function bars() {
    const total = (p) => KINDS.reduce((n, k) => n + p[k.key], 0);
    const all = PARTS.reduce((n, p) => n + total(p), 0);
    const reading = PARTS.reduce((n, p) => n + p.read, 0);
    const pct = Math.round((all - reading) / all * 100);
    const max = Math.max(...PARTS.map(total));
    $('h-doing-total').textContent = all;
    $('h-doing-pct').textContent = pct + '%';
    $('h-legend').innerHTML = KINDS.map((k) => `<span><i style="background:${k.color}"></i>${k.label}</span>`).join('');
    $('h-bars').innerHTML = PARTS.map((p, i) => `
      <div class="h-bar-row" style="--i:${i}">
        <span class="h-bar-name">${p.name}</span>
        <div class="h-bar" style="--w:${total(p) / max * 100}%">${KINDS.filter((k) => p[k.key]).map((k) =>
          `<i style="flex:${p[k.key]};background:${k.color}" tabindex="0" data-tip="${p.name}: ${p[k.key]} ${k.label.toLowerCase()} of ${total(p)}"></i>`).join('')}</div>
        <span class="h-bar-total">${total(p)}</span>
      </div>`).join('');
    $('h-bars-table').innerHTML = `<caption>Scenes per part, by what they ask</caption><tr><th>Part</th>${KINDS.map((k) => `<th>${k.label}</th>`).join('')}</tr>` +
      PARTS.map((p) => `<tr><th>${p.name}</th>${KINDS.map((k) => `<td>${p[k.key]}</td>`).join('')}</tr>`).join('');

    const tip = $('h-tip-box'), fig = tip.parentElement;
    const showTip = (el) => {
      const a = el.getBoundingClientRect(), f = fig.getBoundingClientRect();
      tip.textContent = el.dataset.tip;
      tip.hidden = false;
      tip.style.left = clamp(a.left + a.width / 2 - f.left, 80, f.width - 80) + 'px';
      tip.style.top = a.top - f.top - 8 + 'px';
    };
    $('h-bars').addEventListener('pointerover', (e) => { if (e.target.dataset.tip) showTip(e.target); });
    $('h-bars').addEventListener('focusin', (e) => { if (e.target.dataset.tip) showTip(e.target); });
    $('h-bars').addEventListener('pointerleave', () => { tip.hidden = true; });
    $('h-bars').addEventListener('focusout', () => { tip.hidden = true; });
  }

  /* ───────── the guide and Cameo: what goes through the relay, one moment at a time ───────── */
  function link() {
    const box = $('h-lk'), cap = $('h-lk-cap');
    const STEPS = [
      ['pair', 'The plugin in Cameo shows a 6-letter code. Type it in the guide: both are linked through the relay of the site, even on the school network.'],
      ['open', 'Every element the guide talks about has its button. One click, and Cameo selects it in the model. No more hunting in the tree.'],
      ['sim', 'Run the simulation in Cameo: every state your model enters moves the drone in the guide. It is your model that flies.'],
      ['check', 'From Part 3, the guide drives Cameo: it starts the simulation, sends the signals of the scenario, reads the states back, and shows in red what does not hold.'],
      ['phone', 'Scan the QR code with the phone, or type the 6 letters: the guide opens on it, already paired. From the phone, you open the elements in Cameo and run the simulation, and the answers are shared with the laptop.', 10000]
    ];
    const tabs = [...box.querySelectorAll('[data-go]')];
    let at = 0, timer = 0, auto = !CALM;
    const show = (i) => {
      at = i;
      const [key, text] = STEPS[i];
      box.dataset.step = key;
      cap.textContent = text;
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.go === key)));
    };
    const tick = () => { clearTimeout(timer); if (auto) timer = setTimeout(() => { show((at + 1) % STEPS.length); tick(); }, STEPS[at][2] || 5200); };
    tabs.forEach((t, i) => t.addEventListener('click', () => { auto = false; clearTimeout(timer); show(i); }));
    show(0);
    whenSeen(box, tick, () => clearTimeout(timer));
  }

  pasture();
  film();
  method();
  bars();
  scrolled();
  demo();
  link();
})();
