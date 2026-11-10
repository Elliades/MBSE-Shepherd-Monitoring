/* Part 4, the swarm: chapters, then scenes in reading order. One scene = one idea.
   Same engine, marks and blocks as Part 1 (see content/scenes.js at the root for the list).
   A { recall } block may take base: "../part3/index.html" to point to the scenes of Part 3 instead of Part 1.
   Widgets of this part: js/widgets-logical.js (swarmScope, strayDilemma, parallelRegions, swarmOptions);
   the options of the swarm and the fleet of the simulation panel are in part4/content/config.js. */
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
    { id: "choice", code: "4", title: "Choose a swarm", blurb: "Who leads, which drones.", phase: "lg" },
    { id: "sim", code: "5", title: "Simulation", blurb: "The swarm flies the mission.", phase: "lg" },
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
            text: "The logical architecture of one drone is not lost: it becomes **one part** of the new system of interest. The same tools, transition, ports, propagate, work at this new level."
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
        {
          steps: [
            "Start Cameo with the floating license, as in Part 3.",
            "Open the model of Part 4. Keep the profile file next to it; do not unzip the .mdzip.",
            "Link this guide to Cameo with the **Cameo** button at the top: the simulation of chapter 5 follows the drones of your model."
          ]
        },
        {
          recall: {
            label: "Forgot how? See it again",
            items: [
              { id: "start-tool", title: "Start the tool (Part 1)" },
              { id: "install-plugin", title: "Install the plugin (Part 1)" }
            ]
          }
        },
        {
          placeholder: {
            kind: "link", title: "The model of Part 4",
            todo: ["Put the .mdzip in part4/assets/models/ (or on the LMS) and add a download block", "Name of the SoI block (UAV + Base Station + Weather Station)"]
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
            { n: "1", icon: "binoculars", tone: "tip", title: "A sheep leaves the zone", text: "We want to **follow it for X metres** out of the zone, to know where it goes, **without leaving the rest of the flock** unguarded." },
            { n: "2", icon: "bell", tone: "warn", title: "A predator comes", text: "Same thing: deal with the predator, follow it if it runs, and **keep the other sheep guarded** all along." }
          ]
        },
        { p: "One drone cannot be in two places. The solution must **evolve into a swarm**: several drones that share the work." },
        {
          placeholder: {
            kind: "text", title: "The distance X",
            todo: ["Value of X (metres) that the requirement gives, and whether it is a requirement of the model"]
          }
        }
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
        { widget: "parallelRegions" },
        { p: "In **one region**, the mission holds one state at a time: following a sheep and watching a bear exclude each other. With **parallel regions**, each concern has its own active state, and they move independently." },
        {
          callout: {
            tone: "goal", title: "The drones do not appear",
            text: "The regions describe **what** must happen at the same time. Which drone does it is decided later, at the logical level, when the regions are allocated."
          }
        }
      ]
    },
    {
      id: "regions-do", ch: "mission", kind: "do",
      title: "Put the concurrent parts in parallel",
      lead: "Turn the mission state into a state with several regions.",
      blocks: [
        {
          steps: [
            "Open the mission state machine of the system of interest.",
            "Identify the parts that must run at the same time: guarding the flock, tracking a stray sheep, managing the predator.",
            "On the mission state, add a region per concern (right-click the state, {{Add Region}}). A dashed line separates them.",
            "Move the states of each concern into its region, with an initial state each.",
            "Check: no transition crosses from one region to another."
          ]
        },
        {
          recall: {
            items: [{ id: "c-state", title: "Create a state" }, { id: "c-transition", title: "Draw a transition" }]
          }
        },
        {
          placeholder: {
            kind: "screenshot", title: "The mission state machine with its regions",
            todo: ["Exact menu label to add a region in Cameo", "Screenshot of the expected state machine (names of the regions and states)"]
          }
        }
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
            text: "This guide uses three: **Flock** (patrol, guard close), **Stray sheep** (none, tracking), **Predator** (none, tracking, counteraction). Weather or energy could be a fourth."
          }
        }
      ]
    },

    /* ───────────────────────── 4 · Choose a swarm ───────────────────────── */
    {
      id: "options", ch: "choice", kind: "try", mark: "intro",
      title: "Three ways to organise the swarm",
      lead: "Same mission, three architectures. Load each one in the simulation and play its scenario.",
      blocks: [
        { widget: "swarmOptions" },
        { widget: "simHint" }
      ]
    },
    {
      id: "allocate", ch: "choice", kind: "do",
      title: "Allocate the regions",
      lead: "Each region of the mission goes to a part of the solution. Where it goes depends on the option.",
      blocks: [
        {
          tabs: [
            {
              label: "Option A", sub: "base station · complete drones",
              blocks: [
                {
                  list: [
                    "The base station takes the **mission**: it watches all the regions and assigns a drone to each event.",
                    "Each complete drone takes **every behaviour**: patrol, guard, track a sheep, repel the predator. Which one runs is ordered by the base.",
                    "Ask yourself: what does a drone send back so that the base can choose?"
                  ]
                }
              ]
            },
            {
              label: "Option B", sub: "base station · specialised drones",
              blocks: [
                {
                  list: [
                    "The base station takes the **mission** and dispatches.",
                    "Each region goes to the drone whose role fits: Flock → shepherd, Stray sheep → guard, Predator → anti-predator.",
                    "Ask yourself: who keeps the field when the guard follows a sheep?"
                  ]
                }
              ]
            },
            {
              label: "Option C", sub: "a master drone",
              blocks: [
                {
                  list: [
                    "The master drone takes the **mission** on top of its own role.",
                    "The other regions go to the specialised drones, as in option B.",
                    "The base station only receives reports. Ask yourself: what happens when the master drone is lost?"
                  ]
                }
              ]
            }
          ]
        },
        {
          steps: [
            "Pick the option you defend.",
            "Use {{MBSE Shepherd > Transition to Logical}} to give each region to its part, as in Part 3.",
            "Fix the behaviour: the part that leads sends orders, the others answer."
          ]
        },
        {
          recall: {
            label: "The gestures of Part 3", base: "../part3/index.html",
            items: [{ id: "trans-do", title: "Transition the behaviour to the subsystems" }]
          }
        }
      ]
    },
    {
      id: "architecture", ch: "choice", kind: "do",
      title: "Connect the swarm",
      lead: "The system of interest gets its parts: the drones, the base station, the weather station. Then ports and connectors, as in Part 3.",
      blocks: [
        {
          steps: [
            "In the internal block diagram of the system of interest, add the parts of your option: the drones (one part per role, or one part with a multiplicity of 3), the base station, the weather station.",
            "{{MBSE Shepherd > Create All Missing Ports}} from the behaviour you allocated.",
            "Connect the ports: the orders from the master, the reports back, the weather to whoever decides.",
            "{{MBSE Shepherd > Propagate}}, then {{MBSE Shepherd > Organize}}."
          ]
        },
        {
          placeholder: {
            kind: "screenshot", title: "The IBD of the swarm, per option",
            todo: ["Expected IBD for A, B and C from the solution model", "Whether the drones are separate parts or one part [3]"]
          }
        }
      ]
    },
    {
      id: "choose", ch: "choice", kind: "answer", mark: "outro",
      title: "Your choice",
      lead: "Which option do you defend, and on which criteria?",
      blocks: [
        {
          question: {
            id: "q-option", type: "choice",
            prompt: "Which organisation of the swarm do you choose?",
            options: ["A · Base station leads 3 complete drones", "B · Base station leads 3 specialised drones", "C · A drone leads specialised drones"],
            justify: true
          }
        }
      ]
    },

    /* ───────────────────────── 5 · Simulation ───────────────────────── */
    {
      id: "sim-run", ch: "sim", kind: "do", mark: "intro",
      title: "Run the swarm",
      lead: "Run the simulation of the system of interest in Cameo. The panel shows each drone, its step, and who leads.",
      blocks: [
        {
          steps: [
            "In Cameo, start the simulation of the system of interest ((simulate)), then ((run)).",
            "Open the **Simulation** panel at the top: one drone per drone instance of your model.",
            "Make a sheep stray, then bring a predator: check that a drone always **keeps the field**. The panel turns red when the flock is left alone."
          ]
        },
        { widget: "simHint" },
        {
          callout: {
            tone: "note", title: "The rule the panel checks",
            text: "A drone may follow a stray sheep or the predator out of the field only while another drone stays on the field."
          }
        }
      ]
    },
    {
      id: "sim-iterate", ch: "sim", kind: "do", mark: "outro",
      title: "Iterate",
      lead: "Each red field is a hole in the behaviour of the leader. Correct it, run again.",
      blocks: [
        {
          list: [
            "Two drones leave at once: the leader must reserve one drone for the field before sending another.",
            "Nobody leaves: the order reaches no drone; check the ports and the connectors from the leader.",
            "Option C, the master is down: who takes over?"
          ]
        },
        { notes: { id: "sim-fixes", label: "What you had to correct", hint: "One line per correction." } }
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
    { scene: "options", text: "The three options, their for/against and the fleets they load are in part4/content/config.js (swarm.options). The handout lists them as: base station master + 3 complete drones; base station master + 3 different drones; different drones with a drone master." },
    { scene: "sim-run", text: "The Cameo plugin publishes one step for the whole simulation. For Part 4 it must add a drones list (id, step, role, name) and the master to its state frame: see \"Fleet simulation\" in README.md. The steps of each role (fleet.roles.*.steps) are placeholders until the model's state names are known; \"Tracking stray sheep\" is shown as the new behaviour escort." },
    { scene: "allocate", text: "The drone assembly lab (part4/lab/, not deployed) could serve here to build the drone variants of options B and C. Link it once it is published." },
    { scene: "regions-do", text: "{{Add Region}} is a guess at the Cameo label; check it." }
  ]
};
