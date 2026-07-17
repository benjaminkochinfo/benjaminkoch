/**
 * Tooltips, tour, drawer, toast
 */
const UI = (() => {
  let tipEl, toastTimer;

  function $(sel, el = document) {
    return el.querySelector(sel);
  }

  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 2200);
  }

  function initTooltips() {
    tipEl = $("#tooltip");
    let showT;
    document.addEventListener("pointerover", (e) => {
      const host = e.target.closest("[data-tip], [data-preview], .nav-item, .domain-pill");
      if (!host || !tipEl) return;
      const preview = host.getAttribute("data-preview");
      const text = host.getAttribute("data-tip") || host.getAttribute("title");
      const title = host.getAttribute("data-preview-title") || host.querySelector?.(".nav-txt")?.textContent;
      if (!preview && !text) return;
      clearTimeout(showT);
      showT = setTimeout(() => {
        if (preview) {
          tipEl.className = "tooltip rich";
          tipEl.innerHTML = `<div class="tip-win">${esc(title || "WINDOW")}</div><div class="tip-body">${esc(preview)}</div>`;
        } else {
          tipEl.className = "tooltip";
          tipEl.textContent = text;
        }
        tipEl.hidden = false;
        positionTip(e.clientX, e.clientY);
      }, 160);
    });
    document.addEventListener("pointermove", (e) => {
      if (tipEl && !tipEl.hidden) positionTip(e.clientX, e.clientY);
    });
    document.addEventListener("pointerout", (e) => {
      if (e.relatedTarget && e.relatedTarget.closest?.("[data-tip], [data-preview], .nav-item, .domain-pill")) return;
      clearTimeout(showT);
      if (tipEl) tipEl.hidden = true;
    });
  }

  function positionTip(x, y) {
    if (!tipEl) return;
    const pad = 16;
    let left = x + pad;
    let top = y + pad;
    tipEl.style.left = "0px";
    tipEl.style.top = "0px";
    const r = tipEl.getBoundingClientRect();
    if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - pad;
    tipEl.style.left = Math.max(4, left) + "px";
    tipEl.style.top = Math.max(4, top) + "px";
  }

  function openDrawer({ type, title, sev, meta, body, link }) {
    const drawer = $("#drawer");
    const backdrop = $("#drawerBackdrop");
    $("#drawerTitle").textContent = type || "DETAIL";
    const sevLabel = (sev || "info").toUpperCase();
    const bodyHtml = String(body || "")
      .split(/\n\n+/)
      .map((p) => `<p>${esc(p)}</p>`)
      .join("");
    $("#drawerBody").innerHTML = `
      <div class="d-type">${esc(type || "SIGNAL")}</div>
      <span class="d-sev ${sev || "info"}">${sevLabel}</span>
      <h3>${esc(title)}</h3>
      <div class="d-meta">
        ${(meta || []).map(([k, v]) => `<span>${esc(k)}</span><span>${esc(String(v))}</span>`).join("")}
      </div>
      ${bodyHtml}
      ${link ? `<p><a href="${esc(link)}" target="_blank" rel="noopener">Open source ↗</a></p>` : ""}
      <p class="drawer-foot">World Intelligence Terminal · live public sources · no cookies · nothing saved on the device</p>`;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    if (backdrop) backdrop.hidden = false;
  }

  function closeDrawer() {
    $("#drawer")?.classList.remove("open");
    $("#drawer")?.setAttribute("aria-hidden", "true");
    const b = $("#drawerBackdrop");
    if (b) b.hidden = true;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function explainWidget(id) {
    const cat = WIDGET_CATALOG[id];
    if (!cat) return;
    openDrawer({
      type: "PANEL HELP",
      title: cat.title,
      sev: "info",
      meta: [
        ["ID", id],
        ["DEFAULT SIZE", `${cat.w}×${cat.h}`],
      ],
      body: cat.help,
    });
  }

  let tourIdx = 0;
  function startTour() {
    tourIdx = 0;
    const ov = $("#tourOverlay");
    if (ov) ov.hidden = false;
    showTourStep();
    /* no persistent tour flag — privacy: nothing on disk */
  }
  function showTourStep() {
    const step = TOUR_STEPS[tourIdx];
    if (!step) return endTour();
    $("#tourStep").textContent = `${tourIdx + 1} / ${TOUR_STEPS.length}`;
    $("#tourTitle").textContent = step.title;
    $("#tourText").textContent = step.text;
    $("#tourNext").textContent = tourIdx === TOUR_STEPS.length - 1 ? "FINISH" : "NEXT";
  }
  function nextTour() {
    tourIdx++;
    if (tourIdx >= TOUR_STEPS.length) endTour();
    else showTourStep();
  }
  function endTour() {
    const ov = $("#tourOverlay");
    if (ov) ov.hidden = true;
  }
  function maybeFirstTour() {
    // How-to modal is primary onboarding (app.js); optional short tour via How to use
  }

  function init() {
    initTooltips();
    $("#tourNext")?.addEventListener("click", nextTour);
    $("#tourSkip")?.addEventListener("click", endTour);
    $("#btnTour")?.addEventListener("click", startTour);
    $("#drawerClose")?.addEventListener("click", closeDrawer);
    $("#drawerBackdrop")?.addEventListener("click", closeDrawer);
  }

  return {
    init,
    toast,
    openDrawer,
    closeDrawer,
    explainWidget,
    startTour,
    endTour,
    maybeFirstTour,
    esc,
  };
})();
window.UI = UI;
