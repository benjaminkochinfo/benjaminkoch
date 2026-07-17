/**
 * WMT v3 — modern dashboard shell
 * Reuses: data.js · Feeds · Map3D · Indicators · countries
 * Does not modify classic wm_terminal.html / app.js
 */
(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const state = {
    desk: "command",
    country: "",
    region: "all",
    lens: "overview",
    scenario: "baseline",
    search: "",
    stream: "news",
    streamSize: "open",
    indicators: [],
    mapReady: false,
  };

  let toastTimer = null;
  let mapInited = false;

  /* ── utils ── */
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function relTime(ts) {
    if (!ts) return "—";
    const d = Date.now() - ts;
    if (d < 6e4) return Math.max(1, Math.round(d / 1e3)) + "s";
    if (d < 36e5) return Math.round(d / 6e4) + "m";
    if (d < 864e5) return Math.round(d / 36e5) + "h";
    return Math.round(d / 864e5) + "d";
  }

  function toast(msg) {
    const el = $("#v3Toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 2200);
  }

  function scoreColor(s) {
    if (s >= 75) return "var(--v3-red)";
    if (s >= 55) return "var(--v3-orange)";
    if (s >= 40) return "var(--v3-amber)";
    return "var(--v3-green)";
  }

  function riskOf(code) {
    if (typeof countryRiskScore === "function") return countryRiskScore(code);
    const c = (typeof COUNTRIES !== "undefined" ? COUNTRIES : []).find((x) => x.code === code);
    return c?.risk ?? 40;
  }

  function openDrawer({ type, title, sev, meta, body, link }) {
    const drawer = $("#v3Drawer");
    const scrim = $("#v3DrawerScrim");
    if (!drawer) return;
    $("#v3DrawerType").textContent = (type || "DETAIL").toUpperCase();
    $("#v3DrawerTitle").textContent = title || "—";
    const metaHtml = (meta || [])
      .map(([k, v]) => `<span>${esc(k)}</span><b>${esc(v)}</b>`)
      .join("");
    const paras = String(body || "")
      .split(/\n+/)
      .filter(Boolean)
      .map((p) => `<p>${esc(p)}</p>`)
      .join("");
    $("#v3DrawerBody").innerHTML = `
      ${metaHtml ? `<div class="meta">${metaHtml}</div>` : ""}
      ${paras || "<p class='v3-empty'>No details</p>"}
      ${link ? `<a class="v3-link" href="${esc(link)}" target="_blank" rel="noopener">Open source</a>` : ""}
    `;
    drawer.hidden = false;
    if (scrim) scrim.hidden = false;
  }

  function closeDrawer() {
    const drawer = $("#v3Drawer");
    const scrim = $("#v3DrawerScrim");
    if (drawer) drawer.hidden = true;
    if (scrim) scrim.hidden = true;
  }

  /* ── news helpers (same contract as classic) ── */
  function latestNews(limit) {
    let list = [...(Feeds.getState().news || [])];
    const seen = new Set();
    list = list.filter((n) => {
      const k = (n.title || "").trim().toLowerCase().slice(0, 96);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (state.search) {
      const q = state.search;
      list = list.filter((n) =>
        ((n.title || "") + " " + (n.source || "")).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (b.published || 0) - (a.published || 0));
    return limit != null ? list.slice(0, limit) : list;
  }

  function focusedNews(limit) {
    const code = state.country;
    if (!code || code === "GLOBAL") return [];
    const keys = [];
    if (typeof COUNTRY_NEWS_KEYS !== "undefined" && COUNTRY_NEWS_KEYS[code]) {
      COUNTRY_NEWS_KEYS[code].forEach((k) => keys.push(String(k).toLowerCase()));
    }
    const c = (COUNTRIES || []).find((x) => x.code === code);
    if (c?.name) keys.push(c.name.toLowerCase());
    let list = (Feeds.getState().news || []).filter((n) => {
      const blob = ((n.title || "") + " " + (n.summary || "")).toLowerCase();
      return keys.some((k) => k.length >= 3 && blob.includes(k));
    });
    list.sort((a, b) => (b.published || 0) - (a.published || 0));
    return limit != null ? list.slice(0, limit) : list;
  }

  /* ── selectors ── */
  function populateSelectors() {
    const cs = $("#v3Country");
    const rs = $("#v3Region");
    const ls = $("#v3Lens");
    const ss = $("#v3Scenario");
    if (cs && typeof COUNTRIES !== "undefined") {
      cs.innerHTML =
        `<option value="">All countries</option>` +
        COUNTRIES.filter((c) => c.code && c.code !== "GLOBAL")
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => `<option value="${c.code}">${esc(c.name)}</option>`)
          .join("");
      cs.value = state.country || "";
    }
    if (rs && typeof REGION_GROUPS !== "undefined") {
      rs.innerHTML = REGION_GROUPS.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join("");
      rs.value = state.region || "all";
    }
    if (ls && typeof LENSES !== "undefined") {
      ls.innerHTML = LENSES.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join("");
      ls.value = state.lens || "overview";
    }
    if (ss && typeof SCENARIOS !== "undefined") {
      ss.innerHTML = SCENARIOS.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
      ss.value = state.scenario || "baseline";
    }
  }

  function renderDeskNav() {
    const host = $("#v3DeskNav");
    if (!host || typeof DESK_CATALOG === "undefined") return;
    host.innerHTML = DESK_CATALOG.filter((d) => d.id !== "custom")
      .map(
        (d) => `<button type="button" class="v3-nav-item ${d.id === state.desk ? "active" : ""}" data-desk="${d.id}">
        <span class="v3-nav-ico">${d.icon || "·"}</span>
        <span class="v3-nav-txt"><b>${esc(d.title)}</b><small>${esc(d.blurb || d.desc || "")}</small></span>
      </button>`
      )
      .join("");
    host.querySelectorAll("[data-desk]").forEach((btn) => {
      btn.addEventListener("click", () => setDesk(btn.dataset.desk));
    });
    renderDock();
  }

  function renderDock() {
    const rail = $("#v3DockRail");
    if (!rail || typeof DESK_CATALOG === "undefined") return;
    const priority = ["command", "geo", "markets", "weather", "news", "afford", "crisis", "risk"];
    const desks = priority
      .map((id) => DESK_CATALOG.find((d) => d.id === id))
      .filter(Boolean);
    rail.innerHTML = desks
      .map(
        (d) => `<button type="button" class="v3-dock-item ${d.id === state.desk ? "active" : ""}" data-desk="${d.id}">
        <span class="ico">${d.icon || "·"}</span><span>${esc(d.title)}</span>
      </button>`
      )
      .join("");
    rail.querySelectorAll("[data-desk]").forEach((btn) => {
      btn.addEventListener("click", () => setDesk(btn.dataset.desk));
    });
  }

  function setDesk(id) {
    if (!id) return;
    state.desk = id;
    document.body.dataset.desk = id;
    $$(".v3-nav-item, .v3-dock-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.desk === id);
    });
    closeNav();
    updateChrome();
    renderGrid();
    const main = $("#v3Main");
    if (main) main.scrollTop = 0;
    toast(`Desk · ${(DESK_CATALOG.find((d) => d.id === id) || {}).title || id}`);
  }

  function updateChrome() {
    const desk = (typeof DESK_CATALOG !== "undefined" ? DESK_CATALOG : []).find((d) => d.id === state.desk);
    const meta = (typeof VIEW_META !== "undefined" ? VIEW_META : {})[state.desk];
    const c = (COUNTRIES || []).find((x) => x.code === state.country);
    const lens = (LENSES || []).find((l) => l.id === state.lens);
    const scen = (SCENARIOS || []).find((s) => s.id === state.scenario);
    $("#v3DeskTitle").textContent = desk?.title || meta?.title || state.desk;
    $("#v3DeskDesc").textContent = desk?.desc || meta?.desc || "";
    $("#v3Path").textContent = [
      c ? c.name.toUpperCase() : "GLOBAL",
      (lens?.name || "Overview").toUpperCase(),
      (scen?.name || "Baseline").toUpperCase(),
    ].join(" · ");
    $("#v3PillCountry").textContent = c ? c.code : "GLOBAL";
    $("#v3PillLens").textContent = (lens?.name || "OVERVIEW").toUpperCase();
    const kmri = state.indicators.find((i) => i.id === "kmri");
    $("#v3PillKmri").textContent = kmri ? `KMRI ${kmri.value}` : "KMRI —";
    $("#v3KmriFoot").textContent = kmri ? `KMRI ${kmri.value}` : "KMRI —";
    const clear = $("#v3ClearFocus");
    if (clear) clear.hidden = !(state.country || (state.region && state.region !== "all") || (state.lens && state.lens !== "overview"));
  }

  function panelSpec(id) {
    const cat = (typeof WIDGET_CATALOG !== "undefined" ? WIDGET_CATALOG : {})[id] || {};
    const w = cat.w || 4;
    let cls = "";
    if (w >= 12 || id === "map") cls = "full";
    else if (w >= 6) cls = "wide";
    if (id === "map") cls += " map-card tall";
    return {
      id,
      title: cat.title || id.toUpperCase(),
      cls: cls.trim(),
      help: cat.help || "",
    };
  }

  /* ── panel renderers ── */
  function cardShell(spec, meta, bodyHtml) {
    return `<article class="v3-card ${spec.cls}" data-panel="${esc(spec.id)}">
      <header class="v3-card-head">
        <span class="v3-card-title">${esc(spec.title)}</span>
        <span class="v3-card-meta">${esc(meta || "")}</span>
      </header>
      <div class="v3-card-body" data-body="${esc(spec.id)}">${bodyHtml}</div>
    </article>`;
  }

  function renderNews(limit = 24, focused = false) {
    const items = focused ? focusedNews(limit) : latestNews(limit);
    if (!items.length) {
      return focused
        ? `<div class="v3-empty"><strong>No country match</strong><span>Pick a country or open global news</span></div>`
        : `<div class="v3-empty"><strong>Loading headlines…</strong><span>Live RSS sources connecting</span></div>`;
    }
    return `<div class="v3-list">${items
      .map(
        (n) => `<div class="v3-row" data-news-id="${esc(n.id)}">
        <div>
          <div class="t">${esc(n.title)}</div>
          <div class="s">${esc(n.source)} · ${relTime(n.published)}</div>
        </div>
        <span class="v3-badge ${n.sev === "crit" || n.sev === "high" ? n.sev : ""}">${esc((n.sev || "info").toUpperCase())}</span>
      </div>`
      )
      .join("")}</div>`;
  }

  function renderMarkets(filterCls) {
    let markets = Feeds.getState().markets || (typeof MARKETS_SEED !== "undefined" ? MARKETS_SEED : []);
    if (filterCls) markets = markets.filter((m) => m.cls === filterCls || (filterCls === "fx" && /USD|EUR|JPY|GBP|CNY/.test(m.sym)));
    const show = markets.slice(0, 24);
    if (!show.length) return `<div class="v3-empty"><strong>Markets loading…</strong></div>`;
    return `<div class="v3-mkt">${show
      .map(
        (m) => `<div class="v3-mkt-card" data-sym="${esc(m.sym)}">
        <div class="sym">${esc(m.sym)}</div>
        <div class="val">${esc(m.val)}</div>
        <div class="chg ${m.dir || ""}">${esc(m.chg)}</div>
      </div>`
      )
      .join("")}</div>`;
  }

  function renderWeather() {
    const wx = (Feeds.getState().weather || []).filter((w) => w.source === "open-meteo" || w.temp != null);
    const live = wx.filter((w) => w.source === "open-meteo");
    const list = (live.length ? live : wx).slice(0, 48);
    if (!list.length) {
      try {
        Feeds.refreshWeather?.();
      } catch {
        /* */
      }
      return `<div class="v3-empty"><strong>Weather loading…</strong><span>Open-Meteo capitals</span></div>`;
    }
    const age = Feeds.getState().weatherUpdated;
    return `<div class="v3-banner">${live.length ? "Live Open-Meteo" : "Estimates"} · ${list.length} cities${age ? " · " + relTime(age) : ""}</div>
      <div class="v3-wx-grid">${list
        .map((w) => {
          const t = w.temp != null ? Number(w.temp).toFixed(0) + "°" : "—";
          return `<div class="v3-wx" data-code="${esc(w.code || "")}">
            <div class="tmp">${t}</div>
            <div class="nm">${esc(w.name)}</div>
            <div class="dt">${esc(w.label || w.source || "")} · wind ${w.wind ?? "—"}</div>
          </div>`;
        })
        .join("")}</div>`;
  }

  function renderHotspots() {
    const list = typeof HOTSPOTS !== "undefined" ? HOTSPOTS : [];
    return `<div class="v3-list">${list
      .slice()
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map(
        (h) => `<div class="v3-row" data-hot="${esc(h.id)}">
        <div><div class="t">${esc(h.name)}</div><div class="s">heat model</div></div>
        <span class="m" style="color:${scoreColor(h.score)}">${h.score}</span>
      </div>`
      )
      .join("")}</div>`;
  }

  function renderTheaters() {
    const list = typeof THEATERS !== "undefined" ? THEATERS : [];
    return `<div class="v3-list">${list
      .map(
        (t) => `<div class="v3-row" data-theater="${esc(t.id)}">
        <div>
          <div class="t">${esc(t.name)}</div>
          <div class="s">${esc(t.note || "")}</div>
        </div>
        <span class="v3-badge ${t.posture || ""}">${esc((t.posture || "watch").toUpperCase())}</span>
      </div>`
      )
      .join("")}</div>`;
  }

  function renderAlerts() {
    const list = typeof ALERTS !== "undefined" ? ALERTS : [];
    return `<div class="v3-list">${list
      .map(
        (a) => `<div class="v3-row">
        <div><div class="t">${esc(a.title)}</div><div class="s">${esc(a.sub || a.layer || "")}</div></div>
        <span class="v3-badge ${a.sev || ""}">${esc((a.sev || "").toUpperCase())}</span>
      </div>`
      )
      .join("")}</div>`;
  }

  function renderKmri() {
    const kmri = state.indicators.find((i) => i.id === "kmri");
    const spi = state.indicators.find((i) => i.id === "spi");
    if (!kmri) return `<div class="v3-empty"><strong>Computing models…</strong></div>`;
    return `<div class="v3-stat-row">
      <div class="v3-stat"><label>KMRI</label><b style="color:${scoreColor(kmri.value)}">${kmri.value}</b></div>
      <div class="v3-stat"><label>SPI</label><b>${spi ? spi.value : "—"}</b></div>
      <div class="v3-stat"><label>Δ</label><b class="${kmri.delta > 0 ? "down" : kmri.delta < 0 ? "up" : ""}">${kmri.delta > 0 ? "+" : ""}${kmri.delta ?? 0}</b></div>
    </div>
    <p class="v3-banner">${esc((typeof INDICATOR_EXPLAIN !== "undefined" && INDICATOR_EXPLAIN.kmri?.short) || "World stress score")}</p>
    <div class="v3-bar"><i style="width:${Math.min(100, kmri.value)}%;background:${scoreColor(kmri.value)}"></i></div>`;
  }

  function renderIndicators() {
    const list = state.indicators.length ? state.indicators : [];
    if (!list.length) return `<div class="v3-empty"><strong>Models loading…</strong></div>`;
    return `<div class="v3-list">${list
      .slice(0, 16)
      .map((ind) => {
        const v = ind.value;
        return `<div class="v3-row" data-ind="${esc(ind.id)}">
          <div>
            <div class="t" style="color:var(--v3-text)">${esc(ind.name || ind.id)}</div>
            <div class="s">${esc(ind.label || "")}</div>
            <div class="v3-bar"><i style="width:${Math.min(100, Math.abs(v))}%;background:${scoreColor(Math.abs(v))}"></i></div>
          </div>
          <span class="m" style="color:${scoreColor(Math.abs(v))}">${v}</span>
        </div>`;
      })
      .join("")}</div>`;
  }

  function renderPulse() {
    const news = latestNews(5);
    const kmri = state.indicators.find((i) => i.id === "kmri");
    const markets = Feeds.getState().markets || [];
    const brent = markets.find((m) => m.sym === "BRENT");
    const vix = markets.find((m) => m.sym === "VIX");
    return `<div class="v3-stat-row">
      <div class="v3-stat"><label>KMRI</label><b style="color:${scoreColor(kmri?.value || 0)}">${kmri?.value ?? "—"}</b></div>
      <div class="v3-stat"><label>Brent</label><b>${esc(brent?.val || "—")}</b></div>
      <div class="v3-stat"><label>VIX</label><b>${esc(vix?.val || "—")}</b></div>
      <div class="v3-stat"><label>News</label><b>${(Feeds.getState().news || []).length}</b></div>
    </div>
    <div class="v3-list">${news
      .map((n) => `<div class="v3-row" data-news-id="${esc(n.id)}"><div><div class="t">${esc(n.title)}</div><div class="s">${relTime(n.published)}</div></div></div>`)
      .join("")}</div>`;
  }

  function renderDisasters() {
    const items = [...(Feeds.getState().eonet || [])].sort((a, b) => (b.date || 0) - (a.date || 0));
    if (!items.length) return `<div class="v3-empty"><strong>No open EONET events</strong></div>`;
    return `<div class="v3-list">${items
      .slice(0, 20)
      .map(
        (d) => `<div class="v3-row">
        <div><div class="t">${esc(d.title)}</div><div class="s">${esc(d.category)} · ${relTime(d.date)}</div></div>
      </div>`
      )
      .join("")}</div>`;
  }

  function renderQuakes() {
    const items = Feeds.getState().quakes || [];
    if (!items.length) return `<div class="v3-empty"><strong>No recent quakes</strong><span>USGS feed</span></div>`;
    return `<div class="v3-list">${items
      .slice(0, 16)
      .map((q) => {
        const mag = q.mag ?? q.magnitude;
        return `<div class="v3-row">
          <div><div class="t">M${mag != null ? Number(mag).toFixed(1) : "?"} · ${esc(q.place || q.title || "")}</div>
          <div class="s">${relTime(q.time || q.date)}</div></div>
        </div>`;
      })
      .join("")}</div>`;
  }

  function renderCountry() {
    const c =
      (COUNTRIES || []).find((x) => x.code === state.country) ||
      (COUNTRIES || []).find((x) => x.code === "USA") ||
      null;
    if (!c) return `<div class="v3-empty"><strong>Select a country</strong></div>`;
    const r = riskOf(c.code);
    return `<div class="v3-stat-row">
      <div class="v3-stat"><label>Risk</label><b style="color:${scoreColor(r)}">${r}</b></div>
      <div class="v3-stat"><label>Region</label><b style="font-size:14px">${esc(c.region || "—")}</b></div>
    </div>
    <p class="v3-banner">${esc(c.name)} · ${esc(c.code)} · click map controls to fly</p>
    <button type="button" class="v3-btn ghost" data-fly="${c.code}" style="width:100%">Fly map to country</button>`;
  }

  function renderMapPlaceholder() {
    return `<div class="v3-map-host" id="v3MapHost"></div>`;
  }

  function renderAnswers() {
    const c = (COUNTRIES || []).find((x) => x.code === state.country);
    const kmri = state.indicators.find((i) => i.id === "kmri");
    const lines = [];
    if (typeof Intel !== "undefined" && Intel.brief) {
      try {
        const b = Intel.brief({
          countryCode: state.country,
          lens: state.lens,
          indicators: state.indicators,
          news: Feeds.getState().news,
          markets: Feeds.getState().markets,
        });
        if (b?.answers) return `<div class="v3-list">${b.answers.map((a) => `<div class="v3-row"><div><div class="t" style="color:var(--v3-text)">${esc(a.q || a.title || "")}</div><div class="s" style="white-space:normal;color:var(--v3-text-2)">${esc(a.a || a.text || "")}</div></div></div>`).join("")}</div>`;
      } catch {
        /* fall through */
      }
    }
    lines.push(`World stress (KMRI) is ${kmri?.value ?? "—"}.`);
    if (c) lines.push(`Focus country: ${c.name}. Risk score ${riskOf(c.code)}.`);
    else lines.push("No country focus — showing global read.");
    lines.push("Use Lenses and Scenarios above to reframe the same live data.");
    return `<div class="v3-list">${lines.map((t) => `<div class="v3-row"><div class="t" style="color:var(--v3-text)">${esc(t)}</div></div>`).join("")}</div>`;
  }

  function renderGrocery() {
    const markets = Feeds.getState().markets || [];
    const legs = ["WHEAT", "CORN", "SOY", "COCOA", "COFFEE", "SUGAR", "BRENT"];
    return `<div class="v3-banner">Food & energy legs that feed grocery pressure</div>
      <div class="v3-mkt">${legs
        .map((sym) => {
          const m = markets.find((x) => x.sym === sym) || { sym, val: "—", chg: "—", dir: "" };
          return `<div class="v3-mkt-card" data-sym="${sym}"><div class="sym">${sym}</div><div class="val">${esc(m.val)}</div><div class="chg ${m.dir}">${esc(m.chg)}</div></div>`;
        })
        .join("")}</div>`;
  }

  function renderTransport() {
    const nodes = typeof TRANSPORT_NODES !== "undefined" ? TRANSPORT_NODES : [];
    return `<div class="v3-list">${nodes
      .map(
        (t) => `<div class="v3-row">
        <div><div class="t">${esc(t.name)}</div><div class="s">${esc(t.note || t.type || "")}</div></div>
        <span class="v3-badge ${t.status || ""}">${esc((t.status || "").toUpperCase())}</span>
      </div>`
      )
      .join("")}</div>`;
  }

  function renderInsurance() {
    const list = typeof INSURANCE_SIGNALS !== "undefined" ? INSURANCE_SIGNALS : [];
    return `<div class="v3-list">${list
      .map(
        (i) => `<div class="v3-row">
        <div><div class="t">${esc(i.name)}</div><div class="s">${esc(i.note || "")}</div></div>
        <span class="m ${i.level === "crit" || i.level === "high" ? "down" : ""}">${esc(i.change || i.level || "")}</span>
      </div>`
      )
      .join("")}</div>`;
  }

  function renderLayers() {
    const layers = typeof LAYERS !== "undefined" ? LAYERS : [];
    return `<div class="v3-list">${layers
      .map(
        (l) => `<div class="v3-row">
        <div><div class="t" style="color:var(--v3-text)">${esc(l.name)}</div><div class="s">${esc(l.domain || "")}</div></div>
        <span class="v3-badge" style="border-left:3px solid ${esc(l.color || "#888")}">${l.on ? "ON" : "OFF"}</span>
      </div>`
      )
      .join("")}</div>
      <p class="v3-banner" style="margin-top:8px">Layer toggles apply on the classic terminal map; v3 shows the catalog.</p>`;
  }

  function renderGenericList(title, items, mapFn) {
    if (!items?.length) return `<div class="v3-empty"><strong>${esc(title)}</strong><span>No data</span></div>`;
    return `<div class="v3-list">${items.map(mapFn).join("")}</div>`;
  }

  function renderPanel(id) {
    const spec = panelSpec(id);
    let body = "";
    let meta = "";
    switch (id) {
      case "map":
        body = renderMapPlaceholder();
        meta = "ESRI · 3D";
        break;
      case "news":
        body = renderNews(30, false);
        meta = `${latestNews().length}`;
        break;
      case "newsfocus":
        body = renderNews(24, true);
        meta = state.country || "—";
        break;
      case "pulse":
        body = renderPulse();
        meta = "LIVE";
        break;
      case "kmri":
        body = renderKmri();
        meta = "MODEL";
        break;
      case "indicators":
        body = renderIndicators();
        meta = `${state.indicators.length}`;
        break;
      case "weather":
        body = renderWeather();
        meta = Feeds.getState().weatherUpdated ? relTime(Feeds.getState().weatherUpdated) : "…";
        break;
      case "hotspots":
        body = renderHotspots();
        break;
      case "theaters":
        body = renderTheaters();
        break;
      case "alerts":
        body = renderAlerts();
        break;
      case "disasters":
        body = renderDisasters();
        meta = "EONET";
        break;
      case "quakes":
        body = renderQuakes();
        meta = "USGS";
        break;
      case "country":
        body = renderCountry();
        break;
      case "answers":
      case "implications":
        body = renderAnswers();
        break;
      case "grocery":
      case "impact":
        body = renderGrocery();
        break;
      case "mktboard":
      case "markets":
      case "mkthero":
        body = renderMarkets();
        meta = "LIVE";
        break;
      case "currencies":
        body = renderMarkets("fx");
        break;
      case "energy":
      case "commodities":
        body = renderMarkets();
        break;
      case "metals":
        body = renderMarkets();
        break;
      case "transport":
        body = renderTransport();
        break;
      case "insurance":
        body = renderInsurance();
        break;
      case "layers":
        body = renderLayers();
        break;
      case "agriculture":
        body = renderGenericList(
          "Ag regions",
          typeof AG_REGIONS !== "undefined" ? AG_REGIONS : [],
          (a) =>
            `<div class="v3-row"><div><div class="t">${esc(a.name)}</div><div class="s">${esc(a.crop)} · ${esc(a.note || "")}</div></div><span class="m">${a.stress}</span></div>`
        );
        break;
      case "compare":
        body = `<div class="v3-banner">Side-by-side compare is fully interactive on Classic. Here: top risk countries.</div>
          ${renderGenericList(
            "CII",
            typeof CII !== "undefined" ? CII.slice(0, 10) : [],
            (c) =>
              `<div class="v3-row"><div class="t">${esc(c.name)}</div><span class="m" style="color:${scoreColor(c.score)}">${c.score}</span></div>`
          )}`;
        break;
      case "inflation":
      case "afford":
      case "affordRisk":
      case "affordRank":
      case "affordHome":
      case "familyAfford":
      case "moveTo":
        body = `<div class="v3-banner">Affordability & inflation models use the same catalog as Classic. Select a country above for focus.</div>
          ${renderCountry()}`;
        break;
      case "chipchain":
      case "powerai":
      case "semiconductors":
      case "datacenters":
      case "powerMix":
      case "telecoms":
      case "outages":
      case "critInfra":
      case "infra":
      case "climate":
      case "climatefood":
      case "instrument":
      case "radar":
      case "triad":
        body = `<div class="v3-banner">${esc(spec.help || spec.title)} — live markets & models sync with Classic.</div>${renderMarkets()}`;
        break;
      default:
        body = `<div class="v3-empty"><strong>${esc(spec.title)}</strong><span>${esc(spec.help || "Panel")}</span></div>`;
    }
    return cardShell(spec, meta, body);
  }

  function renderGrid() {
    const grid = $("#v3Grid");
    if (!grid) return;
    const preset =
      (typeof VIEW_PRESETS !== "undefined" && VIEW_PRESETS[state.desk]) ||
      VIEW_PRESETS?.command ||
      ["pulse", "kmri", "map", "news", "weather", "mktboard"];
    const ids = [...new Set(preset.map((id) => (typeof WIDGET_ALIASES !== "undefined" && WIDGET_ALIASES[id]) || id))];
    grid.innerHTML = ids.map((id) => renderPanel(id)).join("");
    bindPanelClicks(grid);
    ensureMap();
  }

  function bindPanelClicks(root) {
    root.querySelectorAll("[data-news-id]").forEach((row) => {
      row.addEventListener("click", () => {
        const n = (Feeds.getState().news || []).find((x) => x.id === row.dataset.newsId);
        if (n)
          openDrawer({
            type: "NEWS",
            title: n.title,
            sev: n.sev,
            meta: [
              ["SOURCE", n.source],
              ["AGE", relTime(n.published)],
            ],
            body: n.summary || "",
            link: n.link,
          });
      });
    });
    root.querySelectorAll("[data-sym]").forEach((el) => {
      el.addEventListener("click", () => {
        const m = (Feeds.getState().markets || []).find((x) => x.sym === el.dataset.sym);
        if (m)
          openDrawer({
            type: "MARKET",
            title: `${m.sym} · ${m.name || ""}`,
            meta: [
              ["LAST", m.val],
              ["CHG", m.chg],
              ["SOURCE", m.source || "—"],
            ],
            body: m.name || m.sym,
          });
      });
    });
    root.querySelectorAll("[data-theater]").forEach((el) => {
      el.addEventListener("click", () => {
        const t = (THEATERS || []).find((x) => x.id === el.dataset.theater);
        if (t)
          openDrawer({
            type: "THEATER",
            title: t.name,
            sev: t.posture === "critical" ? "critical" : "high",
            meta: [["POSTURE", (t.posture || "").toUpperCase()]],
            body: t.note || "",
          });
      });
    });
    root.querySelectorAll("[data-fly]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const c = (COUNTRIES || []).find((x) => x.code === btn.dataset.fly);
        if (c && typeof Map3D !== "undefined") Map3D.flyTo(c.lon, c.lat, c.zoom || 4);
      });
    });
    root.querySelectorAll("[data-code]").forEach((el) => {
      el.addEventListener("click", () => {
        const code = el.dataset.code;
        if (!code) return;
        state.country = code;
        if ($("#v3Country")) $("#v3Country").value = code;
        const w = (Feeds.getState().weather || []).find((x) => x.code === code);
        if (w && Map3D?.flyTo) Map3D.flyTo(w.lon, w.lat, 5);
        updateChrome();
        renderGrid();
      });
    });
    root.querySelectorAll("[data-ind]").forEach((el) => {
      el.addEventListener("click", () => {
        const ind = state.indicators.find((i) => i.id === el.dataset.ind);
        const ex = typeof INDICATOR_EXPLAIN !== "undefined" ? INDICATOR_EXPLAIN[el.dataset.ind] : null;
        if (ind)
          openDrawer({
            type: "MODEL",
            title: ind.name || ind.id,
            meta: [
              ["VALUE", String(ind.value)],
              ["Δ", String(ind.delta ?? "—")],
            ],
            body: [ex?.short, ex?.how, ex?.read].filter(Boolean).join("\n\n") || ind.label || "",
          });
      });
    });
  }

  function ensureMap() {
    const host = $("#v3MapHost");
    if (!host || typeof Map3D === "undefined") return;
    if (!mapInited) {
      mapInited = Map3D.init(host, {
        onSelect: (m) => {
          openDrawer({
            type: m.layer || "MAP",
            title: m.title || "Signal",
            sev: m.sev,
            meta: [
              ["LAYER", m.layer || "—"],
              ["SOURCE", m.source || "—"],
              ["TIME", m.time || "—"],
            ],
            body: m.desc || "",
            link: m.link,
          });
        },
      });
    } else {
      try {
        Map3D.resize?.();
      } catch {
        /* */
      }
    }
    pushMapMarkers();
  }

  function pushMapMarkers() {
    if (typeof Map3D === "undefined" || !Map3D.setMarkers) return;
    const list = [];
    if (typeof MARKERS !== "undefined") {
      MARKERS.forEach((m) => list.push({ ...m, color: m.color }));
    }
    (Feeds.getState().quakes || []).slice(0, 30).forEach((q) => {
      list.push({
        id: "q_" + q.id,
        layer: "natural",
        sev: q.sev,
        lat: q.lat,
        lon: q.lon,
        title: q.title || `M${q.mag}`,
        desc: q.place || "",
        source: "USGS",
        time: relTime(q.time),
        live: true,
        color: "#8bc34a",
      });
    });
    Map3D.setMarkers(list);
  }

  /* ── stream ── */
  function renderStream() {
    const pane = $("#v3StreamPane");
    const footer = $("#v3Stream");
    if (!pane || !footer) return;
    const mode = state.stream;
    footer.classList.toggle("multi", mode === "multi");

    const news = latestNews(40);
    const markets = Feeds.getState().markets || [];
    const eonet = [...(Feeds.getState().eonet || [])].sort((a, b) => (b.date || 0) - (a.date || 0));
    const events = [];
    (typeof THEATERS !== "undefined" ? THEATERS : []).forEach((t) => {
      events.push({
        time: t.posture || "—",
        src: "theater",
        title: t.name + (t.note ? " — " + t.note : ""),
        sev: t.posture === "critical" ? "crit" : t.posture === "elevated" ? "high" : "med",
      });
    });
    latestNews(12).forEach((n) => {
      events.push({ time: relTime(n.published), src: n.source, title: n.title, sev: n.sev, link: n.link });
    });

    const rowHtml = (r) =>
      `<div class="v3-srow ${r.sev === "crit" ? "crit" : r.sev === "high" ? "high" : ""}" ${r.link ? `data-link="${esc(r.link)}"` : ""}>
        <span class="tm">${esc(r.time)}</span><span class="src">${esc(r.src)}</span><span class="ti">${esc(r.title)}</span>
      </div>`;

    if (mode === "multi") {
      const mktRows = markets.slice(0, 20).map((m) => ({
        time: m.chg,
        src: m.sym,
        title: `${m.val} · ${m.name || ""}`,
        sev: m.dir === "up" ? "ok" : m.dir === "down" ? "high" : "info",
      }));
      pane.innerHTML = `
        <div class="v3-scol"><h4>NEWS · WORLD</h4><div class="body">${news.map((n) => rowHtml({ time: relTime(n.published), src: n.source, title: n.title, sev: n.sev, link: n.link })).join("") || "<div class='v3-empty'>…</div>"}</div></div>
        <div class="v3-scol"><h4>MARKETS</h4><div class="body">${mktRows.map(rowHtml).join("")}</div></div>
        <div class="v3-scol"><h4>EVENTS</h4><div class="body">${events.slice(0, 30).map(rowHtml).join("")}</div></div>
        <div class="v3-scol"><h4>DISASTERS</h4><div class="body">${eonet.slice(0, 20).map((d) => rowHtml({ time: relTime(d.date), src: d.category, title: d.title, sev: "high" })).join("") || "<div class='v3-empty'>No open events</div>"}</div></div>`;
    } else if (mode === "news") {
      pane.innerHTML = news.map((n) => rowHtml({ time: relTime(n.published), src: n.source, title: n.title, sev: n.sev, link: n.link })).join("") || `<div class="v3-empty">Waiting for news…</div>`;
    } else if (mode === "markets") {
      pane.innerHTML = markets
        .slice(0, 40)
        .map((m) => rowHtml({ time: m.chg, src: m.sym, title: `${m.val} · ${m.name || m.source || ""}`, sev: m.dir === "down" ? "high" : "info" }))
        .join("");
    } else if (mode === "events") {
      pane.innerHTML = events.slice(0, 40).map(rowHtml).join("");
    } else if (mode === "disasters") {
      pane.innerHTML =
        eonet
          .slice(0, 40)
          .map((d) => rowHtml({ time: relTime(d.date), src: d.category, title: d.title, sev: "high" }))
          .join("") || `<div class="v3-empty">No open EONET events</div>`;
    }
    pane.querySelectorAll("[data-link]").forEach((row) => {
      row.addEventListener("click", () => {
        if (row.dataset.link) window.open(row.dataset.link, "_blank", "noopener");
      });
    });
  }

  function recomputeIndicators() {
    if (typeof Indicators === "undefined") return;
    state.indicators = Indicators.compute({
      hotspots: typeof HOTSPOTS !== "undefined" ? HOTSPOTS : [],
      news: Feeds.getState().news,
      markets: Feeds.getState().markets,
      theaters: typeof THEATERS !== "undefined" ? THEATERS : [],
      alerts: typeof ALERTS !== "undefined" ? ALERTS : [],
      quakes: Feeds.getState().quakes,
      eonet: Feeds.getState().eonet,
      weather: Feeds.getState().weather,
      agRegions: typeof AG_REGIONS !== "undefined" ? AG_REGIONS : [],
      insurance: typeof INSURANCE_SIGNALS !== "undefined" ? INSURANCE_SIGNALS : [],
      countryCode: state.country,
    });
    updateChrome();
  }

  function updateFeedHealth() {
    const live = $("#v3Live");
    if (!live || typeof Feeds === "undefined") return;
    const h = Feeds.overallHealth?.() || "ok";
    live.classList.remove("warn", "err");
    if (h === "warn") live.classList.add("warn");
    if (h === "err") live.classList.add("err");
  }

  function tickClock() {
    const n = new Date();
    const el = $("#v3Clock");
    if (el)
      el.textContent = [n.getUTCHours(), n.getUTCMinutes(), n.getUTCSeconds()]
        .map((x) => String(x).padStart(2, "0"))
        .join(":");
  }

  /* ── nav mobile ── */
  function openNav() {
    document.body.classList.add("nav-open");
    $("#v3NavToggle")?.setAttribute("aria-expanded", "true");
    const scrim = $("#v3NavScrim");
    if (scrim) scrim.hidden = false;
  }
  function closeNav() {
    document.body.classList.remove("nav-open");
    $("#v3NavToggle")?.setAttribute("aria-expanded", "false");
    const scrim = $("#v3NavScrim");
    if (scrim) scrim.hidden = true;
  }

  function syncResponsive() {
    const compact = window.matchMedia("(max-width: 1024px)").matches;
    const dock = $("#v3Dock");
    if (dock) dock.hidden = !compact;
    document.documentElement.style.setProperty(
      "--vv-h",
      `${window.visualViewport?.height || window.innerHeight}px`
    );
    try {
      Map3D?.resize?.();
    } catch {
      /* */
    }
  }

  function bindUi() {
    $("#v3NavToggle")?.addEventListener("click", openNav);
    $("#v3NavClose")?.addEventListener("click", closeNav);
    $("#v3NavScrim")?.addEventListener("click", closeNav);
    $("#v3DrawerClose")?.addEventListener("click", closeDrawer);
    $("#v3DrawerScrim")?.addEventListener("click", closeDrawer);
    $("#v3Refresh")?.addEventListener("click", () => {
      Feeds.refreshAll?.().then(() => toast("Refreshed"));
    });
    $("#v3Country")?.addEventListener("change", (e) => {
      state.country = e.target.value || "";
      updateChrome();
      renderGrid();
      renderStream();
      const c = (COUNTRIES || []).find((x) => x.code === state.country);
      if (c && Map3D?.flyTo) Map3D.flyTo(c.lon, c.lat, c.zoom || 4);
    });
    $("#v3Region")?.addEventListener("change", (e) => {
      state.region = e.target.value || "all";
      updateChrome();
      renderGrid();
    });
    $("#v3Lens")?.addEventListener("change", (e) => {
      state.lens = e.target.value || "overview";
      updateChrome();
      renderGrid();
    });
    $("#v3Scenario")?.addEventListener("change", (e) => {
      state.scenario = e.target.value || "baseline";
      updateChrome();
    });
    $("#v3ClearFocus")?.addEventListener("click", () => {
      state.country = "";
      state.region = "all";
      state.lens = "overview";
      if ($("#v3Country")) $("#v3Country").value = "";
      if ($("#v3Region")) $("#v3Region").value = "all";
      if ($("#v3Lens")) $("#v3Lens").value = "overview";
      updateChrome();
      renderGrid();
      renderStream();
    });
    $("#v3Search")?.addEventListener("input", (e) => {
      state.search = (e.target.value || "").trim().toLowerCase();
      renderStream();
      if (state.desk === "news") renderGrid();
    });
    $$(".v3-st").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.stream = btn.dataset.stream || "news";
        $$(".v3-st").forEach((b) => b.classList.toggle("active", b === btn));
        renderStream();
      });
    });
    $$("[data-stream-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.streamSize = btn.dataset.streamSize || "open";
        document.body.dataset.streamSize = state.streamSize;
        $$("[data-stream-size]").forEach((b) => b.classList.toggle("active", b === btn));
        setTimeout(() => Map3D?.resize?.(), 80);
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.target.matches("input, select, textarea")) return;
      if (e.key === "r" || e.key === "R") Feeds.refreshAll?.().then(() => toast("Refreshed"));
      if (e.key === "Escape") {
        closeDrawer();
        closeNav();
      }
    });
    window.addEventListener("resize", () => {
      syncResponsive();
    }, { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(syncResponsive, 100), { passive: true });
    try {
      window.visualViewport?.addEventListener("resize", syncResponsive, { passive: true });
    } catch {
      /* */
    }
  }

  function bindFeeds() {
    Feeds.on("news", () => {
      updateFeedHealth();
      renderStream();
      if (["command", "news", "impact", "crisis"].includes(state.desk)) renderGrid();
      recomputeIndicators();
    });
    Feeds.on("markets", () => {
      updateFeedHealth();
      renderStream();
      if (["command", "markets", "commodities", "metals", "tech", "food"].includes(state.desk)) renderGrid();
      recomputeIndicators();
    });
    Feeds.on("weather", () => {
      updateFeedHealth();
      if (["command", "weather", "geo"].includes(state.desk)) renderGrid();
      recomputeIndicators();
    });
    Feeds.on("quakes", () => {
      pushMapMarkers();
      if (["geo", "weather", "crisis"].includes(state.desk)) renderGrid();
      recomputeIndicators();
    });
    Feeds.on("eonet", () => {
      renderStream();
      if (["geo", "weather", "crisis"].includes(state.desk)) renderGrid();
      recomputeIndicators();
    });
    Feeds.on("refresh", () => {
      recomputeIndicators();
      renderGrid();
      renderStream();
      updateFeedHealth();
    });
    Feeds.on("health", updateFeedHealth);
  }

  function init() {
    populateSelectors();
    renderDeskNav();
    bindUi();
    bindFeeds();
    updateChrome();
    document.body.dataset.streamSize = state.streamSize;
    syncResponsive();

    Feeds.start({
      intervals: typeof DEFAULT_INTERVALS !== "undefined" ? DEFAULT_INTERVALS : undefined,
    });
    recomputeIndicators();
    renderGrid();
    renderStream();
    tickClock();
    setInterval(tickClock, 1000);
    setInterval(() => {
      recomputeIndicators();
      renderStream();
    }, 30000);

    toast("WMT v3 · PROFESSIONAL");
    console.info(
      "%c WMT v3 %c Bloomberg-style professional · classic engine untouched ",
      "background:#ff6600;color:#000;font-weight:700",
      "color:#b0b0b0"
    );
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
