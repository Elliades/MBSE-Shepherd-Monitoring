/* Part 3, the logical architecture: chapters, then scenes in reading order. One scene = one idea.
   Same engine, marks and blocks as Part 1 (see content/scenes.js at the root for the list), plus byChoice:
   blocks that depend on the architecture chosen in the scene "choose" (question q-arch).

   The story:
     1. why a logical level: what it is, what it is for, the analyses it opens (safety, performance,
        flows), and that its point is to compare several versions;
     2. one subsystem by hand, Mission Configuration, before any choice: what it takes from the mission, why its
        behaviour is not the same, the two questions (who fires the transition, who else wants to know), what
        Logical Transition does; then build it, a few gestures per scene;
     3. three ways to cut the rest of the drone, played; where the logic is in each; pick one;
     4. think before building: which subsystems, and what becomes of Predator counteraction;
     5. build it one scenario event at a time: see the goal, build, validate. Arrive and patrol, a sheep
        strays, a bear (track it, then patrol again), scare it off (on your own);
     6. tidy up, the whole scenario.
   The crash is not part of this TP: the architectures have no crash signals and no System Monitoring Safety.

   Source: the TP handoff of the OMF plugin docs (docs/pasture-sentinel/tp/) and the correction specs
   (drone-archs/). Figures: part3/assets/img/. Widgets: js/widgets-logical.js. Architectures:
   part3/content/archs.js and `archs` in part3/content/config.js. */
