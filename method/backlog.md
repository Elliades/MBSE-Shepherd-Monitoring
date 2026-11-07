# Backlog: what is left to complete and industrialise the method

Everything the method uses that does not exist yet is listed here: tools, library code, model conventions, checks,
side services. **Rule: anything asked for that is not implemented gets a line here**, with what it is, why it is
needed, where it goes, when it is done, and where it is specified. The skill points here
([SKILL.md](../.claude/skills/mbse-architecture/SKILL.md)).

Where:
- **OMF**: plugin and library, `C:\workspace\java\mdplugins\OMF\OMF_Private`;
- **core**: the new pure Kotlin module `omf-mbse-core` in OMF;
- **svc**: the side service `mbse-report`;
- **shepherd**: this repository (scenario DSL and runner);
- **model**: profile or conventions in the Cameo models;
- **method**: the skill sheets.

Status: `todo`, `doing`, `done`, `question` (to decide or check first).

Spec, meaning how well the item is documented today:
- **ok**: someone can implement it from the linked text;
- **partial**: the intent and the shape are written, but details are missing, and the missing part is named;
- **missing**: only this line exists.

The details of every item that needed more than a line are in [details.md](details.md).

## Progress

**2026-11-05: first implementation**, in OMF, on branch `0-dev-2026-isae`, not committed.

**Built and tested without Cameo:**
- `omf-mbse-core` (new Gradle module, no MagicDraw), 21 JUnit tests. It contains:
  - the method models;
  - the lifecycle, functional and logical DSL, with waivers and trade-offs;
  - the transition plan (what Logical Transition will do, computed before writing);
  - the rules LC-01..21 (except LC-13, form), FN-01..09/12/13, LG-02/04/13..17/22..25, REQ-01/05/07, TR-09..19, plus the
    `signalFlowCheck` mapping;
  - the MOP evaluators;
  - requirement status and impact analysis;
  - the validator with profiles;
  - the JSON snapshot and the runs format.
- `mbse-report` (new Gradle module, CLI), 3 tests: `validate` (exit codes 0 / 1 / 2), `trace`, `measures`, `impact`,
  `diff`, `rules`.

**Built, compiled, not yet run in Cameo:**
- in the plugin, `mbse/engine`: the `Reader` (functional mission and logical components), the `LogicalApplier` over
  Logical Transition, Delegate and the signal port creator, and the MCP category `arch`
  (`list, rules, describe, plan, apply, validate, export, read`);
- the generator `architectures/part3/MissionConfiguration.kt`;
- the Gradle task `archDevJar`;
- `scripts/dev/arch.sh`. It refuses to reload while another session has hot-reloaded other categories.

**2026-11-06: test run on an automated metro**, in a new Cameo project `Metro_Autonomous`. The generators are their
own project, `C:\workspace\metro-demo\architecture`. They are not in OMF: the plugin loads their jar with `arch/load`
(the generator interface moved to `omf-mbse-core`). Outputs are in `C:\workspace\metro-demo` (snapshot, runs,
reports, `run-all.sh`). The project is saved as `C:\workspace\metro-demo\model\Metro_Autonomous.mdzip` (`arch/save`).
The self-contained package is `C:\workspace\metro-package` (`make-package.sh`): the plugin zip, the generator jar
and sources, the model, the results, `mbse-report`, the scripts and the method docs.

The run covered:
- the lifecycle layer: phases Deploy, Execute and Sustain, 4 use cases, 8 scenarios, 8 requirements, 2 MOE and 3 MOP;
- the functional layer: a mission with 3 parallel regions in a composite mode, and 13 functions;
- the logical layer: 3 components from 11 allocations, 19 ports, and a trade-off;
- 14 scenarios played, 7 in the functional layer and 7 in the logical layer, all PASS;
- `mbse-report validate delivery`: 1 error left, REQ-06 failed through MOP-3, explained below.

Found and fixed during the run:
- **The builder** silently ignored parallel regions at the top of a machine. It now creates them.
- **Logical Transition** does not create the initial pseudostate of the component. The engine now sets it, and the
  new rules LG-26 (core) and LG-26P (plugin) check it.
- **The reader** hid a missing initial. It now reports it. It also lost function kinds, signal kinds and links: the
  engine now writes «satisfy», «trace» and the kinds, and the reader reads them back.
- **A name clash** between the lifecycle mission-measures block and the functional mission block.
- **`arch.sh`**: the REST route dropped the response of a long apply. It now uses JSON-RPC.
- **`MetroFunctional`** made Running transient, through a self-sent arrival. The arrival is now an observation. The
  simulation found this.
- **Measure formatting** used the locale's decimal comma. Fixed.

