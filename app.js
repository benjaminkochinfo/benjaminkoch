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
  function populateSelectors() {
    const cs = $("#countrySelect");
    const sorted = [...COUNTRIES].sort((a, b) => {
      if (a.code === "GLOBAL") return -1;
      if (b.code === "GLOBAL") return 1;
      return a.name.localeCompare(b.name);
    });
    cs.innerHTML = sorted
      .map((c) => `<option value="${c.code === "GLOBAL" ? "" : c.code}">${c.name}</option>`)
      .join("");
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
  function buildMarkers() {
    const list = [];
    MARKERS.filter((m) => state.layers[m.layer] !== false && countryOk(m) && matchSearch(m.title)).forEach((m) => {
      list.push({ ...m, color: layerColor(m) });
    });
    if (state.layers.natural !== false || state.layers.disasters !== false) {
      (Feeds.getState().quakes || []).slice(0, 30).forEach((q) => {
        if (!matchSearch(q.place || "")) return;
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
    if (state.layers.disasters !== false || state.layers.weather !== false) {
      (Feeds.getState().eonet || []).forEach((ev) => {
        if (!ev.lat && !ev.lon) return;
        if (!matchSearch(ev.title)) return;
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
    renderTicker();
    renderStream();
    updateFocusChrome();
    updateFeedHealth();
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

  function fillAfford() {
    const el = Layout.bodyEl("afford");
    if (!el) return;
    const code = selectedCountryCode();
    if (!code) {
      el.innerHTML = empty("Pick a country", "Select any country above — costs always match that country.");
      return;
    }
    const row = affordRow(code);
    if (!row) {
      el.innerHTML = empty("No profile", "Could not build affordability for this country.");
      return;
    }
    const cname = COUNTRIES.find((c) => c.code === row.code)?.name || row.code;
    const cats = typeof AFFORD_CATEGORIES !== "undefined" ? AFFORD_CATEGORIES : [];
    Layout.metaEl("afford") && (Layout.metaEl("afford").textContent = `SCORE ${row.affordScore}`);
    el.innerHTML = `<div class="afford-hero">
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
      <div class="afford-foot">Includes housing, groceries, utilities, energy, gas/fuel, cars, public transport, public vs private school, university, childcare, and healthcare.</div>`;
  }

  function fillAffordRank() {
    const el = Layout.bodyEl("affordRank");
    if (!el) return;
    // Rank ALL countries in the worldwide catalog (each uses its own profile)
    const list = COUNTRIES.filter((c) => c.code && c.code !== "GLOBAL")
      .map((c) => affordRow(c.code))
      .filter(Boolean)
      .sort((a, b) => b.affordScore - a.affordScore);
    Layout.metaEl("affordRank") && (Layout.metaEl("affordRank").textContent = `${list.length} PLACES`);
    el.innerHTML = `<div class="panel-banner">Higher score = everyday life costs feel easier · every country has its own profile</div>
      <div class="afford-rank-list">${list
        .map((a, i) => {
          const name = COUNTRIES.find((c) => c.code === a.code)?.name || a.code;
          const active = state.country === a.code ? " active" : "";
          return `<button type="button" class="ar-row${active}" data-code="${a.code}">
            <span class="ar-rank mono">${i + 1}</span>
            <span class="ar-name">${UI.esc(name)}</span>
            <span class="ar-score mono" style="color:${affordScoreColor(a.affordScore)}">${a.affordScore}</span>
            <span class="ar-bar"><i style="width:${a.affordScore}%;background:${affordScoreColor(a.affordScore)}"></i></span>
          </button>`;
        })
        .join("")}</div>`;
    el.querySelectorAll(".ar-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.country = btn.dataset.code;
        if ($("#countrySelect")) $("#countrySelect").value = state.country;
        applyCountryFocus();
      });
    });
  }

  function fillAffordEdu() {
    const el = Layout.bodyEl("affordEdu");
    if (!el) return;
    const code = selectedCountryCode();
    if (!code) {
      el.innerHTML = empty("Pick a country", "Education costs follow the country you select.");
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
      el.innerHTML = empty("Pick a country", "Home costs follow the country you select.");
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
      el.innerHTML = empty("Pick a country", "Transport costs follow the country you select.");
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

  function fillLayers() {
    const el = Layout.bodyEl("layers");
    if (!el) return;
    let layers = LAYERS;
    if (state.domain !== "all") {
      layers = LAYERS.filter((l) => !l.domain || l.domain === state.domain || ["geo", "war"].includes(l.domain) && state.domain === "war");
      // softer: show domain match + always disasters/hotspots for context
      layers = LAYERS.filter((l) => l.domain === state.domain || l.id === "hotspots" || l.id === "disasters");
      if (!layers.length) layers = LAYERS;
    }
    const onCount = layers.filter((l) => state.layers[l.id]).length;
    Layout.metaEl("layers") && (Layout.metaEl("layers").textContent = `${onCount}/${layers.length}`);
    el.innerHTML = `<div class="layer-list">${layers
      .map((l) => {
        const on = state.layers[l.id];
        return `<div class="layer-item ${on ? "on" : ""}" data-layer="${l.id}">
        <span class="swatch" style="background:${l.color}"></span>
        <span class="lname">${l.name}</span>
        <span class="toggle"></span></div>`;
      })
      .join("")}</div>`;
    el.querySelectorAll(".layer-item").forEach((node) => {
      node.addEventListener("click", () => {
        state.layers[node.dataset.layer] = !state.layers[node.dataset.layer];
        Storage.set("layers", state.layers);
        fillLayers();
        pushMarkers();
        fillAlerts();
        UI.toast(`Layer ${node.dataset.layer}`);
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
    Layout.metaEl("indicators") && (Layout.metaEl("indicators").textContent = `${list.length} YOURS`);
    el.innerHTML = `<div class="ind-intro">Your proprietary models · click any card for full explanation · edit weights in ⚙</div>
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
      <div class="kmri-label">★ KMRI · YOUR FLAGSHIP</div>
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
      "Edit weights under Settings → My Indicators. KMRI is protected as flagship.",
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
      type: "YOUR INDICATOR",
      title: `${ind.name} — ${ind.label}`,
      sev,
      meta: [
        ["VALUE", String(ind.value)],
        ["Δ", String(ind.delta)],
        ["OWNER", "Self-developed"],
        ...Object.entries(ind.weights || {}).map(([k, v]) => [`WEIGHT ${k}`, String(v)]),
        ...Object.entries(f)
          .slice(0, 10)
          .map(([k, v]) => [`FACTOR ${k}`, typeof v === "number" ? v.toFixed(1) : String(v)]),
      ],
      body: bodyParts,
    });
  }

  function fillMarkets() {
    const el = Layout.bodyEl("markets");
    if (!el) return;
    let m = (Feeds.getState().markets || MARKETS_SEED).filter((x) =>
      ["fx", "rates", "vol", "equity", "crypto", "metals"].includes(x.cls)
    );
    if (state.search) m = m.filter((x) => matchSearch(x.sym + x.name));
    m.forEach((x) => Charts.push(x.sym, x.val));
    Layout.metaEl("markets") && (Layout.metaEl("markets").textContent = m.some((x) => x.source === "live") ? "LIVE+" : "MODEL");
    el.innerHTML = marketGrid(m, true);
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
    const lens = LENSES.find((l) => l.id === state.lens);
    const c = COUNTRIES.find((x) => x.code === state.country);
    Layout.metaEl("mktboard") &&
      (Layout.metaEl("mktboard").textContent = `${c ? c.code : "GLB"} · ${(lens?.name || "OVERVIEW").toUpperCase()}`);
    el.innerHTML = `<div class="mkt-board-head">
        <div>
          <div class="mkt-board-title">MARKET BOARD</div>
          <div class="mkt-board-sub">Auto basket for <b>${UI.esc(c?.name || "Global")}</b> · lens <b>${UI.esc(
            lens?.name || "Overview"
          )}</b> · live mountain charts</div>
        </div>
        <div class="mkt-board-count mono">${markets.length} ASSETS</div>
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
    Layout.metaEl("mkthero") && (Layout.metaEl("mkthero").textContent = sym);
    el.innerHTML = Charts.heroChart(m, `${sym} · FOCUS`);
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
              : "Steady day — no rush to change your shopping plan.";
        return { m, shop, tone, constructive };
      })
      .filter(Boolean);
    const upN = rows.filter((r) => r.tone === "up").length;
    const downN = rows.filter((r) => r.tone === "down").length;
    const headline =
      upN > downN + 1
        ? "Your next grocery trip may feel a bit more expensive (food or fuel-linked items)."
        : downN > upN + 1
          ? "Good news: several staples are easing — the next shop could feel lighter."
          : "Mixed basket — some items up, some down. Shop smart by category.";
    Layout.metaEl("grocery") && (Layout.metaEl("grocery").textContent = upN > downN ? "FIRMER" : downN > upN ? "EASIER" : "MIXED");
    el.innerHTML = `<div class="grocery-hero ${upN > downN ? "firmer" : downN > upN ? "easier" : "mixed"}">
        <div class="gh-label">YOUR NEXT GROCERY TRIP</div>
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
    const items = filterNews(Feeds.getState().news || []);
    const c = COUNTRIES.find((x) => x.code === state.country);
    const lens = LENSES.find((l) => l.id === state.lens);
    Layout.metaEl("news") && (Layout.metaEl("news").textContent = String(items.length));
    if (!items.length) {
      el.innerHTML = empty("No headlines for filter", "Clear country/lens or wait for live RSS");
      return;
    }
    el.innerHTML =
      `<div class="panel-banner">News · ${UI.esc(c?.name || "Global")} · ${UI.esc(lens?.name || "Overview")}</div>` +
      items
        .slice(0, 50)
        .map(
          (n) => `<div class="news-row ${n.sev === "crit" || n.sev === "high" ? "flash" : ""}" data-id="${n.id}">
      <div class="news-src">${UI.esc(n.source)}${n.cached ? " · CACHE" : ""}</div>
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
    el.innerHTML = INFRA.map(
      (i) => `<div class="infra-row"><span>${i.icon}</span><span class="i-name">${i.name}</span>
      <span class="i-stat ${i.level}">${i.stat}</span></div>`
    ).join("");
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
    Layout.metaEl("weather") &&
      (Layout.metaEl("weather").textContent = wx.length ? `${wx.length} WORLD` : "—");
    if (!wx.length) {
      el.innerHTML = empty("Weather loading…", "Fetching capital temperatures worldwide (Open-Meteo)");
      return;
    }
    // Focus country first, then filter by search, else full world list
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
    const show = wx.slice(0, 200);
    const focus = focusCode ? show.find((w) => w.code === focusCode) : null;
    el.innerHTML =
      `<div class="panel-banner">Worldwide capital temperatures · live Open-Meteo · click a row to fly the map${
        focus
          ? ` · <b>${UI.esc(focus.name)}</b> now <b class="mono">${focus.temp ?? "—"}°C</b>`
          : " · pick a country to pin its temperature on top"
      }</div>
      <div class="wx-world-grid">${show
        .map((w) => {
          const active = focusCode && w.code === focusCode ? " active" : "";
          const t =
            w.temp != null && Number.isFinite(Number(w.temp)) ? `${Number(w.temp).toFixed(1)}°C` : "—";
          return `<div class="wx-row${active}" data-code="${UI.esc(w.code || "")}" data-name="${UI.esc(w.name || "")}">
          <div class="wx-temp mono">${t}</div>
          <div>
            <div class="wx-name">${UI.esc(w.name)}${w.code ? ` <span class="mono wx-code">${UI.esc(w.code)}</span>` : ""}</div>
            <div class="wx-vals mono">${UI.esc(w.region || "")} · wind ${w.wind ?? "—"} · ${UI.esc(w.label || "")}</div>
          </div>
          <div class="i-stat ${w.impact === "ok" ? "ok" : w.impact === "watch" ? "warn" : "crit"}">${(
            w.impact || ""
          ).toUpperCase()}</div>
        </div>`;
        })
        .join("")}</div>
      <div class="afford-foot">${show.length} countries shown${
        (Feeds.getState().weather || []).length > show.length
          ? ` of ${(Feeds.getState().weather || []).length}`
          : ""
      }. Use search or country focus to narrow.</div>`;
    el.querySelectorAll(".wx-row").forEach((n) => {
      n.addEventListener("click", () => {
        const code = n.dataset.code;
        const w = (Feeds.getState().weather || []).find((x) => x.code === code || x.name === n.dataset.name);
        if (w) {
          Map3D.flyTo(w.lon, w.lat, 5);
          if (code && $("#countrySelect")) {
            state.country = code;
            $("#countrySelect").value = code;
            updateFocusChrome();
            fillWeather();
          }
        }
      });
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

  function bindChrome() {
    // desks rendered dynamically in populateDeskNav

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
      $("#countrySelect").value = "";
      $("#instrumentSelect").value = "";
      $("#scenarioSelect").value = "baseline";
      if ($("#lensSelect")) $("#lensSelect").value = "overview";
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
      if (confirm("Reset this visit? Nothing is stored on your device — the page will reload fresh.")) {
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

    Layout.init(() => {
      refreshAllPanels();
    });

    populateDeskNav();
    const view = Layout.getView();
    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.view === view));

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
      "%c WMT %c desks · drag headers · vertical tape · KMRI/SPI explained ",
      "background:#f5a623;color:#000;font-weight:700",
      "color:#8b93a7"
    );
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
