"""Writes part3/content/archs.js: the three logical architectures of the drone, for the Part 3 guide.

The source is the drone-archs folder of the OMF plugin docs (arch-*.json specs and arch-*.scenario.json), the
same files that build the correction models in MagicDraw. The guide keeps what it needs to simulate them
(js/logical-engine.js): the state machines, the send steps of each function, the parts, the connectors and the
scenarios. Names stay as in the model; the notes of the scenarios are written here in English.

    python -I scripts/make-part3-archs.py <drone-archs folder>
"""
import json
import sys
from pathlib import Path

ARCHS = [
    ("1", "arch-1-mission-orchestrator"),
    ("2", "arch-2-patch"),
    ("3", "arch-3-centralized-orchestrator"),
]

# The notes of each scenario step, in English, in the order of the scenario.
NOTES = {
    "1": [
        "The operator powers the drone on.",
        "A wrong plan: Load Flight Plan refuses it, Mission Configuration goes back to Unconfigured and the operator is told.",
        "The flight plan is loaded and checked.",
        "Launch: flight to the safe area, then the orchestrator activates Sheep Guard.",
        "The flock is seen and counted by Sheep Guard.",
        "A sheep leaves the zone: Sheep Guard alerts the operator itself.",
        "The bear is seen: Predator Defense asks for control, the orchestrator grants it; the feature drives the tracking.",
        "The bear enters the safe perimeter: the feature deters it on its own, the orchestrator does not move.",
        "The bear backs off: back to tracking, still decided by the feature.",
        "The bear is gone: the feature hands control back, Sheep Guard resumes the patrol.",
    ],
    "2": [
        "The operator powers the drone on.",
        "A wrong plan: Load Flight Plan refuses it, Mission Configuration goes back to Unconfigured and the operator is told.",
        "The flight plan is loaded and checked.",
        "The operator starts the mission.",
        "The flock is seen and counted.",
        "A sheep leaves the zone: alert to the operator.",
        "The bear is seen: Predator Management turns the sheep guard off (the patch) and takes the AutoPilot.",
        "Deterrence inside the safe perimeter.",
        "The bear backs off: back to tracking.",
        "The bear is gone: Predator Management turns the sheep guard back on.",
    ],
    "3": [
        "The operator powers the drone on.",
        "A wrong plan: Load Flight Plan refuses it, Mission Configuration goes back to Unconfigured and the operator is told.",
        "The flight plan is loaded and checked.",
        "Launch: safe area, then patrol.",
        "The observation goes through the orchestrator, which dispatches it to the sheep monitoring.",
        "A sheep leaves the zone: report to the orchestrator, which alerts the operator.",
        "Tracking request: the predator takes priority, the orchestrator dispatches the orders.",
        "Engage request: the orchestrator orders the deterrence.",
        "Disengage request: back to tracking.",
        "End of tracking: the orchestrator restarts patrol and guard, the path takes priority again.",
    ],
}
PHASES = {
    "Plan de vol refusé": "Preparation",
    "Plan de vol accepté": "Preparation",
    "Garde du troupeau": "Guarding the flock",
    "Réponse prédateur": "Predator response",
}
# The crash is not part of this TP: what only exists for it. The specs still have it.
CRASH_SIGNALS = {"Crash Alert", "Emergency Landing", "Crashed Detected"}
CRASH_STATES = {"Mission Aborted", "Emergency Mode"}
CRASH_FUNCTIONS = {"Abort Mission", "Emergency Landing Procedure"}
CRASH_BLOCK = "System Monitoring Safety"
ORCH_TRACK = "Start And Relay Tracking"
CRASH_ENDS = {"sms", "health"}  # the part of that block, and the port of the SOI that feeds it
CRASH_DOCS = [
    ("(readiness, sheep exit, predator, crash)", "(readiness, sheep exit, predator)"),
    ("(readiness, flight plan rejected, sheep exit, predator, crash)", "(readiness, flight plan rejected, sheep exit, predator)"),
    ("(sheep, bear positions, crash)", "(sheep, bear positions)"),
    (" Mission-level only: safe area, abort on crash.", " Mission-level only: safe area."),
    ("flies to the safe area and lands on the orchestrator's order;", "flies to the safe area on the orchestrator's order;"),
    ("; emergency landing on crash.", "."),
    ("(sheep, bear positions, crash)", "(sheep, bear positions)"),
    ("(crash > predator > sheep / patrol)", "(predator > sheep / patrol)"),
    ("(safe area, watch path, tracking orders, emergency landing)", "(safe area, watch path, tracking orders)"),
]


def read_json(path):
    raw = path.read_bytes().decode("utf-8")
    try:  # the scenarios were written twice-encoded
        raw = raw.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return json.loads(raw)


def sends_of(steps, known, depth=0):
    """The send steps of a list of steps, with the sends of the functions they call put in their place
    (Guard sheep calls Report Sheep Exit, which sends Sheep Exit Alert)."""
    out = []
    for s in steps:
        if "send" in s:
            out.append(s)
        elif "call" in s and s["call"] in known and depth < 4:
            out.extend(sends_of(known[s["call"]].get("steps", []), known, depth + 1))
    return out


