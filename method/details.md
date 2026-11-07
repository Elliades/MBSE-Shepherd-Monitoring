# Detailed specifications

One section per backlog item whose specification was partial or missing in
[implementation.md](implementation.md). Each section is titled by its backlog id. The architecture stays in
implementation.md; this file holds the details needed to build each item.

Facts checked in OMF and in the Cameo 2026x installation (`OMF_Private/build/install`) on 2026-11-05:
- `McpHotReload` loads the classes of the listed packages from **one** jar, child first. Every other class comes from
  the plugin that started.
- `ScenarioCoverage` counts **state machine transitions** (source, target, signal). It does not count activity
  decision edges.
- A Cameo validation suite is a package stereotyped «validationSuite», listed by `ValidationSuiteHelper`. A rule can
  be "binary": a constraint whose body names a Java class implementing `ElementValidationRuleImpl` (OpenAPI example
  `examples/validation/MyBinaryValidationRuleImpl.java`).
- The **MagicGrid profile** shipped with Cameo (`profiles/MagicGrid_Profile.mdzip`) defines three stereotypes:
  - «moe», on Property;
  - «objectiveFunction», on Class and Property;
  - «performanceRequirement», on Class.

  It has no «mop». The SysML profile and *MD customization for SysML* have none of them.

---

## CORE-02

**Reloading the library together with the generators.**

`McpHotReload` takes one jar and a list of package prefixes. Classes under those prefixes come from the jar, child
first; everything else comes from the plugin.

1. **One dev jar.** A Gradle task `archDevJar` in `com.elliades.isae.mbseShepherd` builds a single jar with the
   compiled classes of:
   - the plugin packages `com.elliades.isae.mbseShepherd.mbse` and `com.elliades.isae.mbseShepherd.architectures`;
   - the core module `omf-mbse-core`, packages `com.elliades.isae.mbse.core`.

   `scripts/dev/arch.sh` builds that jar and calls `dev/reload` with:

   ```json
   { "jar": "<archDevJar>",
     "packages": ["com.elliades.isae.mbse.core", "com.elliades.isae.mbseShepherd.mbse", "com.elliades.isae.mbseShepherd.architectures"],
     "providers": ["com.elliades.isae.mbseShepherd.mbse.engine.ArchMcpProvider"] }
   ```

2. **Changed services.** When a generator session also changes a service of `features.logicaltransition`,
   `features.signalports` or `features.assembly`, add that package to `packages`. Its classes are then also loaded
   from the jar, and the services call each other inside the new generation.
3. **Limits** (from `.cursor/rules/mcp-hot-reload.mdc`):
   - only MCP calls see the new code;
   - menus, the Cameo validation suite (VAL-04) and `omf-core-framework` keep the startup code;
   - each generation that wrote stays in memory, so restart Cameo from time to time.

**Done when.** A change in a rule of `omf-mbse-core` and in a generator is picked up by `arch.sh … validate` without
restarting Cameo.

---

## CORE-05

**The form rules `F-xx`.** These rules check that the model read back from Cameo has the encoding the kit produces.
They cannot fail on a generated model, but they catch hand-made errors.

| Id | What must hold | Layer |
|---|---|---|
| F-01 | A message between two lifelines is `asynchSignal` and has a signal as `signature` | lc |
| F-02 | A self-message has no signal and is named after a function | lc |
| F-03 | A lifeline `represents` a property typed by the SoI or an actor of the use case | lc |
| F-04 | A scenario interaction is owned by its use case, and its name starts with `[SD n]`, `[ALT n]` or `[RD n]` | lc |
| F-05 | A use case is in exactly one phase package, and has the SoI as `subject` | lc |
| F-06 | A connector of the context links two ports (`partWithPort` set), and carries at least one item flow | lc, lg |
| F-07 | A port is typed by an interface block; every flow property of it is typed by a signal and has a direction | lc, lg |
| F-08 | An item flow conveys a signal declared by the interfaces of both ends, in matching directions | lc, lg |
| F-09 | A requirement has `Id` and `Text`, and its kind and verification method are set | req |
| F-10 | A transition trigger is a `SignalEvent` whose event is owned by a package, not by the transition | fn, lg |
| F-11 | A send signal action has no input pin; it has an On Port in the logical layer, and none in the functional layer | fn, lg |
| F-12 | A do, entry, exit or effect behaviour is a wrapper activity owned by its state or transition, calling the function | fn, lg |
| F-13 | A decision node has no text guard on its outgoing edges, unless it is a classified choice on a signal type | fn, lg |
| F-14 | A measure property has its stereotype, a unit type, a default value (the target) and a doc (the definition) | lc |

