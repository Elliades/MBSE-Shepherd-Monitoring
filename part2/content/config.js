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
  recallBase: "../index.html",

  /* The marked seminar must not show the expected signals: the simulation panel only follows Cameo. */
  simPreview: false,

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
