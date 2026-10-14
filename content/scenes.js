/* The whole course: chapters, then scenes in reading order. One scene = one idea.

   Inline marks usable in any text:
     **bold**   *italic*
     [[key]]            chip that points to a place in the model (see model-links.js)
     [[key|label]]      same, with another label
     {{Menu > Item}}    a menu, button or label of the Cameo interface
     ((icon))           small toolbar button image (see config.js > icons)
     <<text>>           a name to type in Cameo; tapping it copies it

   Scene kinds: "read" (understand), "do" (hands on in Cameo), "answer" (question
   from the handout), "try" (interactive, in the browser).

   Blocks: p, h, steps, list, figure, video, placeholder, callout, quote, path, copy, download,
   cards, widget, question, reveal, tip, faq, notes, answers, tabs, fromAnswer.
   A tip is an optional toggle around p, list and copy blocks; its steps are not counted for "Done".
   A placeholder marks something missing; its to-do list is only shown in author mode. */
window.COURSE = {
  chapters: [
    { id: "brief", code: "0", title: "Briefing", blurb: "What you are about to do, and with what." },
    { id: "setup", code: "1", title: "Set up Cameo", blurb: "Start the tool, load the model, learn three reflexes." },
    { id: "discover", code: "2", title: "Discover the model", blurb: "Find your way through the three levels." },
    { id: "mission", code: "3", title: "The mission", blurb: "What the drone is for." },
    { id: "A", code: "A", title: "Sequence diagram", blurb: "Turn a use case into a scenario." },
    { id: "B", code: "B", title: "Functions", blurb: "From the scenario to activities." },
    { id: "C", code: "C", title: "State machine", blurb: "States, transitions, signals, simulation." },
    { id: "D", code: "D", title: "Load Flight Plan", blurb: "Define a function with an activity diagram." },
    { id: "E", code: "E", title: "Allocation", blurb: "Give each function to a subsystem." },
    { id: "end", code: "✓", title: "Debrief", blurb: "FAQ and your answer sheet." }
  ],

  scenes: [
    /* ───────────────────────── 0 · Briefing ───────────────────────── */
    {
      id: "welcome", ch: "brief", kind: "read", bare: true,
      title: "Specify a drone's functional and physical architecture in SysML",
      blocks: [
        { widget: "cover" },
        {
          placeholder: {
            kind: "text", title: "Practical information for the session",
            todo: [
              "Expected duration of Part 1",
              "What students hand in, and how (LMS, e-mail, on paper)",
              "Whether Questions 1 and 2 are graded",
              "Who to contact when stuck"
            ]
          }
        }
      ]
    },
    {
      id: "objectives", ch: "brief", kind: "read",
      title: "Two objectives",
      lead: "By the end of this exercise you will have done both.",
      blocks: [
        {
          cards: [
            { n: "1", title: "Model an autonomous drone in SysML", text: "Use SysML modeling for designing an autonomous drone system." },
            { n: "2", title: "Work in an industrial tool", text: "Practice SysML modeling in Catia Magic System of Systems Architect (ex. Cameo Systems Modeler)." }
          ]
        },
        {
          callout: {
            tone: "note", title: "Cameo, for short",
            text: "This guide says **Cameo** to refer to the tool. You can read **Magic CSE** instead: it is the same thing here."
          }
        },
      ]
    },
    {
      id: "nine-diagrams", ch: "brief", kind: "read",
      title: "Four diagrams out of nine",
      lead: "SysML has 9 diagrams. You will have to handle 4 of them: the use case diagram, the sequence diagram, the activity diagram and the internal block diagram.",
      blocks: [{ widget: "diagrams9" }]
    },
    {
      id: "method", ch: "brief", kind: "read",
      title: "Three stages of analysis",
      lead: "We focus on the Operational Analysis, Functional Analysis and Physical Analysis stages, following a simplified version of the method used by Samares Engineering.",
      blocks: [
        { widget: "stages" },
        { p: "The model you are about to open is organised the same way: one package per stage." }
      ]
    },
    {
      id: "soi", ch: "brief", kind: "read",
      title: "Your System of Interest",
      lead: "During this exercise, the System of Interest (SoI) is a drone which can follow a flight plan autonomously.",
      blocks: [
        { widget: "scope" },
        {
          callout: {
            tone: "note", title: "Out of scope for the moment",
            text: "The **Ground Station** is not part of our scope of study. It talks to the drone, but you do not design it."
          }
        }
      ]
    },
    {
      id: "handout", ch: "brief", kind: "read",
      title: "Get the handout",
      lead: "Optional. The handout is the written version of this guide: keep it open or print it to follow the exercise on paper.",
      blocks: [
        {
          tip: {
            label: "Optional: download the handout",
            blocks: [
              { p: "The handout has the same steps as this guide, in full sentences. Nothing here is required to do the exercise." },
              { download: { label: "Handout", file: "BE Cameo - Part 1 - Discover -2025 (MAJ).docx", src: "assets/docs/BE Cameo - Part 1 - Discover -2025 (MAJ).docx", size: "1.7 MB" } }
            ]
          }
        }
      ]
    },

    /* ───────────────────────── 1 · Set up Cameo ───────────────────────── */
    {
      id: "start-tool", ch: "setup", kind: "do",
      title: "Start the tool",
      lead: "Cameo runs with a floating license served by the school.",
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
        { copy: { label: "Port number", value: "1101" } },
        {
          placeholder: {
            kind: "screenshot", title: "License dialog, filled in",
            todo: ["Screenshot of the floating license dialog with the server name and port typed in", "Blur anything that is not the two fields"]
          }
        }
      ]
    },
    {
      id: "perspective", ch: "setup", kind: "do",
      title: "Choose the Systems Engineer perspective",
      lead: "The perspective decides which menus and diagrams Cameo shows you.",
      blocks: [
        {
          steps: [
            "When the tool starts, choose the **Systems Engineer** perspective: the entry with the SysML icon.",
            "Tick {{Expert}} at the bottom of the window."
          ]
        },
        {
          figure: {
            src: "assets/img/env-selection.png", w: 995, h: 649,
            alt: "Cameo environment selection window. The first entry, with the OMG SysML logo, is selected and the Expert checkbox is ticked.",
            caption: "Pick the SysML entry, tick Expert, then continue."
          }
        },
        {
          callout: {
            tone: "tip", title: "Missed it?",
            text: "You can do it later, once the model is loaded: {{Options > Perspectives}}, choose **System Engineer** and tick {{Expert}}."
          }
        }
      ]
    },
    {
      id: "language", ch: "setup", kind: "do",
      title: "Switch Cameo to English",
      lead: "The menus of this guide are in English. Switch the tool to English so both match.",
      blocks: [
        {
          steps: [
            "Choose {{Options > Environment}}.",
            "In the search field, type **lang**.",
            "Choose **English**."
          ]
        }
      ]
    },
    {
      id: "install-plugin", ch: "setup", kind: "do",
      title: "Install the OMF-ISAE plugin",
      lead: "The exercise needs the OMF-ISAE plugin. Install it from the plugin manager.",
      blocks: [
        { download: { label: "Plugin to install", file: "com.samares-engineering.omf.plugin_1.0.0.zip", src: "assets/plugins/com.samares-engineering.omf.plugin_1.0.0.zip", size: "21 MB" } },
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
      id: "load-model", ch: "setup", kind: "do",
      title: "Load the model",
      lead: "The model comes as one archive file. Cameo opens it as it is.",
      blocks: [
        { download: { label: "File to open", file: "UAV_BE_Note_2024 _V2_Exercice Student.mdzip", src: "assets/models/UAV_BE_Note_2024 _V2_Exercice Student.mdzip", size: "841 KB" } },
        {
          steps: [
            "Download the model with the button above.",
            "In Cameo, choose {{Open the project}} and pick the **UAV** file."
          ]
        },
        {
          callout: {
            tone: "warn", title: "Do not unzip it",
            text: "A .mdzip file is the project itself. Unzipping it gives you a folder Cameo cannot open."
          }
        }
      ]
    },
    {
      id: "browser-vs-diagram", ch: "setup", kind: "try",
      title: "A model, and views of that model",
      lead: "As with most MBSE tools, you have a model browser on the left and diagram views in the centre. They are not the same thing.",
      blocks: [
        { widget: "deleteDemo" },
        {
          callout: {
            tone: "goal", title: "The rule to remember",
            text: "Deleting an element from a view does not delete it from the model. To delete a model element completely, do it from the browser: it also disappears from all the views."
          }
        }
      ]
    },
    {
      id: "edit-properties", ch: "setup", kind: "read",
      title: "Three ways to edit an element",
      lead: "All three open the properties of a diagram element or model element.",
      blocks: [
        {
          cards: [
            { n: "A", title: "Double-click", text: "Double-click on the element. If another diagram opens instead, use one of the two other ways." },
            { n: "B", title: "Click, then Enter", text: "Click on the element to select it, then press Enter." },
            { n: "C", title: "Right-click, then Specification", text: "Right-click on the element and choose {{Specification}}." }
          ]
        }
      ]
    },
    {
      id: "expert-mode", ch: "setup", kind: "do",
      title: "Show every property with Expert mode",
      lead: "By default the Specification window hides part of what you can set.",
      blocks: [
        {
          steps: [
            "Open the {{Specification}} window of any element.",
            "At the top right, in the {{Properties}} field, choose **Expert**."
          ]
        },
        {
          figure: {
            src: "assets/img/spec-expert.png", w: 838, h: 544,
            alt: "Specification window of the package 1 - Operational Analysis. At the top right, the Properties drop-down list is set to Expert and circled in red.",
            caption: "The Properties list, top right of the Specification window."
          }
        },
        { p: "This gives access to more properties of the element to specify." }
      ]
    },

    /* ───────────────────────── 2 · Discover the model ───────────────────────── */
    {
      id: "model-levels", ch: "discover", kind: "try",
      title: "Three levels, three packages",
      lead: "The model is made of packages. Each model element is stored according to its level of modeling, and here there are only 3 levels: Operational, Functional and Physical architecture.",
      blocks: [
        { widget: "modelTree" },
        { p: "This map only shows the places this guide sends you to. The real model contains much more." }
      ]
    },
    {
      id: "context-diagram", ch: "discover", kind: "do",
      title: "Start from the operational context",
      lead: "A good starting place is the operational context diagram. It is an internal block diagram (IBD) that represents the connections between the environment and the drone.",
      blocks: [
        { path: "op-context" },
        {
          steps: [
            "Open the **Operational Context** diagram.",
            "Look at the *Item Flows* ((item-flow)) on the different connectors: UAV and ground station, UAV and GNSS, and so on.",
            "Count the connections between the operator and the drone. The drone is autonomous: the operator only has to start or stop the mission.",
            "Double-click on the UAV icon to see the state machine.",
            "Click on the arrow in the toolbar at the top left of the diagram to go back."
          ]
        },
        {
          figure: {
            src: "assets/img/ibd-operational-context.png",
            alt: "The Operational Context diagram, with a red circle around the item flow from the operator to the UAV.",
            caption: "The Operational Context diagram. Circled: the item flow between the operator and the UAV."
          }
        }
      ]
    },
    {
      id: "explore", ch: "discover", kind: "do",
      title: "Explore, until you can explain the system",
      lead: "No written description of the SoI is given on purpose. Read the model yourself, and be ready to explain the drone in your own words.",
      blocks: [
        { p: "Browse the model from top to bottom. Each of the three levels answers a different question:" },
        {
          list: [
            "**Operational (OP)**: the context, the use cases and the scenarios. They set the scope of the system and the mission it serves.",
            "**Functional (FCT)**: the state machine that orchestrates the activities. It shows how the drone carries out its mission, step by step.",
            "**Physical**: the block and internal block diagrams (BDD/IBD) of the physical product chosen for the solution."
          ]
        },
        {
          notes: {
            id: "explore", label: "Your notes on the system",
            hint: "What is the mission? Which functions does the drone run, and in what order? What is the physical product made of, and what does it exchange with the rest of the system?"
          }
        },
        { p: "Your notes stay on this device. You will find them again on the answer sheet at the end." }
      ]
    },

    /* ───────────────────────── 3 · The mission ───────────────────────── */
    {
      id: "mission-brief", ch: "mission", kind: "try",
      title: "The mission",
      lead: "Now that you have looked at the model, here is what the system is for.",
      blocks: [{ widget: "mission" }]
    },

    /* ───────────────────────── A · Sequence diagram ───────────────────────── */
    {
      id: "a-use-cases", ch: "A", kind: "do", ref: "A",
      title: "Find the use cases",
      lead: "The guided exercise adds a function to the SoI. It starts from a use case.",
      blocks: [
        { path: "uc-diagram" },
        {
          steps: [
            "Go to [[uc-pkg]], open **Use Cases and Scenarios**.",
            "Find *Parameter Mission*, *Surveillance of a \"safe zone\" area* and *Monitor sheep position*.",
            "Expand **1. Preparation phase** (click the +).",
            "Locate [[uc-prepare-mission]] in the diagram.",
            "Identify [[uc-parameter-mission]]. This is the one we will work on."
          ]
        },
        {
          figure: {
            src: "assets/img/uc-prepare-mission-circled.png",
            alt: "The Use Cases and Scenarios diagram. The Prepare Mission use case in the 1. Preparation phase package is circled in red.",
            caption: "The Use Cases and Scenarios diagram. Circled: Prepare Mission."
          }
        }
      ]
    },
    {
      id: "a-scenario", ch: "A", kind: "try", ref: "A",
      title: "The scenario, in plain words",
      lead: "We are going to enter a scenario that initializes the drone with a flight plan. Read it first: a sequence diagram is nothing more than this text, drawn.",
      blocks: [{ widget: "scenario" }]
    },
    {
      id: "a-create-sd", ch: "A", kind: "do", ref: "A",
      title: "Create the sequence diagram",
      lead: "The diagram is created from the use case, so that it stays attached to it in the model.",
      blocks: [
        {
          steps: [
            "Right-click on the **Parameter Mission** use case, then choose {{Create Diagram}}.",
            {
              t: "In the *SysML Diagrams* section, select {{SysML Sequence Diagram}}.",
              note: "No result in the list of diagram types? Click the {{Expert}} button below it: the list of available diagrams expands.",
              fig: {
                src: "assets/img/create-sequence-diagram.gif", thumb: "assets/img/create-sequence-diagram-thumb.gif", w: 260, h: 236,
                alt: "Right-click on the Parameter Mission use case, choose Create Diagram, then SysML Sequence Diagram, and rename the new diagram."
              }
            },
            "Rename the diagram <<[SD1] Loading Flight Plan success>>."
          ]
        }
      ]
    },
    {
      id: "a-sunny-rainy", ch: "A", kind: "read", ref: "A",
      title: "Sunny day, rainy day",
      lead: "The two letters in front of a scenario name tell you whether things go well: **SD** is a Sunny Day (the nominal scenario, everything is OK), **RD** is a Rainy Day (the dysfunctional scenario, something went wrong).",
      blocks: [{ widget: "weather" }]
    },
    {
      id: "a-lifelines", ch: "A", kind: "do", ref: "A",
      title: "Add the lifelines",
      lead: "A lifeline is a participant of the scenario. Two of them are actors that already exist in the model. The third one is the drone, our SOI.",
      blocks: [
        {
          steps: [
            "In the Model Browser, open [[actors]].",
            "Drag and drop the actors **Mission Operator** and **Ground Station** from the Model Browser onto the diagram.",
            "Our drone is missing… It is in the physical analysis: find [[soi-block]].",
            "Drag and drop it from the Model Browser onto the diagram to add the drone as a lifeline."
          ]
        },
        { path: "soi-block" },
        {
          video: {
            src: "assets/video/lifeline-drag-drop.mp4", w: 1430, h: 598,
            alt: "Cameo: the actors are dragged one by one from the Model Browser onto the sequence diagram Parameter Mission, each one creating a lifeline."
          }
        }
      ]
    },
    {
      id: "a-messages", ch: "A", kind: "do", ref: "A",
      title: "Send messages between actors",
      lead: "Draw the exchanges between two participants with a Send Message.",
      blocks: [
        {
          steps: [
            "Use the {{Send Message}} element from the palette, and draw it from one lifeline to another. Stop the arrow when a blue vertical line appears on the timeline of the receiver.",
            "Reuse a signal that already exists: drag it from [[fd-deployment]] onto the message, or pick it with the auto-completion.",
            "Or create a new signal: click on the **S** button next to the message name."
          ]
        },
        {
          figure: {
            src: "assets/img/sig-create-s.png", w: 370, h: 144,
            alt: "Cameo message name field with a small S button next to the name, used to create a signal on the message.",
            caption: "Click on the S button to create a signal for the message."
          }
        },
        {
          callout: {
            tone: "note", title: "Signals are not functions",
            text: "A signal is data, energy or an element that travels between the participants, such as the flight plan. A function is something a participant does: it comes later, as an activity."
          }
        },
        {
          steps: [
            "Organize the signals you created in the Functional Data package [[fd-deployment]]."
          ]
        }
      ]
    },
    {
      id: "a-self-messages", ch: "A", kind: "do", ref: "A",
      title: "Messages to self",
      lead: "Some steps are done by one participant alone. They have no signal: they are messages to self, named like the functions they run.",
      blocks: [
        {
          steps: [
            "On the lifeline of the drone (SOI - Pasture Sentinel), use the {{Message to Self}} element from the palette.",
            "Name it <<Load FlightPlan>>.",
            "Add a second message to self and name it <<Check FlightPlan Perimeter>>."
          ]
        },
        { widget: "selfMessage" },
        {
          callout: {
            tone: "note", title: "No signal here",
            text: "A message to self carries no signal. Its name is the function the drone performs, and you will use the same name for the activity later."
          }
        }
      ]
    },
    {
      id: "a-your-turn", ch: "A", kind: "do", ref: "A",
      title: "Your turn: model this scenario",
      lead: "Read the scenario again, then draw it as a sequence diagram with the messages and the signals.",
      blocks: [
        { widget: "scenario" },
        { call: "When your sequence diagram is finished, call the teacher to check it." }
      ]
    },
    {
      id: "a-solution", ch: "A", kind: "read", ref: "A",
      title: "The solution, step by step",
      lead: "Once the teacher has checked your diagram, open the solution and compare.",
      blocks: [
        {
          solution: {
            label: "Open the solution",
            blocks: [
              { h: "The same scenario, one message at a time" },
              { widget: "sequence" }
            ]
          }
        }
      ]
    },
    {
      id: "a-q1", ch: "A", kind: "answer", ref: "Question 1",
      title: "Question 1",
      lead: "Look at the sequence diagram you have just drawn.",
      blocks: [
        {
          question: {
            id: "q1", type: "choice",
            prompt: "What is the type of this sequence diagram?",
            options: ["Black-Box", "White-Box"],
            justify: true
          }
        }
      ]
    },

    /* ───────────────────────── B · Functions ───────────────────────── */
    {
      id: "b-functions", ch: "B", kind: "read", ref: "B",
      title: "A scenario reveals functions",
      lead: "The sequence diagram we have just created has allowed us to identify new functions. They will be modeled by Activity Diagrams (AD).",
      blocks: [
        { widget: "msgToFn" },
        { p: "We represent functions as SysML **activities**. The functional architecture is stored in [[fa-root]]." }
      ]
    },
    {
      id: "b-q2", ch: "B", kind: "answer", ref: "Question 2",
      title: "Question 2",
      lead: "Use the scenario \"[SD 1] Loading the flight plan\" modeled by your sequence diagram, and what you have seen in class.",
      blocks: [
        {
          question: {
            id: "q2", type: "list", initial: 2,
            prompt: "List all the new functions of SOI - Pasture Sentinel.",
            itemLabel: "Function",
            justify: true
          }
        }
      ]
    },
    {
      id: "b-add-function", ch: "B", kind: "do", ref: "B.1",
      title: "Add a function",
      lead: "A function is an Activity, created in the package of the functional architecture.",
      blocks: [
        { path: "fa-deployment" },
        {
          callout: {
            tone: "note", title: "Goal of this section",
            text: "The functions are grouped in packages, one package per service of the drone: for example Guard the sheep, Configuration or Mission Monitoring."
          }
        },
        {
          steps: [
            "Click the small + to the left of [[fa-root]] to show its packages.",
            "Right-click on the package **Deployment**, then {{Create element > Activity}}.",
            "The new activity appears in the containment tree. Rename it <<Parameter Mission>>. It represents the use case we specified with \"Parameter Mission\"."
          ]
        },
        {
          video: {
            src: "assets/video/create-function-activity.mp4", w: 460, h: 588,
            alt: "Cameo: right-click on Deployment, Create element, type act, choose Activity, then rename the new activity Parameter Mission."
          }
        }
      ]
    },
    {
      id: "b-organize", ch: "B", kind: "do", ref: "B.1",
      title: "Organize the functions in packages",
      lead: "Packages group the functions around the services of the system. Each function then has a clear place, and the tree stays readable as it grows.",
      blocks: [
        { path: "fa-parameter-mission" },
        {
          cards: [
            { n: "S", title: "Service function", text: "A function the mission needs, seen from outside the system. It goes in the package of the service it belongs to, for example **Guard the sheep**." },
            { n: "T", title: "Technical function", text: "A function that helps another function work, seen from inside the system. Keep it in the package of the service it supports, and give it a name that says what it does." }
          ]
        },
        {
          steps: [
            "Right-click on the package **Deployment**, then {{Create element > Package}}. Name it <<Parameter Mission>>.",
            "Drag the activity <<Parameter Mission>> into this package.",
            "Create one package per service, and move each function into the package of its service."
          ]
        },
        {
          tip: {
            label: "Optional tip: create several activities at once",
            blocks: [
              { p: "You do not need to create the functions one by one. Copy this text: it holds the functions you named in Question 2, and a placeholder (fct 1, fct 2…) for each one you have not named yet." },
              { copy: { label: "Text to copy", value: "fct 1\nfct 2\nfct 3\nfct 4", fromAnswer: { q: "q2", min: 4 } } },
              {
                list: [
                  "In the Model Browser, select the package the functions belong to, for example <<Parameter Mission>>.",
                  "Paste the text with **Ctrl+V**.",
                  "Cameo asks which element to create: choose **Activity**.",
                  "Cameo creates one activity per line."
                ]
              }
            ]
          }
        }
      ]
    },
    {
      id: "b-exercise", ch: "B", kind: "do", ref: "B.1",
      title: "Your turn: add your four functions",
      lead: "Still in the Containment Tree, create one activity per function in the \"Parameter Mission\" sub-package: the functions you identified in Question 2.",
      blocks: [
        { path: "fa-parameter-mission" },
        { fromAnswer: { q: "q2", itemLabel: "Function", scene: "b-q2" } }
      ]
    },

    /* ───────────────────────── C · State machine ───────────────────────── */
    {
      id: "c-goal", ch: "C", kind: "read", ref: "C.1",
      title: "What a state machine is made of",
      lead: "You are going to complete an existing state machine that describes the functional behavior of the system. Four words are enough to read it.",
      blocks: [
        { widget: "anatomy" },
        {
          callout: {
            tone: "goal", title: "Goal of this chapter",
            text: "Update the state machine so that it covers the whole mission, and allocate each function to the state where it runs. You allocate **Load Flight Plan** to the state *Configured* as a \"Do activity\". On the way, you allocate three signals on transitions: *FlightPlan*, *FlightPlan Check Failed* and *Ready for mission*."
          }
        },
        { h: "Which function runs in which step" },
        {
          list: [
            "**Configured** (load the flight plan and check it): runs **Load Flight Plan**. You allocate it in this chapter.",
            "**Ready for Mission**: runs **Start subsystems**.",
            "**Going to Safe Area** (join the safe zone): runs **Going to Safe Area**.",
            "**Patrolling** (patrol the perimeter and track the sheep): runs **Watch Perimeter** and **Sheep monitoring**, side by side.",
            "**Predator Detected**: runs **Start Predator Tracking**, then **Trigger predator counter actions**.",
            "**Crashed**: runs **Start Emergency Mode**.",
            "**Predator Monitoring** and **Mission Monitoring** have no function of their own."
          ]
        }
      ]
    },
    {
      id: "c-open", ch: "C", kind: "do", ref: "C.1",
      title: "Open the state machine of the drone",
      lead: "The state machine belongs to the block of the drone, in the physical analysis.",
      blocks: [
        { path: "soi-stm" },
        {
          steps: [
            "In the containment tree, unfold the path above down to the block **SOI - Pasture Sentinel**.",
            {
              t: "Open the state machine diagram that sits inside it.",
              fig: { src: "assets/img/tree-soi-stm.png", w: 197, h: 37, alt: "Containment tree: SOI - Pasture Sentinel state machine, with the diagram SOI - Pasture Sentinel selected under it.", size: "xs" }
            }
          ]
        },
        {
          figure: {
            src: "assets/img/stm-as-found.png", w: 1202, h: 879,
            alt: "State machine SOI - Pasture Sentinel as students find it. Undeployed contains Off and Unconfigured; Ready for Mission is in Undeployed, Deployed contains Going to Safe Area, Patrolling and Mission Monitoring, and Crashed is on the right. A TO DO note lists the exercise steps.",
            caption: "The state machine as you find it: no Configured state yet. Click the image to enlarge it."
          }
        }
      ]
    },
    {
      id: "c-state", ch: "C", kind: "do", ref: "C.1",
      title: "Create the state \"Configured\"",
      lead: "The new state goes inside the state \"Undeployed\", next to \"Unconfigured\".",
      blocks: [
        {
          steps: [
            "In the palette, click on {{State}}.",
            "Go to the diagram and right-click next to the *Unconfigured* state. A new unnamed state is created.",
            "Type <<Configured>> directly on the shape of that state and press Enter."
          ]
        },
        {
          video: {
            src: "assets/video/create-state.mp4", w: 844, h: 576,
            alt: "Cameo: State is picked in the palette, a click inside Undeployed creates a new state next to Unconfigured, and its name is typed as Configured."
          }
        }
      ]
    },
    {
      id: "c-transition", ch: "C", kind: "do", ref: "C.1",
      title: "Draw a transition and give it a signal",
      lead: "A transition says how to go from one state to another. The signal you put on it is what triggers it.",
      blocks: [
        { h: "From Unconfigured to Configured" },
        {
          steps: [
            "Left-click on the *Unconfigured* state, then click the Transition button ((transition)) on its smart manipulator toolbar and drag it to the *Configured* state."
          ]
        },
        {
          video: {
            src: "assets/video/create-transition.mp4", w: 560, h: 352,
            alt: "Cameo: the Unconfigured state is selected, its Transition button is clicked on the smart manipulator toolbar, and the transition is drawn to the Configured state."
          }
        },
        { h: "Give the transition its signal" },
        {
          p: "The signal is the trigger of the transition. Reuse a signal already described in the scenarios or in the function descriptions: it states the condition under which the transition fires. Reformulate it if needed, so that it reads as a short condition."
        },
        {
          steps: [
            "In the Model Browser, expand [[fd-deployment]].",
            "Select the [[sig-flightplan]] signal and drag it onto the transition between *Unconfigured* and *Configured*."
          ]
        },
        {
          video: {
            src: "assets/video/d-g-signal-transition.mp4", w: 1312, h: 546,
            alt: "Cameo: the FlightPlan signal is dragged from the Model Browser and dropped onto the transition between Unconfigured and Configured."
          }
        }
      ]
    },
    {
      id: "c-signals", ch: "C", kind: "do", ref: "C.1",
      title: "Two more transitions",
      lead: "Same gesture, twice. Then check that every signal sits on the right arrow.",
      blocks: [
        { h: "From Configured back to Unconfigured" },
        {
          steps: [
            "Select the shape of the *Configured* state, click the Transition button ((transition)), then right-click on the *Unconfigured* state.",
            "Select the [[sig-check-failed]] signal and drag it onto the transition between *Configured* and *Unconfigured*."
          ]
        },
        { h: "From Configured to Ready for Mission" },
        {
          steps: [
            "Select the shape of the *Configured* state, click the Transition button ((transition)), then right-click on the *Ready for Mission* state.",
            "Select the [[sig-ready]] signal and drag it onto the transition between *Configured* and *Ready for Mission*."
          ],
          start: 3
        },
        { h: "Check your wiring" },
        { widget: "smAssign" }
      ]
    },
    {
      id: "c-do-activity", ch: "C", kind: "do", ref: "C.1",
      title: "Make the state do something",
      lead: "Allocate the \"Load Flight Plan\" function, added in exercise B, to the \"Configured\" state.",
      blocks: [
        {
          steps: [
            "In the Model Browser, expand [[fa-deployment]].",
            {
              t: "Select the **Load Flight Plan** activity, drag it onto the *Configured* state and select {{Do Activity}}.",
              fig: { src: "assets/img/menu-do-activity.png", w: 172, h: 117, alt: "Small menu that opens on the Configured state with three choices: Entry, Do Activity (highlighted) and Exit.", size: "xs" }
            }
          ]
        },
        { h: "Try the gesture here" },
        { widget: "smAssign", opts: { mode: "doActivity" } },
        { h: "What you should get in Cameo" },
        {
          figure: {
            src: "assets/img/stm-expected.png", w: 1202, h: 851,
            alt: "State machine SOI - Pasture Sentinel. Inside Undeployed: Off, Unconfigured, Configured with do / Load Flight Plan, and Ready for Mission. Transitions carry Start SOI, FlightPlan, FlightPlan Check Failed and Ready for mission. Below, the Deployed state with Going to Safe Area, Patrolling and Predator Detected, and a Crashed state.",
            caption: "When you are done, your state machine diagram should be very similar to this one."
          }
        }
      ]
    },
    {
      id: "c-run", ch: "C", kind: "do", ref: "C.2",
      title: "Run the state machine simulation",
      lead: "Cameo can execute the state machine. You send the signals, it moves from state to state.",
      blocks: [
        {
          steps: [
            {
              t: "Make sure the state machine under SOI - Pasture Sentinel is open: [[soi-stm|3-A-SOI-SOI-SOI]].",
              fig: { src: "assets/img/tree-soi-stm-selected.png", w: 185, h: 38, alt: "Containment tree with the state machine diagram SOI - Pasture Sentinel selected.", size: "xs" }
            },
            "Click on the Simulation icon ((simulate)) at the top right of the diagram, then {{Run}} ((run)).",
            {
              t: "In the Simulation window, at the bottom of the main window, click on the Play button ((play)) at its top left.",
              note: "You can speed up or slow down the animation with the {{Animation Speed}} slider."
            },
            "In the Simulation panel, select a signal in the {{Trigger}} list to advance the simulation and go from one state to another."
          ]
        },
        {
          figure: {
            src: "assets/img/sim-trigger-list.png", w: 654, h: 280,
            alt: "Simulation panel of Cameo with the Trigger drop-down list open: Crashed Detected, FlightPlan, FlightPlan Check Failed, Predator Detected inside tracking perimeter, Ready for mission, Start Patrolling, Start Sheep Guard Mission, Start SOI.",
            caption: "The Trigger list of the Simulation panel."
          }
        },
        {
          figure: {
            src: "assets/img/sim-running.png", w: 1089, h: 830,
            alt: "State machine during simulation. The state Unconfigured is outlined in red: it is the active state. Off and the transition Start SOI are green: they have been visited.",
            caption: "During the simulation: red is the active state, green is what has already been visited."
          }
        },
        {
          video: {
            src: "assets/video/run-simulation.mp4", w: 1390, h: 640,
            alt: "Cameo: the state machine SOI - Pasture Sentinel is run from the Simulation panel; Play is clicked, then Start SOI is selected in the Trigger list and the machine leaves Unconfigured."
          }
        }
      ]
    },
    {
      id: "c-playground", ch: "C", kind: "try", ref: "C.2",
      title: "Triggers move the machine",
      lead: "The same state machine, in your browser. Send triggers and watch which transition fires. Try a signal that the current state does not expect, too.",
      blocks: [{ widget: "smSim" }]
    },
    {
      id: "c-drone-live", ch: "C", kind: "try", ref: "C.2",
      title: "Watch the drone follow Cameo",
      lead: "The drone of this guide runs the same simulation as Cameo. Pair the guide with Cameo, then watch the drone move.",
      blocks: [
        {
          steps: [
            "In Cameo, run the simulation and select a signal in the {{Trigger}} list.",
            { t: "", widget: "linkStatus" },
            { t: "**Try it!** Click the pink drone button at the top of the page, then send the next signal from Cameo: the drone moves in the app.", widget: "simHint" }
          ]
        }
      ]
    },
    {
      id: "c-cross", ch: "C", kind: "do", ref: "C.3",
      title: "Simulate across two diagrams",
      lead: "A state can run an activity. Cameo simulates both diagrams together: the state machine triggers the activity diagram.",
      blocks: [
        {
          steps: [
            "Start a simulation again, as in step 1 of the previous exercise.",
            {
              t: "Inside the state machine diagram, double-click on the **do / Load Flight Plan** label of the *Configured* state. The Activity Diagram of this function appears.",
              fig: { src: "assets/img/ad-load-flight-plan-initial.png", w: 320, h: 225, alt: "Activity diagram Load Flight Plan with an initial node, one action Load Flight Plan and a final node.", size: "sm" }
            },
            "To see the cross-diagram simulation, open both diagrams, State Machine and Activity Diagram, in different tabs.",
            "Start the simulation again, with steps 2 to 4 of the previous exercise.",
            "Send triggers until you reach the *Configured* state. The Activity Diagram is simulated too: a red token appears in it when the state machine arrives in this state."
          ]
        },
        {
          placeholder: {
            kind: "gif", title: "The red token appearing in the activity diagram",
            todo: ["Record both tabs side by side while the state machine enters Configured (10 s)"]
          }
        }
      ]
    },

    /* ───────────────────────── D · Load Flight Plan ───────────────────────── */
    {
      id: "d-spec", ch: "D", kind: "read", ref: "D",
      title: "What \"Load Flight Plan\" must do",
      lead: "Before drawing anything, read the specification of the function.",
      blocks: [
        {
          quote: {
            label: "Specification",
            text: "If the flight plan loading succeeds, we shall send a \"Ready for mission\" signal, which will allow to leave the \"Configured\" state for the \"Ready for mission\" state. In parallel, we also want to notify the Control Operator, as described in the \"Parameter Mission\" scenario."
          }
        },
        {
          list: [
            "The functional data **FlightPlan** comes from the ground station via WiFi. It is produced by one of the functions you identified in Question 2.",
            "All the functions required have already been created in step B.1.",
            "All functional data can be found in [[fd-deployment]]."
          ]
        }
      ]
    },
    {
      id: "d-sd-vs-ad", ch: "D", kind: "read", ref: "D",
      title: "One scenario, or all of them",
      lead: "This is the difference between the diagram you drew in chapter A and the one you are about to draw.",
      blocks: [
        { widget: "sdVsAd" },
        { p: "So your activity diagram must also cover the scenario \"The plan was not successfully loaded\"." }
      ]
    },
    {
      id: "d-create-ad", ch: "D", kind: "do", ref: "D",
      title: "Create the activity diagram",
      lead: "The diagram is created from the function, exactly as the sequence diagram was created from the use case.",
      blocks: [
        { path: "fn-load-flight-plan" },
        {
          steps: [
            "In the Model Browser, right-click on the **Load Flight Plan** function, in the package ((package)) *Parameter Mission*.",
            "Click on {{Create Diagram}}, then choose {{Activity Diagram}}. If a window opens asking to display the parameters, click on {{Ok}}.",
            {
              t: "Drag and drop the functions related to \"Load Flight Plan\" inside the Activity Diagram, anywhere. You created them in B.1.",
              note: "You may also create new ones if you think it necessary, then drag and drop them in the diagram."
            }
          ]
        },
        { p: "The next three scenes are your toolbox to connect these functions." }
      ]
    },
    {
      id: "d-send-signal", ch: "D", kind: "read", ref: "D",
      title: "Toolbox: send a signal",
      lead: "This is how an activity tells the outside that something happened.",
      blocks: [
        {
          cards: [
            { n: "A", title: "Drop the signal", text: "Drag and drop the signal you need anywhere in the diagram." },
            { n: "B", title: "Or start from the action", text: "Create a {{Send Signal Action}}, then drag and drop the signal on the diagram and give the action its type." }
          ]
        },
        {
          figure: {
            src: "assets/img/send-signal.png", w: 130, h: 75, size: "xs",
            alt: "A send signal action, drawn as a box pointed on its right side, named FlightPlan Check Failed.",
            caption: "A send signal action in Cameo."
          }
        },
        {
          placeholder: {
            kind: "gif", title: "Dropping a signal in an activity diagram",
            todo: ["Record a signal dragged from the Model Browser into the activity diagram, showing the Send Signal Action being created (6 s)"]
          }
        }
      ]
    },
    {
      id: "d-decision", ch: "D", kind: "try", ref: "D",
      title: "Toolbox: decide",
      lead: "To represent a decision, use a decision node, from the icons on the left of the activity diagram, and put a guard on each output flow.",
      blocks: [
        { widget: "decision" },
        {
          callout: {
            tone: "tip", title: "How to write a guard",
            text: "Rename the flow in the diagram and put the condition between brackets, for example <<[wind > 50km/h]>> and <<[else]>>."
          }
        },
        {
          figure: {
            src: "assets/img/decision-example.png", w: 263, h: 135, size: "sm",
            alt: "Decision node in Cameo with two output flows: [wind > 50km/h] to the action Emergency landing and [else] to the action Go to next point.",
            caption: "The same example in Cameo."
          }
        }
      ]
    },
    {
      id: "d-fork", ch: "D", kind: "try", ref: "D",
      title: "Toolbox: do things in parallel",
      lead: "To represent parallelism, use a fork node. It splits a flow into multiple concurrent flows.",
      blocks: [
        { widget: "fork" },
        {
          figure: {
            src: "assets/img/fork-example.png", w: 471, h: 277, size: "sm",
            alt: "Fork node in Cameo: one flow enters a thick horizontal bar and three flows leave it towards get safe area starting point, get flight plan and get current position.",
            caption: "The same example in Cameo."
          }
        }
      ]
    },
    {
      id: "d-rainy", ch: "D", kind: "do", ref: "D",
      title: "Your turn: sunny day and rainy day",
      lead: "Connect your functions so that the activity diagram covers both scenarios.",
      blocks: [
        {
          quote: {
            label: "[RD 1] Flight plan out of range",
            text: "If the flight plan loading fails, the system needs to send a \"FlightPlan Check Failed\"."
          }
        },
        { h: "Check your diagram against the specification" },
        {
          steps: [
            "When the loading succeeds, the signal **Ready for mission** is sent.",
            "In parallel, the operator is notified.",
            "When the loading fails, the signal **FlightPlan Check Failed** is sent."
          ]
        }
      ]
    },
    {
      id: "d-simulate-ad", ch: "D", kind: "do", ref: "D",
      title: "Simulate the activity diagram",
      lead: "You can simulate the Activity Diagram to make sure it behaves as specified.",
      blocks: [
        {
          callout: {
            tone: "goal", title: "What to check",
            text: "Make sure the animation covers **all** the elements of the diagram."
          }
        },
        {
          p: "You will notice that checking that everything is covered quickly becomes laborious. This is why automatic verification tools exist, and formalisms such as Petri nets."
        },
        {
          placeholder: {
            kind: "gif", title: "Simulating the activity diagram",
            todo: ["Record a run where the token goes through the success branch (8 s)", "Record a run where it goes through the failure branch (8 s)", "Explain how to make the simulation take one branch or the other"]
          }
        }
      ]
    },
    {
      id: "d-simulate-sm", ch: "D", kind: "do", ref: "D.1",
      title: "Simulate the state machine again",
      lead: "The state machine now has a real function behind its \"Configured\" state. Check that the two work together.",
      blocks: [
        {
          steps: [
            "Go back to the state machine of SOI - Pasture Sentinel: [[soi-stm|3-A-SOI-SOI-SOI]].",
            "Start the simulation using ((simulate-toolbar)) then ((start)).",
            {
              t: "Use the {{Trigger}} drop-down list to switch from state to state.",
              fig: { src: "assets/img/sim-trigger-small.png", w: 229, h: 178, alt: "Trigger drop-down list with FlightPlan highlighted.", size: "xs" }
            },
            "Verify that after entering the *Configured* state, your activity diagram is triggered.",
            "Verify that if the flight plan is OK, the state machine goes automatically to *Ready for Mission*."
          ]
        },
        { h: "What you should observe" },
        { widget: "smSim", opts: { cross: true } }
      ]
    },
    {
      id: "d-semantics", ch: "D", kind: "do", ref: "D.1",
      title: "Watch how functions execute",
      lead: "Take a few minutes to observe what happens during the cross simulation of the state machine.",
      blocks: [
        {
          p: "The aim is to understand the execution semantics of the functional architecture seen in class, which is similar to Petri nets: the start condition of a function, its end condition, its execution."
        },
        {
          steps: [
            "During the simulation, enter the functions by double-clicking on the function calls.",
            "Go back by clicking on the small left and right arrows at the top left of the diagram."
          ]
        },
        {
          callout: {
            tone: "tip", title: "See both diagrams at once",
            text: "You can drag and drop the activity diagram into the state machine diagram to monitor both during the simulation. After the drag and drop, select the diagram and click on the \"eye\" to show its content."
          }
        },
        {
          figure: {
            src: "assets/img/tip-eye.png", w: 206, h: 125, size: "xs",
            alt: "The Load Flight Plan diagram symbol selected, with a small toolbar next to it whose first button is an eye.",
            caption: "The eye button shows the content of the diagram."
          }
        },
        {
          figure: {
            src: "assets/img/tip-side-by-side.png", w: 1418, h: 851,
            alt: "State machine diagram with the Load Flight Plan activity diagram displayed inside it, on the left. The state Configured is active and outlined in red.",
            caption: "The activity diagram shown inside the state machine during a simulation."
          }
        }
      ]
    },

    /* ───────────────────────── E · Allocation ───────────────────────── */
    {
      id: "e-views", ch: "E", kind: "read", ref: "E",
      title: "Two views of the same model",
      lead: "The physical architecture of the subsystems is described under the block of the drone. Notice its two diagrams.",
      blocks: [
        { path: "soi-block" },
        {
          tabs: [
            {
              label: "UAV Energy", sub: "the electrical (physical) view", link: "uav-energy",
              blocks: [{
                placeholder: {
                  kind: "screenshot", title: "The UAV Energy diagram",
                  todo: ["Export the UAV Energy internal block diagram as PNG"]
                }
              }]
            },
            {
              label: "UAV Data", sub: "the data (cyber) view", link: "uav-data",
              blocks: [{
                placeholder: {
                  kind: "screenshot", title: "The UAV Data diagram",
                  todo: ["Export the UAV Data internal block diagram as PNG"]
                }
              }]
            }
          ]
        },
        { p: "These two diagrams show **two different views of the same model**: the same subsystems, once with what powers them, once with what they say to each other." }
      ]
    },
    {
      id: "e-allocate", ch: "E", kind: "do", ref: "E",
      title: "Allocate the functions to subsystems",
      lead: "A function has to be carried out by something. The allocation matrix records which subsystem does what.",
      blocks: [
        { path: "alloc-matrix" },
        {
          steps: [
            "Open the allocation matrix available under [[alloc-pkg]].",
            "Complete the **Function Allocation** matrix so that the 3 functions created previously are each allocated to a subsystem."
          ]
        },
        {
          reveal: {
            label: "Show a hint",
            text: "Two functions are allocated to the navigation system and one function is allocated to the WiFi system."
          }
        },
        {
          placeholder: {
            kind: "gif", title: "Allocating a function in the matrix",
            todo: ["Screenshot of the Function Allocation matrix before the exercise", "Record how to create one allocation in a cell (5 s)"]
          }
        }
      ]
    },
    {
      id: "e-impact", ch: "E", kind: "read", ref: "E",
      title: "Why allocate: impact analysis",
      lead: "The allocation allows us to do an impact analysis. We won't do it here, but this is what it is for.",
      blocks: [
        { widget: "crud" },
        {
          p: "The impact analysis tells us which elements are impacted when we create, read, update or delete model elements. With it we can verify and validate that the model still represents the correct system."
        }
      ]
    },

    /* ───────────────────────── Debrief ───────────────────────── */
    {
      id: "faq", ch: "end", kind: "read",
      title: "Frequently asked questions",
      lead: "Four questions that come back every year.",
      blocks: [{ faq: true }]
    },
    {
      id: "finish", ch: "end", kind: "answer",
      title: "Mission ready to start",
      lead: "You have been through the three levels of the model, from a use case down to an allocated function.",
      blocks: [
        { widget: "recap" },
        { answers: true },
        {
          placeholder: {
            kind: "text", title: "What happens next",
            todo: ["How and when to hand in the answer sheet and the model", "Link or teaser to Part 2"]
          }
        }
      ]
    }
  ],

  faq: [
    {
      q: "In the sequence diagram exercise, how do you use the messages to name functions?",
      a: "In this seminar we do not exploit the traceability between the messages in the Sequence Diagram and the names of the functions in the Activity Diagram. It is up to the user to maintain consistency between these elements."
    },
    {
      q: "The state machine exercise uses FlightPlan (2.B Functional Data) and the sequence diagram exercise used Wifi_FlightPlan (1.C Physical Flows). What is the difference?",
      a: "The functional flow is the business concept and focuses on the goal (stop signal, energy, insecticide product). The physical flow is the solution chosen to achieve it (electric current 5 mV, electric current 240 V…).\n\nFrom a functional point of view, the Flight Plan is a list of positions, but we know neither the format, nor the encoding, nor theoretically the means of communication.\n\nThe physical flow is characterized data: we are talking about a 12 volt, 100 mA voltage with a given frequency, or a signal transmitted by UDP frame every 500 ms."
    },
    {
      q: "How to insert a breakpoint for the simulation?",
      a: "Right-click on the function in the diagram, then {{Simulation > Add Breakpoint}}."
    },
    {
      q: "Is the context diagram a SysML diagram?",
      a: "The *block diagram* is used to represent the operational context of the system. We then speak of a *context diagram*, which uses the SysML notation.\n\nA block diagram can be used to outline architecture in a context diagram, to structure functions, or to describe a design. In the 3 cases we use a SysML diagram without creating, syntactically speaking, a deviation from SysML, which remains a notation."
    }
  ],

  /* Things noticed while converting the Word handout. Shown on the Authoring to-do board. */
  authorNotes: [
    { scene: "nine-diagrams", text: "The handout announces 4 diagrams (use case, sequence, activity, internal block), but chapter C is built on a State Machine diagram. The tile is tagged “also in chapter C”. Confirm the wording." },
    { scene: "a-use-cases", text: "Package letter of “Use Cases and Scenarios”: the handout says “A –” twice and “C –” once, and “1-A-Actors”. The guide uses “C - Use Cases and Scenarios”, which matches the screenshot (the package sits right before “D - Physical Interfaces”). Confirm, then fix it once in content/model-links.js." },
    { scene: "load-model", text: "File names: the handout writes “.mzip” and “UAV*.mpdzip”. The guide uses .mdzip everywhere. Check the exact names on LMS." },
    { scene: "a-create-sd", text: "Name of the sequence diagram: the steps ask for “[SD1] Loading Flight Plan success”, while the figure and Question 2 say “[SD 1] Loading the flight plan”. Pick one." },
    { scene: "a-messages", text: "The handout says “drag and drop the physical signals present in 2 – Functional Analysis / B – Functional Data”, and the FAQ says this exercise used Wifi_FlightPlan (1.C Physical Flows). The figure also uses two notification signals from the “Patrolling” package. The guide says “signals from Functional Data / Deployement”. Confirm which signals students must use." },
    { scene: "c-goal", text: "The goal line of C.1 lists the signal “Flight plan check successful”; the steps use “FlightPlan Check Failed”. The guide follows the steps." },
    { scene: "c-state", text: "C.1 says “right-click” to drop the new state and to end a transition on its target state. Confirm it is not a plain click." },
    { scene: "c-run", text: "C.2 starts with “click the Run button in the toolbar above”, then step 2 says “Click on simulate, then … Run”. Both were merged into one step. Check the wording against the tool." },
    { scene: "b-add-function", text: "Spelling: the functional architecture package is “Deployment” in the text, while the Functional Data package is “Deployement” in the screenshot. Check both in the model." },
    { scene: "e-allocate", text: "Chapter E speaks of “the 3 functions created previously”, while Question 2 asks for 4 new functions (plus “Parameter Mission”). Confirm the number." },
    { scene: "d-spec", text: "The specification says “notify the Control Operator”; everywhere else the actor is “Mission Operator”." },
    { scene: "faq", text: "The FAQ referred to “Figure 3” and to sections “3.A / 3.B”, which no longer exist in the handout. The questions were reworded with chapter names. “1.C Physical Flows” is kept as written: check where that package really is." },
    { scene: "mission-brief", text: "The mission picture was redrawn as an animation. The original image is kept in assets/img/mission-original.png." }
  ]
};
