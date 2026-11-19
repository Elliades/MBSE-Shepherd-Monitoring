# Traceability: is every requirement carried, satisfied and verified, and did the choices serve the measures?

Each layer sets its own links while it is generated. This sheet **checks the whole chain** across the layers:
- **down**: every need reaches a component, and every scenario reaches a played simulation;
- **up**: every component, function and mode is justified by something above it;
- **requirement status**: for each requirement, whether it is refined, satisfied, verified, and met;
- **trade-offs**: whether the MOE and MOP actually weighed in the choices, and whether the built architecture keeps
  the promises of the trade-off.

Run it at every layer end, as the last check before the gate. Run it again on the whole model before delivery.

## The trace graph

Every arrow is a SysML v1 relation set by a generator, or by a derivation of the library. Nothing is traced by hand.

| From | To | Relation | Set by | Layer |
|---|---|---|---|---|
| stakeholder requirement | need (source) | `«trace»` | requirements generator | requirements |
| system requirement | stakeholder requirement | `«deriveReqt»` | the layer that derives it | any |
| MOE | mission objective | `«trace»` | lifecycle generator, step 2 | lifecycle |
| MOP | MOE it drives | `«trace»` | lifecycle generator, step 2 | lifecycle |
| MOP | requirement that fixes its target | `«refine»` | lifecycle generator, step 7 | lifecycle |
| use case | requirement | `«refine»` | lifecycle generator, step 7 | lifecycle |
| lifecycle scenario | requirement | `«verify»` | lifecycle generator, step 8 | lifecycle |
| lifecycle scenario | MOP it lets us measure | `«trace»` | lifecycle generator, step 8 | lifecycle |
| mission signal | lifecycle exchange | same element (reuse) | functional generator | functional |
| function | lifecycle self-message | `«trace»` | functional generator | functional |
| mode, function | requirement | `«satisfy»` | functional generator | functional |
| functional scenario (`.scn`) | lifecycle scenario, requirement | `refines:` field, `verifies:` → `«verify»` | scenario build | functional |
| functional activity | component | `«allocate»` | Logical Transition | logical |
| logical state, logical function | functional state, functional function | `«refine»` | Logical Transition | logical |
| component | requirement | `«satisfy»` | logical generator | logical |
| SoI boundary port | lifecycle exchange | same signal elements (LG-17) | derivation | logical |
| white-box scenario | functional scenario, requirement | replays it; `verifies:` → `«verify»` | scenario build | logical |
| trade-off criterion | MOE or MOP | `«trace»` | logical generator, step 4 | logical |
| trade-off | chosen architecture | `«trace»` + rationale | logical generator, step 4 | logical |

## Checks

### Down: every element reaches the next layer

| Id | What must hold | Severity |
|---|---|---|
| TR-01 | Every stakeholder requirement of kind capability or exchange is refined by a use case (LC-06) | error |
| TR-02 | Every self-message of a lifecycle scenario is a function (FN-04) | error |
| TR-03 | Every lifecycle scenario that verifies a "simulation" requirement has a functional scenario (FN-12) | error |
| TR-04 | Every mission mode and every region is held by a component (LG-15) | error |
| TR-05 | Every functional activity is allocated to a component (LG-14) | warning |
| TR-06 | Every functional scenario is replayed in white box on the logical architecture (LG-22) | error |
| TR-07 | Every lifecycle exchange reaches the SoI boundary of the logical layer, and nothing else crosses it (LG-17) | error |

### Completeness: what the next layer takes over

The validator counts, at each transition, how much of a layer the next one uses (section *Completeness* of the
report): lifecycle exchanges played by a scenario and messages carried by an exchange, actors connected in their
phase's context, lifecycle signals taken or sent by the mission, self-messages that are functions, then mission
signals, mission states and service functions taken over by the logical layer.

| Id | What must hold | Severity |
|---|---|---|
| TR-20 | Every lifecycle signal across the SoI boundary is taken (into the SoI) or sent (out of it) by the functional layer | warning |
| TR-21 | Every signal of the functional mission is sent or taken by a logical component | warning |
| TR-22 | Every service function is refined by a logical function | warning |

`arch.sh <id> trace` (MCP `arch/trace`) runs these checks on **the model as Cameo holds it**: each layer of the
generator's family is read back from its package (hand edits included), and the profile `consistency` (every rule
that needs neither runs nor coverage) checks each layer in itself and against the next.

### Up: every element is justified

