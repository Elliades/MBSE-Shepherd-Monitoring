# Changelog

## Unreleased

- **A second promo film, Parts 3 and 4** (`/promo/next.html`, ~2 min 20; the file is `assets/video/promo-parts34-en.mp4`): the logical
  architecture (the approach, several versions and one choice, the three commands of the plugin that do the repetitive part, the
  drone built one event at a time and validated each time, the whole mission), then the swarm (one level up, the dilemma, who
  decides, the box of Lego with its 3D bay and Auto Connect, the missions played, three architectures side by side on the same
  bad day). Its windows are the guides themselves, cut down to one widget and driven by the film; the film puts the guides'
  saved progress back when it is closed, and shows no predator transition or signal (Part 2 is marked).
- **A real home page, and Part 1 moves to `/part1/`**: `https://shepherd.chaos-art.fr/` now presents the lab: the film, the mission, the four
  layers of the method, the real simulation panel to try, and the links to the four parts at the very top. The sheep of the film graze in the
  Pyrenees, day or night, run from the mouse, and a bear comes now and then. The guide is in `part1/` (with `part1/content/`); its old links
  (`?code=`, `?teacher=`, `#scene`) still work: the home page sends them on.
- **Plugin 1.2.0 for every part**: `assets/plugins/` now holds `com.elliades.isae.mbseShepherd_1.2.0.zip` (the 1.1.1 archive is gone; `install-plugin.ps1` picks the newest). The install scene of Part 1 and the plugin scene of Part 3 (Parts 2 and 4 link to Part 1) have three tabs: Standard, No admin rights (script), and a new **No script** tab (3 steps and a looping CSS mini-Explorer, widget `pluginExtract` in `js/widgets.js`): paste `%LOCALAPPDATA%\.magic.systems.of.systems.architect` in the Explorer address bar, extract the zip into `2026x`, check the three folders. A `file://` link cannot be opened from a web page, hence the path to copy.
- **Part 4, the exercise becomes a box of Lego**: a starting model (`part4/assets/models/UAV_Part4_Swarm.mdzip`, built by
  `scripts/make-part4-model.py` and `scripts/build-part4-model.mjs`) where everything technical is given and connected, and a
  `Library` of bricks: one per region of the mission, and the intelligence (Swarm Master in the base station or in a drone,
  Swarm Reflex in each drone). Students drag, connect (by hand or with *Auto Connect*), watch the drones build themselves in
  3D in the guide, play six missions from the guide, and compare the solutions they tried on price and flight time. The
  mission is the one of the first parts, `SOI - Pasture Sentinel`, with the weather and a stray sheep added: the stray sheep and
  the predator both leave `Patrolling`, and the students put them in parallel. The bear gives its position by a signal, the
  pattern of Load Flight Plan, so the simulation opens no pop-up. New in the plugin: `features/assembly`, `addClassifiedChoice`.
- **Part 4, the sheep split in two**: `Sheep Monitoring` becomes `Flock Watching` (spots a stray, never leaves) and `Sheep Tracking`
  (takes the job and follows), so that one drone can call another. New brick `Base Standby`: the drone waits docked and takes
  off when it gets a job. Clearer names: `Mission Started`, `Sheep Job Open`, `Ask Sheep Job`, `Sheep Job Given`, `Sheep Job Taken`.
  The generator now starts from the author's own models and only builds `TP - Swarm`.
- **Part 4, bonus "four hours on the pasture"**: a choice of batteries (a bigger one flies longer, weighs more and charges
  longer), flight speed that costs energy, return threshold, charging places, reaction time, stress on the flock, energy, price
  and complexity, computed in the page from the bricks, with a table of the trade-offs.
- **Part 3, played end to end in Cameo, and corrected**: four versioned starting models in `part3/assets/models/`, built by
  `scripts/make-part3-inits.py` and `scripts/build-part3-models.mjs`: one for Mission Configuration, then one per
  architecture, without the crash, ports named after their partner. The ports of Mission Configuration are merged with
  *Merge Ports*, the verdict on a port of its own (`p_Verdict`), the start order on `p_StartOrder`; *Propagate Interface*
  is gone from the guide. *Validate in Cameo* waits for the states of each step played as a precondition (a fixed 2 s
  gave false reds on a correct model) and also checks the messages the states do not show (alerts, bursts, verdict), with
  `simtest/trace` on the relay. The do activity of the orchestrator in architecture 3 is `Start And Relay Tracking`: two
  activities shared the name `Track predator`. `scripts/make-part3-archs.py` follows the current specs. Author mode off.
  The models come with `ISAE-Profile.mdzip`, to keep in their folder. Validate also waits for the simulation to listen
  before its first signal.
