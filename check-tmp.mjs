/**
 * Measures real pages over CDP. Launches its own Chrome and refuses to report a
 * number until the stylesheet has loaded - the guard this repo's log asks for,
 * after a run where an unstyled page reported 195px of fictional overflow.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const targets = JSON.parse(process.argv[2]);
const widths = JSON.parse(process.argv[3] || '[1400,390]');

async function cdp(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      return (await r.json()).webSocketDebuggerUrl;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('chrome did not come up');
}

let idc = 0;
function makeSock(ws) {
  const pending = new Map();
  const sock = new WebSocket(ws);
  const ready = new Promise((res) => (sock.onopen = res));
  sock.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  };
  return {
    ready,
    send(method, params, sessionId) {
      const id = ++idc;
      return new Promise((res) => {
        pending.set(id, res);
        sock.send(JSON.stringify({ id, method, params, sessionId }));
      });
    },
    close: () => sock.close(),
  };
}

const results = [];
for (const width of widths) {
  const dir = mkdtempSync(join(tmpdir(), 'cdp-'));
  const port = 9300 + Math.floor(Math.random() * 400);
  const proc = spawn(
    CHROME,
    [
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${dir}`,
      '--headless=new',
      '--no-first-run',
      '--disable-gpu',
      `--window-size=${width},900`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: true },
  );
  const sock = makeSock(await cdp(port));
  await sock.ready;

  for (const t of targets) {
    const { targetId } = (await sock.send('Target.createTarget', { url: 'about:blank' })).result;
    const { sessionId } = (await sock.send('Target.attachToTarget', { targetId, flatten: true }))
      .result;
    await sock.send('Page.enable', {}, sessionId);
    await sock.send('Runtime.enable', {}, sessionId);
    await sock.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height: 900, deviceScaleFactor: width < 500 ? 3 : 1, mobile: width < 500 },
      sessionId,
    );
    await sock.send('Page.navigate', { url: t.url }, sessionId);

    // Wait for styles AND the cream background - an unstyled page lies.
    let ok = false;
    for (let i = 0; i < 80; i++) {
      const r = await sock.send(
        'Runtime.evaluate',
        {
          expression: `(()=>{const b=getComputedStyle(document.body).backgroundColor;return document.styleSheets.length>0 && b!=='rgba(0, 0, 0, 0)' && document.readyState==='complete'})()`,
          returnByValue: true,
        },
        sessionId,
      );
      if (r.result?.result?.value) {
        ok = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!ok) {
      results.push({ width, url: t.url, error: 'stylesheet never loaded - measurement refused' });
      await sock.send('Target.closeTarget', { targetId });
      continue;
    }
    await new Promise((r) => setTimeout(r, 400));
    const out = await sock.send(
      'Runtime.evaluate',
      { expression: t.expr, returnByValue: true, awaitPromise: true },
      sessionId,
    );
    results.push({ width, url: t.url, value: out.result?.result?.value ?? out.result });
    await sock.send('Target.closeTarget', { targetId });
  }
  sock.close();
  try {
    process.kill(-proc.pid);
  } catch {
    try {
      proc.kill();
    } catch {}
  }
}
console.log(JSON.stringify(results, null, 1));
