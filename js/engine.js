/* MBSE Shepherd engine: reads content/*.js, renders one scene at a time,
   keeps progress and answers in the browser. No build step, no dependency. */
(function () {
  'use strict';

  const CFG = window.COURSE_CONFIG;
  const LINKS = window.MODEL_LINKS;
  const COURSE = window.COURSE;
  const WIDGETS = window.WIDGETS || {};

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ───────── icons ───────── */
  const STROKE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const ICONS = {
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    cursor: '<path d="M5 3l5.2 16 2.4-6.4L19 10.2z"/><path d="M13 13l6 6"/>',
    pencil: '<path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M14 6.5l3.5 3.5"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 8v5M8 10.5h5"/>',
    open: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    caret: '<path d="M9 5l7 7-7 7"/>',
    image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/>',
    text: '<path d="M5 6h14M5 11h14M5 16h9"/>',
    chain: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.3 1.1 2.2h5c.1-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.3v.1"/>',
    flag: '<path d="M6 21V4"/><path d="M6 5h11l-2.5 3.5L17 12H6"/>',
    waypoint: '<path d="M12 4l8 15H4z"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.1M4.5 12h.1M4.5 18h.1"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4.5V9h4.5"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M5 19.5h14"/>',
    /* model element types */
    package: '<path d="M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 8V5a1 1 0 0 1 1-1h6l2 4"/>',
    block: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M3.5 10h17"/>',
    usecase: '<ellipse cx="12" cy="12" rx="9" ry="5.5"/>',
    actor: '<circle cx="12" cy="5.5" r="2.5"/><path d="M12 8v7M7 11h10M12 15l-4 5.5M12 15l4 5.5"/>',
    activity: '<rect x="3.5" y="6.5" width="17" height="11" rx="5.5"/>',
    signal: '<path d="M4 6h12l4.5 6-4.5 6H4z"/>',
    ucd: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><ellipse cx="13.5" cy="12" rx="5" ry="3"/><path d="M6 10v4"/>',
    ibd: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="6" y="9" width="4.5" height="6"/><rect x="13.5" y="9" width="4.5" height="6"/><path d="M10.5 12h3"/>',
    sd: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M8 7v10M16 7v10M8 10.5h8M16 14h-8"/>',
    ad: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><rect x="6" y="9.5" width="5" height="5" rx="2"/><rect x="13.5" y="9.5" width="5" height="5" rx="2"/><path d="M11 12h2.5"/>',
    stm: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><circle cx="7.5" cy="12" r="1.3" fill="currentColor"/><rect x="11.5" y="9" width="7" height="6" rx="2.5"/><path d="M9 12h2.5"/>',
    matrix: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9.5h18M3 14.5h18M9 4v16M15 4v16"/>'
  };
  function ic(name, cls) {
    return `<svg viewBox="0 0 24 24" ${STROKE} aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${ICONS[name] || ICONS.info}</svg>`;
  }

  const KINDS = {
    read: { label: 'Understand', icon: 'eye' },
    do: { label: 'Do in Cameo', icon: 'cursor' },
    answer: { label: 'Your answer', icon: 'pencil' },
    try: { label: 'Try it here', icon: 'play' }
  };
  const TYPE_LABEL = {
    package: 'package', block: 'block', ucd: 'use case diagram', ibd: 'internal block diagram',
    sd: 'sequence diagram', ad: 'activity diagram', stm: 'state machine', matrix: 'allocation matrix',
    usecase: 'use case', actor: 'actor', activity: 'activity', signal: 'signal'
  };
  const PH = {
    screenshot: { tag: 'Screenshot to add', icon: 'image' },
    gif: { tag: 'GIF to record', icon: 'film' },
    text: { tag: 'Text to write', icon: 'text' },
    link: { tag: 'Link to add', icon: 'chain' }
  };
  const TONE_ICON = { note: 'info', tip: 'bulb', warn: 'alert', goal: 'flag' };

  /* ───────── course index ───────── */
  const scenes = COURSE.scenes;
  const chapters = COURSE.chapters;
  const byId = {};
  const chById = {};
  const QUESTIONS = [];
  const NOTES = [];
  const PLACEHOLDERS = [];

  chapters.forEach((c) => { chById[c.id] = c; c.scenes = []; });
  scenes.forEach((s, i) => {
    s.index = i;
    byId[s.id] = s;
    chById[s.ch].scenes.push(s);
    s._steps = [];
    s._dyn = [];
    s._questions = [];
    walk(s.blocks, s, '');
  });

  function walk(blocks, scene, prefix) {
    blocks.forEach((b, bi) => {
      const p = prefix + bi;
      if (b.steps) b.steps.forEach((_, i) => scene._steps.push(stepId(scene, p, i)));
      if (b.fromAnswer) scene._dyn.push({ path: p, q: b.fromAnswer.q });
      if (b.question) { scene._questions.push(b.question); QUESTIONS.push(Object.assign({ scene: scene.id }, b.question)); }
      if (b.notes) NOTES.push(Object.assign({ scene: scene.id }, b.notes));
      if (b.placeholder) PLACEHOLDERS.push({ scene: scene.id, path: p, ph: b.placeholder });
      if (b.tabs) b.tabs.forEach((t, ti) => walk(t.blocks || [], scene, p + '.' + ti + '.'));
    });
  }
  function stepId(scene, path, i) { return scene.id + '/' + path + '/' + i; }
  function todoId(sceneId, path, i) { return sceneId + '/' + path + '/t' + i; }

  /* ───────── state ───────── */
  const DEFAULTS = { v: 1, scene: null, last: null, seen: {}, steps: {}, answers: {}, widgets: {}, todos: {}, author: !!CFG.authorMode, theme: null };
  let S = loadState();
  function loadState() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(CFG.storageKey) || 'null'); } catch (e) { s = null; }
    s = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), s && s.v === 1 ? s : {});
    const q = /[?&]author=([01])/.exec(location.search);
    if (q) s.author = q[1] === '1';
    return s;
  }
  let saveTimer = 0;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(CFG.storageKey, JSON.stringify(S)); } catch (e) { /* private mode: keep going without saving */ }
    }, 150);
  }
  function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
  function setPath(obj, path, val) {
    const keys = path.split('.');
    let o = obj;
    keys.slice(0, -1).forEach((k, i) => {
      if (o[k] == null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = val;
  }

  function questionById(id) { return QUESTIONS.find((q) => q.id === id); }
  // A list question shows its starting rows plus any the student added with +.
  function rowCount(q) { return Math.max(q.initial || 2, ((S.answers[q.id] || {}).items || []).length); }
  function answered(q) {
    const a = S.answers[q.id] || {};
    if (q.type === 'choice') return !!a.choice;
    if (q.type === 'list') return (a.items || []).some((x) => (x || '').trim());
    return !!(a.text || '').trim();
  }
  // Steps of a scene: the fixed ones, plus one per row of any list the scene reads from an answer.
  function stepIds(scene) {
    return scene._dyn.reduce((ids, d) => {
      for (let i = 0; i < rowCount(questionById(d.q)); i++) ids.push(stepId(scene, d.path, i));
      return ids;
    }, scene._steps.slice());
  }
  function stepsDone(scene) { return stepIds(scene).filter((id) => S.steps[id]).length; }
  function sceneStatus(scene) {
    if (!S.seen[scene.id]) return 'new';
    const ids = stepIds(scene);
    if (ids.length) {
      const n = stepsDone(scene);
      return n === ids.length ? 'done' : n ? 'part' : 'seen';
    }
    if (scene._questions.length) return scene._questions.every(answered) ? 'done' : 'seen';
    return 'done';
  }

  /* ───────── inline marks ───────── */
  function inline(src) {
    const rx = /\*\*(.+?)\*\*|\*(.+?)\*|\[\[(.+?)\]\]|\{\{(.+?)\}\}|\(\((.+?)\)\)|<<(.+?)>>/g;
    let out = '';
    let last = 0;
    let m;
    src = String(src);
    while ((m = rx.exec(src))) {
      out += esc(src.slice(last, m.index));
      last = rx.lastIndex;
      if (m[1] != null) out += '<strong>' + inline(m[1]) + '</strong>';
      else if (m[2] != null) out += '<em>' + inline(m[2]) + '</em>';
      else if (m[3] != null) {
        /* keep the punctuation that follows a chip on the same line as the chip */
        const tail = /^[.,;:!?)]/.exec(src.slice(last));
        if (tail) { out += '<span class="nb">' + linkChip(m[3]) + esc(tail[0]) + '</span>'; last += 1; rx.lastIndex = last; }
        else out += linkChip(m[3]);
      }
      else if (m[4] != null) out += '<span class="ui">' + esc(m[4]).replace(/ &gt; /g, ' <i>›</i> ') + '</span>';
      else if (m[5] != null) out += inlineIcon(m[5]);
      else if (m[6] != null) out += `<button type="button" class="cchip" data-copy="${esc(m[6])}" title="Copy">${esc(m[6])}${ic('copy')}</button>`;
    }
    return out + esc(src.slice(last));
  }
  function inlineIcon(name) {
    const i = (CFG.icons || {})[name];
    return i ? `<img class="ico" src="${esc(i.src)}" alt="${esc(i.alt)}">` : '';
  }
  function linkChip(spec) {
    const [key, label] = spec.split('|');
    const L = LINKS[key];
    if (!L) return `<mark>[[${esc(spec)}]]</mark>`;
    const unset = !L.url && !L.id && !L.made ? '<span class="unset author-only">no link</span>' : '';
    return `<button type="button" class="mlink" data-link="${esc(key)}" title="Where is it in the model?">${ic(L.type)}<span>${esc(label || L.name)}</span>${unset}</button>`;
  }

  /* ───────── model links ───────── */
  function treeHTML(L) {
    const kinds = L.kinds || L.path.map((_, i) => (i === L.path.length - 1 ? L.type : 'package'));
    return '<ol class="tree">' + L.path.map((name, i) => {
      const last = i === L.path.length - 1;
      return `<li style="--d:${i}"${last ? ' class="target"' : ''}>${ic(kinds[i])}<span>${esc(name)}</span>${last ? `<i class="tkind">${esc(TYPE_LABEL[L.type] || '')}</i>` : ''}</li>`;
    }).join('') + '</ol>';
  }
  function linkActions(key) {
    const L = LINKS[key];
    let h = '';
    if (L.note) h += `<p class="path-note">${esc(L.note)}</p>`;
    if (L.made) h += '<p class="path-note"><strong>You create this element</strong> during the exercise: it is not in the model yet.</p>';
    h += '<div class="btn-row">';
    if (L.id) {
      h += `<button type="button" class="btn small" data-cameo-open="${esc(key)}">${ic("open")}Open in Cameo</button>`;
    }
    if (L.url) {
      h += `<a class="btn small" href="${esc(L.url)}">${ic('open')}Open in Cameo</a>`;
      h += `<button type="button" class="btn ghost small" data-copy="${esc(L.url)}">${ic('chain')}Copy link</button>`;
    }
    h += `<button type="button" class="btn ghost small" data-copy="${esc(L.path.join(' / '))}">${ic('copy')}Copy path</button></div>`;
    if (L.id) h += `<p class="path-note cameo-status" data-cameo-status>${esc(cameoHint())}</p>`;
    if (L.url && CFG.linkHelp) h += `<p class="path-note">${esc(CFG.linkHelp)}</p>`;
    if (!L.url && !L.id && !L.made) h += `<span class="unset-note author-only">Link not set. Add its url in content/model-links.js, entry "${esc(key)}".</span>`;
    return h;
  }
  /* ───────── connection to Cameo (js/bridge.js) ───────── */
  const B = window.Bridge;
  const CAMEO_TEXT = {
    off: "Not connected to Cameo. Use the Cameo button at the top to enter your code.",
    connecting: "Connecting to Cameo...",
    waiting: "Cameo is not reachable right now. Retrying.",
    connected: "Connected to Cameo."
  };
  function cameoHint() { const st = B ? B.state() : { status: "off" }; return st.error || CAMEO_TEXT[st.status] || ""; }
  function refreshCameo() {
    const st = B.state();
    const btn = document.getElementById("cameo-btn");
    if (btn) btn.dataset.status = st.status;
    document.querySelectorAll("[data-cameo-status]").forEach((el) => { el.textContent = cameoHint(); });
    const box = document.getElementById("cameo-box");
    if (box) box.innerHTML = cameoBody(st);
  }
  function cameoBody(st) {
    if (st.status === "connected" || st.status === "waiting" || st.status === "connecting") {
      return `<p><strong>Code ${esc(st.code)}</strong> - ${esc(cameoHint())}</p>
        <div class="btn-row"><button type="button" class="btn ghost small" data-cameo-leave>Disconnect</button></div>`;
    }
    return `<p>Cameo shows a 6-letter code in the menu <strong>OMF &gt; Relay pairing code</strong>. Type it here to open elements of the model from this guide.</p>
      <form class="cameo-form" data-cameo-form><input class="cameo-code" name="code" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCDEF" aria-label="Pairing code" value="${esc(st.tried || '')}">
      <button type="submit" class="btn small">Connect</button></form>${st.error ? `<p class="cameo-error" role="alert">${esc(st.error)}</p>` : ""}`;
  }
  function openCameo() {
    if (!B) return;
    openOverlay({ kind: "dialog", label: "Cameo", title: "Connect to Cameo", body: `<div id="cameo-box" style="display:grid;gap:.9rem">${cameoBody(B.state())}</div>` });
  }
  function openInCameo(key, btn) {
    const L = LINKS[key];
    if (!B || B.state().status !== "connected") { openCameo(); return; }
    btn.disabled = true;
    B.open(L.id, L.type).then(() => toast("Shown in Cameo"), () => toast("Cameo could not show it")).then(() => { btn.disabled = false; });
  }

  function openLink(key) {
    const L = LINKS[key];
    if (!L) return;
    openOverlay({ kind: 'dialog', label: 'In the Model Browser', title: L.name, body: `<div style="display:grid;gap:.9rem">${treeHTML(L)}${linkActions(key)}</div>` });
  }

  /* ───────── block renderers ───────── */
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function figureHTML(f, extra) {
    const size = f.size || '';
    return `<figure class="fig ${size} ${extra || ''}">
      <button type="button" class="fig-frame" data-zoom="${esc(f.src)}" data-cap="${esc(f.caption || '')}" aria-label="Enlarge the image">
        <img src="${esc(f.thumb || f.src)}" alt="${esc(f.alt || '')}"${f.w ? ` width="${f.w}" height="${f.h}"` : ''} loading="lazy">
        <span class="fig-zoom">${ic('zoom')}</span>
      </button>
      ${f.caption ? `<figcaption>${inline(f.caption)}</figcaption>` : ''}
    </figure>`;
  }

  function videoHTML(v) {
    return `<figure class="fig video-fig">
      <div class="video-frame"><video src="${esc(v.src)}" width="${v.w}" height="${v.h}" aria-label="${esc(v.alt || '')}" autoplay muted loop playsinline controls preload="auto"></video></div>
      ${v.caption ? `<figcaption>${inline(v.caption)}</figcaption>` : ''}
    </figure>`;
  }

  function stepHTML(id, n, item) {
    const o = typeof item === 'string' ? { t: item } : item;
    const on = !!S.steps[id];
    return `<li class="step" role="checkbox" aria-checked="${on}" tabindex="0" data-step="${esc(id)}">
      <span class="step-n"><b>${n}</b>${CHECK}</span>
      <div class="step-body${o.fig ? ' step-split' : ''}"><div>${inline(o.t)}${o.note ? `<div class="step-note">${inline(o.note)}</div>` : ''}</div>${o.fig ? figureHTML(o.fig, 'step-fig') : ''}</div>
    </li>`;
  }

  function placeholderHTML(sceneId, path, ph) {
    const k = PH[ph.kind] || PH.text;
    return `<aside class="ph" data-kind="${esc(ph.kind)}">
      <div class="ph-art">${ic(k.icon)}</div>
      <div><span class="ph-tag">${k.tag}</span><strong class="ph-title">${esc(ph.title)}</strong>${todoListHTML(sceneId, path, ph)}</div>
    </aside>`;
  }
  function todoListHTML(sceneId, path, ph) {
    return '<ul class="todo-list">' + ph.todo.map((t, i) => {
      const id = todoId(sceneId, path, i);
      return `<li><label><input type="checkbox" data-todo="${esc(id)}"${S.todos[id] ? ' checked' : ''}><span>${esc(t)}</span></label></li>`;
    }).join('') + '</ul>';
  }

  function listRowHTML(q, i, items) {
    const label = esc(q.itemLabel || 'Item');
    return `<div class="q-item"><b>${i + 1}</b><div class="field"><input type="text" id="q-${q.id}-i${i}" aria-label="${label} ${i + 1}" placeholder="${label} ${i + 1}" data-ans="${q.id}.items.${i}" value="${esc(items[i] || '')}" autocomplete="off"></div></div>`;
  }
  function addListItem(qid) {
    const q = questionById(qid);
    const cur = (S.answers[qid] || {}).items || [];
    const next = Array.from({ length: rowCount(q) + 1 }, (_, i) => cur[i] || '');
    setPath(S.answers, qid + '.items', next);
    save();
    const i = next.length - 1;
    $(`[data-list="${qid}"]`).insertAdjacentHTML('beforeend', listRowHTML(q, i, next));
    $('#q-' + qid + '-i' + i).focus();
  }

  function questionHTML(q) {
    const a = S.answers[q.id] || {};
    let h = `<section class="question" aria-labelledby="q-${q.id}-p"><p class="q-prompt" id="q-${q.id}-p">${inline(q.prompt)}</p>`;
    if (q.type === 'choice') {
      h += '<div class="q-options" role="radiogroup">' + q.options.map((o, i) =>
        `<label class="q-opt"><input type="radio" name="q-${q.id}" id="q-${q.id}-o${i}" value="${esc(o)}" data-ans="${q.id}.choice"${a.choice === o ? ' checked' : ''}><span>${esc(o)}</span></label>`
      ).join('') + '</div>';
    }
    if (q.type === 'list') {
      h += `<div class="q-list" data-list="${q.id}">` + Array.from({ length: rowCount(q) }).map((_, i) => listRowHTML(q, i, a.items || [])).join('') + '</div>' +
        `<button type="button" class="btn ghost small q-add" data-add-item="${q.id}">${ic('plus')}Add a ${esc((q.itemLabel || 'item').toLowerCase())}</button>`;
    }
    if (q.justify) {
      h += `<div class="field"><label for="q-${q.id}-why">Justify</label><textarea id="q-${q.id}-why" data-ans="${q.id}.why" placeholder="Explain your reasoning in a few lines.">${esc(a.why || '')}</textarea></div>`;
    }
    return h + '<span class="saved" aria-hidden="true">Saved on this device</span></section>';
  }

  function answersHTML() {
    let h = `<section class="sheet-answers" id="answer-sheet"><h2>Your answer sheet</h2>
      <div class="field"><label for="ans-names">Name(s)</label><input type="text" id="ans-names" data-ans="names" value="${esc(S.answers.names || '')}" autocomplete="off"></div>`;
    QUESTIONS.forEach((q) => {
      const a = S.answers[q.id] || {};
      h += `<div class="ans"><span class="mono-label">${esc(byId[q.scene].title)}</span><strong>${inline(q.prompt)}</strong>`;
      if (q.type === 'choice') h += a.choice ? `<p>${esc(a.choice)}</p>` : '<p class="empty">Not answered yet</p>';
      if (q.type === 'list') {
        const items = (a.items || []).map((x) => (x || '').trim()).filter(Boolean);
        h += items.length ? '<ol>' + items.map((x) => `<li>${esc(x)}</li>`).join('') + '</ol>' : '<p class="empty">Not answered yet</p>';
      }
      if (q.justify) h += a.why ? `<p class="why">${esc(a.why)}</p>` : '<p class="empty">No justification yet</p>';
      h += `<button type="button" class="btn ghost small" data-goto="${q.scene}" style="justify-self:start;margin-top:.3rem">${ic('pencil')}Edit</button></div>`;
    });
    NOTES.forEach((n) => {
      const v = getPath(S.answers, 'notes.' + n.id);
      h += `<div class="ans"><span class="mono-label">${esc(byId[n.scene].title)}</span><strong>${esc(n.label)}</strong>${v ? `<p>${esc(v)}</p>` : '<p class="empty">No notes</p>'}</div>`;
    });
    return h + `<div class="btn-row"><button type="button" class="btn" data-action="copy-answers">${ic('copy')}Copy my answers</button><button type="button" class="btn ghost" data-action="print">${ic('print')}Print</button></div></section>`;
  }
  function answersText() {
    const L = [CFG.part, CFG.course, ''];
    if (S.answers.names) L.push('Name(s): ' + S.answers.names, '');
    QUESTIONS.forEach((q) => {
      const a = S.answers[q.id] || {};
      L.push(byId[q.scene].title + ' - ' + q.prompt);
      if (q.type === 'choice') L.push('Answer: ' + (a.choice || '(not answered)'));
      if (q.type === 'list') {
        const items = (a.items || []).map((x) => (x || '').trim()).filter(Boolean);
        if (items.length) items.forEach((x, i) => L.push((i + 1) + '. ' + x));
        else L.push('(not answered)');
      }
      if (q.justify) L.push('Justification: ' + (a.why || ''));
      L.push('');
    });
    NOTES.forEach((n) => { L.push(n.label + ':', getPath(S.answers, 'notes.' + n.id) || '', ''); });
    return L.join('\n');
  }

  function faqHTML() {
    return '<div class="faq">' + COURSE.faq.map((f, i) =>
      `<div class="faq-item"><button type="button" class="faq-q" aria-expanded="false" aria-controls="faq-a${i}"><span>${inline(f.q)}</span>${ic('plus')}</button>
       <div class="faq-a" id="faq-a${i}"><div>${f.a.split('\n\n').map((p) => `<p>${inline(p)}</p>`).join('')}</div></div></div>`
    ).join('') + '</div>';
  }

  function renderBlock(b, scene, path) {
    if (b.p) return `<p class="b-p">${inline(b.p)}</p>`;
    if (b.h) return `<h2 class="b-h">${inline(b.h)}</h2>`;
    if (b.list) return '<ul class="b-list">' + b.list.map((x) => `<li>${inline(x)}</li>`).join('') + '</ul>';
    if (b.steps) {
      const start = b.start || 1;
      return '<ol class="steps">' + b.steps.map((it, i) => stepHTML(stepId(scene, path, i), start + i, it)).join('') + '</ol>';
    }
    if (b.figure) return figureHTML(b.figure);
    if (b.video) return videoHTML(b.video);
    if (b.placeholder) return placeholderHTML(scene.id, path, b.placeholder);
    if (b.callout) {
      const c = b.callout;
      return `<div class="callout tone-${c.tone}"><span class="callout-ico">${ic(TONE_ICON[c.tone] || 'info')}</span><div><strong class="callout-title">${inline(c.title)}</strong><p>${inline(c.text)}</p></div></div>`;
    }
    if (b.quote) return `<blockquote class="quote"><span class="mono-label">${esc(b.quote.label)}</span><p>${inline(b.quote.text)}</p></blockquote>`;
    if (b.path) {
      const L = LINKS[b.path];
      if (!L) return '';
      return `<div class="pathcard"><div class="pathcard-head"><span class="mono-label">${L.made ? 'Where you create it' : 'Where to go in the Model Browser'}</span></div>${treeHTML(L)}${linkActions(b.path)}</div>`;
    }
    if (b.copy) {
      return `<div class="copyfield"><span class="mono-label">${esc(b.copy.label)}</span><code>${esc(b.copy.value)}</code><button type="button" class="btn ghost small" data-copy="${esc(b.copy.value)}">${ic('copy')}Copy</button></div>`;
    }
    if (b.download) {
      const d = b.download;
      return `<div class="copyfield"><span class="mono-label">${esc(d.label)}</span><code>${esc(d.file)}</code><a class="btn small" href="${esc(encodeURI(d.src))}" download="${esc(d.file)}">${ic('download')}Download${d.size ? ` · ${esc(d.size)}` : ''}</a></div>`;
    }
    if (b.cards) {
      return '<div class="cards">' + b.cards.map((c) => `<div class="card">${c.n ? `<span class="card-n">${esc(c.n)}</span>` : ''}<span class="card-title">${inline(c.title)}</span><p>${inline(c.text)}</p></div>`).join('') + '</div>';
    }
    if (b.widget) return `<div data-widget="${esc(b.widget)}" data-opts="${esc(JSON.stringify(b.opts || {}))}"></div>`;
    if (b.question) return questionHTML(b.question);
    if (b.reveal) {
      return `<div class="reveal"><button type="button" class="btn ghost small" data-reveal aria-expanded="false">${ic('bulb')}<span>${esc(b.reveal.label)}</span></button><div class="reveal-body"><div><p>${inline(b.reveal.text)}</p></div></div></div>`;
    }
    if (b.tip) {
      return `<div class="reveal tip-toggle"><button type="button" class="btn ghost small" data-reveal aria-expanded="false">${ic('bulb')}<span>${esc(b.tip.label)}</span></button><div class="reveal-body"><div><div class="tip-body">${(b.tip.blocks || []).map((x, xi) => renderBlock(x, scene, path + '.tip.' + xi)).join('')}</div></div></div></div>`;
    }
    if (b.faq) return faqHTML();
    if (b.notes) {
      const v = getPath(S.answers, 'notes.' + b.notes.id) || '';
      return `<div class="notes field"><label for="notes-${b.notes.id}">${esc(b.notes.label)}</label><textarea id="notes-${b.notes.id}" data-ans="notes.${b.notes.id}" placeholder="${esc(b.notes.hint || '')}" style="min-height:9rem">${esc(v)}</textarea><span class="saved" aria-hidden="true">Saved on this device</span></div>`;
    }
    if (b.answers) return answersHTML();
    if (b.tabs) {
      return `<div class="tabs" data-tabs="${esc(path)}"><div class="tablist" role="tablist">` + b.tabs.map((t, i) =>
        `<button type="button" class="tab" role="tab" aria-selected="${i === 0}" data-tab="${i}"><b>${esc(t.label)}</b>${t.sub ? `<small>${esc(t.sub)}</small>` : ''}</button>`
      ).join('') + '</div>' + b.tabs.map((t, i) =>
        `<div class="tabpanel" role="tabpanel" data-panel="${i}"${i ? ' hidden' : ''}>${t.link ? `<p class="b-p">Open ${linkChip(t.link)} in Cameo.</p>` : ''}${(t.blocks || []).map((x, xi) => renderBlock(x, scene, path + '.' + i + '.' + xi)).join('')}</div>`
      ).join('') + '</div>';
    }
    if (b.fromAnswer) {
      const f = b.fromAnswer;
      const items = (S.answers[f.q] || {}).items || [];
      const n = rowCount(questionById(f.q));
      const any = items.some((x) => x && x.trim());
      let h = '';
      if (!any) {
        h += `<div class="callout tone-warn"><span class="callout-ico">${ic('alert')}</span><div><strong class="callout-title">Question 2 is still empty</strong><p>Name the functions there and they will show up in this checklist.</p><button type="button" class="btn ghost small" data-goto="${esc(f.scene)}" style="margin-top:.5rem">${ic('pencil')}Go to Question 2</button></div></div>`;
      }
      h += '<ol class="steps">' + Array.from({ length: n }).map((_, i) => {
        const name = (items[i] || '').trim();
        return stepHTML(stepId(scene, path, i), i + 1, name ? `Create the activity <<${name.replace(/[<>]/g, '')}>>.` : `Create the activity for ${f.itemLabel.toLowerCase()} ${i + 1}.`);
      }).join('') + '</ol>';
      return `<div style="display:grid;gap:.8rem">${h}</div>`;
    }
    return '';
  }

  /* ───────── scene ───────── */
  const stage = $('#stage');
  let mounted = [];
  let shown = null;

  function sceneHTML(scene) {
    const k = KINDS[scene.kind] || KINDS.read;
    const done = sceneStatus(scene) === 'done' && stepIds(scene).length;
    const head = scene.bare ? '' : `<header class="scene-head">
        <div class="stamp-row">
          <span class="kind kind-${scene.kind}">${ic(k.icon)}${k.label}</span>
          ${scene.ref && !/^Question/.test(scene.ref) ? `<span class="ref" title="Section of the handout">§ ${esc(scene.ref)}</span>` : ''}
          <span class="done-stamp"${done ? '' : ' hidden'}>Done</span>
        </div>
        <h1>${inline(scene.title)}</h1>
        ${scene.lead ? `<p class="lead">${inline(scene.lead)}</p>` : ''}
        <div class="waypoint-rule">${ic('waypoint')}</div>
      </header>`;
    return `<article class="scene" data-scene="${scene.id}">${head}<div class="blocks">${scene.blocks.map((b, i) => renderBlock(b, scene, String(i))).join('')}</div></article>`;
  }

  function show(scene, opts) {
    opts = opts || {};
    mounted.forEach((fn) => { try { fn(); } catch (e) { /* widget already gone */ } });
    mounted = [];
    const dir = shown && scene.index < shown.index ? 'back' : 'fwd';
    const same = shown === scene;
    shown = scene;
    S.scene = scene.id;
    if (scene.index > 0) S.last = scene.id;
    S.seen[scene.id] = true;
    save();

    stage.innerHTML = sceneHTML(scene);
    const art = stage.firstElementChild;
    art.dataset.dir = dir;
    if (!same && !opts.quiet) art.classList.add('enter');
    $$('.scene-head, .blocks > *', art).forEach((el, i) => el.style.setProperty('--i', Math.min(i, 8)));
    mountWidgets(art, scene);
    refreshChrome();
    document.title = (scene.index ? scene.title + ' · ' : '') + CFG.appName;
    if (!same) {
      window.scrollTo(0, 0);
      if (opts.focus !== false) stage.focus({ preventScroll: true });
    }
  }

  function mountWidgets(root, scene) {
    $$('[data-widget]', root).forEach((el) => {
      const fn = WIDGETS[el.dataset.widget];
      if (!fn) { el.textContent = ''; return; }
      let opts = {};
      try { opts = JSON.parse(el.dataset.opts || '{}'); } catch (e) { opts = {}; }
      const key = scene.id + '/' + el.dataset.widget + (opts.mode ? ':' + opts.mode : '');
      const api = {
        scene, scenes, chapters, config: CFG, links: LINKS, inline, icon: ic, esc,
        go, next: () => step(1), toast, openLink, status: sceneStatus, stepsDone,
        last: S.last, answers: () => S.answers,
        get: () => S.widgets[key],
        set: (v) => { S.widgets[key] = v; save(); },
        confetti
      };
      try {
        const off = fn(el, opts, api);
        if (typeof off === 'function') mounted.push(off);
      } catch (e) {
        console.error('Widget ' + el.dataset.widget + ' failed', e);
        el.innerHTML = '<p class="path-note">This interactive part could not start.</p>';
      }
    });
  }

  /* ───────── chrome: crumb, route, dock ───────── */
  const routeEl = $('#route');
  function buildRoute() {
    routeEl.innerHTML = chapters.map((c) => `<span class="leg" style="--n:${c.scenes.length}" data-ch="${c.id}" title="${esc(c.code + ' · ' + c.title)}"><i></i><b>${esc(c.code)}</b></span>`).join('') +
      '<span class="route-drone" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="7" height="7" rx="1.5" fill="currentColor"/><g fill="var(--surface)" stroke="currentColor" stroke-width="1.8"><circle class="rotor" cx="6.5" cy="6.5" r="3.4"/><circle class="rotor" cx="17.5" cy="6.5" r="3.4"/><circle class="rotor" cx="6.5" cy="17.5" r="3.4"/><circle class="rotor" cx="17.5" cy="17.5" r="3.4"/></g></svg></span>';
  }
  function placeDrone() {
    if (!shown) return;
    const ch = chById[shown.ch];
    const leg = $(`.leg[data-ch="${ch.id}"]`, routeEl);
    const drone = $('.route-drone', routeEl);
    if (!leg || !drone) return;
    const frac = (ch.scenes.indexOf(shown) + 1) / ch.scenes.length;
    drone.style.left = (leg.offsetLeft + leg.offsetWidth * frac) + 'px';
  }
  let flyTimer = 0;
  function refreshChrome() {
    const scene = shown;
    const ch = chById[scene.ch];
    const pos = ch.scenes.indexOf(scene);
    $('#crumb-code').textContent = ch.code;
    $('#crumb-title').textContent = ch.title;
    $('#crumb-count').textContent = (pos + 1) + ' / ' + ch.scenes.length;

    const ci = chapters.indexOf(ch);
    $$('.leg', routeEl).forEach((leg, i) => {
      leg.classList.toggle('now', i === ci);
      $('i', leg).style.width = (i < ci ? 100 : i > ci ? 0 : ((pos + 1) / ch.scenes.length) * 100) + '%';
    });
    const drone = $('.route-drone', routeEl);
    drone.classList.add('flying');
    clearTimeout(flyTimer);
    flyTimer = setTimeout(() => drone.classList.remove('flying'), 800);
    placeDrone();
    routeEl.setAttribute('aria-label', `Scene ${scene.index + 1} of ${scenes.length}. Open the flight plan.`);

    const next = scenes[scene.index + 1];
    const back = $('.dock-back');
    const nextBtn = $('.dock-next');
    back.disabled = scene.index === 0;
    nextBtn.disabled = !next;
    $('#next-label').textContent = scene.index === 0 ? 'Start' : next ? 'Next' : 'The end';
    $('#next-title').textContent = next ? next.title : '';
    refreshDockInfo();
  }
  function refreshDockInfo() {
    const scene = shown;
    const total = stepIds(scene).length;
    const n = stepsDone(scene);
    $('#dock-info').innerHTML = `<b>${scene.index + 1} / ${scenes.length}</b>` + (total ? `<span>${n} of ${total} steps</span>` : '');
    $('.dock-next').classList.toggle('ready', !!total && n === total);
  }

  /* ───────── navigation ───────── */
  function go(id) {
    if (!byId[id]) return;
    if (location.hash.slice(1) === id) show(byId[id]);
    else location.hash = id;
  }
  function step(d) {
    const t = scenes[shown.index + d];
    if (t) go(t.id);
  }
  function fromHash() {
    const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    return byId[id] || null;
  }
  window.addEventListener('hashchange', () => { const s = fromHash(); if (s) { closeOverlay(); show(s); } });
  window.addEventListener('resize', placeDrone);

  /* ───────── overlays ───────── */
  const ovRoot = $('#overlay-root');
  let lastFocus = null;
  function closeOverlay() {
    if (!ovRoot.firstChild) return;
    ovRoot.innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }
  function openOverlay(o) {
    const keep = lastFocus || document.activeElement;
    closeOverlay();
    lastFocus = keep;
    const el = document.createElement('div');
    el.className = 'ov ' + o.kind + (o.wide ? ' wide' : '');
    el.innerHTML = `<div class="ov-panel" role="dialog" aria-modal="true" aria-label="${esc(o.title)}">
      <div class="ov-head"><div>${o.label ? `<span class="mono-label">${esc(o.label)}</span>` : ''}<h2>${esc(o.title)}</h2></div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${ic('close')}</button></div>
      <div class="ov-body">${o.body}</div></div>`;
    el.addEventListener('click', (e) => { if (e.target === el) closeOverlay(); });
    ovRoot.appendChild(el);
    document.body.style.overflow = 'hidden';
    $('[data-close]', el).focus({ preventScroll: true });
    if (o.onMount) o.onMount(el);
    return el;
  }
  function openLightbox(src, cap) {
    const keep = document.activeElement;
    closeOverlay();
    lastFocus = keep;
    const el = document.createElement('div');
    el.className = 'ov lightbox';
    el.innerHTML = `<div class="lb-bar"><span>${esc(cap || '')}</span><button type="button" class="icon-btn" data-close>${ic('close')}<span>Close</span></button></div>
      <div class="lb-scroll" data-noswipe><img src="${esc(src)}" alt="${esc(cap || '')}"></div>`;
    el.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG') $('.lb-scroll', el).classList.toggle('zoomed');
      else if (!e.target.closest('.lb-bar') || e.target.closest('[data-close]')) closeOverlay();
    });
    ovRoot.appendChild(el);
    document.body.style.overflow = 'hidden';
    $('[data-close]', el).focus({ preventScroll: true });
  }

  function tocHTML() {
    let h = '<div class="toc">';
    chapters.forEach((c) => {
      const done = c.scenes.filter((s) => sceneStatus(s) === 'done').length;
      h += `<div class="toc-ch"><div class="toc-ch-head"><span class="crumb-code">${esc(c.code)}</span><b>${esc(c.title)}</b><span>${done}/${c.scenes.length}</span></div><ul class="toc-list">`;
      c.scenes.forEach((s) => {
        h += `<li><button type="button" class="toc-item" data-goto="${s.id}"${s === shown ? ' aria-current="true"' : ''}><span class="dot ${sceneStatus(s)}"></span><span>${esc(s.title)}</span><span class="toc-kind">${KINDS[s.kind].label}</span></button></li>`;
      });
      h += '</ul></div>';
    });
    const dark = effectiveTheme() === 'dark';
    h += `<div class="menu-group">
        <div class="menu-row"><label class="switch"><input type="checkbox" data-setting="dark"${dark ? ' checked' : ''}><i></i>Dark theme</label></div>
        <div class="menu-row"><label class="switch"><input type="checkbox" data-setting="author"${S.author ? ' checked' : ''}><i></i>Author mode</label><span class="mono-label">shows what is missing</span></div>
        <div class="btn-row">
          <button type="button" class="btn ghost small" data-goto="finish">${ic('pencil')}My answers</button>
          <button type="button" class="btn ghost small author-only" data-action="board">${ic('list')}Authoring to-do</button>
          <button type="button" class="btn ghost small" data-action="reset">${ic('reset')}Reset my progress</button>
        </div>
      </div></div>`;
    return h;
  }
  function openToc() {
    const el = openOverlay({ kind: 'drawer', label: `${scenes.filter((s) => sceneStatus(s) === 'done').length} of ${scenes.length} scenes done`, title: 'Flight plan', body: tocHTML() });
    const cur = $('[aria-current="true"]', el);
    if (cur) cur.scrollIntoView({ block: 'center' });
  }
  function openFaq() {
    openOverlay({ kind: 'dialog', wide: true, label: CFG.part, title: 'Frequently asked questions', body: faqHTML() });
  }
  function openBoard() {
    const unset = Object.keys(LINKS).filter((k) => !LINKS[k].url && !LINKS[k].made);
    const total = Object.keys(LINKS).filter((k) => !LINKS[k].made).length;
    const todoCount = PLACEHOLDERS.reduce((n, p) => n + p.ph.todo.length, 0);
    const todoDone = PLACEHOLDERS.reduce((n, p) => n + p.ph.todo.filter((_, i) => S.todos[todoId(p.scene, p.path, i)]).length, 0);
    let h = `<div class="board">
      <p>Everything the Word handout did not contain, and everything worth a second look. Ticks are saved on this device only.</p>
      <section><h3>Missing content <span class="pill">${todoDone}/${todoCount} done</span></h3>`;
    PLACEHOLDERS.forEach((p) => {
      const k = PH[p.ph.kind] || PH.text;
      h += `<div class="board-item"><span class="board-where">${esc(chById[byId[p.scene].ch].code)} · ${esc(byId[p.scene].title)} · ${k.tag}</span><strong>${esc(p.ph.title)}</strong>${todoListHTML(p.scene, p.path, p.ph)}<button type="button" class="btn ghost small" data-goto="${p.scene}">Go to the scene</button></div>`;
    });
    h += `</section><section><h3>Model links <span class="pill">${total - unset.length}/${total} set</span></h3>
      <p>Each entry of <code>content/model-links.js</code> has an empty <code>url</code>. Once filled, the chip gets an “Open in Cameo” button.</p>`;
    unset.forEach((k) => {
      h += `<div class="board-item"><span class="board-where">${esc(k)} · ${esc(TYPE_LABEL[LINKS[k].type])}</span><span>${esc(LINKS[k].path.join(' / '))}</span></div>`;
    });
    h += '</section><section><h3>Noticed while converting the handout</h3>';
    COURSE.authorNotes.forEach((n) => {
      h += `<div class="board-item"><span class="board-where">${esc(chById[byId[n.scene].ch].code)} · ${esc(byId[n.scene].title)}</span><p>${esc(n.text)}</p><button type="button" class="btn ghost small" data-goto="${n.scene}">Go to the scene</button></div>`;
    });
    h += '</section></div>';
    openOverlay({ kind: 'dialog', wide: true, label: 'Author mode', title: 'Authoring to-do', body: h });
  }

  /* ───────── feedback helpers ───────── */
  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }
  function copyText(text, el) {
    const ok = () => {
      toast('Copied');
      if (el) { el.classList.add('copied'); setTimeout(() => el.classList.remove('copied'), 1200); }
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let done = false;
      try { done = document.execCommand('copy'); } catch (e) { done = false; }
      ta.remove();
      if (done) ok(); else toast('Select the text and copy it by hand');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
    else fallback();
  }
  function confetti(n) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    const colors = ['var(--route)', 'var(--sky)', 'var(--grass)', 'var(--amber)', 'var(--pasture)'];
    for (let i = 0; i < (n || 60); i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px');
      p.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      p.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
      p.style.animationDelay = (Math.random() * 0.4) + 's';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4000);
  }
  function effectiveTheme() {
    return S.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function applySettings() {
    if (S.theme) document.documentElement.dataset.theme = S.theme;
    else delete document.documentElement.dataset.theme;
    document.body.classList.toggle('author', !!S.author);
  }

  /* ───────── events ───────── */
  function toggleStep(el) {
    const id = el.dataset.step;
    const was = sceneStatus(shown);
    const on = !S.steps[id];
    if (on) S.steps[id] = true; else delete S.steps[id];
    save();
    el.setAttribute('aria-checked', String(on));
    if (on) {
      el.classList.remove('just');
      void el.offsetWidth;
      el.classList.add('just');
      setTimeout(() => el.classList.remove('just'), 700);
    }
    refreshDockInfo();
    const now = sceneStatus(shown);
    const stamp = $('.done-stamp', stage);
    if (stamp) {
      stamp.hidden = now !== 'done';
      if (now === 'done' && was !== 'done') { stamp.classList.remove('slap'); void stamp.offsetWidth; stamp.classList.add('slap'); }
    }
  }

  let resetArmed = 0;
  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-cameo-form]');
    if (!form) return;
    e.preventDefault();
    B.connect(form.elements.code.value);
  });
  if (B) { B.onChange(refreshCameo); B.start(); }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    if (t.closest('[data-close]') && t.closest('.ov-panel')) { closeOverlay(); return; }

    const goto = t.closest('[data-goto]');
    if (goto) { closeOverlay(); go(goto.getAttribute('data-goto')); return; }

    const cameoOpen = t.closest('[data-cameo-open]');
    if (cameoOpen) { openInCameo(cameoOpen.dataset.cameoOpen, cameoOpen); return; }
    if (t.closest('[data-cameo-leave]')) { B.disconnect(); return; }
    if (t.closest('#cameo-btn')) { openCameo(); return; }

    const link = t.closest('[data-link]');
    if (link) { openLink(link.dataset.link); return; }

    const copy = t.closest('[data-copy]');
    if (copy) { copyText(copy.dataset.copy, copy); return; }

    const zoom = t.closest('[data-zoom]');
    if (zoom) { openLightbox(zoom.dataset.zoom, zoom.dataset.cap); return; }

    const act = t.closest('[data-action]');
    if (act) {
      const a = act.dataset.action;
      if (a === 'next' || a === 'start') step(1);
      else if (a === 'back') step(-1);
      else if (a === 'home') go(scenes[0].id);
      else if (a === 'toc') openToc();
      else if (a === 'faq') openFaq();
      else if (a === 'board') openBoard();
      else if (a === 'print') window.print();
      else if (a === 'copy-answers') copyText(answersText(), act);
      else if (a === 'reset') {
        if (Date.now() - resetArmed < 4000) {
          try { localStorage.removeItem(CFG.storageKey); } catch (err) { /* nothing stored */ }
          const keep = { author: S.author, theme: S.theme };
          S = Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), keep);
          save();
          closeOverlay();
          shown = null;
          if (location.hash.slice(1) === scenes[0].id || !location.hash) show(scenes[0]); else go(scenes[0].id);
          toast('Progress reset');
        } else {
          resetArmed = Date.now();
          act.lastChild.textContent = 'Tap again to erase everything';
        }
      }
      return;
    }

    const faq = t.closest('.faq-q');
    if (faq) {
      const item = faq.parentElement;
      const open = item.classList.toggle('open');
      faq.setAttribute('aria-expanded', String(open));
      return;
    }
    const rev = t.closest('[data-reveal]');
    if (rev) {
      const open = rev.parentElement.classList.toggle('open');
      rev.setAttribute('aria-expanded', String(open));
      return;
    }
    const tab = t.closest('[data-tab]');
    if (tab) {
      const box = tab.closest('.tabs');
      $$('[data-tab]', box).forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
      $$(':scope > [data-panel]', box).forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
      return;
    }
    const stepEl = t.closest('.step');
    const addItem = t.closest('[data-add-item]');
    if (addItem) { addListItem(addItem.dataset.addItem); return; }
    if (stepEl && !t.closest('button, a, input, textarea, label')) toggleStep(stepEl);
  });

  function onField(e) {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.matches('[data-ans]')) {
      if (t.type === 'radio' && !t.checked) return;
      setPath(S.answers, t.dataset.ans, t.value);
      save();
      const box = t.closest('.question, .notes');
      const flag = box && $('.saved', box);
      if (flag) { flag.classList.add('show'); clearTimeout(flag._t); flag._t = setTimeout(() => flag.classList.remove('show'), 1600); }
      return;
    }
    if (t.matches('[data-todo]')) {
      if (t.checked) S.todos[t.dataset.todo] = true; else delete S.todos[t.dataset.todo];
      save();
      $$(`[data-todo="${CSS.escape(t.dataset.todo)}"]`).forEach((x) => { x.checked = t.checked; });
      return;
    }
    if (t.matches('[data-setting]')) {
      if (t.dataset.setting === 'dark') S.theme = t.checked ? 'dark' : 'light';
      if (t.dataset.setting === 'author') S.author = t.checked;
      save();
      applySettings();
    }
  }
  document.addEventListener('input', onField);
  document.addEventListener('change', onField);

  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (e.key === 'Escape' && ovRoot.firstChild) { closeOverlay(); return; }
    if (t instanceof Element && t.matches('.step') && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); toggleStep(t); return; }
    if (ovRoot.firstChild || e.altKey || e.ctrlKey || e.metaKey) return;
    if (t instanceof Element && t.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1); }
  });

  /* swipe between scenes on touch screens */
  let touch = null;
  stage.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || (e.target instanceof Element && e.target.closest('input, textarea, [data-noswipe], .fig-frame'))) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    const quick = Date.now() - touch.t < 600;
    touch = null;
    if (quick && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2.2) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ───────── go ───────── */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  buildRoute();
  applySettings();
  const first = fromHash() || byId[S.scene] || scenes[0];
  if (!fromHash() && first.index) history.replaceState(null, '', '#' + first.id);
  show(first, { focus: false });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeDrone);
})();
