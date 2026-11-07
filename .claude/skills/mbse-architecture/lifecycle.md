# Lifecycle layer (lifecycle architecture)

> **Vocabulary.** "Operational layer", "operational analysis", "lifecycle layer" and "lifecycle architecture" all name
> **this layer**. In the drone model it is the package `1 - Operational Analysis`. Do not confuse it with:
> - the **Execute phase** ("operation" in the narrow sense), which is only one of the eight phases this layer describes;
> - Arcadia's operational analysis, which describes the actors **without** the system: here that is step 4 (existing
>   environment);
> - the functional layer, which describes the inside of the SoI. This layer keeps the SoI a black box.

This layer looks at the SoI from the outside, as a black box, **over its whole life cycle**, not only while it
operates. It answers five questions:
- What is the mission for, and how do we measure that it succeeds?
- Which phases does the system go through, and which ones do we treat?
- In each phase, what does the system exchange, with whom, and which services does it render?
- How does each service unfold, when all goes well and when it does not?
- Which requirements does each service carry, and which scenario verifies them?

Inputs: the stakeholders, the scope and the stakeholder requirements ([requirements.md](requirements.md)), and the
existing model if there is one.

Outputs:
- the mission objectives and their measures (MOE, MOP);
- the phases;
- the context and its exchanges;
- the use cases, filed by phase;
- the requirement allocation;
- the scenarios.

A complete worked example, an automated metro, is in [examples/metro.md](examples/metro.md).

## The steps

| # | Step | Output | Human gate |
|---|---|---|---|
| 1 | Frame | SoI, out of scope, starting point | yes |
| 2 | Mission and its measures | end state, objectives, MOE, first MOP | yes |
| 3 | Lifecycle phases | the phases, which are treated and why | yes, with step 2 |
| 4 | Existing environment | what happens without the SoI | — |
| 5 | Context and exchanges | the exchange table | yes |
| 6 | Use cases, phase by phase | the use case table | — |
| 7 | Requirement allocation | the requirements × use cases matrix, MOP linked to requirements | yes, with step 6 |
| 8 | Scenarios of every use case | the SD / ALT / RD list, then the details | yes, on the list |
| 9 | Reconcile | the LC rules pass; every gap is fixed at its source | — |

Steps 5 to 9 loop. A scenario that reveals a missing exchange reopens step 5. A scenario without a requirement reopens
the requirements.

### 1. Frame

Ask three questions before anything else:
- What is the SoI?
- What touches it without being designed?
- Do we start from an existing model?

A vague answer is settled here. An element that is sometimes designed and sometimes external becomes another model
later.

### 2. The mission and its measures

**Purpose.** Know what success means before looking for services. This is ISO/IEC/IEEE 15288 mission analysis
(§6.4.1): the problem or opportunity, the desired end state, and how it will be measured.

**Reasoning.**
1. Write the **end state**, in one or two sentences: what is true when the mission has succeeded.
2. Write the **mission objectives**, at most five. Each is a result for a stakeholder, not a system feature.
3. For each objective, define one or two **MOE** (measures of effectiveness). An MOE is mission success seen by the
   stakeholder. It is independent of the solution. It has a definition, a unit and a target. *Share of predator
   intrusions deterred before they reach the flock, ≥ 95 %.*
4. For each MOE, find the **MOP** (measures of performance) that drive it. An MOP is a performance the system can be
   designed and tested for. *Time from detection to deterrence ≤ 10 s.* Most MOP become performance requirements at
   step 7.
5. For each measure, state **how it is evaluated**:
   - **simulation**: computed from the trace of a played scenario;
   - **analysis**: a calculation outside the behaviour model, such as endurance or covered area;
   - **test** or **inspection**: later, on the real system.

**Hypothesis on how measures live in the model.**
- **No parametric diagram by default.** A measure is a value property of the mission context, stereotyped as MOE or
  MOP. It carries its definition (doc), unit, target and phase, and is traced to its objective and its requirements.
- **The formula is code.** An evaluator computes a simulation measure from the trace of a scenario. It reads which
  states were reached, in what order, and which signals were sent, and how many times. Its result goes to the
  scenario report.
- **A parametric diagram is used only for an analysis measure** that is a real equation, such as an energy budget or
  an endurance figure. It is never used for the measures a scenario can show.

**Decision tables.**

| Objective | MOE | Definition | Unit | Target | Evaluated by |
|---|---|---|---|---|---|

| MOP | Drives MOE | Definition | Unit | Target | Evaluated by | Becomes requirement |
|---|---|---|---|---|---|---|

### 3. The lifecycle phases