Found and still open:
- **Cameo starts only the first region at the top of a machine.** Parallel regions must sit inside a composite mode
  (FUN-06).
- **The logical boundary and the simulation drivers are not generated.** Sends on unconnected ports are lost, so
  MOP-3 (diagnostics) fails in the logical layer (LOG-10).
- **The lifecycle layer is not read back.** Its rules after apply run on the description (CORE-11).
- **The functional applier v0** writes decisions on a signal type and fork/join as opaque actions (CORE-12).
- **A fresh SysML project has no «Logical Component» stereotype**, so components are plain blocks (LCY-06).
- **`project/createSysML`** lost the backslashes of the target folder. The project landed in
  `OMF_Private/com.elliades.isae.mbseShepherd/build/install/workspacemetro-demo/` (LCY-07).

**2026-11-06: independent verification of the metro run** (second agent, read-only on Cameo). Its first verdict was
KO on traceability, on the validator and on method conformance. What it found, and what became of it:

| Finding | What | Status |
|---|---|---|
| D-1 | The logical read-back copied the contexts and the boundary from the description, so LG-17 compared the boundary with itself; the boundary was never built | **fixed**: contexts are read back from Cameo, the engine builds the SoI boundary, LG-17 fails when there is no boundary |
| D-2 | 33 `signalFlowCheck` warnings matched no rule and were dropped | **fixed**: LG-27P covers the boundary codes; FN-99P and LG-99P take any unmapped code; findings carry their layer |
| D-3 | The recorder labelled receptions as sends, and MOP-3 was averaged across layers | **fixed**: sends come from Send Signal Actions; each MOP is evaluated per layer. MOP-3 is met in both layers |
| D-4 | `Before` was true when the second event never happened | **fixed** |
| D-5 | REQ-05 ("keep the doors open until the OCC clears the alarm") is not designed, and the test did not check it | **detected**: the alarm scenario now tests it and fails in both layers; REQ-05 is reported failed. The design fix (an exchange from Passenger Safety to Train Control) is open |
| D-6 | The SoI is three unrelated blocks: the lifecycle SoI, the functional mission, the logical context | open (CORE-13) |
| D-7 | Environment observations had no source | **fixed**: `Train Sensors` participant and exchanges in the lifecycle layer; the arrival is an input |
| D-8 | The reader marked every logical function without «refine» as COORDINATION, which hid LG-24 | **fixed**: the kind is read from its mark |
| D-9 | Coverage rules passed with no coverage data; LG-22 passed with no logical run | **fixed**: they are skipped without data (INCOMPLETE), and LG-22 reports a missing replay |
| D-10 | Waivers matched loosely, ignored aliases, and were never reported unused | **fixed**: exact path match, aliases honoured, W-03 for an unused waiver. A waiver's `by` should name a person (method) |
| D-11 | Re-applying the lifecycle or functional layer rebuilds its package, so elements pointed to from other layers are deleted; `run-all.sh` deleted the logical package by hand | partly: `arch apply` takes `rebuild`, so no manual delete is needed; logical apply is idempotent (second plan: 28 KEEP). Reconciliation for the lifecycle and functional layers stays open (CORE-05); `_ext` signals are filed in the lifecycle package (open) |
| D-12 | MOE→objective, MOP→MOE and scenario→MOP have no relation in Cameo; the trade-off is not in Cameo; no «moe»/«mop» | open (TRC-04, TRC-06, MEAS-02) |
| D-13 | TR-19 compared nothing (non-numeric evidence); TR-16 accepts a contradictory "unaffected" | open (TRC-03) |
| D-14 | Rules missing from the code, or implemented differently from the sheets | open (CORE-09, generating the sheets from the catalogue, and CORE-15) |
| D-15 | Weak scenarios: a hard-coded driver instead of `.scn`, injection straight into parts, few negative checks | open (FUN-03, FUN-04, LOG-03) |
| D-16 | Stale status in the skill and the backlog; `mbse-report trace` exits 0 on FAIL; a runs file without coverage totals crashed the CLI | status refreshed; the CLI crash is **fixed** (coverage fields have defaults); the trace exit code is open |
| D-17 | Sequence diagram drawing glitches; no context IBD, no use case diagram, no logical context diagram | fixed 2026-11-07 (CORE-14), except the first-message glitch |

State after the fixes:
- 14 scenarios were played: 12 PASS and 2 FAIL. The two failures are the REQ-05 test, once in the functional layer and
  once in the logical one.
- `validate delivery` gives 3 errors, all about REQ-05, and 9 warnings: FN-09, plus 8 `CONNECTOR_SIGNAL_ONE_SIDED`
  where Auto Connect fans a boundary port out to every component.

