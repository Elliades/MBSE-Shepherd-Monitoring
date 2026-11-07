/* The article "Adieu Word… Enfin un TP MBSE interactif !" (article/tp/index.html): its figures.

   - film    : the promo film (promo/?lang=fr), loaded on demand;
   - phones  : the guide of Part 1 in a phone, on one scene ([data-phone]); the gallery switches its scene;
   - desk    : the demo tool (tool/, which plays Cameo) and the guide in a phone, paired through the relay of the
               site, as in promo/promo.js; "Montre-moi" clicks in them like the film does;
   - build   : the mission state machine built in the five steps of the text, until an activity sends the signal
               that moves it;
   - mission : the pasture of the guide (js/sim-scene.js) driven by three versions of the mission state machine,
               two of them with a student's mistake;
   - toc, theme.

   The guides and the tool keep their state in the browser. As promo/next.js does, this page saves the keys of the
   site before any frame opens and puts them back when it is left: the guides open untracked, and leave no trace
   in the progress or the pairing of whoever reads. */
(function () {
  'use strict';

  const BASE = '../../';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ───────── the frames leave no trace ───────── */
  const KEEP = ['mbse-shepherd:', 'sysml-tool:'];
  const saved = {};
  const ours = (k) => k && KEEP.some((p) => k.startsWith(p));
  try {
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ours(k)) saved[k] = localStorage.getItem(k); }
    localStorage.removeItem('mbse-shepherd:bridge-code');
    localStorage.setItem('mbse-shepherd:track:off', '1');
  } catch (e) { /* no storage: nothing to keep */ }
  function restore() {
    try {
      const now = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (ours(k)) now.push(k); }
      now.forEach((k) => { if (!(k in saved)) localStorage.removeItem(k); });
      Object.keys(saved).forEach((k) => localStorage.setItem(k, saved[k]));
    } catch (e) { /* nothing to put back */ }
  }
  addEventListener('pagehide', restore);
  /* each tool takes a pairing code of its own, and a guide opened without ?code= stays unpaired */
  const forget = (k) => { try { localStorage.removeItem(k); } catch (e) { /* no storage */ } };

  /* ───────── reaching into a frame (same origin) ───────── */
  const docOf = (f) => { try { const d = f.contentDocument; return d && d.documentElement ? d : null; } catch (e) { return null; } };
  function find(f, sel) {
    const d = docOf(f);
    if (!d) return null;
    return $$(sel, d).filter((n) => n.getBoundingClientRect().width > 0).pop() || null;
  }
  async function waitFor(f, sel, ms) {
    const end = Date.now() + (ms || 4000);
    while (Date.now() < end) { const n = find(f, sel); if (n) return n; await sleep(120); }
    return null;
  }
  function escape(f) { const d = docOf(f); if (d) d.dispatchEvent(new f.contentWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
  function hash(f, id) { try { if (f.contentWindow.location.hash !== '#' + id) f.contentWindow.location.hash = id; } catch (e) { /* not reachable */ } }
  const loaded = (f) => new Promise((r) => f.addEventListener('load', r, { once: true }));
  /* embed: what the guide leaves out when it is quoted here (js/engine.js): the Back / Next dock (nodock), the top bar too (scene),
     or everything but one interactive widget (widget, named by w) */
  const guideUrl = (scene, qs, embed, w) => `${BASE}part1/index.html?author=0&embed=${embed || 'scene'}${w ? '&w=' + w : ''}${qs || ''}#${scene}`;

  /* A frame drawn at the size of the device it plays (iw × ih) and scaled down to fit its box. */
  function scaled(box, iw, ih, title) {
    const f = document.createElement('iframe');
    f.title = title;
    box.appendChild(f);
    const fit = () => {
      const w = box.clientWidth;
      if (!w) return;
      const k = w / iw;
      Object.assign(f.style, { width: iw + 'px', height: ih + 'px', transform: `scale(${k})` });
      box.style.height = Math.round(ih * k) + 'px';
    };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(box);
    else addEventListener('resize', fit);
    return f;
  }
  const PHONE = { iw: 390, ih: 800 };
  function phone(host) {
    host.innerHTML = '<div class="phone"><span class="notch"></span><div class="phone-screen"></div></div>';
    return scaled($('.phone-screen', host), PHONE.iw, PHONE.ih, 'Le guide du TP, sur un téléphone');
  }
  function whenNear(node, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: '400px 0px' });
    io.observe(node);
  }

  /* ───────── figure 1: the film ───────── */
  function filmFigure(root) {
    const box = $('.film-box', root);
    $('[data-play]', root).addEventListener('click', () => {
      forget('sysml-tool:code');
      box.innerHTML = '';
      const f = document.createElement('iframe');
      f.title = document.documentElement.lang === 'fr' ? 'Le film du TP' : 'The lab film';
      f.allow = 'autoplay';
      f.src = `${BASE}promo/?lang=${document.documentElement.lang === 'fr' ? 'fr' : 'en'}&hud=0`;
      box.appendChild(f);
      box.classList.add('on');
    });
  }

  /* ───────── figures 2 and 4: the guide in a phone ───────── */
  function phoneSlot(slot) {
    const f = phone(slot);
    whenNear(slot, () => { forget('mbse-shepherd:bridge-code'); f.src = guideUrl(slot.dataset.phone); });
    return f;
  }
  /* The interactive piece of a scene, alone, as wide as the page: no phone, no Next button, no title.
     The frame grows with the widget it holds. */
  function focusFrame(host, title) {
    host.innerHTML = '<div class="focus-box"><iframe scrolling="no"></iframe></div>';
    const f = $('iframe', host);
    f.title = title;
    f.style.height = '420px';
    f.addEventListener('load', () => {
      const d = docOf(f);
      const stage = d && d.getElementById('stage');
      if (!stage) return;
      const fit = () => { f.style.height = Math.max(240, Math.ceil(stage.getBoundingClientRect().height)) + 'px'; };
      if ('ResizeObserver' in f.contentWindow) new f.contentWindow.ResizeObserver(fit).observe(stage);
      fit();
    });
    return f;
  }
  function galleryFigure(root) {
    const slot = $('[data-focus]', root);
    const f = focusFrame(slot, 'Une scène du guide du TP');
    const btns = $$('[data-scene]', root);
    const current = () => btns.find((b) => b.getAttribute('aria-pressed') === 'true') || btns[0];
    const url = (b) => guideUrl(b.dataset.scene, '', 'widget', b.dataset.widget);
    whenNear(slot, () => { forget('mbse-shepherd:bridge-code'); if (!f.src) f.src = url(current()); });
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      f.src = url(b);
    }));
  }

  /* ───────── figure 3: the desk ───────── */
  function deskFigure(root) {
    const status = $('.desk-status', root);
    const say = (html, tone) => { status.innerHTML = html; status.className = 'desk-status' + (tone ? ' ' + tone : ''); };
    const shows = $$('[data-show]', root);
    let tool = null;
    let guide = null;
    let busy = false;

    /* what the tool logs for the guide is told here too: the reader sees Cameo answer */
    function listen() {
      const list = docOf(tool) && docOf(tool).getElementById('log');
      if (!list || !('MutationObserver' in window)) return;
      new MutationObserver((ms) => {
        ms.forEach((m) => m.addedNodes.forEach((li) => {
          if (!li.classList || !/lg-(guide|signal)/.test(li.className)) return;
          const t = (li.querySelector('.lg-txt') || li).textContent;
          if (/select|open/i.test(t)) say(`<b>Cameo a reçu la demande du guide.</b> ${esc(t)}`, 'ok');
          else if (/sent to the guide/i.test(t)) say(`<b>Cameo → guide :</b> ${esc(t.replace(/\s*\+\s*sent to the guide/i, ''))}`, 'ok');
        }));
      }).observe(list, { childList: true });
    }

    async function start() {
      $('.desk-cover', root).remove();
      say('Démarrage de l’outil…');
      forget('sysml-tool:code');
      tool = scaled($('.desk-screen', root), 1280, 800, 'L’outil de démonstration, qui joue Cameo');
      tool.src = `${BASE}tool/?relay=here&stage=all&diagram=op-context`;
      guide = phone($('.desk-phone', root));
      await loaded(tool);
      let code = '';
      for (let i = 0; i < 50 && !code; i++) {
        await sleep(150);
        const d = docOf(tool);
        const pill = d && d.getElementById('link');
        const c = ((d && d.getElementById('lp-code')) || {}).textContent || '';
        if (pill && pill.dataset.status === 'online' && /^[A-Z]{6}$/.test(c.trim())) code = c.trim();
      }
      const relay = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/relay`;
      guide.src = guideUrl('a-lifelines', code ? `&code=${code}&relay=${encodeURIComponent(relay)}` : '', 'nodock');
      await loaded(guide);
      listen();
      shows.forEach((b) => { b.disabled = false; });
      say(code
        ? `Appairés par le code <b class="code">${code}</b>. À vous : touchez <i>SOI - Pasture Sentinel</i> dans le téléphone.`
        : 'Le relais ne répond pas : l’outil et le guide tournent, mais sans liaison. Le film de la figure 1 montre la liaison.', code ? '' : 'ko');
    }

    async function showOpen() {
      escape(guide);
      hash(guide, 'a-lifelines');
      const chip = await waitFor(guide, '.mlink[data-link="soi-block"]');
      if (!chip) return;
      chip.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
      await sleep(700);
      chip.click();
      const open = await waitFor(guide, '[data-cameo-open]', 2500);
      await sleep(900);
      if (open) open.click();
      await sleep(2600);
      escape(guide);
    }
    async function showSim() {
      const S = guide.contentWindow.Sim;
      if (S) { S.pilot.reset(); S.open(); }
      const stop = find(tool, '#stop');
      if (stop && !stop.disabled) { stop.click(); await sleep(600); }
      await sleep(600);
      const play = find(tool, '#play');
      if (play) play.click();
      say('Cameo joue le scénario nominal : <i>Start SOI</i>, <i>FlightPlan</i>, <i>Start Sheep Guard Mission</i>… Regardez le drone.', 'ok');
    }

    $('[data-start]', root).addEventListener('click', start);
    shows.forEach((b) => b.addEventListener('click', async () => {
      if (busy) return;
      busy = true;
      shows.forEach((x) => { x.disabled = true; });
      try { await (b.dataset.show === 'open' ? showOpen() : showSim()); } finally {
        busy = false;
        shows.forEach((x) => { x.disabled = false; });
      }
    }));
  }

  /* ───────── figure 5: the mission, built in the five steps of the text ───────── */
  const BUILD_FR = [
    { tab: 'Les états', say: 'On pose d’abord les grandes étapes de la vie du drone : éteint, à configurer, configuré, prêt, puis la mission elle-même.' },
    { tab: 'Les transitions', say: 'Puis les transitions, chacune avec son signal. L’opérateur de simulation (l’ingénieur système) joue la mission à la main, en cliquant chaque transition. En la jouant, il découvre ce qui manque, l’ajoute, et valide. Le but : avec un minimum d’effort, raffiner la mission et décrire les transitions et leurs conditions.' },
    { tab: 'Les fonctions', say: 'On alloue à chaque état ce que le drone y fait : ses <i>do activities</i>. Chacune tourne tant que son état est actif.' },
    { tab: 'Le détail', say: 'Maintenant que les fonctions sont définies, on raffine d’abord les plus importantes. Dès que possible, on automatise les transitions en implémentant une logique interne : celle de <i>Load Flight Plan</i> est intégrée directement au modèle. Elle lit le plan de vol, le vérifie, et selon le résultat envoie <i>Ready for mission</i> ou <i>FlightPlan Check Failed</i>.' },
    { tab: 'La boucle', say: 'Le but : qu’à la fin, selon un scénario, la mission avance toute seule. L’opérateur de simulation clique <i>Start SOI</i> et <i>FlightPlan</i>, puis plus personne ne clique : <i>Load Flight Plan</i> s’exécute dans <i>Configured</i> et c’est elle qui envoie le signal. Il apparaît sur le diagramme d’activité, puis sur la transition de la machine d’états.' }
  ];
  const BUILD_EN = [
    { tab: 'States', say: 'First, we lay down the major lifecycle stages of the drone: off, unconfigured, configured, ready, then the mission itself.' },
    { tab: 'Transitions', say: 'Next, the transitions, each triggered by its signal. The simulation operator (the systems engineer) plays the mission by hand, clicking each transition. By playing it, they discover what is missing, add it, and validate. The goal: with minimal effort, refine the mission and define transitions and their conditions.' },
    { tab: 'Functions', say: 'We allocate to each state what the drone does while there: its <i>do activities</i>. Each runs as long as its state is active.' },
    { tab: 'Details', say: 'Now that functions are defined, we refine the most critical ones first. As early as possible, we automate transitions with internal logic: <i>Load Flight Plan</i> is embedded directly in the model. It reads the flight plan, checks it, and depending on the outcome sends <i>Ready for mission</i> or <i>FlightPlan Check Failed</i>.' },
    { tab: 'The loop', say: 'The ultimate goal: that according to a scenario, the mission advances on its own. The simulation operator clicks <i>Start SOI</i> and <i>FlightPlan</i>, and then no further clicks are needed: <i>Load Flight Plan</i> executes in <i>Configured</i> and fires the signal itself. It appears on the activity diagram, then on the state machine transition.' }
  ];
  const getBuild = () => (document.documentElement.lang === 'fr' ? BUILD_FR : BUILD_EN);
  /* step 2: every signal sent by hand (edge, signal, next state) */
  const WALK = [['soi', 'Start SOI', 'unc'], ['fp', 'FlightPlan', 'cfg'], ['rdy', 'Ready for mission', 'rdy'], ['sgm', 'Start Sheep Guard Mission', 'gsa'], ['pat', 'Start Patrolling', 'pat']];
  /* the token through Load Flight Plan: x, y, node it lights */
  const TOKEN = {
    ok: [[150, 30], [150, 66, 'read'], [150, 118, 'check'], [150, 160, 'dec'], [80, 160], [80, 217, 'ok']],
    ko: [[150, 30], [150, 66, 'read'], [150, 118, 'check'], [150, 160, 'dec'], [222, 160], [222, 217, 'ko']]
  };

  /* The beginning of the mission state machine (viewBox 460 × 330) and the activity of Load Flight Plan (300 × 330).
     Every piece carries the step it appears at (data-from). */
  function drawBuild(stm, ad) {
    const R = { st: {}, ed: {}, dos: {}, ad: {} };
    stm.innerHTML = '';
    ad.innerHTML = '';
    const mk = sel('marker', { id: 'bd-head', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, sel('defs', {}, stm));
    sel('path', { d: 'M0 0L10 5L0 10z', class: 'a-head' }, mk);
    const frame = (s, x, y, w, h, name, from) => {
      const g = sel('g', { 'data-from': from }, s);
      sel('rect', { x, y, width: w, height: h, rx: 10, class: 'st-frame' }, g);
      sel('text', { x: x + 10, y: y + 15, class: 'st-fname' }, g, name);
      return g;
    };
    const state = (key, x, y, w, h, lines, doText, cls) => {
      const g = sel('g', { class: 'st ' + (cls || ''), 'data-from': 1 }, stm);
      sel('rect', { x, y, width: w, height: h, rx: 8, class: 'st-box' }, g);
      const top = doText ? h - 20 : h;
      lines.forEach((l, i) => sel('text', { x: x + w / 2, y: y + top / 2 + 4 - (lines.length - 1) * 6 + i * 12, class: 'st-name', 'text-anchor': 'middle' }, g, l));
      if (doText) {
        const d = sel('g', { class: 'st-dos', 'data-from': 3 }, g);
        sel('line', { x1: x, x2: x + w, y1: y + top, y2: y + top, class: 'st-sep' }, d);
        sel('text', { x: x + w / 2, y: y + h - 7, class: 'st-do', 'text-anchor': 'middle' }, d, doText);
        R.dos[key] = d;
      }
      R.st[key] = g;
    };
    const edge = (s, key, d, labels, lx, ly, o) => {
      o = o || {};
      const g = sel('g', { class: 'ed ' + (o.cls || ''), 'data-from': o.from || 2 }, s);
      const p = { d, class: 'ed-line', 'marker-end': 'url(#bd-head)' };
      if (!o.flat) p.pathLength = 1;
      sel('path', p, g);
      [].concat(labels || []).forEach((t, i) => sel('text', { x: lx, y: ly + i * 11, class: 'ed-sig' + (o.sm ? ' sm' : ''), 'text-anchor': o.anchor || 'start' }, g, t));
      if (key) R.ed[key] = g;
    };

    frame(stm, 6, 6, 244, 318, 'Undeployed', 1);
    frame(stm, 258, 6, 196, 318, 'Deployed', 1);
    sel('circle', { cx: 150, cy: 28, r: 5, class: 'st-init', 'data-from': 1 }, stm);
    edge(stm, null, 'M150 33 V46', null, 0, 0, { from: 1 });
    state('off', 90, 48, 120, 26, ['Off']);
    state('unc', 90, 106, 120, 26, ['Unconfigured']);
    state('cfg', 90, 164, 120, 46, ['Configured'], 'do / Load Flight Plan');
    state('rdy', 90, 238, 120, 28, ['Ready for Mission']);
    state('gsa', 278, 214, 136, 58, ['Going to', 'Safe Area'], 'do / Going to Safe Area');
    state('pat', 278, 110, 136, 46, ['Patrolling'], 'do / Watch Perimeter');
    state('next', 278, 34, 136, 40, ['Predator Detected', '…'], null, 'st-ghost');
    edge(stm, 'soi', 'M150 74 V104', 'Start SOI', 158, 93);
    edge(stm, 'fp', 'M150 132 V162', 'FlightPlan', 158, 151);
    edge(stm, 'fail', 'M90 187 H70 V119 H88', ['FlightPlan', 'Check Failed'], 38, 150, { anchor: 'middle', sm: true, from: 2.5 });
    edge(stm, 'rdy', 'M150 210 V236', 'Ready for mission', 158, 227);
    edge(stm, 'sgm', 'M150 266 V300 H346 V274', 'Start Sheep Guard Mission', 254, 294, { anchor: 'middle' });
    edge(stm, 'pat', 'M346 214 V158', 'Start Patrolling', 352, 190);
    edge(stm, null, 'M346 110 V76', null, 0, 0, { cls: 'ghost', flat: true });

    const node = (key) => { const g = sel('g', { class: 'ad-node', 'data-from': 4 }, ad); if (key) R.ad[key] = g; return g; };
    const flow = (d, label, lx, ly, anchor) => edge(ad, null, d, label, lx, ly, { from: 4, cls: 'cf', flat: true, anchor: anchor || 'middle', sm: true });
    R.adFrame = frame(ad, 6, 6, 288, 318, 'act Load Flight Plan', 4);
    const prm = node();
    sel('rect', { x: 0, y: 58, width: 14, height: 16, class: 'ad-param' }, prm);
    edge(ad, null, 'M14 66 H88', 'FlightPlan', 51, 61, { from: 4, anchor: 'middle', sm: true });
    sel('circle', { cx: 150, cy: 30, r: 6, class: 'st-init' }, node());
    flow('M150 36 V50');
    const act = (key, y, name) => {
      const g = node(key);
      sel('rect', { x: 90, y, width: 120, height: 28, rx: 8, class: 'ad-act' }, g);
      sel('text', { x: 150, y: y + 18, class: 'st-name', 'text-anchor': 'middle' }, g, name);
    };
    act('read', 52, 'Read FlightPlan');
    flow('M150 80 V102');
    act('check', 104, 'Check FlightPlan');
    flow('M150 132 V146');
    sel('polygon', { points: '150,148 162,160 150,172 138,160', class: 'ad-dec' }, node('dec'));
    flow('M138 160 H80 V198', '[in range]', 109, 155);
    flow('M162 160 H222 V198', '[else]', 192, 155);
    const send = (key, x, w, lines) => {
      const g = node(key);
      sel('polygon', { points: `${x},200 ${x + w - 12},200 ${x + w},217 ${x + w - 12},234 ${x},234`, class: 'ad-send' }, g);
      lines.forEach((l, i) => sel('text', { x: x + (w - 12) / 2, y: 221 - (lines.length - 1) * 5.5 + i * 11, class: 'st-name', 'text-anchor': 'middle' }, g, l));
    };
    send('ok', 20, 120, ['Ready for mission']);
    send('ko', 158, 134, ['FlightPlan', 'Check Failed']);
    flow('M80 234 V265');
    flow('M222 234 V265');
    [80, 222].forEach((x) => {
      const g = node();
      sel('circle', { cx: x, cy: 276, r: 9, class: 'ad-final-o' }, g);
      sel('circle', { cx: x, cy: 276, r: 5, class: 'st-init' }, g);
    });
    R.token = sel('circle', { cx: 0, cy: 0, r: 6, class: 'bd-token' }, ad);
    return R;
  }

  function buildFigure(root) {
    let R, tabs, say, note, op, fn, nextBtn, allBtn, koBox, koInput;
    const STOP = {};
    let step = 1;
    let gen = 0;

    function render() {
      const isFr = document.documentElement.lang === 'fr';
      const BUILD = getBuild();
      root.innerHTML = `
        <div class="fig-bar"><div class="seg" role="group" aria-label="${isFr ? 'Étape' : 'Step'}">
          ${BUILD.map((b, i) => `<button type="button" data-step="${i + 1}" aria-pressed="${step === i + 1}"><small>${isFr ? 'Étape' : 'Step'} ${i + 1}</small>${b.tab}</button>`).join('')}
        </div></div>
        <p class="m-story bd-say" aria-live="polite"></p>
        <div class="bd-stage">
          <div class="bd-col"><span class="bd-op" data-from="2" title="${isFr ? 'Dans la simulation, c’est l’ingénieur système qui joue les signaux à la main.' : 'In the simulation, the systems engineer plays signals by hand.'}">${isFr ? 'Opérateur de simulation' : 'Simulation operator'}<small>${isFr ? 'l’ingénieur système clique les signaux' : 'the systems engineer clicks signals'}</small></span><svg class="bd-stm" viewBox="0 0 460 330" role="img" aria-label="${isFr ? 'La machine d’états du début de la mission.' : 'The state machine at mission start.'}"></svg></div>
          <div class="bd-col bd-adcol"><span class="bd-op bd-fn" data-from="4">${isFr ? 'Fonction' : 'Function'}<small>${isFr ? 'envoie le signal toute seule' : 'fires the signal autonomously'}</small></span><svg class="bd-ad" viewBox="0 0 300 330" role="img" aria-label="${isFr ? 'Le diagramme d’activité de Load Flight Plan.' : 'The activity diagram of Load Flight Plan.'}"></svg><p class="bd-wait">${isFr ? 'Le détail des fonctions arrive à l’étape 4.' : 'Function details arrive in step 4.'}</p></div>
        </div>
        <div class="btn-row"><button type="button" class="btn" data-next></button><button type="button" class="btn ghost" data-replay>${isFr ? 'Rejouer cette étape' : 'Replay this step'}</button><button type="button" class="btn ghost" data-all>${isFr ? 'Tout depuis le début' : 'From the beginning'}</button><label class="bd-ko" hidden><input type="checkbox"> ${isFr ? 'Plan de vol hors limites' : 'Flight plan out of bounds'}</label></div>
        <p class="bd-note" aria-live="polite"></p>`;
      R = drawBuild($('.bd-stm', root), $('.bd-ad', root));
      tabs = $$('[data-step]', root);
      say = $('.bd-say', root);
      note = $('.bd-note', root);
      op = $('.bd-op', root);
      fn = $('.bd-fn', root);
      nextBtn = $('[data-next]', root);
      allBtn = $('[data-all]', root);
      koBox = $('.bd-ko', root);
      koInput = $('input', koBox);

      tabs.forEach((b) => b.addEventListener('click', () => go(+b.dataset.step, +b.dataset.step)));
      nextBtn.addEventListener('click', () => (step < BUILD.length ? go(step + 1, step + 1) : go(1, BUILD.length)));
      $('[data-replay]', root).addEventListener('click', () => go(step, step));
      allBtn.addEventListener('click', () => go(1, BUILD.length));
      koInput.addEventListener('change', () => go(5, 5));
      setStep(step);
      light('off');
    }

    function light(key) {
      Object.values(R.st).forEach((g) => g.classList.remove('on'));
      if (R.st[key]) R.st[key].classList.add('on');
    }
    function mark(key) {
      Object.values(R.ad).forEach((g) => g.classList.remove('run'));
      if (key) R.ad[key].classList.add('run');
    }
    function clear() {
      light(null);
      mark(null);
      $$('.fire, .sent, .run, .pulse, .idle', root).forEach((n) => n.classList.remove('fire', 'sent', 'run', 'pulse', 'idle'));
      R.token.classList.remove('on');
      dropPtr();
      $$('.bd-ring, .bd-pop', root).forEach((n) => n.remove());
      op.classList.remove('idle');
      fn.classList.remove('live');
    }
    /* shows the pieces of step n, the new ones one after the other; returns how long they take to appear */
    function setStep(n) {
      step = n;
      const isFr = document.documentElement.lang === 'fr';
      const BUILD = getBuild();
      tabs.forEach((b) => { b.setAttribute('aria-pressed', String(+b.dataset.step === n)); });
      /* the main button always leads to what comes next; replaying the step is secondary */
      nextBtn.innerHTML = n < BUILD.length ? (isFr ? 'Étape suivante →' : 'Next step →') : (isFr ? 'Revoir tout depuis le début' : 'Review from the beginning');
      allBtn.hidden = n === BUILD.length;
      say.innerHTML = BUILD[n - 1].say;
      note.innerHTML = '';
      koBox.hidden = n !== 5;
      root.classList.toggle('bd-has-ad', n >= 4);
      clear();
      let k = 0;
      $$('[data-from]', root).forEach((el) => {
        const show = +el.dataset.from <= n;
        el.style.transitionDelay = show && !el.classList.contains('in') ? (k++ * 90) + 'ms' : '0ms';
        el.classList.toggle('in', show);
      });
      return k * 90 + 450;
    }
    async function wait(my, ms) {
      await sleep(ms);
      if (my !== gen) throw STOP;
    }
    /* position of an element's centre, in the figure's own coordinates */
    function centre(el) {
      const box = root.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
    }
    /* MANUAL signal: a mouse pointer leaves the operator, goes to the transition and clicks on it */
    /* one pointer for the whole sequence: it stays where it clicked and goes on to the next target */
    let ptr = null;
    function dropPtr() { if (ptr) { ptr.remove(); ptr = null; } }
    async function click(my, from, target) {
      if (reduced()) return;
      const b = centre(target);
      const start = !ptr;
      if (start) {
        const a = centre(from);
        ptr = document.createElement('span');
        ptr.className = 'bd-ptr';
        ptr.style.left = a.x + 'px';
        ptr.style.top = a.y + 'px';
        ptr.innerHTML = '<svg viewBox="0 0 16 20" aria-hidden="true"><path d="M1 1 L1 15 L5 11.5 L8 18 L10.5 17 L7.6 10.6 L13 10.4 Z"/></svg>';
        root.appendChild(ptr);
        await sleep(40);
      }
      ptr.style.left = b.x + 'px';
      ptr.style.top = b.y + 'px';
      await wait(my, 750);
      const ring = document.createElement('span');
      ring.className = 'bd-ring';
      ring.style.left = b.x + 'px';
      ring.style.top = b.y + 'px';
      root.appendChild(ring);
      ptr.classList.add('down');
      ring.addEventListener('animationend', () => ring.remove());
      await wait(my, 220);
      ptr.classList.remove('down');
    }
    /* AUTOMATIC signal: a bubble pops out of the "send" node of the activity, and the same one pops on the transition */
    function pop(at, text, lost) {
      const c = centre(at);
      const chip = document.createElement('span');
      chip.className = 'bd-pop' + (lost ? ' lost' : '');
      chip.textContent = text;
      chip.style.left = c.x + 'px';
      chip.style.top = c.y + 'px';
      root.appendChild(chip);
      return chip;
    }
    async function popPair(my, from, target, text) {
      if (reduced()) return;
      const a = pop(from, text);
      await wait(my, 900);
      const b = pop(target, text);
      await wait(my, 800);
      a.classList.add('gone');
      b.classList.add('gone');
      await sleep(250);
      a.remove();
      b.remove();
    }
    async function signal(my, from, e, sig, to, tone) {
      const label = $('text', R.ed[e]);
      if (tone === 'auto') { dropPtr(); await popPair(my, from, label, sig); }
      else await click(my, from, label);
      if (my !== gen) throw STOP;
      R.ed[e].classList.add('fire');
      light(to);
      await wait(my, 550);
      R.ed[e].classList.remove('fire');
    }
    function moveToken(x, y, jump) {
      if (jump) R.token.style.transition = 'none';
      R.token.style.transform = `translate(${x}px, ${y}px)`;
      if (jump) { void R.token.getBoundingClientRect(); R.token.style.transition = ''; }
    }

    async function play(n, my) {
      await wait(my, setStep(n));
      const isFr = document.documentElement.lang === 'fr';
      if (n === 1) light('off');
      if (n === 2) {
        light('off');
        const play1 = async (i) => { const [e, sig, to] = WALK[i]; await wait(my, 350); await signal(my, op, e, sig, to); };
        await play1(0);
        await play1(1);
        /* the operator tries the failure case: nothing in the model catches it */
        await wait(my, 500);
        note.innerHTML = isFr ? 'L’opérateur teste le cas d’échec : le plan de vol est refusé.' : 'The operator tests the failure case: flight plan rejected.';
        await click(my, op, $('rect', R.st.cfg));
        const lost = pop($('rect', R.st.cfg), 'FlightPlan Check Failed : signal perdu', true);
        await wait(my, 1500);
        lost.classList.add('gone');
        note.innerHTML = isFr ? 'Aucune transition n’attend ce signal : le drone reste bloqué dans <i>Configured</i>. Il manque une transition vers <i>Unconfigured</i>.' : 'No transition awaits this signal: drone remains stuck in <i>Configured</i>. A transition to <i>Unconfigured</i> is missing.';
        await wait(my, 1800);
        lost.remove();
        /* he goes back to the previous step: adds the transition with its trigger */
        note.innerHTML = isFr ? 'Il ajoute la transition, avec son signal déclencheur.' : 'He adds the transition with its triggering signal.';
        R.ed.fail.classList.add('in');
        await wait(my, 1200);
        await signal(my, op, 'fail', 'FlightPlan Check Failed', 'unc');
        note.innerHTML = isFr ? 'Validé : le drone retourne bien dans <i>Unconfigured</i>. La suite de la mission défile.' : 'Validated: drone returns cleanly to <i>Unconfigured</i>. The rest of the mission plays.';
        await wait(my, 900);
        /* the rest of the mission: no pointer, quick */
        dropPtr();
        for (let i = 1; i < WALK.length; i++) {
          const [e, , to] = WALK[i];
          await wait(my, 250);
          R.ed[e].classList.add('fire');
          light(to);
          await wait(my, 400);
          R.ed[e].classList.remove('fire');
        }
        note.innerHTML = isFr ? 'Avec peu d’effort, on affine la mission : chaque transition et chaque condition est décrite, et validée en la jouant à la main.' : 'With minimal effort, we refine the mission: each transition and condition is specified, and validated by playing it by hand.';
      }
      if (n === 3) {
        for (const k of ['cfg', 'gsa', 'pat']) {
          R.dos[k].classList.add('pulse');
          await wait(my, 800);
          R.dos[k].classList.remove('pulse');
        }
      }
      if (n === 4) {
        R.dos.cfg.classList.add('run');
        R.adFrame.classList.add('run');
        note.innerHTML = isFr ? 'Dans Cameo, un double-clic sur <i>do / Load Flight Plan</i> ouvre ce diagramme.' : 'In Cameo, double-clicking <i>do / Load Flight Plan</i> opens this diagram.';
      }
      if (n === 5) {
        const ko = koInput.checked;
        light('off');
        await wait(my, 300);
        await signal(my, op, 'soi', 'Start SOI', 'unc');
        await signal(my, op, 'fp', 'FlightPlan', 'cfg');
        op.classList.add('idle');
        R.dos.cfg.classList.add('run');
        const path = TOKEN[ko ? 'ko' : 'ok'];
        moveToken(path[0][0], path[0][1], true);
        R.token.classList.add('on');
        for (const [x, y, k] of path) {
          moveToken(x, y);
          await wait(my, 600);
          if (k) mark(k);
        }
        R.ad[ko ? 'ko' : 'ok'].classList.add('sent');
        fn.classList.add('live');
        await signal(my, R.ad[ko ? 'ko' : 'ok'], ko ? 'fail' : 'rdy', ko ? 'FlightPlan Check Failed' : 'Ready for mission', ko ? 'unc' : 'rdy', 'auto');
        R.dos.cfg.classList.remove('run');
        moveToken(ko ? 222 : 80, 276);
        await wait(my, 600);
        R.token.classList.remove('on');
        mark(null);
        note.innerHTML = ko
          ? (isFr ? 'Plan hors limites : la fonction renvoie le drone dans <i>Unconfigured</i>. Là non plus, personne n’a cliqué.' : 'Plan out of bounds: the function sends the drone back to <i>Unconfigured</i>. Here again, no one clicked.')
          : (isFr ? '<b>Ready for Mission, sans un clic.</b> La fonction a fait avancer la mission toute seule.' : '<b>Ready for Mission, without a click.</b> The function advanced the mission on its own.');
      }
    }
    async function go(from, to) {
      const my = ++gen;
      try {
        for (let n = from; n <= to; n++) { await play(n, my); if (n < to) await wait(my, 1800); }
      } catch (e) { if (e !== STOP) throw e; }
    }

    render();
    window.addEventListener('article-lang', render);

    if (!reduced() && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        go(1, 5);
      }, { threshold: 0.45 });
      io.observe(root);
    }
  }

  /* ───────── figure 6: the mission, three models ───────── */
  const STEPS = window.SimCore && window.SimCore.STEPS;
  const MODELS_FR = [
    { id: 'ok', label: 'Modèle 1', short: 'complet', text: 'Toutes les transitions sont là, chacune avec son signal.' },
    { id: 'signal', label: 'Modèle 2', short: 'un signal oublié', text: 'La transition <i>Configured → Ready for Mission</i> est dessinée, mais sans signal.', fix: 'Poser le signal <i>Ready for mission</i> sur la transition' },
    { id: 'transition', label: 'Modèle 3', short: 'une transition manquante', text: 'Rien ne part de <i>Patrolling</i> quand un ours est détecté.', fix: 'Ajouter la transition <i>Patrolling → Predator tracking</i>' }
  ];
  const MODELS_EN = [
    { id: 'ok', label: 'Model 1', short: 'complete', text: 'All transitions are present, each with its signal.' },
    { id: 'signal', label: 'Model 2', short: 'forgotten signal', text: 'The transition <i>Configured → Ready for Mission</i> is drawn, but has no signal.', fix: 'Add the <i>Ready for mission</i> signal to the transition' },
    { id: 'transition', label: 'Model 3', short: 'missing transition', text: 'Nothing leaves <i>Patrolling</i> when a bear is detected.', fix: 'Add the transition <i>Patrolling → Predator tracking</i>' }
  ];
  const getModels = () => (document.documentElement.lang === 'fr' ? MODELS_FR : MODELS_EN);

  const TELL_FR = {
    'Predator Detected inside tracking perimeter': 'Le pâturage signale un ours dans le périmètre de suivi.',
    'Predator entering safe perimiter': 'L’ours approche trop du troupeau : dissuasion, lumière et son.',
    'Predator leaving safe perimiter': 'L’ours recule.',
    'Predator leaving tracking perimiter': 'L’ours est parti : retour à la patrouille.'
  };
  const TELL_EN = {
    'Predator Detected inside tracking perimeter': 'Pasture signals a bear in the tracking perimeter.',
    'Predator entering safe perimiter': 'Bear approaches flock too closely: deterrence, light and sound.',
    'Predator leaving safe perimiter': 'The bear retreats.',
    'Predator leaving tracking perimiter': 'Bear is gone: return to patrol.'
  };

  /* The nominal scenario of the use case, paced so the pasture can play (pause before each signal, ms). */
  const RUN = [
    { sig: 'Start SOI', to: 'Unconfigured', wait: 700 },
    { sig: 'FlightPlan', to: 'Configured', wait: 1100 },
    { sig: 'Ready for mission', to: 'Ready for Mission', wait: 1200, bug: 'signal' },
    { sig: 'Start Sheep Guard Mission', to: 'Going to Safe Area', wait: 1300, goal: 0 },
    { sig: 'Start Patrolling', to: 'Patrolling', wait: 4600, goal: 1 },
    { sig: 'Predator Detected inside tracking perimeter', to: 'Predator tracking', wait: 4200, bug: 'transition', goal: 2 },
    { sig: 'Predator entering safe perimiter', to: 'Predator counteraction', wait: 4200 },
    { sig: 'Predator leaving safe perimiter', to: 'Predator tracking', wait: 4400, goal: 3 },
    { sig: 'Predator leaving tracking perimiter', to: 'Patrolling', wait: 3600, goal: 4 }
  ];
  const GOALS_FR = ['Rejoindre la zone sûre', 'Patrouiller autour du troupeau', 'Suivre l’ours', 'Le repousser', 'Reprendre la patrouille'];
  const GOALS_EN = ['Reach safe area', 'Patrol around flock', 'Track the bear', 'Repel the bear', 'Resume patrol'];
  const getGoals = () => (document.documentElement.lang === 'fr' ? GOALS_FR : GOALS_EN);

  const NS = 'http://www.w3.org/2000/svg';
  function sel(name, attrs, parent, text) {
    const n = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  /* The mission state machine, drawn small. Returns the boxes by state name and the two edges a model can lack. */
  function drawStm(s, model, fixed) {
    s.innerHTML = '';
    const d = sel('defs', {}, s);
    const mk = sel('marker', { id: 'tp-head', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, d);
    sel('path', { d: 'M0 0L10 5L0 10z', class: 'a-head' }, mk);
    const box = {};
    const frame = (x, y, w, h, name) => {
      sel('rect', { x, y, width: w, height: h, rx: 10, class: 'st-frame' }, s);
      sel('text', { x: x + 10, y: y + 15, class: 'st-fname' }, s, name);
    };
    const st = (name, x, y, w, h, lines) => {
      const g = sel('g', { class: 'st' }, s);
      sel('rect', { x, y, width: w, height: h, rx: 8, class: 'st-box' }, g);
      const ls = lines || [name];
      ls.forEach((l, i) => sel('text', { x: x + w / 2, y: y + h / 2 + 4 - (ls.length - 1) * 6 + i * 12, class: 'st-name', 'text-anchor': 'middle' }, g, l));
      box[name] = g;
      return g;
    };
    const edge = (dpath, label, lx, ly, anchor, cls) => {
      const g = sel('g', { class: 'ed ' + (cls || '') }, s);
      sel('path', { d: dpath, class: 'ed-line', 'marker-end': 'url(#tp-head)' }, g);
      if (label) sel('text', { x: lx, y: ly, class: 'ed-sig', 'text-anchor': anchor || 'middle' }, g, label);
      return g;
    };
    frame(8, 8, 344, 132, 'Undeployed');
    sel('circle', { cx: 24, cy: 46, r: 5, class: 'st-init' }, s);
    edge('M29 46 H38', '');
    st('Off', 40, 34, 58, 26);
    st('Unconfigured', 128, 34, 96, 26);
    st('Configured', 254, 34, 88, 26);
    st('Ready for Mission', 236, 98, 106, 30, ['Ready for', 'Mission']);
    edge('M98 47 H126', 'Start SOI', 112, 29);
    edge('M224 47 H252', 'FlightPlan', 238, 29);
    const bugSig = model === 'signal' && !fixed;
    edge('M298 60 V96', bugSig ? '' : 'Ready for mission', 292, 82, 'end', bugSig ? 'ed-bug' : (model === 'signal' ? 'ed-fixed' : ''));
    if (bugSig) sel('text', { x: 292, y: 82, class: 'ed-sig ed-bug-t', 'text-anchor': 'end' }, s, '? aucun signal');
    frame(8, 156, 344, 154, 'Deployed');
    st('Going to Safe Area', 18, 196, 78, 34, ['Going to', 'Safe Area']);
    st('Patrolling', 120, 196, 78, 34);
    frame(220, 176, 124, 124, 'Predator Detected');
    st('Predator tracking', 230, 198, 104, 32, ['Predator', 'tracking']);
    st('Predator counteraction', 230, 256, 104, 32, ['Predator', 'counteraction']);
    edge('M289 128 V142 H57 V194', 'Start Sheep Guard Mission', 150, 152);
    edge('M96 213 H118', '');
    sel('text', { x: 107, y: 246, class: 'ed-sig', 'text-anchor': 'middle' }, s, 'Start Patrolling');
    const bugTr = model === 'transition' && !fixed;
    if (bugTr) {
      edge('M198 206 H228', '', 0, 0, '', 'ed-bug');
      sel('text', { x: 159, y: 186, class: 'ed-sig ed-bug-t', 'text-anchor': 'middle' }, s, '✗ transition absente');
    } else {
      edge('M198 206 H228', 'Predator Detected', 159, 186, 'middle', model === 'transition' ? 'ed-fixed' : '');
    }
    edge('M230 272 H159 V232', 'l’ours est parti', 180, 288);
    edge('M270 230 V254', '');
    edge('M298 256 V232', '');
    return box;
  }

  function confetti(host) {
    if (reduced()) return;
    const box = document.createElement('div');
    box.className = 'tp-confetti';
    const colors = ['var(--route)', 'var(--sky)', 'var(--grass)', 'var(--amber)', '#ffd23f'];
    for (let i = 0; i < 90; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px');
      p.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      p.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
      p.style.animationDelay = (Math.random() * 0.4) + 's';
      box.appendChild(p);
    }
    host.appendChild(box);
    setTimeout(() => box.remove(), 4200);
  }

  function missionFigure(root) {
    if (!STEPS || !window.SimScene) { root.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; return; }
    let what, stm, host, field, banner, logEl, runBtn, fixBtn, goals;
    let modelId = 'ok';
    let fixed = false;
    let boxes = {};
    let scene = null;
    let gen = 0;
    let visible = false;

    function render() {
      const isFr = document.documentElement.lang === 'fr';
      const MODELS = getModels();
      const GOALS = getGoals();
      root.innerHTML = `
        <div class="fig-bar"><div class="seg" role="group" aria-label="${isFr ? 'Modèle d’étudiant' : 'Student model'}">
          ${MODELS.map((m) => `<button type="button" data-model="${m.id}" aria-pressed="${m.id === modelId}"><small>${m.label}</small>${m.short}</button>`).join('')}
        </div></div>
        <div class="mis-wrap">
          <div class="mis-side">
            <p class="m-story mis-what"></p>
            <svg class="mis-stm" viewBox="0 0 360 318" role="img" aria-label="${isFr ? 'La machine d’états de la mission du drone.' : 'The drone mission state machine.'}"></svg>
            <div class="btn-row"><button type="button" class="btn" data-run>${isFr ? '▶ Lancer la simulation' : '▶ Run simulation'}</button><button type="button" class="btn ghost" data-fix hidden></button></div>
            <span class="label">Mission</span>
            <ol class="mis-goals">${GOALS.map((g) => `<li>${g}</li>`).join('')}</ol>
          </div>
          <div class="mis-field">
            <div class="mis-pasture"><div class="mis-host"></div><p class="mis-banner" hidden></p></div>
            <ol class="mis-log" aria-live="polite"></ol>
          </div>
        </div>`;
      what = $('.mis-what', root);
      stm = $('.mis-stm', root);
      host = $('.mis-host', root);
      field = $('.mis-field', root);
      banner = $('.mis-banner', root);
      logEl = $('.mis-log', root);
      runBtn = $('[data-run]', root);
      fixBtn = $('[data-fix]', root);
      goals = $$('.mis-goals li', root);

      runBtn.addEventListener('click', run);
      fixBtn.addEventListener('click', () => { fixed = true; load(); run(); });
      $$('[data-model]', root).forEach((b) => b.addEventListener('click', () => {
        modelId = b.dataset.model;
        fixed = false;
        $$('[data-model]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        load();
      }));
      load();
    }

    function light(name, cls) {
      Object.values(boxes).forEach((g) => g.classList.remove('on', 'stuck'));
      if (boxes[name]) boxes[name].classList.add(cls || 'on');
    }
    function log(html, tone) {
      const li = document.createElement('li');
      if (tone) li.className = tone;
      li.innerHTML = html;
      logEl.prepend(li);
      while (logEl.children.length > 4) logEl.lastChild.remove();
    }
    function show(text, tone) {
      banner.hidden = !text;
      banner.className = 'mis-banner' + (tone ? ' ' + tone : '');
      banner.innerHTML = text || '';
    }
    function fresh() {
      if (scene) scene.setVisible(false);
      scene = window.SimScene.create(host);
      scene.setVisible(visible);
    }
    function load() {
      gen += 1;
      const isFr = document.documentElement.lang === 'fr';
      const MODELS = getModels();
      const model = MODELS.find((m) => m.id === modelId) || MODELS[0];
      boxes = drawStm(stm, model.id, fixed);
      what.innerHTML = `<b>${model.label} · ${model.short}</b><br><small>${fixed ? (isFr ? 'Corrigé : ' : 'Fixed: ') + model.fix.replace(/^\w/, (c) => c.toLowerCase()) + '.' : model.text}</small>`;
      goals.forEach((g) => g.classList.remove('done', 'miss'));
      logEl.innerHTML = '';
      show('');
      fixBtn.hidden = true;
      runBtn.disabled = false;
      light('Off');
      fresh();
    }
    function intruder() {
      const world = $('.poc-world', host);
      if (!world) return;
      const b = document.createElement('div');
      b.className = 'poc-bear-wrap poc-bear-wrap--left tp-intruder';
      b.innerHTML = `<img src="${BASE}assets/sim/bear.svg" alt="" class="poc-bear">`;
      world.appendChild(b);
      void b.offsetWidth;
      b.classList.add('go');
    }
    function fail(text, why) {
      const isFr = document.documentElement.lang === 'fr';
      const MODELS = getModels();
      const model = MODELS.find((m) => m.id === modelId) || MODELS[0];
      show(text, 'ko');
      log(why, 'ko');
      goals.forEach((g) => { if (!g.classList.contains('done')) g.classList.add('miss'); });
      fixBtn.innerHTML = model.fix;
      fixBtn.hidden = false;
    }
    async function run() {
      const my = ++gen;
      const isFr = document.documentElement.lang === 'fr';
      const TELL = isFr ? TELL_FR : TELL_EN;
      runBtn.disabled = true;
      fixBtn.hidden = true;
      goals.forEach((g) => g.classList.remove('done', 'miss'));
      logEl.innerHTML = '';
      show('');
      fresh();
      let step = STEPS.Off;
      light('Off');
      const live = () => my === gen;
      for (const r of RUN) {
        await sleep(r.wait);
        if (!live()) return;
        const lost = r.bug === modelId && !fixed;
        if (lost) {
          log(isFr
            ? `<code>${esc(r.sig)}</code> : aucune transition ne l’attend dans <i>${esc(step)}</i>. Le signal est perdu.`
            : `<code>${esc(r.sig)}</code>: no transition expects it in <i>${esc(step)}</i>. Signal is lost.`, 'ko');
          light(step, 'stuck');
          if (r.bug === 'signal') {
            await sleep(2600);
            if (!live()) return;
            fail(isFr ? 'Le drone n’a jamais quitté la base.' : 'The drone never left base.',
                 isFr ? 'Bloqué dans <i>Configured</i> : <i>Ready for Mission</i> n’est jamais atteint. Il manque un signal sur la transition.' : 'Stuck in <i>Configured</i>: <i>Ready for Mission</i> is never reached. Missing trigger signal on transition.');
          } else {
            intruder();
            await sleep(6200);
            if (!live()) return;
            fail(isFr ? '🐻 L’ours est dans le troupeau. Le drone patrouille toujours.' : '🐻 Bear is in the flock. Drone is still patrolling.',
                 isFr ? '<i>Predator tracking</i> n’est jamais atteint : rien ne part de <i>Patrolling</i> sur ce signal.' : '<i>Predator tracking</i> is never reached: nothing leaves <i>Patrolling</i> on this signal.');
          }
          runBtn.disabled = false;
          return;
        }
        step = r.to;
        scene.setStep(step);
        light(step);
        const tellText = TELL[r.sig];
        log(`${tellText ? esc(tellText) + ' ' : ''}<code>${esc(r.sig)}</code> → <b>${esc(step)}</b>`);
        if (r.goal != null) goals[r.goal].classList.add('done');
      }
      await sleep(3800);
      if (!live()) return;
      show(isFr ? 'Mission réussie !' : 'Mission accomplished!', 'ok');
      log(isFr ? 'Tous les objectifs de la mission sont atteints.' : 'All mission goals successfully achieved.', 'ok');
      confetti($('.mis-pasture', root));
      runBtn.disabled = false;
    }

    render();
    window.addEventListener('article-lang', render);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        visible = es.some((e) => e.isIntersecting);
        if (scene) scene.setVisible(visible);
      }).observe(field);
    } else visible = true;
  }

  /* ───────── the table of contents follows the reading; the theme; language ───────── */
  function toc() {
    const links = $$('.toc a[href^="#"]');
    const secs = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window) || !secs.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    secs.forEach((s) => io.observe(s));
  }
  function theme() {
    const btn = document.getElementById('theme-btn');
    if (!btn) return;
    const KEY = 'mbse-shepherd-article-theme';
    let pick = null;
    try { pick = localStorage.getItem(KEY); } catch (e) { pick = null; }
    if (pick) document.documentElement.setAttribute('data-theme', pick);
    btn.addEventListener('click', () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = dark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* private window */ }
    });
  }
  function lang() {
    const KEY = 'mbse-shepherd-article-lang';
    function set(l) {
      if (l !== 'fr') l = 'en';
      document.documentElement.lang = l;
      try { localStorage.setItem(KEY, l); } catch (e) {}
      $$('[data-lang-choice]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-lang-choice') === l));
      });
      const t = $('title[data-title-' + l + ']');
      if (t) document.title = t.getAttribute('data-title-' + l);
      window.dispatchEvent(new CustomEvent('article-lang', { detail: { lang: l } }));
    }
    $$('[data-lang-choice]').forEach((b) => {
      b.addEventListener('click', () => set(b.getAttribute('data-lang-choice')));
    });
    set(document.documentElement.lang || 'en');
  }

  const FIGS = { film: filmFigure, desk: deskFigure, gallery: galleryFigure, build: buildFigure, mission: missionFigure };
  $$('[data-fig]').forEach((n) => {
    const fn = FIGS[n.dataset.fig];
    if (!fn) return;
    try { fn(n); } catch (e) { n.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; if (window.console) console.error(e); }
  });
  $$('[data-phone]').forEach((slot) => { if (!slot.closest('[data-fig="gallery"]')) phoneSlot(slot); });
  toc();
  theme();
  lang();
}());
