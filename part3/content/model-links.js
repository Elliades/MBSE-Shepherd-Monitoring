/* Every place of the Cameo model that the Part 3 guide points to, defined once.
   Same format as content/model-links.js of Part 1 (see there for the fields).
   The paths are those of the starting models (part3/assets/models/): all four have 3 - Logical Analysis > TP - Logical
   Architecture, built by scripts/build-part3-models.mjs, so they have no fixed id. Elsewhere, if an id no longer holds,
   the button finds the element by name.
   The feature blocks are created by the students (made: true): found by name only.
   strict: the corrections hold copies with the same names, so only the exact path counts. */
window.MODEL_LINKS = {
  "fa-mission": {
    name: "SOI - Pasture Sentinel",
    type: "stm",
    id: "_2022x_2_302b0611_1731014591074_699015_18793",
    path: ["SOI - Pasture Sentinel", "SOI - Pasture Sentinel", "SOI - Pasture Sentinel"],
    kinds: ["block", "stm", "stm"],
    note: "The functional mission: every Logical Transition starts from its states. It is never changed.",
    url: ""
  },
  "load-flight-plan": {
    name: "Load Flight Plan",
    type: "ad",
    id: "_2022x_2_302b0611_1731526311194_937883_18240",
    path: ["2 - Functional Analysis", "A - Functional architecture", "Deployement", "Load Flight Plan", "Load Flight Plan"],
    kinds: ["package", "package", "package", "activity", "ad"],
    note: "The functional activity. Its copy, made by Logical Transition, has the same name.",
    url: ""
  },
  "la-pkg": {
    name: "3 - Logical Analysis",
    type: "package",
    id: "_2026x_1_1fda04ff_1793137415433_578438_21729",
    path: ["3 - Logical Analysis"],
    url: ""
  },
  "tp-components": {
    name: "Components",
    type: "package",
    path: ["3 - Logical Analysis", "TP - Logical Architecture", "Components"],
    strict: true,
    url: ""
  },
  "tp-soi-ibd": {
    name: "TP Logical SOI",
    type: "ibd",
    path: ["3 - Logical Analysis", "TP - Logical Architecture", "Contexts", "TP Logical SOI", "TP Logical SOI"],
    kinds: ["package", "package", "package", "block", "ibd"],
    strict: true,
    url: ""
  },
  "mc-block": {
    name: "Mission Configuration",
    type: "block",
    path: ["3 - Logical Analysis", "TP - Logical Architecture", "Components", "Mission Configuration"],
    made: true,
    strict: true,
    note: "Create it in the package Components.",
    url: ""
  }
};

/* The starting models of chapter 6: one per architecture, with the same package, its blocks ready in it. A block holds
   its state machine, which holds its diagram, all three with the same name. */
[
  ["1", { orch: "Mission Orchestrator", sg: "Sheep Guard", zs: "Zone Surveillance", pd: "Predator Defense" }, ["orch"]],
  ["2", { zs: "Zone Surveillance", sm: "SheepMonitoring", pm: "Predator Management" }, ["sm", "pm"]],
  ["3", { orch: "Mission Orchestrator", zp: "Zone Patrolling", sm: "SheepMonitoring", pm: "Predator Management", trk: "Tracking" }, ["orch"]]
].forEach(([k, blocks, stms]) => {
  const top = ["3 - Logical Analysis", "TP - Logical Architecture"];
  const soi = "TP Logical SOI";
  window.MODEL_LINKS[`tp${k}-ibd`] = { name: soi, type: "ibd", path: top.concat("Contexts", soi, soi), kinds: ["package", "package", "package", "block", "ibd"], strict: true, url: "" };
  Object.keys(blocks).forEach((id) => {
    const path = top.concat("Components", blocks[id]);
    window.MODEL_LINKS[`tp${k}-${id}`] = { name: blocks[id], type: "block", path, strict: true, url: "" };
    if (stms.indexOf(id) >= 0) window.MODEL_LINKS[`tp${k}-${id}-stm`] = { name: blocks[id], type: "stm", path: path.concat(blocks[id], blocks[id]), kinds: ["package", "package", "package", "block", "stm", "stm"], strict: true, url: "" };
  });
});
