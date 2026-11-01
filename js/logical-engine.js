/* A small simulator of a logical architecture (Part 3): the state machines of the parts, the signals they
   send on their ports, and the connectors that carry them. It runs the specs of part3/content/archs.js (the
   same specs that build the correction models in MagicDraw) closely enough to replay their scenarios.

   A send step may carry self: true (no port), and when / unless: the last signal received from outside (the
   decision of Load Flight Plan, on FlightPlan Correct or Incorrect).

   What it understands: nested states and parallel regions, transitions on a signal (with an effect) and
   completion transitions (when the do-activity is over), do-activities that send and then end, and
   do-activities with reactions (accept a signal, send, wait again) that run as long as their state is active.
   A signal fires the enabled transitions first, innermost first; if none fires, the reactions take it.

   const sim = LogicalEngine.create(arch, opts)    arch = LOGICAL_ARCHS["3"]; opts.only = names of the SOI parts
                                                   built so far (the others are left out: what they would
                                                   receive is lost, as in a model where they are not there yet);
                                                   opts.drop = { block: [states not made yet] }, with their
                                                   transitions; opts.mute = [signals nobody sends yet]
   sim.inject(signal, into)  -> [events]            into = "operator" | "pasture" (a part of the context)
       events, in order:  { kind: 'msg', from, to, signal, via }   from/to = paths ("soi.orch"), via = boundary ports
                          { kind: 'self', path, signal }             a signal the part sends itself, on no port
                          { kind: 'state', path, states }            the active states of a part after it reacted
   sim.states(path)  -> ["Mission", "Patrolling", "Dispatching"]   every active state, outermost first
   sim.leaves(path)  -> ["Patrolling", "Dispatching"]               the innermost ones
   sim.check(expect) -> [{ path, want, ok }]                         against a scenario step's expect
   sim.reset()
   A wanted state may be "!Name": the part must not be in it, whatever it is in instead (LogicalEngine.wantOk). */
