/* WMT landing: orchestration, content rendering, scroll choreography. */
(() => {
  const C = window.WMT_CONFIG, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DESKS = [["⌘","Command"],["✦","Answers"],["◎","Map"],["⚠","Crisis"],["☁","Weather"],["◈","Markets"],["▣","Commodities"],["◆","Metals"],["▣","Chips & Data"],["⌂","Affordability"],["⇄","Compare"],["%","Inflation"],["☘","Food"],["⬡","Traffic"],["⚡","Power · Net"],["◎","Impact"],["☰","News"],["Σ","Models"],["✶","Custom"]];
  const FACTOR_COLORS = { kinetic: "#ff3b30", riskTone: "#b388ff", energy: "#ff6b1a", food: "#00c853", insurance: "#4a9eff", newsCrisis: "#ffd60a", transport: "#00d4ff", hotspots: "#ff3b30", theaters: "#ff6b1a", weather: "#4a9eff", quakes: "#b87a12", velocity: "#ffd60a", chokepoints: "#00d4ff", riskOn: "#00c853", safeHaven: "#f5a623", alerts: "#ff3b30", outageHeat: "#ff6b1a", powerStress: "#ffd60a", telecomStress: "#b388ff" };
  const log = (t) => { const e = $("#bootLog"); if (e) e.textContent = t; };

  // terminal links
  $$("[data-terminal]").forEach((a) => { a.href = C.TERMINAL_URL; a.target = "_blank"; a.rel = "noopener"; });

  // stars
  (function stars() { const c = $("#stars"), x = c.getContext("2d"); const draw = () => { c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; x.clearRect(0, 0, c.width, c.height); for (let i = 0; i < 420; i++) { x.fillStyle = `rgba(232,234,237,${Math.random() * 0.5})`; const r = Math.random() * 1.1 * devicePixelRatio; x.fillRect(Math.random() * c.width, Math.random() * c.height, r, r); } }; draw(); addEventListener("resize", draw); })();

  // clock
  const tick = () => { const d = new Date(); $("#wireClock").textContent = d.toISOString().slice(11, 19); $("#wireDate").textContent = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }); };
  tick(); setInterval(tick, 1000);

  // menu
  const mb = $("#menuBtn"), menu = $("#menu");
  $("#menuDesks").innerHTML = DESKS.map(([i, t]) => `<li><i>${i}</i>${t}</li>`).join("");
  const setMenu = (o) => { menu.classList.toggle("open", o); mb.setAttribute("aria-expanded", o); menu.setAttribute("aria-hidden", !o); };
  mb.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
  $$(".menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  // smooth scroll
  let lenis = null;
  if (window.Lenis && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    if (window.gsap) { gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); } else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => { const id = a.getAttribute("href"); if (!id || id[0] !== "#" || id.length < 2) return; const t = $(id); if (!t) return; e.preventDefault(); lenis ? lenis.scrollTo(t, { offset: id === "#top" ? 0 : -60 }) : t.scrollIntoView({ behavior: "smooth" }); }));

  const getJSON = (u) => fetch(u).then((r) => r.json());

  async function boot() {
    log("LOADING CONTENT…");
    const [content, models, seeds, countries] = await Promise.all([getJSON(C.CONTENT_URL), getJSON(C.MODELS_URL), getJSON(C.SEEDS_URL), getJSON(C.COUNTRIES_URL).catch(() => null)]);
    log("INITIALISING GLOBE…");
    try { await WMTGlobe.init(seeds, countries); } catch (e) { console.warn("globe", e); }
    renderHero(content); renderModels(models.models); renderBriefs(content); renderElections(content.elections); renderWeek(content);
    WMTWatched.wire();
    log("CONNECTING LIVE SOURCES…");
    liveWire();
    setTimeout(() => $("#boot").classList.add("done"), 700);
    choreograph(seeds);
  }

  function renderHero(c) {
    const h = c.headline || {};
    $("#heroKicker").textContent = h.kicker || "";
    $("#heroSub").textContent = h.sub || "";
  }

  function mixBar(w) {
    const t = Object.values(w).reduce((a, b) => a + b, 0) || 1;
    return `<div class="mix">${Object.entries(w).map(([k, v]) => `<i style="flex:${v};background:${FACTOR_COLORS[k] || "#9aa3b5"}" title="${k} ${Math.round((v / t) * 100)}%"></i>`).join("")}</div><div class="mix-l">${Object.entries(w).map(([k, v]) => `${k} ${Math.round((v / t) * 100)}%`).join(" · ")}</div>`;
  }
  function renderModels(list) {
    const k = list.find((m) => m.id === "kmri");
    $("#kmriDesc").textContent = k.desc + " " + (k.summary || "");
    const tot = Object.values(k.weights).reduce((a, b) => a + b, 0);
    $("#kmriWeights").innerHTML = Object.entries(k.weights).sort((a, b) => b[1] - a[1]).map(([f, v]) => `<li><span>${f}</span><div class="bar"><i data-w="${(v / tot) * 100 * 3}" style="background:${FACTOR_COLORS[f]}"></i></div><b>w${v}</b></li>`).join("");
    $("#kmriDial .dial-c b").textContent = Object.keys(k.weights).length;
    $("#modelGrid").innerHTML = list.filter((m) => m.id !== "kmri").map((m) => `<article class="model"><span class="tag">${m.bipolar ? "BIPOLAR ±100" : "0–100"}</span><div class="model-name">${esc(m.name)}</div><div class="model-label">${esc(m.label)}</div><p>${esc(m.summary || m.desc)}</p>${mixBar(m.weights)}</article>`).join("");
  }

  const pct = (lat, lon) => ({ x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 });
  function miniMap() { // tiny graticule
    let s = '<svg viewBox="0 0 360 180" preserveAspectRatio="none">';
    for (let x = 0; x <= 360; x += 30) s += `<line x1="${x}" y1="0" x2="${x}" y2="180" stroke="rgba(232,234,237,.06)"/>`;
    for (let y = 0; y <= 180; y += 30) s += `<line x1="0" y1="${y}" x2="360" y2="${y}" stroke="rgba(232,234,237,.06)"/>`;
    return s + "</svg>";
  }
  function renderBriefs(c) {
    $("#briefEdition").innerHTML = `${esc(c.edition.label)} ${c.edition.status === "sample" ? '<span class="sample">SAMPLE EDITION</span>' : ""}<br/>Briefs are written weekly and link each claim to the models that moved.`;
    $("#briefTrack").innerHTML = c.briefs.map((b) => { const p = pct(b.lat, b.lon); const zx = Math.min(85, Math.max(15, p.x)), zy = Math.min(80, Math.max(20, p.y)); return `<a class="brief" href="landing/brief.html?id=${encodeURIComponent(b.slug || b.id)}" aria-label="Read sample brief: ${esc(b.title)}"><div class="brief-map" style="--x:50%;--y:50%;--bx:${((9 * p.x / 100 - 0.5) / 8) * 100}%;--by:${((0.5 - 10.42 * p.y / 100) / (1 - 10.42)) * 100}%">${miniMap()}<span class="ping"></span><span class="coords">${b.lat.toFixed(1)}°, ${b.lon.toFixed(1)}° · ${esc(b.region)}</span></div><div class="brief-body"><div class="brief-meta"><span>${esc(b.date)} · ${esc(b.read)}</span>${b.status === "sample" ? '<span class="sample">SAMPLE</span>' : ""}</div><h3>${esc(b.title)}</h3><p>${esc(b.dek)}</p><div class="chips">${b.models.map((m) => `<span class="chip m">${esc(m)}</span>`).join("")}</div></div></a>`; }).join("");
  }

  const DAY = 864e5;
  const daysTo = (iso) => Math.ceil((Date.parse(iso + "T00:00:00Z") - Date.now()) / DAY);
  function renderElections(list) {
    const up = list.filter((e) => daysTo(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date));
    $("#elecList").innerHTML = up.map((e) => { const d = daysTo(e.date); return `<div class="elec ${d <= 21 ? "soon" : ""}"><div class="days">${d}<small>DAYS</small></div><div><div class="c">${esc(e.country)}</div><div class="t">${esc(e.type)}${e.watch ? " · " + esc(e.watch) : ""}</div></div><div class="d">${new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}<span>${esc(e.iso)}</span></div></div>`; }).join("") ;
    $("#elecList").insertAdjacentHTML("afterend", `<p class="elec-src">Sources per row in data/content.json (IFES ElectionGuide, NDI, worldelect.online, StanfordVotes). Where calendars disagree the row is flagged; confirm with the national electoral body before publication.</p>`);
    const span = 180, tl = $("#elecTimeline"); let h = `<div class="now" style="left:0"></div>`;
    for (let m = 0; m < 7; m++) { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + m + 1); const off = (d - Date.now()) / DAY; if (off < span) h += `<div class="tick" style="left:${(off / span) * 100}%">${d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}</div>`; }
    up.filter((e) => daysTo(e.date) <= span).forEach((e) => { h += `<div class="pin ${daysTo(e.date) <= 21 ? "soon" : ""}" style="left:${(daysTo(e.date) / span) * 100}%" title="${esc(e.country)} · ${esc(e.date)}"></div>`; });
    tl.innerHTML = h;
    window.__elections = up;
  }

  function renderWeek(c) {
    const now = new Date(); const dow = (now.getUTCDay() + 6) % 7; const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow));
    const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    $("#weekGrid").innerHTML = names.map((n, i) => { const d = new Date(mon.getTime() + i * DAY); const iso = d.toISOString().slice(0, 10); const ed = (c.thisWeek || []).filter((x) => (x.date ? x.date === iso : x.day === n)).map((x) => `<div class="ev"><i>${esc(x.tag)}${x.status === "sample" ? " · SAMPLE" : ""}</i>${esc(x.text)}${x.region || (x.models && x.models.length) ? `<span class="ev-meta">${esc(x.region || "")}${x.models && x.models.length ? " · " + x.models.map(esc).join(" ") : ""}</span>` : ""}${x.source && /^https:\/\//.test(x.source.url) ? `<a class="ev-src" href="${esc(x.source.url)}" target="_blank" rel="noopener">SRC · ${esc(x.source.name)} ↗</a>` : ""}</div>`).join(""); const el = (c.elections || []).filter((e) => e.date === iso).map((e) => `<div class="ev elec"><i>ELECTION</i>${esc(e.country)} · ${esc(e.type)}</div>`).join(""); return `<div class="day ${i === dow ? "today" : ""}" data-iso="${iso}"><div class="day-h"><b>${n.toUpperCase()}</b><span>${d.getUTCDate()}</span></div>${el}${ed}<div class="live-slot"></div></div>`; }).join("");
  }

  async function liveWire() {
    const items = [];
    const [q, ev, cg, fx] = await Promise.all([
      WMTWatched.getQuakes(), WMTWatched.getEonet(),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true").then((r) => r.json()).catch(() => null),
      fetch("https://open.er-api.com/v6/latest/USD").then((r) => r.json()).catch(() => null),
    ]);
    const dir = (v) => (v >= 0 ? `<span class="up">▲ ${v.toFixed(2)}%</span>` : `<span class="dn">▼ ${Math.abs(v).toFixed(2)}%</span>`);
    if (cg && cg.bitcoin) items.push(`BTC <b>${Math.round(cg.bitcoin.usd).toLocaleString("en-US")}</b> ${dir(cg.bitcoin.usd_24h_change || 0)} <span class="src">COINGECKO</span>`);
    if (cg && cg.ethereum) items.push(`ETH <b>${Math.round(cg.ethereum.usd).toLocaleString("en-US")}</b> ${dir(cg.ethereum.usd_24h_change || 0)}`);
    if (fx && fx.rates) { items.push(`EUR/USD <b>${(1 / fx.rates.EUR).toFixed(4)}</b> <span class="src">ER-API</span>`); items.push(`USD/JPY <b>${fx.rates.JPY.toFixed(2)}</b>`); }
    const big = q.filter((f) => f.properties.mag >= 4.5);
    const mx = q.reduce((m, f) => (f.properties.mag > (m?.properties.mag || 0) ? f : m), null);
    items.push(`QUAKES M2.5+ 7D <b>${q.length}</b> · M4.5+ <b>${big.length}</b> <span class="src">USGS</span>`);
    if (mx) items.push(`LARGEST <b>M${mx.properties.mag.toFixed(1)}</b> ${esc(mx.properties.place)}`);
    items.push(`OPEN NATURAL EVENTS <b>${ev.length}</b> <span class="src">NASA EONET</span>`);
    const next = (window.__elections || [])[0]; if (next) items.push(`NEXT VOTE <b>${esc(next.country)}</b> in ${daysTo(next.date)}d`);
    try { const sats = await WMTWatched.getTLE(); const iss = sats.find((s) => /ISS/.test(s.name)); if (iss) { const sp = WMTWatched.subPoint(iss.rec, new Date()); if (sp) items.push(`ISS <b>${sp[0].toFixed(1)}°, ${sp[1].toFixed(1)}°</b> · ${Math.round(sp[2])} km <span class="src">CELESTRAK</span>`); } } catch (e) {}
    const html = items.map((s) => `<span>${s}</span>`).join("");
    $("#wireRoll").innerHTML = html + html;
    // this week live counters
    $("#weekLive").innerHTML = `<div><b>${q.length}</b><span>Quakes M2.5+ · 7d</span></div><div><b>${big.length}</b><span>M4.5+</span></div><div><b>${ev.length}</b><span>Open EONET events</span></div>`;
    $$("#weekGrid .day").forEach((d) => { const iso = d.dataset.iso; const n = big.filter((f) => new Date(f.properties.time).toISOString().slice(0, 10) === iso); const e = ev.filter((x) => (x.geometry || []).slice(-1)[0]?.date?.slice(0, 10) === iso); let h = ""; if (n.length) h += `<div class="ev live quake"><i>LIVE · USGS</i>${n.length} quake${n.length > 1 ? "s" : ""} M4.5+, max M${Math.max(...n.map((f) => f.properties.mag)).toFixed(1)}</div>`; if (e.length) h += `<div class="ev live"><i>LIVE · EONET</i>${e.length} event update${e.length > 1 ? "s" : ""}: ${esc(e[0].title)}</div>`; d.querySelector(".live-slot").innerHTML = h; });
  }

  function choreograph(seeds) {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) lenis.on("scroll", ScrollTrigger.update);
    const mm = gsap.matchMedia();
    // hero intro
    gsap.from(".h-hero .line", { yPercent: 110, opacity: 0, duration: 1.1, stagger: 0.12, ease: "power4.out", delay: 0.6 });
    gsap.from([".hero .kicker", ".lede", ".hero-cta", ".hero-stats", ".hero-pillars"], { y: 24, opacity: 0, duration: 0.9, stagger: 0.1, delay: 0.9, ease: "power3.out" });
    $$("[data-count]").forEach((e) => { const o = { v: 0 }; gsap.to(o, { v: +e.dataset.count, duration: 2, delay: 1.1, ease: "power2.out", onUpdate: () => (e.textContent = Math.round(o.v) + (e.dataset.suffix || "")) }); });
    // hotspot HUD cycle
    const hs = [...seeds.hotspots].sort((a, b) => b.score - a.score); let hi = 0;
    const cyc = () => { const h = hs[hi++ % hs.length]; $("#hudHot").textContent = `SEED HEAT · ${h.name.toUpperCase()} · ${h.score} (${h.delta >= 0 ? "+" : ""}${h.delta})`; };
    cyc(); setInterval(cyc, 2600);

    const G = $("#globe");
    mm.add("(min-width: 821px)", () => {
      gsap.set(G, { x: "19vw" });
      // narrative pin
      const steps = $$(".step"); let cur = -1;
      ScrollTrigger.create({ trigger: ".signal", start: "top top", end: "+=300%", pin: ".signal-pin", scrub: true,
        onUpdate: (st) => { const i = Math.min(steps.length - 1, Math.floor(st.progress * steps.length)); $("#mSig").textContent = Math.round(st.progress * 4200); $("#mMod").textContent = Math.min(15, Math.round(st.progress * 22)); $("#mBrf").textContent = Math.round(st.progress * 4); $("#mBar").style.width = st.progress * 100 + "%"; if (i !== cur) { cur = i; steps.forEach((s, k) => s.classList.toggle("is-on", k === i)); const d = steps[i].dataset; WMTGlobe.rotate(i === 3); WMTGlobe.flyTo(+d.lat, +d.lng, +d.alt, 1400); } },
        onLeaveBack: () => { WMTGlobe.rotate(true); WMTGlobe.flyTo(22, 30, 2.5, 1200); cur = -1; } });
      gsap.to(G, { x: "14vw", ease: "none", scrollTrigger: { trigger: ".signal", start: "top bottom", end: "top top", scrub: true } });
      // horizontal briefs
      const track = $("#briefTrack");
      const dist = () => Math.max(0, track.scrollWidth - innerWidth + 80);
      gsap.to(track, { x: () => -dist(), ease: "none", scrollTrigger: { trigger: ".briefs", start: "top top", end: () => "+=" + dist(), pin: ".briefs-pin", scrub: 1, invalidateOnRefresh: true } });
      gsap.fromTo(G, { x: "14vw" }, { x: "4vw", immediateRender: false, scrollTrigger: { trigger: ".watched", start: "top bottom", end: "top top", scrub: true } });
    });
    // globe visibility: hero + signal, then watched
    const layer = $("#globeLayer");
    ScrollTrigger.create({ trigger: ".statement", start: "top 60%", end: "top 10%", scrub: true, onUpdate: (s) => (layer.style.opacity = 1 - s.progress) });
    ScrollTrigger.create({ trigger: ".watched", start: "top 85%", end: "top 20%", scrub: true, onUpdate: (s) => (layer.style.opacity = s.progress), onEnter: () => WMTWatched.startDefault() });
    ScrollTrigger.create({ trigger: ".watched", start: "top 60%", end: "bottom 40%", toggleClass: { targets: document.body, className: "in-watched" } });
    ScrollTrigger.create({ trigger: ".reports", start: "top 90%", end: "top 40%", scrub: true, onUpdate: (s) => (layer.style.opacity = 1 - s.progress) });
    // statement words
    const q = $(".reveal-words"); q.innerHTML = q.textContent.split(" ").map((w) => `<span class="w">${w}</span>`).join(" ");
    gsap.to(".reveal-words .w", { opacity: 1, stagger: 0.05, ease: "none", scrollTrigger: { trigger: ".statement", start: "top 70%", end: "bottom 60%", scrub: true } });
    // section reveals
    $$(".sec-head, .model, .elec, .day, .tier, .audiences>div, .cover, .kmri").forEach((e) => gsap.from(e, { y: 40, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: e, start: "top 90%" } }));
    // KMRI dial + bars
    ScrollTrigger.create({ trigger: "#kmriCard", start: "top 75%", once: true, onEnter: () => { $("#dialFg").style.transition = "stroke-dasharray 1.8s cubic-bezier(.2,.7,.2,1)"; $("#dialFg").style.strokeDasharray = `${2 * Math.PI * 84 * 0.999} 600`; $$("#kmriWeights i").forEach((i) => (i.style.width = Math.min(100, +i.dataset.w) + "%")); } });
    gsap.from(".cta-shot", { rotateX: 40, y: 80, opacity: 0.3, ease: "none", scrollTrigger: { trigger: ".cta-shot", start: "top bottom", end: "top 30%", scrub: true } });
    // nav active
    ["models", "briefs", "elections", "week", "watched", "reports"].forEach((id) => ScrollTrigger.create({ trigger: "#" + id, start: "top 50%", end: "bottom 50%", onToggle: (s) => $$(`.nav-links a[href="#${id}"]`).forEach((a) => a.classList.toggle("on", s.isActive)) }));
    // mobile: simple step cycling by scroll
    mm.add("(max-width: 820px)", () => {
      $$(".step").forEach((s) => { s.style.position = "relative"; s.classList.add("is-on"); s.style.marginBottom = "40vh"; });
      $(".signal-steps").style.minHeight = "0";
      $$(".step").forEach((s) => ScrollTrigger.create({ trigger: s, start: "top 70%", onEnter: () => WMTGlobe.flyTo(+s.dataset.lat, +s.dataset.lng, +s.dataset.alt, 1200), onEnterBack: () => WMTGlobe.flyTo(+s.dataset.lat, +s.dataset.lng, +s.dataset.alt, 1200) }));
    });
    addEventListener("load", () => ScrollTrigger.refresh());
  }

  // commerce: prices, Stripe payment links, Brevo newsletter form (all configured in config.js)
  (function commerce() {
    const P = C.PRICING || {}, L = C.PAYMENT_LINKS || {}, N = C.NEWSLETTER || {}, portal = C.PORTAL_URL || "";
    $$("[data-price]").forEach((e) => { const p = P[e.dataset.price]; if (p) e.innerHTML = `${p.label} <small>${p.per}</small>`; });
    $$("[data-pay]").forEach((a) => { const t = a.dataset.pay, link = L[t];
      if (link) { a.href = link; a.target = "_blank"; a.rel = "noopener"; if (a.classList.contains("btn")) a.textContent = "Subscribe"; }
      else a.addEventListener("click", () => { const s = $("#subCadence"); if (s) { s.value = t; s.dispatchEvent(new Event("change")); } }); });
    if (portal) $$("[data-portal]").forEach((a) => { a.href = portal; a.target = "_blank"; a.rel = "noopener"; });
    const f = $("#subscribe"), cad = $("#subCadence"), cf = $("#subCadenceField"), note = $("#subNote");
    if (N.CADENCE_FIELD) { cf.name = N.CADENCE_FIELD; cad.addEventListener("change", () => (cf.value = cad.value)); } else cf.remove();
    const live = !!N.formAction;
    if (live) { f.action = N.formAction; note.textContent = "You will get a confirmation email (double opt-in)."; }
    f.addEventListener("submit", (e) => {
      const em = f.querySelector('input[type=email]');
      if (!em.checkValidity() || !$("#subConsent").checked) { e.preventDefault(); note.textContent = "Please enter a valid email and tick the consent box."; return; }
      if (!live) { e.preventDefault(); note.textContent = "Preview build: nothing was sent. Set NEWSLETTER.formAction in landing/js/config.js to connect Brevo."; }
    });
  })();
  boot().catch((e) => { console.error(e); $("#boot").classList.add("done"); });
})();
