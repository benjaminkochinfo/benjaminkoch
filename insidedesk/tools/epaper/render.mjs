// Thumbnails (thumbs/pNN.png) and the PDF for one ePaper issue, plus an overflow audit. Called by build.py:
//   node --experimental-websocket render.mjs <site_root> <issue_dir> <n_pages> <pdf_name> <chrome>
import fs from "node:fs"; import http from "node:http"; import path from "node:path";
import { launch } from "./cdp.mjs";
const [root, dir, nStr, pdfName, bin, mode] = process.argv.slice(2);
let n = +nStr;
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((q, s) => { let f = path.join(root, decodeURIComponent(new URL(q.url, "http://x").pathname)); if (f.endsWith("/")) f += "index.html";
  fs.readFile(f, (err, b) => { if (err) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); s.end(b); }); });
await new Promise(r => srv.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${srv.address().port}/${dir}/index.html`, out = path.join(root, dir);
fs.mkdirSync(path.join(out, "thumbs"), { recursive: true });
const p = await launch(9400 + (process.pid % 400), 1, bin);
await p.size(1000, 1414);
const measure = `(()=>{const pg=document.querySelector('.page.on .pg-inner');const r={};const po=pg.scrollHeight-pg.clientHeight;if(po>2)r.page=po;
 const xg=pg.querySelector('.xg');if(xg){const b=xg.getBoundingClientRect().bottom;r.cols={};r.len={};
  xg.querySelectorAll(':scope>[data-fit]').forEach(c=>{const kids=[...c.children];const need=c.classList.contains('xa')?c.scrollHeight:kids.reduce((a,k)=>a+k.offsetHeight,0)+18*(kids.length-1);
   const o=c.getBoundingClientRect().top+need-b;const k=c.dataset.fit;if(o>2)r.cols[k]=Math.max(r.cols[k]||0,Math.round(o));
   c.querySelectorAll('.xa').forEach(x=>{if(x.dataset.fit===k)r.len[k]=x.querySelector('.st-body').textContent.length});if(c.classList.contains('xa'))r.len[k]=c.querySelector('.st-body').textContent.length});
  if(!Object.keys(r.cols).length)delete r.cols;delete r.len.x;if(!r.cols)delete r.len}
 return Object.keys(r).length?r:0})()`;
if (mode === "audit") {
  const ed = JSON.parse(fs.readFileSync(path.join(out, "edition.json"), "utf8")), res = {};
  for (const pg of ed.pages) { await p.go(`${base}?solo=${pg.n}`, 150); const m = await p.eval(measure); if (m) res[pg.n] = m; }
  console.log(JSON.stringify(res)); await p.close(); srv.close(); process.exit(0);
}
const clipped = [];
for (let i = 1; i <= n; i++) {
  await p.go(`${base}?solo=${i}`, 500);
  await p.shot(path.join(out, "thumbs", `p${String(i).padStart(2, "0")}.png`), { x: 0, y: 0, width: 1000, height: 1414, scale: 0.2 });
  const r = await p.eval(`(()=>{const pg=document.querySelector('.page.on .pg-inner');const o=[];pg.querySelectorAll('.st-body,.xa,.pg-inner>*').forEach(x=>{if(x.scrollHeight>x.clientHeight+2)o.push((x.className||x.tagName).split(' ')[0]+':'+(x.scrollHeight-x.clientHeight))});return pg.scrollHeight>pg.clientHeight+2?['PAGE:'+(pg.scrollHeight-pg.clientHeight),...o]:o})()`);
  if (r.length) clipped.push(`p${i} ${r.join(" ")}`);
}
await p.go(`${base}?print=1`, 1500);
const pdf = await p.send("Page.printToPDF", { preferCSSPageSize: true, printBackground: true });
fs.writeFileSync(path.join(out, pdfName), Buffer.from(pdf.data, "base64"));
console.log(`ePaper ${dir}: ${n} thumbnails, ${pdfName} ${(fs.statSync(path.join(out, pdfName)).size / 1024) | 0} KB` + (clipped.length ? "\nCLIPPED: " + clipped.join(" | ") : ", no clipped pages"));
await p.close(); srv.close(); process.exit(0);
