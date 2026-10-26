/* The fleet simulation (Part 3), logic only: several drones, each with a role and a step, and who leads
   them (the base station, or one drone of the swarm). Part 1 and Part 2 do not load it: they keep the
   one-drone panel of js/sim-core.js, js/sim-scene.js and js/sim.js.

   The roles, their steps and the scenario of the preview are in COURSE_CONFIG.fleet (part3/content/config.js).
   A step is turned into a behaviour, what the drone does on screen (BEHAVIOURS), by fleet.behaviours, or
   guessed from its words when it is not listed: the model can name its states as it likes.

   window.FleetCore.BEHAVIOURS, behaviourOf(step), roleOf(role, name), rule(drones)
   window.FleetCore.createFleet() -> { getSnapshot, subscribe, fromCameo, setStep, setMaster, note, reset, runScenario, stopScenario } */
(function () {
  const CFG = (window.COURSE_CONFIG || {}).fleet || {};
  const ROLES = CFG.roles || { drone: { label: 'Drone', tag: 'D', color: '#0ea5e9', steps: [] } };
  const ROLE_IDS = Object.keys(ROLES);

  /* What a drone can do on screen. */
  const BEHAVIOURS = {
    off: 'At the base, off',
    ready: 'At the base, ready',
    deploy: 'Flying to the field',
    patrol: 'Patrolling the field',
    guard: 'Guarding the flock',
    track: 'Tracking the predator',
    counter: 'Repelling the predator',
    pursue: 'Following the predator out',
    return: 'Flying back to the base',
    crashed: 'Crashed',
    unknown: 'Hovering (step not known)'
  };
  /* On the field: the drones that keep the flock safe. Away: out of the field after the predator. */
  const ON_FIELD = ['patrol', 'guard', 'track', 'counter'];
  const AWAY = ['pursue'];

  /* Words of a step name, in the order they are tried. */
  const GUESS = [
    [/crash/, 'crashed'],
    [/pursu|chas|follow|leav|escort|outside|outof/, 'pursue'],
    [/counter|repel|scare|engag|deter/, 'counter'],
    [/track|predator|threat/, 'track'],
    [/return|back|home|land|recall|recharg/, 'return'],
    [/goingto|safearea|deploy|takeoff|transit/, 'deploy'],
    [/guard|watch|monitor|surveil|flock|sheep/, 'guard'],
    [/patrol/, 'patrol'],
    [/^off$|unconfigured|idle|init|standby/, 'off'],
    [/ready|configured$/, 'ready']
  ];
  const flat = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const LISTED = Object.fromEntries(Object.entries(CFG.behaviours || {}).map(([step, b]) => [flat(step), b]));

  function behaviourOf(step) {
    const key = flat(step);
    if (LISTED[key] && BEHAVIOURS[LISTED[key]]) return LISTED[key];
    const hit = GUESS.find(([re]) => re.test(key));
    return hit ? hit[1] : 'unknown';
  }

  /* Cameo may name the role (or only the drone) in its own words: match loosely, else the default role. */
  function roleOf(role, name) {
    const want = flat(role);
    if (want) {
      const exact = ROLE_IDS.find((id) => flat(id) === want || flat(ROLES[id].label) === want || flat(ROLES[id].tag) === want);
      if (exact) return exact;
    }
    const words = want || flat(name);
    const near = ROLE_IDS.find((id) => (ROLES[id].match || []).some((w) => words.includes(flat(w))));
    return near || CFG.defaultRole || ROLE_IDS[0];
  }

  const nameList = (list) => list.length < 2 ? (list[0] || '') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;

  /* The use case of Part 3: a drone may follow the predator out of the field only while another drone
     stays on the field. */
  function rule(drones) {
    const away = drones.filter((d) => AWAY.includes(d.behaviour)).map((d) => d.name);
    const onField = drones.filter((d) => ON_FIELD.includes(d.behaviour)).map((d) => d.name);
    if (away.length && onField.length) {
      return { tone: 'ok', away, onField, text: `${nameList(away)} follow${away.length > 1 ? '' : 's'} the predator out; ${nameList(onField)} keep${onField.length > 1 ? '' : 's'} the field.` };
    }
    if (away.length) {
      return { tone: 'alarm', away, onField, text: `No drone left on the field: the flock is alone. ${nameList(away)} should come back.` };
    }
    if (onField.length) return { tone: 'calm', away, onField, text: `${onField.length} drone${onField.length > 1 ? 's' : ''} on the field.` };
    return { tone: 'idle', away, onField, text: 'No drone on the field.' };
  }

  function decorate(d, i) {
    const role = roleOf(d.role, d.name || d.id);
    const r = ROLES[role] || {};
    return {
      id: String(d.id),
      name: d.name || String(d.id),
      role,
      roleLabel: r.label || role,
      tag: r.tag || role.slice(0, 2).toUpperCase(),
      color: r.color || '#0ea5e9',
      step: d.step,
      behaviour: behaviourOf(d.step),
      index: i
    };
  }

  function clock() { return new Date().toLocaleTimeString(); }

  function createFleet() {
    const demo = CFG.demo || { master: 'base', drones: [] };
    let drones = [];
    let master = '';
    let log = [];
    let nextEntry = 0;
    let running = false;
    let timers = [];
    let snapshot = null;
    /* What happened at least once since the last restart: the Mission tab ticks it. */
    let seen = new Set();
    const listeners = new Set();

    function add(type, message) {
      nextEntry += 1;
      log = log.concat({ id: nextEntry, type, message, time: clock() }).slice(-200);
    }
    function publish() {
      const r = rule(drones);
      drones.forEach((d) => seen.add(d.behaviour));
      if (r.tone === 'ok') seen.add('pursue-covered');
      snapshot = { drones, master, rule: r, log, running, seen: new Set(seen) };
      listeners.forEach((fn) => { try { fn(snapshot); } catch (e) { /* a listener must not break the others */ } });
    }
    function load(list, lead) {
      drones = list.map(decorate);
      master = lead === 'base' || drones.some((d) => d.id === lead) ? lead : '';
    }
    function start() {
      load((demo.drones || []).map((d) => ({ ...d, step: d.step || firstStep(d.role) })), demo.master || '');
    }
    function firstStep(role) {
      const steps = (ROLES[roleOf(role)] || {}).steps || [];
      return steps[0] || 'Off';
    }
    function stopScenario() {
      timers.forEach(clearTimeout);
      timers = [];
      if (running) { running = false; publish(); }
    }
    function setStep(id, step, source) {
      const at = drones.findIndex((d) => d.id === id);
      if (at < 0 || drones[at].step === step) return;
      drones = drones.slice();
      drones[at] = decorate({ ...drones[at], step }, at);
      add('success', `${drones[at].name}: ${step}${source ? ` (${source})` : ''}`);
    }

    start();
    add('info', `Ready. ${drones.length} drone${drones.length === 1 ? '' : 's'} at the base.`);
    publish();

    return {
      getSnapshot: () => snapshot,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      /* A state frame of Cameo (js/bridge.js). Without a drones list it is a one-drone model. */
      fromCameo(frame) {
        stopScenario();
        const list = frame.drones && frame.drones.length
          ? frame.drones
          : [{ id: CFG.singleId || 'Drone', role: CFG.defaultRole, step: frame.step }];
        const lead = typeof frame.master === 'string' ? frame.master : (CFG.cameoMaster != null ? CFG.cameoMaster : master);
        const before = new Map(drones.map((d) => [d.id, d.step]));
        const sameFleet = list.length === drones.length && list.every((d) => before.has(String(d.id)));
        load(list, lead);
        if (!sameFleet) add('info', `Cameo: ${drones.length} drone${drones.length === 1 ? '' : 's'} (${drones.map((d) => d.name).join(', ')}).`);
        drones.forEach((d) => { if (before.get(d.id) !== d.step) add('success', `${d.name}: ${d.step} (from Cameo)`); });
        publish();
      },
      setStep(id, step) { setStep(id, step); publish(); },
      setMaster(lead) {
        if (lead === master) return;
        master = lead === 'base' || drones.some((d) => d.id === lead) ? lead : '';
        const who = master === 'base' ? 'the base station' : master ? (drones.find((d) => d.id === master) || {}).name : 'nobody';
        add('info', `Master: ${who}.`);
        publish();
      },
      note(type, message) { add(type, message); publish(); },
      reset(message) {
        stopScenario();
        seen = new Set();
        start();
        add('info', message || 'Simulation restarted. The drones are at the base.');
        publish();
      },
      /* The scenario of COURSE_CONFIG.fleet.scenario: [pause in ms, drone id, step], played in order. */
      runScenario() {
        stopScenario();
        seen = new Set();
        start();
        running = true;
        add('info', 'Scenario...');
        publish();
        const steps = CFG.scenario || [];
        let wait = 0;
        steps.forEach(([pause, id, step], i) => {
          wait += pause;
          timers.push(setTimeout(() => {
            setStep(id, step);
            if (i === steps.length - 1) running = false;
            publish();
          }, wait));
        });
        if (!steps.length) { running = false; publish(); }
      },
      stopScenario
    };
  }

  window.FleetCore = { ROLES, BEHAVIOURS, ON_FIELD, AWAY, behaviourOf, roleOf, rule, createFleet };
})();
