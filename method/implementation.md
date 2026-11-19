# Implementation: generating a SysML v1 architecture with Kotlin code

> Specification to implement in OMF (`C:\workspace\java\mdplugins\OMF\OMF_Private`, module
> `com.elliades.isae.mbseShepherd`). The method it serves is the skill
> [.claude/skills/mbse-architecture/](../.claude/skills/mbse-architecture/SKILL.md). The work to do, in order, is in
> [backlog.md](backlog.md). The details of each backlog item are in [details.md](details.md). The framing decisions
> are in [README.md](README.md).

## What exists and is reused

| OMF piece | What it already does | What it becomes |
|---|---|---|
| `LogicalArchitectureBuilder` (751 lines) | builds a whole logical architecture from a JSON `Map`: signals, functions, blocks, ports, state machines, contexts, diagrams; `replace:true` rebuilds everything | its encoding code moves into the **SysML kit**; its JSON entry stays, as an adapter to the logical layer of the library |
| `BehaviorMcpProvider` (`behavior/*`) | fine-grained bricks: states, regions, transitions, activities, nodes, `addClassifiedChoice` | a source for the kit (state machines, activities, decision on a signal type) |
| `SendOnPortService`, `DelegateToExternalService`, `LogicalTransitionService` | On Port, `<signal>_ext`, Logical Transition with «refine» and «allocate» | derivations of the kit, called by the applier |
| `features/signalports`, `features/assembly` (`AutoConnectPlanner`) | ports derived from sends and accepts; connectors derived from signals | derivations. `AutoConnectPlanner` is also **the model to follow**: a pure Kotlin planner tested with JUnit, then a service that applies it in Cameo |
| `analysis/signalFlowCheck`, `analysis/behaviorDigest`, `validation/*` | static checks on the built model; a state machine as text | logical rules that are not rewritten; the static part of functional chains |
| `scenario/*`, `simtest/*`, `scripts/scenarios-run.mjs` (mbse-shepherd repository) | play a scenario, measure the coverage, give the trace | the simulation level of the tests; the input of measure evaluators and of confirmed chains |
| `dev/reload` + `scripts/dev/hot_reload.sh` | reload an `McpCategoryProvider` from a jar without restarting Cameo | the execution loop of generators |
| `omf-test-framework` (`AAssertTestCase`, batches) | tests inside Cameo without UI, on a generated project | regression tests of generators |
| `scripts/mbse/archspec.py` and the `make_*_spec.py` | Python generators of logical specs | **frozen**: they keep running through the JSON adapter; new generators are written in Kotlin |

## The five layers of the code

```
 L5  generators      own project per architecture, a jar loaded by arch/load: one ArchitectureScript object each   ← written by the LLM
 L4  engine          mbse/engine: Cameo reader → model, applier (plan / apply), presentation, chains, MCP `arch`
 L3  rules           mbse/rules: one class per rule, on the method model                                  ← pure Kotlin
     measures        mbse/measures: MOE/MOP evaluators on scenario traces                                  ← pure Kotlin
 L2  method model    mbse/method: data classes and DSL per layer (req, lc, fn, lg)                         ← pure Kotlin
 L1  SysML v1 kit    mbse/sysml: find-or-create of the Cameo patterns (conjugated port, item flow, message…)
 L0  MagicDraw OpenAPI + OMF core (SysMLFactory, SessionManager, DiagramPresenter)
```

The code is split in two Gradle modules, plus the side service:

| Module | Contains | Depends on MagicDraw? |
|---|---|---|
| `omf-mbse-core` (new) | `mbse.method`, `mbse.rules`, `mbse.measures`, `mbse.trace`, the JSON snapshot format | **no**: plain Kotlin, tested with JUnit, usable anywhere |
| `com.elliades.isae.mbseShepherd` | `mbse.sysml`, `mbse.engine` (reader, applier, derivations, MCP `arch`), `architectures` | yes |
| `mbse-report` (new, side service) | a command-line tool over `omf-mbse-core`: trace, requirement status, measures, trade-off audit, reports | **no**: runs without Cameo (see *The side service*) |

