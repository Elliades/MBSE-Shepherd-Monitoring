---
name: mbse-architecture
description: Design, generate, correct or trace-check a SysML v1 architecture in Cameo, layer by layer (requirements, lifecycle architecture — also called the operational layer —, functional, logical), with a Kotlin generator that describes the model through the OMF mbse library; then judge it with the rules of the method and test it with simulation scenarios. Use when asked to create, complete, correct or regenerate an architecture or one of its layers (mission objectives and MOE/MOP, lifecycle phases, context and exchanges, use cases per phase, requirement allocation, scenarios; functional mission, service functions, branch coverage, functional chains; logical components; traceability, requirement status, trade-off audit), to allocate a mission to components, or to check a model against the method.
---

# Generating an architecture: decide, describe in Kotlin, judge, test

## The principle

- **You decide.** The decisions of each layer are written in tables, and the human validates them before any code.
- **The generator describes.** A Kotlin file says what the model must contain, in the vocabulary of the method.
- **The engine writes.** It creates, updates and files the elements, and it applies the SysML v1 encoding.
- **The rules judge.** The same rule code runs on the description before writing and on the model read back after.
- **The scenarios test.** Simulate, measure the branch coverage and the MOP, and decide who is wrong.

Never write the model with element-by-element MCP calls. Never fix the model by hand. Reading through MCP is fine.

## Files

| File | Read it for |
|---|---|
| [requirements.md](requirements.md) | stakeholders, scope, requirements; tracing at the end of every layer |
| [lifecycle.md](lifecycle.md) | the lifecycle layer (= operational layer): mission and MOE/MOP, lifecycle phases, context and exchanges, use cases per phase, requirement allocation, black-box scenarios |
| [examples/metro.md](examples/metro.md) | a complete run of the lifecycle layer on an automated metro |
| [functional.md](functional.md) | mission signals, mission state machine, service functions, functional scenarios, branch coverage, functional chains |
| [logical.md](logical.md) | components, allocation, signals and ports, architecture styles |
| [traceability.md](traceability.md) | the trace graph across layers, requirement status (open → met), trade-off audit against MOE/MOP, impact analysis |
| [kotlin.md](kotlin.md) | writing, compiling, planning and applying a generator |
| [testing.md](testing.md) | what is tested at each level, which scenarios to write; the rest is in the `mbse-scenarios` skill |

