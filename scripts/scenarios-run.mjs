/* Check or play scenarios of the DSL, and say what they show about the architecture.

     node scripts/scenarios-run.mjs <id | file.scn | dir> ... [--check] [--lib <dir>] [--out <dir>]
                                    [--report <file.json>] [--no-coverage] [--timeout <s>]

   The library (scenarios/library, scenarios/private) is always loaded; .scn files and dirs given on the command
   line are added to it (a file outside the library, a draft, wins over a library scenario of the same id), and
   their scenarios are the targets. An id names a library scenario.

   --check     parse and compile only: errors, warnings, what is played before (preconditions) and what is measured.
   otherwise   compile, write <out>/<id>.scenario.json (default: the system temp dir), play it in Cameo through
               the MBSE Shepherd panel (POST http://127.0.0.1:9851/mcp/scenario/run, then status until done), print
               the verdict step by step (expected / observed), then the coverage of the state machines: the states
               never reached and the branches not taken, each a candidate for a new scenario.
   --report    writes everything as JSON (one entry per scenario), for a program or an LLM to read back.

   Exit code: 0 all PASS (or all compile with --check), 1 a scenario FAIL, 2 a compile error, 3 Cameo unreachable.
   Messages (then message ...) are not checked by the panel, only by "Validate in Cameo" in the guide. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DSL = require(path.join(ROOT, 'scenarios/scenario-dsl.js'));
const BASE = process.env.MBSE_MCP || 'http://127.0.0.1:9851/mcp';

/* ── arguments ── */
const argv = process.argv.slice(2);
const opt = { check: false, libs: [], out: path.join(os.tmpdir(), 'mbse-scenarios'), report: '', coverage: true, timeout: 600, targets: [] };
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  if (a === '--check') opt.check = true;
  else if (a === '--lib') opt.libs.push(argv[++i]);
  else if (a === '--out') opt.out = path.resolve(argv[++i]);
  else if (a === '--report') opt.report = path.resolve(argv[++i]);
  else if (a === '--no-coverage') opt.coverage = false;
  else if (a === '--timeout') opt.timeout = Number(argv[++i]);
  else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]); process.exit(0); }
  else opt.targets.push(a);
}
if (!opt.targets.length) { console.error('usage: node scripts/scenarios-run.mjs <id | file.scn | dir> ... [--check]   (--help)'); process.exit(2); }

function scnFiles(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return [p];
  return fs.readdirSync(p, { withFileTypes: true }).flatMap((e) => (e.name === 'out' ? [] : e.isDirectory() ? scnFiles(path.join(p, e.name)) : e.name.endsWith('.scn') ? [path.join(p, e.name)] : []));
}
const read = (p) => ({ path: path.relative(ROOT, p).replace(/\\/g, '/'), text: fs.readFileSync(p, 'utf8') });

const library = [path.join(ROOT, 'scenarios/library'), path.join(ROOT, 'scenarios/private')].filter(fs.existsSync).flatMap(scnFiles);
const extra = [];
const targetIds = [];
for (const d of opt.libs) extra.push(...scnFiles(path.resolve(d)));
for (const t of opt.targets) {
  if (fs.existsSync(t)) { const files = scnFiles(path.resolve(t)); extra.push(...files); files.forEach((f) => targetIds.push({ file: f })); }
  else targetIds.push({ id: t });
}
const extraSet = new Set(extra.map((f) => path.resolve(f)));
const texts = library.filter((f) => !extraSet.has(path.resolve(f))).map(read).concat([...extraSet].map(read));
const lib = DSL.load(texts);
/* a file given on the command line wins over a library file of the same id */
for (const f of lib.files) if (extraSet.has(path.resolve(ROOT, f.path)) && f.id) lib.docs.set(f.id, f.doc);
const ids = targetIds.flatMap((t) => {
  if (t.id) return [t.id];
  const f = lib.files.find((x) => path.resolve(ROOT, x.path) === path.resolve(t.file));
  f && f.errors.forEach((e) => console.error(`✗ ${f.path}:${e.line} ${e.message}`));
  return f && f.id ? [f.id] : [];
});

