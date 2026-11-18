/* Refactor > Replace With on the operational actors, then rename UAV operator.

   The illustrations are applied afterwards by assign-op-context-images.mjs
   (Shepherd Operator is the name of the block once the rename has run).

   Needs MagicDraw with the OMF plugin (MCP on 127.0.0.1:9851) and the
   replace-mcp provider (loaded by this script).

     node scripts/replace-op-context-actors.mjs --here
     node scripts/replace-op-context-actors.mjs <model.mdzip> [...]
       --keep-open   do not save or close
*/
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JAR = path.join(ROOT, 'scripts', 'replace-op', 'replace-mcp.jar');

const GNSS = '_18_5_1_150503da_1505403885870_843138_29427';
const GROUND = '_18_5_1_150503da_1505403726267_124919_29276';
const SHEEP = '_2022x_2_302b0611_1730926760528_160245_18525';
const OPERATOR = '_18_5_1_150503da_1505482296205_385795_38293';
const WEATHER = '_18_5_1_150503da_1505403291044_744805_28869';

/* old element -> block that takes its place */
const REPLACEMENTS = [
  ['_18_5_1_150503da_1508076011424_147605_57962', SHEEP, 'Animal -> Sheep'],
  ['_18_5_1_150503da_1505469003710_180406_33655', GNSS, 'GPS Constellation -> GNSS'],
  ['_18_5_1_150503da_1505469080892_43779_33721', GROUND, 'Ground station -> Ground Station'],
  ['_18_5_1_150503da_1505468973996_580828_33613', WEATHER, 'Weather -> Weather'],
  ['_18_5_1_150503da_1505482338413_571936_38401', OPERATOR, 'Mission Operator -> UAV operator'],
  ['_18_5_1_150503da_1508140326510_401535_48432', OPERATOR, 'Shepperd -> UAV operator'],
  ['_2022x_2_302b0611_1730927365401_650655_18612', OPERATOR, 'System mission deployment operator -> UAV operator'],
];

const argv = process.argv.slice(2);
const here = argv.includes('--here');
const keepOpen = argv.includes('--keep-open');
const files = argv.filter((a) => !a.startsWith('--'));

const ref = (id) => ({ elementId: id });
const pause = (ms) => new Promise((res) => setTimeout(res, ms));

async function call(category, name, args) {
  const r = await fetch('http://127.0.0.1:9851/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'omf_' + category, arguments: { name, ...(args ? { args } : {}) } } }),
  });
  const j = await r.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  const t = j.result.content.map((c) => c.text).join('');
  if (j.result.isError) throw new Error(t);
  try { return JSON.parse(t); } catch { return t; }
}

async function patiently(fn) {
  for (let i = 0; i < 15; i++) {
    try { return await fn(); } catch (e) {
      if (!/Command history|Concurrent model/.test(e.message)) throw e;
      await pause(2500);
    }
  }
  throw new Error('MagicDraw keeps refusing a new session');
}

/* getCurrent can stay stuck on an older failed open, so the open projects come from getAll. */
async function waitOpen(file) {
  const want = path.resolve(file);
  for (let i = 0; i < 90; i++) {
    const all = await call('project', 'getAll').catch(() => []);
    const match = (Array.isArray(all) ? all : []).find((p) => p.filePath && path.resolve(p.filePath) === want);
    const work = await call('project', 'getAsyncStatus').catch(() => ({}));
    const thisOp = work.expectedFilePath && path.resolve(work.expectedFilePath) === want;
    const busy = thisOp && work.running && !work.ready;
    if (match && !busy) return;
    await pause(1500);
  }
  throw new Error(`still not open: ${file}`);
}

async function closeAll() {
  const all = await call('project', 'getAll').catch(() => []);
  for (const project of Array.isArray(all) ? all : []) {
    if (!project.filePath) continue;
    await patiently(() => call('project', 'close', [{ filePath: project.filePath, save: false }]));
  }
}

function assignImages() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'scripts', 'assign-op-context-images.mjs'), '--here'], { stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('assign-op-context-images exited ' + code))));
  });
}

async function ensureProvider() {
  if (!fs.existsSync(JAR)) throw new Error('missing ' + JAR);
  const loaded = await call('dev', 'reload', [{
    jar: JAR.replace(/\\/g, '/'),
    packages: ['replaceop.'],
    providers: ['replaceop.ReplaceMcpProvider'],
  }]);
  console.log('provider', loaded.providers?.map((p) => p.category).join(',') || loaded);
}

async function exists(id) {
  try {
    const el = await call('model', 'getElementByID', [ref(id)]);
    return !!(el && el.id);
  } catch {
    return false;
  }
}

async function contextPartTypes() {
  const ctx = (await call('model', 'getElementsByName', ['Operational Context']).catch(() => []))
    .find((e) => e.metaclass === 'Class');
  if (!ctx) return null;
  const inside = await call('model', 'vertical', [ref(ctx.id)]);
  const types = {};
  for (const part of inside.filter((e) => e.metaclass === 'Property')) {
    const full = await call('model', 'getElementByID', [part.id]);
    types[full.name || part.id] = full.typeId || '';
    console.log('  part', full.name || '(unnamed)', full.typeName || 'no type');
  }
  return types;
}

async function replaceAll() {
  for (const [source, target, label] of REPLACEMENTS) {
    if (!(await exists(source))) { console.log('  skip', label); continue; }
    if (!(await exists(target))) throw new Error('target missing for ' + label);
    const result = await patiently(() => call('refactor', 'replace', [ref(source), ref(target)]));
    console.log('  replaced', label, result.removed ? '' : '(source still there)', result.failed?.length ? result.failed.join('; ') : '');
  }
  if (await exists(OPERATOR)) {
    const named = await patiently(() => call('model', 'set', [ref(OPERATOR), 'name', 'Shepherd Operator']));
    console.log('  renamed', named.name || 'Shepherd Operator');
  } else {
    console.log('  no UAV operator block to rename');
  }
}

if (here) {
  await ensureProvider();
  const open = await call('project', 'getCurrent').catch(() => ({}));
  console.log('\n==', open.name || 'the open project');
  await replaceAll();
  console.log('\nNot saved.');
} else if (!files.length) {
  console.error('usage: node scripts/replace-op-context-actors.mjs <model.mdzip> [...] | --here   [--keep-open]');
  process.exit(1);
} else {
  await ensureProvider();
  for (const f of files) {
    if (!fs.existsSync(f)) { console.error('not found:', f); process.exitCode = 1; continue; }
    const file = path.resolve(f);
    console.log('\n==', path.basename(file));
    await closeAll();
    await call('project', 'open', [{ path: file, async: false }]);
    await waitOpen(file);
    const before = await contextPartTypes();
    await replaceAll();
    const after = await contextPartTypes();
    if (before && after) {
      for (const [name, typeId] of Object.entries(before)) {
        if (typeId && !after[name]) throw new Error('part lost its type: ' + name);
      }
    }
    await assignImages();
    if (keepOpen) { console.log('  left open, not saved'); continue; }
    await patiently(() => call('refactor', 'save'));
    await patiently(() => call('project', 'close', [{ save: false }]));
    fs.rmSync(file + '.bak', { force: true });
    console.log('  saved');
  }
}
