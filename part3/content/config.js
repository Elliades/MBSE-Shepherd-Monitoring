/* Course-level settings of Part 3 (a fleet of drones). Edit freely: nothing here needs a build step.
   This guide lives in part3/ and shares js/, css/ and assets/ of the root folder with Part 1.
   Its simulation panel is the fleet one (js/sim-fleet*.js, settings in `fleet` below); Part 1 and
   Part 2 keep the one-drone panel and are not affected by anything here. */
window.COURSE_CONFIG = {
  appName: "MBSE Shepherd · Part 3",
  course: "Domaine Systèmes Autonomes · DSAT301 Systèmes Embarqués",
  part: "BE Cameo · Part 3 · A fleet of drones",
  authors: ["Quentin Cespèdes", "Janette Cardoso", "Mayssa Chebbi", "Mourad Chibane"],

  /* Author mode shows every placeholder with its to-do list, the "link not set"
     tags and the Authoring to-do board. Set to false before sharing with students
     (it can also be forced with ?author=1 or ?author=0 in the URL). */
  authorMode: true,

  /* Progress, ticks and answers are kept in the browser under this key.
     It must differ from the keys of Part 1 and Part 2: the guides are served from the same site. */
  storageKey: "mbse-shepherd:part3:v1",

  /* Where the shared assets/ folder is, seen from this page (the simulation uses it). */
  sharedBase: "../",

  /* Where the Part 1 guide is, seen from this page. "Forgot how?" boxes link to its scenes. */
  recallBase: "../index.html",

  /* true: the panel lets you move each drone by hand and play the scenario below (Cameo is not told).
     false (a marked guide): the panel only follows Cameo, and shows no step list. */
  simPreview: true,

  /* Timing of the session (js/track.js, monitor/ of the site). */
  trackPart: "part3",
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
    title: "Pasture fleet",
    mission: "Protect the flock with several drones: some keep the field while another one follows the predator away.",

    /* The kinds of drone. `match`: words that pick this role when Cameo names it in its own words.
       `steps`: the steps the preview lists for this role (the states of its state machine). */
    roles: {
      shepherd: {
        label: "Drone shepherd", tag: "SH", color: "#0284c7", match: ["shepherd", "sentinel"],
        steps: ["Off", "Unconfigured", "Configured", "Ready for Mission", "Going to Safe Area", "Patrolling", "Predator tracking", "Predator counteraction", "Crashed"]
      },
      guard: {
        label: "Sheep guard", tag: "SG", color: "#16a34a", match: ["guard", "sheep"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Guarding flock", "Returning to base", "Crashed"]
      },
      antiPredator: {
        label: "Anti-predator", tag: "AP", color: "#ea580c", match: ["predator", "anti", "hunter"],
        steps: ["Off", "Ready for Mission", "Going to Safe Area", "Patrolling", "Predator tracking", "Predator counteraction", "Following predator", "Returning to base", "Crashed"]
      }
    },
    defaultRole: "shepherd",

    /* Step name -> what the drone does on screen. Only needed when the guess from the words of the step
       is wrong. Behaviours: off, ready, deploy, patrol, guard, track, counter, pursue, return, crashed. */
    behaviours: {
      "Going to Safe Area": "deploy",
      "Following predator": "pursue"
    },

    /* The fleet of the preview, until Cameo publishes its own. master: "base", a drone id, or "". */
    demo: {
      master: "base",
      drones: [
        { id: "D1", role: "shepherd", name: "Shepherd" },
        { id: "D2", role: "guard", name: "Guard" },
        { id: "D3", role: "antiPredator", name: "Hunter" }
      ]
    },

    /* "Play the scenario": [pause in ms, drone id, step]. It shows the use case of Part 3: a drone follows
       the predator out of the field as long as another drone stays on the field. */
    scenario: [
      [600, "D1", "Ready for Mission"], [150, "D2", "Ready for Mission"], [150, "D3", "Ready for Mission"],
      [900, "D1", "Going to Safe Area"], [250, "D2", "Going to Safe Area"], [250, "D3", "Going to Safe Area"],
      [3200, "D1", "Patrolling"], [200, "D2", "Guarding flock"], [200, "D3", "Patrolling"],
      [3500, "D3", "Predator tracking"],
      [5000, "D3", "Predator counteraction"],
      [3500, "D3", "Following predator"],
      [4500, "D1", "Returning to base"],
      [4500, "D2", "Returning to base"],
      [2500, "D3", "Returning to base"]
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
