/* Inside Desk ePaper: interactive horizontal bar charts (kind: hbar). Loaded only by issues that contain one.
   Reads the "bars" block of edition.json; hover, tap or arrow keys show each value. No library. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const el = (n, a = {}, p) => { const x = document.createElementNS(NS, n); for (const k in a) x.setAttribute(k, a[k]); p && p.appendChild(x); return x; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const fmt = (v, d) => v.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
  const st = document.createElement("style");
  st.textContent = ".ib-svg{display:block;width:100%;height:auto;outline:none}.ib-svg:focus-visible{outline:2px solid var(--acc)}" +
    ".ib-svg text{font:500 13px var(--sans);fill:var(--ink)}.ib-svg .v{font:600 13px var(--mono)}.ib-svg .ax{font:500 11px var(--mono);fill:var(--ink3)}" +
    ".ib-svg .g{stroke:var(--rule)}.ib-svg .bar{cursor:pointer;transition:opacity .1s}.ib-svg.hov .bar{opacity:.45}.ib-svg.hov .bar.on{opacity:1}" +
    ".ib-key{margin:4px 0 0;font:500 11.5px var(--sans);color:var(--ink3)}";
  document.head.appendChild(st);
  function init(fig, spec) {
    if (fig._bars) return; fig._bars = true;
    const plot = fig.querySelector(".ic-plot"); if (!plot) return; plot.innerHTML = "";
    const rows = spec.rows, dec = rows.some(r => r.value % 1) ? 1 : 0, unit = spec.unit || "";
    const W = 640, rh = 46, top = 8, H = top + rows.length * rh + 24, x0 = 8, x1 = W - 90;
    const vmax = Math.max(...rows.map(r => r.value)) * 1.05 || 1;
    const X = v => x0 + v / vmax * (x1 - x0);
    const wrap = document.createElement("div"); wrap.style.position = "relative";
    const tip = document.createElement("div"); tip.className = "ic-tip"; tip.setAttribute("aria-hidden", "true");
    const say = document.createElement("span"); say.className = "sr"; say.setAttribute("aria-live", "polite");
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "ib-svg", tabindex: "0", role: "application",
      "aria-label": `${spec.title}. Interactive bar chart. Use up and down arrow keys to read values.` });
    const uid = "ib-" + spec.id, defs = el("defs", {}, svg), pat = el("pattern", { id: uid + "-h", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("line", { x1: 0, y1: 0, x2: 0, y2: 6, style: "stroke:var(--acc);stroke-width:2.2" }, pat);
    const raw = vmax / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag, step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
    for (let v = 0; v <= vmax; v += step) { const x = X(v); el("line", { class: "g", x1: x, x2: x, y1: top, y2: H - 22 }, svg); el("text", { class: "ax", x, y: H - 6, "text-anchor": "middle" }, svg).textContent = fmt(v, step < 1 ? 1 : 0); }
    const bars = rows.map((r, i) => {
      const y = top + i * rh, g = el("g", { class: "bar" }, svg);
      el("text", { x: x0, y: y + 13 }, g).textContent = r.label + (r.derived ? " ✱" : "");
      el("rect", { x: x0, y: y + 19, width: Math.max(1, X(r.value) - x0), height: 18, rx: 2,
        style: r.derived ? `fill:url(#${uid}-h);stroke:var(--acc);stroke-width:1.2` : `fill:var(--c${(i % 4) + 1})` }, g);
      el("text", { class: "v", x: X(r.value) + 8, y: y + 33 }, g).textContent = fmt(r.value, dec) + unit;
      el("rect", { x: 0, y, width: W, height: rh, fill: "transparent" }, g);
      return g;
    });
    let cur = -1;
    function at(i) {
      cur = Math.max(0, Math.min(rows.length - 1, i)); const r = rows[cur];
      svg.classList.add("hov"); bars.forEach((b, j) => b.classList.toggle("on", j === cur));
      tip.innerHTML = `<b>${esc(fmt(r.value, dec) + unit)}</b> · ${esc(r.label)}` + (r.note ? `<br>${esc(r.note)}` : "") + (r.derived ? "<br>Inside Desk arithmetic" : "");
      const k = wrap.offsetWidth / W; tip.style.left = Math.max(90, Math.min(wrap.offsetWidth - 90, X(r.value) * k)) + "px"; tip.style.top = Math.max(50, (top + cur * rh + 19) * k) + "px";
      tip.classList.add("on"); say.textContent = `${r.label}: ${fmt(r.value, dec)}${unit}` + (r.derived ? ", Inside Desk arithmetic" : "");
    }
    const hide = () => { cur = -1; svg.classList.remove("hov"); bars.forEach(b => b.classList.remove("on")); tip.classList.remove("on"); };
    bars.forEach((b, i) => { b.addEventListener("pointerenter", () => at(i)); b.addEventListener("pointerdown", e => { e.stopPropagation(); at(i); }); });
    svg.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") hide(); });
    svg.addEventListener("keydown", e => { if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); at(cur < 0 ? 0 : cur + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1)); } else if (e.key === "Escape") hide(); });
    svg.addEventListener("blur", hide);
    wrap.append(tip, svg); plot.append(wrap, say);
    if (rows.some(r => r.derived)) plot.insertAdjacentHTML("beforeend", '<p class="ib-key">✱ Hatched bars are Inside Desk arithmetic.</p>');
    const tbl = document.createElement("details"); tbl.className = "ic-table";
    tbl.innerHTML = `<summary>Data table</summary><table><thead><tr><th scope="col">Item</th><th scope="col">Value</th><th scope="col">Note</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.label)}${r.derived ? " (Inside Desk arithmetic)" : ""}</td><td>${esc(fmt(r.value, dec) + unit)}</td><td>${esc(r.note || "")}</td></tr>`).join("")}</tbody></table><p class="faint">Data: <a href="${esc(spec.csv)}">CSV</a></p>`;
    plot.appendChild(tbl);
  }
  fetch("edition.json").then(r => r.json()).then(j => {
    const B = j.bars || {};
    const run = () => document.querySelectorAll("figure.ichart[data-chart]").forEach(f => { const s = B[f.dataset.chart]; if (s) init(f, s); });
    let q = 0; run(); new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; run(); }); }).observe(document.body, { childList: true, subtree: true });
  }).catch(() => {});
})();
