/* Every place of the Cameo model that the guide points to, defined once.

   In a scene, write [[key]] to get a chip, or use a { path: "key" } block to
   show the whole path. Change a path here and it changes everywhere.

   name   what the student sees on the chip
   type   package | block | ucd | ibd | sd | ad | stm | matrix | usecase | actor | activity | signal | iface
   path   where it sits in the Model Browser, top-down (last item = the element)
   kinds  optional, same length as path, when a parent is not a package
   id     UUID of the element in the model; "Open in Cameo" uses it through the relay
   url    deep link that opens the element in Cameo. Empty = not set yet.
   made   true when the student creates this element during the exercise. It has no id: the button
          "Find in Cameo" sends its name, type and path, and Cameo looks it up (README, "Links by name").
          Spell name and path exactly as the steps tell the student to type them.
   note   optional remark shown in the sheet
   diagram  optional key of the diagram this element is shown in when its chip is clicked (diagram/highlight).
          Without it, an element drawn as a shape (block, part, use case, actor, state) is shown in the last
          diagram named before it in the scene, or in the scene's own diagram: (README, "Show in a diagram"). */
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
    name: "Operational Elements",
    type: "package",
    id: "_18_5_1_150503da_1507202146685_601880_29270",
    path: ["1 - Operational Analysis", "B - Operational Breakdown", "Operational Elements"],
    url: ""
  },
  "if-pkg": {
    name: "D - Physical Interfaces",
    type: "package",
    id: "_18_5_1_150503da_1505402151080_135734_22144",
    path: ["1 - Operational Analysis", "D - Physical Interfaces"],
    url: ""
  },
  "if-flightplan": {
    name: "IF_FlightPlan",
    type: "iface",
    path: ["1 - Operational Analysis", "D - Physical Interfaces", "IF_FlightPlan"],
    made: true,
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
  "fa-parameter-mission-act": {
    name: "Parameter Mission",
    type: "activity",
    path: ["2 - Functional Analysis", "A - Functional architecture", "Deployment", "Parameter Mission"],
    made: true,
    note: "Same name as the package next to it: the type tells them apart. Once moved into the package, it sits one level deeper.",
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
    url: "",
    direct: true
  },
  "soi-block": {
    name: "SOI - Pasture Sentinel",
    type: "block",
    id: "_18_5_1_150503da_1507561671339_882422_50880",
    path: ["SOI - Pasture Sentinel"],
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
  "soi-configured": {
    name: "Configured",
    type: "state",
    path: ["3 - Physical Analysis", "A - Physical architecture", "SOI - Pasture Sentinel", "SOI - Pasture Sentinel", "Undeployed", "Configured"],
    kinds: ["package", "package", "block", "stm", "state", "state"],
    made: true,
    diagram: "soi-stm",
    note: "A state lives in the state machine, not in the diagram. Cameo may show a region between the state machine and its states.",
    url: ""
  },
  "op-uav-operator": {
    name: "uAV operator",
    type: "part",
    id: "_18_5_1_150503da_1505482325515_600953_38367",
    path: ["1 - Operational Analysis", "B - Operational Breakdown", "Operational Context", "uAV operator"],
    kinds: ["package", "package", "block", "part"],
    diagram: "op-context",
    strict: true,
    url: ""
  },
  "op-ground-station": {
    name: "groundStation",
    type: "part",
    id: "_18_5_1_150503da_1505404746423_141863_30984",
    path: ["1 - Operational Analysis", "B - Operational Breakdown", "Operational Context", "groundStation"],
    kinds: ["package", "package", "block", "part"],
    diagram: "op-context",
    strict: true,
    url: ""
  },
  "soi-unconfigured": {
    name: "Unconfigured",
    type: "state",
    id: "_2022x_2_302b0611_1731014601922_182454_18844",
    path: ["3 - Physical Analysis", "A - Physical architecture", "SOI - Pasture Sentinel", "SOI - Pasture Sentinel", "Undeployed", "Unconfigured"],
    kinds: ["package", "package", "block", "stm", "state", "state"],
    diagram: "soi-stm",
    url: ""
  },
  "soi-ready": {
    name: "Ready for Mission",
    type: "state",
    id: "_2022x_2_302b0611_1731443078975_697364_18188",
    path: ["3 - Physical Analysis", "A - Physical architecture", "SOI - Pasture Sentinel", "SOI - Pasture Sentinel", "Undeployed", "Ready for Mission"],
    kinds: ["package", "package", "block", "stm", "state", "state"],
    diagram: "soi-stm",
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
