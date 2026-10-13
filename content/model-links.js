/* Every place of the Cameo model that the guide points to, defined once.

   In a scene, write [[key]] to get a chip, or use a { path: "key" } block to
   show the whole path. Change a path here and it changes everywhere.

   name   what the student sees on the chip
   type   package | block | ucd | ibd | sd | ad | stm | matrix | usecase | actor | activity | signal
   path   where it sits in the Model Browser, top-down (last item = the element)
   kinds  optional, same length as path, when a parent is not a package
   id     UUID of the element in the model; "Open in Cameo" uses it through the relay
   url    deep link that opens the element in Cameo. Empty = not set yet.
   made   true when the student creates this element during the exercise
   note   optional remark shown in the sheet */
/* op-context points at the diagram (ibd), not at its owner block. */
window.MODEL_LINKS = {
  "op-context": {
    name: "Operational Context",
    type: "ibd",
    id: "_18_5_1_150503da_1505404791516_475074_31346",
    path: ["1 - Operational Analysis", "B - Operational Breakdown", "Operational Context", "Operational Context"],
    kinds: ["package", "package", "block", "ibd"],
    url: ""
  },
  "uc-pkg": {
    name: "C - Use Cases and Scenarios",
    type: "package",
    id: "_18_5_1_150503da_1505402151568_422184_22279",
    path: ["1 - Operational Analysis", "C - Use Cases and Scenarios"],
    url: ""
  },
  "uc-diagram": {
    name: "Use Cases and Scenarios",
    type: "ucd",
    id: "_18_5_1_150503da_1505458268401_324258_32142",
    path: ["1 - Operational Analysis", "C - Use Cases and Scenarios", "Use Cases and Scenarios"],
    url: ""
  },
  "uc-prepare-mission": {
    name: "Prepare Mission",
    type: "usecase",
    path: ["1 - Operational Analysis", "C - Use Cases and Scenarios", "1. Preparation phase", "Prepare Mission"],
    url: ""
  },
  "uc-parameter-mission": {
    name: "Parameter Mission",
    type: "usecase",
    id: "_2022x_2_302b0611_1730926135485_850170_18470",
    path: ["1 - Operational Analysis", "C - Use Cases and Scenarios", "1. Preparation phase", "Parameter Mission"],
    url: ""
  },
  "actors": {
    name: "Actors",
    type: "package",
    id: "_2022x_2_302b0611_1731013244413_470286_18335",
    path: ["1 - Operational Analysis", "C - Use Cases and Scenarios", "Actors"],
    url: ""
  },
  "fa-root": {
    name: "A - Functional architecture",
    type: "package",
    id: "_18_5_1_150503da_1505402151566_104641_22268",
    path: ["2 - Functional Analysis", "A - Functional architecture"],
    url: ""
  },
  "fa-deployment": {
    name: "Deployment",
    type: "package",
    id: "_2022x_2_302b0611_1731444773976_997827_18218",
    path: ["2 - Functional Analysis", "A - Functional architecture", "Deployment"],
    url: ""
  },
  "fa-parameter-mission": {
    name: "Parameter Mission",
    type: "package",
    path: ["2 - Functional Analysis", "A - Functional architecture", "Deployment", "Parameter Mission"],
    made: true,
    url: ""
  },
  "fn-load-flight-plan": {
    name: "Load Flight Plan",
    type: "activity",
    path: ["2 - Functional Analysis", "A - Functional architecture", "Deployment", "Parameter Mission", "Load Flight Plan"],
    made: true,
    url: ""
  },
  "fd-deployment": {
    name: "Deployement",
    type: "package",
    id: "_2022x_2_302b0611_1731443218616_486076_18212",
    path: ["2 - Functional Analysis", "B - Functional Data", "Deployement"],
    note: "Spelled “Deployement” in the model.",
    url: ""
  },
  "sig-flightplan": {
    name: "FlightPlan",
    type: "signal",
    id: "_18_5_1_150503da_1507558279689_751770_55767",
    path: ["2 - Functional Analysis", "B - Functional Data", "Deployement", "FlightPlan"],
    url: ""
  },
  "sig-check-failed": {
    name: "FlightPlan Check Failed",
    type: "signal",
    id: "_2022x_2_302b0611_1731444927800_460339_18282",
    path: ["2 - Functional Analysis", "B - Functional Data", "Deployement", "FlightPlan Check Failed"],
    url: ""
  },
  "sig-ready": {
    name: "Ready for mission",
    type: "signal",
    id: "_2022x_2_302b0611_1731443267988_400612_18222",
    path: ["2 - Functional Analysis", "B - Functional Data", "Deployement", "Ready for mission"],
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
    note: "The handout shortens this path to 3-A-SOI-SOI-SOI.",
    url: ""
  },
  "uav-data": {
    name: "UAV Data",
    type: "ibd",
    id: "_18_5_1_150503da_1507992230134_438593_55226",
    path: ["3 - Physical Analysis", "A - Physical architecture", "SOI - Pasture Sentinel", "UAV Data"],
    kinds: ["package", "package", "block", "ibd"],
    url: ""
  },
  "uav-energy": {
    name: "UAV Energy",
    type: "ibd",
    id: "_18_5_1_150503da_1507561671361_133338_50933",
    path: ["3 - Physical Analysis", "A - Physical architecture", "SOI - Pasture Sentinel", "UAV Energy"],
    kinds: ["package", "package", "block", "ibd"],
    url: ""
  }
};
