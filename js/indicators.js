/**
 * Proprietary risk models — KMRI flagship + suite
 */

const Indicators = (() => {
  let defs = [];
  const history = {};
  const MAX_HIST = 56;
  const bus = new EventTarget();

  function load() {
    const saved = Storage.get("indicators");
    // migrate: always ensure KMRI exists
    const base = DEFAULT_INDICATORS.map((d) => ({ ...d, weights: { ...d.weights } }));
    if (saved && Array.isArray(saved) && saved.length) {
      const byId = Object.fromEntries(saved.map((d) => [d.id, d]));
      defs = base.map((b) => (byId[b.id] ? { ...b, ...byId[b.id], weights: { ...b.weights, ...byId[b.id].weights } } : b));
      // user extras
      saved.forEach((s) => {
        if (!defs.find((d) => d.id === s.id)) defs.push(s);
      });
    } else {
      defs = base;
    }
    Object.assign(history, Storage.get("indicatorHistory") || {});
  }

  function save() {
    Storage.set("indicators", defs);
    Storage.set("indicatorHistory", history);
  }

  function getDefs() {
    return defs.map((d) => ({ ...d, weights: { ...d.weights } }));
  }
  function setDefs(next) {
    defs = next;
    save();
    bus.dispatchEvent(new CustomEvent("defs", { detail: defs }));
  }
  function addDef(partial = {}) {
    const id = "ind_" + Date.now().toString(36);
    const d = {
      id,
      name: partial.name || "CUSTOM",
      label: partial.label || "Custom Model",
      desc: partial.desc || "User-defined weighted composite.",
      weights: partial.weights || { kinetic: 25, riskTone: 25, food: 25, energy: 25 },
      bipolar: !!partial.bipolar,
      model: true,
    };
    defs.push(d);
    save();
    return d;
  }
  function removeDef(id) {
    if (id === "kmri") return; // protect flagship
    defs = defs.filter((d) => d.id !== id);
    delete history[id];
    save();
  }

  function mkt(markets, sym) {
    return markets.find((x) => x.sym === sym);
  }
  function mktNum(markets, sym) {
    const m = mkt(markets, sym);
    if (!m) return null;
    const n = parseFloat(String(m.val).replace(/[,%]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  function mktDir(markets, sym) {
    return mkt(markets, sym)?.dir || "flat";
  }
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function factors(ctx) {
    const hotspots = ctx.hotspots || HOTSPOTS;
    const avgHot = hotspots.reduce((s, h) => s + (h.score || 0), 0) / Math.max(1, hotspots.length);

    const news = ctx.news || [];
    const crisisRe = /war|missile|strike|nuclear|invasion|sanctions|attack|killed|airstrike|crisis|conflict/i;
    const weatherRe = /storm|hurricane|typhoon|flood|drought|wildfire|earthquake|cyclone/i;
    const foodRe = /wheat|cocoa|grain|food|famine|crop|harvest|soy|corn|rice/i;
    const crisisHits = news.filter((n) => crisisRe.test(n.title || "")).length;
    const weatherHits = news.filter((n) => weatherRe.test(n.title || "")).length;
    const newsCrisis = Math.min(100, (crisisHits / Math.max(6, news.length * 0.2)) * 100);

    const markets = ctx.markets || [];
    const vix = mktNum(markets, "VIX");
    const goldDir = mktDir(markets, "GOLD");
    const btcDir = mktDir(markets, "BTC");
    const spxDir = mktDir(markets, "SPX");

    let riskTone = 50;
    if (vix != null) riskTone = clamp(((vix - 12) / 28) * 100, 0, 100);
    if (goldDir === "up") riskTone = clamp(riskTone + 8, 0, 100);
    if (btcDir === "down") riskTone = clamp(riskTone + 6, 0, 100);
    if (spxDir === "down") riskTone = clamp(riskTone + 6, 0, 100);

    let energy = 45;
    if (mktDir(markets, "BRENT") === "up") energy += 14;
    if (mktDir(markets, "BRENT") === "down") energy -= 10;
    if (mktDir(markets, "NATGAS") === "up") energy += 10;
    if (mktDir(markets, "WARINS") === "up") energy += 8;
    energy = clamp(energy + (vix != null ? (vix - 15) * 1.1 : 0), 0, 100);

    // Food / ag pressure from softs
    let food = 40;
    ["WHEAT", "COCOA", "CORN", "SOY", "FOODX"].forEach((sym) => {
      if (mktDir(markets, sym) === "up") food += 8;
      if (mktDir(markets, sym) === "down") food -= 4;
    });
    food += Math.min(20, foodRe ? news.filter((n) => foodRe.test(n.title || "")).length * 4 : 0);
    const ag = ctx.agRegions || (typeof AG_REGIONS !== "undefined" ? AG_REGIONS : []);
    if (ag.length) food = clamp((food + ag.reduce((s, a) => s + a.stress, 0) / ag.length) / 2 + food / 2, 0, 100);
    food = clamp(food, 0, 100);

    const theaters = ctx.theaters || THEATERS;
    const tScore =
      theaters.reduce((s, t) => {
        if (t.posture === "critical") return s + 100;
        if (t.posture === "elevated") return s + 65;
        if (t.posture === "watch") return s + 35;
        return s + 10;
      }, 0) / Math.max(1, theaters.length);

    const choke = theaters.filter((t) => /red sea|persian|hormuz|black sea|bab|taiwan/i.test(t.name));
    const chokepoints =
      choke.reduce((s, t) => s + (t.posture === "critical" ? 100 : t.posture === "elevated" ? 70 : 40), 0) /
      Math.max(1, choke.length);

    let riskOn = 50;
    if (btcDir === "up") riskOn += 15;
    if (spxDir === "up") riskOn += 12;
    if (btcDir === "down") riskOn -= 12;
    if (spxDir === "down") riskOn -= 10;
    riskOn = clamp(riskOn, 0, 100);

    let safeHaven = 50;
    if (goldDir === "up") safeHaven += 15;
    if (goldDir === "down") safeHaven -= 10;
    if (vix != null && vix > 20) safeHaven += 10;
    safeHaven = clamp(safeHaven, 0, 100);

    const hourAgo = Date.now() - 3600000;
    const recent = news.filter((n) => (n.published || 0) >= hourAgo).length;
    const velocity = Math.min(100, recent * 4);

    const alerts = ctx.alerts || ALERTS;
    const alertHeat =
      alerts.reduce((s, a) => s + (a.sev === "crit" ? 100 : a.sev === "high" ? 70 : 30), 0) /
      Math.max(1, alerts.length);

    const quakes = ctx.quakes || [];
    const quakeHeat = Math.min(100, quakes.reduce((s, q) => s + Math.max(0, (q.mag || 0) - 3) * 12, 0) / 2);

    const eonet = ctx.eonet || [];
    let weather = Math.min(100, eonet.length * 4 + weatherHits * 5);
    const wx = ctx.weather || [];
    const hiImpact = wx.filter((w) => w.impact === "high" || w.impact === "elevated").length;
    weather = clamp(weather + hiImpact * 8, 0, 100);

    // Kinetic composite
    const kinetic = clamp(avgHot * 0.45 + tScore * 0.35 + alertHeat * 0.2, 0, 100);

    // Transport
    let transport = 40;
    if (mktDir(markets, "SHIP") === "up") transport += 12;
    if (mktDir(markets, "BDI") === "up") transport += 8;
    transport = clamp((transport + chokepoints) / 2 + transport / 2, 0, 100);

    // Insurance
    let insurance = 40;
    if (mktDir(markets, "WARINS") === "up") insurance += 18;
    if (mktDir(markets, "CAT") === "up") insurance += 12;
    const ins = ctx.insurance || (typeof INSURANCE_SIGNALS !== "undefined" ? INSURANCE_SIGNALS : []);
    if (ins.length) {
      const map = { crit: 95, high: 75, elevated: 55, watch: 35 };
      insurance = clamp(
        (insurance + ins.reduce((s, i) => s + (map[i.level] || 40), 0) / ins.length) / 1.5,
        0,
        100
      );
    }

    // Country focus boost
    if (ctx.countryCode && ctx.countryCode !== "GLOBAL" && ctx.countryCode !== "") {
      const c = (typeof COUNTRIES !== "undefined" ? COUNTRIES : []).find((x) => x.code === ctx.countryCode);
      if (c) {
        const boost = (c.risk - 40) * 0.15;
        return scaleFactors(
          {
            hotspots: avgHot,
            newsCrisis,
            riskTone,
            energy,
            food,
            chokepoints,
            theaters: tScore,
            riskOn,
            safeHaven,
            velocity,
            alerts: alertHeat,
            quakes: quakeHeat,
            weather,
            kinetic,
            transport,
            insurance,
          },
          boost
        );
      }
    }

    return {
      hotspots: avgHot,
      newsCrisis,
      riskTone,
      energy,
      food,
      chokepoints,
      theaters: tScore,
      riskOn,
      safeHaven,
      velocity,
      alerts: alertHeat,
      quakes: quakeHeat,
      weather,
      kinetic,
      transport,
      insurance,
    };
  }

  function scaleFactors(f, boost) {
    const out = {};
    Object.keys(f).forEach((k) => {
      if (k === "riskOn") out[k] = f[k];
      else out[k] = clamp(f[k] + boost, 0, 100);
    });
    return out;
  }

  // Factors where higher = more stress (inverted for constructive models like SPI)
  const STRESS_KEYS = new Set([
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
    "velocity",
    "alerts",
    "quakes",
    "safeHaven",
  ]);

  function computeOne(def, f) {
    const w = def.weights || {};
    let totalW = 0;
    let acc = 0;
    Object.keys(w).forEach((k) => {
      const weight = Number(w[k]) || 0;
      if (!weight) return;
      let raw = f[k] != null ? f[k] : 50;
      // Constructive models: stress factors contribute as headroom (100 - stress)
      if (def.constructive && STRESS_KEYS.has(k)) raw = 100 - raw;
      acc += raw * weight;
      totalW += weight;
    });
    let value = totalW ? acc / totalW : 50;
    if (def.bipolar || def.id === "ror") {
      value = clamp((f.riskOn ?? 50) - (f.safeHaven ?? 50), -100, 100);
    } else {
      value = clamp(value, 0, 100);
    }
    return Math.round(value * 10) / 10;
  }

  function compute(ctx) {
    const f = factors(ctx);
    const results = defs.map((def) => {
      const value = computeOne(def, f);
      if (!history[def.id]) history[def.id] = [];
      const hist = history[def.id];
      const last = hist[hist.length - 1];
      if (last == null || Math.abs(last - value) > 0.05 || hist.length < 2) {
        hist.push(value);
        if (hist.length > MAX_HIST) hist.shift();
      }
      const prev = hist.length > 1 ? hist[hist.length - 2] : value;
      return {
        ...def,
        value,
        delta: Math.round((value - prev) * 10) / 10,
        history: [...hist],
        factors: f,
      };
    });
    save();
    bus.dispatchEvent(new CustomEvent("compute", { detail: results }));
    return results;
  }

  function colorFor(def, value) {
    if (def.bipolar || def.id === "ror") {
      if (value > 15) return "#00c853";
      if (value < -15) return "#ff3b30";
      return "#f5a623";
    }
    // Constructive models (SPI): higher = better / greener
    if (def.constructive || def.id === "spi") {
      if (value >= 65) return "#00c853";
      if (value >= 45) return "#f5a623";
      if (value >= 30) return "#ff6b1a";
      return "#ff3b30";
    }
    if (value >= 75) return "#ff3b30";
    if (value >= 55) return "#ff6b1a";
    if (value >= 40) return "#f5a623";
    return "#00c853";
  }

  function getKmri(results) {
    return (results || []).find((r) => r.id === "kmri");
  }

  load();

  return {
    load,
    getDefs,
    setDefs,
    addDef,
    removeDef,
    compute,
    colorFor,
    factors,
    getKmri,
    on: (t, fn) => bus.addEventListener(t, fn),
  };
})();
