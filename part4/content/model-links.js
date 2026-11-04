/* Every place of the Cameo model that the Part 4 guide points to, defined once.
   Same format as content/model-links.js of Part 1 (see there for the fields). The paths are those of the starting model
   (part4/assets/models/UAV_Part4_Swarm.mdzip), built by scripts/build-part4-model.mjs, so they have no fixed id. */
window.MODEL_LINKS = {
  "op-context": {
    name: "Operational Context",
    type: "ibd",
    id: "_18_5_1_150503da_1505404791516_475074_31346",
    path: ["1 - Operational Analysis", "B - Operational Breakdown", "Operational Context", "Operational Context"],
    kinds: ["package", "package", "block", "ibd"],
    url: ""
  },
  "mission-stm": {
    name: "SOI - Pasture Sentinel",
    type: "stm",
    id: "_2026x_1_1fda04ff_1793627754723_282233_24843",
    /* the diagram; its block, at the root of the model: _2026x_1_1fda04ff_1793627754661_116181_24721 */
    path: ["SOI - Pasture Sentinel", "SOI - Pasture Sentinel", "SOI - Pasture Sentinel"],
    kinds: ["block", "stm", "stm"],
    url: ""
  },
  "tp-swarm": {
    name: "TP - Swarm",
    type: "package",
    path: ["3 - Logical Analysis", "TP - Swarm"],
    strict: true,
    url: ""
  },
  "tp-library": {
    name: "Library",
    type: "package",
    path: ["3 - Logical Analysis", "TP - Swarm", "Library"],
    strict: true,
    url: ""
  },
  "soi-ibd": {
    name: "Pasture Sentinel System",
    type: "ibd",
    path: ["3 - Logical Analysis", "TP - Swarm", "Contexts", "Pasture Sentinel System", "Pasture Sentinel System"],
    kinds: ["package", "package", "package", "block", "ibd"],
    strict: true,
    url: ""
  },
  "base-ibd": {
    name: "Base Station",
    type: "ibd",
    path: ["3 - Logical Analysis", "TP - Swarm", "Contexts", "Base Station", "Base Station"],
    kinds: ["package", "package", "package", "block", "ibd"],
    strict: true,
    url: ""
  },
  "drone1-ibd": {
    name: "Drone 1",
    type: "ibd",
    path: ["3 - Logical Analysis", "TP - Swarm", "Contexts", "Drone 1", "Drone 1"],
    kinds: ["package", "package", "package", "block", "ibd"],
    strict: true,
    url: ""
  },
  "drone2-ibd": {
    name: "Drone 2",
    type: "ibd",
    path: ["3 - Logical Analysis", "TP - Swarm", "Contexts", "Drone 2", "Drone 2"],
    kinds: ["package", "package", "package", "block", "ibd"],
    strict: true,
    url: ""
  },
  "drone3-ibd": {
    name: "Drone 3",
    type: "ibd",
    path: ["3 - Logical Analysis", "TP - Swarm", "Contexts", "Drone 3", "Drone 3"],
    kinds: ["package", "package", "package", "block", "ibd"],
    strict: true,
    url: ""
  }
};
