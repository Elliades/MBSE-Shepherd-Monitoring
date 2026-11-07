# Examples (Part 3, architecture 1, all in scenarios/library/part3/arch1/)

## The root of the chain (declares what is simulated and observed)

```
scenario: Power on
id: arch1.power-on
kind: nominal
version: 1.0
status: in use
goal: The operator powers the drone on: Mission Configuration wakes up and waits for a flight plan.
context: Logical SOI 1 - Mission orchestrator Simulation
cut: Logical SOI 1 - Mission orchestrator
settle: 2

system soi.mc "Mission Configuration" : Mission Configuration
system soi.orch "Mission Orchestrator" : Mission Orchestrator
system soi.ap "AutoPilot" : AutoPilot
system soi.pd "Predator Defense" : Predator Defense
driver operator "Operator" : Operator
driver pasture "Pasture Environment" : Pasture Environment

phase Preparation
  step power: operator sends Start SOI
    note: The operator powers the drone on.
    then soi.mc is Unconfigured
```

## A unit: one moment, its preconditions by reference

```
scenario: A bear enters the tracking perimeter
id: arch1.bear-enters
kind: nominal
version: 1.0
status: in use
goal: Predator defense takes over and the drone follows the bear.
given: arch1.mission-start

phase Predator response
  step bear: pasture sends Predator Detected inside tracking perimeter
    note: The camera sees the bear: Predator Defense asks for control, the orchestrator grants it.
    then soi.orch is Predator Defense Active
    then soi.pd is Tracking Predator
    then soi.ap is Following Predator
    then message Predator Alert
```

Compiled: power-on → plan-accepted → mission-start are played as setup phases (not measured), then the
measured phase "Predator response".

## An assembly: the whole mission

```
scenario: The whole mission
id: arch1.full
kind: nominal
version: 1.0
goal: Preparation, patrol, sheep, bear, back to patrol, every part measured.
sequence: arch1.power-on, arch1.plan-rejected, arch1.plan-accepted, arch1.mission-start, arch1.sheep-out, arch1.bear-enters, arch1.bear-deterred, arch1.bear-gone
```

## An alternative from a precondition: the event too early

```
scenario: The mission is started before any flight plan
id: arch1.start-without-plan
kind: alternative
version: 0.1
status: draft
goal: Start Sheep Guard Mission before a flight plan is accepted is ignored: nothing takes off.
given: arch1.power-on

phase Preparation
  step early-start: operator sends Start Sheep Guard Mission
    note: The operator presses Start too soon.
    then soi.mc is Unconfigured
    then soi.mc is not Deployed
    then soi.orch is Idle
    then soi.ap is Idle
```

## A variant with `from`: the event repeated

```
scenario: The bear is detected twice
id: arch1.bear-seen-twice
kind: alternative
version: 0.1
status: draft
goal: A second detection while the bear is tracked changes nothing: no second takeover.
from: arch1.bear-enters

after bear:
  step bear-again: pasture sends Predator Detected inside tracking perimeter
    then soi.orch is Predator Defense Active
    then soi.pd is Tracking Predator
    then soi.pd is not Awaiting Control
```

## A dysfunctional variant: a lost signal

```
scenario: The sheep alert is lost on the way
id: arch1.sheep-alert-lost
kind: dysfunctional
version: 0.1
status: draft
tags: robustness
goal: If the link to the base station is broken, the sheep exit raises no alert, and the drone keeps counting.
from: arch1.sheep-out

instead of sheep-out:
  step sheep-out-lost: pasture sends Sheep Out Of Zone
    fault: connector sg.bsrc broken (stated, not injected)
    note: The real fault cannot be injected; the scenario documents the expected degraded behaviour.
    then soi.sg is Sheep Counting
    then no message Sheep Exit Alert
```

## Combining given with another branch

```
scenario: A bear comes while a sheep is out
id: arch1.bear-while-sheep-out
kind: alternative
from: arch1.bear-enters
given: arch1.sheep-out
```
`from` takes the bear step, and `given` replaces its preconditions with the chain that ends with a sheep out.
