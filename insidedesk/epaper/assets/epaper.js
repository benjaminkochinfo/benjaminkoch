/* Inside Desk ePaper. No dependencies. Progressive enhancement over server-rendered pages. */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const qs = new URLSearchParams(location.search), H0 = location.hash;
const SOLO = +qs.get("solo") || 0, PRINT = qs.has("print");
document.body.classList.replace("nojs", "js");
if (SOLO) document.body.classList.add("solo");
const pages = $$(".page"), N = pages.length, PW = 1000, PH = 1414;
const stage = $("#stage"), sizer = $("#sizer"), vp = $("#viewport"), live = $("#live");
let ED = null, views = [], vi = 0, zoom = 1, single = localStorage.getItem("it.epaper.view") === "single";
const store = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

/* ---------- theme */
const themeBtn = $("#b-theme");
function syncTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  themeBtn.setAttribute("aria-label", dark ? "Switch to paper theme" : "Switch to dark theme");
  $('meta[name="theme-color"]').content = dark ? "#0B0E13" : "#F3EEE4";
}
themeBtn.addEventListener("click", () => {
  const t = document.documentElement.dataset.theme === "dark" ? "paper" : "dark";
  document.documentElement.dataset.theme = t; store("it.epaper.theme", t); syncTheme();
  $$(".ichart").forEach(f => f._chart && f._chart.draw());
});
syncTheme();

/* ---------- views: cover alone, then two-page spreads (2-3, 4-5, …) on wide screens */
function spreadMode() { return !single && innerWidth >= 1100 && innerWidth > innerHeight * 1.15; }
function buildViews() {
  views = [];
  if (spreadMode()) { views.push([0]); for (let i = 1; i < N; i += 2) views.push(i + 1 < N ? [i, i + 1] : [i]); }
  else for (let i = 0; i < N; i++) views.push([i]);
}
function viewOf(p) { return Math.max(0, views.findIndex(v => v.includes(p))); }
function layout() {
  const v = views[vi], w = v.length * PW, availW = vp.clientWidth - (innerWidth < 760 ? 8 : 104), availH = vp.clientHeight - 16;
  const fit = Math.min(availW / w, availH / PH), s = fit * zoom;
  stage.style.transform = `scale(${s})`;
  sizer.style.width = w * s + "px"; sizer.style.height = PH * s + "px";
  sizer.style.marginTop = Math.max(8, (vp.clientHeight - PH * s) / 2) + "px";
  vp.classList.toggle("zoomed", zoom > 1.01);
  $("#zlabel").textContent = zoom > 1.01 ? Math.round(zoom * 100) + "%" : "Fit";
}
function show(newVi, dir = 0, focus = false) {
  vi = Math.max(0, Math.min(views.length - 1, newVi));
  const on = new Set(views[vi]);
  pages.forEach((p, i) => {
    const vis = on.has(i);
    p.classList.toggle("on", vis); p.inert = !vis;
    p.classList.remove("turn-next", "turn-prev");
    if (vis && dir) { void p.offsetWidth; p.classList.add(dir > 0 ? "turn-next" : "turn-prev"); }
  });
  layout();
  const nums = views[vi].map(i => i + 1), first = pages[views[vi][0]];
  $("#pgn").textContent = `${nums.join("–")} / ${N}`;
  live.textContent = `Page ${nums.join(" and ")} of ${N}: ${views[vi].map(i => pages[i].dataset.title).join(", ")}`;
  $("#b-prev").disabled = vi === 0; $("#b-next").disabled = vi === views.length - 1;
  $$(".th").forEach(t => {
    const cur = nums.includes(+t.dataset.goto);
    cur ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current");
    if (cur && +t.dataset.goto === nums[0]) t.scrollIntoView({ block: "nearest", inline: "center", behavior: dir ? "smooth" : "auto" });
  });
  if (!SOLO && !PRINT) history.replaceState(null, "", "#p=" + nums[0]);
  vp.scrollTo(0, 0);
  if (focus) first.focus?.();
  drawVisibleCharts();
}
const next = () => vi < views.length - 1 && show(vi + 1, 1), prev = () => vi > 0 && show(vi - 1, -1);
const gotoPage = n => show(viewOf(Math.max(1, Math.min(N, n)) - 1), 0);
addEventListener("hashchange", () => { const m = location.hash.match(/(?:p=|page-)(\d+)/), a = location.hash.match(/a=([\w-]+)/); if (a) openArticle(a[1]); else if (m) gotoPage(+m[1]); });
document.addEventListener("click", e => { const a = e.target instanceof Element && e.target.closest('a[href^="#p="],a[href^="#page-"]'); if (a) { e.preventDefault(); e.stopPropagation(); const d = a.closest("dialog[open]"); if (d) d.close(); gotoPage(+a.getAttribute("href").match(/\d+/)[0]); } }, true);
$("#b-next").onclick = next; $("#b-prev").onclick = prev;
$$(".th").forEach(t => t.addEventListener("click", () => gotoPage(+t.dataset.goto)));
$("#b-view").addEventListener("click", e => {
  single = !single; store("it.epaper.view", single ? "single" : "spread");
  e.currentTarget.setAttribute("aria-pressed", single); e.currentTarget.setAttribute("aria-label", single ? "Two-page spread view" : "Single page view");
  const p = views[vi][0]; buildViews(); show(viewOf(p));
});
$("#b-view").setAttribute("aria-pressed", single);

