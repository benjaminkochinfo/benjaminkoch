/**
 * Self-contained broadcast map (Fox News–style graphic desk)
 * No external tiles, MapLibre, or map APIs.
 *
 * Features:
 *  - Stylized satellite / political / dark canvases (all local SVG)
 *  - Country labels, theater control fills, callout boxes + leader lines
 *  - Legend, title strip, shipping lanes, intel markers
 *  - Pan · wheel-zoom · flyTo — same Map3D surface for app.js
 */

const Map3D = (() => {
  let ready = false;
  let mode = "none"; // broadcast | none
  let basemap = "broadcast"; // broadcast | political | dark | relief
  let markersData = [];
  let onSelect = null;
  let containerEl = null;
  let spinning = false;
  let spinTimer = null;
  let showShipping = true;
  let tankerTimer = null;
  let focusTitle = "";
  let focusSub = "";
  let paintRaf = 0;
  let resizeObs = null;
  let showLabels = true; // description / callout labels (layer-driven content still applies)

  // View in lon/lat space projected to dynamic W×H equirectangular
  let W = 1000;
  let H = 500;
  let view = { cx: 20, cy: 18, scale: 1 }; // center lon/lat, scale
  let drag = null;

  /** Single professional terrain canvas (no style-picker UI) */
  const BASEMAPS = [{ id: "broadcast", label: "MAP", tip: "Situation map" }];

  /** Simplified theater polygons [lon,lat][] for control-zone fills */
  const THEATERS = [
    {
      id: "ukraine",
      name: "UKRAINE",
      fill: "rgba(196, 160, 90, 0.72)",
      stroke: "rgba(255,255,255,0.35)",
      poly: [
        [22.1, 52.4], [31.5, 52.4], [40.2, 49.5], [40.0, 47.0], [38.5, 45.2],
        [33.5, 44.4], [30.0, 45.5], [29.5, 48.0], [24.0, 48.0], [22.1, 49.0], [22.1, 52.4],
      ],
      zones: [
        {
          name: "ASSESSED RUSSIAN CONTROL",
          fill: "rgba(180, 28, 36, 0.78)",
          hatch: true,
          poly: [
            [35.5, 49.2], [40.0, 49.2], [40.0, 47.0], [38.5, 45.5], [36.5, 46.0],
            [35.8, 47.5], [35.5, 49.2],
          ],
        },
        {
          name: "CLAIMED UA COUNTER",
          fill: "rgba(40, 90, 200, 0.55)",
          poly: [
            [33.0, 51.2], [36.0, 51.2], [36.5, 49.8], [34.0, 49.5], [33.0, 50.2], [33.0, 51.2],
          ],
        },
      ],
      // City labels come only from enabled-layer markers (no hard-coded DONETSK etc.)
      labels: [], // world black-box catalog handles country names
      needLayers: ["conflicts", "hotspots", "military", "tensions"],
    },
    {
      id: "mideast",
      name: "MIDDLE EAST",
      fill: "rgba(200, 165, 90, 0.45)",
      stroke: "rgba(255,255,255,0.3)",
      poly: [
        [34.0, 37.5], [42.0, 37.5], [48.5, 36.0], [50.0, 30.0], [48.0, 25.0],
        [44.0, 22.0], [39.0, 21.5], [34.5, 28.0], [34.0, 32.0], [34.0, 37.5],
      ],
      zones: [
        {
          name: "IRAN",
          fill: "rgba(190, 30, 40, 0.72)",
          poly: [
            [44.0, 39.5], [48.5, 39.0], [55.0, 37.0], [61.0, 35.0], [61.0, 28.0],
            [57.0, 25.5], [52.0, 26.0], [48.0, 29.0], [45.0, 32.0], [44.0, 36.0], [44.0, 39.5],
          ],
        },
        {
          name: "IRAQ",
          fill: "rgba(210, 170, 70, 0.65)",
          poly: [
            [39.0, 37.2], [44.5, 37.2], [48.0, 34.0], [48.0, 30.0], [46.0, 29.0],
            [42.0, 30.5], [39.5, 33.0], [39.0, 37.2],
          ],
        },
        {
          name: "JORDAN",
          fill: "rgba(210, 175, 80, 0.6)",
          poly: [
            [35.0, 33.4], [39.0, 33.4], [39.2, 29.2], [36.0, 29.2], [35.0, 31.0], [35.0, 33.4],
          ],
        },
      ],
      labels: [],
      needLayers: ["conflicts", "hotspots", "military", "tensions", "bases", "nuclear", "sanctions"],
    },
    {
      id: "taiwan",
      name: "TAIWAN STRAIT",
      fill: "rgba(70, 120, 90, 0.3)",
      stroke: "rgba(255,255,255,0.25)",
      poly: [
        [116.0, 28.0], [122.5, 28.0], [122.5, 21.5], [118.0, 21.5], [116.0, 24.0], [116.0, 28.0],
      ],
      zones: [
        {
          name: "TAIWAN",
          fill: "rgba(50, 140, 200, 0.5)",
          poly: [
            [120.0, 25.3], [121.0, 25.3], [121.5, 24.0], [121.0, 22.0], [120.5, 22.0],
            [120.0, 23.5], [120.0, 25.3],
          ],
        },
      ],
      labels: [],
      needLayers: ["tensions", "hotspots", "military", "tech"],
    },
    {
      id: "redsea",
      name: "RED SEA",
      fill: "rgba(40, 80, 100, 0.18)",
      stroke: "rgba(100,180,220,0.4)",
      poly: [
        [32.5, 30.0], [43.5, 28.0], [44.0, 12.0], [39.0, 12.0], [32.5, 22.0], [32.5, 30.0],
      ],
      zones: [],
      labels: [],
      needLayers: ["waterways", "transport", "insurance", "hotspots"],
    },
    {
      id: "sudan",
      name: "SUDAN",
      fill: "rgba(180, 140, 70, 0.45)",
      stroke: "rgba(255,255,255,0.3)",
      poly: [
        [22.0, 22.0], [38.0, 22.0], [38.5, 12.0], [34.0, 8.5], [24.0, 8.5], [22.0, 15.0], [22.0, 22.0],
      ],
      zones: [
        {
          name: "KHARTOUM AXIS",
          fill: "rgba(190, 40, 40, 0.55)",
          poly: [
            [31.5, 16.5], [34.0, 16.5], [34.0, 14.5], [31.5, 14.5], [31.5, 16.5],
          ],
        },
      ],
      labels: [],
      needLayers: ["conflicts", "hotspots"],
    },
  ];

  function available() {
    return true;
  }

  function project(lon, lat) {
    // Base equirectangular then zoom around view center
    const bx = ((lon + 180) / 360) * W;
    const by = ((90 - lat) / 180) * H;
    const cx = ((view.cx + 180) / 360) * W;
    const cy = ((90 - view.cy) / 180) * H;
    const s = view.scale;
    return [(bx - cx) * s + W / 2, (by - cy) * s + H / 2];
  }

  function unproject(x, y) {
    const s = view.scale || 1;
    const cx = ((view.cx + 180) / 360) * W;
    const cy = ((90 - view.cy) / 180) * H;
    const bx = (x - W / 2) / s + cx;
    const by = (y - H / 2) / s + cy;
    const lon = (bx / W) * 360 - 180;
    const lat = 90 - (by / H) * 180;
    return [lon, lat];
  }

  function polyPath(poly) {
    if (!poly?.length) return "";
    return (
      poly
        .map((p, i) => {
          const [x, y] = project(p[0], p[1]);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ") + " Z"
    );
  }

  function landColors() {
    if (basemap === "dark") {
      return { land: "#1a2433", stroke: "#2a3a50", ocean: "#050810", sat: false };
    }
    if (basemap === "political") {
      return { land: "#c4a86a", stroke: "rgba(40,30,20,0.45)", ocean: "#0a2840", sat: false };
    }
    if (basemap === "relief") {
      return { land: "#5a7a48", stroke: "rgba(30,40,20,0.4)", ocean: "#0c2a3a", sat: true };
    }
    // broadcast — satellite look
    return { land: "#6b5a3e", stroke: "rgba(20,15,10,0.35)", ocean: "#0a1e30", sat: true };
  }

  function colorFor(m) {
    if (m.color) return m.color;
    if (m.layer === "bases") return "#4a9eff";
    if (m.layer === "nuclear") return "#ffd60a";
    if (m.layer === "agriculture") return "#aed581";
    if (m.layer === "insurance") return "#ce93d8";
    if (m.layer === "disasters" || m.live) return "#80cbc4";
    const sev = m.sev;
    if (sev === "critical" || sev === "crit") return "#ff3b30";
    if (sev === "high") return "#ff6b1a";
    if (sev === "elevated" || sev === "med") return "#f5a623";
    if (sev === "watch") return "#4a9eff";
    return "#8b93a7";
  }

  function routeColor(status, kind) {
    if (status === "elevated") return "#ff6b1a";
    if (status === "watch") return "#f5a623";
    if (kind === "tanker") return "#4fc3f7";
    return "#69f0ae";
  }

  function theaterHasActiveMarkers(t) {
    const need = t.needLayers || [];
    return markersData.some((m) => {
      if (need.length && !need.includes(m.layer)) return false;
      const lons = t.poly.map((p) => p[0]);
      const lats = t.poly.map((p) => p[1]);
      return (
        m.lon >= Math.min(...lons) - 4 &&
        m.lon <= Math.max(...lons) + 4 &&
        m.lat >= Math.min(...lats) - 4 &&
        m.lat <= Math.max(...lats) + 4
      );
    });
  }

  function activeTheaters() {
    // Only theaters that have enabled-layer markers nearby (layer toggle drives overlays)
    const scored = THEATERS.map((t) => {
      const mid = t.poly.reduce(
        (a, p) => [a[0] + p[0] / t.poly.length, a[1] + p[1] / t.poly.length],
        [0, 0]
      );
      const d = Math.hypot(mid[0] - view.cx, mid[1] - view.cy);
      const nearMarker = theaterHasActiveMarkers(t);
      return { t, score: (nearMarker ? 80 : -100) - d + (view.scale > 2.2 ? 15 : 0), nearMarker };
    }).filter((s) => s.nearMarker);
    scored.sort((a, b) => b.score - a.score);
    if (view.scale < 1.6) return scored.slice(0, 3).map((s) => s.t);
    return scored.slice(0, 2).map((s) => s.t);
  }

  /** Black-box region labels (UKRAINE / YEMEN style) for the whole world */
  const WORLD_BOX_LABELS = [
    // Americas
    { name: "UNITED STATES", lon: -98, lat: 39.5, pri: 1 },
    { name: "CANADA", lon: -106, lat: 56, pri: 1 },
    { name: "MEXICO", lon: -102, lat: 23.5, pri: 1 },
    { name: "BRAZIL", lon: -52, lat: -10, pri: 1 },
    { name: "ARGENTINA", lon: -64, lat: -34, pri: 2 },
    { name: "COLOMBIA", lon: -74, lat: 4.5, pri: 2 },
    { name: "CHILE", lon: -71, lat: -33, pri: 2 },
    { name: "PERU", lon: -75, lat: -10, pri: 2 },
    { name: "VENEZUELA", lon: -66, lat: 8, pri: 2 },
    // Europe
    { name: "UNITED KINGDOM", lon: -2, lat: 54, pri: 1 },
    { name: "FRANCE", lon: 2.5, lat: 46.5, pri: 1 },
    { name: "GERMANY", lon: 10.5, lat: 51.2, pri: 1 },
    { name: "SPAIN", lon: -3.5, lat: 40.2, pri: 1 },
    { name: "ITALY", lon: 12.5, lat: 42.5, pri: 1 },
    { name: "POLAND", lon: 19.5, lat: 52, pri: 2 },
    { name: "UKRAINE", lon: 31.5, lat: 49, pri: 1 },
    { name: "TURKEY", lon: 35, lat: 39, pri: 1 },
    { name: "SWEDEN", lon: 15, lat: 62, pri: 2 },
    { name: "NORWAY", lon: 9, lat: 61, pri: 2 },
    { name: "GREECE", lon: 22, lat: 39, pri: 2 },
    { name: "ROMANIA", lon: 25, lat: 46, pri: 2 },
    // Africa
    { name: "EGYPT", lon: 30.5, lat: 27, pri: 1 },
    { name: "LIBYA", lon: 17, lat: 27, pri: 2 },
    { name: "ALGERIA", lon: 2.5, lat: 28, pri: 2 },
    { name: "MOROCCO", lon: -6, lat: 32, pri: 2 },
    { name: "NIGERIA", lon: 8, lat: 9.5, pri: 1 },
    { name: "ETHIOPIA", lon: 39, lat: 9, pri: 2 },
    { name: "KENYA", lon: 38, lat: 0.5, pri: 2 },
    { name: "SOUTH AFRICA", lon: 25, lat: -29, pri: 1 },
    { name: "SUDAN", lon: 30, lat: 15.5, pri: 1 },
    { name: "SOMALIA", lon: 46, lat: 6, pri: 2 },
    { name: "DR CONGO", lon: 24, lat: -3, pri: 2 },
    // Middle East / Central Asia
    { name: "SAUDI ARABIA", lon: 45, lat: 24, pri: 1 },
    { name: "IRAN", lon: 53.5, lat: 32.5, pri: 1 },
    { name: "IRAQ", lon: 44, lat: 33, pri: 1 },
    { name: "YEMEN", lon: 45, lat: 15.5, pri: 1 },
    { name: "ISRAEL", lon: 34.8, lat: 31.5, pri: 1 },
    { name: "JORDAN", lon: 36.5, lat: 31.2, pri: 2 },
    { name: "SYRIA", lon: 38.5, lat: 35, pri: 2 },
    { name: "UAE", lon: 54, lat: 24, pri: 2 },
    { name: "OMAN", lon: 57, lat: 21, pri: 2 },
    { name: "AFGHANISTAN", lon: 66, lat: 33.5, pri: 2 },
    { name: "PAKISTAN", lon: 69, lat: 30, pri: 1 },
    { name: "KAZAKHSTAN", lon: 68, lat: 48, pri: 2 },
    // Asia-Pacific
    { name: "RUSSIA", lon: 90, lat: 62, pri: 1 },
    { name: "CHINA", lon: 104, lat: 35, pri: 1 },
    { name: "INDIA", lon: 79, lat: 22, pri: 1 },
    { name: "JAPAN", lon: 138, lat: 36, pri: 1 },
    { name: "SOUTH KOREA", lon: 127.5, lat: 36.5, pri: 1 },
    { name: "NORTH KOREA", lon: 127, lat: 40.5, pri: 2 },
    { name: "TAIWAN", lon: 121, lat: 23.7, pri: 1 },
    { name: "VIETNAM", lon: 108, lat: 14, pri: 2 },
    { name: "THAILAND", lon: 101, lat: 15, pri: 2 },
    { name: "INDONESIA", lon: 118, lat: -2, pri: 1 },
    { name: "PHILIPPINES", lon: 122, lat: 12, pri: 2 },
    { name: "MALAYSIA", lon: 102, lat: 4, pri: 2 },
    { name: "AUSTRALIA", lon: 134, lat: -25, pri: 1 },
    { name: "NEW ZEALAND", lon: 174, lat: -41, pri: 2 },
    { name: "MONGOLIA", lon: 103, lat: 46, pri: 2 },
    { name: "MYANMAR", lon: 96, lat: 21, pri: 2 },
  ];

  const SEA_LABELS = [
    { name: "ATLANTIC OCEAN", lon: -35, lat: 20, minScale: 0.85 },
    { name: "PACIFIC OCEAN", lon: -150, lat: 5, minScale: 0.85 },
    { name: "INDIAN OCEAN", lon: 75, lat: -15, minScale: 0.9 },
    { name: "ARCTIC OCEAN", lon: 0, lat: 78, minScale: 1.0 },
    { name: "MEDITERRANEAN SEA", lon: 18, lat: 35, minScale: 1.4 },
    { name: "BLACK SEA", lon: 34, lat: 43, minScale: 1.8 },
    { name: "RED SEA", lon: 38, lat: 20, minScale: 1.6 },
    { name: "PERSIAN GULF", lon: 52, lat: 26.5, minScale: 1.8 },
    { name: "SOUTH CHINA SEA", lon: 114, lat: 12, minScale: 1.6 },
    { name: "NORTH SEA", lon: 3, lat: 56, minScale: 2.0 },
    { name: "CARIBBEAN SEA", lon: -75, lat: 15, minScale: 1.6 },
    { name: "GULF OF MEXICO", lon: -90, lat: 25, minScale: 1.8 },
    { name: "BAY OF BENGAL", lon: 90, lat: 15, minScale: 1.8 },
    { name: "ARABIAN SEA", lon: 62, lat: 15, minScale: 1.8 },
  ];

  function countryLabelsNearView() {
    // Primary: curated black-box world labels
    const maxPri = view.scale < 1.2 ? 1 : view.scale < 2.0 ? 2 : 3;
    const maxN = view.scale < 1.2 ? 28 : view.scale < 2.2 ? 42 : 60;
    const boxes = WORLD_BOX_LABELS.filter((l) => (l.pri || 2) <= maxPri)
      .map((l) => {
        const d = Math.hypot(l.lon - view.cx, l.lat - view.cy);
        return { l, d };
      })
      .filter((item) => {
        const [px, py] = project(item.l.lon, item.l.lat);
        return px > -30 && px < W + 30 && py > -20 && py < H + 20;
      })
      .sort((a, b) => a.d - b.d || (a.l.pri || 2) - (b.l.pri || 2))
      .slice(0, maxN)
      .map((item) => item.l);

    // Zoomed in: fill gaps from full COUNTRIES catalog (still black boxes)
    if (view.scale >= 2.2 && typeof COUNTRIES !== "undefined") {
      const have = new Set(boxes.map((b) => b.name));
      const extra = COUNTRIES.filter((c) => c.code && c.code !== "GLOBAL")
        .map((c) => {
          const d = Math.hypot(c.lon - view.cx, c.lat - view.cy);
          return { c, d };
        })
        .filter((item) => {
          const [px, py] = project(item.c.lon, item.c.lat);
          return px > 0 && px < W && py > 0 && py < H;
        })
        .sort((a, b) => a.d - b.d)
        .slice(0, 24)
        .map((item) => ({ name: item.c.name.toUpperCase(), lon: item.c.lon, lat: item.c.lat, pri: 3 }))
        .filter((l) => !have.has(l.name));
      return boxes.concat(extra).slice(0, maxN + 16);
    }
    return boxes;
  }

  function seaLabelsNearView() {
    return SEA_LABELS.filter((s) => view.scale >= (s.minScale || 1)).filter((s) => {
      const [px, py] = project(s.lon, s.lat);
      return px > 20 && px < W - 20 && py > 20 && py < H - 20;
    });
  }

  function layerLabel(id) {
    if (typeof LAYERS === "undefined") return (id || "").toUpperCase();
    const L = LAYERS.find((l) => l.id === id);
    return L ? L.name.toUpperCase() : String(id || "").toUpperCase();
  }

  function pickCallouts() {
    // Description cards only when labels on — content already filtered by layer toggles
    if (!showLabels) return [];
    const sorted = [...markersData].sort((a, b) => {
      const rank = (s) =>
        s === "critical" || s === "crit" ? 4 : s === "high" ? 3 : s === "elevated" ? 2 : 1;
      return rank(b.sev) - rank(a.sev);
    });
    const max = view.scale < 1.3 ? 8 : view.scale < 2.2 ? 14 : view.scale < 3.5 ? 22 : 36;
    const minDist = view.scale < 1.5 ? 48 : view.scale < 2.5 ? 36 : 26;
    const picks = [];
    for (const m of sorted) {
      if (picks.length >= max) break;
      const [x, y] = project(m.lon, m.lat);
      if (x < 16 || x > W - 16 || y < 24 || y > H - 28) continue;
      if (picks.some((p) => Math.hypot(p.x - x, p.y - y) < minDist)) continue;
      picks.push({ m, x, y });
    }
    return picks;
  }

  function legendItems() {
    const items = [];
    const seen = new Set();
    // Active layers from visible markers
    if (typeof LAYERS !== "undefined") {
      LAYERS.forEach((L) => {
        if (!markersData.some((m) => m.layer === L.id)) return;
        if (seen.has(L.id)) return;
        seen.add(L.id);
        items.push({ c: L.color || "#888", t: L.name.toUpperCase() });
      });
    }
    if (showShipping) items.push({ c: "#4fc3f7", t: "SHIPPING / LANES" });
    // Severity key
    items.push({ c: "#ff3b30", t: "CRITICAL" });
    items.push({ c: "#ff6b1a", t: "HIGH" });
    items.push({ c: "#f5a623", t: "WATCH / ELEVATED" });
    return items.slice(0, 12);
  }

  function buildHeadline() {
    // No on-map title banner (user preference — never surface marker titles as headers)
    return { title: "", sub: "" };
  }

  function shippingSvg() {
    if (!showShipping) return "";
    const routes = typeof SHIPPING_ROUTES !== "undefined" ? SHIPPING_ROUTES : [];
    const trackers = typeof TANKER_TRACKERS !== "undefined" ? TANKER_TRACKERS : [];
    const nodes = typeof TRANSPORT_NODES !== "undefined" ? TRANSPORT_NODES : [];
    let html = "";
    routes.forEach((r) => {
      const coords = r.coords || [];
      if (coords.length < 2) return;
      const d = coords
        .map((c, i) => {
          const [x, y] = project(c[0], c[1]);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      const col = routeColor(r.status, r.kind);
      html += `<path class="fox-lane-glow" d="${d}" stroke="${col}" fill="none"/>`;
      html += `<path class="fox-lane" d="${d}" stroke="${col}" fill="none" data-id="${r.id}" data-kind="lane"/>`;
    });
    const byId = Object.fromEntries(routes.map((r) => [r.id, r]));
    trackers.forEach((t) => {
      const route = byId[t.route];
      if (!route?.coords?.length) return;
      const coords = route.coords;
      const p = Math.max(0, Math.min(0.999, Number(t.progress) || 0));
      const idx = p * (coords.length - 1);
      const i0 = Math.floor(idx);
      const i1 = Math.min(coords.length - 1, i0 + 1);
      const f = idx - i0;
      const lon = coords[i0][0] + (coords[i1][0] - coords[i0][0]) * f;
      const lat = coords[i0][1] + (coords[i1][1] - coords[i0][1]) * f;
      const [x, y] = project(lon, lat);
      const delayed = (t.status || "").includes("delay") || (t.delayH || 0) >= 12;
      const col = delayed ? "#ff5252" : t.cargo === "crude" ? "#ffab00" : "#4fc3f7";
      html += `<circle class="fox-vessel" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${col}" data-id="${t.id}" data-kind="vessel"/>`;
    });
    nodes.forEach((n) => {
      const [x, y] = project(n.lon, n.lat);
      const col = n.status === "elevated" ? "#ff6b1a" : "#80d8ff";
      html += `<rect class="fox-node" x="${(x - 3.5).toFixed(1)}" y="${(y - 3.5).toFixed(1)}" width="7" height="7" fill="${col}" data-id="${n.id}" data-kind="node" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    });
    return html;
  }

  function renderSvgContent() {
    const cols = landColors();
    let html = "";

    // Ocean + shared defs (gradients, hatch, grain)
    html += `<defs>
      <radialGradient id="foxDeepOcean" cx="48%" cy="42%" r="72%">
        <stop offset="0%" stop-color="#0c4a6e"/>
        <stop offset="35%" stop-color="#063552"/>
        <stop offset="70%" stop-color="#021a2c"/>
        <stop offset="100%" stop-color="#01080f"/>
      </radialGradient>
      <radialGradient id="foxSun" cx="28%" cy="22%" r="55%">
        <stop offset="0%" stop-color="rgba(180,210,230,0.18)"/>
        <stop offset="45%" stop-color="rgba(40,80,110,0.06)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
      <linearGradient id="foxLandG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#a09068"/>
        <stop offset="18%" stop-color="#7a8a48"/>
        <stop offset="38%" stop-color="#5c7040"/>
        <stop offset="58%" stop-color="#8a7048"/>
        <stop offset="78%" stop-color="#6a5a38"/>
        <stop offset="100%" stop-color="#3d4a2c"/>
      </linearGradient>
      <linearGradient id="foxLandDesert" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c4a86a"/>
        <stop offset="50%" stop-color="#a08850"/>
        <stop offset="100%" stop-color="#6a5838"/>
      </linearGradient>
      <linearGradient id="foxLandHi" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,230,0.16)"/>
        <stop offset="40%" stop-color="rgba(120,140,80,0.04)"/>
        <stop offset="100%" stop-color="rgba(0,15,5,0.28)"/>
      </linearGradient>
      <filter id="foxGrain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="1.35" numOctaves="4" stitchTiles="stitch" result="n"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.09  0 0 0 0 0.06  0 0 0 0.22 0" in="n"/>
      </filter>
      <filter id="foxCloud" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="7" result="c"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.9  0 0 0 0 0.92  0 0 0 0 0.95  0 0 0 0.08 0" in="c"/>
      </filter>
      <filter id="foxShade" x="-8%" y="-8%" width="116%" height="116%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="b"/>
        <feOffset dx="1.1" dy="1.6" result="o"/>
        <feComponentTransfer in="o" result="s"><feFuncA type="linear" slope="0.42"/></feComponentTransfer>
        <feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="foxCoastGlow" x="-2%" y="-2%" width="104%" height="104%">
        <feGaussianBlur stdDeviation="0.6" result="g"/>
        <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <pattern id="foxHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
        <line x1="0" y1="0" x2="0" y2="5" stroke="rgba(90,12,12,0.48)" stroke-width="1.8"/>
      </pattern>
    </defs>`;
    // Deep ocean base + atmospheric light
    html += `<rect class="fox-ocean" width="${W}" height="${H}" fill="url(#foxDeepOcean)"/>`;
    html += `<rect width="${W}" height="${H}" fill="url(#foxSun)"/>`;
    html += `<rect width="${W}" height="${H}" filter="url(#foxGrain)" opacity="0.38"/>`;
    html += `<rect width="${W}" height="${H}" filter="url(#foxCloud)" opacity="0.55" style="mix-blend-mode:screen"/>`;

    // Land + country borders (Natural Earth 110m when available)
    const hasBorders =
      typeof COUNTRY_BORDERS !== "undefined" && Array.isArray(COUNTRY_BORDERS) && COUNTRY_BORDERS.length;
    const sw = Math.max(0.35, 0.75 / Math.sqrt(view.scale));
    const borderW = Math.max(0.35, (view.scale < 1.4 ? 0.45 : view.scale < 2.5 ? 0.7 : 1.05) / Math.sqrt(Math.max(1, view.scale * 0.6)));

    if (hasBorders) {
      // Ultra-realistic: each country polygon filled + perfect border lines
      COUNTRY_BORDERS.forEach((c, pi) => {
        const fill =
          pi % 7 === 1 || pi % 7 === 4
            ? "url(#foxLandDesert)"
            : pi % 7 === 2
              ? "url(#foxLandG)"
              : "url(#foxLandG)";
        (c.polys || []).forEach((ring) => {
          if (!ring || ring.length < 3) return;
          const d = polyPath(ring);
          if (!d) return;
          // Skip tiny rings at world view for performance (still draw at zoom)
          if (view.scale < 1.15 && ring.length < 6) return;
          html += `<path class="fox-country" data-name="${esc(c.name)}" d="${d}" fill="${fill}" stroke="none" filter="url(#foxShade)"/>`;
          html += `<path d="${d}" fill="url(#foxLandHi)" stroke="none" opacity="0.88"/>`;
          // National border — stronger when zoomed
          html += `<path class="fox-border" d="${d}" fill="none" stroke="rgba(235,240,235,${
            view.scale < 1.5 ? 0.32 : view.scale < 2.5 ? 0.48 : 0.62
          })" stroke-width="${borderW.toFixed(2)}" stroke-linejoin="round"/>`;
        });
      });
    } else if (typeof WORLD_LAND !== "undefined") {
      WORLD_LAND.forEach((poly, pi) => {
        const d = polyPath(poly);
        const fill = pi % 5 === 2 || pi % 5 === 3 ? "url(#foxLandDesert)" : "url(#foxLandG)";
        html += `<path class="fox-land" d="${d}" fill="${fill}" stroke="rgba(18,24,16,0.65)" stroke-width="${sw.toFixed(
          2
        )}" filter="url(#foxShade)"/>`;
        html += `<path d="${d}" fill="url(#foxLandHi)" stroke="none" opacity="0.95"/>`;
        html += `<path d="${d}" fill="none" stroke="rgba(220,230,220,0.28)" stroke-width="${Math.max(
          0.5,
          sw * 0.85
        ).toFixed(2)}"/>`;
      });
    }

    // Theaters + control zones (only when matching layers have markers on)
    const theaters = activeTheaters();
    theaters.forEach((th) => {
      html += `<path class="fox-theater" d="${polyPath(th.poly)}" fill="${th.fill}" stroke="${th.stroke || "rgba(255,255,255,0.4)"}" stroke-width="1.35"/>`;
      (th.zones || []).forEach((z) => {
        html += `<path class="fox-zone" d="${polyPath(z.poly)}" fill="${z.fill}" stroke="rgba(255,255,255,0.3)" stroke-width="0.9"/>`;
        if (z.hatch) {
          html += `<path class="fox-zone-hatch" d="${polyPath(z.poly)}" fill="url(#foxHatch)" opacity="0.5"/>`;
        }
      });
      // Geography labels only (country / sea) — not city intel
      (th.labels || []).forEach((lb) => {
        if (!lb.box && !lb.sea) return;
        const [x, y] = project(lb.lon, lb.lat);
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return;
        if (lb.sea) {
          html += `<text class="fox-sea-label" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${esc(lb.name)}</text>`;
        } else {
          const bw = Math.max(56, lb.name.length * 7.4 + 12);
          html += `<g class="fox-country-box" transform="translate(${(x - bw / 2).toFixed(1)},${(y - 9).toFixed(1)})">
            <rect x="0" y="0" width="${bw.toFixed(0)}" height="18" rx="1"/>
            <text x="6" y="13">${esc(lb.name)}</text>
          </g>`;
        }
      });
    });

    // Shipping under markers
    html += `<g id="foxShipping">${shippingSvg()}</g>`;

    // Black box region labels worldwide (UKRAINE / YEMEN style)
    countryLabelsNearView().forEach((c) => {
      const [x, y] = project(c.lon, c.lat);
      const name = (c.name || "").toUpperCase();
      if (!name) return;
      const bw = Math.max(52, name.length * 6.8 + 14);
      const bh = 17;
      html += `<g class="fox-country-box" transform="translate(${(x - bw / 2).toFixed(1)},${(y - bh / 2).toFixed(1)})">
        <rect x="0" y="0" width="${bw.toFixed(0)}" height="${bh}" rx="1"/>
        <text x="7" y="12.5">${esc(name)}</text>
      </g>`;
    });
    // Sea / ocean labels
    seaLabelsNearView().forEach((s) => {
      const [x, y] = project(s.lon, s.lat);
      html += `<text class="fox-sea-label" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${esc(s.name)}</text>`;
    });

    // Markers
    html += `<g id="markerLayer">`;
    markersData.forEach((m) => {
      const [x, y] = project(m.lon, m.lat);
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) return;
      const c = colorFor(m);
      const r =
        m.sev === "critical" || m.sev === "crit" ? 6.5 : m.sev === "high" ? 5.5 : 4.5;
      if (m.sev === "critical" || m.sev === "crit" || m.sev === "high") {
        html += `<circle class="fox-pulse" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r + 8}" fill="${c}"/>`;
      }
      html += `<circle class="fox-marker" data-id="${m.id}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${c}" stroke="rgba(255,255,255,0.75)" stroke-width="1.2"/>`;
    });
    html += `</g>`;

    // Callout cards: layer label + title + key data (severity / time / desc)
    const callouts = pickCallouts();
    const detail = view.scale >= 2.0;
    html += `<g id="foxCallouts">`;
    callouts.forEach((p, i) => {
      const side = p.x > W * 0.55 ? -1 : 1;
      const ox = side * (78 + (i % 4) * 10);
      const oy = -34 - (i % 5) * 8;
      const bx = p.x + ox;
      const by = p.y + oy;
      const title = (p.m.title || "SIGNAL").toUpperCase().slice(0, 42);
      const layer = layerLabel(p.m.layer);
      const sev = String(p.m.sev || "").toUpperCase();
      const time = p.m.time || "";
      const line2 = [sev, time].filter(Boolean).join(" · ");
      const line3 = detail && p.m.desc ? String(p.m.desc).slice(0, 48) : "";
      const lines = [title, line2, line3].filter(Boolean);
      const maxChars = Math.max(...lines.map((l) => l.length), 12);
      const bw = Math.min(248, Math.max(100, maxChars * 6.0 + 18));
      const bh = 12 + lines.length * 13;
      const boxX = side > 0 ? bx : bx - bw;
      const boxY = by - bh / 2;
      const col = colorFor(p.m);
      let texts = lines
        .map((l, li) => {
          const isTitle = li === 0;
          return `<text class="fox-callout-text${isTitle ? " main" : " sub"}" x="${(boxX + 8).toFixed(1)}" y="${(
            boxY + 14 + li * 13
          ).toFixed(1)}">${esc(l)}</text>`;
        })
        .join("");
      // layer tag
      texts =
        `<text class="fox-callout-layer" x="${(boxX + 8).toFixed(1)}" y="${(boxY - 3).toFixed(1)}" fill="${col}">${esc(
          layer
        )}</text>` + texts;
      html += `<g class="fox-callout" data-id="${p.m.id}">
        <line class="fox-leader" x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}"/>
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" class="fox-pin" fill="${col}"/>
        <rect class="fox-callout-box" x="${boxX.toFixed(1)}" y="${(boxY - 10).toFixed(1)}" width="${bw}" height="${
        bh + 10
      }"/>
        <rect class="fox-callout-accent" x="${boxX.toFixed(1)}" y="${(boxY - 10).toFixed(
        1
      )}" width="3" height="${bh + 10}" fill="${col}"/>
        ${texts}
      </g>`;
    });
    html += `</g>`;

    return html;
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function paint() {
    if (!containerEl) return;
    const svg = containerEl.querySelector("#worldMap");
    if (!svg) return;
    try {
      const html = renderSvgContent();
      // Direct innerHTML on <svg> keeps correct SVG namespace (do NOT parse via HTML <div>)
      svg.innerHTML = html;
      bindSvgEvents(svg);
      updateHud();
    } catch (err) {
      console.error("Map paint failed", err);
      try {
        const msg = String(err && err.message ? err.message : err).slice(0, 120);
        svg.innerHTML =
          '<rect width="' +
          W +
          '" height="' +
          H +
          '" fill="#0a1e30"/><text x="20" y="40" fill="#fff" font-size="14" font-family="monospace">MAP RENDER ERROR</text><text x="20" y="60" fill="#f5a623" font-size="11" font-family="monospace">' +
          msg.replace(/</g, "&lt;") +
          "</text>";
      } catch {
        /* */
      }
    }
  }

  function paintSoon() {
    if (paintRaf) return;
    paintRaf = requestAnimationFrame(() => {
      paintRaf = 0;
      paint();
    });
  }

  function bindSvgEvents(svg) {
    svg.querySelectorAll(".fox-marker, .fox-callout").forEach((node) => {
      node.style.cursor = "pointer";
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = node.getAttribute("data-id");
        const m = markersData.find((x) => x.id === id);
        if (m && onSelect) onSelect(m);
      });
    });
    svg.querySelectorAll("[data-kind=lane]").forEach((node) => {
      node.style.cursor = "pointer";
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = node.getAttribute("data-id");
        const routes = typeof SHIPPING_ROUTES !== "undefined" ? SHIPPING_ROUTES : [];
        const r = routes.find((x) => x.id === id);
        if (r && onSelect) {
          onSelect({
            title: r.name || "Sea lane",
            layer: "shipping",
            sev: r.status === "elevated" ? "high" : "elevated",
            source: "lane model",
            desc: `${r.kind || "shipping"} · status ${r.status || "—"} · model delay ~${r.delayH || 0}h (illustrative)`,
            time: "lane",
            color: routeColor(r.status, r.kind),
          });
        }
      });
    });
    svg.querySelectorAll("[data-kind=vessel], [data-kind=node]").forEach((node) => {
      node.style.cursor = "pointer";
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = node.getAttribute("data-id");
        const kind = node.getAttribute("data-kind");
        if (kind === "node") {
          const nodes = typeof TRANSPORT_NODES !== "undefined" ? TRANSPORT_NODES : [];
          const n = nodes.find((x) => x.id === id);
          if (n && onSelect) {
            onSelect({
              title: n.name,
              layer: "chokepoint",
              sev: n.status === "elevated" ? "high" : "elevated",
              source: "chokepoint",
              desc: n.note || n.type || "Shipping node",
              time: n.status || "watch",
            });
          }
        } else {
          const trackers = typeof TANKER_TRACKERS !== "undefined" ? TANKER_TRACKERS : [];
          const t = trackers.find((x) => x.id === id);
          if (t && onSelect) {
            onSelect({
              title: t.name,
              layer: "shipping",
              sev: (t.delayH || 0) >= 12 ? "high" : "info",
              source: "lane model",
              desc: `${t.cargo || "cargo"} · ${t.status || "track"} · delay ~${t.delayH || 0}h`,
              time: t.status || "on route",
            });
          }
        }
      });
    });
  }

  function updateHud() {
    if (!containerEl) return;
    const badge = containerEl.querySelector("#mapBadge");
    if (badge) badge.textContent = badgeText();
    const coords = containerEl.querySelector("#mapCoords");
    if (coords) {
      coords.textContent = `LAT ${view.cy.toFixed(1)} · LON ${view.cx.toFixed(1)} · ×${view.scale.toFixed(2)}`;
    }
    const titlebar = containerEl.querySelector(".fox-titlebar");
    if (titlebar) titlebar.hidden = true;
    const titleEl = containerEl.querySelector("#foxMapTitle");
    const subEl = containerEl.querySelector("#foxMapSub");
    if (titleEl) titleEl.textContent = "";
    if (subEl) subEl.textContent = "";

    const leg = containerEl.querySelector("#foxLegend");
    if (leg) {
      leg.innerHTML = legendItems()
        .map(
          (i) =>
            `<span class="fox-leg-item"><i style="background:${i.c}"></i>${esc(i.t)}</span>`
        )
        .join("");
    }

    // theater legend snippet for focused theater
    const th = activeTheaters()[0];
    const thLeg = containerEl.querySelector("#foxTheaterLeg");
    if (thLeg) {
      if (th && view.scale > 1.8 && th.zones?.length) {
        thLeg.hidden = false;
        thLeg.innerHTML = `
          <div class="fox-th-date">${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase()}</div>
          ${th.zones
            .map(
              (z) =>
                `<div class="fox-th-row"><span class="swatch" style="background:${z.fill}"></span>${esc(z.name)}</div>`
            )
            .join("")}
          <div class="fox-th-row"><span class="swatch" style="background:${th.fill}"></span>${esc(th.name)} BASE</div>`;
      } else {
        thLeg.hidden = true;
        thLeg.innerHTML = "";
      }
    }
  }

  function badgeText() {
    const n = markersData.length;
    const ship = showShipping ? " · LANES" : "";
    const lab = showLabels ? " · LABELS" : "";
    return `${n} SIG${ship}${lab}`;
  }

  function rebuildControls(el) {
    let ctrl = el.querySelector(".map3d-ctrl");
    if (!ctrl) {
      ctrl = document.createElement("div");
      ctrl.className = "map3d-ctrl";
      el.appendChild(ctrl);
    }
    ctrl.innerHTML = `
      <button type="button" data-act="reset" title="Reset view">⌂</button>
      <button type="button" data-act="zoomIn" title="Zoom in">+</button>
      <button type="button" data-act="zoomOut" title="Zoom out">−</button>
      <button type="button" data-act="labels" title="Signal labels / descriptions" class="${showLabels ? "active" : ""}">LABELS</button>
      <button type="button" data-act="shipping" title="Shipping lanes" class="${showShipping ? "active" : ""}">LANES</button>
      <span class="map3d-badge" id="mapBadge">${badgeText()}</span>`;
  }

  function setBasemap(kind) {
    if (!BASEMAPS.find((b) => b.id === kind)) return;
    basemap = kind;
    try {
      Storage.set("map_basemap", basemap);
    } catch {
      /* */
    }
    if (containerEl) {
      containerEl.querySelectorAll("[data-basemap]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.basemap === basemap);
      });
      paint();
    }
  }

  function setShippingVisible(on) {
    showShipping = !!on;
    if (containerEl) {
      containerEl.querySelector('[data-act="shipping"]')?.classList.toggle("active", showShipping);
      paint();
    }
  }

  function advanceTankers() {
    if (typeof TANKER_TRACKERS === "undefined" || !TANKER_TRACKERS.length) return;
    TANKER_TRACKERS.forEach((t) => {
      const step = t.status === "delayed" || t.status === "reroute" ? 0.004 : 0.01;
      t.progress = ((Number(t.progress) || 0) + step) % 1;
    });
    if (ready && showShipping) paint();
  }

  function clampView() {
    view.scale = Math.max(0.85, Math.min(8, view.scale));
    view.cy = Math.max(-70, Math.min(80, view.cy));
    // wrap lon
    if (view.cx > 180) view.cx -= 360;
    if (view.cx < -180) view.cx += 360;
  }

  function flyTo(lon, lat, zoom = 4) {
    // Map zoom levels ~1–8 → scale
    const z = Number(zoom) || 4;
    view.cx = Number(lon) || 0;
    view.cy = Number(lat) || 0;
    view.scale = Math.max(0.9, Math.min(7.5, z * 0.85));
    clampView();
    // Update headline from nearest country/hotspot
    if (typeof COUNTRIES !== "undefined") {
      let best = null;
      let bestD = 1e9;
      COUNTRIES.forEach((c) => {
        if (!c.code || c.code === "GLOBAL") return;
        const d = Math.hypot(c.lon - view.cx, c.lat - view.cy);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      });
      if (best && bestD < 25) {
        focusTitle = best.name.toUpperCase();
        const bits = [];
        if (best.region) bits.push(best.region);
        if (best.risk != null) bits.push(`RISK ${best.risk}`);
        focusSub = bits.join(" · ");
      }
    }
    paint();
  }

  function syncSizeFromDom() {
    if (!containerEl) return;
    const r = containerEl.getBoundingClientRect();
    const cw = Math.max(280, Math.floor(r.width || 800));
    const ch = Math.max(220, Math.floor(r.height || 400));
    // Internal resolution tracks container aspect so map always fills the window
    const base = 1000;
    W = base;
    H = Math.max(360, Math.round(base * (ch / cw)));
    const svg = containerEl.querySelector("#worldMap");
    if (svg) {
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
    }
  }

  function resize() {
    syncSizeFromDom();
    paint();
  }

  function init(container, opts = {}) {
    onSelect = opts.onSelect || null;
    const el = typeof container === "string" ? document.getElementById(container) : container;
    if (!el) {
      console.warn("Map3D.init: container not found", container);
      return false;
    }
    containerEl = el;
    basemap = "broadcast";

    el.className = (el.className || "").replace(/\bfox-map-root\b/g, "").trim() + " fox-map-root map-host";
    el.style.cssText =
      "position:relative;width:100%;height:100%;min-height:100%;overflow:hidden;background:#050a12;display:block;flex:1 1 auto;";

    el.innerHTML = `
      <div class="map-wrap fox-map" style="position:absolute;inset:0;width:100%;height:100%;overflow:hidden;background:#020810;">
        <svg id="worldMap" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="World map" style="position:absolute;inset:0;width:100%;height:100%;display:block;background:#020810;"></svg>
        <div class="map3d-ctrl"></div>
        <div class="fox-legend-panel" id="foxLegend"></div>
        <div class="fox-theater-leg" id="foxTheaterLeg" hidden></div>
        <div class="map-coords mono" id="mapCoords">LAT — · LON —</div>
      </div>`;

    rebuildControls(el);
    mode = "broadcast";
    ready = true;
    syncSizeFromDom();
    const svg0 = el.querySelector("#worldMap");
    if (svg0 && !svg0.childNodes.length) {
      svg0.innerHTML = `<rect width="${W}" height="${H}" fill="#0a1e30"/><text x="24" y="40" fill="#7ec8e8" font-size="14" font-family="monospace">LOADING MAP…</text>`;
    }
    paint();

    if (resizeObs) {
      try {
        resizeObs.disconnect();
      } catch {
        /* */
      }
    }
    if (typeof ResizeObserver !== "undefined") {
      resizeObs = new ResizeObserver(() => {
        clearTimeout(paintRaf);
        paintRaf = 0;
        resize();
      });
      resizeObs.observe(el);
    }

    // Controls
    el.querySelector(".map3d-ctrl")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      if (btn.dataset.basemap) {
        setBasemap(btn.dataset.basemap);
        return;
      }
      if (btn.dataset.act === "reset") {
        view = { cx: 20, cy: 18, scale: 1 };
        focusTitle = "";
        focusSub = "";
        paint();
      }
      if (btn.dataset.act === "zoomIn") {
        view.scale *= 1.25;
        clampView();
        paint();
      }
      if (btn.dataset.act === "zoomOut") {
        view.scale /= 1.25;
        clampView();
        paint();
      }
      if (btn.dataset.act === "labels") {
        showLabels = !showLabels;
        btn.classList.toggle("active", showLabels);
        paint();
      }
      if (btn.dataset.act === "shipping") {
        setShippingVisible(!showShipping);
      }
    });

    // Pan / zoom
    const wrap = el.querySelector(".fox-map");
    const svg = el.querySelector("#worldMap");

    wrap.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * W;
        const my = ((e.clientY - rect.top) / rect.height) * H;
        const [lon0, lat0] = unproject(mx, my);
        const factor = e.deltaY > 0 ? 0.9 : 1.12;
        view.scale *= factor;
        clampView();
        const [lon1, lat1] = unproject(mx, my);
        view.cx += lon0 - lon1;
        view.cy += lat0 - lat1;
        clampView();
        paint();
      },
      { passive: false }
    );

    wrap.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.target.closest(".fox-callout-box")) return;
      drag = { x: e.clientX, y: e.clientY, cx: view.cx, cy: view.cy };
      wrap.setPointerCapture?.(e.pointerId);
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const rect = svg.getBoundingClientRect();
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      // Convert pixel drag to lon/lat at current scale
      const dLon = -(dx / rect.width) * (360 / view.scale);
      const dLat = (dy / rect.height) * (180 / view.scale);
      view.cx = drag.cx + dLon;
      view.cy = drag.cy + dLat;
      clampView();
      paintSoon();
    });
    const endDrag = () => {
      drag = null;
    };
    wrap.addEventListener("pointerup", endDrag);
    wrap.addEventListener("pointercancel", endDrag);

    if (tankerTimer) clearInterval(tankerTimer);
    tankerTimer = setInterval(advanceTankers, 8000);

    return true;
  }

  function setMarkers(list) {
    markersData = list || [];
    if (ready) paint();
  }

  function getMode() {
    return mode;
  }
  function getBasemap() {
    return basemap;
  }

  function destroy() {
    clearTimeout(spinTimer);
    clearInterval(tankerTimer);
    spinning = false;
    ready = false;
    mode = "none";
    if (resizeObs) {
      try {
        resizeObs.disconnect();
      } catch {
        /* */
      }
      resizeObs = null;
    }
    if (containerEl) {
      containerEl.innerHTML = "";
      containerEl.classList.remove("fox-map-root");
    }
    containerEl = null;
  }

  return {
    init,
    setMarkers,
    flyTo,
    resize,
    getMode,
    getBasemap,
    setBasemap,
    setShippingVisible,
    getShippingVisible: () => showShipping,
    destroy,
    available,
    BASEMAPS,
  };
})();
