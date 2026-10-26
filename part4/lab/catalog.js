/* Part 4 lab (POC): the mock model. Everything here is an assumption until the real Part 4 model exists:
   block names, ports, interface blocks, item flows, the capabilities and the drone variants.
   Read by ibd.js (the boxes and their ports), drone3d.js (where each block sits on the airframe),
   traffic.js (what flows on each connector) and fleet.js (who can do what in the mission). */
(function () {
  'use strict';

  /* Interface blocks. `fam` picks the colour, `flow` is the item flow shown on the connector,
     `rate` is packets per second on a running drone (0: a continuous flow, drawn as a moving dash). */
  const IF = {
    IF_Power:      { fam: 'power', flow: 'Power 22 V', rate: 0 },
    IF_MotorCmd:   { fam: 'cmd',   flow: 'MotorCmd', rate: 3.2 },
    IF_NavData:    { fam: 'data',  flow: 'Position', rate: 1.6 },
    IF_FlightCmd:  { fam: 'cmd',   flow: 'Waypoint', rate: 0.7 },
    IF_GroundLink: { fam: 'data',  flow: 'Telemetry', back: 'FlightPlan', rate: 0.8 },
    IF_Video:      { fam: 'video', flow: 'VideoFrame', rate: 2.4 },
    IF_Thermal:    { fam: 'heat',  flow: 'ThermalFrame', rate: 1.8 },
    IF_DeterCmd:   { fam: 'cmd',   flow: 'Deter', rate: 0 },
    IF_FleetMsg:   { fam: 'fleet', flow: 'FleetMsg', back: 'Order', rate: 0.9 },
    IF_RelayRF:    { fam: 'fleet', flow: 'RelayRF', rate: 0.6 }
  };

  const FAM = {
    power: { label: 'Energy', color: 'var(--f-power)' },
    cmd:   { label: 'Command', color: 'var(--f-cmd)' },
    data:  { label: 'Data', color: 'var(--f-data)' },
    video: { label: 'Video', color: 'var(--f-video)' },
    heat:  { label: 'Thermal', color: 'var(--f-heat)' },
    fleet: { label: 'Fleet', color: 'var(--f-fleet)' }
  };

  /* Blocks. One part property per block in the drone (the propulsion block stands for the four motors).
     ibd: the box in the internal block diagram (viewBox 1000 x 640). ports: side t/r/b/l, at a fraction of it.
     mass in g, power in W. Software blocks are hosted by the Mission Computer: no box of their own,
     a card inside its box, and a cartridge that slides into its bay on the drone. */
  const P = (id, name, iface, dir, side, at) => ({ id, name, iface, dir, side, at });
  const PWR = (side, at) => P('pwr', 'pwr', 'IF_Power', 'in', side, at);

  const BLOCKS = [
    { id: 'energy', name: 'Energy System', short: 'Energy', kind: 'hw', group: 'Platform', mass: 1250, power: 0,
      what: 'Battery 6S 10 Ah (222 Wh) and its power board. Feeds every other subsystem.',
      ibd: { x: 50, y: 500, w: 170, h: 100 }, ports: [P('pwr', 'pwrOut', 'IF_Power', 'out', 'r', 0.5)] },
    { id: 'prop', name: 'Propulsion System', short: 'Propulsion', kind: 'hw', group: 'Platform', mass: 420, power: 0,
      what: 'Four motors, their speed controllers and propellers.',
      ibd: { x: 330, y: 560, w: 300, h: 60 }, ports: [P('cmd', 'motorCmd', 'IF_MotorCmd', 'in', 't', 0.3), PWR('l', 0.5)] },
    { id: 'fc', name: 'Flight Controller', short: 'Flight ctrl', kind: 'hw', group: 'Platform', mass: 60, power: 4,
      what: 'Keeps the drone stable and flies it to the waypoint it is given.',
      ibd: { x: 330, y: 440, w: 190, h: 80 },
      ports: [P('guid', 'guidance', 'IF_FlightCmd', 'in', 't', 0.47), P('nav', 'nav', 'IF_NavData', 'in', 'r', 0.5), P('mot', 'motors', 'IF_MotorCmd', 'out', 'b', 0.5), PWR('l', 0.6)] },
    { id: 'nav', name: 'Navigation System', short: 'Navigation', kind: 'hw', group: 'Platform', mass: 45, power: 2,
      what: 'GNSS receiver and inertial unit: where the drone is, which way it goes.',
      ibd: { x: 545, y: 440, w: 90, h: 80 }, ports: [P('nav', 'navOut', 'IF_NavData', 'out', 't', 0.5), P('nav2', 'navOut2', 'IF_NavData', 'out', 'l', 0.5), PWR('b', 0.5)] },
    { id: 'wifi', name: 'WiFi System', short: 'WiFi', kind: 'hw', group: 'Platform', mass: 35, power: 3,
      what: 'The link with the ground station: flight plan in, telemetry out.',
      ibd: { x: 50, y: 70, w: 170, h: 76 }, ports: [P('gnd', 'ground', 'IF_GroundLink', 'inout', 'r', 0.5), PWR('r', 0.8)] },
    { id: 'mc', name: 'Mission Computer', short: 'Mission comp.', kind: 'hw', group: 'Platform', mass: 90, power: 9,
      what: 'Runs the mission software. Each software block is a cartridge in its bay.',
      ibd: { x: 330, y: 70, w: 300, h: 300 },
      ports: [P('gnd', 'ground', 'IF_GroundLink', 'inout', 'l', 0.13), P('fleet', 'fleet', 'IF_FleetMsg', 'inout', 'l', 0.4), PWR('l', 0.85),
              P('guid', 'guidance', 'IF_FlightCmd', 'out', 'b', 0.3), P('nav', 'nav', 'IF_NavData', 'in', 'b', 0.87),
              P('vid', 'video', 'IF_Video', 'in', 'r', 0.13), P('ir', 'thermal', 'IF_Thermal', 'in', 'r', 0.38), P('det', 'deter', 'IF_DeterCmd', 'out', 'r', 0.63)] },

    { id: 'fleet', name: 'Fleet Link', short: 'Fleet link', kind: 'hw', group: 'Fleet', mass: 40, power: 3,
      what: 'Mesh radio between the drones of the fleet.',
      ibd: { x: 50, y: 190, w: 170, h: 80 }, ports: [P('fleet', 'fleet', 'IF_FleetMsg', 'inout', 'r', 0.4), PWR('r', 0.8), P('relay', 'relay', 'IF_RelayRF', 'inout', 'b', 0.5)] },
    { id: 'relay', name: 'Relay Antenna', short: 'Relay ant.', kind: 'hw', group: 'Fleet', mass: 70, power: 5, master: true,
      what: 'Long-range mast: the master speaks for the whole swarm to the base station.',
      ibd: { x: 50, y: 330, w: 170, h: 80 }, ports: [P('relay', 'relay', 'IF_RelayRF', 'inout', 't', 0.5), PWR('r', 0.7)] },

    { id: 'eo', name: 'EO Camera', short: 'EO camera', kind: 'hw', group: 'Sensors', mass: 120, power: 4,
      what: 'Daylight camera on a gimbal: the zone and the flock.',
      ibd: { x: 780, y: 70, w: 170, h: 76 }, ports: [P('vid', 'video', 'IF_Video', 'out', 'l', 0.45), PWR('l', 0.82)] },
    { id: 'ir', name: 'Thermal Camera', short: 'IR camera', kind: 'hw', group: 'Sensors', mass: 95, power: 5,
      what: 'Infrared camera: sees the heat of an animal, day and night.',
      ibd: { x: 780, y: 180, w: 170, h: 76 }, ports: [P('ir', 'thermal', 'IF_Thermal', 'out', 'l', 0.45), PWR('l', 0.82)] },
    { id: 'det', name: 'Deterrent System', short: 'Deterrent', kind: 'hw', group: 'Effectors', mass: 160, power: 12,
      what: 'Loudspeaker and strobe light: scares the predator away, never hurts it.',
      ibd: { x: 780, y: 290, w: 170, h: 76 }, ports: [P('det', 'cmd', 'IF_DeterCmd', 'in', 'l', 0.45), PWR('l', 0.82)] },

    { id: 'sw-zone', name: 'Zone Patrol', short: 'Zone patrol', kind: 'sw', group: 'Software', mass: 0, power: 1,
      what: 'Plans the patrol of the zone and reports what moves in it.' },
    { id: 'sw-flock', name: 'Flock Tracker', short: 'Flock tracker', kind: 'sw', group: 'Software', mass: 0, power: 1,
      what: 'Counts the sheep on the video and follows the flock.' },
    { id: 'sw-pred', name: 'Predator Recognition', short: 'Predator rec.', kind: 'sw', group: 'Software', mass: 0, power: 2,
      what: 'Recognises a predator in the thermal image and tracks it.' },
    { id: 'sw-engage', name: 'Engage Manager', short: 'Engage mgr', kind: 'sw', group: 'Software', mass: 0, power: 1,
      what: 'Decides when and how to engage the predator with the deterrent.' },
    { id: 'sw-swarm', name: 'Swarm Coordinator', short: 'Swarm coord.', kind: 'sw', group: 'Software', mass: 0, power: 1, master: true,
      what: 'Gives the orders to the other drones: the master of the swarm.' }
  ];
  const BY = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));

  /* Connectors, written "part.port>part.port". The direction is the one of the flow. */
  const W = (s) => { const [a, b] = s.split('>'); const [ap, aq] = a.split('.'); const [bp, bq] = b.split('.'); return { a: { part: ap, port: aq }, b: { part: bp, port: bq } }; };
  const PW = (p) => W(`energy.pwr>${p}.pwr`);

  /* Capabilities: what a variant offers. Each one needs parts, and connectors between them. */
  const CAPS = [
    { id: 'fly', name: 'Fly', icon: 'fly', parts: ['energy', 'prop', 'fc', 'nav'],
      wires: [PW('prop'), PW('fc'), PW('nav'), W('fc.mot>prop.cmd'), W('nav.nav2>fc.nav')] },
    { id: 'ground', name: 'Ground link', icon: 'ground', parts: ['wifi', 'mc'],
      wires: [PW('wifi'), PW('mc'), W('wifi.gnd>mc.gnd'), W('mc.guid>fc.guid'), W('nav.nav>mc.nav')] },
    { id: 'fleet', name: 'Fleet link', icon: 'fleet', parts: ['fleet', 'mc'],
      wires: [PW('fleet'), W('fleet.fleet>mc.fleet')] },
    { id: 'zone', name: 'Zone surveillance', icon: 'zone', parts: ['eo', 'sw-zone'],
      wires: [PW('eo'), W('eo.vid>mc.vid')] },
    { id: 'sheep', name: 'Sheep monitoring & tracking', icon: 'sheep', parts: ['eo', 'sw-flock'],
      wires: [PW('eo'), W('eo.vid>mc.vid')] },
    { id: 'predator', name: 'Predator monitoring & tracking', icon: 'predator', parts: ['ir', 'sw-pred'],
      wires: [PW('ir'), W('ir.ir>mc.ir')] },
    { id: 'engage', name: 'Predator engagement', icon: 'engage', parts: ['det', 'sw-engage'], needs: ['predator'],
      wires: [PW('det'), W('mc.det>det.det')] },
    { id: 'master', name: 'Swarm master', icon: 'master', parts: ['relay', 'sw-swarm'], needs: ['fleet'],
      wires: [PW('relay'), W('relay.relay>fleet.relay')] }
  ];
  const CAP = Object.fromEntries(CAPS.map((c) => [c.id, c]));

  /* The variants of Part 4. The "complete" one is still to be renamed: Warden is a proposal.
     Every variant has a master derivative (swarm): the same drone plus the master capability. */
  const BASE = ['fly', 'ground', 'fleet'];
  const VARIANTS = [
    { id: 'warden', name: 'Warden', note: 'the complete one (name to choose)', color: '#ad1167', caps: [...BASE, 'zone', 'sheep', 'predator', 'engage'],
      blurb: 'Zone surveillance, sheep guard and predator management in one airframe.' },
    { id: 'guard', name: 'Sheep Guard', color: '#16a34a', caps: [...BASE, 'zone', 'sheep'],
      blurb: 'Everything but the predator: watches the zone and keeps the flock.' },
    { id: 'scout', name: 'Scout', color: '#0284c7', caps: [...BASE, 'zone'],
      blurb: 'Zone surveillance only: patrols the fence line.' },
    { id: 'herder', name: 'Herder', color: '#65a30d', caps: [...BASE, 'sheep'],
      blurb: 'Sheep monitoring and tracking only: stays over the flock.' },
    { id: 'ranger', name: 'Ranger', color: '#ea580c', caps: [...BASE, 'predator', 'engage'],
      blurb: 'Predator management: monitor, track and engage.' }
  ];
  const VAR = Object.fromEntries(VARIANTS.map((v) => [v.id, v]));

  /* The parts and connectors a set of capabilities needs (a recipe). */
  function recipe(caps) {
    const parts = new Set();
    const wires = [];
    const key = (w) => `${w.a.part}.${w.a.port}>${w.b.part}.${w.b.port}`;
    const seen = new Set();
    caps.forEach((c) => {
      CAP[c].parts.forEach((p) => parts.add(p));
      CAP[c].wires.forEach((w) => { const k = key(w); if (!seen.has(k)) { seen.add(k); wires.push(w); } });
    });
    return { parts: [...parts], wires };
  }
  function variantCaps(id, master) { return VAR[id].caps.concat(master ? ['master'] : []); }
  function variantName(id, master) { return VAR[id].name + (master ? ' Lead' : ''); }

  /* Where each hardware block sits on the airframe (drone3d.js), in px from the centre of the frame,
     z up from the top of the centre plate. shape: box (w x d x h), disc, mast, antenna, cart (a cartridge). */
  const MOUNTS = {
    energy: { shape: 'battery', x: 0, y: 0, z: -30, w: 92, d: 52, h: 26 },
    prop:   { shape: 'rotors' },
    fc:     { shape: 'box', x: 0, y: 30, z: 0, w: 44, d: 36, h: 10, tone: 'dark' },
    nav:    { shape: 'mast', x: 0, y: 46, z: 0, h: 46, r: 15 },
    wifi:   { shape: 'antennas', x: 0, y: 30, z: 0, h: 34 },
    mc:     { shape: 'computer', x: 0, y: -20, z: 0, w: 70, d: 40, h: 16 },
    fleet:  { shape: 'dome', x: -38, y: 28, z: 0, r: 14 },
    relay:  { shape: 'relay', x: 38, y: 26, z: 0, h: 78 },
    eo:     { shape: 'camera', x: 14, y: -60, z: -34, w: 26, d: 26, h: 24 },
    ir:     { shape: 'camera', x: -22, y: -58, z: -32, w: 24, d: 22, h: 20, tone: 'heat' },
    det:    { shape: 'deterrent', x: 0, y: 62, z: -32, w: 46, d: 26, h: 22 }
  };
  const SW_SLOTS = ['sw-zone', 'sw-flock', 'sw-pred', 'sw-engage', 'sw-swarm'];

  window.LAB = window.LAB || {};
  Object.assign(window.LAB, { IF, FAM, BLOCKS, BY, CAPS, CAP, VARIANTS, VAR, recipe, variantCaps, variantName, MOUNTS, SW_SLOTS });
})();
