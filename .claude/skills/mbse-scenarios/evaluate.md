# Playing scenarios and judging the architecture

## Prerequisites

MagicDraw/Cameo open with the MBSE Shepherd plugin, and **the model that holds the scenario's `context` block
loaded**. The plugin answers on `http://127.0.0.1:9851/mcp` (override with the environment variable `MBSE_MCP`).
The runner checks that a project is ready and stops with exit code 3 if not. Never save the project without the user's agreement.

## The runner

```bash
node scripts/scenarios-run.mjs <id | file.scn | dir> ... [--check] [--report out.json] [--no-coverage] [--timeout 600]
```

- Targets: library ids (`arch1.bear-enters`), or `.scn` files and directories outside the library (drafts). A file given on
  the command line wins over a library scenario of the same id. Its `given`/`from` can point at library scenarios.
- It compiles each target, writes the JSON (system temp dir, or `--out`), plays it in the Cameo panel (the tab fills
  live), and prints:
  - the verdict: `PASS`, `FAIL`, `STALLED` (the simulation never started: wrong context or model), or `TIMEOUT`;
  - for each failed step: `path: expected in "S"; observed: A, B`;
  - the failed `reached` and `never` checks;
  - the coverage: states reached/total, transitions traversed/total, the states never reached per part, and the
    **branches not taken** (`[kind] path: from --signal--> to (reachable after phase …)`).
- `--report` writes the full results as JSON: per step, the states observed (`states`) and the states entered in order
  (`entered`).
- Exit codes: 0 all PASS · 1 a FAIL · 2 a compile error · 3 Cameo not reachable / no project.

The same calls work directly over HTTP, for a client without Node: `POST {BASE}/scenario/run` with the body
`["<absolute path of the .scenario.json>"]`, then `POST {BASE}/scenario/status` with the same body until `done: true`,
then `scenario/coverage` and `scenario/report` (Markdown). Other useful calls: `model/getElementsByName ["Block name"]`,
then `analysis/behaviorDigest [{"elementId": "<id>"}]` gives a block's state machine as text.
`simtest/start · send · states · trace · stop` drive a simulation step by step.

## Reading a failure: the scenario or the architecture?

For each failed check, compare the expected state with what was observed and with what was entered during the step (`entered`):

| observation | likely cause | what to do |
|---|---|---|
| a precondition fails (setup phase not PASS) | the chain is broken before your scenario | play the precondition alone, fix it first; your scenario is not judged |
| `observed: (not observed)` | wrong path, or the part is not in the context | fix the `system` path (check the warnings) |
| the expected state does not exist in the state machine | a typo, or an invented name | fix the scenario |
| nothing moved anywhere | the signal is not received: a driver port is missing, the wrong `into`, or the signal name differs | `analysis/signalFlowCheck`, `analysis/traceSignal`; architecture defect if the port or connector is missing |
| the receiving part moved, the others did not | an internal signal is not sent or not routed (missing send in an effect, missing port or connector) | **architecture defect**: point at the transition and the missing link |
| the part went through the state (`entered`) but left it | the scenario checks too late, or a completion transition follows | check the later state or use `reached` |
| a `never` state was entered | a wrong or missing guard, or a race between parts | **architecture defect**, unless the requirement allows it |
| a different but sensible state | the scenario's expectation is wrong, or the requirement is ambiguous | do **not** copy the observed state: go back to the intended behaviour and decide; say which |

Report each FAIL as: *step → expected → observed → cause (scenario/architecture) → proposed fix*.

## Coverage: what to write next

- A state **never reached** in any scenario is untested. Either it can be reached through a branch not taken (write the
  alternative or dysfunctional scenario), or it cannot be reached at all (a dead state: an architecture defect, or a
  missing driver signal).
- Each **branch not taken** is a candidate scenario: `given:` the unit that ends at the phase it is reachable after, one
  step with the branch's signal, and `then <path> is <to>`. Decide its `kind` from what the branch means.
- Play the whole library to compute the coverage (one report per scenario). The union of what is reached is the coverage of the library.

## Judging the architecture (what to conclude)

Give, in this order:
1. the nominal assembly: PASS or not. If not, the first unit that fails, and why;
2. alternatives and dysfunctional scenarios: which pass and which fail, grouped by cause;
3. coverage: states and transitions covered, dead states, branches still not taken;
4. the defects found in the architecture (missing port, connector, send, guard), each with the scenario that shows it;
5. the limits: messages not checked by the panel, faults stated but not injected, `draft` scenarios, and *a passing
   scenario proves one trace, not the absence of errors*.
