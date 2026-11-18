/* Puts the illustrations of assets/img/op-context/illustrations/ on the blocks of the operational context, and on the
   parts of the `Operational Context` IBD that are typed by them. Nothing else is touched: no layout, no `diagram present`.

   Needs MagicDraw running with the OMF plugin (MCP on 127.0.0.1:9851).

     node scripts/assign-op-context-images.mjs <model.mdzip> [<model.mdzip> ...]   open, assign, save, close each one
     node scripts/assign-op-context-images.mjs --here                            the project already open, not saved nor closed
       --keep-open   with files: do not close nor save (look at the result, then save by hand)
       --export <dir>  also write a PNG of the Operational Context diagram in <dir> (to check the result)

   Why the SVG files are written the way they are (see the files): Cameo draws an SVG at its declared size and only
   shrinks it to fit the shape, so each one declares 1000x1000 and a square viewBox; and a BOM at the start of the file
   makes Cameo draw nothing, so they must stay UTF-8 without BOM. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG = path.join(ROOT, 'assets', 'img', 'op-context', 'illustrations');
/* block name (as in the models) -> picture */
const PICTURES = {
  'Ground Station': 'ground-station.svg',
  GNSS: 'gnss.svg',
  Weather: 'weather.svg',
  'UAV operator': 'uav-operator.svg',
  'Shepherd Operator': 'uav-operator.svg',
  'SOI - Pasture Sentinel': 'uav-pasture-sentinel.svg',
  Bear: 'bear.svg',
  Sheep: 'flock.svg',
  'Sheep Flock': 'flock.svg',
  'Flight plan Designer': 'flight-plan-designer.svg',
};
const CONTEXT = 'Operational Context';

const argv = process.argv.slice(2);
const here = argv.includes('--here');
const keepOpen = argv.includes('--keep-open');
const exportAt = argv.includes('--export') ? argv[argv.indexOf('--export') + 1] : null;
const files = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--export');

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

/* Right after a change MagicDraw may refuse a new session ("Command history does not allow…"). */
async function patiently(fn) {
  for (let i = 0; i < 15; i++) {
    try { return await fn(); } catch (e) {
      if (!/Command history|Concurrent model/.test(e.message)) throw e;
      await pause(2500);
    }
  }
  throw new Error('MagicDraw keeps refusing a new session');
}

/* The "async running" flag can stay on after the project is ready: after 10 s, ready is enough. */
async function waitOpen(file) {
  const want = path.resolve(file);
  for (let i = 0; i < 90; i++) {
    const open = await call('project', 'getCurrent').catch(() => ({}));
    const work = await call('project', 'getAsyncStatus').catch(() => ({}));
    if (open.filePath && path.resolve(open.filePath) === want && open.ready && (!work.running || i > 6)) return;
    await pause(1500);
  }
  throw new Error(`still not open: ${file}`);
}

async function assign(element, picture) {
  const svg = path.join(IMG, picture).replace(/\\/g, '/');
  return patiently(() => call('model', 'assignElementImage', [ref(element.id), svg]));
}

async function patchOpenProject(label) {
  console.log('\n==', label);
  /* the blocks, wherever they are in the model */
  for (const [name, picture] of Object.entries(PICTURES)) {
    const blocks = (await call('model', 'getElementsByName', [name]).catch(() => [])).filter((e) => e.metaclass === 'Class');
    for (const b of blocks) await assign(b, picture);
    if (blocks.length) console.log('  block', name, blocks.length > 1 ? `(x${blocks.length})` : '');
  }
  /* the parts of the IBD, which have their own picture */
  const ctx = (await call('model', 'getElementsByName', [CONTEXT]).catch(() => [])).find((e) => e.metaclass === 'Class');
  if (!ctx) { console.log('  no block', CONTEXT); return; }
  const inside = await call('model', 'vertical', [ref(ctx.id)]);
  for (const part of inside.filter((e) => e.metaclass === 'Property')) {
    const full = await call('model', 'getElementByID', [part.id]);
    const picture = PICTURES[full.typeName];
    if (!picture) { console.log('  part skip', full.name || '(unnamed)', ':', full.typeName || '?'); continue; }
    await assign(full, picture);
    console.log('  part', full.name || '(unnamed)', ':', full.typeName);
  }
  if (exportAt) {
    const diagram = inside.find((e) => e.metaclass === 'Diagram');
    if (diagram) {
      fs.mkdirSync(exportAt, { recursive: true });
      const out = path.resolve(exportAt, label.replace(/[^A-Za-z0-9]+/g, '_') + '.png');
      await call('diagram', 'exportImage', [ref(diagram.id), out]);
      console.log('  exported', out);
    }
  }
}

if (here) {
  const open = await call('project', 'getCurrent').catch(() => ({}));
  await patchOpenProject(open.name || 'the open project');
  console.log('\nNot saved: Ctrl+S in Cameo.');
} else if (!files.length) {
  console.error('usage: node scripts/assign-op-context-images.mjs <model.mdzip> [...] | --here   [--keep-open] [--export <dir>]');
  process.exit(1);
} else {
  for (const f of files) {
    if (!fs.existsSync(f)) { console.error('not found:', f); process.exitCode = 1; continue; }
    const file = path.resolve(f);
    await call('project', 'open', [file]);
    await waitOpen(file);
    await pause(2000);
    await patchOpenProject(path.basename(file));
    if (keepOpen) { console.log('  left open, not saved'); continue; }
    await patiently(() => call('project', 'close', [{ save: true }]));
    fs.rmSync(file + '.bak', { force: true });
    console.log('  saved');
  }
}
