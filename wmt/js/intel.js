/**
 * Intelligence Answer Desk
 * Turns multi-domain state into easy-to-follow answers +
 * always-positive implications (issue → constructive path).
 */

const Intel = (() => {
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function kmriOf(indicators) {
    return (indicators || []).find((i) => i.id === "kmri");
  }

  function modelOf(indicators, id) {
    return (indicators || []).find((i) => i.id === id);
  }

  function countryName(code) {
    if (!code) return "Global";
    const c = (typeof COUNTRIES !== "undefined" ? COUNTRIES : []).find((x) => x.code === code);
    return c ? c.name : code;
  }

  function scenarioOf(id) {
    return (typeof SCENARIOS !== "undefined" ? SCENARIOS : []).find((s) => s.id === id) || {
      id: "baseline",
      name: "Baseline monitoring",
      desc: "Standard multi-domain watch.",
    };
  }

  function lensOf(id) {
    return (typeof LENSES !== "undefined" ? LENSES : []).find((l) => l.id === id) || {
      id: "overview",
      name: "Overview",
      question: "What matters most right now?",
    };
  }

  /** Always-positive constructive framing for a pressure topic */
  function positivePath(topic, severity) {
    const sev = severity || "elevated";
    const paths = {
      kinetic: {
        issue: "Fighting or military tension is higher",
        path: "Talks, ceasefires, and safe aid routes can still open.",
        outcome: "When talking returns and aid moves, families and markets feel safer.",
        action: "Watch KMRI/TSI, ceasefire news, and open corridors.",
      },
      energy: {
        issue: "Oil, gas, or energy sea routes are stressed",
        path: "Other routes, fuel stocks, and saving energy at home and at work help.",
        outcome: "Prices calm when ships move freely and supply is shared fairly.",
        action: "Watch oil, gas, Hormuz and Red Sea shipping.",
      },
      food: {
        issue: "Food crops or food shipping feel tight",
        path: "Other farms, open ports, and careful shopping reduce the squeeze.",
        outcome: "Shelves restock and prices ease when harvests and ships improve.",
        action: "Watch wheat, cocoa, Black Sea grain, and grocery signal.",
      },
      weather: {
        issue: "Storms or natural hazards are elevated",
        path: "Early warnings, strong buildings, and ready helpers cut harm.",
        outcome: "Prepared towns recover faster and stay safer.",
        action: "Watch weather, EONET disasters, and quakes.",
      },
      transport: {
        issue: "Ships and key canals are under pressure",
        path: "Other routes and better insurance capacity restore trade.",
        outcome: "Goods arrive more on time when corridors calm.",
        action: "Watch shipping, Suez, Hormuz, and Cape routes.",
      },
      macro: {
        issue: "Markets feel fearful",
        path: "Clear rules and calm policy help people invest again.",
        outcome: "Fear often cools; money returns to useful work.",
        action: "Watch VIX, gold, stocks, and KMRI.",
      },
      insurance: {
        issue: "Storm or war insurance is expensive",
        path: "As risks clarify, more insurers can offer coverage again.",
        outcome: "Trade and energy ships can insure at fairer prices.",
        action: "Watch war-risk and storm insurance signals.",
      },
      country: {
        issue: "This country shows higher stress",
        path: "Aid, fair services, and regional talks create safer paths.",
        outcome: "Stability grows when security and daily services improve together.",
        action: "Watch country brief, theaters, and local news.",
      },
      news: {
        issue: "News is very loud today",
        path: "Slow down, check several trusted sources, avoid rumors.",
        outcome: "Clearer truth appears as careful reporters catch up.",
        action: "Use NVI, severity tags, and many sources.",
      },
    };
    const p = paths[topic] || paths.kinetic;
    return {
      topic,
      severity: sev,
      issue: p.issue,
      constructive: p.path,
      positiveOutcome: p.outcome,
      monitor: p.action,
      tone: "constructive",
    };
  }

  function pickDominantTopics(ctx) {
    const f = ctx.factors || {};
    const ranked = [
      ["kinetic", f.kinetic ?? f.theaters ?? 50],
      ["energy", f.energy ?? 50],
      ["food", f.food ?? 50],
      ["weather", f.weather ?? 50],
      ["transport", f.transport ?? f.chokepoints ?? 50],
      ["macro", f.riskTone ?? 50],
      ["insurance", f.insurance ?? 50],
      ["news", f.velocity ?? f.newsCrisis ?? 50],
    ]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    return ranked.map(([topic, score]) => ({
      topic,
      score: Math.round(score),
      severity: score >= 75 ? "critical" : score >= 55 ? "high" : score >= 40 ? "elevated" : "watch",
    }));
  }

  /** Core Q&A cards an intelligence desk would ask */
  function buildAnswers(ctx) {
    const indicators = ctx.indicators || [];
    const kmri = kmriOf(indicators);
    const country = ctx.country || "";
    const scenario = scenarioOf(ctx.scenario);
    const lens = lensOf(ctx.lens);
    const news = ctx.news || [];
    const markets = ctx.markets || [];
    const hotspots = ctx.hotspots || [];
    const theaters = ctx.theaters || (typeof THEATERS !== "undefined" ? THEATERS : []);
    const factors = kmri?.factors || ctx.factors || {};

    const topHot = [...hotspots].sort((a, b) => b.score - a.score)[0];
    const critTheater = theaters.find((t) => t.posture === "critical") || theaters.find((t) => t.posture === "elevated");
    const flash = news.filter((n) => n.sev === "crit" || n.sev === "high").slice(0, 3);
    const brent = markets.find((m) => m.sym === "BRENT");
    const wheat = markets.find((m) => m.sym === "WHEAT");
    const vix = markets.find((m) => m.sym === "VIX");

    const answers = [];

    answers.push({
      q: lens.question || "What matters most right now?",
      a:
        kmri != null
          ? `KMRI sits at ${kmri.value} (Δ ${kmri.delta > 0 ? "+" : ""}${kmri.delta}). Dominant pressure: ${
              pickDominantTopics({ factors })[0]?.topic || "balanced"
            }. Focus: ${countryName(country)} · ${scenario.name}.`
          : "Models initializing — first factor pass will answer this.",
      confidence: kmri ? clamp(100 - Math.abs((kmri.value || 50) - 50), 40, 95) : 30,
      tags: ["KMRI", scenario.name, countryName(country)],
      linkView: "risk",
    });

    answers.push({
      q: "Where is the highest kinetic / crisis heat?",
      a: topHot
        ? `${topHot.name} leads at score ${topHot.score} (Δ ${topHot.delta > 0 ? "+" : ""}${topHot.delta}). ${
            critTheater ? `Critical/elevated theater: ${critTheater.name} — ${critTheater.note}` : "No single theater is critical."
          }`
        : "Hotspot board is quiet relative to baseline.",
      confidence: 78,
      tags: ["TSI", "hotspots", "theaters"],
      linkView: "crisis",
      fly: topHot ? { lon: topHot.lon, lat: topHot.lat, zoom: 5 } : null,
    });

    answers.push({
      q: "What is the market / commodity signal?",
      a: `Brent ${brent?.val ?? "—"} (${brent?.chg ?? "—"}) · Wheat ${wheat?.val ?? "—"} (${wheat?.chg ?? "—"}) · VIX ${
        vix?.val ?? "—"
      }. Energy (ERI) and food (FSI) composites read the stress behind the tape.`,
      confidence: 70,
      tags: ["ERI", "FSI", "CPR", "tape"],
      linkView: "markets",
    });

    answers.push({
      q: country ? `What should we watch on ${countryName(country)}?` : "What is the country-level picture?",
      a: country
        ? (() => {
            const c = (typeof COUNTRIES !== "undefined" ? COUNTRIES : []).find((x) => x.code === country);
            const cii = (typeof CII !== "undefined" ? CII : []).find((x) => x.code === country);
            const linked = theaters.filter((t) => t.countries?.includes(country));
            return `${c?.name || country}: base risk ${c?.risk ?? "—"}, CII ${cii?.score ?? "—"}. Linked theaters: ${
              linked.map((t) => t.name).join(", ") || "none in catalog"
            }. Local news filter is active when headlines match.`;
          })()
        : "Global mode — select a country to open a national intelligence brief with map fly-to.",
      confidence: country ? 74 : 55,
      tags: ["CII", "country", "brief"],
      linkView: "command",
    });

    answers.push({
      q: "What is the live open-source pulse?",
      a: flash.length
        ? `Top flash: ${flash.map((n) => `[${n.source}] ${n.title}`).join(" · ")}`
        : news.length
          ? `${news.length} live headlines fused. No critical flash cluster right now.`
          : "News feeds reconnecting — cache/seed fallback may be active.",
      confidence: news.length ? 82 : 35,
      tags: ["RSS", "NVI", "live"],
      linkView: "news",
    });

    answers.push({
      q: `Under scenario “${scenario.name}”, what changes?`,
      a: `${scenario.desc} Emphasized domains: ${(scenario.domains || []).join(", ")}. The Answer Desk and map layers re-weight toward those desks so you only follow what the scenario needs.`,
      confidence: 88,
      tags: ["scenario", ...(scenario.domains || [])],
      linkView: "answers",
    });

    answers.push({
      q: "What constructive paths exist from current pressure?",
      a: "Every elevated domain below lists a constructive path and positive outcome — pressure is framed as something that can de-escalate, reroute, or be managed.",
      confidence: 90,
      tags: ["implications", "constructive"],
      linkView: "answers",
    });

    if (country && country !== "GLOBAL" && typeof getAffordProfile === "function") {
      const aff = getAffordProfile(country);
      if (aff && aff.code === country) {
        answers.push({
          q: `How affordable is daily life in ${countryName(country)}?`,
          a: `Overall affordability score ${aff.affordScore}/100 (higher = easier costs) for ${countryName(
            country
          )}. Housing ${aff.housing}, groceries ${aff.groceries}, home energy ${aff.energy}, fuel ${aff.gasFuel}, cars ${aff.cars}, public transport ${aff.transport}, public school ${aff.schoolPublic}, private school ${aff.schoolPrivate}, childcare ${aff.childcare}, healthcare ${aff.healthcare}. ${aff.note}`,
          confidence: aff.source === "curated" ? 74 : 62,
          tags: ["affordability", country, "housing", "school"],
          linkView: "afford",
        });
      }
    }

    return answers;
  }

  function buildImplications(ctx) {
    const kmri = kmriOf(ctx.indicators);
    const factors = kmri?.factors || ctx.factors || {};
    const topics = pickDominantTopics({ factors });
    if (ctx.country) {
      topics.unshift({
        topic: "country",
        score: (typeof COUNTRIES !== "undefined" ? COUNTRIES : []).find((c) => c.code === ctx.country)?.risk || 50,
        severity: "elevated",
      });
    }
    // unique by topic
    const seen = new Set();
    const list = [];
    topics.forEach((t) => {
      if (seen.has(t.topic)) return;
      seen.add(t.topic);
      list.push({
        ...positivePath(t.topic, t.severity),
        score: t.score,
      });
    });
    return list.slice(0, 5);
  }

  /** Scenario × lens × country triad summary */
  function buildTriad(ctx) {
    const scenario = scenarioOf(ctx.scenario);
    const lens = lensOf(ctx.lens);
    const country = countryName(ctx.country);
    const kmri = kmriOf(ctx.indicators);
    return {
      scenario: { id: scenario.id, name: scenario.name, desc: scenario.desc, domains: scenario.domains || [] },
      lens: { id: lens.id, name: lens.name, question: lens.question, desc: lens.desc || "" },
      country: { code: ctx.country || "GLOBAL", name: country },
      kmri: kmri ? kmri.value : null,
      blurb: `You are viewing ${country} through the “${lens.name}” lens under scenario “${scenario.name}”. ${
        kmri != null ? `KMRI ${kmri.value}.` : ""
      } Panels, news, and map emphasis follow this triad.`,
    };
  }

  /** Compact “world pulse” metrics for command header */
  function buildPulse(ctx) {
    const ind = ctx.indicators || [];
    const pick = (id) => modelOf(ind, id)?.value;
    const news = ctx.news || [];
    const quakes = ctx.quakes || [];
    const eonet = ctx.eonet || [];
    return {
      kmri: pick("kmri"),
      tsi: pick("tsi"),
      fsi: pick("fsi"),
      eri: pick("eri"),
      wri: pick("wri"),
      tri: pick("tri"),
      nvi: pick("nvi"),
      headlines: news.length,
      quakes: quakes.length,
      disasters: eonet.length,
      flash: news.filter((n) => n.sev === "crit" || n.sev === "high").length,
    };
  }

  /** Radar series for multi-model spider (0–100) */
  function buildRadar(ctx) {
    const ind = ctx.indicators || [];
    const ids = ["kmri", "tsi", "wri", "fsi", "eri", "tri", "iri", "spi"];
    return ids.map((id) => {
      const m = modelOf(ind, id);
      return {
        id,
        name: m?.name || id.toUpperCase(),
        label: m?.label || id,
        value: m?.value ?? 50,
        color: typeof Indicators !== "undefined" ? Indicators.colorFor(m || { id }, m?.value ?? 50) : "#f5a623",
      };
    });
  }

  return {
    buildAnswers,
    buildImplications,
    buildTriad,
    buildPulse,
    buildRadar,
    positivePath,
    pickDominantTopics,
  };
})();
