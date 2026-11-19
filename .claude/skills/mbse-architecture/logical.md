# Logical layer: which components, who decides, what they exchange

A logical architecture is made of components. It has four properties:
- **Abstract**: a component says what it does, not how it is built. No brand, no part number.
- **One level**: the SoI and its components, with no sub-component. One exception, for a system built of repeated
  units: a structural assembly of components (a metro `Trainset`: traction, brakes, saloons, coupler), with no
  behaviour of its own, instantiated once per unit; only the SoI context has the lifecycle boundary (backlog LOG-13).
- **Allocated behaviour**: each component receives a share of the mission (modes) and the functions of those modes.
- **Defined interfaces**: ports, their contracts, and the connectors that carry the signals.

Inputs: the mission, the functions, the functional scenarios and chains ([functional.md](functional.md)), the
lifecycle exchanges and scenarios, the MOE/MOP, and the requirements.

Outputs:
- the components, their state machines and their logical functions;
- the contexts;
- the `refine`, `allocate` and `satisfy` links;
- the white-box scenarios and their verdicts.

## The idea: the logical layer is a transition of the mission

The logical layer is **not drawn from scratch**. It is obtained by **transitioning the functional mission onto
components**, with tools that already exist in OMF:
1. **Allocate.** Each mode, or each region, of the mission goes to one component. The transition **clones** the mode
   into the component's state machine and **duplicates** its functions into *Logical Functions*. Each clone keeps a
   «refine» to its functional source, and the functional activities are «allocate»d to the component. The functional
   mission is never modified.
2. **Rewire.** In the mission, the system talks to itself: each decision is a signal a function sends itself. After
   the transition, a transition whose neighbour now lives in another component points to a placeholder
   (`off-TO RENAME`). Each such cut is an exchange between components, and the signal table resolves it.
3. **Derive.** The signal table decides; the tools derive:
   - `<signal>_ext` and its send on a port (*Delegate to external systems*);
   - the ports and interfaces (*Create All Missing Signal Ports*);
   - one port per partner (*Merge Ports*);
   - the conjugated side (*Propagate Interface*);
   - the connectors (*Auto Connect*).

Architectures differ in **who decides** each transition of the mission, and therefore in their interfaces. The
functional chains show where a cut between components crosses a chain: each crossing is an exchange.

For each signal of a component, two questions are enough (Part 3, `mc-signals`):

| Who fires the transition? | Does anyone else need to know? | Result |
|---|---|---|
| the component itself | no | self-send, nothing to do |
| the outside (another component, an actor) | — | an input port |
| — | yes | an output port, on a separate signal `<signal>_ext` that specialises it (*Delegate to external systems*) |

## The steps

| # | Step | Output | Human gate |
|---|---|---|---|
| 1 | Brief | objectives, constraints, criteria | yes |
| 2 | Read the functional layer | modes, regions, transitions, functions, chains | — |
| 3 | Candidates | two or three styles, each with who decides what | — |
| 4 | Trade-off | the chosen candidate and why | yes |
| 5 | Allocation table | mode or region → component, functions that follow, decisions, splits | yes, before anything is written |
| 6 | Transition | cloned modes and functions, «refine» and «allocate», the cuts (`off-TO RENAME`) | — |
| 7 | Signal table and rewiring | per component and per signal: self-send, input, or `_ext` output; each cut resolved | yes |
| 8 | Ports, interfaces, assembly | derived ports grouped per partner, the context, the boundary | — |
| 9 | White-box scenarios, slice by slice | verdicts, coverage per component, MOP | yes, if a branch is excluded |
| 10 | Deliver | component specifications, who decides what, verdicts, comparison | — |

Steps 6 to 9 run one mission event at a time (step 9): build a slice, test it, then the next one.

### 1. The brief — human gate

The brief fixes three things:
- **the objectives**: the mission capabilities to cover;
- **the constraints**:
  - the style;
  - the components that are imposed or merged;
  - who decides what;
  - the boundaries (operator, physical);
  - the target package;
  - the names to keep;
- **the criteria**: simulable end to end, 0 errors, every logical function traced, and the MOE/MOP the choice must
  serve.

A vague constraint ("simple") is turned into a measurable criterion.

### 2. Read the functional layer

`arch/read {layer: fn}` gives what the following steps need. Until it exists, use `analysis/behaviorDigest` on the
mission state machine. The steps need:
- the modes and the regions;
- the transitions, each with its trigger signal and the function that sends it;
- the functions and what they send;
- the functional chains.

