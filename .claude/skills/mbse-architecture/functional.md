# Functional layer: how the system does it

The SoI is still **one block**. Its **mission is a state machine**, driven by **signals**. In each mode it runs
**service functions**: activities, decomposed and refined with execution logic where needed. The layer is
**solution-neutral**: no subsystem, no component, no orchestrator. It says what must happen, in which order, on which
condition, and what happens **at the same time**.

The functional layer is validated by simulation **before** any component is chosen. Every scenario of the lifecycle
layer is played against the mission, and together the scenarios must take **every branch** of the state machine.

Inputs: the lifecycle layer (exchanges, use cases, scenarios, MOP) and the requirements.

Outputs:
- the mission signals;
- the mission state machine;
- the service functions;
- the functional scenarios and their verdicts;
- the branch coverage;
- the functional chains;
- the `satisfy` links.

## Concepts

| Concept | Meaning |
|---|---|
| Mission signal | a signal that drives the mission. An external one is **the same element** as in the lifecycle exchanges; an internal one is a decision the system sends itself |
| Mission | the state machine of the SoI block: modes (states), parallel regions, transitions |
| Mode | a state of the mission; the function it runs is its do-activity |
| Transition | a change of mode, triggered by a signal |
| Service function | an activity that renders a service seen from outside; filed by service |
| Technical function | an activity that helps a service function; filed with the service it helps |
| Reaction | what a mode does when a signal arrives **without** changing mode: an accept loop inside its do-activity |
| Decision | the choice of a branch, made on the **type** of the received signal, never on a text guard |
| Functional scenario | a lifecycle scenario played against the mission (black box), with the mission modes it must reach |
| Functional chain | the path, through the mission, from a stimulus to the observable response: signal → transition → functions → signals sent → … |

## The steps

| # | Step | Output | Human gate |
|---|---|---|---|
| 1 | Mission signals | the signal table: reused, new external, internal | — |
| 2 | Mission state machine | the mode table and the regions | yes |
| 3 | Service functions | the functions, their decomposition and their execution logic | — |
| 4 | Functional scenarios | one `.scn` per lifecycle scenario, with the expected modes | — |
| 5 | Simulate and cover every branch | verdicts, branch coverage, MOP values | yes, if a branch is excluded |
| 6 | Functional chains | one chain per lifecycle scenario, as a generated view | — |
| 7 | Trace and reconcile | `satisfy` links; the FN rules pass | — |

Steps 2 to 5 loop. A failing scenario, or a branch no scenario can reach, sends you back to the state machine or the
functions.

### 1. Mission signals

**Reasoning.**
1. Take every message to and from the SoI in the lifecycle scenarios. Each one is a mission signal, and it is **the
   same signal element**, reused, never a copy with the same name.
2. Take every self-message of the lifecycle scenarios. It names a function (step 3). If that function ends in a
   decision that changes the mode, the decision becomes an **internal signal** the function sends itself. Example:
   `Load Flight Plan` sends `Ready for mission` to the block itself, without a port. The logical layer will turn
   these self-sends into exchanges on ports.
3. A signal that refines another one specialises it (`FlightPlan Correct :> FlightPlan`). Do not create a sibling.

**Decision table.**

| Signal | Kind | From the lifecycle exchange | Received by (transition or accept) | Sent by (function) |
|---|---|---|---|---|
| FlightPlan | external, reused | Ground Station → UAV | Unconfigured → Configured | — |
| Ready for mission | internal, then external | UAV → Ground Station | Configured → Ready for Mission | Load Flight Plan |

### 2. The mission state machine — human gate (the modes)

**Reasoning.**
1. **Modes come from the story of the use cases, phase by phase.** Every stable situation someone would name becomes
   a mode: *Unconfigured*, *Configured*, *Patrolling*. The lifecycle phases often give the top-level structure:
   *Undeployed* and *Deployed*.
2. **The signals make the machine advance.** Every transition has a trigger signal from step 1. A completion
   transition, with no trigger, is allowed only to leave a mode whose do-activity ends by itself.
