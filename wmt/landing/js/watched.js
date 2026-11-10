/* "The world watched you back": WMT's take on a seven-day exposure card for any place. All computed client-side from public sources. */
window.WMTWatched = (() => {
  const $ = (s) => document.querySelector(s);
  const R = 6371, rad = Math.PI / 180;
  const km = (a, b, c, d) => { const x = Math.sin(((c - a) * rad) / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin(((d - b) * rad) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  let tleP = null, quakeP = null, eonetP = null, runId = 0;

  function getTLE() {
    if (!tleP) tleP = Promise.all(["stations", "visual"].map((g) => fetch(`https://celestrak.org/NORAD/elements/gp.php?GROUP=${g}&FORMAT=tle`).then((r) => r.text()).catch(() => ""))).then((txts) => {
      const seen = new Set(), out = [];
      txts.join("\n").split(/\r?\n/).reduce((acc, l, i, a) => { if (l.startsWith("1 ") && a[i + 1] && a[i + 1].startsWith("2 ")) { const id = l.slice(2, 7); if (!seen.has(id)) { seen.add(id); try { out.push({ name: (a[i - 1] || id).trim(), rec: satellite.twoline2satrec(l, a[i + 1]) }); } catch (e) {} } } return acc; }, 0);
      return out;
    });
    return tleP;
  }
  const getQuakes = () => (quakeP ||= fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson").then((r) => r.json()).then((j) => j.features).catch(() => []));
  const getEonet = () => (eonetP ||= fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=7").then((r) => r.json()).then((j) => j.events || []).catch(() => []));

  function subPoint(rec, date) {
    const pv = satellite.propagate(rec, date); if (!pv || !pv.position) return null;
    const gd = satellite.eciToGeodetic(pv.position, satellite.gstime(date));
    return [satellite.degreesLat(gd.latitude), satellite.degreesLong(gd.longitude), gd.height];
  }

  async function passes(lat, lon, onProg, id) {
    const sats = await getTLE(); if (!sats.length) return null;
    const obs = { latitude: lat * rad, longitude: lon * rad, height: 0.05 };
    const end = Date.now(), start = end - 7 * 864e5, step = 60e3;
    let total = 0, best = null; const watchers = new Set();
    for (let s = 0; s < sats.length; s++) {
      if (id !== runId) return null;
      const { rec, name } = sats[s]; let up = false, peak = 0, peakT = 0;
      for (let t = start; t <= end; t += step) {
        const d = new Date(t); const pv = satellite.propagate(rec, d); if (!pv || !pv.position) break;
        const la = satellite.ecfToLookAngles(obs, satellite.eciToEcf(pv.position, satellite.gstime(d)));
        const el = la.elevation / rad;
        if (el > 10) { if (!up) { up = true; total++; watchers.add(name); peak = 0; } if (el > peak) { peak = el; peakT = t; } }
        else if (up) { up = false; if (!best || peak > best.el) best = { name, el: peak, t: peakT, rec }; }
      }
      if (s % 6 === 5) { onProg && onProg(s / sats.length); await new Promise((r) => setTimeout(r, 0)); }
    }
    return { total, sats: watchers.size, of: sats.length, best };
  }

  function row(ic, k, s, v, vs) { return `<div class="drow"><span class="ic">${ic}</span><div><div class="k">${k}</div><div class="s">${s}</div></div><div class="v">${v}${vs ? `<small>${vs}</small>` : ""}</div></div>`; }

  async function run(place) {
    const id = ++runId; const seeds = WMTGlobe.seeds;
    $("#dPlace").textContent = `${place.name.toUpperCase()} · ${place.lat.toFixed(2)}°, ${place.lon.toFixed(2)}°`;
    $("#dTotal").textContent = "…";
    $("#dRows").innerHTML = `<div class="computing" id="dProg">PROPAGATING ORBITS · 0%</div>`;
    const nh = seeds.hotspots.map((h) => ({ ...h, d: km(place.lat, place.lon, h.lat, h.lon) })).sort((a, b) => a.d - b.d)[0];
    const nc = seeds.chokepoints.map((h) => ({ ...h, d: km(place.lat, place.lon, h.lat, h.lon) })).sort((a, b) => a.d - b.d)[0];
    WMTGlobe.setYou(place, [nh, nc]);
    WMTGlobe.flyTo(place.lat - 6, place.lon + 14, 2.0, 1800);
    WMTGlobe.rotate(false);
    const [q, ev, wx] = await Promise.all([getQuakes(), getEonet(), fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,wind_speed_10m`).then((r) => r.json()).catch(() => null)]);
    const p = await passes(place.lat, place.lon, (f) => { const e = $("#dProg"); if (e) e.textContent = `PROPAGATING ORBITS · ${Math.round(f * 100)}%`; }, id);
    if (id !== runId) return;
    const nq = q.map((f) => ({ mag: f.properties.mag, place: f.properties.place, d: km(place.lat, place.lon, f.geometry.coordinates[1], f.geometry.coordinates[0]) })).filter((x) => x.d < 1000);
    const maxQ = nq.reduce((m, x) => (x.mag > (m?.mag || 0) ? x : m), null);
    const ne = ev.map((e) => { const g = (e.geometry || []).slice(-1)[0]; if (!g || g.type !== "Point") return null; return { title: e.title, cat: e.categories?.[0]?.title, d: km(place.lat, place.lon, g.coordinates[1], g.coordinates[0]) }; }).filter((x) => x && x.d < 1500).sort((a, b) => a.d - b.d);
    const total = (p ? p.sats : 0) + nq.length + ne.length; // headline counts distinct satellites, not passes
    $("#dTotal").textContent = fmt(total);
    let html = "";
    if (p) { html += row("◌", "Distinct satellites overhead", `of ${p.of} tracked bright satellites & crewed stations · rose above 10°`, fmt(p.sats), "SATELLITES"); html += row("↻", "Satellite passes, total", `Every rise above 10° elevation · ~${(p.total / Math.max(1, p.sats)).toFixed(1)} per satellite`, fmt(p.total), "PASSES"); }
    else html += row("◌", "Satellite passes", "CelesTrak unavailable right now", "—");
    if (p && p.best) { html += row("↟", `Highest pass: ${p.best.name}`, new Date(p.best.t).toUTCString().slice(0, 22) + " UTC", `${Math.round(p.best.el)}°`, "ELEV"); const tr = []; for (let t = p.best.t - 9e5; t <= p.best.t + 9e5; t += 3e4) { const sp = subPoint(p.best.rec, new Date(t)); if (sp) tr.push([sp[0], sp[1], Math.min(0.25, sp[2] / R)]); } WMTGlobe.setSatTrack(tr); }
    html += row("≋", "Earthquakes within 1,000 km", maxQ ? `Largest M${maxQ.mag.toFixed(1)} · ${maxQ.place}` : "USGS M2.5+ feed · none nearby", fmt(nq.length), "M2.5+");
    html += row("☁", "Natural events within 1,500 km", ne[0] ? `${ne[0].cat || "Event"} · ${ne[0].title} · ${fmt(ne[0].d)} km` : "NASA EONET open events · none nearby", fmt(ne.length), "OPEN");
    html += row("◆", `Nearest WMT hotspot: ${nh.name}`, `Terminal seed heat ${nh.score} · live heat in terminal`, `${fmt(nh.d)}`, "KM");
    html += row("⬡", `Nearest chokepoint: ${nc.name}`, `${nc.note} · posture ${nc.status}`, `${fmt(nc.d)}`, "KM");
    if (wx && wx.current) html += row("°", "Weather right now", `Open-Meteo · wind ${Math.round(wx.current.wind_speed_10m)} km/h`, `${Math.round(wx.current.temperature_2m)}°C`);
    $("#dRows").innerHTML = html;
    $("#dFoot").textContent = `Computed in your browser ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · nothing stored · CelesTrak GP · USGS · NASA EONET · Open-Meteo · WMT seeds`;
  }

  function wire() {
    const pre = $("#wPresets");
    pre.innerHTML = WMT_CONFIG.PRESETS.map((p, i) => `<button type="button" class="chip" data-i="${i}">${p.name}</button>`).join("");
    pre.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; pre.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === b)); run(WMT_CONFIG.PRESETS[+b.dataset.i]); });
    const res = $("#wResults");
    $("#wForm").addEventListener("submit", async (e) => {
      e.preventDefault(); const q = $("#wInput").value.trim(); if (!q) return;
      const j = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5`).then((r) => r.json()).catch(() => ({}));
      const list = j.results || [];
      res.innerHTML = list.length ? list.map((r, i) => `<button type="button" data-i="${i}">${r.name}${r.admin1 ? ", " + r.admin1 : ""} · ${r.country_code || ""}</button>`).join("") : `<button type="button" disabled>No match</button>`;
      res.classList.add("open");
      res.onclick = (ev) => { const b = ev.target.closest("button[data-i]"); if (!b) return; const r = list[+b.dataset.i]; res.classList.remove("open"); run({ name: r.name, lat: r.latitude, lon: r.longitude }); };
    });
    $("#wLoc").addEventListener("click", () => navigator.geolocation && navigator.geolocation.getCurrentPosition((p) => run({ name: "Your location", lat: p.coords.latitude, lon: p.coords.longitude }), () => { $("#wLoc").textContent = "◎ LOCATION UNAVAILABLE"; }));
    const end = new Date(), st = new Date(end - 7 * 864e5);
    const f = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    $("#wRange").textContent = `${f(st)} → ${f(end)} ${end.getUTCFullYear()} UTC`;
  }
  let started = false;
  function startDefault() { if (started) return; started = true; const b = document.querySelector('#wPresets .chip'); if (b) b.click(); }
  return { wire, run, startDefault, getTLE, getQuakes, getEonet, subPoint, km };
})();
