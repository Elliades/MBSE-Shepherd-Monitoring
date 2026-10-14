/* Part 2, the marked seminar: chapters, then scenes in reading order. One scene = one idea.
   Same engine, marks and blocks as Part 1 (see content/scenes.js at the root for the list).

   This seminar is marked. The scenes say WHAT each task asks for and WHERE to work in the model,
   never exactly what to do: no signal names, no transitions, no function names, no subsystem
   choices, no allocations, no solution blocks. When a gesture is needed, a { recall } block sends
   the student back to the scene of Part 1 that shows it.

   Extra fields used here:
     pts: 2           points of the question, shown next to the kind ("2 pts")
     bonus: true      the points are a bonus ("Bonus · 1 pt")
   Extra blocks:
     { recall: { items: [{ id: "a-messages", title: "Send messages between actors" }] } }
                      links to scenes of Part 1 (config.recallBase), opened in a new tab
     { question: { type: "text", ... } }   a free-text answer */
window.COURSE = {
  chapters: [
    { id: "brief", code: "0", title: "Briefing", blurb: "How the marked seminar works." },
    { id: "setup", code: "1", title: "Set up Cameo", blurb: "Start the tool and open the model." },
    { id: "problem", code: "2", title: "The problem", blurb: "A bear near the flock." },
    { id: "T1", code: "T1", title: "Operational context", blurb: "Bring the bear into the context." },
    { id: "T2", code: "T2", title: "Use cases", blurb: "A use case against predators." },
    { id: "T3", code: "T3", title: "Scenario", blurb: "Signals, sequence diagram, flows." },
    { id: "T4", code: "T4", title: "Functional architecture", blurb: "Functions, state machine, activities, simulation." },
    { id: "T5", code: "T5", title: "Physical architecture", blurb: "Subsystems for the new functions." },
    { id: "T6", code: "T6", title: "Allocation", blurb: "Give each new function to a subsystem." },
    { id: "end", code: "✓", title: "Hand in", blurb: "Drop the model, FAQ, your answers." }
  ],

  scenes: [
    /* ───────────────────────── 0 · Briefing ───────────────────────── */
    {
      id: "welcome", ch: "brief", kind: "read", bare: true,
      title: "Marked seminar: keep the bear away from the flock",
      blocks: [{ widget: "cover" }]
    },
    {
      id: "rules", ch: "brief", kind: "read",
      title: "How the marked seminar works",
      lead: "Two hours, in pairs, step by step. Your teachers come by with a marking sheet to see your answers.",
      blocks: [
        {
          cards: [
            { n: "1", title: "Two hours, in pairs", text: "The seminar lasts **2 hours** and is done in pairs." },
            { n: "2", title: "Step by step", text: "Work through the tasks in order. When you judge a question is done, ask the teacher to come and see what you have done." },
            { n: "3", title: "Drop the model", text: "At the end of the session, drop the model on the LMS. There is no work to take away and no report to submit afterwards." }
          ]
        },
        {
          callout: {
            tone: "goal", title: "This guide gives the goals, not the answers",
            text: "Each scene tells you what a task asks for and where to work in the model. It does not tell you exactly what to do: that is what is marked. When you forget a gesture, the blue boxes take you back to the right scene of Part 1."
          }
        }
      ]
    },
    {
      id: "marking", ch: "brief", kind: "read",
      title: "Where the points are",
      lead: "Each question is worth a few points. Tap a row to jump to it.",
      blocks: [
        { widget: "marks" },
        { p: "Questions 1.0 and 2 also have a written part: type it in this guide (it stays on this device) and show it to the teacher with your model. All the questions, these two included, are checked in your model." }
      ]
    },
    {
      id: "part1", ch: "brief", kind: "read",
      title: "Keep Part 1 at hand",
      lead: "You will need Part 1 to remember certain manipulations: use cases, sequence diagrams, and so on.",
      blocks: [
        { p: "Keep the [Part 1 guide](../index.html) open in another tab, or your Part 1 handout." },
        {
          callout: {
            tone: "note", title: "Package numbers may change",
            text: "The number of a package (for example 1.A) may change between the models of Part 1 and of this seminar, but its name is always the same, for example **Use Cases and Scenarios**. Look for the name."
          }
        },
        {
          tip: {
            label: "Optional: download the handout",
            blocks: [
              { p: "The handout has the same tasks and questions as this guide. Nothing here is required to do the seminar." },
              { download: { label: "Handout", file: "BE Cameo - Part 2 - Marked - 2025.docx", src: "assets/docs/BE Cameo - Part 2 - Marked - 2025.docx", size: "470 KB" } }
            ]
          }
        }
      ]
    },

    /* ───────────────────────── 1 · Set up Cameo ───────────────────────── */
    {
      id: "start-tool", ch: "setup", kind: "do",
      title: "Start the tool",
      lead: "Cameo runs with a floating license served by the school, as in Part 1.",
      blocks: [
        {
          steps: [
            "In Windows, open the Catia Magic **Systems of Systems Architect** application.",
            "Choose {{Defaults}}.",
            "Select {{Use a floating license}}.",
            "Enter the server name and the port number below."
          ]
        },
        { copy: { label: "Server name", value: "licence-w2k19.isae.fr" } },
        { copy: { label: "Port number", value: "1101" } }
      ]
    },
    {
      id: "load-model", ch: "setup", kind: "do",
      title: "Load the model",
      lead: "The model of the seminar is on the LMS. It comes as two files: keep them together.",
      blocks: [
        {
          steps: [
            "Download the two model files from the LMS.",
            "Place the two .mdzip files in the same directory.",
            "In Cameo, choose {{Open the project}} and pick the **UAV_BE…** file. The file **SAMAREQ_Profile.mdzip** is loaded automatically."
          ]
        },
        {
          callout: {
            tone: "warn", title: "Do not unzip them",
            text: "A .mdzip file is the project itself. Unzipping it gives you a folder Cameo cannot open."
          }
        },
        {
          placeholder: {
            kind: "link", title: "The model files, if they should be downloadable from the guide",
            todo: [
              "Decide whether students download the model from the LMS only (as the handout says) or from this guide too",
              "If from the guide: put the two .mdzip files in part2/assets/models and add a { download } block here, as in Part 1"
            ]
          }
        }
      ]
    },
    {
      id: "settings", ch: "setup", kind: "do",
      title: "Perspective, language, Expert mode",
      lead: "The same three settings as in Part 1.",
      blocks: [
        {
          steps: [
            "When the tool starts, choose the **Systems Engineer** perspective. You can also do it later with {{Options > Perspectives}}.",
            "Switch the language to English: {{Options > Environment}}, then {{General > Language}}, and choose **English**.",
            "In the {{Specification}} window of an element, set {{Properties}} to **Expert** to see every property."
          ]
        },
        {
          figure: {
            src: "../assets/img/spec-expert.png", w: 838, h: 544, size: "sm",
            alt: "Specification window of the package 1 - Operational Analysis. At the top right, the Properties drop-down list is set to Expert and circled in red.",
            caption: "Element specification, Expert mode."
          }
        },
        {
          recall: {
            items: [
              { id: "perspective", title: "Choose the Systems Engineer perspective" },
              { id: "language", title: "Switch Cameo to English" },
              { id: "expert-mode", title: "Show every property with Expert mode" }
            ]
          }
        }
      ]
    },

    /* ───────────────────────── 2 · The problem ───────────────────────── */
    {
      id: "spec", ch: "problem", kind: "read",
      title: "The request",
      lead: "The Ministry of the Environment calls on your company to control and monitor the Pyrenean bear.",
      blocks: [
        {
          quote: {
            label: "Specification",
            text: "The Ministry of the Environment would like to call on your company to propose a solution to control and monitor the Pyrenean bear. These drones will be the property of the Occitanie-Pyrénées-Méditerranée Regional Council."
          }
        },
        {
          p: "The tension between the breeders of Ariège and the associations that protect this species leads the State to reimburse the shepherds, up to the purchase price of the animals killed by bears."
        },
        {
          p: "In this context, your autonomous drone must patrol around the breeding areas and detect whether one or more Pyrenean bears are in critical approach."
        }
      ]
    },
    {
      id: "requirements", ch: "problem", kind: "read",
      title: "The mission requirements",
      lead: "Three requirements, straight from the specification.",
      blocks: [
        {
          cards: [
            { n: "1", title: "See in the dark", text: "The bear also moves at night. Your solution must detect the animal in the dark, with an infrared camera and recognition software." },
            { n: "2", title: "Follow from a distance", text: "If a bear is detected, the drone must change its flight plan to follow it from a distance and assess the risk of approach." },
            { n: "3", title: "Alert and scare", text: "If the bear crosses the alert line (less than 1 km from the flock) and heads towards the flock, the drone must send an alert signal to the shepherds concerned, and try to scare the bear." }
          ]
        }
      ]
    },
    {
      id: "three-steps", ch: "problem", kind: "try",
      title: "Three steps of an approach",
      lead: "What the system must do as the bear comes closer, in three steps.",
      blocks: [
        { widget: "bearApproach" },
        {
          tip: {
            label: "Show the three pictures of the handout",
            blocks: [
              { figure: { src: "assets/img/bear-step-1-original.png", w: 1294, h: 875, size: "sm", alt: "Step 1. The bear is outside the tracking perimeter, on the left. The drone patrols on the edge of the safe zone with its sensor circle. A banner reads PREDATOR DETECTED.", caption: "Step 1: the bear is detected outside the tracking perimeter. The system continues its mission." } },
              { figure: { src: "assets/img/bear-step-2-original.png", w: 1070, h: 875, size: "sm", alt: "Step 2. The bear is inside the tracking perimeter, at the bottom left. The drone stays next to it, on the edge of the safe zone. A banner reads TRACKING MODE.", caption: "Step 2: the bear enters the tracking perimeter. The system tracks it from a distance without interfering." } },
              { figure: { src: "assets/img/bear-step-3-original.png", w: 1070, h: 875, size: "sm", alt: "Step 3. The bear is inside the safe zone, which turned red. The sheep gather in the far corner. The drone sends sound waves and a light beam towards the bear. A banner reads COUNTER ACTIONS.", caption: "Step 3: the bear enters the safe zone. The system triggers counter actions and warns the shepherd." } }
            ]
          }
        }
      ]
    },
    {
      id: "top-down", ch: "problem", kind: "read",
      title: "Top-down, then bottom-up",
      lead: "When designing a system, you go down and back up: working on one SysML diagram often means updating another one.",
      blocks: [
        { p: "In this seminar, you complete the context diagram and the use cases, then detail the use case about predators with a scenario, then come back to the context diagram, and so on:" },
        {
          list: [
            "**Task 1**: the operational context diagram.",
            "**Task 2**: the use case diagram.",
            "**Task 3**: the signals and a sequence diagram, then back to the context diagram.",
            "**Task 4**: the functions, the state machine, the activity diagrams and the simulation.",
            "**Task 5**: the physical architecture.",
            "**Task 6**: the allocation of the new functions."
          ]
        }
      ]
    },

    /* ───────────────────────── T1 · Operational context ───────────────────────── */
    {
      id: "t1-context", ch: "T1", kind: "do", ref: "Task 1",
      title: "Bring the bear into the operational context",
      lead: "Complete the operational context diagram: add the bear and connect it to the SoI.",
      blocks: [
        { path: "op-context" },
        {
          steps: [
            "Open the **Operational Context** diagram.",
            "Add the bear to the diagram. The bear part is already in the model: you do not create it.",
            "Connect the bear to the SoI. The type of the bear already declares two ports, and they should be used. The specification tells you enough to understand what they are.",
            "When you connect them, create the conjugated ports on the SoI side."
          ]
        },
        {
          callout: {
            tone: "note", title: "The flows come later",
            text: "Which flows the bear and the SoI exchange (the arrows on the ports) is defined later, in Question 2."
          }
        },
        {
          tip: {
            label: "Two tips from the handout",
            blocks: [
              { p: "**Show the bear as a bear.** Select the block named bear on the diagram, then click {{Show as Image}} in the toolbar of the diagram." },
              { figure: { src: "assets/img/show-as-image.png", w: 194, h: 112, size: "xs", alt: "Toolbar of the Operational Context diagram, with the tooltip Show as Image on one of its buttons.", caption: "The Show as Image button." } },
              { p: "**Conjugated ports.** When you connect an existing port to a target part, Cameo (MagicDraw) automatically creates on the target a conjugated port typed by the same interface." }
            ]
          }
        },
        { recall: { items: [{ id: "context-diagram", title: "Start from the operational context" }] } }
      ]
    },

    /* ───────────────────────── T2 · Use cases ───────────────────────── */
    {
      id: "t2-actor", ch: "T2", kind: "do", ref: "Task 2",
      title: "Add the Bear actor",
      lead: "The Bear actor is already declared in the model. Put it on the use case diagram.",
      blocks: [
        { path: "bear-actor" },
        {
          steps: [
            "Open the use case diagram [[uc-diagram]].",
            "Drag and drop the **Bear** actor from the Model Browser onto the diagram."
          ]
        },
        {
          recall: {
            items: [
              { id: "a-use-cases", title: "Find the use cases" },
              { id: "a-lifelines", title: "Add the lifelines" }
            ]
          }
        }
      ]
    },
    {
      id: "t2-use-case", ch: "T2", kind: "do", ref: "Task 2",
      title: "Create the use case and an extension point",
      lead: "A new use case for predators, and a new extension point in an existing use case.",
      blocks: [
        {
          steps: [
            "Create the use case <<Protect the sheeps from predators>>.",
            "In the use case **Surveillance of sheep in a safe zone area**, create an extension point and name it <<Predator entering the safe zone>>.",
            "In the {{Extension Points}} window, click {{Create}} to create a new extension point. Do not tick the extension point already listed (**Sheep guarding activated**)."
          ]
        },
        {
          figure: {
            src: "assets/img/extension-points.png", w: 432, h: 265, size: "sm",
            alt: "Extension Points window. The list shows the unticked extension point Sheep guarding activated. The Create button, at the bottom right, is framed in blue.",
            caption: "The Extension Points window: click Create, leave the existing extension point unticked."
          }
        }
      ]
    },
    {
      id: "t2-link", ch: "T2", kind: "do", ref: "Task 2",
      title: "Link the new use case",
      lead: "Link the use case to the other elements, as seen in the previous exercise and in the lesson.",
      blocks: [
        { steps: ["Link the use case <<Protect the sheeps from predators>> to the other elements of the diagram."] },
        { p: "Which relations, and with which elements: this is up to you, and it is part of what is marked." }
      ]
    },
    {
      id: "q0", ch: "T2", kind: "do", ref: "Question 0", pts: 1,
      title: "Question 0: show Tasks 1 and 2",
      lead: "Show Tasks 1 and 2 to a teacher.",
      blocks: [
        { h: "Before you call" },
        {
          steps: [
            "Task 1: the bear is on the operational context diagram, connected to the SoI.",
            "Task 2: the Bear actor and the new use case are on the use case diagram, **Surveillance of sheep in a safe zone area** has the extension point **Predator entering the safe zone**, and the new use case is linked."
          ]
        },
        { call: "Ready? Raise your hand and show Tasks 1 and 2 to a teacher." }
      ]
    },

    /* ───────────────────────── T3 · Scenario ───────────────────────── */
    {
      id: "t3-scenario", ch: "T3", kind: "read", ref: "Task 3",
      title: "Scenario 1",
      lead: "Task 3: create a sequence diagram in the use case \"Protect the sheeps from predators\", from the following scenario.",
      blocks: [
        {
          quote: {
            label: "Description of scenario 1",
            text: "The drone receives an infrared signal from an animal on the ground. After analysis of this signal, it appears that the thermal and gestural signature of the animal corresponds to a bear. The drone calculates the position of the bear. The bear enters the tracking perimeter, so the SOI shall start tracking the predator. It turns out that the bear enters the safe area. The drone deploys counter actions: it sends an alert signal to the shepherd and tries to scare the bear away with sound and light."
          }
        },
        {
          callout: {
            tone: "note", title: "Note 1 · Reuse the signals",
            text: "Reuse as many existing signals as possible. You will still need new signals for the messages that enter or leave the lifelines of the diagram. New physical signals go in the package [[fd-root]] of 2 - Functional Analysis."
          }
        },
        {
          callout: {
            tone: "warn", title: "Note 2 · No signal on a message to self",
            text: "Signals are only used for messages, because they describe an exchange. NEVER put one on a reflexive message: a message to self represents a behavior."
          }
        },
        {
          callout: {
            tone: "tip", title: "Signals first, or diagram first",
            text: "You can create the signals first (Question 1.0), then the diagram (Question 1.1), or the other way round. Going back and forth is normal: you may miss a signal or a message on the first pass."
          }
        }
      ]
    },
    {
      id: "q1-0", ch: "T3", kind: "answer", ref: "Question 1.0", pts: 2,
      title: "Question 1.0: the signals",
      lead: "What signals are needed to describe Scenario 1?",
      blocks: [
        { p: "Reuse the existing signals, as Note 1 says. Create in Cameo the ones that do not exist yet, in [[fd-root]]." },
        {
          question: {
            id: "q1-0", type: "list", initial: 1,
            prompt: "List the signals needed to describe Scenario 1.",
            itemLabel: "Signal"
          }
        },
        {
          recall: {
            items: [
              { id: "a-messages", title: "Send messages between actors" },
              { id: "a-self-messages", title: "Messages to self" }
            ]
          }
        }
      ]
    },
    {
      id: "q1-1", ch: "T3", kind: "do", ref: "Question 1.1", pts: 3,
      title: "Question 1.1: the sequence diagram",
      lead: "In the use case \"Protect the sheeps from predators\", create the sequence diagram that specifies Scenario 1.",
      blocks: [
        {
          steps: [
            "Create the sequence diagram from the use case <<Protect the sheeps from predators>>, so that it stays attached to it.",
            "Add the participants of the scenario as lifelines.",
            "Draw the exchanges between participants as messages, each with its signal.",
            "Draw what a participant does on its own as a message to self, without a signal (Note 2)."
          ]
        },
        {
          recall: {
            items: [
              { id: "a-create-sd", title: "Create the sequence diagram" },
              { id: "a-lifelines", title: "Add the lifelines" },
              { id: "a-messages", title: "Send messages between actors" },
              { id: "a-self-messages", title: "Messages to self" }
            ]
          }
        },
        { call: "When your sequence diagram is finished, call the teacher to see it." }
      ]
    },
    {
      id: "q2", ch: "T3", kind: "answer", ref: "Question 2", pts: 2,
      title: "Question 2: back to the context diagram",
      lead: "Your scenario brings new flows. Show them on the operational context diagram.",
      blocks: [
        { path: "op-context" },
        { h: "a) Which flows, on which connectors" },
        { p: "On the connectors you created in Task 1, indicate which ones carry the physical flows created in Question 1.0." },
        {
          question: {
            id: "q2a", type: "text",
            prompt: "a) On which connectors do the physical flows of Question 1.0 go?",
            hint: "One line per connector: the connector, then the flow(s) it carries."
          }
        },
        { h: "b) Update the context diagram" },
        { steps: ["Update the context diagram with the new flow between the drone and the shepherd (see Question 1.1)."] },
        { h: "Reminders" },
        {
          list: [
            "A **port** is a point of connection. It is typed by an **Interface Block**.",
            "An **interface block** is the interface contract: it defines which flows are provided or received. These flows are represented by **flow properties**, and you have to create them.",
            "A flow property can be typed by a **signal**, to stay consistent."
          ]
        },
        { recall: { items: [{ id: "context-diagram", title: "Start from the operational context" }] } }
      ]
    },

    /* ───────────────────────── T4 · Functional architecture ───────────────────────── */
    {
      id: "q3", ch: "T4", kind: "do", ref: "Question 3", pts: 1,
      title: "Question 3: the new functions",
      lead: "Task 4 changes the functional architecture. First, create the new functions of the UAV that your sequence diagram revealed.",
      blocks: [
        { path: "fa-predator" },
        {
          steps: [
            "Go back to your sequence diagram. Only consider the steps related to **tracking**.",
            "Create the new functions of the UAV under **A - Functional architecture / Predator management**, one activity per function."
          ]
        },
        {
          recall: {
            items: [
              { id: "b-functions", title: "A scenario reveals functions" },
              { id: "b-add-function", title: "Add a function" },
              { id: "b-organize", title: "Organize the functions in packages" }
            ]
          }
        },
        { call: "Done? Raise your hand and show this question to a teacher." }
      ]
    },
    {
      id: "q4", ch: "T4", kind: "do", ref: "Question 4", pts: 2,
      title: "Question 4: the state machine",
      lead: "Complete the state machine diagram with the transitions linked to the predator management states, and their signals.",
      blocks: [
        { path: "soi-stm" },
        {
          steps: [
            "Open the state machine of **SOI - Pasture Sentinel** and find the three predator management states (detected, tracking and counteraction, in the words of the handout).",
            "Draw the transitions linked to these states.",
            "Give each of these transitions the signal that triggers it."
          ]
        },
        { recall: { items: [{ id: "c-transition", title: "Draw a transition and give it a signal" }] } },
        { call: "Done? Raise your hand and show this question to a teacher." }
      ]
    },
    {
      id: "q5", ch: "T4", kind: "do", ref: "Question 5", pts: 3,
      title: "Question 5: Monitoring Predator",
      lead: "Describe the activity diagram of the function \"Monitoring Predator\".",
      blocks: [
        {
          steps: [
            "Take inspiration from the function that monitors the sheep, in [[fa-root]].",
            "Reuse the functions you created in Question 3.",
            "Adapt the names of the functions. For example, *define if sheep is leaving safe area* becomes a function that determines whether the predator is entering the tracking area."
          ]
        },
        {
          recall: {
            items: [
              { id: "d-create-ad", title: "Create the activity diagram" },
              { id: "d-send-signal", title: "Toolbox: send a signal" },
              { id: "d-decision", title: "Toolbox: decide" },
              { id: "d-fork", title: "Toolbox: do things in parallel" }
            ]
          }
        },
        { call: "Done? Raise your hand and show this question to a teacher." }
      ]
    },
    {
      id: "q6", ch: "T4", kind: "do", ref: "Question 6", pts: 1, bonus: true,
      title: "Bonus Question 6: Start Predator Tracking",
      lead: "Complete the activity diagram \"Start Predator Tracking\" so that it describes the tracking behavior and makes the state machine progress automatically.",
      blocks: [
        {
          steps: [
            "Open the activity diagram **Start Predator Tracking**.",
            "Describe the tracking behavior, reusing the functions of the package **tracking predator**.",
            "Make the state machine progress automatically."
          ]
        },
        { recall: { items: [{ id: "d-create-ad", title: "Create the activity diagram" }] } },
        { call: "Done? Raise your hand and show this question to a teacher." }
      ]
    },
    {
      id: "q7", ch: "T4", kind: "do", ref: "Question 7", pts: 2,
      title: "Question 7: simulate the state machine",
      lead: "Simulate the state machine diagram of \"SOI - Pasture Sentinel\". The simulation must cover all the elements.",
      blocks: [
        { path: "soi-stm" },
        {
          steps: [
            "Run the simulation of the state machine.",
            "Send signals until every state has been active at least once.",
            "Check that the simulation went through every element: every state, every transition, and the activities they run."
          ]
        },
        {
          recall: {
            items: [
              { id: "c-run", title: "Run the state machine simulation" },
              { id: "c-cross", title: "Simulate across two diagrams" },
              { id: "d-simulate-sm", title: "Simulate the state machine again" }
            ]
          }
        },
        { call: "Done? Raise your hand and show this question to a teacher." },
        { h: "Optional: watch the drone" },
        { p: "If the OMF-ISAE plugin of Part 1 is installed in your Cameo, pair this guide with Cameo: the drone of the **Simulation** panel, at the top of the page, follows the states of your simulation." },
        { widget: "linkStatus" },
        { widget: "simHint" }
      ]
    },

    /* ───────────────────────── T5 · Physical architecture ───────────────────────── */
    {
      id: "q8", ch: "T5", kind: "do", ref: "Question 8", pts: 2,
      title: "Question 8: a physical solution",
      lead: "Task 5 changes the physical architecture. Propose a physical solution: add new subsystems that respond to the functions linked to \"engage predator\".",
      blocks: [
        { path: "pa-root" },
        {
          steps: [
            "Open the block definition diagram (BDD) of **3 - Physical Analysis / A - Physical architecture**.",
            "Add the subsystems that your solution needs for the functions linked to *engage predator*."
          ]
        },
        {
          callout: {
            tone: "tip", title: "Make or buy",
            text: "Creating a lot of new subsystems is not always useful. Some features may be supported by existing subsystems, subject to changes on them. This is a simplified trade-off: make or buy."
          }
        },
        {
          notes: {
            id: "q8", label: "Your notes (optional)",
            hint: "Which features need a new subsystem, which ones an existing subsystem that you change, and why."
          }
        },
        { recall: { items: [{ id: "e-views", title: "Two views of the same model" }] } },
        { call: "Done? Raise your hand and show this question to a teacher." }
      ]
    },

    /* ───────────────────────── T6 · Allocation ───────────────────────── */
    {
      id: "q9", ch: "T6", kind: "do", ref: "Question 9", pts: 1,
      title: "Question 9: allocate the new functions",
      lead: "Task 6: depending on your choices, allocate all the new functions to the subsystems you created, to existing ones, or to both.",
      blocks: [
        { path: "alloc-matrix" },
        {
          steps: [
            "Open the **Function Allocation** matrix in [[alloc-pkg]].",
            "Allocate every new function to a subsystem."
          ]
        },
        { recall: { items: [{ id: "e-allocate", title: "Allocate the functions to subsystems" }] } },
        { call: "Done? Raise your hand and show this question to a teacher." }
      ]
    },

    /* ───────────────────────── Hand in ───────────────────────── */
    {
      id: "hand-in", ch: "end", kind: "do",
      title: "Drop your model on the LMS",
      lead: "At the end of the session, hand in the model. Nothing else: no report, no work to take away.",
      blocks: [
        {
          steps: [
            "Before you leave, make sure a teacher has seen your written answers to Questions 1.0 and 2.",
            "Save the project in Cameo.",
            "Drop on the LMS the **UAV_BE…** .mdzip file you worked on."
          ]
        },
        {
          placeholder: {
            kind: "text", title: "How to hand in",
            todo: [
              "Where exactly on the LMS (name of the assignment)",
              "Naming rule for the file, for example the names of the pair"
            ]
          }
        }
      ]
    },
    {
      id: "faq", ch: "end", kind: "read",
      title: "Frequently asked questions",
      lead: "About the model and the tool, not about the answers.",
      blocks: [{ faq: true }]
    },
    {
      id: "finish", ch: "end", kind: "answer",
      title: "Seminar complete",
      lead: "Your written answers, and the questions you went through.",
      blocks: [
        { widget: "marks" },
        { answers: true }
      ]
    }
  ],

  faq: [
    {
      q: "The package numbers are not the same as in Part 1.",
      a: "The number of a package (for example 1.A) may change between the models of Part 1 and of the marked seminar. Its name is always the same, for example **Use Cases and Scenarios**: look for the name."
    },
    {
      q: "Where do the new signals go?",
      a: "New physical signals go in the package **B - Functional Data** of **2 - Functional Analysis** (Note 1 of Task 3)."
    },
    {
      q: "Can I put a signal on a message to self?",
      a: "No. Signals describe an exchange, so they only go on messages between two lifelines. A message to self represents a behavior: it has no signal (Note 2 of Task 3)."
    },
    {
      q: "A new port appeared when I connected two parts. Is that normal?",
      a: "Yes. When you connect an existing port to a target part, Cameo (MagicDraw) automatically creates on the target a conjugated port typed by the same interface."
    },
    {
      q: "What is the difference between a functional flow and a physical flow?",
      a: "The functional flow is the business concept and focuses on the goal (stop signal, energy, insecticide product). The physical flow is the solution chosen to achieve it (a 5 mV electrical signal, a 240 V supply…).\n\nFrom a functional point of view, the Flight Plan is a list of positions, but we know neither the format, nor the encoding, nor theoretically the means of communication.\n\nThe physical flow is characterized data: we are talking about a 12 V, 100 mA supply at a given frequency, or a signal transmitted by UDP frame every 500 ms."
    },
    {
      q: "How to insert a breakpoint for the simulation?",
      a: "Right-click on the function in the diagram, then {{Simulation > Add Breakpoint}}."
    }
  ],

  /* Things noticed while converting the Word handout. Shown on the Authoring to-do board. */
  authorNotes: [
    { scene: "welcome", text: "Authors: this handout spells “Mayssa Chebbi”, the Part 1 guide (content/config.js) “Mayssa Chebi”. One of the two is wrong." },
    { scene: "load-model", text: "The handout writes “.mzip” and asks for two files (UAV_BE*.mdzip and SAMAREQ_Profile.mdzip), while the Part 1 guide gives one file. The guide says .mdzip and two files. Check on the LMS." },
    { scene: "top-down", text: "The note speaks of detailing the “Avoid Bear Approach” case, while Tasks 2 and 3 name the use case “Protect the sheeps from predators”. The guide says “the use case about predators”." },
    { scene: "t1-context", text: "The handout says “Display as Image”; the screenshot shows the tooltip “Show as Image”. The guide follows the screenshot." },
    { scene: "t2-use-case", text: "Names kept as written in the handout: “Protect the sheeps from predators” (sheeps), “Surveillance of sheep in a safe zone area”. Part 1 calls a use case “Surveillance of a \"safe zone\" area”. Check the exact names in the marked model." },
    { scene: "t2-use-case", text: "How does the Extension Points window open (from the use case, or while drawing the Extend relation)? Neither handout says it. Once confirmed, start step 3 with that gesture." },
    { scene: "t3-scenario", text: "The grammar of scenario 1 was corrected (enter/enters, thus/so, deploy counter action/deploys counter actions). Check that the meaning is unchanged." },
    { scene: "requirements", text: "The handout does not say which boundary the alert line (< 1 km from the flock) is: the tracking perimeter or the safe zone of the three steps. The guide does not explain it until you confirm." },
    { scene: "q4", text: "The handout does not name the state machine of Question 4, nor say whether the predator states already exist. The guide assumes SOI - Pasture Sentinel (named in Question 7) and existing states. Check in the marked model." },
    { scene: "q2", text: "Question 2 speaks of “the connectors previously created in task 2.1”: the connectors are created in Task 1. The guide says Task 1." },
    { scene: "q3", text: "“Only consider the steps related to tracing” was read as “tracking”." },
    { scene: "q5", text: "The sheep monitoring function is assumed to be under A - Functional architecture: the handout does not say where it is." },
    { scene: "q5", text: "No model chip for “Monitoring Predator”, the sheep monitoring function, “Start Predator Tracking”, the package “tracking predator” or the function “engage predator”: their paths in the marked model are not known. Add them to part2/content/model-links.js once checked." },
    { scene: "q7", text: "The Simulation panel of this guide never lists the signals (simPreview: false in part2/content/config.js): it only follows the states that Cameo publishes. Its steps are named Predator tracking and Predator counteraction; a state named otherwise in the model leaves the drone where it is." },
    { scene: "q9", text: "The handout calls the matrix “C – Function Allocation”; the Part 1 model links call it “Function Allocation”. Check the name." },
    { scene: "marking", text: "Points as in the handout: 19 points plus 1 bonus point (Question 6). The model-link ids are reused from Part 1 and were not checked in the marked model." },
    { scene: "three-steps", text: "The three pictures of the handout were redrawn as an animation. The originals are in part2/assets/img/bear-step-*-original.png and shown in the tip under it." }
  ]
};
