---
name: sync-word-handout
description: After the guide (content/scenes.js and related files) is updated, bring the Word handout "BE Cameo - Part 1 - Discover" up to date with the same content. Use whenever a scene, step, note, FAQ entry or author note of the site has been added, changed or removed.
---

# Sync the Word handout with the site

The site (`index.html`, `content/scenes.js`) is the working version of the Word handout.
Every change made on the site must be reflected in the Word document, so the handout that
students and the LMS receive never falls behind.

## Source files

- **Site, source of truth for the change:** `content/scenes.js` (scenes, FAQ, `authorNotes`),
  `content/model-links.js` (model paths), `content/config.js` (course title and authors).
- **Word handout, to update:** `C:\Users\Quatermaster\Downloads\BE Cameo - Part 1 - Discover -2025 (MAJ).docx`
  (the "(MAJ)" copy is the most recent one; the plain `BE Cameo - Part 1 - Discover -2025.docx`
  in the same folder is the older version, do not edit it).
  If this path does not exist anymore, stop and ask the user where the handout is.

## When to run

Run it after any edit to the site content that a student would read: scene `title`, `lead`,
`p`, `steps`, `list`, `quote`, `callout`, `cards`, `question`, `h`, `figure` captions, FAQ
questions and answers. Do not run it for purely technical changes (CSS, JS, widgets, storage,
author-mode settings) or for placeholders that only the author sees.

## Procedure

1. **List what changed on the site.** Compare `content/scenes.js` with the last synced state.
   Keep a copy of the last synced version as `content/.handout-sync.json` (or in the scratchpad
   if the user prefers not to keep it in the project) so the diff is reliable. For each change,
   note the scene `id`, its chapter (`ch`) and its title.

2. **Map each scene to the handout.** Each scene belongs to a section of the Word document,
   found by its heading (Heading 1 / Heading 2) and its chapter letter (A, B, C, D, E, or the
   introduction and the first chapters). Match by title and wording, not by position. If a
   scene has no counterpart in the handout, say so and ask whether to add it there.

3. **Rewrite, do not paste.** The handout is written in full sentences, in the same style as the
   original text around it. Translate the site's short blocks into that style:
   - `steps` become a numbered list in the same paragraph style as the handout's existing steps.
   - `callout` and `quote` keep their meaning, as a note or a quoted specification.
   - `{{Menu > Item}}` becomes the menu label in bold, `<<text>>` becomes the name in quotes,
     `[[key]]` becomes the element name as written in the model.
   - Drop site-only things: chips, copy buttons, widgets, placeholders, notes fields.

4. **Edit the .docx carefully.** Use the `docx` skill for the file. Edit only the paragraphs
   that correspond to the changes; keep the document's styles, numbering, headers, footers and
   images. Never regenerate the whole document from scratch. Back up the file first, to the
   scratchpad, before the first write.

5. **Check the result.** Re-read the edited sections of the .docx and confirm that:
   - every change from step 1 is present, and nothing unrelated changed;
   - the scene order and the chapter headings still match the site;
   - the handout still says 4 diagrams out of 9, and the figure captions match the screenshots.

6. **Report to the user** in a short list:
   - which scenes changed, and where they are in the Word document;
   - anything that could not be mapped or that needs a decision (for example a new scene with no
     place in the handout, or a wording that contradicts another part of the handout);
   - the path of the updated file.

## Things to keep in mind

- Site and handout must say the same things about the model: element names, package letters,
  signal names. If the site and the handout disagree before the update, do not guess. List the
  disagreement under step 6 instead.
- Students hand in their work from the LMS, so do not rename the .docx file.
- Never publish or upload the .docx anywhere. Only edit the local file.
