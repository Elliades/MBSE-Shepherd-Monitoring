/* Course-level settings of Part 4 (the swarm). Edit freely: nothing here needs a build step.
   This guide lives in part4/ and shares js/, css/ and assets/ of the root folder with Part 1.
   Its simulation panel is the fleet one (js/sim-fleet*.js, settings in `fleet` below); Part 1 and
   Part 2 keep the one-drone panel and are not affected by anything here. The options of the swarm
   (`swarm` below) are drawn by js/widgets-logical.js and can be loaded in that panel. */
window.COURSE_CONFIG = {
  appName: "MBSE Shepherd · Part 4",
  course: "Domaine Systèmes Autonomes · DSAT301 Systèmes Embarqués",
  part: "BE Cameo · Part 4 · The swarm",
  authors: ["Quentin Cespèdes", "Janette Cardoso", "Mayssa Chebbi", "Mourad Chibane"],

  /* Author mode shows every placeholder with its to-do list, the "link not set"
     tags and the Authoring to-do board. Set to false before sharing with students
     (it can also be forced with ?author=1 or ?author=0 in the URL). */
  authorMode: true,

  /* Progress, ticks and answers are kept in the browser under this key.
     It must differ from the keys of the other parts: the guides are served from the same site. */
  storageKey: "mbse-shepherd:part4:v1",

  /* Where the shared assets/ folder is, seen from this page (the simulation uses it). */
  sharedBase: "../",

  /* Where the Part 1 guide is, seen from this page. "Forgot how?" boxes link to its scenes. */
  recallBase: "../index.html",

  /* true: the panel lets you move each drone by hand and play the scenario below (Cameo is not told).
     false (a marked guide): the panel only follows Cameo, and shows no step list. */
  simPreview: true,

  /* Timing of the session (js/track.js, monitor/ of the site). */
  trackPart: "part4",
  tpVersion: "2026.10",
  trackUrl: "auto",

  /* Same relay, same pairing code as Part 1 (see content/config.js there). */
  relayUrl: "auto",
  relayTransport: "auto",

  linkHelp: "Nothing happens? Copy the link and open it from Cameo.",

  /* The fleet simulation (js/sim-fleet-core.js).
     Cameo publishes, at each change: {"type":"info","event":"state","status","step",
       "drones":[{"id":"D1","step":"Patrolling","role":"shepherd","name":"Shepherd 1"}, ...],
       "master":"base" | "<id of the lead drone>"}
     A state without "drones" (the one-drone model of Part 1 and 2) shows one drone of defaultRole. */
  fleet: {
    title: "Pasture swarm",
    mission: "Guard the flock with several drones: a drone may follow a stray sheep or the predator out of the field, as long as another drone keeps the field.",

    /* The kinds of drone. `match`: words that pick this role when Cameo names it in its own words.
       `steps`: the steps the preview lists for this role (the states of its state machine). */
    roles: {
      complete: {
        label: "Complete drone", tag: "CD", color: "#7c3aed", match: ["complete", "warden", "full"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Patrolling", "Guarding flock", "Tracking stray sheep", "Predator tracking", "Predator counteraction", "Following predator", "Returning to base", "Crashed"]
      },
      shepherd: {
        label: "Drone shepherd", tag: "SH", color: "#0284c7", match: ["shepherd", "sentinel", "scout"],
        steps: ["Off", "Unconfigured", "Configured", "Ready for Mission", "Going to Safe Area", "Patrolling", "Returning to base", "Crashed"]
      },
      guard: {
        label: "Sheep guard", tag: "SG", color: "#16a34a", match: ["guard", "herder"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Guarding flock", "Tracking stray sheep", "Returning to base", "Crashed"]
      },
      antiPredator: {
        label: "Anti-predator", tag: "AP", color: "#ea580c", match: ["predator", "anti", "hunter", "ranger"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Patrolling", "Predator tracking", "Predator counteraction", "Following predator", "Returning to base", "Crashed"]
      }
    },
    defaultRole: "complete",

    /* Step name -> what the drone does on screen. Only needed when the guess from the words of the step
       is wrong. Behaviours: off, ready, deploy, patrol, guard, track, counter, pursue, escort, return, crashed. */
    behaviours: {
      "Going to Safe Area": "deploy",
      "Following predator": "pursue",
      "Tracking stray sheep": "escort"
    },

    /* The ticks of the Mission tab: [label, behaviours seen at least once]. */
    objectives: [
      ["Deploy the swarm", ["patrol", "guard"]],
      ["Follow a stray sheep while a drone keeps the field", ["escort-covered"]],
      ["Track the predator", ["track"]],
      ["Repel the predator", ["counter"]],
      ["Follow the predator out while a drone keeps the field", ["pursue-covered"]]
    ],

    /* The fleet of the preview, until Cameo publishes its own. master: "base", a drone id, or "".
       The options of the swarm (below) replace it when the student loads one. */
    demo: {
      master: "base",
      drones: [
        { id: "D1", role: "shepherd", name: "Shepherd" },
        { id: "D2", role: "guard", name: "Guard" },
        { id: "D3", role: "antiPredator", name: "Hunter" }
      ]
    },

    /* "Play the scenario": [pause in ms, drone id, step]. A sheep strays, the guard follows it while the
       shepherd keeps the field; then the bear comes and the hunter chases it away. */
    scenario: [
      [600, "D1", "Ready for Mission"], [150, "D2", "Ready for Mission"], [150, "D3", "Ready for Mission"],
      [900, "D1", "Going to Safe Area"], [250, "D2", "Going to Safe Area"], [250, "D3", "Going to Safe Area"],
      [3200, "D1", "Patrolling"], [200, "D2", "Guarding flock"], [200, "D3", "Patrolling"],
      [2500, "D2", "Tracking stray sheep"],
      [5000, "D2", "Guarding flock"],
      [2000, "D3", "Predator tracking"],
      [4000, "D3", "Predator counteraction"],
      [3500, "D3", "Following predator"],
      [4500, "D3", "Returning to base"],
      [2500, "D1", "Returning to base"], [300, "D2", "Returning to base"]
    ]
  },

  /* The options of the swarm (js/widgets-logical.js, swarmOptions). Each one: what it is, for and against,
     and the fleet + scenario it loads in the simulation panel (same format as fleet.demo and fleet.scenario). */
  swarm: {
    options: [
      {
        code: "A", name: "Base station leads 3 complete drones",
        summary: "Three identical drones, each able to do everything. The **base station** is the master: it decides which drone follows a sheep or the predator, the others keep the field.",
        pros: ["One kind of drone to design, build and maintain", "Any drone can replace any other", "The decision sits on the ground, where the computing power is"],
        cons: ["Each drone carries every sensor: heavy, expensive, short endurance", "Everything depends on the radio link with the base"],
        demo: { master: "base", drones: [{ id: "D1", role: "complete", name: "Drone 1" }, { id: "D2", role: "complete", name: "Drone 2" }, { id: "D3", role: "complete", name: "Drone 3" }] },
        scenario: [
          [600, "D1", "Ready for Mission"], [150, "D2", "Ready for Mission"], [150, "D3", "Ready for Mission"],
          [900, "D1", "Going to Safe Area"], [250, "D2", "Going to Safe Area"], [250, "D3", "Going to Safe Area"],
          [3200, "D1", "Patrolling"], [200, "D2", "Guarding flock"], [200, "D3", "Patrolling"],
          [2500, "D1", "Tracking stray sheep"],
          [2200, "D3", "Predator tracking"],
          [3000, "D1", "Patrolling"],
          [1500, "D3", "Predator counteraction"],
          [3500, "D3", "Following predator"],
          [4500, "D3", "Returning to base"]
        ]
      },
      {
        code: "B", name: "Base station leads 3 specialised drones",
        summary: "A **drone shepherd** patrols, a **sheep guard** stays over the flock and follows strays, an **anti-predator** drone deals with the bear. The **base station** is the master.",
        pros: ["Each drone carries only what its job needs: lighter, longer flights", "Clear responsibilities: one state machine per role"],
        cons: ["Three designs to make or buy", "If the anti-predator drone is down, nobody repels the bear"],
        demo: { master: "base", drones: [{ id: "D1", role: "shepherd", name: "Shepherd" }, { id: "D2", role: "guard", name: "Guard" }, { id: "D3", role: "antiPredator", name: "Hunter" }] }
      },
      {
        code: "C", name: "A drone leads specialised drones",
        summary: "The same specialised drones, but the **drone shepherd** is the master of the swarm: the drones decide among themselves, the base station only follows.",
        pros: ["The swarm keeps working when the link with the base is lost", "Decisions are taken close to the action, with less delay"],
        cons: ["The master drone needs more computing and more energy", "If the master falls, another one must take over: a new behaviour to design"],
        demo: { master: "D1", drones: [{ id: "D1", role: "shepherd", name: "Shepherd" }, { id: "D2", role: "guard", name: "Guard" }, { id: "D3", role: "antiPredator", name: "Hunter" }] }
      }
    ]
  },

  /* Small toolbar buttons, usable inline in any text as ((name)). */
  icons: {
    transition: {
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19 L19 5"/><path d="M9 5 H19 V15"/></svg>',
      alt: "Transition button"
    },
    run: { src: "../assets/img/btn-run.png", alt: "Run button" },
    simulate: { src: "../assets/img/btn-simulate.png", alt: "Simulation button" },
    play: { src: "../assets/img/btn-play.png", alt: "Play button (green arrow)" },
    package: { src: "../assets/img/ico-package.png", alt: "package icon" },
    "item-flow": { src: "../assets/img/ico-item-flow.png", alt: "Item flow arrow" }
  }
};
