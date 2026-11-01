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
                spot = where the logic is (logicSpot: parts and links lit, a note),
                highlight = signals the animation slows down and keeps drawn (the patch of architecture 2),
                decider = the part whose states the student makes, stage by stage (none in the patch),
                anyName = state of the correction -> what the check asks instead, when its name is the student's,
                target = the drawing of the result to reach (deciderStm): items with s = the stage that adds them
                ("given": there from the start), g = the gesture of that stage that shows them (default 1), and
                gestures = per stage, the chips of the animation. */
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
      decider: "orch",
      target: {
        vb: "0 0 520 300", block: "Mission Orchestrator",
        items: [
          { t: "dot", x: 8, y: 38, s: "start" },
          { t: "arrow", pts: [[13, 38], [18, 38]], s: "start" },
          { t: "state", x: 18, y: 26, w: 44, name: "Idle", s: "start" },
          { t: "frame", x: 150, y: 8, w: 364, h: 284, name: "Mission", s: "start" },
          { t: "dot", x: 170, y: 44, s: "start" },
          { t: "arrow", pts: [[175, 44], [186, 44]], s: "start" },
          { t: "state", x: 186, y: 32, w: 90, name: "Transit", s: "start" },
          { t: "arrow", pts: [[62, 38], [150, 38]], s: "start", g: 2 },
          { t: "on", x: 66, y: 22, text: "Start Sheep Guard", s: "start", g: 2 },
          { t: "on", x: 66, y: 33, text: "Mission_ext", s: "start", g: 2 },
          { t: "eff", x: 66, y: 50, text: "/ Send To Safe Area", s: "start", g: 3 },
          { t: "state", x: 176, y: 112, w: 224, name: "Sheep Guard Active", s: "patrol" },
          { t: "arrow", pts: [[231, 56], [231, 112]], s: "patrol", g: 2 },
          { t: "on", x: 237, y: 78, text: "Arrived At Safe Area", s: "patrol", g: 2 },
          { t: "eff", x: 237, y: 90, text: "/ Start Guard", s: "patrol", g: 3 },
          { t: "state", x: 176, y: 214, w: 224, name: "Predator Defense Active", s: "bear" },
          { t: "arrow", pts: [[190, 136], [190, 214]], s: "bear", g: 2 },
          { t: "on", x: 196, y: 166, text: "Takeover Request", s: "bear", g: 2 },
          { t: "eff", x: 196, y: 178, text: "/ Hand Over To", s: "bear", g: 2 },
          { t: "eff", x: 196, y: 189, text: "Predator Defense", s: "bear", g: 2 },
          { t: "arrow", pts: [[350, 214], [350, 136]], s: "bear", g: 3 },
          { t: "on", x: 356, y: 166, text: "Feature Done", s: "bear", g: 3 },
          { t: "eff", x: 356, y: 178, text: "/ Hand Back To", s: "bear", g: 3 },
          { t: "eff", x: 356, y: 189, text: "Sheep Guard", s: "bear", g: 3 }
        ],
        gestures: {
          start: [
            { label: "The states", text: "**Idle**; the composite **Mission**; inside it **Transit**. Two initial states." },
            { label: "The transition", text: "From **Idle** to **Mission**. Trigger: **Start Sheep Guard Mission_ext**, the order Mission Configuration passes on." },
            { label: "Its effect", text: "Effect: **Send To Safe Area**, ready in the model. It sends **Go To Safe Area** to the AutoPilot." }
          ],
          patrol: [
            { label: "The state", text: "Inside Mission: **Sheep Guard Active**. While in it, Sheep Guard is the active feature." },
            { label: "The transition", text: "From **Transit** to **Sheep Guard Active**. Trigger: **Arrived At Safe Area**, from the AutoPilot." },
            { label: "Its effect", text: "Effect: **Start Guard**. It activates Sheep Guard and arms Predator Defense." }
          ],
          bear: [
            { label: "The state", text: "Inside Mission: **Predator Defense Active**. While in it, Predator Defense has the AutoPilot." },
            { label: "Hand over", text: "From **Sheep Guard Active**. Trigger: **Takeover Request**, the feature asks. Effect: **Hand Over To Predator Defense**: guard on standby, control given, operator alerted." },
            { label: "Hand back", text: "And back. Trigger: **Feature Done**. Effect: **Hand Back To Sheep Guard**: guard active again, operator told." }
          ]
        }
      }
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
      /* The state that pauses the sheep watch is the student's to name: the check only asks that it has left Sheep Monitoring. */
      anyName: { Deactivated: "!Sheep Monitoring" },
      target: {
        vb: "0 0 520 244", block: "SheepMonitoring and Predator Management",
        items: [
          { t: "frame", x: 6, y: 8, w: 246, h: 228, name: "SheepMonitoring", s: "given" },
          { t: "dot", x: 24, y: 42, s: "given" },
          { t: "arrow", pts: [[29, 42], [38, 42]], s: "given" },
          { t: "state", x: 38, y: 30, w: 76, name: "Inactive", s: "given" },
          { t: "arrow", pts: [[76, 54], [76, 92]], s: "given" },
          { t: "on", x: 82, y: 76, text: "Patrolling", s: "given" },
          { t: "state", x: 30, y: 92, w: 170, name: "Sheep Monitoring", do: "Sheep monitoring", s: "given" },
          { t: "state", x: 30, y: 200, w: 170, name: "Deactivated", s: "bear" },
          { t: "arrow", pts: [[52, 128], [52, 200]], s: "bear", g: 2 },
          { t: "on", x: 58, y: 158, text: "Deactivate", s: "bear", g: 2 },
          { t: "on", x: 58, y: 170, text: "Sheep Monitoring", s: "bear", g: 2 },
          { t: "arrow", pts: [[176, 200], [176, 128]], s: "bear", g: 2 },
          { t: "on", x: 182, y: 158, text: "Reactivate", s: "bear", g: 2 },
          { t: "on", x: 182, y: 170, text: "Sheep Mon.", s: "bear", g: 2 },
          { t: "frame", x: 268, y: 8, w: 246, h: 228, name: "Predator Management", s: "given" },
          { t: "state", x: 282, y: 30, w: 218, name: "No predator", s: "given" },
          { t: "state", x: 282, y: 200, w: 218, name: "Predator Detected", s: "given" },
          { t: "arrow", pts: [[296, 54], [296, 200]], s: "given" },
          { t: "arrow", pts: [[488, 200], [488, 54]], s: "given" },
          { t: "on", x: 302, y: 70, text: "a bear enters", s: "given" },
          { t: "on", x: 302, y: 82, text: "/ Bear Detected", s: "given" },
          { t: "eff", x: 302, y: 96, text: "+ send Deactivate Sheep Monitoring", s: "bear", g: 3 },
          { t: "on", x: 482, y: 128, a: "end", text: "the bear is gone", s: "given" },
          { t: "on", x: 482, y: 140, a: "end", text: "/ Bear Gone", s: "given" },
          { t: "eff", x: 482, y: 154, a: "end", text: "+ send Reactivate Sheep Monitoring", s: "bear", g: 3 },
          { t: "eff", x: 482, y: 168, a: "end", text: "+ send Resume Patrolling", s: "bear", g: 4 }
        ],
        gestures: {
          bear: [
            { label: "A state to pause", text: "SheepMonitoring gets a state where it does nothing: **Deactivated**." },
            { label: "Two transitions", text: "To it on **Deactivate Sheep Monitoring**, back on **Reactivate Sheep Monitoring**. Two new signals." },
            { label: "Who says so", text: "Predator Management knows about the bear: **Bear Detected** also sends the first, **Bear Gone** the second." },
            { label: "Back to the path", text: "**Bear Gone** also sends **Resume Patrolling**: the AutoPilot already understands it." }
          ]
        }
      }
    },
    "3": {
      name: "Centralised orchestrator", short: "Central orchestrator",
      decides: "A **star**: the orchestrator receives every observation and every request, and dispatches every command, by priority: predator first, then sheep and patrol. The other components decide nothing; Predator Management only sends requests.",
      spot: { parts: ["orch"], also: ["zp", "sm", "pm", "trk", "ap", "mc", "bsrc"], links: [["orch", "zp"], ["orch", "sm"], ["orch", "pm"], ["orch", "trk"], ["orch", "ap"], ["orch", "mc"], ["orch", "bsrc"]], note: "Every decision is in the **orchestrator**: every arrow goes through it." },
      pros: ["All the rules and priorities can be read in one place", "Simple, interchangeable components"],
      cons: ["The most messages in the scenario", "A bottleneck and a single point of failure: every new sensor or job goes through it"],
      score: [5, 3, 3, 2, 1, 5],
      layout: { bsrc: [210, 75], mc: [210, 200], mi: [210, 330], orch: [355, 200], ap: [355, 340], zp: [565, 62], sm: [565, 152], pm: [565, 242], trk: [565, 332] },
      decider: "orch",
      target: {
        vb: "0 0 520 410", block: "Mission Orchestrator",
        items: [
          { t: "dot", x: 8, y: 38, s: "start" },
          { t: "arrow", pts: [[13, 38], [18, 38]], s: "start" },
          { t: "state", x: 18, y: 26, w: 44, name: "Idle", s: "start" },
          { t: "frame", x: 150, y: 8, w: 364, h: 394, name: "Mission", s: "start" },
          { t: "dot", x: 170, y: 44, s: "start" },
          { t: "arrow", pts: [[175, 44], [186, 44]], s: "start" },
          { t: "state", x: 186, y: 32, w: 90, name: "Transit", s: "start" },
          { t: "arrow", pts: [[62, 38], [150, 38]], s: "start", g: 2 },
          { t: "on", x: 66, y: 22, text: "Start Sheep Guard", s: "start", g: 2 },
          { t: "on", x: 66, y: 33, text: "Mission_ext", s: "start", g: 2 },
          { t: "eff", x: 66, y: 50, text: "/ Send To Safe Area", s: "start", g: 3 },
          { t: "state", x: 176, y: 112, w: 224, name: "Patrolling", do: "Supervise Patrol", s: "patrol" },
          { t: "arrow", pts: [[231, 56], [231, 112]], s: "patrol", g: 2 },
          { t: "on", x: 237, y: 78, text: "Arrived At Safe Area", s: "patrol", g: 2 },
          { t: "eff", x: 237, y: 90, text: "/ Start Patrol", s: "patrol", g: 3 },
          { t: "region", x1: 150, x2: 514, y: 350, s: "sheep" },
          { t: "dot", x: 170, y: 378, s: "sheep", g: 2 },
          { t: "arrow", pts: [[175, 378], [186, 378]], s: "sheep", g: 2 },
          { t: "state", x: 186, y: 360, w: 214, name: "Dispatching", do: "Dispatch observations", s: "sheep", g: 2 },
          { t: "state", x: 176, y: 206, w: 224, name: "Predator tracking", do: "Relay tracking orders", s: "bear" },
          { t: "arrow", pts: [[190, 148], [190, 206]], s: "bear", g: 2 },
          { t: "on", x: 196, y: 170, text: "Predator Tracking Request", s: "bear", g: 2 },
          { t: "eff", x: 196, y: 182, text: "/ Grant Tracking", s: "bear", g: 2 },
          { t: "arrow", pts: [[345, 206], [345, 148]], s: "bear", g: 3 },
          { t: "on", x: 351, y: 170, text: "Predator Tracking Release", s: "bear", g: 3 },
          { t: "eff", x: 351, y: 182, text: "/ Resume Patrol", s: "bear", g: 3 },
          { t: "state", x: 176, y: 300, w: 224, name: "Predator counteraction", do: "Relay tracking orders", s: "deter" },
          { t: "arrow", pts: [[190, 242], [190, 300]], s: "deter", g: 2 },
          { t: "on", x: 196, y: 264, text: "Predator Engage Request", s: "deter", g: 2 },
          { t: "eff", x: 196, y: 276, text: "/ Grant Engagement", s: "deter", g: 2 },
          { t: "arrow", pts: [[345, 300], [345, 242]], s: "deter", g: 3 },
          { t: "on", x: 351, y: 264, text: "Predator Disengage Request", s: "deter", g: 3 },
          { t: "eff", x: 351, y: 276, text: "/ Grant Disengagement", s: "deter", g: 3 }
        ],
        gestures: {
          start: [
            { label: "The states", text: "**Idle**; the composite **Mission**; inside it **Transit**. Two initial states." },
            { label: "The transition", text: "From **Idle** to **Mission**. Trigger: **Start Sheep Guard Mission_ext**, the order Mission Configuration passes on." },
            { label: "Its effect", text: "Effect: **Send To Safe Area**, ready in the model. It sends **Go To Safe Area** to the AutoPilot." }
          ],
          patrol: [
            { label: "The state", text: "Inside Mission: **Patrolling**. Its do activity, **Supervise Patrol**, passes the watch path on to the AutoPilot." },
            { label: "The transition", text: "From **Transit** to **Patrolling**. Trigger: **Arrived At Safe Area**, from the AutoPilot." },
            { label: "Its effect", text: "Effect: **Start Patrol**. It sends **Start Patrolling** to Zone Patrolling." }
          ],
          sheep: [
            { label: "A second region", text: "Mission gets a **second region**: the dispatch runs at the same time as the mission, whatever its state." },
            { label: "The state", text: "One state, **Dispatching**, with its initial state. Its do activity, **Dispatch observations**, passes each observation on to who needs it." }
          ],
          bear: [
            { label: "The state", text: "In the first region: **Predator tracking**. Its do activity, **Relay tracking orders**, passes the orders on to the AutoPilot." },
            { label: "Go", text: "From **Patrolling**. Trigger: **Predator Tracking Request**. Effect: **Grant Tracking**: stop the patrol, pause the sheep watch, start tracking, alert the operator." },
            { label: "Back", text: "To **Patrolling**. Trigger: **Predator Tracking Release**. Effect: **Resume Patrol**: the reverse." }
          ],
          deter: [
            { label: "The state", text: "**Predator counteraction**, same do activity: the drone keeps following the bear." },
            { label: "Engage", text: "From **Predator tracking**. Trigger: **Predator Engage Request**. Effect: **Grant Engagement**: it orders the deterrence." },
            { label: "Disengage", text: "And back. Trigger: **Predator Disengage Request**. Effect: **Grant Disengagement**." }
          ]
        }
      }
    },

    /* The build, one scenario event at a time (archSim with opts.stage, and its "Validate in Cameo" button).
         steps:  the scenario steps measured at this stage (indexes over the steps of archs.js);
         setup:  the steps played before, as preconditions (not measured);
         add:    per architecture, the parts built at this stage. The technical parts are always there;
         states: per architecture, the states of the decider made at this stage: the simulation and the checks
                 have only those so far;
         expect: per architecture, per step, what to check instead of the scenario of archs.js, when the decider
                 is not complete yet;
         mute / drop: per architecture, signals and states that do not exist yet, for this stage only;
         quiet: the notes of the scenario would tell more than this stage does: not shown;
         short, icon: its chip in scenarioGrow (none: no chip; growAs: the chip it counts as). */
    stages: {
      tech: ["mi", "mc", "bsrc", "ap"],
      /* A connector that does not come with its part: the stage where it is drawn. */
      connAt: { strong_light: "deter", loud_sound: "deter", "mc.ap": "start", "pm.sm": "bear" },
      list: [
        { id: "prep", short: "Preparation", icon: "📋", title: "Preparation", event: "Power on, a wrong flight plan, a good one", steps: [0, 1, 2], setup: [] },
        {
          id: "start", quiet: true, short: "Start", icon: "🛫", title: "Start the mission", event: "The operator starts the mission: the drone flies to the safe area", steps: [3], setup: [0, 2],
          add: { "1": ["orch"], "3": ["orch"] },
          states: { "1": ["Idle", "Mission", "Transit"], "3": ["Idle", "Mission", "Transit"] },
          expect: {
            "1": { "3": { "soi.mc": "Deployed", "soi.orch": "Transit", "soi.ap": "Hovering" } },
            "3": { "3": { "soi.mc": "Deployed", "soi.orch": "Transit", "soi.ap": "Hovering" } }
          }
        },
        {
          id: "patrol", short: "Patrol", icon: "🧭", title: "Patrol", event: "On arrival, the drone follows its watch path", steps: [3], setup: [0, 2],
          add: { "1": ["sg"], "2": ["zs"], "3": ["zp"] },
          states: { "1": ["Sheep Guard Active"], "3": ["Patrolling"] },
          expect: { "3": { "3": { "soi.mc": "Deployed", "soi.orch": "Patrolling", "soi.ap": "Following Watch Path", "soi.zp": "Perimeter watch" } } }
        },
        {
          id: "sheep", short: "A sheep strays", icon: "🐑", title: "A sheep strays", event: "The flock is seen, then a sheep leaves the zone: the operator is warned", steps: [4, 5], setup: [0, 2, 3],
          add: { "1": ["zs"], "2": ["sm"], "3": ["sm"] },
          states: { "3": ["Dispatching"] }
        },
        {
          id: "raw", growAs: "bear", quiet: true, title: "A bear, before the patch", event: "Predator Management is plugged in, and nothing else has changed", steps: [6, 9], setup: [0, 2, 3],
          add: { "2": ["pm"] },
          mute: { "2": ["Deactivate Sheep Monitoring", "Reactivate Sheep Monitoring", "Resume Patrolling"] },
          drop: { "2": { SheepMonitoring: ["Deactivated"] } }
        },
        {
          id: "bear", short: "A bear", icon: "🐻", title: "A bear: track it, then patrol again", event: "A bear enters the tracking zone, the drone follows it; it leaves, the drone patrols again", steps: [6, 9], setup: [0, 2, 3],
          add: { "1": ["pd"], "3": ["pm", "trk"] },
          states: { "1": ["Predator Defense Active"], "3": ["Predator tracking"] }
        },
        {
          id: "deter", short: "Scare it off", icon: "💡", title: "Scare it off", event: "The bear comes too close, then backs off", steps: [6, 7, 8, 9], setup: [0, 2, 3],
          states: { "3": ["Predator counteraction"] }
        },
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