- **Part 3, the links follow the model**: every link and Validate point at `TP - Logical Architecture`, its IBD
  `TP Logical SOI` and `TP1 SOI Simulation`, one package whatever the architecture; a state machine link opens its
  diagram; the functional mission is at the root of the model; the links to the correction packages are gone. The caption
  of the staged drawings no longer breaks into columns (it shared a class with the *Play in Cameo too* switch). The
  subsystems around the central orchestrator light up. The labels of a transition sit next to it.
- **Part 3, the logic first, then a guided build**: the exercise now focuses on the piece that decides. Chapter 5 asks for
  its role, its content, its interactions and the steps, before any click, then gives our proposal. Chapter 6 builds that
  proposal one event at a time (start, patrol, a sheep strays, a bear, scare it off): the subsystems are ready in the
  starting model, the student makes the states of the Mission Orchestrator and draws the connectors. Each stage shows
  the state machine to reach, gesture by gesture, the IBD with what it adds, and the scenario that grows; each
  validation is the animated drawing with its button. In the patch, Predator Management is connected first, the two
  red checks show what breaks, and the patch is the student's: the check does not name its state. Removed: the question on
  Predator counteraction, the blanks to name the subsystems, the state mapping, the build "on your own".
- **Part 3, Mission Configuration on the starting model**: built in `TP - Logical Architecture`, and Validate runs on
  `TP1 SOI Simulation`. Who relays the signals (the base station), then two commands instead of writing effects and
  ports by hand, each in its own scene with an animation: *Create All Missing Signal Ports*, after dropping the block
  on the IBD, and *Delegate to external systems* (`_ext` signals). Later scenes use `Start Sheep Guard Mission_ext`.
  The animation of Logical Transition starts by creating the logical component. Small drawings for the two gestures
  on the states. *Show Port Type Only* is now a tip. Menu paths match the plugin (no *Signal Ports* level).
- **Find in Cameo, exact path**: a link marked `strict` is looked up by its qualified name and nowhere else, so the
  copies in the correction packages are never selected.

- **Part 3: the logical architecture** (`/part3/`, author mode), rebuilt on the TP handoff and told as a
  story. The four levels of the method (operational, functional, logical, physical) with animated steps, as
  in Parts 1 and 2. Why a logical level, with drawings: what it is for, safety (a functional chain, its FHA,
  a function allocated three times), performance (latency along a chain, merging two subsystems), flows
  checked by sequence diagrams, other analyses, and several versions to compare. Mission Configuration by
  hand, a few gestures per scene. The three architectures played in the page, with captions for the
  events, labels on the key messages, the patch drawn thick; where the logic is in each; a larger trade-off
  chart. Think first (blanks to name, Predator counteraction). Then the build of the chosen architecture,
  one event at a time, each as goal / build / validate. Validate in Cameo sends the signals to the simulation and shows what is wrong in red. Parts go
  by what they do, without prefixes, port names hidden. The crash is not part of it: no crash signals, no System Monitoring Safety. New block `byChoice`; `` `name` `` shows in code font in
  every guide; phaseSteps has logical-level pictures. The starting model is still to be made.

- **Part 4: the swarm** (`/part4/`, was the fleet skeleton of Part 3). New system of interest (UAVs, base
  station, weather station), the problem (follow a stray sheep or the predator, keep the flock guarded), a
  mission state machine with parallel regions, three organisations of the swarm that load in the fleet
  panel. The fleet panel gains a stray sheep and the behaviour *escort*. The plugin's state frame may carry
  `drones` and `master`; the relay passes them on. Part 1 and Part 2 keep their one-drone panel, unchanged.

