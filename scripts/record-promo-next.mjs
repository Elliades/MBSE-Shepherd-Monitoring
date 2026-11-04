// Plays the second promo film (promo/next.html) in a headless Chrome at 1920 x 1080, through the DevTools protocol.
//   node scripts/record-promo-next.mjs <url of next.html> <empty out dir> rec              frames of the screencast + frames.txt for ffmpeg
//   node scripts/record-promo-next.mjs <url of next.html> <empty out dir> shots 12,40,95   one screenshot at each time of the film
// Needs Node 22+ (WebSocket) and Chrome at its default place. Use ?hud=0&autoplay=0 in the url for rec, ?hud=0 for shots.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const [url, out, mode, list] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const PORT = 9333;
const prof = join(out, '..', 'chrome-prof');
rmSync(prof, { recursive: true, force: true });
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--window-size=1920,1080',
  '--hide-scrollbars', '--mute-audio', '--no-first-run', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'
], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ver = null;
for (let i = 0; i < 50 && !ver; i++) { await sleep(200); try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch (e) { /* not yet */ } }
const page = ver.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const handlers = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) handlers.forEach((h) => h(m));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

await send('Page.enable');
await send('Runtime.enable');
handlers.push((m) => { if (m.method === 'Runtime.exceptionThrown') console.log('EXC', JSON.stringify(m.params.exceptionDetails).slice(0, 400)); if (m.method === 'Runtime.consoleAPICalled' && /warn|error/.test(m.params.type)) console.log('CONSOLE', m.params.type, m.params.args.map((a) => a.value || a.description).join(' ').slice(0, 300)); });
await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await sleep(1500);

if (mode === 'shots') {
  const times = list.split(',').map(Number);
  // wait for the film to start by itself
  for (let i = 0; i < 100; i++) { if ((await evaluate('window.PromoNext && PromoNext.t')) > 0) break; await sleep(100); }
  for (const t of times) {
    for (;;) { const now = await evaluate('PromoNext.t'); if (now >= t) break; await sleep(40); }
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    writeFileSync(join(out, `t${String(t).padStart(6, '0')}.jpg`), Buffer.from(shot.result.data, 'base64'));
    console.log('shot', t, await evaluate('document.getElementById("hud-err").textContent'));
  }
} else if (mode === 'rec') {
  // frames of the screencast, with their time, for ffmpeg (concat demuxer)
  let n = 0;
  const lines = [];
  let prev = null;
  handlers.push(async (m) => {
    if (m.method !== 'Page.screencastFrame') return;
    const { data, metadata, sessionId } = m.params;
    send('Page.screencastFrameAck', { sessionId });
    const f = `f${String(n++).padStart(6, '0')}.jpg`;
    writeFileSync(join(out, f), Buffer.from(data, 'base64'));
    if (prev) lines.push(`file '${prev.f}'\nduration ${(metadata.timestamp - prev.ts).toFixed(4)}`);
    prev = { f, ts: metadata.timestamp };
  });
  await evaluate('PromoNext.pause(), PromoNext.seek(0), 1');
  await sleep(5500);
  await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await evaluate('PromoNext.play(), 1');
  const END = await evaluate('PromoNext.END');
  for (;;) { const now = await evaluate('PromoNext.t'); if (now >= END) break; await sleep(250); }
  await sleep(400);
  await send('Page.stopScreencast');
  await sleep(300);
  if (prev) lines.push(`file '${prev.f}'\nduration 0.04\nfile '${prev.f}'`);
  writeFileSync(join(out, 'frames.txt'), lines.join('\n') + '\n');
  console.log('frames', n);
}
ws.close();
chrome.kill();
process.exit(0);
