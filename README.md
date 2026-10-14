# MBSE Shepherd

Interactive guide for **BE Cameo · Part 1 · Discover** (DSAT301 Systèmes Embarqués).
It replaces the Word handout with 50 short scenes, one idea per scene, that students follow
on a laptop next to Cameo or on their phone.

No build step and no dependency: plain HTML, CSS and JavaScript.

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

## Simulation panel

The **Simulation** button of the top bar slides a panel down from under the bar (and back up when
it is hidden, with **Hide**, the same button, or Esc). The panel lies over the guide, it never
pushes it, so the page does not move. It shows the drone of the Pasture Sentinel mission reacting
to the simulation running in the student's Cameo:

- Link Cameo with the **Cameo** button (the 6-letter code of the plugin). The panel then follows
  the signals Cameo sends (`Start SOI`, `Start Patrolling`, ...) and jumps to the current step when
  it joins in the middle of a mission.
- Without Cameo it still works as a preview: click the signals offered for the current step, or
  play the nominal scenario. These buttons never send anything to Cameo.
- A signal that is not allowed in the current step is logged and ignored.

The logic comes from the monitoring project (`MBSE-Shepard-Monitoring`, `src/poc`): `sim-core.js`
holds the steps and transitions, `sim-motion.js` the movements, `sim-scene.js` the pasture. If the
state machine of the drone changes in Cameo, change `TRANSITIONS` in `js/sim-core.js`.

## The relay (Cameo ↔ guide)

The guide and the student's Cameo meet in a small relay (`relay/`, see its README). Both must use
the **same** relay:

- **Guide:** the **Cameo** button opens a dialog with the pairing code, the state of the link (and why
  it fails) and the relay address; the address can be changed there and is kept in the browser. The
  default is `relayUrl` in `content/config.js`. `"auto"` (default) means `wss://<site>/relay` when the
  guide is online, and `ws://127.0.0.1:8787` when it runs on your computer. `?relay=wss://host/path`
  overrides it for one visit.
- **Cameo:** Options > Environment > *Relay bridge* > **Relay address**. Online it is
  `wss://shepherd.chaos-art.fr/relay`; the default `ws://127.0.0.1:8787` is a relay on the same computer
  as Cameo. Then **OMF > Relay pairing code** shows the code to type in the guide.
- **Deploy:** `docker compose up` starts the guide (`web`) and the relay (`relay`); nginx forwards
  `/relay/` to the relay, so there is one address and one `https` (a secure page cannot open a plain
  `ws://` socket to another machine).

If the Cameo button keeps saying "Cannot reach the relay at ...", the address in the message is the one
the guide is trying: it is not the relay Cameo is connected to.

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

Ticks, notes and answers are stored in the browser (`localStorage`), per device. Nothing is sent
anywhere. Students get their answers out with **Copy my answers** or **Print** on the last scene.
Change `storageKey` in `content/config.js` to start everybody from zero after a big content change.