3. **Only a change of mode is a transition.** Reacting without changing mode is a reaction in the do-activity. It is
   never a self-transition, which would restart the mode and its functions.
4. **Concerns that hold at the same time are parallel regions.** No transition crosses a region. Example: watching the
   perimeter, the sheep and the predator are three regions of *Patrolling*. Regions say what happens at the same time,
   before anyone knows who does it. In the logical layer, each region will need an owner.
5. **Every region has an initial state with one outgoing transition.** No state is unreachable.

**Decision table.**

| Mode (region) | Does (do) | Leaves on | To | Who sends that signal |
|---|---|---|---|---|
| Unconfigured | — | FlightPlan | Configured | operator, through the ground station |
| Configured | Load Flight Plan | Ready for mission | Ready for Mission | Load Flight Plan (self-send) |
| Configured | Load Flight Plan | FlightPlan Check Failed | Unconfigured | Load Flight Plan (self-send) |

### 3. Service functions, decomposed and refined

**Reasoning.**
1. **Every self-message of a lifecycle scenario is a function.** File it under its service (one package per
   service). A technical function goes with the service it helps, under a name that says what it does.
2. **Decompose a function** when part of it is reused elsewhere, or can be simulated alone. A function calls its
   sub-functions with call actions.
3. **Refine with execution logic only where the behaviour needs it.** The patterns allowed:
   - **sequence**: `call` → `call` → `send`;
   - **send / accept**: a send signal action (self-send at this level), and an accept event action that waits for a
     signal;
   - **reaction loop**: merge → accept → steps → merge, for a mode that reacts without changing;
   - **decision on the type of a received signal** (classified choice). A text guard that Cameo cannot evaluate opens
     a pop-up at every pass;
   - **fork / join**, where parallel branches join before the final node, because the final node stops the whole
     activity at its first token.
4. **An activity covers all the scenarios of its function**, SD, ALT and RD. A sequence diagram shows one scenario;
   the activity holds them all.
5. An action starts when every incoming flow **and** every input pin has a token. An object flow links two pins of the
   same type.

**Example (Part 1, ch. D).** `Load Flight Plan` runs `Read FlightPlan`, then `Check FlightPlan`, then decides on the
type of the plan received.
- `FlightPlan Correct`: it sends `Ready for mission`.
- `FlightPlan Incorrect`: it sends `FlightPlan Check Failed`.

### 4. Functional scenarios

The lifecycle scenarios already say what must happen, so there is no new sequence diagram to draw at this layer.
Each lifecycle scenario becomes a **simulation scenario** (`.scn`, skill `mbse-scenarios`), played in black box
against the mission:

| Lifecycle scenario | Functional scenario |
|---|---|
| message from an actor to the SoI | a step: the driver sends the signal |
| message from the SoI to an actor | the mode that comes with it, checked after the step |
| self-message | the mode in which that function runs |
| SD / ALT / RD | `kind: nominal / alternative / dysfunctional` |
| `verifies`, `measures` | `verifies:` of the `.scn`, and the MOP evaluated on its trace |

The expectations come from the lifecycle scenario and the requirements, **never from the model**. The sequence
diagram of a played scenario can be generated afterwards (`scenario/sequenceDiagram`) to show what really happened.

### 5. Simulate and cover every branch

Play every functional scenario, then read the **branch coverage** of the mission:
- every state reached;
- every transition fired;
- every branch of every decision and every classified choice taken.