(function (root) {
  'use strict';

  function create(arch, opts) {
    const only = opts && opts.only;
    const drop = (opts && opts.drop) || {};
    const mute = (opts && opts.mute) || [];
    const blocks = new Map(arch.blocks.map((b) => [b.name, b]));
    const shared = new Map((arch.functions || []).map((f) => [f.name, f]));
    const composite = new Map([[arch.soi.name, arch.soi]]);

    /* ───────── the state machines, made navigable ───────── */
    function model(block) {
      const states = new Map();
      const transitions = [];
      const gone = drop[block.name] || [];
      const keepT = (t) => { if (gone.indexOf(t.from) < 0 && gone.indexOf(t.to) < 0) transitions.push(t); };
      function region(def, parent) {
        const r = { parent, states: [], initial: def.initial };
        (def.states || []).filter((s) => gone.indexOf(s.name) < 0).forEach((s) => r.states.push(state(s, r)));
        (def.transitions || []).forEach(keepT);
        return r;
      }
      function state(def, reg) {
        const s = { name: def.name, do: def.do, region: reg, regions: [] };
        states.set(def.name, s);
        if (def.regions) def.regions.forEach((r) => s.regions.push(region(r, s)));
        else if (def.states) s.regions.push(region({ initial: def.initial, states: def.states, transitions: def.transitions }, s));
        else (def.transitions || []).forEach(keepT);
        return s;
      }
      const top = region({ initial: block.stm.initial, states: block.stm.states, transitions: block.stm.transitions }, null);
      const depth = (s) => { let d = 0; for (let r = s.region; r.parent; r = r.parent.region) d++; return d; };
      const chain = (s) => { const c = []; for (let x = s; x; x = x.region.parent) c.unshift(x); return c; };
      return { top, states, transitions, depth, chain, fns: new Map((block.functions || []).map((f) => [f.name, f])) };
    }

    /* ───────── the parts ───────── */
    const parts = new Map();   // path -> { path, block, m, active: Map(region -> state), doing: Set(state) }
    function addParts(prefix, comp) {
      comp.parts.forEach((p) => {
        const path = prefix ? prefix + '.' + p.name : p.name;
        if (only && prefix && only.indexOf(p.name) < 0) return;
        if (composite.has(p.type)) addParts(path, composite.get(p.type));
        else if (blocks.has(p.type)) parts.set(path, { path, type: p.type, m: model(blocks.get(p.type)), active: new Map(), doing: new Set() });
      });
    }
    addParts('', arch.context);
    const typeOf = (path) => {
      if (!path) return arch.context;
      const up = path.split('.');
      let comp = arch.context;
      for (const name of up) {
        const p = comp.parts.find((x) => x.name === name);
        if (!p) return null;
        comp = composite.get(p.type) || null;
        if (!comp) return null;
      }
      return comp;
    };

    let queue = [];
    let events = [];

    /* ───────── where a signal sent on a port goes ───────── */
    function route(path, port) {
      const via = [];
      let dot = path.lastIndexOf('.');
      let owner = dot < 0 ? '' : path.slice(0, dot);
      let end = (dot < 0 ? path : path.slice(dot + 1)) + '.' + port;
      for (let hop = 0; hop < 12; hop++) {
        const comp = typeOf(owner);
        if (!comp) return null;
        const c = comp.connectors.find((k) => k[0] === end || k[1] === end);
        if (!c) return null;
        const other = c[0] === end ? c[1] : c[0];
        if (other.indexOf('.') < 0) {
          /* a boundary port of the owner: go out one level */
          via.push((owner ? owner + '.' : '') + other);
          dot = owner.lastIndexOf('.');
          end = (dot < 0 ? owner : owner.slice(dot + 1)) + '.' + other;
          owner = dot < 0 ? '' : owner.slice(0, dot);
          continue;
        }
        const [name, p] = other.split('.');
        const target = owner ? owner + '.' + name : name;
        if (parts.has(target)) return { to: target, via };
        if (typeOf(target)) {
          /* a part that has parts of its own: go in through its boundary port */
          via.push(target + '.' + p);
          owner = target;
          end = p;
          continue;
        }
        return null;
      }
      return null;
    }

    function send(part, step) {
      if (mute.indexOf(step.send) >= 0) return;
      if (step.when && part.last !== step.when) return;
      if (step.unless && part.last === step.unless) return;
      if (step.self) {
        /* no port: the part tells itself, to fire one of its own transitions */
        events.push({ kind: 'self', path: part.path, signal: step.send });
        queue.push({ path: part.path, signal: step.send, self: true });
        return;
      }
      const r = route(part.path, step.port);
      if (!r) return;
      events.push({ kind: 'msg', from: part.path, to: r.to, signal: step.send, via: r.via, port: step.port });
      queue.push({ path: r.to, signal: step.send });
    }
    function fnOf(part, name) { return part.m.fns.get(name) || shared.get(name) || null; }
    function run(part, name) {
      const f = name && fnOf(part, name);
      if (f) (f.steps || []).forEach((st) => send(part, st));
    }

    /* ───────── entering and leaving states ───────── */
    function isActive(part, s) {
      for (let x = s; x; x = x.region.parent) if (part.active.get(x.region) !== x) return false;
      return true;
    }
    function enter(part, s, path) {
      part.active.set(s.region, s);
      const f = s.do && fnOf(part, s.do);
      run(part, s.do);
      if (f && f.reactions && f.reactions.length) part.doing.add(s);
      else queue.push({ path: part.path, done: s });
      s.regions.forEach((r) => {
        const next = path && path.length && path[0].region === r ? path[0] : null;
        if (next) enter(part, next, path.slice(1));
        else if (r.initial) { const i = r.states.find((x) => x.name === r.initial); if (i) enter(part, i, null); }
      });
    }
    function exit(part, s) {
      s.regions.forEach((r) => { const a = part.active.get(r); if (a) exit(part, a); part.active.delete(r); });
      part.doing.delete(s);
      if (part.active.get(s.region) === s) part.active.delete(s.region);
    }
    function fire(part, t) {
      const from = part.m.states.get(t.from);
      const to = part.m.states.get(t.to);
      if (!from || !to) return;
      const a = part.m.chain(from);
      const b = part.m.chain(to);
      let k = 0;
      while (k < a.length - 1 && k < b.length - 1 && a[k] === b[k]) k++;
      if (a[k] !== b[k] && a[k].region !== b[k].region) return; // not in one region: not a legal transition
      const out = part.active.get(a[k].region);
      if (out) exit(part, out);
      run(part, t.effect);
      enter(part, b[k], b.slice(k + 1));
    }

    /* ───────── one signal, or one completion, for one part ───────── */
    function dispatch(item) {
      const part = parts.get(item.path);
      if (!part) return;
      let changed = false;
      if (item.signal && !item.self) part.last = item.signal;
      if (item.done) {
        if (!isActive(part, item.done)) return;
        const t = part.m.transitions.find((x) => !x.on && x.from === item.done.name);
        if (t) { fire(part, t); changed = true; }
      } else {
        const enabled = part.m.transitions
          .filter((t) => t.on === item.signal && part.m.states.has(t.from) && isActive(part, part.m.states.get(t.from)))
          .sort((x, y) => part.m.depth(part.m.states.get(y.from)) - part.m.depth(part.m.states.get(x.from)));
        const used = new Set();
        enabled.forEach((t) => {
          const from = part.m.states.get(t.from);
          if (!isActive(part, from) || used.has(from.region)) return;
          used.add(from.region);
          fire(part, t);
          changed = true;
        });
        if (!changed) {
          part.doing.forEach((s) => {
            const f = fnOf(part, s.do);
            (f.reactions || []).filter((r) => r.on === item.signal).forEach((r) => r.steps.forEach((st) => send(part, st)));
          });
        }
      }
      if (changed) events.push({ kind: 'state', path: part.path, states: leaves(part.path) });
    }
    function settle() {
      for (let n = 0; queue.length && n < 2000; n++) dispatch(queue.shift());
      queue = [];
    }

    function states(path) {
      const part = parts.get(path);
      if (!part) return [];
      const out = [];
      (function walk(r) { const s = part.active.get(r); if (!s) return; out.push(s.name); s.regions.forEach(walk); })(part.m.top);
      return out;
    }
    function leaves(path) {
      const part = parts.get(path);
      if (!part) return [];
      return states(path).filter((name) => { const s = part.m.states.get(name); return !s.regions.some((r) => part.active.get(r)); });
    }

    function reset() {
      queue = [];
      events = [];
      parts.forEach((part) => {
        part.active.clear();
        part.doing.clear();
        const i = part.m.top.states.find((s) => s.name === part.m.top.initial);
        if (i) enter(part, i, null);
      });
      settle();
      events = [];
    }

    reset();
    return {
      paths: () => [...parts.keys()],
      has: (path) => parts.has(path),
      typeOf: (path) => (parts.get(path) || {}).type,
      inject(signal, into) {
        events = [];
        queue.push({ path: into, signal });
        settle();
        return events;
      },
      states,
      leaves,
      check: (expect) => Object.keys(expect || {}).map((path) => {
        const want = [].concat(expect[path]);
        return { path, want, ok: wantOk(want, states(path)) };
      }),
      reset
    };
  }
  function wantOk(want, have) {
    return [].concat(want).every((w) => (w.charAt(0) === '!' ? have.indexOf(w.slice(1)) < 0 : have.indexOf(w) >= 0));
  }

  const api = { create, wantOk };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LogicalEngine = api;
})(typeof window !== 'undefined' ? window : this);
