/* The simulation panel, logic only: the steps of the drone, the signals that move it from one step
   to the next, and the "pilot" that applies signals (from Cameo or from the buttons) and tells the
   view. Ported from src/poc/stm and src/poc/pilot of the MBSE Shepard monitoring project.

   window.SimCore.STEPS, TRANSITIONS, LANES, NOMINAL, legalSignals(step), stepFromName(name)
   window.SimCore.createPilot()   -> { getSnapshot, subscribe, play, remote, jumpTo, note, reset, runNominal, stopNominal } */
(function () {
  const STEPS = {
    Off: 'Off',
    Unconfigured: 'Unconfigured',
    Configured: 'Configured',
    ReadyForMission: 'Ready for Mission',
    GoingToSafeArea: 'Going to Safe Area',
    Patrolling: 'Patrolling',
    PredatorTracking: 'Predator tracking',
    PredatorCounteraction: 'Predator counteraction',
    Crashed: 'Crashed'
  };
  const INITIAL = STEPS.Off;

  /* step -> { signal: next step }. A signal listed on the current step is accepted, even when it
     leaves the step unchanged. Anything else is refused. */
  const TRANSITIONS = {
    [STEPS.Off]: { 'Start SOI': STEPS.Unconfigured },
    [STEPS.Unconfigured]: { FlightPlan: STEPS.Configured, 'FlightPlan Check Failed': STEPS.Unconfigured },
    [STEPS.Configured]: { 'Ready for mission': STEPS.ReadyForMission },
    [STEPS.ReadyForMission]: { 'Start Sheep Guard Mission': STEPS.GoingToSafeArea },
    [STEPS.GoingToSafeArea]: { 'Start Patrolling': STEPS.Patrolling, 'Crashed Detected': STEPS.Crashed },
    [STEPS.Patrolling]: {
      'Predator Detected inside tracking perimeter': STEPS.PredatorTracking,
      'Crashed Detected': STEPS.Crashed
    },
    [STEPS.PredatorTracking]: {
      'Predator Entering Safe Area': STEPS.PredatorCounteraction,
      'Predator Leaving Tracking Perimeter': STEPS.Patrolling,
      'Crashed Detected': STEPS.Crashed
    },
    [STEPS.PredatorCounteraction]: {
      'Predator Leaving Safe Area': STEPS.PredatorTracking,
      'Crashed Detected': STEPS.Crashed
    }
  };

  /* Steps in the order the state machine diagram groups them. */
  const LANES = [
    { id: 'undeployed', title: 'Undeployed', steps: [STEPS.Off, STEPS.Unconfigured, STEPS.Configured, STEPS.ReadyForMission] },
    { id: 'deployed', title: 'Deployed', steps: [STEPS.GoingToSafeArea, STEPS.Patrolling] },
    { id: 'threat', title: 'Predator', steps: [STEPS.PredatorTracking, STEPS.PredatorCounteraction] },
    { id: 'terminal', title: 'Terminal', steps: [STEPS.Crashed] }
  ];

  /* The happy path, with the pause (ms) to wait before each signal so the scene can play. */
  const NOMINAL = [
    ['Start SOI', 0],
    ['FlightPlan', 1100],
    ['Ready for mission', 1100],
    ['Start Sheep Guard Mission', 1300],
    ['Start Patrolling', 4800],
    ['Predator Detected inside tracking perimeter', 6500],
    ['Predator Entering Safe Area', 7500]
  ];

  const ORDER = LANES.flatMap((lane) => lane.steps);

  function legalSignals(step) {
    if (step === STEPS.Crashed) return [];
    return Object.entries(TRANSITIONS[step] || {}).map(([signal, target]) => ({ signal, target }));
  }
  /* Cameo may name a step with another case or spacing: match loosely, or give null. */
  function stepFromName(name) {
    const flat = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');
    const want = flat(name);
    return ORDER.find((s) => flat(s) === want) || null;
  }

  let idCounter = 0;
  function newId() { idCounter += 1; return `sig-${idCounter}-${Date.now()}`; }
  function clock() { return new Date().toLocaleTimeString(); }

  function createPilot() {
    let step = INITIAL;
    let log = [];
    let nextEntry = 0;
    let snapshot = null;
    let timers = [];
    let running = false;
    const seen = new Set();
    const listeners = new Set();

    function add(type, message) {
      nextEntry += 1;
      log = log.concat({ id: nextEntry, type, message, time: clock() }).slice(-200);
    }
    function publish() {
      snapshot = { step, outgoing: legalSignals(step), crashed: step === STEPS.Crashed, log, running };
      listeners.forEach((fn) => { try { fn(snapshot); } catch (e) { /* a listener must not break the others */ } });
    }

    /* source: 'you' (a button) or 'Cameo' */
    function apply(signal, id, source) {
      if (seen.has(id)) {
        add('info', `Echo ignored: ${signal}`);
        publish();
        return { accepted: false, step };
      }
      const target = (TRANSITIONS[step] || {})[signal];
      if (step === STEPS.Crashed || target === undefined) {
        add('info', `${source === 'Cameo' ? 'Cameo sent' : 'Refused'}: ${signal}${source === 'Cameo' ? ' (not allowed in this step, ignored)' : ''}`);
        publish();
        return { accepted: false, step };
      }
      seen.add(id);
      const before = step;
      step = target;
      add('info', `${source === 'Cameo' ? 'Cameo' : 'Signal'}: ${signal}`);
      if (step !== before) add('success', `Step: ${step}`);
      publish();
      return { accepted: true, step };
    }

    function stopNominal() {
      timers.forEach(clearTimeout);
      timers = [];
      if (running) { running = false; publish(); }
    }

    publish();
    add('info', 'Ready. The drone is Off.');
    publish();

    return {
      getSnapshot: () => snapshot,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      play: (signal) => apply(signal, newId(), 'you'),
      remote: (signal, id) => apply(signal, id || newId(), 'Cameo'),
      /* Take the step Cameo says it is in (first connection, or after a resync). */
      jumpTo(name) {
        const target = stepFromName(name);
        if (!target || target === step) return;
        step = target;
        add('success', `Step: ${step} (from Cameo)`);
        publish();
      },
      reset(note) {
        stopNominal();
        step = INITIAL;
        add('info', note || 'Simulation restarted. The drone is Off.');
        publish();
      },
      runNominal() {
        stopNominal();
        running = true;
        add('info', 'Nominal scenario...');
        publish();
        let wait = 0;
        NOMINAL.forEach(([signal, pause], i) => {
          wait += pause;
          timers.push(setTimeout(() => {
            apply(signal, newId(), 'you');
            if (i === NOMINAL.length - 1) { running = false; publish(); }
          }, wait));
        });
      },
      note(type, message) { add(type, message); publish(); },
      stopNominal
    };
  }

  window.SimCore = { STEPS, INITIAL, TRANSITIONS, LANES, NOMINAL, legalSignals, stepFromName, createPilot };
})();
