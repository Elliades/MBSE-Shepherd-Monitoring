/* Course-level settings. Edit freely: nothing here needs a build step. */
window.COURSE_CONFIG = {
  appName: "MBSE Shepherd",
  course: "Domaine Systèmes Autonomes · DSAT301 Systèmes Embarqués",
  part: "BE Cameo · Part 1 · Discover",
  authors: ["Quentin Cespèdes", "Janette Cardoso", "Mayssa Chebi", "Mourad Chibane"],

  /* Author mode shows every placeholder with its to-do list, the "link not set"
     tags and the Authoring to-do board. Set to false before sharing with students
     (it can also be forced with ?author=1 or ?author=0 in the URL). */
  authorMode: true,

  /* Progress, ticks and answers are kept in the browser under this key.
     Change the suffix to reset everybody after a major content change. */
  storageKey: "mbse-shepherd:part1:v1",

  /* Address of the relay that links this guide to the Cameo of the student (wss://host).
     "auto" = the relay served next to the guide (wss://<this site>/relay), or ws://127.0.0.1:8787 when
     the guide runs on this computer. Empty = the Cameo button cannot connect.
     Can be forced with ?relay=wss://host. Cameo must be set to the same relay. */
  relayUrl: "auto",

  /* Shown in the model-link sheet under the "Open in Cameo" button. */
  linkHelp: "Nothing happens? Copy the link and open it from Cameo.",

  /* Small toolbar buttons from the handout, usable inline in any text as ((name)). */
  icons: {
    transition: {
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19 L19 5"/><path d="M9 5 H19 V15"/></svg>',
      alt: "Transition button"
    },
    run: { src: "assets/img/btn-run.png", alt: "Run button" },
    simulate: { src: "assets/img/btn-simulate.png", alt: "Simulation button" },
    "simulate-toolbar": { src: "assets/img/btn-simulate-toolbar.png", alt: "Simulation button in the toolbar" },
    play: { src: "assets/img/btn-play.png", alt: "Play button (green arrow)" },
    start: { src: "assets/img/btn-start-f8.png", alt: "Start (F8) button" },
    package: { src: "assets/img/ico-package.png", alt: "package icon" },
    "item-flow": { src: "assets/img/ico-item-flow.png", alt: "Item flow arrow" }
  }
};
