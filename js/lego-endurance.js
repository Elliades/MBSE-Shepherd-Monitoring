/* Part 4, bonus: a whole mission on the pasture, computed here and not in Cameo: batteries, the way to the field, chargers, how fast
   someone gets to a stray sheep or a bear. No page in here: the widget enduranceLab of js/widgets-lego.js draws what comes out.
   The rules of who does what are those of the model (scripts/make-part4-model.py), the figures are invented, for comparison only.

   LegoEndurance.simulate(fleet, settings, day) -> { minutes, drones, events, kpi }
     fleet     { drones: [{ name, bricks, grams, watts, price, minutes }] }
     settings  { returnAt (% of battery), km, speed (m/s), slots, battery (id in day.batteries), stagger }
     fleet: the mass, power and flight time are those of the drones with that battery.
     day       LEGO.day */
(function (root) {
  'use strict';

  const STEP = 0.25;
  const [ZONE, FLOCK, TRACK, PREDATOR, STANDBY, MASTER, REFLEX] = ['Zone Surveillance', 'Flock Watching', 'Sheep Tracking', 'Predator Management', 'Base Standby', 'Swarm Master', 'Swarm Reflex'];
  /* What each state costs, against hovering. The way to the field: see cruiseEffort. */
  const EFFORT = { joining: 1.1, field: 1, job: 1.1, deter: 1.25 };
  /* How much the flock feels each state, for a drone of 2 kg. */
  const FELT = { field: 1, job: 0.5, deter: 2, joining: 0.3, out: 0.1, in: 0.1 };
  const FLYING = Object.keys(EFFORT).concat('out', 'in');
  const AT_BASE = ['ready', 'charging', 'queue'];

  /* Air drag grows with the cube of the speed: fast is expensive, and past about 13 m/s it even costs more per kilometre. */
  const cruiseEffort = (speed, day) => 1 + Math.pow(speed / day.dragSpeed, 3);
  const batteryOf = (settings, day) => day.batteries.find((b) => b.id === settings.battery) || day.batteries[0];
  /* The charger gives a fixed power: the bigger the battery, the longer it takes. */
  const chargeMinutes = (battery, day) => (battery.wh / day.chargerWatts) * 60;

  function simulate(fleet, settings, day) {
    const transit = (settings.km * 1000) / settings.speed / 60;
    const cruise = cruiseEffort(settings.speed, day);
    const effortOf = { ...EFFORT, out: cruise, in: cruise };
    const charge = chargeMinutes(batteryOf(settings, day), day);
    const onField = fleet.drones.filter((d) => !d.bricks.includes(STANDBY)).length;
    const spent = 1 - settings.returnAt / 100;
    let turn = 0;
    const drones = fleet.drones.map((d) => {
      const stays = d.bricks.includes(STANDBY);
      /* In turn: one round, flight and charge, shared between those who fly. */
      const round = d.minutes * spent + transit + day.landingMinutes + charge * spent;
      const start = stays || !settings.stagger ? 0 : (turn++ * round) / Math.max(1, onField);
      return {
        ...d, stays, start, soc: 100, state: 'ready', left: 0, job: null, segments: [], trace: [], lost: false,
        has: (t) => d.bricks.includes(t), keepsField: d.bricks.includes(ZONE) || d.bricks.includes(FLOCK)
      };
    });
    const hasMaster = fleet.drones.some((d) => d.bricks.includes(MASTER)) || !!fleet.masterInBase;
    const events = day.events.map((e) => ({ ...e, spotted: null, arrived: null, worked: 0, done: false, ended: null, holders: [] }));
    const charging = () => drones.filter((d) => d.state === 'charging').length;
    const totals = { flock: 0, zone: 0, predator: 0, alone: 0, felt: 0, wh: 0 };

    /* What a job costs a drone that leaves the base for it, down to where it must turn back. */
    const enough = (d, lasts) => d.soc >= Math.min(100, settings.returnAt + (transit * cruise + lasts * EFFORT.job) * (100 / d.minutes));
    /* Who may be sent: on the field first, then at the base with enough for the job. */
    const candidates = (type, lasts) => {
      const free = drones.filter((d) => d.has(type) && !d.job && !d.lost);
      return free.filter((d) => d.state === 'field').concat(free.filter((d) => AT_BASE.includes(d.state) && enough(d, lasts)));
    };
    const send = (d, e) => {
      d.job = e;
      e.holders.push(d);
      if (d.state === 'field') { d.state = 'joining'; d.left = day.nearMinutes; } else { d.state = 'out'; d.left = transit; }
    };
    const release = (d) => {
      if (d.job) d.job.holders = d.job.holders.filter((h) => h !== d);
      d.job = null;
    };

    function dispatch(e, t) {
      const type = e.kind === 'sheep' ? TRACK : PREDATOR;
      if (e.kind === 'sheep' && e.spotted === null) {
        const seers = drones.filter((d) => d.has(FLOCK) && d.state === 'field');
        if ((hasMaster && seers.length) || seers.some((d) => d.has(REFLEX))) e.spotted = t;
      }
      if (e.kind === 'sheep' && e.spotted === null) return;
      if (hasMaster) {
        if (!e.holders.length && candidates(type, e.lasts).length) send(candidates(type, e.lasts)[0], e);
        return;
      }
      /* No master: every drone says yes to itself, and calls nobody. */
      candidates(type, e.lasts).filter((d) => d.has(REFLEX) && (e.kind !== 'sheep' || (d.has(FLOCK) && d.state === 'field'))).forEach((d) => send(d, e));
    }

    const minutes = day.minutes;
    for (let t = 0; t < minutes; t += STEP) {
      events.filter((e) => !e.done && t >= e.at).forEach((e) => {
        dispatch(e, t);
        if (t >= e.at + e.giveUp) { e.done = true; e.ended = t; e.holders.slice().forEach((d) => { release(d); }); }
      });

      drones.forEach((d) => {
        if (d.lost) return;
        if (d.state === 'ready' && !d.stays && t >= d.start && !d.job) { d.state = 'out'; d.left = transit; }
        if (d.state === 'charging') {
          d.soc = Math.min(100, d.soc + (100 / charge) * STEP);
          if (d.soc >= 100) d.state = 'ready';
        }
        if (d.state === 'landing') {
          d.left -= STEP;
          if (d.left <= 0) d.state = 'queue';
          return;
        }
        if (!FLYING.includes(d.state)) return;
        const fighting = d.state === 'job' && d.job && d.job.kind === 'bear';
        const effort = effortOf[fighting ? 'deter' : d.state];
        d.soc -= (100 / d.minutes) * effort * STEP;
        totals.wh += ((d.watts + day.hoverWatts * Math.pow(d.grams / day.hoverGrams, 1.5)) * effort * STEP) / 60;
        if (d.soc <= 0) { d.soc = 0; d.lost = true; d.lostAt = t; release(d); d.state = 'lost'; return; }
        if (d.state !== 'in' && d.state !== 'out' && d.soc <= settings.returnAt) { release(d); d.state = 'in'; d.left = transit; return; }
        if (['out', 'in', 'joining'].includes(d.state)) {
          d.left -= STEP;
          if (d.left > 0) return;
          if (d.state === 'in') { d.state = 'landing'; d.left = day.landingMinutes; return; }
          d.state = d.job ? 'job' : 'field';
          if (d.state === 'job' && d.job.arrived === null) d.job.arrived = t;
        }
      });

      events.filter((e) => !e.done && e.holders.some((d) => d.state === 'job')).forEach((e) => {
        e.worked += STEP;
        if (e.worked < e.lasts) return;
        e.done = true;
        e.ended = t;
        e.holders.slice().forEach((d) => {
          release(d);
          if (d.stays) { d.state = 'in'; d.left = transit; } else d.state = 'field';
        });
      });

      drones.filter((d) => d.state === 'queue').forEach((d) => { if (charging() < settings.slots) d.state = 'charging'; });

      const here = drones.filter((d) => !d.lost);
      const flock = here.some((d) => d.has(FLOCK) && d.state === 'field');
      if (flock) totals.flock += STEP;
      if (here.some((d) => d.has(ZONE) && d.state === 'field')) totals.zone += STEP;
      if (here.some((d) => d.has(PREDATOR) && (d.state === 'field' || d.job || (AT_BASE.includes(d.state) && enough(d, day.bearLasts))))) totals.predator += STEP;
      if (!here.some((d) => d.keepsField && d.state === 'field')) totals.alone += STEP;
      here.forEach((d) => {
        const fighting = d.state === 'job' && d.job && d.job.kind === 'bear';
        const felt = FELT[fighting ? 'deter' : d.state];
        if (felt) totals.felt += felt * Math.pow(d.grams / day.hoverGrams, 1.5) * STEP * (d.keepsField || d.state !== 'field' ? 1 : day.notOverFlock);
      });
      drones.forEach((d) => {
        const shown = d.state === 'joining' ? 'job' : ['out', 'in', 'landing'].includes(d.state) ? 'transit' : d.state;
        const last = d.segments[d.segments.length - 1];
        if (last && last.state === shown) last.to = t + STEP; else d.segments.push({ state: shown, from: t, to: t + STEP });
        if (Math.abs((t / STEP) % 4) < 1e-6) d.trace.push(Math.round(d.soc * 10) / 10);
      });
    }

    const reaction = (e) => (e.arrived === null ? null : e.arrived - e.at);
    const report = events.map((e) => {
      const r = reaction(e);
      const late = r === null || r > e.grace;
      return { kind: e.kind, at: e.at, say: e.say, reaction: r, spotted: e.spotted === null ? null : e.spotted - e.at, grace: e.grace, late, several: e.holders.length > 1 };
    });
    const worst = (kind) => {
      const list = report.filter((r) => r.kind === kind);
      if (list.some((r) => r.reaction === null)) return null;
      return list.length ? Math.max(...list.map((r) => r.reaction)) : 0;
    };
    const pct = (x) => Math.round((x / minutes) * 100);
    const price = fleet.drones.reduce((n, d) => n + d.price, 0) + settings.slots * day.slotPrice;
    const designs = new Set(fleet.drones.map((d) => d.bricks.slice().sort().join('+'))).size;
    const bricks = fleet.drones.reduce((n, d) => n + d.bricks.length, 0) + (fleet.masterInBase ? 1 : 0);
    return {
      minutes,
      drones: drones.map((d) => ({ name: d.name, bricks: d.bricks, minutes: d.minutes, stays: d.stays, segments: d.segments, trace: d.trace, lostAt: d.lost ? d.lostAt : null })),
      events: report,
      kpi: {
        flock: pct(totals.flock), zone: pct(totals.zone), predator: pct(totals.predator), alone: Math.round(totals.alone),
        worstSheep: worst('sheep'), worstBear: worst('bear'), bearsLate: report.filter((r) => r.kind === 'bear' && r.late).length,
        sheepLate: report.filter((r) => r.kind === 'sheep' && r.late).length, lost: drones.filter((d) => d.lost).length,
        /* Three 2 kg drones over the flock all day would be 100. */
        stress: Math.round((totals.felt / minutes / 3) * 100), wh: Math.round(totals.wh), price, bricks, designs
      }
    };
  }

  root.LegoEndurance = { simulate, cruiseEffort, batteryOf, chargeMinutes, STATES: ['field', 'job', 'transit', 'charging', 'queue', 'ready', 'lost'] };
})(typeof window !== 'undefined' ? window : globalThis);
