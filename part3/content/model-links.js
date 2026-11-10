/* Every place of the Cameo model that the Part 3 guide points to, defined once.
   Same format as content/model-links.js of Part 1 (see there for the fields).
   The ids are those of the correction project (UAV_BE_Note_2026_BE_L-Architecture - part 3 correction): the
   starting model is cut from it, so they should still hold; if not, the button finds the element by name.
   The feature blocks are created by the students (made: true): found by name only.
   strict: the corrections hold copies with the same names, so only the exact path counts. */
window.MODEL_LINKS = {
  "fa-mission": {
    name: "SOI - Pasture Sentinel",
    type: "stm",
    id: "_2022x_2_302b0611_1731014591074_699015_18793",
    path: ["2 - Functional Analysis", "SOI - Pasture Sentinel", "SOI - Pasture Sentinel"],
    kinds: ["package", "block", "stm"],
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
  "a1-pkg": {
    name: "1 - Mission orchestrator, autonomous features",
    type: "package",
    id: "_2026x_1_1fda04ff_1793225364658_296365_20765",
    path: ["3 - Logical Analysis", "1 - Mission orchestrator, autonomous features"],
    url: ""
  },
  "a1-ibd": {
    name: "Logical SOI 1 - Mission orchestrator",
    type: "ibd",
    id: "_2026x_1_1fda04ff_1793225365404_299378_22630",
    path: ["3 - Logical Analysis", "1 - Mission orchestrator, autonomous features", "Logical SOI 1 - Mission orchestrator", "Logical SOI 1 - Mission orchestrator"],
    kinds: ["package", "package", "block", "ibd"],
    url: ""
  },
  "a1-sim": {
    name: "Logical SOI 1 - Mission orchestrator Simulation",
    type: "block",
    id: "_2026x_1_1fda04ff_1793225364727_19019_20876",
    path: ["3 - Logical Analysis", "1 - Mission orchestrator, autonomous features", "Logical SOI 1 - Mission orchestrator Simulation"],
    url: ""
  },
  "a2-pkg": {
    name: "2 - Patch, decentralized",
    type: "package",
    id: "_2026x_1_1fda04ff_1793225438838_892256_22954",
    path: ["3 - Logical Analysis", "2 - Patch, decentralized"],
    url: ""
  },
  "a2-ibd": {
    name: "Logical SOI 2 - Patch",
    type: "ibd",
    id: "_2026x_1_1fda04ff_1793225439164_856495_24732",
    path: ["3 - Logical Analysis", "2 - Patch, decentralized", "Logical SOI 2 - Patch", "Logical SOI 2 - Patch"],
    kinds: ["package", "package", "block", "ibd"],
    url: ""
  },
  "a2-sim": {
    name: "Logical SOI 2 - Patch Simulation",
    type: "block",
    id: "_2026x_1_1fda04ff_1793225438878_640653_23152",
    path: ["3 - Logical Analysis", "2 - Patch, decentralized", "Logical SOI 2 - Patch Simulation"],
    url: ""
  },
  "a3-pkg": {
    name: "3 - Centralized orchestrator",
    type: "package",
    id: "_2026x_1_1fda04ff_1793225482883_823051_25026",
    path: ["3 - Logical Analysis", "3 - Centralized orchestrator"],
    url: ""
  },
  "a3-ibd": {
    name: "Logical SOI 3 - Centralized orchestrator",
    type: "ibd",
    id: "_2026x_1_1fda04ff_1793225483304_96907_27241",
    path: ["3 - Logical Analysis", "3 - Centralized orchestrator", "Logical SOI 3 - Centralized orchestrator", "Logical SOI 3 - Centralized orchestrator"],
    kinds: ["package", "package", "block", "ibd"],
    url: ""
  },
  "a3-sim": {
    name: "Logical SOI 3 - Centralized orchestrator Simulation",
    type: "block",
    id: "_2026x_1_1fda04ff_1793225482909_385953_25139",
    path: ["3 - Logical Analysis", "3 - Centralized orchestrator", "Logical SOI 3 - Centralized orchestrator Simulation"],
    url: ""
  },
  "tp-components": {
    name: "Components",
    type: "package",
    id: "_2026x_1_1fda04ff_1793227710558_927283_30285",
    path: ["3 - Logical Analysis", "TP - Logical Architecture 1", "Components"],
    strict: true,
    url: ""
  },
  "tp-soi-ibd": {
    name: "TP1 SOI",
    type: "ibd",
    id: "_2026x_1_1fda04ff_1793227710817_391999_31206",
    path: ["3 - Logical Analysis", "TP - Logical Architecture 1", "Contexts", "TP1 SOI", "TP1 SOI"],
    kinds: ["package", "package", "package", "block", "ibd"],
    strict: true,
    url: ""
  },
  "mc-block": {
    name: "Mission Configuration",
    type: "block",
    path: ["3 - Logical Analysis", "TP - Logical Architecture 1", "Components", "Mission Configuration"],
    made: true,
    strict: true,
    note: "Create it in the package Components.",
    url: ""
  }
};