### 3. The candidates

Start from the styles of the TP:

| Style | Who decides | Cost |
|---|---|---|
| **Feature orchestrator** | the orchestrator only picks the active feature; the active feature decides the rest and drives the autopilot | each feature carries a lot of logic; two features must agree on who drives |
| **Decentralised patch** | nobody: each component reacts; a new feature is added without touching the existing ones | rules are scattered; the next feature will need another patch |
| **Central hub** | the orchestrator receives everything and decides everything by priority | single point; many messages; simple components |
| Swarm: **master** in the base or in a drone, or **reflex** per drone | the master grants requests; without a master, each drone decides | radio link; double departure without coordination |

### 4. The trade-off — human gate

The axes of the TP (Part 3, `trade-off`):
- rules in one place;
- cheap to change;
- room for new features;
- few messages;
- no single point of failure;
- simple components.

Add the MOE and MOP the architecture affects. For example, a central hub lengthens the chain behind a response-time
MOP. Every MOE and MOP the choice can affect is a criterion, or is declared unaffected with a reason. The trade-off is
**recorded** in the generator (`tradeoff { … }`, see [traceability.md](traceability.md)): criteria traced to MOE/MOP,
weights, scores with evidence, choice and rationale. Each candidate is measured on its signal table:
- interfaces, and signals per interface;
- length of the reaction chains;
- where each critical function runs, and how many times;
- number of stubs needed to test a component alone.

### 5. The allocation table — human gate, before anything is written

This is the only real decision. Everything else derives from it.

| Mission mode or region | Component | Functions that follow | Decisions it takes | Split? |
|---|---|---|---|---|
| Undeployed (Off, Unconfigured, Configured, Ready for Mission) | Mission Configuration | Load Flight Plan, Start subsystems | plan correct or not | no |

The table obeys five rules:
- each mode goes to one component;
- a mode shared by two components is **split** with a written reason: each component gets its share of the mode, and
  a reaction that serves both is split per signal (*split reaction*);
