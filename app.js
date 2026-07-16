/**
 * WMT Intelligence Terminal — orchestrator
 */
(() => {
  "use strict";

  const state = {
    layers: Object.fromEntries(LAYERS.map((l) => [l.id, l.on])),
    timeRange: "24h",
    search: "",
    stream: "multi",
    domain: "all",
    country: "",
    instrument: "",
    scenario: "baseline",
    lens: "overview",
    hotspots: HOTSPOTS.map((h) => ({ ...h })),
    indicators: [],
    mapReady: false,
    viewMode: "desktop", // desktop | mobile
    familyProfile: "family",
    movePriority: "overall",
    compareCodes: ["USA", "DEU", "SWE"],
    deferredInstall: null,
    regionGroup: "all", // REGION_GROUPS id
    develFilter: "all", // all | developed | developing
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  function relTime(ts) {
    if (!ts) return "—";
    const d = Date.now() - ts;
    if (d < 6e4) return Math.max(1, Math.round(d / 1e3)) + "s";
    if (d < 36e5) return Math.round(d / 6e4) + "m";
    if (d < 864e5) return Math.round(d / 36e5) + "h";
    return Math.round(d / 864e5) + "d";
  }
  function matchSearch(text) {
    if (!state.search) return true;
    return (text || "").toLowerCase().includes(state.search);
  }
  function countryOk(item) {
    if (!state.country) return true;
    const codes = item.countries || item.countryCodes || [];
    if (!codes.length) return true;
    return codes.includes(state.country);
  }
  function domainOk(item) {
    if (state.domain === "all") return true;
    const doms = item.domains || [];
    if (!doms.length && item.layer) {
      const layer = LAYERS.find((l) => l.id === item.layer);
      return !layer?.domain || layer.domain === state.domain || layer.domain === "geo";
    }
    return doms.includes(state.domain) || doms.includes("all");
  }
  function scoreColor(s) {
    if (s >= 85) return "#ff3b30";
    if (s >= 70) return "#ff6b1a";
    if (s >= 55) return "#f5a623";
    if (s >= 40) return "#4a9eff";
    return "#00c853";
  }
  function empty(t, h) {
    return `<div class="w-empty"><strong>${t}</strong><span>${h || ""}</span></div>`;
  }

  function tickClock() {
    const n = new Date();
    $("#clock").textContent = [n.getUTCHours(), n.getUTCMinutes(), n.getUTCSeconds()]
      .map((x) => String(x).padStart(2, "0"))
      .join(":");
  }

  // ── Focus chrome ──
  function scopedCountries() {
    if (typeof countriesInScope === "function") {
      return countriesInScope(state.regionGroup || "all", state.develFilter || "all");
    }
    return COUNTRIES.filter((c) => c.code && c.code !== "GLOBAL");
  }

  function riskColor(r) {
    if (r >= 75) return "#ff3b30";
    if (r >= 55) return "#ff6b1a";
    if (r >= 40) return "#f5a623";
    return "#00c853";
  }
  function stabilityColor(s) {
    if (s >= 65) return "#00c853";
    if (s >= 50) return "#f5a623";
    if (s >= 35) return "#ff9800";
    return "#ff5252";
  }

  function countryRiskStability(code) {
    const risk = typeof countryRiskScore === "function" ? countryRiskScore(code) : 40;
    const stability =
      typeof countryStabilityScore === "function" ? countryStabilityScore(code) : Math.max(5, 100 - risk);
    const travel =
      typeof travelAdviceForRisk === "function"
        ? travelAdviceForRisk(risk)
        : { level: "watch", label: "Travel — check advice", tip: "" };
    const devel =
      typeof isDevelopedCountry === "function" && isDevelopedCountry(code) ? "Developed" : "Developing";
    return { risk, stability, travel, devel };
  }

  function scopeBanner() {
    const rg = (typeof REGION_GROUPS !== "undefined" ? REGION_GROUPS : []).find((g) => g.id === state.regionGroup);
    const regionLabel = rg?.name || "All regions";
    const develLabel =
      state.develFilter === "developed"
        ? "Developed economies"
        : state.develFilter === "developing"
          ? "Developing / emerging"
          : "All economies";
    const n = scopedCountries().length;
    return `${regionLabel} · ${develLabel} · ${n} countries in list`;
  }

  function populateRegionSelect() {
    const rs = $("#regionSelect");
    if (!rs || typeof REGION_GROUPS === "undefined") return;
    rs.innerHTML = REGION_GROUPS.map(
      (g) => `<option value="${g.id}">${g.name}</option>`
    ).join("");
    rs.value = state.regionGroup || "all";
  }

  function populateCountrySelect() {
    const cs = $("#countrySelect");
    if (!cs) return;
    const prev = state.country;
    const list = scopedCountries();
    // Group by sub-region for easier scanning (all countries listed)
    const byRegion = {};
    list.forEach((c) => {
      const r = c.region || "Other";
      if (!byRegion[r]) byRegion[r] = [];
      byRegion[r].push(c);
    });
    const regionKeys = Object.keys(byRegion).sort((a, b) => a.localeCompare(b));
    let html = `<option value="">Global / whole region (${list.length})</option>`;
    regionKeys.forEach((rk) => {
      html += `<optgroup label="${rk} (${byRegion[rk].length})">`;
      byRegion[rk]
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((c) => {
          html += `<option value="${c.code}">${c.name}</option>`;
        });
      html += `</optgroup>`;
    });
    cs.innerHTML = html;
    // Keep selection if still in scope; else clear
    if (prev && list.some((c) => c.code === prev)) {
      cs.value = prev;
      state.country = prev;
    } else {
      cs.value = "";
      if (prev && !list.some((c) => c.code === prev)) state.country = "";
    }
  }

  function populateSelectors() {
    populateRegionSelect();
    const ds = $("#develSelect");
    if (ds) ds.value = state.develFilter || "all";
    populateCountrySelect();
    const is = $("#instrumentSelect");
    is.innerHTML =
      `<option value="">All instruments</option>` +
      INSTRUMENTS.map((i) => `<option value="${i.sym}">${i.sym} — ${i.name}</option>`).join("");
    const ss = $("#scenarioSelect");
    ss.innerHTML = SCENARIOS.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
    const ls = $("#lensSelect");
    if (ls) {
      ls.innerHTML = LENSES.map((l) => `<option value="${l.id}">${l.name}</option>`).join("");
      ls.value = state.lens;
    }

    $("#domainPills").innerHTML = DOMAINS.map(
      (d) =>
        `<button type="button" class="domain-pill ${d.id === state.domain ? "active" : ""}" data-domain="${d.id}"
        data-tip="${d.tip}"
        data-preview-title="${d.label} domain"
        data-preview="${d.tip} — opens emphasis for this desk domain across map layers and events.">${d.label}</button>`
    ).join("");

    populateDeskNav();
  }

  function populateDeskNav() {
    const host = $("#deskNav");
    if (!host) return;
    const desks = typeof DESK_CATALOG !== "undefined" ? DESK_CATALOG : [];
    const view = Layout.getView?.() || "command";
    host.innerHTML = desks
      .map(
        (d) => `<button type="button" class="nav-item ${d.id === view ? "active" : ""}" data-view="${d.id}"
        data-preview-title="${UI.esc(d.title)} desk"
        data-preview="${UI.esc(d.preview || d.desc)}"
        data-tip="${UI.esc(d.desc)}">
        <span class="nav-ico">${d.icon || "·"}</span>
        <span class="nav-txt">${UI.esc(d.title)}</span>
        <span class="nav-hint">${UI.esc(d.blurb || "")}</span>
      </button>`
      )
      .join("");
    host.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.view));
    });
  }

  /** News filtered by country + lens (newest first) */
  function filterNews(items) {
    let list = [...(items || [])];
    if (state.search) {
      list = list.filter((n) => matchSearch((n.title || "") + (n.source || "") + (n.summary || "")));
    }
    const countryKeys =
      state.country && typeof COUNTRY_NEWS_KEYS !== "undefined" ? COUNTRY_NEWS_KEYS[state.country] || [] : [];
    const cName = state.country
      ? (COUNTRIES.find((c) => c.code === state.country)?.name || "").toLowerCase()
      : "";
    if (countryKeys.length || cName) {
      const keys = [...countryKeys, cName].filter(Boolean).map((k) => k.toLowerCase());
      const filtered = list.filter((n) => {
        const t = ((n.title || "") + " " + (n.summary || "")).toLowerCase();
        return keys.some((k) => k && t.includes(k));
      });
      if (filtered.length) list = filtered;
    }
    const lensKeys =
      state.lens && state.lens !== "overview" && typeof LENS_NEWS_KEYS !== "undefined"
        ? LENS_NEWS_KEYS[state.lens] || []
        : [];
    if (lensKeys.length) {
      const filtered = list.filter((n) => {
        const t = ((n.title || "") + " " + (n.summary || "")).toLowerCase();
        return lensKeys.some((k) => t.includes(k));
      });
      // keep country hits even if lens empty — only prefer lens filter when it returns results
      if (filtered.length) list = filtered;
    }
    return list.sort((a, b) => (b.published || 0) - (a.published || 0));
  }

  /** Symbols for market board from lens + country */
  function marketBasket() {
    const lens = state.lens || "overview";
    let syms = [...(LENS_MARKET_BASKETS[lens] || LENS_MARKET_BASKETS.overview)];
    if (state.country && COUNTRY_MARKET_EXTRA[state.country]) {
      syms = [...COUNTRY_MARKET_EXTRA[state.country], ...syms];
    }
    if (state.instrument) syms.unshift(state.instrument);
    return [...new Set(syms)];
  }

  function marketBySym(sym) {
    return (Feeds.getState().markets || MARKETS_SEED).find((m) => m.sym === sym);
  }

  function intelCtx() {
    return {
      indicators: state.indicators,
      country: state.country,
      scenario: state.scenario,
      lens: state.lens,
      news: Feeds.getState().news,
      markets: Feeds.getState().markets,
      hotspots: state.hotspots,
      theaters: THEATERS,
      quakes: Feeds.getState().quakes,
      eonet: Feeds.getState().eonet,
      factors: state.indicators.find((i) => i.id === "kmri")?.factors,
    };
  }

  function updateFocusChrome() {
    const meta = VIEW_META[Layout.getView()] || VIEW_META.command;
    $("#viewTitle").textContent = meta.title;
    $("#viewDesc").textContent = meta.desc;
    const c = COUNTRIES.find((x) => x.code === state.country);
    const inst = INSTRUMENTS.find((x) => x.sym === state.instrument);
    const scen = SCENARIOS.find((s) => s.id === state.scenario);
    const lens = LENSES.find((l) => l.id === state.lens);
    $("#viewPill").textContent = c ? c.code : "GLOBAL";
    const lensPill = $("#lensPill");
    if (lensPill) lensPill.textContent = (lens?.name || "OVERVIEW").toUpperCase();
    const kmri = state.indicators.find((i) => i.id === "kmri");
    const spi = state.indicators.find((i) => i.id === "spi");
    $("#modelPill").textContent = kmri
      ? `KMRI ${kmri.value}${spi != null ? ` · SPI ${spi.value}` : ""}`
      : "KMRI —";
    $("#navFoot").textContent = kmri ? `KMRI ${kmri.value}` : "KMRI —";

    const path = $("#viewPath");
    if (path) {
      path.textContent = [
        c ? c.name.toUpperCase() : "GLOBAL",
        (lens?.name || "Overview").toUpperCase(),
        (scen?.name || "Baseline").toUpperCase(),
      ].join(" · ");
    }

    const chip = $("#focusChip");
    const parts = [];
    if (c) parts.push(c.name);
    const rg = (typeof REGION_GROUPS !== "undefined" ? REGION_GROUPS : []).find((g) => g.id === state.regionGroup);
    if (rg && rg.id !== "all") parts.push(rg.short || rg.name);
    if (state.develFilter === "developed") parts.push("Developed");
    if (state.develFilter === "developing") parts.push("Developing");
    if (lens && lens.id !== "overview") parts.push(lens.name);
    if (inst) parts.push(inst.sym);
    if (scen && scen.id !== "baseline") parts.push(scen.name);
    if (state.domain !== "all") parts.push(state.domain.toUpperCase());
    if (parts.length) {
      chip.hidden = false;
      $("#focusChipText").textContent = parts.join(" · ");
    } else chip.hidden = true;
  }

  function applyCountryFocus() {
    const c = COUNTRIES.find((x) => x.code === state.country);
    if (c && c.code !== "GLOBAL") {
      Map3D.flyTo(c.lon, c.lat, c.zoom || 4);
      UI.toast(`Focus · ${c.name}`);
    } else {
      Map3D.flyTo(20, 18, 1.5);
    }
    refreshAllPanels();
  }

  // ── Map markers ──
  /** Layer on/off only — map always shows every enabled layer worldwide (no country hide). */
  function layerOn(id) {
    return state.layers[id] !== false;
  }

  function buildMarkers() {
    const list = [];
    // Static catalog markers: respect layer toggles only (ignore country focus)
    MARKERS.filter((m) => layerOn(m.layer)).forEach((m) => {
      list.push({ ...m, color: layerColor(m) });
    });
    // Live quakes → Natural Hazards layer
    if (layerOn("natural")) {
      (Feeds.getState().quakes || []).slice(0, 40).forEach((q) => {
        list.push({
          id: "q_" + q.id,
          layer: "natural",
          sev: q.sev,
          lat: q.lat,
          lon: q.lon,
          title: q.title || `M${q.mag}`,
          desc: `Live USGS. Depth ${q.depth?.toFixed?.(1) ?? q.depth} km.`,
          source: "USGS",
          time: relTime(q.time) + " ago",
          link: q.url,
          live: true,
          color: "#8bc34a",
        });
      });
    }
    // Live EONET → Disasters layer
    if (layerOn("disasters")) {
      (Feeds.getState().eonet || []).forEach((ev) => {
        if (!ev.lat && !ev.lon) return;
        list.push({
          id: "eo_" + ev.id,
          layer: "disasters",
          sev: ev.sev,
          lat: ev.lat,
          lon: ev.lon,
          title: ev.title,
          desc: `NASA EONET · ${ev.category}`,
          source: "EONET",
          time: relTime(ev.date) + " ago",
          link: ev.link,
          live: true,
          color: "#80cbc4",
        });
      });
    }
    return list;
  }

  function layerColor(m) {
    const L = LAYERS.find((l) => l.id === m.layer);
    if (L) return L.color;
    return "#f5a623";
  }

  function pushMarkers() {
    Map3D.setMarkers(buildMarkers());
  }

  function onMarkerSelect(props) {
    UI.openDrawer({
      type: (props.layer || "SIGNAL").toUpperCase(),
      title: props.title,
      sev: props.sev === "crit" ? "critical" : props.sev || "info",
      meta: [
        ["LAYER", (props.layer || "").toUpperCase()],
        ["SOURCE", props.source || "—"],
        ["TIME", props.time || "—"],
      ],
      body: props.desc || "Map signal.",
      link: props.link,
    });
  }

  function ensureMap() {
    const el = Layout.bodyEl("map");
    if (!el) return;
    const hasMap = el.querySelector("#mapHost") || el.querySelector("#maplibre-root") || el.querySelector(".map-wrap");
    if (!hasMap) {
      try {
        Map3D.destroy?.();
      } catch {
        /* */
      }
      el.innerHTML = `<div class="map-host" id="mapHost"></div>`;
      // map body should fill widget without padding constraint
      el.style.padding = "0";
      Map3D.init("mapHost", { onSelect: onMarkerSelect });
      state.mapReady = true;
    }
    pushMarkers();
    if (Layout.metaEl("map")) {
      const bm = Map3D.getBasemap?.() || "hybrid";
      Layout.metaEl("map").textContent =
        Map3D.getMode() === "globe" ? `3D · ${bm.toUpperCase()}` : Map3D.getMode().toUpperCase();
    }
    Map3D.resize();
  }

  // ── Panels ──
  function refreshAllPanels() {
    fillLayers();
    ensureMap();
    fillAlerts();
    fillHotspots();
    fillIndicators();
    fillKmri();
    fillMarkets();
    fillCommodities();
    fillEnergy();
    fillNews();
    fillTheaters();
    fillCII();
    fillCountry();
    fillInstrument();
    fillInfra();
    fillTransport();
    fillWeather();
    fillDisasters();
    fillAgriculture();
    fillInsurance();
    fillQuakes();
    fillFeeds();
    fillScenarios();
    fillPolitics();
    fillAnswers();
    fillImplications();
    fillTriad();
    fillPulse();
    fillRadar();
    fillLens();
    fillMktBoard();
    fillMktHero();
    fillCurrencies();
    fillGrocery();
    fillClimate();
    fillImpact();
    fillNewsFocus();
    fillMetals();
    fillSemiconductors();
    fillDatacenters();
    fillTechBrief();
    fillAfford();
    fillAffordRank();
    fillAffordEdu();
    fillAffordHome();
    fillAffordMove();
    fillAffordRisk();
    fillCompare();
    fillInflation();
    fillChipchain();
    fillClimatefood();
    fillFamilyAfford();
    fillMoveTo();
    fillPowerai();
    fillPowerMix();
    fillTelecoms();
    fillOutages();
    fillCritInfra();
    renderTicker();
    renderStream();
    updateFocusChrome();
    updateFeedHealth();
  }

  /** Simple SVG bar series for inflation / growth history */
  function seriesBars(values, opts = {}) {
    const w = opts.w || 280;
    const h = opts.h || 56;
    const pad = 4;
    if (!values?.length) return "";
    const max = Math.max(...values.map(Math.abs), 0.5);
    const bw = (w - pad * 2) / values.length;
    const mid = h / 2;
    const bars = values
      .map((v, i) => {
        const n = Number(v) || 0;
        const bh = (Math.abs(n) / max) * (h - pad * 2) * 0.9;
        const x = pad + i * bw + bw * 0.15;
        const y = n >= 0 ? mid - bh : mid;
        const col = opts.color || (n >= 0 ? "#4a9eff" : "#ff6b1a");
        const proj = opts.projFrom != null && i >= opts.projFrom;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.7).toFixed(1)}" height="${bh.toFixed(
          1
        )}" fill="${col}" opacity="${proj ? 0.45 : 0.9}" rx="1"/>`;
      })
      .join("");
    return `<svg class="series-bars" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${bars}
      <line x1="${pad}" y1="${mid}" x2="${w - pad}" y2="${mid}" stroke="rgba(120,140,180,0.25)" stroke-width="0.6"/>
    </svg>`;
  }

  function inflationProfile(code) {
    const map = typeof INFLATION_PROFILES !== "undefined" ? INFLATION_PROFILES : {};
    if (code && map[code]) return map[code];
    return map.DEFAULT || { hist: [2, 3, 4], current: 2.5, proj: [2.4, 2.3], growthHist: [2, 2], growth: 2, growthProj: [2, 2], note: "Model default." };
  }

  function familyWeights() {
    const list = typeof FAMILY_PROFILES !== "undefined" ? FAMILY_PROFILES : [];
    return list.find((p) => p.id === state.familyProfile) || list[0] || { weights: {} };
  }

  function affordRowFamily(code) {
    const row = affordRow(code);
    if (!row) return null;
    const fw = familyWeights().weights || {};
    const out = { ...row };
    const costKeys = [
      "housing",
      "groceries",
      "utilities",
      "energy",
      "gasFuel",
      "transport",
      "cars",
      "childcare",
      "schoolPublic",
      "schoolPrivate",
      "higherEd",
      "healthcare",
    ];
    let weighted = 0;
    let wsum = 0;
    costKeys.forEach((k) => {
      if (out[k] == null) return;
      const w = fw[k] != null ? fw[k] : 1;
      out[k] = Math.max(5, Math.min(98, Math.round(out[k] * (0.55 + 0.45 * w))));
      weighted += out[k] * w;
      wsum += w;
    });
    if (wsum > 0) {
      const avgCost = weighted / wsum;
      out.affordScore = Math.max(5, Math.min(98, Math.round(100 - avgCost * 0.85 + (row.affordScore - 50) * 0.15)));
    }
    out.familyId = state.familyProfile;
    return out;
  }

  /** Live market nudge on cost categories (0–100 cost) */
  function affordLiveAdj() {
    const markets = Feeds.getState().markets || MARKETS_SEED;
    const dir = (sym) => markets.find((m) => m.sym === sym)?.dir || "flat";
    const nudge = (d) => (d === "up" ? 4 : d === "down" ? -3 : 0);
    return {
      groceries: nudge(dir("WHEAT")) + nudge(dir("FOODX")) + Math.round(nudge(dir("COCOA")) / 2),
      energy: nudge(dir("BRENT")) + nudge(dir("NATGAS")),
      gasFuel: nudge(dir("BRENT")) + Math.round(nudge(dir("WTI")) / 2),
      transport: Math.round(nudge(dir("BRENT")) / 2) + Math.round(nudge(dir("SHIP")) / 2),
      cars: Math.round(nudge(dir("BRENT")) / 2),
      utilities: Math.round(nudge(dir("NATGAS")) / 2),
    };
  }

  function affordRow(code) {
    if (!code || code === "GLOBAL") return null;
    // Always bind to THIS country only (never fall back to Germany/USA)
    const base =
      typeof getAffordProfile === "function"
        ? getAffordProfile(code)
        : typeof AFFORDABILITY !== "undefined"
          ? AFFORDABILITY.find((a) => a.code === code) || null
          : null;
    if (!base || base.code !== code) return null;
    const adj = affordLiveAdj();
    const clamp = (n) => Math.max(5, Math.min(98, n));
    const row = { ...base };
    ["groceries", "energy", "gasFuel", "transport", "cars", "utilities"].forEach((k) => {
      if (row[k] != null) row[k] = clamp(row[k] + (adj[k] || 0));
    });
    const costPush = (adj.groceries || 0) + (adj.energy || 0) + (adj.gasFuel || 0);
    row.affordScore = clamp((base.affordScore || 50) - Math.round(costPush / 3));
    row.live = true;
    return row;
  }

  function selectedCountryCode() {
    return state.country && state.country !== "GLOBAL" ? state.country : "";
  }

  function affordCostColor(cost) {
    if (cost >= 75) return "#ff5252";
    if (cost >= 55) return "#ff9800";
    if (cost >= 40) return "#f5a623";
    return "#00c853";
  }

  function affordScoreColor(score) {
    if (score >= 62) return "#00c853";
    if (score >= 50) return "#f5a623";
    if (score >= 40) return "#ff9800";
    return "#ff5252";
  }

  function regionCountryListHtml(limit = 40) {
    const list = scopedCountries().slice(0, limit);
    if (!list.length) return empty("No countries in filter", "Widen region or economy filter.");
    return `<div class="region-country-list">${list
      .map((c) => {
        const rs = countryRiskStability(c.code);
        const aff = affordRow(c.code);
        const active = state.country === c.code ? " active" : "";
        return `<button type="button" class="rc-row${active}" data-code="${c.code}">
          <span class="rc-name">${UI.esc(c.name)}</span>
          <span class="rc-tag mono">${UI.esc(c.region || "")}</span>
          <span class="rc-m mono" style="color:${riskColor(rs.risk)}" title="Risk">R ${rs.risk}</span>
          <span class="rc-m mono" style="color:${stabilityColor(rs.stability)}" title="Stability">S ${rs.stability}</span>
          <span class="rc-m mono" style="color:${affordScoreColor(aff?.affordScore || 50)}" title="Affordability">A ${
            aff?.affordScore ?? "—"
          }</span>
        </button>`;
      })
      .join("")}</div>
      <p class="afford-foot">${list.length} shown of ${scopedCountries().length} in scope · click to focus</p>`;
  }

  function bindRegionCountryClicks(el) {
    el.querySelectorAll(".rc-row, .ar-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.country = btn.dataset.code;
        if ($("#countrySelect")) $("#countrySelect").value = state.country;
        applyCountryFocus();
      });
    });
  }

  function riskStabilityStrip(code) {
    const rs = countryRiskStability(code);
    return `<div class="rs-strip">
      <div class="rs-box" style="border-color:${riskColor(rs.risk)}">
        <span class="rs-k">RISK</span>
        <span class="rs-v" style="color:${riskColor(rs.risk)}">${rs.risk}</span>
        <span class="rs-l">higher = more stress</span>
      </div>
      <div class="rs-box" style="border-color:${stabilityColor(rs.stability)}">
        <span class="rs-k">STABILITY</span>
        <span class="rs-v" style="color:${stabilityColor(rs.stability)}">${rs.stability}</span>
        <span class="rs-l">higher = calmer</span>
      </div>
      <div class="rs-box travel ${rs.travel.level}">
        <span class="rs-k">TRAVEL</span>
        <span class="rs-v-sm">${UI.esc(rs.travel.label)}</span>
        <span class="rs-l">${UI.esc(rs.travel.tip)}</span>
      </div>
      <div class="rs-box">
        <span class="rs-k">ECONOMY</span>
        <span class="rs-v-sm">${UI.esc(rs.devel)}</span>
        <span class="rs-l">illustrative grouping</span>
      </div>
    </div>`;
  }

  function fillAfford() {
    const el = Layout.bodyEl("afford");
    if (!el) return;
    const code = selectedCountryCode();
    if (!code) {
      Layout.metaEl("afford") && (Layout.metaEl("afford").textContent = "REGION");
      el.innerHTML = `<div class="panel-banner">${UI.esc(
        scopeBanner()
      )} — pick a country for full cost detail, or browse the list</div>
        ${regionCountryListHtml(60)}`;
      bindRegionCountryClicks(el);
      return;
    }
    const row = affordRow(code);
    if (!row) {
      el.innerHTML = empty("No profile", "Could not build affordability for this country.");
      return;
    }
    const cname = COUNTRIES.find((c) => c.code === row.code)?.name || row.code;
    const cats = typeof AFFORD_CATEGORIES !== "undefined" ? AFFORD_CATEGORIES : [];
    const rs = countryRiskStability(code);
    Layout.metaEl("afford") && (Layout.metaEl("afford").textContent = `SCORE ${row.affordScore}`);
    el.innerHTML = `<div class="panel-banner mono">${UI.esc(scopeBanner())} · ${UI.esc(rs.devel)}</div>
      <div class="afford-hero">
        <div>
          <div class="af-label">COST OF LIVING · FULL PICTURE</div>
          <div class="af-title">${UI.esc(cname)} · ${UI.esc(row.city || "")}</div>
          <p class="af-note">${UI.esc(row.note || "")}${
            row.live ? " · Numbers gently follow live food & energy markets." : ""
          }</p>
        </div>
        <div class="af-score-box" style="border-color:${affordScoreColor(row.affordScore)}">
          <span class="af-score-n" style="color:${affordScoreColor(row.affordScore)}">${row.affordScore}</span>
          <span class="af-score-l">Affordability<br/>(higher = easier)</span>
        </div>
      </div>
      ${riskStabilityStrip(code)}
      <div class="afford-legend mono">Cost bars: green = lower cost · red = higher cost for families</div>
      <div class="afford-grid">${cats
        .map((cat) => {
          const v = row[cat.id];
          if (v == null) return "";
          const col = affordCostColor(v);
          return `<div class="afford-cat" data-tip="${UI.esc(cat.tip)}">
            <div class="ac-top"><span>${cat.icon || ""} ${UI.esc(cat.name)}</span><b style="color:${col}">${v}</b></div>
            <div class="ac-bar"><i style="width:${v}%;background:${col}"></i></div>
            <div class="ac-tip">${UI.esc(cat.tip)}</div>
          </div>`;
        })
        .join("")}</div>
      <div class="afford-foot">Includes housing, groceries, utilities, energy, gas/fuel, cars, public transport, public vs private school, university, childcare, and healthcare. Risk &amp; stability are illustrative country models — not official government scores.</div>`;
  }

  function fillAffordRisk() {
    const el = Layout.bodyEl("affordRisk");
    if (!el) return;
    const code = selectedCountryCode();
    const list = scopedCountries()
      .map((c) => {
        const rs = countryRiskStability(c.code);
        const aff = affordRow(c.code);
        return { ...c, ...rs, affordScore: aff?.affordScore ?? 50 };
      })
      .sort((a, b) => b.stability - a.stability);
    Layout.metaEl("affordRisk") &&
      (Layout.metaEl("affordRisk").textContent = code
        ? `R ${countryRiskScore(code)}`
        : `${list.length} NATIONS`);

    if (code) {
      const rs = countryRiskStability(code);
      const c = COUNTRIES.find((x) => x.code === code);
      const peers = list.filter((x) => x.region === c?.region).slice(0, 12);
      el.innerHTML = `<div class="panel-banner">Risk &amp; stability for <b>${UI.esc(
        c?.name || code
      )}</b> · ${UI.esc(scopeBanner())}</div>
        ${riskStabilityStrip(code)}
        <div class="rs-peer-h mono">Peers in ${UI.esc(c?.region || "region")} (same filter)</div>
        <div class="afford-rank-list">${peers
          .map((a, i) => {
            const active = a.code === code ? " active" : "";
            return `<button type="button" class="ar-row${active}" data-code="${a.code}">
              <span class="ar-rank mono">${i + 1}</span>
              <span class="ar-name">${UI.esc(a.name)}</span>
              <span class="ar-score mono" style="color:${riskColor(a.risk)}">R${a.risk}</span>
              <span class="ar-score mono" style="color:${stabilityColor(a.stability)}">S${a.stability}</span>
              <span class="ar-bar"><i style="width:${a.stability}%;background:${stabilityColor(a.stability)}"></i></span>
            </button>`;
          })
          .join("")}</div>
        <p class="afford-foot">${UI.esc(rs.travel.tip)} Illustrative only — check official travel advice.</p>`;
      bindRegionCountryClicks(el);
      return;
    }

    el.innerHTML = `<div class="panel-banner">Risk (R) &amp; stability (S) · ${UI.esc(
      scopeBanner()
    )} · sorted by stability</div>
      <div class="afford-rank-list">${list
        .slice(0, 80)
        .map((a, i) => {
          return `<button type="button" class="ar-row" data-code="${a.code}">
            <span class="ar-rank mono">${i + 1}</span>
            <span class="ar-name">${UI.esc(a.name)} <i class="rc-tag">${UI.esc(a.region || "")}</i></span>
            <span class="ar-score mono" style="color:${riskColor(a.risk)}">R${a.risk}</span>
            <span class="ar-score mono" style="color:${stabilityColor(a.stability)}">S${a.stability}</span>
            <span class="ar-score mono" style="color:${affordScoreColor(a.affordScore)}">A${a.affordScore}</span>
          </button>`;
        })
        .join("")}</div>
      <p class="afford-foot">Higher stability = calmer living environment in the model. Use with affordability when comparing places to live.</p>`;
    bindRegionCountryClicks(el);
  }

  function fillAffordRank() {
    const el = Layout.bodyEl("affordRank");
    if (!el) return;
    const list = scopedCountries()
      .map((c) => {
        const row = affordRow(c.code);
        if (!row) return null;
        const rs = countryRiskStability(c.code);
        return { ...row, name: c.name, region: c.region, risk: rs.risk, stability: rs.stability, devel: rs.devel };
      })
      .filter(Boolean)
      .sort((a, b) => b.affordScore - a.affordScore);
    Layout.metaEl("affordRank") && (Layout.metaEl("affordRank").textContent = `${list.length} PLACES`);
    el.innerHTML = `<div class="panel-banner">Higher affordability score = everyday costs feel easier · ${UI.esc(
      scopeBanner()
    )}</div>
      <div class="afford-rank-list">${list
        .map((a, i) => {
          const active = state.country === a.code ? " active" : "";
          return `<button type="button" class="ar-row${active}" data-code="${a.code}">
            <span class="ar-rank mono">${i + 1}</span>
            <span class="ar-name">${UI.esc(a.name)} <i class="rc-tag">${UI.esc(a.region || "")} · ${UI.esc(
              (a.devel || "").slice(0, 3)
            )}</i></span>
            <span class="ar-score mono" style="color:${affordScoreColor(a.affordScore)}">${a.affordScore}</span>
            <span class="ar-score mono sm" style="color:${riskColor(a.risk)}" title="Risk">R${a.risk}</span>
            <span class="ar-score mono sm" style="color:${stabilityColor(a.stability)}" title="Stability">S${a.stability}</span>
            <span class="ar-bar"><i style="width:${a.affordScore}%;background:${affordScoreColor(a.affordScore)}"></i></span>
          </button>`;
        })
        .join("")}</div>`;
    bindRegionCountryClicks(el);
  }

  function fillAffordEdu() {
    const el = Layout.bodyEl("affordEdu");
    if (!el) return;
    const code = selectedCountryCode();
    if (!code) {
      Layout.metaEl("affordEdu") && (Layout.metaEl("affordEdu").textContent = "REGION");
      el.innerHTML = `<div class="panel-banner">Education costs by country · ${UI.esc(
        scopeBanner()
      )}</div>${regionCountryListHtml(40)}`;
      bindRegionCountryClicks(el);
      return;
    }
    const row = affordRow(code);
    if (!row) return;
    const items = [
      ["schoolPublic", "Public / state school", "Usually the lower-cost path for families."],
      ["schoolPrivate", "Private school", "Higher fees; often chosen for language or class size."],
      ["higherEd", "University / college", "Public vs private tuition differs a lot by country."],
      ["childcare", "Childcare / daycare", "A major cost for working parents of young children."],
    ];
    Layout.metaEl("affordEdu") && (Layout.metaEl("affordEdu").textContent = "EDU");
    el.innerHTML = `<div class="panel-banner">Education &amp; care — public is often cheaper; private and childcare can dominate family budgets</div>
      <div class="afford-edu">${items
        .map(([id, label, tip]) => {
          const v = row[id];
          const col = affordCostColor(v);
          return `<div class="ae-card">
            <div class="ae-top"><strong>${UI.esc(label)}</strong><span style="color:${col}">${v}</span></div>
            <div class="ac-bar"><i style="width:${v}%;background:${col}"></i></div>
            <p>${UI.esc(tip)}</p>
            <p class="ae-read">${
              v >= 70
                ? "This looks expensive for many families."
                : v >= 45
                  ? "Moderate cost — plan ahead."
                  : "Relatively accessible cost for most families."
            }</p>
          </div>`;
        })
        .join("")}</div>
      <p class="afford-foot">Tip: compare public school + public university first; private and childcare are the usual “budget jump.”</p>`;
  }

  function fillAffordHome() {
    const el = Layout.bodyEl("affordHome");
    if (!el) return;
    const code = selectedCountryCode();
    if (!code) {
      Layout.metaEl("affordHome") && (Layout.metaEl("affordHome").textContent = "REGION");
      el.innerHTML = `<div class="panel-banner">Home / utilities · ${UI.esc(
        scopeBanner()
      )} — pick a country for bars</div>${regionCountryListHtml(40)}`;
      bindRegionCountryClicks(el);
      return;
    }
    const row = affordRow(code);
    if (!row) return;
    const items = [
      ["housing", "Housing / rent"],
      ["utilities", "Utilities (water, services)"],
      ["energy", "Home energy (power & heat)"],
      ["groceries", "Groceries"],
    ];
    Layout.metaEl("affordHome") && (Layout.metaEl("affordHome").textContent = "HOME");
    el.innerHTML = `<div class="panel-banner">Home costs — rent, bills, power, and food shopping</div>
      <div class="afford-home">${items
        .map(([id, label]) => {
          const v = row[id];
          const col = affordCostColor(v);
          return `<div class="ah-row">
            <span>${UI.esc(label)}</span>
            <div class="ac-bar grow"><i style="width:${v}%;background:${col}"></i></div>
            <b style="color:${col}">${v}</b>
          </div>`;
        })
        .join("")}</div>
      <p class="afford-foot">Live markets can nudge groceries and energy when wheat, oil, or gas prices move.</p>`;
  }

  function fillAffordMove() {
    const el = Layout.bodyEl("affordMove");
    if (!el) return;
    const code = selectedCountryCode();
    if (!code) {
      Layout.metaEl("affordMove") && (Layout.metaEl("affordMove").textContent = "REGION");
      el.innerHTML = `<div class="panel-banner">Getting around · ${UI.esc(scopeBanner())}</div>${regionCountryListHtml(
        40
      )}`;
      bindRegionCountryClicks(el);
      return;
    }
    const row = affordRow(code);
    if (!row) return;
    const items = [
      ["transport", "Public transport", "Buses, trains, metro — often the family saver."],
      ["gasFuel", "Gas / fuel", "Petrol or diesel at the pump."],
      ["cars", "Owning a car", "Buy, insure, park, and maintain a car."],
    ];
    const brent = marketBySym("BRENT");
    Layout.metaEl("affordMove") && (Layout.metaEl("affordMove").textContent = "MOVE");
    el.innerHTML = `<div class="panel-banner">Getting around — transit, fuel, and cars${
      brent ? ` · Brent oil now ${brent.val} (${brent.chg})` : ""
    }</div>
      <div class="afford-edu">${items
        .map(([id, label, tip]) => {
          const v = row[id];
          const col = affordCostColor(v);
          return `<div class="ae-card">
            <div class="ae-top"><strong>${UI.esc(label)}</strong><span style="color:${col}">${v}</span></div>
            <div class="ac-bar"><i style="width:${v}%;background:${col}"></i></div>
            <p>${UI.esc(tip)}</p>
          </div>`;
        })
        .join("")}</div>
      <p class="afford-foot">Positive path: good public transport lowers the need for a second car and cuts fuel stress.</p>`;
  }

  function fillCompare() {
    const el = Layout.bodyEl("compare");
    if (!el) return;
    const codes = (state.compareCodes || []).filter(Boolean).slice(0, 3);
    while (codes.length < 2) codes.push(codes[0] === "USA" ? "DEU" : "USA");
    if (state.country && !codes.includes(state.country)) {
      codes[0] = state.country;
      state.compareCodes = codes;
    }
    Layout.metaEl("compare") && (Layout.metaEl("compare").textContent = codes.join(" · "));
    const cols = codes.map((code) => {
      const c = COUNTRIES.find((x) => x.code === code);
      const aff = affordRowFamily(code) || affordRow(code);
      const inf = inflationProfile(code);
      const kmri = state.indicators.find((i) => i.id === "kmri");
      const wx = (Feeds.getState().weather || []).find(
        (w) => w.code === code || (c?.name && (w.name || "").toLowerCase() === c.name.toLowerCase())
      );
      const climate =
        typeof CLIMATE_FOOD_BY_REGION !== "undefined"
          ? CLIMATE_FOOD_BY_REGION[c?.region || "World"] || CLIMATE_FOOD_BY_REGION.World
          : null;
      return { code, c, aff, inf, kmri, wx, climate };
    });
    const scopeList = scopedCountries();
    const allForCompare =
      scopeList.length >= 2
        ? scopeList
        : COUNTRIES.filter((c) => c.code && c.code !== "GLOBAL");
    el.innerHTML = `<div class="panel-banner">Side-by-side · ${UI.esc(
      scopeBanner()
    )} · risk, costs, inflation, weather</div>
      <div class="compare-pickers">${[0, 1, 2]
        .map((i) => {
          const code = codes[i] || "";
          const selOpts = allForCompare
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(
              (c) =>
                `<option value="${c.code}"${c.code === code ? " selected" : ""}>${c.name}</option>`
            )
            .join("");
          return `<label class="cmp-pick"><span>Country ${i + 1}</span>
            <select data-cmp-i="${i}">${selOpts}</select></label>`;
        })
        .join("")}</div>
      <div class="compare-table-wrap"><table class="compare-table">
        <thead><tr><th>Signal</th>${cols
          .map((col) => `<th>${UI.esc(col.c?.name || col.code)}</th>`)
          .join("")}</tr></thead>
        <tbody>
          <tr><td>Affordability ↑</td>${cols
            .map((col) => {
              const s = col.aff?.affordScore ?? "—";
              const color = typeof s === "number" ? affordScoreColor(s) : "inherit";
              return `<td style="color:${color}"><b>${s}</b></td>`;
            })
            .join("")}</tr>
          <tr><td>Risk ↓</td>${cols
            .map((col) => {
              const r = countryRiskStability(col.code).risk;
              return `<td style="color:${riskColor(r)}"><b>${r}</b></td>`;
            })
            .join("")}</tr>
          <tr><td>Stability ↑</td>${cols
            .map((col) => {
              const s = countryRiskStability(col.code).stability;
              return `<td style="color:${stabilityColor(s)}"><b>${s}</b></td>`;
            })
            .join("")}</tr>
          <tr><td>Travel advice</td>${cols
            .map((col) => {
              const t = countryRiskStability(col.code).travel;
              return `<td class="cmp-note">${UI.esc(t.label)}</td>`;
            })
            .join("")}</tr>
          <tr><td>Housing cost</td>${cols.map((col) => `<td>${col.aff?.housing ?? "—"}</td>`).join("")}</tr>
          <tr><td>Groceries</td>${cols.map((col) => `<td>${col.aff?.groceries ?? "—"}</td>`).join("")}</tr>
          <tr><td>Public school</td>${cols.map((col) => `<td>${col.aff?.schoolPublic ?? "—"}</td>`).join("")}</tr>
          <tr><td>Childcare</td>${cols.map((col) => `<td>${col.aff?.childcare ?? "—"}</td>`).join("")}</tr>
          <tr><td>Inflation now</td>${cols
            .map((col) => `<td><b>${col.inf.current}%</b></td>`)
            .join("")}</tr>
          <tr><td>Inflation proj Y+1</td>${cols.map((col) => `<td>${col.inf.proj?.[0] ?? "—"}%</td>`).join("")}</tr>
          <tr><td>Real growth now</td>${cols
            .map((col) => `<td style="color:#69f0ae"><b>${col.inf.growth}%</b></td>`)
            .join("")}</tr>
          <tr><td>Growth proj Y+1</td>${cols.map((col) => `<td>${col.inf.growthProj?.[0] ?? "—"}%</td>`).join("")}</tr>
          <tr><td>Weather</td>${cols
            .map((col) => {
              if (col.wx?.temp != null) return `<td>${Math.round(col.wx.temp)}°C</td>`;
              return `<td class="muted">—</td>`;
            })
            .join("")}</tr>
          <tr><td>Climate → food</td>${cols
            .map((col) => `<td class="cmp-note">${UI.esc((col.climate?.tip || "").slice(0, 72))}</td>`)
            .join("")}</tr>
        </tbody>
      </table></div>
      <p class="afford-foot">Illustrative models + live weather/markets when available. Focus country above still drives map & news.</p>`;
    el.querySelectorAll("select[data-cmp-i]").forEach((sel) => {
      const i = Number(sel.dataset.cmpI);
      if (codes[i]) sel.value = codes[i];
      sel.addEventListener("change", () => {
        state.compareCodes = state.compareCodes || ["USA", "DEU", "SWE"];
        state.compareCodes[i] = sel.value;
        fillCompare();
        fillInflation();
      });
    });
  }

  function fillInflation() {
    const el = Layout.bodyEl("inflation");
    if (!el) return;
    const code = selectedCountryCode() || state.compareCodes?.[0] || "USA";
    const cname = COUNTRIES.find((c) => c.code === code)?.name || code;
    const p = inflationProfile(code);
    const hist = [...(p.hist || [])];
    const fullInf = [...hist, p.current, ...(p.proj || [])];
    const fullGr = [...(p.growthHist || []), p.growth, ...(p.growthProj || [])];
    const projFromInf = hist.length + 1;
    const projFromGr = (p.growthHist || []).length + 1;
    Layout.metaEl("inflation") && (Layout.metaEl("inflation").textContent = `${p.current}% · G ${p.growth}%`);
    el.innerHTML = `<div class="panel-banner">Inflation &amp; real growth for <b>${UI.esc(
      cname
    )}</b> — history · current · projected (illustrative model)</div>
      <div class="infl-hero">
        <div class="infl-stat">
          <span class="infl-k">CURRENT CPI-like</span>
          <span class="infl-v" style="color:#ff6b1a">${p.current}<small>%</small></span>
          <span class="infl-s">prices rising this year (model)</span>
        </div>
        <div class="infl-stat">
          <span class="infl-k">PROJECTED Y+1</span>
          <span class="infl-v soft">${p.proj?.[0] ?? "—"}<small>%</small></span>
          <span class="infl-s">then ${p.proj?.[1] ?? "—"}% · ${p.proj?.[2] ?? "—"}%</span>
        </div>
        <div class="infl-stat growth">
          <span class="infl-k">REAL GROWTH NOW</span>
          <span class="infl-v" style="color:#69f0ae">${p.growth}<small>%</small></span>
          <span class="infl-s">economy expanding (model)</span>
        </div>
        <div class="infl-stat growth">
          <span class="infl-k">GROWTH PROJ Y+1</span>
          <span class="infl-v soft" style="color:#a5d6a7">${p.growthProj?.[0] ?? "—"}<small>%</small></span>
          <span class="infl-s">then ${p.growthProj?.[1] ?? "—"}% · ${p.growthProj?.[2] ?? "—"}%</span>
        </div>
      </div>
      <div class="infl-charts">
        <div class="infl-chart-card">
          <div class="infl-chart-h">Inflation history → forecast <span class="mono muted">solid = past · fade = projected</span></div>
          ${seriesBars(fullInf, { color: "#ff6b1a", projFrom: projFromInf, w: 360, h: 64 })}
          <div class="infl-labels mono">${hist
            .map((_, i) => `Y-${hist.length - i}`)
            .concat(["NOW", "Y+1", "Y+2", "Y+3"].slice(0, 1 + (p.proj || []).length))
            .map((l) => `<span>${l}</span>`)
            .join("")}</div>
        </div>
        <div class="infl-chart-card">
          <div class="infl-chart-h">Real growth history → forecast</div>
          ${seriesBars(fullGr, { color: "#69f0ae", projFrom: projFromGr, w: 360, h: 64 })}
          <div class="infl-labels mono">${(p.growthHist || [])
            .map((_, i) => `Y-${(p.growthHist || []).length - i}`)
            .concat(["NOW", "Y+1", "Y+2", "Y+3"].slice(0, 1 + (p.growthProj || []).length))
            .map((l) => `<span>${l}</span>`)
            .join("")}</div>
        </div>
      </div>
      <p class="afford-foot">${UI.esc(p.note || "")} Not official central-bank forecasts — for learning and comparison only.</p>`;
  }

  function fillChipchain() {
    const el = Layout.bodyEl("chipchain");
    if (!el) return;
    const chain = typeof CHIP_CHAIN !== "undefined" ? CHIP_CHAIN : [];
    Layout.metaEl("chipchain") && (Layout.metaEl("chipchain").textContent = "5 STAGES");
    el.innerHTML = `<div class="panel-banner">How a chip is born — design → machines → factories → package → data centers</div>
      <div class="chip-chain">${chain
        .map((n) => {
          const quotes = (n.key || [])
            .map((sym) => {
              const m = marketBySym(sym);
              if (!m) return `<span class="chip-sym mono">${sym}</span>`;
              const col = m.dir === "up" ? "#00c853" : m.dir === "down" ? "#ff5252" : "var(--text-mute)";
              return `<span class="chip-sym mono" style="color:${col}">${sym} ${m.val} <i>${m.chg}</i></span>`;
            })
            .join("");
          return `<div class="chip-node" style="border-color:${n.color}">
            <div class="cn-stage" style="color:${n.color}">${UI.esc(n.stage)}</div>
            <div class="cn-where mono">${UI.esc(n.where)}</div>
            <p>${UI.esc(n.what)}</p>
            <div class="cn-keys">${quotes}</div>
          </div>`;
        })
        .join("")}</div>
      <p class="afford-foot">Live prices when Yahoo legs are up · chip stress often shows first in SOXX, TSM, ASML, NVDA.</p>`;
  }

  function fillClimatefood() {
    const el = Layout.bodyEl("climatefood");
    if (!el) return;
    const c = COUNTRIES.find((x) => x.code === state.country);
    const region = c?.region || "World";
    const map = typeof CLIMATE_FOOD_BY_REGION !== "undefined" ? CLIMATE_FOOD_BY_REGION : {};
    const row = map[region] || map.World || { enso: "—", tip: "—" };
    const foodSyms = ["WHEAT", "CORN", "SOY", "COCOA", "COFFEE", "SUGAR", "RICE"];
    Layout.metaEl("climatefood") && (Layout.metaEl("climatefood").textContent = region.toUpperCase());
    el.innerHTML = `<div class="panel-banner">Climate patterns → food stress · easy language for ${UI.esc(
      c?.name || "the world"
    )} (${UI.esc(region)})</div>
      <div class="cf-grid">
        <div class="cf-card">
          <div class="cf-k">EL NIÑO / SEASON LINK</div>
          <p>${UI.esc(row.enso)}</p>
        </div>
        <div class="cf-card tip">
          <div class="cf-k">WHAT TO WATCH</div>
          <p>${UI.esc(row.tip)}</p>
        </div>
      </div>
      <div class="cf-live mono">Live food tape</div>
      <div class="cf-tape">${foodSyms
        .map((sym) => {
          const m = marketBySym(sym);
          if (!m) return "";
          const col = m.dir === "up" ? "#ff6b1a" : m.dir === "down" ? "#00c853" : "var(--text-mute)";
          return `<div class="cf-tick"><b>${sym}</b><span style="color:${col}">${m.val}</span><i style="color:${col}">${m.chg}</i></div>`;
        })
        .join("")}</div>
      <p class="afford-foot">Positive path: diverse farms, grain reserves, and calm shipping routes ease food price spikes.</p>`;
  }

  function fillFamilyAfford() {
    const el = Layout.bodyEl("familyAfford");
    if (!el) return;
    const code = selectedCountryCode();
    const profiles = typeof FAMILY_PROFILES !== "undefined" ? FAMILY_PROFILES : [];
    if (!code) {
      Layout.metaEl("familyAfford") && (Layout.metaEl("familyAfford").textContent = "REGION");
      el.innerHTML = `<div class="panel-banner">Family profile · ${UI.esc(
        scopeBanner()
      )} — pick a country, then single / couple / family / student</div>
        <div class="fam-pills">${profiles
          .map(
            (p) =>
              `<button type="button" class="fam-pill ${p.id === state.familyProfile ? "active" : ""}" data-fam="${p.id}">${UI.esc(
                p.name
              )}</button>`
          )
          .join("")}</div>
        ${regionCountryListHtml(40)}`;
      el.querySelectorAll(".fam-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.familyProfile = btn.dataset.fam;
          fillFamilyAfford();
          fillMoveTo();
        });
      });
      bindRegionCountryClicks(el);
      return;
    }
    const row = affordRowFamily(code);
    if (!row) return;
    const cname = COUNTRIES.find((c) => c.code === code)?.name || code;
    const cats = typeof AFFORD_CATEGORIES !== "undefined" ? AFFORD_CATEGORIES : [];
    Layout.metaEl("familyAfford") && (Layout.metaEl("familyAfford").textContent = state.familyProfile.toUpperCase());
    el.innerHTML = `<div class="panel-banner">Family profile for <b>${UI.esc(
      cname
    )}</b> — reweights housing, school, childcare, car</div>
      <div class="fam-pills">${profiles
        .map(
          (p) =>
            `<button type="button" class="fam-pill ${p.id === state.familyProfile ? "active" : ""}" data-fam="${p.id}"
            data-tip="${UI.esc(p.desc)}">${UI.esc(p.name)}</button>`
        )
        .join("")}</div>
      <div class="afford-hero compact">
        <div>
          <div class="af-label">PROFILE SCORE</div>
          <div class="af-title">${UI.esc(profiles.find((p) => p.id === state.familyProfile)?.name || "")}</div>
          <p class="af-note">${UI.esc(profiles.find((p) => p.id === state.familyProfile)?.desc || "")}</p>
        </div>
        <div class="af-score-box" style="border-color:${affordScoreColor(row.affordScore)}">
          <span class="af-score-n" style="color:${affordScoreColor(row.affordScore)}">${row.affordScore}</span>
          <span class="af-score-l">for this<br/>household</span>
        </div>
      </div>
      <div class="afford-grid tight">${cats
        .slice(0, 8)
        .map((cat) => {
          const v = row[cat.id];
          if (v == null) return "";
          const col = affordCostColor(v);
          return `<div class="afford-cat">
            <div class="ac-top"><span>${cat.icon || ""} ${UI.esc(cat.name)}</span><b style="color:${col}">${v}</b></div>
            <div class="ac-bar"><i style="width:${v}%;background:${col}"></i></div>
          </div>`;
        })
        .join("")}</div>`;
    el.querySelectorAll(".fam-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.familyProfile = btn.dataset.fam;
        fillFamilyAfford();
        fillMoveTo();
        fillCompare();
        fillAfford();
      });
    });
  }

  function fillMoveTo() {
    const el = Layout.bodyEl("moveTo");
    if (!el) return;
    const prios = typeof MOVE_PRIORITIES !== "undefined" ? MOVE_PRIORITIES : [];
    const prio = prios.find((p) => p.id === state.movePriority) || prios[0];
    const key = prio?.key || "affordScore";
    const invert = !!prio?.invert;
    const list = scopedCountries()
      .map((c) => {
        const row = affordRowFamily(c.code) || affordRow(c.code);
        if (!row) return null;
        const rs = countryRiskStability(c.code);
        return {
          code: c.code,
          name: c.name,
          region: c.region,
          row,
          metric: key === "risk" ? rs.risk : key === "stability" ? rs.stability : row[key] ?? row.affordScore,
          risk: rs.risk,
          stability: rs.stability,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (invert ? a.metric - b.metric : b.metric - a.metric))
      .slice(0, 40);
    Layout.metaEl("moveTo") && (Layout.metaEl("moveTo").textContent = (prio?.name || "rank").toUpperCase().slice(0, 18));
    el.innerHTML = `<div class="panel-banner">Move-to ranking — ${UI.esc(scopeBanner())}</div>
      <div class="move-prios">${prios
        .map(
          (p) =>
            `<button type="button" class="move-prio ${p.id === state.movePriority ? "active" : ""}" data-prio="${p.id}">${UI.esc(
              p.name
            )}</button>`
        )
        .join("")}</div>
      <div class="afford-rank-list">${list
        .map((a, i) => {
          const active = state.country === a.code ? " active" : "";
          const col =
            key === "affordScore" || key === "stability"
              ? key === "stability"
                ? stabilityColor(a.metric)
                : affordScoreColor(a.metric)
              : key === "risk"
                ? riskColor(a.metric)
                : affordCostColor(a.metric);
          return `<button type="button" class="ar-row${active}" data-code="${a.code}">
            <span class="ar-rank mono">${i + 1}</span>
            <span class="ar-name">${UI.esc(a.name)} <i class="rc-tag">${UI.esc(a.region || "")}</i></span>
            <span class="ar-score mono" style="color:${col}">${a.metric}</span>
            <span class="ar-score mono sm" style="color:${riskColor(a.risk)}">R${a.risk}</span>
            <span class="ar-score mono sm" style="color:${stabilityColor(a.stability)}">S${a.stability}</span>
            <span class="ar-bar"><i style="width:${Math.min(100, Math.abs(a.metric))}%;background:${col}"></i></span>
          </button>`;
        })
        .join("")}</div>
      <p class="afford-foot">${
        invert
          ? "Lower number = better for this priority (cheaper / lower risk)."
          : "Higher score = better for this priority."
      } Profile: ${UI.esc(state.familyProfile)}.</p>`;
    el.querySelectorAll(".move-prio").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.movePriority = btn.dataset.prio;
        fillMoveTo();
      });
    });
    bindRegionCountryClicks(el);
  }

  function fillPowerai() {
    const el = Layout.bodyEl("powerai");
    if (!el) return;
    const syms = ["NATGAS", "COPPER", "EQIX", "DLR", "MSFT", "GOOGL", "NVDA", "SOXX"];
    Layout.metaEl("powerai") && (Layout.metaEl("powerai").textContent = "AI POWER");
    el.innerHTML = `<div class="panel-banner">Data centers need power + copper + chips — live links</div>
      <div class="power-grid">${syms
        .map((sym) => {
          const m = marketBySym(sym);
          if (!m) return "";
          const chart =
            typeof Charts !== "undefined" ? Charts.sparkHtml(m, 40) : "";
          const col = m.dir === "up" ? "#00c853" : m.dir === "down" ? "#ff5252" : "var(--text-mute)";
          return `<div class="power-card" data-sym="${sym}">
            <div class="pc-top"><b>${sym}</b><span style="color:${col}">${m.chg}</span></div>
            <div class="pc-val">${m.val}</div>
            <div class="pc-name">${UI.esc(m.name || "")}</div>
            <div class="pc-chart">${chart}</div>
          </div>`;
        })
        .join("")}</div>
      <p class="afford-foot">When gas or copper rises, AI power costs and data-center build-outs can feel the squeeze.</p>`;
    el.querySelectorAll(".power-card").forEach((card) => {
      card.addEventListener("click", () => {
        state.instrument = card.dataset.sym;
        if ($("#instrumentSelect")) $("#instrumentSelect").value = state.instrument;
        updateFocusChrome();
        fillInstrument();
        fillMktHero();
        fillMktBoard();
      });
    });
  }

  function fillLayers() {
    const el = Layout.bodyEl("layers");
    if (!el) return;
    // Always list every layer so map toggles stay complete (selected + non-selected)
    const layers = LAYERS;
    const onCount = layers.filter((l) => state.layers[l.id] !== false).length;
    Layout.metaEl("layers") && (Layout.metaEl("layers").textContent = `${onCount}/${layers.length}`);
    el.innerHTML = `<div class="panel-banner">Map layers · on = visible worldwide · off = hidden · not filtered by country</div>
      <div class="layer-list">${layers
      .map((l) => {
        const on = state.layers[l.id] !== false;
        return `<div class="layer-item ${on ? "on" : ""}" data-layer="${l.id}" title="${on ? "On — showing on map" : "Off — hidden on map"}">
        <span class="swatch" style="background:${l.color}"></span>
        <span class="lname">${l.name}</span>
        <span class="toggle" aria-hidden="true"></span></div>`;
      })
      .join("")}</div>`;
    el.querySelectorAll(".layer-item").forEach((node) => {
      node.addEventListener("click", () => {
        const id = node.dataset.layer;
        state.layers[id] = !(state.layers[id] !== false);
        Storage.set("layers", state.layers);
        fillLayers();
        pushMarkers();
        fillAlerts();
        UI.toast(`Map layer · ${id} · ${state.layers[id] ? "ON" : "OFF"}`);
      });
    });
  }

  function fillAlerts() {
    const el = Layout.bodyEl("alerts");
    if (!el) return;
    const live = (Feeds.getState().quakes || [])
      .filter((q) => q.mag >= 5)
      .slice(0, 3)
      .map((q) => ({
        id: "qa_" + q.id,
        sev: q.mag >= 6 ? "crit" : "high",
        title: `M${q.mag} — ${q.place}`,
        sub: `USGS · ${relTime(q.time)}`,
        layer: "natural",
        link: q.url,
      }));
    const base = ALERTS.filter((a) => state.layers[a.layer] !== false && countryOk(a) && domainOk(a) && matchSearch(a.title));
    const all = [...live, ...base].slice(0, 14);
    Layout.metaEl("alerts") && (Layout.metaEl("alerts").textContent = String(all.length));
    el.innerHTML = all
      .map(
        (a) => `<div class="alert-row"><span class="a-dot ${a.sev}"></span>
      <div><div class="a-title">${UI.esc(a.title)}</div><div class="a-sub">${UI.esc(a.sub)}</div></div></div>`
      )
      .join("");
    el.querySelectorAll(".alert-row").forEach((node, i) => {
      node.addEventListener("click", () => {
        const a = all[i];
        UI.openDrawer({
          type: "ALERT",
          title: a.title,
          sev: a.sev === "crit" ? "critical" : a.sev === "high" ? "high" : "elevated",
          meta: [["LAYER", a.layer || "—"]],
          body: a.sub,
          link: a.link,
        });
      });
    });
  }

  function fillHotspots() {
    const el = Layout.bodyEl("hotspots");
    if (!el) return;
    const list = state.hotspots.filter((h) => countryOk(h) && matchSearch(h.name));
    el.innerHTML = list
      .map((h) => {
        const col = scoreColor(h.score);
        const dir = h.delta > 0 ? "up" : h.delta < 0 ? "down" : "";
        return `<div class="hot-row" data-id="${h.id}">
        <div class="hot-top"><span class="hot-name">${UI.esc(h.name)}</span>
        <span class="hot-score" style="color:${col}">${h.score}</span></div>
        <div class="hot-bar"><i style="width:${h.score}%;background:${col}"></i></div>
        <div class="hot-delta ${dir}">Δ ${h.delta > 0 ? "+" : ""}${h.delta}</div></div>`;
      })
      .join("");
    el.querySelectorAll(".hot-row").forEach((n) => {
      n.addEventListener("click", () => {
        const h = state.hotspots.find((x) => x.id === n.dataset.id);
        if (!h) return;
        UI.openDrawer({
          type: "HOTSPOT",
          title: h.name,
          sev: h.score >= 85 ? "critical" : "high",
          meta: [
            ["SCORE", String(h.score)],
            ["Δ", String(h.delta)],
          ],
          body: "Escalation node used by KMRI / TSI / GSI models.",
        });
        Map3D.flyTo(h.lon, h.lat, 5);
      });
    });
  }

  function recomputeIndicators() {
    state.indicators = Indicators.compute({
      hotspots: state.hotspots,
      news: Feeds.getState().news,
      markets: Feeds.getState().markets,
      theaters: THEATERS,
      alerts: ALERTS,
      quakes: Feeds.getState().quakes,
      eonet: Feeds.getState().eonet,
      weather: Feeds.getState().weather,
      agRegions: AG_REGIONS,
      insurance: INSURANCE_SIGNALS,
      countryCode: state.country,
    });
    fillIndicators();
    fillKmri();
    fillAnswers();
    fillImplications();
    fillTriad();
    fillPulse();
    fillRadar();
    fillImpact();
    updateFocusChrome();
    if (state.stream === "multi" || state.stream === "news" || state.stream === "markets") renderStream();
  }

  function explainText(id) {
    const ex = typeof INDICATOR_EXPLAIN !== "undefined" ? INDICATOR_EXPLAIN[id] : null;
    return ex || null;
  }

  function fillIndicators() {
    const el = Layout.bodyEl("indicators");
    if (!el) return;
    const list = state.indicators.length ? state.indicators : Indicators.compute({});
    state.indicators = list;
    Layout.metaEl("indicators") && (Layout.metaEl("indicators").textContent = `${list.length} MODELS`);
    el.innerHTML = `<div class="ind-intro">Self-developed risk models · click any card for full explanation · edit weights in ⚙</div>
      <div class="ind-grid">${list
        .map((ind) => {
          const col = Indicators.colorFor(ind, ind.value);
          const display = ind.bipolar || ind.id === "ror" ? (ind.value > 0 ? "+" : "") + ind.value : ind.value;
          const barPct = ind.bipolar || ind.id === "ror" ? Math.min(100, Math.abs(ind.value)) : ind.value;
          const spark = (ind.history || []).slice(-14);
          const max = Math.max(...spark.map(Math.abs), 1);
          const flag = ind.flagship ? " flagship" : "";
          const ex = explainText(ind.id);
          const how = ex?.short || ind.desc;
          const read = ex?.read || "";
          return `<div class="ind-card${flag}" data-id="${ind.id}">
        <div class="ind-top"><span class="ind-name">${ind.flagship ? "★ " : ""}${UI.esc(ind.name)}</span>
        <span class="ind-val" style="color:${col}">${display}</span></div>
        <div class="ind-label">${UI.esc(ind.label)}</div>
        <div class="ind-bar"><i style="width:${barPct}%;background:${col}"></i></div>
        <div class="ind-spark">${spark
          .map((v) => `<span style="height:${Math.max(4, (Math.abs(v) / max) * 100)}%;background:${col}"></span>`)
          .join("")}</div>
        <div class="ind-desc"><strong>What:</strong> ${UI.esc(how)}</div>
        ${read ? `<div class="ind-read"><strong>How to read:</strong> ${UI.esc(read)}</div>` : ""}
        <div class="ind-delta mono">Δ ${ind.delta > 0 ? "+" : ""}${ind.delta}</div>
      </div>`;
        })
        .join("")}</div>`;
    el.querySelectorAll(".ind-card").forEach((node) => {
      node.addEventListener("click", () => showIndicator(node.dataset.id));
    });
  }

  function fillKmri() {
    const el = Layout.bodyEl("kmri");
    if (!el) return;
    const kmri = state.indicators.find((i) => i.id === "kmri") || Indicators.getKmri(state.indicators);
    const spi = state.indicators.find((i) => i.id === "spi");
    if (!kmri) {
      el.innerHTML = empty("KMRI loading…", "Computes after first factor pass.");
      return;
    }
    const col = Indicators.colorFor(kmri, kmri.value);
    const f = kmri.factors || {};
    const ex = explainText("kmri");
    const drivers = Object.entries(kmri.weights || {})
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k, w]) => {
        const val = f[k] != null ? f[k].toFixed(0) : "—";
        return `<div class="driver"><span>${k}</span><b>${val}</b><em>w${w}</em></div>`;
      })
      .join("");
    el.innerHTML = `<div class="kmri-hero">
      <div class="kmri-label">★ KMRI · FLAGSHIP</div>
      <div class="kmri-val" style="color:${col}">${kmri.value}</div>
      <div class="kmri-delta">Δ ${kmri.delta > 0 ? "+" : ""}${kmri.delta}${
      spi != null ? ` · SPI ${spi.value} (stability headroom)` : ""
    }</div>
      <div class="ind-bar big"><i style="width:${kmri.value}%;background:${col}"></i></div>
      <p class="ind-explain">${UI.esc(ex?.how || kmri.desc)}</p>
      <p class="ind-read-line"><strong>Read:</strong> ${UI.esc(ex?.read || "Higher = more multi-domain stress.")}</p>
      <div class="driver-grid">${drivers}</div>
      <p class="ind-desc mono">${UI.esc(ex?.color || "")} · click for full breakdown</p>
    </div>`;
    el.onclick = () => showIndicator("kmri");
  }

  function showIndicator(id) {
    const ind = state.indicators.find((x) => x.id === id);
    if (!ind) return;
    const f = ind.factors || {};
    const ex = explainText(id);
    const bodyParts = [
      ex?.short || ind.desc,
      ex?.how ? `How it is built: ${ex.how}` : "",
      ex?.read ? `How to read: ${ex.read}` : "",
      ex?.color ? `Color scale: ${ex.color}` : "",
      "Edit weights under Settings → Indicators. KMRI is protected as flagship.",
    ]
      .filter(Boolean)
      .join("\n\n");
    const sev =
      ind.constructive || ind.id === "spi"
        ? ind.value >= 65
          ? "info"
          : ind.value >= 40
            ? "elevated"
            : "high"
        : ind.bipolar
          ? "info"
          : ind.value >= 75
            ? "critical"
            : ind.value >= 55
              ? "high"
              : "info";
    UI.openDrawer({
      type: "INDICATOR",
      title: `${ind.name} — ${ind.label}`,
      sev,
      meta: [
        ["VALUE", String(ind.value)],
        ["Δ", String(ind.delta)],
        ["TYPE", "Self-developed model"],
        ...Object.entries(ind.weights || {}).map(([k, v]) => [`WEIGHT ${k}`, String(v)]),
        ...Object.entries(f)
          .slice(0, 10)
          .map(([k, v]) => [`FACTOR ${k}`, typeof v === "number" ? v.toFixed(1) : String(v)]),
      ],
      body: bodyParts,
    });
  }

  function liveCount(list) {
    return (list || []).filter((x) => x.source === "live" || x.source === "cache").length;
  }

  function fillMarkets() {
    const el = Layout.bodyEl("markets");
    if (!el) return;
    let m = (Feeds.getState().markets || MARKETS_SEED).filter((x) =>
      ["fx", "rates", "vol", "equity", "crypto", "metals"].includes(x.cls)
    );
    if (state.search) m = m.filter((x) => matchSearch(x.sym + x.name));
    m.forEach((x) => Charts.push(x.sym, x.val));
    const live = liveCount(m);
    Layout.metaEl("markets") &&
      (Layout.metaEl("markets").textContent = live ? `LIVE ${live}/${m.length}` : "SEED");
    el.innerHTML =
      `<div class="panel-banner">Macro tape · ${live} live · Yahoo + CoinGecko + FX APIs · model only for insurance/shipping proxies</div>` +
      marketGrid(m, true);
    bindMktClicks(el, m);
    renderMacroStrip();
  }

  function fillCommodities() {
    const el = Layout.bodyEl("commodities");
    if (!el) return;
    let m = (Feeds.getState().markets || MARKETS_SEED).filter((x) => x.cls === "ag");
    m.forEach((x) => Charts.push(x.sym, x.val));
    Layout.metaEl("commodities") && (Layout.metaEl("commodities").textContent = "AG · FOOD");
    el.innerHTML =
      `<div class="panel-banner">Agricultural goods · softs · daily grocery link</div>` + marketGrid(m, true);
    bindMktClicks(el, m);
  }

  function fillEnergy() {
    const el = Layout.bodyEl("energy");
    if (!el) return;
    const m = (Feeds.getState().markets || MARKETS_SEED).filter((x) => x.cls === "energy");
    m.forEach((x) => Charts.push(x.sym, x.val));
    el.innerHTML =
      `<div class="panel-banner">Energy complex · chokepoint-sensitive</div>` +
      marketGrid(m, true) +
      `<div class="mini-note">Hormuz · Bab el-Mandeb · Black Sea energy adjacency</div>`;
    bindMktClicks(el, m);
  }

  function fillMktBoard() {
    const el = Layout.bodyEl("mktboard");
    if (!el) return;
    const syms = marketBasket();
    const markets = syms.map(marketBySym).filter(Boolean);
    markets.forEach((m) => Charts.push(m.sym, m.val));
    const live = liveCount(markets);
    const lens = LENSES.find((l) => l.id === state.lens);
    const c = COUNTRIES.find((x) => x.code === state.country);
    Layout.metaEl("mktboard") &&
      (Layout.metaEl("mktboard").textContent = `${live}/${markets.length} LIVE · ${c ? c.code : "GLB"}`);
    el.innerHTML = `<div class="mkt-board-head">
        <div>
          <div class="mkt-board-title">MARKET BOARD</div>
          <div class="mkt-board-sub">Basket for <b>${UI.esc(c?.name || "Global")}</b> · lens <b>${UI.esc(
            lens?.name || "Overview"
          )}</b> · <b>${live}</b> live quotes · charts from daily closes</div>
        </div>
        <div class="mkt-board-count mono">${live}/${markets.length} LIVE</div>
      </div>
      <div class="bb-board">${markets.map((m) => Charts.boardCard(m, { focused: state.instrument === m.sym })).join("")}</div>`;
    el.querySelectorAll(".bb-board-card").forEach((card) => {
      card.addEventListener("click", () => {
        state.instrument = card.dataset.sym;
        $("#instrumentSelect").value = state.instrument;
        updateFocusChrome();
        fillMktHero();
        fillInstrument();
        renderMacroStrip();
        fillMktBoard();
      });
    });
  }

  function fillMktHero() {
    const el = Layout.bodyEl("mkthero");
    if (!el) return;
    const sym = state.instrument || marketBasket()[0] || "BRENT";
    const m = marketBySym(sym);
    if (m) Charts.push(m.sym, m.val);
    Layout.metaEl("mkthero") &&
      (Layout.metaEl("mkthero").textContent = m?.source === "live" || m?.source === "cache" ? `${sym} · LIVE` : `${sym}`);
    el.innerHTML = Charts.heroChart(m, `${sym} · ${m?.source === "live" ? "LIVE" : (m?.source || "FOCUS").toUpperCase()}`);
    el.querySelector(".bb-hero")?.addEventListener("click", () => {
      if (m) {
        UI.openDrawer({
          type: "CHART · INSTRUMENT",
          title: `${m.sym} — ${m.name}`,
          sev: "info",
          meta: [
            ["LAST", m.val],
            ["CHG", m.chg],
            ["CLASS", m.cls || "—"],
            ["SOURCE", m.source || "—"],
          ],
          body: "Live mountain chart. Series blends live market legs (when available) with model maintenance so the tape never goes dark.",
        });
      }
    });
  }

  function fillCurrencies() {
    const el = Layout.bodyEl("currencies");
    if (!el) return;
    const m = (Feeds.getState().markets || MARKETS_SEED).filter((x) => x.cls === "fx" || x.sym === "DXY");
    m.forEach((x) => Charts.push(x.sym, x.val));
    Layout.metaEl("currencies") && (Layout.metaEl("currencies").textContent = "FX");
    el.innerHTML = `<div class="panel-banner">Currencies · dollar complex · crosses</div>` + marketGrid(m, true);
    bindMktClicks(el, m);
  }

  function fillGrocery() {
    const el = Layout.bodyEl("grocery");
    if (!el) return;
    const markets = Feeds.getState().markets || MARKETS_SEED;
    const food = ["WHEAT", "CORN", "SOY", "COCOA", "COFFEE", "SUGAR", "RICE", "FOODX", "PALM"];
    const energy = ["BRENT", "NATGAS"];
    const rows = [...food, ...energy]
      .map((sym) => {
        const m = markets.find((x) => x.sym === sym);
        if (!m) return null;
        const dir = m.dir;
        let shop =
          dir === "up"
            ? "This item may push shop prices up later"
            : dir === "down"
              ? "This item may help shop prices ease later"
              : "No strong change signal right now";
        let tone = dir === "up" ? "up" : dir === "down" ? "down" : "flat";
        let constructive =
          dir === "up"
            ? "Tip: try similar foods in season, or buy the size that lasts longer. Stores often change prices weeks after markets move."
            : dir === "down"
              ? "Good news window: if ships and roads stay open, shelves can get a bit easier on the wallet."
              : "Steady day — no rush to change the shopping plan.";
        return { m, shop, tone, constructive };
      })
      .filter(Boolean);
    const upN = rows.filter((r) => r.tone === "up").length;
    const downN = rows.filter((r) => r.tone === "down").length;
    const headline =
      upN > downN + 1
        ? "The next grocery trip may feel a bit more expensive (food or fuel-linked items)."
        : downN > upN + 1
          ? "Good news: several staples are easing — the next shop could feel lighter."
          : "Mixed basket — some items up, some down. Shop smart by category.";
    Layout.metaEl("grocery") && (Layout.metaEl("grocery").textContent = upN > downN ? "FIRMER" : downN > upN ? "EASIER" : "MIXED");
    el.innerHTML = `<div class="grocery-hero ${upN > downN ? "firmer" : downN > upN ? "easier" : "mixed"}">
        <div class="gh-label">GROCERY TRIP SIGNAL</div>
        <div class="gh-head">${UI.esc(headline)}</div>
        <div class="gh-sub">Built from wheat, soft foods, and energy prices. Not a store receipt — a leading household signal everyone can read.</div>
      </div>
      <div class="grocery-list">${rows
        .map(
          (r) => `<div class="grocery-row ${r.tone}">
          <span class="g-sym mono">${r.m.sym}</span>
          <span class="g-val mono">${r.m.val} <i class="${r.tone}">${r.m.chg}</i></span>
          <span class="g-shop">${UI.esc(r.shop)}</span>
          <span class="g-pos">${UI.esc(r.constructive)}</span>
        </div>`
        )
        .join("")}</div>`;
  }

  function fillMetals() {
    const el = Layout.bodyEl("metals");
    if (!el) return;
    const m = (Feeds.getState().markets || MARKETS_SEED).filter((x) => x.cls === "metals");
    m.forEach((x) => Charts.push(x.sym, x.val));
    Layout.metaEl("metals") && (Layout.metaEl("metals").textContent = "METALS");
    el.innerHTML =
      `<div class="panel-banner">Gold · silver · copper · platinum · aluminum — used in jewelry, wires, cars, and data centers</div>` +
      marketGrid(m, true);
    bindMktClicks(el, m);
  }

  function fillSemiconductors() {
    const el = Layout.bodyEl("semiconductors");
    if (!el) return;
    const m = (Feeds.getState().markets || MARKETS_SEED).filter((x) => x.cls === "semi");
    m.forEach((x) => Charts.push(x.sym, x.val));
    Layout.metaEl("semiconductors") && (Layout.metaEl("semiconductors").textContent = "CHIPS");
    el.innerHTML =
      `<div class="panel-banner">Semiconductors = tiny chips in phones, cars, and AI computers. Taiwan, Korea, and Europe matter here.</div>` +
      marketGrid(m, true);
    bindMktClicks(el, m);
  }

  function fillDatacenters() {
    const el = Layout.bodyEl("datacenters");
    if (!el) return;
    const m = (Feeds.getState().markets || MARKETS_SEED).filter((x) => x.cls === "datacenter");
    const power = (Feeds.getState().markets || []).filter((x) => ["NATGAS", "COPPER"].includes(x.sym));
    m.forEach((x) => Charts.push(x.sym, x.val));
    power.forEach((x) => Charts.push(x.sym, x.val));
    Layout.metaEl("datacenters") && (Layout.metaEl("datacenters").textContent = "CLOUD");
    el.innerHTML =
      `<div class="panel-banner">Data centers = big buildings full of computers for cloud and AI. They need lots of power and copper wiring.</div>` +
      marketGrid([...m, ...power], true);
    bindMktClicks(el, [...m, ...power]);
  }

  function fillTechBrief() {
    const el = Layout.bodyEl("techbrief");
    if (!el) return;
    const soxx = marketBySym("SOXX");
    const nvda = marketBySym("NVDA");
    const tsm = marketBySym("TSM");
    const eqix = marketBySym("EQIX");
    const copper = marketBySym("COPPER");
    const gas = marketBySym("NATGAS");
    const chipUp = [soxx, nvda, tsm].filter((x) => x?.dir === "up").length;
    const chipDown = [soxx, nvda, tsm].filter((x) => x?.dir === "down").length;
    const chipStory =
      chipUp > chipDown
        ? "Chip prices are firming — demand for AI and electronics looks strong."
        : chipDown > chipUp
          ? "Chip prices are softer — a calmer moment for buyers, but factories still matter."
          : "Chip prices look mixed — watch Taiwan factories and AI demand together.";
    const dcStory =
      eqix?.dir === "up"
        ? "Data-center companies are firm — cloud and AI need more buildings and power."
        : eqix?.dir === "down"
          ? "Data-center shares are softer — still watch power and copper costs."
          : "Data centers steady — power and copper remain the quiet backbone.";
    const linkStory =
      copper?.dir === "up" || gas?.dir === "up"
        ? "Copper or gas rising can mean higher costs to build and run digital infrastructure — and sometimes higher bills."
        : "Copper and gas look orderly — a helpful backdrop for building chips and cloud capacity.";
    const positive =
      "Positive path: more chip factories in more countries, cleaner power for data centers, and recycling of metals all reduce bottlenecks over time.";
    el.innerHTML = `<div class="tech-brief">
      <div class="tb-label">CHIPS · DATA CENTERS · METALS LINK</div>
      <div class="tb-block"><span>CHIPS</span><p>${UI.esc(chipStory)}</p></div>
      <div class="tb-block"><span>DATA CENTERS</span><p>${UI.esc(dcStory)}</p></div>
      <div class="tb-block"><span>COPPER &amp; POWER</span><p>${UI.esc(linkStory)}</p></div>
      <div class="tb-block pos"><span>POSITIVE PATH</span><p>${UI.esc(positive)}</p></div>
      <div class="impact-tape mono">SOXX ${soxx?.val ?? "—"} · NVDA ${nvda?.val ?? "—"} · TSM ${tsm?.val ?? "—"} · EQIX ${
        eqix?.val ?? "—"
      } · COPPER ${copper?.val ?? "—"} · NATGAS ${gas?.val ?? "—"}</div>
    </div>`;
  }

  function fillClimate() {
    const el = Layout.bodyEl("climate");
    if (!el) return;
    const list = typeof CLIMATE_SIGNALS !== "undefined" ? CLIMATE_SIGNALS : [];
    Layout.metaEl("climate") && (Layout.metaEl("climate").textContent = "ENSO+");
    el.innerHTML = `<div class="panel-banner">Climate · El Niño · seasonal hazards — always with adaptation path</div>
      <div class="climate-list">${list
        .map(
          (c) => `<article class="climate-card">
          <div class="cl-top"><strong>${UI.esc(c.name)}</strong><span class="tposture ${
            c.phase === "elevated" ? "elevated" : c.phase === "critical" ? "critical" : "watch"
          }">${UI.esc(c.phase).toUpperCase()}</span></div>
          <p>${UI.esc(c.note)}</p>
          <div class="cl-row"><span>IMPACT</span><b>${UI.esc(c.impact)}</b></div>
          <div class="cl-row pos"><span>POSITIVE PATH</span><b>${UI.esc(c.positive)}</b></div>
          <div class="cl-reg mono">${UI.esc((c.regions || []).join(" · "))}</div>
        </article>`
        )
        .join("")}</div>`;
  }

  function fillImpact() {
    const el = Layout.bodyEl("impact");
    if (!el) return;
    const kmri = state.indicators.find((i) => i.id === "kmri");
    const spi = state.indicators.find((i) => i.id === "spi");
    const fsi = state.indicators.find((i) => i.id === "fsi");
    const eri = state.indicators.find((i) => i.id === "eri");
    const c = COUNTRIES.find((x) => x.code === state.country);
    const wheat = marketBySym("WHEAT");
    const brent = marketBySym("BRENT");
    const foodx = marketBySym("FOODX");
    const soxx = marketBySym("SOXX");
    const copper = marketBySym("COPPER");
    const political =
      (kmri?.value || 50) >= 65
        ? "Politics feel tense. When leaders talk and keep aid corridors open, stress can ease. Peaceful talks are always a good path."
        : "Politics look manageable. Normal trade and calm talks have room to work.";
    const geoecon =
      (eri?.value || 50) >= 55 || brent?.dir === "up"
        ? "Money and energy: oil or sea routes are tight. That can make fuel and shipping cost more. Using more routes and energy sources helps."
        : "Money and energy look orderly. That supports trade and household fuel costs.";
    const tech =
      soxx?.dir === "up" || copper?.dir === "up"
        ? "Tech: chips or copper are firm — phones, cars, and data centers still need metals and power. Building more factories and cleaner power is the constructive path."
        : "Tech: chips and metals look mixed to calm — a steadier moment for electronics and cloud building.";
    const daily =
      (fsi?.value || 50) >= 55 || wheat?.dir === "up" || foodx?.dir === "up"
        ? "Daily life: some staple foods may get a bit costlier over weeks. Planning meals and choosing in-season food helps families."
        : wheat?.dir === "down" || foodx?.dir === "down"
          ? "Daily life: several food prices are easing — the next grocery trip could feel a little lighter if stores follow markets."
          : "Daily life: no strong grocery shock — a steady week for household planning.";
    const aff = c ? affordRow(c.code) : null;
    const affordLine = aff
      ? `Affordability score ${aff.affordScore}/100 in ${c.name} (higher = easier living costs). Housing ${aff.housing}, groceries ${aff.groceries}, childcare ${aff.childcare}, public school ${aff.schoolPublic}, private school ${aff.schoolPrivate}. Open the Affordability desk for the full list.`
      : "Open the Affordability desk (or pick a country) for housing, school, childcare, transport, gas, and bills.";
    const positive =
      (spi?.value || 50) >= 50
        ? `SPI ${spi?.value ?? "—"} (hope score) is decent — there is room for calmer politics and fairer prices.`
        : "Even when times are hard, other suppliers, open ports, and smart shopping give paths to better outcomes.";
    Layout.metaEl("impact") && (Layout.metaEl("impact").textContent = c ? c.code : "GLOBAL");
    el.innerHTML = `<div class="impact-board">
        <div class="impact-focus mono">${UI.esc(c?.name || "Whole world")} · ${UI.esc(
          (LENSES.find((l) => l.id === state.lens)?.name || "Big picture").toUpperCase()
        )}</div>
        <div class="impact-block pol"><span class="ib-k">POLITICS (who leads, who talks)</span><p>${UI.esc(political)}</p></div>
        <div class="impact-block geo"><span class="ib-k">MONEY &amp; ENERGY</span><p>${UI.esc(geoecon)}</p></div>
        <div class="impact-block geo"><span class="ib-k">CHIPS · DATA CENTERS · METALS</span><p>${UI.esc(tech)}</p></div>
        <div class="impact-block day"><span class="ib-k">DAILY LIFE · GROCERIES &amp; FUEL</span><p>${UI.esc(daily)}</p></div>
        <div class="impact-block day"><span class="ib-k">AFFORDABILITY · PLACE TO LIVE</span><p>${UI.esc(affordLine)}</p></div>
        <div class="impact-block pos"><span class="ib-k">POSITIVE PATH (what can go well)</span><p>${UI.esc(positive)}</p></div>
        <div class="impact-tape mono">WHEAT ${wheat?.val ?? "—"} · BRENT ${brent?.val ?? "—"} · COPPER ${
          copper?.val ?? "—"
        } · SOXX ${soxx?.val ?? "—"} · KMRI ${kmri?.value ?? "—"} · SPI ${spi?.value ?? "—"}</div>
      </div>`;
  }

  function fillNewsFocus() {
    const el = Layout.bodyEl("newsfocus");
    if (!el) return;
    const items = filterNews(Feeds.getState().news || []);
    const c = COUNTRIES.find((x) => x.code === state.country);
    const lens = LENSES.find((l) => l.id === state.lens);
    Layout.metaEl("newsfocus") &&
      (Layout.metaEl("newsfocus").textContent = `${items.length} · ${c ? c.code : "GLB"}`);
    el.innerHTML = `<div class="panel-banner">Filtered to <b>${UI.esc(c?.name || "Global")}</b> · lens <b>${UI.esc(
      lens?.name || "Overview"
    )}</b> · newest first</div>
      ${
        items.length
          ? items
              .slice(0, 40)
              .map(
                (n) => `<div class="news-row ${n.sev === "crit" || n.sev === "high" ? "flash" : ""}" data-id="${n.id}">
          <div class="news-src">${UI.esc(n.source)}${n.cached ? " · CACHE" : ""}</div>
          <div class="news-title">${UI.esc(n.title)}</div>
          <div class="news-meta">${relTime(n.published)} ago</div></div>`
              )
              .join("")
          : empty("No matching headlines", "Widen country/lens or wait for live RSS")
      }`;
    el.querySelectorAll(".news-row").forEach((node) => {
      node.addEventListener("click", () => {
        const n = items.find((x) => x.id === node.dataset.id);
        if (n)
          UI.openDrawer({
            type: "FOCUSED NEWS",
            title: n.title,
            sev: n.sev === "crit" ? "critical" : n.sev === "high" ? "high" : "info",
            meta: [
              ["SOURCE", n.source],
              ["AGE", relTime(n.published)],
              ["FILTER", `${c?.code || "GLOBAL"} · ${lens?.name || "Overview"}`],
            ],
            body: n.summary || "",
            link: n.link,
          });
      });
    });
  }

  function marketGrid(m, withCharts = false) {
    if (withCharts && typeof Charts !== "undefined") {
      return `<div class="bb-board compact">${m
        .map((x) => Charts.boardCard(x, { focused: state.instrument === x.sym, chartH: 44 }))
        .join("")}</div>`;
    }
    return `<div class="market-grid">${m
      .map(
        (x) => `<div class="mkt-cell ${state.instrument === x.sym ? "focused" : ""}" data-sym="${x.sym}">
      <div class="m-sym">${x.sym}${x.source === "live" ? " · L" : ""}</div>
      <div class="m-val">${x.val}</div>
      <div class="m-chg ${x.dir}">${x.chg}</div>
      ${typeof Charts !== "undefined" ? `<div class="m-spark">${Charts.sparkHtml(x, 28)}</div>` : ""}
    </div>`
      )
      .join("")}</div>`;
  }

  function bindMktClicks(el, m) {
    const cards = el.querySelectorAll(".mkt-cell, .bb-board-card");
    cards.forEach((node) => {
      node.addEventListener("click", () => {
        state.instrument = node.dataset.sym;
        $("#instrumentSelect").value = state.instrument;
        updateFocusChrome();
        const item = m.find((x) => x.sym === node.dataset.sym);
        if (item)
          UI.openDrawer({
            type: "INSTRUMENT",
            title: `${item.sym} — ${item.name || ""}`,
            sev: "info",
            meta: [
              ["LAST", item.val],
              ["CHG", item.chg],
              ["CLASS", item.cls || "—"],
              ["SOURCE", item.source || "—"],
              ["UNIT", item.unit || "—"],
            ],
            body: "Live when market APIs allow; otherwise model-maintained with microstructure so coverage never drops. Chart series updates with the tape.",
          });
        fillInstrument();
        fillMktHero();
        fillMktBoard();
        renderMacroStrip();
      });
    });
  }

  function renderMacroStrip() {
    const strip = $("#macroStrip");
    if (!strip) return;
    // Full visible index bar — currencies · energy · ag · risk
    const focus = [
      "SPX",
      "DXY",
      "EURUSD",
      "BTC",
      "BRENT",
      "GOLD",
      "SILVER",
      "COPPER",
      "SOXX",
      "NVDA",
      "TSM",
      "EQIX",
      "VIX",
      "WHEAT",
      "COCOA",
      "NATGAS",
      "FOODX",
      "WARINS",
    ];
    const markets = Feeds.getState().markets || MARKETS_SEED;
    strip.innerHTML = focus
      .map((sym) => {
        const m = markets.find((x) => x.sym === sym) || { sym, val: "—", chg: "—", dir: "flat" };
        return `<div class="macro-chip ${state.instrument === sym ? "active" : ""}" data-sym="${sym}" title="${UI.esc(m.name || sym)}">
        <span class="ms-sym">${sym}</span>
        <span class="ms-val">${m.val}</span>
        <span class="ms-chg ${m.dir}">${m.chg}</span>
      </div>`;
      })
      .join("");
    strip.querySelectorAll(".macro-chip").forEach((c) => {
      c.addEventListener("click", () => {
        state.instrument = c.dataset.sym;
        $("#instrumentSelect").value = state.instrument;
        updateFocusChrome();
        fillInstrument();
        fillMktHero();
        fillMktBoard();
        renderMacroStrip();
      });
    });
  }

  function fillNews() {
    const el = Layout.bodyEl("news");
    if (!el) return;
    const raw = Feeds.getState().news || [];
    const items = filterNews(raw);
    const c = COUNTRIES.find((x) => x.code === state.country);
    const lens = LENSES.find((l) => l.id === state.lens);
    Layout.metaEl("news") && (Layout.metaEl("news").textContent = `${items.length}/${raw.length}`);
    if (!items.length) {
      el.innerHTML = empty("No headlines for filter", "Clear country/lens or wait for live RSS · press R to refresh");
      return;
    }
    el.innerHTML =
      `<div class="panel-banner">News · ${UI.esc(c?.name || "Global")} · ${UI.esc(
        lens?.name || "Overview"
      )} · ${raw.length} live headlines · newest first</div>` +
      items
        .slice(0, 50)
        .map(
          (n) => `<div class="news-row ${n.sev === "crit" || n.sev === "high" ? "flash" : ""}" data-id="${n.id}">
      <div class="news-src">${UI.esc(n.source)}${n.cached ? " · CACHE" : n.live ? " · LIVE" : ""}</div>
      <div class="news-title">${UI.esc(n.title)}</div>
      <div class="news-meta">${relTime(n.published)} ago</div></div>`
        )
        .join("");
    el.querySelectorAll(".news-row").forEach((node) => {
      node.addEventListener("click", () => {
        const n = items.find((x) => x.id === node.dataset.id);
        if (n)
          UI.openDrawer({
            type: "NEWS",
            title: n.title,
            sev: n.sev === "crit" ? "critical" : n.sev === "high" ? "high" : "info",
            meta: [
              ["SOURCE", n.source],
              ["AGE", relTime(n.published)],
              ["FILTER", `${c?.code || "GLOBAL"} · ${lens?.name || "Overview"}`],
            ],
            body: n.summary || "",
            link: n.link,
          });
      });
    });
  }

  function fillTheaters() {
    const el = Layout.bodyEl("theaters");
    if (!el) return;
    let list = THEATERS.filter((t) => matchSearch(t.name));
    if (state.country) list = list.filter((t) => !t.countries?.length || t.countries.includes(state.country));
    el.innerHTML = list
      .map(
        (t) => `<div class="theater-row" data-id="${t.id}">
      <span class="tname">${t.name}</span>
      <span class="tposture ${t.posture}">${t.posture.toUpperCase()}</span>
      <span class="tmeta">${t.note}</span></div>`
      )
      .join("");
    el.querySelectorAll(".theater-row").forEach((n) => {
      n.addEventListener("click", () => {
        const t = THEATERS.find((x) => x.id === n.dataset.id);
        if (!t) return;
        UI.openDrawer({
          type: "THEATER",
          title: t.name,
          sev: t.posture === "critical" ? "critical" : t.posture === "elevated" ? "high" : "watch",
          meta: [["POSTURE", t.posture.toUpperCase()]],
          body: t.note,
        });
      });
    });
  }

  function fillCII() {
    const el = Layout.bodyEl("cii");
    if (!el) return;
    let list = CII;
    if (state.country) {
      const hit = CII.filter((c) => c.code === state.country);
      if (hit.length) list = hit;
      else {
        const c = COUNTRIES.find((x) => x.code === state.country);
        if (c) {
          list = [
            {
              code: c.code,
              name: c.name,
              score: c.risk,
              color: scoreColor(c.risk),
            },
          ];
        }
      }
    }
    el.innerHTML = (list.length ? list : CII)
      .map(
        (c) => `<div class="cii-row"><span class="ccode">${c.code}</span>
      <div class="cii-bar"><i style="width:${c.score}%;background:${c.color || scoreColor(c.score)}"></i></div>
      <span class="cval" style="color:${c.color || scoreColor(c.score)}">${c.score}</span></div>`
      )
      .join("");
  }

  function fillCountry() {
    const el = Layout.bodyEl("country");
    if (!el) return;
    const c = COUNTRIES.find((x) => x.code === state.country) || COUNTRIES[0];
    const related = THEATERS.filter((t) => t.countries?.includes(c.code));
    const alerts = ALERTS.filter((a) => a.countries?.includes(c.code));
    const cii = CII.find((x) => x.code === c.code);
    const aff = c.code && c.code !== "GLOBAL" ? affordRow(c.code) : null;
    el.innerHTML = `<div class="brief">
      <div class="brief-title">${UI.esc(c.name)} <span class="mono">${c.code === "GLOBAL" ? "WORLD" : c.code}</span></div>
      <div class="brief-grid">
        <div><span>Region</span><b>${c.region}</b></div>
        <div><span>Base risk</span><b style="color:${scoreColor(c.risk)}">${c.risk}</b></div>
        <div><span>CII</span><b>${cii ? cii.score : "—"}</b></div>
        <div><span>Affordability</span><b style="color:${aff ? affordScoreColor(aff.affordScore) : "inherit"}">${
          aff ? aff.affordScore : "—"
        }</b></div>
      </div>
      ${
        aff
          ? `<div class="brief-list mono" style="font-size:10px;color:var(--text-mute)">Housing ${aff.housing} · Groceries ${aff.groceries} · Childcare ${aff.childcare} · Public school ${aff.schoolPublic} · Private school ${aff.schoolPrivate} · Fuel ${aff.gasFuel}</div>`
          : ""
      }
      <div class="brief-list">${related.map((t) => `<div>· ${t.name} <em class="${t.posture}">${t.posture}</em></div>`).join("") || "<div>· No linked theaters</div>"}</div>
      <div class="brief-list">${alerts
        .slice(0, 3)
        .map((a) => `<div class="sev-${a.sev}">· ${UI.esc(a.title)}</div>`)
        .join("") || "<div>· No local alerts in catalog</div>"}</div>
      <button type="button" class="btn-ghost full" id="btnFlyCountry">FLY MAP TO COUNTRY</button>
      <button type="button" class="btn-ghost full" id="btnAffordCountry" style="margin-top:6px">OPEN AFFORDABILITY</button>
    </div>`;
    el.querySelector("#btnFlyCountry")?.addEventListener("click", () => {
      if (c.code && c.code !== "GLOBAL") Map3D.flyTo(c.lon, c.lat, c.zoom);
      else Map3D.flyTo(20, 18, 1.5);
    });
    el.querySelector("#btnAffordCountry")?.addEventListener("click", () => setView("afford"));
  }

  function fillInstrument() {
    const el = Layout.bodyEl("instrument");
    if (!el) return;
    const sym = state.instrument || "BRENT";
    const def = INSTRUMENTS.find((i) => i.sym === sym);
    const m = (Feeds.getState().markets || []).find((x) => x.sym === sym);
    if (!def) {
      el.innerHTML = empty("Select an instrument", "Use the INSTRUMENT control above");
      return;
    }
    el.innerHTML = `<div class="brief">
      <div class="brief-title">${def.sym} <span class="mono">${def.name}</span></div>
      <div class="brief-grid">
        <div><span>Last</span><b class="mono">${m?.val ?? def.seed}</b></div>
        <div><span>Change</span><b class="m-chg ${m?.dir || "flat"}">${m?.chg ?? "—"}</b></div>
        <div><span>Class</span><b>${def.cls}</b></div>
        <div><span>Unit</span><b>${def.unit}</b></div>
        <div><span>Source</span><b>${m?.source || "seed"}</b></div>
      </div>
      <p class="ind-desc">Linked models: ${def.cls === "ag" ? "FSI, CPR, KMRI" : def.cls === "energy" ? "ERI, KMRI, TRI" : def.cls === "insurance" ? "IRI, KMRI" : "KMRI, ROR, GSI"}</p>
    </div>`;
  }

  function fillInfra() {
    const el = Layout.bodyEl("infra");
    if (!el) return;
    const events = typeof INFRA_EVENTS !== "undefined" ? INFRA_EVENTS : [];
    const down = events.filter((e) => e.status === "down" || e.status === "degraded").length;
    const warn = events.filter((e) => e.status === "warn").length;
    const iis = state.indicators.find((i) => i.id === "iis");
    Layout.metaEl("infra") && (Layout.metaEl("infra").textContent = iis ? `IIS ${iis.value}` : `${down}↓`);
    el.innerHTML = `<div class="panel-banner">Critical infrastructure snapshot · IIS ${
      iis?.value ?? "—"
    } · ${down} down/degraded · ${warn} warnings</div>
      ${INFRA.map(
        (i) => `<div class="infra-row"><span>${i.icon}</span><span class="i-name">${i.name}</span>
      <span class="i-stat ${i.level}">${i.stat}</span></div>`
      ).join("")}
      <p class="afford-foot">See Power Mix · Telecoms · Outages panels for detail. Open the <b>Power · Net</b> desk for the full view.</p>`;
  }

  function powerMixBars(mix) {
    const parts = [
      ["nuclear", "Nuclear", "#b388ff"],
      ["coal", "Coal", "#8d6e63"],
      ["gas", "Gas", "#ff8a65"],
      ["hydro", "Hydro", "#4fc3f7"],
      ["wind", "Wind", "#69f0ae"],
      ["solar", "Solar", "#ffd54f"],
      ["other", "Other / oil", "#90a4ae"],
    ];
    return parts
      .map(([k, label, col]) => {
        const v = mix[k] ?? 0;
        return `<div class="pm-row">
          <span class="pm-lab">${label}</span>
          <div class="pm-bar"><i style="width:${v}%;background:${col}"></i></div>
          <b class="mono" style="color:${col}">${v}%</b>
        </div>`;
      })
      .join("");
  }

  function fillPowerMix() {
    const el = Layout.bodyEl("powerMix");
    if (!el) return;
    const code = selectedCountryCode();
    if (!code) {
      const list = scopedCountries().slice(0, 36);
      Layout.metaEl("powerMix") && (Layout.metaEl("powerMix").textContent = "REGION");
      el.innerHTML = `<div class="panel-banner">Power mix by country · ${UI.esc(
        scopeBanner()
      )} — pick a country for full stack</div>
        <div class="region-country-list">${list
          .map((c) => {
            const m = typeof getPowerMix === "function" ? getPowerMix(c.code) : {};
            const ren = (m.wind || 0) + (m.solar || 0) + (m.hydro || 0);
            return `<button type="button" class="rc-row" data-code="${c.code}">
              <span class="rc-name">${UI.esc(c.name)}</span>
              <span class="rc-m mono" title="Nuclear">N ${m.nuclear ?? "—"}</span>
              <span class="rc-m mono" title="Coal">C ${m.coal ?? "—"}</span>
              <span class="rc-m mono" title="Renewables hydro+wind+solar">R ${ren}</span>
            </button>`;
          })
          .join("")}</div>`;
      bindRegionCountryClicks(el);
      return;
    }
    const mix = typeof getPowerMix === "function" ? getPowerMix(code) : null;
    if (!mix) {
      el.innerHTML = empty("No power mix", "");
      return;
    }
    const cname = COUNTRIES.find((c) => c.code === code)?.name || code;
    const ren = (mix.wind || 0) + (mix.solar || 0) + (mix.hydro || 0);
    const fossil = (mix.coal || 0) + (mix.gas || 0);
    Layout.metaEl("powerMix") && (Layout.metaEl("powerMix").textContent = `${ren}% REN`);
    el.innerHTML = `<div class="panel-banner">Electricity sources for <b>${UI.esc(
      cname
    )}</b> · illustrative generation shares</div>
      <div class="pm-sum mono">Renewables (hydro+wind+solar) <b>${ren}%</b> · Fossil (coal+gas) <b>${fossil}%</b> · Nuclear <b>${
      mix.nuclear || 0
    }%</b></div>
      <div class="pm-grid">${powerMixBars(mix)}</div>
      <p class="afford-foot">${UI.esc(mix.note || "")} Not official utility data — for comparison and learning.</p>`;
  }

  function fillTelecoms() {
    const el = Layout.bodyEl("telecoms");
    if (!el) return;
    const code = selectedCountryCode();
    if (!code) {
      Layout.metaEl("telecoms") && (Layout.metaEl("telecoms").textContent = "REGION");
      const list = scopedCountries().slice(0, 40);
      el.innerHTML = `<div class="panel-banner">Telecom strength · ${UI.esc(
        scopeBanner()
      )} · higher = stronger networks</div>
        <div class="region-country-list">${list
          .map((c) => {
            const t = typeof getTelecomProfile === "function" ? getTelecomProfile(c.code) : {};
            return `<button type="button" class="rc-row" data-code="${c.code}">
              <span class="rc-name">${UI.esc(c.name)}</span>
              <span class="rc-m mono">Mob ${t.mobile ?? "—"}</span>
              <span class="rc-m mono">Net ${t.internet ?? "—"}</span>
              <span class="rc-m mono">Fib ${t.fiber ?? "—"}</span>
            </button>`;
          })
          .join("")}</div>`;
      bindRegionCountryClicks(el);
      return;
    }
    const t = typeof getTelecomProfile === "function" ? getTelecomProfile(code) : null;
    if (!t) return;
    const cname = COUNTRIES.find((c) => c.code === code)?.name || code;
    const rows = [
      ["mobile", "Mobile phones", "How strong mobile coverage and use look."],
      ["mobileNet", "Mobile network quality", "5G / 4G quality and capacity (model)."],
      ["landline", "Landline / fixed voice", "Traditional copper lines — often lower where mobile wins."],
      ["fiber", "Fiber broadband", "High-speed fixed internet reach."],
      ["internet", "Internet reliability", "Overall online access quality for homes and shops."],
    ];
    Layout.metaEl("telecoms") && (Layout.metaEl("telecoms").textContent = `NET ${t.internet}`);
    el.innerHTML = `<div class="panel-banner">Telecoms for <b>${UI.esc(
      cname
    )}</b> · mobile · landline · internet</div>
      <div class="tel-grid">${rows
        .map(([id, label, tip]) => {
          const v = t[id] ?? 0;
          const col = v >= 75 ? "#00c853" : v >= 55 ? "#f5a623" : "#ff6b1a";
          return `<div class="tel-card" data-tip="${UI.esc(tip)}">
            <div class="ae-top"><strong>${UI.esc(label)}</strong><span style="color:${col}">${v}</span></div>
            <div class="ac-bar"><i style="width:${v}%;background:${col}"></i></div>
            <p class="ac-tip">${UI.esc(tip)}</p>
          </div>`;
        })
        .join("")}</div>
      <p class="afford-foot">${UI.esc(t.note || "")} Higher bars = stronger infrastructure.</p>`;
  }

  function fillOutages() {
    const el = Layout.bodyEl("outages");
    if (!el) return;
    let events = typeof INFRA_EVENTS !== "undefined" ? [...INFRA_EVENTS] : [];
    const scope = new Set(scopedCountries().map((c) => c.code));
    if (state.regionGroup !== "all" || state.develFilter !== "all") {
      events = events.filter((e) => scope.has(e.code));
    }
    const code = selectedCountryCode();
    if (code) {
      const mine = events.filter((e) => e.code === code);
      if (mine.length) events = [...mine, ...events.filter((e) => e.code !== code)];
    }
    // News-derived outage hits
    const news = Feeds.getState().news || [];
    const outageRe = /blackout|power outage|load.?shedding|grid failure|internet outage|cable cut|network shutdown|telecom outage/i;
    const newsHits = news
      .filter((n) => outageRe.test((n.title || "") + " " + (n.summary || "")))
      .slice(0, 8)
      .map((n, i) => ({
        id: "n_" + i,
        type: /internet|cable|network|telecom/i.test(n.title || "") ? "internet" : "power",
        status: "warn",
        sev: n.sev === "crit" ? "crit" : "elevated",
        code: "",
        title: n.title,
        note: `Live news · ${n.source}`,
        news: true,
      }));

    events = events
      .slice()
      .sort((a, b) => (statusRank(b.status) || 0) - (statusRank(a.status) || 0) || (b.sev === "crit" ? 1 : 0));

    const down = events.filter((e) => e.status === "down").length;
    const warn = events.filter((e) => e.status === "warn" || e.status === "degraded").length;
    Layout.metaEl("outages") && (Layout.metaEl("outages").textContent = `${down}↓ ${warn}⚠`);

    const badge = (st) => {
      const map = {
        down: ["DOWN", "#ff3b30"],
        degraded: ["DEGRADED", "#ff6b1a"],
        warn: ["WARNING", "#f5a623"],
        recovering: ["RECOVERING", "#4a9eff"],
        up: ["UP / OK", "#00c853"],
      };
      return map[st] || ["WATCH", "#8b93a7"];
    };

    el.innerHTML = `<div class="panel-banner">Power · internet · telecom outages &amp; warnings · ${UI.esc(
      scopeBanner()
    )}</div>
      <div class="out-tabs mono"><span class="out-pill down">${down} DOWN</span><span class="out-pill warn">${warn} WARN / DEGRADED</span><span class="out-pill up">${
      events.filter((e) => e.status === "up").length
    } OK</span></div>
      <div class="out-list">${events
        .map((e) => {
          const [lab, col] = badge(e.status);
          const cname = e.code ? COUNTRIES.find((c) => c.code === e.code)?.name || e.code : "Global / news";
          const active = code && e.code === code ? " active" : "";
          return `<button type="button" class="out-row${active}" data-code="${e.code || ""}" data-lat="${e.lat || ""}" data-lon="${e.lon || ""}">
            <span class="out-st" style="background:${col}22;color:${col};border-color:${col}">${lab}</span>
            <span class="out-type mono">${(e.type || "").toUpperCase()}</span>
            <div class="out-body">
              <strong>${UI.esc(e.title)}</strong>
              <span class="out-meta">${UI.esc(cname)} · ${UI.esc(e.sev || "")}</span>
              <p>${UI.esc(e.note || "")}</p>
            </div>
          </button>`;
        })
        .join("")}</div>
      ${
        newsHits.length
          ? `<div class="out-news-h mono">FROM LIVE NEWS</div>
        <div class="out-list">${newsHits
          .map((e) => {
            const [lab, col] = badge(e.status);
            return `<div class="out-row news">
              <span class="out-st" style="background:${col}22;color:${col};border-color:${col}">${lab}</span>
              <span class="out-type mono">${e.type.toUpperCase()}</span>
              <div class="out-body"><strong>${UI.esc(e.title)}</strong><p>${UI.esc(e.note)}</p></div>
            </div>`;
          })
          .join("")}</div>`
          : ""
      }
      <p class="afford-foot">Statuses: <b>DOWN</b> outage · <b>DEGRADED</b> partial · <b>WARNING</b> risk rising · <b>RECOVERING</b> improving · <b>UP</b> normal. Illustrative model + live headlines.</p>`;

    el.querySelectorAll(".out-row[data-code]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.lat && btn.dataset.lon) {
          Map3D.flyTo(Number(btn.dataset.lon), Number(btn.dataset.lat), 5);
        }
        if (btn.dataset.code) {
          state.country = btn.dataset.code;
          if ($("#countrySelect")) $("#countrySelect").value = state.country;
          applyCountryFocus();
        }
      });
    });
  }

  function fillCritInfra() {
    const el = Layout.bodyEl("critInfra");
    if (!el) return;
    const iis = state.indicators.find((i) => i.id === "iis");
    const code = selectedCountryCode();
    const mix = typeof getPowerMix === "function" ? getPowerMix(code || "") : null;
    const tel = typeof getTelecomProfile === "function" ? getTelecomProfile(code || "") : null;
    const f = iis?.factors || {};
    const val = iis?.value ?? 50;
    const col = Indicators.colorFor?.(iis || { id: "iis" }, val) || riskColor(val);
    const ren = mix ? (mix.wind || 0) + (mix.solar || 0) + (mix.hydro || 0) : "—";
    Layout.metaEl("critInfra") && (Layout.metaEl("critInfra").textContent = `IIS ${val}`);
    el.innerHTML = `<div class="panel-banner">Overall infrastructure stress · <b>IIS</b> (Infrastructure Integrity Stress)</div>
      <div class="iis-hero">
        <div class="iis-score" style="border-color:${col}">
          <span class="iis-k">IIS</span>
          <span class="iis-v" style="color:${col}">${val}</span>
          <span class="iis-l">higher = more stress</span>
        </div>
        <div class="iis-facts">
          <div class="iis-f"><span>Power outage heat</span><b>${f.outageHeat != null ? Math.round(f.outageHeat) : "—"}</b></div>
          <div class="iis-f"><span>Power structure stress</span><b>${f.powerStress != null ? Math.round(f.powerStress) : "—"}</b></div>
          <div class="iis-f"><span>Telecom stress</span><b>${f.telecomStress != null ? Math.round(f.telecomStress) : "—"}</b></div>
          <div class="iis-f"><span>Renewables share</span><b>${ren}${typeof ren === "number" ? "%" : ""}</b></div>
          <div class="iis-f"><span>Internet score</span><b>${tel?.internet ?? "—"}</b></div>
          <div class="iis-f"><span>Mobile score</span><b>${tel?.mobile ?? "—"}</b></div>
        </div>
      </div>
      <div class="ind-bar big"><i style="width:${val}%;background:${col}"></i></div>
      <p class="afford-foot">IIS blends outage events, power mix fragility, telecom strength, energy markets, and weather. Open Power · Net desk for full detail.</p>`;
    el.onclick = () => showIndicator("iis");
  }

  function fillTransport() {
    const el = Layout.bodyEl("transport");
    if (!el) return;
    el.innerHTML = TRANSPORT_NODES.map(
      (t) => `<div class="transport-row" data-id="${t.id}">
      <div class="tr-top"><span class="tr-name">${t.name}</span>
      <span class="tposture ${t.status === "normal" ? "stable" : t.status}">${t.status.toUpperCase()}</span></div>
      <div class="tmeta">${t.type} · ${t.note}</div></div>`
    ).join("");
    el.querySelectorAll(".transport-row").forEach((n) => {
      n.addEventListener("click", () => {
        const t = TRANSPORT_NODES.find((x) => x.id === n.dataset.id);
        if (!t) return;
        Map3D.flyTo(t.lon, t.lat, 5);
        UI.openDrawer({
          type: "TRANSPORT",
          title: t.name,
          sev: t.status === "elevated" ? "high" : "watch",
          meta: [
            ["TYPE", t.type],
            ["STATUS", t.status],
          ],
          body: t.note,
        });
      });
    });
  }

  function fillWeather() {
    const el = Layout.bodyEl("weather");
    if (!el) return;
    let wx = Feeds.getState().weather || [];
    const scopeCodes = new Set(scopedCountries().map((c) => c.code));
    // Scope weather to region / economy filter
    if (state.regionGroup !== "all" || state.develFilter !== "all") {
      wx = wx.filter((w) => scopeCodes.has(w.code));
    }
    const wxUpdated = Feeds.getState().weatherUpdated;
    Layout.metaEl("weather") &&
      (Layout.metaEl("weather").textContent = wx.length
        ? `${wx.length} · ${wxUpdated ? relTime(wxUpdated) : "—"}`
        : "—");
    if (!wx.length) {
      el.innerHTML = empty(
        "Weather loading…",
        "Fetching capital temperatures (Open-Meteo) — or widen region / economy filter."
      );
      return;
    }
    const focusCode = state.country;
    if (focusCode) {
      const focused = wx.filter((w) => w.code === focusCode);
      const rest = wx.filter((w) => w.code !== focusCode);
      wx = focused.length ? [...focused, ...rest] : wx;
    }
    if (state.search) {
      const q = state.search;
      const filtered = wx.filter(
        (w) =>
          (w.name || "").toLowerCase().includes(q) ||
          (w.code || "").toLowerCase().includes(q) ||
          (w.region || "").toLowerCase().includes(q)
      );
      if (filtered.length) wx = filtered;
    }

    // Enrich with weather + travel warnings
    const enriched = wx.map((w) => {
      const warn =
        typeof weatherWarningFromCode === "function"
          ? weatherWarningFromCode(w.codeWx, w.wind, w.precip)
          : { level: w.impact || "ok", label: w.label || "—", tip: "" };
      const rs = countryRiskStability(w.code);
      return { ...w, wxWarn: warn, travel: rs.travel, risk: rs.risk };
    });

    const severeWx = enriched
      .filter((w) => ["critical", "high", "elevated"].includes(w.wxWarn?.level))
      .sort((a, b) => {
        const rank = { critical: 3, high: 2, elevated: 1 };
        return (rank[b.wxWarn.level] || 0) - (rank[a.wxWarn.level] || 0);
      })
      .slice(0, 12);

    const travelWarn = enriched
      .filter((w) => ["critical", "high", "elevated"].includes(w.travel?.level))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 12);

    const show = enriched.slice(0, 200);
    const focus = focusCode ? show.find((w) => w.code === focusCode) : null;
    const eonet = (Feeds.getState().eonet || []).slice(0, 8);

    el.innerHTML =
      `<div class="panel-banner">Weather &amp; travel · ${UI.esc(scopeBanner())} · live Open-Meteo${
        wxUpdated ? ` · updated ${relTime(wxUpdated)} ago` : ""
      }${
        focus
          ? ` · <b>${UI.esc(focus.name)}</b> <b class="mono">${
              focus.temp != null ? Number(focus.temp).toFixed(1) + "°C" : "—"
            }</b> · ${UI.esc(focus.wxWarn?.label || focus.label || "")}`
          : ""
      }</div>
      <div class="warn-panels">
        <div class="warn-col">
          <div class="warn-h">☁ WEATHER WARNINGS</div>
          ${
            severeWx.length
              ? severeWx
                  .map(
                    (w) => `<div class="warn-row ${w.wxWarn.level}" data-code="${UI.esc(w.code || "")}">
              <b>${UI.esc(w.name)}</b>
              <span class="warn-badge">${UI.esc(w.wxWarn.label)}</span>
              <span class="mono">${w.temp != null ? Number(w.temp).toFixed(0) + "°C" : "—"} · wind ${w.wind ?? "—"}</span>
              <p>${UI.esc(w.wxWarn.tip || "")}</p>
            </div>`
                  )
                  .join("")
              : `<p class="warn-empty">No elevated weather flags in this scope right now.</p>`
          }
        </div>
        <div class="warn-col travel">
          <div class="warn-h">✈ TRAVEL WARNINGS</div>
          ${
            travelWarn.length
              ? travelWarn
                  .map(
                    (w) => `<div class="warn-row ${w.travel.level}" data-code="${UI.esc(w.code || "")}">
              <b>${UI.esc(w.name)}</b>
              <span class="warn-badge">${UI.esc(w.travel.label)}</span>
              <span class="mono">risk ${w.risk}</span>
              <p>${UI.esc(w.travel.tip || "")}</p>
            </div>`
                  )
                  .join("")
              : `<p class="warn-empty">No high travel-risk countries in this scope.</p>`
          }
          <p class="afford-foot">Illustrative model from country risk — not official foreign-ministry advice. Always check official government advice.</p>
        </div>
      </div>
      ${
        eonet.length
          ? `<div class="wx-eonet mono">Nearby natural events (EONET): ${eonet
              .map((e) => UI.esc((e.title || "").slice(0, 40)))
              .join(" · ")}</div>`
          : ""
      }
      <div class="wx-world-grid">${show
        .map((w) => {
          const active = focusCode && w.code === focusCode ? " active" : "";
          const t =
            w.temp != null && Number.isFinite(Number(w.temp)) ? `${Number(w.temp).toFixed(1)}°C` : "—";
          const wl = w.wxWarn?.level || w.impact || "ok";
          return `<div class="wx-row${active}" data-code="${UI.esc(w.code || "")}" data-name="${UI.esc(w.name || "")}">
          <div class="wx-temp mono">${t}</div>
          <div>
            <div class="wx-name">${UI.esc(w.name)}${w.code ? ` <span class="mono wx-code">${UI.esc(w.code)}</span>` : ""}</div>
            <div class="wx-vals mono">${UI.esc(w.region || "")} · wind ${w.wind ?? "—"} · ${UI.esc(
              w.wxWarn?.label || w.label || ""
            )}</div>
            <div class="wx-travel mono" style="color:${riskColor(w.risk)}">${UI.esc(w.travel?.label || "")}</div>
          </div>
          <div class="i-stat ${wl === "ok" ? "ok" : wl === "watch" ? "warn" : "crit"}">${UI.esc(
            (wl || "").toUpperCase()
          )}</div>
        </div>`;
        })
        .join("")}</div>
      <div class="afford-foot">${show.length} countries in temperature list · region &amp; economy filters apply · click to focus map</div>`;

    const goCountry = (code) => {
      if (!code) return;
      const w = (Feeds.getState().weather || []).find((x) => x.code === code);
      if (w) Map3D.flyTo(w.lon, w.lat, 5);
      state.country = code;
      if ($("#countrySelect")) $("#countrySelect").value = code;
      updateFocusChrome();
      fillWeather();
      fillAfford();
      fillAffordRisk();
    };
    el.querySelectorAll(".wx-row, .warn-row").forEach((n) => {
      n.addEventListener("click", () => goCountry(n.dataset.code));
    });
  }

  function fillDisasters() {
    const el = Layout.bodyEl("disasters");
    if (!el) return;
    const items = Feeds.getState().eonet || [];
    Layout.metaEl("disasters") && (Layout.metaEl("disasters").textContent = items.length ? "EONET" : "—");
    if (!items.length) {
      el.innerHTML = empty("No open EONET events", "NASA Earth Observatory natural events");
      return;
    }
    el.innerHTML = items
      .slice(0, 25)
      .map(
        (d) => `<div class="news-row" data-id="${d.id}">
      <div class="news-src">${UI.esc(d.category)}</div>
      <div class="news-title">${UI.esc(d.title)}</div>
      <div class="news-meta">${relTime(d.date)} ago</div></div>`
      )
      .join("");
    el.querySelectorAll(".news-row").forEach((n) => {
      n.addEventListener("click", () => {
        const d = items.find((x) => x.id === n.dataset.id);
        if (!d) return;
        if (d.lat || d.lon) Map3D.flyTo(d.lon, d.lat, 4);
        UI.openDrawer({
          type: "DISASTER",
          title: d.title,
          sev: d.sev === "high" ? "high" : "elevated",
          meta: [
            ["CATEGORY", d.category],
            ["SOURCE", "NASA EONET"],
          ],
          body: "Live natural event from NASA EONET open events API.",
          link: d.link,
        });
      });
    });
  }

  function fillAgriculture() {
    const el = Layout.bodyEl("agriculture");
    if (!el) return;
    el.innerHTML = AG_REGIONS.map((a) => {
      const col = scoreColor(a.stress);
      return `<div class="hot-row" data-id="${a.id}">
        <div class="hot-top"><span class="hot-name">${a.name}</span>
        <span class="hot-score" style="color:${col}">${a.stress}</span></div>
        <div class="hot-bar"><i style="width:${a.stress}%;background:${col}"></i></div>
        <div class="hot-delta">${a.crop} · ${a.note}</div></div>`;
    }).join("");
    el.querySelectorAll(".hot-row").forEach((n) => {
      n.addEventListener("click", () => {
        const a = AG_REGIONS.find((x) => x.id === n.dataset.id);
        if (a) Map3D.flyTo(a.lon, a.lat, 4);
      });
    });
  }

  function fillInsurance() {
    const el = Layout.bodyEl("insurance");
    if (!el) return;
    const m = (Feeds.getState().markets || []).filter((x) => x.cls === "insurance");
    el.innerHTML =
      marketGrid(m) +
      INSURANCE_SIGNALS.map(
        (i) => `<div class="ins-row">
        <div class="ins-name">${i.name}</div>
        <span class="i-stat ${i.level === "crit" ? "crit" : i.level === "high" || i.level === "elevated" ? "warn" : "ok"}">${i.level.toUpperCase()} ${i.change}</span>
        <div class="tmeta">${i.note}</div></div>`
      ).join("");
    bindMktClicks(el, m);
  }

  function fillQuakes() {
    const el = Layout.bodyEl("quakes");
    if (!el) return;
    const quakes = Feeds.getState().quakes || [];
    if (!quakes.length) {
      el.innerHTML = empty("USGS…", "M2.5+ day");
      return;
    }
    el.innerHTML = quakes
      .slice(0, 18)
      .map(
        (q) => `<div class="quake-row" data-id="${q.id}">
      <span class="q-mag">${q.mag?.toFixed?.(1) ?? q.mag}</span>
      <div><div class="q-place">${UI.esc(q.place || "")}</div>
      <div class="q-meta">${relTime(q.time)} · z${q.depth?.toFixed?.(0) ?? "—"}km</div></div></div>`
      )
      .join("");
    el.querySelectorAll(".quake-row").forEach((n) => {
      n.addEventListener("click", () => {
        const q = quakes.find((x) => x.id === n.dataset.id);
        if (q) {
          Map3D.flyTo(q.lon, q.lat, 5);
          UI.openDrawer({
            type: "EARTHQUAKE",
            title: `M${q.mag} — ${q.place}`,
            sev: q.sev === "crit" ? "critical" : "high",
            meta: [
              ["MAG", String(q.mag)],
              ["DEPTH", q.depth + " km"],
            ],
            body: "USGS live feed.",
            link: q.url,
          });
        }
      });
    });
  }

  function fillFeeds() {
    const el = Layout.bodyEl("feeds");
    if (!el) return;
    renderFeedHealth(el);
  }

  function renderFeedHealth(el) {
    const h = Feeds.getHealth();
    const rows = Object.values(h).sort((a, b) => a.id.localeCompare(b.id));
    if (!rows.length) {
      el.innerHTML = empty("Polling…", "");
      return;
    }
    el.innerHTML = `<div class="health-list">${rows
      .map((r) => {
        const col = r.status === "ok" ? "var(--green)" : r.status === "warn" ? "var(--amber)" : "var(--red)";
        return `<div class="health-row"><span class="dot" style="background:${col}"></span>
        <span class="name">${r.id}</span><span class="age">${relTime(r.updated)}</span>
        <span class="st" style="color:${col}">${r.status.toUpperCase()}</span></div>
        <div class="health-detail">${UI.esc(r.detail || "")}</div>`;
      })
      .join("")}</div>`;
  }

  function updateFeedHealth() {
    const overall = Feeds.overallHealth();
    const h = Feeds.getHealth();
    const n = Object.keys(h).length;
    const ok = Object.values(h).filter((x) => x.status === "ok").length;
    $("#fhDot").className = "fh-dot " + (overall === "ok" ? "ok" : overall === "warn" ? "warn" : overall === "err" ? "err" : "");
    $("#fhLabel").textContent = overall === "ok" ? "FEEDS OK" : overall === "warn" ? "DEGRADED" : "OFFLINE";
    $("#fhCount").textContent = n ? `${ok}/${n}` : "—";
    const body = Layout.bodyEl("feeds");
    if (body) renderFeedHealth(body);
  }

  function fillScenarios() {
    const el = Layout.bodyEl("scenarios");
    if (!el) return;
    const s = SCENARIOS.find((x) => x.id === state.scenario) || SCENARIOS[0];
    el.innerHTML = `<div class="brief">
      <div class="brief-title">${UI.esc(s.name)}</div>
      <p class="ind-desc">${UI.esc(s.desc)}</p>
      <div class="pill-row">${s.domains.map((d) => `<span class="pill soft">${d}</span>`).join("")}</div>
      <div class="scenario-list">${SCENARIOS.map(
        (x) =>
          `<button type="button" class="scenario-btn ${x.id === s.id ? "active" : ""}" data-id="${x.id}">${x.name}</button>`
      ).join("")}</div>
    </div>`;
    el.querySelectorAll(".scenario-btn").forEach((b) => {
      b.addEventListener("click", () => {
        state.scenario = b.dataset.id;
        $("#scenarioSelect").value = state.scenario;
        onScenarioChange();
      });
    });
  }

  function onScenarioChange() {
    const s = SCENARIOS.find((x) => x.id === state.scenario);
    if (s && s.domains[0] && s.domains[0] !== "all") {
      state.domain = s.domains[0];
      $$(".domain-pill").forEach((p) => p.classList.toggle("active", p.dataset.domain === state.domain));
    }
    updateFocusChrome();
    refreshAllPanels();
    UI.toast(`Scenario · ${s?.name || state.scenario}`);
  }

  function fillPolitics() {
    const el = Layout.bodyEl("politics");
    if (!el) return;
    el.innerHTML = POLITICS_WATCH.map(
      (p) => `<div class="politics-row">
      <div class="news-title">${UI.esc(p.title)}</div>
      <div class="news-meta">${p.region} · <span class="tposture ${p.tone === "critical" ? "critical" : p.tone === "high" ? "elevated" : p.tone}">${p.tone}</span></div>
    </div>`
    ).join("");
  }

  // ── Answer Desk · Positive Paths · Triad · Pulse · Radar · Lens ──
  function fillAnswers() {
    const el = Layout.bodyEl("answers");
    if (!el) return;
    const answers = Intel.buildAnswers(intelCtx());
    Layout.metaEl("answers") && (Layout.metaEl("answers").textContent = `${answers.length} Q`);
    el.innerHTML = `<div class="answer-list">${answers
      .map(
        (a, i) => `<article class="answer-card" data-i="${i}">
        <div class="answer-q"><span class="aq-ico">Q</span>${UI.esc(a.q)}</div>
        <div class="answer-a">${UI.esc(a.a)}</div>
        <div class="answer-foot">
          <span class="conf" title="Confidence">◉ ${a.confidence}%</span>
          <span class="tags">${(a.tags || []).map((t) => `<em>${UI.esc(t)}</em>`).join("")}</span>
          ${a.linkView ? `<button type="button" class="answer-go" data-view="${a.linkView}">OPEN</button>` : ""}
        </div>
      </article>`
      )
      .join("")}</div>`;
    el.querySelectorAll(".answer-go").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        setView(btn.dataset.view);
      });
    });
    el.querySelectorAll(".answer-card").forEach((card) => {
      card.addEventListener("click", () => {
        const a = answers[parseInt(card.dataset.i, 10)];
        if (!a) return;
        if (a.fly) Map3D.flyTo(a.fly.lon, a.fly.lat, a.fly.zoom || 5);
        UI.openDrawer({
          type: "INTELLIGENCE ANSWER",
          title: a.q,
          sev: "info",
          meta: [
            ["CONFIDENCE", a.confidence + "%"],
            ["TAGS", (a.tags || []).join(", ")],
          ],
          body: a.a,
        });
      });
    });
  }

  function fillImplications() {
    const el = Layout.bodyEl("implications");
    if (!el) return;
    const list = Intel.buildImplications(intelCtx());
    Layout.metaEl("implications") && (Layout.metaEl("implications").textContent = "CONSTRUCTIVE");
    el.innerHTML = `<div class="impl-intro">Pressure framed as manageable — issue → path → positive outcome</div>
      <div class="impl-list">${list
        .map(
          (p) => `<article class="impl-card sev-${p.severity}">
        <div class="impl-head">
          <span class="impl-topic">${UI.esc(p.topic.toUpperCase())}</span>
          <span class="impl-score mono">${p.score ?? "—"}</span>
        </div>
        <div class="impl-row"><span class="il">ISSUE</span><span>${UI.esc(p.issue)}</span></div>
        <div class="impl-row path"><span class="il">PATH</span><span>${UI.esc(p.constructive)}</span></div>
        <div class="impl-row out"><span class="il">POSITIVE OUTCOME</span><span>${UI.esc(p.positiveOutcome)}</span></div>
        <div class="impl-row mon"><span class="il">MONITOR</span><span>${UI.esc(p.monitor)}</span></div>
      </article>`
        )
        .join("")}</div>`;
  }

  function fillTriad() {
    const el = Layout.bodyEl("triad");
    if (!el) return;
    const t = Intel.buildTriad(intelCtx());
    el.innerHTML = `<div class="triad-board">
      <div class="triad-node">
        <span class="tn-label">COUNTRY</span>
        <strong>${UI.esc(t.country.name)}</strong>
        <em class="mono">${UI.esc(t.country.code)}</em>
      </div>
      <div class="triad-x">×</div>
      <div class="triad-node">
        <span class="tn-label">LENS</span>
        <strong>${UI.esc(t.lens.name)}</strong>
        <em>${UI.esc(t.lens.question)}</em>
      </div>
      <div class="triad-x">×</div>
      <div class="triad-node">
        <span class="tn-label">SCENARIO</span>
        <strong>${UI.esc(t.scenario.name)}</strong>
        <em>${UI.esc((t.scenario.domains || []).join(" · "))}</em>
      </div>
      <p class="triad-blurb">${UI.esc(t.blurb)}</p>
      ${t.kmri != null ? `<div class="triad-kmri mono">KMRI ${t.kmri}</div>` : ""}
    </div>`;
  }

  function fillPulse() {
    const el = Layout.bodyEl("pulse");
    if (!el) return;
    const p = Intel.buildPulse(intelCtx());
    const spi = state.indicators.find((i) => i.id === "spi");
    const cells = [
      ["KMRI", p.kmri, { id: "kmri" }],
      ["SPI", spi?.value ?? null, { id: "spi", constructive: true }],
      ["TSI", p.tsi, { id: "tsi" }],
      ["FSI", p.fsi, { id: "fsi" }],
      ["ERI", p.eri, { id: "eri" }],
      ["WRI", p.wri, { id: "wri" }],
      ["TRI", p.tri, { id: "tri" }],
      ["NVI", p.nvi, { id: "nvi" }],
      ["HEADLINES", p.headlines, null],
      ["FLASH", p.flash, null],
      ["EONET", p.disasters, null],
      ["QUAKES", p.quakes, null],
    ];
    el.innerHTML = `<div class="pulse-grid">${cells
      .map(([k, v, def]) => {
        const col =
          v == null
            ? "var(--text-mute)"
            : def
              ? Indicators.colorFor(def, v)
              : "var(--cyan)";
        return `<div class="pulse-cell">
          <span class="pc-k">${k}</span>
          <span class="pc-v" style="color:${col}">${v == null ? "—" : v}</span>
        </div>`;
      })
      .join("")}</div>`;
  }

  function fillRadar() {
    const el = Layout.bodyEl("radar");
    if (!el) return;
    const series = Intel.buildRadar(intelCtx());
    Layout.metaEl("radar") && (Layout.metaEl("radar").textContent = `${series.length} MODELS`);
    const cx = 100;
    const cy = 100;
    const r = 78;
    const n = series.length || 1;
    const pts = series.map((s, i) => {
      const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
      const rr = (r * Math.max(0, Math.min(100, s.value))) / 100;
      return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
    });
    const poly = pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
    const rings = [0.25, 0.5, 0.75, 1]
      .map(
        (f) =>
          `<circle cx="${cx}" cy="${cy}" r="${(r * f).toFixed(1)}" fill="none" stroke="rgba(90,98,117,0.35)" stroke-width="0.8"/>`
      )
      .join("");
    const axes = series
      .map((s, i) => {
        const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x2 = cx + Math.cos(ang) * r;
        const y2 = cy + Math.sin(ang) * r;
        const lx = cx + Math.cos(ang) * (r + 14);
        const ly = cy + Math.sin(ang) * (r + 14);
        return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(90,98,117,0.4)" stroke-width="0.7"/>
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" class="radar-label">${s.name}</text>`;
      })
      .join("");
    el.innerHTML = `<div class="radar-wrap">
      <svg viewBox="0 0 200 200" class="radar-svg" aria-label="Model radar">
        ${rings}${axes}
        <polygon points="${poly}" fill="rgba(245,166,35,0.18)" stroke="#f5a623" stroke-width="1.4"/>
        ${pts
          .map(
            (p, i) =>
              `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" fill="${series[i].color}"/>`
          )
          .join("")}
      </svg>
      <div class="radar-legend">${series
        .map(
          (s) =>
            `<div class="rl-row"><span style="background:${s.color}"></span><b>${s.name}</b><em>${s.value}</em></div>`
        )
        .join("")}</div>
    </div>`;
  }

  function fillLens() {
    const el = Layout.bodyEl("lens");
    if (!el) return;
    const active = LENSES.find((l) => l.id === state.lens) || LENSES[0];
    el.innerHTML = `<div class="brief">
      <div class="brief-title">${UI.esc(active.name)}</div>
      <p class="ind-desc"><strong>Question:</strong> ${UI.esc(active.question)}</p>
      <p class="ind-desc">${UI.esc(active.desc || "")}</p>
      <div class="lens-list">${LENSES.map(
        (l) =>
          `<button type="button" class="lens-btn ${l.id === active.id ? "active" : ""}" data-id="${l.id}">
            <strong>${UI.esc(l.name)}</strong>
            <span>${UI.esc(l.question)}</span>
          </button>`
      ).join("")}</div>
    </div>`;
    el.querySelectorAll(".lens-btn").forEach((b) => {
      b.addEventListener("click", () => {
        state.lens = b.dataset.id;
        const ls = $("#lensSelect");
        if (ls) ls.value = state.lens;
        updateFocusChrome();
        fillAnswers();
        fillImplications();
        fillTriad();
        fillLens();
        UI.toast(`Lens · ${LENSES.find((l) => l.id === state.lens)?.name || state.lens}`);
      });
    });
  }

  // ── Ticker / stream ──
  function renderTicker() {
    const news = filterNews(Feeds.getState().news || []).slice(0, 16);
    const items = [];
    news.forEach((n) => items.push({ sev: n.sev || "info", tag: n.source, text: n.title }));
    const kmri = state.indicators.find((i) => i.id === "kmri");
    if (kmri) items.push({ sev: kmri.value >= 70 ? "high" : "info", tag: "KMRI", text: `Flagship ${kmri.value} (Δ ${kmri.delta})` });
    if (!items.length)
      items.push({
        sev: "info",
        tag: "SYS",
        text: "Terminal booting live sources… BBC · Reuters · Bloomberg · CNBC · NYT · WSJ · Tagesschau · NDR",
      });
    // Duplicate for seamless marquee
    const loop = items.length ? [...items, ...items] : items;
    const track = $("#tickerTrack");
    if (!track) return;
    track.innerHTML = loop
      .map((t) => {
        const brk = t.sev === "crit" || t.sev === "high" ? " brk" : "";
        const brkTag = t.sev === "crit" ? `<span class="brk-flag">BRK</span>` : "";
        return `<span class="ticker-item${brk}" title="${UI.esc(t.text)}"><span class="sev ${t.sev}">●</span>${brkTag}<span class="tag">[${UI.esc(
          t.tag
        )}]</span><span class="t-txt">${UI.esc(t.text)}</span></span>`;
      })
      .join("");
    // restart animation cleanly
    track.style.animation = "none";
    void track.offsetWidth;
    track.style.animation = "";
  }

  function vtNewsRows(items, limit = 40) {
    return (
      items
        .slice(0, limit)
        .map(
          (n) =>
            `<div class="vt-row ${n.sev === "crit" ? "crit" : n.sev === "high" ? "high" : "info"}" data-link="${UI.esc(n.link || "")}">
          <span class="vt-time mono">${relTime(n.published)}</span>
          <span class="vt-src mono">${UI.esc(n.source)}</span>
          <span class="vt-title">${UI.esc(n.title)}</span>
        </div>`
        )
        .join("") || `<div class="vt-empty">No headlines for filter</div>`
    );
  }

  function vtMarketRows() {
    const markets = Feeds.getState().markets || MARKETS_SEED;
    const order = [
      "SPX",
      "DXY",
      "BTC",
      "BRENT",
      "GOLD",
      "SILVER",
      "COPPER",
      "ALUM",
      "SOXX",
      "NVDA",
      "TSM",
      "EQIX",
      "DLR",
      "VIX",
      "WHEAT",
      "COCOA",
      "NATGAS",
      "FOODX",
    ];
    return order
      .map((sym) => {
        const m = markets.find((x) => x.sym === sym);
        if (!m) return "";
        const cls = m.dir === "up" ? "high" : m.dir === "down" ? "answer" : "info";
        return `<div class="vt-row ${cls}" data-sym="${m.sym}">
          <span class="vt-time mono">${UI.esc(m.chg)}</span>
          <span class="vt-src mono">${m.sym}</span>
          <span class="vt-title"><b>${m.val}</b> · ${UI.esc(m.name || "")} · ${m.source || "model"}</span>
        </div>`;
      })
      .join("");
  }

  function bindStreamClicks(pane) {
    pane.querySelectorAll(".vt-row[data-link]").forEach((row) => {
      row.addEventListener("click", () => {
        const link = row.dataset.link;
        if (link) window.open(link, "_blank", "noopener");
      });
    });
    pane.querySelectorAll(".vt-row[data-sym]").forEach((row) => {
      row.addEventListener("click", () => {
        state.instrument = row.dataset.sym;
        if ($("#instrumentSelect")) $("#instrumentSelect").value = state.instrument;
        updateFocusChrome();
        fillInstrument();
        fillMktHero();
        fillMktBoard();
        renderMacroStrip();
      });
    });
  }

  function renderStream() {
    const pane = $("#streamPane");
    if (!pane) return;

    // Full multiview: 4 columns side by side
    if (state.stream === "multi" || !state.stream) {
      pane.className = "stream-pane multiview-tape";
      const news = filterNews(Feeds.getState().news || []);
      const events = EVENTS.filter((e) => domainOk(e));
      const disasters = [...(Feeds.getState().eonet || [])].sort((a, b) => (b.date || 0) - (a.date || 0));
      pane.innerHTML = `
        <div class="mv-col" data-col="news">
          <div class="mv-head"><span>NEWS</span><em>${news.length}</em></div>
          <div class="mv-body">${vtNewsRows(news, 35)}</div>
        </div>
        <div class="mv-col" data-col="markets">
          <div class="mv-head"><span>MARKETS</span><em>TAPE</em></div>
          <div class="mv-body">${vtMarketRows()}</div>
        </div>
        <div class="mv-col" data-col="events">
          <div class="mv-head"><span>EVENTS</span><em>${events.length}</em></div>
          <div class="mv-body">${events
            .map(
              (e) =>
                `<div class="vt-row ${e.sev === "crit" ? "crit" : e.sev === "high" ? "high" : "med"}">
              <span class="vt-time mono">${UI.esc(e.time)}</span>
              <span class="vt-src mono">${UI.esc(e.layer)}</span>
              <span class="vt-title">${UI.esc(e.title)}</span>
            </div>`
            )
            .join("")}</div>
        </div>
        <div class="mv-col" data-col="disasters">
          <div class="mv-head"><span>DISASTERS</span><em>${disasters.length}</em></div>
          <div class="mv-body">${
            disasters.length
              ? disasters
                  .slice(0, 30)
                  .map(
                    (d) =>
                      `<div class="vt-row high">
                  <span class="vt-time mono">${relTime(d.date)}</span>
                  <span class="vt-src mono">${UI.esc(d.category)}</span>
                  <span class="vt-title">${UI.esc(d.title)}</span>
                </div>`
                  )
                  .join("")
              : `<div class="vt-empty">No open EONET events</div>`
          }</div>
        </div>`;
      bindStreamClicks(pane);
      return;
    }

    pane.className = "stream-pane vertical-tape single-col";

    if (state.stream === "news") {
      const items = filterNews(Feeds.getState().news || []);
      pane.innerHTML = vtNewsRows(items, 80);
      bindStreamClicks(pane);
    } else if (state.stream === "markets") {
      pane.innerHTML = vtMarketRows();
      bindStreamClicks(pane);
    } else if (state.stream === "events") {
      pane.innerHTML = EVENTS.filter((e) => domainOk(e))
        .map(
          (e) =>
            `<div class="vt-row ${e.sev === "crit" ? "crit" : e.sev === "high" ? "high" : "med"}">
          <span class="vt-time mono">${UI.esc(e.time)}</span>
          <span class="vt-src mono">${UI.esc(e.layer)}</span>
          <span class="vt-title">${UI.esc(e.title)}</span>
        </div>`
        )
        .join("");
    } else if (state.stream === "disasters") {
      const items = [...(Feeds.getState().eonet || [])].sort((a, b) => (b.date || 0) - (a.date || 0));
      pane.innerHTML =
        items
          .slice(0, 50)
          .map(
            (d) =>
              `<div class="vt-row high">
          <span class="vt-time mono">${relTime(d.date)}</span>
          <span class="vt-src mono">${UI.esc(d.category)}</span>
          <span class="vt-title">${UI.esc(d.title)}</span>
        </div>`
          )
          .join("") || `<div class="vt-empty">No open EONET events</div>`;
    } else {
      pane.innerHTML = (Feeds.getState().log || [])
        .slice(0, 60)
        .map(
          (l) =>
            `<div class="vt-row ${l.level === "err" ? "crit" : "info"}">
          <span class="vt-time mono">${new Date(l.t).toISOString().slice(11, 19)}</span>
          <span class="vt-src mono">${UI.esc(l.level || "log")}</span>
          <span class="vt-title">${UI.esc(l.msg)}</span>
        </div>`
        )
        .join("") || `<div class="vt-empty">Feed log empty</div>`;
    }
  }

  // ── Settings ──
  function openSettings() {
    $("#settingsModal").hidden = false;
    renderIntervalSettings();
    renderIndicatorEditor();
    renderNewsToggles();
    renderModelCatalog();
  }
  function closeSettings() {
    $("#settingsModal").hidden = true;
  }

  function renderIntervalSettings() {
    const iv = Feeds.getIntervals();
    const labels = {
      news: "News RSS",
      markets: "Markets / commodities",
      quakes: "USGS quakes",
      eonet: "NASA EONET",
      weather: "Open-Meteo",
      relief: "ReliefWeb",
      indicators: "Risk models",
      ticker: "Ticker",
    };
    $("#intervalSettings").innerHTML = Object.keys(labels)
      .map(
        (k) =>
          `<label>${labels[k]}</label><input type="number" id="iv_${k}" min="15" max="3600" value="${iv[k] || DEFAULT_INTERVALS[k]}" />`
      )
      .join("");
    $("#intervalSettings").querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("change", () => {
        const next = {};
        Object.keys(labels).forEach((k) => {
          next[k] = Math.max(15, parseInt($("#iv_" + k).value, 10) || DEFAULT_INTERVALS[k]);
        });
        Feeds.setIntervals(next);
        restartTimers(next);
        UI.toast("Intervals saved");
      });
    });
  }

  const FACTOR_KEYS = [
    "kinetic",
    "hotspots",
    "newsCrisis",
    "riskTone",
    "energy",
    "food",
    "chokepoints",
    "theaters",
    "weather",
    "transport",
    "insurance",
    "riskOn",
    "safeHaven",
    "velocity",
    "alerts",
    "quakes",
  ];

  function renderIndicatorEditor() {
    const box = $("#indicatorEditor");
    const defs = Indicators.getDefs();
    box.innerHTML = defs
      .map((d) => {
        const weights = FACTOR_KEYS.map((k) => {
          const v = d.weights?.[k] || 0;
          return `<label>${k}<input type="range" min="0" max="100" value="${v}" data-id="${d.id}" data-w="${k}"/><span class="mono">${v}</span></label>`;
        }).join("");
        return `<div class="ind-edit" data-id="${d.id}">
        <div class="row">
          <input data-f="name" value="${UI.esc(d.name)}" ${d.id === "kmri" ? "readonly" : ""}/>
          <input data-f="label" value="${UI.esc(d.label)}"/>
        </div>
        <input data-f="desc" style="width:100%;margin-bottom:8px" value="${UI.esc(d.desc)}"/>
        <div class="weights">${weights}</div>
        <div class="btn-row" style="margin-top:8px">
          ${d.id === "kmri" ? "<span class='hint'>KMRI flagship protected</span>" : `<button type="button" class="btn-ghost danger" data-del="${d.id}">REMOVE</button>`}
        </div></div>`;
      })
      .join("");
    box.querySelectorAll("input[type=range]").forEach((inp) => {
      inp.addEventListener("input", () => {
        inp.parentElement.querySelector("span").textContent = inp.value;
      });
      inp.addEventListener("change", commitIndicators);
    });
    box.querySelectorAll("input[data-f]").forEach((inp) => inp.addEventListener("change", commitIndicators));
    box.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        Indicators.removeDef(btn.dataset.del);
        renderIndicatorEditor();
        recomputeIndicators();
      });
    });
  }

  function commitIndicators() {
    const box = $("#indicatorEditor");
    const next = Indicators.getDefs().map((d) => {
      const card = box.querySelector(`.ind-edit[data-id="${d.id}"]`);
      if (!card) return d;
      const weights = { ...d.weights };
      card.querySelectorAll("input[type=range]").forEach((r) => {
        weights[r.dataset.w] = parseInt(r.value, 10) || 0;
      });
      return {
        ...d,
        name: card.querySelector('[data-f="name"]')?.value || d.name,
        label: card.querySelector('[data-f="label"]')?.value || d.label,
        desc: card.querySelector('[data-f="desc"]')?.value || d.desc,
        weights,
      };
    });
    Indicators.setDefs(next);
    recomputeIndicators();
  }

  function renderNewsToggles() {
    const box = $("#newsSourceToggles");
    box.innerHTML = Feeds.getNewsSources()
      .map(
        (s) => `<label class="feed-tog"><input type="checkbox" data-ns="${s.id}" ${s.on ? "checked" : ""}/>
      <span>${s.name}</span><span class="mono" style="margin-left:auto;color:var(--text-mute)">${s.tag}</span></label>`
      )
      .join("");
    box.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("change", () => {
        Feeds.setNewsSource(inp.dataset.ns, inp.checked);
        Feeds.refreshNews();
      });
    });
  }

  function renderModelCatalog() {
    const el = $("#modelCatalog");
    if (!el) return;
    el.innerHTML = DEFAULT_INDICATORS.map((d) => {
      const help = RISK_MODEL_HELP.find((h) => h.id === d.id);
      const ex = explainText(d.id);
      return `<div class="model-cat-row ${d.flagship ? "flagship" : ""}">
        <div><strong>${d.name}</strong> — ${d.label}${d.flagship ? " ★" : ""}${d.constructive ? " · constructive" : ""}</div>
        <div class="hint">${UI.esc(ex?.short || help?.summary || d.desc)}</div>
        ${ex?.how ? `<div class="hint">${UI.esc(ex.how)}</div>` : ""}
        ${ex?.read ? `<div class="hint"><em>Read:</em> ${UI.esc(ex.read)}</div>` : ""}
      </div>`;
    }).join("");
  }

  let indTimer, tickerTimer;
  function restartTimers(iv) {
    clearInterval(indTimer);
    clearInterval(tickerTimer);
    indTimer = setInterval(recomputeIndicators, (iv?.indicators || 30) * 1000);
    tickerTimer = setInterval(renderTicker, (iv?.ticker || 12) * 1000);
  }

  function setView(view) {
    Layout.setView(view);
    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
    if (state.viewMode === "mobile") {
      renderMobileDock();
      closeMobileSheets();
    }
    updateFocusChrome();
    const desk = (typeof DESK_CATALOG !== "undefined" ? DESK_CATALOG : []).find((d) => d.id === view);
    UI.toast(desk ? `Desk · ${desk.title}` : `Desk · ${view}`);
  }

  function openHowTo() {
    const modal = $("#howToModal");
    if (!modal) return;
    const body = $("#howToBody");
    const models = $("#howToModels");
    if (body && typeof HOW_TO_STEPS !== "undefined") {
      body.innerHTML =
        `<div class="howto-nav-map">
          <div class="hnm-item"><b>LEFT</b><span>Desks — pick a job</span></div>
          <div class="hnm-item"><b>TOP</b><span>Country · Lens · Scenario</span></div>
          <div class="hnm-item"><b>FLASH</b><span>Live headlines</span></div>
          <div class="hnm-item"><b>INDICES</b><span>Live prices</span></div>
          <div class="hnm-item"><b>CENTER</b><span>Panels for that desk</span></div>
          <div class="hnm-item"><b>BOTTOM</b><span>4-column multiview tape</span></div>
        </div>` +
        HOW_TO_STEPS.map(
          (s) => `<div class="howto-step"><h4>${UI.esc(s.title)}</h4><p>${UI.esc(s.text)}</p></div>`
        ).join("");
    }
    if (models && typeof INDICATOR_EXPLAIN !== "undefined") {
      models.innerHTML =
        `<h3 class="howto-h3">SELF-DEVELOPED INDICATORS</h3>
         <p class="hint" style="margin-bottom:10px">Plain-language reads for KMRI, SPI and the full suite. Click any model card on the Models desk for live factors.</p>` +
        Object.keys(INDICATOR_EXPLAIN)
          .map((id) => {
            const ex = INDICATOR_EXPLAIN[id];
            const def = (typeof DEFAULT_INDICATORS !== "undefined" ? DEFAULT_INDICATORS : []).find((d) => d.id === id);
            return `<div class="howto-ind">
            <strong>${UI.esc((def?.name || id).toUpperCase())}</strong>
            <span class="hi-label">${UI.esc(def?.label || "")}</span>
            <p>${UI.esc(ex.short)}</p>
            <p class="muted">${UI.esc(ex.how)}</p>
            <p class="read"><em>Read:</em> ${UI.esc(ex.read)}</p>
          </div>`;
          })
          .join("");
    }
    modal.hidden = false;
  }
  function closeHowTo() {
    const modal = $("#howToModal");
    if (modal) modal.hidden = true;
  }

  function setViewMode(mode, opts = {}) {
    const next = mode === "mobile" ? "mobile" : "desktop";
    const changed = state.viewMode !== next;
    state.viewMode = next;
    document.body.classList.toggle("view-mobile", state.viewMode === "mobile");
    document.body.classList.toggle("view-desktop", state.viewMode === "desktop");
    $$("#viewToggle .vt-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.viewmode === state.viewMode)
    );
    const dock = $("#mobileDock");
    if (dock) dock.hidden = state.viewMode !== "mobile";
    if (state.viewMode !== "mobile") closeMobileSheets();
    if (state.viewMode === "mobile") renderMobileDock();
    try {
      Map3D.resize?.();
    } catch {
      /* */
    }
    if (changed && !opts.silent) {
      UI.toast(state.viewMode === "mobile" ? "PHONE view · bottom nav" : "DESK view · wide grid");
    }
    // reflow after CSS grid settles
    requestAnimationFrame(() => {
      try {
        Map3D.resize?.();
      } catch {
        /* */
      }
      if (state.viewMode === "mobile") scrollActiveDeskIntoView();
    });
  }

  function closeMobileSheets() {
    const filter = $("#mdFilterSheet");
    const more = $("#mdMoreSheet");
    const back = $("#mdBackdrop");
    if (filter) filter.hidden = true;
    if (more) more.hidden = true;
    if (back) back.hidden = true;
    document.body.classList.remove("md-sheet-open");
  }

  function openMobileSheet(which) {
    if (state.viewMode !== "mobile") return;
    closeMobileSheets();
    const el = which === "filters" ? $("#mdFilterSheet") : $("#mdMoreSheet");
    const back = $("#mdBackdrop");
    if (el) el.hidden = false;
    if (back) back.hidden = false;
    document.body.classList.add("md-sheet-open");
    if (which === "more") renderMobileDock();
  }

  function scrollActiveDeskIntoView() {
    const rail = $("#mobileDeskRail");
    const active = rail?.querySelector(".md-desk.active");
    if (!rail || !active) return;
    try {
      active.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    } catch {
      active.scrollIntoView(false);
    }
  }

  function pickMobileDesk(id) {
    if (!id) return;
    closeMobileSheets();
    setView(id);
    renderMobileDock();
    // scroll workspace to top of panels for orientation
    const ws = $("#workspace") || $(".main-col");
    if (ws) ws.scrollTop = 0;
    const grid = $("#widgetGrid");
    if (grid) grid.scrollTop = 0;
    requestAnimationFrame(scrollActiveDeskIntoView);
  }

  function renderMobileDock() {
    const rail = $("#mobileDeskRail");
    const more = $("#mdMoreGrid");
    const desks = typeof DESK_CATALOG !== "undefined" ? DESK_CATALOG : [];
    const view = Layout.getView?.() || "command";
    // Prefer common desks first in the thumb rail
    const priority = [
      "command",
      "answers",
      "geo",
      "markets",
      "afford",
      "infra",
      "weather",
      "news",
      "impact",
      "compare",
      "inflation",
      "tech",
      "risk",
    ];
    const ordered = [
      ...priority.map((id) => desks.find((d) => d.id === id)).filter(Boolean),
      ...desks.filter((d) => !priority.includes(d.id)),
    ];
    if (rail) {
      rail.innerHTML = ordered
        .map(
          (d) =>
            `<button type="button" class="md-desk ${d.id === view ? "active" : ""}" data-view="${d.id}" role="tab" aria-selected="${
              d.id === view ? "true" : "false"
            }">
          <span class="md-ico" aria-hidden="true">${d.icon || "·"}</span>
          <span class="md-txt">${UI.esc(d.title)}</span>
        </button>`
        )
        .join("");
      rail.querySelectorAll(".md-desk").forEach((btn) => {
        btn.addEventListener("click", () => pickMobileDesk(btn.dataset.view));
      });
    }
    if (more) {
      more.innerHTML = desks
        .map(
          (d) =>
            `<button type="button" class="md-more-item ${d.id === view ? "active" : ""}" data-view="${d.id}">
          <span class="md-ico">${d.icon || "·"}</span>
          <span class="md-more-t">${UI.esc(d.title)}</span>
          <span class="md-more-b">${UI.esc(d.blurb || d.desc || "")}</span>
        </button>`
        )
        .join("");
      more.querySelectorAll(".md-more-item").forEach((btn) => {
        btn.addEventListener("click", () => pickMobileDesk(btn.dataset.view));
      });
    }
    requestAnimationFrame(scrollActiveDeskIntoView);
  }

  /** Homescreen / PWA / UWP standalone detection */
  function isStandaloneApp() {
    try {
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
      if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
      if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
    } catch {
      /* */
    }
    // iOS Safari "Add to Home Screen"
    if (typeof navigator.standalone === "boolean" && navigator.standalone) return true;
    // Windows / some WebView hosts
    if (document.referrer && /android-app:|ms-appx-web:/i.test(document.referrer)) return true;
    return false;
  }

  /** Keep installed app on the production entry URL when possible */
  const PWA_ENTRY = "https://benjaminkoch.info/wm_terminal.html";

  function applyStandaloneLayout() {
    const standalone = isStandaloneApp();
    document.documentElement.classList.toggle("standalone-app", standalone);
    document.body.classList.toggle("standalone-app", standalone);
    if (!standalone) return;
    // App mode: prefer phone layout under tablet width for touch responsiveness
    const preferPhone = window.matchMedia("(max-width: 1100px)").matches || "ontouchstart" in window;
    if (preferPhone && state.viewMode !== "mobile") {
      setViewMode("mobile", { silent: true });
    }
    // Safe reflow after launch chrome settles
    setTimeout(() => {
      try {
        Map3D.resize?.();
      } catch {
        /* */
      }
      if (state.viewMode === "mobile") scrollActiveDeskIntoView?.();
    }, 120);
    setTimeout(() => {
      try {
        Map3D.resize?.();
      } catch {
        /* */
      }
    }, 600);
  }

  function registerPWA() {
    // Service worker scoped to site root so homescreen always serves the app shell
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js", { scope: "./" })
        .then(() => {
          /* installed */
        })
        .catch(() => {
          /* optional on file:// */
        });
    }
    applyStandaloneLayout();
    // Re-apply when display mode changes (some browsers flip after install)
    try {
      const dm = window.matchMedia("(display-mode: standalone)");
      const onDm = () => applyStandaloneLayout();
      if (dm.addEventListener) dm.addEventListener("change", onDm);
      else if (dm.addListener) dm.addListener(onDm);
    } catch {
      /* */
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      state.deferredInstall = e;
      const btn = $("#btnInstall");
      if (btn) {
        btn.hidden = false;
        btn.title = "Add to home screen → opens " + PWA_ENTRY;
      }
      const md = $("#mdInstall");
      if (md) md.classList.add("ready");
    });
    window.addEventListener("appinstalled", () => {
      state.deferredInstall = null;
      const btn = $("#btnInstall");
      if (btn) btn.hidden = true;
      UI.toast("Added · opens wm_terminal.html");
      applyStandaloneLayout();
    });
  }

  async function promptInstall() {
    if (state.deferredInstall) {
      state.deferredInstall.prompt();
      try {
        await state.deferredInstall.userChoice;
      } catch {
        /* */
      }
      state.deferredInstall = null;
      const btn = $("#btnInstall");
      if (btn) btn.hidden = true;
      return;
    }
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isStandaloneApp()) {
      UI.toast("Already on home screen");
      return;
    }
    if (isIos) {
      // iOS uses the *current* page URL for the icon — ensure users add from wm_terminal
      if (!/wm_terminal\.html/i.test(location.pathname)) {
        UI.toast("Open wm_terminal.html first, then Share → Add to Home Screen");
        return;
      }
      UI.toast("iPhone: Share → Add to Home Screen");
      return;
    }
    UI.toast("Browser menu → Install app / Add to Home Screen");
  }

  function bindChrome() {
    // desks rendered dynamically in populateDeskNav

    $("#viewToggle")?.addEventListener("click", (e) => {
      const b = e.target.closest(".vt-btn");
      if (!b) return;
      setViewMode(b.dataset.viewmode);
    });
    $("#btnInstall")?.addEventListener("click", () => promptInstall());
    $("#mdHelp")?.addEventListener("click", () => {
      closeMobileSheets();
      openHowTo();
    });
    $("#mdAnswers")?.addEventListener("click", () => pickMobileDesk("answers"));
    $("#mdMap")?.addEventListener("click", () => pickMobileDesk("geo"));
    $("#mdFilters")?.addEventListener("click", () => openMobileSheet("filters"));
    $("#mdMore")?.addEventListener("click", () => openMobileSheet("more"));
    $("#mdFilterClose")?.addEventListener("click", closeMobileSheets);
    $("#mdMoreClose")?.addEventListener("click", closeMobileSheets);
    $("#mdBackdrop")?.addEventListener("click", closeMobileSheets);
    $("#mdJumpCountry")?.addEventListener("click", () => {
      closeMobileSheets();
      const sel = $("#countrySelect");
      if (sel) {
        sel.focus();
        // bring context into view
        sel.scrollIntoView({ behavior: "smooth", block: "center" });
        try {
          sel.showPicker?.();
        } catch {
          /* */
        }
      }
      UI.toast("Choose a country");
    });
    $("#mdJumpRegion")?.addEventListener("click", () => {
      closeMobileSheets();
      const sel = $("#regionSelect");
      if (sel) {
        sel.focus();
        sel.scrollIntoView({ behavior: "smooth", block: "center" });
        try {
          sel.showPicker?.();
        } catch {
          /* */
        }
      }
    });
    $("#mdJumpLens")?.addEventListener("click", () => {
      closeMobileSheets();
      const sel = $("#lensSelect");
      if (sel) {
        sel.focus();
        sel.scrollIntoView({ behavior: "smooth", block: "center" });
        try {
          sel.showPicker?.();
        } catch {
          /* */
        }
      }
    });
    $("#mdClearFocus")?.addEventListener("click", () => {
      closeMobileSheets();
      $("#focusClear")?.click();
    });

    // Auto phone layout on narrow screens; keep in sync on rotate/resize
    const mq = window.matchMedia("(max-width: 720px)");
    const syncPhone = () => {
      if (mq.matches && state.viewMode !== "mobile") setViewMode("mobile", { silent: true });
    };
    syncPhone();
    if (mq.addEventListener) mq.addEventListener("change", syncPhone);
    else if (mq.addListener) mq.addListener(syncPhone);
    window.addEventListener(
      "resize",
      () => {
        if (state.viewMode === "mobile") {
          try {
            Map3D.resize?.();
          } catch {
            /* */
          }
        }
      },
      { passive: true }
    );

    $("#domainPills")?.addEventListener("click", (e) => {
      const p = e.target.closest(".domain-pill");
      if (!p) return;
      state.domain = p.dataset.domain;
      $$(".domain-pill").forEach((x) => x.classList.toggle("active", x === p));
      refreshAllPanels();
    });

    $("#countrySelect")?.addEventListener("change", (e) => {
      state.country = e.target.value;
      applyCountryFocus();
      // Force country-bound panels to re-bind (affordability, CII, weather, news…)
      fillAfford();
      fillAffordRank();
      fillAffordEdu();
      fillAffordHome();
      fillAffordMove();
      fillFamilyAfford();
      fillMoveTo();
      fillCompare();
      fillInflation();
      fillClimatefood();
      fillAffordRisk();
      fillPowerMix();
      fillTelecoms();
      fillOutages();
      fillCritInfra();
      fillInfra();
      fillCountry();
      fillCII();
      fillImpact();
      fillNews();
      fillNewsFocus();
      fillWeather();
      fillAnswers();
      fillImplications();
      fillTriad();
      fillMktBoard();
      updateFocusChrome();
    });

    $("#regionSelect")?.addEventListener("change", (e) => {
      state.regionGroup = e.target.value || "all";
      populateCountrySelect();
      refreshAllPanels();
      const rg = (typeof REGION_GROUPS !== "undefined" ? REGION_GROUPS : []).find((g) => g.id === state.regionGroup);
      UI.toast(`Region · ${rg?.name || "All"} · ${scopedCountries().length} countries`);
    });
    $("#develSelect")?.addEventListener("change", (e) => {
      state.develFilter = e.target.value || "all";
      populateCountrySelect();
      refreshAllPanels();
      UI.toast(
        state.develFilter === "developed"
          ? `Developed economies · ${scopedCountries().length}`
          : state.develFilter === "developing"
            ? `Developing / emerging · ${scopedCountries().length}`
            : `All economies · ${scopedCountries().length}`
      );
    });
    $("#instrumentSelect")?.addEventListener("change", (e) => {
      state.instrument = e.target.value;
      updateFocusChrome();
      fillInstrument();
      fillMarkets();
      fillCommodities();
      fillMktBoard();
      fillMktHero();
      fillGrocery();
      fillImpact();
      renderMacroStrip();
    });
    $("#scenarioSelect")?.addEventListener("change", (e) => {
      state.scenario = e.target.value;
      onScenarioChange();
    });
    $("#lensSelect")?.addEventListener("change", (e) => {
      state.lens = e.target.value;
      updateFocusChrome();
      refreshAllPanels();
      UI.toast(`Lens · ${LENSES.find((l) => l.id === state.lens)?.name || state.lens} · markets & news re-basket`);
    });
    $("#focusClear")?.addEventListener("click", () => {
      state.country = "";
      state.instrument = "";
      state.scenario = "baseline";
      state.lens = "overview";
      state.domain = "all";
      state.regionGroup = "all";
      state.develFilter = "all";
      $("#countrySelect").value = "";
      $("#instrumentSelect").value = "";
      $("#scenarioSelect").value = "baseline";
      if ($("#lensSelect")) $("#lensSelect").value = "overview";
      if ($("#regionSelect")) $("#regionSelect").value = "all";
      if ($("#develSelect")) $("#develSelect").value = "all";
      populateCountrySelect();
      $$(".domain-pill").forEach((x) => x.classList.toggle("active", x.dataset.domain === "all"));
      Map3D.flyTo(20, 18, 1.5);
      refreshAllPanels();
    });

    $("#timeRange")?.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-range]");
      if (!b) return;
      state.timeRange = b.dataset.range;
      $$("#timeRange button").forEach((x) => x.classList.toggle("active", x === b));
    });

    $("#globalSearch")?.addEventListener("input", (e) => {
      state.search = (e.target.value || "").trim().toLowerCase();
      refreshAllPanels();
    });

    $("#btnLayout")?.addEventListener("click", () => {
      Layout.setEditMode(!Layout.isEditMode());
      UI.toast(
        Layout.isEditMode()
          ? "LAYOUT EDIT ON — drag panel headers onto another panel"
          : "Layout locked"
      );
    });
    $("#btnLayoutDone")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      Layout.setEditMode(false);
      const ban = $("#layoutBanner");
      if (ban) {
        ban.hidden = true;
        ban.style.display = "none";
      }
      UI.toast("Layout locked");
    });
    $("#btnLayoutReset")?.addEventListener("click", () => Layout.resetLayout());
    $("#btnSettings")?.addEventListener("click", openSettings);
    $("#settingsClose")?.addEventListener("click", closeSettings);
    $("#settingsModal")?.addEventListener("click", (e) => {
      if (e.target.id === "settingsModal") closeSettings();
    });
    $("#btnHowTo")?.addEventListener("click", openHowTo);
    $("#btnHowToInline")?.addEventListener("click", openHowTo);
    $("#howToClose")?.addEventListener("click", closeHowTo);
    $("#howToClose2")?.addEventListener("click", closeHowTo);
    $("#howToModal")?.addEventListener("click", (e) => {
      if (e.target.id === "howToModal") closeHowTo();
    });
    $("#howToTour")?.addEventListener("click", () => {
      closeHowTo();
      UI.startTour();
    });
    $("#howToDesks")?.addEventListener("click", () => {
      closeHowTo();
      setView("command");
      UI.toast("Left rail = pre-configured desks");
    });

    $("#settingsTabs")?.addEventListener("click", (e) => {
      const t = e.target.closest(".stab");
      if (!t) return;
      $$(".stab").forEach((s) => s.classList.toggle("active", s === t));
      $$(".stab-panel").forEach((p) => {
        p.hidden = p.dataset.panel !== t.dataset.stab;
      });
    });

    $("#btnAddIndicator")?.addEventListener("click", () => {
      Indicators.addDef({ name: "USR", label: "User Model" });
      renderIndicatorEditor();
      recomputeIndicators();
    });
    $("#btnRefreshAll")?.addEventListener("click", () => Feeds.refreshAll().then(() => UI.toast("Refreshed")));
    $("#btnFactoryReset")?.addEventListener("click", () => {
      if (confirm("Reset this visit? Nothing is stored on the device — the page will reload fresh.")) {
        Storage.clearAll();
        location.reload();
      }
    });

    $("#feedHealth")?.addEventListener("click", () => {
      state.stream = "log";
      $$(".st").forEach((s) => s.classList.toggle("active", s.dataset.stream === "log"));
      renderStream();
      setView("risk");
    });

    $$("#streamTabs .st").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.stream = btn.dataset.stream;
        $$("#streamTabs .st").forEach((s) => s.classList.toggle("active", s === btn));
        renderStream();
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeMobileSheets();
        UI.closeDrawer();
        closeSettings();
        closeHowTo();
        UI.endTour();
        if (Layout.isEditMode()) Layout.setEditMode(false);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "/") {
        e.preventDefault();
        $("#globalSearch")?.focus();
      }
      if (e.key === "?") {
        e.preventDefault();
        openHowTo();
      }
      if (e.key === "e" || e.key === "E") {
        Layout.setEditMode(!Layout.isEditMode());
        UI.toast(Layout.isEditMode() ? "LAYOUT EDIT ON — drag headers" : "Layout locked");
      }
      if (e.key === "r" || e.key === "R") Feeds.refreshAll().then(() => UI.toast("Refreshed"));
      if (e.key === "g" || e.key === "G") setView("geo");
      if (e.key === "a" || e.key === "A") setView("answers");
      if (e.key === "k" || e.key === "K") setView("risk");
      if (e.key >= "1" && e.key <= "9") {
        const views = ["command", "answers", "geo", "crisis", "weather", "markets", "commodities", "impact", "news"];
        const v = views[parseInt(e.key, 10) - 1];
        if (v) setView(v);
      }
      if (e.key === "0") setView("transport");
    });

    window.addEventListener("resize", () => Map3D.resize());
  }

  function bindFeeds() {
    Feeds.on("news", () => {
      fillNews();
      fillNewsFocus();
      fillOutages();
      fillCritInfra();
      renderTicker();
      renderStream();
      recomputeIndicators();
      updateFeedHealth();
    });
    Feeds.on("markets", () => {
      fillMarkets();
      fillCommodities();
      fillEnergy();
      fillInsurance();
      fillInstrument();
      fillMktBoard();
      fillMktHero();
      fillCurrencies();
      fillMetals();
      fillSemiconductors();
      fillDatacenters();
      fillTechBrief();
      fillGrocery();
      fillImpact();
      fillAfford();
      fillAffordRank();
      fillAffordEdu();
      fillAffordHome();
      fillAffordMove();
      fillFamilyAfford();
      fillMoveTo();
      fillChipchain();
      fillPowerai();
      fillClimatefood();
      fillCompare();
      fillInflation();
      fillAffordRisk();
      renderMacroStrip();
      recomputeIndicators();
      updateFeedHealth();
    });
    Feeds.on("quakes", () => {
      fillQuakes();
      pushMarkers();
      fillAlerts();
      recomputeIndicators();
      updateFeedHealth();
    });
    Feeds.on("eonet", () => {
      fillDisasters();
      pushMarkers();
      recomputeIndicators();
      updateFeedHealth();
      renderStream();
    });
    Feeds.on("weather", () => {
      fillWeather();
      fillClimatefood();
      fillCompare();
      fillCountry();
      recomputeIndicators();
      updateFeedHealth();
    });
    Feeds.on("relief", () => {
      updateFeedHealth();
    });
    Feeds.on("health", updateFeedHealth);
    Feeds.on("refresh", () => {
      refreshAllPanels();
      recomputeIndicators();
    });
    Feeds.on("log", () => {
      if (state.stream === "log") renderStream();
    });
  }

  function init() {
    const savedLayers = Storage.get("layers");
    if (savedLayers) Object.assign(state.layers, savedLayers);
    const savedIv = Storage.get("intervals") || DEFAULT_INTERVALS;
    const savedNews = Storage.get("newsSources") || {};

    UI.init();
    populateSelectors();
    bindChrome();
    bindFeeds();
    registerPWA();

    Layout.init(() => {
      refreshAllPanels();
    });

    populateDeskNav();
    const view = Layout.getView();
    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));
    // Homescreen / standalone: re-apply phone layout after first paint
    applyStandaloneLayout();
    if (state.viewMode === "mobile") renderMobileDock();

    tickClock();
    setInterval(tickClock, 1000);

    Feeds.start({ intervals: savedIv, newsSources: savedNews });
    restartTimers(savedIv);
    recomputeIndicators();

    setInterval(() => {
      const h = state.hotspots[Math.floor(Math.random() * state.hotspots.length)];
      const n = Math.random() > 0.55 ? 1 : -1;
      h.score = Math.max(20, Math.min(99, h.score + n));
      h.delta += n;
      if (Layout.bodyEl("hotspots")) fillHotspots();
    }, 15000);

    $("#footerStatus").textContent = "LIVE · NO COOKIES · NO DISK CACHE · THIS VISIT ONLY";
    // Open help once per browser tab (memory only — never saved on disk)
    if (!Storage.get("howto_seen_session")) {
      setTimeout(() => {
        openHowTo();
        Storage.set("howto_seen_session", true);
      }, 500);
    }
    console.info(
      "%c WMT %c desks · compare · inflation · PWA · mobile/desktop ",
      "background:#f5a623;color:#000;font-weight:700",
      "color:#8b93a7"
    );
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
