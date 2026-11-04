/* Part 4, the swarm: chapters, then scenes in reading order. One scene = one idea.
   Same engine, marks and blocks as Part 1 (see content/scenes.js at the root for the list).
   A { recall } block may take base: "../part3/index.html" to point to the scenes of Part 3 instead of Part 1.
   Widgets of this part: js/widgets-logical.js (swarmScope, strayDilemma, parallelRegions, swarmOptions) and js/widgets-lego.js
   (legoBay, missionBoard, missionCheck). The bricks and the missions are in part4/content/lego.js; the options of the swarm and
   the fleet of the simulation panel in part4/content/config.js. */
window.COURSE = {
  phases: [
    { id: "op", title: "Operational analysis", short: "Operational", q: "What is expected of the system?" },
    { id: "fn", title: "Functional architecture", short: "Functional", q: "How does it do it?" },
    { id: "lg", title: "Logical architecture", short: "Logical", q: "Which subsystems, talking how?" }
  ],

  chapters: [
    { id: "brief", code: "0", title: "Briefing", blurb: "A new system of interest." },
    { id: "setup", code: "1", title: "Set up Cameo", blurb: "The model of Part 4." },
    { id: "problem", code: "2", title: "The problem", blurb: "Follow one, keep the others.", phase: "op" },
    { id: "mission", code: "3", title: "A concurrent mission", blurb: "Parallel regions, no drone in sight.", phase: "fn" },
    { id: "build", code: "4", title: "Build your swarm", blurb: "A box of Lego.", phase: "lg" },
    { id: "fly", code: "5", title: "Fly the missions", blurb: "Play, unplug, try again.", phase: "lg" },
    { id: "end", code: "✓", title: "Debrief", blurb: "Your choice, defended." }
  ],

  scenes: [
    /* ───────────────────────── 0 · Briefing ───────────────────────── */
    {
      id: "welcome", ch: "brief", kind: "read", bare: true,
      title: "Organise a swarm to guard the flock",
      blocks: [{ widget: "cover" }]
    },
    {
      id: "new-soi", ch: "brief", kind: "try",
      title: "The system of interest grows",
      lead: "Until now the system of interest was one drone. Now it is the whole solution: the drones, the base station and the weather station.",
      blocks: [
        { widget: "swarmScope" },
        {
          cards: [
            { n: "1", title: "Several UAVs", text: "Three drones, identical or not: that is one of the questions of this part." },
            { n: "2", title: "The base station", text: "Where the drones take off, recharge, and maybe where the decisions are taken." },
            { n: "3", title: "The weather station", text: "Wind and rain decide whether the drones may fly: it is part of the solution now." }
          ]
        },
        {
          callout: {
            tone: "note", title: "What you keep from Part 3",
            text: "The logical architecture of one drone is not lost: the subsystems you built one by one come back as **ready-made bricks**. This time you assemble them."
          }
        }
      ]
    },

    /* ───────────────────────── 1 · Set up Cameo ───────────────────────── */
    {
      id: "load-model", ch: "setup", kind: "do",
      title: "Open the model of Part 4",
      lead: "A new model: the system of interest is the solution, not the drone.",
      blocks: [
        { download: { label: "Starting model", file: "UAV_Part4_Swarm.mdzip", src: "assets/models/UAV_Part4_Swarm.mdzip", size: "1.6 MB" } },
        { download: { label: "Its profile", file: "ISAE-Profile.mdzip", src: "assets/models/ISAE-Profile.mdzip", size: "160 KB" } },
        {
          steps: [
            "Start Cameo with the floating license, as in Part 3.",
            "Download both files **into the same folder**, then open the model ({{File > Open Project}}). Do not unzip the .mdzip.",
            "Open [[tp-swarm]]. The drones, the base station and the links between them are there; the [[tp-library]] holds the bricks you will play with.",
            "Link this guide to Cameo with the **Cameo** button at the top: it will follow what you assemble, and play the missions."
          ]
        },
        { pair: true },
        {
          recall: {
            label: "Forgot how? See it again",
            items: [
              { id: "start-tool", title: "Start the tool (Part 1)" },
              { id: "install-plugin", title: "Install the plugin (Part 1)" }
            ]
          }
        }
      ]
    },

    /* ───────────────────────── 2 · The problem ───────────────────────── */
    {
      id: "need", ch: "problem", kind: "read", mark: "intro",
      title: "Follow one, keep the others",
      lead: "Two new needs come from the shepherds.",
      blocks: [
        {
          cards: [
            { n: "1", icon: "binoculars", tone: "tip", title: "A sheep leaves the zone", text: "We want to **follow it** out of the zone, to know where it goes, **without leaving the rest of the flock** unguarded." },
            { n: "2", icon: "bell", tone: "warn", title: "A predator comes", text: "Same thing: deal with the predator and **keep the other sheep guarded** all along." }
          ]
        },
        { p: "One drone cannot be in two places. The solution must **evolve into a swarm**: several drones that share the work." }
      ]
    },
    {
      id: "dilemma", ch: "problem", kind: "try",
      title: "How many drones does it take?",
      lead: "Pick a number of drones, then what happens. Watch the flock.",
      blocks: [
        { widget: "strayDilemma" },
        { p: "With enough drones the flock is never alone. But the picture hides the real questions: **who decides** which drone leaves? Are the drones **all the same**?" }
      ]
    },
    {
      id: "questions", ch: "problem", kind: "answer", mark: "outro",
      title: "Two questions before modelling",
      lead: "Write a first answer now. You will come back to it after chapter 4.",
      blocks: [
        {
          question: {
            id: "q-dedicated", type: "choice",
            prompt: "Should the swarm have dedicated drones (one job each), or identical drones?",
            options: ["Dedicated drones", "Identical drones", "It depends"],
            justify: true
          }
        },
        {
          question: {
            id: "q-leader", type: "choice",
            prompt: "Who should lead the swarm?",
            options: ["The base station", "A master drone", "Nobody: each drone decides"],
            justify: true
          }
        }
      ]
    },

    /* ───────────────────────── 3 · A concurrent mission ───────────────────────── */
    {
      id: "regions-why", ch: "mission", kind: "try", mark: "intro",
      title: "Change the mission without drawing the drones",
      lead: "The mission state machine must say that the flock is guarded, a stray sheep tracked and a predator managed, all at the same time, before we know how many drones do it.",
      blocks: [
        { widget: "parallelRegions", opts: { regions: [
          { name: "Perimeter", states: ["Perimiter watch"], ev: {} },
          { name: "Sheep", states: ["Sheep Monitoring", "Stray sheep tracking"], ev: { "Sheep leaves the zone": 1, "Sheep back": 0 } },
          { name: "Predator", states: ["Predator Monitoring", "Predator tracking", "Predator counteraction"], ev: { "Predator detected": 1, "Predator in safe zone": 2, "Predator gone": 0 } }
        ] } },
        { p: "In **one region**, the mission holds one state at a time: following a sheep and watching a bear exclude each other. With **parallel regions**, each concern has its own active state, and they move independently." },
        {
          callout: {
            tone: "goal", title: "The drones do not appear",
            text: "The regions describe **what** must happen at the same time. Which drone does it comes next: each region will be carried by a component, and you will see at once whether one is left without."
          }
        }
      ]
    },
    {
      id: "regions-do", ch: "mission", kind: "do",
      title: "Put the concurrent parts in parallel",
      lead: "This is your mission of the first parts, with what this part needs. And now one thing does not hold.",
      blocks: [
        {
          callout: {
            tone: "note", title: "What we added to the mission",
            text: "The **weather**: nothing is ready without good flight conditions, and a storm brings the system home (`Awaiting Flight Conditions`, `Returning`). The **stray sheep**: `Stray sheep tracking`, entered when a sheep leaves the zone. The mission now plays in the [[op-context]], where the bear has a behaviour and a flock has joined it: what happens on the pasture comes from them. The bear says where it is by a signal, `Bear Position` and its specializations, as `FlightPlan` does in Load Flight Plan: the simulation asks you nothing."
          }
        },
        {
          steps: [
            "Open [[mission-stm]]. From `Patrolling`, two ways out: `Predator Detected` and `Stray sheep tracking`. Each one stops the patrol, and they exclude each other.",
            "Press the button below: a bear, then a sheep. It does not hold.",
            "No region to add: `Patrolling` already has three. Give it more room, then drag `Stray sheep tracking` into the region of `Sheep Monitoring`, and `Predator Detected` into the region of `Predator Monitoring`.",
            "Reconnect the four transitions: they no longer leave from `Patrolling`, but from `Sheep Monitoring` and `Predator Monitoring`, and they come back to them.",
            "Check: no transition crosses from one region to another, and nothing makes the system leave `Patrolling` but the storm."
          ]
        },
        { widget: "missionCheck" },
        { figure: { src: "assets/img/mission-regions.png", w: 1177, h: 1088, alt: "State machine of the mission. Deployed has Going to Safe Area, Patrolling and a region with Mission Monitoring. Patrolling has three parallel regions: Perimiter watch; Sheep Monitoring and Stray sheep tracking; Predator Monitoring and Predator Detected, which holds Predator tracking and Predator counteraction.", caption: "What you should get. Each region of Patrolling is one concern of the shepherds." } }
      ]
    },
    {
      id: "regions-q", ch: "mission", kind: "answer", mark: "outro",
      title: "What runs in parallel?",
      lead: "Name the regions of your mission state machine.",
      blocks: [
        {
          question: {
            id: "q-regions", type: "list", initial: 3,
            prompt: "List the parallel regions of the mission and what each one watches.",
            itemLabel: "Region"
          }
        },
        {
          reveal: {
            label: "Compare",
            text: "The model has three in `Patrolling`: **Perimiter watch**, **Sheep Monitoring** (and following a stray one), **Predator Monitoring** (and `Predator Detected`). Keep them in mind: you are about to meet them again as three bricks."
          }
        }
      ]
    },

    /* ───────────────────────── 4 · Build your swarm ───────────────────────── */
    {
      id: "options", ch: "build", kind: "try", mark: "intro",
      title: "Three ways to organise the swarm",
      lead: "Same mission, three families of solutions. Look at each one: in a moment you will build them yourself, in minutes.",
      blocks: [
        { widget: "swarmOptions" },
        { widget: "simHint" }
      ]
    },
    {
      id: "box", ch: "build", kind: "read",
      title: "One region, one brick",
      lead: "In Part 3 you built each subsystem. Here they are ready: nothing technical to change, you only choose what goes where. Click a component to see what it does.",
      blocks: [
        { widget: "brickPanel" },
        { p: "A component never leaves on its own: it asks. **Who answers is the intelligence**, and it is a brick too: **Swarm Master** (once, in the base station or in a drone) or **Swarm Reflex** (one per drone, nobody coordinates)." },
        {
          callout: {
            tone: "note", title: "What is already there",
            text: "Each drone holds a **Flight Orchestrator**: it flies where its components tell it, and never asks them anything, which is why any of them can be there or not. The base station holds **Ground Control**: flight plan, launch, recall. You do not touch them. Ground Control hears the operator and the weather only through the bricks of the base station: **Operator Communication**, **Weather Monitoring**, **Mission Monitoring** and the **Charging Dock**."
          }
        }
      ]
    },
    {
      id: "plug-drone", ch: "build", kind: "do",
      title: "Plug the components in the drones",
      lead: "Drag, drop, connect. Watch the drone build itself here while you do it in Cameo.",
      blocks: [
        { tip: { label: "The components, one click each", blocks: [{ widget: "brickPanel", opts: { given: false } }] } },
        {
          steps: [
            "Open the diagram of [[drone1-ibd]]: a Flight Orchestrator alone. Do the same with [[drone2-ibd]] and [[drone3-ibd]] when you get there.",
            "From the [[tp-library]], drag a brick and drop it on the diagram. Do not create a part by hand: the drop makes it.",
            "Choose what each drone carries: all three identical, or a job each: one that watches, one that follows, one for the bear.",
            "Right-click the diagram → {{MBSE Shepherd > Auto Connect}}. The links appear: check that they make sense."
          ]
        },
        { widget: "legoBay" },
        {
          reveal: {
            label: "Prefer to connect by hand?",
            text: "Auto Connect does nothing magic: each port says what it sends and receives, and connects to the one that takes the opposite. `p_AutoPilot` of a component goes to `p_Components` of the Flight Orchestrator. `p_Camera`, `p_Light` and `p_Sound` go out to the ports of the same name on the frame of the drone. `p_Swarm` goes to whoever answers: next to it if the intelligence is in this drone, otherwise out to `p_Swarm` on the frame."
          }
        }
      ]
    },
    {
      id: "plug-base", ch: "build", kind: "do",
      title: "Equip the base station",
      lead: "Ground Control is alone in the base: it hears nobody, and no drone can land. Four bricks, one each.",
      blocks: [
        { tip: { label: "The components, one click each", blocks: [{ widget: "brickPanel", opts: { given: false } }] } },
        {
          steps: [
            "Open [[base-ibd]]: Ground Control alone.",
            "From the [[tp-library]], drop **Operator Communication**, **Weather Monitoring**, **Mission Monitoring** and **Charging Dock** on the diagram.",
            "Right-click the diagram → {{MBSE Shepherd > Auto Connect}}. Each brick links Ground Control to a port of the frame: the operator app, the weather station, the drones."
          ]
        },
        { widget: "legoBay" },
        {
          callout: {
            tone: "note", title: "Each one has a job",
            text: "Leave one out and a mission shows it: without **Operator Communication** nothing starts, without **Weather Monitoring** the drones stay out in the storm, without **Mission Monitoring** the operator is never told, without the **Charging Dock** a drone coming home has nowhere to land."
          }
        }
      ]
    },
    {
      id: "plug-brain", ch: "build", kind: "do", mark: "outro",
      title: "Decide who decides",
      lead: "The same brick, two possible homes. Where you drop it changes what links the drones together.",
      blocks: [
        { tip: { label: "The components, one click each", blocks: [{ widget: "brickPanel", opts: { given: false } }] } },
        {
          steps: [
            "Drop **Swarm Master** on [[base-ibd]], or on the diagram of one drone. Or one **Swarm Reflex** in each drone.",
            "Right-click → {{MBSE Shepherd > Auto Connect}}.",
            "Open [[soi-ibd]]: look at the links between the drones. Move the master, connect again, and look at them again: they follow."
          ]
        },
        { figure: { src: "assets/img/drone1-assembled.png", w: 1918, h: 500, alt: "Internal block diagram of Drone 1 with Flight Orchestrator, Zone Surveillance, Flock Watching, Sheep Tracking, Predator Management and Swarm Master, all connected. Swarm Master answers the components next to it, and goes out through p_Wing2 and p_Wing3 to the other drones.", caption: "Drone 1 as the master, once connected: it answers its own components, and reaches the two others through its frame." } },
        { figure: { src: "assets/img/soi-assembled.png", w: 2200, h: 680, alt: "Internal block diagram of the system: the base station, the weather station, the operator app and three drones. Drone 1 is linked to Drone 2 and Drone 3 through p_Wing2 and p_Wing3 to their p_Swarm.", caption: "The same solution, seen from the system: the links between the drones start from the one that decides." } },
        { widget: "legoBay" }
      ]
    },

    /* ───────────────────────── 5 · Fly the missions ───────────────────────── */
    {
      id: "fly", ch: "fly", kind: "do", mark: "intro",
      title: "Play the missions",
      lead: "Each mission runs in Cameo, on what you assembled, from a fresh start. Open the Simulation panel to watch the swarm.",
      blocks: [
        { widget: "missionBoard" },
        {
          callout: {
            tone: "note", title: "The rule behind the checks",
            text: "While a drone follows a stray sheep or deals with the bear, another drone must keep the field."
          }
        }
      ]
    },
    {
      id: "rewire", ch: "fly", kind: "do",
      title: "Unplug, replug, beat your score",
      lead: "A red cross is not a mistake: it is what this solution costs. Take it apart, and try another.",
      blocks: [
        {
          list: [
            "To take a brick out: select it on the diagram and press **Ctrl+D**: the Delete key only removes the symbol. Its links go with it.",
            "To cut a single link: delete the connector, play a mission, and see who no longer answers.",
            "**Reflex everywhere:** three complete drones, one reflex each. Play the stray sheep. What happens to the flock?",
            "**Base radio down:** which solutions still hold? What does a master in a drone cost in exchange?",
            "**The cheapest fleet** that holds every mission: how few bricks does it take?",
            "**Save on the base:** take one brick out of the Base Station and play the missions. Which one fails, and why?",
            "**Keep some at home:** put **Base Standby** on the drone that follows and on the one that handles the bear. Do the missions still hold? Watch them take off from the base."
          ]
        },
        { widget: "legoBay" },
        { widget: "missionBoard" },
        { notes: { id: "lego-learnt", label: "What surprised you", hint: "One line per solution." } }
      ]
    },
    {
      id: "endurance", ch: "fly", kind: "try",
      title: "Bonus: four hours on the pasture",
      lead: "Cameo tells you who does what. It says nothing about batteries. Here the same rules run for four hours, computed in this page, with invented figures: compare the solutions, do not trust the numbers.",
      blocks: [
        { widget: "enduranceLab" },
        {
          list: [
            "**Three heavy drones or one light one?** More on the field means fewer holes, a higher bill, and a more stressed flock.",
            "**Move the base 3.6 km away.** At 12 m/s, a drone waiting at the base takes 5 minutes to arrive, and the bear needs 4. Then fly at 20 m/s: it arrives in time, and what does that do to the battery? You may have to fly home sooner.",
            "**A bigger battery?** More flight time, but it weighs, so everything costs more to lift, and it takes longer to charge. Compare Large and High density.",
            "**Fly home at 5%.** How far can you push the battery before you lose a drone on the way back?",
            "**One charging place, or three?** Find the moment the drones queue at the base.",
            "**Take off together, or in turn?** Look at the holes in the blue."
          ]
        },
        { notes: { id: "endurance-learnt", label: "Your trade-off", hint: "What did you give up, and for what?" } }
      ]
    },
    {
      id: "choose", ch: "fly", kind: "answer", mark: "outro",
      title: "Your choice",
      lead: "Which solution do you defend, and on which criteria? Look at the two questions you answered in chapter 2: has your answer changed?",
      blocks: [
        {
          question: {
            id: "q-option", type: "choice",
            prompt: "Which organisation of the swarm do you choose?",
            options: ["A · Base station leads 3 complete drones", "B · Base station leads 3 specialised drones", "C · A drone leads the others", "D · Reflexes, no leader"],
            justify: true
          }
        }
      ]
    },

    /* ───────────────────────── Debrief ───────────────────────── */
    {
      id: "finish", ch: "end", kind: "answer",
      title: "Your swarm",
      lead: "One drone became a solution: drones, base station, weather station, organised around a mission that runs in parallel.",
      blocks: [
        { widget: "recap" },
        { answers: true }
      ]
    }
  ],

  authorNotes: [
    { scene: "options", text: "The three options, their for/against and the fleets they load are in part4/content/config.js (swarm.options)." },
    { scene: "box", text: "The model and the missions come from scripts/make-part4-model.py and part4/content/lego.js. The mission and the operational context are kept by hand in the two base models (instructor-only/UAV_Part4_Base*.mdzip); TP - Swarm comes from the generator (scripts/build-part4-model.mjs), never by hand." },
    { scene: "plug-drone", text: "Auto Connect and the live bay need a plugin with the assembly feature (MBSE Shepherd > Auto Connect, relay calls assembly/read and assembly/autoConnect)." },
    { scene: "endurance", text: "Not in the model on purpose: js/lego-endurance.js computes it from the bricks, with the masses and powers of the 3D catalog; the events and the settings are in part4/content/lego.js (day)." },
    { scene: "fly", text: "A mission takes about a minute in Cameo: each event crosses several state machines with the animation on. scripts/check-part4-solutions.mjs plays them on a set of assemblies, with the same code as this board (js/lego-run.js)." }
  ]
};