**Still to do:**
- the lifecycle kit, reader and applier (CORE-04, CORE-05);
- the functional applier;
- the Cameo validation suite (VAL-04);
- the profile stereotypes «mop» and «Generated»;
- coverage of decision branches (FUN-01), chains (FUN-02), `.scn` skeletons and fields (FUN-03, FUN-04);
- reports in HTML (SVC-02), CI (SVC-03).


Abbreviations for the links: [impl](implementation.md), [lc](../.claude/skills/mbse-architecture/lifecycle.md),
[fn](../.claude/skills/mbse-architecture/functional.md), [lg](../.claude/skills/mbse-architecture/logical.md),
[tr](../.claude/skills/mbse-architecture/traceability.md), [req](../.claude/skills/mbse-architecture/requirements.md),
[test](../.claude/skills/mbse-architecture/testing.md), [kt](../.claude/skills/mbse-architecture/kotlin.md).

## 1. Core: the generation loop and the library (build order)

| Id | What | Why | Where | Done when | Specified in | Spec | Status |
|---|---|---|---|---|---|---|---|
| CORE-00 | Gradle module `omf-mbse-core` (method, rules, measures, trace, snapshot format) with no MagicDraw dependency; a test that forbids `com.nomagic` imports | the same rules run in Cameo, in the side service and in CI | core | the module builds and its JUnit tests run with `gradlew test`, without Cameo jars | [impl](implementation.md#the-five-layers-of-the-code) | ok | done |
| CORE-01 | The loop: `ArchitectureScript`, MCP `arch` (`list`, `plan`, `apply`), `scripts/dev/arch.sh`, logical DSL v0 over the transition services (see LOG-04) | generators become Kotlin code | OMF | Mission Configuration (Part 3) generated from a Kotlin file, its `.scn` PASS | [impl](implementation.md#the-execution-loop), [kt](../.claude/skills/mbse-architecture/kotlin.md) | ok | doing |
| CORE-02 | Check that `dev/reload` can reload `mbse` and `architectures` together | the loop depends on it | OMF | a library change is picked up without restarting Cameo, or the limit is written down | [impl](implementation.md#the-execution-loop), [details](details.md#core-02) | ok | done |
| CORE-03 | Lifecycle method model and DSL: `LifecycleModel` with mission (MOE/MOP), phases, `resume`, `newActor`, `newExternal`; rules LC-01 to LC-20 with pass/fail fixtures | the lifecycle layer is checkable before Cameo | core | `gradlew test` green | [impl](implementation.md#l2--the-method-model), [lc](../.claude/skills/mbse-architecture/lifecycle.md) | ok | done |
| CORE-04 | SysML kit, lifecycle patterns: actor, phase package, use case, interaction, lifeline, message, item flow, requirement and its links, MOE/MOP properties | the encoding is written once | OMF | each pattern created twice gives one element, in a test batch | [impl](implementation.md#l1--the-sysml-v1-kit), [details](details.md#meas-02) | ok | doing |
| CORE-05 | Reader and applier: identity, scope, `prune`, plan through `RecordingWriter`, form rules `F-xx` | replayable generators that can correct a model | OMF | *Parameter Mission* applied; a second plan gives 0 changes; same rule verdict before and after; the Part 1 correction model read back passes the form rules | [impl](implementation.md#l4--the-engine), [details](details.md#core-05) | ok | doing |
| CORE-06 | Functional model, DSL and kit: mission signals linked to lifecycle exchanges, state machine with regions, functions with `call` / `sendSelf` / `accept` / `decide` / fork-join / reaction loops; rules FN-01 to FN-16; patterns extracted from the builder | the functional layer as code | core + OMF | the Part 1 mission generated, simulated, scenarios PASS, coverage 100 % or justified | [fn](../.claude/skills/mbse-architecture/functional.md), [impl](implementation.md#l2--the-method-model), [details](details.md#core-06-core-07-core-08) | ok | doing |
| CORE-07 | Logical model on the applier: `LogicalModel`, reconciliation instead of `replace`, LG rules with `PluginRule` mapping to `signalFlowCheck` | correct a logical architecture without rebuilding it | core + OMF | a Part 3 architecture replayed twice without changes; a one-line generator change gives a one-line plan | [lg](../.claude/skills/mbse-architecture/logical.md), [impl](implementation.md#the-logical-transition-engine), [details](details.md#core-06-core-07-core-08) | ok | doing |
| CORE-08 | Requirements model across layers (`Requirements`, `refine` / `deriveReqt` / `satisfy` / `verify`) and rules REQ-01 to REQ-07 | tracing at every layer end | core + OMF | requirement coverage on Part 1 | [req](../.claude/skills/mbse-architecture/requirements.md), [impl](implementation.md#l2--the-method-model), [details](details.md#core-06-core-07-core-08) | ok | doing |
| CORE-09 | `arch/rules`: the rule catalogue generated from the rule classes, and the rule tables of the sheets generated from it | no copy of a rule in two places | core + method | the rule tables of the sheets are generated | [impl](implementation.md#l3--the-rules) | ok | doing |
| CORE-11 | Lifecycle reader: read use cases, scenarios (messages, lifelines), exchanges, requirements and links back from Cameo | the lifecycle rules after apply, and on a model made by hand, must run on what Cameo holds | OMF | `arch/validate {readBack}` on metro.lc runs on the model read back | [impl](implementation.md#the-reader) | ok | todo |
| CORE-12 | Functional applier: classified choice and fork/join (the builder writes them as opaque actions today) | the activity patterns of functional.md | OMF | `Load Flight Plan` (Part 1) generated with its decision on the plan type | [fn](../.claude/skills/mbse-architecture/functional.md#3-service-functions-decomposed-and-refined) | ok | todo |
| CORE-13 | One SoI across the layers: the functional mission on the lifecycle SoI block (or a generalisation), the logical context as the SoI or inside it | the SoI must be one block (functional.md); today three unrelated blocks | OMF | `transverse` links the three; LG-18 checks it | — | ok | todo |
| CORE-14 | Diagrams: lifecycle context IBD, use case diagram per phase, logical context IBD; fix the first message of sequence diagrams | the human reads the model through diagrams | OMF | the four diagrams generated and readable | — | ok | done 2026-11-07 (ArchDiagrams, ArchLayout: every generated diagram laid out by the engine); first message of sequence diagrams still open |
| CORE-15 | Implement the rules the sheets list but the code lacks (verifier D-14), or remove them from the sheets | a rule in a sheet that nothing checks is a promise not kept | core | the catalogue and the sheets list the same rules | [details](details.md#core-05) | partial | todo |
| CORE-16 | Generators outside the plugin: the generator interface in `omf-mbse-core`, `arch/load {jar}` (ServiceLoader), the architectures folder at start, `arch/save {path}` | a project's architecture must not live in OMF or in the plugin | core + OMF | the metro jar, built in its own project, is loaded and applied; `list` shows where each generator comes from | — | ok | **done** 2026-11-06 |
| CORE-10 | `ArchitecturesBatch` regression in `omf-test-framework` | generators keep working as the library changes | OMF | the batch runs in `gradlew runMbseShepherdTests` | [impl](implementation.md#the-execution-loop) | ok | todo |

## 2. Mission measures (MOE / MOP)

| Id | What | Why | Where | Done when | Specified in | Spec | Status |
|---|---|---|---|---|---|---|---|
| MEAS-01 | Evaluators `Reached`, `Never`, `Before`, `Count` over the scenario reports; `arch/measures`; one line per MOP in the report | MOP measured by simulation, without parametric diagrams | core (+ OMF MCP) | the MOP of a Part 1 or Part 3 scenario computed against their target | [impl](implementation.md#l3--the-measures), [lc](../.claude/skills/mbse-architecture/lifecycle.md#2-the-mission-and-its-measures) | ok | done |
| MEAS-02 | Check whether Cameo 2026x has a «moe» stereotype; otherwise add MOE / MOP stereotypes to the MBSE Shepherd profile | where measures live in the model | model | decision written in the kit table | [impl](implementation.md#l1--the-sysml-v1-kit), [details](details.md#meas-02) | ok | todo |
| MEAS-03 | Timed simulation for duration MOP (time events, simulated clock in the trace) | door cycle time, response time | OMF + shepherd | a duration MOP evaluated from a trace | [details](details.md#meas-03) | ok: check first how Cameo exposes the simulation clock | todo |
| MEAS-04 | Parametric diagrams through the kit, only for analysis measures that are equations (energy, endurance) | the cases a scenario cannot show | OMF | one analysis MOP solved in Cameo from a generator | [impl](implementation.md#l3--the-measures), [details](details.md#meas-04) | ok | todo |

## 3. Lifecycle layer

| Id | What | Why | Where | Done when | Specified in | Spec | Status |
|---|---|---|---|---|---|---|---|
| LCY-01 | Check how the TP models encode actors (`Actor` or `Block`) and what lifelines represent | the kit pattern must match the starting models | model | read with `model/vertical` or `arch/read`, kit row updated | [impl](implementation.md#l1--the-sysml-v1-kit), [details](details.md#lcy-01) | ok: default decided, check on the TP models | todo |
| LCY-02 | Check that Cameo accepts «verify» from an `Interaction` stereotyped «TestCase» | scenarios verify requirements | model | one verify link created and validated | [impl](implementation.md#l1--the-sysml-v1-kit), [details](details.md#lcy-02) | ok: check in Cameo, fallback written | todo |
| LCY-03 | Decide whether generated elements are marked (stereotype or `generatedBy` comment) | tell a hand-added "extra" from a generation leftover | OMF | decision written in the engine section | [impl](implementation.md#identity-scope-reconciliation), [details](details.md#lcy-03) | ok | todo |
| LCY-04 | Naming of phase packages in new models (the TP numbers from 0, the method has phases 1 to 7) | one convention for generated models | model + method | convention written in lifecycle.md | [lc](../.claude/skills/mbse-architecture/lifecycle.md#3-the-lifecycle-phases), [details](details.md#lcy-04) | ok | todo |
| LCY-05 | Environment conditions (night, weather, peak load) as scenario variants rather than only "environment" requirements | they are often where RD scenarios hide | method | decided and written in lifecycle.md | [details](details.md#lcy-05) | ok | todo |

| LCY-06 | Mount the MBSE Shepherd / ISAE profile in a new project (or create «Logical Component» and «Generated» there) | components of a fresh project are plain blocks | OMF | a new project gets the stereotypes at the first apply | — | ok | todo |
| LCY-07 | `project/createSysML` loses the backslashes of a Windows target folder sent in JSON | the metro project landed in the plugin build folder | OMF | a project created in `C:\workspace\metro-demo` lands there | — | ok | todo |

## 4. Functional layer

| Id | What | Why | Where | Done when | Specified in | Spec | Status |
|---|---|---|---|---|---|---|---|
| FUN-01 | Branch coverage verdict: states, transitions **and decision / classified-choice branches**, target 100 %, exclusions file (branch, reason, who validated) | rules FN-13 and LG-25 need a verdict, not a report to read | OMF (`scenario/coverage`) + shepherd | PASS / FAIL against 100 % minus justified exclusions | [fn](../.claude/skills/mbse-architecture/functional.md#5-simulate-and-cover-every-branch), [test](../.claude/skills/mbse-architecture/testing.md#coverage-every-branch), [details](details.md#fun-01) | ok: check first that edge traversal events reach the listener | todo |
| FUN-02 | Functional chains: `arch/chains`, static from the state machine and activities, confirmed by the trace, generated view per chain | see how the system renders each service; where the logical layer cuts | OMF | the chains of the Part 1 scenarios generated and shown | [fn](../.claude/skills/mbse-architecture/functional.md#6-functional-chains), [impl](implementation.md#functional-chains), [details](details.md#fun-02) | ok | todo |
| FUN-03 | Generate `.scn` skeletons from the lifecycle scenarios (SD / ALT / RD → nominal / alternative / dysfunctional, actor messages → steps, SoI messages → expected modes to fill) | functional scenarios refine the lifecycle ones without retyping | shepherd (+ `arch/read`) | the skeletons of *Parameter Mission* generated, completed, PASS | [fn](../.claude/skills/mbse-architecture/functional.md#4-functional-scenarios) (mapping table), [details](details.md#fun-03) | ok | todo |
| FUN-04 | `.scn` fields `refines:` (lifecycle scenario), `verifies:` (requirements), `measures:` (MOP), compiled into the scenario JSON and turned into links by the build | requirement, MOP and trace coverage by simulation | shepherd + OMF | a requirement shows as verified by a played scenario | [tr](../.claude/skills/mbse-architecture/traceability.md#the-trace-graph), [test](../.claude/skills/mbse-architecture/testing.md), [details](details.md#fun-04-and-shp-02) | ok | todo |
| FUN-05 | `«trace»` from each function to the lifecycle self-message it comes from | rule FN-04, impact analysis | OMF | links created by the functional generator | [tr](../.claude/skills/mbse-architecture/traceability.md#the-trace-graph) | ok | todo |

| FUN-06 | Rule FN-17: parallel regions sit inside a composite mode, not at the top of the machine (Cameo starts only the first top region); say it in functional.md | found by simulation on the metro | core + method | rule with fixtures; functional.md updated | — | ok | todo |

## 5. Logical layer

| Id | What | Why | Where | Done when | Specified in | Spec | Status |
|---|---|---|---|---|---|---|---|
| LOG-01 | Merge the OMF logical playbook into `logical.md`; point the OMF skills (`mbse-logical-architecture`, `mbse-simulation-verify`, `mbse-scenario-authoring`) here and to `mbse-scenarios` | no step described twice | OMF + method | the OMF skills only point here | [impl](implementation.md#migration) | ok | todo |
| LOG-02 | Rule LG-17: the signals crossing the SoI boundary equal the lifecycle exchanges | the logical layer keeps the contract of the lifecycle layer | core | rule with fixtures | [lg](../.claude/skills/mbse-architecture/logical.md#simulable-design-rules) | ok | done |
| LOG-03 | Rule LG-22: the functional scenarios replayed on the logical architecture, with the parts mapped | the logical layer keeps the mission behaviour | OMF + shepherd | one functional `.scn` replayed in white box with the same verdict | [lg](../.claude/skills/mbse-architecture/logical.md#9-white-box-scenarios-slice-by-slice), [details](details.md#log-03) | ok | todo |
| LOG-04 | Wrap the existing services as engine derivations callable from the logical DSL without dialog: Logical Transition, Delegate to external systems, Create All Missing Signal Ports, Merge Ports, Propagate Interface, Auto Connect, split reaction; check each is idempotent | the logical layer is a transition of the mission, made of tools that exist | OMF | Part 3 Mission Configuration generated through `allocate` / `signals` / `context`, replayed with 0 changes | [impl](implementation.md#the-logical-transition-engine) | ok | doing |
| LOG-05 | Cut resolution `retarget` / exchange / `remove` on `off-TO RENAME` transitions; rule LG-23 | every crossing between components is decided | OMF | rule with fixtures; Mission Configuration's cut retargeted to `Deployed` | [lg](../.claude/skills/mbse-architecture/logical.md#7-the-signal-table-and-the-rewiring--human-gate) | ok | doing |
| LOG-06 | `mergePortsByPartner()`: merge the ports declared under the same `p_<Partner>` after port creation | one port per partner without hand renaming | OMF | Mission Configuration ends with `p_Init`, `p_BaseStation`, `p_Verdict`, `p_StartOrder` | [impl](implementation.md#the-logical-transition-engine) | ok | doing |
| LOG-07 | `behaviour(component) { stm { … } }` for components whose state machine is their own decision logic (orchestrator, master), with «refine» to the modes they arbitrate | an orchestrator is not a clone of the mission | core + OMF | the Part 3 orchestrator of one architecture generated | [lg](../.claude/skills/mbse-architecture/logical.md#5-the-allocation-table--human-gate-before-anything-is-written), [details](details.md#log-07) | ok | doing |
| LOG-08 | Coverage verdict per component state machine (LG-25), reusing FUN-01 | the logical layer is covered like the functional one | OMF + shepherd | coverage PASS / FAIL per part in the scenario report | [test](../.claude/skills/mbse-architecture/testing.md#coverage-every-branch), [details](details.md#fun-01) | ok, as FUN-01 | todo |
| LOG-09 | Check the «refine» matching of Logical Transition when a mode is renamed or split (open item from Part 3) | reconnection of cuts depends on it | OMF | a renamed and a split mode transitioned, transitions reconnected | [details](details.md#log-09) | ok | todo |

| LOG-10 | Generate the SoI boundary of the logical context (ports carrying the lifecycle exchanges, delegated to the components) and a simulation context with driver parts | without it, sends on component ports are lost and outputs cannot be measured (MOP-3 failed on the metro) | OMF | metro MOP-3 met in the logical runs; `signalFlowCheck` without SEND_PORT_UNCONNECTED | [lg](../.claude/skills/mbse-architecture/logical.md#8-ports-interfaces-and-assembly) | ok | todo |

## 6. Traceability and trade-offs

| Id | What | Why | Where | Done when | Specified in | Spec | Status |
|---|---|---|---|---|---|---|---|
| TRC-01 | Trace graph from all layer models, requirements, measures, trade-offs and runs; checks TR-01 to TR-13 | verify the chain logical ↔ functional ↔ lifecycle ↔ requirements | core | rules with fixtures; Part 1 trace report | [tr](../.claude/skills/mbse-architecture/traceability.md), [impl](implementation.md#l3--traceability) | ok | done |
| TRC-02 | Requirement status (open, allocated, designed, verified, met, failed); TR-14, TR-15 | know which requirements are satisfied, verified and met | core | status table in the report | [tr](../.claude/skills/mbse-architecture/traceability.md#requirement-status) | ok | done |
| TRC-03 | Trade-off DSL (`tradeoff { criterion, score, evidence, unaffected, choose }`), model classes, audit TR-16 to TR-19 | MOE/MOP actually weigh in the choices, and the built architecture keeps the estimates | core + OMF | the Part 3 trade-off recorded and audited | [tr](../.claude/skills/mbse-architecture/traceability.md#trade-offs), [impl](implementation.md#l3--traceability) | ok | doing |
| TRC-04 | Encoding of a trade-off in Cameo (hypothesis: a «Trade Study» block, one value property per criterion traced to its MOE/MOP, scores, choice traced to the architecture with a rationale) | the choice lives in the model, not only in the generator | model + OMF | a trade-off written and read back | [impl](implementation.md#l1--the-sysml-v1-kit), [details](details.md#trc-04) | ok | todo |
| TRC-05 | Impact analysis: `arch/impact` and `mbse-report impact` | Part 1 `e-impact`, computed | core + OMF | impact of a Part 1 requirement listed up and down | [tr](../.claude/skills/mbse-architecture/traceability.md#impact-analysis) | ok | done |
| TRC-06 | Trace links set by the generators and derivations, as listed in the trace graph | the graph is only as good as its links | OMF | every relation of the graph table written by some generator or derivation | [tr](../.claude/skills/mbse-architecture/traceability.md#the-trace-graph) | ok | todo |
| TRC-07 | JSON snapshot format (`arch/export`): all layers, links, measures, trade-offs, with Cameo ids and qualified paths | the input of the side service and of `diff` | core + OMF | schema written and versioned; a Part 1 export round-trips through `omf-mbse-core` | [impl](implementation.md#the-mcp-category-arch), [details](details.md#trc-07) | ok | doing |

## 7. Validator

| Id | What | Why | Where | Done when | Specified in | Spec | Status |
|---|---|---|---|---|---|---|---|
| VAL-01 | `Validator` in `omf-mbse-core`: profiles (`layer:`, `gate:`, `delivery`, `trace`, `rules:`), merged findings, `skipped` (never passed), verdict PASS / FAIL / INCOMPLETE, JSON and Markdown output | one call runs every check of the method and gives one verdict | core | the metro-like lifecycle fixture validated with each profile | [impl](implementation.md#the-validator) | ok | done |
| VAL-02 | `waive(rule, element, because, by)` in generators; a waiver without a reason or on a missing element is an error; coverage exclusions are waivers | accepted exceptions are versioned and visible, never silent | core | a waived finding listed under `waived`, a bad waiver reported | [impl](implementation.md#waivers) | ok | done |
| VAL-03 | MCP `arch/validate {profile, scope, runs?}` in Cameo, adding the plugin checks (`signalFlowCheck` through `PluginRule`, `validation/active`) and the scenario reports | the LLM and scripts call one entry point | OMF | `arch/validate {profile: "gate:lg"}` on a Part 3 architecture gives the verdict with plugin findings | [impl](implementation.md#entry-points) | ok | doing |
| VAL-04 | Cameo validation suite **"MBSE Shepherd method"** contributed by the plugin, findings in the *Validation Results* window with element selection, plus the menu *MBSE Shepherd > Validate method…* | the human sees the method's findings in the tool, on the elements | OMF | the suite listed by `validation/suites`, its results clickable | [impl](implementation.md#entry-points), [details](details.md#val-04) | ok: check first the rule signature and profile auto-mount | todo |
| VAL-05 | `bash scripts/dev/arch.sh <id> validate [profile]` | validation inside the generator loop | OMF | prints the verdict and findings | [kt](../.claude/skills/mbse-architecture/kotlin.md#compile-and-run) | ok | done |
| VAL-06 | `mbse-report validate <snapshot> --profile … --runs …` with exit codes 0 / 1 / 2 | the same validator in CI and without Cameo | svc | a FAIL on a broken snapshot gives exit code 1 | [impl](implementation.md#the-side-service-mbse-report) | ok | done |

## 8. Side service `mbse-report`

| Id | What | Why | Where | Done when | Specified in | Spec | Status |
|---|---|---|---|---|---|---|---|
| SVC-01 | CLI `mbse-report` with `validate` (VAL-06), `trace`, `measures`, `impact`, `diff`, on a snapshot and scenario reports | checks and reports without Cameo: CI, review, archives | svc | the Part 1 report produced from an export, without Cameo | [impl](implementation.md#the-side-service-mbse-report) | ok | done |
| SVC-02 | Report layout: Markdown and HTML (requirement table, matrices, unjustified elements, trade-off audit, MOP) | a report someone reads | svc | a Part 1 report reviewed by Quentin | [tr](../.claude/skills/mbse-architecture/traceability.md#report), [details](details.md#svc-02) | ok | todo |
| SVC-03 | CI job: export + scenario runs + `mbse-report validate delivery` on every change of a generator | regressions caught without a human | OMF CI or shepherd | a red build on a broken trace | [details](details.md#svc-03) | ok: open point, headless simulation in tier 2 | todo |
| SVC-04 | `diff` semantics: identity by Cameo id, then qualified path; what counts as a change of status | compare two versions of an architecture | svc | a diff between two Part 3 architectures explained | [impl](implementation.md#the-side-service-mbse-report), [details](details.md#svc-04) | ok | done |

## 9. Scenario tools (mbse-shepherd)

| Id | What | Why | Where | Done when | Specified in | Spec | Status |
|---|---|---|---|---|---|---|---|
| SHP-01 | `scenarios-run.mjs --report` also records the signals sent and received per step (today: states observed and entered) | the evaluators `Before` and `Count` and the confirmed chains need them | shepherd + OMF (`simtest/trace`) | a report with signals, read by MEAS-01 | [impl](implementation.md#l3--the-measures), [details](details.md#shp-01) | ok | todo |
| SHP-02 | `.scn` grammar for `refines:`, `verifies:`, `measures:` (with FUN-04) and their compilation | trace and measures from the scenario files | shepherd | `grammar.md` of `mbse-scenarios` updated, build passes | [details](details.md#fun-04-and-shp-02) | ok | todo |

## 10. Method and scope

| Id | What | Why | Where | Done when | Specified in | Spec | Status |
|---|---|---|---|---|---|---|---|
| MET-01 | Skill docs in English (production); framing notes for the human may stay in French | English works better for the AI | method | all sheets in English | — | ok | done |
| MET-02 | This backlog, and the rule that every unimplemented request lands here | industrialise the method | method | rule in SKILL.md | [SKILL](../.claude/skills/mbse-architecture/SKILL.md) | ok | done |
| MET-03 | Physical layer (logical → physical, white-box scenarios, allocation, make or buy) | out of scope for now | method | — | [details](details.md#met-03) | out of scope (decision) | todo |
| MET-04 | SysML v2 backend under the same library (a v2 reader that produces the same snapshot, a v2 writer) | the target tomorrow; v1 first | OMF + svc | — | [impl](implementation.md#the-side-service-mbse-report) (one line), [details](details.md#met-04) | outline | todo |

## Metro iteration 2 (2026-11-07)

Asked by the user: a mission cut along the classic phases of a defence mission, laid out diagrams, a logical layer
credible for a GoA4 metro (trainsets, saloons, traction and brakes, couplers) that leads to the physical layer.

| Id | What | Why | Where | Done when | Status |
|---|---|---|---|---|---|
| LCY-08 | Phase **Supervise** (command and control in operation) between Execute and Sustain; phases renumbered 1 to 8 | the user's mission cut: plan, prepare, deploy, operate, supervise, support, undeploy, mission analysis | core `Phase`, lifecycle.md, details.md LCY-04 | done | **done** 2026-11-07 |
| LCY-09 | Participant pictures: the lifecycle DSL has no image; `metro-demo/assign_icons.py` sets them after apply, the engine shows them on use case diagrams and context IBDs | review comment: "des images seraient la bienvenue" | core lifecycle DSL + OMF applier | `participant(..., image = ...)` | todo |
| CORE-17 | Every generated diagram laid out by the engine (`ArchLayout`): Cameo's quick layout called from MCP leaves the symbols piled up | the human reads the model through diagrams | OMF | done; open: labels of parallel transitions between the same two states overlap (MagicDraw re-routes the paths) | partial |
| CORE-18 | A rebuilt package keeps the review comments that pointed into it (`ReviewAnchors`, by qualified name) | a regeneration must not lose the user's review | OMF | done | **done** 2026-11-07 |
| LOG-12 | Logical Transition recreates completion transitions (no trigger) between two states | a mode left when its function ends (assignment checked, mission closed) became unreachable in the component | OMF `LogicalTransitionService` | done | **done** 2026-11-07 |
| LOG-13 | Structural assemblies in the logical layer: `Trainset` (traction, brakes, saloons, coupler), one part per trainset, against "one level, no sub-component" of logical.md | asked by the user so that the logical layer leads to the physical train (trainsets, cars, couplers); engine: a component without allocation, ports from its signal table, its own context; LG-17 only on the context that declares the SoI boundary | logical.md, LG rules, OMF `LogicalApplier` | logical.md allows assemblies of components | in progress |
| LOG-14 | `ownLogic` components (own state machine) are described by the DSL but not written by the logical applier | orchestrators and aggregators (for instance "all doors locked" over every saloon) | OMF `LogicalApplier` | an ownLogic state machine is written and simulated | todo |
| LOG-15 | Several instances of a component: ATO leaves on the first "Doors closed and locked", not once every saloon of every trainset is locked | a train leaves with every door locked | metro generator (needs LOG-14) | departure waits for every saloon | todo |
| SIM-01 | Logical simulation of the metro is slow: about 9 s for a train line signal to reach the second trainset (Cameo animation); `play_metro.py` waits 12 s per injection | a full logical pass takes about 40 min | OMF `simtest/start` (animation off) | a logical scenario plays in seconds | todo |