/* ── Cameo ── */
async function call(category, name, ...args) {
  let res;
  try {
    res = await fetch(`${BASE}/${category}/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  } catch (e) {
    const err = new Error(`Cameo is not reachable at ${BASE} (MagicDraw open, MBSE Shepherd plugin, the project loaded?)`);
    err.unreachable = true; throw err;
  }
  const reply = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  if (!reply.ok) throw new Error(`${category}/${name}: ${reply.error}`);
  return reply.result;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function describe(id, r) {
  const setup = r.json.phases.filter((p) => p.setup);
  const measured = r.json.phases.filter((p) => !p.setup);
  const n = (ps) => ps.reduce((k, p) => k + p.steps.length, 0);
  console.log(`  played before (not measured): ${n(setup)} step(s)${setup.length ? ' · ' + setup.flatMap((p) => String(p.source || p.name).split(',')).filter((x, i, a) => a.indexOf(x) === i).join(' → ') : ''}`);
  console.log(`  measured: ${n(measured)} step(s) in ${measured.length} phase(s)`);
}

function printRun(result) {
  for (const ph of result.phases || []) {
    if (ph.setup && ph.status === 'PASS') continue;
    console.log(`  ${ph.setup ? '(precondition) ' : ''}phase ${ph.name}: ${ph.status}`);
    for (const st of ph.steps) {
      const bad = (st.checks || []).filter((c) => c.ok === false);
      console.log(`    ${st.status === 'PASS' ? '✓' : st.status === 'FAIL' ? '✗' : '·'} ${st.index}. ${st.into} sends ${st.signal}${st.error ? '  — ' + st.error : ''}`);
      for (const c of bad) {
        const seen = (st.states || {})[c.path];
        const what = { EXPECT: 'expected in', ABSENT: 'expected NOT in', NEVER: 'entered the forbidden state', REACHED: 'never reached' }[c.kind] || c.kind;
        console.log(`        ${c.path}: ${what} "${c.state}"; observed: ${seen ? seen.join(', ') || '(no state)' : '(not observed)'}`);
      }
    }
    for (const c of (ph.reached || []).filter((x) => x.ok === false)) console.log(`      reached: ${c.path} never entered "${c.state}" in this phase`);
  }
  for (const c of (result.never || []).filter((x) => x.ok === false)) console.log(`  never: ${c.path} entered "${c.state}"`);
  if (result.message) console.log(`  message: ${result.message}`);
}

function printCoverage(cov) {
  console.log(`  coverage: ${cov.states.reached}/${cov.states.total} states, ${cov.transitions.traversed}/${cov.transitions.total} transitions`);
  for (const [p, list] of Object.entries(cov.neverReached || {})) if (list && list.length) console.log(`    ${p} never in: ${list.join(', ')}`);
  const br = cov.branches || [];
  if (br.length) console.log(`  branches not taken (${br.length}), candidates for an alternative or dysfunctional scenario:`);
  for (const b of br.slice(0, 30)) console.log(`    [${b.kind}] ${b.path}: ${b.from} --${b.signal || '(completion)'}--> ${b.to}${b.afterPhase ? `   (reachable after phase "${b.afterPhase}")` : ''}`);
  if (br.length > 30) console.log(`    … ${br.length - 30} more in the report`);
}

/* ── main ── */
const report = [];
let code = 0;
fs.mkdirSync(opt.out, { recursive: true });
for (const id of ids) {
  const r = DSL.compile(id, lib.docs);
  const entry = { id, errors: r.errors, warnings: r.warnings };
  report.push(entry);
  console.log(`\n${r.errors.length ? '✗' : '•'} ${id}${r.json ? ' — ' + r.json.title : ''}`);
  r.errors.forEach((e) => console.error(`  error: ${e.scenario}: ${e.message}`));
  r.warnings.forEach((w) => console.log(`  warning: ${w.scenario}: ${w.message}`));
  if (!r.json) { code = Math.max(code, 2); continue; }
  describe(id, r);
  const file = path.join(opt.out, `${id}.scenario.json`);
  fs.writeFileSync(file, JSON.stringify(r.json, null, 2) + '\n');
  entry.file = file;
  if (opt.check) continue;
  try {
    const project = await call('project', 'getCurrent');
    if (project && project.ready === false) {
      const err = new Error(`no project ready in Cameo (${(project.async && project.async.error) || project.status}): open the model that holds "${r.json.context}" first`);
      err.unreachable = true; throw err;
    }
    await call('scenario', 'run', file);
    const t0 = Date.now();
    let st;
    for (;;) {
      await sleep(1000);
      st = await call('scenario', 'status', file);
      if (st.done) break;
      const waited = Date.now() - t0;
      if (st.status === 'PENDING' && !st.stepsDone && waited > 30000) {
        await call('scenario', 'stop').catch(() => {});
        st = { ...st, status: 'STALLED', message: `the simulation did not start in 30 s: is "${r.json.context}" in the open model?` }; break;
      }
      if (waited > opt.timeout * 1000) { await call('scenario', 'stop').catch(() => {}); st = { ...st, status: 'TIMEOUT' }; break; }
    }
    entry.status = st.status;
    entry.result = st;
    console.log(`  verdict: ${st.status} — ${st.stepsPassed}/${st.steps} measured step(s) pass, ${st.setupSteps} precondition step(s)`);
    printRun(st);
    if (opt.coverage) {
      entry.coverage = await call('scenario', 'coverage', file).catch((e) => ({ error: e.message }));
      if (!entry.coverage.error) printCoverage(entry.coverage);
    }
    if (st.status !== 'PASS') code = Math.max(code, 1);
  } catch (e) {
    console.error(`  ${e.message}`);
    entry.status = 'ERROR'; entry.error = e.message;
    code = Math.max(code, e.unreachable ? 3 : 1);
    if (e.unreachable) break;
  }
}
if (!ids.length) { console.error('no scenario found'); code = 2; }
if (opt.report) { fs.writeFileSync(opt.report, JSON.stringify(report, null, 2) + '\n'); console.log(`\nreport: ${opt.report}`); }
process.exit(code);
