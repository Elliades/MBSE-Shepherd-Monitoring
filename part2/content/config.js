/* Course-level settings of Part 2 (the marked seminar). Edit freely: nothing here needs a build step.
   This guide lives in part2/ and shares js/, css/ and assets/ of the root folder with Part 1. */
window.COURSE_CONFIG = {
  appName: "MBSE Shepherd · Part 2",
  course: "Domaine Systèmes Autonomes · DSAT301 Systèmes Embarqués",
  part: "BE Cameo · Part 2 · Marked seminar",
  authors: ["Quentin Cespèdes", "Janette Cardoso", "Mayssa Chebbi", "Mourad Chibane"],

  /* Author mode shows every placeholder with its to-do list, the "link not set"
     tags and the Authoring to-do board. Set to false before sharing with students
     (it can also be forced with ?author=1 or ?author=0 in the URL). */
  authorMode: true,

  /* Progress, ticks and answers are kept in the browser under this key.
     It must differ from the key of Part 1: both guides are served from the same site. */
  storageKey: "mbse-shepherd:part2:v1",

  /* Where the shared assets/ folder is, seen from this page (the drone simulation uses it). */
  sharedBase: "../",

  /* Where the Part 1 guide is, seen from this page. "Forgot how?" boxes link to its scenes. */
  recallBase: "../part1/index.html",

  /* The marked seminar must not show the expected signals: the simulation panel only follows Cameo. */
  simPreview: false,

  /* Question 7: the scenario that "Play the scenario in Cameo" (js/widgets-stm-check.js) plays on the state machine
     of the drone, simulated alone. Signal names are those of the student model (three are spelled "perimiter").
     expect = active after the step, entered = went through during the step, absent = must have left. */
  stmScenario: {
    context: "SOI - Pasture Sentinel",
    path: "<root>",
    states: ["Undeployed", "Off", "Unconfigured", "Configured", "Ready for Mission", "Deployed", "Going to Safe Area",
      "Patrolling", "Perimiter watch", "Sheep Monitoring", "Predator Monitoring", "Mission Monitoring",
      "Predator Detected", "Predator tracking", "Predator counteraction", "Crashed"],
    steps: [
      { signal: "Start SOI", note: "The operator powers the drone on.", expect: ["Undeployed", "Unconfigured"], absent: ["Off"] },
      { signal: "FlightPlan Incorrect", note: "A wrong flight plan is checked and refused.", entered: ["Configured"], expect: ["Unconfigured"], absent: ["Ready for Mission"] },
      { signal: "FlightPlan Correct", note: "A correct flight plan is checked and accepted.", entered: ["Configured"], expect: ["Ready for Mission"], absent: ["Unconfigured"] },
      { signal: "Start Sheep Guard Mission", note: "The mission starts: the drone goes to the safe area, then patrols.", entered: ["Deployed", "Going to Safe Area"], expect: ["Patrolling", "Perimiter watch", "Sheep Monitoring", "Predator Monitoring", "Mission Monitoring"] },
      { signal: "Predator Detected inside tracking perimeter", note: "A bear enters the tracking perimeter.", entered: ["Predator Detected", "Predator tracking"], expect: ["Predator Detected"], absent: ["Patrolling"] },
      { signal: "Predator entering safe perimiter", note: "The bear comes close to the flock: counter actions.", expect: ["Predator counteraction"] },
      { signal: "Predator leaving safe perimiter", note: "The bear moves back: tracking again.", entered: ["Predator tracking"], expect: ["Predator Detected"] },
      { signal: "Predator leaving tracking perimiter", note: "The bear leaves: back to patrolling.", expect: ["Patrolling", "Predator Monitoring"], absent: ["Predator Detected"] },
      { signal: "Crashed Detected", note: "The drone crashes.", expect: ["Crashed"], absent: ["Deployed"] }
    ]
  },

  /* Timing of the session (js/track.js, monitor/ of the site): which guide, and its version. Change
     tpVersion when the exercise changes, so the stats of the new content are kept apart. */
  trackPart: "part2",
  tpVersion: "2026.11",

  /* Where the timing goes: "auto" = the relay of this site (<site>/relay); empty = nothing is sent. */
  trackUrl: "auto",

  /* Address of the relay that links this guide to the Cameo of the student (wss://host).
     "auto" = the relay served next to the guide (wss://<this site>/relay), then the relay inside Cameo
     (ws://127.0.0.1:8787) for a code the online one does not know; on this computer, ws://127.0.0.1:8787.
     Same relay, same pairing code as Part 1. */
  relayUrl: "auto",

  /* How the guide reaches the relay: "auto" = WebSocket, and plain HTTP requests (js/relay-http.js) when a
     proxy blocks WebSocket frames; "ws" or "http" to force one. Can be forced with ?transport=http. */
  relayTransport: "auto",

  /* Shown in the model-link sheet under the "Open in Cameo" button. */
  linkHelp: "Nothing happens? Copy the link and open it from Cameo.",

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
