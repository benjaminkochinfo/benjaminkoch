/**
 * Terminal charts — black field, blue mountain, white line, orange last badge.
 * Pop-out window: style (mountain / line / candles) + date range.
 * No vendor branding on chart chrome.
 */

const Charts = (() => {
  const history = {}; // sym -> number[]
  const MAX = 120;

  function seedSeries(sym, seed, dirHint) {
    if (history[sym]?.length >= 8) return history[sym];
    let v = Number(seed) || 100;
    const arr = [];
    let drift = dirHint === "up" ? 0.001 : dirHint === "down" ? -0.001 : 0;
    for (let i = 0; i < MAX; i++) {
      drift += (Math.random() - 0.5) * 0.00055;
      v = Math.max(0.01, v * (1 + drift + (Math.random() - 0.5) * 0.0055));
      arr.push(v);
    }
    history[sym] = arr;
    return arr;
  }

  function push(sym, value) {
    const n = parseFloat(String(value).replace(/[,%]/g, ""));
    if (!Number.isFinite(n)) return;
    if (!history[sym]) history[sym] = [];
    const h = history[sym];
    const last = h[h.length - 1];
    if (last == null || Math.abs(last - n) > 1e-12) {
      h.push(n);
      if (h.length > MAX) h.shift();
    }
  }

  function replaceSeries(sym, values) {
    if (!sym || !Array.isArray(values)) return;
    const clean = values
      .map((v) => parseFloat(String(v).replace(/[,%]/g, "")))
      .filter((n) => Number.isFinite(n));
    if (clean.length < 2) return;
    history[sym] = clean.slice(-MAX);
  }

  function ensureFromMarket(m) {
    if (!m) return [];
    const seed = parseFloat(String(m.val).replace(/[,%]/g, "")) || 100;
    if (history[m.sym]?.length >= 4) {
      const h = history[m.sym];
      h[h.length - 1] = seed;
      return h;
    }
    const series = seedSeries(m.sym, seed, m.dir);
    if (series.length) series[series.length - 1] = seed;
    return series;
  }

  function densify(series, minBars = 48) {
    if (!series || series.length < 2) return series || [];
    if (series.length >= minBars) return series;
    const out = [];
    for (let i = 0; i < series.length - 1; i++) {
      const a = series[i];
      const b = series[i + 1];
      out.push(a);
      const steps = Math.max(1, Math.ceil(minBars / (series.length - 1)) - 1);
      const p0 = i > 0 ? series[i - 1] : a;
      const p3 = i + 2 < series.length ? series[i + 2] : b;
      for (let s = 1; s <= steps; s++) {
        const t = s / (steps + 1);
        const t2 = t * t;
        const t3 = t2 * t;
        // Catmull-Rom — smooth, no random noise
        const v =
          0.5 *
          (2 * a +
            (-p0 + b) * t +
            (2 * p0 - 5 * a + 4 * b - p3) * t2 +
            (-p0 + 3 * a - 3 * b + p3) * t3);
        out.push(v);
      }
    }
    out.push(series[series.length - 1]);
    return out;
  }

  function sliceRange(series, range) {
    if (!series?.length) return [];
    const map = { "1d": 12, "5d": 24, "1mo": 40, "3mo": 64, "6mo": 90, "1y": 120, all: series.length };
    const n = map[range] || series.length;
    return series.slice(-Math.min(n, series.length));
  }

  function niceTicks(min, max, approx = 5) {
    const span = max - min;
    if (!(span > 0)) return [min];
    const step0 = Math.pow(10, Math.floor(Math.log10(span / approx)));
    const err = (approx * step0) / span;
    const mult = err <= 0.15 ? 10 : err <= 0.35 ? 5 : err <= 0.75 ? 2 : 1;
    const nice = mult * step0;
    const start = Math.ceil(min / nice) * nice;
    const end = Math.floor(max / nice) * nice;
    const ticks = [];
    for (let v = start; v <= end + 1e-12; v += nice) ticks.push(+v.toFixed(10));
    return ticks.length ? ticks : [min, max];
  }

  function decimalsFor(series) {
    const last = series[series.length - 1];
    if (!Number.isFinite(last)) return 2;
    if (Math.abs(last) >= 1000) return 1;
    if (Math.abs(last) >= 50) return 2;
    if (Math.abs(last) >= 1) return 3;
    return 4;
  }

  function fmt(v, dec) {
    if (!Number.isFinite(v)) return "—";
    return v.toFixed(dec);
  }

  function mountain(series, opts = {}) {
    const w = opts.w || 320;
    const h = opts.h || 72;
    const style = opts.style || "mountain"; // mountain | line | candles
    const compact = opts.compact !== false && h < 100;
    const showAxis = opts.axis !== false && w >= 140 && h >= 44;
    const padL = showAxis ? (compact ? 4 : 6) : 4;
    const padR = showAxis ? (compact ? 46 : 56) : 4;
    const padT = compact ? 6 : 10;
    const padB = showAxis && !compact ? 18 : 6;
    const dec = opts.decimals != null ? opts.decimals : decimalsFor(series || []);

    if (!series?.length) {
      return `<svg class="bb-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img">
        <rect width="${w}" height="${h}" fill="#0a0a0a"/>
        <text x="${w / 2}" y="${h / 2}" text-anchor="middle" fill="#555"
          font-size="11" font-family="Consolas,IBM Plex Mono,monospace">NO DATA</text>
      </svg>`;
    }

    const data = densify(series, Math.min(80, Math.max(24, Math.floor(w / 4))));
    let minY = Math.min(...data);
    let maxY = Math.max(...data);
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }
    const padY = (maxY - minY) * 0.06;
    minY -= padY;
    maxY += padY;
    const span = maxY - minY || 1;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const X = (i) => padL + (i / (data.length - 1 || 1)) * plotW;
    const Y = (v) => padT + plotH - ((v - minY) / span) * plotH;

    const pts = data.map((v, i) => [X(i), Y(v)]);
    let lineD = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    if (pts.length < 3) {
      for (let i = 1; i < pts.length; i++) lineD += ` L${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)}`;
    } else {
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const c1x = p1[0] + (p2[0] - p0[0]) / 6;
        const c1y = p1[1] + (p2[1] - p0[1]) / 6;
        const c2x = p2[0] - (p3[0] - p1[0]) / 6;
        const c2y = p2[1] - (p3[1] - p1[1]) / 6;
        lineD += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
      }
    }
    const last = pts[pts.length - 1];
    const lastVal = data[data.length - 1];
    const areaD =
      lineD +
      ` L${last[0].toFixed(2)},${(padT + plotH).toFixed(2)} L${pts[0][0].toFixed(2)},${(padT + plotH).toFixed(2)} Z`;
    const gid = "bbg" + Math.random().toString(36).slice(2, 9);
    const ticks = niceTicks(minY, maxY, compact ? 4 : 6);

    let grid = "";
    let axis = "";
    ticks.forEach((v) => {
      const y = Y(v);
      grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL + plotW).toFixed(
        1
      )}" y2="${y.toFixed(1)}" stroke="#1a1a1a" stroke-width="1"/>`;
      if (showAxis) {
        axis += `<text x="${(padL + plotW + 5).toFixed(1)}" y="${(y + 3).toFixed(
          1
        )}" fill="#888" font-size="${compact ? 9 : 10}" font-family="Consolas,IBM Plex Mono,monospace">${fmt(
          v,
          dec
        )}</text>`;
      }
    });

    if (showAxis && !compact) {
      const nLab = Math.min(5, Math.max(3, Math.floor(plotW / 70)));
      for (let i = 0; i <= nLab; i++) {
        const idx = Math.round((i / nLab) * (data.length - 1));
        const x = X(idx);
        const label = i === nLab ? "NOW" : i === 0 ? "START" : "";
        if (label) {
          axis += `<text x="${x.toFixed(1)}" y="${(h - 4).toFixed(
            1
          )}" text-anchor="middle" fill="#666" font-size="9" font-family="Consolas,IBM Plex Mono,monospace">${label}</text>`;
        }
      }
    }

    let seriesPaths = "";
    if (style === "candles") {
      const bw = Math.max(2, (plotW / Math.max(1, data.length)) * 0.55);
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        const prev = i ? data[i - 1] : v;
        const o = prev;
        const c = v;
        const hi = Math.max(o, c) * (1 + 0.0015);
        const lo = Math.min(o, c) * (1 - 0.0015);
        const x = X(i);
        const up = c >= o;
        seriesPaths += `<line x1="${x.toFixed(1)}" y1="${Y(hi).toFixed(1)}" x2="${x.toFixed(1)}" y2="${Y(lo).toFixed(
          1
        )}" stroke="#666" stroke-width="1"/>`;
        const top = Y(Math.max(o, c));
        const bot = Y(Math.min(o, c));
        seriesPaths += `<rect x="${(x - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(
          1
        )}" height="${Math.max(1, bot - top).toFixed(1)}" fill="${up ? "#00c853" : "#ff4d4d"}"/>`;
      }
    } else if (style === "line") {
      seriesPaths = `<path d="${lineD}" fill="none" stroke="#ffffff" stroke-width="${
        opts.lineW || 1.4
      }" stroke-linejoin="round" stroke-linecap="round"/>`;
    } else {
      seriesPaths = `<defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(25,70,140,0.72)"/>
          <stop offset="35%" stop-color="rgba(15,45,95,0.55)"/>
          <stop offset="75%" stop-color="rgba(10,30,60,0.28)"/>
          <stop offset="100%" stop-color="rgba(8,16,28,0.04)"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#${gid})"/>
      <path d="${lineD}" fill="none" stroke="#ffffff" stroke-width="${
        opts.lineW || (compact ? 1.25 : 1.4)
      }" stroke-linejoin="round" stroke-linecap="round"/>`;
    }

    const ly = last[1];
    const badge = fmt(lastVal, dec);
    const badgeW = Math.max(36, badge.length * 6.5 + 10);
    const badgeH = 14;
    const bx = padL + plotW - badgeW;
    const by = Math.max(padT, Math.min(padT + plotH - badgeH, ly - badgeH / 2));

    return `<svg class="bb-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img">
      <rect width="${w}" height="${h}" fill="#0a0a0a"/>
      ${grid}
      ${seriesPaths}
      <line x1="${padL}" y1="${ly.toFixed(2)}" x2="${(padL + plotW).toFixed(
      2
    )}" y2="${ly.toFixed(2)}" stroke="rgba(255,153,0,0.85)" stroke-width="1" stroke-dasharray="4 4"/>
      <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${badgeW}" height="${badgeH}" rx="2" fill="#ff9900"/>
      <text x="${(bx + badgeW / 2).toFixed(1)}" y="${(by + 10).toFixed(
      1
    )}" text-anchor="middle" fill="#0a0a0a" font-size="${
      compact ? 9 : 10
    }" font-weight="700" font-family="Consolas,IBM Plex Mono,monospace">${badge}</text>
      ${axis}
    </svg>`;
  }

  function multiMountain(seriesList, opts = {}) {
    const w = opts.w || 400;
    const h = opts.h || 100;
    const primary = seriesList?.[0]?.data || [];
    return mountain(primary, { ...opts, w, h });
  }

  function sparkHtml(m, h = 36) {
    const s = ensureFromMarket(m);
    return mountain(s, { w: 140, h, lineW: 1.2, axis: h >= 48, compact: true });
  }

  function boardCard(m, opts = {}) {
    if (!m) return "";
    const s = ensureFromMarket(m);
    const up = m.dir === "up";
    const down = m.dir === "down";
    const chgClass = up ? "up" : down ? "down" : "flat";
    const chartH = opts.chartH || 72;
    return `<div class="bb-board-card ${opts.focused ? "focused" : ""}" data-sym="${m.sym}">
      <div class="bb-ptitle">
        <span class="bb-ptitle-main">${m.sym}</span>
        <span class="bb-ptitle-sub">${m.name || m.sym}</span>
        <button type="button" class="bb-pop" data-pop="${m.sym}" title="Open chart window">↗</button>
      </div>
      <div class="bb-body-p">
        <div class="bb-board-top">
          <div class="bb-px-row">
            <span class="bb-val">${m.val}</span>
            <span class="bb-chg ${chgClass}">${m.chg}</span>
          </div>
          <span class="bb-unit">${m.unit || m.cls || ""}</span>
        </div>
        <div class="bb-chart-host">${mountain(s, {
          w: 320,
          h: chartH,
          lineW: 1.35,
          axis: true,
          compact: chartH < 90,
        })}</div>
      </div>
    </div>`;
  }

  function heroChart(m, title) {
    if (!m) return `<div class="bb-hero empty">Select an instrument</div>`;
    const s = ensureFromMarket(m);
    const chgClass = m.dir === "up" ? "up" : m.dir === "down" ? "down" : "flat";
    const dens = densify(s, 64);
    const hi = Math.max(...dens);
    const lo = Math.min(...dens);
    const last = dens[dens.length - 1];
    const dec = decimalsFor(dens);
    return `<div class="bb-hero" data-sym="${m.sym}">
      <div class="bb-ptitle">
        <span class="bb-ptitle-main">${title || m.sym}</span>
        <span class="bb-ptitle-sub">${m.name || ""}</span>
        <button type="button" class="bb-pop" data-pop="${m.sym}" title="Open chart window">↗ POP-OUT</button>
      </div>
      <div class="bb-body-p">
        <div class="bb-hero-head">
          <div class="bb-hero-px">
            <span class="bb-val xl">${m.val}</span>
            <span class="bb-chg ${chgClass}">${m.chg}</span>
          </div>
          <div class="bb-hero-stats">
            <span><em>LAST</em>${fmt(last, dec)}</span>
            <span><em>HIGH</em>${fmt(hi, dec)}</span>
            <span><em>LOW</em>${fmt(lo, dec)}</span>
            <span><em>PTS</em>${dens.length}</span>
          </div>
        </div>
        <div class="bb-hero-chart">${mountain(s, {
          w: 720,
          h: 168,
          lineW: 1.4,
          axis: true,
          compact: false,
        })}</div>
      </div>
    </div>`;
  }


  /**
   * Professional pop-out chart (dark OHLC header, range tabs, blue mountain area).
   */
  /**
   * Pop-out chart — same engine as Anywhere terminal (ProChart canvas).
   * Full-window GP-style view: OHLC, ranges, style toggle, crosshair.
   */
  /**
   * Reliable GP-style pop-out: pure canvas (no eval / base64).
   * Looks like Anywhere: OHLC header, ranges, mountain/line/candles, crosshair.
   */
  /**
   * GP pop-out chart — precise range windows + Anywhere-style crosshair.
   */
  function openPopout(m, opts = {}) {
    if (!m?.sym) return null;
    const series = ensureFromMarket(m).slice();
    const live = parseFloat(String(m.val).replace(/[,%]/g, ""));
    if (Number.isFinite(live) && series.length) series[series.length - 1] = live;
    if (series.length < 2) {
      try {
        UI?.toast?.("Not enough chart data yet");
      } catch {
        /* */
      }
      return null;
    }
    const payload = {
      sym: m.sym,
      name: m.name || m.sym,
      val: m.val,
      chg: m.chg,
      dir: m.dir,
      unit: m.unit || m.cls || "",
      series: series.map(Number).filter((n) => Number.isFinite(n)),
      style: opts.style || "mountain",
      range: opts.range || "3mo",
      decimals: decimalsFor(series),
      openedAt: Date.now(),
    };
    if (payload.series.length < 2) return null;

    const win = window.open(
      "",
      "wmt_chart_" + String(m.sym).replace(/[^a-zA-Z0-9_]/g, "_"),
      "width=1120,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes"
    );
    if (!win) {
      try {
        UI?.toast?.("Pop-out blocked — allow pop-ups for this site");
      } catch {
        /* */
      }
      return null;
    }

    const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${payload.sym} · Chart</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden;background:#0a0a0a;color:#e8e8e8;font:12px/1.35 Consolas,"Lucida Console",monospace}
#fs{position:fixed;inset:0;display:flex;flex-direction:column;background:#0a0a0a}
.fs-close{position:absolute;top:10px;right:12px;z-index:3;background:#1a1a1a;border:1px solid #444;color:#ccc;width:32px;height:28px;font-size:16px;cursor:pointer}
.fs-close:hover{border-color:#ffaa00;color:#ffaa00}
.fs-top{flex-shrink:0;padding:10px 14px 6px;border-bottom:1px solid #1a1a1a;background:linear-gradient(180deg,#121212,#0a0a0a)}
.fs-title-row{display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap}
.fs-sec-name{font-size:15px;font-weight:800;color:#fff;letter-spacing:.02em}
.fs-sec-sub{font-size:11px;color:#888;text-transform:uppercase;margin-top:1px}
.fs-price-block{display:flex;align-items:baseline;gap:12px;margin-top:6px;flex-wrap:wrap}
.fs-last{font-size:28px;font-weight:700;color:#fff}
.fs-last .ccy{font-size:13px;color:#888;margin-left:4px;font-weight:600}
.fs-chg{font-size:16px;font-weight:700}
.fs-chg.up{color:#00c853}.fs-chg.dn{color:#ff4d4d}.fs-chg.flat{color:#ffaa00}
.fs-ohlc{margin-left:auto;display:grid;grid-template-columns:repeat(4,auto);gap:4px 18px;font-size:12px;color:#aaa;align-content:start}
.fs-ohlc b{color:#e8e8e8;font-weight:600;margin-left:6px}
.fs-ohlc .tm{grid-column:1/-1;color:#666;font-size:11px;text-align:right}
.fs-chart-label{padding:8px 14px 0;color:#ff9900;font-size:12px;font-weight:700}
.fs-chart-label .dim{color:#666;font-weight:500;font-size:11px;margin-left:8px}
.fs-toolbar{display:flex;align-items:center;gap:0;padding:6px 10px 0;flex-wrap:wrap;border-bottom:1px solid #1a1a1a}
.fs-range{background:transparent;border:0;border-bottom:2px solid transparent;color:#888;padding:8px 12px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:.04em}
.fs-range:hover{color:#ccc}.fs-range.on{color:#ff9900;border-bottom-color:#ff9900}
.fs-tools{margin-left:auto;display:flex;gap:6px;padding-right:8px}
.fs-tools button{background:#161616;border:1px solid #333;color:#bbb;padding:5px 10px;font:inherit;font-size:11px;cursor:pointer}
.fs-tools button:hover{border-color:#ffaa00;color:#ffaa00}
.fs-body{flex:1 1 auto;min-height:160px;position:relative;background:#0a0a0a}
.fs-body canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block;cursor:crosshair;background:#0a0a0a}
.fs-foot{flex-shrink:0;height:22px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;font-size:10px;color:#555;border-top:1px solid #1a1a1a;background:#050505}
</style>
</head><body>
<div id="fs">
  <button type="button" class="fs-close" id="btnClose" title="Close">×</button>
  <div class="fs-top">
    <div class="fs-title-row">
      <div>
        <div class="fs-sec-name" id="fsName"></div>
        <div class="fs-sec-sub" id="fsSub"></div>
        <div class="fs-price-block">
          <div class="fs-last" id="fsLast"></div>
          <div class="fs-chg" id="fsChg"></div>
        </div>
      </div>
      <div class="fs-ohlc">
        <div class="tm" id="fsTime"></div>
        <div>Open <b id="fsO">—</b></div>
        <div>Close <b id="fsC">—</b></div>
        <div>High <b id="fsH">—</b></div>
        <div>Low <b id="fsL">—</b></div>
      </div>
    </div>
  </div>
  <div class="fs-chart-label">Price Chart <span class="dim" id="fsPeriodLabel">3MO</span></div>
  <div class="fs-toolbar" id="fsToolbar"></div>
  <div class="fs-body"><canvas id="fsCanvas"></canvas></div>
  <div class="fs-foot"><span id="fsSrc">—</span><span>ESC close · crosshair for point detail</span></div>
</div>
<script>
const P = ${JSON.stringify(payload).replace(/</g, "\\u003c")};
const STYLES = ["mountain", "line", "candles"];
const RANGES = [
  { id: "1d", label: "1D", frac: 0.06, min: 10, max: 28 },
  { id: "5d", label: "5D", frac: 0.14, min: 16, max: 48 },
  { id: "1mo", label: "1M", frac: 0.28, min: 24, max: 72 },
  { id: "3mo", label: "3M", frac: 0.42, min: 32, max: 100 },
  { id: "6mo", label: "6M", frac: 0.58, min: 40, max: 130 },
  { id: "ytd", label: "YTD", frac: 0.5, min: 36, max: 120 },
  { id: "1y", label: "1Y", frac: 0.78, min: 48, max: 160 },
  { id: "5y", label: "5Y", frac: 1, min: 60, max: 220 },
];
let style = P.style || "mountain";
let range = P.range || "3mo";
let cross = -1;
let cache = { key: "", data: [], times: [] };
const PAD = { l: 14, r: 62, t: 16, b: 34 };

function $(id) { return document.getElementById(id); }
function fmt(v, d) { return Number.isFinite(v) ? Number(v).toFixed(d) : "—"; }
function dec() { return P.decimals != null ? P.decimals : 2; }

function rangeSpec() {
  return RANGES.find((r) => r.id === range) || RANGES[3];
}

/** Exact window of source bars for the selected range */
function sliceSource() {
  const src = P.series || [];
  const n0 = src.length;
  if (n0 < 2) return src.slice();
  const spec = rangeSpec();
  let n = Math.round(n0 * spec.frac);
  n = Math.max(spec.min, Math.min(spec.max, n, n0));
  n = Math.max(2, Math.min(n0, n));
  return src.slice(-n);
}

/** Smooth only when sparse — keep endpoints exact so range switches look precise */
function densify(vals, target) {
  if (!vals || vals.length < 2) return vals || [];
  if (vals.length >= target) return vals.slice();
  const out = [];
  for (let i = 0; i < vals.length - 1; i++) {
    const a = vals[i];
    const b = vals[i + 1];
    out.push(a);
    const steps = Math.max(1, Math.ceil(target / (vals.length - 1)) - 1);
    const p0 = i > 0 ? vals[i - 1] : a;
    const p3 = i + 2 < vals.length ? vals[i + 2] : b;
    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1);
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        0.5 *
          (2 * a +
            (-p0 + b) * t +
            (2 * p0 - 5 * a + 4 * b - p3) * t2 +
            (-p0 + 3 * a - 3 * b + p3) * t3)
      );
    }
  }
  out.push(vals[vals.length - 1]);
  return out;
}

function buildTimes(count) {
  const now = P.openedAt || Date.now();
  const days =
    range === "1d" ? 1 : range === "5d" ? 5 : range === "1mo" ? 31 : range === "3mo" ? 93 : range === "6mo" ? 186 : range === "ytd" ? 200 : range === "1y" ? 365 : 365 * 3;
  const step = (days * 86400000) / Math.max(1, count - 1);
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(new Date(now - (count - 1 - i) * step));
  return arr;
}

function getView() {
  const key = range + "|" + style + "|" + (P.series && P.series.length);
  if (cache.key === key && cache.data.length) return cache;
  let raw = sliceSource();
  const live = parseFloat(String(P.val).replace(/[,%]/g, ""));
  if (Number.isFinite(live) && raw.length) raw[raw.length - 1] = live;
  // densify for smooth path, but scale target to range so 5D ≠ 3M look
  const spec = rangeSpec();
  const target = Math.min(spec.max * 2, Math.max(spec.min * 2, Math.floor((window.innerWidth || 1000) / 4)));
  const data = densify(raw, target);
  // re-pin last
  if (Number.isFinite(live) && data.length) data[data.length - 1] = live;
  const times = buildTimes(data.length);
  cache = { key, data, times, raw };
  return cache;
}

function niceTicks(min, max, approx) {
  const span = max - min;
  if (!(span > 0)) return [min];
  const step0 = Math.pow(10, Math.floor(Math.log10(span / approx)));
  const err = (approx * step0) / span;
  const mult = err <= 0.15 ? 10 : err <= 0.35 ? 5 : err <= 0.75 ? 2 : 1;
  const nice = mult * step0;
  const start = Math.ceil(min / nice) * nice;
  const end = Math.floor(max / nice) * nice;
  const ticks = [];
  for (let v = start; v <= end + 1e-12; v += nice) ticks.push(+v.toFixed(10));
  return ticks.length ? ticks : [min, max];
}

function timeLabel(date, spanMs) {
  const oneDay = 86400000;
  if (spanMs <= oneDay * 2)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (spanMs <= oneDay * 14)
    return (
      date.toLocaleDateString([], { day: "2-digit", month: "short" }) +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  if (spanMs <= oneDay * 120) return date.toLocaleDateString([], { day: "2-digit", month: "short" });
  if (spanMs <= oneDay * 400) return date.toLocaleDateString([], { month: "short", year: "2-digit" });
  return String(date.getFullYear());
}

function setHeaderFromPoint(v, t, isCross) {
  const d = dec();
  const view = getView();
  const data = view.data;
  const first = data[0];
  const last = data[data.length - 1];
  const hi = Math.max(...data);
  const lo = Math.min(...data);
  const show = v != null ? v : last;
  $("fsLast").innerHTML =
    fmt(show, d) + '<span class="ccy">' + (P.unit || "") + "</span>";
  if (!isCross) {
    const ch = $("fsChg");
    ch.textContent = P.chg || "—";
    ch.className = "fs-chg " + (P.dir === "up" ? "up" : P.dir === "down" ? "dn" : "flat");
  } else {
    const chg = show - first;
    const pct = first ? (chg / first) * 100 : 0;
    const ch = $("fsChg");
    ch.textContent = (chg >= 0 ? "+" : "") + fmt(chg, d) + "  (" + (pct >= 0 ? "+" : "") + fmt(pct, 2) + "%)";
    ch.className = "fs-chg " + (chg >= 0 ? "up" : "dn");
  }
  $("fsO").textContent = fmt(first, d);
  $("fsC").textContent = fmt(isCross ? show : last, d);
  $("fsH").textContent = fmt(isCross ? Math.max(first, show, hi) : hi, d);
  $("fsL").textContent = fmt(isCross ? Math.min(first, show, lo) : lo, d);
  if (isCross && t) {
    $("fsH").textContent = fmt(hi, d);
    $("fsL").textContent = fmt(lo, d);
    $("fsTime").textContent = t.toLocaleString();
  } else {
    $("fsTime").textContent = new Date().toLocaleTimeString();
  }
}

function draw() {
  const cv = $("fsCanvas");
  if (!cv || !cv.parentElement) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = cv.parentElement.getBoundingClientRect();
  const cw = Math.max(320, rect.width || 800);
  const ch = Math.max(200, rect.height || 400);
  cv.width = Math.floor(cw * dpr);
  cv.height = Math.floor(ch * dpr);
  cv.style.width = cw + "px";
  cv.style.height = ch + "px";
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const view = getView();
  const data = view.data;
  const times = view.times;
  const d = dec();
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, cw, ch);
  if (data.length < 2) {
    ctx.fillStyle = "#555";
    ctx.font = "14px Consolas,monospace";
    ctx.fillText("NO DATA", 20, 40);
    return;
  }

  let minY = Math.min(...data);
  let maxY = Math.max(...data);
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const padY = (maxY - minY) * 0.08;
  minY -= padY;
  maxY += padY;
  const plotW = cw - PAD.l - PAD.r;
  const plotH = ch - PAD.t - PAD.b;
  const X = (i) => PAD.l + (i / (data.length - 1)) * plotW;
  const Y = (v) => PAD.t + plotH - ((v - minY) / (maxY - minY)) * plotH;

  // grid + right axis
  const ticks = niceTicks(minY, maxY, 7);
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 1;
  ticks.forEach((tv) => {
    const gy = Y(tv);
    ctx.beginPath();
    ctx.moveTo(PAD.l, gy);
    ctx.lineTo(PAD.l + plotW, gy);
    ctx.stroke();
    ctx.fillStyle = "#888";
    ctx.font = "11px Consolas,monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(fmt(tv, d), PAD.l + plotW + 6, gy);
  });

  // time axis
  const t0 = times[0].getTime();
  const t1 = times[times.length - 1].getTime();
  const spanMs = Math.max(1, t1 - t0);
  const nLab = Math.max(3, Math.floor(plotW / 110));
  ctx.fillStyle = "#666";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "10px Consolas,monospace";
  for (let i = 0; i <= nLab; i++) {
    const idx = Math.round((i / nLab) * (data.length - 1));
    ctx.fillText(timeLabel(times[idx], spanMs), X(idx), ch - PAD.b + 8);
  }

  // series
  if (style === "candles") {
    const bw = Math.max(2, (plotW / Math.max(1, data.length)) * 0.55);
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      const o = i ? data[i - 1] : v;
      const c = v;
      const hi = Math.max(o, c) * 1.0008;
      const lo = Math.min(o, c) * 0.9992;
      const x = X(i);
      const up = c >= o;
      ctx.strokeStyle = "#666";
      ctx.beginPath();
      ctx.moveTo(x, Y(hi));
      ctx.lineTo(x, Y(lo));
      ctx.stroke();
      ctx.fillStyle = up ? "#00c853" : "#ff4d4d";
      const top = Y(Math.max(o, c));
      const bot = Y(Math.min(o, c));
      ctx.fillRect(x - bw / 2, top, bw, Math.max(1, bot - top));
    }
  } else {
    if (style !== "line") {
      const g = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + plotH);
      g.addColorStop(0, "rgba(25,70,140,0.72)");
      g.addColorStop(0.35, "rgba(15,45,95,0.55)");
      g.addColorStop(0.75, "rgba(10,30,60,0.28)");
      g.addColorStop(1, "rgba(8,16,28,0.04)");
      ctx.beginPath();
      ctx.moveTo(X(0), Y(data[0]));
      for (let i = 1; i < data.length; i++) ctx.lineTo(X(i), Y(data[i]));
      ctx.lineTo(X(data.length - 1), PAD.t + plotH);
      ctx.lineTo(X(0), PAD.t + plotH);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(X(0), Y(data[0]));
    for (let i = 1; i < data.length; i++) ctx.lineTo(X(i), Y(data[i]));
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  }

  const last = data[data.length - 1];
  const ly = Y(last);
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(255,153,0,0.85)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.l, ly);
  ctx.lineTo(PAD.l + plotW, ly);
  ctx.stroke();
  ctx.restore();

  const badge = fmt(last, d);
  ctx.font = "11px Consolas,monospace";
  const tw = ctx.measureText(badge).width + 12;
  const th = 16;
  const bx = PAD.l + plotW - tw;
  const by = Math.max(PAD.t, Math.min(PAD.t + plotH - th, ly - th / 2));
  ctx.fillStyle = "#ff9900";
  ctx.fillRect(bx, by, tw, th);
  ctx.fillStyle = "#0a0a0a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badge, bx + tw / 2, by + th / 2);

  // Anywhere-style crosshair + tip
  if (cross >= 0 && cross < data.length) {
    const cx = X(cross);
    const cy = Y(data[cross]);
    const pv = data[cross];
    const pt = times[cross];
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, PAD.t);
    ctx.lineTo(cx, PAD.t + plotH);
    ctx.moveTo(PAD.l, cy);
    ctx.lineTo(PAD.l + plotW, cy);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
    ctx.fill();
    // tip box
    const tip =
      pt.toLocaleString() + "   " + fmt(pv, d) + (P.unit ? " " + P.unit : "");
    ctx.font = "11px Consolas,monospace";
    const tW = ctx.measureText(tip).width + 14;
    const tH = 20;
    let tx = Math.min(PAD.l + plotW - tW, Math.max(PAD.l, cx + 10));
    let ty = PAD.t + 6;
    ctx.fillStyle = "rgba(20,20,20,0.94)";
    ctx.fillRect(tx, ty, tW, tH);
    ctx.strokeStyle = "#333";
    ctx.strokeRect(tx, ty, tW, tH);
    ctx.fillStyle = "#e8e8e8";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(tip, tx + 7, ty + tH / 2);
    setHeaderFromPoint(pv, pt, true);
  } else {
    setHeaderFromPoint(null, null, false);
  }

  const rawN = (cache.raw && cache.raw.length) || data.length;
  $("fsSrc").textContent =
    range.toUpperCase() +
    " · " +
    rawN +
    " bars → " +
    data.length +
    " pts · " +
    style +
    (cross >= 0 ? " · CROSS " + (cross + 1) + "/" + data.length : "");
  $("fsPeriodLabel").textContent = rangeSpec().label;
}

function rebuildToolbar() {
  const bar = $("fsToolbar");
  bar.innerHTML = "";
  RANGES.forEach((r) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "fs-range" + (r.id === range ? " on" : "");
    b.textContent = r.label;
    b.onclick = () => {
      range = r.id;
      cache = { key: "", data: [], times: [] };
      cross = -1;
      rebuildToolbar();
      draw();
    };
    bar.appendChild(b);
  });
  const tools = document.createElement("div");
  tools.className = "fs-tools";
  const sb = document.createElement("button");
  sb.type = "button";
  sb.id = "btnStyle";
  sb.textContent = "Style · " + style;
  sb.onclick = () => {
    style = STYLES[(STYLES.indexOf(style) + 1) % STYLES.length];
    sb.textContent = "Style · " + style;
    cache = { key: "", data: [], times: [] };
    draw();
  };
  tools.appendChild(sb);
  bar.appendChild(tools);
}

function onMove(e) {
  const cv = $("fsCanvas");
  const r = cv.getBoundingClientRect();
  const view = getView();
  const data = view.data;
  if (data.length < 2) return;
  const plotW = r.width - PAD.l - PAD.r;
  const x = e.clientX - r.left;
  let idx = Math.round(((x - PAD.l) / Math.max(1, plotW)) * (data.length - 1));
  idx = Math.max(0, Math.min(data.length - 1, idx));
  if (idx !== cross) {
    cross = idx;
    draw();
  }
}

// boot
$("fsName").textContent = P.sym + (P.name && P.name !== P.sym ? "  " + P.name : "");
$("fsSub").textContent = (P.unit ? P.unit + " · " : "") + "SECURITY";
$("btnClose").onclick = () => window.close();
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.close();
  if (e.key === "r" || e.key === "R") {
    cache = { key: "", data: [], times: [] };
    draw();
  }
});
const cv = $("fsCanvas");
cv.addEventListener("pointermove", onMove);
cv.addEventListener("pointerleave", () => {
  cross = -1;
  draw();
});
window.addEventListener("resize", () => {
  clearTimeout(window._rz);
  window._rz = setTimeout(draw, 50);
});
rebuildToolbar();
setTimeout(draw, 20);
setTimeout(draw, 100);
setTimeout(draw, 250);
</script>
</body></html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    return win;
  }

  function bindPopouts(root, marketLookup) {
    if (!root) return;
    root.querySelectorAll("[data-pop]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sym = btn.getAttribute("data-pop");
        let m = null;
        if (typeof marketLookup === "function") m = marketLookup(sym);
        else if (marketLookup && marketLookup[sym]) m = marketLookup[sym];
        if (!m) {
          m = { sym, name: sym, val: "—", chg: "—", dir: "flat" };
          const s = history[sym];
          if (s?.length) m.val = String(s[s.length - 1]);
        }
        openPopout(m);
      });
    });
  }

  return {
    push,
    replaceSeries,
    ensureFromMarket,
    mountain,
    multiMountain,
    sparkHtml,
    boardCard,
    heroChart,
    seedSeries,
    densify,
    openPopout,
    bindPopouts,
    getHistory: (sym) => (history[sym] ? history[sym].slice() : []),
  };
})();