`AutoConnectPlanner` already shows the pattern: pure Kotlin planning, tested without Cameo, then applied by a service.
Keeping the core out of the plugin is what lets the same rules run in Cameo, in the side service, and in CI.

### L2 — the method model

The vocabulary of the method, as immutable data classes, without MagicDraw. The same model serves three purposes:
- what a generator **describes**;
- what the reader **reads back** from Cameo;
- what the **rules** and **measures** run on.

```kotlin
// mbse/method/lc/LifecycleModel.kt
data class LifecycleModel(
    val soi: Ref,
    val mission: Mission,                    // end state, objectives, MOE, MOP
    val phases: List<PhaseDecision>,         // lifecycle phases, treated or not, with the reason
    val actors: List<Actor>,                 // actors and external systems
    val signals: List<SignalRef>,
    val context: Context,                    // exchanges
    val useCases: List<UseCase>,
    val requirements: List<Requirement>,
)
data class Mission(val endState: String, val objectives: List<Objective>, val moes: List<Moe>, val mops: List<Mop>)
data class Moe(val id: String, val definition: String, val unit: String, val target: String,
               val objective: String, val evaluatedBy: Method)
data class Mop(val id: String, val definition: String, val unit: String, val target: String,
               val drives: List<String>, val requirement: ReqRef?, val evaluatedBy: Method, val measure: Measure?)
enum class Phase { PLAN, PREPARE, DEPLOY, EXECUTE, UNDEPLOY, SUSTAIN, ASSESS }
data class PhaseDecision(val phase: Phase, val treated: Boolean, val reason: String)
data class Exchange(val signal: SignalRef, val from: Ref, val to: Ref)
data class UseCase(val name: String, val phase: Phase, val subject: Ref, val actors: List<Ref>, val refines: List<ReqRef>,
                   val scenarios: List<Scenario>, val absent: Map<ScenarioKind, String>)
enum class ScenarioKind { SD, ALT, RD }      // nominal, alternative, dysfunctional
data class Scenario(val kind: ScenarioKind, val name: String, val lifelines: List<Ref>,
                    val steps: List<Step>, val verifies: List<ReqRef>, val measures: List<String>, val given: Given?)
sealed interface Step
data class Message(val from: Ref, val to: Ref, val signal: SignalRef) : Step
data class SelfAction(val on: Ref, val function: String) : Step
data class Resume(val scenario: String, val from: Int) : Step   // an ALT or an RD goes back to the nominal without copying it
```

The same approach gives three more models:
- `FunctionalModel`: mission signals (each linked to its lifecycle exchange), the mission state machine with regions,
  states, transitions and do-activities, service and technical functions with their steps (`call`, `send`,
  `accept`, `decide`, `fork`/`join`, reaction loops), the services, and the `satisfy` links;
- `LogicalModel`: components with ports, state machine and functions, contexts with parts and connectors, the
  allocation and the signal table;
- `Requirements`: requirements and their `refine` / `deriveReqt` / `satisfy` / `verify` links.

A reference (`Ref`, `SignalRef`) points to an element by its **identity** (see L4), never by a MagicDraw object.

#### The DSL

Kotlin builders that produce these models. They are plain function calls, with no `infix` operator, so an LLM writes
them without mistakes. A reference to an existing element is resolved at once against the `ModelView` read from
Cameo. An unknown name raises an error that lists the closest names. Examples are in the skill sheets
([lifecycle.md](../.claude/skills/mbse-architecture/lifecycle.md),
[functional.md](../.claude/skills/mbse-architecture/functional.md),
[logical.md](../.claude/skills/mbse-architecture/logical.md)).

### L3 — the rules

