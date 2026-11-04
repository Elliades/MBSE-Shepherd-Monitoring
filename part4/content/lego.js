/* Part 4, the box of Lego: what the student can plug, what it looks like, and the missions played on the assembly.
   Read by js/widgets-lego.js (the assembly bay, the mission board) and by scripts/check-part4-solutions.mjs.
   Block, state and signal names are those of the model (scripts/make-part4-model.py): keep them in step.

   A mission is played in Cameo from a fresh start. `prepare` first, not measured, then each step: the signal is sent, and
   each check says what must be true of the swarm once it has settled. A check reads the state of each drone:
     following / tracking / deterring / landed             how many drones are doing it, and how many are wanted
     field: true                                           at least one drone is on station, with something to watch with
     watching: "Zone Surveillance"                         at least one drone has this component at work
   The play itself is js/lego-run.js. */
window.LEGO = {
  simulation: "Swarm Simulation",
  soi: "Pasture Sentinel System",

  drones: [
    { id: "D1", name: "Drone 1", path: "soi.drone1" },
    { id: "D2", name: "Drone 2", path: "soi.drone2" },
    { id: "D3", name: "Drone 3", path: "soi.drone3" }
  ],
  base: { name: "Base Station", path: "soi.base" },

  /* The bricks. region: the region of the mission it answers to. state: the state it is in when at work. keepsField: a drone
     on station with it counts as keeping the field. gear: the blocks of the 3D drone it brings (part4/lab/catalog.js, which
     also gives their mass and power: two bricks share a camera). */
  bricks: [
    { type: "Zone Surveillance", icon: '<rect x="3.5" y="3.5" width="17" height="17" rx="2" stroke-dasharray="3 2.2"/><path d="M8 16l3-5 2 3 3-6"/>', short: "Zone", kind: "feature", region: "Perimiter watch", tone: "#0284c7", state: "Watching Perimeter", keepsField: true,
      gear: ["eo", "sw-zone"], what: "On station, the drone patrols the perimeter of the field." },
    { type: "Flock Watching", icon: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>', short: "Flock", kind: "feature", region: "Sheep Monitoring", tone: "#16a34a", state: "Watching Flock", keepsField: true,
      gear: ["eo", "sw-flock"], what: "The half of the sheep watch that looks: it counts the sheep; one walks out, it warns the operator and says so. It never leaves its station." },
    { type: "Sheep Tracking", icon: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>', short: "Track", kind: "feature", region: "Sheep Monitoring", tone: "#65a30d", state: "Waiting For A Stray",
      gear: ["eo", "sw-track"], what: "The half of the sheep watch that follows: it sees nothing by itself; when a stray is spotted, it asks for the job and goes after the sheep." },
    { type: "Predator Management", icon: '<path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>', short: "Predator", kind: "feature", region: "Predator Monitoring", tone: "#ea580c", state: "Watching For Bear",
      gear: ["ir", "det", "sw-pred", "sw-engage"], what: "Thermal camera and deterrent. A bear: it asks for the job, then tracks it and scares it away." },
    { type: "Base Standby", icon: '<circle cx="12" cy="12" r="9"/><path d="M9 7.5v9M15 7.5v9M9 12h6"/>', short: "Standby", kind: "post", tone: "#64748b",
      gear: [], what: "The drone stays docked instead of flying to the field, and takes off when one of its components gets a job. Cheap in batteries, slow to arrive." },
    { type: "Swarm Master", icon: '<path d="M3.5 17.5l-1-10 5.5 4 4-7 4 7 5.5-4-1 10z"/><path d="M4 20.5h16"/>', short: "Master", kind: "brain", tone: "#ad1167",
      gear: ["relay", "sw-swarm"], what: "The intelligence: it opens a job when a stray is spotted, gives each job to one drone and tells the others it is taken, so that a drone always keeps the field." },
    { type: "Swarm Reflex", icon: '<path d="M13.5 2.5L5 13.5h6l-1.5 8 8.5-11h-6z"/>', short: "Reflex", kind: "brain", tone: "#7c3aed",
      gear: ["sw-swarm"], what: "No coordination at all: the drone says yes to itself and calls nobody. Every drone that sees something goes." },
    /* kind "ground": in the Base Station only. Each one missing fails a mission. */
    { type: "Operator Communication", icon: '<path d="M4 5h16v10.5H9.5L4.5 20z"/><path d="M8 9.5h8M8 12.5h5"/>', short: "Operator", kind: "ground", tone: "#0891b2",
      gear: [], what: "The link with the operator: it passes the commands of the operator app on to Ground Control. Without it the base hears nothing, and nothing starts." },
    { type: "Weather Monitoring", icon: '<path d="M7 16.5a4.5 4.5 0 1 1 1.3-8.8 5.5 5.5 0 0 1 10.4 2.6 3.6 3.6 0 0 1-.7 6.2"/><path d="M13 12.5l-2.5 4h3.5l-2.5 4"/>', short: "Weather", kind: "ground", tone: "#4f46e5",
      gear: [], what: "Reads the weather station: on a storm it warns Ground Control, which calls the drones back. Without it nobody watches the sky." },
    { type: "Mission Monitoring", icon: '<rect x="2.5" y="3.5" width="19" height="13" rx="2"/><path d="M6 10.5h3l1.5-3 3 6 1.5-3h3M9 20.5h6M12 16.5v4"/>', short: "Monitor", kind: "ground", tone: "#b45309",
      gear: [], what: "Passes the alerts of the drones (a sheep out, a bear, the bear gone) on to the operator. Without it nobody on the ground knows." },
    { type: "Charging Dock", icon: '<rect x="2.5" y="16" width="19" height="4.5" rx="1.5"/><path d="M13.5 2.5l-4.5 6.5h4.5l-2.5 5"/>', short: "Dock", kind: "ground", tone: "#059669",
      gear: [], what: "Landing pads and chargers for up to three drones: a drone coming home asks to land, the dock clears it. Without it a drone has nowhere to land." }
  ],

  /* Given in the model, never moved: shown in the panel of components (brickPanel) next to the bricks. Icons: 24 x 24 strokes,
     the same drawings as the images of the blocks in the model. */
  given: [
    { type: "Flight Orchestrator", short: "Flight", tone: "#334155", where: "In every drone",
      icon: '<circle cx="5.5" cy="5.5" r="3"/><circle cx="18.5" cy="5.5" r="3"/><circle cx="5.5" cy="18.5" r="3"/><circle cx="18.5" cy="18.5" r="3"/><path d="M8 8l8 8M16 8l-8 8"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>',
      what: "Flies the drone where its components tell it. It never asks them anything, so any of them can be there or not." },
    { type: "Ground Control", short: "Ground", tone: "#334155", where: "In the base station",
      icon: '<path d="M12 10v11.5M8 21.5h8M7.5 21.5L12 10l4.5 11.5"/><path d="M8.5 6.5a5 5 0 0 1 7 0M6 4a8.5 8.5 0 0 1 12 0"/><circle cx="12" cy="9" r="1.3"/>',
      what: "The heart of the base station: flight plan, launch and recall of the drones. It hears the operator and the weather only through the bricks you plug next to it." }
  ],

  /* Every drone carries this, whatever is plugged: the Flight Orchestrator and its airframe. */
  airframe: ["energy", "prop", "fc", "nav", "wifi", "mc", "fleet"],
  /* Price of each block of the 3D drone, in euros, and how long a battery lasts: all that the board compares. */
  prices: { energy: 400, prop: 500, fc: 200, nav: 150, wifi: 50, mc: 300, fleet: 150, eo: 350, ir: 800, det: 250, relay: 200, "sw-zone": 100, "sw-flock": 100, "sw-track": 100, "sw-pred": 250, "sw-engage": 100, "sw-swarm": 150 },
  endurance: { batteryWh: 222, usable: 0.85, hoverWatts: 300, hoverGrams: 2000 },

  /* The bonus of chapter 5, js/lego-endurance.js: four hours on the pasture. All this is invented, for comparison only. A stray sheep
     should be reached in `grace` minutes, a bear before it reaches the flock; `lasts`: how long the job takes once there. */
  day: {
    minutes: 240, hoverWatts: 300, hoverGrams: 2000, slotPrice: 300, chargerWatts: 400, dragSpeed: 16, landingMinutes: 6,
    /* Mass and price of the whole energy system of a drone, which replace those of the 3D catalog and of `prices`. */
    batteries: [
      { id: "small", label: "Small", wh: 150, grams: 900, price: 300 },
      { id: "standard", label: "Standard", wh: 222, grams: 1250, price: 400 },
      { id: "large", label: "Large", wh: 333, grams: 1800, price: 600 },
      { id: "dense", label: "High density", wh: 333, grams: 1250, price: 1200 },
      { id: "huge", label: "Huge", wh: 444, grams: 2350, price: 800 }
    ],
    nearMinutes: 1, bearLasts: 14, notOverFlock: 0.4,
    events: [
      { kind: "sheep", at: 35, lasts: 12, grace: 6, giveUp: 40, say: "A sheep walks out" },
      { kind: "bear", at: 72, lasts: 14, grace: 4, giveUp: 40, say: "A bear comes" },
      { kind: "sheep", at: 118, lasts: 12, grace: 6, giveUp: 40, say: "A sheep walks out" },
      { kind: "bear", at: 165, lasts: 14, grace: 4, giveUp: 40, say: "A bear comes" },
      { kind: "sheep", at: 171, lasts: 12, grace: 6, giveUp: 40, say: "And a sheep walks out" }
    ],
    settings: { returnAt: 25, km: 1.5, speed: 12, slots: 2, battery: "standard", stagger: true },
    presets: [
      { id: "complete", label: "Three complete drones", hosts: { "Drone 1": ["Zone Surveillance", "Flock Watching", "Sheep Tracking", "Predator Management", "Swarm Master"], "Drone 2": ["Zone Surveillance", "Flock Watching", "Sheep Tracking", "Predator Management"], "Drone 3": ["Zone Surveillance", "Flock Watching", "Sheep Tracking", "Predator Management"] } },
      { id: "jobs", label: "A job each", hosts: { "Drone 1": ["Zone Surveillance", "Flock Watching", "Swarm Master"], "Drone 2": ["Sheep Tracking"], "Drone 3": ["Predator Management"] } },
      { id: "thrifty", label: "One on the field, two at the base", hosts: { "Drone 1": ["Zone Surveillance", "Flock Watching", "Swarm Master"], "Drone 2": ["Sheep Tracking", "Base Standby"], "Drone 3": ["Predator Management", "Base Standby"] } },
      { id: "relay", label: "Two take turns, a ranger at the base", hosts: { "Drone 1": ["Zone Surveillance", "Flock Watching", "Sheep Tracking", "Swarm Master"], "Drone 2": ["Zone Surveillance", "Flock Watching", "Sheep Tracking"], "Drone 3": ["Predator Management", "Base Standby"] } }
    ]
  },

  /* What a drone is called, from what it carries (the roles of fleet.roles in config.js). */
  roleOf: [
    { has: ["Zone Surveillance", "Flock Watching", "Predator Management"], role: "warden" },
    { has: ["Flock Watching", "Sheep Tracking"], role: "guard" },
    { has: ["Zone Surveillance", "Flock Watching"], role: "guard" },
    { has: ["Predator Management"], role: "ranger" },
    { has: ["Sheep Tracking"], role: "herder" },
    { has: ["Flock Watching"], role: "herder" },
    { has: ["Zone Surveillance"], role: "scout" },
    { has: [], role: "bare" }
  ],

  /* What the state of a drone looks like in the pasture of the simulation panel, read in this order. */
  steps: [
    ["Following Sheep", "Tracking stray sheep"], ["Tracking Predator", "Predator tracking"], ["Deterring Predator", "Predator counteraction"],
    ["Going to Station", "Going to Safe Area"], ["Returning", "Returning to base"], ["Landed", "Off"],
    ["Mission Briefing", "Ready for Mission"], ["Standing By", "Ready for Mission"]
  ],

  /* Not measured: each step is sent again if the state does not come (just started, a first signal may be lost). needs: a brick of
     the base station without which the step cannot happen; missing, or never reached, `no` is the verdict of the mission. */
  prepare: [
    { signal: "Start SOI", into: "Operator", at: "soi.base.Ground Control", until: "Base Unconfigured", needs: "Operator Communication",
      no: "The base station never heard the operator: plug Operator Communication in the Base Station, and connect it." },
    { signal: "FlightPlan", into: "Operator", at: "drones", until: "Ready" },
    { signal: "Start Sheep Guard Mission", into: "Operator", at: "drones", until: ["On Station", "Standing By"] }
  ],

  missions: [
    {
      id: "patrol", title: "Patrol", icon: "binoculars",
      story: "The swarm takes off. Is each concern of the mission looked after by someone?",
      steps: [
        { say: "The drones reach their stations.", check: [
          { watching: "Zone Surveillance", label: "The perimeter is patrolled", no: "No drone has Zone Surveillance at work." },
          { watching: "Flock Watching", label: "The flock is watched", no: "No drone on the field has Flock Watching at work." },
          { watching: "Sheep Tracking", label: "Someone can follow a stray", no: "No drone has Sheep Tracking." },
          { watching: "Predator Management", label: "Someone looks out for the bear", no: "No drone has Predator Management at work." }
        ] }
      ]
    },
    {
      id: "sheep", title: "Stray sheep", icon: "sheep",
      story: "A sheep walks out of the zone. One drone spots it, one follows it, and one keeps the field.",
      steps: [
        { say: "A sheep walks out of the zone.", signal: "Sheep Out Of Zone", into: "Pasture", check: [
          { following: 1, label: "One drone follows the sheep", none: "Nobody follows: no Flock Watching on the field to spot it, no Sheep Tracking to follow it, or nobody to open the job (is an intelligence plugged and linked?).", many: "Several drones left after the same sheep: nobody coordinates them." },
          { field: true, label: "A drone keeps the field", no: "No drone left on the field: the flock is alone." },
          { told: "Sheep Alert On Screen", label: "The operator is told", no: "The operator saw nothing: no Flock Watching to raise the alert, or no Mission Monitoring in the Base Station to pass it on." }
        ] },
        { say: "The sheep comes back.", signal: "Sheep Back In Zone", into: "Pasture", check: [
          { following: 0, label: "Everyone is back on station", many: "A drone is still out." }
        ] }
      ]
    },
    {
      id: "bear", title: "Bear", icon: "bell",
      story: "A bear comes close: tracked, scared away, and the flock is never left alone.",
      steps: [
        { say: "A bear enters the tracking perimeter.", signal: "Bear Inside Tracking Perimeter", into: "Pasture", check: [
          { tracking: 1, label: "One drone tracks the bear", none: "Nobody tracks: no Predator Management, or no answer to its request.", many: "Several drones went for the same bear." },
          { field: true, label: "A drone keeps the field", no: "No drone left on the field: the flock is alone." },
          { told: "Predator Alert On Screen", label: "The operator is told", no: "The operator saw nothing: no Mission Monitoring in the Base Station to pass the alert on." }
        ] },
        { say: "The bear gets too close.", signal: "Bear Inside Safe Perimeter", into: "Pasture", check: [
          { deterring: 1, label: "Light and sound: it is deterred", none: "Nobody deters the bear.", many: "Several drones deter the same bear." }
        ] },
        { say: "It backs off.", signal: "Bear Inside Tracking Perimeter", into: "Pasture", check: [
          { tracking: 1, label: "Back to tracking", none: "The bear is lost." }
        ] },
        { say: "It leaves.", signal: "Bear Outside Perimeter", into: "Pasture", check: [
          { tracking: 0, label: "Everyone is back on station", many: "A drone is still after it." }
        ] }
      ]
    },
    {
      id: "both", title: "Sheep and bear", icon: "alert",
      story: "The worst moment: a bear comes, and a sheep walks out while the bear is being tracked.",
      steps: [
        { say: "A bear enters the tracking perimeter.", signal: "Bear Inside Tracking Perimeter", into: "Pasture", check: [
          { tracking: 1, label: "One drone tracks the bear", none: "Nobody tracks the bear.", many: "Several drones went for the same bear." }
        ] },
        { say: "And a sheep walks out.", signal: "Sheep Out Of Zone", into: "Pasture", check: [
          { following: 1, label: "Another drone follows the sheep", none: "Nobody is free to follow the sheep.", many: "Several drones left after the same sheep." },
          { field: true, label: "One drone still keeps the field", no: "No drone left on the field: the flock is alone." }
        ] }
      ]
    },
    {
      id: "radio", title: "Base radio down", icon: "alert",
      story: "The base station loses its radio, then a sheep walks out. If the decisions are taken on the ground, nobody answers.",
      steps: [
        { say: "The base station goes silent.", radio: true },
        { say: "A sheep walks out of the zone.", signal: "Sheep Out Of Zone", into: "Pasture", check: [
          { following: 1, label: "A drone still follows the sheep", none: "Nobody follows: with the base silent, nobody opens the job. Was the master on the ground?", many: "Several drones left after the same sheep." },
          { field: true, label: "A drone keeps the field", no: "No drone left on the field: the flock is alone." }
        ] }
      ]
    },
    {
      id: "storm", title: "Storm", icon: "alert",
      story: "The wind rises: the whole swarm flies home.",
      steps: [
        { say: "A storm comes.", signal: "Wind Storm", into: "Weather", check: [
          { landed: 3, label: "All the drones are back at the base", none: "No drone came home: no Weather Monitoring to call them back, or no Charging Dock to land on.", many: "A drone is still out in the storm." }
        ] }
      ]
    }
  ],

  /* The check of chapter 3: the mission alone, played in the operational context, which runs by itself: the operator starts the
     system, sends the flight plan and starts the mission, the weather station reports the wind. What happens on the pasture comes
     from the bear and the flock, each with its own behaviour. The logical level has its own context, Swarm Simulation. */
  missionCheck: {
    context: "Operational Context",
    mission: "UAV",
    until: "Patrolling",
    patience: 120000,
    /* Just entered, Predator Monitoring needs a moment before it listens to the bear. */
    settle: 8000,
    steps: [
      { say: "A bear enters the tracking perimeter.", signal: "Bear Comes", into: "bear", want: ["Perimiter watch", "Sheep Monitoring", "Predator tracking"], no: "Tracking the bear stops the patrol and the sheep: it left Patrolling." },
      { say: "And a sheep walks out.", signal: "Sheep Wanders Off", into: "flock", want: ["Perimiter watch", "Stray sheep tracking", "Predator tracking"], no: "Nobody follows the sheep while the bear is tracked." }
    ]
  }
};
