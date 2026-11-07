/* The promo film of Parts 3 and 4 (~2 min 15), the sequel of promo.js.
   Part 3, the logical architecture: the approach, the goal (several versions, one choice), the commands of the
   plugin that do the repetitive part, then the drone built one event at a time and validated each time.
   Part 4, the swarm: a new need one level up, the dilemma, who decides, the box of Lego with its 3D bay, the
   missions played, and the three architectures side by side.

   The pieces are the real ones: each window is the guide itself (an iframe of ../part3/ or ../part4/ on one
   scene), cut down to one widget and driven by clicks at the times of the film; the pastures of the end are
   the fleet simulation of Part 4 (js/sim-fleet-scene.js), mounted here. The words, the bands and the stamps
   are drawn by this file, as a function of the time t.

   The guides keep their state in the browser. The film saves the keys of the site before it opens them and
   puts them back when it is closed, so that it leaves no trace in the progress of whoever watches it. They
   open unpaired and untracked.

   Part 2 is a marked seminar: no predator transition and no predator signal is shown (the windows of the bear
   hide the messages and the injected signals).

   URL: ?speed=1.2 (faster)   ?t=40 (start at 40 s)   ?autoplay=0   ?hud=0 */
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const SPEED = Math.max(0.25, Math.min(4, parseFloat(Q.get('speed')) || 1));
  const FC = window.FleetCore;
  const FS = window.FleetScene;
  const SWARM = ((window.COURSE_CONFIG || {}).swarm || {}).options || [];

  /* ───────── the guides leave no trace: save the site's keys, put them back on the way out ───────── */
  const KEEP = 'mbse-shepherd:';
  const saved = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEEP)) saved[k] = localStorage.getItem(k);
    }
    localStorage.removeItem(KEEP + 'bridge-code');      // unpaired: never talk to the Cameo of the viewer
    localStorage.setItem(KEEP + 'track:off', '1');      // untracked: the film is not a session
  } catch (e) { /* no storage: nothing to keep */ }
  function restore() {
    try {
      const now = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(KEEP)) now.push(k); }
      now.forEach((k) => { if (!(k in saved)) localStorage.removeItem(k); });
      Object.keys(saved).forEach((k) => localStorage.setItem(k, saved[k]));
    } catch (e) { /* nothing to put back */ }
  }
  addEventListener('pagehide', () => { killAll(); restore(); });

  /* ───────── helpers ───────── */
  const $ = (s, r) => (r || document).querySelector(s);
  function el(tag, cls, html, parent) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  }
  const stage = $('#stage');
  const screen = $('#screen');
  const lerp = (a, b, p) => a + (b - a) * p;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const prog = (t, a, b) => clamp01((t - a) / (b - a));
  const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eout = (x) => 1 - Math.pow(1 - x, 3);
  const eback = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const env = (t, a, b, fi = 0.35, fo = 0.35) => Math.min(eout(prog(t, a, a + fi)), 1 - eio(prog(t, b - fo, b)));
  function set(n, prop, v) {
    const c = n.__c || (n.__c = {});
    if (c[prop] === v) return;
    c[prop] = v;
    n.style.setProperty(prop, v);
  }
  function show(n, o) {
    set(n, 'opacity', o >= 1 ? '1' : o.toFixed(3));
    set(n, 'visibility', o > 0.002 ? 'visible' : 'hidden');
  }
  function tog(n, c, on) { if (n && n.classList.contains(c) !== !!on) n.classList.toggle(c, !!on); }
  function place(n, x, y, w, h) {
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    if (w) n.style.width = w + 'px';
    if (h) n.style.height = h + 'px';
    return n;
  }
  const tracks = [];
  const at = (fn) => tracks.push(fn);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ═════════════════════════ the clock (seconds) ═════════════════════════ */
  const GOAL = 5.2;            // each architecture plays a sheep that strays
  const AUTO = 8.2;            // each command plays its gesture, stage by stage
  const BUILD = 5.2;
  /* each part follows the one before: [name, length in seconds] */
  const T = {};
  [['title', 5.6], ['approach', 10], ['goal', 3 * GOAL + 0.3], ['auto', 3 * AUTO], ['build', 5 * BUILD], ['whole', 6.4],
    ['band4', 5.4], ['scope', 7], ['dilemma', 6], ['options', 6.4], ['lego', 14], ['fly', 8.6], ['side', 12.5], ['outro', 9]]
    .reduce((a, [k, d]) => { T[k] = [a, +(a + d).toFixed(2)]; return T[k][1]; }, 0);
  const END = T.outro[1];

  /* ═════════════════════════ layout ═════════════════════════ */
  const CAP = { x: 96, y: 210, w: 640 };
  const WIN = { x: 800, y: 92, w: 1040, h: 900 };
  const BAR = 46;

  /* the part on screen, top left */
  const tracker = el('div', 'tracker nx-tracker', '<span data-p="lg">Part 3 · Logical</span><span data-p="sw">Part 4 · Swarm</span>', screen);
  at((t) => {
    show(tracker, Math.max(env(t, T.approach[0], T.band4[0] + 0.2), env(t, T.scope[0], T.outro[0] + 0.3)));
    const p = t < T.band4[0] ? 'lg' : 'sw';
    tracker.querySelectorAll('span').forEach((s) => { tog(s, 'on', s.dataset.p === p); tog(s, 'done', p === 'sw' && s.dataset.p === 'lg'); });
  });

  /* ───────── captions: a kicker, a title, a line, sometimes a list that lights in time ───────── */
  function caption(a, b, c) {
    const n = el('div', 'nx-cap', `<p class="nx-k" style="--pc:${c.color || 'var(--ph-lg)'}">${c.k}</p><h2>${c.title}</h2>${c.text ? `<p class="nx-t">${c.text}</p>` : ''}${c.list ? `<ol class="nx-list">${c.list.map((x) => `<li><i></i><span>${x[0]}</span>${x[1] ? `<small>${x[1]}</small>` : ''}</li>`).join('')}</ol>` : ''}`, screen);
    place(n, CAP.x, c.y || CAP.y, c.w || CAP.w);
    n.style.setProperty('--pc', c.color || 'var(--ph-lg)');
    const kids = [...n.children];
    const items = [...n.querySelectorAll('.nx-list li')];
    at((t) => {
      const o = env(t, a, b, 0.45, 0.4);
      show(n, o);
      if (!o) return;
      kids.forEach((k, i) => {
        const p = eout(prog(t, a + 0.12 * i, a + 0.12 * i + 0.55));
        set(k, 'transform', `translateY(${((1 - p) * 26).toFixed(1)}px)`);
        set(k, 'opacity', p.toFixed(3));
      });
      if (c.at) items.forEach((li, i) => {
        tog(li, 'on', t >= c.at[i] && (i === items.length - 1 || t < c.at[i + 1]));
        tog(li, 'done', i < items.length - 1 && t >= c.at[i + 1]);
      });
    });
    return n;
  }

  /* ───────── a stamp over a window: "Validated" ───────── */
  function stamp(a, b, text, x, y) {
    const n = el('div', 'nx-stamp', `<b>✓</b>${text}`, screen);
    place(n, x, y);
    at((t) => {
      const o = env(t, a, b, 0.25, 0.3);
      show(n, o);
      if (o) set(n, 'transform', `translate(-50%, -50%) rotate(-4deg) scale(${(0.6 + 0.4 * eback(prog(t, a, a + 0.45))).toFixed(3)})`);
    });
  }

  /* ═════════════════════════ the windows: one guide, one widget ═════════════════════════ */
  /* The guide in the iframe shows only the widget: everything else is hidden, the widget is pinned top left
     of the frame, in the dark theme, whatever the guide's own layout. Data attributes, not classes: the
     widgets rewrite their className. */
  const ISO = `
    html[data-film], html[data-film] body { background: transparent !important; overflow: hidden !important; }
    html[data-film] body::before, html[data-film] body::after { display: none !important; }
    html[data-film] body * { visibility: hidden !important; }
    html[data-film] [data-film-w], html[data-film] [data-film-w] * { visibility: visible !important; }
    html[data-film] [data-film-keep] { transform: none !important; filter: none !important; opacity: 1 !important; animation: none !important; contain: none !important; backdrop-filter: none !important; }
    html[data-film] [data-film-w] { position: fixed !important; left: 0 !important; top: 0 !important; width: 100vw !important; box-sizing: border-box !important; margin: 0 !important; padding: 28px !important; z-index: 2147483647 !important; background: var(--bg) !important; transform: none !important; opacity: 1 !important; }
    html[data-film] .lg-arch-warn, html[data-film] [data-film-w] .lg-validate, html[data-film] [data-film-w] .lg-live-toggle { display: none !important; }
    html[data-film] .sim-drawer, html[data-film] .toast { display: none !important; }`;
  const IW = 900;
  const wins = [];
  /* where the pointer goes: { t, at(t) → [x, y] on the stage or null, fb: where to aim until it is found } */
  const STOPS = [];
  /* The window comes in from the right and leaves to the left, as the next one pushes it. `still`: the same view
     goes on, it only fades. `shrink`: it folds into its centre on the way out. */
  function guide(a, b, o) {
    const w = { a, b, o, live: null, n: null, dx: 0 };
    const n = el('div', 'nx-win', `<div class="nx-bar"><i></i><i></i><i></i><span>${esc(o.label)}</span></div><div class="nx-clip"></div>`, screen);
    const box = o.box || WIN;
    place(n, box.x, box.y, box.w, box.h);
    w.n = n;
    w.box = box;
    w.clip = $('.nx-clip', n);
    w.scale = box.w / IW;
    wins.push(w);
    if (o.cursor !== false) {
      (o.cues || []).forEach(([ct, fn]) => {
        if (fn.find) STOPS.push({ t: a + ct, at: (t) => inWin(w, fn.find, t), fb: [box.x + box.w / 2, box.y + box.h / 2] });
      });
    }
    const fo = o.exit === 'shrink' ? 0.8 : 0.4;
    at((t) => {
      const o2 = env(t, a, b, 0.4, fo);
      show(n, o2);
      if (o2) {
        const pin = 1 - eout(prog(t, a, a + 0.6));
        const pout = eio(prog(t, b - fo, b));
        if (o.exit === 'shrink' && pout > 0) {
          w.dx = 0;
          set(n, 'transform', `scale(${(1 - 0.86 * pout).toFixed(4)})`);
        } else if (o.still) {
          w.dx = 0;
          set(n, 'transform', 'none');
        } else {
          w.dx = pin * 110 - pout * 110;
          set(n, 'transform', `translateX(${w.dx.toFixed(1)}px) scale(${(1 - 0.04 * (pin + pout)).toFixed(4)})`);
        }
      }
      const lv = w.live;
      if (lv && lv.ready) {
        const y = panAt(o.pan || [[0, 0]], t - a) + lv.base;
        set(lv.f, 'transform', `scale(${w.scale.toFixed(4)}) translateY(${(-y).toFixed(1)}px)`);
      }
    });
    return w;
  }
  /* an element of the guide in a window, on the stage (null while it is not there) */
  function inWin(w, find, t) {
    const lv = w.live;
    if (!lv || !lv.ready) return null;
    const e = find(lv.root);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const y0 = panAt(w.o.pan || [[0, 0]], t - w.a) + lv.base;
    return [w.box.x + w.dx + w.scale * (r.left + r.width / 2), w.box.y + BAR + w.scale * (r.top + r.height / 2 - y0)];
  }
  function panAt(keys, lt) {
    let y = keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t0, y0] = keys[i - 1];
      const [t1, y1] = keys[i];
      if (lt >= t1) y = y1; else if (lt > t0) { y = lerp(y0, y1, eio(prog(lt, t0, t1))); break; } else break;
    }
    return y;
  }
  const PRE = 4.5;
  /* the guide's CSS stills its animations when the system asks for reduced motion; a film has to move */
  function calm(d) {
    [...d.styleSheets].forEach((sh) => {
      let rules;
      try { rules = sh.cssRules; } catch (e) { return; }
      for (let i = rules.length - 1; i >= 0; i--) {
        if (rules[i].media && /prefers-reduced-motion/.test(rules[i].media.mediaText)) sh.deleteRule(i);
      }
    });
  }
  function open(w) {
    const f = document.createElement('iframe');
    f.className = 'nx-frame';
    f.tabIndex = -1;
    f.setAttribute('aria-hidden', 'true');
    f.style.width = IW + 'px';
    f.style.height = (w.o.ih || 1700) + 'px';
    f.src = w.o.src.replace(/(#|$)/, '?motion=1$1');
    w.clip.appendChild(f);
    const lv = { f, ready: false, fired: 0, base: 0, doc: null, root: null };
    w.live = lv;
    f.addEventListener('load', () => {
      let tries = 0;
      const look = () => {
        if (w.live !== lv) return;
        const d = f.contentDocument;
        const hosts = d ? [...d.querySelectorAll(`[data-widget="${w.o.widget}"]`)] : [];
        const root = hosts[w.o.nth || 0];
        if (!root || !root.firstElementChild) { if (++tries < 80) setTimeout(look, 100); return; }
        isolate(d, root, w.o.css || '');
        calm(d);
        lv.doc = d;
        lv.root = root;
        f.contentWindow.addEventListener('keydown', onKey, true);
        /* settle, then measure where the part to show starts */
        setTimeout(() => {
          if (w.live !== lv) return;
          const fo = w.o.focus ? root.querySelector(w.o.focus) : null;
          lv.base = fo ? Math.max(0, fo.getBoundingClientRect().top - root.getBoundingClientRect().top - 18) : 0;
          lv.ready = true;
        }, 350);
      };
      look();
    });
  }
  function isolate(d, root, css) {
    d.documentElement.dataset.theme = 'dark';
    d.documentElement.dataset.film = '1';
    root.dataset.filmW = '1';
    for (let p = root.parentElement; p && p !== d.body; p = p.parentElement) p.dataset.filmKeep = '1';
    const st = d.createElement('style');
    st.textContent = ISO + css;
    d.head.appendChild(st);
  }
  function kill(w) {
    if (!w.live) return;
    w.live.f.remove();
    w.live = null;
  }
  function killAll() { wins.forEach(kill); }
  /* open a little before, close a little after; play the cues of its time once it is ready */
  function liveTick(t) {
    wins.forEach((w) => {
      const want = t >= w.a - PRE && t < w.b + 0.6;
      if (want && !w.live) open(w);
      if (!want && w.live) kill(w);
      const lv = w.live;
      if (!lv || !lv.ready) return;
      const cues = w.o.cues || [];
      while (lv.fired < cues.length && t - w.a >= cues[lv.fired][0]) {
        try { cues[lv.fired][1](lv.root, lv.doc); } catch (e) { console.warn('promo next: cue', e); }
        lv.fired += 1;
      }
    });
  }
  /* seeking back before a cue already played: open the guide again */
  function rewind(t) {
    wins.forEach((w) => {
      const cues = w.o.cues || [];
      if (w.live && w.live.fired && cues[w.live.fired - 1][0] > t - w.a) kill(w);
    });
  }

  /* what the film clicks in a widget; `find` lets the pointer go there first */
  const clicker = (find) => {
    const f = (root) => { const b = find(root); if (b) b.click(); };
    f.find = find;
    return f;
  };
  const btn = (re) => clicker((root) => [...root.querySelectorAll('button')].find((x) => re.test(x.textContent.trim())));
  const sel = (s) => clicker((root) => root.querySelector(s));
  /* "▶ Next step" of archSim, every `gap` seconds from `from`: the signals travel, the states tick. Its button is
     hidden in the film, so the pointer does not go to it. */
  const NEXT = (root) => { const b = [...root.querySelectorAll('button')].find((x) => /^▶ Next step/.test(x.textContent.trim())); if (b) b.click(); };
  const stepper = (from, n, gap) => Array.from({ length: n }, (_, i) => [from + i * gap, NEXT]);

  /* ═════════════════════════ 0 · title: Part 3 ═════════════════════════ */
  function band(a, b, num, tab, title, q, color) {
    const n = el('div', 'band nx-band', `<div class="band-in"><span class="band-tab">${tab}</span><span class="band-num">${num}</span><span class="band-title">${title}</span><span class="band-q">${q}</span></div>`, screen);
    n.style.setProperty('--pc', color);
    at((t) => {
      const p = env(t, a, b, 0.5, 0.5);
      show(n, p);
      if (p) set(n, 'transform', `translateX(${((1 - eout(prog(t, a, a + 0.6))) * -120 + eio(prog(t, b - 0.5, b)) * 160).toFixed(1)}px)`);
    });
  }
  const brand = el('div', 'nx-brand', '<b>MBSE Shepherd</b><span>The sequel: <em>Parts 3 and 4</em></span>', screen);
  at((t) => {
    const o = env(t, T.title[0] + 0.1, T.title[1], 0.5, 0.4);
    show(brand, o);
    if (o) set(brand, 'transform', `translateY(${((1 - eout(prog(t, 0.1, 0.8))) * 30).toFixed(1)}px)`);
  });
  band(T.title[0] + 1.1, T.title[1], '03', 'Part 3  [Logical]', 'Logical architecture', 'Which subsystems, exchanging what?', 'var(--ph-lg)');

  /* ═════════════════════════ 1 · the approach ═════════════════════════ */
  caption(T.approach[0], T.approach[1], {
    k: 'The approach', title: 'One mission, cut into subsystems',
    text: 'The functional mission says what the drone does. Here, each subsystem takes its share of the states, and talks to the others through ports.',
    list: [['Parts'], ['Behaviour'], ['Ports'], ['Connections'], ['Run']],
    at: [0.3, 2.2, 4.1, 6.0, 7.9].map((x) => T.approach[0] + x)
  });
  guide(T.approach[0], T.approach[1], {
    label: 'Part 3 · What a logical architecture is', src: '../part3/#what-is', widget: 'logicalIntro',
    cues: [[0.3, btn(/^1/)], [2.2, btn(/^2/)], [4.1, btn(/^3/)], [6.0, btn(/^4/)], [7.9, btn(/^5/)]]
  });

  /* ═════════════════════════ 2 · the goal: several versions, one choice ═════════════════════════ */
  const ARCH_CSS = `
    html[data-film] [data-film-w] .lg-arch-cols, html[data-film] [data-film-w] .lg-arch-sum, html[data-film] [data-film-w] .lg-arch-ctl .btn-row { display: none !important; }`;
  caption(T.goal[0], T.goal[1], {
    k: 'The goal', title: 'Several versions, one choice',
    text: 'Three ways to cut the same drone. Each one plays the mission: where the logic sits, how many interfaces, what a change costs. Compare, choose, defend it.',
    list: [['Mission orchestrator', 'autonomous features'], ['Decentralised patch'], ['Centralised orchestrator']],
    at: [0, 1, 2].map((i) => T.goal[0] + 0.15 + i * GOAL)
  });
  /* The stage "a sheep strays" of the build: picking an architecture plays the preparation silently, so each one
     starts on the field and its parts answer the sheep at once. Its two steps play at their own pace: a "Next step"
     while the first one still plays is ignored, the next free one starts the second. */
  guide(T.goal[0], T.goal[1], {
    label: 'Part 3 · Three ways to cut the drone: a sheep strays', src: '../part3/#sheep-check', widget: 'archSim', css: ARCH_CSS,
    cues: [1, 2, 3].flatMap((k, i) => [[0.15 + i * GOAL, sel(`[data-k="${k}"]`)]].concat([0.5, 2.3, 2.8, 3.3].map((x) => [x + i * GOAL, NEXT])))
  });

  /* ═════════════════════════ 3 · the method, automated ═════════════════════════ */
  const A3 = (i) => T.auto[0] + i * AUTO;
  caption(T.auto[0], T.auto[1], {
    k: 'The method, automated', title: 'The tool does the repetitive part',
    text: 'Three commands of the MBSE Shepherd plugin, right-click in Cameo. You keep the decisions.',
    list: [['Logical Transition', 'copies the states of the mission into the subsystem'], ['Create All Missing Signal Ports', 'reads what the states wait for and send'], ['Delegate to external systems', 'what leaves the subsystem goes out of it']],
    at: [A3(0), A3(1), A3(2)]
  });
  /* Each guided example plays its stages in order, at the pace of its gestures (the widget draws its own pointer
     for the clicks). The first stage is picked before the window shows, so it starts from the beginning. */
  const stagesAt = (list) => list.map(([at, k]) => [at, sel(`[data-st="${k}"]`)]);
  guide(A3(0), A3(1) + 0.3, {
    label: 'Part 3 · Logical Transition', src: '../part3/#mc-tool', widget: 'mcTransition', cursor: false,
    cues: stagesAt([[-0.4, 1], [1.6, 2], [2.9, 3], [4.7, 4]])
  });
  guide(A3(1), A3(2) + 0.3, {
    label: 'Part 3 · Create All Missing Signal Ports', src: '../part3/#mc-magic', widget: 'mcPortsMagic', cursor: false,
    cues: stagesAt([[-0.4, 1], [2.7, 2], [3.8, 3], [5.6, 4]])
  });
  guide(A3(2), T.auto[1], {
    label: 'Part 3 · Delegate to external systems', src: '../part3/#mc-delegate', widget: 'mcDelegate', cursor: false,
    cues: stagesAt([[-0.4, 2], [2.0, 3], [4.4, 4], [6.2, 5]])
  });

  /* ═════════════════════════ 4 · build it, one event at a time, validated each time ═════════════════════════ */
  const STAGES = [
    ['start', 'Start the mission'], ['patrol', 'Patrol'], ['sheep', 'A sheep strays'], ['bear', 'A bear'], ['deter', 'Scare it off']
  ];
  const B4 = (i) => T.build[0] + i * BUILD;
  caption(T.build[0], T.build[1], {
    k: 'Build it', title: 'One event at a time, validated each time',
    text: 'The scenario of the mission grows piece by piece. After each piece, it is played on the architecture: every state expected, every message on its port.',
    list: STAGES.map((s) => [s[1]]),
    at: STAGES.map((s, i) => B4(i))
  });
  /* the bear: neither its messages nor the signal injected are shown (Part 2) */
  const QUIET = `
    html[data-film] [data-film-w] .lg-arch-cols > div:last-child, html[data-film] [data-film-w] .lg-badge, html[data-film] [data-film-w] .lg-story { display: none !important; }
    html[data-film] [data-film-w] .lg-arch-cols { grid-template-columns: 1fr !important; }`;
  const CHECK_CSS = `
    html[data-film] [data-film-w] > .chips, html[data-film] [data-film-w] .lg-arch-sum, html[data-film] [data-film-w] .lg-arch-ctl { display: none !important; }`;
  STAGES.forEach(([id, name], i) => {
    const a = B4(i);
    const b = i === STAGES.length - 1 ? T.build[1] : B4(i + 1) + 0.3;
    guide(a, b, {
      label: `Part 3 · ${i + 1} · ${name}: validate`, src: `../part3/#${id}-check`, widget: 'archSim',
      css: CHECK_CSS + (id === 'bear' || id === 'deter' ? QUIET : ''), still: i > 0, cursor: false,
      cues: [[0.05, sel('[data-k="3"]')]].concat(stepper(0.35, 5, 0.8))
    });
    stamp(a + 3.9, b - 0.2, 'Validated', WIN.x + WIN.w - 190, WIN.y + 150);
  });

  /* ═════════════════════════ 5 · the whole scenario ═════════════════════════ */
  caption(T.whole[0], T.whole[1], {
    k: 'The result', title: 'The whole mission, on the drone you built',
    text: 'Then <b>Validate in Cameo</b>: the guide drives the simulation of your model, sends the signals of the scenario and reads every state back.'
  });
  guide(T.whole[0], T.whole[1], {
    label: 'Part 3 · The whole scenario', src: '../part3/#scenario', widget: 'archSim', css: CHECK_CSS + QUIET,
    still: true, cursor: false, exit: 'shrink',
    cues: [[0.05, sel('[data-k="3"]')]].concat(stepper(0.3, 13, 0.42))
  });
  stamp(T.whole[0] + 5.0, T.whole[1] - 0.75, 'Mission validated', WIN.x + WIN.w - 250, WIN.y + 150);

  /* The drone of Part 3 is folded into one drone, waits through the band, then lands in the swarm of Part 4. */
  const QUAD = '<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="5"><circle cx="15" cy="15" r="10"/><circle cx="49" cy="15" r="10"/><circle cx="15" cy="49" r="10"/><circle cx="49" cy="49" r="10"/><path d="M22 22l20 20M42 22L22 42"/></g><rect x="23" y="23" width="18" height="18" rx="4" fill="currentColor"/></svg>';
  const part3 = el('div', 'nx-drone', `${QUAD}<span>The drone of Part 3</span>`, screen);
  const P3 = { home: [WIN.x + WIN.w / 2, WIN.y + WIN.h / 2], wait: [1560, 280], land: [1181, 478] };
  at((t) => {
    const a = T.whole[1] - 0.55;
    const land = T.scope[0] + 0.5;
    const o = Math.min(env(t, a, land + 1.1, 0.35, 0.45), 1);
    show(part3, o);
    if (!o) return;
    const up = eio(prog(t, T.whole[1] + 0.1, T.whole[1] + 1.0));
    const down = eio(prog(t, land - 0.6, land + 0.3));
    let x = lerp(P3.home[0], P3.wait[0], up);
    let y = lerp(P3.home[1], P3.wait[1], up) - 120 * 4 * up * (1 - up);
    x = lerp(x, P3.land[0], down);
    y = lerp(y, P3.land[1], down) - 90 * 4 * down * (1 - down);
    const bob = Math.sin(t * 3.1) * 8 * (1 - down);
    const s = (0.4 + 0.6 * eback(prog(t, a, a + 0.5))) * (1 - 0.62 * down);
    set(part3, 'transform', `translate(${x.toFixed(1)}px, ${(y + bob).toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)}) rotate(${(Math.sin(t * 2.3) * 4 * (1 - down)).toFixed(2)}deg)`);
    tog(part3, 'landed', t > land + 0.25);
  });

  /* ═════════════════════════ 6 · Part 4: one level up ═════════════════════════ */
  band(T.band4[0] + 0.3, T.band4[1], '04', 'Part 4  [Swarm]', 'The swarm', 'A new need: one drone is not enough.', 'var(--ph-fn)');
  caption(T.scope[0], T.scope[1], {
    k: 'One level up', color: 'var(--ph-fn)', title: 'The system of interest becomes the swarm',
    text: 'A sheep strays while a bear comes: one drone cannot be everywhere. The mission now belongs to several drones and a base station. The drone of Part 3 is one part of it.'
  });
  guide(T.scope[0], T.scope[1], { label: 'Part 4 · The system of interest grows', src: '../part4/#new-soi', widget: 'swarmScope', box: { x: WIN.x, y: 190, w: WIN.w, h: 640 } });

  caption(T.dilemma[0], T.dilemma[1], {
    k: 'The new problem', color: 'var(--ph-fn)', title: 'A sheep strays, a bear comes. Who keeps the flock?',
    text: 'A drone that follows one of them leaves the field. How many drones, and who goes?'
  });
  guide(T.dilemma[0], T.dilemma[1], {
    label: 'Part 4 · How many drones does it take?', src: '../part4/#dilemma', widget: 'strayDilemma',
    box: { x: WIN.x, y: 120, w: WIN.w, h: 830 },
    cues: [[0.3, btn(/^A sheep strays/)], [1.9, btn(/^A bear comes/)], [3.3, btn(/^Both at once/)], [4.4, btn(/^3$/)]]
  });

  caption(T.options[0], T.options[1], {
    k: 'Choose', color: 'var(--ph-fn)', title: 'Who decides: the base, or a drone?',
    text: 'Complete drones or specialised ones, the master on the ground or in the air. Each choice has its price.',
    list: SWARM.map((s) => [s.code + ' · ' + s.name]),
    at: [0.2, 2.2, 4.2].map((x) => T.options[0] + x)
  });
  guide(T.options[0], T.options[1], {
    label: 'Part 4 · Three ways to organise the swarm', src: '../part4/#options', widget: 'swarmOptions',
    cues: [[0.2, btn(/^A/)], [2.2, btn(/^B/)], [4.2, btn(/^C/)]]
  });

  /* ═════════════════════════ 7 · the box of Lego ═════════════════════════ */
  /* In Cameo a brick is dragged from the library onto the diagram of a drone: here from the box of the bay onto
     the IBD of the swarm, drawn below it. The film then plugs the same brick in the bay, whose drone builds itself
     in 3D. Then the right-click on the diagram, Auto Connect, and the connectors draw themselves.
     legoBay, preview: a click on a brick of a drone plugs it. Buttons: 7 per drone (Zone, Flock, Track,
     Predator, Standby, Master, Reflex), then Master on the base station (the 22nd). */
  const plugAt = (i) => (root) => {
    const b = [...root.querySelectorAll('button')][i];
    if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
  };
  const L7 = (x) => T.lego[0] + x;
  const BRICKS = ((window.LEGO || {}).bricks || []).reduce((m, b) => (m[b.type] = b, m), {});
  /* [time, host (0-2 the drones, 3 the base station), slot in the host, brick, button of the bay] */
  const DROPS = [
    [0.7, 0, 0, 'Zone Surveillance', 0], [2.0, 0, 1, 'Flock Watching', 1],
    [3.3, 1, 0, 'Sheep Tracking', 7 + 2],
    [4.6, 2, 0, 'Predator Management', 14 + 3],
    [5.9, 3, 1, 'Swarm Master', 21]
  ].map(([at, host, slot, type, button]) => ({ at, host, slot, type, button }));
  const AUTO_AT = 8.4;         // the click on Auto Connect
  caption(T.lego[0], T.lego[1], {
    k: 'Build it like Lego', color: 'var(--ph-fn)', title: 'Drop a brick, Auto Connect, it flies',
    text: 'Each component is a brick of the model. Drop it on a drone in Cameo, right-click <b>Auto Connect</b>: the links appear, and the drone builds itself in 3D.',
    list: [['Drone 1 watches the zone'], ['Drone 2 follows the strays'], ['Drone 3 handles the bear'], ['The base decides'], ['Auto Connect links them']],
    at: [0, 2, 3, 4].map((i) => L7(DROPS[i].at)).concat(L7(AUTO_AT))
  });
  const BAY = { x: WIN.x, y: 56, w: WIN.w, h: 636 };
  const bay = guide(T.lego[0], T.lego[1], {
    label: 'Part 4 · Plug the components in the drones', src: '../part4/#plug-drone', widget: 'legoBay', ih: 1900, box: BAY,
    css: 'html[data-film] [data-film-w] [data-status], html[data-film] [data-film-w] [data-budget] { display: none !important; }',
    cues: DROPS.map((d) => [d.at, plugAt(d.button)])
  });

  /* the IBD of the swarm, in Cameo's colours: 1 px of the drawing = 1 px of the stage */
  const IB = { x: WIN.x, y: 712, w: WIN.w, h: 290 };
  const SVGNS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent, text) {
    const n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  const ibd = el('div', 'nx-ibd', '', screen);
  place(ibd, IB.x, IB.y, IB.w, IB.h);
  const isvg = sv('svg', { viewBox: `0 0 ${IB.w} ${IB.h}`, width: IB.w, height: IB.h }, ibd);
  const grad = sv('linearGradient', { id: 'nx-part', x1: 0, y1: 0, x2: 0, y2: 1 }, sv('defs', {}, isvg));
  sv('stop', { offset: 0, 'stop-color': '#fffdf0' }, grad);
  sv('stop', { offset: 1, 'stop-color': '#fbe7a6' }, grad);
  sv('rect', { x: 1, y: 1, width: IB.w - 2, height: IB.h - 2, class: 'ib-frame' }, isvg);
  sv('path', { d: 'M1 1H318V17L306 27H1Z', class: 'ib-tab' }, isvg);
  sv('text', { x: 10, y: 19, class: 'ib-tabt' }, isvg, 'ibd [Block] Pasture Sentinel System');
  const HOSTS = [['Drone 1', 'Flight Orchestrator'], ['Drone 2', 'Flight Orchestrator'], ['Drone 3', 'Flight Orchestrator'], ['Base Station', 'Ground Control']];
  const hx = (i) => 16 + i * 256;
  const SLOT = [60, 104];
  const PW = 154;
  const ipart = (x, y, w, name, tone) => {
    const g = sv('g', { class: 'ib-part' }, isvg);
    sv('rect', { x, y, width: w, height: 34, rx: 2, class: 'ib-box' }, g);
    if (tone) sv('rect', { x, y, width: 6, height: 34, fill: tone }, g);
    sv('text', { x: x + (tone ? 13 : 8), y: y + 21, class: 'ib-name' }, g, ': ' + name);
    return g;
  };
  const iport = (x, y, parent) => sv('rect', { x: x - 4, y: y - 4, width: 8, height: 8, class: 'ib-port' }, parent || isvg);
  HOSTS.forEach(([name, given], i) => {
    const x = hx(i);
    sv('rect', { x, y: 34, width: 240, height: 196, class: 'ib-host' }, isvg);
    sv('text', { x: x + 8, y: 52, class: 'ib-hname' }, isvg, ': ' + name);
    const base = i === 3;
    const g = ipart(base ? x + 20 : x + 70, 168, base ? 110 : PW, given);
    if (base) iport(x + 50, 168, g); else iport(x + 70, 185, g);
    if (!base) iport(x + 232, 230);
  });
  [0, 1, 2].forEach((k) => iport(hx(3) + 170 + k * 16, 230));
  /* the parts dropped, hidden until their drop, and the connectors Auto Connect makes */
  const links = [];
  const link = (d, kind, at) => {
    const p = sv('path', { d, pathLength: 1, class: 'ib-link ' + kind }, isvg);
    links.push({ p, at, kind, len: 0 });
  };
  DROPS.forEach((d, i) => {
    const x = hx(d.host) + 70;
    const y = SLOT[d.slot];
    const b = BRICKS[d.type] || {};
    d.g = ipart(x, y, PW, d.type, b.tone || '#64748b');
    iport(x, y + 17, d.g);
    iport(x + PW, y + 17, d.g);
    d.pt = [IB.x + x + PW / 2, IB.y + y + 17];
    const fx = hx(d.host);
    if (d.host < 3) {
      link(`M${x} ${y + 17}H${fx + 40}V185H${fx + 70}`, 'fo', AUTO_AT + 0.2 + i * 0.1);
      if (d.slot === 0) {
        const k = d.host;
        const bus = 268 - k * 10;
        link(`M${x + PW} ${y + 17}H${fx + 232}V${bus}H${hx(3) + 202 - k * 16}V138`, 'swarm', AUTO_AT + 0.55 + k * 0.15);
      } else link(`M${x + PW} ${y + 17}H${fx + 232}`, 'swarm', AUTO_AT + 0.5);
    } else link(`M${x} ${y + 17}H${fx + 50}V168`, 'fo', AUTO_AT + 0.3);
  });
  const packets = links.filter((l) => l.kind === 'swarm' && /V138$/.test(l.p.getAttribute('d'))).concat(links.filter((l) => l.kind === 'fo'))
    .map((l, i) => ({ l, dot: sv('circle', { r: l.kind === 'swarm' ? 5 : 4, class: 'ib-dot ' + l.kind }, isvg), i }));

  /* the brick in the hand, from the box to the diagram */
  const ghost = el('div', 'nx-ghost', '', screen);
  const brickIn = (type) => (root) => [...root.querySelectorAll('[data-box] .lego-brick')].find((x) => x.textContent.trim() === type);
  DROPS.forEach((d) => {
    STOPS.push({ t: L7(d.at - 0.6), at: (t) => inWin(bay, brickIn(d.type), t), fb: [BAY.x + 200, BAY.y + 120], grab: d });
    STOPS.push({ t: L7(d.at), at: () => d.pt, fb: d.pt, drop: d });
  });
  at((t) => {
    const o = env(t, T.lego[0] + 0.3, T.lego[1], 0.5, 0.4);
    show(ibd, o);
    if (o) set(ibd, 'transform', `translateY(${((1 - eout(prog(t, T.lego[0] + 0.3, T.lego[0] + 0.9))) * 60).toFixed(1)}px)`);
    DROPS.forEach((d) => {
      const p = prog(t, L7(d.at), L7(d.at) + 0.45);
      show(d.g, p > 0 ? 1 : 0);
      set(d.g, 'transform', `scale(${(0.4 + 0.6 * eback(p)).toFixed(3)})`);
      tog(d.g, 'hl', t > L7(d.at) && t < L7(d.at) + 1.0);
    });
    links.forEach((l) => {
      const p = eio(prog(t, L7(l.at), L7(l.at) + (l.kind === 'swarm' ? 0.75 : 0.4)));
      show(l.p, p > 0 ? 1 : 0);
      set(l.p, 'stroke-dashoffset', (1 - p).toFixed(3));
      tog(l.p, 'fresh', t > L7(l.at) && t < L7(AUTO_AT + 2.6));
    });
    const live = t > L7(AUTO_AT + 1.5) && t < T.lego[1];
    packets.forEach(({ l, dot, i }) => {
      show(dot, live ? 1 : 0);
      if (!live) return;
      if (!l.len) l.len = l.p.getTotalLength();
      const speed = l.kind === 'swarm' ? 0.42 : 0.8;
      let q = ((t - L7(AUTO_AT + 1.5)) * speed + i * 0.37) % 2;
      q = q > 1 ? 2 - q : q;
      const pt = l.p.getPointAtLength(l.len * q);
      dot.setAttribute('cx', pt.x.toFixed(1));
      dot.setAttribute('cy', pt.y.toFixed(1));
    });
    const held = DROPS.find((d) => t >= L7(d.at - 0.6) && t < L7(d.at));
    show(ghost, held ? 1 : 0);
    if (held && ghost.dataset.type !== held.type) {
      const b = BRICKS[held.type] || {};
      ghost.dataset.type = held.type;
      ghost.style.setProperty('--tone', b.tone || '#64748b');
      ghost.innerHTML = `${b.icon ? `<svg viewBox="0 0 24 24">${b.icon}</svg>` : ''}${esc(held.type)}`;
    }
  });

  /* the right-click of Cameo, on the diagram */
  const MENU_AT = [800 + 34, 712 + 64];
  const menu = el('div', 'nx-menu', '<div class="nx-menu-i">Specification</div><div class="nx-menu-i">Symbol</div><div class="nx-menu-i on">MBSE Shepherd <b>›</b><div class="nx-sub"><div>Create All Missing Signal Ports</div><div class="hot">Auto Connect</div><div>Check Signal Flow</div></div></div>', screen);
  place(menu, MENU_AT[0], MENU_AT[1]);
  const hot = $('.hot', menu);
  STOPS.push({ t: L7(7.1), at: () => MENU_AT, fb: MENU_AT });
  STOPS.push({ t: L7(AUTO_AT), at: () => onStage(hot), fb: [MENU_AT[0] + 520, MENU_AT[1] + 130] });
  at((t) => {
    const o = env(t, L7(7.15), L7(AUTO_AT + 0.35), 0.15, 0.25);
    show(menu, o);
    if (o) set(menu, 'transform', `scale(${(0.9 + 0.1 * eout(prog(t, L7(7.15), L7(7.45)))).toFixed(3)})`);
    tog(menu, 'open', t > L7(7.6));
    tog(menu, 'press', t > L7(AUTO_AT));
  });
  stamp(L7(AUTO_AT + 1.6), T.lego[1] - 0.1, 'Links made', BAY.x + BAY.w - 200, BAY.y + 150);

  /* ═════════════════════════ 8 · the fleet: a field, drones, a master ═════════════════════════ */
  function fleetCard(a, b, box, title, demo, steps, o) {
    o = o || {};
    const n = el('div', 'simcard nx-fleet', `<div class="simcard-head"><small>${esc(o.tag || 'Simulation')}</small>${esc(title)}<span class="live">LIVE</span></div><div class="sim-host"></div><p class="nx-rule"></p>`, screen);
    place(n, box.x, box.y, box.w, box.h);
    const host = $('.sim-host', n);
    const ruleEl = $('.nx-rule', n);
    const fleet = FC.createFleet();
    const scene = FS.create(host);
    fleet.subscribe((snap) => {
      scene.setFleet(snap);
      const r = snap.rule || {};
      ruleEl.textContent = r.text || '';
      ruleEl.dataset.tone = r.tone || '';
    });
    fleet.useDemo(demo, steps, 'film');
    let played = false;
    let on = false;
    at((t) => {
      const v = env(t, a, b, 0.4, 0.4);
      show(n, v);
      if (v) set(n, 'transform', `translateY(${((1 - eout(prog(t, a, a + 0.5))) * 40).toFixed(1)}px)`);
      const want = t >= a - 0.2 && t < b;
      if (want !== on) { on = want; scene.setVisible(on); }
      if (t >= a && t < a + 1 && !played && playing) { played = true; fleet.runScenario(); }
      if (t < a - 0.5 && played) { played = false; fleet.useDemo(demo, steps, 'film'); }
    });
    return { n, fleet };
  }
  const RD = (gap) => [[gap, 'D1', 'Ready for Mission'], [120, 'D2', 'Ready for Mission'], [120, 'D3', 'Ready for Mission'],
    [500, 'D1', 'Going to Safe Area'], [200, 'D2', 'Going to Safe Area'], [200, 'D3', 'Going to Safe Area']];
  const optA = SWARM[0] || {};
  const optB = SWARM[1] || {};
  const optC = SWARM[2] || {};

  /* the missions of the board (part4/content/lego.js), ticked while the swarm flies */
  /* option B decides on the ground: when the base loses its radio, nobody answers (the mission says so) */
  const MISSIONS = [['Patrol', 1], ['Stray sheep', 1], ['Bear', 1], ['Sheep and bear', 1], ['Base radio down', 0], ['Storm', 1]];
  const F8 = (x) => T.fly[0] + x;
  caption(T.fly[0], T.fly[1], {
    k: 'Play the missions', color: 'var(--ph-fn)', title: 'Every scenario, on your swarm',
    text: 'The missions run in Cameo, on what you assembled. The guide moves the drones as the simulation goes, and shows what holds, and what does not.',
    y: 170
  });
  const board = el('div', 'nx-board', `<p class="nx-board-h">Missions</p>${MISSIONS.map(([m, ok]) => `<div class="nx-m" data-ok="${ok}"><span>${m}</span><b>▶ Play</b></div>`).join('')}`, screen);
  place(board, CAP.x, 560, 560);
  const rows = [...board.querySelectorAll('.nx-m')];
  at((t) => {
    show(board, env(t, F8(0.3), T.fly[1], 0.4, 0.4));
    rows.forEach((r, i) => {
      const a = F8(3.4 + i * 0.85);
      tog(r, 'run', t >= a && t < a + 0.75);
      tog(r, r.dataset.ok === '1' ? 'ok' : 'ko', t >= a + 0.75);
    });
  });
  fleetCard(T.fly[0], T.fly[1], { x: WIN.x, y: WIN.y + 20, w: WIN.w, h: WIN.h - 40 }, optB.name || 'Base station leads 3 specialised drones', optB.demo, RD(300).concat([
    [2600, 'D1', 'Patrolling'], [150, 'D2', 'Guarding flock'], [150, 'D3', 'Hovering'],
    [1500, 'D2', 'Tracking stray sheep'],
    [1200, 'D3', 'Predator tracking'],
    [1800, 'D3', 'Predator counteraction'],
    [900, 'D2', 'Guarding flock']
  ]), { tag: 'Option B' });

  /* ═════════════════════════ 9 · three architectures, side by side ═════════════════════════ */
  caption(T.side[0], T.side[1], {
    k: 'Compare', color: 'var(--ph-fn)', title: 'Three architectures, the same bad day',
    text: 'A sheep walks out while the bear is tracked. Each master assigns the jobs as they come: one drone on the sheep, one on the bear, one keeps the field.',
    y: 128, w: 1720
  });
  const SIDE_W = 556;
  const SIDE = (i) => ({ x: 96 + i * (SIDE_W + 26), y: 390, w: SIDE_W, h: 630 });
  /* the same bad day for all three: patrol, a sheep strays, the bear comes while it is out */
  const day = (sheep, bear, back) => RD(200).concat([
    [2300, 'D1', 'Patrolling'], [120, 'D2', 'Patrolling'], [120, 'D3', 'Patrolling'],
    [1300, sheep, 'Tracking stray sheep'],
    [900, bear, 'Predator tracking'],
    [1700, bear, 'Predator counteraction'],
    [1500, sheep, 'Patrolling'],
    [1600, bear, back]
  ]);
  const roleDay = (sheep, bear) => RD(200).concat([
    [2300, 'D1', 'Patrolling'], [120, 'D2', 'Guarding flock'], [120, 'D3', 'Hovering'],
    [1300, sheep, 'Tracking stray sheep'],
    [900, bear, 'Predator tracking'],
    [1700, bear, 'Predator counteraction'],
    [1500, sheep, 'Guarding flock'],
    [1600, bear, 'Hovering']
  ]);
  fleetCard(T.side[0] + 0.2, T.side[1], SIDE(0), '3 complete drones', optA.demo, day('D2', 'D3', 'Patrolling'), { tag: 'A · base decides' });
  fleetCard(T.side[0] + 0.45, T.side[1], SIDE(1), '3 specialised drones', optB.demo, roleDay('D2', 'D3'), { tag: 'B · base decides' });
  fleetCard(T.side[0] + 0.7, T.side[1], SIDE(2), 'The Scout leads', optC.demo, roleDay('D2', 'D3'), { tag: 'C · a drone decides' });

  /* ═════════════════════════ 10 · outro ═════════════════════════ */
  const out = el('div', 'nx-out', `<b>MBSE Shepherd</b><span>Learn MBSE by doing it, <em>and validate early.</em></span>
    <ol class="nx-route">${[['1', 'Discover', 'var(--ph-op)'], ['2', 'Marked', 'var(--route)'], ['3', 'Logical', 'var(--ph-lg)'], ['4', 'Swarm', 'var(--ph-fn)']].map(([n, l, c]) => `<li style="--pc:${c}"><i>${n}</i>${l}</li>`).join('')}</ol>
    <p class="nx-url">shepherd.chaos-art.fr</p><p class="nx-credit">Quentin Cespédès · ISAE-SUPAERO (EMS / DSAT / MAE)</p>`, screen);
  const legs = [...out.querySelectorAll('.nx-route li')];
  at((t) => {
    const o = env(t, T.outro[0], END + 1, 0.6, 0.01);
    show(out, o);
    if (!o) return;
    [...out.children].forEach((k, i) => {
      const p = eout(prog(t, T.outro[0] + 0.15 * i, T.outro[0] + 0.15 * i + 0.6));
      set(k, 'transform', `translateY(${((1 - p) * 30).toFixed(1)}px)`);
      set(k, 'opacity', p.toFixed(3));
    });
    legs.forEach((l, i) => tog(l, 'on', t > T.outro[0] + 1.2 + i * 0.45));
  });

  /* ───────── the pointer: it goes to what the film clicks, a ring at each click ───────── */
  function onStage(n) {
    const s = stage.getBoundingClientRect();
    const r = n.getBoundingClientRect();
    if (!r.width) return null;
    const k = s.width / 1920;
    return [(r.left + r.width / 2 - s.left) / k, (r.top + r.height / 2 - s.top) / k];
  }
  STOPS.sort((x, y) => x.t - y.t);
  const memo = STOPS.map((s) => s.fb);
  const ptr = el('div', 'cursor nx-cursor', '<span class="ring"></span><svg viewBox="0 0 24 24"><path d="M4 2.5l15.5 9-6.8 1.6 3.9 7-2.6 1.4-3.9-7L4 19z" fill="#fff" stroke="#15221a" stroke-width="1.6" stroke-linejoin="round"/></svg>', screen);
  const ptrRing = $('.ring', ptr);
  const BRIDGE = 3.5;          // two clicks closer than this: the pointer glides from one to the other
  const ENTER = [150, 120];    // where it comes from when it appears
  at((t) => {
    let i = 0;
    while (i < STOPS.length && STOPS[i].t <= t) i++;
    const prev = i > 0 ? i - 1 : -1;
    const next = i < STOPS.length ? i : -1;
    [prev, next].forEach((k) => { if (k >= 0) { const p = STOPS[k].at(t); if (p) memo[k] = p; } });
    const bridged = prev >= 0 && next >= 0 && STOPS[next].t - STOPS[prev].t < BRIDGE;
    let o = 0;
    if (prev >= 0) o = Math.max(o, 1 - prog(t - STOPS[prev].t, 0.5, 0.8));
    if (next >= 0) o = Math.max(o, prog(t, STOPS[next].t - 0.65, STOPS[next].t - 0.4));
    if (bridged) o = 1;
    show(ptr, o);
    if (!o) { show(ghost, 0); return; }
    let p;
    if (next >= 0) {
      const to = memo[next];
      const from = bridged ? memo[prev] : [to[0] + ENTER[0], to[1] + ENTER[1]];
      const mv = bridged ? Math.min(0.6, (STOPS[next].t - STOPS[prev].t) * 0.85) : 0.6;
      const q = eio(prog(t, STOPS[next].t - mv, STOPS[next].t));
      p = [lerp(from[0], to[0], q), lerp(from[1], to[1], q)];
    } else p = memo[prev];
    let r = 0;
    if (prev >= 0 && !STOPS[prev].grab && t - STOPS[prev].t < 0.55) r = (t - STOPS[prev].t) / 0.55;
    show(ptrRing, r ? 1 - r : 0);
    set(ptrRing, 'transform', `scale(${(0.4 + r * 1.3).toFixed(3)})`);
    const press = r && r < 0.3 ? 0.86 : 1;
    set(ptr, 'transform', `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px) scale(${press})`);
    if (ghost.style.visibility === 'visible') set(ghost, 'transform', `translate(${(p[0] + 14).toFixed(1)}px, ${(p[1] + 18).toFixed(1)}px) rotate(-3deg)`);
  });

  /* ───────── the little sheep that wander in (the film's own, js of promo.js) ───────── */
  const LAMB = `<svg viewBox="0 0 140 120" aria-hidden="true">
    <ellipse cx="72" cy="113" rx="44" ry="6" fill="rgba(0,0,0,.28)"/>
    <g fill="#2d2b33"><rect x="42" y="84" width="10" height="27" rx="5"/><rect x="58" y="88" width="10" height="24" rx="5"/><rect x="82" y="88" width="10" height="24" rx="5"/><rect x="98" y="84" width="10" height="27" rx="5"/></g>
    <g fill="#fff" stroke="#cfd8c9" stroke-width="6">${[[50, 62, 24], [72, 50, 26], [94, 60, 24], [72, 76, 24], [52, 82, 18], [92, 82, 18], [36, 70, 16], [106, 72, 16]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
    <g fill="#fff">${[[50, 62, 24], [72, 50, 26], [94, 60, 24], [72, 76, 24], [52, 82, 18], [92, 82, 18], [36, 70, 16], [106, 72, 16]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
    <ellipse cx="99" cy="47" rx="10" ry="5.5" fill="#2d2b33" transform="rotate(-28 99 47)"/>
    <ellipse cx="129" cy="46" rx="10" ry="5.5" fill="#2d2b33" transform="rotate(28 129 46)"/>
    <ellipse cx="114" cy="60" rx="18" ry="20" fill="#2d2b33"/>
    <g fill="#fff"><circle cx="107" cy="41" r="7.5"/><circle cx="115" cy="37" r="8"/><circle cx="122" cy="42" r="7"/></g>
    <g class="eyes"><circle cx="108" cy="59" r="5" fill="#fff"/><circle cx="121" cy="59" r="5" fill="#fff"/><circle cx="109" cy="60" r="2.8" fill="#111"/><circle cx="122" cy="60" r="2.8" fill="#111"/><circle cx="110" cy="58.6" r="1" fill="#fff"/><circle cx="123" cy="58.6" r="1" fill="#fff"/></g>
    <g fill="#ff9cc5" opacity=".85"><ellipse cx="103" cy="68" rx="4.5" ry="2.6"/><ellipse cx="126" cy="68" rx="4.5" ry="2.6"/></g>
    <path d="M111 70q2.5 3 5 0q2.5 3 5 0" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;
  function lamb(a, b, x0, x1, y, s, say) {
    const n = el('div', 'lamb' + (x1 < x0 ? ' flip' : ''), LAMB + `<span class="baa">${say || 'baa!'}</span>`, screen);
    const baa = $('.baa', n);
    at((t) => {
      const vis = env(t, a, b, 0.3, 0.3);
      show(n, vis);
      if (!vis) return;
      const x = lerp(x0, x1, prog(t, a, b));
      const lift = Math.abs(Math.sin((t - a) * 9)) * 9;
      const flip = x1 < x0 ? -1 : 1;
      set(n, 'transform', `translate(${(x - 65).toFixed(1)}px, ${(y - 111 - lift).toFixed(1)}px) scale(${(flip * s).toFixed(3)}, ${s}) rotate(${(Math.sin((t - a) * 9) * 3).toFixed(2)}deg)`);
      const mid = (a + b) / 2;
      show(baa, env(t, mid - 0.7, mid + 0.7, 0.2, 0.2));
      set(baa, 'transform', `scaleX(${flip})`);
    });
  }
  lamb(0.6, 5.4, -120, 2040, 1065, 0.75);
  lamb(T.goal[0] + 2, T.goal[0] + 8, 2040, -120, 1066, 0.6);
  lamb(T.band4[0] + 0.2, T.band4[1] + 0.2, 2040, -120, 1065, 0.7, 'baa?');
  lamb(T.dilemma[0] + 0.3, T.dilemma[1], -120, 760, 1066, 0.62, 'baa?');
  lamb(T.outro[0] + 1.5, END, -140, 900, 1050, 0.8);
  lamb(T.outro[0] + 2.2, END, -300, 700, 1066, 0.62, 'baaa!');

  /* a fade at the very end */
  const fade = el('div', 'fade', '', screen);
  at((t) => show(fade, Math.max(1 - prog(t, 0, 0.5), prog(t, END - 0.6, END))));

  /* ═════════════════════════ player ═════════════════════════ */
  function fit() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(${((innerWidth - 1920 * k) / 2).toFixed(1)}px, ${((innerHeight - 1080 * k) / 2).toFixed(1)}px) scale(${k.toFixed(5)})`;
  }
  addEventListener('resize', fit);
  fit();

  const hud = $('#hud');
  const hudPlay = $('#hud-play');
  const hudTime = $('#hud-time');
  const hudSeek = $('#hud-seek');
  let t = Math.max(0, parseFloat(Q.get('t')) || 0);
  let playing = false;
  let last = performance.now();
  function render() {
    liveTick(t);
    tracks.forEach((fn) => fn(t));
    const time = t.toFixed(1) + ' s';
    if (hudTime.textContent !== time) hudTime.textContent = time;
    if (document.activeElement !== hudSeek) hudSeek.value = Math.round((t / END) * 1000);
    const label = playing ? 'Pause' : 'Play';
    if (hudPlay.textContent !== label) hudPlay.textContent = label;
  }
  function loop(now) {
    requestAnimationFrame(loop);
    if (playing) {
      t += Math.min(0.1, (now - last) / 1000) * SPEED;
      if (t >= END) { t = END; playing = false; onEnd(); }
    }
    last = now;
    render();
  }
  function play() { if (t >= END) seek(0); playing = true; }
  function pause() { playing = false; }
  function seek(v) {
    const next = Math.max(0, Math.min(END, v));
    if (next < t) rewind(next);
    t = next;
  }
  hudPlay.addEventListener('click', () => { hudPlay.blur(); playing ? pause() : play(); });
  hudSeek.addEventListener('input', () => { seek((hudSeek.value / 1000) * END); });
  hudSeek.addEventListener('change', () => hudSeek.blur());
  function onKey(e) {
    if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === 'ArrowRight') seek(t + (e.shiftKey ? 5 : 1));
    else if (e.key === 'ArrowLeft') seek(t - (e.shiftKey ? 5 : 1));
    else if (e.key === 'Home') { seek(0); play(); }
    else if (e.key === 'h' || e.key === 'H') hud.classList.toggle('off');
    else if (e.key === 'r' || e.key === 'R') record();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
  addEventListener('keydown', onKey);
  let idle = 0;
  addEventListener('mousemove', () => { hud.classList.remove('off'); clearTimeout(idle); idle = setTimeout(() => { if (playing) hud.classList.add('off'); }, 1800); });
  if (Q.get('hud') === '0') hud.classList.add('off');

  /* Record the stage (Chrome: this tab, cropped to the stage), as promo.js does. */
  let rec = null;
  async function record() {
    if (rec) return;
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 60 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
      const [track] = stream.getVideoTracks();
      try { if (window.CropTarget && track.cropTo) await track.cropTo(await window.CropTarget.fromElement(stage)); } catch (e) { console.warn('promo next: not cropped', e); }
      const type = ['video/mp4;codecs=avc1.640028', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
      const ext = type.startsWith('video/mp4') ? 'mp4' : 'webm';
      const mr = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 16e6 });
      const chunks = [];
      let bytes = 0;
      mr.ondataavailable = (e) => { if (e.data.size) { chunks.push(e.data); bytes += e.data.size; } };
      mr.onstop = () => {
        stream.getTracks().forEach((x) => x.stop());
        rec = null;
        if (!bytes) { report('Recording empty: no image came from the capture. Try a screen recorder (Win+Alt+R, OBS).'); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(chunks, { type: type.split(';')[0] }));
        a.download = `mbse-shepherd-promo-parts34.${ext}`;
        a.click();
      };
      track.addEventListener('ended', () => { if (mr.state !== 'inactive') mr.stop(); });
      hud.classList.add('off');
      seek(0);
      pause();
      await new Promise((r) => setTimeout(r, 4800));   // the first guides open before the film starts
      rec = mr;
      mr.start(500);
      play();
    } catch (err) {
      console.warn('Recording not started:', err);
      if (stream) stream.getTracks().forEach((x) => x.stop());
      if (err && err.name !== 'NotAllowedError') report('Recording not started: ' + (err.message || err));
      rec = null;
    }
  }
  $('#hud-rec').addEventListener('click', (e) => { e.currentTarget.blur(); record(); });
  function onEnd() {
    if (rec) setTimeout(() => { if (rec && rec.state !== 'inactive') rec.stop(); }, 600);
  }

  requestAnimationFrame((now) => { last = now; loop(now); });
  /* the first windows open 4.5 s before their time: wait for them before playing */
  document.fonts.ready.then(() => setTimeout(() => { if (Q.get('autoplay') !== '0') play(); }, 3500));
  window.PromoNext = { seek, play, pause, render, get t() { return t; }, END, T };
})();