/* ---------- zoom: buttons, keys, ctrl+wheel, pinch, double-tap */
function setZoom(z, cx, cy) {
  const old = zoom; zoom = Math.max(1, Math.min(4, z));
  const r = vp.getBoundingClientRect(); cx = cx ?? r.width / 2; cy = cy ?? r.height / 2;
  const sx = (vp.scrollLeft + cx) / old, sy = (vp.scrollTop + cy) / old;
  layout(); vp.scrollLeft = sx * zoom - cx; vp.scrollTop = sy * zoom - cy;
}
$("#b-zin").onclick = () => setZoom(zoom * 1.4); $("#b-zout").onclick = () => setZoom(zoom / 1.4); $("#b-zfit").onclick = () => setZoom(1);
vp.addEventListener("wheel", e => { if (e.ctrlKey) { e.preventDefault(); const r = vp.getBoundingClientRect(); setZoom(zoom * (e.deltaY < 0 ? 1.12 : 0.89), e.clientX - r.left, e.clientY - r.top); } }, { passive: false });
const ptrs = new Map(); let swipe = null, pinch = null, lastTap = 0;
vp.addEventListener("pointerdown", e => {
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; swipe = null; }
  else if (ptrs.size === 1) swipe = { x: e.clientX, y: e.clientY, t: Date.now() };
});
vp.addEventListener("pointermove", e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], r = vp.getBoundingClientRect(); setZoom(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); }
});
const endPtr = e => {
  ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
  if (!swipe || ptrs.size) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y, dt = Date.now() - swipe.t; swipe = null;
  if (zoom <= 1.01 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && dt < 800) { dx < 0 ? next() : prev(); return; }
  if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && e.pointerType === "touch") {
    if (Date.now() - lastTap < 300) { const r = vp.getBoundingClientRect(); setZoom(zoom > 1.01 ? 1 : 2.2, e.clientX - r.left, e.clientY - r.top); lastTap = 0; }
    else lastTap = Date.now();
  }
};
vp.addEventListener("pointerup", endPtr); vp.addEventListener("pointercancel", e => { ptrs.delete(e.pointerId); pinch = null; swipe = null; });

