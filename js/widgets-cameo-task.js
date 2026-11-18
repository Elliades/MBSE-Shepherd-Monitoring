/* A modelling chore that the plugin does for the students, from a button of the guide (Part 2, after Question 2).

   { widget: "cameoTask", opts: { task: "part2-predator", label, model } }

   The guide sends exercise/check and exercise/apply (category `exercise` of the mbseShepherd plugin, on its relay
   allow-list) through window.Bridge. apply is idempotent: a second click keeps what is there. Not linked: the button
   opens the pairing dialog of the Cameo button. The report of the plugin is shown as it comes, one row per exchange. */
(function () {
  const W = window.WIDGETS;
  if (!W) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const linked = () => !!(window.Bridge && window.Bridge.state && window.Bridge.state().status === 'connected');

  const STYLE = `
  .ct { display: grid; gap: 0.7rem; max-width: 46rem; }
  .ct-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem 0.9rem; }
  .ct-state { font-family: var(--font-mono); font-size: 0.86em; color: var(--ink-2); }
  .ct-state.ok { color: var(--grass); font-weight: 700; }
  .ct-state.bad { color: var(--amber); font-weight: 700; }
  .ct-table { width: 100%; border-collapse: collapse; font-size: 0.92em; }
  .ct-table th, .ct-table td { text-align: left; vertical-align: top; padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--line); }
  .ct-table th { font-family: var(--font-mono); font-size: 0.8em; font-weight: 700; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; }
  .ct-scroll { overflow-x: auto; }
  .ct-table code { font-family: var(--font-mono); font-size: 0.88em; overflow-wrap: anywhere; }
  .ct-sig { display: block; font-family: var(--font-mono); font-size: 0.88em; }
  .ct-more summary { cursor: pointer; color: var(--ink-2); font-size: 0.9em; }
  .ct-more ul { margin: 0.4rem 0 0; padding-left: 1.2rem; font-family: var(--font-mono); font-size: 0.82em; color: var(--ink-2); }
  @media (max-width: 40rem) { .ct-table thead { display: none; } .ct-table tr { display: grid; padding: 0.4rem 0; border-bottom: 1px solid var(--line); } .ct-table td { border: 0; padding: 0.1rem 0; } }
  .ct-row td:first-child { border-left: 4px solid transparent; }
  .ct-infrared td:first-child { border-left-color: var(--xk-ir); }
  .ct-alert td:first-child { border-left-color: var(--xk-al); }
  .ct-counter td:first-child { border-left-color: var(--xk-ca); }

  /* the colours of the three kinds: the plugin paints the ports and connectors of Cameo with the same ones
     (PredatorExchanges.Kind, #c62828 / #1f62c4 / #c46a00) */
  :root { --xk-ir: #c62828; --xk-al: #1f62c4; --xk-ca: #c46a00; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --xk-ir: #ff8a80; --xk-al: #84b5ff; --xk-ca: #f3b24a; } }
  :root[data-theme="dark"] { --xk-ir: #ff8a80; --xk-al: #84b5ff; --xk-ca: #f3b24a; }

  .xs { display: grid; gap: 0.6rem; max-width: 46rem; }
  .xs > svg { width: 100%; height: auto; display: block; }
  .xs .s-box { fill: var(--surface); stroke: var(--ink-2); stroke-width: 1.2; }
  .xs .xs-name { font: 700 11px var(--font-body); fill: var(--ink); }
  .xs .xs-sub { font: 9px var(--font-mono); fill: var(--ink-2); }
  .xs .xs-lbl { font: 700 8.5px var(--font-mono); }
  .xs .xs-tok-t { font: 700 9px var(--font-body); paint-order: stroke; stroke: var(--surface); stroke-width: 3px; }
  .xs [data-from], .xs [data-only] { opacity: 0; transition: opacity 0.45s var(--ease); }
  .xs [data-from].on, .xs [data-only].on { opacity: 1; }
  .xs .xs-port { stroke-width: 1.2; }
  .xs .xs-conn { fill: none; stroke-width: 2.4; }
  .xs .xs-ir { fill: var(--xk-ir); stroke: var(--xk-ir); color: var(--xk-ir); }
  .xs .xs-al { fill: var(--xk-al); stroke: var(--xk-al); color: var(--xk-al); }
  .xs .xs-ca { fill: var(--xk-ca); stroke: var(--xk-ca); color: var(--xk-ca); }
  .xs .xs-conn.xs-ir, .xs .xs-conn.xs-al, .xs .xs-conn.xs-ca { fill: none; }
  .xs text.xs-ir, .xs text.xs-al, .xs text.xs-ca { stroke: none; }
  .xs .xs-route { fill: none; stroke: none; }
  .xs .xs-dash { fill: none; stroke: var(--ink-3); stroke-width: 1; stroke-dasharray: 3 3; }
  .xs .xs-ib { fill: var(--surface); stroke: var(--xk-al); stroke-width: 1.4; }
  .xs .xs-todo { fill: none; stroke: var(--xk-ca); stroke-width: 1.4; stroke-dasharray: 4 3; }
  .xs .xs-q { font: 700 22px var(--font-body); fill: var(--xk-ca); }
  .xs .xs-drone .drone-rotor { fill: none; stroke: var(--ink-2); stroke-width: 1.2; }
  .xs .xs-drone .drone-body { fill: var(--ink-2); }
  .xs-chips .chip b { display: inline-grid; place-items: center; width: 1.25rem; height: 1.25rem; margin-right: 0.35rem; border-radius: 50%; background: var(--line); font-size: 0.78em; }
  .xs-chips .chip[aria-pressed="true"] b { background: var(--on-route); color: var(--route); }
  .xs-legend { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin: 0; padding: 0; list-style: none; font-size: 0.86em; color: var(--ink-2); }
  .xs-legend li::before { content: ""; display: inline-block; width: 0.8rem; height: 0.8rem; margin-right: 0.35rem; vertical-align: -0.1rem; border-radius: 2px; background: var(--k); }
  .xs-legend li.todo::before { background: none; border: 2px dashed var(--k); box-sizing: border-box; }
  `;
  let styled = false;

  function problemText(e, model) {
    const m = (e && e.message) || String(e || 'error');
    if (m === 'unknown-method') return 'Your plugin is too old for this button: install the latest one (Setup chapter), then restart Cameo.';
    if (m === 'not-connected') return 'The guide is not linked to Cameo any more: click the Cameo button at the top.';
    if (m === 'timeout') return 'Cameo did not answer in time. Is a dialog open in Cameo? Close it and try again.';
    if (/No block named|No part typed|No project is open/.test(m)) return `Open ${model} in Cameo, then try again. (${m})`;
    return 'Cameo says: ' + m;
  }

  function list(title, items) {
    if (!items || !items.length) return '';
    return `<details class="ct-more"><summary>${esc(title)} (${items.length})</summary><ul>${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`;
  }

  function reportHTML(r) {
    const rows = (r.exchanges || []).map((x) => `<tr class="ct-row ct-${esc(x.kind || '')}">
      <td>${esc(x.exchange)}</td>
      <td><code>${esc(x.from || x.port)}</code></td>
      <td><code>${esc(x.to || x.other)}</code></td>
      <td>${(x.signals || []).map((s) => `<span class="ct-sig">${esc(s)}</span>`).join('')}</td></tr>`).join('');
    return `<div class="ct-scroll"><table class="ct-table"><thead><tr><th>Exchange</th><th>From (port)</th><th>To (conjugated port)</th><th>Flow properties (signal)</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${list('Created in your model', r.created)}${list('Replaced', r.replaced)}${list('Already there, kept', r.kept)}${list('Warnings', r.warnings)}`;
  }

  const style = () => { if (!styled) { styled = true; const s = document.createElement('style'); s.textContent = STYLE; document.head.appendChild(s); } };

  /* What the button will do, told in four stages before the click: the connector of Task 1, the alerts relayed by the
     base station, what one exchange is made of, then what is left to the student: the counter actions from the drone to
     the bear, drawn as a question (no port, no signal name: Part 2 is marked). Same colours as in Cameo.

     { widget: "exchangeStory" } */
  W.exchangeStory = function (root) {
    const K = window.WidgetKit;
    if (!K) return;
    style();
    const { svg, el, txt, life, reduced, drone, move } = K;
    root.className = 'w xs';
    const watch = document.createElement('p');
    watch.className = 'watch-tag';
    watch.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>Explanation: what the button builds in Cameo, and what is left to you';
    const s = svg('0 74 440 186', 'The operational context in four stages. 1: the connector of Task 1, in red: Bear Signature goes from the bear to the infrared port of the drone. 2: in blue, the drone sends its alerts to the base station, which relays them to the shepherd; both connectors carry Predator Position and Predator entering safe perimiter. 3: one exchange in detail: each port is typed by the interface block IF_Predator_Alert, the receiving port is conjugated (~), and the button gives every port and connector it made these colours in Cameo. 4: your turn, in orange and dashed: something still has to go from the drone to the bear, the counter actions of your scenario.');
    root.append(watch, s);

    const box = (x, y, w, h, name, sub) => {
      el('rect', { x, y, width: w, height: h, rx: 4, class: 's-box' }, s);
      txt(s, x + w / 2, y + 15, name, 'xs-name', 'middle');
      if (sub) txt(s, x + w / 2, y + h - 7, sub, 'xs-sub', 'middle');
    };
    box(6, 96, 90, 60, 'Base station', 'groundStation');
    box(6, 208, 90, 46, 'Shepherd', 'uAV operator');
    box(150, 80, 100, 104, 'Drone', 'UAV');
    box(340, 80, 90, 104, 'Bear', 'bear');
    const icon = drone(s, 1.4);
    icon.setAttribute('class', 'drone xs-drone');
    move(icon, 200, 136);

    /* a port: a square on the border, filled with the colour of its kind; ~ marks the conjugated end */
    const port = (g, x, y, k, conj, dx, dy) => {
      el('rect', { x: x - 4.5, y: y - 4.5, width: 9, height: 9, class: 'xs-port xs-' + k }, g);
      if (conj) txt(g, x + (dx || 0), y + (dy || 0), '~', 'xs-lbl xs-' + k, 'middle');
    };
    const layer = (from, only) => el('g', only ? { 'data-only': only } : { 'data-from': from }, s);
    const conn = (g, d, k) => el('path', { d, class: 'xs-conn xs-' + k }, g);

    /* 1 · infrared, the connector of Task 1 */
    const g1 = layer(1);
    conn(g1, 'M250,104 H340', 'ir');
    port(g1, 250, 104, 'ir');
    port(g1, 340, 104, 'ir', true, 10, 3);
    txt(g1, 295, 116, 'infrared', 'xs-lbl xs-ir', 'middle');
    /* 2 · alerts, through the base station */
    const g2 = layer(2);
    conn(g2, 'M150,122 H96', 'al');
    conn(g2, 'M51,156 V208', 'al');
    port(g2, 150, 122, 'al');
    port(g2, 96, 122, 'al', true, -9, 3);
    port(g2, 51, 156, 'al');
    port(g2, 51, 208, 'al', true, -9, 3);
    txt(g2, 123, 134, 'alerts', 'xs-lbl xs-al', 'middle');
    txt(g2, 58, 196, 'relayed', 'xs-lbl xs-al', 'start');
    /* 3 · one exchange in detail: the interface block that types the four blue ports */
    const g3 = layer(0, 3);
    el('rect', { x: 150, y: 198, width: 280, height: 56, rx: 3, class: 'xs-ib' }, g3);
    txt(g3, 290, 211, '«interfaceBlock» IF_Predator_Alert', 'xs-sub', 'middle');
    el('line', { x1: 150, y1: 217, x2: 430, y2: 217, class: 'xs-dash' }, g3);
    txt(g3, 158, 231, 'out Predator Position', 'xs-lbl xs-al');
    txt(g3, 158, 245, 'out Predator entering safe perimiter', 'xs-lbl xs-al');
    [[160, 198, 152, 127], [150, 206, 100, 125], [150, 214, 56, 159], [150, 222, 56, 205]].forEach((d) =>
      el('path', { d: `M${d[0]},${d[1]} L${d[2]},${d[3]}`, class: 'xs-dash' }, g3));
    /* 4 · your turn: the counter actions, drawn as a question (how many, which ports, which signals: the student's answer) */
    const g4 = layer(0, 4);
    el('rect', { x: 258, y: 124, width: 74, height: 52, rx: 6, class: 'xs-todo' }, g4);
    txt(g4, 295, 158, '?', 'xs-q', 'middle');
    txt(g4, 295, 192, 'your turn', 'xs-lbl xs-ca', 'middle');

    /* what travels, per stage */
    const ROUTES = {
      1: [{ d: 'M340,104 H250', k: 'ir', t: 'Bear Signature' }],
      2: [{ d: 'M150,122 H51 V208', k: 'al', t: 'Predator Position', dy: 15 }],
      4: [{ d: 'M250,150 H340', k: 'ca', t: '' }]
    };
    const routes = {};
    Object.keys(ROUTES).forEach((k) => {
      routes[k] = ROUTES[k].map((r) => {
        const path = el('path', { d: r.d, class: 'xs-route' }, s);
        const tok = el('g', { 'data-only': k }, s);
        el('circle', { r: 4, class: 'xs-' + r.k }, tok);
        const label = txt(tok, 0, r.dy || -7, r.t, 'xs-tok-t xs-' + r.k, 'middle');
        return { path, tok, label };
      });
    });
    const at = (r, k) => {
      const p = r.path.getPointAtLength(r.path.getTotalLength() * k);
      r.tok.setAttribute('transform', `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`);
    };

    const STAGES = [
      { label: 'Your connector', text: 'The connector you drew in Task 1. The **Bear Signature** comes into the drone through its **infrared** port, as the signature of the sheep already does.' },
      { label: 'Alert the shepherd', text: 'The drone has no link with the shepherd. It sends its alerts to the **base station**, which **relays** them to the shepherd: **Predator Position** and **Predator entering safe perimiter**, on both connectors.' },
      { label: 'In your model', text: 'For each connector the button creates a **port** typed by an **interface block** (its flow properties are the signals, **in** or **out**), the **conjugated port ~** at the receiving end, and the **connector**. The four blue ports share **IF_Predator_Alert**: the base station relays the same information. In Cameo, what the button made takes **these colours**.', dwell: 5.5 },
      { label: 'Your turn', text: 'The drone must also act on the bear: the **counter actions** of your scenario. These connections are **yours**, built the same way: the **port**, its **interface block** and a **flow property typed by the signal**, then the **connector**.', dwell: 5.5 }
    ].map((x) => Object.assign(x, { text: x.text.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') }));

    const bar = document.createElement('div');
    bar.className = 'chips xs-chips';
    bar.innerHTML = STAGES.map((st, i) => `<button type="button" class="chip" aria-pressed="false" data-st="${i + 1}"><b>${i + 1}</b>${esc(st.label)}</button>`).join('') +
      '<button type="button" class="chip" aria-pressed="true" data-auto>▶ Auto</button>';
    const live = document.createElement('p');
    live.className = 'w-live';
    live.setAttribute('aria-live', 'polite');
    const legend = document.createElement('ul');
    legend.className = 'xs-legend';
    legend.innerHTML = '<li style="--k:var(--xk-ir)">Infrared acquisition</li><li style="--k:var(--xk-al)">Alerts to the shepherd</li><li class="todo" style="--k:var(--xk-ca)">Counter actions: yours</li>';
    root.append(bar, live, legend);
    const chips = Array.from(bar.querySelectorAll('[data-st]'));
    const autoBtn = bar.querySelector('[data-auto]');
    const L = life();
    let stage = 1;
    let t = 0;
    let auto = !reduced();
    function show(k) {
      stage = k;
      t = 0;
      s.querySelectorAll('[data-from]').forEach((n) => n.classList.toggle('on', +n.dataset.from <= k));
      s.querySelectorAll('[data-only]').forEach((n) => n.classList.toggle('on', +n.dataset.only === k));
      chips.forEach((c, i) => c.setAttribute('aria-pressed', String(i + 1 === k)));
      live.innerHTML = `<b>${k} · ${esc(STAGES[k - 1].label)}</b> ${STAGES[k - 1].text}`;
      (routes[k] || []).forEach((r) => at(r, reduced() ? 0.5 : 0));
    }
    const setAuto = (v) => { auto = v; autoBtn.setAttribute('aria-pressed', String(v)); };
    chips.forEach((c) => c.addEventListener('click', () => { setAuto(false); show(+c.dataset.st); }));
    autoBtn.addEventListener('click', () => { setAuto(!auto); if (auto && stage === STAGES.length) show(1); });
    show(1);
    if (reduced()) return L.end;
    const PER = 1.6;
    L.loop((dt) => {
      t += dt;
      (routes[stage] || []).forEach((r) => at(r, (t % PER) / PER));
      if (auto && t > (STAGES[stage - 1].dwell || 4.2)) show(stage === STAGES.length ? 1 : stage + 1);
    });
    return L.end;
  };

  W.cameoTask = function (root, opts, api) {
    style();
    const task = opts.task || 'part2-predator';
    const label = opts.label || 'Create them in my model';
    const model = opts.model || 'your model';
    let busy = false;
    let report = (api && api.get && api.get()) || null;
    let checked = null;
    let problem = '';

    root.className = 'w ct';
    const paint = () => {
      if (!root.isConnected) return;
      const on = linked();
      let state;
      if (busy) state = '<span class="ct-state">Cameo is working…</span>';
      else if (problem) state = `<span class="ct-state bad">${esc(problem)}</span>`;
      else if (!on) state = '<span class="ct-state">Pair this guide with Cameo first: the button does the work in your open model.</span>';
      else if (checked && checked.complete) state = '<span class="ct-state ok">Done: every exchange is in your model.</span>';
      else if (checked) state = `<span class="ct-state">${checked.exchanges.filter((x) => x.connected).length} of ${checked.exchanges.length} exchanges in your model.</span>`;
      else state = '<span class="ct-state">Linked to Cameo.</span>';
      root.innerHTML = `<div class="ct-bar">
          <button type="button" class="btn" data-ct-run${busy ? ' disabled' : ''}>${on ? esc(label) : 'Pair with Cameo'}</button>${state}
        </div>${report ? reportHTML(report) : ''}`;
    };

    const check = async () => {
      if (!linked()) { checked = null; paint(); return; }
      try { checked = await window.Bridge.call('exercise', 'check', [task], 15000); problem = ''; }
      catch (e) { checked = null; problem = problemText(e, model); }
      paint();
    };

    root.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-ct-run]') || busy) return;
      if (!linked()) { const b = document.getElementById('cameo-btn'); if (b) b.click(); return; }
      busy = true; problem = ''; paint();
      try {
        report = await window.Bridge.call('exercise', 'apply', [task], 60000);
        if (api && api.set) api.set(report);
        if (api && api.toast) api.toast('Done in Cameo: look at the Operational Context diagram.');
      } catch (err) { problem = problemText(err, model); }
      busy = false;
      await check();
    });

    let was = linked();
    const onLink = () => { const now = linked(); if (now !== was) { was = now; check(); } else paint(); };
    if (window.Bridge) window.Bridge.onChange(onLink);
    paint();
    check();
  };
})();
