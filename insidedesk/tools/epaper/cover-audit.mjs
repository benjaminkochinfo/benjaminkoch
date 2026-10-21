// Cover overflow audit for one ePaper issue: prints {"cover": px} (0 when the cover fits). Called by epaper.py fit_issue.
//   node --experimental-websocket cover-audit.mjs <site_root> <issue_dir> <chrome>
import fs from "node:fs"; import http from "node:http"; import path from "node:path";
import { launch } from "./cdp.mjs";
const [root, dir, bin] = process.argv.slice(2);
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const srv = http.createServer((q, s) => { let f = path.join(root, decodeURIComponent(new URL(q.url, "http://x").pathname)); if (f.endsWith("/")) f += "index.html";
  fs.readFile(f, (err, b) => { if (err) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); s.end(b); }); });
await new Promise(r => srv.listen(0, "127.0.0.1", r));
const p = await launch(9800 + (process.pid % 150), 1, bin);
await p.size(1000, 1414);
await p.go(`http://127.0.0.1:${srv.address().port}/${dir}/index.html?solo=1`, 500);
const o = await p.eval(`(()=>{const pg=document.querySelector('.page.on .pg-inner');if(!pg)return 0;let m=pg.scrollHeight-pg.clientHeight;
 pg.querySelectorAll('.cv-grid,.cv-story,.cv-art').forEach(x=>{m=Math.max(m,x.scrollHeight-x.clientHeight)});return m>2?Math.round(m):0})()`);
console.log(JSON.stringify({ cover: o })); await p.close(); srv.close(); process.exit(0);
