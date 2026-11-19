# Testing an architecture

An architecture is judged at several levels, from the cheapest to the most expensive. Each level catches what the
previous one cannot see. Move to the next level only when the previous one is green.

| # | Level | What it catches | Tool |
|---|---|---|---|
| 1 | Compilation | API misused, lost reference | Gradle (`arch.sh … plan`) |
| 2 | Rules on the description | inconsistent decisions: message without exchange, mode without owner, signal in both directions | `arch/plan`, before any write |
| 3 | Idempotence | a generator or a library that drifts | a second `plan` after `apply` gives 0 changes |
| 4 | Rules on the model read back + plugin checks | encoding gaps, routes, ports | `arch/check`, `signalFlowCheck`, `validation/active` |
| 5 | Simulation | behaviour: the right reaction, in the right component, at the right time | `.scn` scenarios, skill `mbse-scenarios` |
| 6 | Branch coverage | what no scenario exercised | panel coverage: states never reached, transitions not fired, decision branches not taken; target 100 % or justified exclusions |
| 7 | Measures | MOP off target | evaluators on the scenario traces |
| 8 | Requirements | what nothing verifies | rule REQ-04: a "simulation" requirement without a played scenario |

Levels 2, 4, 6, 7 and 8 are run together by the **validator** (`arch.sh <id> validate`, profiles `gate:…` and
`delivery`), which reads the latest scenario reports for the levels that need them.

## Where the simulation scenarios come from

This is the bridge between the method and the `mbse-scenarios` skill. **Expectations come from the lifecycle layer and
the requirements, never from the generated model.**

| Lifecycle scenario | Simulation scenario (`.scn`) |
|---|---|
| `[SD n]` | `kind: nominal` |
| `[ALT n]` | `kind: alternative` |
| `[RD n]` | `kind: dysfunctional` |
| message from an actor to the SoI | a step: the driver (`operator`, `pasture`…) sends the signal |
| message from the SoI to an actor | what the SoI must produce; checked through the state that comes with it, because the panel does not see messages |
| self-message | the mode in which that function runs |
| `verifies`, `measures` | `verifies:` of the `.scn`, and the MOP evaluated on its trace |

Every lifecycle scenario that verifies a "simulation" requirement gives one `.scn` per simulated layer:
- **functional, black box**: one system, the mission, and its modes are checked;
- **logical, white box**: check the parts that must move **and those that must not** (`is not`, `never`). The
  coordination between components is what is tested.

For the logical layer, also write one scenario per build slice (logical.md, step 8), chained with `given`.

## Coverage: every branch

After a run, the panel lists the states never reached and the branches not taken, each with the phase after which it
becomes reachable. Treat each one:
- **write the missing scenario**: usually an ALT or an RD, and add it to the lifecycle layer too;
- **remove a dead branch** from the model, through the generator;
- **exclude a branch the simulator cannot reach**, such as a fault it cannot inject. Write the reason, and have it
  validated at the gate.

The layer is not done while a branch is neither covered nor excluded (rule FN-13).

## The process

It follows the `mbse-scenarios` skill, which you load for this step:
1. Gather the exact names: parts, states, signals, drivers, simulation context. Use `arch/read` or
   `analysis/behaviorDigest`.
2. Plan the tree:
   - the nominal thread cut into unit scenarios, plus the `full` assembly;
   - the alternatives: the transitions the nominal does not take;
   - the dysfunctional ones: lost signal, unexpected event, wrong value.
3. Write the `.scn` files, then run `node scripts/scenarios-run.mjs <files> --check`. Expect 0 errors, and read every
   warning.
4. Play: `node scripts/scenarios-run.mjs <ids> --report out.json`.
5. Judge each failure with the table in `evaluate.md` (skill `mbse-scenarios`): is the scenario wrong, or the
   architecture?
   - If the architecture is wrong, fix the generator or the decision table.
   - If the scenario is wrong, fix it only when its expectation contradicted the lifecycle layer.
6. Turn the coverage into scenarios, removals or justified exclusions.
7. Evaluate the simulation MOP on the passing runs, and report their values against the targets.

## What we do not do

- Copy the observed states into the expectations to make a scenario pass.
- Conclude that "the architecture is right" from a PASS: a PASS shows one trace. Say what the coverage did not reach.
- Blame the architecture when a precondition (`given`) fails: play the precondition alone and fix it first.
- Trust an odd simulation after several hot reloads: restart Cameo, then play again.
