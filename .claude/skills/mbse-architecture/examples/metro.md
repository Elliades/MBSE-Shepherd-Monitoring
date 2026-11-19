# Example: the lifecycle layer of an automated metro

This walk-through follows the nine steps of [lifecycle.md](../lifecycle.md). The tables are the ones shown at the
human gates. The customer's answers are assumed here; a real run asks the questions.

## 1. Frame

| Question | Assumed answer |
|---|---|
| SoI | the **automated train**, driverless (GoA4) |
| Out of scope, in contact | wayside signalling (CBTC), OCC (operations control centre), platform screen doors, maintenance centre |
| Starting point | no model |

## 2. The mission and its measures

**End state.** Passengers travel between stations safely and at the planned frequency, without a driver on board.

| Objective | MOE | Definition | Unit | Target | Evaluated by |
|---|---|---|---|---|---|
| O1 Carry passengers safely | MOE-1 | passenger injuries caused by train movement or doors, per million train-km | count | 0 | analysis (operations data) |
| O2 Keep the timetable | MOE-2 | runs arriving within 2 min of the timetable | % | ≥ 98 | analysis (service data) |
| O3 Have trains available | MOE-3 | trains ready for service at the morning start | % | ≥ 99 | analysis (service data) |

| MOP | Drives | Definition | Unit | Target | Evaluated by | Requirement |
|---|---|---|---|---|---|---|
| MOP-1 | MOE-1, MOE-2 | stop accuracy at the stopping point | m | ±0.3 | test | REQ-04 |
| MOP-2 | MOE-1 | door openings off the platform, over all scenarios | count | 0 | simulation: state `Doors open` never entered unless the platform doors are open | REQ-05 |
| MOP-3 | MOE-1 | passenger alarm relayed to the OCC before the next station | yes/no | yes | simulation: `Passenger alarm relayed` sent before `Station announcement` | REQ-06 |
| MOP-4 | MOE-3 | wake-up and self-test reach `Ready for service` | yes/no | yes | simulation: state reached in UC-1 SD 1 | REQ-01 |
| MOP-5 | MOE-2 | door cycle time (open to locked) | s | ≤ 25 | analysis: the model has no timing | REQ-13 |
| MOP-6 | MOE-2, MOE-3 | service data delivered every night | % | 100 | inspection | REQ-09 |

MOE-1 to MOE-3 are measured on the real line. Their MOP are what the design and the simulation can show.

## 3. The phases

| # | Phase | Treated? | Why | Actors of the phase |
|---|---|---|---|---|
| 1 | Plan | no | the transport plan is made on the ground by the operator; the train receives its result while preparing | — |
| 2 | Prepare | yes | wake-up, self-tests, receiving the mission | OCC, maintenance centre |
| 3 | Deploy | yes | from the depot to the injection terminus | signalling, OCC |
| 4 | Execute | yes | passenger service | signalling, OCC, platform doors, passenger |
| 5 | Undeploy | yes | end of service, train emptied, back to the depot, sleep | OCC, signalling, passenger |
| 6 | Sustain | yes, partly | remote diagnostics only; workshop maintenance is out of scope | maintenance centre |
| 7 | Assess | yes, partly | delivering service data (punctuality, incidents); their analysis is done on the ground | maintenance centre |

Production, acceptance tests and final withdrawal from the fleet are out of scope.

## 4. The existing environment

Today a driver does the work. The driver reads the signals, stops the train, opens and closes the doors, announces
the stations and talks to the OCC. At night the driver brings the train back to the depot and fills in a log book. The
automated train takes these exchanges over, and the log book becomes service data (Assess).

## 5. The context and its exchanges

