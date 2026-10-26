/* Session monitor: reads the runs the relay folds from the guides' timing events (relay/src/track.js).
   ?relay=https://host/relay to read another relay, ?key=... when the relay asks for one (TRACK_KEY). */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  const RELAY = (params.get('relay') || `${location.origin}/relay`).replace(/\/+$/, '');
  const KEY = params.get('key') || '';
  const LIVE_MS = 3 * 60000;
  const PARTS = { part1: 'Part 1 · Discover', part2: 'Part 2 · Marked', part3: 'Part 3 · Fleet' };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const state = { view: 'day', day: '', part: '', ver: null, sort: { key: 'pos', dir: -1 } };
  let days = [];
  let data = null; // { now, runs, catalog } of the last load
  let allData = null;
  let timer = 0;

  /* ───────── helpers ───────── */
  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* nothing kept */ }
    return value;
  }
  const hidden = new Set(store('monitor:hidden') || []);
  function dur(ms) {
    if (ms == null || !isFinite(ms)) return '–';
    const m = Math.round(ms / 60000);
    if (ms < 60000) return `${Math.round(ms / 1000)} s`;
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
  }
  const clock = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dayLabel = (d) => new Date(d + 'T12:00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  function quantile(list, q) {
    const a = list.filter((x) => x != null && isFinite(x)).sort((x, y) => x - y);
    if (!a.length) return null;
    const i = (a.length - 1) * q;
    const lo = Math.floor(i);
    return a[lo] + (a[Math.min(lo + 1, a.length - 1)] - a[lo]) * (i - lo);
  }
  const median = (l) => quantile(l, 0.5);
  const versionOf = (r) => `${r.v || '?'}`;

  async function api(path) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${RELAY}/v1/track/${path}${KEY ? `${sep}key=${encodeURIComponent(KEY)}` : ''}`, { cache: 'no-store' });
    if (res.status === 403) throw new Error('the relay asks for a key: add ?key=… to the address');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  function status(text) { $('status').textContent = text; }

  /* Titles of the scenes of a part and version: the catalog keeps the last title seen at each index. */
  function titles(catalog, part, ver) {
    const out = [];
    let total = 0;
    Object.values(catalog || {}).forEach((c) => {
      if (c.part !== part || (ver && c.v !== ver)) return;
      total = Math.max(total, c.total || 0);
      (c.scenes || []).forEach((s, i) => { if (s) out[i] = s; });
    });
    return { list: out, total: Math.max(total, out.length) };
  }
  const titleAt = (cat, i) => (cat.list[i] && cat.list[i].title) || `Scene ${i + 1}`;

  /* ───────── tooltip ───────── */
  const tip = $('tip');
  function showTip(e, html) {
    tip.innerHTML = html;
    tip.hidden = false;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - w - 8, e.clientX + 14) + 'px';
    tip.style.top = Math.max(8, e.clientY - h - 12) + 'px';
  }
  function hideTip() { tip.hidden = true; }

  /* ───────── charts ───────── */
  /* Columns, one per scene: value(i), tooltip(i). */
  function columns(el, n, value, tipOf, opts) {
    const W = Math.max(320, el.clientWidth);
    const H = opts.height || 180;
    const pad = { l: 36, r: 8, t: 10, b: 24 };
    const vals = Array.from({ length: n }, (_, i) => value(i));
    const max = Math.max(1, ...vals.map((v) => v || 0));
    const top = opts.integer ? Math.max(1, Math.ceil(max)) : max * 1.08;
    const bw = (W - pad.l - pad.r) / Math.max(1, n);
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label)}">`;
    const ticks = opts.integer ? niceInts(top) : [0, top / 2, top];
    ticks.forEach((v) => {
      s += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${esc(opts.fmt ? opts.fmt(v) : Math.round(v))}</text>`;
    });
    vals.forEach((v, i) => {
      const x = pad.l + i * bw;
      const h = v ? Math.max(2, y(0) - y(v)) : 0;
      s += `<rect class="hit" data-i="${i}" x="${x}" y="${pad.t}" width="${bw}" height="${H - pad.t - pad.b}"/>`;
      if (h) s += `<rect class="bar${opts.dim && opts.dim(i) ? ' dim' : ''}" x="${x + Math.min(1, bw * 0.1)}" y="${y(0) - h}" width="${Math.max(1, bw - 2)}" height="${h}" rx="${Math.min(4, bw / 3)}"/>`;
      else s += '<g></g>';
    });
    s += `<line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}"/>`;
    const every = n > 40 ? 10 : n > 15 ? 5 : 1;
    for (let i = 0; i < n; i += every) s += `<text x="${pad.l + (i + 0.5) * bw}" y="${H - 6}" text-anchor="middle">${i + 1}</text>`;
    el.innerHTML = s + '</svg>';
    el.querySelectorAll('.hit').forEach((r) => {
      r.addEventListener('mousemove', (e) => showTip(e, tipOf(Number(r.dataset.i))));
      r.addEventListener('mouseleave', hideTip);
    });
  }
  function niceInts(top) {
    const step = Math.max(1, Math.ceil(top / 4));
    const out = [];
    for (let v = 0; v <= top; v += step) out.push(v);
    return out;
  }

  /* Progress of every run over the clock of the day, the median on top. */
  function timeline(el, runs, cat, now) {
    const W = Math.max(320, el.clientWidth);
    const H = 300;
    const pad = { l: 36, r: 12, t: 10, b: 26 };
    const t0 = Math.min(...runs.map((r) => r.start));
    const live = runs.some((r) => now - r.last < LIVE_MS);
    const t1 = Math.max(t0 + 15 * 60000, ...runs.map((r) => r.last), live ? now : 0);
    const n = Math.max(cat.total, ...runs.map((r) => r.maxIndex + 1));
    const x = (t) => pad.l + (W - pad.l - pad.r) * (t - t0) / (t1 - t0);
    const y = (i) => pad.t + (H - pad.t - pad.b) * (1 - i / Math.max(1, n - 1));
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Scene reached by each student over the session">`;
    for (let i = 0; i < n; i += n > 40 ? 10 : 5) s += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(i)}" y2="${y(i)}"/><text x="${pad.l - 6}" y="${y(i) + 4}" text-anchor="end">${i + 1}</text>`;
    const span = t1 - t0;
    const stepT = [5, 10, 15, 30, 60, 120].map((m) => m * 60000).find((m) => span / m <= 8) || 240 * 60000;
    for (let t = Math.ceil(t0 / stepT) * stepT; t <= t1; t += stepT) s += `<line class="grid" x1="${x(t)}" x2="${x(t)}" y1="${pad.t}" y2="${H - pad.b}"/><text x="${x(t)}" y="${H - 8}" text-anchor="middle">${clock(t)}</text>`;
    s += `<line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${H - pad.b}" y2="${H - pad.b}"/>`;
    const at = (r, t) => { let idx = null; for (const [pt, i] of r.path) { if (pt > t) break; idx = i; } return idx; };
    runs.forEach((r, k) => {
      let d = '';
      r.path.forEach(([t, i], j) => { d += `${j ? 'H' : 'M'}${x(t).toFixed(1)}${j ? '' : ` ${y(i).toFixed(1)}`}V${y(i).toFixed(1)}`; });
      const end = now - r.last < LIVE_MS && !r.hidden ? now : r.last;
      d += `H${x(end).toFixed(1)}`;
      s += `<path class="run" data-k="${k}" d="${d}"/>`;
    });
    // Median position, sampled every few minutes over the runs already started.
    let md = '';
    const sample = Math.max(60000, (t1 - t0) / 120);
    for (let t = t0; t <= t1; t += sample) {
      const pos = runs.filter((r) => r.start <= t && t <= Math.max(r.last, now - r.last < LIVE_MS ? now : 0)).map((r) => at(r, t)).filter((v) => v != null);
      if (pos.length) md += `${md ? 'L' : 'M'}${x(t).toFixed(1)} ${y(median(pos)).toFixed(1)}`;
    }
    if (md) s += `<path class="med" d="${md}"/>`;
    if (live) s += `<line class="now" x1="${x(now)}" x2="${x(now)}" y1="${pad.t}" y2="${H - pad.b}"/>`;
    s += `<rect class="hit" x="${pad.l}" y="${pad.t}" width="${W - pad.l - pad.r}" height="${H - pad.t - pad.b}"/>`;
    el.innerHTML = s + '</svg>';
    const svg = el.firstChild;
    const hit = svg.querySelector('.hit');
    hit.addEventListener('mousemove', (e) => {
      const box = svg.getBoundingClientRect();
      const px = (e.clientX - box.left) * W / box.width;
      const py = (e.clientY - box.top) * H / box.height;
      const t = t0 + (px - pad.l) / (W - pad.l - pad.r) * (t1 - t0);
      let best = -1; let bestD = Infinity;
      runs.forEach((r, k) => {
        const i = at(r, t);
        if (i == null || t > Math.max(r.last, now - r.last < LIVE_MS ? now : 0)) return;
        const dd = Math.abs(y(i) - py);
        if (dd < bestD) { bestD = dd; best = k; }
      });
      svg.querySelectorAll('.run.on').forEach((p) => p.classList.remove('on'));
      if (best < 0 || bestD > 24) { hideTip(); return; }
      const p = svg.querySelector(`.run[data-k="${best}"]`);
      p.classList.add('on');
      p.parentNode.insertBefore(p, hit);
      const r = runs[best];
      const i = at(r, t);
      showTip(e, `<span class="code">${esc(r.code)}</span> at ${clock(t)}<br><b>${i + 1}</b> · ${esc(titleAt(cat, i))}<br><span class="muted">${dur(t - r.start)} after its start</span>`);
    });
    hit.addEventListener('mouseleave', () => { hideTip(); svg.querySelectorAll('.run.on').forEach((p) => p.classList.remove('on')); });
  }

  /* Time from the start to the first visit of each scene: median line and its 25–75 % band. */
  function pacing(el, rows, n) {
    const W = Math.max(320, el.clientWidth);
    const H = 260;
    const pad = { l: 48, r: 12, t: 10, b: 24 };
    const pts = rows.filter((r) => r.arrMed != null);
    const max = Math.max(15 * 60000, ...pts.map((r) => r.arrQ3 || 0)) * 1.05;
    const x = (i) => pad.l + (W - pad.l - pad.r) * i / Math.max(1, n - 1);
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Time from the start to reach each scene">`;
    const stepT = [10, 15, 30, 60, 120].map((m) => m * 60000).find((m) => max / m <= 6) || 240 * 60000;
    for (let v = 0; v <= max; v += stepT) s += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${dur(v)}</text>`;
    const every = n > 40 ? 10 : n > 15 ? 5 : 1;
    for (let i = 0; i < n; i += every) s += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${i + 1}</text>`;
    s += `<line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}"/>`;
    if (pts.length) {
      s += `<path class="band" d="M${pts.map((r) => `${x(r.i)} ${y(r.arrQ3)}`).join('L')}L${pts.slice().reverse().map((r) => `${x(r.i)} ${y(r.arrQ1)}`).join('L')}Z"/>`;
      s += `<path class="med" d="M${pts.map((r) => `${x(r.i)} ${y(r.arrMed)}`).join('L')}"/>`;
    }
    s += `<rect class="hit" x="${pad.l}" y="${pad.t}" width="${W - pad.l - pad.r}" height="${H - pad.t - pad.b}"/><circle class="dot" r="5" cx="-20" cy="-20"/>`;
    el.innerHTML = s + '</svg>';
    const svg = el.firstChild;
    const dot = svg.querySelector('.dot');
    svg.querySelector('.hit').addEventListener('mousemove', (e) => {
      const box = svg.getBoundingClientRect();
      const i = Math.round(((e.clientX - box.left) * W / box.width - pad.l) / (W - pad.l - pad.r) * (n - 1));
      const r = rows[i];
      if (!r || r.arrMed == null) { hideTip(); dot.setAttribute('cx', -20); return; }
      dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(r.arrMed));
      showTip(e, `<b>${i + 1}</b> · ${esc(r.title)}<br>Reached after <b>${dur(r.arrMed)}</b> (median)<br><span class="muted">half of the class between ${dur(r.arrQ1)} and ${dur(r.arrQ3)} · ${r.n} students</span>`);
    });
    svg.querySelector('.hit').addEventListener('mouseleave', () => { hideTip(); dot.setAttribute('cx', -20); });
  }

  /* ───────── tables ───────── */
  function sortable(table, rows, cols, onSort) {
    const { key, dir } = state.sort;
    const col = cols.find((c) => c.key === key) || cols[0];
    const sorted = rows.slice().sort((a, b) => {
      const va = col.sort(a); const vb = col.sort(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
    table.innerHTML = `<thead><tr>${cols.map((c) => `<th data-key="${c.key}" class="${c.num ? 'num' : ''}"${c.key === col.key ? ` aria-sort="${dir > 0 ? 'ascending' : 'descending'}"` : ''}>${c.title}</th>`).join('')}</tr></thead>` +
      `<tbody>${sorted.map((r) => `<tr class="${cols.rowClass ? cols.rowClass(r) : ''}">${cols.map((c) => `<td class="${c.num ? 'num' : ''}">${c.cell(r)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    table.querySelectorAll('th').forEach((th) => th.addEventListener('click', () => {
      state.sort = { key: th.dataset.key, dir: state.sort.key === th.dataset.key ? -state.sort.dir : -1 };
      onSort();
    }));
  }

  /* ───────── session view ───────── */
  function renderDay() {
    const view = $('view');
    if (!data) return;
    const showHidden = $('show-hidden').checked;
    const all = data.runs.filter((r) => r.part === state.part && r.cur != null);
    const runs = all.filter((r) => showHidden || !hidden.has(r.id));
    if (!runs.length) { view.innerHTML = `<div class="card empty">No student on ${esc(PARTS[state.part] || state.part)} this day${all.length ? ' (all hidden)' : ''}.</div>`; return; }
    const now = data.now;
    const vers = [...new Set(runs.map(versionOf))];
    const cat = titles(data.catalog, state.part, vers.length === 1 ? vers[0] : '');
    const n = Math.max(cat.total, ...runs.map((r) => r.maxIndex + 1));
    const isLive = (r) => now - r.last < LIVE_MS && !r.hidden;
    const live = runs.filter(isLive);
    const finished = runs.filter((r) => r.maxIndex >= (r.total || n) - 1);
    const medPos = median(runs.map((r) => r.cur));
    const start = Math.min(...runs.map((r) => r.start));
    view.innerHTML = `
      <div class="tiles">
        <div class="tile"><span>Students</span><b>${runs.length}</b><small>${vers.map((v) => `version ${esc(v)}`).join(', ')}</small></div>
        <div class="tile"><span>First start</span><b>${clock(start)}</b><small>${dur((live.length ? now : Math.max(...runs.map((r) => r.last))) - start)} ${live.length ? 'ago' : 'long'}</small></div>
        <div class="tile"><span>On the guide now</span><b>${live.length}</b><small>news in the last 3 min</small></div>
        <div class="tile"><span>Median scene</span><b>${medPos == null ? '–' : Math.round(medPos) + 1} <small style="display:inline">/ ${n}</small></b><small class="ttl">${medPos == null ? '' : esc(titleAt(cat, Math.round(medPos)))}</small></div>
        <div class="tile"><span>Reached the end</span><b>${finished.length}</b><small>${Math.round(finished.length / runs.length * 100)} %</small></div>
      </div>
      <section class="card"><h2>Where everyone is now</h2><p class="sub">Students per scene (the one shown last). Faded: no news for 3 minutes.</p><div id="c-now"></div></section>
      <section class="card"><h2>Progress over the session</h2><p class="sub">One line per student; hover a line for its code.</p><div id="c-time"></div>
        <div class="legend"><span><i></i>Median student</span><span><i class="soft"></i>One student</span></div></section>
      <section class="card"><h2>Students</h2><p class="sub">Active time leaves out breaks (tab hidden, or no news for ${Math.round(data.idleMs / 60000)} min). Hide the codes of your own tests: they are left out here and in the overall stats.</p><div class="scroll"><table id="t-runs"></table></div></section>`;

    columns($('c-now'), n, (i) => runs.filter((r) => r.cur === i).length, (i) => {
      const here = runs.filter((r) => r.cur === i);
      return `<b>${i + 1}</b> · ${esc(titleAt(cat, i))}<br>${here.length} student${here.length === 1 ? '' : 's'}${here.length ? `: <span class="code">${here.map((r) => esc(r.code)).join(' ')}</span>` : ''}`;
    }, { integer: true, label: 'Students per scene', dim: (i) => !runs.some((r) => r.cur === i && isLive(r)) });
    timeline($('c-time'), runs, cat, now);

    const cols = [
      { key: 'code', title: 'Code', sort: (r) => r.code, cell: (r) => `<span class="code">${esc(r.code)}</span>` },
      { key: 'state', title: 'State', sort: (r) => (isLive(r) ? 1 : 0), cell: (r) => (isLive(r) ? '<span class="pill live">live</span>' : `<span class="pill">${r.hidden ? 'left' : 'quiet'} ${clock(r.last)}</span>`) },
      { key: 'pos', title: 'Scene now', sort: (r) => r.cur, cell: (r) => `<b>${r.cur + 1}</b> <span class="ttl">${esc(titleAt(cat, r.cur))}</span>` },
      { key: 'prog', title: 'Progress', sort: (r) => r.maxIndex, cell: (r) => `<div class="meter" title="Furthest: scene ${r.maxIndex + 1}"><i style="width:${(r.cur + 1) / n * 100}%"></i><b style="left:${(r.maxIndex + 1) / n * 100}%"></b></div>` },
      { key: 'start', title: 'Started', num: true, sort: (r) => r.start, cell: (r) => clock(r.start) },
      { key: 'active', title: 'Active', num: true, sort: (r) => r.active, cell: (r) => dur(r.active) },
      { key: 'steps', title: 'Steps ticked', num: true, sort: (r) => r.done, cell: (r) => (r.steps ? `${r.done} / ${r.steps}` : '–') },
      { key: 'ver', title: 'Version', sort: (r) => versionOf(r), cell: (r) => `${esc(versionOf(r))} <span class="pill" title="Fingerprint of the content">${esc(r.fp)}</span>` },
      { key: 'hide', title: '', sort: (r) => (hidden.has(r.id) ? 1 : 0), cell: (r) => `<button type="button" class="btn small" data-hide="${esc(r.id)}">${hidden.has(r.id) ? 'Show' : 'Hide'}</button>` },
    ];
    cols.rowClass = (r) => `${hidden.has(r.id) ? 'hidden-run' : ''}${r.maxIndex >= (r.total || n) - 1 ? ' done' : ''}`;
    sortable($('t-runs'), runs, cols, renderDay);
  }

  /* ───────── overall view ───────── */
  function renderAll() {
    const view = $('view');
    if (!allData) return;
    const min = Number($('min').value);
    const runs = allData.runs.filter((r) => r.part === state.part && r.cur != null && (!state.ver || r.v === state.ver) && !hidden.has(r.id) && r.maxIndex + 1 >= min);
    if (!runs.length) { view.innerHTML = '<div class="card empty">No run matches these filters yet.</div>'; return; }
    const cat = titles(allData.catalog, state.part, state.ver);
    const n = Math.max(cat.total, ...runs.map((r) => r.maxIndex + 1));
    const rows = Array.from({ length: n }, (_, i) => {
      const seen = runs.filter((r) => r.scenes[i]);
      const dw = seen.map((r) => r.scenes[i].dwell);
      const arr = seen.map((r) => r.scenes[i].first - r.start);
      return {
        i, title: titleAt(cat, i), n: seen.length, reach: seen.length / runs.length,
        dwMed: median(dw), dwQ1: quantile(dw, 0.25), dwQ3: quantile(dw, 0.75),
        arrMed: median(arr), arrQ1: quantile(arr, 0.25), arrQ3: quantile(arr, 0.75)
      };
    });
    const sessions = new Map();
    runs.forEach((r) => { const k = r.day; const s = sessions.get(k) || []; s.push(r); sessions.set(k, s); });
    const finished = runs.filter((r) => r.maxIndex >= (r.total || n) - 1);
    const fps = [...new Set(runs.map((r) => r.fp))];
    view.innerHTML = `
      <div class="tiles">
        <div class="tile"><span>Students</span><b>${runs.length}</b><small>${sessions.size} session day${sessions.size === 1 ? '' : 's'}</small></div>
        <div class="tile"><span>Median active time</span><b>${dur(median(runs.map((r) => r.active)))}</b><small>breaks left out</small></div>
        <div class="tile"><span>Median furthest scene</span><b>${Math.round(median(runs.map((r) => r.maxIndex))) + 1} <small style="display:inline">/ ${n}</small></b><small class="ttl">${esc(titleAt(cat, Math.round(median(runs.map((r) => r.maxIndex)))))}</small></div>
        <div class="tile"><span>Reached the end</span><b>${Math.round(finished.length / runs.length * 100)} %</b><small>${finished.length} students${finished.length ? `, median ${dur(median(finished.map((r) => r.scenes[(r.total || n) - 1].first - r.start)))}` : ''}</small></div>
        <div class="tile"><span>Content</span><b>${esc(state.ver || 'all')}</b><small>fingerprint${fps.length > 1 ? 's' : ''} ${fps.map(esc).join(', ')}</small></div>
      </div>
      <section class="card"><h2>Time on each scene</h2><p class="sub">Median active time of the students who opened the scene. Faded: fewer than half of the class got there.</p><div id="c-dwell"></div></section>
      <section class="card"><h2>Pacing</h2><p class="sub">Time from the start of the session to the first visit of each scene (clock time, breaks included).</p><div id="c-pace"></div>
        <div class="legend"><span><i></i>Median</span><span><i class="band"></i>Half of the class (25–75 %)</span></div></section>
      <section class="card"><h2>Per scene</h2><div class="scroll"><table id="t-scenes"></table></div></section>
      <section class="card"><h2>Sessions</h2><div class="scroll"><table id="t-days"></table></div></section>`;

    columns($('c-dwell'), n, (i) => rows[i].dwMed, (i) => {
      const r = rows[i];
      return `<b>${i + 1}</b> · ${esc(r.title)}<br>Median <b>${dur(r.dwMed)}</b>${r.n > 1 ? ` <span class="muted">(25–75 %: ${dur(r.dwQ1)} – ${dur(r.dwQ3)})</span>` : ''}<br><span class="muted">${r.n} students · ${Math.round(r.reach * 100)} % of the class</span>`;
    }, { label: 'Median time on each scene', fmt: dur, dim: (i) => rows[i].reach < 0.5 });
    pacing($('c-pace'), rows, n);

    const sceneCols = [
      { key: 'i', title: '#', num: true, sort: (r) => r.i, cell: (r) => r.i + 1 },
      { key: 'title', title: 'Scene', sort: (r) => r.title, cell: (r) => `<span class="ttl">${esc(r.title)}</span>` },
      { key: 'reach', title: 'Reached', num: true, sort: (r) => r.reach, cell: (r) => `${Math.round(r.reach * 100)} %` },
      { key: 'dw', title: 'Median time', num: true, sort: (r) => r.dwMed ?? -1, cell: (r) => dur(r.dwMed) },
      { key: 'dw3', title: 'Slow quarter from', num: true, sort: (r) => r.dwQ3 ?? -1, cell: (r) => dur(r.dwQ3) },
      { key: 'arr', title: 'Reached after', num: true, sort: (r) => r.arrMed ?? -1, cell: (r) => dur(r.arrMed) },
    ];
    const keep = state.sort;
    if (!sceneCols.some((c) => c.key === keep.key)) state.sort = { key: 'i', dir: 1 };
    sortable($('t-scenes'), rows, sceneCols, renderAll);

    const dayRows = [...sessions.entries()].map(([day, list]) => ({
      day, list, start: Math.min(...list.map((r) => r.start)),
      reach: median(list.map((r) => r.maxIndex)), active: median(list.map((r) => r.active)),
      vers: [...new Set(list.map(versionOf))].join(', ')
    })).sort((a, b) => (a.day < b.day ? 1 : -1));
    $('t-days').innerHTML = `<thead><tr><th>Day</th><th>Version</th><th class="num">Students</th><th class="num">First start</th><th class="num">Median furthest scene</th><th class="num">Median active time</th></tr></thead><tbody>` +
      dayRows.map((d) => `<tr><td><a href="#view=day&day=${d.day}&part=${encodeURIComponent(state.part)}">${esc(dayLabel(d.day))}</a></td><td>${esc(d.vers)}</td><td class="num">${d.list.length}</td><td class="num">${clock(d.start)}</td><td class="num">${Math.round(d.reach) + 1}</td><td class="num">${dur(d.active)}</td></tr>`).join('') + '</tbody>';
  }

  /* ───────── state, filters, loading ───────── */
  function fromHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    state.view = h.get('view') === 'all' ? 'all' : 'day';
    state.day = h.get('day') || state.day;
    state.part = h.get('part') || state.part;
    state.ver = h.get('ver') ?? state.ver;
  }
  function toHash() {
    const h = new URLSearchParams({ view: state.view, part: state.part });
    if (state.view === 'day' && state.day) h.set('day', state.day);
    if (state.view === 'all' && state.ver != null) h.set('ver', state.ver);
    history.replaceState(null, '', '#' + h.toString());
  }
  function options(select, list, value) {
    select.innerHTML = list.map(([v, t]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t)}</option>`).join('');
  }
  function partsIn(runs) {
    const set = new Set(runs.map((r) => r.part));
    const list = ['part1', 'part2', 'part3'].filter((p) => set.has(p)).concat([...set].filter((p) => !PARTS[p]));
    return list.length ? list : ['part1'];
  }
  function refreshFilters(runs) {
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === state.view)));
    $('f-day').hidden = state.view !== 'day';
    $('f-live').hidden = state.view !== 'day';
    $('f-ver').hidden = state.view !== 'all';
    $('f-min').hidden = state.view !== 'all';
    options($('day'), days.map((d) => [d.day, `${dayLabel(d.day)} · ${d.runs}`]), state.day);
    const parts = partsIn(runs);
    if (!parts.includes(state.part)) state.part = parts[0];
    options($('part'), parts.map((p) => [p, PARTS[p] || p]), state.part);
    if (state.view === 'all') {
      // Newest version first, and shown by default: the scenes of two versions do not line up.
      const last = {};
      runs.filter((r) => r.part === state.part).forEach((r) => { last[r.v] = Math.max(last[r.v] || 0, r.last); });
      const vers = Object.keys(last).sort((a, b) => last[b] - last[a]);
      if (state.ver == null || (state.ver && !vers.includes(state.ver))) state.ver = vers[0] || '';
      options($('ver'), vers.map((v) => [v, v || '(none)']).concat([['', 'All versions (scenes may differ)']]), state.ver);
    }
  }

  async function load() {
    clearTimeout(timer);
    try {
      if (state.view === 'day') {
        days = (await api('days')).days;
        if (!days.length) { status(''); $('view').innerHTML = '<div class="card empty">No session recorded yet. Students appear here as soon as they open a guide served by this site.</div>'; refreshFilters([]); return; }
        if (!days.some((d) => d.day === state.day)) state.day = days[0].day;
        data = await api(`runs?day=${state.day}`);
        refreshFilters(data.runs);
        renderDay();
      } else {
        allData = await api('runs');
        refreshFilters(allData.runs);
        renderAll();
      }
      toHash();
      status(`Updated ${new Date().toLocaleTimeString()} · relay ${RELAY}`);
    } catch (e) {
      status(`Cannot read the timing: ${e.message}`);
    }
    if (state.view === 'day' && $('live').checked && state.day === days[0]?.day) timer = setTimeout(load, 20000);
  }

  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
    state.view = b.dataset.view;
    state.sort = state.view === 'day' ? { key: 'pos', dir: -1 } : { key: 'i', dir: 1 };
    load();
  }));
  $('day').addEventListener('change', (e) => { state.day = e.target.value; load(); });
  $('part').addEventListener('change', (e) => { state.part = e.target.value; state.ver = null; if (state.view === 'day') { refreshFilters(data.runs); renderDay(); } else { refreshFilters(allData.runs); renderAll(); } toHash(); });
  $('ver').addEventListener('change', (e) => { state.ver = e.target.value; toHash(); renderAll(); });
  $('min').addEventListener('change', renderAll);
  $('show-hidden').addEventListener('change', () => (state.view === 'day' ? renderDay() : renderAll()));
  $('live').addEventListener('change', load);
  $('reload').addEventListener('click', load);
  $('view').addEventListener('click', (e) => {
    const b = e.target.closest('[data-hide]');
    if (!b) return;
    const id = b.dataset.hide;
    if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
    store('monitor:hidden', [...hidden]);
    renderDay();
  });
  window.addEventListener('hashchange', () => { fromHash(); load(); });
  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => (state.view === 'day' ? renderDay() : renderAll()), 150); });

  fromHash();
  if (state.view === 'all') state.sort = { key: 'i', dir: 1 };
  load();
})();
