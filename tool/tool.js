/* The demo tool: a modeling-tool window (containment tree, diagrams, specification, simulation
   console) that drives the guide the way the Cameo plugin does. It joins the relay as the plugin
   (relay/src/relay.js, /v1/plugin), so the guide paired with its code sees a "Cameo" that:
   - publishes the simulation: { signal, id } at each transition, then { type: info, event: state }
   - answers "Open / Find in Cameo": browser/select, browser/selectByName, diagram/open,
     diagram/openByName, model/getElementsByName (js/bridge.js of the guide)
   Nothing is edited here: the model is fixed (tool/model.js), the diagrams too (tool/diagrams.js),
   and the stages of the exercise are played from the presenter panel (P key).

   Address: ?code=ABCDEF (pairing code to take), ?relay=online|here|wss://host/relay, ?diagram=<key of tool/diagrams.js>,
   ?stage=start|IF|A|B|C|D|E|all,
   ?presenter=1 (open the presenter panel). */
(function () {
  const M = window.ToolModel;
  const DG = window.ToolDiagrams;
  const params = new URLSearchParams(location.search);
  const CODE_KEY = 'sysml-tool:code';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ───────── what is built ───────── */
  const ORDER = M.STAGES.map((s) => s.key);
  const built = new Set();
  (function initialStage() {
    const want = params.get('stage') || 'all';
    if (want === 'start') return;
    const upTo = want === 'all' ? ORDER.length - 1 : ORDER.indexOf(want);
    ORDER.slice(0, upTo + 1).forEach((k) => built.add(k));
  })();
  let born = null;
  let bornTimer = 0;
  const exists = (node) => !node.stage || built.has(node.stage);

  /* ───────── icons of the tree ───────── */
  const DIAGRAM_TYPES = { ibd: 'ibd', ucd: 'uc', sd: 'sd', stm: 'stm', ad: 'act', matrix: 'mx', bdd: 'bdd' };
  const ICON = {
    model: '<path d="M2 4h5l1.5 2H14v7H2z" class="i-pkg"/><circle cx="8" cy="9.5" r="2" class="i-dot"/>',
    package: '<path d="M2 4h5l1.5 2H14v7H2z" class="i-pkg"/>',
    block: '<rect x="2.5" y="3" width="11" height="10" rx="1" class="i-block"/><path d="M2.5 6.5h11" class="i-line"/>',
    iface: '<rect x="2.5" y="3" width="11" height="10" rx="1" class="i-iface"/><circle cx="8" cy="9" r="2" class="i-line"/>',
    signal: '<path d="M2.5 4h8l3 4-3 4h-8z" class="i-signal"/>',
    activity: '<rect x="2" y="4" width="12" height="8" rx="3.5" class="i-act"/>',
    statemachine: '<rect x="2" y="3" width="12" height="10" rx="3" class="i-state"/><path d="M5 8h6M9 6l2 2-2 2" class="i-line"/>',
    region: '<rect x="2" y="3" width="12" height="10" rx="2" class="i-region"/>',
    state: '<rect x="2" y="4" width="12" height="8" rx="3" class="i-state"/>',
    usecase: '<ellipse cx="8" cy="8" rx="6.2" ry="4" class="i-uc"/>',
    actor: '<circle cx="8" cy="4.2" r="2" class="i-line"/><path d="M8 6.2v4.3M4.5 8h7M8 10.5l-3 3.5M8 10.5l3 3.5" class="i-line"/>',
    requirement: '<rect x="3" y="2.5" width="10" height="11" rx="1" class="i-req"/><path d="M5 6h6M5 8.5h6M5 11h4" class="i-line"/>'
  };
  function icon(type) {
    if (DIAGRAM_TYPES[type]) {
      return `<svg class="ic ic-dg" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.5h7l3 3v10H3z" class="i-page"/><text x="8" y="12" class="i-tag">${DIAGRAM_TYPES[type]}</text></svg>`;
    }
    return `<svg class="ic" viewBox="0 0 16 16" aria-hidden="true">${ICON[type] || ICON.block}</svg>`;
  }
  const KIND_NAME = {
    model: 'Model', package: 'Package', block: 'Block', iface: 'Interface Block', signal: 'Signal', activity: 'Activity',
    statemachine: 'State Machine', region: 'Region', state: 'State', usecase: 'Use Case', actor: 'Actor', requirement: 'Requirement',
    ibd: 'Internal Block Diagram', ucd: 'Use Case Diagram', sd: 'Sequence Diagram', stm: 'State Machine Diagram',
    ad: 'Activity Diagram', matrix: 'Allocation Matrix', bdd: 'Block Definition Diagram'
  };

  /* ───────── containment tree ───────── */
  const expanded = new Set([M.ROOT.id]);
  (M.ROOT.kids || []).forEach((k) => expanded.add(k.id));
  let selected = null;

  function renderTree() {
    const rows = [];
    (function add(node, depth) {
      if (!exists(node)) return;
      const kids = (node.kids || []).filter(exists);
      const open = expanded.has(node.id);
      rows.push(`<div class="tr-row${node.id === selected ? ' sel' : ''}${node.stage && node.stage === born ? ' born' : ''}" role="treeitem" data-id="${esc(node.id)}"
        aria-level="${depth + 1}" ${kids.length ? `aria-expanded="${open}"` : ''} aria-selected="${node.id === selected}" style="--d:${depth}">
        <span class="tr-caret${kids.length ? '' : ' none'}" data-caret>${kids.length ? '<svg viewBox="0 0 10 10"><path d="M3 2l4 3-4 3"/></svg>' : ''}</span>
        ${icon(node.type)}<span class="tr-name">${esc(node.name)}</span></div>`);
      if (open) kids.forEach((k) => add(k, depth + 1));
    })(M.ROOT, 0);
    $('#tree').innerHTML = rows.join('');
    let count = 0;
    M.walk((nd) => { if (exists(nd)) count += 1; });
    $('#sb-elements').textContent = `${count} elements`;
  }
  $('#tree').addEventListener('click', (e) => {
    const row = e.target.closest('.tr-row');
    if (!row) return;
    const id = row.dataset.id;
    if (e.target.closest('[data-caret]')) {
      if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
      renderTree();
      return;
    }
    select(id);
  });
  $('#tree').addEventListener('dblclick', (e) => {
    const row = e.target.closest('.tr-row');
    if (!row) return;
    const node = M.byId(row.dataset.id);
    if (node.diagram) openDiagram(node.diagram);
    else if (node.kids) { if (expanded.has(node.id)) expanded.delete(node.id); else expanded.add(node.id); renderTree(); }
  });

  /* Expand down to an element, select it and scroll it into view. */
  function reveal(node, flash) {
    for (let at = M.parentOf(node); at; at = M.parentOf(at)) expanded.add(at.id);
    select(node.id);
    const row = $(`.tr-row[data-id="${CSS.escape(node.id)}"]`);
    if (row) {
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (flash) { row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash'); }
    }
  }

  /* ───────── selection and specification ───────── */
  function select(id) {
    selected = id;
    renderTree();
    renderSpec();
    paintSelection();
  }
  function renderSpec() {
    const node = selected && M.byId(selected);
    if (!node) { $('#spec').innerHTML = '<p class="spec-empty">Select an element in the tree or on a diagram.</p>'; return; }
    const owner = M.parentOf(node);
    const kind = KIND_NAME[node.type] || node.type;
    const used = [];
    if (node.type === 'signal') {
      M.SIM.transitions.filter((t) => t.signal === node.name && (!t.stage || built.has(t.stage)))
        .forEach((t) => used.push(`Trigger of ${stateName(t.from)} → ${stateName(t.to)}`));
    }
    const rows = [
      ['Name', esc(node.name)],
      ['Element type', `${icon(node.type)} ${esc(kind)}`],
      ['Owner', owner ? `${icon(owner.type)} ${esc(owner.name)}` : '—'],
      ['Qualified name', `<span class="mono">${esc(M.pathOf(node).join('::'))}</span>`],
      ['ID', `<span class="mono small">${esc(node.id)}</span>`]
    ];
    if (node.doc) rows.push(['Documentation', esc(node.doc)]);
    if (used.length) rows.push(['Used by', used.map(esc).join('<br>')]);
    $('#spec').innerHTML = `<div class="spec-head">${icon(node.type)}<div><b>${esc(node.name)}</b><span>«${esc(kind)}»</span></div></div>
      <table class="spec-table">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</table>`;
  }
  function stateName(id) {
    const names = { 's-deployed': 'Deployed', 's-undeployed': 'Undeployed', 's-pred': 'Predator Detected' };
    return (M.SIM.states[id] && M.SIM.states[id].step) || names[id] || id;
  }

  /* ───────── diagram tabs and canvas ───────── */
  const tabs = [];
  let current = null;
  let zoom = 'fit';
  const canvas = $('#canvas');

  function diagramExists(key) {
    const def = DG.DEFS[key];
    return def && (!def.stage || built.has(def.stage));
  }
  function diagramNode(key) {
    let found = null;
    M.walk((nd) => { if (!found && nd.diagram === key) found = nd; });
    return found;
  }
  function openDiagram(key) {
    if (!diagramExists(key)) return false;
    if (!tabs.includes(key)) tabs.push(key);
    current = key;
    renderTabs();
    renderCanvas();
    return true;
  }
  function closeDiagram(key) {
    const i = tabs.indexOf(key);
    if (i < 0) return;
    tabs.splice(i, 1);
    if (current === key) current = tabs[Math.min(i, tabs.length - 1)] || null;
    renderTabs();
    renderCanvas();
  }
  function renderTabs() {
    $('#tabs').innerHTML = tabs.map((key) => {
      const def = DG.DEFS[key];
      const node = diagramNode(key);
      return `<div class="tab${key === current ? ' on' : ''}" role="tab" aria-selected="${key === current}" data-tab="${key}">
        ${icon(node ? node.type : def.kind)}<span>${esc(def.title)}</span><button type="button" class="tab-x" data-close="${key}" aria-label="Close ${esc(def.title)}">×</button></div>`;
    }).join('');
  }
  $('#tabs').addEventListener('click', (e) => {
    const x = e.target.closest('[data-close]');
    if (x) { closeDiagram(x.dataset.close); return; }
    const t = e.target.closest('[data-tab]');
    if (t) { current = t.dataset.tab; renderTabs(); renderCanvas(); }
  });

  function renderCanvas() {
    canvas.innerHTML = '';
    if (!current) {
      canvas.innerHTML = '<div class="canvas-empty"><p>No diagram open.</p><p>Double-click a diagram in the Containment tree.</p></div>';
      $('#zoom-val').textContent = '';
      return;
    }
    const svg = DG.render(current, { built, born });
    canvas.appendChild(svg);
    applyZoom();
    paintSim();
    paintSelection();
    paintTokens();
  }
  function applyZoom() {
    const svg = canvas.querySelector('svg');
    if (!svg) return;
    const def = DG.DEFS[current];
    const z = zoom === 'fit' ? Math.min((canvas.clientWidth - 32) / def.w, (canvas.clientHeight - 32) / def.h) : zoom;
    svg.style.width = Math.round(def.w * z) + 'px';
    svg.style.height = Math.round(def.h * z) + 'px';
    $('#zoom-val').textContent = Math.round(z * 100) + '%';
  }
  window.addEventListener('resize', () => { if (zoom === 'fit') applyZoom(); });
  $('#zoom').addEventListener('click', (e) => {
    const b = e.target.closest('[data-zoom]');
    if (!b || !current) return;
    const def = DG.DEFS[current];
    const now = zoom === 'fit' ? Math.min((canvas.clientWidth - 32) / def.w, (canvas.clientHeight - 32) / def.h) : zoom;
    if (b.dataset.zoom === 'fit') zoom = 'fit';
    else zoom = Math.max(0.3, Math.min(2.5, Math.round((now + (b.dataset.zoom === 'in' ? 0.1 : -0.1)) * 10) / 10));
    applyZoom();
  });
  canvas.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-el]');
    if (pick && pick.dataset.el && M.byId(pick.dataset.el)) reveal(M.byId(pick.dataset.el), false);
  });
  function paintSelection() {
    canvas.querySelectorAll('.sel').forEach((el) => el.classList.remove('sel'));
    if (selected) canvas.querySelectorAll(`[data-el="${CSS.escape(selected)}"]`).forEach((el) => el.classList.add('sel'));
  }

  /* ───────── stages of the exercise ───────── */
  function build(key) {
    if (built.has(key)) return;
    const stage = M.STAGES.find((s) => s.key === key);
    built.add(key);
    born = key;
    clearTimeout(bornTimer);
    bornTimer = setTimeout(() => { born = null; }, 3000);
    log('model', `Created: ${stage.title}`);
    if (stage.diagram) openDiagram(stage.diagram); else renderCanvas();
    const sel = stage.select ? M.byId(stage.select) : diagramNode(stage.diagram);
    if (sel) reveal(sel, true); else renderTree();
    renderPresenter();
    renderTriggers();
  }
  function resetModel() {
    stopSim();
    built.clear();
    born = null;
    tabs.slice().forEach((k) => { if (!diagramExists(k)) closeDiagram(k); });
    if (selected && !exists(M.byId(selected))) selected = null;
    log('model', 'Model reset to the state the students receive.');
    renderTree();
    renderSpec();
    renderCanvas();
    renderPresenter();
    renderTriggers();
  }
  function renderPresenter() {
    const next = ORDER.find((k) => !built.has(k));
    $('#pr-stages').innerHTML = M.STAGES.map((s) => {
      const done = built.has(s.key);
      return `<li class="${done ? 'done' : ''}${s.key === next ? ' next' : ''}">
        <span class="pr-mark" aria-hidden="true">${done ? '✓' : ''}</span>
        <div><b>${esc(s.title)}</b><span>${esc(s.text)}</span></div>
        ${done ? '' : `<button type="button" class="btn small${s.key === next ? ' primary' : ''}" data-build="${s.key}">Build</button>`}
      </li>`;
    }).join('');
  }
  $('#presenter').addEventListener('click', (e) => {
    const b = e.target.closest('[data-build]');
    if (b) {
      /* building a stage builds the ones before it too */
      ORDER.slice(0, ORDER.indexOf(b.dataset.build) + 1).forEach((k) => { if (!built.has(k)) build(k); });
      return;
    }
    if (e.target.closest('#pr-reset')) resetModel();
    if (e.target.closest('#pr-all')) ORDER.forEach((k) => { if (!built.has(k)) build(k); });
    if (e.target.closest('#pr-close')) togglePresenter(false);
  });
  function togglePresenter(on) {
    const p = $('#presenter');
    p.hidden = on === undefined ? !p.hidden : !on;
  }

  /* ───────── console ───────── */
  const entries = [];
  const TAGS = { sim: 'SIM', sig: 'SIGNAL', link: 'LINK', model: 'MODEL', warn: 'WARN', guide: 'GUIDE' };
  function log(kind, text) {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    entries.push({ kind, text, time });
    if (entries.length > 300) entries.shift();
    const li = document.createElement('li');
    li.className = 'lg-' + kind;
    li.innerHTML = `<time>${time}</time><span class="lg-tag">${TAGS[kind] || kind}</span><span class="lg-txt">${esc(text)}</span>`;
    const list = $('#log');
    list.appendChild(li);
    while (list.children.length > 300) list.firstChild.remove();
    list.scrollTop = list.scrollHeight;
    $('#sb-msg').textContent = text;
  }
  $('#log-clear').addEventListener('click', () => { $('#log').innerHTML = ''; });

  /* ───────── relay: this page is "the plugin" ───────── */
  const link = { ws: null, status: 'off', code: '', viewers: 0, retry: 0, timer: 0 };
  /* A code exists only on the relay that made it: the guide must use the same relay as this page.
     online = the relay of the online guide; here = the relay served next to this page (scripts/dev-server.mjs). */
  const ONLINE_SITE = 'https://shepherd.chaos-art.fr';
  const ONLINE_RELAY = 'wss://shepherd.chaos-art.fr/relay';
  const RELAY_KEY = 'sysml-tool:relay';
  const hereRelay = () => (location.port === '5178'
    /* the Python static server of .claude/launch.json has no relay: use the one of this computer */
    ? 'ws://127.0.0.1:8787'
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/relay`);
  function relayChoice() {
    const forced = params.get('relay');
    if (forced) return forced;
    try { return localStorage.getItem(RELAY_KEY) || 'online'; } catch (e) { return 'online'; }
  }
  function relayBase() {
    const c = relayChoice();
    if (c === 'online') return ONLINE_RELAY;
    if (c === 'here') return hereRelay();
    return c.replace(/\/+$/, '').replace(/^http/, 'ws');
  }
  function wantedCode() {
    const fromUrl = (params.get('code') || '').replace(/[\s-]/g, '').toUpperCase();
    if (/^[A-Z]{6}$/.test(fromUrl)) return fromUrl;
    try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; }
  }
  function connect(code) {
    clearTimeout(link.timer);
    if (link.ws) { link.ws.onclose = null; link.ws.close(); }
    setLink('connecting');
    let ws;
    try { ws = new WebSocket(`${relayBase()}/v1/plugin${code ? '?code=' + encodeURIComponent(code) : ''}`); } catch (e) { return retry(code); }
    link.ws = ws;
    ws.onmessage = (ev) => {
      let f;
      try { f = JSON.parse(ev.data); } catch (e) { return; }
      if (f.type === 'info') {
        if (f.event === 'hello') {
          link.code = f.code;
          link.viewers = f.viewers || 0;
          link.retry = 0;
          try { localStorage.setItem(CODE_KEY, f.code); } catch (e) { /* no storage */ }
          setLink('online');
          log('link', `Relay pairing code ${pretty(f.code)}${f.reused ? ' (resumed)' : ''}.`);
          if (sim.running) publishState();
        } else if (f.event === 'viewers') {
          const before = link.viewers;
          link.viewers = f.count;
          setLink(link.status);
          if (f.count > before) log('link', `A guide joined (${f.count} connected).`);
          else if (f.count < before) log('link', `A guide left (${f.count} connected).`);
        }
        return;
      }
      if (typeof f.req === 'string') { answer(f); return; }
      if (typeof f.signal === 'string') {
        log('guide', `Signal from the guide: ${f.signal}`);
        trigger(f.signal);
      }
    };
    ws.onclose = (ev) => {
      if (link.ws !== ws) return;
      link.ws = null;
      if (ev.code === 4409) { setLink('off'); log('warn', 'Another window took this pairing code.'); return; }
      if (ev.code === 4400) { try { localStorage.removeItem(CODE_KEY); } catch (e) { /* no storage */ } code = ''; }
      retry(code || link.code);
    };
  }
  function retry(code) {
    setLink('waiting');
    link.retry += 1;
    link.timer = setTimeout(() => connect(code), Math.min(8000, 800 * link.retry));
  }
  function send(obj) {
    if (link.ws && link.ws.readyState === 1) link.ws.send(JSON.stringify(obj));
  }
  /* written as the plugin shows it, and as the guide asks for it: six letters */
  const pretty = (c) => c || '';
  /* the online guide for the online relay, else the guide served next to this page, told which relay */
  function guideUrl() {
    const online = relayBase() === ONLINE_RELAY;
    const u = online ? new URL('/', ONLINE_SITE) : new URL('../index.html', location.href);
    u.searchParams.set('code', link.code);
    if (!online) u.searchParams.set('relay', relayBase());
    return u.href;
  }
  function setLink(status) {
    link.status = status;
    const pill = $('#link');
    pill.dataset.status = status;
    const text = {
      off: 'Relay: off',
      connecting: 'Relay: connecting…',
      waiting: 'Relay: unreachable, retrying',
      online: `Relay ${pretty(link.code)} · ${link.viewers ? link.viewers + ' guide' + (link.viewers > 1 ? 's' : '') : 'no guide yet'}`
    }[status];
    pill.querySelector('span').textContent = text;
    $('#sb-link').textContent = status === 'online' ? `Paired ${pretty(link.code)}` : text;
    $('#lp-code').textContent = link.code ? pretty(link.code) : '——';
    $('#lp-relay').textContent = relayBase();
    $('#lp-viewers').textContent = String(link.viewers);
    const c = relayChoice();
    const pick = ['online', 'here'].includes(c) ? c : 'custom';
    $('#lp-relay-pick').value = pick;
    $('#lp-relay-custom').hidden = pick !== 'custom';
    if (pick === 'custom' && document.activeElement !== $('#lp-relay-custom')) $('#lp-relay-custom').value = c;
    $('#lp-hint').textContent = pick === 'online'
      ? `Type this code in the guide at ${ONLINE_SITE.replace('https://', '')} (Cameo button), or open it below.`
      : 'Only a guide set to this same relay knows this code: use the button below to open one.';
    const a = $('#lp-open');
    if (link.code) { a.href = guideUrl(); a.removeAttribute('aria-disabled'); } else { a.removeAttribute('href'); a.setAttribute('aria-disabled', 'true'); }
  }
  $('#link').addEventListener('click', () => { const p = $('#link-pop'); p.hidden = !p.hidden; });
  $('#lp-new').addEventListener('click', () => {
    try { localStorage.removeItem(CODE_KEY); } catch (e) { /* no storage */ }
    link.code = '';
    connect('');
  });
  $('#lp-copy').addEventListener('click', () => { if (link.code && navigator.clipboard) navigator.clipboard.writeText(link.code); });
  function useRelay(choice) {
    try { localStorage.setItem(RELAY_KEY, choice); } catch (e) { /* no storage */ }
    if (params.get('relay')) { params.delete('relay'); history.replaceState(null, '', '?' + params.toString()); }
    link.retry = 0;
    log('link', `Relay: ${relayBase()}`);
    connect(link.code);
  }
  $('#lp-relay-pick').addEventListener('change', (e) => {
    if (e.target.value === 'custom') { $('#lp-relay-custom').hidden = false; $('#lp-relay-custom').focus(); return; }
    useRelay(e.target.value);
  });
  $('#lp-relay-custom').addEventListener('change', (e) => { if (/^(wss?|https?):\/\//.test(e.target.value.trim())) useRelay(e.target.value.trim()); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#link-pop') && !e.target.closest('#link')) $('#link-pop').hidden = true;
  });

  /* ───────── what the guide asks ("Open / Find in Cameo") ───────── */
  const METACLASS = { package: 'Package', block: 'Class', iface: 'Class', usecase: 'UseCase', activity: 'Activity', state: 'State', signal: 'Signal', statemachine: 'StateMachine', actor: 'Actor' };
  function byName(spec) {
    const want = (spec.path || []).join('/');
    const found = [];
    M.walk((nd) => { if (exists(nd) && nd.name === spec.name && (!spec.type || nd.type === spec.type)) found.push(nd); });
    const exact = found.filter((nd) => M.pathOf(nd).join('/') === want);
    if (exact.length === 1) return exact[0];
    if (found.length === 1) return found[0];
    if (found.length > 1) throw new Error('ambiguous');
    throw new Error('not-found');
  }
  function show(node, openIt) {
    reveal(node, true);
    if (node.diagram && (openIt || node.type === 'matrix')) openDiagram(node.diagram);
    flashCanvas(`Shown for the guide: ${node.name}`);
    return true;
  }
  function answer(f) {
    const arg = (f.args && f.args[0]) || {};
    const ok = (result) => send({ res: f.req, ok: true, result });
    const fail = (error) => { send({ res: f.req, ok: false, error }); log('guide', `Guide asked for ${arg.name || arg.elementId || f.name}: ${error}`); };
    try {
      const route = f.category + '/' + f.name;
      if (route === 'browser/select' || route === 'diagram/open') {
        const node = M.byId(arg.elementId);
        if (!node || !exists(node)) return fail('not-found');
        if (route === 'diagram/open' && !node.diagram) return fail('not-a-diagram');
        log('guide', `Guide: ${route === 'diagram/open' ? 'open' : 'select'} “${node.name}”`);
        return ok(show(node, route === 'diagram/open'));
      }
      if (route === 'browser/selectByName' || route === 'diagram/openByName') {
        const node = byName({ name: arg.name, type: arg.type, path: arg.path });
        if (route === 'diagram/openByName' && !node.diagram) return fail('not-a-diagram');
        log('guide', `Guide: find “${node.name}” by name`);
        return ok(show(node, route === 'diagram/openByName'));
      }
      if (route === 'model/getElementsByName') {
        const list = [];
        M.walk((nd) => { if (exists(nd) && nd.name === arg.name) list.push({ id: nd.id, name: nd.name, metaclass: METACLASS[nd.type] || 'Diagram' }); });
        return ok(list);
      }
      return fail('unsupported');
    } catch (e) {
      return fail(e.message || 'error');
    }
  }
  let flashTimer = 0;
  function flashCanvas(text) {
    const b = $('#canvas-flash');
    b.textContent = text;
    b.hidden = false;
    b.classList.remove('in');
    void b.offsetWidth;
    b.classList.add('in');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { b.hidden = true; }, 2600);
    const pill = $('#link');
    pill.classList.remove('ping');
    void pill.offsetWidth;
    pill.classList.add('ping');
  }

  /* ───────── simulation ───────── */
  const SIM = M.SIM;
  const sim = { running: false, leaf: null, gen: 0, busy: false, rainy: false, tokens: new Set(), auto: false };
  let sigCounter = 0;

  function activeSet() {
    const set = new Set();
    if (!sim.leaf) return set;
    for (let at = sim.leaf; at; at = SIM.states[at] && SIM.states[at].parent) set.add(at);
    (SIM.states[sim.leaf].also || []).forEach((s) => set.add(s));
    return set;
  }
  function enabled() {
    if (!sim.running || !sim.leaf) return [];
    const act = activeSet();
    return SIM.transitions.filter((t) => t.signal && act.has(t.from) && (!t.stage || built.has(t.stage)));
  }
  function paintSim() {
    const act = activeSet();
    canvas.querySelectorAll('[data-sim]').forEach((el) => {
      el.classList.toggle('active', act.has(el.dataset.sim));
      el.classList.toggle('leaf', el.dataset.sim === sim.leaf);
    });
    document.body.classList.toggle('simulating', sim.running);
  }
  function paintTokens() {
    canvas.querySelectorAll('[data-node]').forEach((el) => el.classList.toggle('tok', sim.tokens.has(el.dataset.node)));
  }
  function publishState() {
    const st = sim.leaf && SIM.states[sim.leaf];
    send({ type: 'info', event: 'state', status: sim.running ? 'running' : 'stopped', step: (st && st.step) || 'Off' });
  }
  function pulseSignal(signal) {
    /* transitions have their own animation (fire) */
    canvas.querySelectorAll(`[data-sig="${CSS.escape(signal)}"]:not([data-tr])`).forEach((el) => {
      el.classList.remove('pulse');
      void el.getBoundingClientRect();
      el.classList.add('pulse');
    });
  }

  function runSim() {
    if (sim.running) return;
    if (!diagramExists('stm')) return;
    sim.running = true;
    sim.gen += 1;
    sim.leaf = null;
    sim.tokens.clear();
    openDiagram('stm');
    log('sim', 'Simulation session started: SOI - Pasture Sentinel.');
    const g = sim.gen;
    setTimeout(() => { if (g === sim.gen) enter(SIM.initial); }, 400);
    renderSimBar();
  }
  function stopSim() {
    if (!sim.running) return;
    sim.running = false;
    sim.gen += 1;
    sim.leaf = null;
    sim.busy = false;
    sim.auto = false;
    sim.tokens.clear();
    paintSim();
    paintTokens();
    publishState();
    log('sim', 'Simulation session terminated.');
    renderSimBar();
  }
  function enter(id) {
    sim.leaf = id;
    paintSim();
    publishState();
    log('sim', `Active state: ${pathName(id)}`);
    renderSimBar();
    const st = SIM.states[id];
    if (st.does) doActivity(st.does, sim.gen);
  }
  function pathName(id) {
    const out = [];
    for (let at = id; at; at = SIM.states[at] && SIM.states[at].parent) out.unshift(stateName(at));
    return out.join(' › ');
  }
  /* Send a signal into the running simulation. Returns true when a transition fired. */
  function trigger(signal) {
    if (!sim.running) { log('warn', `Not running: ${signal} is ignored. Start the simulation first.`); return false; }
    if (sim.busy) return false;
    const t = enabled().find((tr) => tr.signal === signal);
    if (!t) { log('warn', `${signal}: no transition from ${stateName(sim.leaf)}, the signal is consumed.`); return false; }
    sim.busy = true;
    const g = sim.gen;
    sigCounter += 1;
    send({ signal, id: `tool-${Date.now().toString(36)}-${sigCounter}` });
    log('sig', `${signal}  →  sent to the guide`);
    pulseSignal(signal);
    canvas.querySelectorAll(`[data-tr="${t.id}"]`).forEach((el) => el.classList.add('fire'));
    setTimeout(() => {
      if (g !== sim.gen) return;
      canvas.querySelectorAll('.fire').forEach((el) => el.classList.remove('fire'));
      sim.busy = false;
      enter(t.to);
    }, 700);
    renderTriggers();
    return true;
  }

  /* do / Load Flight Plan: plays the activity diagram once it is defined (stage D), and sends what it ends with. */
  async function doActivity(name, g) {
    if (!built.has('D')) {
      log('sim', `do / ${name}: the activity has no diagram yet, it ends at once. Trigger the next signal by hand.`);
      return;
    }
    const follow = $('#follow').checked;
    const path = sim.rainy
      ? ['n-init', 'f-0', 'n-read', 'f-1', 'n-check', 'f-2', 'n-dec', 'f-ko', 'n-send-ko', 'f-ko2', 'n-end-ko']
      : ['n-init', 'f-0', 'n-read', 'f-1', 'n-check', 'f-2', 'n-dec', 'f-ok', 'n-smr', 'f-ok2', 'n-send-ok', 'f-ok3', 'n-end-ok'];
    sim.tokens.clear();
    await sleep(700);
    if (g !== sim.gen) return;
    log('sim', `do / ${name} started.`);
    if (follow) openDiagram('ad-lfp');
    for (const step of path) {
      if (g !== sim.gen) return;
      sim.tokens.add(step);
      paintTokens();
      if (step === 'n-check') log('sim', `Check FlightPlan: ${sim.rainy ? 'out of range' : 'in range'}.`);
      await sleep(step.startsWith('f-') ? 260 : 520);
    }
    if (g !== sim.gen) return;
    log('sim', `do / ${name} completed.`);
    await sleep(500);
    if (g !== sim.gen) return;
    if (follow) openDiagram('stm');
    await sleep(450);
    if (g !== sim.gen) return;
    sim.tokens.clear();
    trigger(sim.rainy ? 'FlightPlan Check Failed' : 'Ready for mission');
  }

  /* The nominal scenario, paced like js/sim-core.js (NOMINAL) so the drone of the guide has time to fly. */
  async function playScenario() {
    if (sim.auto) return;
    if (!sim.running) runSim();
    sim.auto = true;
    renderSimBar();
    const g = sim.gen;
    const until = async (leaf, ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        if (g !== sim.gen) return false;
        if (sim.leaf === leaf && !sim.busy) return true;
        await sleep(100);
      }
      return false;
    };
    const step = async (signal, from, pause) => {
      if (!(await until(from, 20000))) return false;
      await sleep(pause);
      if (g !== sim.gen) return false;
      return trigger(signal);
    };
    const go = async () => {
      if (!(await step('Start SOI', 's-off', 1200))) return;
      if (!built.has('C')) { log('warn', 'Scenario stopped: no transition leaves Unconfigured (state Configured missing).'); return; }
      if (!(await step('FlightPlan', 's-unconf', 1300))) return;
      if (!built.has('D') && !(await step('Ready for mission', 's-conf', 1300))) return;
      if (!(await step('Start Sheep Guard Mission', 's-ready', 1500))) return;
      if (!(await step('Start Patrolling', 's-gsa', 4800))) return;
      if (!(await step('Predator Detected inside tracking perimeter', 's-patrol', 6500))) return;
      log('sim', 'Scenario played to the end.');
    };
    await go();
    if (g === sim.gen) { sim.auto = false; renderSimBar(); }
  }

  function renderTriggers() {
    const box = $('#triggers');
    if (!sim.running) {
      box.innerHTML = '<p class="muted">Run the simulation (▶) to send signals.</p>';
      return;
    }
    const list = enabled();
    box.innerHTML = list.length
      ? list.map((t) => `<button type="button" class="trig${/crash/i.test(t.signal) ? ' danger' : ''}" data-signal="${esc(t.signal)}"${sim.busy ? ' disabled' : ''}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4h8l3 4-3 4h-8z"/></svg><span>${esc(t.signal)}</span></button>`).join('')
      : '<p class="muted">No signal is awaited in this state.</p>';
  }
  $('#triggers').addEventListener('click', (e) => {
    const b = e.target.closest('[data-signal]');
    if (b) trigger(b.dataset.signal);
  });
  function renderSimBar() {
    $('#run').disabled = sim.running || !diagramExists('stm');
    $('#play').disabled = sim.auto || !diagramExists('stm');
    $('#stop').disabled = !sim.running;
    $('#sim-state').innerHTML = sim.running
      ? `<span class="dot on"></span>Running · <b>${esc(sim.leaf ? pathName(sim.leaf) : 'starting…')}</b>`
      : '<span class="dot"></span>Not running';
    $('#sb-sim').textContent = sim.running ? `Simulation: ${sim.leaf ? stateName(sim.leaf) : '…'}` : 'Simulation: idle';
    $('#rainy-row').hidden = !built.has('D');
    renderTriggers();
  }
  $('#run').addEventListener('click', runSim);
  $('#play').addEventListener('click', playScenario);
  $('#stop').addEventListener('click', stopSim);
  $('#rainy').addEventListener('change', (e) => { sim.rainy = e.target.checked; log('sim', `Flight plan check will be ${sim.rainy ? 'out of range (rainy day)' : 'in range (sunny day)'}.`); });

  /* ───────── panels: drag a splitter to resize, the chevron or a double-click to fold ───────── */
  const LAYOUT_KEY = 'sysml-tool:layout';
  const PANES = {
    left: { el: '#pane-left', size: 270, min: 180, max: 600, folded: 30 },
    right: { el: '#pane-right', size: 260, min: 200, max: 600, folded: 30 },
    console: { el: '#pane-console', size: 214, min: 110, max: 640, folded: 30 }
  };
  const layout = { left: { size: 270, off: false }, right: { size: 260, off: false }, console: { size: 214, off: false } };
  try { Object.assign(layout, JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}')); } catch (e) { /* defaults */ }
  function applyLayout(save) {
    const win = $('.win');
    Object.entries(PANES).forEach(([name, p]) => {
      const l = layout[name];
      win.style.setProperty(name === 'console' ? '--console-h' : `--${name}-w`, (l.off ? p.folded : l.size) + 'px');
      $(p.el).classList.toggle('off', l.off);
      const b = $(`${p.el} [data-fold]`);
      b.setAttribute('aria-expanded', String(!l.off));
    });
    if (zoom === 'fit') applyZoom();
    if (save) { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch (e) { /* no storage */ } }
  }
  function fold(name, off) {
    layout[name].off = off === undefined ? !layout[name].off : off;
    applyLayout(true);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fold]');
    if (b) { fold(b.dataset.fold); return; }
    /* a folded side pane opens again from anywhere on its rail */
    const rail = e.target.closest('.pane.off .pane-head');
    if (rail) fold(rail.closest('.pane') === $('#pane-left') ? 'left' : 'right', false);
  });
  document.querySelectorAll('[data-split]').forEach((bar) => {
    const name = bar.dataset.split;
    const p = PANES[name];
    bar.addEventListener('dblclick', () => fold(name));
    bar.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      bar.setPointerCapture(e.pointerId);
      bar.classList.add('drag');
      document.body.classList.add('dragging', name === 'console' ? 'dir-h' : 'dir-v');
      const start = { x: e.clientX, y: e.clientY, size: layout[name].off ? p.folded : layout[name].size };
      const move = (ev) => {
        const d = name === 'left' ? ev.clientX - start.x : name === 'right' ? start.x - ev.clientX : start.y - ev.clientY;
        const want = start.size + d;
        /* dragged well under its minimum: fold it */
        if (want < p.min * 0.55) { layout[name].off = true; } else {
          layout[name].off = false;
          layout[name].size = Math.max(p.min, Math.min(p.max, want, name === 'console' ? innerHeight - 220 : innerWidth - 400));
        }
        applyLayout(false);
      };
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        bar.classList.remove('drag');
        document.body.classList.remove('dragging', 'dir-h', 'dir-v');
        applyLayout(true);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    });
  });

  /* ───────── keyboard ───────── */
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'p' || e.key === 'P') togglePresenter();
    else if (e.key === 'n' || e.key === 'N') { const next = ORDER.find((k) => !built.has(k)); if (next) build(next); }
    else if (e.key === 'F5') { e.preventDefault(); runSim(); }
    else if (e.key === 'Escape') { $('#link-pop').hidden = true; }
  });

  /* ───────── start ───────── */
  applyLayout(false);
  renderTree();
  renderSpec();
  renderPresenter();
  if (params.get('presenter') === '1') togglePresenter(true);
  openDiagram(diagramExists('stm') ? 'stm' : 'op-context');
  if (params.get('diagram')) openDiagram(params.get('diagram'));
  renderSimBar();
  setLink('off');
  window.Tool = { openDiagram, build, resetModel, runSim, stopSim, playScenario, trigger };
  log('model', `Project opened: Pasture Sentinel (${built.size === ORDER.length ? 'complete' : built.size ? 'up to stage ' + ORDER[built.size - 1] : 'as handed to the students'}).`);
  connect(wantedCode());
})();