| From | To | Signal | Through | Phases | Requirement |
|---|---|---|---|---|---|
| OCC | Train | Wake-up order | ground-train radio | 2 | REQ-01 |
| Train | OCC | Self-test result | ground-train radio | 2 | REQ-01 |
| OCC | Train | Service mission | ground-train radio | 2 | REQ-02 |
| Train | OCC | Ready to depart | ground-train radio | 2, 4 | REQ-02 |
| OCC | Train | Withdrawal order | ground-train radio | 5 | REQ-02 |
| Train | OCC | Train status | ground-train radio | all | REQ-02 |
| Signalling | Train | Movement authority | ground-train radio | 3, 4, 5 | REQ-03 |
| Train | Signalling | Train position | ground-train radio | 3, 4, 5 | REQ-03 |
| Train | Platform doors | Open platform doors, Close platform doors | wayside (platform equipment) | 4 | REQ-05 |
| Platform doors | Train | Platform doors open, Platform doors locked | wayside (platform equipment) | 4 | REQ-05 |
| Passenger | Train | Passenger alarm | intercom | 4 | REQ-06 |
| Train | Passenger | Station announcement, Door closing warning, Invitation to alight | screens, audio | 4, 5 | REQ-07 |
| Train | OCC | Passenger alarm relayed | ground-train radio | 4 | REQ-06 |
| Train, OCC | OCC, Train | Voice | ground-train radio | 4 | REQ-06 |
| Train | Maintenance centre | Diagnostics | ground-train radio | 6 | REQ-08 |
| Train | Maintenance centre | Fault *(added at step 9)* | ground-train radio | 2, 6 | REQ-11, REQ-08 |
| Train | OCC | Platform door alarm *(added at step 9)* | ground-train radio | 4 | REQ-10 |
| Train | Maintenance centre | Service data | depot wifi | 7 | REQ-09 |

The question settled at the gate: the train does not command the platform doors directly. It goes through the
platform equipment. A direct train ↔ platform doors exchange would be wrong.

## 6. The use cases

| Phase | Id | Use case | Objective | Actors |
|---|---|---|---|---|
| 2 Prepare | UC-1 | Wake up and test the train | the train is powered and knows whether it is fit | OCC, maintenance centre |
| 2 Prepare | UC-2 | Put into service | the train holds its mission and waits for departure | OCC |
| 3 Deploy | UC-3 | Join the line | the train is at the injection terminus, on time | signalling, OCC |
| 4 Execute | UC-4 | Run between stations | the train goes to the next station without exceeding its authority | signalling, OCC |
| 4 Execute | UC-5 | Serve a station | passengers get on and off safely | platform doors, passenger, OCC |
| 4 Execute | UC-6 | Handle a passenger alarm | the passenger is in contact with the OCC, in safety | passenger, OCC |
| 5 Undeploy | UC-7 | Withdraw from service | the train is empty, at the depot, asleep | OCC, signalling, passenger |
| 6 Sustain | UC-8 | Report its health | the maintenance centre knows the faults before the breakdown | maintenance centre |
| 7 Assess | UC-9 | Deliver the service data | the operator can measure punctuality and analyse incidents | maintenance centre |

*Run between stations* ends with the stop at the stopping point, where *Serve a station* starts. There is no relation
between the two: the sequence belongs to the scenarios and to the functional mission.

## 7. The requirements and their allocation

| Id | Requirement | Kind | Verification |
|---|---|---|---|
| REQ-01 | The train shall be woken up and tested remotely by the OCC. | capability | simulation |
| REQ-02 | The train shall carry out the mission orders of the OCC: put into service, withdrawal. | exchange | simulation |
| REQ-03 | The train shall never exceed its movement authority. | safety | simulation |
| REQ-04 | The train shall stop within ±0.3 m of the stopping point. | performance | test |
| REQ-05 | The train shall open its doors only when stopped at a platform with the platform doors open. | safety | simulation |
| REQ-06 | On a passenger alarm between two stations, the train shall continue to the next station and put the passenger in contact with the OCC. | capability | simulation |
| REQ-07 | The train shall announce the next station and the closing of the doors. | capability | inspection |
| REQ-08 | The train shall send its health status to the maintenance centre. | exchange | simulation |
| REQ-09 | The train shall deliver the service data of the day. | exchange | inspection |
| REQ-10 | *Proposed at step 9.* If the platform doors are not locked within 10 s, the train shall stay at the platform and alert the OCC. | safety | simulation |
| REQ-11 | *Proposed at step 9.* If the self-test fails, the train shall stay out of service and report the fault to the OCC and to the maintenance centre. | safety | simulation |
| REQ-12 | *Proposed at step 9.* The train shall not leave for the depot with passengers on board. | safety | simulation |
| REQ-13 | *Created from MOP-5.* The door cycle, from opening to locking, shall last at most 25 s. | performance | analysis |