- **Session timing.** The guides tell the relay which scene each student is on, under an anonymous code
  shown in the Flight plan, with the version of the exercise (`tpVersion`). `/monitor/` shows a session
  (where everyone is, progress over the clock) and the overall stats (time per scene, pacing) to
  calibrate the content. Kept in the relay volume. `?track=0` turns it off on a teacher's machine.

- **Cameo plugin 1.0.9: one click to the browser bridge.** At ISAE, the PCs let only the browser out (Java
  and PowerShell time out on port 443). In *Local* mode the pairing window shows *Open the browser bridge*:
  it opens `/bridge/` with the code filled in, started, link on Auto. When Auto mode falls back to the
  relay inside Cameo, the notification says so. The bridge page shows a QR code of the guide for the
  phone, keeps its online code across restarts, and holds a Web Lock so the browser does not freeze it.

- **School networks.** The relay also works over plain HTTP requests (long poll + posts, at most 10
  posts/s; `relay/PROTOCOL-HTTP.md`) for proxies that let `https` through but hold WebSocket frames.
  The guide switches to it on its own (Cameo dialog > Relay > *Link to the relay*, or `?transport=http`).
- **Network check.** `/diag/` tests what a browser's network lets through and sends a report;
  `/diag/reports.html` lists the reports of browsers and of Cameo. `/bridge/`: a page that carries a
  Cameo in *Local* mode to the online relay through the browser. Reports are kept in the relay volume.
- **Cameo plugin 1.0.8.** HTTP transport (Auto: after two failed or one silent WebSocket), Windows proxy
  and certificates, menu ISAE > *Relay network check* with *Apply the recommendation*.
- Corrections of the exercises (`*orrection*`) are no longer copied into the site image.

- **ws and wss.** The guide reaches the relay over `wss://` (online) or `ws://` (this computer, plain
  `http` pages). With `relayUrl: "auto"`, a code that the online relay does not know is tried on
  `ws://127.0.0.1:8787`, so a student with Cameo in *Local* mode only types the code. A clear message
  tells when the browser blocks that local link (Safari from an `https` page).
- **Cameo plugin (next build).** New *Auto* relay mode (online, then inside Cameo after 3 failures) and a
  `ws://` fallback when the Java of Cameo refuses the TLS certificate (option *Fall back to ws://*).

## 1.0.0

First release of **MBSE Shepherd**: two interactive guides for the Cameo Systems Modeler (MagicDraw)
practical sessions in Model-Based Systems Engineering, with a live link to the model open in Cameo.

### Guides

- **Part 1 – Discover** (`/`): step-by-step scenes that walk the student through building a UAV model
  (use cases, actors, blocks, activities, state machines, requirements). Each scene shows a gesture, a
  short hint, a tip and an FAQ entry where useful.
- **Part 2 – Marked seminar** (`/part2/`): the graded seminar. It gives the goals and the expected
  outcomes only. Its simulation panel does not replay the nominal scenario, so it works whatever signal
  names the student chose.
- Scene building blocks: text and free-text questions, recall links to earlier scenes, icon rows,
  notes, tabs, a final answer sheet (debrief), and a per-browser memory of progress.

### Cameo link

- **Open in Cameo** chips: a chip next to each model element, diagram or step opens it in the running
  Cameo session through the relay.
- **Find in Cameo** for elements the student creates: the guide sends the element's name, UML type and
  package path (`browser/selectByName`, or `diagram/openByName` for diagrams). The plugin selects the
  single match, or reports *not found* or *ambiguous* so the guide can show a clear message.
- A connection dialog explains when Cameo cannot be reached and which relay address the guide is trying.

### Simulation panel

- Shows the states Cameo publishes while the student runs a simulation. The Activity Diagram is simulated
  too: a token appears in it when the state machine reaches the matching state.

### Author mode

- Scenes and model links are plain JavaScript in `content/` (Part 1) and `part2/content/` (Part 2), and
  the guide reads them directly. See the README for how to edit a scene.

### Deployment

- Dockerfile and nginx configuration to serve the guides.
- Cursor Cloud Agent worker install script for autostart on "My Machines".
- Bundled Cameo plugin (`assets/plugins/`), plus the Part 1 and Part 2 documents, models and images used
  by the guides.
