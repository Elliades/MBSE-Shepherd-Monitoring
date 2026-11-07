/* The article "Valider la mission jusqu'au logique" (article/index.html): its interactive figures.

   - mission : the functional mission state machine of the predator use case, played scenario by scenario, in two
     versions (the TP mission, and the enriched one whose Mission Monitoring times the bear in the safe area);
   - scenario: the same scenarios as a classic sequence diagram, as an extended one (expected states), and as the
     file the scenario panel of Cameo plays;
   - build   : the logical architecture built stage by stage, each stage replayed with js/logical-engine.js on the
     specs of part3/content/archs.js and the stages of part3/content/config.js (the ones of Part 3);
   - toc     : the sticky table of contents, which follows the reading.
   No dependency; every figure works without the others. */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pause = (ms) => new Promise((res) => setTimeout(res, reduced() ? 0 : ms));
  function el(name, attrs, parent, text) {
    const n = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function svg(vb, label) {
    const s = el('svg', { viewBox: vb, role: 'img', 'aria-label': label });
    return s;
  }
  function arrow(s, d, cls) {
    return el('path', { d, class: 'a-arrow ' + (cls || ''), 'marker-end': 'url(#a-head)' }, s);
  }
  function defs(s) {
    const d = el('defs', {}, s);
    const m = el('marker', { id: 'a-head', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, d);
    el('path', { d: 'M0 0L10 5L0 10z', class: 'a-head' }, m);
  }

  /* ───────── the functional mission (predator use case) ───────── */

  /* Who sends each signal, for the sequence diagram. */
  const FROM = {
    'Start SOI': 'operator', 'FlightPlan Correct': 'operator', 'Start Sheep Guard Mission': 'operator',
    'Predator Detected inside tracking perimeter': 'pasture', 'Predator entering safe perimiter': 'pasture',
    'Predator leaving safe perimiter': 'pasture', 'Predator leaving tracking perimiter': 'pasture'
  };
  const TELL = {
    'Predator Detected inside tracking perimeter': '🐻 Un ours entre dans la zone de suivi',
    'Predator entering safe perimiter': '🐻 L’ours s’approche trop du troupeau',
    'Predator leaving safe perimiter': '🐻 L’ours recule',
    'Predator leaving tracking perimiter': '✅ L’ours est parti'
  };
  const PATROL = ['Perimeter watch', 'Sheep Monitoring', 'Predator Monitoring'];
  const LIMIT = 30;

  /* The scenarios of the use case "protéger le troupeau d'un prédateur", in the format of the scenario panel. */
  const SETUP = {
    name: 'Drone prêt et en patrouille', goal: 'Précondition : jouée, non mesurée.', setup: true,
    steps: [
      { signal: 'Start SOI', expect: { '<root>': 'Unconfigured' } },
      { signal: 'FlightPlan Correct', expect: { '<root>': 'Ready for Mission' } },
      { signal: 'Start Sheep Guard Mission', expect: { '<root>': PATROL.concat(['Mission Monitoring']) } }
    ]
  };
  const SCENARIOS = [
    {
      id: 'nominal', family: 'Nominal', short: 'Un ours passe',
      title: 'Un ours entre dans la zone de suivi, puis repart',
      objective: 'Le drone suit l’ours tant qu’il est dans la zone de suivi, puis reprend la patrouille.',
      steps: [
        { signal: 'Predator Detected inside tracking perimeter', note: 'Le pâturage signale un ours dans la zone de suivi.', expect: { '<root>': ['Predator tracking', 'Mission Monitoring'] } },
        { signal: 'Predator leaving tracking perimiter', note: 'L’ours sort de la zone : retour à la patrouille.', expect: { '<root>': PATROL.concat(['Mission Monitoring']) } }
      ]
    },
    {
      id: 'alt', family: 'Alternatif', short: 'L’ours approche puis recule',
      title: 'L’ours entre dans la zone de sécurité, la dissuasion le fait reculer',
      objective: 'Le drone dissuade l’ours (lumière, son) tant qu’il est trop près, puis le suit à nouveau, puis patrouille.',
      steps: [
        { signal: 'Predator Detected inside tracking perimeter', note: 'Un ours dans la zone de suivi.', expect: { '<root>': ['Predator tracking', 'Mission Monitoring'] } },
        { signal: 'Predator entering safe perimiter', note: 'L’ours entre dans la zone de sécurité : dissuasion.', expect: { '<root>': ['Predator counteraction', 'Mission Monitoring'] } },
        { signal: 'Predator leaving safe perimiter', note: 'L’ours recule : retour au suivi.', expect: { '<root>': ['Predator tracking', 'Mission Monitoring'] } },
        { signal: 'Predator leaving tracking perimiter', note: 'L’ours est parti.', expect: { '<root>': PATROL.concat(['Mission Monitoring']) } }
      ]
    },
    {
      id: 'dys', family: 'Dysfonctionnel', short: 'L’ours ne fuit pas',
      title: 'L’ours entre dans la zone de sécurité et ne fuit pas malgré la dissuasion',
      objective: 'Le suivi de mission mesure le temps passé par l’ours dans la zone de sécurité ; au-delà de 30 s, l’échec est détecté et l’opérateur est alerté.',
      reached: ['Safe Area Intrusion'],
      steps: [
        { signal: 'Predator Detected inside tracking perimeter', note: 'Un ours dans la zone de suivi.', expect: { '<root>': ['Predator tracking', 'Mission Monitoring'] } },
        { signal: 'Predator entering safe perimiter', note: 'L’ours entre dans la zone de sécurité et y reste.', timeout: 45, wait: LIMIT, expect: { '<root>': ['Predator counteraction', 'Predator Not Repelled'] } }
      ]
    }
  ];

  /* A replica of the two missions, close enough to the model to replay these scenarios. */
  function mission(enriched) {
    let phase = 'off';
    let mon = null;
    let since = 0;
    const out = [];
    function active() {
      const a = [];
      if (phase === 'off') a.push('Off');
      else if (phase === 'unconf') a.push('Unconfigured');
      else if (phase === 'ready') a.push('Ready for Mission');
      else {
        a.push('Deployed');
        if (phase === 'safe') a.push('Going to Safe Area');
        if (phase === 'patrol') a.push('Patrolling', ...PATROL);
        if (phase === 'track') a.push('Predator Detected', 'Predator tracking');
        if (phase === 'counter') a.push('Predator Detected', 'Predator counteraction');
        a.push('Mission Monitoring');
        if (mon === 'mon') a.push('Monitoring');
        if (mon === 'intr') a.push('Safe Area Intrusion');
        if (mon === 'norep') a.push('Predator Not Repelled');
      }
      return a;
    }
    return {
      active,
      clock: () => (mon === 'intr' ? since : null),
      inject(sig) {
        const t = [];
        const go = (to, label) => { t.push(label); phase = to; };
        if (sig === 'Start SOI' && phase === 'off') go('unconf', 'Off → Unconfigured');
        else if (sig === 'FlightPlan Correct' && phase === 'unconf') go('ready', 'Unconfigured → Configured → Ready for Mission');
        else if (sig === 'Start Sheep Guard Mission' && phase === 'ready') {
          go('safe', 'Ready for Mission → Going to Safe Area');
          mon = enriched ? 'mon' : 'mm';
          go('patrol', 'Going to Safe Area → Patrolling (Start Patrolling)');
        } else if (sig === 'Predator Detected inside tracking perimeter' && phase === 'patrol') go('track', 'Patrolling → Predator tracking');
        else if (sig === 'Predator entering safe perimiter' && phase === 'track') {
          go('counter', 'Predator tracking → Predator counteraction');
          if (mon === 'mon') { mon = 'intr'; since = 0; t.push('Monitoring → Safe Area Intrusion'); }
        } else if (sig === 'Predator leaving safe perimiter' && phase === 'counter') {
          go('track', 'Predator counteraction → Predator tracking');
          if (mon === 'intr') { mon = 'mon'; t.push('Safe Area Intrusion → Monitoring'); }
        } else if (sig === 'Predator leaving tracking perimiter' && (phase === 'track' || phase === 'counter')) {
          go('patrol', 'Predator Detected → Patrolling');
          if (mon === 'intr') { mon = 'mon'; t.push('Safe Area Intrusion → Monitoring'); }
        }
        return t;
      },
      tick(s) {
        if (mon !== 'intr') return [];
        since += s;
        if (since >= LIMIT) { mon = 'norep'; out.push('Predator Not Repelled'); return ['Safe Area Intrusion → Predator Not Repelled (after 30 s)']; }
        return [];
      },
      sent: () => out.slice()
    };
  }
  const wantList = (w) => [].concat(w);
  const holds = (want, have) => wantList(want).every((s) => have.indexOf(s) >= 0);

  /* Geometry of the drawing: state id -> box, and the states it lights. */
  function drawMission(s, enriched) {
    defs(s);
    const g = {};
    const box = (id, x, y, w, h, name, sub, cls) => {
      const grp = el('g', { class: 'm-st ' + (cls || ''), 'data-st': id }, s);
      el('rect', { x, y, width: w, height: h, rx: 10, class: 'm-box' }, grp);
      el('text', { x: x + w / 2, y: y + (sub ? h / 2 - 2 : h / 2 + 4), class: 'm-name', 'text-anchor': 'middle' }, grp, name);
      if (sub) el('text', { x: x + w / 2, y: y + h / 2 + 14, class: 'm-sub', 'text-anchor': 'middle' }, grp, sub);
      g[id] = grp;
      return grp;
    };
    const frame = (x, y, w, h, name, cls) => {
      const grp = el('g', { class: 'm-frame ' + (cls || '') }, s);
      el('rect', { x, y, width: w, height: h, rx: 14, class: 'm-frame-box' }, grp);
      el('text', { x: x + 14, y: y + 20, class: 'm-frame-name' }, grp, name);
      return grp;
    };
    const lab = (x, y, t, anchor) => el('text', { x, y, class: 'm-sig', 'text-anchor': anchor || 'middle' }, s, t);

    box('und', 20, 14, 190, 40, 'Undeployed', 'préparation, déjà validée', 'm-done');
    arrow(s, 'M115 54 V78');
    lab(124, 70, 'Start Sheep Guard Mission', 'start');
    frame(10, 80, 700, 400, 'Deployed');
    el('text', { x: 696, y: 100, class: 'm-region', 'text-anchor': 'end' }, s, 'région 1 · phase de mission');
    box('safe', 30, 150, 118, 46, 'Going to', 'Safe Area');
    const pat = frame(176, 112, 236, 214, 'Patrolling', 'm-sub-frame');
    pat.setAttribute('data-st', 'patrol');
    g.patrol = pat;
    box('pw', 192, 142, 204, 40, 'Perimeter watch');
    box('sm', 192, 204, 204, 40, 'Sheep Monitoring');
    box('pmon', 192, 266, 204, 40, 'Predator Monitoring');
    el('line', { x1: 186, x2: 402, y1: 193, y2: 193, class: 'm-dash' }, s);
    el('line', { x1: 186, x2: 402, y1: 255, y2: 255, class: 'm-dash' }, s);
    const pd = frame(450, 112, 246, 214, 'Predator Detected', 'm-sub-frame');
    pd.setAttribute('data-st', 'pd');
    g.pd = pd;
    box('track', 470, 146, 206, 44, 'Predator tracking', 'do / suivre l’ours');
    box('counter', 470, 258, 206, 44, 'Predator counteraction', 'do / lumière et son');
    arrow(s, 'M148 173 H174');
    arrow(s, 'M412 160 H448');
    lab(430, 152, 'ours détecté');
    arrow(s, 'M448 300 H414');
    lab(430, 318, 'ours parti');
    arrow(s, 'M540 190 V256');
    lab(534, 228, 'trop près', 'end');
    arrow(s, 'M610 258 V192');
    lab(616, 228, 'recule', 'start');
    el('line', { x1: 10, x2: 710, y1: 344, y2: 344, class: 'm-dash m-region-line' }, s);
    el('text', { x: 696, y: 364, class: 'm-region', 'text-anchor': 'end' }, s, 'région 2 · suivi de mission');
    if (enriched) {
      const mm = frame(26, 372, 668, 96, 'Mission Monitoring', 'm-sub-frame');
      mm.setAttribute('data-st', 'mm');
      g.mm = mm;
      box('mon', 44, 408, 150, 44, 'Monitoring');
      box('intr', 282, 408, 170, 44, 'Safe Area Intrusion', 'mesure le temps');
      box('norep', 530, 408, 150, 44, 'Predator Not Repelled', 'alerte l’opérateur', 'm-bad');
      arrow(s, 'M194 422 H280');
      lab(237, 414, 'trop près');
      arrow(s, 'M280 442 H196');
      lab(237, 460, 'recule / parti');
      arrow(s, 'M452 430 H528');
      lab(490, 422, 'after(30 s)');
      const clock = el('text', { x: 367, y: 401, class: 'm-clock', 'text-anchor': 'middle' }, s, '');
      g.clock = clock;
    } else {
      box('mm', 26, 384, 668, 64, 'Mission Monitoring', 'do / Mission monitoring : aucun sous-état, rien ne mesure le temps');
    }
    return g;
  }
  const LIGHT = {
    Off: 'und', Unconfigured: 'und', 'Ready for Mission': 'und', 'Going to Safe Area': 'safe',
    Patrolling: 'patrol', 'Perimeter watch': 'pw', 'Sheep Monitoring': 'sm', 'Predator Monitoring': 'pmon',
    'Predator Detected': 'pd', 'Predator tracking': 'track', 'Predator counteraction': 'counter',
    'Mission Monitoring': 'mm', Monitoring: 'mon', 'Safe Area Intrusion': 'intr', 'Predator Not Repelled': 'norep'
  };

  function missionFigure(root) {
    root.innerHTML = `
      <div class="fig-bar">
        <div class="seg" role="group" aria-label="Version de la mission">
          <button type="button" data-v="tp" aria-pressed="false">Mission du TP</button>
          <button type="button" data-v="rich" aria-pressed="true">Mission enrichie</button>
        </div>
        <div class="seg" role="group" aria-label="Scénario">
          ${SCENARIOS.map((sc, i) => `<button type="button" data-sc="${sc.id}" aria-pressed="${i === 0}"><small>${esc(sc.family)}</small>${esc(sc.short)}</button>`).join('')}
        </div>
      </div>
      <div class="m-wrap">
        <div class="m-art"></div>
        <aside class="m-side">
          <p class="m-story" aria-live="polite"></p>
          <div class="btn-row"><button type="button" class="btn" data-play>▶ Rejouer le scénario</button><button type="button" class="btn ghost" data-step>Pas à pas</button></div>
          <span class="label">Contrôles du scénario</span>
          <ol class="m-checks"></ol>
          <p class="m-verdict" aria-live="polite"></p>
          <span class="label">Envoyé à l’opérateur</span>
          <p class="m-out">rien pour l’instant</p>
        </aside>
      </div>`;
    const art = root.querySelector('.m-art');
    const story = root.querySelector('.m-story');
    const checks = root.querySelector('.m-checks');
    const verdict = root.querySelector('.m-verdict');
    const outEl = root.querySelector('.m-out');
    let enriched = true;
    let sc = SCENARIOS[0];
    let m;
    let g;
    let at = 0;
    let busy = false;
    let run = 0;

    function paint() {
      const a = m.active();
      Object.keys(g).forEach((k) => { if (g[k].classList) g[k].classList.remove('on'); });
      a.forEach((n) => { const id = LIGHT[n]; if (g[id]) g[id].classList.add('on'); });
      if (g.clock) { const c = m.clock(); g.clock.textContent = c == null ? '' : `⏱ ${Math.min(c, LIMIT)} s / ${LIMIT} s`; }
      const sent = m.sent();
      outEl.textContent = sent.length ? sent.join(', ') : 'rien pour l’instant';
      outEl.classList.toggle('m-out-on', sent.length > 0);
    }
    function load() {
      run += 1;
      busy = false;
      art.innerHTML = '';
      const s = svg('0 0 720 490', `Machine d’états de la mission, ${enriched ? 'enrichie' : 'du TP'}. Deployed a deux régions : la phase de mission (Going to Safe Area, Patrolling à trois régions, Predator Detected avec suivi et dissuasion) et le suivi de mission.`);
      art.appendChild(s);
      g = drawMission(s, enriched);
      m = mission(enriched);
      SETUP.steps.forEach((st) => m.inject(st.signal));
      at = 0;
      checks.innerHTML = sc.steps.map((st, i) => `<li data-i="${i}"><span class="mk">${i + 1}</span><span><b>${esc(TELL[st.signal] || st.signal)}</b><br><small>attendu : ${esc(wantList(st.expect['<root>']).join(', '))}</small></span></li>`).join('');
      story.innerHTML = `<b>${esc(sc.family)} · ${esc(sc.title)}</b><br><small>Précondition jouée : le drone est prêt et patrouille.</small>`;
      verdict.textContent = '';
      verdict.className = 'm-verdict';
      root.querySelector('[data-play]').disabled = false;
      root.querySelector('[data-step]').disabled = false;
      paint();
    }
    async function playStep(i, my) {
      const st = sc.steps[i];
      const li = checks.querySelector(`[data-i="${i}"]`);
      li.classList.add('now');
      story.innerHTML = `<b>${esc(TELL[st.signal] || st.signal)}</b><br><small>Le pâturage envoie <code>${esc(st.signal)}</code>.</small>`;
      m.inject(st.signal);
      paint();
      if (st.wait) {
        for (let t = 0; t < st.wait; t += 2) {
          await pause(120);
          if (my !== run) return false;
          m.tick(2);
          paint();
        }
      }
      await pause(500);
      if (my !== run) return false;
      const ok = holds(st.expect['<root>'], m.active());
      li.classList.remove('now');
      li.classList.add(ok ? 'ok' : 'ko');
      li.querySelector('.mk').textContent = ok ? '✓' : '✗';
      if (!ok) {
        const miss = wantList(st.expect['<root>']).filter((x) => m.active().indexOf(x) < 0);
        li.querySelector('small').insertAdjacentHTML('beforeend', `<br><span class="ko-t">jamais atteint : ${esc(miss.join(', '))}</span>`);
      }
      return ok;
    }
    function finish() {
      const bad = checks.querySelectorAll('.ko').length;
      const n = sc.steps.length;
      verdict.className = 'm-verdict ' + (bad ? 'ko' : 'ok');
      verdict.innerHTML = bad
        ? `<b>${bad} contrôle${bad > 1 ? 's' : ''} sur ${n} en échec.</b> ${sc.id === 'dys' && !enriched ? 'La mission du TP ne mesure pas le temps passé par l’ours : l’échec de la dissuasion n’est jamais détecté. Passez à la mission enrichie.' : ''}`
        : `<b>Scénario validé : ${n} contrôle${n > 1 ? 's' : ''} sur ${n}.</b>`;
      root.querySelector('[data-play]').disabled = true;
      root.querySelector('[data-step]').disabled = true;
    }
    async function play() {
      if (busy) return;
      busy = true;
      const my = run;
      root.querySelector('[data-play]').disabled = true;
      root.querySelector('[data-step]').disabled = true;
      for (; at < sc.steps.length; at += 1) {
        await pause(700);
        if (my !== run) return;
        await playStep(at, my);
      }
      busy = false;
      finish();
    }
    async function step() {
      if (busy || at >= sc.steps.length) return;
      busy = true;
      const my = run;
      await playStep(at, my);
      if (my !== run) return;
      at += 1;
      busy = false;
      if (at >= sc.steps.length) finish();
    }
    root.querySelector('[data-play]').addEventListener('click', play);
    root.querySelector('[data-step]').addEventListener('click', step);
    root.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
      enriched = b.dataset.v === 'rich';
      root.querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      load();
    }));
    root.querySelectorAll('[data-sc]').forEach((b) => b.addEventListener('click', () => {
      sc = SCENARIOS.find((x) => x.id === b.dataset.sc);
      root.querySelectorAll('[data-sc]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      load();
    }));
    load();
  }

  /* ───────── the scenarios: classic sequence diagram, extended one, file ───────── */
  function scenarioJson(sc) {
    const phase = { name: sc.short, goal: sc.objective, steps: sc.steps.map((st) => {
      const o = { signal: st.signal, note: st.note, expect: st.expect };
      if (st.timeout) o.timeout = st.timeout;
      return o;
    }) };
    if (sc.reached) phase.reached = { '<root>': sc.reached };
    return {
      title: sc.title,
      objective: sc.objective,
      useCase: 'Predator management',
      context: 'SOI - Pasture Sentinel',
      settle: 2,
      systems: [{ path: '<root>', label: 'Mission' }],
      phases: [SETUP, phase]
    };
  }
  function prettyJson(o) {
    const txt = JSON.stringify(o, null, 2)
      .replace(/\[\n\s+("[^"\n]*",?\n\s+)*"[^"\n]*"\n\s+\]/g, (m) => '[' + m.slice(1, -1).trim().split(/,\n\s+/).join(', ') + ']');
    return esc(txt).replace(/&quot;(expect|setup|reached|timeout)&quot;/g, '<mark>&quot;$1&quot;</mark>');
  }
  function sequence(s, sc, extended) {
    defs(s);
    const X = { operator: 90, mission: 360, pasture: 630 };
    const NAME = { operator: 'Opérateur', mission: 'Drone · mission', pasture: 'Pâturage (environnement)' };
    Object.keys(X).forEach((k) => {
      el('rect', { x: X[k] - 86, y: 10, width: 172, height: 34, rx: 8, class: 'q-head' + (k === 'mission' ? ' q-sys' : '') }, s);
      el('text', { x: X[k], y: 32, class: 'q-name', 'text-anchor': 'middle' }, s, NAME[k]);
    });
    let y = 70;
    const msgs = [];
    msgs.push({ kind: 'setup', text: 'Précondition : le drone est prêt et patrouille' });
    sc.steps.forEach((st) => {
      msgs.push({ kind: 'msg', from: FROM[st.signal] || 'pasture', to: 'mission', text: st.signal });
      if (st.wait) msgs.push({ kind: 'time', text: `${st.wait} s passent, l’ours reste` });
      if (st.wait) msgs.push({ kind: 'msg', from: 'mission', to: 'operator', text: 'Predator Not Repelled' });
      if (extended) msgs.push({ kind: 'state', text: wantList(st.expect['<root>']).join(' · ') });
    });
    const h = 70 + msgs.reduce((n, m) => n + (m.kind === 'state' ? 46 : 40), 0) + 20;
    s.setAttribute('viewBox', `0 0 720 ${h}`);
    Object.keys(X).forEach((k) => el('line', { x1: X[k], x2: X[k], y1: 44, y2: h - 10, class: 'q-life' }, s));
    msgs.forEach((m) => {
      if (m.kind === 'setup' || m.kind === 'time') {
        el('rect', { x: 150, y: y - 4, width: 420, height: 26, rx: 6, class: m.kind === 'time' ? 'q-time' : 'q-ref' }, s);
        el('text', { x: 360, y: y + 13, class: 'q-note', 'text-anchor': 'middle' }, s, m.kind === 'time' ? '⏱ ' + m.text : m.text);
        y += 40;
      } else if (m.kind === 'msg') {
        const a = X[m.from];
        const b = X[m.to];
        arrow(s, `M${a} ${y + 12} H${b + (b > a ? -4 : 4)}`, 'q-msg');
        el('text', { x: (a + b) / 2, y: y + 4, class: 'q-sig', 'text-anchor': 'middle' }, s, m.text);
        y += 40;
      } else {
        const w = Math.min(560, 40 + m.text.length * 6.6);
        el('rect', { x: X.mission - w / 2, y: y - 6, width: w, height: 30, rx: 15, class: 'q-state' }, s);
        el('text', { x: X.mission, y: y + 13, class: 'q-state-t', 'text-anchor': 'middle' }, s, m.text);
        y += 46;
      }
    });
  }
  function scenarioFigure(root) {
    root.innerHTML = `
      <div class="fig-bar">
        <div class="seg" role="group" aria-label="Scénario">
          ${SCENARIOS.map((sc, i) => `<button type="button" data-sc="${sc.id}" aria-pressed="${i === 2}"><small>${esc(sc.family)}</small>${esc(sc.short)}</button>`).join('')}
        </div>
        <div class="seg" role="tablist" aria-label="Vue">
          <button type="button" data-view="classic" aria-pressed="false">Diagramme de séquence classique</button>
          <button type="button" data-view="extended" aria-pressed="true">Étendu : états attendus</button>
          <button type="button" data-view="file" aria-pressed="false">Fichier rejoué</button>
        </div>
      </div>
      <div class="q-art"></div>
      <p class="fig-note"></p>`;
    const art = root.querySelector('.q-art');
    const note = root.querySelector('.fig-note');
    let sc = SCENARIOS[2];
    let view = 'extended';
    const NOTE = {
      classic: 'Ce que montre un diagramme de séquence classique : qui envoie quoi. Rien ne dit dans quel état doit être la mission après chaque message, ni ce qui doit se passer quand rien n’arrive.',
      extended: 'Le même scénario, avec l’état attendu de la mission après chaque étape (toutes les régions actives à la fois). C’est ce qui donne un verdict.',
      file: 'Le fichier que le panneau de simulation de Cameo rejoue : la précondition, les étapes, les états attendus, un délai pour l’étape qui attend l’échec, un contrôle « atteint au moins une fois ». Le diagramme de séquence en est régénéré.'
    };
    function show() {
      art.innerHTML = '';
      if (view === 'file') {
        art.innerHTML = `<pre class="code"><code>${prettyJson(scenarioJson(sc))}</code></pre>`;
      } else {
        const s = svg('0 0 720 400', `Diagramme de séquence ${view === 'classic' ? 'classique' : 'étendu'} du scénario ${sc.short}.`);
        art.appendChild(s);
        sequence(s, sc, view === 'extended');
      }
      note.textContent = NOTE[view];
    }
    root.querySelectorAll('[data-sc]').forEach((b) => b.addEventListener('click', () => {
      sc = SCENARIOS.find((x) => x.id === b.dataset.sc);
      root.querySelectorAll('[data-sc]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      show();
    }));
    root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      view = b.dataset.view;
      root.querySelectorAll('[data-view]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      show();
    }));
    show();
  }

  /* ───────── the logical architecture, stage by stage ───────── */
  const STAGE_FR = {
    prep: { t: 'Socle', d: 'Mise sous tension, configuration, liaison sol, autopilote' },
    start: { t: 'Départ', d: 'L’orchestrateur et ses premiers modes' },
    patrol: { t: 'Patrouille', d: 'La patrouille de zone' },
    sheep: { t: 'Moutons', d: 'La surveillance du troupeau' },
    raw: { t: 'Ours, sans patch', d: 'La gestion prédateur branchée, rien d’autre' },
    bear: { t: 'Ours', d: 'Gestion prédateur et suivi' },
    deter: { t: 'Dissuasion', d: 'Les modes de dissuasion' },
    full: { t: 'Tout', d: 'Le scénario complet' }
  };
  const SIG_FR = {
    'Start SOI': 'Mise sous tension', 'FlightPlan Incorrect': 'Un plan de vol faux', 'FlightPlan Correct': 'Un bon plan de vol',
    'Start Sheep Guard Mission': 'L’opérateur lance la mission', 'Sheep Signature': 'Le troupeau est en vue',
    'Sheep Out Of Zone': 'Un mouton sort de la zone', 'Predator Detected inside tracking perimeter': 'Un ours entre dans la zone de suivi',
    'Predator entering safe perimiter': 'L’ours s’approche trop', 'Predator leaving safe perimiter': 'L’ours recule',
    'Predator leaving tracking perimiter': 'L’ours est parti'
  };
  const ARCH_FR = { 3: 'Orchestrateur central', 1: 'Orchestrateur et fonctionnalités autonomes', 2: 'Sans chef (le « patch »)' };

  function buildFigure(root) {
    const ARCHS = window.LOGICAL_ARCHS || {};
    const AC = (window.COURSE_CONFIG || {}).archs || {};
    const ST = AC.stages || {};
    if (!window.LogicalEngine || !ARCHS['3'] || !ST.list) { root.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; return; }
    const PARTS = AC.parts || {};
    const short = (p) => p.replace(/^soi\./, '');
    const lab = (p) => (PARTS[short(p)] || {}).label || short(p);
    const partType = (k, n) => ARCHS[k].soi.parts.find((p) => p.name === n).type;
    function stateNames(r) {
      const out = [];
      (r.states || []).forEach((s) => { out.push(s.name); out.push(...stateNames(s)); (s.regions || []).forEach((x) => out.push(...stateNames(x))); });
      return out;
    }
    function stageOf(k, id) {
      const list = ST.list;
      const at = list.findIndex((x) => x.id === id);
      const def = list[at];
      let built = (ST.tech || []).slice();
      let made = [];
      list.slice(0, at + 1).forEach((x) => { built = built.concat(((x.add || {})[k]) || []); made = made.concat(((x.states || {})[k]) || []); });
      const drop = Object.assign({}, (def.drop || {})[k]);
      if (def.id === 'full') built = null;
      else if ((AC[k] || {}).decider) {
        const type = partType(k, AC[k].decider);
        drop[type] = stateNames(ARCHS[k].blocks.find((b) => b.name === type).stm).filter((n) => made.indexOf(n) < 0);
      }
      return { def, built, drop, setup: def.setup || [], steps: def.steps || [], mute: (def.mute || {})[k] || [], expect: (def.expect || {})[k] || {}, added: (def.add || {})[k] || [] };
    }
    const allSteps = (arch) => { const o = []; arch.scenario.phases.forEach((ph) => ph.steps.forEach((s) => o.push(s))); return o; };
    function stageExpect(k, stage, i, st) {
      const any = (AC[k] || {}).anyName || {};
      const o = {};
      const src = stage.expect[i] || st.expect;
      Object.keys(src).forEach((p) => { if (!stage.built || stage.built.indexOf(short(p)) >= 0) o[p] = [].concat(src[p]).map((w) => any[w] || w); });
      return o;
    }
    const wantTxt = (w) => [].concat(w).map((x) => (x.charAt(0) === '!' ? 'pas ' + x.slice(1) : x)).join(', ');

    let key = '3';
    let stageId = 'prep';
    let run = 0;
    root.innerHTML = `
      <div class="fig-bar">
        <div class="seg" role="group" aria-label="Architecture">
          <button type="button" data-k="3" aria-pressed="true">${ARCH_FR[3]}</button>
          <button type="button" data-k="2" aria-pressed="false">${ARCH_FR[2]}</button>
        </div>
      </div>
      <ol class="b-stages" aria-label="Incréments"></ol>
      <div class="b-wrap">
        <div class="b-art"></div>
        <aside class="m-side">
          <p class="m-story" aria-live="polite"></p>
          <div class="btn-row"><button type="button" class="btn" data-play>▶ Rejouer l’incrément</button></div>
          <span class="label">Contrôles</span>
          <ol class="m-checks"></ol>
          <p class="m-verdict" aria-live="polite"></p>
          <div class="b-msg-label"><span class="label">Messages échangés <b class="b-count">0</b></span><ol class="b-msgs"></ol></div>
        </aside>
      </div>`;
    const stagesEl = root.querySelector('.b-stages');
    const art = root.querySelector('.b-art');
    const story = root.querySelector('.m-story');
    const checks = root.querySelector('.m-checks');
    const verdict = root.querySelector('.m-verdict');
    const msgs = root.querySelector('.b-msgs');
    const count = root.querySelector('.b-count');
    let sim;
    let stage;
    let steps;
    let boxes = {};
    let total = 0;

    function stageList() {
      const ids = ST.list.map((x) => x.id).filter((id) => STAGE_FR[id] && (id !== 'raw' || key === '2'));
      if (ids.indexOf(stageId) < 0) stageId = 'prep';
      stagesEl.innerHTML = ids.map((id, n) => `<li><button type="button" data-stage="${id}" aria-pressed="${id === stageId}"><b>${n + 1}</b> ${esc(STAGE_FR[id].t)}</button></li>`).join('');
      stagesEl.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', () => { stageId = b.dataset.stage; stageList(); load(); }));
    }
    function draw() {
      art.innerHTML = '';
      const arch = ARCHS[key];
      const parts = arch.soi.parts.map((p) => p.name);
      const tech = (ST.tech || []).filter((p) => parts.indexOf(p) >= 0);
      const feat = parts.filter((p) => tech.indexOf(p) < 0);
      const W = 172;
      const H = 70;
      const gap = 14;
      const rowW = (n) => n * W + (n - 1) * gap;
      const vbW = Math.max(rowW(tech.length), rowW(feat.length)) + 40;
      const s = svg(`0 0 ${vbW} 260`, 'Les composants logiques, socle et fonctionnalités, avec leur état courant.');
      art.appendChild(s);
      boxes = {};
      const row = (list, y, title) => {
        const x0 = (vbW - rowW(list.length)) / 2;
        el('text', { x: x0, y: y - 10, class: 'b-row' }, s, title);
        list.forEach((p, i) => {
          const x = x0 + i * (W + gap);
          const built = !stage.built || stage.built.indexOf(p) >= 0;
          const fresh = stage.added.indexOf(p) >= 0;
          const g = el('g', { class: 'b-part' + (built ? '' : ' ghost') + (fresh ? ' fresh' : '') + ((PARTS[p] || {}).tech ? ' tech' : '') }, s);
          g.style.setProperty('--c', (PARTS[p] || {}).color || '#888');
          el('rect', { x, y, width: W, height: H, rx: 10, class: 'b-box' }, g);
          el('rect', { x, y, width: 6, height: H, rx: 3, class: 'b-band' }, g);
          el('text', { x: x + 14, y: y + 22, class: 'b-name' }, g, lab(p));
          const st = el('text', { x: x + 14, y: y + 44, class: 'b-st' }, g, built ? '' : 'pas encore construit');
          const st2 = el('text', { x: x + 14, y: y + 60, class: 'b-st' }, g, '');
          if (fresh) el('text', { x: x + W - 10, y: y + H - 8, class: 'b-new', 'text-anchor': 'end' }, g, 'nouveau');
          boxes['soi.' + p] = { g, st, st2, built };
        });
      };
      row(tech, 36, 'SOCLE');
      row(feat, 166, 'FONCTIONNALITÉS');
    }
    function paint() {
      Object.keys(boxes).forEach((path) => {
        const b = boxes[path];
        if (!b.built || !sim.has(path)) return;
        const leaves = sim.leaves(path);
        b.st.textContent = leaves[0] || '';
        b.st2.textContent = leaves.slice(1).join(', ');
      });
    }
    function load() {
      run += 1;
      total = 0;
      count.textContent = '0';
      msgs.innerHTML = '';
      const arch = ARCHS[key];
      const every = allSteps(arch);
      stage = stageOf(key, stageId);
      sim = window.LogicalEngine.create(arch, stage.built ? { only: stage.built, drop: stage.drop, mute: stage.mute } : undefined);
      stage.setup.forEach((i) => sim.inject(every[i].signal, every[i].into));
      steps = stage.steps.map((i) => Object.assign({}, every[i], { expect: stageExpect(key, stage, i, every[i]) }));
      draw();
      paint();
      const fr = STAGE_FR[stageId];
      story.innerHTML = `<b>${esc(fr.t)} · ${esc(fr.d)}</b><br><small>${stage.setup.length ? 'Les incréments précédents sont rejoués en précondition.' : 'Premier incrément.'}</small>`;
      checks.innerHTML = steps.map((st, i) => {
        const exp = Object.keys(st.expect).map((p) => `${esc(lab(p))} : ${esc(wantTxt(st.expect[p]))}`).join('<br>');
        return `<li data-i="${i}"><span class="mk">${i + 1}</span><span><b>${esc(SIG_FR[st.signal] || st.signal)}</b><br><small>${exp || 'rien à contrôler ici'}</small></span></li>`;
      }).join('');
      verdict.textContent = '';
      verdict.className = 'm-verdict';
      root.querySelector('[data-play]').disabled = false;
    }
    async function play() {
      const my = run;
      const btn = root.querySelector('[data-play]');
      btn.disabled = true;
      let bad = 0;
      let n = 0;
      for (let i = 0; i < steps.length; i += 1) {
        const st = steps[i];
        const li = checks.querySelector(`[data-i="${i}"]`);
        li.classList.add('now');
        story.innerHTML = `<b>${esc(SIG_FR[st.signal] || st.signal)}</b><br><small><code>${esc(st.signal)}</code>, injecté par ${st.into === 'operator' ? 'l’opérateur' : 'le pâturage'}.</small>`;
        await pause(500);
        if (my !== run) return;
        const events = sim.inject(st.signal, st.into);
        for (const e of events) {
          if (e.kind !== 'msg') continue;
          total += 1;
          count.textContent = String(total);
          const lm = document.createElement('li');
          lm.innerHTML = `<b>${esc(lab(e.from))}</b> → <b>${esc(lab(e.to))}</b> <span>${esc(e.signal)}</span>`;
          msgs.prepend(lm);
          while (msgs.children.length > 6) msgs.lastChild.remove();
          const b = boxes[e.to];
          if (b) { b.g.classList.remove('pulse'); void b.g.getBoundingClientRect(); b.g.classList.add('pulse'); }
          await pause(90);
          if (my !== run) return;
        }
        paint();
        const res = sim.check(st.expect);
        li.classList.remove('now');
        const ko = res.filter((r) => !r.ok);
        n += 1;
        if (ko.length) bad += 1;
        li.classList.add(ko.length ? 'ko' : 'ok');
        li.querySelector('.mk').textContent = ko.length ? '✗' : '✓';
        ko.forEach((r) => {
          li.querySelector('small').insertAdjacentHTML('beforeend', `<br><span class="ko-t">${esc(lab(r.path))} est en ${esc(sim.leaves(r.path).join(', ') || 'aucun état')}</span>`);
          if (boxes[r.path]) boxes[r.path].g.classList.add('bad');
        });
        await pause(400);
        if (my !== run) return;
      }
      verdict.className = 'm-verdict ' + (bad ? 'ko' : 'ok');
      verdict.innerHTML = bad
        ? `<b>${bad} étape${bad > 1 ? 's' : ''} en échec sur ${n}.</b> ${stageId === 'raw' ? 'Sans le patch, personne ne suspend la surveillance des moutons ni ne rend l’autopilote à la patrouille.' : ''}`
        : `<b>Incrément validé : ${n} étape${n > 1 ? 's' : ''} sur ${n}.</b>`;
    }
    root.querySelector('[data-play]').addEventListener('click', play);
    root.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
      key = b.dataset.k;
      root.querySelectorAll('[data-k]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      stageList();
      load();
    }));
    stageList();
    load();
  }

  /* ───────── the table of contents follows the reading ───────── */
  function toc() {
    const links = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
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
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    btn.addEventListener('click', () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      const next = dark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* private window */ }
    });
  }

  const FIGS = { mission: missionFigure, scenario: scenarioFigure, build: buildFigure };
  document.querySelectorAll('[data-fig]').forEach((n) => { if (!FIGS[n.dataset.fig]) return; try { FIGS[n.dataset.fig](n); } catch (e) { n.innerHTML = '<p class="fig-note">Figure indisponible.</p>'; if (window.console) console.error(e); } });
  toc();
  theme();
}());