```kotlin
interface Rule<M> {
    val id: String            // "LC-11"
    val severity: Severity    // ERROR, WARNING
    val statement: String     // the statement, as the method shows it
    fun check(model: M): List<Violation>
}
data class Violation(val rule: String, val severity: Severity, val where: String, val message: String, val hint: String?)
```

- **One rule, one class, two sets of tests**: a model built with the DSL that passes, and one per way of failing.
  These are JUnit tests that run without Cameo.
- **The same code judges two things**: the description, before writing, and the model read back from Cameo, after.
- **Logical rules that `signalFlowCheck` already checks** are declared as `PluginRule(id, codes = ["SEND_NO_PORT", …])`.
  The engine calls the analysis and renames its findings. Nothing is written twice.
- **Rules that need a played scenario** (FN-12, FN-13, FN-14, LG-22) take the scenario results as an extra input.
- **The catalogue is generated**: `arch/rules` returns `{id, layer, severity, statement, implementedBy}`, and the
  method shows it as is.

### L3 — the measures

The hypothesis is that a measure lives in the model as data, and its formula lives in code. There is no parametric
diagram by default.

```kotlin
sealed interface Measure                                           // what a simulation MOP measures on a trace
data class Reached(val state: String, val withinSteps: Int? = null) : Measure
data class Never(val state: String, val unless: Event? = null) : Measure
data class Before(val first: Event, val then: Event) : Measure
data class Count(val event: Event, val target: IntRange) : Measure
sealed interface Event
data class Sent(val signal: String) : Event
data class Received(val signal: String) : Event
data class Entered(val state: String) : Event

interface Evaluator { fun evaluate(m: Mop, runs: List<ScenarioRun>): MeasureResult }   // value, target met, runs used
```

- **Inputs.** The `--report` JSON of `scenarios-run.mjs`, which gives the states per step, the states entered in order
  and the signals sent, and the `simtest/trace` callbacks.
- **Outputs.** One line per MOP in the scenario report: value, target, met or not, and the runs used. MOE aggregate
  their MOP only when the definition says how. Otherwise the MOE stays marked "evaluated by analysis".
- **Time.** The behaviour models have no timing today, so a duration MOP is "analysis" until timed simulation exists
  (backlog).
- **Parametric diagrams.** They are kept for analysis measures that are real equations, such as an energy budget or
  endurance. They are written through the kit (constraint blocks, parameters, binding connectors) only when such a
  measure is declared.

### L3 — traceability

`mbse.trace` builds one **trace graph** from the four layer models, the requirements, the measures, the trade-offs and
the latest scenario results. The nodes and relations are listed in
[traceability.md](../.claude/skills/mbse-architecture/traceability.md). On that graph it computes five things:
- the down and up checks TR-01 to TR-13, most of them reusing the layer rules;
- the **status of each requirement**: open, allocated, designed, verified, met or failed;
- the matrices: requirements × use cases, functions × components, lifecycle × functional × white-box scenarios;
- the **trade-off audit** TR-16 to TR-19: criteria against MOE/MOP, evidence, choice, and estimates against measured
  values;
- **impact analysis**: `impact(element, direction)` follows the relations up or down.

The trade-off is part of the logical model:

```kotlin
data class TradeOff(val name: String, val candidates: List<String>, val criteria: List<Criterion>,
                    val unaffected: Map<String, String>, val choice: String, val rationale: String)
data class Criterion(val name: String, val measure: String?, val qualitative: Boolean, val weight: Int,
                     val scores: Map<String, Score>)
data class Score(val value: Int, val evidence: Evidence)          // signal-table measure, estimate with method, simulation value
```

### L1 — the SysML v1 kit

One function per Cameo pattern. Each one does a *find-or-create* and encodes the pattern once, in a way that simulates
correctly. It is the only place that knows SysML v1.