def slim_function(f, known):
    out = {"name": f["name"], "steps": sends_of(f.get("steps", []), known)}
    calls = [s["call"] for s in f.get("steps", []) if "call" in s]
    if calls:
        out["calls"] = calls
    if f.get("trace"):
        out["trace"] = f["trace"]
    if "reactions" in f:
        out["reactions"] = [{"on": r["on"], "steps": sends_of(r.get("steps", []), known)} for r in f["reactions"]]
    return out


def slim_block(b, shared):
    known = dict(shared)
    known.update({f["name"]: f for f in b.get("functions", [])})
    return {
        "name": b["name"],
        "doc": b.get("doc", ""),
        "ports": [{"name": p["name"], "in": p.get("in", []), "out": p.get("out", [])} for p in b.get("ports", [])],
        "functions": [slim_function(f, known) for f in b.get("functions", [])],
        "stm": b["stm"],
    }


def on_list(t):
    """The signals of a transition: `on` is one signal, or a list of them."""
    on = t.get("on")
    return on if isinstance(on, list) else [on] if on else []


def walk_stm(region):
    """A state machine or a state, then every state and region inside it."""
    yield region
    for st in region.get("states", []):
        yield from walk_stm(st)
    for sub in region.get("regions", []):
        yield from walk_stm(sub)


def rename_homonyms(spec):
    """In architecture 3 the do activity of the orchestrator has the name of a function of Predator Management: two
    `Track predator` in the Functions package, and students drag the wrong one. It takes a name of its own."""
    for b in spec["blocks"]:
        if b["name"] != "Mission Orchestrator":
            continue
        for f in b.get("functions", []):
            if f["name"] == "Track predator":
                f["name"] = ORCH_TRACK
        for r in walk_stm(b["stm"]):
            if r.get("do") == "Track predator":
                r["do"] = ORCH_TRACK


def split_verdict_port(spec):
    """Mission Configuration tells the base station on a port of its own, one way: `verdict`, facing `notification`
    (the specs name it after one of its signals). What comes from the base station stays on `bsrc`."""
    old = "flightplan_check_failed_ext"
    for b in spec["blocks"]:
        for p in b.get("ports", []):
            if p["name"] == old:
                p["name"] = "verdict"
        for f in b.get("functions", []):
            for st in f.get("steps", []):
                if st.get("port") == old:
                    st["port"] = "verdict"
        if "stm" in b:
            for r in walk_stm(b["stm"]):
                for t in r.get("transitions", []):
                    if t.get("delegate") == old:
                        t["delegate"] = "verdict"
    for ctx in spec["contexts"]:
        ctx["connectors"] = [[e.replace("." + old, ".verdict") for e in c] for c in ctx["connectors"]]


def flight_plan_ports(spec):
    """The functional mission takes FlightPlan Correct / FlightPlan Incorrect; the reactions and the transitions of the
    specs do, their ports do not say so yet. Done here."""
    variants = ["FlightPlan Correct", "FlightPlan Incorrect"]
    def widen(p):
        for side in ("in", "out"):
            if "FlightPlan" in p.get(side, []):
                p[side] = p[side] + [v for v in variants if v not in p[side]]
    for b in spec["blocks"]:
        for p in b.get("ports", []):
            widen(p)
    for ctx in spec["contexts"]:
        for p in ctx.get("ports", []):
            widen(p)


def flight_plan_for_simulator(spec):
    """js/logical-engine.js has no cloned do activity and no delegate: Load Flight Plan keeps its decision as sends to
    itself (when / unless), a transition on a list becomes one per signal, and a delegate becomes an effect that sends
    the signal on the port. In the guide the verdict and the start order keep their plain names."""
    for b in spec["blocks"]:
        if "stm" not in b:
            continue
        for r in walk_stm(b["stm"]):
            ts = r.get("transitions")
            if ts is None:
                continue
            r["transitions"] = [dict(t, on=x) for t in ts for x in on_list(t)] + [t for t in ts if not on_list(t)]
        if b["name"] != "Mission Configuration":
            continue
        b["functions"].append({"name": "Load Flight Plan", "steps": [
            {"call": "Acquire Flight Plan"}, {"call": "Check Flight Plan validity"},
            {"send": "FlightPlan Check Failed", "self": True, "when": "FlightPlan Incorrect"},
            {"send": "Ready for mission", "self": True, "unless": "FlightPlan Incorrect"},
        ]})
        for p in b["ports"]:
            p["out"] = [x[: -len("_ext")] if x.endswith("_ext") else x for x in p.get("out", [])]
        for r in walk_stm(b["stm"]):
            r.pop("cloneDo", None)
            for t in r.get("transitions", []):
                port = t.pop("delegate", None)
                if port:
                    name = "Notify " + t["on"]
                    t["effect"] = name
                    b["functions"].append({"name": name, "steps": [{"send": t["on"], "port": port}]})


