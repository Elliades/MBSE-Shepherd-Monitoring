/* One-off: the scenarios written so far, as DSL files (scenarios/scenario-dsl.js).

   - Part 3 (part3/content/archs.js + the messages of part3/content/config.js): each architecture's story is cut
     into scenarios about one thing each (power on, a wrong plan, a good plan, the start, a sheep, a bear...),
     chained by "given", and assembled again by "full" (sequence). Checked: "full" compiles back to the ten steps
     of archs.js, same signals, same drivers, same expectations, same phases.
   - The plugin's scenario files (OMF_Private/docs/pasture-sentinel, every *.scenario.json): converted as they are,
     except the setup phases that several files share, which become scenarios of their own, referred to by
     "given". Checked: each file compiles back to what the plugin read before. They hold the answers of the
     graded Part 2: written to scenarios/private/ (gitignored).

   The DSL files are the source afterwards: this script refuses to overwrite them without --force.
   node scripts/scenarios-import.mjs [--force] [--plugin <docs/pasture-sentinel folder>] */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DSL = require(path.join(ROOT, 'scenarios/scenario-dsl.js'));
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const PLUGIN = args.includes('--plugin') ? args[args.indexOf('--plugin') + 1] : 'C:/workspace/java/mdplugins/OMF/OMF_Private/docs/pasture-sentinel';
const TODAY = new Date().toISOString().slice(0, 10);

let failed = 0;
const written = [];
function write(file, doc) {
  const text = DSL.print(doc);
  const back = DSL.parse(text);
  if (back.errors.length) { console.error('✗ does not parse back:', file, back.errors); failed += 1; }
  if (fs.existsSync(file) && !FORCE) { console.log('  kept (exists):', path.relative(ROOT, file)); return; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  written.push(path.relative(ROOT, file));
}
const blank = () => DSL.parse('').doc;

/* ── Part 3 ── */
global.window = {};
require(path.join(ROOT, 'part3/content/archs.js'));
require(path.join(ROOT, 'part3/content/config.js'));
const ARCHS = window.LOGICAL_ARCHS;
const AC = window.COURSE_CONFIG.archs;
const STEP_IDS = ['power', 'bad-plan', 'good-plan', 'start', 'flock', 'sheep-out', 'bear', 'too-close', 'backs-off', 'bear-gone'];
const FRAGMENTS = [
  { name: 'power-on', steps: [0], given: [], kind: 'nominal', title: 'Power on',
    goal: 'The operator powers the drone on: the power-on part wakes Mission Configuration, which waits for a flight plan.' },
  { name: 'plan-rejected', steps: [1], given: ['power-on'], kind: 'alternative', title: 'A wrong flight plan is refused',
    goal: 'An incorrect flight plan is checked and refused: the drone stays unconfigured and the operator is told why.' },
  { name: 'plan-accepted', steps: [2], given: ['power-on'], kind: 'nominal', title: 'A good flight plan is accepted',
    goal: 'A correct flight plan is checked and accepted: the drone is ready for the mission and the operator is told.' },
  { name: 'mission-start', steps: [3], given: ['plan-accepted'], kind: 'nominal', title: 'The mission starts',
    goal: 'The operator starts the guard mission: the drone flies to the safe area, then patrols its watch path.' },
  { name: 'sheep-out', steps: [4, 5], given: ['mission-start'], kind: 'nominal', title: 'A sheep strays',
    goal: 'The flock is seen and counted, then a sheep leaves the zone: the operator is warned, the patrol goes on.' },
  { name: 'bear-enters', steps: [6], given: ['mission-start'], kind: 'nominal', title: 'A bear enters the tracking perimeter',
    goal: 'A bear is detected inside the tracking perimeter: predator defense takes over and the drone follows the bear.' },
  { name: 'bear-deterred', steps: [7, 8], given: ['bear-enters'], kind: 'nominal', title: 'The bear comes too close, then backs off',
    goal: 'The bear enters the safe perimeter: light and sound scare it off; it backs off and the drone tracks it again.' },
  { name: 'bear-gone', steps: [9], given: ['bear-enters'], kind: 'nominal', title: 'The bear leaves: back to patrol',
    goal: 'The bear leaves the tracking perimeter: predator defense hands control back and the patrol resumes.' }
];
for (const key of Object.keys(ARCHS)) {
  const arch = ARCHS[key];
  const pre = `arch${key}`;
  const steps = [];
  arch.scenario.phases.forEach((ph) => ph.steps.forEach((s) => steps.push(Object.assign({ phase: ph.name }, s))));
  if (steps.length !== STEP_IDS.length) throw new Error(`arch ${key}: ${steps.length} steps, the cut expects ${STEP_IDS.length}`);
  const dir = path.join(ROOT, 'scenarios/library/part3', pre);
  const common = (d) => {
    d.version = '1.0'; d.status = 'in use'; d.author = 'MBSE Shepherd, Part 3'; d.date = TODAY;
    d.tags = ['part3', `architecture ${key}`];
  };
  FRAGMENTS.forEach((f) => {
    const d = blank();
    d.title = f.title; d.id = `${pre}.${f.name}`; d.kind = f.kind; d.goal = f.goal;
    d.description = `${arch.package}. One moment of the mission; what leads there is in its preconditions.`;
    common(d);
    d.given = f.given.map((g) => `${pre}.${g}`);
    if (f.name === 'power-on') {
      d.description = `${arch.package}. The first scenario of the chain: it also says what is simulated and observed, for all the others.`;
      d.context = arch.context.name; d.cut = arch.soi.name; d.settle = 2;
      d.systems = arch.scenario.systems.map((x) => ({ path: x.path, label: ((AC.parts || {})[x.path.split('.').pop()] || {}).label || '', type: x.type }));
      d.drivers = arch.context.parts.filter((p) => p.name !== 'soi').map((p) => ({ path: p.name, label: p.type, type: p.type }));
    }
    f.steps.forEach((i) => {
      const s = steps[i];
      let ph = d.phases[d.phases.length - 1];
      if (!ph || ph.name !== s.phase) { ph = { name: s.phase, goal: '', setup: false, reached: {}, steps: [] }; d.phases.push(ph); }
      const exp = {};
      Object.keys(s.expect || {}).forEach((p) => { exp[p] = [].concat(s.expect[p]); });
      ph.steps.push({ id: STEP_IDS[i], signal: s.signal, into: s.into || '', note: s.note || '', expect: exp, absent: {},
        messages: ((AC.messages || {})[s.signal] || []).slice(), noMessages: [], fault: '', settle: null, timeout: null });
    });
    write(path.join(dir, `${f.name}.scn`), d);
  });
  const full = blank();
  full.title = 'The whole mission'; full.id = `${pre}.full`; full.kind = 'nominal';
  full.goal = 'The whole story, preparation, patrol, sheep, bear, back to patrol: the scenario of the guide, assembled from its parts.';
  full.description = `${arch.package}. An assembly: each part is measured, in this order.`;
  common(full);
  full.sequence = FRAGMENTS.map((f) => `${pre}.${f.name}`);
  write(path.join(dir, 'full.scn'), full);
}

/* Part 3, checked: "full" gives the story of archs.js back. */
function loadDir(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...loadDir(p));
    else if (e.name.endsWith('.scn')) out.push({ path: path.relative(ROOT, p).replace(/\\/g, '/'), text: fs.readFileSync(p, 'utf8') });
  }
  return out;
}
{
  const lib = DSL.load(loadDir(path.join(ROOT, 'scenarios/library')));
  for (const key of Object.keys(ARCHS)) {
    const r = DSL.compile(`arch${key}.full`, lib.docs);
    if (r.errors.length) { console.error(`✗ arch${key}.full:`, r.errors); failed += 1; continue; }
    const want = ARCHS[key].scenario.phases.map((p) => ({ name: p.name, steps: p.steps.map((s) => [s.signal, s.into, DSL.canonical({ phases: [{ steps: [s] }] }).phases[0].steps[0].expect]) }));
    const have = r.json.phases.map((p) => ({ name: p.name, steps: p.steps.map((s) => [s.signal, s.into, DSL.canonical({ phases: [{ steps: [s] }] }).phases[0].steps[0].expect]) }));
    const same = JSON.stringify(want) === JSON.stringify(have) && r.json.phases.every((p) => !p.setup);
    if (same) console.log(`✓ arch${key}.full compiles back to the scenario of archs.js (${have.reduce((n, p) => n + p.steps.length, 0)} steps)`);
    else { console.error(`✗ arch${key}.full differs from archs.js`); failed += 1; }
  }
}

