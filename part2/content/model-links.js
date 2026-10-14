/* Every place of the Cameo model that the Part 2 guide points to, defined once.
   Same format as content/model-links.js of Part 1 (see there for the fields).

   The ids come from Part 1: the elements both models share. They were not read from the marked model:
   check them there before relying on "Open in Cameo". Elements that only the marked model has, or that
   the students create, have no id. */
window.MODEL_LINKS = {
  "op-context": {
    name: "Operational Context",
    type: "ibd",
    id: "_18_5_1_150503da_1505404791516_475074_31346",
    path: ["1 - Operational Analysis", "B - Operational Breakdown", "Operational Context", "Operational Context"],
    kinds: ["package", "package", "block", "ibd"],
    url: ""
  },
  "op-elements": {
    name: "Operational Elements",
    type: "package",
    path: ["1 - Operational Analysis", "B - Operational Breakdown", "Operational Elements"],
    url: ""
  },
  "bear-actor": {
    name: "Bear",
    type: "actor",
    path: ["1 - Operational Analysis", "B - Operational Breakdown", "Operational Elements", "Bear"],
    url: ""
  },
  "uc-pkg": {
    name: "C - Use Cases and Scenarios",
    type: "package",
    id: "_18_5_1_150503da_1505402151568_422184_22279",
    path: ["1 - Operational Analysis", "C - Use Cases and Scenarios"],
    note: "The letter of the package may be different in your model. The name is the same.",
    url: ""
  },
  "uc-diagram": {
    name: "Use Cases and Scenarios",
    type: "ucd",
    id: "_18_5_1_150503da_1505458268401_324258_32142",
    path: ["1 - Operational Analysis", "C - Use Cases and Scenarios", "Use Cases and Scenarios"],
    url: ""
  },
  "fa-root": {
    name: "A - Functional architecture",
    type: "package",
    id: "_18_5_1_150503da_1505402151566_104641_22268",
    path: ["2 - Functional Analysis", "A - Functional architecture"],
    url: ""
  },
  "fa-predator": {
    name: "Predator management",
    type: "package",
    path: ["2 - Functional Analysis", "A - Functional architecture", "Predator management"],
    url: ""
  },
  "fd-root": {
    name: "B - Functional Data",
    type: "package",
    path: ["2 - Functional Analysis", "B - Functional Data"],
    url: ""
  },
  "alloc-pkg": {
    name: "C - Traceability",
    type: "package",
    id: "_18_5_1_150503da_1507786300339_633554_48526",
    path: ["2 - Functional Analysis", "C - Traceability"],
    url: ""
  },
  "alloc-matrix": {
    name: "Function Allocation",
    type: "matrix",
    id: "_18_5_1_150503da_1508075554206_519867_57817",
    path: ["2 - Functional Analysis", "C - Traceability", "Function Allocation"],
    url: ""
  },
  "pa-root": {
    name: "A - Physical architecture",
    type: "package",
    path: ["3 - Physical Analysis", "A - Physical architecture"],
    note: "The block definition diagram of the physical architecture is in this package.",
    url: ""
  },
  "soi-block": {
    name: "SOI - Pasture Sentinel",
    type: "block",
    id: "_18_5_1_150503da_1507561671339_882422_50880",
    path: ["3 - Physical Analysis", "A - Physical architecture", "SOI - Pasture Sentinel"],
    url: ""
  },
  "soi-stm": {
    name: "SOI - Pasture Sentinel",
    type: "stm",
    id: "_2022x_2_302b0611_1731014591077_951578_18794",
    path: ["3 - Physical Analysis", "A - Physical architecture", "SOI - Pasture Sentinel", "SOI - Pasture Sentinel", "SOI - Pasture Sentinel"],
    kinds: ["package", "package", "block", "stm", "stm"],
    url: ""
  }
};
