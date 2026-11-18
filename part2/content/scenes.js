/* Part 2, the marked seminar: chapters, then scenes in reading order. One scene = one idea.
   Same engine, marks and blocks as Part 1 (see content/scenes.js at the root for the list).

   This seminar is marked. The scenes say WHAT each task asks for and WHERE to work in the model,
   never exactly what to do: no signal names, no transitions, no function names, no subsystem
   choices, no allocations, no solution blocks. When a gesture is needed, a { recall } block sends
   the student back to the scene of Part 1 that shows it.
   One exception, asked by the teachers: after Question 2, the scene q2-auto gives its answer for the alerts and builds
   their ports in the student's model (widget cameoTask), so that nobody loses the session on ports. The counter actions
   (drone to bear) stay the student's, unnamed.

   Extra fields used here:
     pts: 2           points of the question, shown next to the kind ("2 pts")
   Extra blocks:
     { recall: { items: [{ id: "a-messages", title: "Send messages between actors" }] } }
                      links to scenes of Part 1 (config.recallBase), opened in a new tab
     { icons: [{ src, alt, label }] }      a row of small pictures, each with its label
     { question: { type: "text", ... } }   a free-text answer */
window.COURSE = {
  /* Levels of the method: each tagged chapter takes the colour of its level (see content/scenes.js of Part 1). */
  phases: [
    { id: "op", title: "Operational analysis", short: "Operational", q: "What is expected of the system?" },
    { id: "fn", title: "Functional architecture", short: "Functional", q: "How does it do it?" },
    { id: "ph", title: "Physical architecture", short: "Physical", q: "Who does what?" }
  ],

  chapters: [
    { id: "brief", code: "0", title: "Briefing", blurb: "How the marked seminar works." },
    { id: "setup", code: "1", title: "Set up Cameo", blurb: "Start the tool and open the model." },
    { id: "problem", code: "2", title: "The problem", blurb: "A bear near the flock." },
    { id: "T1", code: "T1", title: "Operational context", blurb: "Bring the bear into the context.", phase: "op" },
    { id: "T2", code: "T2", title: "Use cases", blurb: "A use case against predators.", phase: "op" },
    { id: "T3", code: "T3", title: "Scenario", blurb: "Scenarios, sequence diagram, flows.", phase: "op" },
    { id: "T4", code: "T4", title: "Functional architecture", blurb: "Functions, state machine, activities, simulation.", phase: "fn" },
    { id: "T5", code: "T5", title: "Physical architecture", blurb: "Subsystems for the new functions.", phase: "ph" },
    { id: "T6", code: "T6", title: "Allocation", blurb: "Give each new function to a subsystem.", phase: "ph" },
    { id: "T7", code: "T7", title: "White box scenario", blurb: "Replay the scenario between the subsystems.", phase: "ph" },
    { id: "end", code: "✓", title: "Hand in", blurb: "Show your model, your answers." }
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
            { n: "3", title: "Call the teacher", text: "At each task, call the teacher to come and see your model. There is no work to take away and no report to submit afterwards." }
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
        { p: "Keep the [Part 1 guide](../part1/index.html) open in another tab, or your Part 1 handout." },
        {
          callout: {
            tone: "note", title: "Package numbers may change",
            text: "The number of a package (for example 1.A) may change between the models of Part 1 and of this seminar, but its name is always the same, for example **Use Cases and Scenarios**. Look for the name."
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
        { download: { label: "File to open", file: "UAV_BE_Note_2026 _BE GRADED - Student.mdzip", src: "assets/models/UAV_BE_Note_2026 _BE GRADED - Student.mdzip", size: "649 KB" } },
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
        }
      ]
    },
    {
      id: "install-plugin", ch: "setup", kind: "do",
      title: "Install the OMF-ISAE plugin",
      lead: "The exercise needs the OMF-ISAE plugin. Install it from the plugin manager.",
      blocks: [
        {
          tabs: [
            {
              label: "Standard", sub: "Cameo's plugin manager",
              blocks: [
                { download: { label: "Plugin to install", file: "com.elliades.mbseShepherd_1.7.0.zip", src: "../assets/plugins/com.elliades.mbseShepherd_1.7.0.zip", size: "20 MB" } },
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
                { download: { label: "Plugin archive", file: "com.elliades.mbseShepherd_1.7.0.zip", src: "../assets/plugins/com.elliades.mbseShepherd_1.7.0.zip", size: "20 MB" } },
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
                { download: { label: "Plugin archive", file: "com.elliades.mbseShepherd_1.7.0.zip", src: "../assets/plugins/com.elliades.mbseShepherd_1.7.0.zip", size: "20 MB" } },
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

    /* ───────────────────────── 2 · The problem ───────────────────────── */
    /* Link this guide to Cameo: the same scene in the four parts (js/pairing-scene.js). */
    window.PAIRING_SCENE(),
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
        },
        {
          p: "Your company already has a shepherd solution that monitors the sheep. This seminar tackles the new requirement, the bear, by improving the drone."
        },
        {
          icons: [
            { src: "../assets/sim/Drone-without-circle.svg", alt: "Drone icon", label: "Your drone" },
            { src: "../assets/sim/sheep.svg", alt: "Sheep icon", label: "The sheep" },
            { src: "../assets/sim/bear.svg", alt: "Bear icon", label: "The bear" }
          ]
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
            { n: "1", icon: "moon", tone: "note", title: "See in the dark", text: "The bear also moves at night. Your solution must detect the animal in the dark, with an infrared camera and recognition software." },
            { n: "2", icon: "binoculars", tone: "tip", title: "Follow from a distance", text: "If a bear is detected, the drone must change its flight plan to follow it from a distance and assess the risk of approach." },
            { n: "3", icon: "bell", tone: "warn", title: "Alert and scare", text: "If the bear crosses the alert line (less than 1 km from the flock) and heads towards the flock, the drone must send an alert signal to the shepherds concerned, and try to scare the bear." }
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
        { p: "The six tasks sit in three layers, from the operational to the physical. Each task asks one question:" },
        { h: "Operational layer" },
        {
          callout: {
            tone: "note", title: "Task 1",
            text: "Has the operational context changed?"
          }
        },
        {
          callout: {
            tone: "note", title: "Task 2",
            text: "Do we need a new use case?"
          }
        },
        {
          callout: {
            tone: "note", title: "Task 3",
            text: "What are the scenarios: the sunny day (**SD**), the rainy days (**RD**), the alternatives (**ALT**)?"
          }
        },
        { h: "Functional layer" },
        {
          callout: {
            tone: "warn", title: "Task 4",
            text: "Do we need new modes and new functions?"
          }
        },
        { h: "Physical layer" },
        {
          callout: {
            tone: "tip", title: "Task 5",
            text: "Do we already have all the hardware and software (**HW/SW**)?"
          }
        },
        {
          callout: {
            tone: "tip", title: "Task 6",
            text: "Allocate the new functions to the hardware."
          }
        }
      ]
    },

    /* ───────────────────────── T1 · Operational context ───────────────────────── */
    {
      id: "op-intro", ch: "T1", kind: "read", mark: "intro",
      title: "First, what changes around the system",
      lead: "A bear is a new actor around the flock. As in Part 1, we start from the outside of the system, with three diagrams that follow each other.",
      blocks: [
        { phases: "op" },
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "context", rename: { Operator: "Bear", GNSS: "Shepherd", Station: "Flock" }, title: "Context", text: "Who is around the system, and what does it exchange with them? The bear joins the operational context." },
              { pic: "usecase", rename: { Parameter: "Protect", Mission: "sheep" }, title: "Use case", text: "What service does the system now deliver? A new use case, linked to the actors it involves." },
              { pic: "scenario", rename: { Operator: "Bear", Station: "UAV", UAV: "Shepherd" }, title: "Scenario", text: "How does it unfold? The scenario tells it, message by message, between the drone and its actors." }
            ]
          }
        },
        { p: "Each diagram feeds the next one, and the last one checks the first: keep this loop in mind through the three tasks." }
      ]
    },
    {
      id: "t1-context", ch: "T1", kind: "do", ref: "Task 1",
      title: "Bring the bear into the operational context",
      lead: "Complete the operational context diagram: add the bear and connect it to the SoI.",
      blocks: [
        { path: "op-context" },
        {
          steps: [
            "Open the **Operational Context** diagram.",
            "Add the [[bear-part|bear]] to the diagram. The bear part is already in the model: you do not create it."
          ]
        },
        {
          tip: {
            label: "Show the bear as a bear",
            blocks: [
              { p: "Select the block named [[bear-part|bear]] on the diagram, then click {{Show as Image}} in the toolbar of the diagram." },
              { figure: { src: "assets/img/show-as-image.png", w: 453, h: 108, size: "sm", alt: "Toolbar of the Operational Context diagram, with the tooltip Show as Image on one of its buttons.", caption: "The Show as Image button." } }
            ]
          }
        },
        {
          callout: {
            tone: "note", title: "How the drone sees around it",
            text: "The drone already watches the sheep: its port **infrared light** is connected to the **sheep**. Its infrared camera acquires what is around it, day and night."
          }
        },
        {
          steps: [
            "Connect the bear to the SoI: draw **one connector** from the **infrared light** port of the drone to the bear. Do not create any port: the connector alone is enough here."
          ],
          start: 3
        },
        {
          callout: {
            tone: "note", title: "The other exchanges come later",
            text: "What else the bear, the drone and the shepherd exchange is the subject of Question 2. Right after it, the guide creates the ports and their flows in your model for you."
          }
        },
        { recall: { items: [
          { id: "m-fp-port", title: "Create the ports and connections for the flight plan" }
        ] } }
      ]
    },

    /* ───────────────────────── T2 · Use cases ───────────────────────── */
    {
      id: "link-ctx-uc", ch: "T2", kind: "read", mark: "link",
      title: "From the context to the use cases",
      lead: "The bear is now in the operational context. Which service must the system deliver because of it?",
      blocks: [
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "context", rename: { Operator: "Bear", GNSS: "Shepherd", Station: "Flock" }, done: true, title: "Context", text: "Task 1: the bear stands next to the drone, connected to it." },
              { pic: "usecase", rename: { Parameter: "Protect", Mission: "sheep" }, title: "Use case", text: "Task 2: the same actor appears on the use case diagram, linked to what the system does about it." }
            ]
          }
        },
        { p: "The context says **who** is around the system. The use cases say **what** the system offers about each of them. An actor of the context with no use case, or a use case with no actor of the context, is a sign that something is missing." }
      ]
    },
    {
      id: "t2-actor", ch: "T2", kind: "do", ref: "Task 2",
      title: "Add the Bear actor",
      lead: "The Bear actor is already declared in the model. Put it on the use case diagram.",
      blocks: [
        { path: "bear-actor" },
        {
          steps: [
            "Open the use case diagram [[uc-diagram]].",
            "Drag and drop the [[bear-actor|Bear]] actor from the Model Browser onto the diagram."
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
      id: "t2-extend-brief", ch: "T2", kind: "read",
      title: "Extend and extension points",
      lead: "Before you create the new use case, a short reminder of the «extend» relationship, with an example that has nothing to do with bears.",
      blocks: [
        {
          figure: {
            src: "assets/img/extend-uber.svg", w: 800, h: 420,
            alt: "Use case diagram of a ride-hailing app. The Passenger actor is linked to the use case Transport passenger from A to B, which shows an extension point named Passenger needs assistance. A dashed arrow labelled extend goes from the use case Transport a disabled person to the base use case. A note on the arrow gives the condition, wheelchair requested, and the extension point, Passenger needs assistance.",
            caption: "Uber: transporting a disabled person extends the ordinary ride."
          }
        },
        {
          cards: [
            { n: "1", title: "The base use case", text: "**Transport passenger from A to B** is the ordinary ride: book, pick up, drive, drop off. It is complete on its own and does not know the extension exists." },
            { n: "2", title: "The extension point", text: "A named place in the base use case where extra behaviour may plug in: here **Passenger needs assistance**. It is listed in a compartment of the base use case." },
            { n: "3", title: "The «extend» relationship", text: "A dashed arrow **from the extension to the base**. Under a condition (a wheelchair is requested), **Transport a disabled person** adds its behaviour at the extension point: adapted vehicle, help to get in and out." }
          ]
        },
        {
          callout: {
            tone: "goal", title: "Each use case has value on its own",
            text: "If Uber only ever built the ordinary ride, it would still deliver value to its passengers. Transporting a disabled person is also a real service with its own value. «extend» does not cut one use case into pieces: it links two use cases that each make sense alone, and says where and when one enriches the other."
          }
        },
        {
          callout: {
            tone: "warn", title: "Do not overdo it",
            text: "A use case diagram says **what** the system offers to its actors, not **how** or in which order. Do not chain «extend» arrows to express if/then logic or steps: that belongs to the scenarios (sequence diagrams) and the activities you build later. Use «extend» only when a second goal of value hooks onto an existing one."
          }
        }
      ]
    },
    {
      id: "t2-use-case", ch: "T2", kind: "do", ref: "Task 2",
      title: "Create the use case and the extend relationship",
      lead: "A new use case for predators, extending the surveillance use case.",
      blocks: [
        {
          steps: [
            "Create the use case <<Protect the sheep from predators>>.",
            "Create an **extend** relationship from <<Protect the sheep from predators>> to **Surveillance of sheep in a safe zone area**. Cameo creates the extension point on the surveillance use case with this relationship: name it <<Predator entering the safe zone>>.",
            "The surveillance use case still applies as before; when a bear enters the safe zone, the new use case takes over."
          ]
        }
      ]
    },
    {
      id: "t2-link", ch: "T2", kind: "do", ref: "Task 2",
      title: "Link the new use case",
      lead: "Link the use case to the other elements, as seen in the previous exercise and in the lesson.",
      blocks: [
        { steps: ["Link the use case <<Protect the sheep from predators>> to the other elements of the diagram."] },
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
            "Task 1: the bear is on the operational context diagram, connected to the **infrared light** port of the drone.",
            "Task 2: the Bear actor and the new use case are on the use case diagram, **Surveillance of sheep in a safe zone area** has the extension point **Predator entering the safe zone**, and the new use case is linked."
          ]
        },
        { call: "Ready? Raise your hand and show Tasks 1 and 2 to a teacher." }
      ]
    },

    /* ───────────────────────── T3 · Scenario ───────────────────────── */
    {
      id: "link-uc-sc", ch: "T3", kind: "read", mark: "link",
      title: "From the use case to its scenarios",
      lead: "A use case names a goal. It does not say how the goal is reached: that is the job of the scenarios.",
      blocks: [
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "usecase", rename: { Parameter: "Protect", Mission: "sheep" }, done: true, title: "Use case", text: "Task 2: the new use case gives the goal, protect the sheep from predators." },
              { pic: "scenario", rename: { Operator: "Bear", Station: "UAV", UAV: "Shepherd" }, title: "Scenario", text: "Task 3: a sequence diagram, owned by that use case, tells one way it unfolds, message by message." }
            ]
          }
        },
        { p: "The lifelines of the scenario are the actors of the use case, and the drone. One use case usually has several scenarios: the sunny day, the rainy days, the alternatives." }
      ]
    },
    {
      id: "t3-scenario", ch: "T3", kind: "read", ref: "Task 3",
      title: "Scenario 1",
      lead: "Task 3: create a sequence diagram in the use case \"Protect the sheep from predators\", from the following scenario.",
      blocks: [
        { h: "Description of scenario 1" },
        {
          list: [
            "The drone receives an infrared signal from an animal on the ground.",
            "After analysis of this signal, it appears that the thermal and gestural signature of the animal corresponds to a bear.",
            "The drone calculates the position of the bear.",
            "The bear enters the tracking perimeter, so the SOI shall start tracking the predator.",
            "It turns out that the bear enters the safe area.",
            "The drone deploys counter actions: it sends an alert signal to the shepherd and tries to scare the bear away with sound and light."
          ]
        },
        {
          callout: {
            tone: "note", title: "The story as the customer tells it",
            text: "Scenario 1 is the story where everything goes as planned. In the pasture, many other things can happen: before you model anything, Question 1.0 asks which stories the drone must be ready for."
          }
        }
      ]
    },
    {
      id: "q1-0", ch: "T3", kind: "answer", ref: "Question 1.0", pts: 2,
      title: "Question 1.0: the scenarios to consider",
      lead: "Protecting the flock from a bear is not a single story. Which scenarios must the drone be ready for?",
      blocks: [
        { p: "Put yourself in the shoes of the shepherd who buys the drone: what can happen in the pasture, what can go wrong, and what must the drone still do then? A use case is only covered when its main scenarios are known." },
        {
          cards: [
            { n: "SD", title: "Sunny day", text: "The nominal story: everything goes as planned and the goal of the use case is reached." },
            { n: "RD", title: "Rainy day", text: "Something goes wrong: an event, a failure or a condition prevents the nominal story. What happens to the goal, and how does the system react?" },
            { n: "ALT", title: "Alternative", text: "Another path to the same goal: the situation differs from the nominal one, yet the goal is still reached." }
          ]
        },
        {
          question: {
            id: "q1-0", type: "list", initial: 3,
            prompt: "List at least 3 scenarios of the use case <<Protect the sheep from predators>>, with at least one of each kind. For each one, give its kind (SD, RD or ALT), then in one sentence what happens and how it ends for the flock.",
            itemLabel: "Scenario"
          }
        },
        {
          callout: {
            tone: "goal", title: "Think business, not diagram",
            text: "This question is about the stories, not about Cameo. A good scenario names a trigger, what the drone and the other actors do, and an outcome the shepherd cares about."
          }
        }
      ]
    },
    {
      id: "q1-1", ch: "T3", kind: "do", ref: "Question 1.1", pts: 2,
      title: "Question 1.1: model the sunny day scenario",
      lead: "In the use case \"Protect the sheep from predators\", model your sunny day scenario (Scenario 1) as a sequence diagram.",
      blocks: [
        {
          steps: [
            "Create the sequence diagram from the use case <<Protect the sheep from predators>>, so that it stays attached to it.",
            "Tell the story of the sunny day in the diagram: who takes part, what they exchange, and what the drone does on its own, in the order the shepherd would tell it."
          ]
        },
        {
          callout: {
            tone: "note", title: "Stay consistent with the model",
            text: "The scenario belongs to the model, not next to it. Its participants should match the actors of the use case and the operational context. Reuse the elements that already exist (signals, actors, parts) before creating new ones; new physical signals go in [[fd-root]]."
          }
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
      id: "link-sc-ctx", ch: "T3", kind: "read", mark: "link",
      title: "Back to the context: is it consistent?",
      lead: "The scenario is written. Now we go back up to the first diagram, to check that both tell the same story.",
      blocks: [
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "scenario", rename: { Operator: "Bear", Station: "UAV", UAV: "Shepherd" }, done: true, title: "Scenario", text: "Question 1.1: every message between the drone and an actor crosses the boundary of the system." },
              { pic: "context", rename: { Operator: "Bear", GNSS: "Shepherd", Station: "Flock" }, title: "Context", text: "Question 2: each of these messages must travel on a port and a connector of the operational context." }
            ]
          }
        },
        { p: "This is the bottom-up part of the approach: the scenario reveals exchanges that the context did not show yet, so the context is updated." }
      ]
    },
    {
      id: "q2", ch: "T3", kind: "answer", ref: "Question 2", pts: 2,
      title: "Question 2: back to the context diagram",
      lead: "Your scenario brings new flows. Which ones must the operational context show?",
      blocks: [
        { path: "op-context" },
        { p: "Read your sunny day scenario (Question 1.1) again, message by message. Every message that crosses the boundary of the drone is a physical flow, and the operational context diagram must show it, on a connector between the drone and an actor." },
        {
          question: {
            id: "q2a", type: "text",
            prompt: "Overall, which information must be added to the operational context? Group it by kind, and for each kind say between which elements it goes and in which direction.",
            hint: "One line per kind of information: what it is, from where, to where."
          }
        },
        { call: "Show your answer to a teacher before you go on: the next scene gives it away." }
      ]
    },
    {
      id: "q2-auto", ch: "T3", kind: "do", ref: "Question 2",
      title: "The exchanges: the alerts by the button, the counter actions by you",
      lead: "Creating every port by hand takes long and teaches little more than Part 1 did. One click builds the alerts in your model; the connections from the drone to the bear are yours.",
      blocks: [
        {
          callout: {
            tone: "warn", title: "Question 2 first",
            text: "This scene gives the answer of Question 2. Write yours and show it to a teacher before you read on."
          }
        },
        { widget: "exchangeStory" },
        { p: "The signals are those of the reference sequence diagram, in [[fd-root]] (**Predator Position** is created if your model has none). Keep your own sequence diagram, but use these signals from now on." },
        {
          steps: [
            "Pair this guide with Cameo (the **Cameo** button at the top) and keep your Part 2 model open.",
            "Click the button below.",
            "Open the **Operational Context** diagram: the coloured ports and connectors are the ones the button made, in the colours of the animation.",
            "Open the interface block **IF_Predator_Alert** in the containment tree: one flow property per signal, with its direction."
          ]
        },
        { widget: "cameoTask", opts: { task: "part2-predator", label: "Create the alerts in my model", model: "your Part 2 model" } },
        { pair: true },
        {
          tip: {
            label: "No link with Cameo? Build them by hand",
            blocks: [
              { p: "The alerts only: the counter actions are yours in any case. All interface blocks go under **D - Physical Interfaces**. The port of the drone (of the base station, for the relay) is typed by the interface block; the port at the other end by the same block, conjugated (~)." },
              {
                list: [
                  "**infrared light** (already on the drone) : IF_Infrared_Light, add **in** Bear Signature. On the bear: **infrared light** : ~IF_Infrared_Light.",
                  "**predator alert** : IF_Predator_Alert on the drone, **out** Predator Position and **out** Predator entering safe perimiter. On the base station: **drone alert** : ~IF_Predator_Alert.",
                  "**shepherd alert** : IF_Predator_Alert on the base station (the same interface: it relays). On the shepherd: **predator alert** : ~IF_Predator_Alert."
                ]
              }
            ]
          }
        },
        { h: "Your turn: from the drone to the bear" },
        { p: "Connect the drone to the bear for the counter actions of your scenario, on the **Operational Context** diagram." },
        {
          callout: {
            tone: "note", title: "Before you draw a connector",
            text: "Create first, for each exchange, the **port**, its **interface block** under **D - Physical Interfaces** and a **flow property typed by the signal**, with its direction. Then type the port at the other end by the same interface block, conjugated (~), and only then draw the connector."
          }
        },
        { recall: { items: [{ id: "m-fp-port", title: "Create the ports and connections for the flight plan" }] } }
      ]
    },
    {
      id: "op-outro", ch: "T3", kind: "read", mark: "outro",
      title: "What is expected of the system is now in the model",
      lead: "Context, use case and scenario now tell the same story about the bear.",
      blocks: [
        { phases: "op" },
        {
          widget: "phaseSteps", opts: {
            done: true,
            steps: [
              { pic: "context", rename: { Operator: "Bear", GNSS: "Shepherd", Station: "Flock" }, title: "Context", text: "The bear and the shepherd exchange flows with the drone, through its ports." },
              { pic: "usecase", rename: { Parameter: "Protect", Mission: "sheep" }, title: "Use case", text: "Protecting the sheep from predators extends the surveillance of the flock." },
              { pic: "scenario", rename: { Operator: "Bear", Station: "UAV", UAV: "Shepherd" }, title: "Scenario", text: "The sunny day tells, message by message, how the drone deals with the bear." }
            ]
          }
        },
        { p: "We know *what* is expected. The next layer answers *how* the drone does it." }
      ]
    },

    /* ───────────────────────── T4 · Functional architecture ───────────────────────── */
    {
      id: "fn-intro", ch: "T4", kind: "read", mark: "intro",
      title: "Now, how the system does it",
      lead: "The functional layer starts from the scenario: what the drone has to do to play it, and when.",
      blocks: [
        { phases: "fn" },
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "functions", title: "Functions", text: "Question 3: each message the drone handles in the scenario reveals a function." },
              { pic: "stmFn", title: "Mission steps", text: "Question 4: the state machine gives the modes of the mission, and the signals that move from one to the next." },
              { pic: "actFn", title: "Logic", text: "Questions 5 and 6: an activity says in which order, and on which condition, a function runs." },
              { pic: "simRun", title: "Simulation", text: "Question 7: play it all with the signals of the scenario." }
            ]
          }
        }
      ]
    },
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
      id: "link-fn-st", ch: "T4", kind: "read", mark: "link",
      title: "From the functions to the mission steps",
      lead: "The functions say what the drone does. They do not say when.",
      blocks: [
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "functions", done: true, title: "Functions", text: "Question 3: the new functions are in the functional architecture." },
              { pic: "stmFn", title: "Mission steps", text: "Question 4: the state machine says in which mode each function runs, and which signal of the scenario changes the mode." }
            ]
          }
        },
        { p: "The signals on the transitions are the messages of your scenario: the state machine and the sequence diagram must speak the same language." }
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
      id: "link-st-logic", ch: "T4", kind: "read", mark: "link",
      title: "From a mission step to its logic",
      lead: "A state runs a function. What happens inside that function?",
      blocks: [
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "stmFn", done: true, title: "Mission steps", text: "Question 4: a state of the machine runs a function while the drone is in it." },
              { pic: "actFn", title: "Logic", text: "Questions 5 and 6: the activity diagram of that function details its actions, its decisions and the signals it sends." }
            ]
          }
        },
        { p: "The signals an activity sends are, again, those of the scenario and of the ports of the context." }
      ]
    },
    {
      id: "q5", ch: "T4", kind: "do", ref: "Question 5", pts: 2,
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
      id: "q6", ch: "T4", kind: "do", ref: "Question 6", pts: 1,
      title: "Question 6: Start Predator Tracking",
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
      id: "link-logic-sim", ch: "T4", kind: "read", mark: "link",
      title: "The state machine and its behaviour, played together",
      lead: "The modes and the functions are drawn apart. Only a simulation shows whether, together, they play the scenario.",
      blocks: [
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "stmFn", done: true, title: "State machine", text: "Question 4: the modes, the signals between them, and the function each mode runs." },
              { pic: "actFn", done: true, title: "Behaviour", text: "Questions 5 and 6: what each function does, and the signals it sends." },
              { pic: "simRun", title: "Simulation", text: "Question 7: the scenario sends its signals one after the other. The machine changes mode, each mode runs its function, and the story must reach its end." }
            ]
          }
        },
        { p: "A state that is never entered, a function that never runs, or a signal that nobody waits for: the simulation shows it at once. It closes the loop of the functional layer, by checking the functions against the operational scenario you started from." }
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
        { h: "Check it with a scenario" },
        { p: "Link this guide to Cameo with the **Cameo** button at the top, open your model, then play the scenario: the guide sends the signals of the mission to your simulation, one after the other, and says for each step what passes and what fails. A failed step is a clue: fix your model and play again." },
        { widget: "stmCheck" },
        { call: "Done? Raise your hand and show this question to a teacher." },
        { h: "Optional: watch the drone" },
        { p: "If the OMF-ISAE plugin of Part 1 is installed in your Cameo, pair this guide with Cameo: the drone of the **Simulation** panel, at the top of the page, follows the states of your simulation." },
        { pair: "How to pair this guide with Cameo" },
        { widget: "simHint" }
      ]
    },
    {
      id: "fn-outro", ch: "T4", kind: "read", mark: "outro",
      title: "How the drone deals with the bear is now in the model",
      lead: "The new functions, the modes that run them and their logic play the scenario.",
      blocks: [
        { phases: "fn" },
        {
          widget: "phaseSteps", opts: {
            done: true,
            steps: [
              { pic: "functions", title: "Functions", text: "The new functions, revealed by the scenario." },
              { pic: "stmFn", title: "Mission steps", text: "The state machine runs them, mode by mode." },
              { pic: "actFn", title: "Logic", text: "Their activities detail the actions and the signals." },
              { pic: "simRun", title: "Simulation", text: "The machine plays the scenario." }
            ]
          }
        },
        { p: "We know *how* the drone does it. The last layer answers *who* does it: which hardware and software." }
      ]
    },

    /* ───────────────────────── T5 · Physical architecture ───────────────────────── */
    {
      id: "ph-intro", ch: "T5", kind: "read", mark: "intro",
      title: "Last, who does what",
      lead: "The physical layer starts from the functions: which subsystems carry them out?",
      blocks: [
        { phases: "ph" },
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "breakdown", title: "Subsystems", text: "Question 8: do we have all the hardware and software the new functions need?" },
              { pic: "alloc", title: "Allocation", text: "Question 9: give each new function to a subsystem." },
              { pic: "architecture", title: "White box", text: "Question 10: open the drone, and replay the scenario between its subsystems." }
            ]
          }
        }
      ]
    },
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
      id: "link-alloc", ch: "T6", kind: "read", mark: "link",
      title: "Functions meet subsystems",
      lead: "The functional layer and the physical layer were built apart. Allocation ties them together.",
      blocks: [
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "functions", done: true, title: "Functions", text: "Task 4: what the drone must do." },
              { pic: "breakdown", done: true, title: "Subsystems", text: "Task 5: what the drone is made of." },
              { pic: "alloc", title: "Allocation", text: "Task 6: who does each function." }
            ]
          }
        },
        { p: "Think of the messages of the scenario: the subsystem that receives or sends one is often the one that carries out the function behind it." }
      ]
    },
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

    /* ───────────────────────── T7 · White box scenario ───────────────────────── */
    {
      id: "link-bb-wb", ch: "T7", kind: "read", mark: "link",
      title: "From the black box to the white box",
      lead: "In Task 3, the drone was one lifeline. Now we open it.",
      blocks: [
        {
          widget: "phaseSteps", opts: {
            steps: [
              { pic: "scenario", rename: { Operator: "Bear", Station: "UAV", UAV: "Shepherd" }, done: true, title: "Black box scenario", text: "Task 3: the drone exchanges messages with the bear and the shepherd, seen from outside." },
              { pic: "breakdown", done: true, title: "Subsystems", text: "Question 8: the drone is made of subsystems." },
              { pic: "architecture", title: "White box scenario", text: "Question 10: the same story, with one lifeline per subsystem." }
            ]
          }
        },
        { p: "The messages from and to the bear and the shepherd stay the same. What is new are the messages between the subsystems, inside the drone." }
      ]
    },
    {
      id: "q10", ch: "T7", kind: "do", ref: "Question 10", pts: 2,
      title: "Question 10: white box scenario, detecting the bear",
      lead: "Describe, as a white box sequence diagram, how the physical architecture detects the bear.",
      blocks: [
        {
          steps: [
            "Create a sequence diagram of the physical scenario \"detect the bear\", from the bear approaching to the bear being detected.",
            "Show the **actors** (the bear, the shepherd if he takes part) and the **subsystems** of the SoI that act in the scenario, each one as a lifeline.",
            "Draw the physical flows exchanged, in order, from the bear through the subsystems.",
            "If a subsystem is too coarse to tell who does what, **decompose it** and show its own subsystems instead."
          ]
        },
        {
          figure: {
            src: "assets/img/sequence-white-box.svg", w: 760, h: 360,
            alt: "A sequence diagram with three lifelines: bear, subSystemA and subSystemB. The bear sends a message to subSystemA, which sends a message to subSystemB. subSystemB answers to subSystemA, which answers to the bear.",
            caption: "The shape expected: bear → subSystemA → subSystemB. Rename the lifelines, and add as many subsystems as your solution needs."
          }
        },
        {
          callout: {
            tone: "note", title: "White box means visible inside",
            text: "A black box scenario stops at the SoI. Here the SoI is opened: every lifeline is a subsystem or an actor, and each message is a physical flow between them."
          }
        },
        { recall: { items: [{ id: "a-create-sd", title: "Create the sequence diagram" }, { id: "a-lifelines", title: "Add the lifelines" }, { id: "a-messages", title: "Send messages between actors" }] } },
        { call: "When your sequence diagram is finished, call the teacher to see it." }
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
      id: "finish", ch: "end", kind: "answer",
      title: "Seminar complete",
      lead: "Your written answers, and the questions you went through.",
      blocks: [
        { widget: "marks" },
        { answers: true }
      ]
    }
  ],

  /* Things noticed while converting the Word handout. Shown on the Authoring to-do board. */
  authorNotes: [
    { scene: "welcome", text: "Authors: this handout spells “Mayssa Chebbi”, the Part 1 guide (content/config.js) “Mayssa Chebi”. One of the two is wrong." },
    { scene: "load-model", text: "The handout writes “.mzip” and asks for two files (UAV_BE*.mdzip and SAMAREQ_Profile.mdzip), while the Part 1 guide gives one file. The guide says .mdzip and two files. Check on the LMS." },
    { scene: "top-down", text: "The note speaks of detailing the “Avoid Bear Approach” case, while Tasks 2 and 3 name the use case “Protect the sheep from predators”. The guide says “the use case about predators”." },
    { scene: "t1-context", text: "The handout says “Display as Image”; the screenshot shows the tooltip “Show as Image”. The guide follows the screenshot." },
    { scene: "t1-context", text: "Since 2026-11-15 the bear has no port in the starting model: students draw one connector from the drone's infrared light port (already connected to the sheep) to the bear. The handout still asks to use the bear's two ports and create conjugated ports: update it and the marking sheet." },
    { scene: "q2-auto", text: "The button calls exercise/apply part2-predator (mbseShepherd plugin 1.6.0 or later, relay allow-list in omf-core-framework). Older plugins answer unknown-method: the guide then says to install the latest one. The plugin zip offered in Setup must be rebuilt with it. Since 2026-11-15 the alerts go from the drone to the ground station (drone alert) and from the ground station to the shepherd (shepherd alert), one interface IF_Predator_Alert; a model where the first button joined the drone to the shepherd is repaired by a new click. The button colours the ports and connectors of the exchanges by kind, in the colours of the exchangeStory animation (red infrared, blue alerts). Since 2026-11-16 the counter actions (drone to bear) are left to the students, without their names: the scene only reminds them to create the port, the interface block and the flow property typed by the signal before drawing the connector. Expected at least light and sound (Light burst, Sound burst). A model where an earlier button built them keeps them. Update the handout and the marking sheet (points for these connections?)." },
    { scene: "t2-use-case", text: "Names kept as written in the handout: “Protect the sheep from predators” (sheep), “Surveillance of sheep in a safe zone area”. Part 1 calls a use case “Surveillance of a \"safe zone\" area”. Check the exact names in the marked model." },
    { scene: "t2-use-case", text: "How does the Extension Points window open (from the use case, or while drawing the Extend relation)? Neither handout says it. Once confirmed, start step 3 with that gesture." },
    { scene: "q1-0", text: "The Word handout of Part 2 still asks for the signals of Scenario 1 in Question 1.0, with Notes 1 and 2 in Task 3. The guide now asks for at least 3 scenarios (SD, RD, ALT) and leaves the signals to Question 1.1, less guided. Update the handout and the marking sheet." },
    { scene: "t3-scenario", text: "The grammar of scenario 1 was corrected (enter/enters, thus/so, deploy counter action/deploys counter actions). Check that the meaning is unchanged." },
    { scene: "requirements", text: "The handout does not say which boundary the alert line (< 1 km from the flock) is: the tracking perimeter or the safe zone of the three steps. The guide does not explain it until you confirm." },
    { scene: "q4", text: "The handout does not name the state machine of Question 4, nor say whether the predator states already exist. The guide assumes SOI - Pasture Sentinel (named in Question 7) and existing states. Check in the marked model." },
    { scene: "q2", text: "Question 2 now asks which information the operational context lacks, grouped by kind (infrared acquisition, to the shepherd, counter actions). Updating the context by hand was dropped: the next scene (q2-auto) builds it. Update the handout and the marking sheet." },
    { scene: "q3", text: "“Only consider the steps related to tracing” was read as “tracking”." },
    { scene: "q5", text: "The sheep monitoring function is assumed to be under A - Functional architecture: the handout does not say where it is." },
    { scene: "q5", text: "No model chip for “Monitoring Predator”, the sheep monitoring function, “Start Predator Tracking”, the package “tracking predator” or the function “engage predator”: their paths in the marked model are not known. Add them to part2/content/model-links.js once checked." },
    { scene: "q7", text: "The Simulation panel of this guide never lists the signals (simPreview: false in part2/content/config.js): it only follows the states that Cameo publishes. Its steps are named Predator tracking and Predator counteraction; a state named otherwise in the model leaves the drone where it is." },
    { scene: "q9", text: "The handout calls the matrix “C – Function Allocation”; the Part 1 model links call it “Function Allocation”. Check the name." },
    { scene: "marking", text: "Points out of 20: Question 6 is no longer a bonus, and the white box scenario (Question 10, 2 points) replaces Questions 8.1 and 8.2, so Questions 1.1 and 5 lost 1 point each. The Word handout and the marking sheet still have the old scale. The model-link ids are reused from Part 1 and were not checked in the marked model." },
    { scene: "three-steps", text: "The three pictures of the handout were redrawn as an animation. The originals are in part2/assets/img/bear-step-*-original.png and shown in the tip under it." }
  ]
};
