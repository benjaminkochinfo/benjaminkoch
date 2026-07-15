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

  function parseRss(xmlText, source) {
    const items = [];
    try {
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");
      const nodes = [...doc.querySelectorAll("item")];
      const entries = nodes.length ? nodes : [...doc.querySelectorAll("entry")];
      entries.slice(0, 28).forEach((node, i) => {
        const title = node.querySelector("title")?.textContent?.trim() || "Untitled";
        const link =
          node.querySelector("link")?.getAttribute("href") ||
          node.querySelector("link")?.textContent?.trim() ||
          "";
        const pub =
          node.querySelector("pubDate")?.textContent ||
          node.querySelector("updated")?.textContent ||
          node.querySelector("published")?.textContent ||
          "";
        const desc = node.querySelector("description")?.textContent || node.querySelector("summary")?.textContent || "";
        // Atom sometimes has multiple link nodes
        let href = link;
        if (!href) {
          const alt = node.querySelector('link[rel="alternate"]') || node.querySelector("link");
          href = alt?.getAttribute("href") || "";
        }
        items.push({
          id: `${source.id}_${i}_${hash(title)}`,
          title: stripHtml(title),
          link: href,
          source: source.tag || source.name,
          sourceId: source.id,
          published: pub ? Date.parse(pub) || Date.now() : Date.now(),
          summary: stripHtml(desc).slice(0, 280),
          sev: classifyHeadline(title),
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
    VIX: "^VIX",
    DXY: "DX-Y.NYB",
    EURUSD: "EURUSD=X",
    USDJPY: "USDJPY=X",
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
    US10Y: "^TNX",
    SOXX: "SOXX",
    NVDA: "NVDA",
    TSM: "TSM",
    ASML: "ASML",
    AMD: "AMD",
    EQIX: "EQIX",
    DLR: "DLR",
  };

  async function fetchYahooQuote(yahooSym) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooSym
    )}?interval=1d&range=5d`;
    try {
      return await fetchJson(url, 12000);
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
      const closes = r.indicators?.quote?.[0]?.close || [];
      const last = meta.regularMarketPrice ?? closes.filter((x) => x != null).pop();
      const prev = meta.chartPreviousClose ?? meta.previousClose;
      if (last == null || !Number.isFinite(Number(last))) return false;
      let chg24 = null;
      if (prev != null && Number(prev) > 0) chg24 = ((Number(last) - Number(prev)) / Number(prev)) * 100;
      setMkt(markets, ourSym, Number(last), chg24);
      // store series for charts
      const series = closes.filter((x) => x != null && Number.isFinite(x)).slice(-48);
      if (series.length && typeof Charts !== "undefined") {
        series.forEach((v) => Charts.push(ourSym, v));
      }
      return true;
    } catch {
      return false;
    }
  }

  // ── Markets + commodities ──
  async function refreshMarkets() {
    const markets = INSTRUMENTS.map((i) => {
      const prev = state.markets.find((m) => m.sym === i.sym);
      return (
        prev || {
          sym: i.sym,
          name: i.name,
          cls: i.cls,
          val: String(i.seed),
          chg: "0.00%",
          dir: "flat",
          source: "seed",
          unit: i.unit,
        }
      );
    });
    let live = 0;

    // Parallel Yahoo legs (real market data)
    const yahooEntries = Object.entries(YAHOO_MAP);
    let yahooOk = 0;
    await Promise.all(
      yahooEntries.map(async ([sym, ySym]) => {
        try {
          const data = await fetchYahooQuote(ySym);
          if (applyYahoo(markets, sym, data)) {
            live++;
            yahooOk++;
          }
        } catch {
          /* per-symbol fail ok */
        }
      })
    );
    if (yahooOk) {
      setHealth("yahoo", "ok", `${yahooOk} legs`);
      Storage.cacheSet("yahoo_ok", { n: yahooOk, t: Date.now() });
    } else setHealth("yahoo", "warn", "no yahoo legs");

    // Crypto fallback / confirm via CoinGecko
    try {
      const cg = await fetchJson(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
      );
      if (cg.bitcoin) {
        setMkt(markets, "BTC", cg.bitcoin.usd, cg.bitcoin.usd_24h_change);
        live++;
      }
      if (cg.ethereum) {
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

    // FX backup
    try {
      const fx = await fetchJson("https://api.frankfurter.app/latest?from=USD&to=EUR,JPY,GBP");
      if (fx?.rates?.EUR && markets.find((m) => m.sym === "EURUSD")?.source !== "live") {
        setMkt(markets, "EURUSD", 1 / fx.rates.EUR, null);
        live++;
      }
      if (fx?.rates?.JPY && markets.find((m) => m.sym === "USDJPY")?.source !== "live") {
        setMkt(markets, "USDJPY", fx.rates.JPY, null);
        live++;
      }
      setHealth("fx", "ok", "Frankfurter");
      Storage.cacheSet("fx", fx);
    } catch (e) {
      try {
        const fx2 = await fetchJson("https://open.er-api.com/v6/latest/USD");
        if (fx2?.rates?.EUR) setMkt(markets, "EURUSD", 1 / fx2.rates.EUR, null);
        if (fx2?.rates?.JPY) setMkt(markets, "USDJPY", fx2.rates.JPY, null);
        live++;
        setHealth("fx", "ok", "ER-API");
      } catch (e2) {
        setHealth("fx", "err", e2.message || e.message || "fail");
      }
    }

    // Micro-structure only for legs still without live data (proxies like WARINS, FOODX, SHIP…)
    markets.forEach((m) => {
      if (m.source === "live" || m.source === "cache") return;
      const seed = INSTRUMENTS.find((i) => i.sym === m.sym)?.seed;
      let n = parseFloat(String(m.val).replace(/[,%]/g, ""));
      if (!Number.isFinite(n)) n = seed || 100;
      let amp = 0.0012;
      if (m.cls === "ag") amp = 0.002;
      if (m.cls === "insurance") amp = 0.0025;
      if (m.cls === "energy") amp = 0.0018;
      if (m.sym === "VIX") amp = 0.006;
      const jitter = n * (Math.random() * amp * 2 - amp);
      const next = Math.max(0.01, n + jitter);
      const chg = (jitter / n) * 100;
      m.val = fmt(next, m.sym);
      m.chg = `${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%`;
      m.dir = chg > 0.02 ? "up" : chg < -0.02 ? "down" : "flat";
      m.source = "model";
      if (typeof Charts !== "undefined") Charts.push(m.sym, next);
    });

    state.markets = markets;
    Storage.cacheSet("markets", markets);
    setHealth("markets", live ? "ok" : "warn", live ? `${live} live legs` : "model tape");
    emit("markets", { items: markets });
    log(`Markets · live legs ${live}`);
  }

  function setMkt(markets, sym, price, chg24, cached = false) {
    const m = markets.find((x) => x.sym === sym);
    if (!m || price == null) return;
    m.val = fmt(price, sym);
    if (chg24 != null && Number.isFinite(chg24)) {
      m.chg = `${chg24 >= 0 ? "+" : ""}${chg24.toFixed(2)}%`;
      m.dir = chg24 > 0.05 ? "up" : chg24 < -0.05 ? "down" : "flat";
    } else {
      m.chg = cached ? "cache" : "live";
      m.dir = "flat";
    }
    m.source = cached ? "cache" : "live";
  }
  function fmt(n, sym) {
    if (sym === "EURUSD") return Number(n).toFixed(4);
    if (sym === "USDJPY" || sym === "US10Y") return Number(n).toFixed(2);
    if (n >= 1000) return Math.round(n).toLocaleString("en-US");
    return Number(n).toFixed(2);
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

  // ── Open-Meteo worldwide capital temperatures (batched) ──
  async function refreshWeather() {
    const cities =
      typeof weatherCitiesFromCountries === "function"
        ? weatherCitiesFromCountries()
        : (typeof COUNTRIES !== "undefined" ? COUNTRIES : [])
            .filter((c) => c.code && c.code !== "GLOBAL")
            .map((c) => ({ code: c.code, name: c.name, lat: c.lat, lon: c.lon, region: c.region }));

    if (!cities.length) {
      setHealth("weather", "err", "no cities");
      return;
    }

    try {
      const results = [];
      const chunkSize = 40; // Open-Meteo multi-location batches
      for (let i = 0; i < cities.length; i += chunkSize) {
        const chunk = cities.slice(i, i + chunkSize);
        const lats = chunk.map((c) => c.lat).join(",");
        const lons = chunk.map((c) => c.lon).join(",");
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,wind_speed_10m,weather_code,precipitation&timezone=UTC`;
        try {
          const j = await fetchJson(url, 25000);
          // multi-point: array of responses OR single object if one point
          const list = Array.isArray(j) ? j : j?.latitude != null || j?.current ? [j] : [];
          // Open-Meteo multi returns { latitude: [...], longitude: [...], current: { temperature_2m: [...], ... } }
          if (j && Array.isArray(j.latitude) && j.current) {
            const temps = [].concat(j.current.temperature_2m);
            const winds = [].concat(j.current.wind_speed_10m);
            const codes = [].concat(j.current.weather_code);
            const precips = [].concat(j.current.precipitation);
            const times = [].concat(j.current.time);
            chunk.forEach((c, idx) => {
              const cur = {
                temperature_2m: temps[idx],
                wind_speed_10m: winds[idx],
                weather_code: codes[idx],
                precipitation: precips[idx],
                time: times[idx],
              };
              results.push({
                code: c.code,
                name: c.name,
                region: c.region || "",
                lat: c.lat,
                lon: c.lon,
                temp: cur.temperature_2m,
                wind: cur.wind_speed_10m,
                precip: cur.precipitation,
                codeWx: cur.weather_code,
                time: cur.time,
                label: weatherCodeLabel(cur.weather_code),
                impact: weatherImpact(cur),
              });
            });
          } else if (list.length) {
            list.forEach((item, idx) => {
              const c = chunk[idx] || chunk[0];
              const cur = item.current || {};
              results.push({
                code: c.code,
                name: c.name,
                region: c.region || "",
                lat: c.lat,
                lon: c.lon,
                temp: cur.temperature_2m,
                wind: cur.wind_speed_10m,
                precip: cur.precipitation,
                codeWx: cur.weather_code,
                time: cur.time,
                label: weatherCodeLabel(cur.weather_code),
                impact: weatherImpact(cur),
              });
            });
          } else {
            // fallback: one-by-one for this chunk
            await Promise.all(
              chunk.map(async (c) => {
                try {
                  const u = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,wind_speed_10m,weather_code,precipitation&timezone=UTC`;
                  const one = await fetchJson(u, 10000);
                  const cur = one.current || {};
                  results.push({
                    code: c.code,
                    name: c.name,
                    region: c.region || "",
                    lat: c.lat,
                    lon: c.lon,
                    temp: cur.temperature_2m,
                    wind: cur.wind_speed_10m,
                    precip: cur.precipitation,
                    codeWx: cur.weather_code,
                    time: cur.time,
                    label: weatherCodeLabel(cur.weather_code),
                    impact: weatherImpact(cur),
                  });
                } catch {
                  /* skip */
                }
              })
            );
          }
        } catch (chunkErr) {
          log(`Weather chunk ${i}: ${chunkErr.message}`, "err");
        }
      }

      if (!results.length) throw new Error("no weather rows");
      // sort by name for stable UI
      results.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      state.weather = results;
      Storage.cacheSet("weather", results);
      setHealth("weather", "ok", `${results.length} countries Open-Meteo`);
      emit("weather", { items: results });
      log(`Weather ${results.length} countries`);
    } catch (e) {
      const c = Storage.cacheGet("weather", 6 * 3600e3);
      if (c?.data) {
        state.weather = c.data;
        setHealth("weather", "warn", "cache");
        emit("weather", { items: state.weather });
      } else setHealth("weather", "err", e.message || "fail");
    }
  }

  function weatherCodeLabel(code) {
    const m = {
      0: "Clear",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      51: "Drizzle",
      61: "Rain",
      63: "Rain",
      65: "Heavy rain",
      71: "Snow",
      80: "Rain showers",
      95: "Thunderstorm",
      96: "Thunderstorm hail",
    };
    return m[code] || `Code ${code ?? "—"}`;
  }
  function weatherImpact(cur) {
    const wind = cur.wind_speed_10m || 0;
    const precip = cur.precipitation || 0;
    if (cur.weather_code >= 95 || wind > 70) return "high";
    if (cur.weather_code >= 65 || wind > 45 || precip > 5) return "elevated";
    if (precip > 1 || wind > 30) return "watch";
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
