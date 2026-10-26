/* Part 3, a fleet of drones: chapters, then scenes in reading order. One scene = one idea.
   Same engine, marks and blocks as Part 1 (see content/scenes.js at the root for the list).
   A first skeleton: the tasks of Part 3 are still to be written, the placeholders say what is missing. */
window.COURSE = {
  phases: [
    { id: "op", title: "Operational analysis", short: "Operational", q: "What is expected of the system?" },
    { id: "fn", title: "Functional architecture", short: "Functional", q: "How does it do it?" },
    { id: "ph", title: "Physical architecture", short: "Physical", q: "Who does what?" }
  ],

  chapters: [
    { id: "brief", code: "0", title: "Briefing", blurb: "From one drone to a fleet." },
    { id: "fleet", code: "1", title: "The fleet", blurb: "Kinds of drone, who leads.", phase: "op" },
    { id: "uc", code: "2", title: "The new use case", blurb: "Follow the predator, keep the field.", phase: "op" }
  ],

  scenes: [
    {
      id: "welcome", ch: "brief", kind: "read", bare: true,
      title: "A fleet of drones guards the flock",
      blocks: [{ widget: "cover" }]
    },
    {
      id: "from-one-to-many", ch: "brief", kind: "read",
      title: "From one drone to a fleet",
      lead: "In Parts 1 and 2 one drone did everything. Now several drones share the work.",
      blocks: [
        {
          cards: [
            { n: "1", title: "Several kinds of drone", text: "A **drone shepherd** (the one of Part 1), a **sheep guard** that stays over the flock, an **anti-predator** drone that deals with the bear." },
            { n: "2", title: "A swarm", text: "Several drones, of the same kind or not, fly together. One of them can lead the others: the **master** of the swarm." },
            { n: "3", title: "Or a base station", text: "The **base station** can be the master instead: it pilots every drone of the fleet." }
          ]
        },
        { p: "Open the simulation (the drone button at the top) and play the scenario: three drones take off, one of them chases the bear away." },
        { widget: "simHint" },
        {
          placeholder: {
            kind: "text", title: "Briefing of Part 3",
            todo: ["Duration, pairs or not, marked or not", "Which model to open (file name, where on the LMS)"]
          }
        }
      ]
    },
    {
      id: "fleet-roles", ch: "fleet", kind: "read",
      title: "Kinds of drone, and who leads",
      lead: "Each drone has a role and its own state machine. The master gives the orders.",
      blocks: [
        {
          placeholder: {
            kind: "text", title: "Tasks on the fleet",
            todo: [
              "How the roles are modelled (one block per role, or one block with a role property)",
              "Where the swarm and its master are modelled",
              "When the base station is the master"
            ]
          }
        }
      ]
    },
    {
      id: "follow-uc", ch: "uc", kind: "read",
      title: "Follow the predator, keep the field",
      lead: "A drone may leave the field to follow the predator, as long as another drone stays on the field.",
      blocks: [
        {
          callout: {
            tone: "goal", title: "The rule the simulation checks",
            text: "When a drone follows the predator out, the panel shows which drones keep the field. If none is left, the field turns red: the drone that left should come back."
          }
        },
        {
          placeholder: {
            kind: "text", title: "Tasks on the new use case",
            todo: ["Name of the use case and its relations", "Scenario and states that go with it"]
          }
        }
      ]
    }
  ],

  authorNotes: [
    { scene: "fleet-roles", text: "The steps of each role in part3/content/config.js (fleet.roles.*.steps) are placeholders: rename them to the states of the Part 3 model. The guide guesses what a drone does from the words of its state (patrol, guard, track, counter, follow, return, crash...); list the exceptions in fleet.behaviours." },
    { scene: "from-one-to-many", text: "The Cameo plugin publishes one step for the whole simulation. For Part 3 it must add a drones list (id, step, role, name) and the master to its state frame: see \"Fleet simulation\" in README.md." }
  ]
};