| Concept | v1 pattern (Cameo 2026x) | Origin of the code |
|---|---|---|
| Signal | `Signal` in the data package; reused by name in the reuse scopes | `LogicalArchitectureBuilder.signal` |
| Interface | `InterfaceBlock` + one `FlowProperty` per signal, direction seen from the sending side | `createPorts` |
| Port | `ProxyPort` typed by the interface; `isConjugated` on the receiving side | `createPorts`, signalports |
| Exchange | `Connector` between ports with `partWithPort`, then an `ItemFlow` carrying the signal, realised by the connector, from source to target | `createStructure` + to write (item flow) |
| Actor | `Actor` for a human, `Block` «External» for a system; the reader accepts every form ([details](details.md#lcy-01)) | to write |
| Generated mark | «Generated» {script} on every element a generator writes or derives; reconciliation prunes only its own leftovers ([details](details.md#lcy-03)) | to write |
| Mission and measures | a mission context block; MOE as «moe» (MagicGrid profile, checked), MOP as «mop» (MBSE Shepherd profile); unit as the type, target as the default value, definition as doc; `«trace»` to the objective, `«refine»` to the requirement ([details](details.md#meas-02)) | to write |
| Lifecycle phase | package `<n>. <Phase>` under *Use Cases and Scenarios* (convention of the TP model); phases not treated, with their reason, in a comment of the parent package | to write |
| Use case | `UseCase` in the package of its phase, `subject` = SoI, `Association` actor ↔ use case | to write |
| Scenario | `Interaction` owned by the use case, stereotyped «TestCase» when it verifies a requirement; name prefixed `[SD n]` / `[ALT n]` / `[RD n]` | to write |
| Lifeline | `Lifeline` that `represents` a property of the interaction typed by the actor or the SoI | to write |
| Message | `Message` `asynchSignal`, `signature` = the signal, two `MessageOccurrenceSpecification`s; a self-message has no signal and is named after the function | to write |
| Requirement | `Class` «Requirement» (`Id`, `Text`); `«refine»`, `«deriveReqt»`, `«satisfy»`, `«verify»` | to write |
| State machine | classifier behaviour of the block; MagicDraw's default region; initial state with one outgoing transition | `createStateMachine` |
| State, transition | `SignalEvent` trigger (the event owned by the package), `via` = `Trigger.port`, effect as a wrapper activity | `createState`, `createTransition`, `factory.addSignalTrigger` |
| Function | `Activity` as a sequence of `call` / `send` (On Port, or none for a self-send, no pin) / `accept`, linked by ControlFlows; reactions as merge → accept → steps loops; fork / join | `createFunction` |
| Decision on a signal | classified choice on the type of the received signal, never a text guard | `behavior/addClassifiedChoice` |
| Cross-layer traceability | `«refine»` logical function or state → functional; `«allocate»` activity → block; `«trace»` function → lifecycle self-message | Logical Transition, `allocateFunctions` |
| Trace links | `«trace»`, `«refine»`, `«deriveReqt»`, `«satisfy»`, `«verify»`, `«allocate»` set by the generators and derivations; read back by the reader into the trace graph | partly exists (Logical Transition sets «refine» and «allocate»); the rest to write |
| Trade-off | an «objectiveFunction» block (MagicGrid) per trade-off, criteria as value properties traced to MOE/MOP, one instance per candidate with the scores, the choice as `«trace»` to the architecture with a «rationale» ([details](details.md#trc-04)) | to write |
| Functional chain view | a generated diagram per chain (activity diagram of the chain's functions and signals, or a highlighted copy of the mission state machine), or a generic table | to write |

### L4 — the engine

#### Identity, scope, reconciliation

This is what makes a generator **replayable** and able to **correct** an existing model. Today, `replace:true`
rebuilds everything.

- **Scope.** The generator declares what it owns: one or more packages, for example
  `1 - Operational Analysis::C - Use Cases and Scenarios::1. Preparation phase::Parameter Mission`. It also declares
  what it only reads: signals, actors, the layer above. Nothing outside the scope is ever modified.
- **Identity.**
  - A named element is identified by its type and its qualified path relative to the scope.
  - An unnamed element is identified by a structural key: a connector by its two `part.port` ends, a transition by its
    source, target and triggers, an item flow by its connector and its signal.
  - The reader keeps the Cameo id of each element, to follow a rename.
- **Reconciliation.** For each described element:
  - absent: it is **created**;
  - present with different properties: it is **updated**;
  - present in the scope but not described: it is **extra**, reported, and deleted only with `prune = true`;
  - ordered content (messages of an interaction, steps of an activity): it is rebuilt as a block when it differs.
- **Plan.** The same pass, run with a `RecordingWriter` that writes nothing. It returns
  `[{op: CREATE|UPDATE|KEEP|EXTRA|REBUILD|RAW, kind, path, detail}]`. That is what the human gate shows.
- **Apply.** One Cameo session, so it can be undone in one step. Derivations are made in the same session.
  Presentation (diagrams and layout) comes after, outside the session, as `DiagramPresenter.layout` requires.
- **Replay.** A second `plan` right after an `apply` gives zero changes. That is the first test of every generator.

#### Derivations

What the applier derives without a choice, after the decisions are set:
- the ports and interfaces of the lifecycle exchanges;
- the ports and interfaces from the sends and accepts of the logical state machines (signalports);
- conjugation on the receiving side;
- the item flow of an exchange;
- connectors when the generator asks for `autoConnect()` (assembly);
- `<signal>_ext` for a transition marked `delegate`;
- the `refine` and `allocate` links to the functional layer.

A derivation never guesses a decision. When it lacks information, it leaves the element absent, and a rule reports it.

#### The logical transition engine

The logical DSL ([logical.md](../.claude/skills/mbse-architecture/logical.md)) is a thin layer over services that
already exist in OMF. The engine calls them in Kotlin, inside the apply session. It never goes through MCP.

| DSL | OMF service | What it does |
|---|---|---|
| `allocate(mode or region, to = component)` | `LogicalTransitionService.transitionToLogical(state, block)` | clones the modes into the component's state machine, duplicates their functions into *Logical Functions* with «refine», «allocate»s the functional activities, recreates signal transitions, leaves cuts on `off-TO RENAME`; idempotent through «refine» |
| `delegate(signal, port)` | `DelegateToExternalService` | effect `send <signal>_ext` on the port; `<signal>_ext` specialises the signal |
| `input(signal, port)` | `SendOnPortService` / trigger `via` | the trigger takes the signal arriving on that port |
| `retarget(cut, to)` / `remove(cut)` | to write, on the cloned transitions | resolves an `off-TO RENAME` cut |
| port creation | `SignalPortCreator.createAllMissingPortsOnBlock` (+ `StmSignalScanner`) | one port per signal and direction, typed by an interface block |
| `mergePortsByPartner()` | Merge Ports (`omf-public-features/mergefeature`) | merges the ports declared under the same `p_<Partner>`, reroutes connectors, merges interface blocks |
| conjugation | `PortInterfacePropagator` | same interface block, conjugated, on the connected port |
| `autoConnect()` | `AssemblyService` / `AutoConnectPlanner` | connects the parts whose ports carry matching signals |
| `splitReaction(function, signal, into)` | `ActivityReactionSplitter` | one reaction per replacement signal |
| layer stereotypes | Apply Layer Stereotypes | «Logical Component», «Logical Mode» |

Each service must be callable without its dialog and must be idempotent. Logical Transition already is (test
`T4_ReplayIsIdempotent`). The others are checked in the backlog (LOG-04).

#### Functional chains

`chains(scope)` computes, for each lifecycle scenario, the path through the mission. It works from the stimulus
signal, through the transition it fires and the do, entry and effect functions run, to the signals they send and the
next transition, until the observable response.
- **Static**: from the state machine and the activities (`behaviorDigest` already gives most of it).
- **Confirmed**: by the trace of the played scenario. A static chain that the trace contradicts is reported.
- **Shown**: as a generated view per chain (kit row "Functional chain view") and as a table in the report.

#### The reader

`read(scope): XxxModel` reads Cameo back into the method model. It serves three purposes:
- the `ModelView` passed to the generator;
- the check after writing;
- reading a model made by hand.

Its gaps from the expected pattern, such as a message without a signal or a port without an interface, become
**form** rules (`F-xx`). They cannot fail on a generated model, but they catch hand-made errors.

#### The MCP category `arch`

Reading and driving go through MCP. Writing is done by the generator's code.

| Call | Returns |
|---|---|
| `arch/list` | the loaded generators: `{id, layer, scope, doc}` |
| `arch/read {layer, scope}` | the method model read back, as JSON |
| `arch/check {id \| layer+scope}` | rule violations, on the description (`id`) or on the model read back (`scope`); for the logical layer, also `signalFlowCheck` and `validation/active` |
| `arch/plan {id}` | the plan |
| `arch/apply {id, prune?}` | the applied plan, derivation warnings, then `check` on the model read back |
| `arch/present {id}` | the diagrams of the scope, presented and laid out |
| `arch/chains {id \| scope}` | the functional chains, with their views |
| `arch/measures {id, report}` | the MOP values computed from a scenario report |
| `arch/rules {layer?}` | the rule catalogue |
| `arch/export {scope}` | one JSON snapshot of all layers, requirements, measures, trade-offs and trace links, in the `omf-mbse-core` format: the input of the side service |
| `arch/validate {profile, scope, runs?}` | the validator: every check of the profile, one verdict (see *The validator*) |
| `arch/trace {scope, runs?}` | shortcut for `arch/validate {profile: trace}` |
| `arch/impact {element, direction}` | the elements reached up or down from an element |

An `apply` first checks the open project, as the current builders do. **It never saves the project.**

### L5 — the generators

```kotlin
// architectures/part1/ParameterMission.kt
object ParameterMission : ArchitectureScript {
    override val id = "part1.lc.parameter-mission"
    override val layer = Layer.LC
    override val owns = listOf("1 - Operational Analysis::C - Use Cases and Scenarios::1. Preparation phase::Parameter Mission")
    override val reads = listOf("1 - Operational Analysis", "2 - Functional Analysis::B - Functional Data")
    override fun describe(view: ModelView) = lifecycle(view) { /* … */ }
}
```

- **One generator per architecture, or per slice of a layer.** It describes, it does not write: `describe` is a pure
  function of the `ModelView`.
- **Registration.** A jar declares its generators with one `ArchitectureProvider` (ServiceLoader). `arch/load` loads
  the jar with the engine's class loader as parent, so the jar and the engine share one core. Loading a jar again
  replaces its generators with the new code: no hot reload of the plugin is needed to change a generator.
- **Saving.** `arch.sh save <path.mdzip>` (save as) is the only command that saves the project. Ask before using it.
- **Where they live.** Each project's generators are their own Gradle project, outside OMF, compiled against
  `omf-mbse-core` only (`ArchitectureScript`, `ModelView` and `Description` are in the core). The jar declares an
  `ArchitectureProvider` (ServiceLoader); the plugin loads it with `arch/load {jar}`, or from `~/.mbse/architectures`
  at start. The plugin itself carries the generic engine and the Part 3 example only. The Part 2 generators (graded
  answers) stay in a private project.

## The validator

One validator, callable from everywhere, runs **every check of the method** and gives one verdict. The rules,
measures and trace checks are not called one by one. The validator picks them by **profile**, gathers what they
need, and merges their findings.

### What it runs

| Source | Checks |
|---|---|
| `omf-mbse-core` | layer rules LC, FN, LG, REQ; form rules `F-xx`; trace checks TR-01 to TR-19; requirement status; MOP evaluation |
| the plugin (Cameo only) | `signalFlowCheck` codes (as `PluginRule`), `validation/active` |
| the scenario reports | verdicts and coverage, for FN-12, FN-13, LG-22, LG-25, TR-14, TR-15, TR-19 |

### Profiles

| Profile | Runs | Used |
|---|---|---|
| `layer:<lc\|fn\|lg\|req>` | the rules of one layer, on its scope | while writing a generator |
| `gate:<lc\|fn\|lg>` | the layer rules, plus the trace checks up to that layer, plus the requirement status so far | before every human gate (SKILL step 6) |
| `delivery` | everything: all layers, all trace checks, TR-14, the trade-off audit, the MOP | before delivering (SKILL step 9) |
| `trace` | the trace graph checks, the requirement status, the trade-off audit | at any time |
| `rules:<ids>` | the listed rules only | to recheck a fix |

### Inputs

- **In Cameo**: the scope (package or generator id), and the folder of the latest scenario reports.
- **Outside Cameo**: a snapshot from `arch/export`, and the scenario reports.

When an input a rule needs is missing, the rule is **skipped**, never passed. A rule that needs scenario runs is
skipped when there are none, and is listed in `skipped` with the reason.

### Waivers

A warning, or an error the human accepted at a gate, can be waived. The waiver is declared in the generator, so it is
versioned with it:

```kotlin
waive("LC-12", element = "Voice", because = "kept for the voice link of UC-6 RD 1, not written yet", by = "Quentin, gate of 2026-11-05")
waive("FN-13", element = "Patrolling::Predator::Tracking --Predator lost--> Watching", because = "loss of track cannot be injected", by = "…")
```

Coverage exclusions (FN-13, LG-25) are waivers too. A waiver without a reason, or on an element that no longer exists,
is itself an error.

### Output

```json
{
  "verdict": "PASS | FAIL | INCOMPLETE",
  "profile": "gate:lc",
  "scope": "Metro::1 - Lifecycle",
  "counts": { "error": 0, "warning": 3, "waived": 2, "skipped": 4 },
  "findings": [
    { "rule": "LC-11", "layer": "lc", "severity": "error", "source": "core",
      "message": "[RD 1] Train → OCC: Platform door alarm has no exchange in the context",
      "element": { "id": "_2026x_…", "path": "Metro::1 - Lifecycle::4. Execute::Serve a station::[RD 1] …", "type": "Message" },
      "hint": "context { flow(psdAlarm, from = train, to = occ) }" }
  ],
  "waived": [ { "rule": "LC-12", "element": "Voice", "because": "…", "by": "…" } ],
  "skipped": [ { "rule": "FN-13", "reason": "no scenario report" } ],
  "requirements": [ { "id": "REQ-05", "status": "verified", "by": ["UC-5 SD 1"], "mop": [] } ],
  "measures": [ { "mop": "MOP-2", "value": 0, "target": "0", "met": true, "runs": ["lc.uc5.sd1"] } ],
  "tradeoffs": [ { "name": "Logical architecture", "findings": [] } ]
}
```

- `FAIL` when at least one error is not waived.
- `INCOMPLETE` when the profile needs an input that is missing, and no error was found in what could run.
- `PASS` otherwise.

The same data also comes out as Markdown, for the report of the skill.

### Entry points

| Where | How | For |
|---|---|---|
| MCP | `arch/validate {profile, scope, runs?}` | the LLM, scripts |
| Cameo | a validation suite **"MBSE Shepherd method"** contributed by the plugin, so `validation/run {suite}` and the *Validation Results* window show the findings on the elements, with a click to select them; plus a menu *MBSE Shepherd > Validate method…* that asks for the profile | the human, in the tool |
| generator loop | `bash scripts/dev/arch.sh <id> validate [profile]` | while writing a generator |
| side service | `mbse-report validate <snapshot> --profile … --runs …`, exit code 0 = PASS, 1 = FAIL, 2 = INCOMPLETE | CI, review without Cameo |

All four call the same `Validator` of `omf-mbse-core`. Only the Cameo entry adds the plugin checks; the others read
their results from the snapshot.

## The side service: `mbse-report`

A command-line tool, outside Cameo, built on `omf-mbse-core`. It is allowed, and useful, for four reasons:
- the checks and reports run **without Cameo**: in CI, on a reviewer's machine, on an archived model;
- heavy matrices and HTML reports stay out of Cameo's UI thread;
- two snapshots can be **compared**, to see what changed in the trace and in the requirement status between two
  versions;
- it is the natural place to grow toward SysML v2: a v2 reader produces the same snapshot.

| Input | Where it comes from |
|---|---|
| model snapshot (JSON) | `arch/export` |
| scenario runs (JSON) | `node scripts/scenarios-run.mjs … --report out.json` (mbse-shepherd) |

| Command | Output |
|---|---|
| `mbse-report validate <snapshot> --profile <p> [--runs <reports>]` | the validator (see *The validator*); exit code 0 PASS, 1 FAIL, 2 INCOMPLETE |
| `mbse-report trace <snapshot> --runs <reports>` | requirement status, matrices, unjustified elements, trade-off audit (Markdown and HTML) |
| `mbse-report measures <snapshot> --runs <reports>` | MOP values against targets, MOE where they aggregate |
| `mbse-report impact <snapshot> <element> [--up\|--down]` | impact analysis |
| `mbse-report diff <old> <new>` | what changed between two snapshots: elements, links, requirement status |

The rules that need Cameo (`signalFlowCheck`, `validation/active`, simulation) stay in Cameo. The side service reads
their results from the snapshot and the scenario reports; it does not rerun them.

## The execution loop

```bash
bash scripts/dev/arch.sh <id> plan       # gradle jar, dev/reload (packages mbse + architectures), arch/plan
bash scripts/dev/arch.sh <id> apply      # the same, then arch/apply and arch/check
bash scripts/dev/arch.sh <id> check
bash scripts/dev/arch.sh <id> chains
```

- **The script is written on the model of `hot_reload.sh`.** It reloads the packages
  `com.elliades.isae.mbseShepherd.mbse` and `.architectures` with the provider `ArchMcpProvider`.
- **From Claude's shell, Gradle needs a variable.** Set
  `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=<folder under C:\workspace>`, or Gradle fails on `Selector.open()`.
- **Development mode is required.** Cameo must have been started with `gradlew runMbseShepherd`, or `dev/reload` is
  not loaded.
- **Stacked reloads can degrade Cameo.** An odd simulation proves nothing until Cameo has been restarted.
- **Regression.** An `ArchitecturesBatch` (omf-test-framework) starts from a copy of the base model. For each
  generator it runs `plan`, `apply`, `plan` (which must give 0 changes), `check` (0 errors) and `signalFlowCheck`. It
  runs with `gradlew runMbseShepherdTests`.

## Migration

1. `LogicalArchitectureBuilder.build(Map)` keeps its signature. It translates the `Map` into a `LogicalModel` and calls
   the applier. These keep working: `logical/buildArchitecture`, `archspec.py`, `run_scenario.py`, and the scripts of
   the mbse-shepherd repository (`make-part3-inits.py`, `build-part3-models.mjs`).
2. Python generators are not rewritten all at once. A generator is ported to Kotlin when it is touched.
3. The OMF skills `mbse-logical-architecture`, `mbse-simulation-verify` and `mbse-scenario-authoring` point to
   `mbse-architecture` and `mbse-scenarios`. The logical playbook is merged into
   [logical.md](../.claude/skills/mbse-architecture/logical.md).
