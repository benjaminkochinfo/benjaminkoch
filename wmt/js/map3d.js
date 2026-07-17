/**
 * Hybrid 3D globe — MapLibre GL + Esri basemaps (no MapTiler)
 * Modes: hybrid (sat+labels+roads), satellite, streets, terrain, dark
 * Falls back to SVG equirectangular if MapLibre unavailable
 */

const Map3D = (() => {
  let map = null;
  let ready = false;
  let mode = "none"; // globe | svg | none
  let basemap = "hybrid";
  let markersData = [];
  let onSelect = null;
  let containerEl = null;
  let spinning = false;
  let spinTimer = null;
  let showShipping = true;
  let tankerTimer = null;

  const TILES = {
    // Esri World Imagery — public tile endpoints (no API key)
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labels: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    roads: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
    streets: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    terrain: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    dark: "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  };

  const BASEMAPS = [
    { id: "hybrid", label: "HYBRID", tip: "Esri satellite + borders + roads" },
    { id: "satellite", label: "SPACE", tip: "Esri World Imagery — space view" },
    { id: "streets", label: "STREETS", tip: "OpenStreetMap roads" },
    { id: "terrain", label: "TERRAIN", tip: "Esri World Topo" },
    { id: "dark", label: "DARK", tip: "Dark canvas for night ops" },
  ];

  function available() {
    return typeof maplibregl !== "undefined";
  }

  function buildStyle(kind) {
    const sources = {};
    const layers = [];

    if (kind === "hybrid" || kind === "satellite") {
      sources.satellite = {
        type: "raster",
        tiles: [TILES.satellite],
        tileSize: 256,
        attribution: "Esri World Imagery",
        maxzoom: 19,
      };
      layers.push({
        id: "satellite",
        type: "raster",
        source: "satellite",
        minzoom: 0,
        maxzoom: 22,
        paint: {
          "raster-opacity": 1,
          "raster-contrast": kind === "satellite" ? 0.14 : 0.08,
          "raster-saturation": kind === "satellite" ? 0.18 : 0.1,
          "raster-brightness-min": 0,
          "raster-brightness-max": 0.95,
        },
      });
      if (kind === "hybrid") {
        sources.roads = {
          type: "raster",
          tiles: [TILES.roads],
          tileSize: 256,
          attribution: "Esri Transportation",
          maxzoom: 16,
        };
        sources.labels = {
          type: "raster",
          tiles: [TILES.labels],
          tileSize: 256,
          attribution: "Esri Boundaries",
          maxzoom: 16,
        };
        layers.push({
          id: "roads",
          type: "raster",
          source: "roads",
          minzoom: 3,
          maxzoom: 22,
          paint: { "raster-opacity": 0.45 },
        });
        layers.push({
          id: "labels",
          type: "raster",
          source: "labels",
          minzoom: 1,
          maxzoom: 22,
          paint: { "raster-opacity": 0.9 },
        });
      }
    } else if (kind === "streets") {
      sources.streets = {
        type: "raster",
        tiles: [TILES.streets],
        tileSize: 256,
        attribution: "© OpenStreetMap",
        maxzoom: 19,
      };
      layers.push({ id: "streets", type: "raster", source: "streets", minzoom: 0, maxzoom: 22 });
    } else if (kind === "terrain") {
      sources.terrain = {
        type: "raster",
        tiles: [TILES.terrain],
        tileSize: 256,
        attribution: "Esri World Topo",
        maxzoom: 19,
      };
      layers.push({ id: "terrain", type: "raster", source: "terrain", minzoom: 0, maxzoom: 22 });
    } else {
      sources.dark = {
        type: "raster",
        tiles: [TILES.dark],
        tileSize: 256,
        attribution: "© CARTO · OSM",
        maxzoom: 19,
      };
      layers.push({ id: "dark", type: "raster", source: "dark", minzoom: 0, maxzoom: 22 });
    }

    return {
      version: 8,
      sources,
      layers,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    };
  }

  function badgeText() {
    const b = BASEMAPS.find((x) => x.id === basemap);
    const ship = showShipping ? " · LANES" : "";
    return `${(b?.label || basemap).toUpperCase()} · ESRI${ship}`;
  }

  function applyGlobeAndAtmosphere() {
    if (!map) return;
    try {
      if (map.setProjection) map.setProjection({ type: "globe" });
    } catch {
      /* older MapLibre */
    }
    applyFog();
    try {
      if (map.setLight) {
        map.setLight({
          anchor: "viewport",
          color: "#fff8f0",
          intensity: 0.45,
          position: [1.4, 200, 40],
        });
      }
    } catch {
      /* */
    }
  }

  function afterStyleReady(preserveView) {
    applyGlobeAndAtmosphere();
    ready = true;
    ensureMarkerSource();
    setMarkers(markersData);
    ensureShippingLayers();
    if (preserveView) {
      try {
        map.jumpTo(preserveView);
      } catch {
        /* */
      }
    }
    if (containerEl) {
      const badge = containerEl.querySelector("#mapBadge");
      if (badge) badge.textContent = badgeText();
    }
  }

  function rebuildControls(el) {
    let ctrl = el.querySelector(".map3d-ctrl");
    if (!ctrl) {
      ctrl = document.createElement("div");
      ctrl.className = "map3d-ctrl";
      el.appendChild(ctrl);
    }
    ctrl.innerHTML = `
      <button type="button" data-act="reset" title="Reset view">⌂</button>
      <button type="button" data-act="spin" title="Toggle spin" class="${spinning ? "active" : ""}">⟳</button>
      <button type="button" data-act="pitch" title="Tilt 3D / flat">3D</button>
      <button type="button" data-act="shipping" title="Shipping / tanker lanes" class="${showShipping ? "active" : ""}">🚢</button>
      <div class="map-basemap-switch" role="group" aria-label="Basemap mode">
        ${BASEMAPS.map(
          (b) =>
            `<button type="button" data-basemap="${b.id}" class="${b.id === basemap ? "active" : ""}" title="${b.tip}">${b.label}</button>`
        ).join("")}
      </div>
      <span class="map3d-badge" id="mapBadge">${badgeText()}</span>`;
  }

  function applyFog() {
    if (!map) return;
    try {
      const space = basemap === "hybrid" || basemap === "satellite";
      map.setFog({
        color: space ? "rgb(186, 214, 240)" : "rgb(8,10,16)",
        "high-color": space ? "rgb(100, 150, 210)" : "rgb(20,30,50)",
        "horizon-blend": space ? 0.022 : 0.08,
        "space-color": "rgb(2, 4, 12)",
        "star-intensity": space ? 0.48 : basemap === "dark" ? 0.75 : 0.35,
      });
    } catch {
      /* ignore */
    }
  }

  function routeColor(status, kind) {
    if (status === "elevated") return "#ff6b1a";
    if (status === "watch") return "#f5a623";
    if (kind === "tanker") return "#4fc3f7";
    return "#69f0ae";
  }

  function shippingGeoJSON() {
    const routes = typeof SHIPPING_ROUTES !== "undefined" ? SHIPPING_ROUTES : [];
    const trackers = typeof TANKER_TRACKERS !== "undefined" ? TANKER_TRACKERS : [];
    const lineFeatures = routes.map((r) => ({
      type: "Feature",
      properties: {
        id: r.id,
        name: r.name,
        kind: r.kind || "shipping",
        status: r.status || "normal",
        delayH: r.delayH || 0,
        color: routeColor(r.status, r.kind),
      },
      geometry: {
        type: "LineString",
        coordinates: (r.coords || []).map((c) => [c[0], c[1]]),
      },
    }));
    const byId = Object.fromEntries(routes.map((r) => [r.id, r]));
    const pointFeatures = trackers
      .map((t) => {
        const route = byId[t.route];
        if (!route?.coords?.length) return null;
        const coords = route.coords;
        const p = Math.max(0, Math.min(0.999, Number(t.progress) || 0));
        const idx = p * (coords.length - 1);
        const i0 = Math.floor(idx);
        const i1 = Math.min(coords.length - 1, i0 + 1);
        const f = idx - i0;
        const lon = coords[i0][0] + (coords[i1][0] - coords[i0][0]) * f;
        const lat = coords[i0][1] + (coords[i1][1] - coords[i0][1]) * f;
        const delayed = (t.status || "").includes("delay") || (t.delayH || 0) >= 12;
        return {
          type: "Feature",
          properties: {
            id: t.id,
            title: t.name,
            layer: "shipping",
            sev: delayed ? "high" : t.status === "elevated" ? "elevated" : "info",
            color: delayed ? "#ff5252" : t.cargo === "crude" ? "#ffab00" : "#4fc3f7",
            source: "lane model",
            desc: `${t.cargo || "cargo"} · ${t.status || "track"} · delay ~${t.delayH || 0}h · illustrative (not live AIS)`,
            time: delayed ? `+${t.delayH || 0}h` : "on route",
            delayH: t.delayH || 0,
            cargo: t.cargo || "",
          },
          geometry: { type: "Point", coordinates: [lon, lat] },
        };
      })
      .filter(Boolean);
    // Chokepoint nodes as secondary markers
    const nodes = typeof TRANSPORT_NODES !== "undefined" ? TRANSPORT_NODES : [];
    nodes.forEach((n) => {
      pointFeatures.push({
        type: "Feature",
        properties: {
          id: n.id,
          title: n.name,
          layer: "chokepoint",
          sev: n.status === "elevated" ? "high" : n.status === "watch" ? "elevated" : "info",
          color: n.status === "elevated" ? "#ff6b1a" : "#80d8ff",
          source: "chokepoint",
          desc: n.note || n.type || "Shipping node",
          time: n.status || "watch",
        },
        geometry: { type: "Point", coordinates: [n.lon, n.lat] },
      });
    });
    return {
      lines: { type: "FeatureCollection", features: lineFeatures },
      points: { type: "FeatureCollection", features: pointFeatures },
    };
  }

  function ensureShippingLayers() {
    if (!map || !ready) return;
    const data = shippingGeoJSON();
    if (!map.getSource("shipping-lanes")) {
      map.addSource("shipping-lanes", { type: "geojson", data: data.lines });
      map.addSource("shipping-vessels", { type: "geojson", data: data.points });
      // Glow underlay
      map.addLayer({
        id: "shipping-lanes-glow",
        type: "line",
        source: "shipping-lanes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 6,
          "line-opacity": 0.22,
          "line-blur": 1.2,
        },
      });
      map.addLayer({
        id: "shipping-lanes-main",
        type: "line",
        source: "shipping-lanes",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": [
            "match",
            ["get", "kind"],
            "tanker",
            2.6,
            1.9,
          ],
          "line-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "shipping-vessels-pulse",
        type: "circle",
        source: "shipping-vessels",
        paint: {
          "circle-radius": 11,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.25,
          "circle-blur": 0.5,
        },
      });
      map.addLayer({
        id: "shipping-vessels",
        type: "circle",
        source: "shipping-vessels",
        paint: {
          "circle-radius": [
            "match",
            ["get", "layer"],
            "chokepoint",
            5.5,
            4.5,
          ],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 1.4,
          "circle-stroke-color": "rgba(255,255,255,0.55)",
          "circle-opacity": 0.95,
        },
      });
      map.on("click", "shipping-vessels", (e) => {
        const f = e.features?.[0];
        if (f && onSelect) onSelect(f.properties);
      });
      map.on("click", "shipping-lanes-main", (e) => {
        const f = e.features?.[0];
        if (!f || !onSelect) return;
        const p = f.properties || {};
        onSelect({
          title: p.name || "Sea lane",
          layer: "shipping",
          sev: p.status === "elevated" ? "high" : "elevated",
          source: "lane model",
          desc: `${p.kind || "shipping"} · status ${p.status || "—"} · model delay ~${p.delayH || 0}h (illustrative, not live AIS)`,
          time: "lane",
          color: p.color,
        });
      });
      ["shipping-vessels", "shipping-lanes-main"].forEach((id) => {
        map.on("mouseenter", id, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", id, () => {
          map.getCanvas().style.cursor = "";
        });
      });
    } else {
      map.getSource("shipping-lanes")?.setData(data.lines);
      map.getSource("shipping-vessels")?.setData(data.points);
    }
    setShippingVisible(showShipping);
  }

  function setShippingVisible(on) {
    showShipping = !!on;
    if (!map) return;
    const vis = showShipping ? "visible" : "none";
    ["shipping-lanes-glow", "shipping-lanes-main", "shipping-vessels-pulse", "shipping-vessels"].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    });
    if (containerEl) {
      const badge = containerEl.querySelector("#mapBadge");
      if (badge) badge.textContent = badgeText();
      containerEl.querySelector('[data-act="shipping"]')?.classList.toggle("active", showShipping);
    }
  }

  function advanceTankers() {
    if (typeof TANKER_TRACKERS === "undefined" || !TANKER_TRACKERS.length) return;
    TANKER_TRACKERS.forEach((t) => {
      const step = t.status === "delayed" || t.status === "reroute" ? 0.004 : 0.01;
      t.progress = ((Number(t.progress) || 0) + step) % 1;
    });
    if (map && ready && showShipping && map.getSource("shipping-vessels")) {
      const data = shippingGeoJSON();
      map.getSource("shipping-vessels").setData(data.points);
    }
  }

  function setBasemap(kind) {
    if (!BASEMAPS.find((b) => b.id === kind)) return;
    basemap = kind;
    try {
      Storage.set("map_basemap", basemap);
    } catch {
      /* */
    }
    if (map && ready) {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const pitch = map.getPitch();
      const bearing = map.getBearing();
      const view = { center, zoom, pitch, bearing };
      map.once("style.load", () => afterStyleReady(view));
      map.setStyle(buildStyle(basemap));
    }
    if (containerEl) {
      const badge = containerEl.querySelector("#mapBadge");
      if (badge) badge.textContent = badgeText();
      containerEl.querySelectorAll("[data-basemap]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.basemap === basemap);
      });
    }
  }

  function init(container, opts = {}) {
    onSelect = opts.onSelect || null;
    const el = typeof container === "string" ? document.getElementById(container) : container;
    if (!el) return false;
    containerEl = el;

    const saved = Storage.get("map_basemap");
    if (saved && BASEMAPS.find((b) => b.id === saved)) basemap = saved;
    else basemap = "hybrid";

    if (!available()) {
      mode = "svg";
      renderSvgFallback(el);
      return false;
    }

    el.innerHTML = "";
    const mapDiv = document.createElement("div");
    mapDiv.id = "maplibre-root";
    mapDiv.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
    el.appendChild(mapDiv);
    rebuildControls(el);

    const start = {
      center: [20, 12],
      zoom: 1.55,
      pitch: 48,
      bearing: -18,
    };

    try {
      map = new maplibregl.Map({
        container: mapDiv,
        style: buildStyle(basemap),
        center: start.center,
        zoom: start.zoom,
        pitch: start.pitch,
        bearing: start.bearing,
        maxPitch: 78,
        attributionControl: true,
        antialias: true,
        fadeDuration: 320,
      });

      map.on("style.load", () => {
        applyGlobeAndAtmosphere();
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), "bottom-left");

      map.on("load", () => {
        ready = true;
        mode = "globe";
        applyGlobeAndAtmosphere();
        ensureMarkerSource();
        setMarkers(markersData);
        ensureShippingLayers();
        if (tankerTimer) clearInterval(tankerTimer);
        tankerTimer = setInterval(advanceTankers, 8000);
        if (containerEl) {
          const badge = containerEl.querySelector("#mapBadge");
          if (badge) badge.textContent = badgeText();
        }
      });

      const spin = () => {
        if (!spinning || !map) return;
        const c = map.getCenter();
        map.easeTo({ center: [c.lng + 0.12, c.lat], duration: 1000, easing: (n) => n });
        spinTimer = setTimeout(spin, 1000);
      };

      el.querySelector(".map3d-ctrl")?.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn || !map) return;
        if (btn.dataset.basemap) {
          setBasemap(btn.dataset.basemap);
          return;
        }
        if (btn.dataset.act === "reset") {
          map.flyTo({
            center: start.center,
            zoom: start.zoom,
            pitch: start.pitch,
            bearing: start.bearing,
            essential: true,
          });
        }
        if (btn.dataset.act === "spin") {
          spinning = !spinning;
          btn.classList.toggle("active", spinning);
          if (spinning) spin();
          else clearTimeout(spinTimer);
        }
        if (btn.dataset.act === "pitch") {
          const p = map.getPitch() > 30 ? 0 : 55;
          map.easeTo({ pitch: p, duration: 700 });
        }
        if (btn.dataset.act === "shipping") {
          setShippingVisible(!showShipping);
        }
      });

      return true;
    } catch (err) {
      console.warn("MapLibre init failed", err);
      mode = "svg";
      renderSvgFallback(el);
      return false;
    }
  }

  function ensureMarkerSource() {
    if (!map || !ready) return;
    if (!map.getSource("intel")) {
      map.addSource("intel", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "intel-pulse",
        type: "circle",
        source: "intel",
        filter: [
          "any",
          ["==", ["get", "sev"], "critical"],
          ["==", ["get", "sev"], "crit"],
          ["==", ["get", "sev"], "high"],
        ],
        paint: {
          "circle-radius": 14,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.22,
          "circle-blur": 0.6,
        },
      });
      map.addLayer({
        id: "intel-circles",
        type: "circle",
        source: "intel",
        paint: {
          "circle-radius": [
            "match",
            ["get", "sev"],
            "critical",
            7,
            "crit",
            7,
            "high",
            6,
            "elevated",
            5,
            4,
          ],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(255,255,255,0.35)",
          "circle-opacity": 0.94,
        },
      });
      map.on("click", "intel-circles", (e) => {
        const f = e.features?.[0];
        if (f && onSelect) onSelect(f.properties);
      });
      map.on("mouseenter", "intel-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "intel-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    }
  }

  function setMarkers(list) {
    markersData = list || [];
    if (mode === "globe" && map && ready) {
      ensureMarkerSource();
      const features = markersData.map((m) => ({
        type: "Feature",
        properties: {
          id: m.id,
          title: m.title,
          layer: m.layer,
          sev: m.sev,
          color: m.color || colorFor(m),
          source: m.source || "",
          desc: m.desc || "",
          time: m.time || "",
          link: m.link || "",
        },
        geometry: { type: "Point", coordinates: [m.lon, m.lat] },
      }));
      const src = map.getSource("intel");
      if (src) src.setData({ type: "FeatureCollection", features });
    } else if (mode === "svg") {
      drawSvgMarkers();
    }
  }

  function colorFor(m) {
    if (m.color) return m.color;
    if (m.layer === "bases") return "#4a9eff";
    if (m.layer === "nuclear") return "#ffd60a";
    if (m.layer === "agriculture") return "#aed581";
    if (m.layer === "insurance") return "#ce93d8";
    if (m.layer === "disasters" || m.live) return "#80cbc4";
    const sev = m.sev;
    if (sev === "critical" || sev === "crit") return "#ff3b30";
    if (sev === "high") return "#ff6b1a";
    if (sev === "elevated" || sev === "med") return "#f5a623";
    if (sev === "watch") return "#4a9eff";
    return "#8b93a7";
  }

  function flyTo(lon, lat, zoom = 4) {
    if (map && ready) {
      map.flyTo({ center: [lon, lat], zoom, essential: true, speed: 1.25, curve: 1.4, pitch: Math.min(map.getPitch() || 0, 40) });
    }
  }

  function resize() {
    if (map) map.resize();
  }

  function project(lon, lat) {
    return [((lon + 180) / 360) * 1000, ((90 - lat) / 180) * 500];
  }

  function renderSvgFallback(el) {
    el.innerHTML = `
      <div class="map-wrap svg-fallback">
        <svg id="worldMap" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet"></svg>
        <div class="map3d-badge">2D FALLBACK · load MapLibre for hybrid 3D</div>
        <div class="map-coords mono" id="mapCoords">LAT — · LON —</div>
      </div>`;
    const svg = el.querySelector("#worldMap");
    let html = `<rect class="map-ocean" width="1000" height="500"/>`;
    if (typeof WORLD_LAND !== "undefined") {
      WORLD_LAND.forEach((poly) => {
        const d =
          poly
            .map((p, i) => {
              const [x, y] = project(p[0], p[1]);
              return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(" ") + " Z";
        html += `<path class="map-land" d="${d}"/>`;
      });
    }
    html += `<g id="markerLayer"></g>`;
    svg.innerHTML = html;
    ready = true;
    mode = "svg";
    drawSvgMarkers();
  }

  function drawSvgMarkers() {
    const g = document.getElementById("markerLayer");
    if (!g) return;
    g.innerHTML = markersData
      .map((m) => {
        const [x, y] = project(m.lon, m.lat);
        const c = colorFor(m);
        return `<circle class="marker" data-id="${m.id}" cx="${x}" cy="${y}" r="4.5" fill="${c}" style="cursor:pointer"/>`;
      })
      .join("");
    g.querySelectorAll(".marker").forEach((node) => {
      node.addEventListener("click", () => {
        const m = markersData.find((x) => x.id === node.dataset.id);
        if (m && onSelect) onSelect(m);
      });
    });
  }

  function getMode() {
    return mode;
  }
  function getBasemap() {
    return basemap;
  }

  function destroy() {
    clearTimeout(spinTimer);
    clearInterval(tankerTimer);
    spinning = false;
    if (map) {
      try {
        map.remove();
      } catch {
        /* */
      }
      map = null;
    }
    ready = false;
    mode = "none";
    containerEl = null;
  }

  return {
    init,
    setMarkers,
    flyTo,
    resize,
    getMode,
    getBasemap,
    setBasemap,
    setShippingVisible,
    getShippingVisible: () => showShipping,
    destroy,
    available,
    BASEMAPS,
  };
})();
