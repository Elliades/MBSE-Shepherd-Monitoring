"""Writes the specs of the starting model of Part 4 (scripts/part4-model/*.json), for MagicDraw's buildArchitecture.

The system of interest is the whole solution. Everything technical is given and connected; what is left is a box of
Lego. Each concern of the mission (a parallel region) has one component, and "who decides" is a component too:

    3 - Logical Analysis > TP - Swarm > Library   Zone Surveillance, Flock Watching, Sheep Tracking, Predator Management,
                                                  Base Standby, Swarm Master, Swarm Reflex, and for the base station:
                                                  Operator Communication, Weather Monitoring, Mission Monitoring, Charging Dock
                                      > Contexts  Pasture Sentinel System (given IBD)
                                                  Drone 1, 2, 3 (Flight Orchestrator only), Base Station (Ground Control only)
                                                  Swarm Simulation

Why it holds together without any change to the given blocks:
  - a Flight Orchestrator never asks a component anything: it flies when told to, and an order nobody gives never comes.
    It takes off by itself after the briefing unless a Base Standby holds it: nobody there, the drone flies;
  - a port may reach several parts (checked in Cameo 2026x), so each component plugs into one shared port;
  - a component asks for a job and waits for the answer. Who answers is the intelligence: Swarm Master (once, in the base
    station or in a drone: it knows by which port a request came in, so it can answer that drone alone) or Swarm Reflex
    (one per drone, says yes to everything). Nobody there: nobody answers, the drone stays;
  - watching and following are two bricks: Flock Watching spots a stray sheep and says so, the intelligence opens the job, a
    Sheep Tracking takes it. The one who sees and the one who goes may be two drones, and the second may wait at the base.
    A Reflex opens the job only in its own drone: drones without a master do not call each other.

The functional mission is the one of Parts 1 to 3, `SOI - Pasture Sentinel`, in the base model (scripts/build-part4-model.mjs): the
bricks below trace to it.

    python -I scripts/make-part4-model.py
then, with MagicDraw running: node scripts/build-part4-model.mjs
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "part4-model"

PACKAGE = "TP - Swarm"
LOGICAL_ANALYSIS = "_2026x_1_1fda04ff_1793137415433_578438_21729"
FUNCTIONAL_ANALYSIS = "_18_5_1_150503da_1507786242011_858192_48493"
SOI = "Pasture Sentinel System"
SIMULATION = "Swarm Simulation"

# Where the bear is. The state of Predator Management gives each one its meaning.
BEAR_TRACKING, BEAR_SAFE, BEAR_OUTSIDE = "Bear Inside Tracking Perimeter", "Bear Inside Safe Perimeter", "Bear Outside Perimeter"
OUT_OF_ZONE, BACK_IN_ZONE, SHEEP_SEEN = "Sheep Out Of Zone", "Sheep Back In Zone", "Sheep Signature"
SHEEP_OBS = [SHEEP_SEEN, OUT_OF_ZONE, BACK_IN_ZONE]
PREDATOR_OBS = [BEAR_TRACKING, BEAR_SAFE, BEAR_OUTSIDE]
WIND = ["Wind Calm", "Wind Storm"]
CMDS = ["Start SOI", "FlightPlan", "Start Sheep Guard Mission"]
ALERTS = ["Sheep Exit Alert", "Predator Alert", "Predator Cleared"]
FEEDBACK = ["Ready for mission", "Weather Alert"] + ALERTS
FLIGHT_ORDERS = ["FlightPlan", "Go Patrol", "Recall Drones"]
# What goes up from a drone to the intelligence, and what comes back.
SPOTTED, JOB_OPEN = "Stray Sheep Spotted", "Sheep Job Open"
ASK = [SPOTTED, "Ask Sheep Job", "Sheep Job Done", "Ask Predator Job", "Predator Job Done"]
ANSWER = [JOB_OPEN, "Sheep Job Given", "Sheep Job Taken", "Predator Job Given", "Predator Job Taken"]
# Flight orchestrator <-> components.
ON_STATION = ["On Station", "Off Station", "Mission Over"]
TO_COMPONENTS = ["Mission Started"] + ON_STATION
STAY = "Stay At Base"
# Inside the base station: what its bricks tell Ground Control, never the names the operator and the weather station use, so that
# Auto Connect cannot skip a brick. And the landing of a drone coming home.
OPS = ["Base Start", "Base Flight Plan", "Base Launch"]
READY_REPORT, STORM = "Base Ready Report", "Storm Warning"
ASK_LANDING, LANDING_CLEAR = "Ask Landing", "Landing Clear"
SHEEP_ORDERS = ["Follow Sheep", "Back To Station"]
PREDATOR_ORDERS = ["Track Predator", "Deter", "Stop Deterring", "Back To Station"]
DRONES = [1, 2, 3]


def send(signal, port):
    return {"send": signal, "port": port}


def call(name):
    return {"call": name}


def t(source, target, on=None, effect=None, via=None):
    out = {"from": source, "to": target}
    if on:
        out["on"] = on
    if effect:
        out["effect"] = effect
    if via:
        out["via"] = via
    return out


def region(name, initial, states, transitions=()):
    return {"name": name, "initial": initial, "states": list(states), "transitions": list(transitions)}


def stm(initial, states, transitions=()):
    return {"initial": initial, "states": list(states), "transitions": list(transitions)}


def fn(name, steps=(), trace=None, reactions=None):
    out = {"name": name, "steps": list(steps)}
    if trace:
        out["trace"] = trace
    if reactions:
        out["reactions"] = [{"on": s, "steps": list(st)} for s, st in reactions]
    return out


def component(name, doc, ports, functions, machine):
    return {"name": name, "stereotypes": ["Logical Component"], "doc": doc, "ports": ports, "functions": functions, "stm": machine}


# --------------------------------------------------------------------------- the library: one component per concern

ZONE_SURVEILLANCE = component(
    "Zone Surveillance",
    "Region Perimiter watch of the mission. Plug it in a drone: as long as the drone is on station, it patrols the perimeter of the field.",
    [{"name": "p_AutoPilot", "in": ON_STATION}],
    [fn("Patrol perimeter", [call("Define watch pathing"), call("Follow path")], trace="Watch Perimeter")],
    stm("Zone Idle", [
        {"name": "Zone Idle"},
        {"name": "Watching Perimeter", "do": "Patrol perimeter"},
        {"name": "Zone Stopped"}],
        [t("Zone Idle", "Watching Perimeter", "On Station"), t("Watching Perimeter", "Zone Idle", "Off Station"),
         t("Watching Perimeter", "Zone Stopped", "Mission Over"), t("Zone Idle", "Zone Stopped", "Mission Over")]))

FLOCK_WATCHING = component(
    "Flock Watching",
    "Region Sheep Monitoring of the mission, the watching half. Plug it in a drone: as long as the drone is on station, it counts the flock. "
    "A sheep out of the zone: it warns the operator and says so to the intelligence. It never leaves: following is the job of Sheep Tracking.",
    [{"name": "p_AutoPilot", "in": ON_STATION, "out": ["Sheep Exit Alert"]},
     {"name": "p_Camera", "in": [SHEEP_SEEN, OUT_OF_ZONE]},
     {"name": "p_Swarm", "out": [SPOTTED]}],
    [fn("Watch the flock", [call("Capture surounding"), call("Detect Sheeps")], trace="Sheep monitoring",
        reactions=[(SHEEP_SEEN, [call("Count Sheep")]),
                   (OUT_OF_ZONE, [call("Detect sheep exit"), send("Sheep Exit Alert", "p_AutoPilot"), send(SPOTTED, "p_Swarm")])])],
    stm("Flock Idle", [
        {"name": "Flock Idle"},
        {"name": "Watching Flock", "do": "Watch the flock"},
        {"name": "Flock Stopped"}],
        [t("Flock Idle", "Watching Flock", "On Station"), t("Watching Flock", "Flock Idle", "Off Station"),
         t("Watching Flock", "Flock Stopped", "Mission Over"), t("Flock Idle", "Flock Stopped", "Mission Over")]))

SHEEP_TRACKING = component(
    "Sheep Tracking",
    "Region Sheep Monitoring of the mission, the following half. Plug it in a drone: it waits for a job. The job opens, it asks for it; given, "
    "the drone follows the sheep until it is back in the zone; taken, another drone has it. It sees no stray by itself: someone has to watch.",
    [{"name": "p_AutoPilot", "in": TO_COMPONENTS, "out": SHEEP_ORDERS},
     {"name": "p_Camera", "in": [BACK_IN_ZONE]},
     {"name": "p_Swarm", "out": ["Ask Sheep Job", "Sheep Job Done"], "in": [JOB_OPEN, "Sheep Job Given", "Sheep Job Taken"]}],
    [fn("Ask to follow the sheep", [send("Ask Sheep Job", "p_Swarm")], trace="Track stray sheep"),
     fn("Go after the sheep", [send("Follow Sheep", "p_AutoPilot")], trace="Track stray sheep"),
     fn("Bring the sheep back", [send("Back To Station", "p_AutoPilot"), send("Sheep Job Done", "p_Swarm")], trace="Track stray sheep")],
    stm("Tracker Idle", [
        {"name": "Tracker Idle"},
        {"name": "Tracker On Call", "initial": "Waiting For A Stray", "states": [
            {"name": "Waiting For A Stray"},
            {"name": "Busy Elsewhere"},
            {"name": "Asking For Sheep Job", "entry": "Ask to follow the sheep"},
            {"name": "Following Sheep Out", "entry": "Go after the sheep"}],
         "transitions": [t("Waiting For A Stray", "Busy Elsewhere", "Off Station"), t("Busy Elsewhere", "Waiting For A Stray", "On Station"),
                         t("Waiting For A Stray", "Asking For Sheep Job", JOB_OPEN),
                         t("Asking For Sheep Job", "Following Sheep Out", "Sheep Job Given"),
                         t("Asking For Sheep Job", "Waiting For A Stray", "Sheep Job Taken"),
                         t("Following Sheep Out", "Waiting For A Stray", BACK_IN_ZONE, "Bring the sheep back")]},
        {"name": "Tracker Stopped"}],
        [t("Tracker Idle", "Tracker On Call", "Mission Started"), t("Tracker On Call", "Tracker Stopped", "Mission Over")]))

PREDATOR_MANAGEMENT = component(
    "Predator Management",
    "Region Predator Monitoring of the mission. Plug it in a drone: thermal camera and deterrent. A bear in the tracking perimeter: "
    "it asks for the job; given, it tracks it and deters it until it has left. On a drone waiting at the base, it hears the alarm of the field.",
    [{"name": "p_AutoPilot", "in": TO_COMPONENTS, "out": PREDATOR_ORDERS + ["Predator Alert", "Predator Cleared"]},
     {"name": "p_Camera", "in": PREDATOR_OBS},
     {"name": "p_Swarm", "out": ["Ask Predator Job", "Predator Job Done"], "in": ["Predator Job Given", "Predator Job Taken"]},
     {"name": "p_Light", "out": ["Light burst"]},
     {"name": "p_Sound", "out": ["Sound burst"]}],
    [fn("Watch for the bear", [call("acquire animal signature"), call("Detect Predator")], trace="Predator monitoring"),
     fn("Ask for the bear job", [call("Compute target position"), call("store Predator location"), send("Ask Predator Job", "p_Swarm")], trace="Predator monitoring"),
     fn("Start tracking", [send("Track Predator", "p_AutoPilot"), send("Predator Alert", "p_AutoPilot")], trace="Start Predator Tracking"),
     fn("Burst", [send("Deter", "p_AutoPilot"), send("Light burst", "p_Light"), send("Sound burst", "p_Sound")], trace="Trigger predator counter actions"),
     fn("Stop bursts", [send("Stop Deterring", "p_AutoPilot")], trace="Trigger predator counter actions"),
     fn("Bear gone", [send("Back To Station", "p_AutoPilot"), send("Predator Cleared", "p_AutoPilot"), send("Predator Job Done", "p_Swarm")], trace="Start Predator Tracking")],
    stm("Predator Idle", [
        {"name": "Predator Idle"},
        {"name": "Predator On Duty", "initial": "Watching For Bear", "states": [
            {"name": "Watching For Bear", "do": "Watch for the bear"},
            {"name": "Predator Paused"},
            {"name": "Asking For Bear Job", "entry": "Ask for the bear job"},
            {"name": "Tracking Bear", "entry": "Start tracking"},
            {"name": "Deterring Bear", "entry": "Burst"}],
         "transitions": [t("Watching For Bear", "Predator Paused", "Off Station"), t("Predator Paused", "Watching For Bear", "On Station"),
                         t("Watching For Bear", "Asking For Bear Job", BEAR_TRACKING),
                         t("Asking For Bear Job", "Tracking Bear", "Predator Job Given"),
                         t("Asking For Bear Job", "Watching For Bear", "Predator Job Taken"),
                         t("Tracking Bear", "Deterring Bear", BEAR_SAFE),
                         t("Deterring Bear", "Tracking Bear", BEAR_TRACKING, "Stop bursts"),
                         t("Tracking Bear", "Watching For Bear", BEAR_OUTSIDE, "Bear gone")]},
        {"name": "Predator Stopped"}],
        [t("Predator Idle", "Predator On Duty", "Mission Started"), t("Predator On Duty", "Predator Stopped", "Mission Over")]))

BASE_STANDBY = component(
    "Base Standby",
    "Plug it in a drone that should wait at the base instead of flying to the field: it stays docked, and takes off when one of its components "
    "gets a job. Nothing is watched from the ground: a drone with Base Standby keeps no field.",
    [{"name": "p_AutoPilot", "in": ["Mission Started", "On Station"], "out": [STAY]}],
    [fn("Hold at base", reactions=[("Mission Started", [send(STAY, "p_AutoPilot")]), ("On Station", [send(STAY, "p_AutoPilot")])])],
    stm("Holding At Base", [{"name": "Holding At Base", "do": "Hold at base"}]))


def swarm_master():
    """One drone on each job at most, so with three drones one always keeps the field. The trigger's port says which
    drone asked, and the answer goes back to that drone alone. A request that comes while the master changes state is lost
    (Cameo drops an event nothing takes), so the others are told no three times: on the give, on any request while the job
    is held, and when the job ends. The sheep job opens first, when someone has spotted the stray: the tracker does not see it.
    It stays open until someone takes it, and is announced again each time a stray is spotted."""
    ports = [{"name": f"p_Drone{n}", "in": ASK, "out": ANSWER} for n in DRONES]
    functions, regions = [], []
    for job, label in (("Sheep", "stray sheep"), ("Predator", "predator")):
        free = f"{job} Job Free"
        states = [{"name": free}]
        transitions = []
        ask, given, taken, done = f"Ask {job} Job", f"{job} Job Given", f"{job} Job Taken", f"{job} Job Done"
        waiting = free
        if job == "Sheep":
            opens = [send(JOB_OPEN, f"p_Drone{n}") for n in DRONES]
            waiting = "Sheep Job Offered"
            functions.append(fn("Open the sheep job", opens))
            functions.append(fn("Keep the sheep job open", reactions=[(SPOTTED, opens)]))
            states.append({"name": waiting, "do": "Keep the sheep job open"})
            transitions.append(t(free, waiting, SPOTTED, "Open the sheep job"))
        for n in DRONES:
            refuse = [send(taken, f"p_Drone{m}") for m in DRONES if m != n]
            grant, hold, end = f"{job} job to drone {n}", f"{job} job held by drone {n}", f"{job} job ended by drone {n}"
            functions.append(fn(grant, [send(given, f"p_Drone{n}")] + refuse))
            functions.append(fn(hold, reactions=[(ask, refuse)]))
            functions.append(fn(end, refuse))
            state = f"{job} On Drone {n}"
            states.append({"name": state, "do": hold})
            transitions += [t(waiting, state, ask, grant, via=f"p_Drone{n}"), t(state, free, done, end)]
        regions.append(region(f"Who follows the {label}", free, states, transitions))
    return component(
        "Swarm Master",
        "The intelligence of the swarm. Drop it once: in the Base Station, or in a drone that becomes the master. It opens the job of the stray sheep "
        "to every drone when someone spots one, gives each job (the stray sheep, the predator) to the first drone that asks and tells the others it is "
        "taken, so a drone always keeps the field.",
        ports, functions,
        stm("Master Running", [{"name": "Master Running", "regions": regions}, {"name": "Master Lost"}],
            [t("Master Running", "Master Lost", "Master Radio Lost")]))


SWARM_REFLEX = component(
    "Swarm Reflex",
    "The other intelligence: none. Drop one in each drone. The drone says yes to itself: every drone that sees something goes, and it calls nobody else.",
    [{"name": "p_Drone", "in": ASK, "out": ANSWER}],
    [fn("Say yes", reactions=[(SPOTTED, [send(JOB_OPEN, "p_Drone")]), ("Ask Sheep Job", [send("Sheep Job Given", "p_Drone")]), ("Ask Predator Job", [send("Predator Job Given", "p_Drone")])])],
    stm("Reflex On", [{"name": "Reflex On", "do": "Say yes"}]))

# --------------------------------------------------------------------------- the bricks of the base station: each one missing fails a mission

OPERATOR_COMMUNICATION = component(
    "Operator Communication",
    "Plug it in the Base Station. The link with the operator: it passes the commands of the operator app on to Ground Control, and tells "
    "the operator when the base is ready. Without it the base hears nothing, and nothing starts.",
    [{"name": "p_App", "in": CMDS, "out": ["Ready for mission"]},
     {"name": "p_Ground", "out": OPS, "in": [READY_REPORT]}],
    [fn("Relay the operator", reactions=[("Start SOI", [send("Base Start", "p_Ground")]),
                                                                     ("FlightPlan", [send("Base Flight Plan", "p_Ground")]),
                                                                     ("Start Sheep Guard Mission", [send("Base Launch", "p_Ground")]),
                                                                     (READY_REPORT, [send("Ready for mission", "p_App")])])],
    stm("Link Up", [{"name": "Link Up", "do": "Relay the operator"}]))

WEATHER_MONITORING = component(
    "Weather Monitoring",
    "Plug it in the Base Station. It reads the weather station: on a storm it warns Ground Control, which calls the drones back, and tells "
    "the operator. Without it nobody watches the sky: the drones stay out in the storm.",
    [{"name": "p_Weather", "in": ["Weather OK", "Weather Alert"]},
     {"name": "p_Ground", "out": [STORM]},
     {"name": "p_App", "out": ["Weather Alert"]}],
    [fn("Read the sky", trace="Monitor flight conditions", reactions=[("Weather OK", []),
                                                                      ("Weather Alert", [send(STORM, "p_Ground"), send("Weather Alert", "p_App")])])],
    stm("Watching Sky", [{"name": "Watching Sky", "do": "Read the sky"}]))

MISSION_MONITORING = component(
    "Mission Monitoring",
    "Plug it in the Base Station. It passes the alerts of the drones (a sheep out, a bear, the bear gone) on to the operator. Without it the "
    "drones do their job, but nobody on the ground knows.",
    [{"name": "p_Drones", "in": ALERTS},
     {"name": "p_App", "out": ALERTS}],
    [fn("Report to the operator", reactions=[(a, [send(a, "p_App")]) for a in ALERTS])],
    stm("Monitoring Mission", [{"name": "Monitoring Mission", "do": "Report to the operator"}]))

CHARGING_DOCK = component(
    "Charging Dock",
    "Plug it in the Base Station. Landing pads and chargers for up to three drones: a drone coming home asks to land, the dock clears it. "
    "Without it a drone coming home has nowhere to land.",
    [{"name": "p_Drones", "in": [ASK_LANDING], "out": [LANDING_CLEAR]}],
    [fn("Clear for landing", trace="Return to base", reactions=[(ASK_LANDING, [send(LANDING_CLEAR, "p_Drones")])])],
    stm("Dock Open", [{"name": "Dock Open", "do": "Clear for landing"}]))

LIBRARY = ["Zone Surveillance", "Flock Watching", "Sheep Tracking", "Predator Management", "Base Standby", "Swarm Master", "Swarm Reflex",
           "Operator Communication", "Weather Monitoring", "Mission Monitoring", "Charging Dock"]


# --------------------------------------------------------------------------- what is given

FLIGHT_ORCHESTRATOR = component(
    "Flight Orchestrator",
    "Given in every drone, not to be changed. On the order of the base station it briefs its components and takes off, unless a Base Standby "
    "keeps it docked; then it flies where its components tell it. It never asks them anything, which is why any of them can be there or not.",
    [{"name": "p_Base", "in": FLIGHT_ORDERS + [LANDING_CLEAR], "out": ALERTS + [ASK_LANDING]},
     {"name": "p_Components", "out": TO_COMPONENTS, "in": list(dict.fromkeys(SHEEP_ORDERS + PREDATOR_ORDERS + ALERTS + [STAY]))}],
    [fn("Load flight plan", [call("Acquire Flight Plan"), call("Check Flight Plan validity")], trace="Load Flight Plan"),
     fn("Brief the components", [send("Mission Started", "p_Components")]),
     fn("Fly to station", [call("get current position"), call("Follow path")], trace="Going to Safe Area"),
     fn("Arrive on station", [send("On Station", "p_Components")]),
     fn("Leave station", [send("Off Station", "p_Components")]),
     fn("Fly back", [send("Mission Over", "p_Components"), call("get current position"), call("Follow path"), send(ASK_LANDING, "p_Base")], trace="Return to base"),
     fn("Pass alerts on", reactions=[(a, [send(a, "p_Base")]) for a in ALERTS])],
    stm("Powered", [{"name": "Powered", "regions": [
        region("flight", "Docked", [
            {"name": "Docked", "initial": "Unconfigured", "states": [
                {"name": "Unconfigured"}, {"name": "Ready", "do": "Load flight plan"},
                {"name": "Mission Briefing", "entry": "Brief the components"}, {"name": "Standing By"}],
             "transitions": [t("Unconfigured", "Ready", "FlightPlan"), t("Ready", "Mission Briefing", "Go Patrol"),
                             t("Mission Briefing", "Standing By", STAY)]},
            {"name": "Flying", "initial": "Going to Station", "states": [
                {"name": "Going to Station", "do": "Fly to station"},
                {"name": "On Station", "entry": "Arrive on station"},
                {"name": "Following Sheep", "entry": "Leave station"},
                {"name": "Tracking Predator", "entry": "Leave station"},
                {"name": "Deterring Predator"}],
             "transitions": [t("Going to Station", "On Station"), t("On Station", "Following Sheep", "Follow Sheep"),
                             t("Following Sheep", "On Station", "Back To Station"), t("On Station", "Tracking Predator", "Track Predator"),
                             t("Tracking Predator", "Deterring Predator", "Deter"), t("Deterring Predator", "Tracking Predator", "Stop Deterring"),
                             t("Tracking Predator", "On Station", "Back To Station")]},
            {"name": "Returning", "do": "Fly back"}, {"name": "Landed"}],
            # Mission Briefing -> Flying, after a moment, is added by scripts/build-part4-model.mjs: the builder has no time trigger.
            [t("Standing By", "Following Sheep", "Follow Sheep"), t("Standing By", "Tracking Predator", "Track Predator"),
             t("Standing By", "Returning", "Recall Drones"), t("On Station", "Standing By", STAY),
             t("Flying", "Returning", "Recall Drones"), t("Returning", "Landed", LANDING_CLEAR)]),
        region("alerts", "Passing Alerts", [{"name": "Passing Alerts", "do": "Pass alerts on"}])]}]))

GROUND_CONTROL = component(
    "Ground Control",
    "Given in the base station, not to be changed. Distributes the flight plan, launches the drones and recalls them. It hears the "
    "operator and the weather only through the bricks of the base station, and decides nothing about who does what in flight.",
    [{"name": "p_Ops", "in": OPS, "out": [READY_REPORT]}, {"name": "p_Weather", "in": [STORM]},
     {"name": "p_Drones", "out": FLIGHT_ORDERS}],
    [fn("Distribute Flight Plan", [call("Acquire Flight Plan"), call("Check Flight Plan validity"), send("FlightPlan", "p_Drones"), send(READY_REPORT, "p_Ops")], trace="Load Flight Plan"),
     fn("Launch Drones", [send("Go Patrol", "p_Drones")], trace="Going to Safe Area"),
     fn("Recall All Drones", [send("Recall Drones", "p_Drones")], trace="Return to base")],
    stm("Base Off", [{"name": "Base Off"}, {"name": "Base Unconfigured"}, {"name": "Base Ready"}, {"name": "Mission Running"}, {"name": "Recalled"}],
        [t("Base Off", "Base Unconfigured", "Base Start"), t("Base Unconfigured", "Base Ready", "Base Flight Plan", "Distribute Flight Plan"),
         t("Base Ready", "Mission Running", "Base Launch", "Launch Drones"), t("Mission Running", "Recalled", STORM, "Recall All Drones")]))

OPERATOR_APP = component(
    "Operator App",
    "Given. Turns the actions of the operator into commands for the base station, and shows what comes back.",
    [{"name": "p_Operator", "in": CMDS, "out": FEEDBACK}, {"name": "p_Base", "out": CMDS, "in": FEEDBACK}],
    [fn("Relay operator", reactions=[(c, [send(c, "p_Base")]) for c in CMDS] + [(f, [send(f, "p_Operator")]) for f in FEEDBACK])],
    stm("App Running", [{"name": "App Running", "do": "Relay operator"}]))

WEATHER_STATION = component(
    "Weather Station",
    "Given. Measures the wind on the pasture and tells the base station whether drones may fly.",
    [{"name": "p_Wind", "in": WIND}, {"name": "p_Base", "out": ["Weather OK", "Weather Alert"]}],
    [fn("Measure weather", trace="Monitor flight conditions", reactions=[("Wind Calm", [send("Weather OK", "p_Base")]), ("Wind Storm", [send("Weather Alert", "p_Base")])])],
    stm("Measuring", [{"name": "Measuring", "do": "Measure weather"}]))

OPERATOR = {
    "name": "Operator", "doc": "Simulation driver: the operator. The guide injects its commands here.",
    "ports": [{"name": "p_App", "out": CMDS, "in": FEEDBACK}],
    "functions": [fn("Operator console", reactions=[(c, [send(c, "p_App")]) for c in CMDS])],
    # The screen: what the guide reads to know whether the operator was told (the Mission Monitoring of the base station).
    "stm": stm("Operating", [{"name": "Operating", "regions": [
        region("console", "Console", [{"name": "Console", "do": "Operator console"}]),
        region("screen", "Screen Quiet", [{"name": "Screen Quiet"}, {"name": "Sheep Alert On Screen"}, {"name": "Predator Alert On Screen"}],
               [t("Screen Quiet", "Sheep Alert On Screen", "Sheep Exit Alert"), t("Predator Alert On Screen", "Sheep Alert On Screen", "Sheep Exit Alert"),
                t("Screen Quiet", "Predator Alert On Screen", "Predator Alert"), t("Sheep Alert On Screen", "Predator Alert On Screen", "Predator Alert")])]}]),
}
WEATHER = {
    "name": "Weather", "doc": "Simulation driver: the wind.",
    "ports": [{"name": "p_Wind", "out": WIND}],
    "functions": [fn("Weather world", reactions=[(w, [send(w, "p_Wind")]) for w in WIND])],
    "stm": stm("Weather World", [{"name": "Weather World", "do": "Weather world"}]),
}
PASTURE = {
    "name": "Pasture", "doc": "Simulation driver: what happens on the field. Every drone sees it; only the ones with the right component react.",
    "ports": [{"name": "p_Camera", "out": SHEEP_OBS + PREDATOR_OBS}, {"name": "p_Light", "in": ["Light burst"]}, {"name": "p_Sound", "in": ["Sound burst"]}],
    "functions": [fn("Pasture world", reactions=[(o, [send(o, "p_Camera")]) for o in SHEEP_OBS + PREDATOR_OBS] + [("Light burst", []), ("Sound burst", [])])],
    "stm": stm("Pasture World", [{"name": "Pasture World", "do": "Pasture world"}]),
}


def drone(n):
    wings = [{"name": f"p_Wing{m}", "in": ASK, "out": ANSWER} for m in DRONES if m != n]
    return {
        "name": f"Drone {n}", "stereotypes": ["Logical Component"],
        "doc": "A drone. Drag the components from the Library onto its diagram. Its ports are given: the drone is ready for any of them.",
        "ports": [{"name": "p_Base", "in": FLIGHT_ORDERS + [LANDING_CLEAR], "out": ALERTS + [ASK_LANDING]}, {"name": "p_Camera", "in": SHEEP_OBS + PREDATOR_OBS},
                  {"name": "p_Swarm", "out": ASK, "in": ANSWER}, {"name": "p_Light", "out": ["Light burst"]}, {"name": "p_Sound", "out": ["Sound burst"]}] + wings,
        "parts": [{"name": "fo", "type": "Flight Orchestrator"}],
        "connectors": [["p_Base", "fo.p_Base"]],
    }


def swarm_spec():
    base = {
        "name": "Base Station", "stereotypes": ["Logical Component"],
        "doc": "The base station. Ground Control is given. Drag here what links it to the operator, the weather and the drones coming home "
               "(Operator Communication, Weather Monitoring, Mission Monitoring, Charging Dock); the Swarm Master can be dropped here too.",
        "ports": [{"name": "p_App", "in": CMDS, "out": FEEDBACK}, {"name": "p_Weather", "in": ["Weather OK", "Weather Alert"]},
                  {"name": "p_Drones", "out": FLIGHT_ORDERS + [LANDING_CLEAR], "in": ALERTS + [ASK_LANDING]}] +
                 [{"name": f"p_Swarm{n}", "in": ASK, "out": ANSWER} for n in DRONES],
        "parts": [{"name": "gc", "type": "Ground Control"}],
        "connectors": [["p_Drones", "gc.p_Drones"]],
    }
    soi = {
        "name": SOI, "stereotypes": ["Logical Component"],
        "doc": "The system of interest of Part 4: the whole solution. The drones, the base station, the weather station and the operator app are connected; "
               "what links a drone to the intelligence depends on where you put it.",
        "ports": [{"name": "p_Operator", "in": CMDS, "out": FEEDBACK}, {"name": "p_Wind", "in": WIND}, {"name": "p_Camera", "in": SHEEP_OBS + PREDATOR_OBS},
                  {"name": "p_Light", "out": ["Light burst"]}, {"name": "p_Sound", "out": ["Sound burst"]}],
        "parts": [{"name": "app", "type": "Operator App"}, {"name": "base", "type": "Base Station"}, {"name": "ws", "type": "Weather Station"}] +
                 [{"name": f"drone{n}", "type": f"Drone {n}"} for n in DRONES],
        # Only what leads somewhere from the start: a port of the base or of a drone that nothing inside takes is linked by Auto
        # Connect once a brick takes it (the operator app to the base, the camera to a drone...).
        "connectors": [["p_Operator", "app.p_Operator"], ["p_Wind", "ws.p_Wind"]] + [["base.p_Drones", f"drone{n}.p_Base"] for n in DRONES],
    }
    simulation = {
        "name": SIMULATION, "doc": "The system between the operator, the weather and the pasture. The guide plays the missions here.",
        "parts": [{"name": "soi", "type": SOI}, {"name": "operator", "type": "Operator"}, {"name": "weather", "type": "Weather"}, {"name": "pasture", "type": "Pasture"}],
        "connectors": [["operator.p_App", "soi.p_Operator"], ["weather.p_Wind", "soi.p_Wind"], ["pasture.p_Camera", "soi.p_Camera"],
                       ["soi.p_Light", "pasture.p_Light"], ["soi.p_Sound", "pasture.p_Sound"]],
    }
    # Parts typed by a block of `contexts` keep their name (the paths of the simulation): drones, base, soi.
    return {
        "owner": {"elementId": LOGICAL_ANALYSIS}, "name": PACKAGE, "replace": True, "reuseSignals": True,
        "reuseScope": [{"elementId": FUNCTIONAL_ANALYSIS}], "stateStereotype": "Logical Mode",
        "functions": [fn("Define watch pathing"), fn("Follow path"), fn("get current position"), fn("Acquire Flight Plan"), fn("Check Flight Plan validity"),
                      fn("Capture surounding"), fn("Detect Sheeps"), fn("Count Sheep", [call("Detect Sheeps"), call("store sheeps location"), call("Send sheep location")]),
                      fn("Detect sheep exit"), fn("acquire animal signature"), fn("Detect Predator"), fn("Compute target position"), fn("store Predator location")],
        "blocks": [ZONE_SURVEILLANCE, FLOCK_WATCHING, SHEEP_TRACKING, PREDATOR_MANAGEMENT, BASE_STANDBY, swarm_master(), SWARM_REFLEX,
                   OPERATOR_COMMUNICATION, WEATHER_MONITORING, MISSION_MONITORING, CHARGING_DOCK, FLIGHT_ORCHESTRATOR, GROUND_CONTROL, OPERATOR_APP, WEATHER_STATION,
                   OPERATOR, WEATHER, PASTURE],
        "contexts": [drone(n) for n in DRONES] + [base, soi, simulation],
    }


def check_functions_unique(spec):
    """Every function that sends belongs to one block, and a name is declared once (the builder refuses it otherwise)."""
    seen = {f["name"] for f in spec["functions"]}
    for block in spec["blocks"]:
        for f in block.get("functions", []):
            assert f["name"] not in seen, f"function '{f['name']}' declared twice ({block['name']})"
            seen.add(f["name"])


def write(name, spec):
    OUT.mkdir(exist_ok=True)
    (OUT / f"{name}.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
    print(name, "blocks", len(spec["blocks"]), "contexts", len(spec["contexts"]), "functions", len(spec["functions"]) + sum(len(b.get("functions", [])) for b in spec["blocks"]))


if __name__ == "__main__":
    swarm = swarm_spec()
    check_functions_unique(swarm)
    write("swarm", swarm)