/* ---------- keyboard */
document.addEventListener("keydown", e => {
  const t = e.target instanceof Element ? e.target : document.body;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (t.closest("input,textarea,dialog[open]") || document.querySelector("dialog[open]")) return;
  if (t.closest(".ic-svg") && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
  const k = e.key;
  if (k === "ArrowRight" || k === "PageDown") { e.preventDefault(); next(); }
  else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); prev(); }
  else if (k === "Home") show(0, -1); else if (k === "End") show(views.length - 1, 1);
  else if (k === "+" || k === "=") setZoom(zoom * 1.4); else if (k === "-") setZoom(zoom / 1.4); else if (k === "0") setZoom(1);
  else if (k === "/") { e.preventDefault(); openSearch(); } else if (k === "t") openToc();
});
addEventListener("resize", () => { const p = views[vi]?.[0] ?? 0; buildViews(); vi = viewOf(p); show(vi); });

/* ---------- reading view */
const rd = $("#rd"), rdBody = $("#rd-body");
let order = $$(".reader-store .ra").map(a => a.dataset.slug), cur = null, opener = null;
let rs = +(localStorage.getItem("it.epaper.rs") || 19);
function openArticle(slug, term) {
  const src = document.getElementById("a-" + slug); if (!src) return;
  if (!rd.open) opener = document.activeElement;
  cur = slug; rdBody.innerHTML = ""; const node = src.cloneNode(true); node.removeAttribute("id");
  node.querySelectorAll("[id]").forEach(n => n.id = "rd-" + n.id);
  node.querySelectorAll('a[href^="#"]').forEach(a => a.setAttribute("href", "#rd-" + a.getAttribute("href").slice(1)));
  rdBody.appendChild(node);
  if (term) highlight(node.querySelector(".ra-body"), term);
  $("#rd-title").textContent = "Reading view: " + node.querySelector("h2").textContent;
  rd.setAttribute("aria-labelledby", node.querySelector("h2").id);
  const i = order.indexOf(slug); $("#rd-pos").textContent = `Article ${i + 1} of ${order.length} · page ${ED?.articles[slug]?.page ?? ""}`;
  $("#rd-prev").disabled = i <= 0; $("#rd-next").disabled = i >= order.length - 1;
  $("#rd-scroll").style.setProperty("--rs", rs + "px"); $("#rd-scroll").scrollTop = 0;
  if (!rd.open) rd.showModal();
  node.querySelectorAll(".ichart").forEach(initChart);
  history.replaceState(null, "", "#a=" + slug);
  rd.querySelector("[data-close]").focus();
  const m = node.querySelector("mark"); if (m) m.scrollIntoView({ block: "center" });
}
rd.addEventListener("close", () => { history.replaceState(null, "", "#p=" + (views[vi][0] + 1)); opener?.focus?.(); });
$("#b-read").onclick = () => { const v = views[vi].map(i => pages[i].querySelector("[data-article]")).find(Boolean); openArticle(v ? v.dataset.article : order[0]); };
$("#rd-prev").onclick = () => openArticle(order[order.indexOf(cur) - 1]);
$("#rd-next").onclick = () => openArticle(order[order.indexOf(cur) + 1]);
$("#rd-sm").onclick = () => { rs = Math.max(15, rs - 1); store("it.epaper.rs", rs); $("#rd-scroll").style.setProperty("--rs", rs + "px"); };
$("#rd-lg").onclick = () => { rs = Math.min(28, rs + 1); store("it.epaper.rs", rs); $("#rd-scroll").style.setProperty("--rs", rs + "px"); };
$$("dialog").forEach(d => { d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-close]")) d.close(); }); });
stage.addEventListener("click", e => {
  const b = e.target.closest("[data-open]"); if (b) { e.preventDefault(); openArticle(b.dataset.open); return; }
  if (e.target.closest("a,button,.ichart,.ph")) return;
  const art = e.target.closest("[data-article]"); if (art && Math.abs((swipe?.x ?? 0)) === 0) openArticle(art.dataset.article);
});

/* ---------- contents + search */
const toc = $("#toc"), srch = $("#srch");
function openToc() {
  if (!ED) return;
  const secs = []; ED.pages.forEach(p => { if (!secs.length || secs[secs.length - 1].s !== p.section) secs.push({ s: p.section, items: [] }); secs[secs.length - 1].items.push(p); });
  const arts = Object.entries(ED.articles);
  $("#toc-body").innerHTML = `<h3>Pages</h3><ol class="toc-d">${ED.pages.map(p => `<li><button data-p="${p.n}"><span class="n">${p.n}</span><span><b>${esc(p.title)}</b><small>${esc(p.section)}</small></span></button></li>`).join("")}</ol>
  <h3>Articles</h3><ol class="toc-d">${arts.map(([s, a]) => `<li><button data-a="${s}"><span class="n">${a.page}</span><span><b>${esc(a.title)}</b><small>${esc(a.desk)}</small></span></button></li>`).join("")}</ol>`;
  toc.showModal(); toc.querySelector("[data-close]").focus();
}
$("#toc-body").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; toc.close(); b.dataset.p ? gotoPage(+b.dataset.p) : openArticle(b.dataset.a); });
$("#b-toc").onclick = openToc;
function openSearch() { srch.showModal(); $("#q").focus(); $("#q").select(); }
$("#b-search").onclick = openSearch;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
$("#q").addEventListener("input", () => {
  const q = $("#q").value.trim(), out = $("#q-res"); out.innerHTML = "";
  if (q.length < 2 || !ED) { $("#q-n").textContent = ""; return; }
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"); let n = 0;
  for (const [slug, a] of Object.entries(ED.articles)) {
    const hay = `${a.title} ${a.dek} ${a.text}`, hits = hay.match(re); if (!hits) continue; n += hits.length;
    const i = a.text.search(re), snip = i >= 0 ? "…" + a.text.slice(Math.max(0, i - 60), i + 90) + "…" : a.dek;
    out.insertAdjacentHTML("beforeend", `<li><button data-a="${slug}"><small>Page ${a.page} · ${esc(a.desk)} · ${hits.length} match${hits.length > 1 ? "es" : ""}</small><b>${esc(a.title)}</b><span>${esc(snip).replace(re, m => `<mark>${m}</mark>`)}</span></button></li>`);
  }
  $("#q-n").textContent = n ? `${n} match${n > 1 ? "es" : ""} in ${out.children.length} article${out.children.length > 1 ? "s" : ""}` : "No matches in this edition";
});
$("#q-res").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; srch.close(); gotoPage(ED.articles[b.dataset.a].page); openArticle(b.dataset.a, $("#q").value.trim()); });
function highlight(root, term) {
  if (!root || !term) return; const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
  nodes.forEach(t => { if (!re.test(t.data)) return; re.lastIndex = 0; const span = document.createElement("span"); span.innerHTML = esc(t.data).replace(re, m => `<mark>${m}</mark>`); t.replaceWith(...span.childNodes); });
}

