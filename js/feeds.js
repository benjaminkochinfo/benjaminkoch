/**
 * Self-maintaining multi-source feed engine
 * News RSS · markets · USGS · EONET · Open-Meteo · ReliefWeb
 */

const Feeds = (() => {
  const bus = new EventTarget();
  const health = {};
  let intervals = { ...DEFAULT_INTERVALS };
  let timers = {};
  let newsSourceState = {};
  let running = false;

  const state = {
    news: [],
    markets: MARKETS_SEED.map((m) => ({ ...m })),
    quakes: [],
    eonet: [],
    weather: [],
    relief: [],
    log: [],
    lastFullRefresh: 0,
  };

  function emit(type, detail) {
    bus.dispatchEvent(new CustomEvent(type, { detail }));
  }
  function log(msg, level = "info") {
    const entry = { t: Date.now(), msg, level };
    state.log.unshift(entry);
    if (state.log.length > 250) state.log.length = 250;
    emit("log", entry);
  }
  function setHealth(id, status, detail = "") {
    health[id] = { id, status, detail, updated: Date.now() };
    emit("health", health[id]);
  }
  function overallHealth() {
    const vals = Object.values(health);
    if (!vals.length) return "idle";
    if (vals.some((h) => h.status === "err") && vals.every((h) => h.status !== "ok")) return "err";
    if (vals.some((h) => h.status === "err" || h.status === "warn")) return "warn";
    return "ok";
  }

  async function fetchText(url, timeoutMs = 14000) {
    const c = new AbortController();
    const to = setTimeout(() => c.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: c.signal, mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } finally {
      clearTimeout(to);
    }
  }
  async function fetchJson(url, timeoutMs = 14000) {
    const c = new AbortController();
    const to = setTimeout(() => c.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: c.signal, mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(to);
    }
  }
  async function fetchViaProxy(url) {
    const attempts = [
      url,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
    ];
    let lastErr;
    for (const u of attempts) {
      try {
        const text = await fetchText(u, 15000);
        if (text && text.length > 20) return text;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("proxy fail");
  }

  function stripHtml(s) {
    const d = document.createElement("div");
    d.innerHTML = s || "";
    return (d.textContent || "").replace(/\s+/g, " ").trim();
  }
  function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h).toString(36);
  }
  function classifyHeadline(title) {
    const t = (title || "").toLowerCase();
    if (/\b(war|missile|killed|invasion|nuclear|massacre|airstrike)\b/.test(t)) return "crit";
    if (/\b(attack|conflict|sanction|troops|crisis|earthquake|hurricane|typhoon|storm)\b/.test(t)) return "high";
    if (/\b(wheat|cocoa|oil|inflation|election|flood|drought|shipping|insurance)\b/.test(t)) return "med";
    return "info";
  }

  function parsePubDate(pub, fallbackOffsetMs = 0) {
    if (!pub) return Date.now() - fallbackOffsetMs;
    const t = Date.parse(pub);
    if (Number.isFinite(t) && t > 0) return t;
    // Some feeds use RFC822 without year quirks — last resort
    return Date.now() - fallbackOffsetMs;
  }

  function parseRss(xmlText, source) {
    const items = [];
    try {
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");
      if (doc.querySelector("parsererror")) throw new Error("XML parse error");
      const nodes = [...doc.querySelectorAll("item")];
      const entries = nodes.length ? nodes : [...doc.querySelectorAll("entry")];
      entries.slice(0, 32).forEach((node, i) => {
        const title = node.querySelector("title")?.textContent?.trim() || "Untitled";
        let href =
          node.querySelector("link")?.getAttribute("href") ||
          node.querySelector("link")?.textContent?.trim() ||
          "";
        if (!href) {
          const alt = node.querySelector('link[rel="alternate"]') || node.querySelector("link");
          href = alt?.getAttribute("href") || "";
        }
        const pub =
          node.querySelector("pubDate")?.textContent ||
          node.querySelector("updated")?.textContent ||
          node.querySelector("published")?.textContent ||
          node.querySelector("dc\\:date, date")?.textContent ||
          "";
        const desc =
          node.querySelector("description")?.textContent ||
          node.querySelector("summary")?.textContent ||
          node.querySelector("content")?.textContent ||
          "";
        const published = parsePubDate(pub, i * 120000);
        items.push({
          id: `${source.id}_${i}_${hash(title)}`,
          title: stripHtml(title),
          link: href,
          source: source.tag || source.name,
          sourceId: source.id,
          published,
          summary: stripHtml(desc).slice(0, 280),
          sev: classifyHeadline(title),
          live: true,
        });
      });
    } catch (e) {
      log(`RSS parse ${source.id}: ${e.message}`, "err");
    }
    return items;
  }

  // ── News ──
  async function refreshNews() {
    const enabled = NEWS_SOURCES.filter((s) => {
      if (newsSourceState[s.id] === false) return false;
      if (newsSourceState[s.id] === true) return true;
      return !!s.on;
    });
    if (!enabled.length) {
      setHealth("news", "warn", "No sources");
      return;
    }
    const collected = [];
    let ok = 0,
      fail = 0;
    await Promise.all(
      enabled.map(async (src) => {
        try {
          const xml = await fetchViaProxy(src.url);
          const items = parseRss(xml, src);
          if (!items.length) throw new Error("empty");
          collected.push(...items);
          ok++;
          Storage.cacheSet("news_" + src.id, items);
          setHealth("news_" + src.id, "ok", `${items.length}`);
        } catch (e) {
          fail++;
          const cached = Storage.cacheGet("news_" + src.id, 6 * 3600e3);
          if (cached?.data?.length) {
            collected.push(...cached.data.map((x) => ({ ...x, cached: true })));
            setHealth("news_" + src.id, "warn", "cache");
          } else setHealth("news_" + src.id, "err", e.message || "fail");
        }
      })
    );
    const seen = new Set();
    const merged = [];
    collected
      .sort((a, b) => (b.published || 0) - (a.published || 0))
      .forEach((item) => {
        const k = item.title.toLowerCase().slice(0, 72);
        if (seen.has(k)) return;
        seen.add(k);
        merged.push(item);
      });
    if (merged.length) {
      state.news = merged.slice(0, 180);
      Storage.cacheSet("news_all", state.news);
      setHealth("news", fail && ok ? "warn" : ok ? "ok" : "warn", `${ok}/${enabled.length} · ${state.news.length} hl`);
      emit("news", { items: state.news });
      log(`News ${ok} ok / ${fail} fail`);
    } else {
      const cached = Storage.cacheGet("news_all");
      state.news = cached?.data?.length
        ? cached.data
        : EVENTS.map((e, i) => ({
            id: "fb_" + e.id,
            title: e.title,
            source: "LOCAL",
            published: Date.now() - i * 6e5,
            summary: "Offline fallback",
            sev: e.sev,
            link: "",
          }));
      setHealth("news", "err", "fallback");
      emit("news", { items: state.news });
    }
  }

  /**
   * Yahoo Finance free chart quotes → real indices / commodities / FX
   * (public endpoints; proxied when CORS blocks)
   */
  const YAHOO_MAP = {
    SPX: "^GSPC",
    NDX: "^IXIC",
    DJI: "^DJI",
    VIX: "^VIX",
    DXY: "DX-Y.NYB",
    EURUSD: "EURUSD=X",
    USDJPY: "USDJPY=X",
    GBPUSD: "GBPUSD=X",
    USDCNY: "CNY=X",
    BTC: "BTC-USD",
    ETH: "ETH-USD",
    BRENT: "BZ=F",
    WTI: "CL=F",
    NATGAS: "NG=F",
    GOLD: "GC=F",
    SILVER: "SI=F",
    COPPER: "HG=F",
    PLAT: "PL=F",
    ALUM: "ALI=F",
    WHEAT: "ZW=F",
    CORN: "ZC=F",
    SOY: "ZS=F",
    COCOA: "CC=F",
    COFFEE: "KC=F",
    SUGAR: "SB=F",
    RICE: "ZR=F",
    US10Y: "^TNX",
    SOXX: "SOXX",
    SMH: "SMH",
    NVDA: "NVDA",
    TSM: "TSM",
    ASML: "ASML",
    AMD: "AMD",
    AVGO: "AVGO",
    INTC: "INTC",
    EQIX: "EQIX",
    DLR: "DLR",
    MSFT: "MSFT",
    GOOGL: "GOOGL",
  };

  async function fetchYahooQuote(yahooSym) {
    // Daily history for accurate last + % change + mountain series
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooSym
    )}?interval=1d&range=3mo`;
    try {
      return await fetchJson(url, 14000);
    } catch {
      const text = await fetchViaProxy(url);
      return JSON.parse(text);
    }
  }

  function applyYahoo(markets, ourSym, data) {
    try {
      const r = data?.chart?.result?.[0];
      if (!r) return false;
      const meta = r.meta || {};
      const closes = (r.indicators?.quote?.[0]?.close || []).filter((x) => x != null && Number.isFinite(Number(x)));
      const lastRaw = meta.regularMarketPrice ?? closes[closes.length - 1];
      if (lastRaw == null || !Number.isFinite(Number(lastRaw))) return false;
      const last = Number(lastRaw);
      // Prefer previous close fields; else prior daily close
      let prev =
        meta.chartPreviousClose ??
        meta.previousClose ??
        meta.regularMarketPreviousClose ??
        null;
      if ((prev == null || !Number.isFinite(Number(prev))) && closes.length >= 2) {
        prev = closes[closes.length - 2];
      }
      let chg24 = null;
      if (prev != null && Number(prev) > 0) chg24 = ((last - Number(prev)) / Number(prev)) * 100;
      setMkt(markets, ourSym, last, chg24);
      // Accurate chart series from live closes (replace, don't double-push)
      if (closes.length >= 2 && typeof Charts !== "undefined") {
        if (typeof Charts.replaceSeries === "function") Charts.replaceSeries(ourSym, closes);
        else closes.slice(-20).forEach((v) => Charts.push(ourSym, v));
      }
      return true;
    } catch {
      return false;
    }
  }

  // Explicit model / proxy legs (no public free quote) — gentle model walk only
  const MODEL_ONLY_SYMS = new Set(["SHIP", "BDI", "WARINS", "CAT", "FOODX", "PALM"]);

  async function mapPool(entries, concurrency, worker) {
    const results = [];
    let i = 0;
    async function run() {
      while (i < entries.length) {
        const idx = i++;
        results[idx] = await worker(entries[idx], idx);
      }
    }
    const n = Math.min(concurrency, entries.length || 1);
    await Promise.all(Array.from({ length: n }, () => run()));
    return results;
  }

  // ── Markets + commodities ──
  async function refreshMarkets() {
    const markets = INSTRUMENTS.map((i) => {
      const prev = state.markets.find((m) => m.sym === i.sym);
      return prev
        ? { ...prev, name: i.name, cls: i.cls, unit: i.unit }
        : {
            sym: i.sym,
            name: i.name,
            cls: i.cls,
            val: String(i.seed),
            chg: "0.00%",
            dir: "flat",
            source: "seed",
            unit: i.unit,
          };
    });
    let live = 0;

    // Bounded parallel Yahoo legs (real market data)
    const yahooEntries = Object.entries(YAHOO_MAP);
    let yahooOk = 0;
    await mapPool(yahooEntries, 8, async ([sym, ySym]) => {
      try {
        const data = await fetchYahooQuote(ySym);
        if (applyYahoo(markets, sym, data)) {
          live++;
          yahooOk++;
        }
      } catch {
        /* per-symbol fail ok */
      }
    });
    if (yahooOk) {
      setHealth("yahoo", "ok", `${yahooOk}/${yahooEntries.length} legs`);
      Storage.cacheSet("yahoo_ok", { n: yahooOk, t: Date.now() });
    } else setHealth("yahoo", "warn", "no yahoo legs");

    // Crypto via CoinGecko (authoritative for BTC/ETH when available)
    try {
      const cg = await fetchJson(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
      );
      if (cg.bitcoin?.usd != null) {
        setMkt(markets, "BTC", cg.bitcoin.usd, cg.bitcoin.usd_24h_change);
        live++;
      }
      if (cg.ethereum?.usd != null) {
        setMkt(markets, "ETH", cg.ethereum.usd, cg.ethereum.usd_24h_change);
        live++;
      }
      setHealth("crypto", "ok", "CoinGecko");
      Storage.cacheSet("crypto", cg);
    } catch (e) {
      const c = Storage.cacheGet("crypto", 1800e3);
      if (c?.data?.bitcoin) {
        setMkt(markets, "BTC", c.data.bitcoin.usd, c.data.bitcoin.usd_24h_change, true);
        setHealth("crypto", "warn", "cache");
      } else setHealth("crypto", "err", e.message || "fail");
    }

    // FX backup (only fill missing live legs)
    const needFx = (sym) => {
      const m = markets.find((x) => x.sym === sym);
      return m && m.source !== "live" && m.source !== "cache";
    };
    try {
      const fx = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=EUR,JPY,GBP,CNY");
      // Frankfurter: 1 USD = rates.X units → invert for XXXUSD-style pairs
      if (fx?.rates?.EUR && needFx("EURUSD")) {
        setMkt(markets, "EURUSD", 1 / fx.rates.EUR, null);
        live++;
      }
      if (fx?.rates?.JPY && needFx("USDJPY")) {
        setMkt(markets, "USDJPY", fx.rates.JPY, null);
        live++;
      }
      if (fx?.rates?.GBP && needFx("GBPUSD")) {
        setMkt(markets, "GBPUSD", 1 / fx.rates.GBP, null);
        live++;
      }
      if (fx?.rates?.CNY && needFx("USDCNY")) {
        setMkt(markets, "USDCNY", fx.rates.CNY, null);
        live++;
      }
      setHealth("fx", "ok", "Frankfurter");
      Storage.cacheSet("fx", fx);
    } catch (e) {
      try {
        const fx2 = await fetchJson("https://open.er-api.com/v6/latest/USD");
        if (fx2?.rates?.EUR && needFx("EURUSD")) setMkt(markets, "EURUSD", 1 / fx2.rates.EUR, null);
        if (fx2?.rates?.JPY && needFx("USDJPY")) setMkt(markets, "USDJPY", fx2.rates.JPY, null);
        if (fx2?.rates?.GBP && needFx("GBPUSD")) setMkt(markets, "GBPUSD", 1 / fx2.rates.GBP, null);
        if (fx2?.rates?.CNY && needFx("USDCNY")) setMkt(markets, "USDCNY", fx2.rates.CNY, null);
        live++;
        setHealth("fx", "ok", "ER-API");
      } catch (e2) {
        setHealth("fx", "err", e2.message || e.message || "fail");
      }
    }

    // Build FOODX as live basket average of softs when possible
    const foodLeg = ["WHEAT", "CORN", "SOY", "COCOA", "COFFEE", "SUGAR"];
    const foodLive = foodLeg
      .map((s) => markets.find((m) => m.sym === s))
      .filter((m) => m && (m.source === "live" || m.source === "cache"));
    if (foodLive.length >= 3) {
      const dirs = foodLive.map((m) => (m.dir === "up" ? 1 : m.dir === "down" ? -1 : 0));
      const avgDir = dirs.reduce((a, b) => a + b, 0) / dirs.length;
      const chgs = foodLive.map((m) => parseFloat(String(m.chg)) || 0);
      const avgChg = chgs.reduce((a, b) => a + b, 0) / chgs.length;
      const foodM = markets.find((m) => m.sym === "FOODX");
      if (foodM) {
        const base = parseFloat(String(foodM.val).replace(/[,%]/g, "")) || 128;
        const next = base * (1 + avgChg / 100);
        foodM.val = fmt(next, "FOODX");
        foodM.chg = `${avgChg >= 0 ? "+" : ""}${avgChg.toFixed(2)}%`;
        foodM.dir = avgDir > 0.15 ? "up" : avgDir < -0.15 ? "down" : "flat";
        foodM.source = "live";
        foodM.name = "Food price basket (live softs avg)";
        if (typeof Charts !== "undefined") Charts.push("FOODX", next);
        live++;
      }
    }

    // Model walk only for intentional proxies — never fake-jitter failed live legs
    markets.forEach((m) => {
      if (m.source === "live" || m.source === "cache") return;
      if (!MODEL_ONLY_SYMS.has(m.sym)) {
        // Keep last known / seed stable so UI never invents false moves
        if (m.source !== "seed" && m.source !== "model") m.source = "seed";
        return;
      }
      const seed = INSTRUMENTS.find((i) => i.sym === m.sym)?.seed;
      let n = parseFloat(String(m.val).replace(/[,%]/g, ""));
      if (!Number.isFinite(n)) n = seed || 100;
      let amp = 0.0015;
      if (m.cls === "insurance") amp = 0.0025;
      const jitter = n * (Math.random() * amp * 2 - amp);
      const next = Math.max(0.01, n + jitter);
      const chg = n ? (jitter / n) * 100 : 0;
      m.val = fmt(next, m.sym);
      m.chg = `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`;
      m.dir = chg > 0.02 ? "up" : chg < -0.02 ? "down" : "flat";
      m.source = "model";
      if (typeof Charts !== "undefined") Charts.push(m.sym, next);
    });

    state.markets = markets;
    state.marketsUpdated = Date.now();
    Storage.cacheSet("markets", markets);
    const liveN = markets.filter((m) => m.source === "live" || m.source === "cache").length;
    setHealth("markets", liveN ? "ok" : "warn", `${liveN}/${markets.length} live · ${yahooOk} yahoo`);
    emit("markets", { items: markets });
    log(`Markets · ${liveN} live / ${markets.length} total · yahoo ${yahooOk}`);
  }

  function setMkt(markets, sym, price, chg24, cached = false) {
    const m = markets.find((x) => x.sym === sym);
    if (!m || price == null || !Number.isFinite(Number(price))) return;
    m.val = fmt(Number(price), sym);
    if (chg24 != null && Number.isFinite(Number(chg24))) {
      const c = Number(chg24);
      m.chg = `${c >= 0 ? "+" : ""}${c.toFixed(2)}%`;
      m.dir = c > 0.05 ? "up" : c < -0.05 ? "down" : "flat";
    } else if (!m.chg || m.chg === "0.00%" || m.chg === "live" || m.chg === "cache") {
      m.chg = "0.00%";
      m.dir = "flat";
    }
    m.source = cached ? "cache" : "live";
    m.updated = Date.now();
  }
  function fmt(n, sym) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "—";
    if (sym === "EURUSD" || sym === "GBPUSD") return x.toFixed(4);
    if (sym === "USDCNY" || sym === "USDJPY") return x.toFixed(3);
    if (sym === "US10Y") return x.toFixed(2);
    if (sym === "BTC" || sym === "ETH") return Math.round(x).toLocaleString("en-US");
    if (x >= 10000) return Math.round(x).toLocaleString("en-US");
    if (x >= 1000) return (Math.round(x * 10) / 10).toLocaleString("en-US");
    if (x < 1) return x.toFixed(4);
    return x.toFixed(2);
  }

  // ── USGS ──
  async function refreshQuakes() {
    try {
      const geo = await fetchJson("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson");
      state.quakes = (geo.features || []).slice(0, 50).map((f) => {
        const [lon, lat, depth] = f.geometry?.coordinates || [0, 0, 0];
        const p = f.properties || {};
        return {
          id: f.id,
          mag: p.mag,
          place: p.place,
          time: p.time,
          url: p.url,
          lat,
          lon,
          depth,
          sev: p.mag >= 6 ? "crit" : p.mag >= 5 ? "high" : p.mag >= 4 ? "med" : "info",
          title: `M${p.mag} — ${p.place}`,
          layer: "natural",
        };
      });
      Storage.cacheSet("quakes", state.quakes);
      setHealth("quakes", "ok", `${state.quakes.length} M2.5+`);
      emit("quakes", { items: state.quakes });
      log(`USGS ${state.quakes.length}`);
    } catch (e) {
      const c = Storage.cacheGet("quakes", 6 * 3600e3);
      if (c?.data) {
        state.quakes = c.data;
        setHealth("quakes", "warn", "cache");
        emit("quakes", { items: state.quakes });
      } else setHealth("quakes", "err", e.message || "fail");
    }
  }

  // ── NASA EONET disasters / storms ──
  async function refreshEonet() {
    try {
      const data = await fetchJson("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=40");
      state.eonet = (data.events || []).map((ev) => {
        const geo = ev.geometry?.[ev.geometry.length - 1];
        const coords = geo?.coordinates;
        let lon = 0,
          lat = 0;
        if (Array.isArray(coords)) {
          if (typeof coords[0] === "number") {
            lon = coords[0];
            lat = coords[1];
          } else if (Array.isArray(coords[0])) {
            lon = coords[0][0];
            lat = coords[0][1];
          }
        }
        const cat = ev.categories?.[0]?.title || "Event";
        const sev = /severe|storm|wildfire|volcano|quake/i.test(cat + ev.title) ? "high" : "med";
        return {
          id: ev.id,
          title: ev.title,
          category: cat,
          lat,
          lon,
          date: geo?.date ? Date.parse(geo.date) : Date.now(),
          link: ev.sources?.[0]?.url || "",
          sev,
          layer: "disasters",
        };
      });
      Storage.cacheSet("eonet", state.eonet);
      setHealth("eonet", "ok", `${state.eonet.length} open`);
      emit("eonet", { items: state.eonet });
      log(`EONET ${state.eonet.length}`);
    } catch (e) {
      const c = Storage.cacheGet("eonet", 12 * 3600e3);
      if (c?.data) {
        state.eonet = c.data;
        setHealth("eonet", "warn", "cache");
        emit("eonet", { items: state.eonet });
      } else setHealth("eonet", "err", e.message || "fail");
    }
  }

  function rowFromCurrent(c, cur) {
    if (!c || !cur) return null;
    const temp = Number(cur.temperature_2m);
    if (!Number.isFinite(temp)) return null;
    const codeWx = cur.weather_code != null ? Number(cur.weather_code) : null;
    const wind = cur.wind_speed_10m != null ? Number(cur.wind_speed_10m) : null;
    const precip = cur.precipitation != null ? Number(cur.precipitation) : null;
    const curNorm = {
      temperature_2m: temp,
      wind_speed_10m: wind,
      weather_code: codeWx,
      precipitation: precip,
    };
    return {
      code: c.code,
      name: c.name,
      region: c.region || "",
      lat: c.lat,
      lon: c.lon,
      temp,
      wind: Number.isFinite(wind) ? wind : null,
      precip: Number.isFinite(precip) ? precip : null,
      codeWx: Number.isFinite(codeWx) ? codeWx : null,
      time: cur.time || null,
      label: weatherCodeLabel(codeWx),
      impact: weatherImpact(curNorm),
      source: "open-meteo",
      live: true,
      updated: Date.now(),
    };
  }

  function nearestCity(chunk, lat, lon) {
    if (!chunk?.length || lat == null || lon == null) return null;
    let best = null;
    let bestD = Infinity;
    for (const c of chunk) {
      if (c.lat == null || c.lon == null) continue;
      const d = Math.hypot(Number(c.lat) - Number(lat), Number(c.lon) - Number(lon));
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    // Reject wild mismatches (wrong index mapping)
    return bestD < 8 ? best : null;
  }

  /** Pull current fields for index i whether Open-Meteo returns scalars or parallel arrays. */
  function currentAt(current, i) {
    if (!current) return null;
    const pick = (key) => {
      const v = current[key];
      if (Array.isArray(v)) return v[i];
      // scalar applies only to single-location payloads
      return i === 0 ? v : Array.isArray(v) ? v[i] : undefined;
    };
    const temperature_2m = pick("temperature_2m");
    if (temperature_2m == null && temperature_2m !== 0) return null;
    return {
      temperature_2m,
      wind_speed_10m: pick("wind_speed_10m"),
      weather_code: pick("weather_code"),
      precipitation: pick("precipitation"),
      time: pick("time"),
    };
  }

  /**
   * Parse Open-Meteo multi/single JSON into rows matched to chunk cities by lat/lon.
   * Supports: array of forecasts · parallel lat arrays · single forecast object.
   */
  function parseOpenMeteoPayload(j, chunk) {
    const out = [];
    if (!j || !chunk?.length) return out;

    // Format A: JSON array of location objects (official multi-location)
    if (Array.isArray(j)) {
      j.forEach((item, idx) => {
        if (!item?.current) return;
        const c =
          nearestCity(chunk, item.latitude, item.longitude) ||
          chunk[idx] ||
          null;
        const row = rowFromCurrent(c, item.current);
        if (row) out.push(row);
      });
      return out;
    }

    // Format B: parallel arrays on root latitude / current.*
    if (Array.isArray(j.latitude) && j.current) {
      const n = j.latitude.length;
      for (let i = 0; i < n; i++) {
        const cur = currentAt(j.current, i);
        if (!cur) continue;
        const c =
          nearestCity(chunk, j.latitude[i], Array.isArray(j.longitude) ? j.longitude[i] : j.longitude) ||
          chunk[i] ||
          null;
        const row = rowFromCurrent(c, cur);
        if (row) out.push(row);
      }
      return out;
    }

    // Format C: single location object
    if (j.current && (typeof j.latitude === "number" || j.latitude == null)) {
      const c =
        nearestCity(chunk, j.latitude, j.longitude) || chunk[0] || null;
      const row = rowFromCurrent(c, j.current);
      if (row) out.push(row);
    }
    return out;
  }

  async function fetchWeatherOne(c) {
    if (c?.lat == null || c?.lon == null) throw new Error("no coords");
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
      c.lat
    )}&longitude=${encodeURIComponent(
      c.lon
    )}&current=temperature_2m,wind_speed_10m,weather_code,precipitation&timezone=UTC&wind_speed_unit=kmh`;
    const one = await fetchJson(u, 14000);
    // single may still be array-of-one
    if (Array.isArray(one)) {
      const row = parseOpenMeteoPayload(one, [c])[0];
      if (row) return row;
    }
    const row = rowFromCurrent(c, one?.current || {});
    if (!row) throw new Error("no temp");
    return row;
  }

  let weatherInFlight = null;

  // ── Open-Meteo worldwide capital temperatures (batched + reliable fallback) ──
  async function refreshWeather() {
    // Coalesce concurrent kicks (UI + interval + force)
    if (weatherInFlight) return weatherInFlight;

    weatherInFlight = (async () => {
      const cities = (
        typeof weatherCitiesFromCountries === "function"
          ? weatherCitiesFromCountries()
          : (typeof COUNTRIES !== "undefined" ? COUNTRIES : [])
              .filter((c) => c.code && c.code !== "GLOBAL")
              .map((c) => ({ code: c.code, name: c.name, lat: c.lat, lon: c.lon, region: c.region }))
      ).filter((c) => c && c.code && c.lat != null && c.lon != null && Number.isFinite(Number(c.lat)));

      if (!cities.length) {
        setHealth("weather", "err", "no cities");
        return;
      }

      try {
        const results = [];
        // Smaller multi chunks are more reliable; then fill gaps with singles (low concurrency to avoid 429)
        const chunkSize = 12;
        for (let i = 0; i < cities.length; i += chunkSize) {
          const chunk = cities.slice(i, i + chunkSize);
          const lats = chunk.map((c) => Number(c.lat).toFixed(4)).join(",");
          const lons = chunk.map((c) => Number(c.lon).toFixed(4)).join(",");
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,wind_speed_10m,weather_code,precipitation&timezone=UTC&wind_speed_unit=kmh`;
          let added = [];
          try {
            const j = await fetchJson(url, 30000);
            added = parseOpenMeteoPayload(j, chunk);
            added.forEach((r) => results.push(r));
          } catch (chunkErr) {
            log(`Weather multi ${i}: ${chunkErr.message || chunkErr}`, "err");
          }

          const have = new Set(results.map((r) => r.code));
          const missing = chunk.filter((c) => !have.has(c.code));
          // If multi missed most of the chunk, fetch singles carefully
          if (missing.length) {
            const needSingles =
              added.length < Math.ceil(chunk.length * 0.5) ? missing : missing.slice(0, 4);
            const singles = await mapPool(needSingles, 3, async (c) => {
              try {
                return await fetchWeatherOne(c);
              } catch {
                return null;
              }
            });
            singles.forEach((r) => {
              if (r) results.push(r);
            });
            // gentle pause between heavy chunks to avoid Open-Meteo 429
            if (missing.length > 2) await new Promise((r) => setTimeout(r, 120));
          }
        }

        // Second pass: any still missing → low-concurrency singles
        const haveAll = new Set(results.map((r) => r.code));
        const still = cities.filter((c) => !haveAll.has(c.code));
        if (still.length) {
          log(`Weather fill ${still.length} remaining capitals…`);
          const more = await mapPool(still, 4, async (c) => {
            try {
              return await fetchWeatherOne(c);
            } catch {
              return null;
            }
          });
          more.forEach((r) => {
            if (r) results.push(r);
          });
        }

        const byCode = new Map();
        results.forEach((r) => {
          if (r?.code && r.temp != null && Number.isFinite(Number(r.temp))) byCode.set(r.code, r);
        });
        const final = [...byCode.values()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        if (!final.length) throw new Error("no weather rows");

        state.weather = final;
        state.weatherUpdated = Date.now();
        Storage.cacheSet("weather", final);
        const pct = Math.round((final.length / cities.length) * 100);
        setHealth(
          "weather",
          final.length >= cities.length * 0.5 ? "ok" : "warn",
          `${final.length}/${cities.length} Open-Meteo (${pct}%)`
        );
        emit("weather", { items: final });
        log(`Weather live ${final.length}/${cities.length} capitals · Open-Meteo`);
      } catch (e) {
        // Keep prior live rows if any; never invent numbers
        if (state.weather?.length && state.weather.some((w) => w.source === "open-meteo")) {
          setHealth("weather", "warn", e.message || "stale");
          emit("weather", { items: state.weather });
          log(`Weather keep prior live rows: ${e.message || e}`, "err");
        } else {
          setHealth("weather", "err", e.message || "fail");
          emit("weather", { items: state.weather || [] });
          log(`Weather fail: ${e.message || e}`, "err");
        }
      } finally {
        weatherInFlight = null;
      }
    })();

    return weatherInFlight;
  }

  function weatherCodeLabel(code) {
    const m = {
      0: "Clear",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Drizzle",
      55: "Dense drizzle",
      56: "Freezing drizzle",
      57: "Freezing drizzle",
      61: "Slight rain",
      63: "Rain",
      65: "Heavy rain",
      66: "Freezing rain",
      67: "Heavy freezing rain",
      71: "Slight snow",
      73: "Snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Rain showers",
      81: "Rain showers",
      82: "Violent rain showers",
      85: "Snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm + hail",
      99: "Thunderstorm + heavy hail",
    };
    return m[code] || (code != null ? `WMO ${code}` : "—");
  }
  function weatherImpact(cur) {
    const wind = Number(cur.wind_speed_10m) || 0;
    const precip = Number(cur.precipitation) || 0;
    const code = Number(cur.weather_code) || 0;
    if (code >= 95 || wind > 70) return "high";
    if (code >= 80 || code >= 65 || wind > 45 || precip > 5) return "elevated";
    if (precip > 0.5 || wind > 30 || code >= 51) return "watch";
    return "ok";
  }

  // ── ReliefWeb ──
  async function refreshRelief() {
    try {
      const body = {
        appname: "wmt-terminal",
        profile: "list",
        limit: 20,
        filter: { field: "date.created", value: { from: daysAgoISO(7) } },
        fields: { include: ["title", "url", "date", "primary_country", "disaster_type", "source"] },
        sort: ["date:desc"],
      };
      const res = await fetch("https://api.reliefweb.int/v1/reports?appname=wmt-terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      state.relief = (data.data || []).map((d) => {
        const f = d.fields || {};
        return {
          id: d.id,
          title: f.title,
          url: f.url,
          date: f.date?.created ? Date.parse(f.date.created) : Date.now(),
          country: f.primary_country?.[0]?.name || "",
          type: f.disaster_type?.[0]?.name || "Report",
          source: f.source?.[0]?.shortname || "RW",
        };
      });
      Storage.cacheSet("relief", state.relief);
      setHealth("relief", "ok", `${state.relief.length} reports`);
      emit("relief", { items: state.relief });
      log(`ReliefWeb ${state.relief.length}`);
    } catch (e) {
      const c = Storage.cacheGet("relief", 12 * 3600e3);
      if (c?.data) {
        state.relief = c.data;
        setHealth("relief", "warn", "cache");
        emit("relief", { items: state.relief });
      } else setHealth("relief", "err", e.message || "fail");
    }
  }

  function daysAgoISO(n) {
    const d = new Date(Date.now() - n * 864e5);
    return d.toISOString().slice(0, 10);
  }

  function clearTimers() {
    Object.values(timers).forEach(clearInterval);
    timers = {};
  }
  function schedule() {
    clearTimers();
    const s = (k, fn) => {
      timers[k] = setInterval(() => fn().catch(() => {}), (intervals[k] || 120) * 1000);
    };
    s("news", refreshNews);
    s("markets", refreshMarkets);
    s("quakes", refreshQuakes);
    s("eonet", refreshEonet);
    s("weather", refreshWeather);
    s("relief", refreshRelief);
  }

  async function refreshAll() {
    state.lastFullRefresh = Date.now();
    log("Full refresh");
    await Promise.allSettled([
      refreshNews(),
      refreshMarkets(),
      refreshQuakes(),
      refreshEonet(),
      refreshWeather(),
      refreshRelief(),
    ]);
    emit("refresh", { t: Date.now() });
    log("Full refresh done");
  }

  function start(opts = {}) {
    if (opts.intervals) intervals = { ...intervals, ...opts.intervals };
    if (opts.newsSources) newsSourceState = { ...opts.newsSources };
    // Drop legacy sources (e.g. Al Jazeera) and enable catalog defaults for new ids
    const valid = new Set(NEWS_SOURCES.map((s) => s.id));
    Object.keys(newsSourceState).forEach((id) => {
      if (!valid.has(id)) delete newsSourceState[id];
    });
    NEWS_SOURCES.forEach((s) => {
      if (newsSourceState[s.id] === undefined) newsSourceState[s.id] = s.on;
    });
    Storage.set("newsSources", newsSourceState);
    running = true;
    schedule();
    refreshAll();
  }
  function stop() {
    running = false;
    clearTimers();
  }
  function setIntervals(next) {
    intervals = { ...intervals, ...next };
    Storage.set("intervals", intervals);
    if (running) schedule();
  }
  function setNewsSource(id, on) {
    newsSourceState[id] = on;
    Storage.set("newsSources", newsSourceState);
  }
  function getNewsSources() {
    return NEWS_SOURCES.map((s) => ({
      ...s,
      on: newsSourceState[s.id] !== undefined ? newsSourceState[s.id] : s.on,
    }));
  }

  return {
    start,
    stop,
    refreshAll,
    refreshNews,
    refreshMarkets,
    refreshQuakes,
    refreshEonet,
    refreshWeather,
    refreshRelief,
    setIntervals,
    getIntervals: () => ({ ...intervals }),
    setNewsSource,
    getNewsSources,
    getHealth: () => ({ ...health }),
    overallHealth,
    getState: () => state,
    on: (t, fn) => bus.addEventListener(t, fn),
    log,
  };
})();
