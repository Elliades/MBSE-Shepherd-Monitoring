/* The article "J'ai viré le polycopié Word" (article/tp/index.html): its figures.

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
  const guideUrl = (scene, qs) => `${BASE}part1/index.html?author=0${qs || ''}#${scene}`;

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
      f.title = 'Le film du TP';
      f.allow = 'autoplay';
      f.src = `${BASE}promo/?lang=fr&hud=0`;
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
  function galleryFigure(root) {
    const f = phoneSlot($('[data-phone]', root));
    async function alignScene(scene) {
      if (scene === 'm-fp-port') {
        await sleep(150);
        const el = await waitFor(f, '[data-widget="portAnatomy"]', 3000);
        if (el && f.contentWindow) {
          const prev = el.previousElementSibling;
          const target = (prev && prev.tagName === 'P') ? prev : el;
          const topBar = f.contentDocument ? f.contentDocument.querySelector('.top') : null;
          const topOffset = (topBar ? topBar.offsetHeight : 50) + 12;
          const y = target.getBoundingClientRect().top + f.contentWindow.scrollY - topOffset;
          f.contentWindow.scrollTo({ top: Math.max(0, y), behavior: reduced() ? 'auto' : 'smooth' });
        }
      }
    }
    f.addEventListener('load', () => {
      const cur = $('[data-scene][aria-pressed="true"]', root);
      alignScene(cur ? cur.dataset.scene : 'm-fp-port');
    });
    $$('[data-scene]', root).forEach((b) => b.addEventListener('click', () => {
      $$('[data-scene]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (f.src) {
        hash(f, b.dataset.scene);
        alignScene(b.dataset.scene);
      } else {
        f.src = guideUrl(b.dataset.scene);
      }
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
      guide.src = guideUrl('a-lifelines', code ? `&code=${code}&relay=${encodeURIComponent(relay)}` : '');
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
  const BUILD = [
    { tab: 'Les états', say: 'On pose d’abord les grandes étapes de la vie du drone : éteint, à configurer, configuré, prêt, puis la mission elle-même.' },
    { tab: 'Les transitions', say: 'Puis les transitions, chacune avec son signal. Pour l’instant, c’est l’opérateur qui les envoie toutes, une à une.' },
    { tab: 'Les fonctions', say: 'On alloue à chaque état ce que le drone y fait : ses <i>do activities</i>. Chacune tourne tant que son état est actif.' },
    { tab: 'Le détail', say: 'On ouvre les fonctions importantes. <i>Load Flight Plan</i> lit le plan de vol, le vérifie, et selon le résultat envoie un signal : <i>Ready for mission</i> ou <i>FlightPlan Check Failed</i>.' },
    { tab: 'La boucle', say: 'Ces signaux sont justement ceux qu’attendent les transitions. L’opérateur envoie <i>Start SOI</i> et <i>FlightPlan</i>, puis plus personne ne clique : <i>Load Flight Plan</i> s’exécute dans <i>Configured</i>, et c’est elle qui fait avancer la mission.' }
  ];
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
    edge(stm, 'fail', 'M90 187 H70 V119 H88', ['FlightPlan', 'Check Failed'], 38, 150, { anchor: 'middle', sm: true });
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
    root.innerHTML = `
      <div class="fig-bar"><div class="seg" role="group" aria-label="Étape">
        ${BUILD.map((b, i) => `<button type="button" data-step="${i + 1}" aria-pressed="false"><small>Étape ${i + 1}</small>${b.tab}</button>`).join('')}
      </div></div>
      <p class="m-story bd-say" aria-live="polite"></p>
      <div class="bd-stage">
        <div class="bd-col"><span class="bd-op" data-from="2">✋ Opérateur</span><svg class="bd-stm" viewBox="0 0 460 330" role="img" aria-label="La machine d’états du début de la mission."></svg></div>
        <div class="bd-col bd-adcol"><svg class="bd-ad" viewBox="0 0 300 330" role="img" aria-label="Le diagramme d’activité de Load Flight Plan."></svg><p class="bd-wait">Le détail des fonctions arrive à l’étape 4.</p></div>
      </div>
      <div class="btn-row"><button type="button" class="btn" data-replay>↻ Rejouer l’étape</button><button type="button" class="btn ghost" data-all>▶ Tout depuis le début</button><label class="bd-ko" hidden><input type="checkbox"> Plan de vol hors limites</label></div>
      <p class="bd-note" aria-live="polite"></p>`;
    const R = drawBuild($('.bd-stm', root), $('.bd-ad', root));
    const tabs = $$('[data-step]', root);
    const say = $('.bd-say', root);
    const note = $('.bd-note', root);
    const op = $('.bd-op', root);
    const koBox = $('.bd-ko', root);
    const koInput = $('input', koBox);
    const STOP = {};
    let step = 1;
    let gen = 0;

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
      $$('.bd-fly', root).forEach((n) => n.remove());
    }
    /* shows the pieces of step n, the new ones one after the other; returns how long they take to appear */
    function setStep(n) {
      step = n;
      tabs.forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.step === n)));
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
    function fly(from, to, text, tone) {
      if (reduced()) return Promise.resolve();
      const box = root.getBoundingClientRect();
      const a = from.getBoundingClientRect();
      const b = to.getBoundingClientRect();
      const chip = document.createElement('span');
      chip.className = 'bd-fly' + (tone ? ' ' + tone : '');
      chip.textContent = text;
      root.appendChild(chip);
      const at = (r) => `translate(${r.left - box.left + r.width / 2 - chip.offsetWidth / 2}px, ${r.top - box.top + r.height / 2 - chip.offsetHeight / 2}px)`;
      const anim = chip.animate([
        { transform: at(a), opacity: 0 }, { transform: at(a), opacity: 1, offset: 0.15 },
        { transform: at(b), opacity: 1, offset: 0.85 }, { transform: at(b), opacity: 0 }
      ], { duration: 1300, easing: 'ease-in-out' });
      return anim.finished.then(() => chip.remove(), () => chip.remove());
    }
    async function signal(my, from, e, sig, to, tone) {
      await fly(from, $('text', R.ed[e]), sig, tone);
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
      if (n === 1) light('off');
      if (n === 2) {
        light('off');
        for (const [e, sig, to] of WALK) { await wait(my, 350); await signal(my, op, e, sig, to); }
        note.innerHTML = 'Toute la mission avance, mais chaque signal est un clic de l’opérateur.';
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
        note.innerHTML = 'Dans Cameo, un double-clic sur <i>do / Load Flight Plan</i> ouvre ce diagramme.';
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
        await signal(my, R.ad[ko ? 'ko' : 'ok'], ko ? 'fail' : 'rdy', ko ? 'FlightPlan Check Failed' : 'Ready for mission', ko ? 'unc' : 'rdy', 'auto');
        R.dos.cfg.classList.remove('run');
        moveToken(ko ? 222 : 80, 276);
        await wait(my, 600);
        R.token.classList.remove('on');
        mark(null);
        note.innerHTML = ko
          ? 'Plan hors limites : la fonction renvoie le drone dans <i>Unconfigured</i>. Là non plus, personne n’a cliqué.'
          : '<b>Ready for Mission, sans un clic.</b> La fonction a fait avancer la mission toute seule.';
      }
    }
    async function go(from, to) {
      const my = ++gen;
      try {
        for (let n = from; n <= to; n++) { await play(n, my); if (n < to) await wait(my, 1800); }
      } catch (e) { if (e !== STOP) throw e; }
    }

    tabs.forEach((b) => b.addEventListener('click', () => go(+b.dataset.step, +b.dataset.step)));
    $('[data-replay]', root).addEventListener('click', () => go(step, step));
    $('[data-all]', root).addEventListener('click', () => go(1, 5));
    koInput.addEventListener('change', () => go(5, 5));
    setStep(1);
    light('off');
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
  const MODELS = [
    { id: 'ok', label: 'Modèle 1', short: 'complet', text: 'Toutes les transitions sont là, chacune avec son signal.' },
    { id: 'signal', label: 'Modèle 2', short: 'un signal oublié', text: 'La transition <i>Configured → Ready for Mission</i> est dessinée, mais sans signal.', fix: 'Poser le signal <i>Ready for mission</i> sur la transition' },
    { id: 'transition', label: 'Modèle 3', short: 'une transition manquante', text: 'Rien ne part de <i>Patrolling</i> quand un ours est détecté.', fix: 'Ajouter la transition <i>Patrolling → Predator tracking</i>' }
  ];
  /* The nominal scenario of the use case, paced so the pasture can play (pause before each signal, ms). */
  const RUN = [
    { sig: 'Start SOI', to: 'Unconfigured', wait: 700 },
    { sig: 'FlightPlan', to: 'Configured', wait: 1100 },
    { sig: 'Ready for mission', to: 'Ready for Mission', wait: 1200, bug: 'signal' },
    { sig: 'Start Sheep Guard Mission', to: 'Going to Safe Area', wait: 1300, goal: 0 },
    { sig: 'Start Patrolling', to: 'Patrolling', wait: 4600, goal: 1 },
    { sig: 'Predator Detected inside tracking perimeter', to: 'Predator tracking', wait: 4200, bug: 'transition', goal: 2, tell: 'Le pâturage signale un ours dans le périmètre de suivi.' },
    { sig: 'Predator entering safe perimiter', to: 'Predator counteraction', wait: 4200, tell: 'L’ours approche trop du troupeau : dissuasion, lumière et son.' },
    { sig: 'Predator leaving safe perimiter', to: 'Predator tracking', wait: 4400, goal: 3, tell: 'L’ours recule.' },
    { sig: 'Predator leaving tracking perimiter', to: 'Patrolling', wait: 3600, goal: 4, tell: 'L’ours est parti : retour à la patrouille.' }
  ];
  const GOALS = ['Rejoindre la zone sûre', 'Patrouiller autour du troupeau', 'Suivre l’ours', 'Le repousser', 'Reprendre la patrouille'];

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
    root.innerHTML = `
      <div class="fig-bar"><div class="seg" role="group" aria-label="Modèle d’étudiant">
        ${MODELS.map((m, i) => `<button type="button" data-model="${m.id}" aria-pressed="${i === 0}"><small>${m.label}</small>${m.short}</button>`).join('')}
      </div></div>
      <div class="mis-wrap">
        <div class="mis-side">
          <p class="m-story mis-what"></p>
          <svg class="mis-stm" viewBox="0 0 360 318" role="img" aria-label="La machine d’états de la mission du drone."></svg>
          <div class="btn-row"><button type="button" class="btn" data-run>▶ Lancer la simulation</button><button type="button" class="btn ghost" data-fix hidden></button></div>
          <span class="label">Mission</span>
          <ol class="mis-goals">${GOALS.map((g) => `<li>${g}</li>`).join('')}</ol>
        </div>
        <div class="mis-field">
          <div class="mis-pasture"><div class="mis-host"></div><p class="mis-banner" hidden></p></div>
          <ol class="mis-log" aria-live="polite"></ol>
        </div>
      </div>`;
    const what = $('.mis-what', root);
    const stm = $('.mis-stm', root);
    const host = $('.mis-host', root);
    const field = $('.mis-field', root);
    const banner = $('.mis-banner', root);
    const logEl = $('.mis-log', root);
    const runBtn = $('[data-run]', root);
    const fixBtn = $('[data-fix]', root);
    const goals = $$('.mis-goals li', root);
    let model = MODELS[0];
    let fixed = false;
    let boxes = {};
    let scene = null;
    let gen = 0;
    let visible = false;

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
      boxes = drawStm(stm, model.id, fixed);
      what.innerHTML = `<b>${model.label} · ${model.short}</b><br><small>${fixed ? 'Corrigé : ' + model.fix.replace(/^\w/, (c) => c.toLowerCase()) + '.' : model.text}</small>`;
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
      show(text, 'ko');
      log(why, 'ko');
      goals.forEach((g) => { if (!g.classList.contains('done')) g.classList.add('miss'); });
      fixBtn.innerHTML = model.fix;
      fixBtn.hidden = false;
    }
    async function run() {
      const my = ++gen;
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
        const lost = r.bug === model.id && !fixed;
        if (lost) {
          log(`<code>${esc(r.sig)}</code> : aucune transition ne l’attend dans <i>${esc(step)}</i>. Le signal est perdu.`, 'ko');
          light(step, 'stuck');
          if (r.bug === 'signal') {
            await sleep(2600);
            if (!live()) return;
            fail('Le drone n’a jamais quitté la base.', `Bloqué dans <i>Configured</i> : <i>Ready for Mission</i> n’est jamais atteint. Il manque un signal sur la transition.`);
          } else {
            intruder();
            await sleep(6200);
            if (!live()) return;
            fail('🐻 L’ours est dans le troupeau. Le drone patrouille toujours.', `<i>Predator tracking</i> n’est jamais atteint : rien ne part de <i>Patrolling</i> sur ce signal.`);
          }
          runBtn.disabled = false;
          return;
        }
        step = r.to;
        scene.setStep(step);
        light(step);
        log(`${r.tell ? esc(r.tell) + ' ' : ''}<code>${esc(r.sig)}</code> → <b>${esc(step)}</b>`);
        if (r.goal != null) goals[r.goal].classList.add('done');
      }
      await sleep(3800);
      if (!live()) return;
      show('Mission réussie !', 'ok');
      log('Tous les objectifs de la mission sont atteints.', 'ok');
      confetti($('.mis-pasture', root));
      runBtn.disabled = false;
    }

    runBtn.addEventListener('click', run);
    fixBtn.addEventListener('click', () => { fixed = true; load(); run(); });
    $$('[data-model]', root).forEach((b) => b.addEventListener('click', () => {
      model = MODELS.find((m) => m.id === b.dataset.model);
      fixed = false;
      $$('[data-model]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      load();
    }));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        visible = es.some((e) => e.isIntersecting);
        if (scene) scene.setVisible(visible);
      }).observe(field);
    } else visible = true;
    load();
  }

  /* ───────── the table of contents follows the reading; the theme ───────── */
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

  const FIGS = { film: filmFigure, desk: deskFigure, gallery: galleryFigure, build: buildFigure, mission: missionFigure };
  $$('[data-fig]').forEach((n) => {
    const fn = FIGS[n.dataset.fig];
    if (!fn) return;
    try { fn(n); } catch (e) { n.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; if (window.console) console.error(e); }
  });
  $$('[data-phone]').forEach((slot) => { if (!slot.closest('[data-fig="gallery"]')) phoneSlot(slot); });
  toc();
  theme();
}());
