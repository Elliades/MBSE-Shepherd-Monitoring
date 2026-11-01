"""Writes the specs of the four starting models of Part 3 (scripts/part3-inits/*.json), for MagicDraw's buildArchitecture.

Same source as make-part3-archs.py: the drone-archs specs of the OMF plugin docs, without the crash. One model per step
of the guide, each with the same package, so the links and Validate in Cameo hold in all of them:

    3 - Logical Analysis > TP - Logical Architecture > Signals, Interfaces, Functions, Components, Contexts
                                                       Contexts > TP Logical SOI, TP1 SOI Simulation

  mc       chapter 3: the power-on, the base station, the drivers. Mission Configuration is to do.
  arch1-3  chapter 6: Mission Configuration ready and connected, AutoPilot connected to nothing else, the mission
           blocks ready and off the IBD. Architectures 1 and 3: Mission Orchestrator with its ports and functions, and
           an empty state machine. Architecture 2: no patch.

    python -I scripts/make-part3-inits.py <drone-archs folder>
then, with MagicDraw running: node scripts/build-part3-models.mjs <base .mdzip>
"""
import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
loader = importlib.util.spec_from_file_location("archs", HERE / "make-part3-archs.py")
archs = importlib.util.module_from_spec(loader)
sys.dont_write_bytecode = True
loader.loader.exec_module(archs)

PACKAGE = "TP - Logical Architecture"
SOI = "TP Logical SOI"
SIM = "TP1 SOI Simulation"
LOGICAL_ANALYSIS = "_2026x_1_1fda04ff_1793137415433_578438_21729"
FUNCTIONAL_ANALYSIS = "_18_5_1_150503da_1507786242011_858192_48493"
START = "Start Sheep Guard Mission"
START_EXT = START + "_ext"
# What Mission Configuration exchanges with the operator: all that the model of chapter 3 keeps.
MC_SIGNALS = {"Start SOI", "FlightPlan", "FlightPlan Correct", "FlightPlan Incorrect", START, "Ready for mission", "FlightPlan Check Failed"}
PATCH = {"Deactivate Sheep Monitoring", "Reactivate Sheep Monitoring", "Resume Patrolling"}
# The parts on the IBD of the starting model of chapter 6, and their connectors.
TECH_PARTS = {"mi", "mc", "bsrc", "ap"}
TECH_CONNECTORS = [["power", "mi.power"], ["op_link", "bsrc.operator"], ["mi.mc", "mc.init"], ["bsrc.mc", "mc.bsrc"], ["mc.verdict", "bsrc.notification"]]


def block(spec, name):
    return next(b for b in spec["blocks"] if b["name"] == name)


def base(stem, src):
    spec = archs.read_json(src / f"{stem}.json")
    scen = archs.read_json(src / f"{stem}.scenario.json")
    archs.remove_crash(spec, scen)
    archs.split_verdict_port(spec)
    archs.flight_plan_ports(spec)
    spec["name"] = PACKAGE
    spec["replace"] = True
    spec["owner"] = {"elementId": LOGICAL_ANALYSIS}
    spec["reuseScope"] = [{"elementId": FUNCTIONAL_ANALYSIS}]
    soi, sim = spec["contexts"][0], spec["contexts"][1]
    soi["name"], sim["name"] = SOI, SIM
    soi.pop("image", None)
    sim.pop("image", None)
    for p in sim["parts"]:
        if p["name"] == "soi":
            p["type"] = SOI
    return spec


def start_order_ext(spec):
    """Who starts on Mission Configuration's order hears Start Sheep Guard Mission_ext, the signal of Delegate to
    external systems. The base station still passes the plain one on to Mission Configuration."""
    mc = block(spec, "Mission Configuration")
    out = next(p for p in mc["ports"] if START in p.get("out", []))
    out["out"] = [START_EXT if x == START else x for x in out["out"]]
    effect = None
    for r in archs.walk_stm(mc["stm"]):
        for t in r.get("transitions", []):
            if t.get("on") == START:
                effect = t.pop("effect", None)
                t["delegate"] = out["name"]
    mc["functions"] = [f for f in mc["functions"] if f["name"] != effect]
    for b in spec["blocks"]:
        if b["name"] in ("Mission Configuration", "Base station remote communication", "Operator"):
            continue
        for p in b.get("ports", []):
            p["in"] = [START_EXT if x == START else x for x in p.get("in", [])]
        if "stm" in b:
            for r in archs.walk_stm(b["stm"]):
                for t in r.get("transitions", []):
                    if t.get("on") == START:
                        t["on"] = START_EXT


