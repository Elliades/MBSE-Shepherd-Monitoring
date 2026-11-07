# Deriving a set of scenarios

The goal is not the most scenarios. It is a small library where every scenario says one thing, together they cover
the state machines, and a failure points at one place in the architecture.

## 1. Read the state machines as a test engineer

For each part (and for the functional mission, if there is one), list:
- the states, and the **initial** one;
- every transition: `source --signal [guard] / effect--> target`, and the signals each effect **sends** (to
  whom, through which port);
- the signals that come from outside (drivers) and the ones that are internal (sent from part to part).

A scenario only sends signals from drivers. Internal signals are the architecture's job, and seeing their
effect on the other parts is precisely what is tested.

## 2. The nominal backbone, cut into units

Write the mission as the intended story (the use case), as a list of external signals. Cut it where the system
reaches a **stable, meaningful situation**, a moment someone would name: *powered on*, *plan accepted*,
*mission started*, *sheep out*, *bear in*, *bear gone*. Each cut is a unit scenario:

- `given:` the unit just before it. The first unit declares `context`, `cut`, `settle`, the `system`s and the `driver`s;
- one phase, a few steps (1 to 4). Each step checks the parts the signal is supposed to move, and the parts it must
  not move (`is not`) when there is a real risk;
- `kind: nominal`, `goal:` one sentence on what this moment proves.

Then one assembly: `id: <area>.full`, `sequence:` all the nominal units in order. It is the end-to-end mission, measured
everywhere.

Several branches of the story that start from the same moment (sheep out, bear in) are units that share the same
`given`, not a chain. Chain them only when one really needs the other.

## 3. Alternatives: the other legitimate paths

From every state the backbone reaches, look at the transitions it does **not** take:
- a refusal or an error path the design plans for (wrong flight plan → `Unconfigured`): `kind: alternative`, `given:` the unit
  where that state is reached;
- the same events in another order or repeated (bear seen twice, start before the plan): `from:` the nominal unit
  with `after`/`before`, or `given:` + a new step;
- the expected outcome: the transition taken, or **nothing changes** when no transition exists (then check the
  previous states again and add `is not` for the states that would betray a wrong takeover).

The coverage of a run (evaluate.md) lists these branches for you: *branches not taken*, each with the phase after which
it becomes reachable.

## 4. Dysfunctional: what goes wrong

Kinds of faults, and how to write them when the simulator cannot break a connector:
| fault | how to write it |
|---|---|
| a signal is lost (link down, part silent) | `from:` the unit, `instead of`/`remove` the step, `fault: <what is broken>`, then check the system did **not** react, or reacted by its own fallback (timeout, degraded state) |
| an unexpected or late event | a new step with the event at the wrong moment |
| a wrong value | the "incorrect" signal variant, if the model has one |
| a part fails | the failure signal, if the model has one (crash, battery low…) |

`kind: dysfunctional`, `tags: robustness` or `safety`, and a `note` that says what the real fault would be. If the model
has no way to express the fault, write the scenario anyway with `status: draft`: it documents a missing behaviour.

## 5. Checklist before playing

- [ ] each scenario has one `goal` and the steps prove it, no more;
- [ ] no step copied from another scenario: preconditions through `given`, variants through `from`;
- [ ] every step has at least one `then`; key steps check what must **not** happen;
- [ ] names copied from the state machines, `--check` with 0 errors and no warnings;
- [ ] `kind`, `status`, `version` honest (anything not yet run: `draft`, `0.x`);
- [ ] the whole nominal story exists as one `sequence`.

## Anti-patterns

- **The monolith**: one scenario of 15 steps that tests everything. A failure at step 9 hides steps 10 to 15. Cut it.
- **The silent step**: a signal with no `then`. It moves the story but proves nothing. If it is only there to set things
  up, it belongs in a precondition.
- **Checking only the obvious part**: the bear arrives and you check only Predator Defense. The point of a logical
  architecture is the coordination: check the orchestrator and the autopilot too.
- **Copying the observed states into the expectation** after a FAIL, to make it pass. The expectation comes from the
  intended behaviour (requirements, functional state machine), not from what the model happens to do.
- **Precondition drift**: a unit that also tests what its precondition already tests. Test it once, where it happens.
