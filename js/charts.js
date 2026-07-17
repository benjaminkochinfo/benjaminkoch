/**
 * Live mountain charting — navy depth, white price line, amber last-print
 * Pure SVG. Series from live tape history when available.
 */

const Charts = (() => {
  const history = {}; // sym -> number[]
  const MAX = 56;

  function seedSeries(sym, seed, dirHint) {
    if (history[sym]?.length >= 8) return history[sym];
    let v = Number(seed) || 100;
    const arr = [];
    let drift = dirHint === "up" ? 0.001 : dirHint === "down" ? -0.001 : 0;
    for (let i = 0; i < MAX; i++) {
      drift += (Math.random() - 0.5) * 0.0006;
      v = Math.max(0.01, v * (1 + drift + (Math.random() - 0.5) * 0.006));
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

  /** Replace series from live feed closes (accurate chart history). */
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
    // Prefer real live history when we have enough points
    if (history[m.sym]?.length >= 4) {
      const h = history[m.sym];
      h[h.length - 1] = seed;
      return h;
    }
    const series = seedSeries(m.sym, seed, m.dir);
    if (series.length) series[series.length - 1] = seed;
    return series;
  }

  function themePalette(opts = {}) {
    return {
      stroke: opts.stroke || "#ffffff",
      fillTop: opts.fillTop || "rgba(33, 100, 243, 0.62)",
      fillMid: "rgba(20, 60, 140, 0.22)",
      fillBot: opts.fillBot || "rgba(4, 10, 28, 0.02)",
      bg: opts.bg || "#050a16",
      grid: "rgba(80, 110, 180, 0.12)",
      last: "#ffab00",
      lastStroke: "#fff",
    };
  }

  function mountain(series, opts = {}) {
    const w = opts.w || 320;
    const h = opts.h || 72;
    const padX = opts.padX ?? 6;
    const padY = opts.padY ?? 8;
    const pal = themePalette(opts);
    if (!series?.length) {
      return `<svg class="bb-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><text x="8" y="${
        h / 2
      }" fill="#5a6275" font-size="10" font-family="IBM Plex Mono,monospace">NO DATA</text></svg>`;
    }
    const min = Math.min(...series);
    const max = Math.max(...series);
    const span = max - min || Math.abs(max) * 0.01 || 1;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;
    const pts = series.map((v, i) => {
      const x = padX + (i / (series.length - 1 || 1)) * innerW;
      const y = padY + innerH - ((v - min) / span) * innerH;
      return [x, y];
    });
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
    const area =
      line +
      ` L${pts[pts.length - 1][0].toFixed(2)},${(h - 2).toFixed(2)}` +
      ` L${pts[0][0].toFixed(2)},${(h - 2).toFixed(2)} Z`;
    const stroke = pal.stroke;
    const fillTop = pal.fillTop;
    const fillBot = pal.fillBot;
    const gid = "g" + Math.random().toString(36).slice(2, 9);
    const last = pts[pts.length - 1];
    // subtle grid
    let grid = "";
    for (let g = 1; g <= 3; g++) {
      const gy = padY + (innerH * g) / 4;
      grid += `<line x1="${padX}" y1="${gy.toFixed(1)}" x2="${(w - padX).toFixed(
        1
      )}" y2="${gy.toFixed(1)}" stroke="${pal.grid}" stroke-width="0.6"/>`;
    }

    return `<svg class="bb-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${fillTop}"/>
          <stop offset="55%" stop-color="${pal.fillMid}"/>
          <stop offset="100%" stop-color="${fillBot}"/>
        </linearGradient>
        <filter id="glow${gid}" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="${w}" height="${h}" fill="${pal.bg}"/>
      ${grid}
      <path d="${area}" fill="url(#${gid})"/>
      <path d="${line}" fill="none" stroke="${stroke}" stroke-width="${
      opts.lineW || 1.75
    }" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow${gid})"/>
      <circle cx="${last[0].toFixed(2)}" cy="${last[1].toFixed(2)}" r="2.4" fill="${pal.last}" stroke="${pal.lastStroke}" stroke-width="0.6"/>
    </svg>`;
  }

  function multiMountain(seriesList, opts = {}) {
    const w = opts.w || 400;
    const h = opts.h || 100;
    const pad = 6;
    const all = seriesList.flatMap((s) => s.data || []);
    if (!all.length) return mountain([], opts);
    const min = Math.min(...all);
    const max = Math.max(...all);
    const span = max - min || 1;
    const colors = opts.colors || ["#fff", "#4a9eff", "#00c853", "#f5a623", "#ff6b1a"];
    let paths = "";
    seriesList.forEach((s, si) => {
      const data = s.data || [];
      if (data.length < 2) return;
      const pts = data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = pad + (h - pad * 2) - ((v - min) / span) * (h - pad * 2);
        return [x, y];
      });
      if (si === 0) {
        const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
        const area =
          line +
          ` L${pts[pts.length - 1][0].toFixed(2)},${h - pad} L${pts[0][0].toFixed(2)},${h - pad} Z`;
        const gid = "mg" + Math.random().toString(36).slice(2, 8);
        paths += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(33,100,243,0.55)"/><stop offset="100%" stop-color="rgba(4,10,28,0.02)"/>
        </linearGradient></defs>
        <path d="${area}" fill="url(#${gid})"/>`;
      }
      const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
      paths += `<path d="${line}" fill="none" stroke="${colors[si % colors.length]}" stroke-width="${
        si === 0 ? 1.9 : 1.2
      }" opacity="${si === 0 ? 1 : 0.85}"/>`;
    });
    return `<svg class="bb-chart bb-multi" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${paths}</svg>`;
  }

  function sparkHtml(m, h = 36) {
    const s = ensureFromMarket(m);
    return mountain(s, { w: 120, h, lineW: 1.3 });
  }

  function boardCard(m, opts = {}) {
    if (!m) return "";
    const s = ensureFromMarket(m);
    const up = m.dir === "up";
    const down = m.dir === "down";
    const chgClass = up ? "up" : down ? "down" : "flat";
    const live = m.source === "live" || m.source === "cache";
    return `<div class="bb-board-card ${opts.focused ? "focused" : ""}" data-sym="${m.sym}">
      <div class="bb-board-top">
        <div>
          <div class="bb-sym">${m.sym}${live ? " <i>·L</i>" : ""}</div>
          <div class="bb-name">${m.name || m.sym}</div>
        </div>
        <div class="bb-px">
          <div class="bb-val">${m.val}</div>
          <div class="bb-chg ${chgClass}">${m.chg}</div>
        </div>
      </div>
      <div class="bb-chart-host">${mountain(s, { w: 280, h: opts.chartH || 58, lineW: 1.6 })}</div>
      <div class="bb-foot"><span>${m.unit || m.cls || ""}</span><span class="${
        m.source === "live" || m.source === "cache" ? "live-tag" : ""
      }">${m.source === "live" ? "LIVE" : m.source === "cache" ? "CACHE" : m.source === "model" ? "MODEL" : "SEED"}</span></div>
    </div>`;
  }

  function heroChart(m, title) {
    if (!m) return `<div class="bb-hero empty">Select an instrument</div>`;
    const s = ensureFromMarket(m);
    const chgClass = m.dir === "up" ? "up" : m.dir === "down" ? "down" : "flat";
    return `<div class="bb-hero">
      <div class="bb-hero-head">
        <div>
          <div class="bb-hero-title">${title || m.sym}</div>
          <div class="bb-hero-sub">${m.name || ""} · ${m.unit || ""} · ${m.source || "model"}</div>
        </div>
        <div class="bb-hero-px">
          <span class="bb-val xl">${m.val}</span>
          <span class="bb-chg ${chgClass}">${m.chg}</span>
        </div>
      </div>
      <div class="bb-hero-chart">${mountain(s, { w: 720, h: 150, lineW: 2.1 })}</div>
      <div class="bb-hero-note">${
        m.source === "live" || m.source === "cache" ? "LIVE" : (m.source || "SEED").toUpperCase()
      } MOUNTAIN · white line · amber last · ${m.chg || ""}</div>
    </div>`;
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
  };
})();