def given_ibd(spec):
    soi = spec["contexts"][0]
    soi["parts"] = [p for p in soi["parts"] if p["name"] in TECH_PARTS]
    soi["connectors"] = [c for c in TECH_CONNECTORS]


def empty_decider(spec):
    mo = block(spec, "Mission Orchestrator")
    mo["stm"] = {"states": [], "transitions": []}


def no_patch(spec):
    sm = block(spec, "SheepMonitoring")
    sm["ports"] = [p for p in sm["ports"] if p["name"] != "pm"]
    sm["stm"]["states"] = [s for s in sm["stm"]["states"] if s["name"] != "Deactivated"]
    sm["stm"]["transitions"] = [t for t in sm["stm"]["transitions"] if "Deactivated" not in (t.get("from"), t.get("to"))]
    sm["doc"] = "Plugged on Zone Surveillance: counts the sheep from their signatures, detects any sheep leaving the zone and alerts the operator."
    pm = block(spec, "Predator Management")
    pm["ports"] = [p for p in pm["ports"] if p["name"] != "sm"]
    for p in pm["ports"]:
        p["out"] = [x for x in p.get("out", []) if x not in PATCH]
    for f in pm["functions"]:
        f["steps"] = [st for st in f.get("steps", []) if st.get("send") not in PATCH]
    pm["doc"] = "Detects every bear reported by Zone Surveillance: tracking protocol while the bear is in the tracking zone (tracking orders to the AutoPilot), engagement (light and sound bursts) while it is in the safe zone."


def mc_model(src):
    """Chapter 3: from any architecture, only what talks to Mission Configuration."""
    spec = base("arch-2-patch", src)
    keep = {"Manual Initialization", "Base station remote communication", "Operator", "Pasture Environment"}
    spec["blocks"] = [b for b in spec["blocks"] if b["name"] in keep]
    bs = block(spec, "Base station remote communication")
    bs["ports"] = [p for p in bs["ports"] if p["name"] in ("operator", "mc", "notification")]
    for f in bs["functions"]:
        f["reactions"] = [r for r in f.get("reactions", []) if r["on"] in MC_SIGNALS]
    def only_mc(p):
        for side in ("in", "out"):
            if side in p:
                p[side] = [x for x in p[side] if x in MC_SIGNALS]
    for p in bs["ports"]:
        only_mc(p)
    for p in block(spec, "Operator")["ports"]:
        only_mc(p)
    soi = spec["contexts"][0]
    for p in soi.get("ports", []):
        if p["name"] == "op_link":
            only_mc(p)
    soi["parts"] = [p for p in soi["parts"] if p["name"] in ("mi", "bsrc")]
    soi["connectors"] = [["power", "mi.power"], ["op_link", "bsrc.operator"]]
    soi["ports"] = [p for p in soi["ports"] if p["name"] in ("power", "op_link", "camera", "strong_light", "loud_sound")]
    return spec


def arch_model(stem, src, key):
    spec = base(stem, src)
    start_order_ext(spec)
    given_ibd(spec)
    if key == "2":
        no_patch(spec)
    else:
        empty_decider(spec)
    return spec


def main(src):
    out = HERE / "part3-inits"
    out.mkdir(exist_ok=True)
    models = {"mc": mc_model(src)}
    for key, stem in archs.ARCHS:
        models[f"arch{key}"] = arch_model(stem, src, key)
    for name, spec in models.items():
        text = json.dumps(spec, ensure_ascii=False, indent=1)
        for word in ("Crash", "crash", "Emergency", "Mission Aborted", "Monitoring Safety"):
            assert word not in text, (name, word)
        (out / f"{name}.json").write_text(text, encoding="utf-8")
        print(name, [b["name"] for b in spec["blocks"]])


if __name__ == "__main__":
    main(Path(sys.argv[1]))
