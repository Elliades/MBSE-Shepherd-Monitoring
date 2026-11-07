/* The scenario library viewer: the DSL files (library.js, library-private.js), compiled in the page.
   Story: what is sent, what must follow; Matrix: the state of each part, step by step; Source: the DSL, edited
   with a live preview (kept in this tab only: download to keep); JSON: what the plugin reads. */
(function () {
  'use strict';
  const DSL = window.ScenarioDSL;
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* none */ } } };

  const S = {
    texts: (window.SCENARIO_LIBRARY || []).map((t) => ({ path: t.path, text: t.text, saved: t.text })),
    lib: new Map(), files: [], sel: null, tab: store.get('scn.tab') || 'story', kind: 'all', q: ''
  };
  function rebuild() { const r = DSL.load(S.texts.map((t) => ({ path: t.path, text: t.text }))); S.lib = r.docs; S.files = r.files; }
  const fileOf = (p) => S.files.find((f) => f.path === p);
  const fileById = (id) => S.files.find((f) => f.id === id);
  const textOf = (p) => S.texts.find((t) => t.path === p);
  const titleOf = (id) => { const f = fileById(id); return f ? (f.doc.title || id) : id; };
  const kindOf = (id) => { const d = S.lib.get(id); const r = d && d.from ? DSL.resolve(id, S.lib) : d; return (r && r.kind) || 'none'; };
  const folderOf = (p) => { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i).replace(/^library\//, '').replace(/^private\/plugin\//, 'plugin (private)/').replace(/\/(variants|preconditions)$/, ''); };

  /* ── sidebar: per folder, each scenario under the one it starts from (from, else its first given) ── */
  function matches(f) {
    const d = f.doc;
    const r = d.from ? DSL.resolve(f.id, S.lib) || d : d;
    if (S.kind !== 'all' && (r.kind || '') !== S.kind) return false;
    if (!S.q) return true;
    const hay = [r.title, f.id, r.goal, r.description, (r.tags || []).join(' '), f.path].join(' ').toLowerCase();
    return S.q.toLowerCase().split(/\s+/).every((w) => hay.indexOf(w) >= 0);
  }
  function renderSide() {
    const side = $('#side');
    const groups = new Map();
    S.files.forEach((f) => { const g = folderOf(f.path); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(f); });
    let html = '';
    groups.forEach((list, g) => {
      const shown = list.filter(matches);
      if (!shown.length) return;
      const ids = new Set(list.map((f) => f.id));
      const parent = (f) => { const p = f.doc.from || f.doc.given[0]; return p && ids.has(p) && p !== f.id ? p : null; };
      const kids = new Map();
      list.forEach((f) => { const p = parent(f); if (!kids.has(p)) kids.set(p, []); kids.get(p).push(f); });
      const order = (a) => a.slice().sort((x, y) => (x.doc.sequence.length - y.doc.sequence.length) || (!!x.doc.from - !!y.doc.from) || x.path.localeCompare(y.path));
      const showSet = new Set(shown.map((f) => f.id));
      const rows = [];
      const walk = (p, depth, seen) => order(kids.get(p) || []).forEach((f) => {
        if (seen.has(f.id)) return;
        if (showSet.has(f.id)) rows.push([f, S.q || S.kind !== 'all' ? 0 : depth]);
        walk(f.id, depth + 1, new Set(seen).add(f.id));
      });
      walk(null, 0, new Set());
      html += `<details class="group" open><summary>${esc(g || 'scenarios')}<span class="n">${shown.length}</span></summary>`;
      rows.forEach(([f, depth]) => {
        const how = f.doc.sequence.length ? '⧉ assembly' : f.doc.from ? '↳ variant' : '';
        const bad = f.errors.length || DSL.compile(f.id, S.lib).errors.length;
        html += `<div class="item${S.sel === f.path ? ' on' : ''}${bad ? ' err' : ''}" style="--depth:${depth}" data-path="${esc(f.path)}" role="button" tabindex="0">
          <i class="dot ${esc(kindOf(f.id))}"></i><span><span class="t">${esc(f.doc.title || f.id)}${how ? `<span class="how">${how}</span>` : ''}${textOf(f.path).text !== textOf(f.path).saved ? ' <span class="how">• edited</span>' : ''}</span><span class="i">${esc(f.id)}</span></span></div>`;
      });
      html += '</details>';
    });
    side.innerHTML = html || '<p class="empty">No scenario matches.</p>';
  }

  /* ── main ── */
  const labelMap = (json) => { const m = {}; (json.systems || []).concat(json.drivers || []).forEach((x) => { m[x.path] = x.label || x.path; }); return m; };
  const chip = (id, self) => `<span class="chip${self ? ' self' : ''}" ${self ? '' : `data-go="${esc(id)}"`}><i class="dot ${esc(kindOf(id))}"></i>${esc(titleOf(id))}</span>`;
  function header(f, r, comp) {
    const d = r || f.doc;
    const badges = [
      d.kind ? `<span class="badge kind ${esc(d.kind)}">${esc(d.kind)}</span>` : '<span class="badge">no kind</span>',
      d.status ? `<span class="badge${d.status === 'draft' ? ' draft' : ''}">${esc(d.status)}</span>` : '',
      d.version ? `<span class="badge">v${esc(d.version)}</span>` : '',
      `<span class="badge mono">${esc(f.id)}</span>`
    ].join('');
    const meta = [
      ['Author', esc(d.author)], ['Date', esc(d.date)],
      ['Tags', (d.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')],
      ['Traces', (d.traces || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')],
      ['Simulated block', esc(comp.json && comp.json.context)], ['System under test', esc(comp.json && comp.json.cut)],
      ['Use case', esc(d.useCase)],
      ['Timing', comp.json ? `settle ${esc(comp.json.settle != null ? comp.json.settle : 2)} s · timeout ${esc(comp.json.timeout != null ? comp.json.timeout : 10)} s` : ''],
      ['File', `<span class="mono">${esc(f.path)}</span>`]
    ].filter((x) => x[1]).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    /* composition */
    const rows = [];
    const givens = comp.plan.filter((p) => p.role === 'given').map((p) => p.id);
    if (givens.length) rows.push(`<div class="row"><span class="lab">Preconditions</span>${givens.map((g) => chip(g)).join('<span class="arrow">→</span>')}<span class="arrow">→</span>${chip(f.id, true)}</div>`);
    if (f.doc.sequence.length) rows.push(`<div class="row"><span class="lab">Assembles</span>${f.doc.sequence.map((g) => chip(g)).join('<span class="arrow">→</span>')}</div>`);
    if (f.doc.from) rows.push(`<div class="row"><span class="lab">Variant of</span>${chip(f.doc.from)}<span class="arrow">${esc(opsText(f.doc))}</span></div>`);
    const users = DSL.usedBy(f.id, S.lib);
    if (users.length) rows.push(`<div class="row"><span class="lab">Used by</span>${users.map((u) => `${chip(u.id)}<span class="arrow">${u.how === 'given' ? 'as precondition' : u.how === 'from' ? 'as base' : 'in assembly'}</span>`).join(' ')}</div>`);
    return `<section class="head"><div class="badges">${badges}</div><h1>${esc(d.title || f.id)}</h1>
      ${d.goal ? `<p class="goal">${esc(d.goal)}</p>` : ''}${d.description ? `<p class="desc">${esc(d.description)}</p>` : ''}
      ${rows.length ? `<div class="comp">${rows.join('')}</div>` : ''}<dl class="meta">${meta}</dl></section>`;
  }
  function opsText(doc) {
    const n = (doc.ops || []).map((o) => (o.op === 'remove' ? `remove ${o.at}` : o.op === 'cut' ? `cut after ${o.at}` : `${o.op === 'instead' ? 'instead of' : o.op} ${o.at}: ${o.steps.length} step${o.steps.length > 1 ? 's' : ''}`));
    const own = [];
    if (doc.given.length) own.push('given ' + doc.given.join(', '));
    return n.concat(own).join(' · ') || 'same steps';
  }
  function problems(f, comp) {
    const errs = f.errors.map((e) => `${e.line ? 'line ' + e.line + ': ' : ''}${esc(e.message)}`).concat(comp.errors.map((e) => `${esc(e.scenario)}: ${esc(e.message)}`));
    const warns = comp.warnings.map((w) => `${esc(w.scenario)}: ${esc(w.message)}`);
    return (errs.length ? `<div class="problems"><b>${errs.length} error${errs.length > 1 ? 's' : ''}</b><ul>${errs.map((e) => `<li>${e}</li>`).join('')}</ul></div>` : '')
      + (warns.length ? `<div class="problems warn"><b>${warns.length} warning${warns.length > 1 ? 's' : ''}</b><ul>${warns.map((e) => `<li>${e}</li>`).join('')}</ul></div>` : '');
  }

  function stepCard(s, n, labels, changed) {
    const checks = [];
    Object.keys(s.expect || {}).forEach((p) => checks.push(`<div class="check"><span class="part">${esc(labels[p] || p)}</span><span class="st">${s.expect[p].map((x) => `<span class="s">${esc(x)}</span>`).join('')}</span></div>`));
    Object.keys(s.absent || {}).forEach((p) => checks.push(`<div class="check"><span class="part">${esc(labels[p] || p)}</span><span class="st">${s.absent[p].map((x) => `<span class="s not" title="must not be in it">${esc(x)}</span>`).join('')}</span></div>`));
    (s.messages || []).forEach((m) => checks.push(`<div class="msg"><span>✉</span><span class="m">${esc(m)}</span><span class="who">goes by</span></div>`));
    (s.noMessages || []).forEach((m) => checks.push(`<div class="msg none"><span>✉</span><span class="m">${esc(m)}</span><span class="who">must not go by</span></div>`));
    if (s.fault) checks.unshift(`<div class="fault">⚡ ${esc(s.fault)}</div>`);
    if (!checks.length) checks.push('<span class="who">nothing checked</span>');
    return `<div class="step${changed ? ' changed' : ''}"><span class="num">${n}</span>
      <div class="event"><div class="who">${s.into ? `<span class="drv">${esc(labels[s.into] || s.into)}</span> sends` : 'into the system'}</div>
        <div class="sig">${esc(s.signal)}</div>${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
        <span class="sid">${esc(s.id || '')}</span>${changed ? `<span class="chg">${changed}</span>` : ''}</div>
      <div class="checks">${checks.join('')}</div></div>`;
  }
  function story(f, comp) {
    const json = comp.json;
    if (!json) return '';
    const labels = labelMap(json);
    const own = new Map();
    (f.doc.ops || []).forEach((o) => o.steps.forEach((s) => own.set(s.id, o.op === 'instead' ? 'replaced in this variant' : 'added in this variant')));
    let n = 0;
    let html = '';
    const pre = json.phases.filter((p) => p.setup);
    if (pre.length) {
      const steps = pre.reduce((k, p) => k + p.steps.length, 0);
      const srcs = Array.from(new Set(pre.flatMap((p) => [].concat(p.source || []))));
      html += `<details class="pre"><summary><b>Preconditions</b>: ${steps} step${steps > 1 ? 's' : ''} from ${srcs.map((s) => esc(titleOf(s))).join(', ')}. Played to get there, waited for, not measured.</summary><div class="steps">`;
      pre.forEach((p) => { html += `<div class="phase"><h2>${esc(p.name)}</h2></div>`; p.steps.forEach((s) => { n += 1; html += stepCard(s, n, labels); }); });
      html += '</div></details>';
    }
    json.phases.filter((p) => !p.setup).forEach((p) => {
      const srcs = [].concat(p.source || []).filter((s) => s !== f.id);
      html += `<div class="phase"><h2>${esc(p.name)}</h2>${srcs.length ? `<span class="src">${srcs.map((s) => chip(s)).join(' ')}</span>` : ''}</div>`;
      if (p.goal) html += `<p class="phase-goal">${esc(p.goal)}</p>`;
      if (p.reached && Object.keys(p.reached).length) html += `<p class="phase-goal">Reached at least once in this phase: ${Object.keys(p.reached).map((k) => `${esc(labels[k] || k)} ${p.reached[k].map((x) => `<span class="s">${esc(x)}</span>`).join(' ')}`).join(' · ')}</p>`;
      html += '<div class="steps">';
      p.steps.forEach((s) => { n += 1; html += stepCard(s, n, labels, own.get(s.id)); });
      html += '</div>';
    });
    if (json.never) html += `<p class="legend">Never, during the measured part: ${Object.keys(json.never).map((k) => `${esc(labels[k] || k)} ${json.never[k].map((x) => `<span class="s not">${esc(x)}</span>`).join(' ')}`).join(' · ')}</p>`;
    const removed = (f.doc.ops || []).filter((o) => o.op === 'remove' || o.op === 'cut');
    if (removed.length) html += `<p class="ops">From ${esc(titleOf(f.doc.from))}: ${removed.map((o) => (o.op === 'remove' ? `step ${esc(o.at)} removed` : `cut after ${esc(o.at)}`)).join(', ')}.</p>`;
    html += '<p class="legend"><span class="s">State</span> must be active after the step · <span class="s not">State</span> must not be · ✉ a message that must (or must not) go by · ⚡ a fault, said, not injected by the plugin.</p>';
    return html;
  }
  function matrix(comp) {
    const json = comp.json;
    if (!json) return '';
    const labels = labelMap(json);
    const cols = (json.systems || []).map((x) => x.path);
    const last = {};
    let n = 0;
    let body = '';
    json.phases.forEach((p) => {
      body += `<tr class="ph"><td class="ev" colspan="${cols.length + 2}">${esc(p.name)}${p.setup ? ' · precondition' : ''}</td></tr>`;
      p.steps.forEach((s) => {
        n += 1;
        const cells = cols.map((c) => {
          const e = (s.expect || {})[c];
          const a = (s.absent || {})[c];
          let h = '';
          if (e) { last[c] = e; h += e.map((x) => `<span class="s">${esc(x)}</span>`).join(''); }
          if (a) h += a.map((x) => `<span class="s not">${esc(x)}</span>`).join('');
          if (!e && !a && last[c]) h = `<span class="carry" title="last expected, not checked here">${esc(last[c].join(', '))}</span>`;
          return `<td>${h}</td>`;
        }).join('');
        const msgs = (s.messages || []).map((m) => `✉ ${esc(m)}`).concat((s.noMessages || []).map((m) => `<s>✉ ${esc(m)}</s>`)).join('<br>');
        body += `<tr class="${p.setup ? 'setup' : ''}"><td class="ev"><span class="who">${n} · ${esc(s.into ? (labels[s.into] || s.into) : 'system')}</span><br><b>${esc(s.signal)}</b>${s.fault ? `<br><span class="who">⚡ ${esc(s.fault)}</span>` : ''}</td>${cells}<td>${msgs}</td></tr>`;
      });
    });
    return `<div class="mx-wrap"><table class="mx"><thead><tr><th class="ev">Step</th>${cols.map((c) => `<th>${esc(labels[c] || c)}<br><span class="who mono">${esc(c)}</span></th>`).join('')}<th>Messages</th></tr></thead><tbody>${body}</tbody></table></div>
      <p class="legend">Grey rows: preconditions. <span class="carry">In italics</span>: the last state expected for that part, not checked at this step.</p>`;
  }
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function render() {
    renderSide();
    const main = $('#main');
    const f = fileOf(S.sel);
    if (!f) { main.innerHTML = '<p class="empty">Choose a scenario on the left.</p>'; return; }
    const comp = DSL.compile(f.id, S.lib);
    const r = f.doc.from ? DSL.resolve(f.id, S.lib) : f.doc;
    const tabs = [['story', 'Story'], ['matrix', 'Matrix'], ['source', 'Source'], ['json', 'JSON']];
    let body = '';
    if (S.tab === 'story') body = story(f, comp);
    else if (S.tab === 'matrix') body = matrix(comp);
    else if (S.tab === 'source') body = `<div class="src-grid"><div class="editor"><div class="bar"><button type="button" class="btn" data-dl="scn">Download .scn</button><button type="button" class="btn" data-revert>Revert</button><span class="hint">Edits stay in this tab: download to keep them.</span></div><textarea class="dsl" spellcheck="false" aria-label="Scenario source">${esc(textOf(f.path).text)}</textarea></div><div class="preview">${story(f, comp)}</div></div>`;
    else body = `<div class="bar"><button type="button" class="btn" data-dl="json">Download .scenario.json</button><span class="hint">What Simulation Scenarios reads. meta, id, messages, noMessages, fault and source are extensions the plugin ignores.</span></div><pre class="json">${esc(comp.json ? JSON.stringify(comp.json, null, 2) : '')}</pre>`;
    main.innerHTML = header(f, r, comp) + problems(f, comp)
      + `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" class="${S.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>` + body;
    const ta = $('textarea.dsl', main);
    if (ta) {
      let timer = null;
      ta.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          textOf(f.path).text = ta.value;
          rebuild();
          const nf = fileOf(f.path);
          const c2 = DSL.compile(nf.id, S.lib);
          const r2 = nf.doc.from ? DSL.resolve(nf.id, S.lib) : nf.doc;
          $('.head', main).outerHTML = header(nf, r2, c2);
          main.querySelectorAll('.problems').forEach((x) => x.remove());
          $('.head', main).insertAdjacentHTML('afterend', problems(nf, c2));
          $('.preview', main).innerHTML = story(nf, c2);
          renderSide();
        }, 250);
      });
    }
  }

  function select(p, push) {
    S.sel = p;
    const f = fileOf(p);
    if (f && push !== false) history.replaceState(null, '', '#' + encodeURIComponent(f.id));
    render();
    window.scrollTo(0, 0);
  }

  /* events */
  document.addEventListener('click', (e) => {
    const it = e.target.closest('.item');
    if (it) { select(it.dataset.path); return; }
    const go = e.target.closest('[data-go]');
    if (go) { const f = fileById(go.dataset.go); if (f) select(f.path); return; }
    const tab = e.target.closest('[data-tab]');
    if (tab) { S.tab = tab.dataset.tab; store.set('scn.tab', S.tab); render(); return; }
    const kind = e.target.closest('[data-kind]');
    if (kind) { S.kind = kind.dataset.kind; document.querySelectorAll('[data-kind]').forEach((b) => b.classList.toggle('on', b === kind)); renderSide(); return; }
    const dl = e.target.closest('[data-dl]');
    if (dl) {
      const f = fileOf(S.sel);
      if (dl.dataset.dl === 'scn') download(f.path.split('/').pop(), textOf(f.path).text, 'text/plain');
      else download(f.id + '.scenario.json', JSON.stringify(DSL.compile(f.id, S.lib).json, null, 2) + '\n', 'application/json');
      return;
    }
    if (e.target.closest('[data-revert]')) { const t = textOf(S.sel); t.text = t.saved; rebuild(); render(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('item')) select(e.target.dataset.path); });
  $('#q').addEventListener('input', (e) => { S.q = e.target.value.trim(); renderSide(); });
  $('#new').addEventListener('click', () => {
    let k = 1;
    while (S.texts.some((t) => t.path === `drafts/new-${k}.scn`)) k += 1;
    const base = fileOf(S.sel);
    const text = `scenario: A new scenario\nid: draft.new-${k}\nkind: alternative\nversion: 0.1\nstatus: draft\ngoal: What this scenario shows, in one sentence.\ndescription: Why it matters.\nauthor: \ndate: ${new Date().toISOString().slice(0, 10)}\ntags: draft\n${base ? `given: ${base.id}\n` : ''}\nphase ${base && base.doc.phases[0] ? base.doc.phases[0].name : 'Main'}\n\n  step first: operator sends Some Signal\n    note: What happens.\n    then soi.part is Some State\n`;
    S.texts.push({ path: `drafts/new-${k}.scn`, text, saved: '' });
    rebuild(); S.tab = 'source'; select(`drafts/new-${k}.scn`);
  });
  $('#import').addEventListener('change', async (e) => {
    let lastPath = null;
    for (const file of Array.from(e.target.files || [])) {
      try {
        const json = JSON.parse(await file.text());
        const doc = DSL.fromJson(json);
        const name = file.name.replace(/\.scenario\.json$|\.json$/, '');
        doc.id = doc.id || 'imported.' + DSL.slug(name);
        doc.description = doc.description || `Imported from ${file.name}.`;
        const p = `imported/${name}.scn`;
        const old = textOf(p);
        if (old) old.text = DSL.print(doc); else S.texts.push({ path: p, text: DSL.print(doc), saved: '' });
        lastPath = p;
      } catch (err) { alert(`${file.name}: not a scenario file (${err.message})`); }
    }
    e.target.value = '';
    if (lastPath) { rebuild(); select(lastPath); }
  });

  window.addEventListener('hashchange', () => {
    const f = fileById(decodeURIComponent(location.hash.slice(1)));
    if (f && f.path !== S.sel) select(f.path, false);
  });

  rebuild();
  const want = decodeURIComponent(location.hash.slice(1));
  const start = fileById(want) || fileById('arch1.full') || S.files[0];
  S.sel = start ? start.path : null;
  render();
})();
