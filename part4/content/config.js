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
  recallBase: "../part1/index.html",

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
    mission: "Guard the flock with several drones: while a drone follows a stray sheep or deals with the bear, another one keeps the field.",

    /* The plugin publishes one step for the whole simulation: the mission board feeds the panel, drone by drone. */
    dronesOnly: true,

    /* The kinds of drone. `match`: words that pick this role when Cameo names it in its own words.
       `steps`: the steps the preview lists for this role (the states of its state machine). */
    roles: {
      warden: {
        label: "Warden", tag: "WD", color: "#ad1167", match: ["warden", "complete", "full"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Patrolling", "Tracking stray sheep", "Predator tracking", "Predator counteraction", "Returning to base"]
      },
      guard: {
        label: "Sheep Guard", tag: "SG", color: "#16a34a", match: ["guard"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Patrolling", "Tracking stray sheep", "Returning to base"]
      },
      scout: {
        label: "Scout", tag: "SC", color: "#0284c7", match: ["scout"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Patrolling", "Returning to base"]
      },
      herder: {
        label: "Herder", tag: "HD", color: "#65a30d", match: ["herder"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Guarding flock", "Tracking stray sheep", "Returning to base"]
      },
      ranger: {
        label: "Ranger", tag: "RG", color: "#ea580c", match: ["ranger", "predator"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Hovering", "Predator tracking", "Predator counteraction", "Returning to base"]
      },
      bare: {
        label: "Bare drone", tag: "--", color: "#6b7280", match: ["bare"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Hovering", "Returning to base"]
      }
    },
    defaultRole: "warden",

    /* Step name -> what the drone does on screen. Only needed when the guess from the words of the step
       is wrong. Behaviours: off, ready, deploy, patrol, guard, track, counter, pursue, escort, return, crashed. */
    behaviours: {
      "Going to Safe Area": "deploy",
      "Hovering": "ready",
      "Tracking stray sheep": "escort"
    },

    /* The ticks of the Mission tab: [label, behaviours seen at least once]. */
    objectives: [
      ["Deploy the swarm", ["patrol", "guard"]],
      ["Follow a stray sheep while a drone keeps the field", ["escort-covered"]],
      ["Track the predator", ["track"]],
      ["Repel the predator", ["counter"]]
    ],

    /* The fleet of the preview, until Cameo publishes its own. master: "base", a drone id, or "".
       The options of the swarm (below) replace it when the student loads one. */
    demo: {
      master: "base",
      drones: [
        { id: "D1", role: "scout", name: "Scout" },
        { id: "D2", role: "herder", name: "Herder" },
        { id: "D3", role: "ranger", name: "Ranger" }
      ]
    },

    /* "Play the scenario": [pause in ms, drone id, step]. A sheep strays, the herder follows it while the
       scout keeps the field; then the bear comes and the ranger chases it away. */
    scenario: [
      [600, "D1", "Ready for Mission"], [150, "D2", "Ready for Mission"], [150, "D3", "Ready for Mission"],
      [900, "D1", "Going to Safe Area"], [250, "D2", "Going to Safe Area"], [250, "D3", "Going to Safe Area"],
      [3200, "D1", "Patrolling"], [200, "D2", "Guarding flock"], [200, "D3", "Hovering"],
      [2500, "D2", "Tracking stray sheep"],
      [5000, "D2", "Guarding flock"],
      [2000, "D3", "Predator tracking"],
      [4000, "D3", "Predator counteraction"],
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
        summary: "Three identical **Wardens**, each carrying all three components. The **base station** is the master: it decides which drone follows a sheep or the predator, the others keep the field.",
        pros: ["One kind of drone to design, build and maintain", "Any drone can replace any other", "The decision sits on the ground, where the computing power is"],
        cons: ["Each drone carries every sensor: heavy, expensive, short endurance", "Everything depends on the radio link with the base"],
        demo: { master: "base", drones: [{ id: "D1", role: "warden", name: "Drone 1" }, { id: "D2", role: "warden", name: "Drone 2" }, { id: "D3", role: "warden", name: "Drone 3" }] },
        scenario: [
          [600, "D1", "Ready for Mission"], [150, "D2", "Ready for Mission"], [150, "D3", "Ready for Mission"],
          [900, "D1", "Going to Safe Area"], [250, "D2", "Going to Safe Area"], [250, "D3", "Going to Safe Area"],
          [3200, "D1", "Patrolling"], [200, "D2", "Patrolling"], [200, "D3", "Patrolling"],
          [2500, "D1", "Tracking stray sheep"],
          [2200, "D3", "Predator tracking"],
          [3000, "D1", "Patrolling"],
          [1500, "D3", "Predator counteraction"],
          [4500, "D3", "Returning to base"]
        ]
      },
      {
        code: "B", name: "Base station leads 3 specialised drones",
        summary: "A **Scout** patrols the perimeter, a **Herder** stays over the flock and follows strays, a **Ranger** deals with the bear. The **base station** is the master.",
        pros: ["Each drone carries only what its job needs: lighter, longer flights", "Clear responsibilities: one state machine per role"],
        cons: ["Three designs to make or buy", "If the anti-predator drone is down, nobody repels the bear"],
        demo: { master: "base", drones: [{ id: "D1", role: "scout", name: "Scout" }, { id: "D2", role: "herder", name: "Herder" }, { id: "D3", role: "ranger", name: "Ranger" }] }
      },
      {
        code: "C", name: "A drone leads the others",
        summary: "The same drones, but the master flies: drop it in the **Scout**. The drones decide among themselves, the base station only launches and recalls them.",
        pros: ["The swarm keeps working when the link with the base is lost", "Decisions are taken close to the action, with less delay"],
        cons: ["The master drone needs more computing and more energy", "If the master falls, another one must take over: a new behaviour to design"],
        demo: { master: "D1", drones: [{ id: "D1", role: "scout", name: "Scout" }, { id: "D2", role: "herder", name: "Herder" }, { id: "D3", role: "ranger", name: "Ranger" }] }
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
