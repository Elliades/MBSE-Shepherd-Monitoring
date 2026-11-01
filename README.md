# MBSE Shepherd

Interactive guide for **BE Cameo · Part 1 · Discover** (DSAT301 Systèmes Embarqués).
It replaces the Word handout with 50 short scenes, one idea per scene, that students follow
on a laptop next to Cameo or on their phone.

No build step and no dependency: plain HTML, CSS and JavaScript.

**Part 2**, the marked seminar (BE Cameo · Part 2 · Marked), is a second guide in `part2/`, served at
`/part2/` (online: `https://shepherd.chaos-art.fr/part2/`). See [Part 2](#part-2-the-marked-seminar) below.

**Part 3**, the logical architecture of the shepherd drone, is a third guide in `part3/`, served at
`/part3/`. See [Part 3](#part-3-the-logical-architecture) below.

**Part 4**, the swarm, is a fourth guide in `part4/`, served at `/part4/`, with its own simulation panel
(several drones). See [Part 4](#part-4-the-swarm) below.

## Run it

- **Quick look:** double-click `index.html`.
- **Like students will see it:** serve the folder and open the address on any device of the same network.

```bash
python -m http.server 5178
```

- **Publish:** copy the whole folder to any static host (GitHub Pages, the school web space, an LMS file area).

Fonts come from Google Fonts. Without Internet the guide falls back to system fonts and still works.

## What is where

| File | What it holds |
| --- | --- |
| `content/scenes.js` | Every chapter and scene, the FAQ, and the notes for the author. **This is the file to edit.** |
| `content/model-links.js` | Every place of the Cameo model the guide points to, defined once. |
| `content/config.js` | Course title, authors, author mode, inline toolbar icons. |
| `assets/img/` | Screenshots taken from the Word handout. |
| `assets/models/` | Cameo model files students download from the guide (`{download: …}` block). |
| `js/engine.js` | Navigation, progress, answers, overlays. |
| `js/bridge.js` | Link to the student's Cameo through the relay (open an element, receive the simulation signals). |
| `relay/` | The relay itself (copy of the monitoring project's), deployed next to the guide. |
| `js/sim-core.js`, `js/sim-motion.js`, `js/sim-scene.js`, `js/sim.js` | The simulation panel (see below). |
| `js/widgets.js` | The interactive parts (state machine simulator, mission, sequence replay…). |
| `css/app.css` | The whole look, light and dark. |
| `css/sim.css` | The simulation panel and its pasture. |
| `assets/sim/` | The drone, sheep, bear and base of the pasture. |
| `promo/` | A promo film of the site (~70 s), played in the browser (see below). Online at `/promo/`, with the demo tool it drives at `/tool/`. |

### The promo film (`promo/`)

`https://shepherd.chaos-art.fr/promo/`, or `http://localhost:5180/promo/` (the relay dev server: it is needed), plays a 1920 × 1080 film built from the
site's own pieces. Its first part is live: the demo tool (`tool/`) takes a pairing code on the relay, and the
guide opens in a laptop and a phone with that code, so "Open in Cameo" (relabelled "Open in MBSE tool" in the
film) really selects the element in the tool's tree, and the simulation run in the tool really moves the drone
of the guide. Then the method, layer by layer, with the diagrams of `tool/` and the pasture of the simulation
panel; its functional part plays the Part 2 predator scenario with states only: the predator transitions, their
signals and the activity diagrams are marked questions of Part 2, so the film never shows them. Space plays or pauses, ← → seek, H hides the controls. `?lang=fr` for French, `?speed=1.2` to go faster,
`?t=12` to start at 12 s, `?autoplay=0`. For a clean live part, play it from the start (seeking back resets it).
To make a video file: full screen (F11) on a 1080p screen, then **● Record** (Chrome, saves a `.webm`), or any
screen recorder (Win+Alt+R, OBS). The pace of each part is `K` at the top of `promo/promo.js`; the live part is
the `LIVE` list (one click per line, at its time).

## Simulation panel

The **Simulation** button of the top bar slides a panel down from under the bar (and back up when
it is hidden, with **Hide**, the same button, or Esc). The panel lies over the guide, it never
pushes it, so the page does not move. It shows the drone of the Pasture Sentinel mission reacting
to the simulation running in the student's Cameo:

- Link Cameo with the **Cameo** button (the 6-letter code of the plugin). The panel then follows
  the signals Cameo sends (`Start SOI`, `Start Patrolling`, ...) and the state Cameo publishes at
  every change, so it also joins in the middle of a mission.
- Without Cameo it still works as a preview: click the signals offered for the current step, or
  play the nominal scenario. These buttons never send anything to Cameo.
- A signal that is not in `TRANSITIONS` is only logged: the state Cameo publishes moves the drone.
- The transitions between the predator steps are left out of `TRANSITIONS` on purpose: they are the
  answer to Question 4 of the marked seminar (Part 2), and the preview buttons would show them. The
  preview and its nominal scenario stop at *Predator tracking*.

The logic comes from the monitoring project (`MBSE-Shepard-Monitoring`, `src/poc`): `sim-core.js`
holds the steps and transitions, `sim-motion.js` the movements, `sim-scene.js` the pasture. If the
state machine of the drone changes in Cameo, change `TRANSITIONS` in `js/sim-core.js`.

## The relay (Cameo ↔ guide)

The guide and the student's Cameo meet in a small relay (`relay/`, see its README). Both must use
the **same** relay:

- **Guide:** the **Cameo** button opens a dialog with the pairing code, the state of the link (and why
  it fails) and the relay address; the address can be changed there and is kept in the browser. The
  default is `relayUrl` in `content/config.js`. `"auto"` (default) means `wss://<site>/relay` when the
  guide is online (`ws://<site>/relay` on a plain `http` page), and `ws://127.0.0.1:8787` when it runs on
  your computer. With `"auto"`, a code that the online relay does not know is then tried on
  `ws://127.0.0.1:8787` (Cameo in *Local* mode): the student only types the code.
  `?relay=wss://host/path` overrides it for one visit and turns that fallback off.
- **Cameo:** OMF > Relay pairing code has three modes. **Auto** (default) uses the online relay
  `wss://shepherd.chaos-art.fr/relay` and, if it cannot be reached 3 times in a row, the relay inside Cameo
  (`ws://127.0.0.1:8787`). **Online** and **This computer** force one of them. The address is also in
  Options > Environment > *Relay bridge*. If the secure connection is refused by the Java of Cameo
  (certificate not trusted, TLS-inspecting proxy), the plugin tries `ws://` on the same host after two
  failures (option *Fall back to ws://*; the pairing window warns that the link is not encrypted).
  The code is shown in the same window.
- **Deploy:** `docker compose up` starts the guide (`web`) and the relay (`relay`); nginx forwards
  `/relay/` to the relay, so there is one address and one `https` (a secure page cannot open a plain
  `ws://` socket to another machine). TLS is ended in front of nginx (the Caddy proxy of the server).
  For the `ws://` fallback of the plugin, that proxy must also serve `http://<site>/relay/*` without
  redirecting to https.

| Guide page | Cameo | Link |
|---|---|---|
| `https://` online | Auto / Online | `wss://<site>/relay` |
| `https://` online | This computer | `ws://127.0.0.1:8787` (Chrome and Firefox; Safari blocks it) |
| `http://localhost` | any | `ws://127.0.0.1:8787` |
| `http://<lan host>` | Auto / Online | `ws://<host>/relay` |

If the Cameo button keeps saying "Cannot reach the relay at ...", the address in the message is the one
the guide is trying: it is not the relay Cameo is connected to.

### Answers shared between the phone and the computer

Two pages linked to the same Cameo (the phone and the computer) share what the step on screen holds: the
answers and notes typed in it, its checkboxes and its validated steps. A change made on one page shows on
the other at once, over what it had (so one can correct the other). A page that arrives on a step (or
joins) sends what it has changed there and asks the other for its own; each item keeps the time of its
last change and the newest wins (`js/engine.js`, "shared with the other pages").

It goes through the relay as a frame `{"peer":{...}}`, handed as `{"type":"info","event":"peer","data":{...}}`
to the other browsers of the room and to the plugin (which ignores it), at most 16 KB. A `{"peer"}` sent
by the plugin goes to every browser. Both relays do it: the Node one (`relay/src/relay.js`, `sharePeer`)
and the one inside Cameo (`LocalRelay.kt` of the plugin, in the version after 1.1.1). In Local mode the browser bridge page
(`bridge/bridge.js`) carries these frames between the relay inside Cameo and the online code of the phone.

### School networks (WebSocket blocked)

Some proxies let `https` requests through but hold WebSocket frames (seen at ISAE: the socket opens,
nothing arrives). The relay then also speaks **plain HTTP requests**: one long poll for what comes in,
posts for what goes out, at most 10 a second (`relay/PROTOCOL-HTTP.md`). The guide
(`js/relay-http.js`, `relayTransport: "auto"` in `content/config.js`) and the plugin (1.0.8, option
*Relay transport*: Auto) switch to it on their own when the WebSocket fails twice or stays silent; the
plugin also goes through the Windows proxy and trusts the Windows certificates (options *Proxy to reach
the online relay*, *Also trust the certificates of Windows*). Tools to find out what passes where:

| Page | What for |
| --- | --- |
| `/diag/` | Network check of a browser (PC or phone): WebSocket, SSE, long requests, the Cameo link over HTTP and WebSocket. Sends a report. |
| Cameo > ISAE > *Relay network check* | The same from the Java of Cameo, on every proxy route found; *Apply the recommendation*. |
| `/diag/reports.html` | Every report, one line per device. |
| `/bridge/` | Browser bridge: Cameo in *Local* mode, this page in Edge on the same PC carries it to the online relay with the browser's proxy and login. Plugin 1.0.9 opens it filled in and started (*Open the browser bridge* in the pairing window); `?code=| `/bridge/` | Browser bridge: Cameo in *Local* mode, this page in Edge on the same PC carries it to the online relay with the browser's proxy and login. |start=1| `/bridge/` | Browser bridge: Cameo in *Local* mode, this page in Edge on the same PC carries it to the online relay with the browser's proxy and login. |transport=auto|ws|http`. The phone scans its QR code. This is what works at ISAE: only the browser may leave the PCs. |

The options compared and the test procedure on site: [docs/connectivite-isae.md](docs/connectivite-isae.md).
To reproduce such a proxy at home: `node scripts/dev-server.mjs 5181 --silent-ws` (site + relay, the
WebSocket opens and stays silent); `node scripts/dev-server.mjs` serves site and relay on one port, as
online.

## Links by name (elements the student creates)

An element the student creates (`made: true` in `content/model-links.js`) has no UUID when the guide is
written. Its chip opens the usual sheet, and the button there says **Find in Cameo** instead of **Open in
Cameo**. Any entry without an `id` works the same way. The guide sends this to the plugin, through the
relay, in the usual request frame:

```json
{ "req": "r7", "category": "browser", "name": "selectByName",
  "args": [{
    "name": "Load Flight Plan",
    "type": "activity",
    "path": ["2 - Functional Analysis", "A - Functional architecture", "Deployment", "Parameter Mission", "Load Flight Plan"],
    "kinds": ["package", "package", "package", "package", "activity"],
    "qualifiedName": "2 - Functional Analysis::A - Functional architecture::Deployment::Parameter Mission::Load Flight Plan"
  }] }
```

For a diagram type (`ucd ibd sd ad stm bdd req`) the guide first sends `category: "diagram"`,
`name: "openByName"` with the same argument, and falls back to `browser/selectByName`.

What the plugin does with it:

1. Candidates are the model elements whose **name equals `name`** and whose UML kind matches `type`
   (`package` Package, `block` Block, `iface` InterfaceBlock, `usecase` UseCase, `actor` Actor,
   `activity` Activity, `state` State, `signal` Signal, `stm` StateMachine, diagrams their diagram type).
   The type is what tells apart an activity and a package that share a name.
2. If there are several, keep those whose owners contain the items of `path` in order, best match first.
   A missing owner (a Region, a package the student skipped) only lowers the score. It never rules out.
3. One candidate: select it in the Model Browser (or open it, for a diagram) and answer
   `{ "res": "r7", "ok": true, "result": ... }`.
   None: `"ok": false, "error": "not-found"`. Several equal: select them all and answer
   `"error": "ambiguous"`. The guide shows a message for these two; any other error shows "Cameo could not show it".

An entry marked `strict: true` skips all this: the guide sends `model/getByQualifiedName` with its exact path, and
answers `not-found` if nothing is there. Use it when copies of the element exist elsewhere in the project.

Things to add in the guide for this to work: give the entry a `path` that matches the steps, spell `name` as
the steps tell the student to type it. For the functions the student names in Question 2, the guide builds the
entry itself (`fromAnswer` with `under: "<link key>"`, in `b-exercise`).

## Edit a scene

A scene is an object in `content/scenes.js`:

```js
{
  id: "c-state", ch: "C", kind: "do", ref: "C.1",
  title: "Create the state \"Configured\"",
  lead: "One sentence that says what this scene is about.",
  blocks: [
    { steps: ["In the palette, click on {{State}}.", "Type <<Configured>> and press Enter."] },
    { figure: { src: "assets/img/my-capture.png", alt: "What the image shows", caption: "Shown under the image" } }
  ]
}
```

`kind` is `read`, `do`, `answer` or `try`. The id is also the address of the scene:
`index.html#c-state` opens it directly, which is handy to send a whole class to the same place.

Marks you can use inside any text:

| Write | Get |
| --- | --- |
| `**bold**`, `*italic*` | emphasis |
| `[[soi-stm]]` | a chip that shows where the element is in the model |
| `[[soi-stm\|another label]]` | the same chip with another label |
| `{{Create Diagram}}` | a label of the Cameo interface |
| `((run))` | a small toolbar button, declared in `config.js` |
| `<<Configured>>` | a name to type in Cameo; tapping it copies it |

The available blocks are listed at the top of `content/scenes.js`.

## Fill in what is missing

Open the guide, then **Flight plan → Authoring to-do**. The board lists:

1. **Missing content**: every placeholder (screenshot, GIF, text, link) with what to produce.
2. **Model links**: every element that has no deep link yet.
3. **Noticed while converting the handout**: inconsistencies of the Word document that need a decision.

To replace a placeholder, swap its block for the real thing:

```js
// before
{ placeholder: { kind: "gif", title: "Adding and naming a state", todo: ["Record …"] } }
// after (a GIF is an image like any other)
{ figure: { src: "assets/img/add-state.gif", alt: "A state is dropped inside Undeployed and named Configured.", caption: "Adding and naming a state." } }
```

### Model links

Each entry of `content/model-links.js` has an empty `url`. As soon as it is filled, the chip and
the path card get an **Open in Cameo** button and a **Copy link** button. Paths are written once
there, so fixing a path fixes it in every scene.

### Author mode

Placeholders, "no link" tags and the to-do board only show in author mode.

- `content/config.js` → `authorMode: false` before sharing with students.
- Or force it for one visit with `?author=0` / `?author=1` in the address.
- Or use the switch at the bottom of the Flight plan.

## What students' browsers keep

Ticks, notes and answers are stored in the browser (`localStorage`), per device, and never sent.
Only the timing below leaves the browser. Students get their answers out with **Copy my answers** or **Print** on the last scene.
Change `storageKey` in `content/config.js` to start everybody from zero after a big content change.

## Session timing (monitor)

To calibrate the exercise, each guide tells the relay of the site which scene the student is on
(`js/track.js`): at every scene change, every minute while the guide is visible, and when it is hidden.
The student is an anonymous 4-letter code drawn by the browser (shown in the Flight plan); no name,
answer or address is sent. The relay keeps the events in its volume (`/data/track.jsonl`) and folds
them into one run per code, guide and day (`relay/src/track.js`).

**`/monitor/`** (online: `https://shepherd.chaos-art.fr/monitor/`) shows:

- **Session**: one day. Where everyone is now, the progress of each student over the clock, and a
  table (scene, furthest scene, start, active time, steps ticked, version). Refreshes every 20 s.
- **Overall**: every day of one version. Median time on each scene, pacing (time from the start to
  reach each scene, with the middle half of the class), and the sessions.

Settings in `content/config.js` (and `part2/content/config.js`): `trackPart`, **`tpVersion`** (change
it when the exercise changes, so its stats are kept apart; a fingerprint of the scenes is also sent),
`trackUrl` (`"auto"`, or empty to send nothing). On your own machines, open a guide once with
`?track=0` (`?track=1` to undo), or hide your test codes in the monitor. Active time leaves out
breaks: a hidden tab, or no news for 5 minutes. To keep the monitor private, set `TRACK_KEY` on the
relay service and open `/monitor/?key=…`.

## Part 2: the marked seminar

`part2/` is a second guide built on the same engine. It shares `js/`, `css/` and `assets/` with Part 1
and only has its own content and images:

| File | What it holds |
| --- | --- |
| `part2/index.html` | The page. Same as `index.html`, with `../` in front of `css/` and `js/`. |
| `part2/content/scenes.js` | The tasks and questions of the marked seminar, the FAQ, the author notes. |
| `part2/content/model-links.js` | The places of the model it points to. |
| `part2/content/config.js` | Its own title, `storageKey`, and the settings below. |
| `part2/assets/` | Its images and the Word handout. |

**The seminar is marked.** Its scenes say what each task asks for and where to work in the model, never
exactly what to do: no signal, transition, function, subsystem or allocation is named, and there is no
solution block. Keep it that way when editing it. What it adds:

- `pts: 2` (and `bonus: true`) on a scene shows its points; the `marks` widget lists every marked question.
- `{ recall: { items: [{ id: "a-messages", title: "Send messages between actors" }] } }` links to the
  scenes of Part 1 that show a gesture again (they open in a new tab; `recallBase` in its config).
- `{ question: { type: "text", ... } }` is a free-text answer.
- `{ icons: [{ src, alt, label }] }` is a row of small pictures, each with its label (the drone, sheep and bear
  of "The request" scene).
- `simPreview: false` in its config: the simulation panel never lists signals or plays the nominal
  scenario. It only follows the states Cameo publishes, so it works whatever the students named their
  signals.
- `sharedBase: "../"` tells the simulation panel where the shared `assets/` folder is.

Open it locally at `http://localhost:5178/part2/` (same server as Part 1). Both guides keep their progress
under different `storageKey`s; the Cameo pairing code and the relay address are shared.

## Part 3: the logical architecture

`part3/` is a third guide, same layout as `part2/` (served at `/part3/`). The content follows the TP handoff
of the OMF plugin docs (`docs/pasture-sentinel/tp/`); its figures are in `part3/assets/img/`. The story:
theory and analyses; one subsystem by hand (Mission Configuration); the three logical architectures of the
drone played in the page; the student's choice; thinking first; then the build of the chosen architecture
one scenario event at a time, each as goal, build and validate. The crash is not part of it
(`archs.leaveOut`). Scenes that depend on the choice use the block
`byChoice` (see the header of `content/scenes.js`).

It keeps the one-drone simulation panel of Part 1 and 2 (the `js/sim*.js` files are not changed for it) and
loads, with Part 4 only, `js/widgets-logical.js` and `css/logical.css` (the colour of the logical level,
`phase: "lg"`). Part 3 alone also loads:

| File | What it is |
|---|---|
| `part3/content/archs.js` | The three architectures as the correction models build them: state machines, send steps (with the sends of the functions they call), parts, connectors, scenarios. Written by `scripts/make-part3-archs.py` from `drone-archs/arch-*.json` and `*.scenario.json`; do not edit by hand. |
| `js/logical-engine.js` | A small simulator of those specs (nested states, regions, signal and completion transitions, do-activities with reactions, routing through connectors and boundary ports). It replays the expected states of the three scenarios (70 checks). With `{ only }` it leaves out the parts not built yet, with `{ drop }` the states not made yet, with `{ mute }` the signals nobody sends yet. A wanted state may be `!Name`: anything but that one, when the name is the student's (the patch). |
| `archs` in `part3/content/config.js` | How to draw them (labels, colours, layouts, trade-off scores, where the logic is), the **target** drawing of the state machine to reach with its gestures, the **stages** of the build (parts added, states made, steps measured, what to check), the **story** captions, the message **badges** and the **highlighted** exchanges of the animation. |

Chapter 5 asks for the logic before any click (role, content, interactions, steps), then gives our proposal.
Chapter 6 is that proposal, one scenario event at a time: the subsystems are ready in the starting model, the
student makes the states of the decider and draws the connectors. Only the patch of architecture 2 stays to design.
Each stage has `deciderStm` (the result to reach, gesture by gesture), `stageIbd` (what this stage adds and what to
connect, from `archs.js`) and `scenarioGrow` (the scenario so far).

The widget `archSim` with `stage` plays one stage on what is built so far. Its **Validate in Cameo** button drives the simulation in Cameo through the relay:
`simtest/start` on the context block, `simtest/send` for each signal of the scenario, `simtest/states` to read
each part back; what is wrong shows in red. Parts are addressed by the name of their type (`Logical SOI 3 - …
.Mission Orchestrator`), because they have no name of their own in the model. It needs a plugin with `simtest/*`
on the allow-list of `RpcDispatcher` and the lookup by type in `SimTestMcpProvider`; with an older plugin the
button offers the scenario as a file, to open in *MBSE Shepherd > Simulation Scenarios*.

On screen, parts go by what they do (`:Orchestrator`, never `orch`) and port names are hidden. The internal keys
of `archs.js` (`soi.orch`…) stay in the data only. The generator also applies what the specs do not say yet: the
signals `FlightPlan Correct` / `FlightPlan Incorrect`, Load Flight Plan keeping its decision (`correct_flight_plan`), and
no crash, so no System Monitoring Safety (`remove_crash`).

```bash
python -I scripts/make-part3-archs.py <path to OMF_Private/docs/pasture-sentinel/drone-archs>
```

## Part 4: the swarm

`part4/` is a fourth guide, same layout as `part2/` (served at `/part4/`; `part4/lab/`, a drone-assembly
proof of concept, is not published by the Dockerfile).
What is new is its simulation panel: several drones instead of one. It loads `js/sim-fleet-core.js`,
`js/sim-fleet-scene.js`, `js/sim-fleet.js` and `css/sim-fleet.css` **instead of** `js/sim-core.js`,
`js/sim-motion.js`, `js/sim-scene.js` and `js/sim.js`. Part 1 and Part 2 do not load the fleet files, and
the one-drone files were not changed, so they behave as before.

What the panel shows:

- One drone per drone of the fleet, each with a **role** (`fleet.roles` in `part4/content/config.js`:
  drone shepherd, sheep guard, anti-predator) and its own step.
- The **master**: the base station (it pilots every drone), one drone (the lead of the swarm), or none.
  Dashed lines go from the master to the drones it pilots.
- The use case of Part 4: a drone may **follow a stray sheep or the predator out of the field as long as
  another drone stays on the field**. The panel says which drones keep the field, and turns red when none is left.

A step is turned into what the drone does on screen (patrol, guard, track, counter, pursue, return, ...)
from the words of its name, so the model can name its states as it likes; `fleet.behaviours` lists the
exceptions. With `simPreview: true` each drone has a list of its steps and *Play the scenario* plays
`fleet.scenario`; with `false` the panel only follows Cameo.

### Fleet simulation: what Cameo sends

The state frame of the plugin gains two optional fields (the relay keeps them, `relay/src/frames.js`;
`relay/test/frames.test.js`):

```json
{"type":"info","event":"state","status":"running","step":"Patrolling",
 "drones":[{"id":"D1","step":"Patrolling","role":"shepherd","name":"Shepherd 1"},
           {"id":"D2","step":"Guarding flock","role":"guard"}],
 "master":"base"}
```

`id` and `step` are required, `role` and `name` optional; at most 16 drones; `master` is `"base"` or the
`id` of a drone. `step` stays: it is what Part 1 and Part 2 read. A frame without `drones` shows one drone
of `fleet.defaultRole` in Part 4.

Plugin side, still to do: today `PastureSimulationEngine` merges the active states of every object into one
step; it must keep them per drone instance to fill `drones`. `LocalRelay.kt` (the relay inside Cameo)
rebuilds the state frame with `status` and `step` only, so it must copy `drones` and `master` too.

