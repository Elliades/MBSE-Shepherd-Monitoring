/* Part 4: plays a mission of part4/content/lego.js on what is assembled in Cameo, and says what it gives. No page in here: the
   mission board of js/widgets-lego.js and scripts/check-part4-solutions.mjs run the same code, so what the script checked is
   what the students get.

   LegoRun.play(lego, mission, assembly, io) -> [{ step, ok, text }]
     assembly  what assembly/read returned
     io        { call(category, tool, args, timeout), pause(ms), alive(), onStep(say), onSignal(signal), onCheck(result), onStates(states) } */
(function (root) {
  'use strict';

  const FO = 'Flight Orchestrator';
  /* The state each kind of check counts, on the Flight Orchestrator of each drone. */
  const COUNTED = { following: 'Following Sheep', tracking: 'Tracking Predator', deterring: 'Deterring Predator', landed: 'Landed' };
  const SETTLE = 30000;

  const hostOf = (assembly, type) => (assembly.hosts || []).find((h) => h.type === type) || { parts: [] };
  const carries = (assembly, drone, type) => hostOf(assembly, drone.name).parts.some((p) => p.type === type);
  const foPath = (drone) => `${drone.path}.${FO}`;

  /* Every object worth reading: the orchestrator of each drone, what it carries, and the screen of the operator. */
  function paths(lego, assembly) {
    const out = ['Operator'];
    lego.drones.forEach((d) => {
      out.push(foPath(d));
      lego.bricks.filter((b) => b.state && carries(assembly, d, b.type)).forEach((b) => out.push(`${d.path}.${b.type}`));
    });
    return out;
  }

  function evaluate(lego, check, assembly, states) {
    const fo = lego.drones.map((d) => states[foPath(d)] || []);
    const kind = Object.keys(COUNTED).find((k) => check[k] !== undefined);
    if (kind) {
      const n = fo.filter((f) => f.includes(COUNTED[kind])).length;
      if (n === check[kind]) return { ok: true, text: check.label };
      return { ok: false, text: n === 0 ? check.none : (check.many || check.none) };
    }
    if (check.field) {
      const keeps = lego.bricks.filter((b) => b.keepsField).map((b) => b.type);
      const kept = lego.drones.some((d, i) => fo[i].includes('On Station') && keeps.some((t) => carries(assembly, d, t)));
      return kept ? { ok: true, text: check.label } : { ok: false, text: check.no };
    }
    if (check.told) {
      return (states.Operator || []).includes(check.told) ? { ok: true, text: check.label } : { ok: false, text: check.no };
    }
    if (check.watching) {
      const brick = lego.bricks.find((b) => b.type === check.watching);
      /* Nothing is watched from the ground: a brick that keeps the field counts on the field only. */
      const on = lego.drones.some((d) => carries(assembly, d, brick.type) && (states[`${d.path}.${brick.type}`] || []).includes(brick.state) &&
        !(brick.keepsField && (states[foPath(d)] || []).includes('Standing By')));
      return on ? { ok: true, text: check.label } : { ok: false, text: check.no };
    }
    throw new Error('unknown check ' + JSON.stringify(check));
  }

  /* What the drone is doing, for the pasture of the simulation panel. */
  function stepOf(lego, drone, assembly, states) {
    const fo = states[foPath(drone)] || [];
    const hit = lego.steps.find(([state]) => fo.includes(state));
    if (hit) return hit[1];
    if (fo.includes('On Station')) {
      const at = (type) => (states[`${drone.path}.${type}`] || []).includes((lego.bricks.find((b) => b.type === type) || {}).state);
      if (at('Zone Surveillance')) return 'Patrolling';
      if (at('Flock Watching')) return 'Guarding flock';
      return 'Hovering';
    }
    return fo.includes('Ready') ? 'Ready for Mission' : 'Off';
  }

  function roleOf(lego, drone, assembly) {
    const rule = lego.roleOf.find((r) => r.has.every((t) => carries(assembly, drone, t)));
    return rule ? rule.role : 'bare';
  }

  /* Where the intelligence is: "base", a drone id, or "" (the master field of the simulation panel). */
  function masterOf(lego, assembly) {
    if (hostOf(assembly, lego.base.name).parts.some((p) => p.type === 'Swarm Master')) return 'base';
    const d = lego.drones.find((x) => carries(assembly, x, 'Swarm Master'));
    return d ? d.id : '';
  }

  async function play(lego, mission, assembly, io) {
    const results = [];
    const alive = () => !io.alive || io.alive();
    const read = async (list) => (await io.call('simtest', 'states', [{ paths: list }])).states;
    /* Just started, the parts have no instance yet: a read may fail, and a first signal sent too early is lost. */
    async function until(list, ok, patience) {
      for (let waited = 0; alive(); waited += 500) {
        let states = null;
        try { states = await read(list); } catch (e) { states = null; }
        if (states) { if (io.onStates) io.onStates(states); if (ok(states)) return states; }
        if (waited >= patience) return states || {};
        await io.pause(500);
      }
      return {};
    }
    /* A brick of the base station without which the mission cannot even start: the verdict, without playing. */
    const missing = lego.prepare.find((st) => st.needs && !carries(assembly, lego.base, st.needs));
    if (missing) {
      const out = { step: 'The swarm gets ready', ok: false, text: missing.no };
      if (io.onCheck) io.onCheck(out);
      return [out];
    }
    const found = await io.call('model', 'getElementsByName', [{ name: lego.simulation }]);
    const block = (Array.isArray(found) ? found : []).find((e) => e && e.metaclass === 'Class');
    if (!block) throw new Error(`Your model has no block named "${lego.simulation}": open the model of Part 4.`);
    await io.call('simtest', 'start', [{ elementId: block.id }], 30000);
    try {
      const every = paths(lego, assembly);
      const fos = lego.drones.map(foPath);
      await until(['Operator', 'Pasture', fos[0]], (s) => s.Operator.length && s.Pasture.length && s[fos[0]].length, SETTLE);
      await io.pause(1500);
      if (io.onStep) io.onStep('The swarm gets ready…');
      for (const st of lego.prepare) {
        const where = st.at === 'drones' ? fos : [st.at];
        const wanted = [].concat(st.until);
        const reached = (s) => where.every((p) => wanted.some((w) => (s[p] || []).includes(w)));
        let done = false;
        for (let tries = 0; !done && tries < 3 && alive(); tries++) {
          await io.call('simtest', 'send', [st.signal, st.into]);
          done = reached(await until(every.concat(where.filter((p) => !every.includes(p))), reached, tries < 2 ? 15000 : SETTLE));
        }
        if (!alive()) return results;
        /* A step that says why it could not happen is a verdict; otherwise the mission did not even start. */
        if (!done && st.no) {
          const out = { step: 'The swarm gets ready', ok: false, text: st.no };
          results.push(out);
          if (io.onCheck) io.onCheck(out);
          return results;
        }
        if (!done) throw new Error(`the swarm did not get ready (${st.signal}): play the mission again`);
      }
      for (const step of mission.steps) {
        if (!alive()) return results;
        if (io.onStep) io.onStep(step.say);
        if (step.radio) {
          if (masterOf(lego, assembly) === 'base') await io.call('simtest', 'send', ['Master Radio Lost', `${lego.base.path}.Swarm Master`]);
          await io.pause(1000);
          continue;
        }
        if (step.signal) {
          if (io.onSignal) io.onSignal(step.signal);
          await io.call('simtest', 'send', [step.signal, step.into]);
        }
        const checks = step.check || [];
        const judge = (s) => checks.map((c) => evaluate(lego, c, assembly, s));
        await until(every, (s) => judge(s).every((r) => r.ok), SETTLE);
        /* Settled: read once more, so that a drone leaving late is seen too. */
        await io.pause(2500);
        const states = await read(every);
        if (io.onStates) io.onStates(states);
        judge(states).forEach((r) => {
          const out = { step: step.say, ok: r.ok, text: r.text };
          results.push(out);
          if (io.onCheck) io.onCheck(out);
        });
      }
      return results;
    } finally {
      await io.call('simtest', 'stop', []).catch(() => {});
    }
  }

  root.LegoRun = { play, paths, stepOf, roleOf, masterOf, carries, hostOf };
})(typeof window !== 'undefined' ? window : globalThis);