| Requirement | UC-1 | UC-2 | UC-3 | UC-4 | UC-5 | UC-6 | UC-7 | UC-8 | UC-9 | MOP | Verified by |
|---|---|---|---|---|---|---|---|---|---|---|---|
| REQ-01 | ● | | | | | | | | | MOP-4 | UC-1 SD 1 |
| REQ-02 | | ● | | | | | ● | | | | UC-2 SD 1, UC-7 SD 1 |
| REQ-03 | | | ● | ● | | | ● | | | | UC-3 RD 1, UC-4 SD 1, UC-4 RD 1 |
| REQ-04 | | | | ● | | | | | | MOP-1 | test (no scenario) |
| REQ-05 | | | | | ● | | | | | MOP-2 | UC-5 SD 1, UC-5 ALT 1 |
| REQ-06 | | | | | | ● | | | | MOP-3 | UC-6 ALT 1 |
| REQ-07 | | | | | ● | | ● | | | | inspection |
| REQ-08 | | | | | | | | ● | | | UC-8 SD 1 |
| REQ-09 | | | | | | | | | ● | MOP-6 | inspection |
| REQ-10 | | | | | ● | | | | | | UC-5 RD 1 |
| REQ-11 | ● | | | | | | | | | | UC-1 RD 1 |
| REQ-12 | | | | | | | ● | | | | UC-7 RD 1 |
| REQ-13 | | | | | ● | | | | | MOP-5 | analysis |

REQ-03 is cross-cutting: three use cases refine it, and it is not duplicated.

## 8. The scenarios

### The list, validated before the details

| UC | Kind | Scenario | What happens |
|---|---|---|---|
| UC-1 | SD 1 | Wake-up and self-test pass | wake-up order, self-test, "fit" result to the OCC |
| UC-1 | RD 1 | Self-test fails | "unfit" result, the train stays out of service, fault reported |
| UC-1 | ALT | — | absent: a wake-up passes or fails, there is no other path |
| UC-2 | SD 1 | Put into service | mission received, ready to depart |
| UC-2 | ALT 1 | Mission changed before departure | the OCC sends a new mission, the train takes the last one |
| UC-2 | RD 1 | Unusable mission | the train refuses it, stays out of service and reports it |
| UC-3 | SD 1 | Leave the depot | authority, transit, arrival at the terminus, ready to depart |
| UC-3 | ALT 1 | Authority delayed | the train waits, then leaves |
| UC-3 | RD 1 | Authority lost in transit | emergency braking, status reported to the OCC |
| UC-4 | SD 1 | Nominal run | authority, positions, stop at the stopping point |
| UC-4 | ALT 1 | Stop out of tolerance | the train readjusts, then stops at the point |
| UC-4 | ALT 2 | Stop on the line | reduced authority, stop, restart |
| UC-4 | RD 1 | Authority lost | emergency braking, status reported |
| UC-5 | SD 1 | Stop and passenger exchange | platform doors then train doors, announcement, closing, ready to depart |
| UC-5 | ALT 1 | Obstacle at closing | the doors reopen, then close again |
| UC-5 | RD 1 | Platform doors never locked | the train stays at the platform, alerts the OCC |
| UC-6 | SD 1 | Alarm at a platform | doors held open, voice with the OCC |
| UC-6 | ALT 1 | Alarm between two stations | the train continues to the station, then as SD 1 |
| UC-6 | RD 1 | Voice unavailable | stop at the station, doors open, alarm kept at the OCC |
| UC-7 | SD 1 | End-of-service withdrawal | invitation to alight, train empty, back to the depot, sleep |
| UC-7 | RD 1 | Passenger left on board | the train does not leave, alerts the OCC |
| UC-8 | SD 1 | Periodic diagnostics | diagnostics sent |
| UC-8 | RD 1 | Critical fault | fault reported to the maintenance centre (the OCC sees it in "Train status", which belongs to other use cases) |
| UC-8 | ALT | — | absent |
| UC-9 | SD 1 | Download at the depot | data delivered |
| UC-9 | RD 1 | Link unavailable | data kept until the next connection, status reported |
| UC-9 | ALT | — | absent |

