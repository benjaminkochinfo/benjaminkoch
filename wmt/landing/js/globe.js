/* WMT globe: one WebGL globe reused across hero, narrative and Watched sections. */
window.WMTGlobe = (() => {
  let g = null, seeds = null, ready = false, you = null;
  const el = document.getElementById("globe");
  const heat = (s) => (s >= 75 ? "#ff3b30" : s >= 40 ? "#ff6b1a" : "#00c853");

  const mobile = () => window.innerWidth <= 820;
  function size() { if (g) g.width(window.innerWidth).height(window.innerHeight); }

  async function init(seedData, countries) {
    seeds = seedData;
    if (typeof Globe === "undefined") return false;
    try { g = new Globe(el, { animateIn: true }); } catch (e) { g = Globe()(el); }
    const hot = seeds.hotspots.map((h) => ({ ...h, kind: "hot", color: heat(h.score), alt: 0.02 + h.score / 1400 }));
    const choke = seeds.chokepoints.map((c) => ({ ...c, kind: "choke", color: "#00d4ff", alt: 0.012, score: 0 }));
    // lanes between chokepoints (illustrative great-circle links, not vessel tracks)
    const C = Object.fromEntries(seeds.chokepoints.map((c) => [c.name, c]));
    const pairs = [["Strait of Hormuz", "Bab el-Mandeb"], ["Bab el-Mandeb", "Suez Canal"], ["Suez Canal", "Bosporus"], ["Strait of Hormuz", "Malacca / Singapore"], ["Malacca / Singapore", "Taiwan Strait shipping"], ["Bab el-Mandeb", "Cape of Good Hope route"], ["Cape of Good Hope route", "Panama Canal"]];
    const arcs = pairs.filter(([a, b]) => C[a] && C[b]).map(([a, b]) => ({ startLat: C[a].lat, startLng: C[a].lon, endLat: C[b].lat, endLng: C[b].lon, color: ["rgba(0,212,255,.05)", "rgba(0,212,255,.7)", "rgba(0,212,255,.05)"], kind: "lane" }));
    g.backgroundColor("rgba(0,0,0,0)")
      .globeImageUrl("landing/assets/img/earth-night.jpg")
      .bumpImageUrl("landing/assets/img/earth-topology.png")
      .showAtmosphere(true).atmosphereColor("#f5a623").atmosphereAltitude(0.16)
      .hexPolygonsData(countries ? countries.features : [])
      .hexPolygonResolution(3).hexPolygonMargin(0.55).hexPolygonAltitude(0.006)
      .hexPolygonColor(() => "rgba(245,166,35,0.30)")
      .pointsData([...hot, ...choke]).pointLat("lat").pointLng("lon").pointColor("color").pointAltitude("alt").pointRadius((d) => (d.kind === "hot" ? 0.55 : 0.32)).pointsMerge(false)
      .ringsData(hot.filter((h) => h.score >= 60)).ringLat("lat").ringLng("lon").ringColor((d) => (t) => d.kind === "you" ? `rgba(245,166,35,${1 - t})` : `rgba(255,${d.score >= 75 ? 59 : 107},${d.score >= 75 ? 48 : 26},${1 - t})`).ringMaxRadius(4.5).ringPropagationSpeed(1.6).ringRepeatPeriod(1400)
      .arcsData(arcs).arcColor("color").arcStroke(0.45).arcDashLength(0.5).arcDashGap(0.25).arcDashAnimateTime(3200).arcAltitudeAutoScale(0.18)
      .htmlElementsData(hot.filter((h) => h.score >= 66)).htmlLat("lat").htmlLng("lon").htmlAltitude(0.03)
      .htmlElement((d) => { const n = document.createElement("div"); n.className = d.kind === "you" ? "g-you" : "g-lbl"; n.innerHTML = d.kind === "you" ? `◉ ${d.name}` : `${d.name.toUpperCase()}<b>${d.score}</b>`; return n; });
    const mat = g.globeMaterial(); if (mat && mat.color) { mat.bumpScale = 6; }
    const ctl = g.controls(); ctl.autoRotate = true; ctl.autoRotateSpeed = 0.35; ctl.enableZoom = false; ctl.enablePan = false;
    g.pointOfView({ lat: 22, lng: 30, altitude: mobile() ? 4.6 : 2.5 });
    size(); window.addEventListener("resize", size);
    ready = true;
    return true;
  }
  function flyTo(lat, lng, altitude = 2, ms = 1600) { if (g) g.pointOfView({ lat, lng, altitude: mobile() ? altitude + 2 : altitude }, ms); }
  function rotate(on) { if (g) g.controls().autoRotate = on; }
  function setYou(p, links = []) {
    if (!g) return; you = p;
    const hot = seeds.hotspots.filter((h) => h.score >= 66).map((h) => ({ ...h, kind: "hot" }));
    g.htmlElementsData([...hot, { kind: "you", name: p.name, lat: p.lat, lon: p.lon }]);
    const base = (g.arcsData() || []).filter((a) => a.kind === "lane");
    const mine = links.map((l) => ({ startLat: p.lat, startLng: p.lon, endLat: l.lat, endLng: l.lon, color: ["rgba(245,166,35,.95)", "rgba(245,166,35,.15)"], kind: "you" }));
    g.arcsData([...base, ...mine]);
    const rings = (g.ringsData() || []).filter((r) => r.kind !== "you");
    g.ringsData([...rings, { kind: "you", lat: p.lat, lon: p.lon, score: 100 }]);
  }
  function setSatTrack(points) {
    if (!g) return;
    g.pathsData(points.length ? [points] : []).pathPoints((d) => d).pathPointLat((p) => p[0]).pathPointLng((p) => p[1]).pathPointAlt((p) => p[2])
      .pathColor(() => ["rgba(232,234,237,.05)", "rgba(232,234,237,.8)"]).pathStroke(0.6).pathDashLength(0.02).pathDashGap(0.004).pathDashAnimateTime(60000);
  }
  return { mobile, init, flyTo, rotate, setYou, setSatTrack, isReady: () => ready, heat, get seeds() { return seeds; } };
})();