The phases split the life of the system, and they guide the search for use cases. Each phase has its own actors,
exchanges and services. A use case belongs to **exactly one phase**.

The reference phases are the mission phases, as described in three sources:
- mission analysis in [ISO/IEC/IEEE 15288](https://www.iso.org/standard/81702.html), §6.4.1 (*business or mission
  analysis*) and §6.4.2 (*stakeholder needs and requirements definition*);
- its application in the [INCOSE Systems Engineering Handbook](https://www.incose.org/publications/se-handbook-5th-edition);
- the concept of operations document ([ISO/IEC/IEEE 29148](https://standards.ieee.org/ieee/29148/6937/),
  ANSI/AIAA G-043).

They match US military doctrine: *plan, prepare, execute, assess* (ADP 5-0) and *deployment, employment, sustainment,
redeployment* (JP 3-35). *Supervise* is the command and control of the system while it operates (an operations centre
watching and ordering it); it runs during Execute and is a phase of its own because its actors and exchanges differ.

| # | Phase | Covers | Question that finds the use cases | TP drone |
|---|---|---|---|---|
| 1 | **Plan** | mission analysis, desired end state, organisation of operations | Who defines the mission, with which data (zone, objectives, constraints)? | *Plan Mission* (package *0. Planning Phase*) |
| 2 | **Prepare** | rehearsals, logistic checks, pre-mission configuration | What must be loaded, configured, checked before leaving? Who declares the system ready? | *Prepare Mission*, *Parameter Mission* (*1. Preparation phase*) |
| 3 | **Deploy** | moving the system to its theatre, entry into service | How does it reach its area and take its post: launch, transit, set-up? | missing from the diagram, although the functional mission has `Undeployed` → `Deployed` and *Going to Safe Area* |
| 4 | **Execute** (*employ*) | carrying out the mission, operational use | Which services does it render on mission, nominal and degraded? | *Surveillance of Sheep in a "safe zone" area*, *Monitor system and mission* (*3. Operation phase*) |
| 5 | **Supervise** | command and control of the system in operation by its operators: status, regulation orders, alarms | Who watches the system while it works, what can they order it, what alarms reach them? | (metro: *Regulate the service*, *Handle a passenger alarm*) |
| 6 | **Sustain** | operational readiness, logistics, maintenance, flow management | What keeps it in working order, during or between missions: charging, maintenance, updates? | missing |
| 7 | **Undeploy** (*redeploy*) | end of mission, return, recovery, shutdown, reconditioning | How does it leave service, and in what state does it hand itself back? | missing |
| 8 | **Assess** | tracking of performance (MOP, MOE), after action review | How do we know the mission succeeded: data retrieved, measures against objectives, debriefing? | missing |

Undeploy mirrors Deploy, often with the same actors and the exchanges reversed. It is a phase of its own because it is
easily forgotten. Return, recovery and shutdown have their own requirements, such as not returning with passengers on
board. The drone model numbers its packages from 0: its phases 0, 1 and 3 are phases 1, 2 and 4 here.

For each phase, decide **treated** or **not treated**, and write the reason. A phase that is not treated stays in the
list. What it would require from the system, such as a data download port or a maintenance mode, is easily forgotten
elsewhere, and the list is the reminder.

The life cycle of the **system** is wider than the mission's. Production, installation, qualification and final
disposal (the 15288 stages) are out of scope by default. Declare them as such, or add them as phases when the customer
asks for it. Phases can overlap: Sustain and Assess run during Execute.

**Decision table.**

| # | Phase | Treated? | Why | Actors of the phase |
|---|---|---|---|---|

### 4. The existing environment

Describe what happens **without** the SoI: the entities, what they do, what they exchange. The gap the SoI fills points
at the exchanges it will take over. Keep this step short.

### 5. The context and its exchanges

For each actor or external system of the treated phases, ask what it gives the SoI and what it receives from it. Four
rules guide the answer:
- one kind of exchange is one connection;
- the contract is written on the sending side;
- existing signals are reused;
- an exchange goes through the real physical element. If the train cannot talk to the platform doors without the
  wayside, the exchange goes through the wayside.

**One context per phase.** The SoI does not meet the same partners in every phase: in the depot it deals with depot
control and maintenance, on the line with the wayside, the doors and the passengers. Each phase that has its own
partners gets its own context (`<SoI> <Phase> Context`, one IBD each), holding only the participants and exchanges of
that phase. An exchange used in several phases is listed in each. Phases without a context of their own share the
default context (`<SoI> Context`). A use case is checked against the context of its phase: a maintainer who only acts
in support has no place in the operation context.

Give each participant a picture (an icon file): the context IBDs and use case diagrams show it at a readable size.

**Decision table.**

| From | To | Signal | Through (connection, physical element) | Phase(s) | Requirement |
|---|---|---|---|---|---|

### 6. Use cases, phase by phase

For each treated phase, take its question (step 3) and list the services the system renders. A use case meets four
conditions:
- it is named with a verb and an object, from the actor's point of view;
- it has an observable objective;
- its actors are participants of the context, and only those;
- it belongs to one phase.

Two relations between use cases are allowed:
- `include` for a common, mandatory part (*Prepare Mission* includes *Parameter Mission*);
- `extend` for a second service of value grafted onto a first one, at an extension point.

Never use a relation for an "if / then": that logic belongs to the scenarios.

**Decision table.**

| Phase | Use case | Objective | Actors | Includes / extends |
|---|---|---|---|---|

### 7. Requirement allocation

Every capability or exchange requirement is **refined** by at least one use case, and every use case refines at
least one requirement. Read the matrix both ways:
- an empty row is a requirement that no service carries: a use case is missing, or the requirement is out of scope;
- an empty column is a service that nothing asks for: a requirement is missing, or the service is not needed.

A requirement carried by several use cases ("never exceed the movement authority") is often a cross-cutting
constraint. Keep it that way, do not duplicate it.

Each MOP from step 2 is linked to the requirement that fixes its target. The requirement is created if it does not
exist yet.

**Decision table: the matrix.**

| Requirement | UC-1 | UC-2 | … | MOP | Verified by (scenarios) |
|---|---|---|---|---|---|
| REQ-… | ● | | | MOP-… | SD 1, RD 1 |

The last column is filled at step 8.

### 8. The scenarios of every use case

Every use case has **several** scenarios. List **all** of them, for **all** use cases, before detailing any.

1. Reread the use case: its objective, its actors, its requirements, its exchanges in the context.
2. Write the **nominal** scenario (SD) as "who does what" sentences. Each sentence is either an exchange between two
   participants or an internal action of the SoI.
3. For each sentence of the nominal, ask the extension questions:
   - Is the input missing, invalid, or late?
   - Does the actor do something else?
   - Does the SoI fail?

   Every answer other than "nothing" is a scenario. It is an **ALT** when the objective is still reached. Otherwise it
   is an **RD**: the system goes to a safe state and reports.
4. **Gate**: have the list of scenarios validated for all use cases, each with a title, a kind and one line. Write
   down the absence of an ALT or an RD, with its reason.
5. Detail each scenario as messages. An exchange becomes a message carrying a signal. An internal action becomes a
   self-message named after the function. An ALT or an RD reuses the nominal up to the point where it diverges; it
   does not copy it.
6. Link each scenario to the requirements it verifies, and to the MOP it lets us measure. An RD that no requirement
   covers reveals a missing requirement: propose it.

**Environment conditions** (night, rain, wind, peak load). A condition that changes how a use case unfolds gives an
ALT or an RD, written `under = "night"`. A condition that changes nothing is listed on the use case, and the nominal is
replayed under it. In simulation, a condition is a precondition scenario (`given: env.night`) that sends the driver
signal setting it ([details](../../../method/details.md#lcy-05)).

Three guides for writing scenarios:
- One scenario tells one story. A text that needs "otherwise" is two scenarios.
- Participants are chosen among the actors of the use case.
- A threshold ("within 1 km") is an observable event: it becomes a message.

**Decision table: the scenario list.**

| Use case | Kind | Scenario | What happens | Verifies | Measures |
|---|---|---|---|---|---|

### 9. Reconcile

Run the LC rules, then fix each gap at its source:

| Finding | Possible cause | Where to fix |
|---|---|---|
| message without an exchange | the context is incomplete, or the message is wrong | step 5, or the scenario |
| unused exchange | a scenario is missing, or the exchange is not needed | step 8, or step 5 |
| requirement without a use case | a use case is missing, or the requirement is out of scope | step 6, or the requirements |
| RD without a requirement | a requirement is missing | the requirements |
| treated phase without a use case | — | step 6 |
| MOE without an MOP, or MOP without a requirement | the measure chain is broken | step 2 or step 7 |

## Rules

`uc(s)` is the use case of a scenario, `actors(uc)` its actors, and `lifelines(s)` the participants of a scenario.

| Id | What must hold | Severity |
|---|---|---|
| LC-01 | Every reference phase is declared treated or not treated, with a reason | error |
| LC-02 | Every treated phase has at least one use case; every use case belongs to exactly one phase | error |
| LC-03 | Every actor of a use case is a participant of the context | error |
| LC-04 | Every participant connected to the SoI in a context is an actor of at least one use case of a phase that context serves | warning |
| LC-05 | Every use case has the SoI as subject and at least one actor | error |
| LC-06 | Every capability or exchange requirement is refined by at least one use case | error |
| LC-07 | Every use case refines at least one requirement | warning |
| LC-08 | `lifelines(s) ⊆ {SoI} ∪ actors(uc(s))` | error |
| LC-09 | Every actor of a use case appears in at least one of its scenarios | warning |
| LC-10 | Every use case has an SD; ALT and RD exist, or their absence is justified | error |
| LC-11 | Every message from A to B carries a signal S, and the context of its use case's phase has an exchange from A to B that carries S. The exchange may be more general than the message, never the reverse. A direct message without a direct connection is an error, even when an indirect path exists | error |
| LC-12 | Every exchange of a context is used by at least one message of a phase that context serves | warning |
| LC-13 | A connection has an interface that declares each carried signal, in the right direction on both sides | error (form) |
| LC-14 | No two signals share a name | error |
| LC-15 | The SoI is not decomposed in a scenario; a self-message is on the SoI only and names a function | error |
| LC-16 | Every scenario verifies at least one requirement; every "simulation" requirement is verified by at least one scenario | warning |
| LC-17 | Every RD is linked to a requirement that says what the system must do on failure | warning |
| LC-18 | The mission has an end state and objectives; every objective has at least one MOE | error |
| LC-19 | Every MOE has a definition, a unit, a target and an evaluation method, and is driven by at least one MOP | error |
| LC-20 | Every MOP is linked to a requirement that fixes its target; every "simulation" MOP is measured by at least one scenario | warning |
| LC-21 | Every condition named by an environment requirement is covered by at least one scenario under that condition | warning |
| LC-22 | Every actor of a use case exchanges with the SoI in the context of the use case's phase | warning |
| LC-23 | Every signal of the layer is carried by at least one exchange | warning |

## In the generator

```kotlin
override fun describe(view: ModelView) = lifecycle(view) {
    val uav = soi("UAV", image = "icons/uav.svg")               // a resource of the generator jar, or a path
    val operator = actor("Mission Operator"); val gs = actor("Ground Station")
    val fp = signal("FlightPlan"); val wifi = signal("Wifi_FlightPlan"); val ready = signal("Ready for mission")
    val r1 = view.requirement("REQ-OP-01")

    mission(endState = "The flock spent the grazing period without loss, and the shepherd knows what happened.") {
        val ready90 = moe("MOE-1", "Missions ready to start on the first flight plan sent", unit = "%", target = ">= 90",
                          evaluatedBy = SIMULATION)
        mop("MOP-1", "Flight plans accepted on first sending", unit = "%", target = ">= 90", drives = ready90,
            requirement = r1, measure = reached(state = "Ready for Mission", within = scenarioSteps(4)))
    }
    phases {
        treated(PLAN, PREPARE, EXECUTE)
        notTreated(DEPLOY, SUPERVISE, UNDEPLOY, SUSTAIN, ASSESS, because = "outside the seminar")
    }
    // context(PHASE, …) { … } for a phase with partners of its own; context { … } is the default one
    context(PREPARE) { flow(fp, from = operator, to = gs); flow(wifi, from = gs, to = uav); flow(ready, from = uav, to = gs) }

    phase(PREPARE) {
        useCase("Parameter Mission", subject = uav, actors = listOf(operator, gs), refines = listOf(r1),
                objective = "The UAV holds the flight plan chosen by the operator.") {
            val sd = scenario(SD, "Loading the flight plan", verifies = listOf(r1)) {
                msg(operator, gs, fp); msg(gs, uav, wifi); self(uav, "Load Flight Plan"); msg(uav, gs, ready)
            }
            scenario(RD, "Flight plan check failed", verifies = listOf(view.requirement("REQ-OP-02"))) {
                given(sd, upTo = 3)                       // diverges after "Load Flight Plan"
                msg(uav, gs, signal("FlightPlan Check Failed"))
            }
            absent(ALT, because = "the plan arrives in a single exchange; no other path reaches the objective")
        }
    }
}
```

The phases become the use case packages `1. Plan` … `8. Assess`. Existing models are read by package name, not
number, so the drone's `0. Planning Phase`, `1. Preparation phase` and `3. Operation phase` map without renaming
([details](../../../method/details.md#lcy-04)). MOE are «moe» properties (MagicGrid profile), and MOP are «mop»
properties (MBSE Shepherd profile) ([details](../../../method/details.md#meas-02)). The matrix has no block of its own.
Each `refines` of a use case is a column, and rule LC-06 checks that no row is empty.