### The details (three scenarios)

**UC-5 SD 1 — Stop and passenger exchange.** Verifies REQ-05; measures MOP-2. The train is already stopped at the
stopping point, which is the end of UC-4.
1. Train → Platform doors: Open platform doors
2. Platform doors → Train: Platform doors open
3. Train: *Open the train doors*
4. Train → Passenger: Station announcement
5. Train → Passenger: Door closing warning
6. Train: *Close the train doors*
7. Train → Platform doors: Close platform doors
8. Platform doors → Train: Platform doors locked
9. Train → OCC: Ready to depart

**UC-5 RD 1 — Platform doors never locked.** Verifies REQ-10. It reuses SD 1 up to sentence 7, then:
1. Train: *Hold the train at the platform*
2. Train → OCC: Platform door alarm

**UC-6 ALT 1 — Alarm between two stations.** Verifies REQ-06; measures MOP-3.
1. Passenger → Train: Passenger alarm
2. Train → OCC: Passenger alarm relayed
3. Train: *Continue to the next station*
4. Train → Passenger: Station announcement
5. Train ↔ OCC: Voice
6. It continues as UC-6 SD 1, from "doors held open".

## 9. Reconcile: what the rules found

| Rule | Finding | Fix |
|---|---|---|
| LC-11 | UC-5 RD 1: "Platform door alarm" from the train to the OCC has no exchange | exchange added to the context |
| LC-17 | UC-5 RD 1, UC-1 RD 1 and UC-7 RD 1 are linked to no requirement | REQ-10, REQ-11 and REQ-12 proposed, then validated |
| LC-11 | UC-1 RD 1 and UC-8 RD 1: "Fault" from the train to the maintenance centre has no exchange (toward the OCC, "Self-test result" is enough) | "Fault" exchange added |
| LC-08 | an early UC-8 RD 1 also warned the OCC, which is not an actor of UC-8 | message removed; the OCC sees the fault in "Train status" |
| LC-08 | an early UC-5 SD 1 started with "Signalling → Train: Movement authority", but signalling is not an actor of UC-5 | message removed: the arrival belongs to UC-4 |
| LC-12 | "Wake-up order" was used by no scenario until UC-1 was detailed | gone once UC-1 SD 1 was written |
| LC-17 | UC-2 RD 1 (unusable mission) and UC-6 RD 1 (voice unavailable) have no failure requirement | question asked to the customer, no requirement invented; the warning stays open |
| LC-20 | MOP-5 (door cycle time) cannot be measured by a scenario: the model has no timing | evaluated by analysis; timed simulation is in the backlog |
| LC-01 | Plan not treated | reason written (step 3) |

UC-7 RD 1 assumes the train knows whether passengers are on board. This is an internal capability, not an exchange:
the functional layer inherits it.

## The generator (extract)

The mission, the context and the Execute phase are complete. The other phases have the same shape.

