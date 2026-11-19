/* Scenario DSL: a text form of the *.scenario.json files of MBSE Shepherd > Simulation Scenarios.

   The text is the source, the JSON is what the plugin and "Validate in Cameo" read. Three functions:
     parse(text)          -> { doc, errors }       the text, as a document (nothing resolved);
     print(doc)           -> text                   the document, as text (parse(print(d)) gives d back);
     compile(id, library) -> { json, plan, errors, warnings }
                             a scenario with its preconditions (given), its assembly (sequence) and its
                             derivation (from) resolved, in the plugin format;
     fromJson(json)       -> doc                    a plugin file, as a document (flat: preconditions inline).
   library: a Map (or object) id -> doc.

   A scenario is about one thing. What leads there is said by reference to other scenarios:
     given: a, b        played first as preconditions (setup phases: synchronised on, not measured), each once,
                        with their own givens before them;
     sequence: a, b, c  an assembly: the scenarios one after the other, all measured;
     from: a            a variant of a: its steps, changed by after / before / instead of / remove / cut after.

   Grammar (one statement per line, # starts a comment line, indentation is free):
     scenario: <title>           id: <id>          kind: nominal | alternative | dysfunctional
     version: <v>                status: <s>       goal: <objective>        description: <text>
     author: <a>                 date: <d>         tags: a, b               traces: REQ-1, UC-2
     context: <block>            cut: <block>      use case: <name>         settle: 2       timeout: 10
     given: a, b                 sequence: a, b    from: a
     system <path> "<label>" : <type>              driver <path> "<label>" : <type>
     never <path> is <state>, <state>              assume <path> is [not] <state>, <state>
     phase <name> [(setup)]
       goal: <text>
       reached <path> is <state>, <state>
       step <id>: [<driver> sends] <signal>
         note: <text>
         then <path> is <state>, <state>           then <path> is not <state>
         then message <name>                       then no message <name>
         fault: <text>           settle: 3         timeout: 20
     after <step>:  /  before <step>:  /  instead of <step>:     followed by steps   (with from)
     remove <step>               cut after <step>                                    (with from)

   Extensions written in the JSON, which the plugin ignores: meta (the description of the scenario), step id,
   messages / noMessages (the guide checks them in the trace), fault (said, not injected), phase source. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ScenarioDSL = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const HEADER = {
    scenario: 'title', title: 'title', id: 'id', kind: 'kind', version: 'version', status: 'status', goal: 'goal',
    description: 'description', author: 'author', date: 'date', tags: 'tags', traces: 'traces', context: 'context',
    cut: 'cut', 'use case': 'useCase', settle: 'settle', timeout: 'timeout', given: 'given', sequence: 'sequence', from: 'from'
  };
  const LISTS = ['tags', 'traces', 'given', 'sequence'];
  const NUMBERS = ['settle', 'timeout'];
  const KINDS = ['nominal', 'alternative', 'dysfunctional'];
  /* The order of the header when printed, with the keyword of each field. */
  const HEADER_OUT = [
    ['title', 'scenario'], ['id', 'id'], ['kind', 'kind'], ['version', 'version'], ['status', 'status'], ['goal', 'goal'],
    ['description', 'description'], ['author', 'author'], ['date', 'date'], ['tags', 'tags'], ['traces', 'traces'],
    ['from', 'from'], ['given', 'given'], ['sequence', 'sequence'], ['context', 'context'], ['cut', 'cut'],
    ['useCase', 'use case'], ['settle', 'settle'], ['timeout', 'timeout']
  ];
  const META = ['id', 'kind', 'version', 'status', 'description', 'author', 'date', 'tags', 'traces', 'given', 'sequence', 'from'];

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const esc = (s) => String(s).replace(/\r?\n/g, '\\n');
  const unesc = (s) => String(s).replace(/\\n/g, '\n');
  const splitList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
  const unquote = (s) => (/^"(.*)"$/.test(s) ? s.slice(1, -1).replace(/\\"/g, '"') : s);
  const states = (s) => splitList(s).map(unquote);
  const listOf = (v) => (v == null ? [] : [].concat(v).map(String));

  function newDoc() {
    return {
      title: '', id: '', kind: '', version: '', status: '', goal: '', description: '', author: '', date: '',
      tags: [], traces: [], context: '', cut: '', useCase: '', settle: null, timeout: null,
      given: [], sequence: [], from: '', systems: [], drivers: [], never: {}, assume: { expect: {}, absent: {} },
      phases: [], ops: [], comments: []
    };
  }
  function newStep(id, signal, into) {
    return { id, signal, into: into || '', note: '', expect: {}, absent: {}, messages: [], noMessages: [], fault: '', settle: null, timeout: null };
  }
  const addStates = (map, path, list) => { map[path] = (map[path] || []).concat(list); };

  /* ── text -> document ── */
  function parse(text) {
    const doc = newDoc();
    const errors = [];
    let phase = null;
    let step = null;
    let op = null;
    const err = (line, msg) => errors.push({ line, message: msg });
    const lines = String(text || '').split(/\r?\n/);
    lines.forEach((raw, i) => {
      const n = i + 1;
      const line = raw.trim();
      if (!line) return;
      if (line.charAt(0) === '#') { if (!doc.phases.length && !doc.ops.length && !doc.systems.length) doc.comments.push(line.replace(/^#\s?/, '')); return; }
      let m;
      if ((m = /^system\s+(\S+)(?:\s+"((?:[^"\\]|\\.)*)")?(?:\s*:\s*(.+))?$/.exec(line))) {
        doc.systems.push({ path: m[1], label: m[2] != null ? m[2].replace(/\\"/g, '"') : '', type: m[3] ? m[3].trim() : '' }); return;
      }
      if ((m = /^driver\s+(\S+)(?:\s+"((?:[^"\\]|\\.)*)")?(?:\s*:\s*(.+))?$/.exec(line))) {
        doc.drivers.push({ path: m[1], label: m[2] != null ? m[2].replace(/\\"/g, '"') : '', type: m[3] ? m[3].trim() : '' }); return;
      }
      if ((m = /^never\s+(\S+)\s+is\s+(.+)$/.exec(line))) { addStates(doc.never, m[1], states(m[2])); return; }
      if ((m = /^assume\s+(\S+)\s+is\s+(not\s+)?(.+)$/.exec(line))) { addStates(m[2] ? doc.assume.absent : doc.assume.expect, m[1], states(m[3])); return; }
      if ((m = /^phase\s+(.+?)(\s*\(setup\))?$/.exec(line))) {
        phase = { name: m[1].trim(), goal: '', setup: !!m[2], reached: {}, steps: [] };
        doc.phases.push(phase); step = null; op = null; return;
      }
      if ((m = /^(after|before|instead of)\s+([\w.-]+)\s*:$/.exec(line))) {
        op = { op: m[1] === 'instead of' ? 'instead' : m[1], at: m[2], steps: [], line: n };
        doc.ops.push(op); phase = null; step = null; return;
      }
      if ((m = /^remove\s+([\w.-]+)$/.exec(line))) { doc.ops.push({ op: 'remove', at: m[1], steps: [], line: n }); op = null; phase = null; step = null; return; }
      if ((m = /^cut\s+after\s+([\w.-]+)$/.exec(line))) { doc.ops.push({ op: 'cut', at: m[1], steps: [], line: n }); op = null; phase = null; step = null; return; }
      if ((m = /^reached\s+(\S+)\s+is\s+(.+)$/.exec(line))) {
        if (!phase) { err(n, '"reached" outside a phase'); return; }
        addStates(phase.reached, m[1], states(m[2])); return;
      }
      if ((m = /^step\s+([\w.-]+)\s*:\s*(.+)$/.exec(line))) {
        const rest = m[2].trim();
        const s = /^(\S+)\s+sends\s+(.+)$/.exec(rest);
        step = s ? newStep(m[1], s[2].trim(), s[1]) : newStep(m[1], rest, '');
        if (op) op.steps.push(step);
        else {
          if (!phase) { phase = { name: 'Scenario', goal: '', setup: false, reached: {}, steps: [] }; doc.phases.push(phase); }
          phase.steps.push(step);
        }
        return;
      }
      if ((m = /^then\s+no\s+message\s+(.+)$/.exec(line))) { if (!step) err(n, '"then" outside a step'); else step.noMessages.push(m[1].trim()); return; }
      if ((m = /^then\s+message\s+(.+)$/.exec(line))) { if (!step) err(n, '"then" outside a step'); else step.messages.push(m[1].trim()); return; }
      if ((m = /^then\s+(\S+)\s+is\s+(not\s+)?(.+)$/.exec(line))) {
        if (!step) { err(n, '"then" outside a step'); return; }
        addStates(m[2] ? step.absent : step.expect, m[1], states(m[3])); return;
      }
      if ((m = /^then\b/.exec(line))) { err(n, 'expected "then <part> is <state>", "then message <name>" or "then no message <name>"'); return; }
      if ((m = /^([a-z][a-z ]*?)\s*:\s*(.*)$/i.exec(line))) {
        const key = m[1].toLowerCase();
        const value = unesc(m[2].trim());
        if (step && (key === 'note' || key === 'fault')) { step[key] = value; return; }
        if (step && (key === 'settle' || key === 'timeout')) { const v = parseFloat(value); if (isNaN(v)) err(n, key + ': a number'); else step[key] = v; return; }
        if (key === 'note') { err(n, '"note" outside a step'); return; }
        if (key === 'goal' && phase) { phase.goal = value; return; }
        const field = HEADER[key];
        if (!field) { err(n, `unknown field "${m[1]}"`); return; }
        if (phase || op || step) { err(n, `"${m[1]}" belongs to the header, before the first phase`); return; }
        if (LISTS.indexOf(field) >= 0) doc[field] = splitList(value);
        else if (NUMBERS.indexOf(field) >= 0) { const v = parseFloat(value); if (isNaN(v)) err(n, key + ': a number'); else doc[field] = v; }
        else doc[field] = value;
        if (field === 'kind' && KINDS.indexOf(value) < 0) err(n, `kind: ${KINDS.join(', ')}`);
        return;
      }
      err(n, 'not understood: ' + line);
    });
    if (doc.ops.length && !doc.from) errors.push({ line: doc.ops[0].line, message: 'after / before / instead of / remove / cut need "from: <scenario>"' });
    if (doc.sequence.length && doc.phases.length) errors.push({ line: 0, message: 'a sequence has no phases of its own' });
    doc.ops.forEach((o) => { delete o.line; });
    return { doc, errors };
  }

  /* ── document -> text ── */
  const q = (s) => '"' + String(s).replace(/"/g, '\\"') + '"';
  const st = (list) => list.map((s) => (s.indexOf(',') >= 0 ? q(s) : s)).join(', ');
  function printStep(s, ind) {
    const out = [`${ind}step ${s.id}: ${s.into ? s.into + ' sends ' : ''}${s.signal}`];
    const i2 = ind + '  ';
    if (s.note) out.push(`${i2}note: ${esc(s.note)}`);
    Object.keys(s.expect || {}).forEach((p) => out.push(`${i2}then ${p} is ${st(s.expect[p])}`));
    Object.keys(s.absent || {}).forEach((p) => out.push(`${i2}then ${p} is not ${st(s.absent[p])}`));
    (s.messages || []).forEach((m) => out.push(`${i2}then message ${m}`));
    (s.noMessages || []).forEach((m) => out.push(`${i2}then no message ${m}`));
    if (s.fault) out.push(`${i2}fault: ${esc(s.fault)}`);
    if (s.settle != null) out.push(`${i2}settle: ${s.settle}`);
    if (s.timeout != null) out.push(`${i2}timeout: ${s.timeout}`);
    return out;
  }
  function print(doc) {
    const out = [];
    (doc.comments || []).forEach((c) => out.push('# ' + c));
    HEADER_OUT.forEach(([f, kw]) => {
      const v = doc[f];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
      out.push(`${kw}: ${Array.isArray(v) ? v.join(', ') : esc(v)}`);
    });
    const who = (kw, x) => `${kw} ${x.path}${x.label ? ' ' + q(x.label) : ''}${x.type ? ' : ' + x.type : ''}`;
    if (doc.systems.length || doc.drivers.length) out.push('');
    doc.systems.forEach((x) => out.push(who('system', x)));
    doc.drivers.forEach((x) => out.push(who('driver', x)));
    const nv = Object.keys(doc.never || {});
    const ae = Object.keys((doc.assume || {}).expect || {});
    const aa = Object.keys((doc.assume || {}).absent || {});
    if (nv.length || ae.length || aa.length) out.push('');
    nv.forEach((p) => out.push(`never ${p} is ${st(doc.never[p])}`));
    ae.forEach((p) => out.push(`assume ${p} is ${st(doc.assume.expect[p])}`));
    aa.forEach((p) => out.push(`assume ${p} is not ${st(doc.assume.absent[p])}`));
    doc.phases.forEach((ph) => {
      out.push('', `phase ${ph.name}${ph.setup ? ' (setup)' : ''}`);
      if (ph.goal) out.push(`  goal: ${esc(ph.goal)}`);
      Object.keys(ph.reached || {}).forEach((p) => out.push(`  reached ${p} is ${st(ph.reached[p])}`));
      ph.steps.forEach((s) => { out.push(''); out.push(...printStep(s, '  ')); });
    });
    (doc.ops || []).forEach((o) => {
      out.push('');
      if (o.op === 'remove') out.push(`remove ${o.at}`);
      else if (o.op === 'cut') out.push(`cut after ${o.at}`);
      else {
        out.push(`${o.op === 'instead' ? 'instead of' : o.op} ${o.at}:`);
        o.steps.forEach((s) => out.push(...printStep(s, '  ')));
      }
    });
    return out.join('\n') + '\n';
  }

  /* ── plugin JSON -> document (flat) ── */
  const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'step';
  const stateMap = (raw) => {
    const o = {};
    Object.keys(raw || {}).forEach((p) => { const l = listOf(raw[p]); if (l.length) o[p] = l; });
    return o;
  };
  function fromJson(json) {
    const doc = newDoc();
    const meta = json.meta || {};
    META.forEach((k) => { if (meta[k] != null && k !== 'given' && k !== 'sequence' && k !== 'from') doc[k] = LISTS.indexOf(k) >= 0 ? listOf(meta[k]) : String(meta[k]); });
    const flat = ['given', 'sequence', 'from'].filter((k) => meta[k] && listOf(meta[k]).length).map((k) => `${k} ${listOf(meta[k]).join(', ')}`);
    if (flat.length) doc.comments.push('Compiled, flattened: ' + flat.join('; ') + '. The preconditions are inline.');
    doc.title = json.title || '';
    doc.goal = json.objective || '';
    doc.context = json.context || json.simulate || '';
    doc.cut = json.cut || '';
    doc.useCase = json.useCase || '';
    doc.settle = json.settle != null ? Number(json.settle) : null;
    doc.timeout = json.timeout != null ? Number(json.timeout) : null;
    const who = (x) => ({ path: String(x.path), label: x.label != null && x.label !== x.path ? String(x.label) : '', type: x.type ? String(x.type) : '' });
    doc.systems = (json.systems || []).map(who);
    doc.drivers = (json.drivers || []).map(who);
    doc.never = stateMap(json.never);
    const used = {};
    const idFor = (s) => {
      let base = s.id || slug(s.signal);
      let id = base;
      for (let k = 2; used[id]; k += 1) id = base + '-' + k;
      used[id] = true;
      return id;
    };
    const phases = json.phases || [{ name: 'Scenario', steps: json.steps || [] }];
    doc.phases = phases.map((p, i) => ({
      name: p.name || `Phase ${i + 1}`, goal: p.goal || '', setup: p.setup === true, reached: stateMap(p.reached),
      steps: (p.steps || []).map((s) => {
        const into = s.into && s.into !== '<root>' ? String(s.into) : '';
        const x = newStep(idFor(s), String(s.signal), into);
        x.note = s.note || '';
        x.expect = stateMap(s.expect);
        x.absent = stateMap(s.absent);
        x.messages = listOf(s.messages);
        x.noMessages = listOf(s.noMessages);
        x.fault = s.fault || '';
        if (s.settle != null) x.settle = Number(s.settle);
        if (s.timeout != null) x.timeout = Number(s.timeout);
        return x;
      })
    }));
    return doc;
  }

  /* ── resolution: from, given, sequence ── */
  const get = (lib, id) => (lib instanceof Map ? lib.get(id) : lib[id]);
  function applyOps(phases, ops, errors, who) {
    const find = (id) => {
      for (let pi = 0; pi < phases.length; pi += 1) {
        const si = phases[pi].steps.findIndex((s) => s.id === id);
        if (si >= 0) return [pi, si];
      }
      return null;
    };
    ops.forEach((o) => {
      const at = find(o.at);
      if (!at) { errors.push({ scenario: who, message: `${o.op === 'instead' ? 'instead of' : o.op} ${o.at}: no step "${o.at}" in the base scenario` }); return; }
      const [pi, si] = at;
      const list = phases[pi].steps;
      const add = clone(o.steps);
      if (o.op === 'after') list.splice(si + 1, 0, ...add);
      else if (o.op === 'before') list.splice(si, 0, ...add);
      else if (o.op === 'instead') list.splice(si, 1, ...add);
      else if (o.op === 'remove') list.splice(si, 1);
      else if (o.op === 'cut') { list.splice(si + 1); phases.splice(pi + 1); }
    });
    return phases.filter((p) => p.steps.length || Object.keys(p.reached || {}).length);
  }
  /* A document with its "from" applied: the fields it does not set come from the base. */
  function resolve(id, lib, errors, stack) {
    stack = stack || [];
    const d = get(lib, id);
    if (!d) { errors.push({ scenario: stack[stack.length - 1] || id, message: `unknown scenario "${id}"` }); return null; }
    if (!d.from) return d;
    if (stack.indexOf(id) >= 0) { errors.push({ scenario: id, message: 'from: a loop ' + stack.concat(id).join(' -> ') }); return null; }
    const base = resolve(d.from, lib, errors, stack.concat(id));
    if (!base) return null;
    const r = clone(base);
    r.from = '';
    Object.keys(d).forEach((k) => {
      const v = d[k];
      if (k === 'phases' || k === 'ops' || k === 'from' || k === 'comments') return;
      if (k === 'assume') { if (Object.keys(v.expect).length || Object.keys(v.absent).length) r.assume = clone(v); return; }
      if (k === 'never') { Object.keys(v).forEach((p) => { r.never[p] = v[p].slice(); }); return; }
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
      r[k] = clone(v);
    });
    r.phases = applyOps(clone(base.phases).concat(clone(d.phases)), d.ops || [], errors, id);
    r.derivedFrom = d.from;
    return r;
  }

  function stepJson(s) {
    const o = {};
    if (s.id) o.id = s.id;
    o.signal = s.signal;
    if (s.into) o.into = s.into;
    o.note = s.note || '';
    o.expect = clone(s.expect || {});
    if (Object.keys(s.absent || {}).length) o.absent = clone(s.absent);
    if ((s.messages || []).length) o.messages = s.messages.slice();
    if ((s.noMessages || []).length) o.noMessages = s.noMessages.slice();
    if (s.fault) o.fault = s.fault;
    if (s.settle != null) o.settle = s.settle;
    if (s.timeout != null) o.timeout = s.timeout;
    return o;
  }

  /* The scenario, ready for the plugin. plan: what was played, in order: { id, role: given | step | self }. */
  function compile(id, lib) {
    const errors = [];
    const warnings = [];
    const root = resolve(id, lib, errors, []);
    if (!root) return { json: null, plan: [], errors, warnings };
    const played = new Set();
    const plan = [];
    const phases = [];
    const docs = [];
    const neverAll = {};
    const assumeOn = (d, who) => {
      const a = d.assume || { expect: {}, absent: {} };
      if (!Object.keys(a.expect).length && !Object.keys(a.absent).length) return;
      const last = phases.length && phases[phases.length - 1].steps[phases[phases.length - 1].steps.length - 1];
      if (!last) { warnings.push({ scenario: who, message: 'assume: nothing played before it, not checked' }); return; }
      Object.keys(a.expect).forEach((p) => { last.expect[p] = Array.from(new Set((last.expect[p] || []).concat(a.expect[p]))); });
      Object.keys(a.absent).forEach((p) => { last.absent = last.absent || {}; last.absent[p] = Array.from(new Set((last.absent[p] || []).concat(a.absent[p]))); });
    };
    const emit = (d, did, setup, role) => {
      docs.push(d);
      plan.push({ id: did, role });
      if (!setup) Object.keys(d.never || {}).forEach((p) => { neverAll[p] = Array.from(new Set((neverAll[p] || []).concat(d.never[p]))); });
      if (!d.phases.length) warnings.push({ scenario: did, message: 'no phase' });
      d.phases.forEach((p) => {
        const ph = { name: p.name, goal: p.goal || '', setup: setup || !!p.setup, reached: clone(p.reached || {}), steps: p.steps.map(stepJson), source: did };
        const prev = phases[phases.length - 1];
        /* scenarios split from one story join back: same phase name, same role, one after the other */
        if (prev && prev.name === ph.name && prev.setup === ph.setup) {
          prev.steps.push(...ph.steps);
          Object.keys(ph.reached).forEach((k) => { prev.reached[k] = Array.from(new Set((prev.reached[k] || []).concat(ph.reached[k]))); });
          if (ph.goal && prev.goal.indexOf(ph.goal) < 0) prev.goal = prev.goal ? prev.goal + ' ' + ph.goal : ph.goal;
          if ([].concat(prev.source).indexOf(did) < 0) prev.source = [].concat(prev.source, did);
        } else phases.push(ph);
      });
    };
    const ensure = (gid, stack, role) => {
      if (played.has(gid)) return;
      if (stack.indexOf(gid) >= 0) { errors.push({ scenario: gid, message: 'given: a loop ' + stack.concat(gid).join(' -> ') }); return; }
      const d = resolve(gid, lib, errors, stack);
      if (!d) return;
      d.given.forEach((g) => ensure(g, stack.concat(gid), 'given'));
      play(d, gid, true, stack.concat(gid), role);
      played.add(gid);
    };
    const play = (d, did, setup, stack, role) => {
      if (d.sequence.length) {
        d.sequence.forEach((item) => {
          if (stack.indexOf(item) >= 0) { errors.push({ scenario: did, message: 'sequence: a loop through ' + item }); return; }
          const di = resolve(item, lib, errors, stack);
          if (!di) return;
          di.given.forEach((g) => {
            if (!played.has(g)) {
              warnings.push({ scenario: did, message: `${item} needs ${g}, not played before it in the sequence: played as a precondition` });
              ensure(g, stack.concat(item), 'given');
            }
          });
          play(di, item, setup, stack.concat(item), setup ? 'given' : 'step');
          played.add(item);
        });
      } else {
        assumeOn(d, did);
        emit(d, did, setup, role);
      }
    };
    root.given.forEach((g) => ensure(g, [id], 'given'));
    play(root, id, false, [id], 'self');
    played.add(id);

    const firstOf = (k) => { if (root[k] != null && root[k] !== '') return root[k]; const d = docs.find((x) => x[k] != null && x[k] !== ''); return d ? d[k] : null; };
    const merge = (k) => {
      const seen = {};
      const out = [];
      [root].concat(docs).forEach((d) => (d[k] || []).forEach((x) => { if (!seen[x.path]) { seen[x.path] = 1; out.push(clone(x)); } }));
      return out.map((x) => { const o = { path: x.path, label: x.label || x.path }; if (x.type) o.type = x.type; return o; });
    };
    const json = { title: root.title || id, objective: root.goal || '' };
    const ctx = firstOf('context'); if (ctx) json.context = ctx;
    const cut = firstOf('cut'); if (cut) json.cut = cut;
    const uc = root.useCase; if (uc) json.useCase = uc;
    const settle = firstOf('settle'); if (settle != null) json.settle = settle;
    const timeout = firstOf('timeout'); if (timeout != null) json.timeout = timeout;
    json.systems = merge('systems');
    const drivers = merge('drivers'); if (drivers.length) json.drivers = drivers;
    if (Object.keys(neverAll).length) json.never = neverAll;
    /* names the scenario does not declare: a typo, most of the time (the plugin would observe them anyway) */
    const known = new Set(json.systems.map((x) => x.path));
    const drv = new Set(drivers.map((x) => x.path));
    const odd = new Set();
    phases.forEach((p) => {
      const where = [].concat(p.source)[0];
      p.steps.forEach((s) => {
        Object.keys(s.expect).concat(Object.keys(s.absent || {})).forEach((k) => { if (!known.has(k) && !odd.has(where + k)) { odd.add(where + k); warnings.push({ scenario: where, message: `step ${s.id || s.signal}: "${k}" is not a declared system` }); } });
        if (s.into && drv.size && !drv.has(s.into) && !known.has(s.into) && !odd.has(where + s.into)) { odd.add(where + s.into); warnings.push({ scenario: where, message: `step ${s.id || s.signal}: "${s.into}" is not a declared driver` }); }
      });
    });
    json.phases = phases.map((p) => {
      const o = { name: p.name, goal: p.goal };
      if (Object.keys(p.reached).length) o.reached = p.reached;
      o.steps = p.steps;
      if (p.setup) o.setup = true;
      o.source = p.source;
      return o;
    });
    const meta = {};
    META.forEach((k) => {
      const v = k === 'from' ? root.derivedFrom : root[k];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) return;
      meta[k] = clone(v);
    });
    meta.id = meta.id || id;
    json.meta = meta;
    return { json, plan, errors, warnings };
  }

  /* Two plugin files say the same thing (what the plugin reads; the extensions aside). */
  function canonical(json, keepExtensions) {
    const sm = (raw) => { const o = {}; Object.keys(raw || {}).sort().forEach((p) => { const l = listOf(raw[p]); if (l.length) o[p] = l; }); return o; };
    const who = (x) => ({ path: String(x.path), label: String(x.label != null ? x.label : x.path), type: x.type || null });
    const phases = (json.phases || [{ name: 'Scenario', goal: '', steps: json.steps || [] }]).map((p) => {
      const o = { name: p.name, goal: p.goal || '', setup: p.setup === true, reached: sm(p.reached) };
      o.steps = (p.steps || []).map((s) => {
        const x = { signal: s.signal, into: s.into && s.into !== '<root>' ? s.into : null, note: s.note || '', expect: sm(s.expect), absent: sm(s.absent), settle: s.settle != null ? Number(s.settle) : null, timeout: s.timeout != null ? Number(s.timeout) : null };
        if (keepExtensions) { x.id = s.id || null; x.messages = listOf(s.messages); x.noMessages = listOf(s.noMessages); x.fault = s.fault || null; }
        return x;
      });
      return o;
    });
    return {
      title: json.title || '', objective: json.objective || '', context: json.context || json.simulate || null, cut: json.cut || null,
      useCase: json.useCase || null, settle: json.settle != null ? Number(json.settle) : 2, timeout: json.timeout != null ? Number(json.timeout) : 10,
      systems: (json.systems || []).map(who), drivers: (json.drivers || []).map(who), never: sm(json.never), phases
    };
  }

  /* Every scenario of a library parsed from texts: { docs: Map id -> doc, files: [{ path, id, doc, errors }] }. */
  function load(texts) {
    const docs = new Map();
    const files = texts.map((t) => {
      const r = parse(t.text);
      const id = r.doc.id || String(t.path).replace(/^.*\//, '').replace(/\.scn$/, '');
      r.doc.id = id;
      if (docs.has(id)) r.errors.push({ line: 0, message: `id "${id}" already used by another file` });
      docs.set(id, r.doc);
      return { path: t.path, id, doc: r.doc, errors: r.errors };
    });
    return { docs, files };
  }

  /* Who uses a scenario: given, sequence or from of the others. */
  function usedBy(id, lib) {
    const out = [];
    const all = lib instanceof Map ? Array.from(lib.entries()) : Object.entries(lib);
    all.forEach(([k, d]) => {
      if (d.given.indexOf(id) >= 0) out.push({ id: k, how: 'given' });
      if (d.sequence.indexOf(id) >= 0) out.push({ id: k, how: 'sequence' });
      if (d.from === id) out.push({ id: k, how: 'from' });
    });
    return out;
  }

  return { parse, print, fromJson, compile, canonical, load, usedBy, resolve: (id, lib) => resolve(id, lib, [], []), KINDS, slug };
});