/* ---------- interactive charts (SVG, no library) */
const NS = "http://www.w3.org/2000/svg";
const el = (n, a = {}, p) => { const x = document.createElementNS(NS, n); for (const k in a) x.setAttribute(k, a[k]); p && p.appendChild(x); return x; };
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const fmtD = s => new Date(s + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
function initChart(fig) {
  if (fig._chart || !ED) return; const spec = ED.charts[fig.dataset.chart]; if (!spec) return;
  const plot = fig.querySelector(".ic-plot"); plot.innerHTML = "";
  const series = spec.series.map((s, i) => ({ ...s, on: !s.panel, color: `var(--c${(i % 4) + 1})`, cv: `--c${(i % 4) + 1}` }));
  const all = series.flatMap(s => s.points.map(p => p[0])).sort(), t0 = Date.parse(all[0]), t1 = Date.parse(all[all.length - 1]);
  const spanDays = (t1 - t0) / 864e5;
  const ranges = [["3M", 92], ["6M", 183], ["1Y", 366], ["All", 0]].filter(([, d]) => !d || d < spanDays - 20);
  let range = "All";
  const ctrl = document.createElement("div"); ctrl.className = "ic-ctrl";
  series.forEach(s => { const b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-pressed", s.on); b.innerHTML = `<i class="sw" style="background:${s.color}"></i>${esc(s.label)}`;
    b.onclick = () => { if (s.on && series.filter(x => x.on).length === 1) return; s.on = !s.on; b.setAttribute("aria-pressed", s.on); draw(); }; ctrl.appendChild(b); });
  ctrl.insertAdjacentHTML("beforeend", '<span class="sep"></span>');
  ranges.forEach(([r]) => { const b = document.createElement("button"); b.type = "button"; b.className = "rng"; b.textContent = r; b.setAttribute("aria-pressed", r === range); b.setAttribute("aria-label", r === "All" ? "Show all data" : "Show last " + r);
    b.onclick = () => { range = r; ctrl.querySelectorAll(".rng").forEach(x => x.setAttribute("aria-pressed", x === b)); draw(); }; ctrl.appendChild(b); });
  const wrap = document.createElement("div"); wrap.style.position = "relative";
  const tip = document.createElement("div"); tip.className = "ic-tip"; tip.setAttribute("aria-hidden", "true");
  const say = document.createElement("span"); say.className = "sr"; say.setAttribute("aria-live", "polite");
  plot.append(ctrl, wrap, say);
  const tbl = document.createElement("details"); tbl.className = "ic-table";
  plot.appendChild(tbl);
  let svg, dates = [], X, Y, idx = -1;
  function draw() {
    const W = Math.max(280, wrap.clientWidth || plot.clientWidth || 600), H = Math.max(180, (plot.clientHeight || 260) - 70);
    const cut = range === "All" ? -Infinity : t1 - ranges.find(r => r[0] === range)[1] * 864e5;
    const vis = series.filter(s => s.on).map(s => ({ ...s, pts: s.points.filter(p => Date.parse(p[0]) >= cut) }));
    dates = [...new Set(vis.flatMap(s => s.pts.map(p => p[0])))].sort();
    const vals = vis.flatMap(s => s.pts.map(p => p[1])); let lo = Math.min(...vals), hi = Math.max(...vals);
    if (spec.unit === "%" && lo > 0 && lo < hi * 0.25) lo = 0; const pad = (hi - lo) * 0.08 || 1; lo -= pad; hi += pad;
    const m = { l: 44, r: 12, t: 12, b: 24 }, a = Date.parse(dates[0]), z = Date.parse(dates[dates.length - 1]) || a + 1;
    X = d => m.l + (Date.parse(d) - a) / (z - a || 1) * (W - m.l - m.r); Y = v => m.t + (hi - v) / (hi - lo) * (H - m.t - m.b);
    wrap.innerHTML = ""; wrap.appendChild(tip);
    svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "ic-svg", tabindex: "0", role: "application", "aria-label": `${spec.title}. Interactive chart. Use left and right arrow keys to read values.` }, wrap);
    const g = el("g", { class: "grid" }, svg), step = niceStep((hi - lo) / 5);
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { el("line", { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, g); el("text", { x: m.l - 6, y: Y(v) + 4, "text-anchor": "end" }, g).textContent = fmtV(v, step < 1 ? 1 : 0); }
    const months = dates.filter((d, i) => i === 0 || d.slice(0, 7) !== dates[i - 1].slice(0, 7)), every = Math.ceil(months.length / Math.max(2, Math.floor((W - 60) / 70)));
    months.forEach((d, i) => { if (i % every) return; const t = el("text", { x: X(d), y: H - 6, "text-anchor": "middle" }, svg); t.textContent = new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { month: "short", year: d.slice(5, 7) === "01" || i === 0 ? "numeric" : undefined, timeZone: "UTC" }); });
    const ann = el("g", { class: "ann" }, svg);
    (spec.annotations || []).forEach(n => { if (n.date < dates[0] || n.date > dates[dates.length - 1]) return; el("line", { x1: X(n.date), x2: X(n.date), y1: m.t, y2: H - m.b }, ann); el("text", { x: X(n.date) + 4, y: m.t + 10 }, ann).textContent = n.text; });
    vis.forEach(s => {
      let dstr = ""; s.pts.forEach((p, i) => { const x = X(p[0]).toFixed(1), y = Y(p[1]).toFixed(1); if (!i) dstr += `M${x},${y}`; else dstr += spec.step ? `H${x}V${y}` : `L${x},${y}`; });
      el("path", { d: dstr, fill: "none", stroke: cssv(s.cv), "stroke-width": 2.2, "stroke-linejoin": "round" }, svg);
      const lp = s.pts[s.pts.length - 1]; if (lp) el("circle", { cx: X(lp[0]), cy: Y(lp[1]), r: 3.2, fill: cssv(s.cv) }, svg);
    });
    const xh = el("line", { class: "xh", y1: m.t, y2: H - m.b, x1: 0, x2: 0, visibility: "hidden" }, svg), dots = vis.map(s => el("circle", { r: 4.5, fill: cssv(s.cv), stroke: cssv("--paper"), "stroke-width": 2, cx: 0, cy: 0, visibility: "hidden" }, svg));
    function at(i) {
      idx = Math.max(0, Math.min(dates.length - 1, i)); const d = dates[idx]; xh.removeAttribute("visibility"); dots.forEach(c => c.removeAttribute("visibility")); xh.setAttribute("x1", X(d)); xh.setAttribute("x2", X(d));
      const rows = vis.map((s, j) => { const p = nearest(s.pts, d); if (p) { dots[j].setAttribute("cx", X(p[0])); dots[j].setAttribute("cy", Y(p[1])); } return p ? { s, v: p[1] } : null; }).filter(Boolean);
      tip.innerHTML = `<b>${fmtD(d)}</b><br>` + rows.map(r => `<i style="background:${cssv(r.s.cv)}"></i>${esc(r.s.label)}: <b>${fmtV(r.v, spec.decimals)}${spec.unit}</b>`).join("<br>");
      const k = wrap.offsetWidth / W, tx = X(d) * k, ty = Math.min(...rows.map(r => Y(r.v))) * k;
      tip.style.left = Math.max(70, Math.min(wrap.offsetWidth - 70, tx)) + "px"; tip.style.top = Math.max(60, ty) + "px";
      tip.classList.add("on"); say.textContent = `${fmtD(d)}: ` + rows.map(r => `${r.s.label} ${fmtV(r.v, spec.decimals)}${spec.unit}`).join("; ");
    }
    const hide = () => { tip.classList.remove("on"); xh.setAttribute("visibility", "hidden"); dots.forEach(c => c.setAttribute("visibility", "hidden")); };
    const fromEvt = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); let best = 0, bd = Infinity; dates.forEach((d, i) => { const dd = Math.abs(X(d) - q.x); if (dd < bd) { bd = dd; best = i; } }); return best; };
    svg.addEventListener("pointermove", e => at(fromEvt(e))); svg.addEventListener("pointerdown", e => { e.stopPropagation(); at(fromEvt(e)); });
    svg.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") hide(); });
    svg.addEventListener("keydown", e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); at((idx < 0 ? dates.length : idx) + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 10 : 1)); } else if (e.key === "End") at(dates.length - 1); else if (e.key === "Home") at(0); else if (e.key === "Escape") hide(); });
    svg.addEventListener("blur", hide);
    const last = dates.slice(-8);
    tbl.innerHTML = `<summary>Data table (latest values)</summary><table><thead><tr><th scope="col">Date</th>${vis.map(s => `<th scope="col">${esc(s.label)}</th>`).join("")}</tr></thead><tbody>${last.map(d => `<tr><td>${d}</td>${vis.map(s => { const p = s.pts.find(x => x[0] === d); return `<td>${p ? fmtV(p[1], spec.decimals) : "–"}</td>`; }).join("")}</tr>`).join("")}</tbody></table><p class="faint">Full series: <a href="${spec.csv}">CSV</a></p>`;
  }
  fig._chart = { draw }; draw();
}
const nearest = (pts, d) => { let r = null; for (const p of pts) { if (p[0] <= d) r = p; else break; } return r; };
const niceStep = r => { const p = Math.pow(10, Math.floor(Math.log10(r))), f = r / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; };
const fmtV = (v, dec = 1) => v.toLocaleString("en-GB", { minimumFractionDigits: dec, maximumFractionDigits: dec });
function drawVisibleCharts() { if (!ED) return; $$(".page.on .ichart").forEach(f => f._chart ? f._chart.draw() : initChart(f)); }

