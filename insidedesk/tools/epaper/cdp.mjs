// Minimal CDP driver for headless Chrome (no puppeteer).
import { spawn } from "node:child_process";
export async function launch(port = 9340, scheme = 1, bin = "google-chrome") {
  const os = await import("node:os"), fsm = await import("node:fs"), dir = fsm.mkdtempSync(os.tmpdir() + "/id-cdp-");
  const chrome = spawn(bin, ["--headless=new", "--no-sandbox", "--hide-scrollbars", `--user-data-dir=${dir}`, `--remote-debugging-port=${port}`, `--blink-settings=preferredColorScheme=${scheme}`, "about:blank"], { stdio: "ignore" });
  for (let i = 0; i < 40; i++) { try { await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); break; } catch { await new Promise(r => setTimeout(r, 150)); } }
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const ws = new WebSocket(list.find(t => t.type === "page").webSocketDebuggerUrl);
  let id = 0; const pend = {};
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend[d.id]) { d.error ? pend[d.id].rej(new Error(JSON.stringify(d.error))) : pend[d.id].res(d.result); delete pend[d.id]; } };
  await new Promise(r => ws.onopen = r);
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend[i] = { res, rej }; ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  const page = {
    send,
    async size(w, h, mobile = false, dpr = 1) { await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: dpr, mobile }); if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true }); },
    async go(url, wait = 2000) { await send("Page.navigate", { url }); await new Promise(r => setTimeout(r, 400)); for (let i = 0; i < 50; i++) { if (await page.eval("window.__ready === true")) break; await new Promise(r => setTimeout(r, 100)); } await new Promise(r => setTimeout(r, wait)); },
    async eval(expr) { const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }); return r.result.value; },
    async shot(path, clip) { const fs = await import("node:fs"); const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, ...(clip ? { clip: { scale: 1, ...clip } } : {}) }); fs.writeFileSync(path, Buffer.from(r.data, "base64")); },
    async close() { chrome.kill(); try { fsm.rmSync(dir, { recursive: true, force: true }); } catch {} }
  };
  return page;
}
