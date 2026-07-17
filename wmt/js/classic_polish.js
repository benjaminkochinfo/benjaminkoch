/**
 * World Monitor classic shell polish (wm_terminal.html)
 * Search autosuggest · rail/stream collapse · HD helpers
 * Does not run on v2 (dash-v2).
 */
(() => {
  "use strict";
  if (document.body.classList.contains("dash-v2")) return;

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const RAIL_KEY = "wmt_rail_collapsed";
  const STREAM_KEY = "wmt_stream_mode";

  let suggestItems = [];
  let suggestIdx = -1;

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  /* ── Rail collapse ── */
  function setRailCollapsed(on) {
    document.body.classList.toggle("rail-collapsed", !!on);
    try {
      sessionStorage.setItem(RAIL_KEY, on ? "1" : "0");
    } catch {
      /* */
    }
    $$("#btnRailToggle, #btnRailToggle2").forEach((b) => {
      if (!b) return;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.title = on ? "Expand desks" : "Collapse desks";
      b.setAttribute("aria-label", b.title);
      b.textContent = on ? "›" : "‹";
    });
    queueMicrotask(() => {
      try {
        Map3D?.resize?.();
      } catch {
        /* */
      }
    });
  }

  function toggleRail() {
    setRailCollapsed(!document.body.classList.contains("rail-collapsed"));
  }

  /* ── Bottom stream modes ── */
  function setStreamMode(mode) {
    const m = mode === "compact" || mode === "hidden" || mode === "open" ? mode : "open";
    document.body.dataset.streamMode = m;
    const bar = $("#bottomBar");
    if (bar) bar.dataset.streamMode = m;
    try {
      sessionStorage.setItem(STREAM_KEY, m);
    } catch {
      /* */
    }
    $$(".stool").forEach((b) => b.classList.remove("active"));
    if (m === "open") $("#btnStreamOpen")?.classList.add("active");
    if (m === "compact") $("#btnStreamCompact")?.classList.add("active");
    if (m === "hidden") $("#btnStreamHide")?.classList.add("active");
    const topBtn = $("#btnStreamToggle");
    if (topBtn) {
      topBtn.setAttribute("aria-pressed", m === "hidden" ? "true" : "false");
      topBtn.textContent = m === "hidden" ? "▴" : "▾";
      topBtn.title = m === "hidden" ? "Expand stream" : "Collapse stream";
    }
    // CSS variables for terminal grid bottom height
    const root = document.documentElement;
    if (m === "open") root.style.setProperty("--bottom-h", "min(38vh, 280px)");
    else if (m === "compact") root.style.setProperty("--bottom-h", "max(18vh, 140px)");
    else root.style.setProperty("--bottom-h", "42px");
    queueMicrotask(() => {
      try {
        Map3D?.resize?.();
      } catch {
        /* */
      }
    });
  }

  function cycleStream() {
    const cur = document.body.dataset.streamMode || "open";
    const next = cur === "open" ? "compact" : cur === "compact" ? "hidden" : "open";
    setStreamMode(next);
  }

  /* ── Search autosuggest ── */
  function collectSuggestions(q) {
    const query = (q || "").trim().toLowerCase();
    if (!query) return [];
    const out = [];
    const push = (item) => {
      if (out.length < 28) out.push(item);
    };

    if (typeof DESK_CATALOG !== "undefined") {
      DESK_CATALOG.forEach((d) => {
        const hay = `${d.title} ${d.blurb} ${d.desc} ${d.id}`.toLowerCase();
        if (hay.includes(query)) {
          push({
            kind: "desk",
            icon: d.icon || "·",
            title: d.title,
            sub: d.blurb || d.desc || "",
            action: { type: "desk", id: d.id },
          });
        }
      });
    }

    if (typeof COUNTRIES !== "undefined") {
      COUNTRIES.filter((c) => c.code && c.code !== "GLOBAL")
        .filter((c) => `${c.name} ${c.code} ${c.region || ""}`.toLowerCase().includes(query))
        .slice(0, 12)
        .forEach((c) => {
          push({
            kind: "country",
            icon: c.code.slice(0, 2),
            title: c.name,
            sub: `${c.code}${c.region ? " · " + c.region : ""}`,
            action: { type: "country", code: c.code },
          });
        });
    }

    if (typeof INSTRUMENTS !== "undefined") {
      INSTRUMENTS.filter((i) => `${i.sym} ${i.name} ${i.cls || ""}`.toLowerCase().includes(query))
        .slice(0, 10)
        .forEach((i) => {
          push({
            kind: "market",
            icon: "◈",
            title: i.sym,
            sub: i.name,
            action: { type: "instrument", sym: i.sym },
          });
        });
    }

    try {
      if (typeof Feeds !== "undefined") {
        (Feeds.getState().news || [])
          .filter((n) => (n.title || "").toLowerCase().includes(query))
          .slice(0, 6)
          .forEach((n) => {
            push({
              kind: "news",
              icon: "☰",
              title: n.title,
              sub: n.source || "News",
              action: { type: "news", title: n.title },
            });
          });
      }
    } catch {
      /* */
    }

    const cmds = [
      { q: ["map", "globe"], title: "Open Map desk", id: "geo" },
      { q: ["answer", "qa"], title: "Open Answers", id: "answers" },
      { q: ["model", "kmri", "risk"], title: "Open Models", id: "risk" },
      { q: ["market", "price"], title: "Open Markets", id: "markets" },
      { q: ["news", "headline"], title: "Open News", id: "news" },
      { q: ["crisis", "war"], title: "Open Crisis", id: "crisis" },
      { q: ["weather", "temp"], title: "Open Weather", id: "weather" },
      { q: ["command", "home"], title: "Open Command", id: "command" },
      { q: ["afford", "cost"], title: "Open Affordability", id: "afford" },
      { q: ["inflat", "cpi"], title: "Open Inflation", id: "inflation" },
    ];
    cmds.forEach((c) => {
      if (c.q.some((k) => query.includes(k) || k.includes(query))) {
        push({
          kind: "command",
          icon: "⌘",
          title: c.title,
          sub: "Jump to desk",
          action: { type: "desk", id: c.id },
        });
      }
    });

    return out;
  }

  function positionSuggest() {
    const box = $("#searchSuggest");
    const input = $("#globalSearch");
    const wrap = input?.closest(".search-box") || input;
    if (!box || !wrap || box.hidden) return;
    const r = wrap.getBoundingClientRect();
    box.style.position = "fixed";
    box.style.left = Math.max(8, r.left) + "px";
    box.style.top = r.bottom + 4 + "px";
    box.style.width = Math.max(300, r.width) + "px";
    box.style.right = "auto";
    box.style.zIndex = "500";
  }

  function hideSuggest() {
    const box = $("#searchSuggest");
    const input = $("#globalSearch");
    if (box) {
      box.hidden = true;
      box.innerHTML = "";
    }
    if (input) input.setAttribute("aria-expanded", "false");
    suggestItems = [];
    suggestIdx = -1;
  }

  function highlightSuggest() {
    $$("#searchSuggest .sg-item").forEach((el) => {
      el.classList.toggle("active", +el.dataset.idx === suggestIdx);
    });
    $(`#searchSuggest .sg-item[data-idx="${suggestIdx}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function applySuggestion(idx) {
    const item = suggestItems[idx];
    if (!item) return;
    const a = item.action || {};
    const input = $("#globalSearch");

    if (a.type === "desk") {
      const btn = document.querySelector(`.nav-item[data-view="${a.id}"], .md-desk[data-view="${a.id}"]`);
      if (btn) btn.click();
      else if (typeof Layout !== "undefined") Layout.setView(a.id);
      if (input) {
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } else if (a.type === "country") {
      const sel = $("#countrySelect");
      if (sel) {
        if (![...sel.options].some((o) => o.value === a.code)) {
          const opt = document.createElement("option");
          opt.value = a.code;
          opt.textContent = item.title;
          sel.appendChild(opt);
        }
        sel.value = a.code;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (input) {
        input.value = item.title;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    } else if (a.type === "instrument") {
      const sel = $("#instrumentSelect");
      if (sel) {
        sel.value = a.sym;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (input) {
        input.value = a.sym;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      document.querySelector(`.nav-item[data-view="markets"]`)?.click();
    } else if (a.type === "news") {
      if (input) {
        input.value = (a.title || "").slice(0, 48);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      document.querySelector(`.nav-item[data-view="news"]`)?.click();
    }
    hideSuggest();
    if (typeof UI !== "undefined" && UI.toast) UI.toast("→ " + item.title);
  }

  function renderSuggest(items) {
    const box = $("#searchSuggest");
    const input = $("#globalSearch");
    if (!box) return;
    suggestItems = items;
    suggestIdx = items.length ? 0 : -1;
    if (!items.length) {
      hideSuggest();
      return;
    }
    const labels = {
      command: "COMMANDS",
      desk: "DESKS",
      country: "COUNTRIES",
      market: "MARKETS",
      news: "HEADLINES",
    };
    const order = ["command", "desk", "country", "market", "news"];
    const groups = {};
    items.forEach((it, i) => {
      const g = it.kind || "result";
      if (!groups[g]) groups[g] = [];
      groups[g].push({ ...it, _i: i });
    });
    let html = "";
    order.forEach((g) => {
      if (!groups[g]?.length) return;
      html += `<div class="sg-group">${labels[g] || g}</div>`;
      groups[g].forEach((it) => {
        html += `<button type="button" class="sg-item${it._i === 0 ? " active" : ""}" data-idx="${it._i}" role="option">
          <span class="sg-ico">${esc(it.icon)}</span>
          <span class="sg-main"><span class="sg-title">${esc(it.title)}</span><span class="sg-sub">${esc(it.sub)}</span></span>
          <span class="sg-kind">${esc(it.kind)}</span>
        </button>`;
      });
    });
    html += `<div class="sg-hint">↑↓ · Enter · Esc · live filter</div>`;
    box.innerHTML = html;
    box.hidden = false;
    if (input) input.setAttribute("aria-expanded", "true");
    positionSuggest();
    box.querySelectorAll(".sg-item").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        applySuggestion(+btn.dataset.idx);
      });
    });
  }

  function wireSearch() {
    const input = $("#globalSearch");
    if (!input || input.dataset.classicSearch) return;
    input.dataset.classicSearch = "1";

    const box = $("#searchSuggest");
    if (box && box.parentElement !== document.body) {
      document.body.appendChild(box);
    }

    let t = null;
    const show = (q) => {
      const query = (q || "").trim();
      if (!query) {
        hideSuggest();
        return;
      }
      renderSuggest(collectSuggestions(query));
    };

    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => show(input.value), 40);
    });

    input.addEventListener("keydown", (e) => {
      const open = $("#searchSuggest") && !$("#searchSuggest").hidden && suggestItems.length;
      if (e.key === "Escape") {
        hideSuggest();
        e.preventDefault();
        return;
      }
      if (!open) {
        if (e.key === "Enter" && input.value.trim()) {
          const items = collectSuggestions(input.value);
          if (items.length) {
            e.preventDefault();
            suggestItems = items;
            applySuggestion(0);
          }
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        suggestIdx = Math.min(suggestItems.length - 1, suggestIdx + 1);
        highlightSuggest();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        suggestIdx = Math.max(0, suggestIdx - 1);
        highlightSuggest();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (suggestIdx >= 0) applySuggestion(suggestIdx);
      }
    });

    input.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.activeElement !== input) hideSuggest();
      }, 200);
    });
    input.addEventListener("focus", () => {
      if ((input.value || "").trim()) show(input.value);
    });
    window.addEventListener(
      "resize",
      () => {
        if ($("#searchSuggest") && !$("#searchSuggest").hidden) positionSuggest();
      },
      { passive: true }
    );
  }

  function wireChrome() {
    $("#btnRailToggle")?.addEventListener("click", toggleRail);
    $("#btnRailToggle2")?.addEventListener("click", toggleRail);
    $("#btnStreamToggle")?.addEventListener("click", cycleStream);
    $("#btnStreamOpen")?.addEventListener("click", () => setStreamMode("open"));
    $("#btnStreamCompact")?.addEventListener("click", () => setStreamMode("compact"));
    $("#btnStreamHide")?.addEventListener("click", () => setStreamMode("hidden"));

    let rail = false;
    let stream = "open";
    try {
      rail = sessionStorage.getItem(RAIL_KEY) === "1";
      stream = sessionStorage.getItem(STREAM_KEY) || "open";
    } catch {
      /* */
    }
    setRailCollapsed(rail);
    setStreamMode(stream);
  }

  function boot() {
    // Hide legacy DESK/PHONE UI if still visible
    const vt = $("#viewToggle");
    if (vt) {
      vt.hidden = true;
      vt.setAttribute("aria-hidden", "true");
    }
    wireSearch();
    wireChrome();
    console.info(
      "%c WMT %c classic polish · search · collapse · responsive ",
      "background:#f5a623;color:#000;font-weight:700",
      "color:#8b93a7"
    );
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