window.COURSE = {
  /* The four levels of the method; Parts 1 and 2 show the three others. Colour of lg: css/logical.css. */
  phases: [
    { id: "op", title: "Operational analysis", short: "Operational", q: "What is expected of the system?" },
    { id: "fn", title: "Functional architecture", short: "Functional", q: "How does it do it?" },
    { id: "lg", title: "Logical architecture", short: "Logical", q: "Which subsystems, exchanging what?" },
    { id: "ph", title: "Physical architecture", short: "Physical", q: "With what, exactly?" }
  ],

  chapters: [
    { id: "brief", code: "0", title: "Briefing", blurb: "From one mission to subsystems." },
    { id: "setup", code: "1", title: "Set up Cameo", blurb: "License, plugin, model." },
    { id: "intro", code: "2", title: "Why a logical level", blurb: "What it is, what it is for.", phase: "lg" },
    { id: "example", code: "3", title: "One subsystem by hand", blurb: "Mission Configuration, from the mission.", phase: "lg" },
    { id: "choose", code: "4", title: "Choose an architecture", blurb: "Three ways to cut the drone.", phase: "lg" },
    { id: "think", code: "5", title: "Think first", blurb: "Which subsystems, what changes.", phase: "lg" },
    { id: "build", code: "6", title: "Build and validate", blurb: "One event at a time.", phase: "lg" },
    { id: "end", code: "✓", title: "Debrief", blurb: "Tidy up, the whole scenario." }
  ],

  scenes: [
    /* ───────────────────────── 0 · Briefing ───────────────────────── */
    {
      id: "welcome", ch: "brief", kind: "read", bare: true,
      title: "From a functional mission to a logical architecture",
      blocks: [{ widget: "cover" }]
    },
    {
      id: "goal", ch: "brief", kind: "read",
      title: "Now, which subsystems do it",
      lead: "Parts 1 and 2 said what is expected of the drone and how it does it. This part cuts the drone into subsystems, and says what they exchange.",
      blocks: [
        { phases: "lg" },
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "cut", title: "Subsystems", text: "Cut the system into a few abstract subsystems, one level deep." },
              { pic: "share", title: "Behaviour", text: "Give each subsystem its part of the mission: states and functions." },
              { pic: "ports", title: "Interfaces", text: "Replace what the drone told itself by exchanges, on ports." },
              { pic: "verify", title: "Verify", text: "Play the mission scenario on the architecture, step by step." }
            ]
          }
        },
        {
          cards: [
            { n: "1", title: "One subsystem by hand", text: "Mission Configuration, shown then done by you." },
            { n: "2", title: "Choose an architecture", text: "Three ways to cut the rest of the drone; you pick one." },
            { n: "3", title: "Build it, event by event", text: "Patrol, a stray sheep, a bear. Each step checked by a scenario." }
          ]
        }
      ]
    },

    /* ───────────────────────── 1 · Set up Cameo ───────────────────────── */
    {
      id: "start-tool", ch: "setup", kind: "do",
      title: "Start the tool",
      lead: "Same floating license as in Parts 1 and 2.",
      blocks: [
        {
          steps: [
            "In Windows, open the Catia Magic **Systems of Systems Architect** application.",
            "Choose {{Defaults}}, then {{Use a floating license}}.",
            "Enter the server name and the port number below."
          ]
        },
        { copy: { label: "Server name", value: "licence-w2k19.isae.fr" } },
        { copy: { label: "Port number", value: "1101" } },
        {
          recall: {
            items: [
              { id: "start-tool", title: "Start the tool" },
              { id: "language", title: "Switch Cameo to English" },
              { id: "perspective", title: "Choose the Systems Engineer perspective" },
              { id: "expert-mode", title: "Show every property with Expert mode" }
            ]
          }
        }
      ]
    },
    {
      id: "plugin", ch: "setup", kind: "do",
      title: "Install the latest MBSE Shepherd plugin",
      lead: "This part uses the logical commands of the plugin. Install it again, even if you already have one.",
      blocks: [
        { download: { label: "Plugin to install", file: "com.elliades.isae.mbseShepherd_1.1.1.zip", src: "../assets/plugins/com.elliades.isae.mbseShepherd_1.1.1.zip", size: "18 MB" } },
        {
          steps: [
            "In Cameo, choose {{Help > Resource & Plugin Manager}}, click {{Import}} and pick the file.",
            "Restart Cameo.",
            "Right-click a state in any state machine: the menu has {{MBSE Shepherd}}, with **Logical Transition**, **Signal Ports**, **Simulation Scenarios**…"
          ]
        },
        {
          recall: {
            label: "No admin rights, or stuck? See Part 1",
            items: [{ id: "install-plugin", title: "Install the plugin" }]
          }
        },
        {
          placeholder: {
            kind: "text", title: "Plugin version of Part 3",
            todo: ["The plugin release with Logical Transition matching by «refine», the allocations, and simtest on the relay (Validate in Cameo): file name and size"]
          }
        }
      ]
    },
    {
      id: "load-model", ch: "setup", kind: "do",
      title: "Open the starting model",
      lead: "The functional mission is done, and the technical part of the drone is ready.",
      blocks: [
        {
          steps: [
            "Download the starting model and open it ({{File > Open Project}}). Keep the profile file next to it; do not unzip the .mdzip.",
            "Open [[la-pkg]]: one package per architecture, each with its technical blocks already wired.",
            "Link this guide to Cameo with the **Cameo** button at the top: the chips show the elements in your model, and the **Validate in Cameo** buttons run the scenarios for you."
          ]
        },
        {
          callout: {
            tone: "goal", title: "Given, and to do",
            text: "Given: power-on, base station link, AutoPilot, the simulation drivers. You build Mission Configuration, then the mission subsystems of the architecture you choose."
          }
        },
        {
          placeholder: {
            kind: "link", title: "The starting model",
            todo: [
              "Build the blank starting models: the technical part only, without the mission features nor Mission Configuration (handoff, to do #1), parts unnamed, without the crash (no System Monitoring Safety, port health, Emergency Mode, Crash Alert)",
              "Choose: ports of the technical blocks given (architecture imposed) or not (architecture free)",
              "Put the .mdzip on the LMS or in part3/assets/models/ and add a download block here"
            ]
          }
        }
      ]
    },

    /* ───────────────────────── 2 · Why a logical level ───────────────────────── */
    {
      id: "what-is", ch: "intro", kind: "try", mark: "intro",
      title: "What a logical architecture is",
      lead: "An abstract architecture of subsystems, one level deep: who carries which behaviour, and what they exchange.",
      blocks: [
        { widget: "logicalIntro" },
        {
          list: [
            "**Abstract**: a subsystem says what it does, not how it is built. No brand, no part number.",
            "**One level only**: the drone and its subsystems.",
            "**Behaviour allocated**: each subsystem gets part of the state machine, and the functions those states run.",
            "**Interfaces defined**: ports, and connectors whose item flows say what travels."
          ]
        }
      ]
    },
    {
      id: "what-for", ch: "intro", kind: "try",
      title: "What it is for",
      lead: "A high-level architecture: cheap to change, and still checked against the mission.",
      blocks: [
        { widget: "whatFor" }
      ]
    },
    {
      id: "an-safety", ch: "intro", kind: "try",
      title: "Analyse it: safety",
      lead: "Which function must never be lost, and where does it run? The logical level is where you decide.",
      blocks: [
        { widget: "safetyChain" },
        { p: "The **FHA** (Functional Hazard Analysis) lists, for each function, what its loss would cause. The architecture answers with **where** the function runs: once, or several times in different subsystems." }
      ]
    },
    {
      id: "an-perf", ch: "intro", kind: "try",
      title: "Analyse it: performance",
      lead: "Each subsystem and each interface on a chain of reactions costs time. Count them, then try another cut.",
      blocks: [
        { widget: "perfChain" }
      ]
    },
    {
      id: "an-flows", ch: "intro", kind: "try",
      title: "Analyse it: the flows",
      lead: "Play the scenarios of the mission on the architecture: in a second, you see whether the flows hold.",
      blocks: [
        { widget: "seqCheck" },
        { p: "You will do exactly this in this part: after each piece you build, its scenario runs in **Simulation Scenarios**." }
      ]
    },
    {
      id: "an-more", ch: "intro", kind: "read",
      title: "Other analyses, and the point: a trade-off",
      lead: "Many questions can be asked of a logical architecture. They all serve one purpose: compare several versions, and pick one.",
      blocks: [
        {
          cards: [
            { n: "1", icon: "block", title: "Interfaces", text: "How many interfaces, how many signals each: every one is to specify, build and test." },
            { n: "2", icon: "waypoint", title: "Budgets", text: "Mass, power, cost, computing load, per subsystem, before anything is bought." },
            { n: "3", icon: "flag", title: "Evolution", text: "What it costs to add a feature: how many subsystems and interfaces it touches." },
            { n: "4", icon: "check", title: "Tests", text: "Can each subsystem be tested alone? With how many stubs around it?" }
          ]
        },
        { widget: "archVersions" },
        {
          callout: {
            tone: "goal", title: "Several versions, one choice",
            text: "A logical architecture is rarely right the first time. You make **several versions**, run the same analyses on each, and compare: a **trade-off**. That is what you will do in chapter 4 with three versions of the drone."
          }
        }
      ]
    },
    {
      id: "make-or-buy", ch: "intro", kind: "read", mark: "outro",
      title: "Then: delegate, make or buy",
      lead: "Each logical subsystem becomes a specification that other engineers build, or that a supplier sells.",
      blocks: [
        { widget: "makeOrBuy" },
        { p: "For each subsystem, the engineers decide to **make** it or to **buy** it. Either way, its ports and its behaviour are its **specification**. At the physical level, we check that what is delivered is consistent with it." }
      ]
    },

    /* ───────────────────────── 3 · One subsystem by hand: Mission Configuration ─────────────────────────
       It comes before the choice of an architecture, so it is done once, in architecture 3. Chapter 6 says what
       to change in the others. */
    {
      id: "mission", ch: "example", kind: "read", mark: "intro",
      title: "The starting point: the functional mission",
      lead: "Every subsystem starts from some states of one state machine, [[fa-mission]], in 2 - Functional Analysis.",
      blocks: [
        { figure: { src: "assets/img/fonctionnel-stm-mission.png", w: 1202, h: 851, alt: "State machine SOI - Pasture Sentinel. Undeployed: Off, Unconfigured, Configured (do Load Flight Plan), Ready for Mission (do Start subsystems). Deployed, two regions: Going to Safe Area, then Patrolling with three regions (Perimiter watch, Sheep Monitoring, Predator Monitoring), Predator Detected with Predator tracking and Predator counteraction; and Mission Monitoring. Crashed on Crashed Detected.", caption: "The functional mission. Every subsystem will take some of these states; Crashed stays out of this part." } },
        {
          callout: {
            tone: "goal", title: "The drone talks to itself",
            text: "Here, every decision is a signal a function sends **to itself**. Going logical means: **share the states and their functions between subsystems**. Inside a subsystem, telling itself is still fine. But as soon as another subsystem needs to know, it goes **through a port**."
          }
        }
      ]
    },
    {
      id: "mc-cut", ch: "example", kind: "try",
      title: "Mission Configuration: the preparation",
      lead: "Our first subsystem prepares the mission, from power-on to ready to fly. In the functional mission, that is Undeployed.",
      blocks: [
        { widget: "mcCut" }
      ]
    },
    {
      id: "mc-ab", ch: "example", kind: "try",
      title: "Same states, different behaviour",
      lead: "Copy the states, and the behaviour is not complete yet: in a subsystem, some messages come from, or go to, other subsystems. Follow the lit state.",
      blocks: [
        { widget: "behaviourAB" }
      ]
    },
    {
      id: "mc-signals", ch: "example", kind: "read",
      title: "Two questions for each signal",
      lead: "That is the whole method. For each signal of the subsystem: who fires the transition, and who else wants to know?",
      blocks: [
        {
          widget: "signalTable", opts: {
            head: ["Signal", "Who fires the transition?", "Who else wants to know?"],
            rows: [
              ["Start SOI", "**Outside**: power-on", "Nobody"],
              ["FlightPlan Correct, FlightPlan Incorrect", "**Outside**: the operator, through the base station", "Nobody"],
              ["Ready for mission", "**Itself**: Load Flight Plan", "**The operator**: send it out too"],
              ["FlightPlan Check Failed", "**Itself**: Load Flight Plan", "**The operator**: send it out too"],
              ["Start Sheep Guard Mission", "**Outside**: the operator, through the base station", "**The decider**: pass it on"]
            ]
          }
        },
        {
          callout: {
            tone: "note", title: "What it gives",
            text: "Fired by itself and nobody else concerned: a self-send, nothing to do. Fired from outside: a port in. Someone else wants to know: a port out, on a signal of its own, marked `_ext`."
          }
        }
      ]
    },
    {
      id: "mc-tool", ch: "example", kind: "try",
      title: "By hand, or with Logical Transition",
      lead: "By hand, you would redraw the states, copy the functions and link each copy. The plugin does the copying; the thinking stays yours.",
      blocks: [
        { widget: "mcTransition" },
        {
          callout: {
            tone: "warn", title: "A simplified method, with home-made tools",
            text: "The commands of this part were written for this course. Each one only creates SysML elements you already know: blocks, states, activities, ports, connectors, «refine», «allocate». The plugin saves you the clicks, not the thinking."
          }
        }
      ]
    },
    {
      id: "mc-block", ch: "example", kind: "do",
      title: "Your turn: the block, and its states",
      lead: "Create the subsystem, and let Logical Transition copy Undeployed into it. The starting model is ready for you: work in **TP - Logical Architecture 1**.",
      blocks: [
        { figure: { src: "assets/img/fonctionnel-undeployed.png", w: 552, h: 289, size: "sm", alt: "Functional state Undeployed: Off, Start SOI to Unconfigured; Unconfigured, on FlightPlan, FlightPlan Correct or FlightPlan Incorrect, to Configured, which runs Load Flight Plan; FlightPlan Check Failed back to Unconfigured; Ready for mission to Ready for Mission, which runs Start subsystems.", caption: "What you transition: Undeployed, in the functional mission." } },
        { path: "tp-components" },
        {
          steps: [
            "In [[tp-components]], create a **logical component** (a block with the stereotype «Logical Component»): <<Mission Configuration>>.",
            "In [[fa-mission]], select `Undeployed`, then {{MBSE Shepherd > Logical Transition}} and pick **Mission Configuration**."
          ]
        },
        { figure: { src: "assets/img/mc-1-apres-logical-transition.png", w: 585, h: 430, size: "sm", alt: "State machine Mission Configuration after Logical Transition: Undeployed with Off, Unconfigured, Configured, Ready for Mission, and a transition Start Sheep Guard Mission to off-TO RENAME.", caption: "What you get: the copy, and off-TO RENAME where a transition left Undeployed." } },
        {
          placeholder: {
            kind: "text", title: "Figures to export again",
            todo: ["Screenshot: creating a logical component (a block with its stereotype). To place above the steps of this scene.", "From the corrected Undeployed and the model without part names: the state machine after Logical Transition (mc-1), after the rework and with its effects, the IBD with the grouped ports. They were removed or are out of date. The target figures of the architectures (IBDs, Mission Orchestrator, AutoPilot) must also be exported again without the crash."]
          }
        }
      ]
    },
    {
      id: "mc-states", ch: "example", kind: "do",
      title: "Finish the states",
      lead: "The transitions inside Undeployed stay as they are. Only what leaves it is missing.",
      blocks: [
        {
          steps: [
            "Rename `off-TO RENAME` to `Deployed`.",
            "Add the initial states: one towards Undeployed, one inside it towards Off."
          ]
        },
        { widget: "mcStatesFix" }
      ]
    },
    {
      id: "mc-who", ch: "example", kind: "do",
      title: "Who relays these signals?",
      lead: "Still in the state machine: `Start SOI`, `FlightPlan Correct` and `FlightPlan Incorrect` are external signals, sent by the operator.",
      blocks: [
        { p: "Step back one level, to the architecture. Which subsystem passes this information on to Mission Configuration?" },
        { path: "tp-soi-ibd" },
        {
          reveal: {
            label: "See who",
            text: "**Base station remote communication.** It is the **relay** between the operator and the drone. One exception: `Start SOI` is the power-on, so it comes through **Manual Initialization**."
          }
        }
      ]
    },
    {
      id: "mc-magic", ch: "example", kind: "do",
      title: "Ports: the magic button",
      lead: "By hand, each signal needs a **port**, an **interface**, a **flow property** typed by the signal, and **On Port** on its send. Change nothing by hand: the plugin has a magic button.",
      blocks: [
        {
          steps: [
            "Open [[tp-soi-ibd]]. From the Model Browser, drag [[mc-block]] and drop it on the diagram. Do not create a part by hand: the drop makes it.",
            "Right-click it → {{MBSE Shepherd > Create All Missing Signal Ports}}."
          ]
        },
        { widget: "mcPortsMagic" }
      ]
    },
    {
      id: "mc-delegate", ch: "example", kind: "do",
      title: "The verdict is not on a port",
      lead: "The operator expects `Ready for mission` and `FlightPlan Check Failed`, and neither is on a port. No panic: the state machine consumes them, so they are internal signals.",
      blocks: [
        { widget: "mcDelegate" },
        {
          steps: [
            "In the state machine of [[mc-block]], right-click the transition `Ready for mission` → {{MBSE Shepherd > Delegate to external systems}}.",
            "Same gesture on `FlightPlan Check Failed`. The decider wants the start order too: same gesture on `Start Sheep Guard Mission`.",
            "Back on the part: it has new output ports, such as `ready_mission_ext`. If they do not show, right-click the part → **Display > Display Parts/Ports**."
          ]
        },
        {
          callout: {
            tone: "note", title: "Two signals, on purpose",
            text: "`Ready for mission` stays inside and fires the transition. `Ready for mission_ext` goes out. Keeping them apart is what lets one stay internal while the other leaves."
          }
        }
      ]
    },
    {
      id: "mc-ports", ch: "example", kind: "do",
      title: "Ports: group what belongs together",
      lead: "The plugin made one port per signal; you decide which signals form one exchange.",
      blocks: [
        { widget: "mcPorts" },
        {
          steps: [
            "Put the signals of one exchange on one port, named after the partner: <<p_Init>>, <<p_BaseStation>>, <<p_Orchestrator>>.",
            "Connect the part to Manual Initialization and to the base station link, then {{Propagate Interface To Connected Port}} on the port in front."
          ]
        },
        {
          tip: {
            label: "Tip: a more readable IBD",
            blocks: [{ p: "Select the ports → {{Show Port Type Only}}: the names stay in the model, hidden on the IBD." }]
          }
        },
        {
          tip: {
            label: "Another way: choose the ports in a dialog",
            blocks: [{ p: "{{MBSE Shepherd > Create Signal Proxy Ports}} lets you give each signal its port name: signals given the same name share one port." }]
          }
        }
      ]
    },
    {
      id: "mc-check", ch: "example", kind: "try", mark: "outro",
      title: "Validate: a wrong plan, a good plan",
      lead: "Play it here, then send the same signals to your model. What is wrong shows in red.",
      blocks: [
        { widget: "archSim", opts: { arch: "3", stage: "prep", validate: true, cameo: { context: "TP1 SOI Simulation", soi: "TP1 SOI" } } },
        {
          list: [
            "`FlightPlan Incorrect`: Load Flight Plan refuses it, the subsystem goes **back to Unconfigured** and the operator is told.",
            "`FlightPlan Correct`: the subsystem reaches **Ready for Mission** and the operator is told."
          ]
        }
      ]
    },

    /* ───────────────────────── 4 · Choose an architecture ───────────────────────── */
    {
      id: "three-archs", ch: "choose", kind: "try", mark: "intro",
      title: "Three ways to cut the rest of the drone",
      lead: "The same mission, three architectures. Play the scenario and follow the captions: the drone arrives, a sheep strays, a bear comes, it leaves, back to patrol.",
      blocks: [
        { widget: "archSim" },
        { p: "Do not try to read every message: there are many, and that is the point. Watch **who reacts** to each event, and the labels that pop. In **2**, watch the thick red message: that is the patch." }
      ]
    },
    {
      id: "differences", ch: "choose", kind: "read",
      title: "Where the logic is",
      lead: "Each architecture puts the decisions somewhere else, and that changes the interfaces.",
      blocks: [
        {
          tabs: [
            {
              label: "1 · Feature orchestrator", sub: "the feature asks",
              blocks: [
                { widget: "logicSpot", opts: { arch: "1" } },
                { list: [
                  "The orchestrator only chooses **which feature is active**; the active feature decides the rest.",
                  "On a bear, Predator Defense **asks** for control, gets it, decides alone, then **hands back**.",
                  "Each feature drives the AutoPilot itself."
                ] }
              ]
            },
            {
              label: "2 · Patch", sub: "add, do not rework",
              blocks: [
                { widget: "logicSpot", opts: { arch: "2" } },
                { list: [
                  "We start from an **existing** drone that already patrols and watches the sheep.",
                  "The goal: **add** the predator feature without breaking or reworking what works. Minimum cost.",
                  "The patch: on a bear, Predator Management sends **Deactivate Sheep Monitoring**, takes the AutoPilot, and gives everything back when the bear is gone.",
                  "The price: the rules are scattered; the next feature will need another patch."
                ] }
              ]
            },
            {
              label: "3 · Central orchestrator", sub: "the hub decides",
              blocks: [
                { widget: "logicSpot", opts: { arch: "3" } },
                { list: [
                  "The orchestrator decides **everything**, by priority: bear first, then sheep and patrol.",
                  "The other subsystems only report and **request**; Tracking only computes orders.",
                  "A star: each subsystem has one port, towards the hub; every exchange goes through it."
                ] }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "trade-off", ch: "choose", kind: "try",
      title: "Compare: the trade-off",
      lead: "None wins on every axis. The further out, the better.",
      blocks: [
        { widget: "tradeOff" }
      ]
    },
    {
      id: "choose", ch: "choose", kind: "answer", mark: "outro",
      title: "Your choice",
      lead: "Pick the architecture you will build, and say why. The rest of this guide follows your choice.",
      blocks: [
        {
          question: {
            id: "q-arch", type: "choice",
            prompt: "Which logical architecture do you build?",
            options: ["1 · Mission orchestrator, autonomous features", "2 · Decentralised patch", "3 · Centralised orchestrator"],
            justify: true
          }
        },
        {
          tip: {
            label: "Not sure? A rule of thumb",
            blocks: [{ p: "**2** is the closest to the functional mission: the fewest steps, but the hardest to defend. **3** has the most subsystems and an orchestrator to write. **1** sits in between." }]
          }
        }
      ]
    },

    /* ───────────────────────── 5 · Think first ───────────────────────── */
    {
      id: "q-subsystems", ch: "think", kind: "answer", mark: "intro",
      title: "Which subsystems will you need?",
      lead: "Before any click: name the mission subsystems of your architecture. The technical ones are given.",
      blocks: [
        { widget: "archBlank" },
        {
          question: {
            id: "q-subs", type: "list", itemLabel: "Subsystem", initial: 3,
            prompt: "One line per subsystem: its name, and what it does in the mission."
          }
        },
        {
          solution: {
            label: "Compare with the correction",
            blocks: [{
              byChoice: {
                q: "q-arch",
                variants: {
                  "1": { label: "Architecture 1 · four subsystems", tab: "Arch. 1", blocks: [{ list: [
                    "**Mission Orchestrator**: chooses which feature is active.",
                    "**Sheep Guard**: patrol route and sheep counting.",
                    "**Predator Defense**: watches for bears, then tracks and deters.",
                    "**Zone Surveillance**: the shared camera."
                  ] }] },
                  "2": { label: "Architecture 2 · three subsystems", tab: "Arch. 2", blocks: [{ list: [
                    "**Zone Surveillance**: the watch path, and the camera.",
                    "**SheepMonitoring**: counts the sheep, alerts on an exit.",
                    "**Predator Management**: tracks and deters the bear; pauses the sheep watch (the patch)."
                  ] }] },
                  "3": { label: "Architecture 3 · five subsystems", tab: "Arch. 3", blocks: [{ list: [
                    "**Mission Orchestrator**: receives everything, decides everything.",
                    "**Zone Patrolling**: the watch path, and the camera.",
                    "**SheepMonitoring**: counts the sheep.",
                    "**Predator Management**: locates the bear, sends requests, deters.",
                    "**Tracking**: computes the follow orders."
                  ] }] }
                }
              }
            }]
          }
        }
      ]
    },
    {
      id: "who-gets-what", ch: "think", kind: "try",
      title: "Which states go where",
      lead: "Each subsystem starts from some states of the functional mission. The colours say which.",
      blocks: [
        { widget: "stateMapping", opts: { arch: "chosen" } },
        { p: "A state with no colour is not transitioned: what it decided becomes **exchanges** between subsystems." }
      ]
    },
    {
      id: "q-counter", ch: "think", kind: "answer", mark: "outro",
      title: "One feature, thought through",
      lead: "In the mission, Predator counteraction flashes and honks, and decides by itself when the bear backs off. What becomes of it in your architecture?",
      blocks: [
        { widget: "counterQ" },
        {
          question: {
            id: "q-counteraction", type: "text",
            prompt: "Which subsystem receives it? Who decides when to start and stop? What does its function send, on which ports?",
            hint: "Subsystem, who decides, what the function sends, on which ports."
          }
        },
        {
          solution: {
            label: "Compare with the correction",
            blocks: [{
              byChoice: {
                q: "q-arch",
                variants: {
                  "1": { label: "Architecture 1 · the feature decides", tab: "Arch. 1", blocks: [{ list: [
                    "**Predator Defense**, state `Deterring` (it comes with Predator Detected).",
                    "The feature decides, on the same triggers as the mission. The orchestrator does not move.",
                    "**Deter predator** sends `Light burst` and `Sound burst` out, on two ports. Its self-send goes: the position of the bear now comes from the camera."
                  ] }] },
                  "2": { label: "Architecture 2 · unchanged, inside Predator Management", tab: "Arch. 2", blocks: [{ list: [
                    "**Predator Management**, inside Predator Detected, taken as it is.",
                    "Predator Management decides, on the same triggers as the mission.",
                    "Trigger predator counter actions sends `Light burst`, `Sound burst` out. Its self-send goes: the position of the bear now comes from the camera."
                  ] }] },
                  "3": { label: "Architecture 3 · the hub decides", tab: "Arch. 3", blocks: [{ list: [
                    "**Predator Management**, in a second region: `Deterrence idle` ⇄ `Deterring`.",
                    "The orchestrator decides: Predator Management **asks** to engage or disengage, the orchestrator answers `Engage Predator` / `Disengage Predator`.",
                    "Trigger predator counter actions sends `Light burst`, `Sound burst` out."
                  ] }] }
                }
              }
            }]
          }
        },
        { p: "You will build exactly this, on your own, in chapter 6." }
      ]
    },

    /* ───────────────────────── 6 · Build and validate ───────────────────────── */
    {
      id: "build-plan", ch: "build", kind: "read", mark: "intro",
      title: "Step, validate, step",
      lead: "Do not build everything and hope. One event of the scenario at a time: see what it needs, build it, validate it.",
      blocks: [
        {
          byChoice: {
            q: "q-arch", change: true,
            variants: {
              "1": { label: "You are building **architecture 1**, the feature orchestrator.", tab: "Arch. 1", blocks: [] },
              "2": { label: "You are building **architecture 2**, the patch.", tab: "Arch. 2", blocks: [] },
              "3": { label: "You are building **architecture 3**, the central orchestrator.", tab: "Arch. 3", blocks: [] }
            }
          }
        },
        {
          cards: [
            { n: "1", icon: "waypoint", title: "Arrive and patrol", text: "The drone flies to the field and follows its watch path." },
            { n: "2", icon: "flag", title: "A sheep strays", text: "The flock is counted; a sheep leaves the zone; the operator is warned." },
            { n: "3", icon: "alert", tone: "warn", title: "A bear, then patrol again", text: "The drone follows the bear; when it leaves, the drone **goes back to patrolling**." },
            { n: "4", icon: "bulb", tone: "tip", title: "Scare it off", text: "On your own: light and sound when the bear comes too close." }
          ]
        },
        { p: "Each step uses the gestures of Mission Configuration: **block, Logical Transition, states, functions, part and ports, connect**. Parts have no name; ports are named `p_Partner` and hidden on the IBD." },
        {
          callout: {
            tone: "note", title: "State names matter",
            text: "Type the state names exactly as given, typos of the model included (`Perimiter`): the validation checks them."
          }
        }
      ]
    },

    /* 1 · launch */
    {
      id: "launch-goal", ch: "build", kind: "try",
      title: "1 · Arrive and patrol: the goal",
      lead: "The operator starts the mission: the drone flies to the safe area, then follows its watch path. Here is what it should do.",
      blocks: [
        { widget: "archSim", opts: { arch: "chosen", stage: "launch" } },
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "You will build: Sheep Guard and the Mission Orchestrator.", tab: "Arch. 1", blocks: [] },
              "2": { label: "You will build: Zone Surveillance.", tab: "Arch. 2", blocks: [] },
              "3": { label: "You will build: Zone Patrolling and the Mission Orchestrator.", tab: "Arch. 3", blocks: [] }
            }
          }
        }
      ]
    },
    {
      id: "launch-build", ch: "build", kind: "do",
      title: "1 · Arrive and patrol: build it",
      lead: "The patrol subsystem, and whoever starts it.",
      blocks: [
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "Architecture 1", tab: "Arch. 1", blocks: [
                { h: "Mission Configuration, in your architecture" },
                { steps: ["In the IBD of [[a1-ibd]], add a part typed Mission Configuration, and connect it as in the example."] },
                { h: "Sheep Guard" },
                { steps: [
                  "Create the block <<Sheep Guard>>; transition `Perimiter watch` and `Sheep Monitoring` into it.",
                  "States: `Guard Standby` ⇄ `Sheep Guarding` (on `Activate Sheep Guard` / `Standby Sheep Guard`). Sheep Guarding has two regions: `Patrol Route` and `Sheep Counting`.",
                  "Patrol route sends `next pathing` to the AutoPilot, instead of calling Follow path."
                ] },
                { h: "Mission Orchestrator" },
                { steps: [
                  "Create the block <<Mission Orchestrator>>. No transition: it carries decisions, not functions.",
                  "`Idle` → `Mission` on `Start Sheep Guard Mission_ext`, effect: send `Go To Safe Area`.",
                  "Inside Mission: `Transit` → `Sheep Guard Active` on `Arrived At Safe Area`, effect: send `Activate Sheep Guard`.",
                  "Add the two parts; ports; connect them to Mission Configuration, the AutoPilot and each other; propagate."
                ] },
                { solution: { label: "Show the target Sheep Guard", blocks: [{ figure: { src: "assets/img/arch1-6-cible-stm-sheep-guard.png", w: 364, h: 524, size: "sm", alt: "Target state machine of Sheep Guard: Guard Standby and Sheep Guarding with two regions, Patrol Route and Sheep Counting.", caption: "Sheep Guard." } }] } }
              ] },
              "2": { label: "Architecture 2", tab: "Arch. 2", blocks: [
                { h: "Mission Configuration, in your architecture" },
                { steps: [
                  "In the IBD of [[a2-ibd]], add a part typed Mission Configuration, and connect it as in the example.",
                  "No orchestrator here: `Start Sheep Guard Mission_ext` starts the AutoPilot. Its port is `p_AutoPilot`."
                ] },
                { h: "Zone Surveillance" },
                { steps: [
                  "Create the block <<Zone Surveillance>>; transition `Perimiter watch` into it.",
                  "States: `Standby` → `Patrolling` on `Start Patrolling` (the AutoPilot sends it on arrival); inside Patrolling, `Perimeter watch`.",
                  "Watch Perimeter sends `next pathing` to the AutoPilot, instead of calling Follow path.",
                  "Add the part; a port towards the AutoPilot; connect; propagate."
                ] },
                { solution: { label: "Show the target Zone Surveillance", blocks: [{ figure: { src: "assets/img/arch2-5-cible-stm-zone-surveillance.png", w: 382, h: 503, size: "sm", alt: "Target state machine of Zone Surveillance: Standby, then Patrolling with two regions, Perimeter watch and Capturing.", caption: "Zone Surveillance (its second region comes at step 2)." } }] } }
              ] },
              "3": { label: "Architecture 3", tab: "Arch. 3", blocks: [
                { h: "Zone Patrolling" },
                { steps: [
                  "Create the block <<Zone Patrolling>>; transition `Perimiter watch` into it.",
                  "States: a composite `Active`; inside, `Path Standby` ⇄ `Perimeter watch` (on `Start Patrolling` / `Stop Patrolling`).",
                  "Watch Perimeter sends `next pathing` to the orchestrator, instead of calling Follow path."
                ] },
                { h: "Mission Orchestrator" },
                { steps: [
                  "Create the block <<Mission Orchestrator>>. No transition: it carries decisions, not functions.",
                  "`Idle` → `Mission` on `Start Sheep Guard Mission_ext`, effect: send `Go To Safe Area`. Mission has two regions.",
                  "Region 1: `Transit` → `Patrolling` on `Arrived At Safe Area`, effect: send `Start Patrolling`. Patrolling passes `next pathing` on to the AutoPilot.",
                  "Region 2: one state `Dispatching`, empty for now.",
                  "Add the two parts; ports; connect them to Mission Configuration, the AutoPilot and each other; propagate."
                ] }
              ] }
            }
          }
        }
      ]
    },
    {
      id: "launch-check", ch: "build", kind: "do",
      title: "1 · Arrive and patrol: validate",
      lead: "Send the signals to your model. It must end with the drone on its watch path.",
      blocks: [
        { widget: "stageCheck", opts: { stage: "launch" } }
      ]
    },

    /* 2 · sheep */
    {
      id: "sheep-goal", ch: "build", kind: "try",
      title: "2 · A sheep strays: the goal",
      lead: "The camera sees the flock, then a sheep outside the zone: the operator must be warned.",
      blocks: [
        { widget: "archSim", opts: { arch: "chosen", stage: "sheep" } },
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "You will build: Zone Surveillance (the camera), and the sheep reactions of Sheep Guard.", tab: "Arch. 1", blocks: [] },
              "2": { label: "You will build: SheepMonitoring, and the camera region of Zone Surveillance.", tab: "Arch. 2", blocks: [] },
              "3": { label: "You will build: SheepMonitoring, the camera region of Zone Patrolling, and the dispatch of the orchestrator.", tab: "Arch. 3", blocks: [] }
            }
          }
        }
      ]
    },
    {
      id: "sheep-build", ch: "build", kind: "do",
      title: "2 · A sheep strays: build it",
      lead: "Who sees the sheep, who counts them, who warns the operator.",
      blocks: [
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "Architecture 1", tab: "Arch. 1", blocks: [
                { h: "Zone Surveillance" },
                { steps: [
                  "Create the block <<Zone Surveillance>> with one state `Capturing`, do **Capture surrounding**.",
                  "Capture surrounding passes `Sheep Signature` and `Sheep Out Of Zone` on to Sheep Guard.",
                  "Add the part; connect it to the camera port of the drone and to Sheep Guard."
                ] },
                { h: "Sheep Guard" },
                { steps: [
                  "Guard sheep reacts to `Sheep Out Of Zone` with **Report Sheep Exit**: send `Sheep Exit Alert` to the base station.",
                  "Connect Sheep Guard to the base station link; propagate."
                ] }
              ] },
              "2": { label: "Architecture 2", tab: "Arch. 2", blocks: [
                { h: "Zone Surveillance" },
                { steps: [
                  "Add a second region to Patrolling: `Capturing`, do **Capture surrounding**, which passes the sheep observations on to SheepMonitoring.",
                  "Effect of Standby → Patrolling: **Announce Patrolling**, send `Patrolling` to SheepMonitoring."
                ] },
                { h: "SheepMonitoring" },
                { steps: [
                  "Create the block <<SheepMonitoring>>; transition `Sheep Monitoring` into it.",
                  "States: `Inactive` → `Sheep Monitoring` on `Patrolling`.",
                  "Sheep monitoring reacts to `Sheep Out Of Zone` with **Raise Sheep Exit Alert**: send `Sheep Exit Alert` to the base station.",
                  "Add the part; connect it to Zone Surveillance and the base station link, and the camera port to Zone Surveillance; propagate."
                ] }
              ] },
              "3": { label: "Architecture 3", tab: "Arch. 3", blocks: [
                { h: "Zone Patrolling" },
                { steps: ["Add a second region to Active: `Capturing`, do **Capture surrounding**, which sends each sheep observation to the orchestrator."] },
                { h: "SheepMonitoring" },
                { steps: [
                  "Create the block <<SheepMonitoring>>; transition `Sheep Monitoring` into it.",
                  "States: `Inactive` → `Sheep Monitoring` on `Patrolling`.",
                  "Sheep monitoring reacts to `Sheep Out Of Zone` with **Report Sheep Exit**: send `Sheep Exit Alert` to the orchestrator."
                ] },
                { h: "Mission Orchestrator" },
                { steps: [
                  "Start Patrol also sends `Patrolling` to SheepMonitoring. Dispatching passes the sheep observations on to it.",
                  "Patrolling passes `Sheep Exit Alert` on to the base station.",
                  "Add the part; connect the orchestrator to SheepMonitoring and the base station link, and the camera port to Zone Patrolling; propagate."
                ] }
              ] }
            }
          }
        }
      ]
    },
    {
      id: "sheep-check", ch: "build", kind: "do",
      title: "2 · A sheep strays: validate",
      lead: "The sheep watch must be on, and stay on, while the operator is warned.",
      blocks: [
        { widget: "stageCheck", opts: { stage: "sheep" } }
      ]
    },

    /* 3 · bear */
    {
      id: "bear-goal", ch: "build", kind: "try",
      title: "3 · A bear: the goal",
      lead: "A bear enters the tracking zone: the drone follows it and the sheep watch pauses. When the bear leaves, the drone goes back to patrolling.",
      blocks: [
        { widget: "archSim", opts: { arch: "chosen", stage: "bear" } },
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "You will build: Predator Defense, and the hand-over in the orchestrator.", tab: "Arch. 1", blocks: [] },
              "2": { label: "You will build: Predator Management and the patch: it pauses SheepMonitoring and takes the AutoPilot.", tab: "Arch. 2", blocks: [] },
              "3": { label: "You will build: Predator Management, Tracking, and the decisions of the orchestrator.", tab: "Arch. 3", blocks: [] }
            }
          }
        }
      ]
    },
    {
      id: "bear-build", ch: "build", kind: "do",
      title: "3 · A bear: build it",
      lead: "Track the bear, pause the sheep watch, and put everything back when it leaves.",
      blocks: [
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "Architecture 1", tab: "Arch. 1", blocks: [
                { h: "Predator Defense" },
                { steps: [
                  "Create the block <<Predator Defense>>; transition `Predator Monitoring`, then `Predator Detected`.",
                  "States: `Disarmed` → `Predator Watch` → `Awaiting Control` (on a bear, effect **Request Takeover**: send `Takeover Request`) → `Predator Response` (on `Activate Predator Defense`).",
                  "Inside Predator Response: `Tracking Predator`, do **Track predator**: send `Tracking orders` to the AutoPilot.",
                  "Back to Predator Watch when the bear leaves, effect **Release Control**: send `Feature Done`."
                ] },
                { h: "Orchestrator and Zone Surveillance" },
                { steps: [
                  "Orchestrator: `Sheep Guard Active` → `Predator Defense Active` on `Takeover Request` (standby Sheep Guard, activate Predator Defense, alert the operator), and back on `Feature Done`.",
                  "Zone Surveillance passes the bear observations on to Predator Defense.",
                  "Add the part; connect it to the orchestrator, Zone Surveillance and the AutoPilot; propagate."
                ] },
                { solution: { label: "Show the target Predator Defense", blocks: [{ figure: { src: "assets/img/arch1-5-cible-stm-predator-defense.png", w: 942, h: 435, alt: "Target state machine of Predator Defense: Disarmed, Predator Watch, Awaiting Control, Predator Response with Tracking Predator and Deterring.", caption: "Predator Defense." } }] } }
              ] },
              "2": { label: "Architecture 2", tab: "Arch. 2", blocks: [
                { h: "Predator Management" },
                { steps: [
                  "Create the block <<Predator Management>>; transition `Predator Monitoring`, then `Predator Detected` as it is.",
                  "States: `Standby` → `Predator watch` on `Patrolling`. Inside: `No predator` ⇄ `Predator Detected`.",
                  "Entering Predator Detected, effect **Bear Detected**: send `Deactivate Sheep Monitoring` (the patch) and `Predator Alert`.",
                  "Start Predator Tracking sends `Tracking orders` to the AutoPilot. Leaving, effect **Bear Gone**: `Reactivate Sheep Monitoring`, `Resume Patrolling`, `Predator Cleared`."
                ] },
                { h: "The other side of the patch" },
                { steps: [
                  "SheepMonitoring: `Sheep Monitoring` ⇄ `Deactivated` on `Deactivate` / `Reactivate Sheep Monitoring`.",
                  "Zone Surveillance passes `Patrolling` and the bear observations on to Predator Management.",
                  "Add the part; connect it to Zone Surveillance, SheepMonitoring, the AutoPilot and the base station link; propagate."
                ] },
                { solution: { label: "Show the target Predator Management", blocks: [{ figure: { src: "assets/img/arch2-4-cible-stm-predator-management.png", w: 731, h: 689, alt: "Target state machine of Predator Management: Standby, Predator watch with No predator and Predator Detected, which holds Predator tracking and Predator counteraction.", caption: "Predator Management." } }] } }
              ] },
              "3": { label: "Architecture 3", tab: "Arch. 3", blocks: [
                { h: "Predator Management" },
                { steps: [
                  "Create the block <<Predator Management>>; transition `Predator Monitoring`.",
                  "States: `Standby` → `Predator watch` on `Patrolling`; inside, `Monitoring predators`.",
                  "Each bear observation becomes a request: send `Predator Tracking Request` when it enters, `Predator Tracking Release` when it leaves."
                ] },
                { h: "Tracking" },
                { steps: [
                  "Create the block <<Tracking>>; transition `Predator tracking`. Delete the transitions towards off-TO RENAME: they become requests.",
                  "States: `Tracking Idle` ⇄ `Tracking Target` (on `Start Tracking` / `Stop Tracking`).",
                  "**Compute tracking orders** sends `Tracking orders` to the orchestrator. Remove the decision and its self-sends: that decision now belongs to the orchestrator."
                ] },
                { h: "Mission Orchestrator" },
                { steps: [
                  "`Patrolling` → `Predator tracking` on `Predator Tracking Request`: stop the patrol, pause the sheep watch, start tracking, alert the operator.",
                  "Back to Patrolling on `Predator Tracking Release`: the reverse. Predator tracking passes `Tracking orders` on to the AutoPilot.",
                  "Dispatching passes the bear observations to Predator Management. Add the two parts; connect them to the orchestrator; propagate."
                ] }
              ] }
            }
          }
        }
      ]
    },
    {
      id: "bear-check", ch: "build", kind: "do",
      title: "3 · A bear: validate",
      lead: "The drone follows the bear, then patrols again with the sheep watch back on.",
      blocks: [
        { widget: "stageCheck", opts: { stage: "bear" } }
      ]
    },

    /* 4 · deter, on your own */
    {
      id: "deter-goal", ch: "build", kind: "try",
      title: "4 · Scare it off: the goal",
      lead: "When the bear comes too close to the flock, the drone flashes its light and sounds its horn; when it backs off, back to tracking. This one, you build alone.",
      blocks: [
        { widget: "archSim", opts: { arch: "chosen", stage: "deter" } },
        { p: "You thought it through in chapter 5: your answer is your plan." }
      ]
    },
    {
      id: "deter-build", ch: "build", kind: "do",
      title: "4 · Scare it off: on your own",
      lead: "The two questions again: who fires the transition, and who else wants to know?",
      blocks: [
        {
          steps: [
            "Which functional state does it, and which subsystem receives it?",
            "Who starts and stops the deterrence, and what travels for that?",
            "What does its function send, and to whom?",
            "Ports towards the light and the sound of the drone, connected to its boundary ports."
          ]
        },
        {
          solution: {
            label: "Show the solution",
            blocks: [{
              byChoice: {
                q: "q-arch",
                variants: {
                  "1": { label: "Architecture 1", tab: "Arch. 1", blocks: [{ list: [
                    "`Deterring` is already in Predator Response, with the triggers of the mission: nothing to change in the states, nor in the orchestrator.",
                    "Its do-activity, **Deter predator**, sends `Light burst` and `Sound burst` on two ports.",
                    "Connect those ports to the light and sound ports of the drone."
                  ] }] },
                  "2": { label: "Architecture 2", tab: "Arch. 2", blocks: [{ list: [
                    "`Predator counteraction` came with Predator Detected, triggers included.",
                    "Trigger predator counter actions: remove the self-send (the camera now says when the bear leaves), send `Light burst` and `Sound burst` on two ports.",
                    "Connect those ports to the light and sound ports of the drone."
                  ] }] },
                  "3": { label: "Architecture 3", tab: "Arch. 3", blocks: [
                    { list: [
                      "Transition `Predator counteraction` into Predator Management, as a second region: `Deterrence idle` ⇄ `Deterring` on `Engage Predator` / `Disengage Predator`.",
                      "Predator monitoring sends `Predator Engage Request` when the bear enters the safe perimeter, `Predator Disengage Request` when it leaves.",
                      "Trigger predator counter actions sends `Light burst` and `Sound burst` on two ports, connected to the light and sound ports of the drone.",
                      "Orchestrator: `Predator tracking` ⇄ `Predator counteraction` on the two requests, effects **Grant Engagement** / **Grant Disengagement**."
                    ] },
                    { figure: { src: "assets/img/arch3-5-cible-stm-predator-management.png", w: 418, h: 622, size: "sm", alt: "Target state machine of Predator Management of architecture 3: Standby, Predator watch with the regions monitoring and deterrence.", caption: "Predator Management." } },
                    { figure: { src: "assets/img/arch3-4-cible-stm-orchestrator.png", w: 921, h: 876, alt: "Target state machine of the Mission Orchestrator of architecture 3.", caption: "The orchestrator, complete." } }
                  ] }
                }
              }
            }]
          }
        }
      ]
    },
    {
      id: "deter-check", ch: "build", kind: "do",
      title: "4 · Scare it off: validate",
      lead: "Light and sound when the bear is too close, tracking again when it backs off, patrol when it is gone.",
      blocks: [
        { widget: "stageCheck", opts: { stage: "deter" } }
      ]
    },

    /* ───────────────────────── Debrief ───────────────────────── */
    {
      id: "tidy", ch: "end", kind: "do", mark: "intro",
      title: "Tidy up",
      lead: "Five commands that make the model readable by someone else, and check its wiring. Watch what each one does, then run them.",
      blocks: [
        { widget: "tidyDemo" },
        {
          steps: [
            "On the IBD of the SOI: {{Show Port Type Only}}, then {{Show STM Overview in Parts}}.",
            "On the package of the layer: {{Apply Layer Stereotypes}}, then {{Logical Organizer}}.",
            "On the IBD: {{Check Signal Flow}}, until nothing is reported."
          ]
        },
        {
          solution: {
            label: "Show the target IBD",
            blocks: [{
              byChoice: {
                q: "q-arch",
                variants: {
                  "1": { label: "Architecture 1", tab: "Arch. 1", blocks: [{ figure: { src: "assets/img/arch1-3-cible-ibd.png", w: 3236, h: 677, alt: "Target internal block diagram of architecture 1.", caption: "Architecture 1." } }] },
                  "2": { label: "Architecture 2", tab: "Arch. 2", blocks: [{ figure: { src: "assets/img/arch2-3-cible-ibd.png", w: 3563, h: 719, alt: "Target internal block diagram of architecture 2.", caption: "Architecture 2." } }] },
                  "3": { label: "Architecture 3", tab: "Arch. 3", blocks: [{ figure: { src: "assets/img/arch3-3-cible-ibd.png", w: 3090, h: 749, alt: "Target internal block diagram of architecture 3.", caption: "Architecture 3." } }] }
                }
              }
            }]
          }
        }
      ]
    },
    {
      id: "scenario", ch: "end", kind: "do",
      title: "The whole scenario",
      lead: "All the steps in a row. If each stage passed, this one does too.",
      blocks: [
        { widget: "stageCheck", opts: { stage: "full" } }
      ]
    },
    {
      id: "fixes", ch: "end", kind: "answer",
      title: "When a step fails",
      lead: "Each failed step names the subsystem and the state it expected. Three usual causes.",
      blocks: [
        {
          cards: [
            { n: "1", tone: "warn", title: "Stuck in a state", text: "It waits for a signal nobody sends: a send is missing in an effect, or a connector." },
            { n: "2", tone: "warn", title: "Signal lost", text: "Sent, and nothing moves: a port not connected, or a send that should have an **On Port**." },
            { n: "3", tone: "warn", title: "Wrong state", text: "Not the expected state: compare the names, and the order of the transitions." }
          ]
        },
        { notes: { id: "fixes", label: "What you had to correct", hint: "One line per correction: what was wrong, what you changed." } }
      ]
    },
    {
      id: "finish", ch: "end", kind: "answer", mark: "outro",
      title: "Your logical architecture",
      lead: "The drone is now a set of subsystems that share the mission and talk through ports, and your choice of who decides is visible in the model.",
      blocks: [
        { phases: "lg" },
        {
          widget: "phaseSteps", opts: {
            done: true,
            steps: [
              { pic: "cut", title: "Subsystems", text: "Your architecture, one level deep." },
              { pic: "share", title: "Behaviour", text: "Each subsystem carries its part of the mission." },
              { pic: "ports", title: "Interfaces", text: "Exchanges on ports instead of self-sends." },
              { pic: "verify", title: "Verify", text: "The scenario passes, step by step." }
            ]
          }
        },
        { widget: "recap" },
        { answers: true },
        { p: "Next, [Part 4](../part4/index.html): the system of interest becomes the whole solution, and one drone is not enough." }
      ]
    }
  ],

  authorNotes: [
    { scene: "three-archs", text: "The simulation runs part3/content/archs.js (written by scripts/make-part3-archs.py) with js/logical-engine.js. Captions, message labels, the highlighted patch exchange and the refused plan left out: config archs.story, archs.badges, archs[\"2\"].highlight, archs.leaveOut." },
    { scene: "build-plan", text: "Stages: config archs.stages. Each simulates only the parts built so far. Validate in Cameo sends the signals to the simulation over the relay (simtest/start, send, states, stop: allow-list of RpcDispatcher) and reads the states back; parts are addressed by the name of their type. If the plugin is too old, the button offers the scenario file." },
    { scene: "an-perf", text: "The latencies (8 ms per interface, 4 ms per subsystem) are illustrative, not measured." },
    { scene: "load-model", text: "The ids in part3/content/model-links.js come from the correction project; the starting model must be cut from it (handoff README §4) for them to hold. Otherwise the chips fall back to the names." },
    { scene: "trade-off", text: "The scores of the star diagram (config archs.*.score, axes in archs.axes) are a reading of the three fiches, not measured. Adjust them." },
    { scene: "launch-build", text: "Stage texts follow transition-features-mission.md, split by scenario event. State and function names are kept as in the model, typos included (Perimiter, surounding)." }
  ]
};