```kotlin
object MetroLifecycle : ArchitectureScript {
    override val id = "metro.lc"
    override val layer = Layer.LC
    override val owns = listOf("Metro::1 - Lifecycle")
    override val reads = emptyList<String>()

    override fun describe(view: ModelView) = lifecycle(view) {
        val train = soi("Automated Train")
        val occ = newActor("OCC"); val passenger = newActor("Passenger")
        val signalling = newExternal("Wayside Signalling"); val psd = newExternal("Platform Screen Doors")
        val maintenance = newExternal("Maintenance Centre")

        val req = requirements { /* REQ-01 to REQ-13: text, kind, verification, as in the table of step 7 */ }

        val openPsd = newSignal("Open platform doors"); val closePsd = newSignal("Close platform doors")
        val psdOpen = newSignal("Platform doors open"); val psdLocked = newSignal("Platform doors locked")
        val announcement = newSignal("Station announcement"); val closingWarning = newSignal("Door closing warning")
        val readyToDepart = newSignal("Ready to depart"); val psdAlarm = newSignal("Platform door alarm")
        val alarm = newSignal("Passenger alarm"); val alarmRelayed = newSignal("Passenger alarm relayed")
        val voice = newSignal("Voice")
        // … signals of the other phases

        mission(endState = "Passengers travel between stations safely and at the planned frequency, without a driver.") {
            val safety = moe("MOE-1", "Passenger injuries caused by train movement or doors, per million train-km",
                             unit = "count", target = "0", evaluatedBy = ANALYSIS)
            mop("MOP-2", "Door openings off the platform, over all scenarios", unit = "count", target = "0",
                drives = safety, requirement = req("REQ-05"),
                measure = never(state = "Doors open", unless = received(psdOpen)))
            mop("MOP-3", "Passenger alarm relayed before the next station", unit = "yes/no", target = "yes",
                drives = safety, requirement = req("REQ-06"),
                measure = before(sent(alarmRelayed), sent(announcement)))
            // MOE-2, MOE-3, MOP-1, MOP-4 to MOP-6 likewise
        }

        phases {
            treated(PREPARE, DEPLOY, EXECUTE, UNDEPLOY, SUSTAIN, ASSESS)
            notTreated(PLAN, because = "the transport plan is made on the ground; the train receives its result while preparing")
        }

        context {
            flow(openPsd, from = train, to = psd); flow(closePsd, from = train, to = psd)
            flow(psdOpen, from = psd, to = train); flow(psdLocked, from = psd, to = train)
            flow(announcement, from = train, to = passenger); flow(closingWarning, from = train, to = passenger)
            flow(alarm, from = passenger, to = train); flow(alarmRelayed, from = train, to = occ)
            flow(voice, from = train, to = occ); flow(voice, from = occ, to = train)
            flow(readyToDepart, from = train, to = occ); flow(psdAlarm, from = train, to = occ)
            // … exchanges of the other phases
        }

        phase(EXECUTE) {
            useCase("Run between stations", subject = train, actors = listOf(signalling, occ),
                    refines = req("REQ-03", "REQ-04")) { /* SD 1, ALT 1, ALT 2, RD 1 */ }

            useCase("Serve a station", subject = train, actors = listOf(psd, passenger, occ),
                    refines = req("REQ-05", "REQ-07", "REQ-10", "REQ-13")) {
                val sd = scenario(SD, "Stop and passenger exchange", verifies = req("REQ-05")) {
                    msg(train, psd, openPsd); msg(psd, train, psdOpen)
                    self(train, "Open the train doors")
                    msg(train, passenger, announcement); msg(train, passenger, closingWarning)
                    self(train, "Close the train doors")
                    msg(train, psd, closePsd); msg(psd, train, psdLocked)
                    msg(train, occ, readyToDepart)
                }
                scenario(ALT, "Obstacle at closing", verifies = req("REQ-05")) {
                    given(sd, upTo = 6)
                    self(train, "Reopen then close the train doors")
                    resume(sd, from = 7)
                }
                scenario(RD, "Platform doors never locked", verifies = req("REQ-10")) {
                    given(sd, upTo = 7)
                    self(train, "Hold the train at the platform"); msg(train, occ, psdAlarm)
                }
            }

            useCase("Handle a passenger alarm", subject = train, actors = listOf(passenger, occ), refines = req("REQ-06")) {
                val sd = scenario(SD, "Alarm at a platform", verifies = req("REQ-06")) {
                    msg(passenger, train, alarm); msg(train, occ, alarmRelayed)
                    self(train, "Hold the doors open")
                    msg(train, occ, voice); msg(occ, train, voice)
                }
                scenario(ALT, "Alarm between two stations", verifies = req("REQ-06")) {
                    msg(passenger, train, alarm); msg(train, occ, alarmRelayed)
                    self(train, "Continue to the next station"); msg(train, passenger, announcement)
                    resume(sd, from = 3)
                }
                scenario(RD, "Voice unavailable") { /* … */ }
            }
        }
        // phase(PREPARE) { UC-1, UC-2 } · phase(DEPLOY) { UC-3 } · phase(UNDEPLOY) { UC-7 } · phase(SUSTAIN) { UC-8 } · phase(ASSESS) { UC-9 }
    }
}
```
