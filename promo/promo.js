/* The promo film of MBSE Shepherd: a ~30 s animation made of the site's own pieces.
   - the real guide, in a laptop and a phone (iframes of ../part1/index.html, driven through their DOM);
   - the diagrams of the demo tool (tool/diagrams.js), lit and animated here;
   - the pasture of the simulation panel (js/sim-scene.js), driven by the state machine.

   Everything is a function of the time t (seconds): each frame sets the styles that t asks for, so the
   film can be paused, scrubbed and restarted. The guide in the iframes and the pasture run on their own
   clocks; they are told which state t asks for and follow.

   URL: ?lang=fr   ?speed=1.2 (faster)   ?t=12 (start at 12 s)   ?autoplay=0   ?hud=0 */
(function () {
  'use strict';
  const Q = new URLSearchParams(location.search);
  const LANG = Q.get('lang') === 'fr' ? 'fr' : 'en';
  const SPEED = Math.max(0.25, Math.min(4, parseFloat(Q.get('speed')) || 1));
  const CFG = window.COURSE_CONFIG || {};
  const M = window.ToolModel;
  const D = window.ToolDiagrams;
  const { STEPS } = window.SimCore;

  /* ───────── words ───────── */
  const STR = {
    en: {
      hook1: 'The lab handout:<br><em>pages and pages<br>of .docx</em>',
      hookWords: ['Long to read.', 'Heavy to follow.', { q: '“Right-click… Create Element… find the package…”' }],
      hook3: 'So the lab became <b>an app.</b>',
      sub: 'An intro to MBSE, <em>with early validation</em>',
      beats: ['Intro · the MBSE layers', 'The exercise, its concept', 'Guided, step by step', 'One click → open in the MBSE tool', 'From the phone too', 'Early validation, synced with the tool'],
      toast: ['Selected in the MBSE tool'],
      bands: {
        op: ['Operational analysis', 'What is expected of the system?'],
        fn: ['Functional architecture', 'How does it do it?'],
        lg: ['Logical architecture', 'Coming soon'],
        ph: ['Physical architecture', 'Who does what?']
      },
      short: { op: 'Operational', fn: 'Functional', lg: 'Logical', ph: 'Physical' },
      caps: {
        op1: 'Use case: who is involved',
        op2: 'Actors become the lifelines of the scenario',
        op3: 'Sunny day, then rainy day',
        op4: 'The context gets its new interface',
        fn1: 'State machine and simulation, side by side',
        fn2: 'The bear enters the tracking perimeter: tracking',
        fn3: 'Engage… it flees. Mission success!',
        ph1: 'Each function allocated to a component',
        ph2: 'New functions land on their software & hardware'
      },
      soon: 'SOON',
      sunny: 'SD · sunny day',
      rainy: 'RD · rainy day',
      rdMsg: ['6: FlightPlan', 'Check Failed'],
      waypoints: ['The app', 'Operational', 'Functional', 'Logical', 'Physical'],
      outro: 'Learn MBSE by doing it, <em>and validate early.</em>',
      credit: 'Quentin Cespédès · ISAE-SUPAERO (EMS / DSAT / MAE)',
      success: 'Mission success!',
      adTodo: 'Part 2 · the students model it',
      baa: 'baa!'
    },
    fr: {
      hook1: 'Le sujet de TP :<br><em>des pages et des pages<br>de .docx</em>',
      hookWords: ['Long à lire.', 'Lourd à suivre.', { q: '« Clic droit… Create Element… trouvez le package… »' }],
      hook3: 'Alors le TP est devenu <b>une app.</b>',
      sub: 'Une intro au MBSE, <em>avec early validation</em>',
      beats: ['Intro · les couches MBSE', "L'exercice et son concept", 'Guidé, pas à pas', 'Un clic → ouvert dans le MBSE tool', 'Depuis le téléphone aussi', 'Early validation, synchro avec le tool'],
      toast: ['Sélectionné dans le MBSE tool'],
      bands: {
        op: ['Analyse opérationnelle', "Qu'attend-on du système ?"],
        fn: ['Architecture fonctionnelle', 'Comment le fait-il ?'],
        lg: ['Architecture logique', 'Bientôt'],
        ph: ['Architecture physique', 'Qui fait quoi ?']
      },
      short: { op: 'Opérationnel', fn: 'Fonctionnel', lg: 'Logique', ph: 'Physique' },
      caps: {
        op1: "Cas d'utilisation : qui intervient",
        op2: 'Les acteurs deviennent les lignes de vie',
        op3: 'Sunny day, puis rainy day',
        op4: 'Le contexte gagne sa nouvelle interface',
        fn1: 'Machine à états et simulation, côte à côte',
        fn2: "L'ours entre dans le périmètre : suivi",
        fn3: 'On engage… il fuit. Mission réussie !',
        ph1: 'Chaque fonction allouée à un composant',
        ph2: 'Les nouvelles fonctions arrivent sur le logiciel et le matériel'
      },
      soon: 'BIENTÔT',
      sunny: 'SD · sunny day',
      rainy: 'RD · rainy day',
      rdMsg: ['6: FlightPlan', 'Check Failed'],
      waypoints: ["L'app", 'Opérationnel', 'Fonctionnel', 'Logique', 'Physique'],
      outro: 'Apprendre le MBSE en le faisant, <em>et valider tôt.</em>',
      credit: 'Quentin Cespédès · ISAE-SUPAERO (EMS / DSAT / MAE)',
      success: 'Mission réussie !',
      adTodo: 'Part 2 · à modéliser par les étudiants',
      baa: 'bêê !'
    }
  };
  const S = STR[LANG];

  /* Real extracts of the Word handout (BE Cameo - Part 1 - Discover), for the wall of text. */
  const PAGES = [
    `<h3>First, what is expected of the system</h3>
     <p>A stakeholder has a need. Before any function or any part, we formalize it: we set the scope of our system and what it is expected to do.</p>
     <ol><li>Operational context: Update it: what are the exchanges between our system of interest and the external actors and systems?</li>
     <li>Use cases: Add the new use case and link it to the actors and systems it involves.</li>
     <li>Scenarios: Describe how the use case unfolds: the nominal scenario, and the dysfunctional ones.</li></ol>
     <p>According to a given flight plan, your system shall first join the predefined safe zone, then start patrolling around its perimeter until the end of the mission. During this patrol, the system shall track the sheep. If one goes outside the safe zone, it shall notify the Shepherd and continue patrolling.</p>
     <div class="fig"></div>
     <h3>Connect the operator to the ground station</h3>
     <p>The mission starts with a requirement: the operator shall transmit the flight plan to the ground station. In the operational context diagram (1 – Operational Analysis / B – Operational Breakdown / Operational Context), the operator is already connected to the ground station. That connection carries the buttons the operator presses, such as Start/Stop mission.</p>
     <p>Is it the same connection? Probably not. Pressing a button sends a command, while a flight plan is a file of waypoints, loaded from a USB stick, a cable or a network. Each kind of exchange gets its own point of connection: a port.</p>
     <p>A port is a point of connection on the border of a part, like a USB port, a button or a power socket. An interface block is the contract of a port: it says what the port exchanges, of which type and in which direction.</p>`,
    `<h3>Create the interface block</h3>
     <ol><li>In the Model Browser, find the package “1 – Operational Analysis / D – Physical Interfaces”.</li>
     <li>Right-click on it, then Create Element. Type “int” to filter the list, and choose Interface Block.</li>
     <li>Name it “IF_FlightPlan”.</li></ol>
     <p>Remark: two ports or more can be typed by the same interface block. Write the contract once, and reuse it on every port that exchanges a flight plan.</p>
     <h3>Say what flows, and which way</h3>
     <ol><li>Right-click on “IF_FlightPlan”, then Create Element &gt; Flow Property. Name it “flightPlan”.</li>
     <li>Type it with the signal “FlightPlan” (2 – Functional Analysis / B – Functional Data / Deployement), the same signal you will use everywhere in this exercise. Three ways, pick one: rename the flow property “flightPlan : FlightPlan” and press Ctrl+Space to auto-complete the type; or drag the signal “FlightPlan” from the Model Browser onto the flow property; or open its Specification and pick the signal in Type. If “FlightPlan” does not appear in the list, untick Apply Filter.</li>
     <li>Set its direction to out: Cameo creates every flow property as inout. Edit the label and replace “inout” by “out”, or open the Specification and choose out in Direction.</li></ol>
     <div class="fig"></div>
     <p>Remark: inout would say that the flight plan goes both ways, and it does not. Write the contract from the side that sends: out. The side that receives is handled by its port, in the next part.</p>`,
    `<h3>One port on each side</h3>
     <ol><li>Open the “Operational Context” diagram.</li>
     <li>From the diagram palette, choose Port and click on the border of “uAV operator”. Type the new port with “IF_FlightPlan”: rename the port “fp : IF_FlightPlan” and press Ctrl+Space to auto-complete, or drag “IF_FlightPlan” from the Model Browser onto the port.</li>
     <li>Look at the port: it shows an out arrow. It comes from the direction of the flow property in the interface.</li>
     <li>Add a port in the same way on the border of “groundStation”, typed by the same “IF_FlightPlan”.</li>
     <li>Right-click on the port of the ground station, then Is Conjugated. Its type becomes “~IF_FlightPlan” and the arrow turns in.</li></ol>
     <div class="fig"></div>
     <p>A connector links two ports, and an item flow says what really travels on a connector. Several ports can be typed by the same interface block.</p>`
  ];

  /* ───────── the clock: start of each part (seconds) ─────────
     Each part has its own pace: a time written inside a part is a moment of that part, stretched by its
     factor (op(2) = 2 "units" after OP0). Change a factor to slow down or speed up a whole part. */
  const K = { hook: 1.5, op: 1.6, fn: 1.8, lg: 1.6, ph: 1.6, out: 1.4 };
  const A0 = 3.4 * K.hook;    // the app (its own times are real seconds: the guide and the tool run live)
  const OP0 = A0 + 23.4;      // operational: right as the drone of the guide takes off
  const OPH = 1.0;            // a pause (in units of the part) between the scenarios and the context
  const FN0 = OP0 + (6.8 + OPH) * K.op;
  const LG0 = FN0 + 7.8 * K.fn;
  const LGH = 1.4;            // a pause (seconds) on the logical teaser before the physical part
  const PH0 = LG0 + 1.0 * K.lg + LGH;
  const OUT0 = PH0 + 4.4 * K.ph;
  const END = OUT0 + 4.2 * K.out;
  const hk = (x) => x * K.hook;
  const ap = (x) => A0 + x;
  const op = (x) => OP0 + (x < 5.0 ? x : x + OPH) * K.op;   // from 5.0 on, after the pause
  const fn = (x) => FN0 + x * K.fn;
  const ph = (x) => PH0 + x * K.ph;
  const ou = (x) => OUT0 + x * K.out;
  /* the methodology is laid out to the right of the desk (laptop, phone, tool) */
  const WX = 1600;

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
  const world = $('#world');
  const screen = $('#screen');
  const lerp = (a, b, p) => a + (b - a) * p;
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const prog = (t, a, b) => clamp01((t - a) / (b - a));
  const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const eout = (x) => 1 - Math.pow(1 - x, 3);
  const ein = (x) => x * x * x;
  const eback = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  /* 0 before a, up to 1 in fi seconds, 1 until b - fo, down to 0 at b */
  const env = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(eout(prog(t, a, a + fi)), 1 - eio(prog(t, b - fo, b)));

  /* Write a style only when it changes: the frame loop sets everything every frame. */
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
  function put(n, x, y, w, h) {
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    if (w) n.style.width = w + 'px';
    if (h) n.style.height = h + 'px';
    world.appendChild(n);
    return n;
  }
  const tracks = [];
  const at = (fn) => tracks.push(fn);

  /* model element id from its name and type (what tool/diagrams.js writes in data-el) */
  const ids = new Map();
  function elId(name, type) {
    const k = type + '|' + name;
    if (!ids.has(k)) {
      let f = null;
      M.walk((nd) => { if (!f && nd.name === name && nd.type === type) f = nd; });
      ids.set(k, f ? f.id : null);
    }
    return ids.get(k);
  }
  const byEl = (svg, name, type) => svg.querySelector(`[data-el="${CSS.escape(elId(name, type) || '')}"]`);

  const ALL = new Set(M.STAGES.map((s) => s.key));
  function card(key, x, y, w, born) {
    const def = D.DEFS[key];
    const s = w / def.w;
    const h = def.h * s;
    const n = el('div', 'card');
    n.appendChild(D.render(key, { built: ALL, born: born || null }));
    put(n, x, y, w, h);
    return { n, svg: n.firstChild, x, y, w, h, s, p: (px, py) => [x + px * s, y + py * s] };
  }

  /* things that fly in the world between two points, on an arc */
  function flyer(html, cls) { return put(el('div', 'flyer ' + (cls || ''), html), 0, 0); }
  function flight(n, t, a, b, from, to, o) {
    o = o || {};
    const lift = o.lift === undefined ? -140 : o.lift;
    const hold = o.hold === undefined ? 0.3 : o.hold;
    const p = eio(prog(t, a, b));
    const x = lerp(from[0], to[0], p);
    const y = lerp(from[1], to[1], p) + lift * 4 * p * (1 - p);
    show(n, Math.min(eout(prog(t, a - 0.25, a)), 1 - prog(t, b + hold, b + hold + 0.3)));
    set(n, 'transform', `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${lerp(o.s0 || 1, o.s1 || 1, p).toFixed(3)})`);
  }
  /* a signal that pops at a transition */
  function spark(text) { return put(el('div', 'spark', text), 0, 0); }
  function sparkAt(n, t, a, pos) {
    const p = prog(t, a - 0.05, a + 0.3);
    show(n, Math.min(p * 3, 1 - prog(t, a + 1.3, a + 1.7)));
    const rise = -46 * eout(prog(t, a, a + 1.7));
    set(n, 'transform', `translate(${pos[0]}px, ${pos[1] + rise}px) translate(-50%, -100%) scale(${(0.4 + 0.6 * eback(p)).toFixed(3)})`);
  }

  const ACTOR_SVG = '<svg viewBox="0 0 26 34"><circle cx="13" cy="6" r="4.5"/><path d="M13 10.5V22M4 15h18M13 22l-6.5 10M13 22l6.5 10"/></svg>';
  const LOGO = '<svg viewBox="0 0 32 32"><rect x="11" y="11" width="10" height="10" rx="2" fill="#15221a"/><g fill="none" stroke="#15221a" stroke-width="2.4"><circle cx="9" cy="9" r="4"/><circle cx="23" cy="9" r="4"/><circle cx="9" cy="23" r="4"/><circle cx="23" cy="23" r="4"/></g></svg>';
  const PHASE = {
    op: 'var(--ph-op)', fn: 'var(--ph-fn)', lg: 'var(--ph-lg)', ph: 'var(--ph-ph)'
  };

  /* ═════════════════════════ the desk: laptop, phone, MBSE tool ═════════════════════════ */
  const LAP = { x: 310, y: 170, w: 1300, h: 812, iw: 1280 };
  const PHN = { x: 1454, y: 344, w: 330, h: 714, iw: 390 };
  const TL = { x: 1900, y: 150, w: 1300, h: 820, iw: 1500 };
  const DESK = { x: 1755, y: 560, s: 0.66 };            // the camera that sees the whole desk
  const TREE = { x: 2260, y: 420, s: 1.6 };             // the camera on the tool's containment tree

  /* ═════════════════════════ the camera ═════════════════════════
     [from, to, x, y, scale]: the point of the world at the centre of the stage. In order, never overlapping. */
  const CAM0 = { x: 960, y: 540, s: 1 };
  const MOVES = [
    [ap(0), ap(7.8), 960, 545, 1.04],
    [ap(8.0), ap(8.9), DESK.x, DESK.y, DESK.s],
    [ap(9.0), ap(9.6), 960, 545, 1.0],
    [ap(10.5), ap(11.3), TREE.x, TREE.y, TREE.s],
    [ap(12.3), ap(13.0), 1830, 600, 0.95],
    [ap(14.3), ap(15.0), TREE.x, TREE.y, TREE.s],
    [ap(15.5), ap(16.3), DESK.x, DESK.y, DESK.s],
    [ap(17.3), ap(18.0), 2560, 470, 0.95],
    [ap(21.2), ap(21.9), 960, 545, 1.0],
    [OP0 - 0.1, op(0.8), 2750 + WX, 540, 1.12],
    [op(1.8), op(2.7), 3950 + WX, 560, 1.18],
    [op(4.3), op(4.8), 4130 + WX, 600, 1.0],
    [op(5.0), op(5.8), 5480 + WX, 575, 1.1],
    [fn(0), fn(0.9), 7510 + WX, 520, 1.0],
    [LG0 - 0.1, LG0 + 0.6, 9050 + WX, 540, 1.0],
    [PH0 - 0.8, ph(0.4), 10200 + WX, 515, 1.3],
    [ph(2.0), ph(2.7), 10790 + WX, 515, 0.84],
    [ou(0), ou(1.6), 6825, 690, 0.134]
  ];
  function camAt(t) {
    let c = CAM0;
    for (const [a, b, x, y, s] of MOVES) {
      if (t <= a) break;
      const p = eio(prog(t, a, b));
      c = { x: lerp(c.x, x, p), y: lerp(c.y, y, p), s: Math.exp(lerp(Math.log(c.s), Math.log(s), p)) };
    }
    return c;
  }
  at((t) => {
    const c = camAt(t);
    set(world, 'transform', `translate(${(960 - c.x * c.s).toFixed(2)}px, ${(540 - c.y * c.s).toFixed(2)}px) scale(${c.s.toFixed(4)})`);
  });

  /* ═════════════════════════ 1 · the hook: the .docx ═════════════════════════ */
  (function hook() {
    const root = el('div', 'hook', '', screen);
    const bar = el('div', 'word-bar', 'BE Cameo - Part 1 - Discover.docx — Word', root);
    const pages = el('div', 'hook-pages', PAGES.concat(PAGES).map((p) => `<div class="page">${p}</div>`).join(''), root);
    const h1 = el('div', 'hook-txt hook-h', S.hook1, root);
    const words = S.hookWords.map((w, i) => {
      const n = el('div', 'hook-txt hook-w' + (w.q ? ' q' : ''), w.q || w, root);
      n.style.top = [520, 600, 700][i] + 'px';
      return n;
    });
    const app = el('div', 'hook-app', S.hook3, root);
    at((t) => {
      if (t > A0 + 0.5) { show(root, 0); return; }
      show(root, 1);
      const cut = eio(prog(t, A0 - 0.45, A0 + 0.3));
      set(root, 'clip-path', `inset(0 0 ${(cut * 100).toFixed(2)}% 0)`);
      const scroll = ein(prog(t, 0, hk(2.7))) * 3400 + t * 50;
      const squeeze = eio(prog(t, hk(2.35), hk(2.65)));
      const blur = Math.min(4, Math.max(0, (prog(t, hk(1.4), hk(2.6))) * 4));
      set(pages, 'transform', `perspective(1800px) rotateY(-16deg) rotateZ(2deg) translateY(${-scroll}px) scaleX(${1 - squeeze})`);
      set(pages, 'filter', `blur(${blur.toFixed(2)}px)`);
      show(pages, 1 - squeeze);
      show(bar, 1 - squeeze);
      show(h1, env(t, hk(0.1), hk(2.55), 0.4, 0.3));
      set(h1, 'transform', `translateY(${(1 - eout(prog(t, hk(0.1), hk(0.1) + 0.5))) * 40}px)`);
      words.forEach((w, i) => {
        const a = hk(0.95 + i * 0.45);
        show(w, env(t, a, hk(2.55), 0.2, 0.3));
        set(w, 'transform', `scale(${(1.25 - 0.25 * eout(prog(t, a, a + 0.3))).toFixed(3)})`);
        set(w, 'transform-origin', 'left center');
      });
      const pa = prog(t, hk(2.55), hk(2.55) + 0.45);
      show(app, Math.min(pa * 2, 1));
      set(app, 'transform', `scale(${(0.85 + 0.15 * eback(pa)).toFixed(3)})`);
    });
  })();

  /* ═════════════════════════ 2 · the app, live ═════════════════════════
     The real guide (laptop and phone) is paired through the relay with the real demo tool (tool/), which plays
     Cameo: "Open in Cameo" in the guide selects the element in the tool, and the simulation run in the tool
     moves the drone of the guide. The film only clicks, at given times; what follows is the site's own work. */
  function device(cls, box, title) {
    const scale = box.w / box.iw;
    const frame = el('iframe');
    frame.title = title;
    Object.assign(frame.style, { width: box.iw + 'px', height: box.h / scale + 'px', transform: `scale(${scale})` });
    const scr = el('div', 'device-screen');
    scr.style.width = box.w + 'px';
    scr.style.height = box.h + 'px';
    scr.appendChild(frame);
    return { frame, scr, scale, box };
  }
  const LAPD = device('laptop', LAP, 'The guide');
  const lap = put(el('div', 'laptop'), LAP.x - 16, LAP.y - 16, LAP.w + 32, LAP.h + 32);
  lap.appendChild(LAPD.scr);
  const lapBase = put(el('div', 'laptop-base'), LAP.x - 120, LAP.y + LAP.h + 16, LAP.w + 240);
  const TLD = device('tool', TL, 'The MBSE tool');
  const toolWin = put(el('div', 'toolwin'), TL.x, TL.y, TL.w, TL.h);
  toolWin.appendChild(TLD.scr);
  const PHD = device('phone', PHN, 'The guide on a phone');
  const phone = put(el('div', 'phone', '<span class="notch"></span>'), PHN.x - 14, PHN.y - 14, PHN.w + 28, PHN.h + 28);
  phone.appendChild(PHD.scr);
  const lapFrame = LAPD.frame;
  const phnFrame = PHD.frame;
  const toolFrame = TLD.frame;

  const kicker = el('div', 'kicker', `<span class="logo">${LOGO}</span><div><b>${CFG.appName || 'MBSE Shepherd'}</b><span>${S.sub}</span></div>`, screen);
  /* the beats of the app, one at a time, top right of the screen */
  const BEATS = [[ap(0.4), ap(3.0)], [ap(3.0), ap(5.6)], [ap(5.6), ap(8.0)], [ap(8.0), ap(12.2)], [ap(12.2), ap(15.4)], [ap(15.4), OP0 + 0.2]]
    .map(([a, b], i) => ({ a, b, n: el('div', 'beat', `<i>${i + 1}</i>${S.beats[i]}`, screen) }));
  at((t) => {
    show(kicker, env(t, ap(0.1), ap(8.2), 0.4, 0.4));
    BEATS.forEach(({ a, b, n }, i) => {
      show(n, env(t, a, b, 0.3, i === BEATS.length - 1 ? 0.4 : 0.25));
      set(n, 'transform', `translateY(${((1 - eout(prog(t, a, a + 0.35))) * 30).toFixed(1)}px)`);
    });
    const p = eout(prog(t, ap(12.2), ap(12.9)));
    show(phone, p * placeO(t, -1, OP0 + 1.2));
    set(phone, 'transform', `translateY(${((1 - p) * 700).toFixed(1)}px) rotate(${((1 - p) * -6).toFixed(2)}deg)`);
    const q = eout(prog(t, ap(7.9), ap(8.7)));
    show(toolWin, q * placeO(t, -1, OP0 + 1.2));
    set(toolWin, 'transform', `translateX(${((1 - q) * 400).toFixed(1)}px)`);
  });

  /* ───── reaching into the three pages (same origin) ───── */
  const docOf = (f) => { try { const d = f.contentDocument; return d && d.documentElement ? d : null; } catch (e) { return null; } };
  const guideReady = (f) => { try { return !!(f.contentWindow.COURSE && docOf(f).querySelector('.scene, main')); } catch (e) { return false; } };
  const toolReady = () => { try { return !!docOf(toolFrame).querySelector('#tree .tr-row'); } catch (e) { return false; } };
  function q(f, sel) {
    const d = docOf(f);
    if (!d) return null;
    /* the last one on screen: a closing overlay can leave an older copy behind */
    const vh = d.documentElement.clientHeight;
    return [...d.querySelectorAll(sel)].filter((n) => { const b = n.getBoundingClientRect(); return b.width && b.top >= 0 && b.bottom <= vh; }).pop() || null;
  }
  function click(f, sel) { const n = q(f, sel); if (n) n.click(); return !!n; }
  function escape(f) { const d = docOf(f); if (d) d.dispatchEvent(new f.contentWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
  function hash(f, id) { try { if (f.contentWindow.location.hash !== '#' + id) f.contentWindow.location.hash = id; } catch (e) { /* not reachable */ } }
  /* In the film the tool plays Cameo: the sheet of the guide says so. */
  function relabel(f) {
    const d = docOf(f);
    if (!d) return;
    [d.getElementById('overlay-root'), d.getElementById('toast')].forEach((root) => {
      if (!root || !root.firstChild) return;
      const w = d.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.includes('Cameo')) n.nodeValue = n.nodeValue.replace(/Cameo/g, 'MBSE tool');
    });
  }
  const DEVICES = [[lapFrame, LAPD], [phnFrame, PHD], [toolFrame, TLD]];
  function worldOf(f, sel) {
    const n = q(f, sel);
    if (!n) return null;
    const { box, scale } = DEVICES.find(([fr]) => fr === f)[1];
    const r = n.getBoundingClientRect();
    return [box.x + (r.left + r.width * 0.5) * scale, box.y + (r.top + r.height * 0.5) * scale];
  }
  /* the simulation drawer of the laptop guide, through its own API (js/sim.js) */
  const drawer = (on) => { try { const S = lapFrame.contentWindow.Sim; if (on) { S.pilot.reset(); S.open(); } else S.close(); return true; } catch (e) { return false; } };
  const toolSignal = (sig) => click(toolFrame, `#triggers [data-signal="${CSS.escape(sig)}"]`);

  /* The live script: what the film does at each time. A step that returns false is tried again at the next
     frames (for 2.5 s): the tool may still be busy with a transition. Going back in time resets the desk. */
  const LIVE = [
    [ap(0.4), () => hash(lapFrame, 'method')],
    [ap(3.0), () => hash(lapFrame, 'mission-brief')],
    [ap(5.6), () => hash(lapFrame, 'a-lifelines')],
    [ap(9.4), () => click(lapFrame, '.mlink[data-link="actors"]')],
    [ap(9.5), () => relabel(lapFrame)],
    [ap(10.2), () => click(lapFrame, '[data-cameo-open]')],
    [ap(12.3), () => escape(lapFrame)],
    [ap(13.3), () => click(phnFrame, '.mlink[data-link="soi-block"]')],
    [ap(13.4), () => relabel(phnFrame)],
    [ap(14.1), () => click(phnFrame, '[data-cameo-open]')],
    [ap(15.5), () => escape(phnFrame)],
    [ap(16.0), () => drawer(true)],
    [ap(17.0), () => click(toolFrame, '#run')],
    /* the tool is opened at stage C: Configured has no activity diagram yet, so each signal is sent by hand */
    [ap(18.2), () => toolSignal('Start SOI')],
    [ap(19.3), () => toolSignal('FlightPlan')],
    [ap(20.4), () => toolSignal('Ready for mission')],
    [ap(21.5), () => toolSignal('Start Sheep Guard Mission')]
  ];
  let liveDone = 0;
  function liveReset() {
    escape(lapFrame);
    escape(phnFrame);
    drawer(false);
    click(toolFrame, '#stop');
    hash(lapFrame, 'welcome');
  }
  let liveOn = false;
  at((t) => {
    if (!liveOn) return;
    if (liveDone > 0 && t < LIVE[liveDone - 1][0] - 0.05) { liveReset(); liveDone = 0; }
    while (liveDone < LIVE.length && t >= LIVE[liveDone][0]) {
      let ok;
      try { ok = LIVE[liveDone][1](); } catch (err) { console.warn('promo: live step', liveDone, err); }
      if (ok === false && t < LIVE[liveDone][0] + 2.5) break;
      liveDone++;
    }
    /* a sheet opened by a click is relabelled as soon as it is drawn */
    if (t > ap(9) && t < ap(15.6)) { relabel(lapFrame); relabel(phnFrame); }
  });

  /* the cursor: it goes to elements of the three pages, found in their DOM */
  const cursor = put(el('div', 'cursor', '<span class="ring"></span><svg viewBox="0 0 24 24"><path d="M4 2.5l15.5 9-6.8 1.6 3.9 7-2.6 1.4-3.9-7L4 19z" fill="#fff" stroke="#15221a" stroke-width="1.6" stroke-linejoin="round"/></svg>'), 0, 0);
  const ring = $('.ring', cursor);
  /* [time it arrives, page, selector, fallback] */
  const PATH = [
    [ap(8.9), null, null, [LAP.x + 820, LAP.y + 700]],
    [ap(9.35), lapFrame, '.mlink[data-link="actors"]', [LAP.x + 560, LAP.y + 450]],
    [ap(10.15), lapFrame, '[data-cameo-open]', [LAP.x + 650, LAP.y + 500]],
    [ap(13.25), phnFrame, '.mlink[data-link="soi-block"]', [PHN.x + 150, PHN.y + 380]],
    [ap(14.05), phnFrame, '[data-cameo-open]', [PHN.x + 150, PHN.y + 600]],
    [ap(15.95), lapFrame, '#sim-btn', [LAP.x + 860, LAP.y + 20]],
    [ap(16.95), toolFrame, '#run', [TL.x + 420, TL.y + 60]],
    [ap(18.15), toolFrame, '#triggers [data-signal="Start SOI"]', [TL.x + 140, TL.y + 700]],
    [ap(19.25), toolFrame, '#triggers [data-signal="FlightPlan"]', [TL.x + 140, TL.y + 700]],
    [ap(20.35), toolFrame, '#triggers [data-signal="Ready for mission"]', [TL.x + 140, TL.y + 700]],
    [ap(21.45), toolFrame, '#triggers [data-signal="Start Sheep Guard Mission"]', [TL.x + 140, TL.y + 700]]
  ];
  const CLICKS = PATH.slice(1).map((p) => p[0] + 0.05);
  const memo = PATH.map((p) => p[3]);
  const toast = put(el('div', 'toast', `<span class="ok">✓</span><div>${S.toast[0]}<small></small></div>`), TL.x + 290, TL.y + 170);
  const toastName = $('small', toast);
  at((t) => {
    /* where each stop is now (kept from the last frame it was found) */
    PATH.forEach(([, f, sel], i) => { if (f) { const p = worldOf(f, sel); if (p) memo[i] = p; } });
    let p = memo[0];
    for (let i = 1; i < PATH.length; i++) {
      const a = PATH[i][0];
      const qq = eio(prog(t, a - 0.6, a));
      if (t > a - 0.6) p = [lerp(memo[i - 1][0], memo[i][0], qq), lerp(memo[i - 1][1], memo[i][1], qq)];
    }
    show(cursor, env(t, ap(8.6), ap(22.2), 0.3, 0.4));
    set(cursor, 'transform', `translate(${p[0].toFixed(1)}px, ${p[1].toFixed(1)}px)`);
    let r = 0;
    CLICKS.forEach((c) => { if (t >= c && t < c + 0.55) r = (t - c) / 0.55; });
    show(ring, r ? 1 - r : 0);
    set(ring, 'transform', `scale(${(0.4 + r * 1.3).toFixed(3)})`);
    /* what the tool just showed */
    const t1 = env(t, ap(10.9), ap(12.3), 0.3, 0.3);
    const t2 = env(t, ap(14.8), ap(15.6), 0.3, 0.3);
    show(toast, Math.max(t1, t2));
    const nm = t2 > 0 ? 'SOI - Pasture Sentinel' : 'Actors';
    if (toastName.textContent !== nm) toastName.textContent = nm;
    const a = t2 > 0 ? ap(14.8) : ap(10.9);
    set(toast, 'transform', `translateY(${((1 - eback(prog(t, a, a + 0.4))) * 40).toFixed(1)}px)`);
  });

  /* ═════════════════════════ 3 · operational ═════════════════════════ */
  const UC = card('uc', 2200 + WX, 220, 1100);
  const SD = card('sd1', 3500 + WX, 200, 900);
  const RD = card('sd1', 3560 + WX, 250, 900);
  const IBD = card('op-context', 4700 + WX, 140, 1560, 'IF');
  RD.n.style.zIndex = 0;
  SD.n.style.zIndex = 1;
  /* the rainy day: same scenario until the check fails */
  (function rainy() {
    const msgs = RD.svg.querySelectorAll('.ed.msg');
    const six = msgs[5].querySelector('.ed-lbl');
    six.querySelectorAll('tspan').forEach((s, i) => { s.textContent = S.rdMsg[i] || ''; });
    six.style.fill = '#b3261e';
    msgs[5].querySelector('.ed-line').style.stroke = '#b3261e';
    msgs[6].style.display = 'none';
  })();
  const tagSun = put(el('div', 'tag sun', S.sunny), SD.x + SD.w - 24, SD.y - 24);
  const tagRain = put(el('div', 'tag rain', S.rainy), RD.x + RD.w + 330, RD.y + 60);

  const ucActors = [...UC.svg.querySelectorAll('.actor')];
  const sdLines = [...SD.svg.querySelectorAll('.ll')];
  const sdMsgs = [...SD.svg.querySelectorAll('.ed.msg')].map((g) => {
    const line = g.querySelector('.ed-line');
    const len = line.getTotalLength();
    line.style.strokeDasharray = len + ' ' + len;
    return { g, line, len, rest: [...g.querySelectorAll('.ah-fill, .ed-lbl')] };
  });
  const fOp = flyer(ACTOR_SVG + '<span>Mission Operator</span>');
  const fSoi = flyer('<span>SOI - Pasture Sentinel</span>');
  const fOp2 = flyer(ACTOR_SVG + '<span>Mission Operator</span>');
  const fGs2 = flyer('<span>Ground station</span>');
  const fSoi2 = flyer('<span>SOI - Pasture Sentinel</span>');
  const fFp = flyer('<span>→ FlightPlan</span>', 'msg');
  const ibdIcons = [['UAV operator', 'block'], ['Ground Station', 'block'], ['SOI - Pasture Sentinel', 'block']].map(([n, ty]) => byEl(IBD.svg, n, ty));
  const ibdBorn = [...IBD.svg.querySelectorAll('.born')];
  const ibdBornLines = ibdBorn.map((g) => [...g.querySelectorAll('.ed-line')].map((l) => { const len = l.getTotalLength(); l.style.strokeDasharray = len + ' ' + len; return { l, len }; })).flat();

  at((t) => {
    ucActors.forEach((a) => tog(a, 'hl', t > op(1.05) && t < op(2.3)));
    /* actors fly to the lifelines */
    flight(fOp, t, op(1.9), op(2.7), UC.p(150, 168), SD.p(140, 72), { lift: -40, hold: 0.05 });
    flight(fSoi, t, op(2.0), op(2.8), UC.p(400, 72), SD.p(640, 72), { lift: -70, hold: 0.05 });
    const llIn = [prog(t, op(2.7), op(2.9)), prog(t, op(2.55), op(2.95)), prog(t, op(2.8), op(3.0))];
    sdLines.forEach((g, i) => show(g, llIn[i]));
    sdMsgs.forEach((m, i) => {
      const a = op(3.0 + i * 0.22);
      const p = eio(prog(t, a, a + 0.26 * K.op));
      set(m.line, 'stroke-dashoffset', (m.len * (1 - p)).toFixed(1));
      show(m.g, p > 0 ? 1 : 0);
      m.rest.forEach((r) => show(r, prog(t, a + 0.18 * K.op, a + 0.3 * K.op)));
    });
    /* the rainy day slides out from under the sunny one */
    const rp = eio(prog(t, op(4.45), op(4.95)));
    /* the scenarios stay out of the outro overview: they would cover the context diagram */
    const sdO = env(t, op(1.4), op(6.0), 0.4, 0.4);
    show(RD.n, rp * sdO);
    set(RD.n, 'transform', `translate(${(rp * 400).toFixed(1)}px, ${(rp * 70).toFixed(1)}px) rotate(${(rp * 2.5).toFixed(2)}deg)`);
    const sp = prog(t, op(4.1), op(4.4));
    show(tagSun, Math.min(sp * 2, 1) * sdO);
    set(tagSun, 'transform', `translate(-100%, -50%) scale(${(0.5 + 0.5 * eback(sp)).toFixed(3)})`);
    const rpp = prog(t, op(4.8), op(5.1));
    show(tagRain, Math.min(rpp * 2, 1) * sdO);
    set(tagRain, 'transform', `translate(-50%, -50%) scale(${(0.5 + 0.5 * eback(rpp)).toFixed(3)})`);
    /* the scenario feeds the context */
    flight(fOp2, t, op(5.0), op(5.85), SD.p(140, 72), IBD.p(150, 760), { lift: -100 });
    flight(fGs2, t, op(5.05), op(5.9), SD.p(400, 72), IBD.p(155, 370), { lift: -120 });
    flight(fSoi2, t, op(5.1), op(5.95), SD.p(640, 72), IBD.p(810, 500), { lift: -140 });
    flight(fFp, t, op(5.2), op(6.0), SD.p(270, 222), IBD.p(418, 423), { lift: -180 });
    ibdIcons.forEach((g, i) => tog(g, 'hl', t > op(5.85 + i * 0.05) && t < op(6.9)));
    const bp = prog(t, op(5.95), op(6.45));
    ibdBorn.forEach((g) => show(g, Math.min(bp * 3, 1)));
    ibdBornLines.forEach(({ l, len }) => set(l, 'stroke-dashoffset', (len * (1 - eio(bp))).toFixed(1)));
    ibdBorn.forEach((g) => tog(g, 'glow', t > op(5.95) && t < fn(0.4)));
  });

  /* ═════════════════════════ 4 · functional: Part 2, the predator ═════════════════════════
     The drone patrols, the bear enters the tracking perimeter, the drone tracks it, engages it, the bear
     flees: mission success. Only the states are shown: the transitions between the predator states, their
     signals and the activity diagrams are what the marked seminar (Part 2, Questions 4 to 6) asks for, so the
     film names none of them and shows the activity as a blurred card to model. */
  const STM = card('stm', 6600 + WX, 150, 1000);
  const simCard = put(el('div', 'simcard', `<div class="simcard-head"><small>Simulation</small>Pasture Sentinel<span class="live">LIVE</span></div><div class="sim-host"></div><div class="success">${S.success}</div>`), 7700 + WX, 170, 720, 720);
  const simScene = window.SimScene.create($('.sim-host', simCard));
  const success = $('.success', simCard);
  /* the activity of the detection, to model: in the empty top right corner of the state machine */
  const [adx, ady] = STM.p(600, 30);
  const adCard = put(el('div', 'ghost-ad', `<span class="ga-tab"><b>act</b> [Activity] Monitoring Predator</span>
    <div class="ga-boxes"><i style="left:40%;top:6%;width:22%;height:16%"></i><i style="left:40%;top:34%;width:22%;height:16%"></i><i class="dec" style="left:47%;top:60%"></i><i style="left:10%;top:72%;width:26%;height:16%"></i><i style="left:64%;top:72%;width:26%;height:16%"></i></div>
    <span class="ga-q">?</span><span class="ga-note">${S.adTodo}</span>`), adx, ady, 440, 250);

  /* the run: state reached, step of the drone; tr = the transition that lights, sig = the signal shown */
  const RUN = [
    { t: -1, st: 's-patrol', step: STEPS.Patrolling },
    { t: fn(1.6), tr: 't-predator', sig: 'Predator Detected', st: 's-track', step: STEPS.PredatorTracking, at: [763, 470] },
    { t: fn(3.8), tr: 't-pc1', st: 's-counter', step: STEPS.PredatorCounteraction },
    { t: fn(5.3), tr: 't-pc2', st: 's-track', step: STEPS.PredatorTracking },
    { t: fn(6.1), st: 's-patrol', step: STEPS.Patrolling }
  ];
  RUN.forEach((r) => { if (r.sig) r.n = spark(r.sig); });
  const stStates = [...STM.svg.querySelectorAll('[data-sim]')];
  const stEdges = [...STM.svg.querySelectorAll('[data-tr]')];
  const SIMST = M.SIM.states;
  function lit(id) {
    const leaf = new Set([id].concat(SIMST[id].also || []));
    const active = new Set();
    leaf.forEach((s) => { for (let p = SIMST[s] && SIMST[s].parent; p; p = SIMST[p] && SIMST[p].parent) active.add(p); });
    return { leaf, active };
  }

  at((t) => {
    let cur = RUN[0];
    RUN.forEach((r) => { if (t >= r.t) cur = r; });
    const { leaf, active } = lit(cur.st);
    stStates.forEach((g) => {
      const id = g.dataset.sim;
      tog(g, 'leaf', leaf.has(id) && t > FN0 - 0.6);
      tog(g, 'active', active.has(id) && t > FN0 - 0.6);
    });
    stEdges.forEach((g) => {
      const r = RUN.find((x) => x.tr && x.tr === g.dataset.tr && t >= x.t - 0.15 && t < x.t + 1.0);
      tog(g, 'fire', !!r);
    });
    RUN.forEach((r) => { if (r.n) sparkAt(r.n, t, r.t, STM.p(r.at[0], r.at[1])); });
    /* the drone of the pasture is at the step the state machine is in */
    simScene.setVisible(t > FN0 - 1.5 && t < END + 1);
    simScene.setStep(t >= FN0 - 0.6 ? cur.step : STEPS.Off);
    const ga = env(t, fn(1.9), fn(3.7), 0.4, 0.4);
    show(adCard, ga);
    set(adCard, 'transform', `scale(${(0.85 + 0.15 * eback(prog(t, fn(1.9), fn(1.9) + 0.45))).toFixed(3)})`);
    const sp = prog(t, fn(6.3), fn(6.3) + 0.45);
    show(success, Math.min(sp * 2, 1) * (t < LG0 + 1.2 ? 1 : 0));
    set(success, 'transform', `translate(-50%, -50%) rotate(-8deg) scale(${(1.6 - 0.6 * eback(sp)).toFixed(3)})`);
  });

  /* ═════════════════════════ 5 · logical: a teaser ═════════════════════════ */
  const ghost = put(el('div', 'ghost', `<div class="ghost-boxes">${[[40, 40, 250, 120], [420, 30, 220, 150], [120, 260, 300, 130], [470, 300, 190, 120]].map(([x, y, w, h]) => `<i style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></i>`).join('')}</div><b>${S.soon}</b>`), 8650 + WX, 230, 800, 620);

  /* ═════════════════════════ 6 · physical ═════════════════════════ */
  const MX = card('alloc', 9700 + WX, 210, 1000);
  const IBD2 = card('uav-data', 10820 + WX, 210, 1060);
  const marks = [...MX.svg.querySelectorAll('.mx-mark')].slice(-5);
  marks.forEach((m) => { m.style.transformBox = 'fill-box'; m.style.transformOrigin = 'center'; });
  const rowY = (j) => 70 + 74 + 34 * j + 17;
  const ALLOC = [
    ['Load Flight Plan', 7, [540, 172], 'Mission Computer'],
    ['Receive FlightPlan', 8, [195, 506], 'WiFi System'],
    ['Read FlightPlan', 9, [128, 62], 'Navigation System'],
    ['Check FlightPlan', 10, [270, 62], 'Navigation System'],
    ['Send Mission Ready', 11, [540, 208], 'Mission Computer']
  ].map(([name, j, to, part], i) => ({ n: flyer(`<span>${name}</span>`, 'fn'), j, to, part: byEl(IBD2.svg, part, 'block'), i }));
  const ibd2Flows = [...IBD2.svg.querySelectorAll('[data-sig="FlightPlan"], [data-sig="Ready for mission"]')];
  at((t) => {
    marks.forEach((m, i) => {
      const a = ph(0.9 + i * 0.2);
      const p = prog(t, a, a + 0.35);
      show(m, Math.min(p * 3, 1));
      set(m, 'transform', `scale(${(0.2 + 0.8 * eback(p)).toFixed(3)})`);
    });
    ALLOC.forEach(({ n, j, to, i }) => {
      const a = ph(2.3 + i * 0.1);
      flight(n, t, a, a + 0.8 * K.ph, MX.p(150, rowY(j)), IBD2.p(to[0], to[1]), { lift: -160 - i * 20, hold: 99, s0: 1, s1: 0.78 });
    });
    ALLOC.forEach(({ part, i }) => tog(part, 'hl', t > ph(3.05 + i * 0.1) && t < ph(4.1)));
    ibd2Flows.forEach((g) => tog(g, 'glow', t > ph(3.3) && t < ou(0.6)));
  });

  /* Each place of the world shows up as the camera comes near (the next one never peeks in at the edge),
     and all of them come back for the overview of the outro. */
  function placeO(t, a, b) { return Math.max(env(t, a, b, 0.4, 0.4), eio(prog(t, ou(0.1), ou(0.9)))); }
  const SHOWN = [
    [[lap, lapBase], -1, OP0 + 1.2],
    [[UC.n], OP0 - 0.6, op(3.0)],
    [[SD.n], op(1.4), op(6.0)],
    [[IBD.n], op(5.0), fn(1.0)],
    [[STM.n, simCard], FN0 - 0.6, LG0 + 0.8],
    [[ghost], fn(6.8), PH0 + 0.8],
    [[MX.n, IBD2.n], PH0 - 0.6, END + 1]
  ];
  at((t) => {
    SHOWN.forEach(([ns, a, b]) => { const o = placeO(t, a, b); ns.forEach((n) => show(n, o)); });
  });

  /* ═════════════════════════ the layer bands, the tracker, the captions ═════════════════════════ */
  const BANDS = [['op', OP0, op(1.05), 1], ['fn', FN0, fn(1.05), 2], ['lg', LG0, LG0 + 0.95 * K.lg, 3], ['ph', PH0, ph(0.95), 4]].map(([k, a, b, num]) => {
    const n = el('div', 'band', `<div class="band-in"><span class="band-tab">layer  [${k === 'lg' ? 'Logical' : k === 'op' ? 'Operational' : k === 'fn' ? 'Functional' : 'Physical'}]</span><span class="band-num">0${num}</span><span class="band-title">${S.bands[k][0]}</span><span class="band-q">${S.bands[k][1]}</span></div>`, screen);
    n.style.setProperty('--pc', PHASE[k]);
    return { n, a, b };
  });
  at((t) => {
    BANDS.forEach(({ n, a, b }) => {
      const pin = eio(prog(t, a, a + 0.4));
      const pout = eio(prog(t, b - 0.35, b));
      const vis = t > a && t < b;
      show(n, vis ? 1 : 0);
      if (!vis) return;
      /* opens from the centre to both sides, then closes on its middle line: the text is never cut on one side */
      const h = (1 - pin) * 50;
      const v = pout * 50;
      set(n, 'clip-path', `inset(${v.toFixed(2)}% ${h.toFixed(2)}% ${v.toFixed(2)}% ${h.toFixed(2)}%)`);
    });
  });

  const tracker = el('div', 'tracker', ['op', 'fn', 'lg', 'ph'].map((k) => `<span data-k="${k}" style="--pc:${PHASE[k]}" class="${k === 'lg' ? 'soon' : ''}">${S.short[k]}</span>`).join(''), screen);
  const trackSpans = [...tracker.children];
  const LAYER_AT = [['op', OP0], ['fn', FN0], ['lg', LG0], ['ph', PH0]];
  at((t) => {
    show(tracker, env(t, op(0.6), ou(0.8), 0.4, 0.5));
    let cur = -1;
    LAYER_AT.forEach(([, a], i) => { if (t >= a) cur = i; });
    trackSpans.forEach((s, i) => { tog(s, 'on', i === cur); tog(s, 'done', i < cur); });
  });

  const CAPS = [
    ['op1', 'op', op(1.0), op(2.3)], ['op2', 'op', op(2.4), op(3.9)], ['op3', 'op', op(4.0), op(5.1)], ['op4', 'op', op(5.3), FN0 - 0.05],
    ['fn1', 'fn', fn(0.95), fn(1.85)], ['fn2', 'fn', fn(1.9), fn(3.75)], ['fn3', 'fn', fn(3.8), LG0 - 0.05],
    ['ph1', 'ph', ph(0.95), ph(2.3)], ['ph2', 'ph', ph(2.4), ou(0.2)]
  ].map(([k, phs, a, b]) => {
    const n = el('div', 'cap', S.caps[k], screen);
    n.style.setProperty('--pc', PHASE[phs]);
    return { n, a, b };
  });
  at((t) => {
    CAPS.forEach(({ n, a, b }) => {
      show(n, env(t, a, b, 0.3, 0.25));
      set(n, 'transform', `translateX(-50%) translateY(${((1 - eout(prog(t, a, a + 0.35))) * 40).toFixed(1)}px)`);
    });
  });

  /* ═════════════════════════ 7 · outro: the whole route ═════════════════════════ */
  const WP = [[DESK.x, 'route'], [4300 + WX, 'op'], [7510 + WX, 'fn'], [9050 + WX, 'lg'], [10790 + WX, 'ph']];
  const RY = 1180;
  const route = put(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), 0, 0, 14000, 1500);
  route.classList.add('route-svg');
  route.setAttribute('viewBox', '0 0 14000 1500');
  const HEX = { route: '#ff8fcb', op: '#ffa45c', fn: '#84b5ff', lg: '#c9a7ff', ph: '#f2c12e' };
  route.innerHTML = WP.slice(1).map(([x, k], i) => `<path d="M${WP[i][0]} ${RY}H${x}" stroke="${HEX[k]}"/>`).join('') +
    WP.map(([x, k], i) => `<g><circle cx="${x}" cy="${RY}" r="50" fill="${HEX[k]}"/><text x="${x}" y="${RY + 200}">${S.waypoints[i]}</text></g>`).join('');
  const routePaths = [...route.querySelectorAll('path')];
  const routeDots = [...route.querySelectorAll('g')];
  const veil = el('div', 'veil', '', screen);
  const outTop = el('div', 'outro-top', `<b>${CFG.appName || 'MBSE Shepherd'}</b><span>${S.outro}</span>`, screen);
  const outBottom = el('div', 'outro-bottom', `<b>${S.credit}</b>`, screen);
  at((t) => {
    routePaths.forEach((p, i) => show(p, prog(t, ou(0.3 + i * 0.25), ou(0.55 + i * 0.25))));
    routeDots.forEach((g, i) => show(g, prog(t, ou(0.2 + i * 0.25), ou(0.45 + i * 0.25))));
    show(veil, prog(t, ou(0.9), ou(1.6)));
    const a = prog(t, ou(1.2), ou(1.7));
    show(outTop, a);
    set(outTop, 'transform', `translateY(${((1 - eout(a)) * 50).toFixed(1)}px)`);
    show(outBottom, prog(t, ou(1.7), ou(2.2)));
  });

  /* ═════════════════════════ the little sheep ═════════════════════════
     Now and then a sheep wanders in, in screen space: it walks across, peeks from the bottom edge, or hops. */
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
  /* kind: walk (x0 → x1 along y), peek (rises at x from the bottom edge), hop (jumps at x, y) */
  function lamb(kind, a, b, o) {
    const n = el('div', 'lamb' + ((o.x1 !== undefined && o.x1 < o.x0) ? ' flip' : ''), LAMB + `<span class="baa">${S.baa}</span>`, screen);
    if (o.z) n.style.zIndex = o.z;
    const baa = $('.baa', n);
    const sc = o.s || 1;
    at((t) => {
      const vis = env(t, a, b, 0.3, 0.3);
      show(n, vis);
      if (!vis) return;
      let x = o.x;
      let y = o.y || 1060;
      let lift = 0;
      if (kind === 'walk') {
        x = lerp(o.x0, o.x1, prog(t, a, b));
        lift = Math.abs(Math.sin((t - a) * 9)) * 9;
      } else if (kind === 'peek') {
        const up = eback(prog(t, a, a + 0.5)) - eio(prog(t, b - 0.4, b));
        y = 1080 + 130 * sc - up * 125 * sc;
      } else if (kind === 'hop') {
        lift = Math.abs(Math.sin((t - a) * 6)) * 46;
      }
      const flip = n.classList.contains('flip') ? -1 : 1;
      const tilt = kind === 'walk' ? Math.sin((t - a) * 9) * 3 : 0;
      set(n, 'transform', `translate(${(x - 65).toFixed(1)}px, ${(y - 111 - lift).toFixed(1)}px) scale(${(flip * sc).toFixed(3)}, ${sc}) rotate(${tilt.toFixed(2)}deg)`);
      const mid = (a + b) / 2;
      show(baa, kind === 'walk' ? env(t, mid - 0.7, mid + 0.7, 0.2, 0.2) : env(t, a + 0.5, b - 0.3, 0.2, 0.2));
      set(baa, 'transform', `scaleX(${flip})`);
    });
  }
  lamb('peek', hk(2.6), A0 + 0.3, { x: 1650, z: 55 });
  lamb('walk', ap(3.2), ap(7.6), { x0: -120, x1: 2040, y: 1065, s: 0.75 });
  lamb('peek', op(1.1), op(2.6), { x: 150 });
  lamb('hop', fn(6.4), LG0 - 0.1, { x: 1560, y: 1040, s: 0.8 });
  lamb('walk', ph(2.6), ph(5.8), { x0: 2040, x1: -120, y: 1065, s: 0.7 });
  [0, 1, 2].forEach((i) => lamb('walk', ou(1.4) + i * 0.6, END + 2, { x0: -150 - i * 10, x1: 2200 - i * 170, y: 1062 - i * 4, s: 0.55 + i * 0.07 }));

  /* ═════════════════════════ the player ═════════════════════════ */
  /* the stage is placed in pixels (no percentages): it stays centred whatever the window, zoom or full screen */
  const fit = () => {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const s = Math.min(vw / 1920, vh / 1080);
    stage.style.left = ((vw - 1920 * s) / 2).toFixed(1) + 'px';
    stage.style.top = ((vh - 1080 * s) / 2).toFixed(1) + 'px';
    stage.style.transform = `scale(${s})`;
  };
  addEventListener('resize', fit);
  document.addEventListener('fullscreenchange', fit);
  fit();

  let T = Math.max(0, Math.min(END, parseFloat(Q.get('t')) || 0));
  let playing = false;
  let last = 0;
  const hud = $('#hud');
  const hudPlay = $('#hud-play');
  const hudTime = $('#hud-time');
  const hudSeek = $('#hud-seek');
  /* A track that throws is reported (once) and the others still run: one broken piece must not freeze the film and its controls. */
  const broken = new Set();
  function render() {
    tracks.forEach((fn, i) => {
      try { fn(T); } catch (err) {
        if (!broken.has(i)) { broken.add(i); console.error('promo: track ' + i + ' failed', err); report(err); }
      }
    });
    /* only on change: rewriting a button's text under the pointer makes Chrome drop the click */
    const time = T.toFixed(1) + ' / ' + END.toFixed(1) + ' s';
    if (hudTime.textContent !== time) hudTime.textContent = time;
    if (document.activeElement !== hudSeek) hudSeek.value = Math.round((T / END) * 1000);
    const label = playing ? 'Pause' : 'Play';
    if (hudPlay.textContent !== label) hudPlay.textContent = label;
  }
  function loop(now) {
    requestAnimationFrame(loop);
    if (playing) {
      T += Math.min(0.1, (now - last) / 1000) * SPEED;
      if (T >= END) { T = END; playing = false; onEnd(); }
    }
    last = now;
    render();
  }
  function play() { if (T >= END) T = 0; playing = true; }
  function pause() { playing = false; }
  function seek(v) { T = Math.max(0, Math.min(END, v)); }
  /* a control keeps no focus: Space would otherwise press it a second time */
  hudPlay.addEventListener('click', () => { hudPlay.blur(); playing ? pause() : play(); });
  hudSeek.addEventListener('input', () => { seek((hudSeek.value / 1000) * END); });
  hudSeek.addEventListener('change', () => hudSeek.blur());
  function onKey(e) {
    if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.key === 'ArrowRight') seek(T + (e.shiftKey ? 5 : 1));
    else if (e.key === 'ArrowLeft') seek(T - (e.shiftKey ? 5 : 1));
    else if (e.key === 'Home') { seek(0); play(); }
    else if (e.key === 'h' || e.key === 'H') hud.classList.toggle('off');
    else if (e.key === 'r' || e.key === 'R') record();
    else return;
    e.preventDefault();
    e.stopPropagation();
  }
  addEventListener('keydown', onKey);
  /* the guides in the devices may take the focus: their keys come here first (and do not move the guide) */
  [lapFrame, phnFrame, toolFrame].forEach((f) => f.addEventListener('load', () => { try { f.contentWindow.addEventListener('keydown', onKey, true); } catch (e) { /* another origin */ } }));
  /* the controls hide themselves while the film plays */
  let idle = 0;
  addEventListener('mousemove', () => { hud.classList.remove('off'); clearTimeout(idle); idle = setTimeout(() => { if (playing) hud.classList.add('off'); }, 1800); });
  if (Q.get('hud') === '0') hud.classList.add('off');

  /* Record the stage itself (Chrome: this tab, cropped to the stage) into a .webm file. For a clean
     1920 x 1080 file, run it full screen (F11) on a 1080p screen, browser zoom 100 %. */
  let rec = null;
  async function record() {
    if (rec) return;
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 60 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
      const [track] = stream.getVideoTracks();
      /* Region Capture: crop this tab to the stage. Element Capture (restrictTo) is not used: it sends no frame
         at all when Chrome finds the element not eligible, and the file came out empty. Another tab, a window
         or the whole screen cannot be cropped: it is then recorded as it is. */
      try { if (window.CropTarget && track.cropTo) await track.cropTo(await window.CropTarget.fromElement(stage)); } catch (e) { console.warn('promo: not cropped', e); }
      /* MP4 when this Chrome can write it (ready for LinkedIn), else WebM */
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
        a.download = `mbse-shepherd-promo-${LANG}.${ext}`;
        a.click();
      };
      /* the capture also stops when the person ends the sharing */
      track.addEventListener('ended', () => { if (mr.state !== 'inactive') mr.stop(); });
      hud.classList.add('off');
      seek(0);
      pause();
      await new Promise((r) => setTimeout(r, 700));
      rec = mr;
      mr.start(500);
      play();
      setTimeout(() => { if (rec === mr && !bytes) report('Recording: no image after 3 s, the file will be empty.'); }, 3000);
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

  /* Open the tool first: it takes a pairing code on the relay of this server (scripts/dev-server.mjs). Then
     open both guides with that code, so that they talk to it. Without a relay the guides open unpaired and
     the film still plays, only the tool does not answer them. */
  const RELAY = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/relay`;
  const loaded = (f) => new Promise((r) => f.addEventListener('load', r, { once: true }));
  async function openDesk() {
    toolFrame.src = '../tool/?relay=here&diagram=op-context&stage=C';
    await loaded(toolFrame);
    /* the tree and the simulation console must be on screen, whatever layout the tool remembers */
    ['left', 'console'].forEach((k) => { if (docOf(toolFrame).querySelector(`#pane-${k}.off`)) click(toolFrame, `[data-fold="${k}"]`); });
    let code = '';
    for (let i = 0; i < 40 && !code; i++) {
      await new Promise((r) => setTimeout(r, 150));
      const d = docOf(toolFrame);
      const pill = d && d.getElementById('link');
      const c = ((d && d.getElementById('lp-code')) || {}).textContent || '';
      if (pill && pill.dataset.status === 'online' && /^[A-Z]{6}$/.test(c.trim())) code = c.trim();
    }
    if (!code) console.warn('promo: the tool got no pairing code; the guides open unpaired');
    const qs = code ? `?code=${code}&relay=${encodeURIComponent(RELAY)}` : '';
    lapFrame.src = `../part1/index.html${qs}#welcome`;
    phnFrame.src = `../part1/index.html${qs}#a-lifelines`;
    await Promise.all([loaded(lapFrame), loaded(phnFrame), document.fonts.ready]);
    liveOn = true;
  }
  const ready = openDesk();
  requestAnimationFrame((now) => { last = now; loop(now); });
  ready.then(() => setTimeout(() => { if (Q.get('autoplay') !== '0') play(); }, 1200));
  window.Promo = { seek, play, pause, render, get t() { return T; }, END };
})();
