# Requirements: who needs what, what is in scope, what verifies it

Requirements are not a step done once at the start. They are set first (stakeholders, scope, stakeholder
requirements). Then every layer comes back to them when it ends, to **trace** what refines, satisfies and verifies
each requirement. The TP sets them aside ("Requirement — Not in this seminar"), yet it contains them everywhere, as
free text.

## Concepts

| Concept | Meaning |
|---|---|
| Stakeholder | who pays, operates, is affected, maintains or regulates; holds needs |
| Need | an expectation in the stakeholder's own words, without a solution |
| SoI | the system being designed; everything else is an actor, an external system, or out of scope |
| Stakeholder requirement | a verifiable "shall", taken from a need: id, text, kind, source, verification method |
| System requirement | derived by a layer (a function, a mode, an interface, a threshold turned into a signal) |
| MOE, MOP | the measures of the mission ([lifecycle.md](lifecycle.md), step 2); an MOP is fixed by a requirement |
| `refine` | use case or scenario → requirement (lifecycle) |
| `deriveReqt` | system requirement → stakeholder requirement |
| `satisfy` | function, state, component → requirement (functional, logical) |
| `verify` | scenario → requirement |

Requirement kinds: capability, exchange, performance, safety, constraint, environment. Verification methods:
simulation, analysis, test, inspection.

## Steps

### 1. Stakeholders and needs

**Purpose.** Know who you design for before knowing what.

**Reasoning.**
1. Read the customer specification and pick out every sentence that expresses an expectation.
2. Attach each expectation to a stakeholder. If an expectation has no owner, ask who holds it; do not invent one.
3. Rewrite each need without a solution: "detect at night", not "an infrared camera".

**Trap.** Part of the environment is not a stakeholder. The bear is not one: it is part of the environment, and it
will be an actor of the context.

### 2. SoI and scope — human gate

**Purpose.** Settle what is designed, what is in contact, and what is known but not designed.

**Reasoning.** The SoI fits in one sentence. Then list:
- the actors and external systems it exchanges with;
- what is out of scope, written explicitly.

An element that is sometimes designed and sometimes external is settled here, before any diagram.

**Examples.**
- Parts 1 to 3: the SoI is the drone, and the ground station is out of scope (*it talks to the drone, but you do
  not design it*).
- Part 4: the SoI widens to the whole solution (drones, base station, weather station). A new SoI is a new model.

### 3. Stakeholder requirements — human gate

**Reasoning.**
1. Write one requirement per expectation, as "The system shall…", with an id.
2. Give it a kind, a source (the need) and a verification method.
3. Write numeric thresholds as numbers: 1 km, 30 min, never "close" or "long".
4. If a requirement names a solution, split it in two: the capability ("detect at night") and a constraint
   ("infrared camera").
5. A need is not yet a requirement. *Follow a stray sheep without leaving the flock unguarded* becomes "REQ-SH-01
   follow a stray sheep until it is back" and "REQ-SH-02 while following, keep watching the rest of the flock".
6. Every MOP of the mission (lifecycle step 2) is fixed by a performance requirement. Create the requirement when it
   is missing.

### 4. Trace, at the end of every layer

At the end of the lifecycle, functional and logical layers, set the links of the layer, then run the REQ rules and
the trace checks of [traceability.md](traceability.md), which also compute the status of each requirement (open,
allocated, designed, verified, met, failed).
- An element without a requirement has two explanations: a requirement is missing, and you propose it; or the
  element is not needed.
- A requirement without verification calls for the scenario that verifies it, or for the method (analysis, test)
  that will.

## What the TP drone already contains

| Requirement, as it appears | Where | What it drives |
|---|---|---|
| *The operator shall transmit the flight plan to the ground station.* | Part 1, `m-fp-port` | an exchange of the context (lifecycle, step 5) |
| *If the flight plan is correct, the system shall also send "FlightPlan Correct"…* | Part 1, `d-notify` | one more send in `Load Flight Plan` (functional) |
| *If the flight plan loading fails, the system needs to send a "FlightPlan Check Failed".* | Part 1, `d-orchestrate` | an RD scenario (lifecycle), a failure branch (functional) |
| *Detect the animal in the dark* | Part 2, `requirements` 1 | a use case, and the IR camera as a constraint |
| *Alert and scare* within 1 km of the flock | Part 2, `requirements` 3 | a threshold that becomes an observation signal in the logical layer |
| *Follow a stray sheep without leaving the rest of the flock unguarded* | Part 4, `need` | parallel regions, then the swarm choice |
| Chain requirement → use case → function → subsystem | Part 1, `e-impact` | impact analysis, through the links of this layer |

## Rules

| Id | What must hold | Severity |
|---|---|---|
| REQ-01 | A requirement has an id, a "shall" text, a kind, a source and a verification method | error |
| REQ-02 | A requirement names no solution, except a constraint declared as such | warning (review) |
| REQ-03 | Every capability or exchange requirement is refined by at least one use case | error |
| REQ-04 | Every "simulation" requirement is verified by at least one lifecycle scenario and by one played simulation scenario (`verifies:` of a `.scn`) | error |
| REQ-05 | Every system requirement is satisfied by an element of the layer that derived it | warning |
| REQ-06 | The out-of-scope list is written | warning (review) |
| REQ-07 | Every MOP is fixed by a requirement | warning |

## In the generator

```kotlin
val rFp = requirement("REQ-OP-01", "The operator shall transmit the flight plan to the ground station.",
                      kind = EXCHANGE, verify = SIMULATION, source = "Mission operator: prepare the mission")
useCase("Parameter Mission", /* … */ refines = listOf(rFp)) { scenario(SD, "…", verifies = listOf(rFp)) { /* … */ } }
```

Requirements are declared in the generator of the first layer that uses them. The following layers read them by id
(`view.requirement("REQ-OP-01")`).
