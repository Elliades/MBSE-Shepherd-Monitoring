/* Builds the models of Part 4 from the author's: the functional mission, the operational context and their diagrams are his, kept
   by hand in the two base models of instructor-only/. Only `TP - Swarm` comes from here: its spec in scripts/part4-model/.
     UAV_Part4_Base.mdzip         starting model, the mission still to be put in parallel
     UAV_Part4_Base_Solved.mdzip  the same, the regions done
   Needs MagicDraw running with the OMF plugin (MCP on 127.0.0.1:9851). The model is a copy of the base: it is opened beside what
   is already open, its old `TP - Swarm` is removed, the spec is built, then it is saved and closed. The base files and the other
   open projects are not touched. Each writing step first checks that this copy is the active project.

       node scripts/build-part4-model.mjs [--solved] [--keep-open]

   --solved: the correction instead, in instructor-only/ (three complete drones, the master in drone 1), and the figures of the
   guide in part4/assets/img/; --keep-open: for scripts/check-part4-solutions.mjs;
   --here: on the project open in MagicDraw, whatever it is called, without opening nor saving it. */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OLD_PACKAGES = ['3 - Logical Analysis::TP - Swarm'];
const GROUND = ['Operator Communication', 'Weather Monitoring', 'Mission Monitoring', 'Charging Dock'];
const LIBRARY = ['Zone Surveillance', 'Flock Watching', 'Sheep Tracking', 'Predator Management', 'Base Standby', 'Swarm Master', 'Swarm Reflex', ...GROUND];
const TP = '3 - Logical Analysis::TP - Swarm';
const FEATURES = ['Zone Surveillance', 'Flock Watching', 'Sheep Tracking', 'Predator Management'];
const SOLUTION = { 'Base Station': GROUND, 'Drone 1': [...FEATURES, 'Swarm Master'], 'Drone 2': FEATURES, 'Drone 3': FEATURES };
const MISSION_DIAGRAM = '_2026x_1_1fda04ff_1793627754723_282233_24843';
/* Long enough for a Base Standby to answer the briefing, the only thing that holds a drone on the ground. */
const BRIEFING = '2s';

const argv = process.argv.slice(2);
const solved = argv.includes('--solved');
const keepOpen = argv.includes('--keep-open');
const here = argv.includes('--here');
const base = path.join(ROOT, 'instructor-only', solved ? 'UAV_Part4_Base_Solved.mdzip' : 'UAV_Part4_Base.mdzip');
const dir = path.join(ROOT, solved ? 'instructor-only' : path.join('part4', 'assets', 'models'));
fs.mkdirSync(dir, { recursive: true });
const file = here ? null : path.join(dir, solved ? 'UAV_Part4_Correction.mdzip' : 'UAV_Part4_Swarm.mdzip');

async function call(category, name, args) {
  const r = await fetch('http://127.0.0.1:9851/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'omf_' + category, arguments: { name, ...(args ? { args } : {}) } } })
  });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  const t = j.result.content.map((c) => c.text).join('');
  if (j.result.isError) throw new Error(t);
  try { return JSON.parse(t); } catch (e) { return t; }
}
const ref = (x) => ({ elementId: typeof x === 'string' ? x : x.id });
const pause = (ms) => new Promise((res) => setTimeout(res, ms));
const spec = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'part4-model', name + '.json'), 'utf8'));

async function mine() {
  if (here) return;
  const open = await call('project', 'getCurrent');
  if (!open.filePath || path.resolve(open.filePath) !== path.resolve(file)) throw new Error(`active project is ${open.filePath}, not ${file}: stopped, nothing written there`);
}
/* Right after a removal, MagicDraw may still refuse a new session ("Command history does not allow…"). */
async function patiently(write) {
  for (let tries = 0; ; tries++) {
    await mine();
    try { return await write(); } catch (e) {
      if (tries >= 8 || !/Command history/.test(e.message)) throw e;
      await pause(3000);
    }
  }
}
const build = (s) => patiently(() => call('logical', 'buildArchitecture', [s]));
/* The ports come out as P_<block>_<spec name>: on the blocks they keep the name of the spec. */
async function namePorts(blocks) {
  for (const b of blocks) {
    for (const e of await call('model', 'vertical', [ref(b)])) {
      if (e.metaclass !== 'Port') continue;
      const short = e.name.slice(`P_${b.name}_`.length);
      if (short) await call('model', 'set', [ref(e), 'name', short]);
    }
  }
}
/* What the builder cannot say: after the briefing the drone takes off, unless Base Standby kept it. */
async function takeOffAfterBriefing(blocks) {
  const stateOf = async (name) => (await call('model', 'getElementsByName', [name])).find((e) => e.metaclass === 'State');
  const from = await stateOf('Mission Briefing');
  const to = await stateOf('Flying');
  const made = await patiently(() => call('behavior', 'addTransition', [{ from: ref(from), to: ref(to), after: BRIEFING }]));
  const fo = blocks.find((b) => b.name === 'Flight Orchestrator');
  const machine = (await call('model', 'vertical', [ref(fo)])).find((e) => e.metaclass === 'StateMachine');
  const diagram = (await call('model', 'vertical', [ref(machine)])).find((e) => e.metaclass === 'Diagram');
  if (diagram) await patiently(() => call('assembly', 'showOnStm', [ref(diagram), [ref(made)]]));
}