/* ---------- boot */
fetch("edition.json").then(r => r.json()).then(j => {
  ED = j; buildViews();
  if (PRINT) { pages.forEach(p => { p.classList.add("on"); p.inert = false; }); stage.style.transform = "none"; pages.forEach(p => p.querySelectorAll(".ichart").forEach(initChart)); window.__ready = true; return; }
  if (SOLO) { single = true; buildViews(); show(SOLO - 1); zoom = 1; stage.style.transform = "none"; sizer.style.margin = "0"; window.__ready = true; return; }
  const h = H0, mp = h.match(/(?:p=|page-)(\d+)/), ma = h.match(/a=([\w-]+)/);
  show(mp ? viewOf(+mp[1] - 1) : 0);
  if (ma) openArticle(ma[1]);
  window.__ready = true;
});
buildViews(); { const m0 = H0.match(/(?:p=|page-)(\d+)/); show(m0 ? viewOf(+m0[1] - 1) : 0); }
/* ---------- offline: service worker scoped to insidedesk/epaper/ only; caches this issue after the first visit */
const ROOT = document.body.dataset.root || "./";
if ("serviceWorker" in navigator && !SOLO && !PRINT) {
  navigator.serviceWorker.register(ROOT + "sw.js", { scope: ROOT }).then(() => navigator.serviceWorker.ready).then(reg => {
    const here = new URL(".", location.href).href, urls = [here, here + "index.html", here + "edition.json", here + $("#b-pdf").getAttribute("href"),
      ...$$(".th img").map(i => i.src), ...$$("img.ic-static").map(i => i.src), ...$$('link[rel="stylesheet"],link[rel="preload"]').map(l => l.href), ...$$("script[src]").map(s => s.src)];
    (reg.active || navigator.serviceWorker.controller)?.postMessage({ type: "cache-issue", urls });
  }).catch(() => {});
}
/* ---------- evening ePaper: look for updates until 22:30 Berlin time */
const UNTIL = Date.parse(document.body.dataset.until || "");
if (UNTIL && !SOLO && !PRINT) {
  const poll = () => {
    if (Date.now() > UNTIL || document.hidden) return;
    fetch("edition.json", { cache: "no-store" }).then(r => r.json()).then(j => {
      if (ED && j.updated && j.updated !== ED.updated) {
        const t = new Date(j.updated).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
        $("#upd-text").textContent = `Updated ${t}: ${(j.updates[0] || {}).text || "new material in this issue."}`; $("#upd-banner").hidden = false;
      }
    }).catch(() => {});
  };
  setInterval(poll, 5 * 60 * 1000); document.addEventListener("visibilitychange", poll);
  $("#upd-reload").addEventListener("click", () => location.reload());
}
})();