- a whole region without an owner is a missing component;
- a decision has a single decider;
- in an orchestrated style, components signal and the orchestrator decides. The orchestrator's state machine is its
  own decision logic: it refines the mission modes it arbitrates, but it is not a clone. It is declared
  `component(…, ownLogic = true) { stm { … } }` ([details](../../../method/details.md#log-07)).

### 6. The transition

For each line of the allocation table, the generator calls `allocate(mode or region, to = component)`. The library
runs the Logical Transition, which does six things:
- **clones the mode and its sub-states** into the component's state machine (created if needed, as classifier
  behaviour), with a «refine» from each logical state to its functional state;
- **duplicates the functions** of those modes (do, entry, exit, and every function they call) into the *Logical
  Functions* package, each with a «refine» to its functional source;
- **gives every component its own copy of a function used by two components**, because a function that sends belongs
  to one block (LG-06). Signals are reused, never cloned;
- **«allocate»s** the functional activities to the component;
- **recreates the signal-triggered transitions** inside the component. A transition whose target lives in another
  component goes to a placeholder state `off-TO RENAME`. When that neighbour is transitioned later, the transition is
  reconnected to its clone through the «refine»;
- **is idempotent**: replaying it on a mode already transitioned changes nothing, and links are found by «refine»,
  never by name.

What is left on `off-TO RENAME` after all allocations is the list of **cuts**: the places where the mission crosses
from one component to another. Step 7 resolves every one of them, and no placeholder survives (LG-23).

A logical function may need to **differ** from its functional source, because its messages now come from, or go to,
other components. It is then a new function that keeps the «refine» to its source (LG-24). This is what Mission
Configuration shows in Part 3: same states, different behaviour.

### 7. The signal table and the rewiring — human gate

Apply the two questions to every signal of every component, and resolve every cut. Example (Part 3, Mission
Configuration):

| Signal | Who fires | Who else needs to know | Result |
|---|---|---|---|
| `Start SOI` | the outside: power-on | nobody | input on `p_Init` |
| `FlightPlan` (`Correct`, `Incorrect`) | the outside: the operator, through the station | nobody | input on `p_BaseStation` |
| `Ready for mission` | itself: `Load Flight Plan` | the operator | self-send, and `Ready for mission_ext` on `p_Verdict` |
| `FlightPlan Check Failed` | itself: `Load Flight Plan` | the operator | self-send, and `FlightPlan Check Failed_ext` on `p_Verdict` |
| `Start Sheep Guard Mission` | the outside: the operator, through the station | the decider | input on `p_BaseStation`, and `Start Sheep Guard Mission_ext` on `p_StartOrder` |

A cut has three possible resolutions:
- **retarget**: the transition goes to a local mode of the component. Example: Mission Configuration's
  `off-TO RENAME` becomes its own `Deployed`, which means "handed over";
- **exchange**: the sending component delegates the signal (`_ext` on a port), and the receiving component gets the
  trigger on an input port (`via` when several partners could send it);
- **remove**: the transition does not exist in this component.

Ports are named `p_<Partner>`, with one port per partner when the parts are fixed. A signal has one direction on a
given port.

### 8. Ports, interfaces and assembly

All derived from steps 5 to 7:
- **ports and interfaces**: one port per signal and direction, created from the sends and accepts of each state
  machine, then **merged per partner** into `p_<Partner>`. Each port is typed by an interface block whose flow
  properties are directed as seen from the component;
- **conjugation**: the receiving side of a connector gets the same interface, conjugated;
- **assembly**: the SoI context gets one composite part per component, and `autoConnect()` connects the ports whose
  signals match;
- **boundary**: the SoI ports carry exactly the lifecycle exchanges (LG-17), delegated to the components that send or
  receive them;
- **simulation context**: the drivers (operator, environment) are parts of a dedicated context linked to the SoI.

### 9. White-box scenarios, slice by slice

Build in slices, each followed by its scenario:
- start-up;
- configuration;
- patrol;
- stray sheep;
- bear;
- deterrence.

Each slice goes through `plan`, `apply`, `check`, then its scenario ([testing.md](testing.md)).

The scenarios are **the functional scenarios replayed in white box**, with the same expected mission behaviour
(LG-22). The mission modes they expect are mapped to the component states that «refine» them, automatically
([details](../../../method/details.md#log-03)). They also check the parts that must move, and those that must not (`is not`, `never`). Move to the next slice
only when this one is green: a failure is then located in the last slice added.

At the end:
- the whole sequence passes;
- the coverage of every component's state machine is 100 % or justified;
- the simulation MOP are evaluated.

### 10. Deliver

The delivery contains:
- the specification of each component: ports and behaviour;
- a summary of who decides what;
- the verdicts, with the coverage and the MOP values;
- the trace report, including the trade-off audit: do the measured MOP agree with the trade-off estimates?
- the comparison with the other candidates if asked: parts, connectors, signals, routes.

### Variant: compose from bricks (Part 4)

When the components exist as bricks (*Zone Surveillance*, *Swarm Master*…), steps 6 to 8 become:
- drop parts;
- call `autoConnect()`;
- play the missions.

A missing brick fails a specific mission: that is the test.

## Simulable design rules

| Id | What must hold | Severity | Checked by |
|---|---|---|---|
| LG-01 | One state machine per component, as classifier behaviour | error | `signalFlowCheck`: `STM_NOT_CLASSIFIER_BEHAVIOR`, `PART_NO_BEHAVIOR` |
| LG-02 | No self-transition; reacting without changing mode = merge → accept → steps loop in the do-activity | error | rule |
| LG-03 | One reaction per signal in a function; relaying to two receivers = one reaction, two sends | error | rule |
| LG-04 | One direction per signal and per port | error | rule |
| LG-05 | Every send to another component has an On Port | error | `signalFlowCheck`: `SEND_NO_PORT`, `SEND_SELF_ONLY` |
| LG-06 | A function that sends belongs to one block, and its On Ports are ports of that block; only functions that send nothing are shared | error | `signalFlowCheck`: `SEND_FOREIGN_PORT` |
| LG-07 | Every signal sent on a port is declared there, in the right direction | error | `signalFlowCheck`: `SEND_PORT_UNDECLARED`, `SEND_PORT_WRONG_DIRECTION` |
| LG-08 | A signal that fires a transition and must also go out gives two signals: the internal one, and `<signal>_ext`, which specialises it | error | rule |
| LG-09 | Every signal sent is consumed; no broadcast order without a taker (an instance not concerned consumes it with an empty reaction) | warning | `signalFlowCheck`: `SIGNAL_NOT_CONSUMED`, `SIGNAL_NEVER_SENT` |
| LG-10 | A request is sent in the entry of the mode that waits for the answer, not in the effect of the transition | warning | rule |
| LG-11 | Connectors: assembly = opposite directions, delegation = same direction; every route is complete | error | `signalFlowCheck`: `CONNECTOR_DIRECTION`, `ROUTE_*` |
| LG-12 | A logical send does not go through a physical port: it goes through a logical port delegated to a boundary port | error | `signalFlowCheck`: `BOUNDARY_PORT_UNCONNECTED`, `ROUTE_BOUNDARY_MISMATCH` |
| LG-13 | Unique state names within a block; unique context names in the project | error | rule |
| LG-14 | Every logical state and function `refine`s its functional source; every mission activity is `allocate`d to a component, or the gap is noted | warning | rule |
| LG-15 | Every mission mode is held by a component; every region has an owner | error | rule |
| LG-16 | A decision has a single decider | error | rule, on the allocation table |
| LG-17 | The signals that cross the SoI boundary are exactly the exchanges of the lifecycle context | error | rule, against the `LifecycleModel` |
| LG-18 | Composite parts, created from the block; simulation drivers live in a dedicated context linked to the SoI, and the SoI has no state machine | error | form rule |
| LG-19 | A decision without data becomes an observation signal from the environment | — | review |
| LG-20 | Several instances of a block: one part per instance; `via` says who asks; answer the others on the grant | warning | scenario |
| LG-21 | No brand, no part number, no sub-component | — | review |
| LG-22 | The functional scenarios pass on the logical architecture, with the same expected mission behaviour | error | scenarios |
| LG-23 | No `off-TO RENAME` placeholder is left; every cut is retargeted, turned into an exchange, or removed | error | rule |
| LG-24 | A logical function that differs from its functional source still `refine`s it | error | rule |
| LG-25 | Every component's state machine is covered at 100 % by the passing scenarios, or the exclusions are justified | error | coverage |

Facts checked in Cameo 2026x. Do not "fix" them:
- a port delivers to every connected port (assembly and delegation);
- sending on an unconnected port has no effect;
- `Trigger.port` is honoured.

## In the generator

```kotlin
override fun describe(view: ModelView) = logical(view, into = "3 - Logical Analysis::TP - Logical Architecture") {
    val fn = view.functional                                   // the mission, read back
    val lc = view.lifecycle
    val startSoi = lc.signal("Start SOI"); val fp = lc.signal("FlightPlan")
    val ready = lc.signal("Ready for mission"); val failed = lc.signal("FlightPlan Check Failed")
    val startMission = lc.signal("Start Sheep Guard Mission")

    val mc = component("Mission Configuration")
    val orch = component("Mission Orchestrator")
    // … other components of the chosen candidate

    // step 6: the transition (clone of modes, duplication of functions, «refine», «allocate», cuts)
    allocate(fn.state("Undeployed"), to = mc)
    // allocate(fn.region("Patrolling", "Sheep"), to = sheepMonitoring) …

    // step 7: the signal table of Mission Configuration, and its cut
    signals(mc) {
        input(startSoi, port = "p_Init")
        input(fp, port = "p_BaseStation")                       // FlightPlan Correct / Incorrect specialise it
        input(startMission, port = "p_BaseStation")
        selfSend(ready); delegate(ready, port = "p_Verdict")    // Ready for mission_ext
        selfSend(failed); delegate(failed, port = "p_Verdict")  // FlightPlan Check Failed_ext
        delegate(startMission, port = "p_StartOrder")           // Start Sheep Guard Mission_ext
        retarget(cut = "off-TO RENAME", to = newState("Deployed"))
    }

    // the orchestrator decides: its own state machine, refining the modes it arbitrates
    behaviour(orch) { /* stm { state("Waiting", refines = fn.state("Undeployed")) … } */ }

    // step 8: ports per partner, assembly, boundary
    context("TP Logical SOI") {
        parts(mc, orch /* , … */)
        mergePortsByPartner()
        autoConnect()
        boundary(lc.exchanges)                                  // SoI ports = the lifecycle exchanges
    }
}
```

`allocate`, `delegate`, the port creation, `mergePortsByPartner` and `autoConnect` call the existing OMF services.
The generator only states the decisions of the tables. The names above come from the Part 3 guide: reread them in the
open model before writing a generator, because they may have changed.
