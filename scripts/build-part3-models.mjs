/* Builds the four starting models of Part 3 in part3/assets/models/, from the specs of scripts/part3-inits/.
   Needs MagicDraw running with the OMF plugin (MCP on 127.0.0.1:9851). Each model is a copy of the base project: it
   is opened beside what is already open, its old logical package is removed, the spec is built, then it is saved
   and closed. The base file and the other open projects are not touched.

       node scripts/build-part3-models.mjs <base .mdzip> [mc arch1 arch2 arch3]  */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = {
  mc: 'UAV_Part3_Init_MissionConfiguration.mdzip',
  arch1: 'UAV_Part3_Init_Arch1_FeatureOrchestrator.mdzip',
  arch2: 'UAV_Part3_Init_Arch2_Patch.mdzip',
  arch3: 'UAV_Part3_Init_Arch3_CentralOrchestrator.mdzip'
};
const OLD_PACKAGES = ['3 - Centralized orchestrator', 'TP - Logical Architecture'];
/* The ports come out as P_<block>_<spec name>: here they are named after the partner, as in the guide. */
const PORTS = {
  mc: 'p_MissionConfiguration', bsrc: 'p_BaseStation', ap: 'p_AutoPilot', orch: 'p_Orchestrator', zs: 'p_ZoneSurveillance', zp: 'p_ZonePatrolling',
  sm: 'p_SheepMonitoring', pm: 'p_PredatorManagement', sg: 'p_SheepGuard', pd: 'p_PredatorDefense', trk: 'p_Tracking', init: 'p_Init', verdict: 'p_Verdict',
  notification: 'p_Verdict', operator: 'p_Operator', power: 'p_Power', link: 'p_OperatorLink', op_link: 'p_OperatorLink', camera: 'p_Camera',
  camera_feed: 'p_CameraFeed', vision: 'p_Vision', light: 'p_Light', sound: 'p_Sound', light_effect: 'p_LightEffect', sound_effect: 'p_SoundEffect',
  strong_light: 'p_StrongLight', loud_sound: 'p_LoudSound'
};
async function namePorts(blocks) {
  for (const b of blocks) {
    for (const e of await call('model', 'vertical', [ref(b)])) {
      if (e.metaclass !== 'Port') continue;
      const key = e.name.slice(`P_${b.name}_`.length);
      let name = PORTS[key];
      if (!name) throw new Error(`no name for port ${e.name}`);
      /* Who starts the mission: the same port in every architecture. */
      if (b.name === 'Mission Configuration' && (key === 'ap' || key === 'orch')) name = 'p_StartOrder';
      await call('model', 'set', [ref(e), 'name', name]);
    }
  }
}

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

async function build(key, base) {
  const dir = path.join(ROOT, 'part3', 'assets', 'models');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, FILES[key]);
  fs.copyFileSync(base, file);
  await call('project', 'open', [file]);
  /* The opening runs in the background: wait until this file is the active project and the work is over. */
  for (let waited = 0; ; waited += 2000) {
    const open = await call('project', 'getCurrent').catch(() => ({}));
    const work = await call('project', 'getAsyncStatus').catch(() => ({}));
    if (open.filePath && path.resolve(open.filePath) === path.resolve(file) && open.ready && !work.running) break;
    if (waited > 180000) throw new Error(`still not open: ${open.filePath}`);
    await new Promise((res) => setTimeout(res, 2000));
  }
  for (const name of OLD_PACKAGES) {
    const found = await call('model', 'getByQualifiedName', ['3 - Logical Analysis::' + name]).catch(() => null);
    if (found) await call('model', 'remove', [ref(found)]);
  }
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'part3-inits', key + '.json'), 'utf8'));
  /* Right after the removal, MagicDraw may still refuse a new session ("Command history does not allow…"). */
  let built = null;
  for (let tries = 0; !built; tries++) {
    built = await call('logical', 'buildArchitecture', [spec]).catch((e) => {
      if (tries >= 5 || !/Command history/.test(e.message)) throw e;
      return null;
    });
    if (!built) await new Promise((res) => setTimeout(res, 3000));
  }
  await namePorts(built.blocks);
  const soi = await call('model', 'getByQualifiedName', ['3 - Logical Analysis::TP - Logical Architecture::Contexts::TP Logical SOI']);
  const flow = await call('analysis', 'signalFlowCheck', [ref(soi)]);
  console.log(key, 'blocks', built.blocks.length, 'functions', built.functions, 'flow', JSON.stringify(flow.summary));
  await call('project', 'close', [{ save: true }]);
  fs.rmSync(file + '.bak', { force: true });
  console.log(' saved', file, fs.statSync(file).size);
}

const [, , base, ...keys] = process.argv;
for (const key of keys.length ? keys : Object.keys(FILES)) await build(key, base);