if (!here) {
  fs.copyFileSync(base, file);
  /* The base holds a link to the profile, which must sit next to the model or Cameo stops on a dialog. */
  fs.copyFileSync(path.join(path.dirname(base), 'ISAE-Profile.mdzip'), path.join(dir, 'ISAE-Profile.mdzip'));
  await call('project', 'open', [file]);
  for (let waited = 0; ; waited += 2000) {
    const open = await call('project', 'getCurrent').catch(() => ({}));
    const work = await call('project', 'getAsyncStatus').catch(() => ({}));
    if (open.filePath && path.resolve(open.filePath) === path.resolve(file) && open.ready && !work.running) break;
    if (waited > 180000) throw new Error(`still not open: ${open.filePath}`);
    await pause(2000);
  }
  await pause(15000); /* "Concurrent model change" if built too early after the opening (playbook). */
}
for (const name of OLD_PACKAGES) {
  const found = await call('model', 'getByQualifiedName', [name]).catch(() => null);
  if (found) await patiently(() => call('model', 'remove', [ref(found)]));
}
const built = await build(spec('swarm'));
console.log('swarm', 'blocks', built.blocks.length, 'functions', built.functions, 'created signals', built.signals.created.length, 'warnings', built.warnings);
await mine();
await namePorts(built.blocks);
await takeOffAfterBriefing(built.blocks);

/* The Library: what the students drag. It sits apart from what is given. */
const pkg = await call('model', 'getByQualifiedName', [TP]);
const lib = await call('factory', 'SysMLFactory.createPackage', ['Library', ref(pkg)]);
for (const name of LIBRARY) {
  const b = built.blocks.find((x) => x.name === name);
  await mine();
  await call('model', 'set', [ref(b), 'owner', ref(lib)]);
}
/* The icons of the guide's panel of components (part4/content/lego.js) on the blocks: the same drawing in the containment tree.
   Written to part4/assets/icons/ as well, beside the model. */
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'part4', 'content', 'lego.js'), 'utf8'), sandbox);
const icons = path.join(ROOT, 'part4', 'assets', 'icons');
fs.mkdirSync(icons, { recursive: true });
for (const b of [...sandbox.window.LEGO.bricks, ...sandbox.window.LEGO.given]) {
  const block = built.blocks.find((x) => x.name === b.type);
  if (!block) { console.log('icon: no block', b.type); continue; }
  const file = path.join(icons, b.type.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.svg');
  fs.writeFileSync(file, `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${b.tone}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${b.icon}</svg>\n`);
  await mine();
  await call('model', 'assignElementImage', [ref(block), file]);
}
const soi = built.blocks.find((b) => b.name === 'Pasture Sentinel System');
const flow = await call('analysis', 'signalFlowCheck', [ref(soi)]);
console.log('flow', JSON.stringify(flow.summary));
console.log('assembly', JSON.stringify(await call('assembly', 'read', [ref(soi)])).slice(0, 1200));
if (solved) {
  await mine();
  for (const [host, types] of Object.entries(SOLUTION)) for (const type of types) await call('assembly', 'plug', [ref(built.blocks.find((b) => b.name === host)), ref(built.blocks.find((b) => b.name === type))]);
  const wired = await call('assembly', 'autoConnect', [ref(soi)]);
  console.log('solution', 'connectors', wired.added.length, 'warnings', wired.warnings);
  const img = path.join(ROOT, 'part4', 'assets', 'img');
  fs.mkdirSync(img, { recursive: true });
  const figure = async (owner, name) => {
    const diagram = (await call('model', 'vertical', [ref(owner)])).find((e) => e.metaclass === 'Diagram');
    const out = await call('diagram', 'exportImage', [ref(diagram), path.join(img, name)]);
    console.log('figure', name, JSON.stringify(out).slice(0, 160));
  };
  await figure(built.blocks.find((b) => b.name === 'Drone 1'), 'drone1-assembled.png');
  await figure(soi, 'soi-assembled.png');
  const out = await call('diagram', 'exportImage', [ref(MISSION_DIAGRAM), path.join(img, 'mission-regions.png')]);
  console.log('figure mission-regions.png', JSON.stringify(out).slice(0, 160));
}
if (keepOpen || here) {
  console.log('left open, not saved:', file || 'the active project');
} else {
  await mine();
  await call('project', 'close', [{ save: true }]);
  fs.rmSync(file + '.bak', { force: true });
  console.log('saved', file, fs.statSync(file).size);
}
