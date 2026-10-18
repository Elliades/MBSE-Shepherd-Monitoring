# Changelog

## Unreleased

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
