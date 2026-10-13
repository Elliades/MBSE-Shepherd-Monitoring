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
| `js/widgets.js` | The interactive parts (state machine simulator, mission, sequence replay…). |
| `css/app.css` | The whole look, light and dark. |

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
