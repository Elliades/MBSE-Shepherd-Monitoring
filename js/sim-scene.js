/* The pasture: sheep, base, drone, bear, sensor disks. It only needs the current step of the drone.
   Ported from src/poc/ui/PastureScene.jsx of the MBSE Shepard monitoring project; the React state
   became the `st` object and the effects became the transitions in setStep() and the frame loop.

   const scene = window.SimScene.create(hostElement)
   scene.setStep(step)       the drone moved to another step
   scene.setVisible(bool)    animations only run while the scene is on screen */
(function () {
  const { STEPS } = window.SimCore;
  const M = window.SimMotion;
  const ASSET = 'assets/sim/';

  const BLEATS = ['baa', 'beeeh', 'baaah', 'beh', 'mehh', 'baa-baa', 'beeh'];
  const PATROL_SHEEP_LINES = ['beep! one sheep…', 'two…', 'three…', 'four…'];
  const PATROL_SHEEP_ASLEEP = 'zzz… snore… 💤';
  const COUNTER_CRIES = [
    { text: 'shoo!', lane: '-2.6cqw', delay: '0s' },
    { text: 'bzzt!', lane: '2cqw', delay: '0.55s' },
    { text: 'raaah!', lane: '-0.4cqw', delay: '1.1s' }
  ];
  const COUNTER_WAVES = [
    { lane: '0.4cqw', delay: '0.28s' },
    { lane: '-1.7cqw', delay: '0.85s' }
  ];
  const SHEEP = [
    { top: '38%', left: '32%' },
    { top: '52%', left: '48%' },
    { top: '44%', left: '62%' },
    { top: '60%', left: '38%' },
    { top: '48%', left: '52%' }
  ];

  const HTML = `
    <div class="poc-field">
      <div class="poc-world">
        <div class="poc-zone">
          <span class="poc-zone-label">SAFE ZONE</span>
          ${SHEEP.map((spot, i) => `<div class="poc-sheep-wrap" style="top:${spot.top};left:${spot.left}"><span class="poc-bleat" hidden></span><img src="${ASSET}sheep.svg" alt="" class="poc-sheep poc-sheep--${i}" style="animation-delay:${(i * 0.35).toFixed(2)}s"></div>`).join('')}
        </div>
        <div class="poc-track" hidden></div>
        <div class="poc-bear-wrap" hidden><img src="${ASSET}bear.svg" alt="" class="poc-bear"></div>
      </div>
      <div class="poc-base"><img src="${ASSET}BaseStation.svg" alt=""><span>BASE</span></div>
      <div class="poc-step-chip"></div>
      <div class="poc-drone">
        <div class="poc-drone-anchor">
          <div class="poc-drone-sensor" aria-hidden="true">
            <span class="poc-sensor-echo poc-sensor-echo--1"></span>
            <span class="poc-sensor-echo poc-sensor-echo--2"></span>
            <span class="poc-sensor-echo poc-sensor-echo--3"></span>
            <span class="poc-sensor-disk"></span>
          </div>
          <div class="poc-counteraction-fx" aria-hidden="true" hidden>
            <span class="poc-counteraction-sound"></span>
            <span class="poc-counteraction-beam"></span>
          </div>
          <img class="poc-drone-body" src="${ASSET}Drone-without-circle.svg" alt="">
          <div class="poc-counteraction-cries" aria-hidden="true" hidden>
            ${COUNTER_WAVES.map((w) => `<span class="poc-counteraction-wave" style="--lane:${w.lane};--delay:${w.delay}">〰️</span>`).join('')}
            ${COUNTER_CRIES.map((c) => `<span class="poc-counteraction-cry" style="--lane:${c.lane};--delay:${c.delay}">${c.text}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>`;

  /* Write to the DOM only what changed: the frame loop calls render() every frame. */
  function put(el, key, value, apply) {
    const cache = el.__put || (el.__put = {});
    if (cache[key] === value) return;
    cache[key] = value;
    apply(value);
  }
  const setText = (el, v) => put(el, 'text', v, () => { el.textContent = v; });
  const setHidden = (el, v) => put(el, 'hidden', v, () => { el.hidden = v; });
  const setClass = (el, v) => put(el, 'class', v, () => { el.className = v; });
  const setStyle = (el, name, v) => put(el, 's:' + name, v, () => { if (v === '') el.style.removeProperty(name); else el.style.setProperty(name, v); });

  function create(host) {
    host.classList.add('poc-scene');
    host.innerHTML = HTML;
    const q = (sel) => host.querySelector(sel);
    const el = {
      world: q('.poc-world'),
      zone: q('.poc-zone'),
      sheep: [...host.querySelectorAll('.poc-sheep-wrap')],
      track: q('.poc-track'),
      bear: q('.poc-bear-wrap'),
      base: q('.poc-base'),
      chip: q('.poc-step-chip'),
      drone: q('.poc-drone'),
      anchor: q('.poc-drone-anchor'),
      sensor: q('.poc-drone-sensor'),
      echoes: [...host.querySelectorAll('.poc-sensor-echo')],
      fx: q('.poc-counteraction-fx'),
      cries: q('.poc-counteraction-cries'),
      bubble: null
    };
    el.sheepImg = el.sheep.map((w) => w.querySelector('.poc-sheep'));
    el.bleat = el.sheep.map((w) => w.querySelector('.poc-bleat'));

    const st = {
      step: STEPS.Off,
      approachDone: false,
      bubble: null,
      patrolChirp: null,
      bleats: SHEEP.map(() => null),
      actors: { bear: { x: 68, y: 97 }, drone: { x: 70, y: 30 } },
      trackTone: 'calm',
      exitFrom: null,
      counterPhase: null,
      patrolOffset: 0,
      patrolDrone: { ...M.SETTLED_DRONE }
    };
    /* Things the animation reads and writes without the view caring. */
    const ref = {
      follow: { bear: { x: 68, y: 97 }, drone: { x: 70, y: 30 }, offset: { x: -14, y: 6 } },
      spotted: false,
      entered: false,
      counterOrigin: null,
      freshTrack: false,
      safeEject: null,
      resumeTrack: null,
      patrolClock: { offset: 0, t0: 0 },
      leaveHeading: null,
      counterSim: null,
      counted: new Set(),
      countDone: false
    };
    const timers = { callout: 0, huh: 0, tone: 0, blink: 0, chirp: 0, bleat: [] };
    let loop = { key: '', elapsed: 0, trackElapsed: 0, last: 0 };
    let exit = null;
    let visible = false;
    let frame = 0;

    /* ───────── what the step means on screen ───────── */
    function derive() {
      const step = st.step;
      const requested = M.cameraForStep(step);
      const camera = requested === 'approaching' && st.approachDone ? 'near' : requested;
      const pose = M.dronePose(step, camera, st.approachDone);
      const showTrack = step === STEPS.GoingToSafeArea || step === STEPS.Patrolling || step === STEPS.PredatorTracking || step === STEPS.PredatorCounteraction;
      const stressed = step === STEPS.PredatorTracking || step === STEPS.PredatorCounteraction;
      const showBear = pose === 'follow' || !!st.exitFrom;
      const droneFollowStyle = pose === 'follow' || !!st.exitFrom;
      const showCounterFx = step === STEPS.PredatorCounteraction || ['eject', 'shoo', 'flee'].includes(st.counterPhase);
      const sensorVisual = M.sensorMode(step);
      const sensorRadius = M.sensorRadiusPercent(sensorVisual);

      let origin = M.PARKED_DRONE;
      if (droneFollowStyle || pose === 'follow') origin = st.actors.drone;
      else if (pose === 'patrol' && !st.exitFrom) origin = st.patrolDrone;
      else if (pose === 'settled' || (pose === 'approach' && st.approachDone)) origin = M.SETTLED_DRONE;
      else if (sensorVisual === 'echo') origin = M.PARKED_DRONE;
      else if (step === STEPS.GoingToSafeArea) origin = st.approachDone ? M.SETTLED_DRONE : M.PARKED_DRONE;

      const sheepIn = sensorRadius > 0
        ? SHEEP.map((spot) => M.isInsideSensor(origin, M.sheepInFieldPercent(spot), sensorRadius))
        : SHEEP.map(() => false);
      const bearIn = showBear && (sensorVisual === 'track' || sensorVisual === 'counter') && sensorRadius > 0
        && M.isInsideSensor(origin, st.actors.bear, sensorRadius);

      return { step, camera, pose, showTrack, stressed, showBear, droneFollowStyle, showCounterFx, sensorVisual, sheepIn, bearIn,
        droneClass: st.exitFrom ? 'follow' : pose };
    }

    function render() {
      const d = derive();
      setClass(el.world, `poc-world poc-world--${d.camera}`);
      setClass(el.zone, `poc-zone poc-zone--${d.step === STEPS.PredatorCounteraction ? 'danger' : 'safe'}`);
      el.sheep.forEach((wrap, i) => {
        setClass(wrap, `poc-sheep-wrap${d.sheepIn[i] ? ' poc-sheep-wrap--in-sensor' : ''}`);
        setClass(el.sheepImg[i], `poc-sheep poc-sheep--${i}${d.stressed ? ' poc-sheep--nervous' : ''}`);
        setHidden(el.bleat[i], !st.bleats[i]);
        if (st.bleats[i]) setText(el.bleat[i], st.bleats[i]);
      });

      setHidden(el.track, !d.showTrack);
      setClass(el.track, `poc-track${st.trackTone === 'alert' ? ' poc-track--alert' : ''}${st.trackTone === 'blink' ? ' poc-track--blink' : ''}`);

      setHidden(el.bear, !d.showBear);
      setClass(el.bear, `poc-bear-wrap${d.bearIn ? ' poc-bear-wrap--in-sensor' : ''}${d.bearIn && d.sensorVisual === 'counter' ? ' poc-bear-wrap--danger' : ''}`);
      setStyle(el.bear, 'left', `${st.actors.bear.x}%`);
      setStyle(el.bear, 'top', `${st.actors.bear.y}%`);

      setClass(el.base, `poc-base poc-base--${d.camera}`);
      put(el.base, 'aria', d.camera === 'near', (v) => el.base.setAttribute('aria-hidden', String(v)));
      setText(el.chip, d.step);

      setClass(el.drone, `poc-drone poc-drone--${d.droneClass}${d.showCounterFx ? ' poc-drone--counteraction' : ''}`);
      if (d.droneFollowStyle) {
        setStyle(el.drone, 'left', `${st.actors.drone.x}%`);
        setStyle(el.drone, 'top', `${st.actors.drone.y}%`);
        setStyle(el.drone, 'animation-delay', '');
      } else {
        setStyle(el.drone, 'left', '');
        setStyle(el.drone, 'top', '');
        setStyle(el.drone, 'animation-delay', d.pose === 'patrol' ? `${M.patrolAnimationDelay(st.patrolOffset)}s` : '');
      }

      renderBubble(d.step);
      setClass(el.sensor, `poc-drone-sensor poc-sensor--${d.sensorVisual}`);
      el.echoes.forEach((e) => setHidden(e, d.sensorVisual !== 'echo'));

      setHidden(el.fx, !d.showCounterFx);
      setHidden(el.cries, !d.showCounterFx);
      if (d.showCounterFx) {
        const aim = M.counterAim(st.actors.drone, st.actors.bear);
        [el.fx, el.cries].forEach((node) => {
          setStyle(node, '--aim', `${aim.rotate}deg`);
          setStyle(node, '--light', `${aim.light}cqw`);
          setStyle(node, '--sound', `${aim.sound}cqw`);
        });
      }
    }

    /* The bubble is a new element each time its text changes, so its CSS animation plays again. */
    function renderBubble(step) {
      const text = st.patrolChirp != null ? st.patrolChirp : st.bubble;
      const key = text ? `${step}-${text}` : '';
      if (el.bubble && el.bubble.dataset.key === key) return;
      if (el.bubble) el.bubble.remove();
      el.bubble = null;
      if (!text) return;
      const b = document.createElement('span');
      b.className = 'poc-bubble';
      b.dataset.key = key;
      b.textContent = text;
      el.anchor.prepend(b);
      el.bubble = b;
    }

    /* ───────── a step change (the useEffect([step]) of the React scene) ───────── */
    function setStep(next) {
      if (next === st.step) return;
      const prev = st.step;
      st.step = next;
      if (next !== STEPS.GoingToSafeArea) st.approachDone = false;

      clearTimeout(timers.callout);
      const text = M.STEP_CALLOUTS[next];
      st.bubble = text || null;
      if (text) timers.callout = setTimeout(() => { st.bubble = null; render(); }, 2200);

      clearTimeout(timers.tone);
      const wasExiting = !!st.exitFrom;
      if (wasExiting && next !== STEPS.Patrolling) { st.exitFrom = null; exit = null; }

      if (prev === STEPS.PredatorTracking && next === STEPS.Patrolling) {
        st.exitFrom = { ...ref.follow.bear };
        st.patrolOffset = M.patrolOffsetPercent(ref.follow.drone);
        startExit();
        st.trackTone = 'blink';
        timers.tone = setTimeout(() => { st.trackTone = 'calm'; render(); }, 700);
      }
      if (prev === STEPS.GoingToSafeArea && next === STEPS.Patrolling) {
        st.patrolOffset = M.patrolOffsetPercent({ x: 18, y: 16 });
      }
      if (next === STEPS.PredatorCounteraction && prev === STEPS.PredatorTracking) {
        ref.counterOrigin = { ...ref.follow.bear };
      }
      if (next !== STEPS.PredatorCounteraction) ref.counterSim = null;
      if (next === STEPS.PredatorTracking && prev === STEPS.PredatorCounteraction) {
        ref.freshTrack = false;
        ref.entered = true;
        ref.spotted = true;
        ref.leaveHeading = null;
        ref.safeEject = { from: { ...ref.follow.bear } };
        st.trackTone = 'alert';
      }
      if (next === STEPS.PredatorTracking && prev === STEPS.Patrolling) {
        if (!wasExiting) {
          const clock = ref.patrolClock;
          ref.follow = { ...ref.follow, drone: M.droneOnPatrol(clock.offset, performance.now() - clock.t0) };
        }
        ref.freshTrack = true;
        ref.resumeTrack = null;
      }
      if (next !== STEPS.PredatorTracking) {
        ref.spotted = false;
        ref.entered = false;
        if (!(prev === STEPS.PredatorTracking && next === STEPS.Patrolling) && next !== STEPS.PredatorCounteraction) st.trackTone = 'calm';
      }
      if (next === STEPS.PredatorCounteraction) st.trackTone = 'alert';

      if (next !== STEPS.Patrolling) {
        ref.counted = new Set();
        ref.countDone = false;
        clearTimeout(timers.chirp);
        st.patrolChirp = null;
      }
      sync();
    }

    /* After a change of step or of pose: restart what depends on them, then draw. */
    function sync() {
      const d = derive();
      const key = `${d.pose}|${d.step}`;
      if (key !== loop.key) {
        loop = { key, elapsed: 0, trackElapsed: 0, last: performance.now() };
        clearTimeout(timers.blink);
        if (d.pose === 'follow') prepareFollow();
        if (d.pose === 'patrol' && !st.exitFrom) ref.patrolClock = { offset: st.patrolOffset, t0: performance.now() };
        startBleats(d.stressed);
      }
      render();
      wake();
    }

    function prepareFollow() {
      const isCounter = st.step === STEPS.PredatorCounteraction;
      if (isCounter && !ref.counterOrigin) ref.counterOrigin = { ...ref.follow.bear };
      if (!isCounter && ref.freshTrack) {
        const start = M.bearAt(0);
        ref.follow = { ...ref.follow, bear: { x: start.x, y: start.y } };
        ref.freshTrack = false;
      }
    }

    /* ───────── frame loop ───────── */
    function wake() {
      if (!visible || frame) return;
      frame = requestAnimationFrame(tick);
    }
    function tick(now) {
      frame = 0;
      if (!visible) return;
      const d = derive();
      if (d.pose === 'follow') tickFollow(now);
      if (d.pose === 'patrol' && !st.exitFrom) st.patrolDrone = M.droneOnPatrol(ref.patrolClock.offset, now - ref.patrolClock.t0);
      if (st.exitFrom) tickExit(now);
      countSheep(derive());
      render();
      frame = requestAnimationFrame(tick);
    }

    function tickFollow(now) {
      const isCounter = st.step === STEPS.PredatorCounteraction;
      const dt = Math.min(40, now - loop.last);
      loop.last = now;
      loop.elapsed += dt;
      let bear;
      let next;

      if (isCounter) {
        if (!ref.counterSim) {
          ref.counterSim = M.createCounteractionState(ref.counterOrigin || ref.follow.bear, ref.follow.drone);
        }
        ref.counterSim = M.counteractionTick(ref.counterSim, dt);
        bear = ref.counterSim.bear;
        st.counterPhase = bear.phase;
        next = { ...ref.follow, bear: { x: bear.x, y: bear.y }, drone: ref.counterSim.drone };
      } else if (ref.safeEject) {
        const out = M.leaveSafeStep(ref.safeEject.from, dt);
        ref.safeEject = { from: { x: out.x, y: out.y } };
        ref.leaveHeading = out.heading;
        st.counterPhase = out.arrived ? null : 'flee';
        const behind = { x: out.x - out.heading.x * 12, y: out.y - out.heading.y * 12 };
        const clamp = (v) => Math.max(-0.12, Math.min(0.12, v));
        next = {
          ...ref.follow,
          bear: { x: out.x, y: out.y },
          drone: {
            x: ref.follow.drone.x + clamp(behind.x - ref.follow.drone.x),
            y: ref.follow.drone.y + clamp(behind.y - ref.follow.drone.y)
          }
        };
        if (out.arrived) {
          ref.resumeTrack = { x: out.x, y: out.y };
          loop.trackElapsed = 0;
          ref.safeEject = null;
          st.counterPhase = null;
        }
      } else {
        loop.trackElapsed += dt;
        bear = ref.resumeTrack
          ? M.bearTrackContinue(loop.trackElapsed, ref.resumeTrack, ref.leaveHeading)
          : M.bearAt(loop.trackElapsed);
        st.counterPhase = null;
        if (!ref.spotted && loop.trackElapsed > 1100) {
          ref.spotted = true;
          st.bubble = 'huh!';
          clearTimeout(timers.huh);
          timers.huh = setTimeout(() => { st.bubble = null; }, 1600);
        }
        const inside = M.isInsideTracking(bear);
        if (!ref.entered && inside) {
          ref.entered = true;
          st.trackTone = 'blink';
          clearTimeout(timers.blink);
          timers.blink = setTimeout(() => { st.trackTone = 'alert'; }, 700);
        }
        if (ref.entered && !inside) {
          ref.entered = false;
          st.trackTone = 'blink';
          clearTimeout(timers.blink);
          timers.blink = setTimeout(() => { st.trackTone = 'calm'; }, 700);
        }
        next = M.followStep(ref.follow, bear);
      }
      ref.follow = next;
      st.actors = { bear: next.bear, drone: next.drone };
    }

    /* The bear walks out of the tracking ring, then the drone goes back to its patrol path. */
    function startExit() {
      const from = st.exitFrom;
      const hold = { ...ref.follow.drone };
      const ontoPercent = M.patrolOffsetPercent(hold);
      exit = { from, destination: M.exitPoint(from), drone: hold, ontoPercent, onto: M.pointOnPatrol(ontoPercent), phase: 'bear', elapsed: 0, last: performance.now() };
    }
    function tickExit(now) {
      if (!exit) { st.exitFrom = null; return; }
      const dt = Math.min(40, now - exit.last);
      exit.last = now;
      exit.elapsed += dt;
      if (exit.phase === 'bear') {
        const k = Math.min(1, exit.elapsed / 3400);
        const s = k * k * (3 - 2 * k);
        const bear = {
          x: exit.from.x + (exit.destination.x - exit.from.x) * s,
          y: exit.from.y + (exit.destination.y - exit.from.y) * s
        };
        ref.follow = { ...ref.follow, bear, drone: exit.drone };
        st.actors = { bear, drone: exit.drone };
        if (k >= 1) { exit.phase = 'drone'; exit.elapsed = 0; }
        return;
      }
      const mx = exit.onto.x - exit.drone.x;
      const my = exit.onto.y - exit.drone.y;
      const dist = Math.hypot(mx, my);
      if (dist < 0.35) {
        ref.follow = { ...ref.follow, drone: exit.onto };
        st.patrolOffset = exit.ontoPercent;
        st.actors = { ...st.actors, drone: exit.onto };
        st.exitFrom = null;
        exit = null;
        ref.patrolClock = { offset: st.patrolOffset, t0: now };
        loop.key = '';
        sync();
        return;
      }
      const stepLen = Math.min(dist, 0.16);
      exit.drone = { x: exit.drone.x + (mx / dist) * stepLen, y: exit.drone.y + (my / dist) * stepLen };
      ref.follow = { ...ref.follow, drone: exit.drone };
      st.actors = { ...st.actors, drone: exit.drone };
    }

    /* The drone counts the sheep it flies over: one, two, three... then falls asleep at five. */
    function countSheep(d) {
      if (st.step !== STEPS.Patrolling) return;
      if (ref.countDone) {
        if (d.sheepIn.every((inside) => !inside)) { ref.countDone = false; ref.counted = new Set(); }
        return;
      }
      let fresh = 0;
      d.sheepIn.forEach((inside, i) => {
        if (inside && !ref.counted.has(i)) { ref.counted.add(i); fresh += 1; }
      });
      if (!fresh) return;
      const n = ref.counted.size;
      clearTimeout(timers.chirp);
      if (n >= 5) {
        st.patrolChirp = 'five sheep!';
        ref.countDone = true;
        timers.chirp = setTimeout(() => {
          st.patrolChirp = PATROL_SHEEP_ASLEEP;
          timers.chirp = setTimeout(() => { st.patrolChirp = null; }, 3200);
        }, 1100);
      } else {
        st.patrolChirp = PATROL_SHEEP_LINES[n - 1];
        timers.chirp = setTimeout(() => { st.patrolChirp = null; }, 1500);
      }
    }

    /* Each sheep bleats now and then, more often when a predator is around. */
    function startBleats(stressed) {
      timers.bleat.forEach(clearTimeout);
      timers.bleat = [];
      if (!visible) return;
      SHEEP.forEach((_, i) => {
        const speak = () => {
          st.bleats[i] = BLEATS[Math.floor(Math.random() * BLEATS.length)];
          timers.bleat.push(setTimeout(() => { st.bleats[i] = null; }, 700 + Math.random() * 500));
          timers.bleat.push(setTimeout(speak, (stressed ? 1600 : 2800) + Math.random() * 4200));
        };
        timers.bleat.push(setTimeout(speak, Math.random() * (stressed ? 1200 : 3500)));
      });
    }

    host.addEventListener('animationend', (e) => {
      if (e.animationName === 'poc-drone-approach') { st.approachDone = true; sync(); }
    });

    function setVisible(on) {
      if (on === visible) return;
      visible = on;
      if (!on) {
        cancelAnimationFrame(frame);
        frame = 0;
        timers.bleat.forEach(clearTimeout);
        timers.bleat = [];
        return;
      }
      /* The CSS animations start over when the scene reappears: restart the clocks that go with them. */
      const now = performance.now();
      ref.patrolClock = { offset: st.patrolOffset, t0: now };
      loop.last = now;
      if (exit) exit.last = now;
      loop.key = '';
      sync();
    }

    render();
    return { setStep, setVisible };
  }

  window.SimScene = { create };
})();