**Vocabulary.** "Operational layer" = lifecycle layer (*lifecycle architecture*), described in
[lifecycle.md](lifecycle.md). "Operation" alone means the Execute phase. An ambiguous request ("do the operational
layer of the metro") means the whole layer, on the phases we decide to treat.

The library specification is in [method/implementation.md](../../../method/implementation.md). Everything not
implemented yet is in [method/backlog.md](../../../method/backlog.md).

## Process

0. **Prepare.**
   - Call `project/getCurrent` and note `dirty`. Ask before any save.
   - Check that Cameo was started in development mode (`gradlew runMbseShepherd`); otherwise `dev/reload` is missing.
1. **Frame.** Settle:
   - which layers are treated;
   - the SoI;
   - what the generator owns and what it only reads.

   For a new architecture, write the brief of the layer and have it validated.
2. **Read.**
   - `arch/read {layer, scope}` gives the existing model in the vocabulary of the method.
   - Until that reader exists, use `analysis/behaviorDigest`, `analysis/signalFlowExplain` and `model/vertical`.
   - Copy names character for character. **Never invent a state, signal or actor name.**
3. **Decide.**
   - Fill the decision tables of the layer, each with the reasoning of its sheet.
   - **Human gate**: show the tables, not the code, and wait for validation.
4. **Write the generator** ([kotlin.md](kotlin.md)):
   - one file per architecture, or per slice of a layer;
   - start from an existing generator;
   - each decision of a table becomes one line of the DSL.
5. **Compile and plan**: `bash scripts/dev/arch.sh <id> plan`.
   - The plan says what will be created, updated or rebuilt, and what is extra.
   - An unexpected update or extra: stop and understand.
   - A plan that touches existing elements is shown to the human.
6. **Apply and check**: `arch.sh <id> apply`.
   - Expect 0 rule errors.
   - Read every warning, then justify or fix it.
   - A second `plan` must give 0 changes.
   - Run the **validator** before the gate of the layer: `arch.sh <id> validate gate:<layer>` (or MCP
     `arch/validate`). The gate needs `PASS`; an `INCOMPLETE` is shown with what is missing. It runs the layer rules, the
     trace checks of [traceability.md](traceability.md) and the requirement status in one call.
7. **Test** ([testing.md](testing.md), then the `mbse-scenarios` skill).
   - Write the scenarios **from the lifecycle scenarios and the requirements**, not from the generated model.
   - Play them.
   - Cover every branch or justify each exclusion.
   - Evaluate the MOP.
8. **Judge and fix.** For each failure, decide from the observed states whether the scenario or the architecture is
   wrong. Fix the generator, or the decision table if the table is wrong. Then go through steps 5 to 7 again.
9. **Deliver**, after `validate delivery` gives `PASS`, using the template below. Present the diagrams with `arch/present` and the chains with `arch.sh … chains`.

## Hard rules

- Never save the project without explicit agreement.
- Check the open project before each `apply`: the user may have switched it.
- A validated decision table is not changed quietly. If the tests challenge it, go back to the gate.
- A method rule in error blocks. An ignored warning goes into the report, with the reason.
- No gate and no delivery without a validator verdict. Accepted exceptions are `waive(…)` lines in the generator,
  with a reason and who accepted them; never silence a rule any other way.
- Never copy observed states into a scenario's expectations to make it pass.
- A PASS shows that one trace works, not that the architecture is right. Say what is not covered.
- A project's architecture is never written into OMF or the plugin: its generators are a separate project, loaded as a
  jar (kotlin.md). Public examples only in the mbse-shepherd repository; the functional mission of Part 2 and its
  scenarios are graded answers, and their generator project stays private.
- Odd simulation after several hot reloads: restart Cameo before concluding.
- **Anything the user asks for that is not implemented goes into [method/backlog.md](../../../method/backlog.md)**,
  with what, why, where and when it is done. Do not leave it in the conversation only.

## Report

1. **What was decided**: the tables, and who validated them.
2. **What was built**: the generator, a summary of the applied plan, the scope.
3. **The verdict** (the validator output, as Markdown):
   - the rules: errors, and warnings with their justification;
   - `signalFlowCheck`;
   - the scenarios, PASS or FAIL with their cause;
   - the branch coverage;
   - the MOP values;
   - the trace report: requirement status, matrices, unjustified elements, trade-off audit.
4. **What is not covered**: branches excluded or never reached, requirements without a scenario, MOP not evaluated.
5. **What is proposed next**, and the backlog items it adds.

## Implementation status (keep it up to date)

See the *Progress* section of [method/backlog.md](../../../method/backlog.md).

| Piece | State |
|---|---|
| `omf-mbse-core`: models, DSL (lifecycle, functional, logical), rules, measures, trace, validator, snapshot | done, tested (`gradlew :omf-mbse-core:test`) |
| `mbse-report validate / trace / measures / impact / diff / rules` | done, tested |
| MCP `arch` (`plan`, `apply`, `validate`, `export`, `read`) and `scripts/dev/arch.sh` | done, run in Cameo on the metro (2026-11-06) |
| lifecycle apply (v0: rebuilds its package, draws sequence diagrams, no read-back yet) | done, run in Cameo |
| functional apply (v0: through the builder; no decision or fork/join yet; rebuilds its package) | done, run in Cameo |
| logical apply (Logical Transition, initial state, signal table, boundary, Auto Connect; idempotent) | done, run in Cameo |
| scenarios: `play_metro.py` (simtest) in `C:\workspace\metro-demo`; `.scn` generation and coverage | the driver works; `.scn` and coverage to do (FUN-01, FUN-03) |

To generate now:
- **Any layer: describe and validate it without Cameo.** Write the generator with the DSL of `omf-mbse-core`, export
  its snapshot, and run `mbse-report validate`.
- **All three layers: apply** with `arch.sh <id> plan`, then `apply` (`apply true` rebuilds the owned package). See
  `C:\workspace\metro-demo\run-all.sh` for the whole chain: apply, scenarios, export, `mbse-report`.

Never fall back on element-by-element MCP calls.
