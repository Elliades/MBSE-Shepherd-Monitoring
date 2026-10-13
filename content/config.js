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
     Empty = the Cameo button cannot connect. Can be forced with ?relay=wss://host. */
  relayUrl: "ws://127.0.0.1:8787",

  /* Shown in the model-link sheet under the "Open in Cameo" button. */
  linkHelp: "Nothing happens? Copy the link and open it from Cameo.",

  /* Small toolbar buttons from the handout, usable inline in any text as ((name)). */
  icons: {
    transition: { src: "assets/img/btn-transition.png", alt: "Transition button" },
    run: { src: "assets/img/btn-run.png", alt: "Run button" },
    simulate: { src: "assets/img/btn-simulate.png", alt: "Simulation button" },
    "simulate-toolbar": { src: "assets/img/btn-simulate-toolbar.png", alt: "Simulation button in the toolbar" },
    play: { src: "assets/img/btn-play.png", alt: "Play button (green arrow)" },
    start: { src: "assets/img/btn-start-f8.png", alt: "Start (F8) button" },
    package: { src: "assets/img/ico-package.png", alt: "package icon" },
    "item-flow": { src: "assets/img/ico-item-flow.png", alt: "Item flow arrow" }
  }
};