def remove_crash_stm(region):
    if "states" in region:
        region["states"] = [st for st in region["states"] if st["name"] not in CRASH_STATES]
    if "transitions" in region:
        region["transitions"] = [t for t in region["transitions"]
                                 if not set(on_list(t)) & CRASH_SIGNALS and t.get("to") not in CRASH_STATES and t.get("from") not in CRASH_STATES]
    for st in region.get("states", []):
        remove_crash_stm(st)
    for sub in region.get("regions", []):
        remove_crash_stm(sub)


def remove_crash_steps(steps):
    return [st for st in steps if st.get("send") not in CRASH_SIGNALS and st.get("call") not in CRASH_FUNCTIONS]


def remove_crash(spec, scen):
    """System Monitoring Safety only reports the crash: it goes with it, and so do the signals, the states and the
    functions of the crash in the other blocks. A port left without a signal goes too."""
    spec["blocks"] = [b for b in spec["blocks"] if b["name"] != CRASH_BLOCK]
    spec["functions"] = [f for f in spec.get("functions", []) if f["name"] not in CRASH_FUNCTIONS]
    for b in spec["blocks"]:
        for old, new in CRASH_DOCS:
            b["doc"] = b.get("doc", "").replace(old, new)
        for p in b.get("ports", []):
            for side in ("in", "out"):
                p[side] = [x for x in p.get(side, []) if x not in CRASH_SIGNALS]
        kept = [p for p in b.get("ports", []) if p["name"] not in CRASH_ENDS and (p["in"] or p["out"])]
        b["ports"] = kept
        b["functions"] = [f for f in b.get("functions", []) if f["name"] not in CRASH_FUNCTIONS]
        for f in b["functions"]:
            if "steps" in f:
                f["steps"] = remove_crash_steps(f["steps"])
            if "reactions" in f:
                f["reactions"] = [dict(r, steps=remove_crash_steps(r.get("steps", []))) for r in f["reactions"] if r["on"] not in CRASH_SIGNALS]
        remove_crash_stm(b["stm"])
    for ctx in spec["contexts"]:
        ctx["parts"] = [p for p in ctx["parts"] if p["name"] != "sms"]
        ctx["connectors"] = [c for c in ctx["connectors"] if not any(end.split(".")[-1] in CRASH_ENDS or end.split(".")[0] in CRASH_ENDS for end in c)]
        if "ports" in ctx:
            ctx["ports"] = [p for p in ctx["ports"] if p["name"] != "health"]
            for p in ctx["ports"]:
                for side in ("in", "out"):
                    if side in p:
                        p[side] = [x for x in p[side] if x not in CRASH_SIGNALS]
    scen["phases"] = [dict(ph, steps=[s for s in ph["steps"] if s["signal"] not in CRASH_SIGNALS]) for ph in scen["phases"]]
    scen["phases"] = [ph for ph in scen["phases"] if ph["steps"]]
    scen["systems"] = [s for s in scen["systems"] if s["path"] != "soi.sms"]
    for ph in scen["phases"]:
        for s in ph["steps"]:
            s.get("expect", {}).pop("soi.sms", None)


def main(src):
    out = {}
    for key, stem in ARCHS:
        spec = read_json(src / f"{stem}.json")
        scen = read_json(src / f"{stem}.scenario.json")
        soi, ctx = spec["contexts"][0], spec["contexts"][1]
        remove_crash(spec, scen)
        rename_homonyms(spec)
        split_verdict_port(spec)
        flight_plan_ports(spec)
        flight_plan_for_simulator(spec)
        shared = {f["name"]: f for f in spec.get("functions", [])}
        notes = iter(NOTES[key])
        phases = []
        for ph in scen["phases"]:
            name = PHASES.get(ph["name"], ph["name"])
            steps = [{"signal": s["signal"], "into": s["into"], "note": next(notes), "expect": s.get("expect", {})} for s in ph["steps"]]
            if phases and phases[-1]["name"] == name:
                phases[-1]["steps"].extend(steps)
            else:
                phases.append({"name": name, "steps": steps})
        out[key] = {
            "package": spec["name"],
            "functions": [slim_function(f, shared) for f in spec.get("functions", [])],
            "blocks": [slim_block(b, shared) for b in spec["blocks"]],
            "soi": {"name": soi["name"], "ports": [p["name"] for p in soi["ports"]], "parts": soi["parts"], "connectors": soi["connectors"]},
            "context": {"name": ctx["name"], "parts": ctx["parts"], "connectors": ctx["connectors"]},
            "scenario": {"systems": [{"path": s["path"], "type": s["type"]} for s in scen["systems"]], "phases": phases},
        }
    target = Path(__file__).resolve().parent.parent / "part3" / "content" / "archs.js"
    text = ("/* The three logical architectures of the drone (Part 3), as the correction models build them: written by\n"
            "   scripts/make-part3-archs.py from the drone-archs specs of the OMF plugin docs. Do not edit by hand.\n"
            "   Simulated by js/logical-engine.js. */\n"
            "window.LOGICAL_ARCHS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    for word in ("Crash", "crash", "Emergency", "Mission Aborted", "Monitoring Safety"):
        assert word not in text, word
    target.write_text(text, encoding="utf-8")
    print(f"{target}: {len(text) // 1024} KB")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
