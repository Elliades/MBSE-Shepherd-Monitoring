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
     4. before any click, define its logic: role, content, interactions, steps; then our proposal;
     5. everybody builds that proposal, one scenario event at a time: see the result, build it, validate. The
        subsystems are ready in the model: the student makes the states of the decider, and connects. Start, patrol,
        a sheep strays, a bear, scare it off. Only the patch of architecture 2 stays to design;
     6. tidy up, the whole scenario.
   The crash is not part of this TP: the architectures have no crash signals and no System Monitoring Safety.

   Source: the TP handoff of the OMF plugin docs (docs/pasture-sentinel/tp/) and the correction specs
   (drone-archs/). Figures: part3/assets/img/. Widgets: js/widgets-logical.js. Architectures:
   part3/content/archs.js and `archs` in part3/content/config.js. */
/* Two gestures of every build scene, given once here and repeated as tips: students looked for them elsewhere. */
const TIP_TRIGGER = {
  tip: {
    label: "How to: a trigger, an effect",
    blocks: [
      { list: [
        "The **trigger** is the signal that fires the transition: the arrow is followed when this signal arrives.",
        "The **effect** is the function run while the transition is followed, before the next state is entered: here, it sends the signals that tell the others."
      ] },
      { list: [
        "**Trigger, by name**: select the transition on the diagram, press **F2**, type the start of the signal name, then **Ctrl+Space**: pick the signal in the list.",
        "**Trigger, by drag and drop**: drag the signal from the Model Browser and drop it on the transition.",
        "**Effect**: drag the function (an activity) from the Model Browser and drop it on the transition; the label becomes `Trigger / Effect`.",
        "Check: double-click the transition; **Trigger** and **Effect** are filled in its specification."
      ] }
    ]
  }
};
const TIP_PORTS = {
  tip: {
    label: "How to: show the ports of a part",
    blocks: [
      { list: [
        "On the IBD, right-click the part → {{Display > Display Parts/Ports}}.",
        "In the dialog, tick the ports you need, then **OK**: they appear on the border of the part.",
        "Drag each port to the side of its partner: the connectors stay short and readable.",
        "To draw a connector, pick **Connector** in the palette, click one port, then the other."
      ] }
    ]
  }
};

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
    { id: "think", code: "5", title: "Define its logic", blurb: "Role, content, interactions, steps.", phase: "lg" },
    { id: "build", code: "6", title: "Build and validate", blurb: "The result to reach, one event at a time.", phase: "lg" },
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
            { n: "3", title: "Define its logic, build it", text: "Its role first; then, event by event, a scenario that grows." }
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
      lead: "This part uses the logical commands of the plugin. Install version 1.2.0 again, even if you already have one.",
      blocks: [
        {
          tabs: [
            {
              label: "Standard", sub: "Cameo's plugin manager",
              blocks: [
                { download: { label: "Plugin to install", file: "com.elliades.isae.mbseShepherd_1.2.0.zip", src: "../assets/plugins/com.elliades.isae.mbseShepherd_1.2.0.zip", size: "21 MB" } },
                {
                  steps: [
                    "In Cameo, choose {{Help > Resource & Plugin Manager}}, then click {{Import}}.",
                    "Select the plugin file you downloaded."
                  ]
                },
                {
                  callout: {
                    tone: "warn", title: "Restart MagicDraw",
                    text: "Close and restart Cameo (MagicDraw) once the plugin is imported. The plugin is only loaded at startup."
                  }
                }
              ]
            },
            {
              label: "No admin rights", sub: "a script, no installer",
              blocks: [
                { download: { label: "Plugin archive", file: "com.elliades.isae.mbseShepherd_1.2.0.zip", src: "../assets/plugins/com.elliades.isae.mbseShepherd_1.2.0.zip", size: "21 MB" } },
                { download: { label: "Install script", file: "install-plugin.ps1", src: "../assets/plugins/install-plugin.ps1", size: "2 KB" } },
                {
                  steps: [
                    "Save both files in the same folder, for example your Downloads folder.",
                    "Close Cameo (MagicDraw) if it is open.",
                    "Open the folder, right-click **install-plugin.ps1** and choose **Run with PowerShell**.",
                    "Wait for the line **Plugin installed**, then press Enter to close the window."
                  ]
                },
                {
                  copy: { label: "If Windows refuses to run the script, run this in that folder", value: "powershell -ExecutionPolicy Bypass -File .\\install-plugin.ps1" }
                },
                {
                  callout: {
                    tone: "tip", title: "No administrator rights needed",
                    text: "The script copies the plugin into your own user folder: %LOCALAPPDATA%\\.magic.systems.of.systems.architect\\2026x. Nothing is written to Program Files."
                  }
                },
                {
                  callout: {
                    tone: "warn", title: "Restart MagicDraw",
                    text: "Start Cameo (MagicDraw) after the script has finished. The plugin is only loaded at startup."
                  }
                }
              ]
            },
            {
              label: "No script", sub: "3 steps, by hand",
              blocks: [
                { download: { label: "Plugin archive", file: "com.elliades.isae.mbseShepherd_1.2.0.zip", src: "../assets/plugins/com.elliades.isae.mbseShepherd_1.2.0.zip", size: "21 MB" } },
                {
                  copy: { label: "Your Cameo folder (no 2026x folder? create it)", value: "%LOCALAPPDATA%\\.magic.systems.of.systems.architect\\2026x" }
                },
                {
                  steps: [
                    "Close Cameo. Open a Windows Explorer window, **paste the path above** in its address bar and press Enter.",
                    "**Move the zip there**, then right-click it and choose **Extract here** (or **Extract All…** and give the same path).",
                    "Check that **data**, **plugins** and **profiles** are there, then start Cameo."
                  ]
                },
                { widget: "pluginExtract", opts: { path: "%LOCALAPPDATA%\\.magic.systems.of.systems.architect\\2026x" } }
              ]
            }
          ]
        }
      ]
    },
    {
      id: "load-model", ch: "setup", kind: "do",
      title: "Open the starting model",
      lead: "The functional mission is done, and the power-on and the base station are ready. This first model is for Mission Configuration; after your choice, you will open the model of your architecture.",
      blocks: [
        { download: { label: "Starting model", file: "UAV_Part3_Init_MissionConfiguration.mdzip", src: "assets/models/UAV_Part3_Init_MissionConfiguration.mdzip", size: "1.2 MB" } },
        { download: { label: "Its profile", file: "ISAE-Profile.mdzip", src: "assets/models/ISAE-Profile.mdzip", size: "160 KB" } },
        {
          steps: [
            "Download both files **into the same folder**, then open the model ({{File > Open Project}}). Without the profile next to it, Cameo stops on a dialog. Do not unzip the .mdzip.",
            "Open [[la-pkg]], then **TP - Logical Architecture**: its technical blocks are already wired.",
            "Link this guide to Cameo with the **Cameo** button at the top: the chips show the elements in your model, and the **Validate in Cameo** buttons run the scenarios for you."
          ]
        },
        { pair: true },
        {
          callout: {
            tone: "goal", title: "Given, and to do",
            text: "Given here: power-on, base station link, the simulation drivers. You build Mission Configuration. In chapter 6, the model of your architecture (in the same folder as the profile) gives you Mission Configuration ready, the AutoPilot and the mission subsystems: you make the logic of your choice, and you connect."
          }
        }
      ]
    },

    {
      id: "commands", ch: "setup", kind: "read",
      title: "The commands we added",
      lead: "The plugin adds {{MBSE Shepherd}} to the right-click menu. Three commands help at any time, so try them whenever you want. The others are explained when you need them.",
      blocks: [
        {
          widget: "signalTable", opts: {
            head: ["At any time", "Right-click", "What it does"],
            rows: [
              ["{{Show STM Overview in Parts}}", "An IBD, or a part on it", "Draws its state machine inside each part: you see who does what. {{Hide STM Overview in Parts}} removes it."],
              ["{{Simulation Scenarios}}", "Anywhere in the model", "Opens the panel that plays a scenario step by step, and shows the states it goes through."],
              ["{{Check Signal Flow}}", "An IBD, its block, or a part", "Checks that the signals reach someone, and lists what is wrong. It changes nothing in the model."]
            ]
          }
        },
        { h: "Explained later" },
        {
          list: [
            "{{Logical Transition}}: chapter 3, in **By hand, or with Logical Transition**.",
            "{{Create All Missing Signal Ports}}: chapter 3, in **Ports: the magic button**.",
            "{{Delegate to external systems}}: chapter 3, in **The verdict is not on a port**.",
            "{{Merge Ports}} and {{Show Port Type Only}}: chapter 3, in **Ports: merge what belongs together**.",
            "{{Apply Layer Stereotypes}} and {{Logical Organizer}}: in the debrief, in **Tidy up**."
          ]
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
            "**Interfaces defined**: ports, and the connectors that carry the signals."
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
       It comes before the choice of an architecture, so it has its own starting model, without the AutoPilot. The
       model of each architecture, in chapter 6, gives it ready. */
    {
      id: "mission", ch: "example", kind: "read", mark: "intro",
      title: "The starting point: the functional mission",
      lead: "Every subsystem starts from some states of one state machine, [[fa-mission]], at the root of the model.",
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
        { widget: "behaviourAB" },
        {
          callout: {
            tone: "note", title: "Two layers, two colours",
            text: "**A**, in blue, is the functional level: the function of the mission. **B**, in green, is the logical level: a function of the subsystem. Same name, **not the same function**: the logical `Load Flight Plan` belongs to Mission Configuration, and refines the functional one («refine»)."
          }
        }
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
        { path: "tp-components" },
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
      lead: "Create the subsystem, and let Logical Transition copy Undeployed into it. The starting model is ready for you: work in **TP - Logical Architecture**.",
      blocks: [
        { figure: { src: "assets/img/fonctionnel-undeployed.png", w: 552, h: 289, size: "sm", alt: "Functional state Undeployed: Off, Start SOI to Unconfigured; Unconfigured, on FlightPlan, FlightPlan Correct or FlightPlan Incorrect, to Configured, which runs Load Flight Plan; FlightPlan Check Failed back to Unconfigured; Ready for mission to Ready for Mission, which runs Start subsystems.", caption: "What you transition: Undeployed, in the functional mission." } },
        { path: "tp-components" },
        {
          steps: [
            "In [[tp-components]], create a **logical component** (a block with the stereotype «Logical Component»): <<Mission Configuration>>.",
            "In [[fa-mission]], select `Undeployed`, then {{MBSE Shepherd > Logical Transition}} and pick **Mission Configuration**."
          ]
        },
        { figure: { src: "assets/img/mc-stm-correction.png", w: 621, h: 430, size: "sm", alt: "State machine Mission Configuration. Undeployed: initial state to Off; Off, on Start SOI, to Unconfigured; Unconfigured, on FlightPlan, FlightPlan Correct or FlightPlan Incorrect, to Configured, which runs Load Flight Plan; FlightPlan Check Failed back to Unconfigured; Ready for mission to Ready for Mission, which runs Start subsystems. Then Start Sheep Guard Mission to Deployed.", caption: "The correction. For now, Deployed is still off-TO RENAME in your model and the initial state is missing: the next scene finishes them." } }
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
      title: "Ports: merge what belongs together",
      lead: "The plugin made one port per signal; you decide which signals form one exchange.",
      blocks: [
        { widget: "mcPorts" },
        {
          steps: [
            "Select `flight_plan`, `flightplan_correct`, `flightplan_incorrect` and `start_sheep_guard` → {{Merge Ports}}. Rename the port <<p_BaseStation>>.",
            "Same gesture on `ready_mission_ext` and `flightplan_check_failed_ext`: <<p_Verdict>>. Rename `start_soi` <<p_Init>>, and `start_sheep_guard_mission_ext` <<p_StartOrder>>.",
            "Connect `p_Init` to Manual Initialization. Connect `p_BaseStation` and `p_Verdict` to the two ports of the base station link that face them. `p_StartOrder` waits for your architecture."
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
        { widget: "archSim", opts: { arch: "3", stage: "prep", validate: true, cameo: "tp" } },
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
            blocks: [{ p: "With **1** and **3**, the guide shows every state to make. With **2**, there is less to make, but you design the patch yourself." }]
          }
        }
      ]
    },

    /* ───────────────────────── 5 · Define the logic ─────────────────────────
       Before any click, whatever the choice: role, content, interactions, steps. Then our proposal, which everybody
       builds: chapter 6 leaves no doubt on what to make. Only the patch stays to design. */
    {
      id: "logic-what", ch: "think", kind: "answer", mark: "intro",
      title: "The logic of your architecture",
      lead: "The rest of the drone exists, or nearly. What matters is the piece that decides. Before any click: what is it?",
      blocks: [
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "In your architecture, it is the **Mission Orchestrator**.", tab: "Arch. 1", blocks: [{ widget: "logicSpot", opts: { arch: "1", noNote: true } }] },
              "2": { label: "In your architecture, there is no orchestrator: it is **the patch**, what you add to a drone that already patrols and watches the sheep.", tab: "Arch. 2", blocks: [{ widget: "logicSpot", opts: { arch: "2", noNote: true } }] },
              "3": { label: "In your architecture, it is the **Mission Orchestrator**.", tab: "Arch. 3", blocks: [{ widget: "logicSpot", opts: { arch: "3", noNote: true } }] }
            }
          }
        },
        { question: { id: "q-role", type: "text", prompt: "**Its role.** What does it decide, and what does it leave to the others?", hint: "One or two sentences." } },
        { question: { id: "q-content", type: "text", prompt: "**Its content.** Which main states would you give it? Names only, no detail.", hint: "For example: waiting, on the way…" } },
        { question: { id: "q-links", type: "text", prompt: "**Its interactions.** What does it receive, and from whom? What does it send, and to whom?", hint: "Subsystem by subsystem, in words." } }
      ]
    },
    {
      id: "logic-steps", ch: "think", kind: "answer",
      title: "Your steps",
      lead: "Now the order. To get from here to a drone that plays the whole scenario: what do you make, what do you connect, and when can you check it?",
      blocks: [
        { widget: "scenarioGrow" },
        {
          question: {
            id: "q-plan", type: "list", itemLabel: "Step", initial: 4,
            prompt: "One line per step: what you make, what you connect, which event of the scenario then works."
          }
        },
        { p: "A good plan starts small: one connection, one event, one check. Then the next." }
      ]
    },
    {
      id: "logic-ours", ch: "think", kind: "try", mark: "outro",
      title: "Our proposal",
      lead: "Compare it with yours. A different answer is not a wrong one, but from here on everybody builds this one: it is what the checks expect.",
      blocks: [
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "Architecture 1 · the Mission Orchestrator", tab: "Arch. 1", blocks: [
                { list: [
                  "**Role**: it only chooses **which feature is active**. The active feature decides the rest, and drives the AutoPilot.",
                  "**Content**: Idle, then Mission: in transit, Sheep Guard active, or Predator Defense active. Play the stages below to see it grow."
                ] },
                { widget: "deciderStm", opts: { arch: "1", grow: true } },
                { h: "Its interactions" },
                { widget: "interactions", opts: { arch: "1", part: "orch" } },
                { h: "The steps" },
                { cards: [
                  { n: "1", icon: "waypoint", title: "Start", text: "Connect the orchestrator to Mission Configuration and the AutoPilot; its first states." },
                  { n: "2", icon: "waypoint", title: "Patrol", text: "One state more; Sheep Guard is ready: connect it." },
                  { n: "3", icon: "flag", title: "A sheep strays", text: "No state: Zone Surveillance is ready, connect it." },
                  { n: "4", icon: "alert", tone: "warn", title: "A bear", text: "One state more, the hand-over; Predator Defense is ready: connect it." },
                  { n: "5", icon: "bulb", tone: "tip", title: "Scare it off", text: "No state: connect the light and the horn." }
                ] }
              ] },
              "2": { label: "Architecture 2 · the patch", tab: "Arch. 2", blocks: [
                { list: [
                  "**Role**: add the predator feature **without reworking** what works. Nothing decides for the others: the new subsystem deals with what it disturbs.",
                  "**Content**: no new deciding block. What is new is small: in Predator Management and in SheepMonitoring.",
                  "**Interactions**: Predator Management talks to the AutoPilot, as a new master; and to SheepMonitoring, which it disturbs. That exchange is the patch."
                ] },
                { widget: "logicSpot", opts: { arch: "2" } },
                { h: "The steps" },
                { cards: [
                  { n: "1", icon: "waypoint", title: "Start", text: "Connect Mission Configuration to the AutoPilot." },
                  { n: "2", icon: "waypoint", title: "Patrol", text: "Zone Surveillance is ready: connect it." },
                  { n: "3", icon: "flag", title: "A sheep strays", text: "SheepMonitoring is ready: connect it." },
                  { n: "4", icon: "alert", tone: "warn", title: "A bear", text: "Predator Management is ready: connect it, see what breaks, and **design your patch**." },
                  { n: "5", icon: "bulb", tone: "tip", title: "Scare it off", text: "Connect the light and the horn." }
                ] },
                { callout: { tone: "goal", title: "Yours to design", text: "We do not give the patch here. The drone is yours to patch at step 4: you will see what breaks, then decide how to repair it." } }
              ] },
              "3": { label: "Architecture 3 · the Mission Orchestrator", tab: "Arch. 3", blocks: [
                { list: [
                  "**Role**: it receives everything and decides everything, by priority: bear first, then sheep and patrol. The others only report and ask.",
                  "**Content**: Idle, then Mission: in transit, patrolling, tracking, counteracting; and a second region that dispatches the observations. Play the stages below to see it grow."
                ] },
                { widget: "deciderStm", opts: { arch: "3", grow: true } },
                { h: "Its interactions" },
                { widget: "interactions", opts: { arch: "3", part: "orch" } },
                { h: "The steps" },
                { cards: [
                  { n: "1", icon: "waypoint", title: "Start", text: "Connect the orchestrator to Mission Configuration and the AutoPilot; its first states." },
                  { n: "2", icon: "waypoint", title: "Patrol", text: "One state more; Zone Patrolling is ready: connect it." },
                  { n: "3", icon: "flag", title: "A sheep strays", text: "The dispatch region; SheepMonitoring is ready: connect it." },
                  { n: "4", icon: "alert", tone: "warn", title: "A bear", text: "One state more; Predator Management and Tracking are ready: connect them." },
                  { n: "5", icon: "bulb", tone: "tip", title: "Scare it off", text: "One state more; connect the light and the horn." }
                ] }
              ] }
            }
          }
        }
      ]
    },

    /* ───────────────────────── 6 · Build and validate ───────────────────────── */
    {
      id: "build-plan", ch: "build", kind: "read", mark: "intro",
      title: "See the result, build it, watch the scenario grow",
      lead: "One event of the scenario at a time. Each stage shows the result to reach, gesture by gesture; you make it, and the scenario goes one event further.",
      blocks: [
        { widget: "scenarioGrow" },
        {
          byChoice: {
            q: "q-arch", change: true,
            variants: {
              "1": { label: "You are building **architecture 1**, the feature orchestrator.", tab: "Arch. 1", blocks: [
                { download: { label: "Your starting model", file: "UAV_Part3_Init_Arch1_FeatureOrchestrator.mdzip", src: "assets/models/UAV_Part3_Init_Arch1_FeatureOrchestrator.mdzip", size: "1.3 MB" } },
                { p: "Download it next to `ISAE-Profile.mdzip`, then open it." },
                { cards: [
                  { n: "✓", icon: "check", title: "Ready in the model", text: "**Mission Configuration**, connected. **Sheep Guard**, **Zone Surveillance**, **Predator Defense**: states, functions and ports. The **Mission Orchestrator**: its ports and functions, with an empty state machine." },
                  { n: "→", icon: "bulb", tone: "tip", title: "Yours", text: "The **states and transitions** of the orchestrator, and the **connectors**." }
                ] }
              ] },
              "2": { label: "You are building **architecture 2**, the patch.", tab: "Arch. 2", blocks: [
                { download: { label: "Your starting model", file: "UAV_Part3_Init_Arch2_Patch.mdzip", src: "assets/models/UAV_Part3_Init_Arch2_Patch.mdzip", size: "1.3 MB" } },
                { p: "Download it next to `ISAE-Profile.mdzip`, then open it." },
                { cards: [
                  { n: "✓", icon: "check", title: "Ready in the model", text: "**Mission Configuration**, connected. **Zone Surveillance**, **SheepMonitoring**, **Predator Management**: states, functions and ports. They do not know about each other's conflicts yet." },
                  { n: "→", icon: "bulb", tone: "tip", title: "Yours", text: "The **connectors**, then **the patch**: you design it." }
                ] }
              ] },
              "3": { label: "You are building **architecture 3**, the central orchestrator.", tab: "Arch. 3", blocks: [
                { download: { label: "Your starting model", file: "UAV_Part3_Init_Arch3_CentralOrchestrator.mdzip", src: "assets/models/UAV_Part3_Init_Arch3_CentralOrchestrator.mdzip", size: "1.3 MB" } },
                { p: "Download it next to `ISAE-Profile.mdzip`, then open it." },
                { cards: [
                  { n: "✓", icon: "check", title: "Ready in the model", text: "**Mission Configuration**, connected. **Zone Patrolling**, **SheepMonitoring**, **Predator Management**, **Tracking**: states, functions and ports. The **Mission Orchestrator**: its ports and functions, with an empty state machine." },
                  { n: "→", icon: "bulb", tone: "tip", title: "Yours", text: "The **states and transitions** of the orchestrator, and the **connectors**." }
                ] }
              ] }
            }
          }
        },
        {
          callout: {
            tone: "note", title: "State names matter",
            text: "Type the state names exactly as given: the validation checks them."
          }
        }
      ]
    },

    /* 1 · start */
    {
      id: "start-build", ch: "build", kind: "do",
      title: "1 · Start the mission: build it",
      lead: "Mission Configuration says go. The drone must hear it, and fly to the safe area.",
      blocks: [
        { widget: "scenarioGrow", opts: { stage: "start" } },
        TIP_TRIGGER, TIP_PORTS,
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "Architecture 1", tab: "Arch. 1", blocks: [
                { h: "The result to reach" },
                { widget: "deciderStm", opts: { arch: "1", stage: "start" } },
                { steps: [
                  "Open [[tp1-orch-stm|the state machine of Mission Orchestrator]]: it is empty.",
                  "Create the states <<Idle>> and <<Mission>>; inside Mission, <<Transit>>. Add the two initial states.",
                  "Draw the transition from `Idle` to `Mission`. Double-click it: **Trigger** `Start Sheep Guard Mission_ext`. **Effect**: drag [[tp1-fn-send-to-safe-area|Send To Safe Area]] on the transition."
                ] },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "1", stage: "start" } },
                { steps: [
                  "Open [[tp1-ibd]]: Mission Configuration is on it, connected. Drag [[tp1-orch]] on it. Do not create a part by hand.",
                  "Show its ports: right-click the part → **Display > Display Parts/Ports**.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] }
              ] },
              "2": { label: "Architecture 2", tab: "Arch. 2", blocks: [
                { p: "No orchestrator here: the AutoPilot takes the start order directly. Nothing to create, only to connect." },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "2", stage: "start" } },
                { steps: [
                  "Open [[tp2-ibd]]: Mission Configuration is on it, connected to the power-on and the base station.",
                  "Connect its port `p_StartOrder` to the AutoPilot."
                ] }
              ] },
              "3": { label: "Architecture 3", tab: "Arch. 3", blocks: [
                { h: "The result to reach" },
                { widget: "deciderStm", opts: { arch: "3", stage: "start" } },
                { steps: [
                  "Open [[tp3-orch-stm|the state machine of Mission Orchestrator]]: it is empty.",
                  "Create the states <<Idle>> and <<Mission>>; inside Mission, <<Transit>>. Add the two initial states.",
                  "Draw the transition from `Idle` to `Mission`. Double-click it: **Trigger** `Start Sheep Guard Mission_ext`. **Effect**: drag [[tp3-fn-send-to-safe-area|Send To Safe Area]] on the transition."
                ] },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "3", stage: "start" } },
                { steps: [
                  "Open [[tp3-ibd]]: Mission Configuration is on it, connected.",
                  "Drag [[tp3-orch]] on the diagram. Show its ports: right-click the part → **Display > Display Parts/Ports**.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] }
              ] }
            }
          }
        }
      ]
    },
    {
      id: "start-check", ch: "build", kind: "do",
      title: "1 · Start the mission: validate",
      lead: "Watch it here, then send the same signals to your model. What is wrong shows in red.",
      blocks: [
        { widget: "archSim", opts: { arch: "chosen", stage: "start", validate: true, cameo: "tp" } }
      ]
    },

    /* 2 · patrol */
    {
      id: "patrol-build", ch: "build", kind: "do",
      title: "2 · Patrol: build it",
      lead: "The drone has arrived: now it must follow its watch path. The subsystem that computes the path is ready: it only has to be started, and connected.",
      blocks: [
        { widget: "scenarioGrow", opts: { stage: "patrol" } },
        TIP_TRIGGER, TIP_PORTS,
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "Architecture 1", tab: "Arch. 1", blocks: [
                { h: "The result to reach" },
                { widget: "deciderStm", opts: { arch: "1", stage: "patrol" } },
                { steps: [
                  "In [[tp1-orch-stm|the state machine of Mission Orchestrator]], inside Mission, create <<Sheep Guard Active>>.",
                  "Draw the transition from `Transit` to `Sheep Guard Active`: **Trigger** `Arrived At Safe Area`. **Effect**: drag [[tp1-fn-start-guard|Start Guard]] on the transition."
                ] },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "1", stage: "patrol" } },
                { steps: [
                  "In [[tp1-ibd]], drag [[tp1-sg]] on the diagram and show its ports. It is ready: states, functions, ports.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] }
              ] },
              "2": { label: "Architecture 2", tab: "Arch. 2", blocks: [
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "2", stage: "patrol" } },
                { steps: [
                  "In [[tp2-ibd]], drag [[tp2-zs]] on the diagram and show its ports. It is ready: states, functions, ports.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] }
              ] },
              "3": { label: "Architecture 3", tab: "Arch. 3", blocks: [
                { h: "The result to reach" },
                { widget: "deciderStm", opts: { arch: "3", stage: "patrol" } },
                { steps: [
                  "In [[tp3-orch-stm|the state machine of Mission Orchestrator]], inside Mission, create <<Patrolling>>. Drag [[tp3-fn-supervise-patrol|Supervise Patrol]] on it → {{Do Activity}}.",
                  "Draw the transition from `Transit` to `Patrolling`: **Trigger** `Arrived At Safe Area`. **Effect**: drag [[tp3-fn-start-patrol|Start Patrol]] on the transition."
                ] },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "3", stage: "patrol" } },
                { steps: [
                  "In [[tp3-ibd]], drag [[tp3-zp]] on the diagram and show its ports. It is ready: states, functions, ports.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] }
              ] }
            }
          }
        }
      ]
    },
    {
      id: "patrol-check", ch: "build", kind: "do",
      title: "2 · Patrol: validate",
      lead: "Same scenario step, one subsystem more: this time the drone ends on its watch path.",
      blocks: [
        { widget: "archSim", opts: { arch: "chosen", stage: "patrol", validate: true, cameo: "tp" } }
      ]
    },

    /* 3 · sheep */
    {
      id: "sheep-build", ch: "build", kind: "do",
      title: "3 · A sheep strays: build it",
      lead: "The camera sees the flock, then a sheep outside the zone: the operator must be warned.",
      blocks: [
        { widget: "scenarioGrow", opts: { stage: "sheep" } },
        TIP_PORTS, TIP_TRIGGER,
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "Architecture 1", tab: "Arch. 1", blocks: [
                { p: "No state to add: Sheep Guard already counts the sheep. It only needs to see them." },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "1", stage: "sheep" } },
                { steps: [
                  "In [[tp1-ibd]], drag [[tp1-zs]] on the diagram and show its ports.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] }
              ] },
              "2": { label: "Architecture 2", tab: "Arch. 2", blocks: [
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "2", stage: "sheep" } },
                { steps: [
                  "In [[tp2-ibd]], drag [[tp2-sm]] on the diagram and show its ports.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] }
              ] },
              "3": { label: "Architecture 3", tab: "Arch. 3", blocks: [
                { h: "The result to reach" },
                { widget: "deciderStm", opts: { arch: "3", stage: "sheep" } },
                { steps: [
                  "In [[tp3-orch-stm|the state machine of Mission Orchestrator]], right-click `Mission` → {{Add New Region}}: it now has a **second region**.",
                  "In it, create <<Dispatching>> and its initial state. Drag [[tp3-fn-dispatch-observations|Dispatch observations]] on it → {{Do Activity}}."
                ] },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "3", stage: "sheep" } },
                { steps: [
                  "In [[tp3-ibd]], drag [[tp3-sm]] on the diagram and show its ports.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] }
              ] }
            }
          }
        }
      ]
    },
    {
      id: "sheep-check", ch: "build", kind: "do",
      title: "3 · A sheep strays: validate",
      lead: "The sheep watch must be on, and stay on, while the operator is warned.",
      blocks: [
        { widget: "archSim", opts: { arch: "chosen", stage: "sheep", validate: true, cameo: "tp" } }
      ]
    },

    /* 4 · bear */
    {
      id: "bear-build", ch: "build", kind: "do",
      title: "4 · A bear: build it",
      lead: "A bear enters the tracking zone: the drone follows it and the sheep watch pauses. When it leaves, everything goes back as it was.",
      blocks: [
        { widget: "scenarioGrow", opts: { stage: "bear" } },
        TIP_TRIGGER, TIP_PORTS,
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "Architecture 1", tab: "Arch. 1", blocks: [
                { h: "The result to reach" },
                { widget: "deciderStm", opts: { arch: "1", stage: "bear" } },
                { steps: [
                  "In [[tp1-orch-stm|the state machine of Mission Orchestrator]], inside Mission, create <<Predator Defense Active>>.",
                  "Draw the transition from `Sheep Guard Active` to it: **Trigger** `Takeover Request`. **Effect**: drag [[tp1-fn-hand-over-to-predator-defense|Hand Over To Predator Defense]] on the transition.",
                  "And the way back: **Trigger** `Feature Done`. **Effect**: drag [[tp1-fn-hand-back-to-sheep-guard|Hand Back To Sheep Guard]] on the transition."
                ] },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "1", stage: "bear" } },
                { steps: [
                  "In [[tp1-ibd]], drag [[tp1-pd]] on the diagram and show its ports. It already decides how to track the bear.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] }
              ] },
              "2": { label: "Architecture 2", tab: "Arch. 2", blocks: [
                { h: "Plug it in" },
                { widget: "stageIbd", opts: { arch: "2", stage: "raw" } },
                { steps: [
                  "In [[tp2-ibd]], drag [[tp2-pm]] on the diagram and show its ports.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] },
                { h: "Play it: what goes wrong?" },
                { p: "It works on its own, but nobody told the others. Press **Next step**, twice: each time, one check stays red. Find out why." },
                { widget: "archSim", opts: { arch: "2", stage: "raw" } },
                { h: "Your patch" },
                { list: [
                  "While the bear is there, the sheep watch must be **off**; afterwards, **on** again.",
                  "When the bear leaves, the drone must go **back to its path**. The AutoPilot already understands `Resume Patrolling`.",
                  "**Free**: the names of your signals and of your state, how many you need. The rule: touch as little as you can."
                ] },
                { notes: { id: "patch", label: "Your patch, before you click", hint: "Which subsystem changes? What new exchange? What new state?" } },
                { tip: { label: "Stuck? Who knows, who must react", blocks: [{ p: "**Predator Management** knows about the bear. **SheepMonitoring** must react, and it has no idea: it needs a state where it does nothing, and a signal from Predator Management to get there and back." }] } },
                { tip: { label: "Stuck? The gestures", blocks: [
                  { steps: [
                    "In [[tp2-sm-stm|the state machine of SheepMonitoring]]: the new state, and its two transitions.",
                    "In [[tp2-pm-stm|the state machine of Predator Management]]: the effects of the transitions of `Predator Detected`, `Bear Detected` and `Bear Gone`, send your signals.",
                    "On the IBD, right-click each of the two parts → {{Create All Missing Signal Ports}}, then connect the new ports.",
                    "On Predator Management, `resume_patrolling` talks to the AutoPilot like `p_AutoPilot`: select both → {{Merge Ports}}, or Check Signal Flow will report it."
                  ] }
                ] } },
                { solution: { label: "Show our patch", blocks: [
                  { widget: "deciderStm", opts: { arch: "2", stage: "bear" } },
                  { p: "Yours may differ: the validation only asks that the sheep watch has left `Sheep Monitoring` while the bear is there, and that everything is back afterwards." }
                ] } }
              ] },
              "3": { label: "Architecture 3", tab: "Arch. 3", blocks: [
                { h: "The result to reach" },
                { widget: "deciderStm", opts: { arch: "3", stage: "bear" } },
                { steps: [
                  "In [[tp3-orch-stm|the state machine of Mission Orchestrator]], in the first region of Mission, create <<Predator tracking>>. Drag [[tp3-fn-start-and-relay-tracking|Start And Relay Tracking]] on it → {{Do Activity}}.",
                  "Draw the transition from `Patrolling` to it: **Trigger** `Predator Tracking Request`. **Effect**: drag [[tp3-fn-grant-tracking|Grant Tracking]] on the transition.",
                  "And the way back: **Trigger** `Predator Tracking Release`. **Effect**: drag [[tp3-fn-resume-patrol|Resume Patrol]] on the transition."
                ] },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "3", stage: "bear" } },
                { steps: [
                  "In [[tp3-ibd]], drag [[tp3-pm]] and [[tp3-trk]] on the diagram and show their ports.",
                  "Draw only the connectors listed under the drawing: the other ports wait for later stages."
                ] }
              ] }
            }
          }
        }
      ]
    },
    {
      id: "bear-check", ch: "build", kind: "do",
      title: "4 · A bear: validate",
      lead: "The drone follows the bear, then patrols again with the sheep watch back on.",
      blocks: [
        { widget: "archSim", opts: { arch: "chosen", stage: "bear", validate: true, cameo: "tp" } }
      ]
    },

    /* 5 · deter */
    {
      id: "deter-build", ch: "build", kind: "do",
      title: "5 · Scare it off: build it",
      lead: "The bear comes too close to the flock: the drone flashes its light and sounds its horn. When it backs off, back to tracking.",
      blocks: [
        { widget: "scenarioGrow", opts: { stage: "deter" } },
        TIP_TRIGGER, TIP_PORTS,
        {
          byChoice: {
            q: "q-arch",
            variants: {
              "1": { label: "Architecture 1", tab: "Arch. 1", blocks: [
                { p: "No state to add: Predator Defense decides this on its own, and the orchestrator does not move. That is the point of this architecture." },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "1", stage: "deter" } },
                { steps: ["In [[tp1-ibd]], draw only the connectors listed under the drawing."] }
              ] },
              "2": { label: "Architecture 2", tab: "Arch. 2", blocks: [
                { p: "No state to add: Predator Management decides this on its own, and your patch does not change." },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "2", stage: "deter" } },
                { steps: ["In [[tp2-ibd]], draw only the connectors listed under the drawing."] }
              ] },
              "3": { label: "Architecture 3", tab: "Arch. 3", blocks: [
                { h: "The result to reach" },
                { widget: "deciderStm", opts: { arch: "3", stage: "deter" } },
                { steps: [
                  "In [[tp3-orch-stm|the state machine of Mission Orchestrator]], in the first region of Mission, create <<Predator counteraction>>. Drag [[tp3-fn-relay-tracking-orders|Relay tracking orders]] on it → {{Do Activity}}.",
                  "Draw the transition from `Predator tracking` to it: **Trigger** `Predator Engage Request`. **Effect**: drag [[tp3-fn-grant-engagement|Grant Engagement]] on the transition.",
                  "And the way back: **Trigger** `Predator Disengage Request`. **Effect**: drag [[tp3-fn-grant-disengagement|Grant Disengagement]] on the transition."
                ] },
                { h: "Connect" },
                { widget: "stageIbd", opts: { arch: "3", stage: "deter" } },
                { steps: ["In [[tp3-ibd]], draw only the connectors listed under the drawing."] }
              ] }
            }
          }
        }
      ]
    },
    {
      id: "deter-check", ch: "build", kind: "do",
      title: "5 · Scare it off: validate",
      lead: "Light and sound when the bear is too close, tracking again when it backs off, patrol when it is gone.",
      blocks: [
        { widget: "archSim", opts: { arch: "chosen", stage: "deter", validate: true, cameo: "tp" } }
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
            "On the IBD of the SOI: {{Show Port Type Only}}, then {{Show STM Overview in Parts}}. The parts grow and overlap: lay the diagram out again ({{Layout > Quick Diagram Layout}}).",
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
        { widget: "archSim", opts: { arch: "chosen", stage: "full", validate: true, cameo: "tp" } }
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
    { scene: "build-plan", text: "Stages: config archs.stages. Each simulates only the parts built so far, and the states of the decider made so far. Validate in Cameo sends the signals to the simulation over the relay (simtest/start, send, states, stop: allow-list of RpcDispatcher) and reads the states back; parts are addressed by the name of their type. If the plugin is too old, the button offers the scenario file." },
    { scene: "an-perf", text: "The latencies (8 ms per interface, 4 ms per subsystem) are illustrative, not measured." },
    { scene: "load-model", text: "Four starting models in part3/assets/models/, built from the drone-archs specs by scripts/make-part3-inits.py and scripts/build-part3-models.mjs. All have the same package, so the links and Validate in Cameo hold in each." },
    { scene: "trade-off", text: "The scores of the star diagram (config archs.*.score, axes in archs.axes) are a reading of the three fiches, not measured. Adjust them." },
    { scene: "start-build", text: "The drawings and the gestures of the states: config archs[k].target. What each stage adds: config archs.stages. The connectors under the IBD come from archs.js. State and function names are kept as in the model, typos included (Perimiter, surounding)." }
  ]
};