Decision branches inside the activities count too, not only the transitions of the state machine
([details](../../../method/details.md#fun-01)). The target is **100 %**. A branch that no scenario takes has three possible meanings:
- **a scenario is missing**: write it, usually an ALT or an RD the lifecycle layer did not list, then add it there too;
- **the branch is dead**: remove it from the mission;
- **the branch cannot be reached in simulation** (a fault the simulator cannot inject): exclude it, with the reason,
  at the human gate.

The MOP evaluated by simulation are computed on the same runs, and their values go into the report.

### 6. Functional chains

A functional chain shows, for one lifecycle scenario, the path inside the mission: stimulus → transition → functions
run → signals sent → next transition, until the observable response. It is the view that explains *how* the system
renders a service, and it is where the logical layer will cut the mission between components.

Chains are **generated, not drawn**:
- statically, from the state machine and the activities (who receives, which functions run, what they send);
- confirmed by the trace of the played scenario.

There is one chain per lifecycle scenario, shown in two ways:
- a generated activity diagram `Chain — <use case> — <scenario>`, made of accept, call and send actions in order and
  stereotyped «FunctionalChain». It is a picture, not simulated;
- a table in the report.

In the logical layer, the same chain is regenerated with one partition per component, so each crossing of a partition
is an exchange ([details](../../../method/details.md#fun-02)).

### 7. Trace and reconcile

Run the FN rules. Then set the links:
- `satisfy` from modes and functions to the requirements;
- each function traced to the lifecycle self-message it comes from.

## Rules

| Id | What must hold | Severity |
|---|---|---|
| FN-01 | Every external signal of the mission is the lifecycle signal element itself (same element, not a namesake) | error |
| FN-02 | Every signal received by the SoI in a lifecycle scenario is a trigger of the mission or an accept of a function | error |
| FN-03 | Every signal sent by the SoI in a lifecycle scenario is sent by a function | error |
| FN-04 | Every self-message of a lifecycle scenario is a function of the layer | error |
| FN-05 | The layer names no solution component (forbidden word list per project) | warning |
| FN-06 | No self-transition: reacting without changing mode is a do-activity reaction loop | error |
| FN-07 | No transition crosses a region | error |
| FN-08 | Every region has an initial state with one outgoing transition; no unreachable state; the state machine is the classifier behaviour of the block | error |
| FN-09 | Every mode that acts has its function as do-activity | warning |
| FN-10 | No text guard on a decision; decide on the type of the signal | error |
| FN-11 | Parallel flows join before the final node; every input pin is fed; an object flow links equal types | error |
| FN-12 | Every lifecycle scenario that verifies a "simulation" requirement has a functional scenario, and it passes | error |
| FN-13 | Every state, transition and decision branch is covered by at least one passing scenario, or excluded with a reason | error |
| FN-14 | Every "simulation" MOP is evaluated on at least one passing scenario and meets its target | warning |
| FN-15 | Every lifecycle scenario has its functional chain | warning |
| FN-16 | Published names of modes and functions are frozen: the logical layer, the scenarios and the guides find them by name | review |

## In the generator

```kotlin
override fun describe(view: ModelView) = functional(view, soi = "UAV") {
    val lc = view.lifecycle                                   // the lifecycle layer, read back
    val fp = lc.signal("FlightPlan")                          // reused: same element as the lifecycle exchange
    val ready = lc.signal("Ready for mission")
    val failed = lc.signal("FlightPlan Check Failed")

    service("Deployment") {
        function("Load Flight Plan", from = lc.selfMessage("Load Flight Plan")) {
            call("Read FlightPlan"); call("Check FlightPlan")
            decide(on = fp) {                                 // classified choice on the type of the plan received
                branch(lc.signal("FlightPlan Correct")) { sendSelf(ready) }
                branch(lc.signal("FlightPlan Incorrect")) { sendSelf(failed) }
            }
        }
    }
    mission {
        region {
            initial("Unconfigured")
            state("Configured", does = "Load Flight Plan")
            state("Ready for Mission")
            transition("Unconfigured", "Configured", on = fp)
            transition("Configured", "Ready for Mission", on = ready)
            transition("Configured", "Unconfigured", on = failed)
        }
    }
    satisfy(view.requirement("REQ-OP-01"), by = "Load Flight Plan")
}
```

At this layer the generator sends nothing on a port: `sendSelf` is the self-send of the functional layer. An existing
function that sends nothing is reused with `reuse("Acquire Flight Plan")`, instead of being described again. The
functional scenarios are `.scn` files, not Kotlin: they belong to the `mbse-scenarios` skill.
