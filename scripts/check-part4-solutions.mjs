/* Plays the missions of Part 4 (part4/content/lego.js) on a set of assemblies, in Cameo, on the model left open by
   build-part4-model.mjs --keep-open, with the very code of the guide (js/lego-run.js).
   Each assembly is taken apart at the end. Nothing is saved.

       node scripts/check-part4-solutions.mjs [solution ids] [--missions patrol,sheep] */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'part4', 'content', 'lego.js'), 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'lego-run.js'), 'utf8'), sandbox);
const LEGO = sandbox.window.LEGO;
const RUN = sandbox.window.LegoRun;
const MODEL = 'UAV_Part4_Swarm';

async function call(cat, tool, args = []) {
  const r = await fetch(`http://127.0.0.1:9851/mcp/${cat}/${tool}`, { method: 'POST', body: JSON.stringify(args) });
  const j = await r.json();
  if (!j.ok) throw new Error(`${cat}/${tool}: ${JSON.stringify(j).slice(0, 500)}`);
  return j.result;
}
const pause = (ms) => new Promise((res) => setTimeout(res, ms));
const Z = 'Zone Surveillance', F = 'Flock Watching', T = 'Sheep Tracking', P = 'Predator Management', B = 'Base Standby', M = 'Swarm Master', R = 'Swarm Reflex';
const ALL = [Z, F, T, P];
/* The base station: every solution has its four bricks, unless it leaves one out to see what breaks. */
const OC = 'Operator Communication', WM = 'Weather Monitoring', MM = 'Mission Monitoring', CD = 'Charging Dock';
const GROUND = [OC, WM, MM, CD];
const withBase = (hosts, base = GROUND) => ({ ...hosts, 'Base Station': [...base, ...(hosts['Base Station'] || [])] });
const LEAD = { 'Drone 1': [...ALL, 'Swarm Master'], 'Drone 2': ALL, 'Drone 3': ALL };

const SOLUTIONS = {
  empty: { label: 'Empty drones', hosts: withBase({}) },
  noBrain: { label: 'Complete drones, no intelligence', hosts: withBase({ 'Drone 1': ALL, 'Drone 2': ALL, 'Drone 3': ALL }) },
  reflex: { label: 'Complete drones, a reflex each', hosts: withBase({ 'Drone 1': [...ALL, R], 'Drone 2': [...ALL, R], 'Drone 3': [...ALL, R] }) },
  base: { label: 'Complete drones, master in the base', hosts: withBase({ 'Drone 1': ALL, 'Drone 2': ALL, 'Drone 3': ALL, 'Base Station': [M] }) },
  lead: { label: 'Complete drones, master in drone 1', hosts: withBase({ 'Drone 1': [...ALL, M], 'Drone 2': ALL, 'Drone 3': ALL }) },
  special: { label: 'Specialised, master in the base', hosts: withBase({ 'Drone 1': [Z, F, T], 'Drone 2': [Z, F, T], 'Drone 3': [Z, P], 'Base Station': [M] }) },
  specialLead: { label: 'Specialised, master in drone 3', hosts: withBase({ 'Drone 1': [Z, F, T], 'Drone 2': [Z, F, T], 'Drone 3': [Z, P, M] }) },
  trio: { label: 'A watcher, a tracker, a ranger, master in the base', hosts: withBase({ 'Drone 1': [Z, F], 'Drone 2': [T], 'Drone 3': [P], 'Base Station': [M] }) },
  trioLead: { label: 'A watcher, a tracker, a ranger, master in the watcher', hosts: withBase({ 'Drone 1': [Z, F, M], 'Drone 2': [T], 'Drone 3': [P] }) },
  thrifty: { label: 'One on the field, two at the base, master in the watcher', hosts: withBase({ 'Drone 1': [Z, F, M], 'Drone 2': [T, B], 'Drone 3': [P, B] }) },
  twoSheep: { label: 'A ranger, two watchers that track, master in drone 3', hosts: withBase({ 'Drone 1': [P], 'Drone 2': [F, Z, T], 'Drone 3': [F, T, M] }) },
  noLink: { label: 'Master in drone 1, no Operator Communication', hosts: withBase(LEAD, [WM, MM, CD]) },
  noSky: { label: 'Master in drone 1, no Weather Monitoring', hosts: withBase(LEAD, [OC, MM, CD]) },
  noReport: { label: 'Master in drone 1, no Mission Monitoring', hosts: withBase(LEAD, [OC, WM, CD]) },
  noDock: { label: 'Master in drone 1, no Charging Dock', hosts: withBase(LEAD, [OC, WM, MM]) },
  reflexSplit: { label: 'A watcher, a tracker, a ranger, a reflex each: nobody calls', hosts: withBase({ 'Drone 1': [Z, F, R], 'Drone 2': [T, R], 'Drone 3': [P, R] }) }
};

const argv = process.argv.slice(2);
const onlyMissions = (argv.find((a) => a.startsWith('--missions=')) || '').slice(11).split(',').filter(Boolean);
const ids = argv.filter((a) => !a.startsWith('--'));
/* The other open projects may be someone's work: nothing is written if this one is not in front. */
async function mine() {
  const cur = await call('project', 'getCurrent');
  if (cur.name !== MODEL) throw new Error(`active project is ${cur.name}, not ${MODEL}: open it with build-part4-model.mjs --keep-open`);
}
await mine();
const lines = [];
for (const id of ids.length ? ids : Object.keys(SOLUTIONS)) {
  const sol = SOLUTIONS[id];
  await mine();
  for (const [host, types] of Object.entries(sol.hosts)) for (const type of types) await call('assembly', 'plug', [host, type]);
  const ac = await call('assembly', 'autoConnect', [LEGO.soi]);
  const assembly = await call('assembly', 'read', [LEGO.soi]);
  console.log(`\n== ${sol.label}: autoconnect +${ac.added.length} -${ac.removed.length}, missing ${assembly.missing.length}, extra ${assembly.extra.length}`, ac.warnings.length ? ac.warnings : '');
  if (assembly.missing.length || assembly.extra.length) console.log(assembly.missing, assembly.extra);
  const row = [];
  for (const mission of LEGO.missions) {
    if (onlyMissions.length && !onlyMissions.includes(mission.id)) continue;
    const res = await RUN.play(LEGO, mission, assembly, { call, pause });
    await pause(1500);
    const bad = res.filter((r) => !r.ok);
    console.log(`  ${bad.length ? 'FAIL' : 'pass'} ${mission.title}${bad.length ? ': ' + bad.map((r) => r.text).join(' | ') : ''}`);
    row.push(`${mission.id}:${bad.length ? 'x' : 'ok'}`);
  }
  lines.push(`${id.padEnd(12)} ${row.join(' ')}`);
  await mine();
  for (const [host, types] of Object.entries(sol.hosts)) for (const type of new Set(types)) await call('assembly', 'unplug', [host, type]);
  const back = await call('assembly', 'autoConnect', [LEGO.soi]);
  const clean = await call('assembly', 'read', [LEGO.soi]);
  if (clean.missing.length || clean.extra.length) console.log('not clean after taking apart', clean.missing, clean.extra, back);
}
console.log('\n' + lines.join('\n'));
