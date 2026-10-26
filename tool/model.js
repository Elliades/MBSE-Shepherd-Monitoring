/* The model shown by the demo tool: its containment tree, the stages of the exercise that add
   elements to it, and the state machine the scripted simulation runs.

   Elements the guide points to reuse the ids of content/model-links.js (loaded before this file),
   so "Open in Cameo" in the guide lands on them. Elements the student creates have no id there:
   the guide finds them by name and path ("Links by name" in README.md), so their names and paths
   must stay exactly as model-links.js spells them.

   window.ToolModel.ROOT                    the tree: { id, name, type, stage?, kids? }
   window.ToolModel.STAGES                  the exercise, in order: { key, title, text, diagram?, select? }
   window.ToolModel.SIM                     { states, transitions, initial }
   window.ToolModel.byId(id), pathOf(node), parentOf(node), walk(fn) */
(function () {
  const LINKS = window.MODEL_LINKS || {};
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* type, name, options ({ link, stage, diagram, doc }), children */
  function n(type, name, o, kids) {
    if (Array.isArray(o)) { kids = o; o = {}; }
    o = o || {};
    const node = { type, name, stage: o.stage, diagram: o.diagram, doc: o.doc, link: o.link };
    if (o.link && LINKS[o.link] && LINKS[o.link].id) node.id = LINKS[o.link].id;
    if (kids && kids.length) node.kids = kids;
    return node;
  }
  const P = (name, o, k) => n('package', name, o, k);
  const B = (name, o, k) => n('block', name, o, k);
  const UC = (name, o, k) => n('usecase', name, o, k);
  const ACT = (name, o, k) => n('activity', name, o, k);
  const SIG = (name, o) => n('signal', name, o);
  const IF = (name, o) => n('iface', name, o);
  const ST = (name, o, k) => n('state', name, o, k);
  const D = (type, name, o) => n(type, name, o);

  const ROOT = n('model', 'Pasture Sentinel', [
    P('1 - Operational Analysis', [
      P('A - Stakeholder Needs', [
        n('requirement', 'REQ-01 Protect the flock', { doc: 'The system shall protect the flock from predators, day and night.' }),
        n('requirement', 'REQ-02 Patrol the perimeter', { doc: 'The system shall patrol the perimeter of the pasture.' }),
        n('requirement', 'REQ-03 Flight plan from the ground', { doc: 'The flight plan shall be loaded from the ground station.' })
      ]),
      P('B - Operational Breakdown', [
        B('Operational Context', { doc: 'The drone in its environment: who and what it exchanges with.' }, [
          D('ibd', 'Operational Context', { link: 'op-context', diagram: 'op-context' })
        ]),
        B('Ground Station'),
        B('UAV operator'),
        B('GNSS'),
        B('Weather'),
        B('Bear', { doc: 'The predator the drone has to keep away from the flock.' }),
        B('Sheep', { doc: 'The flock the drone guards.' })
      ]),
      P('C - Use Cases and Scenarios', { link: 'uc-pkg' }, [
        D('ucd', 'Use Cases and Scenarios', { link: 'uc-diagram', diagram: 'uc' }),
        P('1. Preparation phase', [
          UC('Prepare Mission', { link: 'uc-prepare-mission' }),
          UC('Parameter Mission', { link: 'uc-parameter-mission' }, [
            D('sd', '[SD 1] Loading the flight plan', { stage: 'A', diagram: 'sd1' })
          ])
        ]),
        P('2. Mission phase', [UC('Guard the Flock'), UC('Monitor the Flock'), UC('Counter a Predator')]),
        P('Actors', { link: 'actors' }, [n('actor', 'Mission Operator'), n('actor', 'Shepherd'), n('actor', 'Predator')])
      ]),
      P('D - Physical Interfaces', { link: 'if-pkg' }, [
        IF('IF_FlightPlan', { link: 'if-flightplan', stage: 'IF', doc: 'Carries the flight plan from the ground station to the drone, by WiFi.' }),
        IF('IF_GPS_Wave'),
        IF('IF_Light'),
        IF('IF_Loud_Sound'),
        IF('IF_Operator_Command_On_Drone'),
        IF('IF_Operator_Command_On_GS'),
        IF('IF_StrongLight'),
        IF('IF_WiFi_Cmd'),
        IF('IF_WiFi_NavData'),
        IF('IF_Wind_Speed')
      ])
    ]),
    P('2 - Functional Analysis', [
      P('A - Functional architecture', { link: 'fa-root' }, [
        P('Deployment', { link: 'fa-deployment' }, [
          ACT('Going to Safe Area'),
          ACT('Start subsystems'),
          ACT('Parameter Mission', { link: 'fa-parameter-mission-act', stage: 'B' }),
          P('Parameter Mission', { link: 'fa-parameter-mission', stage: 'B' }, [
            ACT('Load Flight Plan', { link: 'fn-load-flight-plan', stage: 'B', doc: 'Loads the flight plan received from the ground station, checks it, and tells whether the drone is ready.' }, [
              D('ad', 'Load Flight Plan', { stage: 'D', diagram: 'ad-lfp' })
            ]),
            ACT('Receive FlightPlan', { stage: 'B' }),
            ACT('Read FlightPlan', { stage: 'B' }),
            ACT('Check FlightPlan', { stage: 'B' }),
            ACT('Send Mission Ready', { stage: 'B' })
          ])
        ]),
        P('Mission', [
          ACT('Watch Perimeter'),
          ACT('Sheep monitoring'),
          ACT('Start Predator Tracking'),
          ACT('Trigger predator counter actions'),
          ACT('Start Emergency Mode')
        ])
      ]),
      P('B - Functional Data', [
        P('Deployement', { link: 'fd-deployment' }, [
          SIG('Start SOI'),
          SIG('FlightPlan', { link: 'sig-flightplan' }),
          SIG('FlightPlan Check Failed', { link: 'sig-check-failed' }),
          SIG('Ready for mission', { link: 'sig-ready' }),
          SIG('Start Sheep Guard Mission')
        ]),
        P('Mission', [
          SIG('Start Patrolling'),
          SIG('Predator Detected inside tracking perimeter'),
          SIG('Crashed Detected'),
          SIG('Photo')
        ])
      ]),
      P('C - Traceability', { link: 'alloc-pkg' }, [
        D('matrix', 'Function Allocation', { link: 'alloc-matrix', diagram: 'alloc' })
      ])
    ]),
    P('3 - Physical Analysis', [
      P('A - Physical architecture', [
        B('SOI - Pasture Sentinel', { link: 'soi-block', doc: 'The System of Interest: a drone that guards a flock in its pasture.' }, [
          n('statemachine', 'SOI - Pasture Sentinel', [
            D('stm', 'SOI - Pasture Sentinel', { link: 'soi-stm', diagram: 'stm' }),
            n('region', 'SOI - Pasture Sentinel', [
              ST('Undeployed', [
                ST('Off'),
                ST('Unconfigured'),
                ST('Configured', { link: 'soi-configured', stage: 'C', doc: 'do / Load Flight Plan' }),
                ST('Ready for Mission', { doc: 'do / Start subsystems' })
              ]),
              ST('Deployed', [
                ST('Going to Safe Area'),
                ST('Patrolling', [ST('Perimeter watch'), ST('Sheep Monitoring'), ST('Predator Monitoring')]),
                ST('Predator Detected', [ST('Predator tracking'), ST('Predator counteraction')]),
                ST('Mission Monitoring')
              ]),
              ST('Crashed', { doc: 'do / Start Emergency Mode' })
            ])
          ]),
          D('ibd', 'UAV Data', { link: 'uav-data', diagram: 'uav-data' }),
          D('ibd', 'UAV Energy', { link: 'uav-energy', diagram: 'uav-energy' })
        ]),
        P('Subsystems', [
          B('Flight Controller'), B('Mission Computer'), B('Navigation System'),
          B('WiFi System'), B('Camera System'), B('Power System')
        ])
      ])
    ])
  ]);

  /* ids and parents */
  const index = new Map();
  const parents = new Map();
  (function link(node, parent, trail) {
    const here = trail.concat(node.name);
    if (!node.id) node.id = (node.link && LINKS[node.link] ? 'made-' + node.link : 'el-' + slug(node.type + ' ' + here.join(' ')));
    index.set(node.id, node);
    if (parent) parents.set(node, parent);
    (node.kids || []).forEach((k) => link(k, node, here));
  })(ROOT, null, []);

  function parentOf(node) { return parents.get(node) || null; }
  /* Names from the top package down to the element, as model-links.js writes paths (the model itself is left out). */
  function pathOf(node) {
    const out = [];
    for (let at = node; at && at !== ROOT; at = parentOf(at)) out.unshift(at.name);
    return out;
  }
  function walk(fn, node = ROOT) { fn(node); (node.kids || []).forEach((k) => walk(fn, k)); }

  /* The exercise of the guide, one stage per thing the student builds. */
  const STAGES = [
    { key: 'IF', title: 'Interface IF_FlightPlan', text: 'Interface block, one port on each side, the connector and its item flow.', diagram: 'op-context', select: 'made-if-flightplan' },
    { key: 'A', title: 'A · Sequence diagram', text: '[SD 1] Loading the flight plan, under the use case Parameter Mission.', diagram: 'sd1' },
    { key: 'B', title: 'B · Functions', text: 'The Parameter Mission package and its functions.', select: 'made-fa-parameter-mission' },
    { key: 'C', title: 'C · State Configured', text: 'The state, its three transitions and its do activity.', diagram: 'stm', select: 'made-soi-configured' },
    { key: 'D', title: 'D · Load Flight Plan', text: 'The activity diagram: sunny day and rainy day.', diagram: 'ad-lfp' },
    { key: 'E', title: 'E · Allocation', text: 'Each new function allocated to a subsystem.', diagram: 'alloc' }
  ];

  /* The state machine the simulation runs. step = the name the guide knows (js/sim-core.js).
     also = states that are active together with this one (orthogonal regions). */
  const SIM = {
    initial: 's-off',
    states: {
      's-undeployed': {},
      's-off': { step: 'Off', parent: 's-undeployed' },
      's-unconf': { step: 'Unconfigured', parent: 's-undeployed' },
      's-conf': { step: 'Configured', parent: 's-undeployed', does: 'Load Flight Plan' },
      's-ready': { step: 'Ready for Mission', parent: 's-undeployed' },
      's-deployed': {},
      's-gsa': { step: 'Going to Safe Area', parent: 's-deployed', also: ['s-mm'] },
      's-patrol': { step: 'Patrolling', parent: 's-deployed', also: ['s-mm', 's-perim', 's-sheep', 's-predmon'] },
      's-pred': { parent: 's-deployed' },
      's-track': { step: 'Predator tracking', parent: 's-pred', also: ['s-mm'] },
      's-counter': { step: 'Predator counteraction', parent: 's-pred', also: ['s-mm'] },
      's-crashed': { step: 'Crashed' }
    },
    /* id, from, to, signal (none: not triggerable here), stage */
    transitions: [
      { id: 't-start', from: 's-off', to: 's-unconf', signal: 'Start SOI' },
      { id: 't-fp', from: 's-unconf', to: 's-conf', signal: 'FlightPlan', stage: 'C' },
      { id: 't-fail', from: 's-conf', to: 's-unconf', signal: 'FlightPlan Check Failed', stage: 'C' },
      { id: 't-ready', from: 's-conf', to: 's-ready', signal: 'Ready for mission', stage: 'C' },
      { id: 't-mission', from: 's-ready', to: 's-gsa', signal: 'Start Sheep Guard Mission' },
      { id: 't-patrol', from: 's-gsa', to: 's-patrol', signal: 'Start Patrolling' },
      { id: 't-predator', from: 's-patrol', to: 's-track', signal: 'Predator Detected inside tracking perimeter' },
      { id: 't-crash', from: 's-deployed', to: 's-crashed', signal: 'Crashed Detected' }
    ]
  };

  window.ToolModel = { ROOT, STAGES, SIM, byId: (id) => index.get(id) || null, pathOf, parentOf, walk };
})();