---

## CORE-06, CORE-07, CORE-08

**The model classes.** These are in `omf-mbse-core`, in the same style as `LifecycleModel` ([implementation.md](implementation.md#l2--the-method-model)).

```kotlin
// com.elliades.isae.mbse.core.method.fn
data class FunctionalModel(
    val soi: Ref,
    val signals: List<MissionSignal>,
    val mission: StateMachineSpec,
    val services: List<Service>,                       // packages of service functions
    val functions: List<Function>,
    val satisfies: List<Satisfy>,
)
data class MissionSignal(val signal: SignalRef, val kind: SignalKind, val exchange: ExchangeRef?)   // EXTERNAL (same element as the exchange) or INTERNAL
data class StateMachineSpec(val regions: List<RegionSpec>)
data class RegionSpec(val name: String?, val initial: String, val states: List<StateSpec>, val transitions: List<TransitionSpec>)
data class StateSpec(val name: String, val doFn: String?, val entry: String?, val exit: String?,
                     val regions: List<RegionSpec> = emptyList(), val refines: Ref? = null)
data class TransitionSpec(val from: String, val to: String, val on: List<SignalRef>, val via: String? = null,
                          val effect: String? = null, val delegate: String? = null)
data class Function(val name: String, val service: String, val kind: FunctionKind,          // SERVICE or TECHNICAL
                    val body: List<Action>, val reactions: List<Reaction>, val tracesTo: SelfMessageRef?)
sealed interface Action
data class Call(val function: String) : Action
data class SendSelf(val signal: SignalRef) : Action
data class SendOn(val signal: SignalRef, val port: String) : Action                       // logical layer only
data class Accept(val signal: SignalRef) : Action
data class Decide(val on: SignalRef, val branches: List<Pair<SignalRef, List<Action>>>) : Action   // classified choice
data class Parallel(val branches: List<List<Action>>) : Action                            // fork / join
data class Reaction(val on: SignalRef, val steps: List<Action>)                           // merge → accept → steps → merge

// com.elliades.isae.mbse.core.method.lg
data class LogicalModel(
    val soi: Ref,
    val components: List<Component>,
    val allocations: List<Allocation>,               // mode or region → component
    val signalTable: List<SignalDecision>,
    val cuts: List<Cut>,
    val contexts: List<ContextSpec>,
    val tradeOffs: List<TradeOff>,
    val waivers: List<Waiver>,
)
data class Component(val name: String, val stereotypes: List<String>, val ports: List<PortSpec>,
                     val stm: StateMachineSpec, val functions: List<Function>, val ownLogic: Boolean)  // ownLogic: orchestrator, master
data class Allocation(val source: Ref, val component: String)                                // a functional state or region
data class SignalDecision(val component: String, val signal: SignalRef, val firedBy: Firer, val alsoTold: List<String>,
                          val result: SignalResult)                                         // SELF, INPUT(port), OUTPUT_EXT(port)
data class Cut(val component: String, val transition: TransitionSpec, val resolution: CutResolution)   // RETARGET(state), EXCHANGE, REMOVE
data class PortSpec(val name: String, val inputs: List<SignalRef>, val outputs: List<SignalRef>)
data class ContextSpec(val name: String, val parts: List<PartSpec>, val connectors: List<Pair<String, String>>,
                       val autoConnect: Boolean, val boundary: List<ExchangeRef>, val drivers: List<PartSpec>)

// com.elliades.isae.mbse.core.method.req
data class Requirements(val needs: List<Need>, val requirements: List<Requirement>, val links: List<ReqLink>)
data class Requirement(val id: String, val text: String, val kind: ReqKind, val verification: Method,
                       val source: String?, val derivedFrom: List<String>)
data class ReqLink(val kind: LinkKind, val from: Ref, val to: String)    // REFINE, SATISFY, VERIFY, DERIVE, TRACE
data class Waiver(val rule: String, val element: Ref, val because: String, val by: String)
```

---

## MEAS-02

**Where measures live.** This is decided, and was checked against the installed profiles.

| Measure | Encoding | Profile |
|---|---|---|
| MOE | value property stereotyped **«moe»**, on the mission context block | MagicGrid (shipped with Cameo) |
| MOP | value property stereotyped **«mop»** | MBSE Shepherd profile (new stereotype on Property, same tags as «moe»: none needed) |
| requirement that fixes an MOP | «performanceRequirement» if MagicGrid is used in the project, otherwise «Requirement» with kind performance | MagicGrid / SysML |
| trade-off score | «objectiveFunction» (see TRC-04) | MagicGrid |

For each measure property:
- the unit is the type (an ISO 80000 unit when the SysML QUDV library has it, otherwise a `ValueType` named after the
  unit);
- the target is the default value, as a string such as `">= 95"`;
- the definition is the documentation;
- the phase and evaluation method are written as `phase=…; method=…` on a second line of the documentation, until a
  tagged value is worth adding.

When the project does not use the MagicGrid profile, the kit applies the MBSE Shepherd fallback «moe» stereotype and
the reader accepts both.

---

## MEAS-03

**Timed simulation, for duration MOP.**
1. **DSL.** A transition can wait: `transition("Doors open", "Closing", after = 20.s)`. The kit encodes it as a
   `TimeEvent` trigger, relative, with a `LiteralString` or duration expression.
2. **Trace.** `simtest/trace` adds the simulation clock to each callback: `t` in milliseconds of simulated time, taken
   from the simulation session clock when Cameo exposes it, otherwise from wall time with the scale set to 1.
3. **Report.** `scenarios-run.mjs --report` writes `t` for each state entered and each signal (see SHP-01).
4. **Evaluator.** `Duration(from: Event, to: Event, target)` measures `t(to) - t(from)` on each run. It reports the
   maximum and the mean against the target.

To check first: how the Cameo 2026x simulation exposes its clock to `SimulationExecutionListener` callbacks.

**Done when.** MOP-5 of the metro example (door cycle ≤ 25 s) is evaluated from a run of a model whose doors wait
with time events.

---

## MEAS-04

**Parametric analysis, only for measures that are equations.**

DSL, in the lifecycle or logical generator:

```kotlin
analysis("Endurance", measure = view.mop("MOP-7")) {
    val battery = param("battery", unit = "Wh"); val power = param("power", unit = "W")
    equation("endurance = battery / power * 60")          // minutes
    bind(battery, to = "Drone::battery capacity"); bind(power, to = "Drone::mean power")
}
```

Kit pattern:
- a `ConstraintBlock` named after the analysis, with its parameters (constraint parameters typed by the units) and a
  `Constraint` whose specification is the equation, in the language Cameo's built-in math engine evaluates;
- an analysis context block «Analysis Context» owning a constraint property typed by it, plus reference properties to
  the analysed blocks;
- binding connectors from the parameters to the value properties, and from the result to the MOP property;
- a parametric diagram, generated by `arch/present`.

The evaluator runs the Cameo simulation of the analysis context (`simulation/run`) and reads the MOP value back.

---

## LCY-01

**How actors are encoded** (default until the TP models are read).
- A **human** actor is an `Actor`. An **external system** is a `Block` stereotyped «External» (MBSE Shepherd profile;
  the reader also accepts a plain `Block` outside the SoI).
- In the context, both are part properties of the context block. An `Actor` can type a part in Cameo.
- A lifeline `represents` a property owned by the interaction, typed by the actor or the block.
- **The reader accepts all of these forms.** The kit writes the default ones, unless `reads` shows that the starting
  model uses another form, in which case the kit follows the model.

**Check:** read `1 - Operational Analysis::C - Use Cases and Scenarios::Actors` and one sequence diagram of the
Part 1 correction with `model/vertical`. If they differ, update this section.

---

## LCY-02

**«verify» from a scenario.** SysML 1.6 lets «verify» go from any named element to a requirement. «TestCase» extends
`Behavior` and `Operation`. An `Interaction` is a `Behavior`, so it can carry «TestCase» and be the client of
«verify». The kit does both.

**Check:** create one such link in Cameo 2026x and run the active validation. If Cameo refuses it, fall back to
«verify» from the use case's `[SD n]` interaction without «TestCase», and note it here.

---

## LCY-03

**Marking generated elements.** This is decided. The kit applies a stereotype **«Generated»** (MBSE Shepherd
profile, on Element) with one tag, `script`, which holds the id of the generator. Reconciliation uses it:
- an element **in scope**, marked by **this** generator but no longer described, is a leftover: deleted with `prune`;
- an element in scope, **not marked**, was added by hand: it is reported `EXTRA` and never deleted by `prune`. Delete
  it by hand, or describe it in the generator;
- an element marked by **another** generator is outside this generator's ownership: reported, never touched.

Derived elements (ports, item flows, `_ext` signals, clones made by Logical Transition) are marked too, with the id of
the generator whose apply derived them.

---

## LCY-04

**Phase packages.** New models use `<n>. <Phase>` with `n` from 1 to 8: `1. Plan`, `2. Prepare`, `3. Deploy`,
`4. Execute`, `5. Supervise`, `6. Sustain`, `7. Undeploy`, `8. Assess`. They sit under *Use Cases and Scenarios*, and a phase that is
not treated has no package.

For existing models, the reader maps packages **by name, not by number**:

| Package name contains | Phase |
|---|---|
| Plan | PLAN |
| Prepar | PREPARE |
| Undeploy, Redeploy, Recovery, Return | UNDEPLOY |
| Deploy | DEPLOY (only if not matched above) |
| Operation, Execut, Employ | EXECUTE |
| Support, Sustain, Maintenance | SUSTAIN |
| Assess, Analysis, Debrief | ASSESS |

The drone's `0. Planning Phase`, `1. Preparation phase` and `3. Operation phase` therefore map to PLAN, PREPARE and
EXECUTE without renaming.

---

## LCY-05

**Environment conditions.** Night, rain, wind, peak load: a condition is **a state of the environment that changes
how a use case unfolds**. It is handled in three places:
- **requirements**: a requirement of kind *environment* names its conditions (`conditions = listOf("night")`);
- **lifecycle scenarios**: when the use case unfolds differently under a condition, the condition gives an ALT or an
  RD, written `scenario(ALT, "…", under = "night")`. When nothing changes, the condition is listed on the use case
  (`conditions = listOf("night")`) and the nominal is replayed under it;
- **simulation**: a condition is set by a driver signal sent first (`Night falls`), in a precondition scenario
  `given: env.night`, so a condition is written once and reused.

New rule, in [lifecycle.md](../.claude/skills/mbse-architecture/lifecycle.md):

| Id | What must hold | Severity |
|---|---|---|
| LC-21 | Every condition named by an environment requirement is covered by at least one scenario under that condition | warning |

---

## FUN-01

**Branch coverage, decision branches included.**
1. **Transitions** are already counted by `ScenarioCoverage`: source, target, signal.
2. **Decision branches** are new. The coverage registers a `SimulationExecutionListener` on activity edges, so that
   each edge leaving a `DecisionNode` (including classified choices) that is traversed is recorded as
   `(activity, decision, edge, guard or signal type)`. All outgoing edges of every decision node of the activities
   called by the covered state machines form the denominator.
3. **Verdict.** `covered / (all − waived)` per state machine and in total, with PASS at 100 %. Waived branches
   (VAL-02) are listed with their reason.
4. **Report.** The scenario report and `scenario/coverage` gain `decisions: {total, covered, missing:[…]}` next to
   the states and transitions.

To check first: that the listener receives edge traversal events in Cameo 2026x. If it does not, infer the branch
from the action executed right after the decision.

---

## FUN-02

**The functional chain view.** This is decided.
- **One generated activity diagram per lifecycle scenario**, named `Chain — <use case> — <scenario>`, owned by a
  package `Functional Chains` in the functional layer. In order, it holds:
  - an accept event action for the stimulus signal;
  - one call behaviour action per function run;
  - one send signal action per signal sent;
  - the next accept, and so on, until the response.

  It is a picture of the path, not an executable activity: it is stereotyped «FunctionalChain» (MBSE Shepherd
  profile) and excluded from the simulation and from the rules.
- **In the logical layer**, the same chain is regenerated with **activity partitions, one per component**. A signal
  crossing a partition is an exchange between components. This is how a cut becomes visible.
- **A table** in the report lists the steps: signal, transition, function, sent signals, and, once confirmed, the run
  that confirmed them.
- **Static against confirmed.** The static chain is computed from the state machine and the activities. A chain
  confirmed by a run is marked with the run id. A step the run contradicts is reported as finding FN-15.

---

## FUN-03

**`.scn` skeletons from lifecycle scenarios.**

```bash
node scripts/scenarios-from-lifecycle.mjs --snapshot model.json --use-case "Serve a station" --layer fn --out scenarios/library/metro/
```

For each scenario of the use case it writes one `.scn`, `status: draft`, `version: 0.1`:
- `id: <area>.<uc-slug>.<kind><n>`, `kind:` from SD / ALT / RD, `refines:` the lifecycle scenario, `verifies:` and
  `measures:` copied;
- `given:` the SD skeleton for an ALT or RD that reuses the nominal (`given(sd, upTo = k)` becomes the SD steps
  up to k);
- one step per message from an actor to the SoI: `send <signal> into <driver>`;
- for each message from the SoI and each self-message, a `then TODO is <mode>` line, which the author fills from the
  mission. The skeleton never guesses a state name.

The command reads the snapshot (TRC-07), so it runs without Cameo. Running `--check` on a skeleton fails until every
`TODO` is replaced.

---

## FUN-04 and SHP-02

**Scenario DSL extensions.** Three new header fields, to add to `grammar.md` of the `mbse-scenarios` skill and to
`scenarios/scenario-dsl.js`:

| Statement | Meaning | Compiled JSON |
|---|---|---|
| `refines: <lifecycle scenario path>` | the lifecycle scenario this scenario plays, for example `Metro::…::Serve a station::[SD 1] Stop and passenger exchange` | `"refines": "<path>"` |
| `verifies: REQ-05, REQ-10` | the requirements this scenario verifies | `"verifies": ["REQ-05", "REQ-10"]` |
| `measures: MOP-2` | the MOP evaluated on this scenario's runs | `"measures": ["MOP-2"]` |

These fields are **not inherited** through `given`, because a precondition does not verify what its follower
verifies. `from:` variants inherit them unless they redeclare them.

The build (`scenarios-build.mjs`) checks that the ids exist when a snapshot is given (`--snapshot`). The scenario
generator of the engine turns them into «verify» from the scenario's model element, when one exists.

---

## SHP-01

**Signals in the run report.** `--report` adds, per step:

```json
"signals": [ { "t": 1234, "signal": "Platform doors open", "from": "soi.psdCtrl", "to": "soi.doors", "port": "p_Platform", "kind": "sent|received|consumed|lost" } ]
```

These come from the `simtest/trace` callbacks: signal sent, signal received, event consumed, and event discarded, which
is reported as `lost`. `t` is present when MEAS-03 is done. The evaluators `Before`, `Count` and `Duration`, and the
chain confirmation of FUN-02, read this field.

---

## LOG-03

**From a black-box expectation to the parts.** A functional scenario expects mission modes:
`then soi is Configured`. To replay it on the logical architecture without rewriting it:
1. For each expected mission mode `M`, find the logical states that «refine» `M`, in every component, through the
   links set by Logical Transition.
2. The white-box expectation is: **every** component holding a refining state is in it. A mode split over two
   components gives two expectations.
3. A mission mode no logical state refines makes the expectation unmappable. The run is `INCOMPLETE` for that step,
   with finding LG-15.
4. `never X is S` maps the same way: no refining state may be entered.
5. The generated white-box `.scn` is written next to the functional one, as `<id>.lg`, with `refines:` pointing to the
   functional scenario. The author may add `is not` checks on components that must not move.

**Done when.** One functional scenario of Part 3 Mission Configuration is replayed, mapped automatically, with the
same verdict.

---

## LOG-07

**Components with their own logic** (orchestrator, swarm master).

```kotlin
val orch = component("Mission Orchestrator", ownLogic = true) {
    stm {
        state("Waiting order", refines = fn.state("Undeployed"), initial = true)
        state("Supervising", refines = fn.state("Deployed")) {
            reactions(on(sheepOut) { sendOn(engageSheep, "p_SheepMonitoring") },
                      on(bearIn) { sendOn(engagePredator, "p_PredatorManagement") })
        }
        transition("Waiting order", "Supervising", on = startMission, via = "p_StartOrder")
    }
}
```

- An `ownLogic` component is **not** fed by `allocate`. Its states are written explicitly, each with the mission mode
  it arbitrates (`refines`).
- Its functions are new logical functions. When they correspond to a mission function they «refine» it, otherwise
  they are coordination functions with no functional source (TR-09 then asks for a requirement or a justification).
- Rule LG-16 (one decider) checks that no other component takes the decisions it holds.

---

## LOG-09

**«refine» matching in Logical Transition.** Expected behaviour, to test with new cases in
`test/logicaltransition`:

| Case | Expected |
|---|---|
| a functional mode renamed after its transition | the logical clone keeps its name; replay recognises it by «refine» (already true, test T3 and T4) |
| a mode split: two components each receive part of it (`allocate(mode, to = A)`, then `splitTo(B, substates = …)`) | each component has a clone that refines the same mode; a cut toward that mode from a third component is reconnected only when the trigger is unambiguous, otherwise left as a cut |
| a neighbour transitioned later | the transitions left on `off-TO RENAME` are reconnected to its clone (already true) |
| a transition whose target mode is allocated to two components | left on the placeholder, with finding LG-23 explaining that the cut needs an exchange |

---

## TRC-04

**The trade-off in the model.** This is decided, using what the MagicGrid profile provides.
- A package `Trade-offs` in the logical layer.
- Per trade-off, a block stereotyped **«objectiveFunction»** (MagicGrid), named after the trade-off. Its value
  properties are the criteria. A criterion traced to an MOE or MOP is typed like it and has a «trace» to it. A
  qualitative criterion is an `Integer` property. Each criterion's weight is in its documentation (`weight=3`).
- One instance specification per candidate, typed by that block, with the scores as slot values. The evidence of each
  score is the documentation of its slot.
- The choice is a «trace» from the block to the package of the chosen architecture, with a «rationale» comment
  (SysML) attached to the block. Unaffected MOE/MOP are listed in a second «rationale» comment.
- `arch/present` shows the block and its instances as an instance table.

The reader rebuilds `TradeOff` from that, and TR-16 to TR-19 run on it.

---

## TRC-07

**The snapshot format** (`arch/export`). It is JSON, versioned, readable by `omf-mbse-core` without MagicDraw.

```json
{
  "format": "mbse-snapshot",
  "version": 1,
  "exportedAt": "2026-11-05T21:00:00Z",
  "project": { "name": "UAV_Part3_Init_Arch3", "file": "…", "dirty": false },
  "scope": "3 - Logical Analysis::TP - Logical Architecture",
  "elements": [ { "id": "_2026x_…", "path": "…", "type": "UseCase", "name": "Parameter Mission", "stereotypes": ["…"], "generatedBy": "part1.lc.parameter-mission" } ],
  "requirements": { "…": "Requirements, as in details.md CORE-08" },
  "lifecycle":    { "…": "LifecycleModel" },
  "functional":   { "…": "FunctionalModel" },
  "logical":      { "…": "LogicalModel" },
  "links": [ { "kind": "refine", "from": "_2026x_a", "to": "_2026x_b" } ],
  "pluginFindings": [ { "rule": "LG-05", "code": "SEND_NO_PORT", "elementId": "…", "message": "…" } ]
}
```

Rules for the format:
- Every reference inside the layer models is an element id from `elements`. Paths are there for people and for `diff`.
- `pluginFindings` hold the results of the checks that need Cameo (`signalFlowCheck`, `validation/active`). The side
  service reads them; it does not rerun them.
- A JSON Schema is generated from the Kotlin classes (`kotlinx.serialization` descriptors), published as
  `omf-mbse-core/src/main/resources/mbse-snapshot.schema.json`, and checked by a round-trip test: export, parse,
  re-serialise, compare.
- A breaking change bumps `version`, and the core reads the previous version for at least one release.

---

## SVC-02

**The report layout.** One Markdown file, rendered to a single HTML page with no external dependency (inline CSS). It
has these sections:
1. **Verdict**: PASS / FAIL / INCOMPLETE, the profile, the scope, the counts, the date, and the snapshot and runs used.
2. **Findings**: one table per severity, sorted by layer then rule; each line has the rule, the element (path, with
   the Cameo id in a tooltip), the message and the hint.
3. **Requirements**: id, text, status (coloured), refined by, satisfied by, verified by (scenario and verdict), and
   MOP with their values.
4. **Measures**: MOE and MOP, target, value, met, runs.
5. **Coverage**: per state machine, states, transitions and decisions covered, with the waived branches.
6. **Traceability matrices**: requirements × use cases, functions × components, lifecycle × functional × white-box
   scenarios. Rows and columns are sorted by id, and empty rows and columns are highlighted.
7. **Trade-offs**: criteria × candidates with scores and evidence, the choice and its rationale, and the gap between
   estimates and measured values.
8. **Waived and skipped**: every waiver with its reason and author, and every skipped rule with the missing input.

---

## SVC-03

**Continuous integration**, in two tiers.

| Tier | Runs | Where | Needs Cameo |
|---|---|---|---|
| 1. offline | `mbse-report validate delivery` on the committed snapshots and scenario reports; `gradlew test` of `omf-mbse-core` | any CI runner of the OMF repository (GitHub Actions on the private repository, or the homelab runner) | no |
| 2. model | `gradlew runMbseShepherdTests`, which runs `ArchitecturesBatch` (generate, replay with 0 changes, validate) and exports a fresh snapshot | the homelab PC, where Cameo and its licence are installed | yes, headless |

- **Snapshots are committed.** Each generator run that is accepted at a gate commits its snapshot
  (`architectures/<project>/snapshots/<id>.json`) and its scenario reports. Tier 1 is then a pure file check.
- **Open point.** Can the scenarios be played headless in tier 2, that is, does the simulation run inside
  `runMbseShepherdTests`? Until that is checked, the scenario reports come from the interactive runs and are
  committed.

---

## SVC-04

**`diff` semantics.**
- **Identity.** An element is identified by its Cameo id first. If the id is missing on one side, it is matched by
  type and qualified path. If both changed, it counts as a deletion plus a creation.
- **Changes reported**:
  - elements added, removed, renamed (same id, new path) or changed (properties);
  - links added and removed;
  - **requirement status changes** (for example verified → failed), listed first, because they are what a reviewer
    needs;
  - MOP value changes beyond 5 % of their target;
  - new or removed findings, by rule.
- **Output.** Markdown, plus JSON for scripts. The exit code is 1 when a requirement status got worse.

---

## VAL-04

**The Cameo validation suite "MBSE Shepherd method".**
- **The suite.** The plugin ships a small model module, `MBSE Shepherd Method Validation.mdzip`, in its `profiles`
  folder. It holds a package «validationSuite» "MBSE Shepherd method", with one «validationRule» constraint per rule
  family: LC, FN, LG, REQ, TR, F. Each constraint is **binary**: its specification names a class of the plugin that
  implements `ElementValidationRuleImpl`, as in the OpenAPI example `MyBinaryValidationRuleImpl`.
- **What each class does.** In `run(project, constraint, elements)`, it reads the scope back into the method model,
  runs the `Validator` with profile `rules:<family>`, and turns each finding into an `Annotation` on the element (id
  from the finding), with severity, message and, when useful, an `NMAction` ("Show the generator", "Select related
  elements").
- **The menu.** *MBSE Shepherd > Validate method…* asks for the profile, runs `ValidationHelper.validate` with that
  suite on the selected package, and opens the *Validation Results* window.
- **Projects.** The module is mounted by the menu when missing, read-only, so a project does not need to be prepared
  by hand.

To check first: the exact `ElementValidationRuleImpl` signature and the way a plugin profile is auto-mounted in
2026x. The OpenAPI example and `examples/validation/plugin.xml` are the reference.

---

## MET-03

**The physical layer** is out of scope by decision (2026-11-04). It stays a backlog line, with no specification.

## MET-04

**The SysML v2 backend**, in outline:
- a **v2 reader** turns SysML v2 text (or the v2 API) into the same snapshot (TRC-07); then the validator and the
  side service work unchanged;
- a **v2 writer** emits SysML v2 text from the method models, which can then be reviewed and diffed;
- the vocabulary of the method models already follows v2 where v2 has the word (`subject`, `actor`, `flow`,
  `satisfy`, `verify`).

To specify when v2 tooling is chosen.