/* ── The plugin's files ── */
function findJson(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findJson(p));
    else if (e.name.endsWith('.scenario.json')) out.push(p);
  }
  return out;
}
if (fs.existsSync(PLUGIN)) {
  const files = findJson(PLUGIN).sort().map((f) => {
    const rel = path.relative(PLUGIN, f).replace(/\\/g, '/');
    const folder = path.dirname(rel) === '.' ? 'logical' : path.dirname(rel).split('/').pop();
    const base = path.basename(rel, '.scenario.json').replace(/^system-mission\./, '').replace(/^logical-architecture-/, '').replace(/^system-/, '');
    const group = { 'drone-archs': 'archs', functional: 'functional', focus: 'focus', logical: 'logical', system: 'system' }[folder] || folder;
    return { file: f, rel, folder: path.dirname(rel), group, id: `${group}.${base}`, json: JSON.parse(fs.readFileSync(f, 'utf8')) };
  });
  const KIND = { crashed: 'dysfunctional', 'weather-interruption': 'alternative', 'restart-and-stop': 'alternative', 'sheep-exit-under-predator': 'alternative' };
  /* setup prefixes shared by several files (same simulated block, same drivers) */
  const prefixKey = (j, n) => JSON.stringify([j.context, j.cut, j.settle, j.drivers || [], DSL.canonical({ phases: j.phases.slice(0, n) }).phases]);
  const setupLen = (j) => { let n = 0; while (n < (j.phases || []).length && j.phases[n].setup === true) n += 1; return n; };
  const count = new Map();
  files.forEach((f) => { for (let n = 1; n <= setupLen(f.json); n += 1) { const k = prefixKey(f.json, n); count.set(k, (count.get(k) || new Set()).add(f.id)); } });
  const fragments = new Map(); /* key -> { id, doc } */
  const usedIds = new Set(files.map((f) => f.id));
  function fragmentFor(f, n) {
    const key = prefixKey(f.json, n);
    if (fragments.has(key)) return fragments.get(key).id;
    const j = f.json;
    const ph = j.phases[n - 1];
    let id = `${f.group}.pre.${DSL.slug(ph.name)}`;
    for (let k = 2; usedIds.has(id); k += 1) id = `${f.group}.pre.${DSL.slug(ph.name)}-${k}`;
    usedIds.add(id);
    const flat = DSL.fromJson(Object.assign({}, j, { phases: [Object.assign({}, ph, { setup: false })] }));
    const d = blank();
    d.title = ph.name; d.id = id; d.kind = 'nominal'; d.goal = ph.goal || '';
    d.description = `A precondition shared by ${count.get(key).size} scenarios (${Array.from(count.get(key)).join(', ')}), written once.`;
    d.version = '1'; d.status = 'imported'; d.date = TODAY; d.tags = ['plugin', f.group, 'precondition'];
    d.context = j.context || ''; d.cut = j.cut || ''; d.settle = j.settle != null ? Number(j.settle) : null;
    const cited = new Set();
    flat.phases[0].steps.forEach((s) => { Object.keys(s.expect).concat(Object.keys(s.absent)).forEach((p) => cited.add(p)); });
    Object.keys(flat.phases[0].reached).forEach((p) => cited.add(p));
    d.systems = DSL.fromJson(j).systems.filter((x) => cited.has(x.path));
    d.drivers = DSL.fromJson(j).drivers;
    d.given = n > 1 ? [fragmentFor(f, n - 1)] : [];
    d.phases = flat.phases;
    fragments.set(key, { id, doc: d, folder: f.folder });
    return id;
  }
  const outDocs = [];
  files.forEach((f) => {
    const flat = DSL.fromJson(f.json);
    flat.id = f.id; flat.kind = KIND[f.id.split('.').pop()] || 'nominal'; flat.version = '1'; flat.status = 'imported'; flat.date = TODAY;
    flat.tags = ['plugin', f.group]; flat.description = `Imported from docs/pasture-sentinel/${f.rel}.`;
    let n = setupLen(f.json);
    while (n > 0 && count.get(prefixKey(f.json, n)).size < 2) n -= 1;
    const doc = JSON.parse(JSON.stringify(flat));
    if (n > 0) { doc.given = [fragmentFor(f, n)]; doc.phases = doc.phases.slice(n); }
    outDocs.push({ f, doc, flat });
  });
  /* A shared precondition that is already a scenario of its own (same steps, same preconditions): that scenario. */
  const alias = {};
  fragments.forEach((x, key) => {
    const twin = outDocs.find((o) => JSON.stringify(o.doc.given) === JSON.stringify(x.doc.given) && JSON.stringify(o.doc.phases) === JSON.stringify(x.doc.phases));
    if (twin) { alias[x.id] = twin.doc.id; fragments.delete(key); console.log(`  ${x.id} is ${twin.doc.id}: referred to by its own name`); }
  });
  const rename = (d) => { d.given = d.given.map((g) => alias[g] || g); };
  fragments.forEach((x) => rename(x.doc));
  outDocs.forEach((x) => rename(x.doc));
  const lib = new Map();
  fragments.forEach((x) => lib.set(x.id, x.doc));
  outDocs.forEach((x) => lib.set(x.doc.id, x.doc));
  outDocs.forEach((x) => {
    const r = DSL.compile(x.doc.id, lib);
    const same = !r.errors.length && JSON.stringify(DSL.canonical(r.json)) === JSON.stringify(DSL.canonical(x.f.json));
    if (!same) {
      console.log(`  ${x.doc.id}: its preconditions do not factor out exactly, kept inline`);
      lib.set(x.doc.id, x.flat); x.doc = x.flat;
      const r2 = DSL.compile(x.doc.id, lib);
      if (JSON.stringify(DSL.canonical(r2.json)) !== JSON.stringify(DSL.canonical(x.f.json))) { console.error('✗ does not compile back:', x.f.rel); failed += 1; return; }
    }
    console.log(`✓ ${x.doc.id} compiles back to ${x.f.rel}${x.doc.given.length ? '  (given ' + x.doc.given.join(', ') + ')' : ''}`);
  });
  const priv = path.join(ROOT, 'scenarios/private/plugin');
  fragments.forEach((x) => write(path.join(priv, x.folder, 'preconditions', x.id.split('.').slice(2).join('.') + '.scn'), x.doc));
  outDocs.forEach((x) => write(path.join(priv, x.f.folder, x.doc.id.split('.').slice(1).join('.') + '.scn'), x.doc));
} else console.log('No plugin folder at', PLUGIN, ': only Part 3.');

console.log(`${written.length} files written.`);
if (failed) { console.error(`${failed} failure(s).`); process.exit(1); }