| Id | What must hold | Severity |
|---|---|---|
| TR-08 | Every use case refines a requirement (LC-07) | warning |
| TR-09 | Every function traces to a lifecycle self-message, or satisfies a requirement; otherwise it is a technical function filed under the service it helps | warning |
| TR-10 | Every logical state and function refines its functional source (LG-14, LG-24) | error |
| TR-11 | Every component satisfies at least one requirement, directly or through the functions allocated to it | warning |
| TR-12 | Every system requirement derives from a stakeholder requirement | warning |
| TR-13 | No trace points to a deleted or renamed element (dangling link) | error |

### Requirement status

The status of each requirement is computed from the graph and from the latest scenario runs:

| Status | Condition |
|---|---|
| **open** | not refined by any use case |
| **allocated** | refined by a use case; no `satisfy` yet in the current layer |
| **designed** | satisfied in the functional layer and, when it exists, the logical layer |
| **verified** | designed, and verified by at least one **passing** scenario in each simulated layer; for test, analysis or inspection, the method is recorded |
| **met** | verified, and every MOP that refines it is evaluated and meets its target |
| **failed** | a scenario that verifies it fails, or one of its MOP misses its target |

| Id | What must hold | Severity |
|---|---|---|
| TR-14 | At delivery, every requirement is **met**, or **verified** with a pending method (test, analysis, inspection), or listed with the reason it is not | error |
| TR-15 | A **failed** requirement blocks the gate of the layer where it fails | error |

### Trade-offs

A trade-off is recorded, not just discussed. It holds four things:
- the criteria, each traced to an MOE or an MOP, or marked qualitative (a TP axis such as "rules in one place");
- the weights;
- the score of each candidate on each criterion, with its evidence (a measure on the signal table, an estimate with
  its method, or a simulation value);
- the choice, with its rationale.

| Id | What must hold | Severity |
|---|---|---|
| TR-16 | Every MOE and MOP that the choice can affect is a criterion of the trade-off, or is declared unaffected with a reason | error |
| TR-17 | Every criterion traced to an MOP has, for each candidate, an evidence with its method; a bare score is not enough | warning |
| TR-18 | The trade-off records the chosen candidate and its rationale, and is traced to the built architecture | error |
| TR-19 | After the build, the MOP measured on the chosen architecture agree with the trade-off estimates; a large gap reopens the trade-off | warning |

### Impact analysis

From any element, the graph is read both ways:
- **down**: which use cases, scenarios, functions and components a requirement drives;
- **up**: which requirements, use cases and MOE a component serves.

This is the Part 1 `e-impact` exercise, computed instead of drawn. It is the first thing to run before changing a
requirement or removing a component.

## Report

The trace report is part of the delivery report ([SKILL.md](SKILL.md)). It contains:
1. the requirement table: id, status, refined by, satisfied by (per layer), verified by (scenario and verdict), MOP and
   their values;
2. the matrices: requirements × use cases, functions × components, lifecycle scenarios × functional and white-box
   scenarios;
3. the elements without justification (up checks) and the elements that go nowhere (down checks);
4. the trade-off audit: criteria × MOE/MOP, evidence, choice, and the gap between estimates and measured values.

## In the generator

The links are set by the layers. The only new block is the trade-off, in the logical generator. In the model it
becomes a MagicGrid «objectiveFunction» block with one instance per candidate
([details](../../../method/details.md#trc-04)):

```kotlin
tradeoff("Logical architecture", candidates = listOf("Feature orchestrator", "Decentralised patch", "Central hub")) {
    criterion("Time from detection to deterrence", measure = view.mop("MOP-3"), weight = 3) {
        score("Feature orchestrator", 2, evidence = chainLength(4, method = "signal table"))
        score("Decentralised patch", 3, evidence = chainLength(2, method = "signal table"))
        score("Central hub", 1, evidence = chainLength(6, method = "signal table"))
    }
    criterion("Rules in one place", qualitative = true, weight = 2) { /* … */ }
    unaffected(view.moe("MOE-2"), because = "punctuality does not depend on where the decision is taken")
    choose("Feature orchestrator", because = "…")
}
```

These checks run inside the **validator** (profiles `trace`, `gate:…` and `delivery`), called from MCP
(`arch/validate`), from the Cameo validation suite *MBSE Shepherd method*, from `arch.sh … validate`, or from the
`mbse-report` side service on an exported model ([method/implementation.md](../../../method/implementation.md#the-validator)).
