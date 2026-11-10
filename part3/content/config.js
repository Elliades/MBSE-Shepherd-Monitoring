/* Course-level settings of Part 3 (the logical architecture). Edit freely: nothing here needs a build step.
   This guide lives in part3/ and shares js/, css/ and assets/ of the root folder with Part 1.
   It keeps the one-drone simulation panel of Part 1 and 2 (js/sim*.js, not changed for it) and adds the
   widgets of js/widgets-logical.js. The three architectures themselves (state machines, ports, connectors,
   scenarios) are in part3/content/archs.js, written by scripts/make-part3-archs.py from the correction specs;
   `archs` below only says how to draw and explain them. */
window.COURSE_CONFIG = {
  appName: "MBSE Shepherd · Part 3",
  course: "Domaine Systèmes Autonomes · DSAT301 Systèmes Embarqués",
  part: "BE Cameo · Part 3 · Logical architecture",
  authors: ["Quentin Cespèdes", "Janette Cardoso", "Mayssa Chebbi", "Mourad Chibane"],

  /* Author mode shows every placeholder with its to-do list, the "link not set"
     tags and the Authoring to-do board. Set to false before sharing with students
     (it can also be forced with ?author=1 or ?author=0 in the URL). */
  authorMode: true,

  /* Progress, ticks and answers are kept in the browser under this key.
     It must differ from the keys of the other parts: the guides are served from the same site. */
  storageKey: "mbse-shepherd:part3:v3",

  /* Where the shared assets/ folder is, seen from this page (the simulation uses it). */
  sharedBase: "../",

  /* Where the Part 1 guide is, seen from this page. "Forgot how?" boxes link to its scenes. */
  recallBase: "../index.html",

  /* Not a marked guide: the panels have their preview buttons. */
  simPreview: true,

  /* Timing of the session (js/track.js, monitor/ of the site). */
  trackPart: "part3",
  tpVersion: "2026.10b",
  trackUrl: "auto",

  /* Same relay, same pairing code as Part 1 (see content/config.js there). */
  relayUrl: "auto",
  relayTransport: "auto",

  linkHelp: "Nothing happens? Copy the link and open it from Cameo.",

  /* How the guide draws and explains the three architectures (js/widgets-logical.js).
       parts:   per part name, its label and colour (the colours of the handout figures: grey = technical,
                blue = patrol, green = sheep, orange = predator, violet = tracking). tech: dashed border.
       ports:   the side of the SOI frame where each boundary port is drawn (L, R, T, B).
       "1".."3": name, who decides, for / against, score on `axes` (0..5, the star diagram of the trade-off),
                layout = centre of each part in a 800 x 420 drawing (frame 100..700 x 20..400),
                mapping = which part receives each state of the functional mission (stateMapping),
                spot = where the logic is (logicSpot: parts and links lit, a note),
                highlight = signals the animation slows down and keeps drawn (the patch of architecture 2). */
  archs: {
    order: ["1", "2", "3"],
    parts: {
      mi: { label: "Manual Initialization", color: "#a3abb2", tech: true },
      mc: { label: "Mission Configuration", color: "#b9c0c6", tech: true },
      bsrc: { label: "Base station link", color: "#7f8890", tech: true },
      ap: { label: "AutoPilot", color: "#8d959c", tech: true },
      orch: { label: "Mission Orchestrator", color: "#d6337f" },
      zs: { label: "Zone Surveillance", color: "#2f7de1" },
      zp: { label: "Zone Patrolling", color: "#2f7de1" },
      sg: { label: "Sheep Guard", color: "#16a34a" },
      sm: { label: "SheepMonitoring", color: "#16a34a" },
      pd: { label: "Predator Defense", color: "#ea580c" },
      pm: { label: "Predator Management", color: "#ea580c" },
      trk: { label: "Tracking", color: "#9333ea" }
    },
    ports: { power: "L", op_link: "L", camera: "R", strong_light: "R", loud_sound: "R" },
    axes: ["Rules in one place", "Cheap to change", "Room for new features", "Few messages", "No single point of failure", "Simple components"],

    "1": {
      name: "Mission orchestrator, autonomous features", short: "Feature orchestrator",
      decides: "The orchestrator only chooses **which feature is active**. The active feature decides the rest and drives the AutoPilot itself. On a bear, Predator Defense **asks for control**, then decides tracking and deterrence alone.",
      spot: { parts: ["orch", "sg", "pd"], links: [["orch", "sg"], ["orch", "pd"], ["sg", "ap"], ["pd", "ap"]], note: "The **orchestrator** hands control from one feature to the other; **Sheep Guard** and **Predator Defense** decide inside, and each drives the **AutoPilot**." },
      pros: ["Adding a feature means adding a mode to the orchestrator, without touching the other features", "During the bear response the orchestrator does not move: the feature switches between tracking and deterring on its own"],
      cons: ["Each feature carries a lot of logic", "Two features must agree on who drives the AutoPilot"],
      score: [3, 4, 5, 4, 3, 2],
      layout: { bsrc: [210, 75], mc: [210, 200], mi: [210, 330], orch: [355, 200], ap: [355, 340], sg: [565, 125], zs: [565, 230], pd: [565, 335] },
      mapping: {
        Undeployed: "mc", Off: "mc", Unconfigured: "mc", Configured: "mc", "Ready for Mission": "mc", "Going to Safe Area": "ap",
        "Perimiter watch": "sg", "Sheep Monitoring": "sg", "Predator Monitoring": "pd", "Predator Detected": "pd", "Predator tracking": "pd", "Predator counteraction": "pd"
      },
      mappingNote: "Sheep Guard receives **Perimiter watch** and **Sheep Monitoring** side by side: group them into one state with two regions. Predator Defense receives **Predator Monitoring** and the whole **Predator Detected**. The Mission Orchestrator and Zone Surveillance have no source state: you build them by hand."
    },
    "2": {
      name: "Decentralised patch", short: "Patch",
      decides: "We start from an **existing** drone that patrols and watches the sheep, and **add** the predator feature without breaking or reworking what works: the cheapest change. The patch is one added exchange: on a bear, Predator Management sends **Deactivate Sheep Monitoring** to SheepMonitoring (and Reactivate when it is gone), and drives the AutoPilot itself.",
      highlight: ["Deactivate Sheep Monitoring", "Reactivate Sheep Monitoring"],
      spot: { parts: ["pm"], also: ["sm", "ap"], links: [["pm", "sm"], ["pm", "ap"]], hot: [["pm", "sm"]], note: "The only new logic is in **Predator Management**: it pauses **SheepMonitoring** (the red link) and takes the **AutoPilot**. Everything else was there before." },
      pros: ["The cheapest to change: one signal and two transitions more", "The closest to the functional mission: most states go over as they are", "The fewest messages in the scenario"],
      cons: ["The mission rules are scattered: who may cut the sheep guard is read in Predator Management, not in one place", "Every new conflict will call for a new patch"],
      score: [1, 5, 2, 5, 4, 3],
      layout: { bsrc: [210, 75], mc: [210, 200], mi: [210, 330], ap: [355, 300], sm: [505, 110], pm: [505, 320], zs: [636, 215] },
      mapping: {
        Undeployed: "mc", Off: "mc", Unconfigured: "mc", Configured: "mc", "Ready for Mission": "mc", "Going to Safe Area": "ap",
        "Perimiter watch": "zs", "Sheep Monitoring": "sm", "Predator Monitoring": "pm", "Predator Detected": "pm", "Predator tracking": "pm", "Predator counteraction": "pm",
        "Mission Monitoring": "mc"
      },
      mappingNote: "Close to the functional mission: most states go over as they are, and Predator Management takes **Predator Detected** whole. **Mission Monitoring** goes to Mission Configuration, where it becomes **Deployed**. There is no orchestrator."
    },
    "3": {
      name: "Centralised orchestrator", short: "Central orchestrator",
      decides: "A **star**: the orchestrator receives every observation and every request, and dispatches every command, by priority: predator first, then sheep and patrol. The other components decide nothing; Predator Management only sends requests.",
      spot: { parts: ["orch"], links: [["orch", "zp"], ["orch", "sm"], ["orch", "pm"], ["orch", "trk"], ["orch", "ap"], ["orch", "mc"], ["orch", "bsrc"]], note: "Every decision is in the **orchestrator**: every arrow goes through it." },
      pros: ["All the rules and priorities can be read in one place", "Simple, interchangeable components"],
      cons: ["The most messages in the scenario", "A bottleneck and a single point of failure: every new sensor or job goes through it"],
      score: [5, 3, 3, 2, 1, 5],
      layout: { bsrc: [210, 75], mc: [210, 200], mi: [210, 330], orch: [355, 200], ap: [355, 340], zp: [565, 62], sm: [565, 152], pm: [565, 242], trk: [565, 332] },
      mapping: {
        Undeployed: "mc", Off: "mc", Unconfigured: "mc", Configured: "mc", "Ready for Mission": "mc", "Going to Safe Area": "ap",
        "Perimiter watch": "zp", "Sheep Monitoring": "sm", "Predator Monitoring": "pm", "Predator counteraction": "pm", "Predator tracking": "trk"
      },
      mappingNote: "**Predator tracking** and **Predator counteraction** go to two different blocks: their transitions to each other become requests to the orchestrator. The composites **Patrolling** and **Predator Detected** are not transitioned: their decisions go to the Mission Orchestrator, which you build by hand."
    },

    /* The package 3 - Logical Analysis, node by node (logicalTree). */
    tree: [
      { d: 0, name: "3 - Logical Analysis", kind: "package", text: "The logical level, next to `2 - Functional Analysis`. One package per architecture. Nothing in it ever changes the functional mission." },
      { d: 1, name: "3 - Centralized orchestrator", kind: "package", text: "Everything of one architecture: its SOI, its simulation context, its components. Your starting model has the one you work on." },
      { d: 2, name: "Logical SOI 3 - Centralized orchestrator", kind: "block", text: "The drone at the logical level, a block **«Logical Component»**. Its internal block diagram holds the parts (Mission Configuration, the orchestrator…), their ports and the connectors." },
      { d: 3, name: "Logical SOI … (internal block diagram)", kind: "ibd", text: "Where you create the parts of your features, their ports and connectors. **Show STM Overview in Parts** shows the state machine of each part in it." },
      { d: 2, name: "Logical SOI … Simulation", kind: "block", text: "The simulation context, **«Logical Context»**: the parts `soi`, `operator` and `pasture`. The scenarios are run from here." },
      { d: 2, name: "Mission Configuration", kind: "block", text: "A logical component: a block **«Logical Component»** with its state machine and its proxy ports." },
      { d: 3, name: "Mission Configuration (state machine)", kind: "stm", text: "Cloned by **Logical Transition** from the functional mission, then reworked by hand. Its states take the stereotype **«Logical Mode»**." },
      { d: 3, name: "IF_Mission Configuration_bsrc", kind: "iface", text: "One InterfaceBlock per port, with a FlowProperty per signal: `out` = sent, `in` = accepted. The port in front gets it conjugated: `~IF_…`." },
      { d: 2, name: "Logical Functions", kind: "activity", text: "The activities cloned with the states, each with a **«refine»** to its functional original, and the effects **Delegate to external systems** adds." },
      { d: 2, name: "Signals", kind: "signal", text: "The functional signals are reused. New exchanges between components (Go To Safe Area, the requests…) are new signals." }
    ],

    /* The build, one scenario event at a time (archSim with opts.stage, and its "Validate in Cameo" button).
         steps: the scenario steps measured at this stage (indexes over the steps of archs.js);
         setup: the steps played before, as preconditions (not measured);
         add:   per architecture, the parts built at this stage. The technical parts are always there. */
    stages: {
      tech: ["mi", "mc", "bsrc", "ap"],
      list: [
        { id: "prep", title: "Preparation", event: "Power on, a wrong flight plan, a good one", steps: [0, 1, 2], setup: [] },
        { id: "launch", title: "Arrive and patrol", event: "Mission start: the drone flies to the field and patrols", steps: [3], setup: [0, 2], add: { "1": ["orch", "sg"], "2": ["zs"], "3": ["orch", "zp"] } },
        { id: "sheep", title: "A sheep strays", event: "The flock is seen, then a sheep leaves the zone", steps: [4, 5], setup: [0, 2, 3], add: { "1": ["zs"], "2": ["sm"], "3": ["sm"] } },
        { id: "bear", title: "A bear: track it, then patrol again", event: "A bear enters the tracking zone, the drone follows it; it leaves, the drone patrols again", steps: [6, 9], setup: [0, 2, 3], add: { "1": ["pd"], "2": ["pm"], "3": ["pm", "trk"] } },
        { id: "deter", title: "Scare it off", event: "The bear comes too close, then backs off", steps: [6, 7, 8, 9], setup: [0, 2, 3] },
        { id: "full", title: "The whole scenario", event: "Preparation, patrol, sheep, bear, back to patrol", steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], setup: [] }
      ]
    },

    /* Scenario steps the overview animation leaves out: the refused plan is for Mission Configuration. */
    leaveOut: ["FlightPlan Incorrect"],

    /* What happens in the pasture at each scenario step, said big over the animation (by injected signal). */
    story: {
      "Start SOI": { icon: "⏻", text: "Power on" },
      "FlightPlan": { icon: "📋", text: "The flight plan is loaded" },
      "FlightPlan Correct": { icon: "📋", text: "A good flight plan" },
      "FlightPlan Incorrect": { icon: "📋", text: "A wrong flight plan" },
      "Start Sheep Guard Mission": { icon: "🛫", text: "Mission start: off to the field" },
      "Sheep Signature": { icon: "🐑", text: "The flock is in sight" },
      "Sheep Out Of Zone": { icon: "🐑", text: "A sheep strays out of the zone" },
      "Predator Detected inside tracking perimeter": { icon: "🐻", text: "A bear enters the tracking zone" },
      "Predator entering safe perimiter": { icon: "🐻", text: "The bear comes too close to the flock" },
      "Predator leaving safe perimiter": { icon: "🐻", text: "The bear backs off" },
      "Predator leaving tracking perimiter": { icon: "✅", text: "The bear is gone: back to patrol" }
    },

    /* Messages worth reading: a label that pops over the part that receives them, then fades. Every other
       message only travels (they are many, and that is the point). to: only when that part receives it
       (a relayed signal pops once, where it ends). */
    badges: {
      "Ready for mission": { icon: "📣", text: "Ready", to: "operator" },
      "FlightPlan Check Failed": { icon: "📣", text: "Plan refused", to: "operator" },
      "Go To Safe Area": { icon: "🛫", text: "To the safe area", to: "ap" },
      "next pathing": { icon: "🧭", text: "Watch path", to: "ap" },
      "Activate Sheep Guard": { icon: "▶", text: "Guard on" },
      "Start Patrolling": { icon: "▶", text: "Patrol" },
      "Patrolling": { icon: "▶", text: "Patrolling" },
      "Sheep Exit Alert": { icon: "📣", text: "A sheep is out!", to: "operator" },
      "Takeover Request": { icon: "✋", text: "Asks for control" },
      "Predator Tracking Request": { icon: "✋", text: "Asks to track" },
      "Predator Engage Request": { icon: "✋", text: "Asks to engage" },
      "Predator Disengage Request": { icon: "✋", text: "Asks to stop" },
      "Predator Tracking Release": { icon: "✋", text: "Bear gone" },
      "Activate Predator Defense": { icon: "▶", text: "You have control" },
      "Engage Predator": { icon: "▶", text: "Engage" },
      "Disengage Predator": { icon: "⏸", text: "Disengage" },
      "Start Tracking": { icon: "▶", text: "Track" },
      "Standby Sheep Guard": { icon: "⏸", text: "Guard on standby" },
      "Deactivate Sheep Monitoring": { icon: "⏸", text: "Sheep watch off" },
      "Stop Patrolling": { icon: "⏸", text: "Patrol paused" },
      "Reactivate Sheep Monitoring": { icon: "▶", text: "Sheep watch on" },
      "Tracking orders": { icon: "🎯", text: "Follow the bear", to: "ap" },
      "Resume Patrolling": { icon: "🧭", text: "Back to the path", to: "ap" },
      "Light burst": { icon: "💡", text: "Light burst", to: "pasture" },
      "Sound burst": { icon: "🔊", text: "Sound burst", to: "pasture" },
      "Predator Alert": { icon: "📣", text: "Bear alert", to: "operator" },
      "Predator Cleared": { icon: "📣", text: "All clear", to: "operator" },
      "Feature Done": { icon: "✋", text: "Hands back" }
    }
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
