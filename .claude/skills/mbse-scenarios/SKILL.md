---
name: mbse-scenarios
description: Write, check and play simulation scenarios of an MBSE Shepherd architecture in the scenario DSL (.scn) — unit scenarios (one moment of the mission, preconditions by reference), assemblies, alternative and dysfunctional variants — then play them in Cameo and judge the architecture from the verdict and the state-machine coverage. Use when asked to create, derive, complete, review or run scenarios, to validate or evaluate a logical or functional architecture by simulation, or to find what a set of scenarios does not cover.
---

# Simulation scenarios: write them, play them, judge the architecture

These files are plain Markdown and the commands are plain shell (Node ≥ 18). Any LLM with a shell can follow
them. Read this page, then the reference you need:

- [grammar.md](grammar.md): the DSL, every statement, and what each one compiles to.
- [method.md](method.md): how to derive a set of scenarios from state machines (unit → assembly → variants), rules and anti-patterns.
- [evaluate.md](evaluate.md): play in Cameo, read the verdict and the coverage, decide whether the scenario or the architecture is wrong.
- [examples.md](examples.md): one scenario of each kind, commented.

## What a scenario is here

A scenario sends **signals** to a simulated block in Cameo (from a driver: `operator`, `pasture`…) and checks,
after each signal, the **active states** of the parts' state machines (`soi.orch is Predator Defense Active`).
The text (`.scn`) is the source. `scenarios/scenario-dsl.js` compiles it to the `*.scenario.json` that the
Cameo panel *MBSE Shepherd > Simulation Scenarios* plays.

**The rule: one scenario = one thing.** What leads to that moment is not rewritten. It is referenced:

| keyword | meaning | measured? |
|---|---|---|
| `given: a, b` | preconditions: scenarios played first, with their own givens, each once | no (setup) |
| `sequence: a, b, c` | an assembly: the scenarios one after the other | yes, all |
| `from: a` + `after/before/instead of/remove/cut after <step>` | a variant of `a` | yes |

## Workflow

1. **Gather the facts, never invent them.** You need the exact names of: the parts and their paths (`soi.orch`), their
   states, the signals and the drivers that send them, and the simulation context block. Sources, in order:
   - the existing scenarios: `scenarios/library/**` (start with the first scenario of a chain, which declares
     `context`, `system`, `driver`);
   - the model data of the guide: `part3/content/archs.js` (state machines and scenario of each logical architecture);
   - Cameo, if it is open (see evaluate.md): `analysis/behaviorDigest` on a block gives its state machine as text.
   A state name that does not appear in a state machine will fail. Copy names character for character.
2. **Plan the tree before writing** (method.md): the nominal backbone cut into unit scenarios chained by `given`,
   one assembly `full` with `sequence`, then the alternatives (other transitions out of a state the backbone
   reaches) and the dysfunctional ones (a fault, an unexpected or lost signal), each `from` or `given` a unit.
3. **Write the `.scn` files.** One file per scenario, named after its id. Library scenarios go in `scenarios/library/<area>/`.
   New or unsure scenarios get `status: draft` and `version: 0.x`. A precondition always refers to a scenario that exists.
4. **Check:**
   ```bash
   node scripts/scenarios-run.mjs path/to/file-or-dir.scn --check
   ```
   0 errors, and read every warning: an undeclared path is almost always a typo. For the whole library:
   ```bash
   node scripts/scenarios-build.mjs
   ```
5. **Play in Cameo** (MagicDraw open, MBSE Shepherd plugin, the model loaded):
   ```bash
   node scripts/scenarios-run.mjs <id or file> --report out.json
   ```
6. **Judge** (evaluate.md). For each FAIL, decide whether the scenario or the architecture is wrong, and say why
   with the observed states. Turn the coverage (states never reached, branches not taken) into the next
   scenarios. Report: what passes, what fails and why, what is not covered, and what you propose.
7. **Show it:** the viewer `scenarios/index.html` (dev server `/scenarios/`, or opened from the disk after the build)
   shows the tree, the story, the step × part matrix and the compiled JSON.

## Hard rules

- Never copy the steps of another scenario to reach a moment: use `given`. Never repeat `system`/`driver`/`context`
  when a precondition already declares them (they are inherited).
- Every step checks something (`then …`). A step with no check is not a test.
- Check what changes **and** what must not change: `then X is not S`, and `never X is S` for the whole scenario.
- `kind` is honest: `nominal` = the intended mission; `alternative` = another legitimate path (refusal, retry,
  order changed); `dysfunctional` = a fault, a loss, an unexpected event.
- `fault:` is only a statement; the plugin does not break anything. Simulate a fault by its effect (a signal
  that does not arrive → `instead of`/`remove`; a wrong value → another signal) and say so in `note`.
- `then message …` is checked by the guide's "Validate in Cameo", not by the panel. Do not count it as verified after a panel run.
- Private scenarios (`scenarios/private/`, graded answers) are never copied into the public library, and a public
  scenario never refers to a private one (the build refuses it).
- A PASS shows that this one trace works, not that the architecture is right. Say what is not covered.
