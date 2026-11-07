# The scenario DSL

One statement per line. Indentation is free (indent for readability). `#` starts a comment line. Comments
before the first phase are kept by the printer. Names (states, signals, titles) are written as they are, with no quotes,
except a list of states that contains a comma: `"A, B"`.

## Header (description of the scenario)

| statement | role | compiled to |
|---|---|---|
| `scenario: <title>` | title shown everywhere | `title` |
| `id: <area>.<name>` | unique id, used by given/sequence/from and as the file name | `meta.id`, `<id>.scenario.json` |
| `kind: nominal \| alternative \| dysfunctional` | nature of the scenario | `meta.kind` |
| `version: 1.0` · `status: draft \| in use \| …` | life cycle | `meta` |
| `goal: <one sentence>` | what the scenario proves | `objective` |
| `description: <text>` | context, why it matters | `meta.description` |
| `author:` · `date:` · `tags: a, b` · `traces: REQ-1, UC-2` | bookkeeping, links to requirements or use cases | `meta` |
| `context: <block>` | the simulation context block played in Cameo | `context` |
| `cut: <block>` · `use case: <name>` | the block under test, the use case | `cut`, `useCase` |
| `settle: 2` · `timeout: 10` | seconds to wait after each signal, and the maximum wait for the expected states | `settle`, `timeout` |

`context`, `cut`, `use case` and `settle` are inherited from the first scenario of the chain that sets them. Set them
once, in the root scenario.

## Composition

| statement | meaning |
|---|---|
| `given: a, b` | preconditions. Each one is resolved with its own givens (depth first) and played once, as **setup** phases: played, waited for, **not measured**. If a precondition does not reach its states, the run stops (the scenario is not judged). |
| `assume <path> is [not] <states>` | extra states required at the end of the preconditions (checked on their last step). |
| `sequence: a, b, c` | an assembly: the scenarios in that order, **all measured**. Their givens already played earlier in the sequence are not replayed; a given that is missing from the sequence is played as a precondition, with a warning. |
| `from: a` | a variant: `a`'s preconditions and steps, changed by the operations below. Header fields not set are inherited. |
| `after <step>:` then steps | insert steps after step `<step>` of `a` |
| `before <step>:` then steps | insert before |
| `instead of <step>:` then steps | replace |
| `remove <step>` | delete the step |
| `cut after <step>` | drop everything after it |

`<step>` is the step id (`step bear: …` has the id `bear`). Step ids are unique within a chain.

## Model and observation

| statement | meaning |
|---|---|
| `system <path> "<label>" : <type>` | a part to observe: its path from the context (`soi.orch`), a label, its block type |
| `driver <path> "<label>" : <type>` | a part that sends signals (an external actor) |
| `never <path> is <states>` | must never be entered during the measured part |

Declare `system` and `driver` in the root scenario only. The compiler warns when a `then` names a path that
is not declared, or a step is sent by an undeclared driver. A block simulated alone (a functional mission
state machine) has no driver and uses the path `<root>`.

## Phases and steps

```
phase <name> [(setup)]
  goal: <what this phase achieves>
  reached <path> is <states>          # entered at least once during the phase, whatever the order
  step <id>: [<driver> sends] <signal>
    note: <what happens, in the words of the mission>
    then <path> is <s1>, <s2>         # all active after the step (parallel regions: several states)
    then <path> is not <s>            # not active after the step
    then message <name>               # this message is sent during the step (checked by the guide only)
    then no message <name>            # it is not
    fault: <what is broken>           # stated, not injected
    settle: 3                         # overrides the scenario settle for this step
    timeout: 20
```

A state is the simple name of the state (`Tracking Predator`), not its qualified name. A composite state and its
active sub-state are both active, and checking either one is valid.

Phases with the same name and kind that follow each other are merged in the compiled file (a chain of
preconditions in "Preparation" makes one setup phase "Preparation").

## Extensions the plugin ignores

`meta`, `id` on steps, `messages`/`noMessages`, `fault`, and `source` on phases (the scenario a phase comes from) are
written in the JSON for the viewer and the guide. The plugin reads the rest:
`title, objective, context, cut, useCase, settle, timeout, systems, drivers, never, phases[name, goal, setup, reached, steps[signal, into, note, expect, absent, settle, timeout]]`.

## API (scenarios/scenario-dsl.js, browser and Node)

`parse(text) → {doc, errors}`, `print(doc) → text`, `compile(id, library) → {json, plan, errors, warnings}`,
`fromJson(json) → doc` (an old JSON file as DSL, preconditions inline), `load([{path, text}]) → {docs, files}`.
To import an existing JSON file: open the viewer, click *Import JSON*, then cut it into units by hand (method.md).
