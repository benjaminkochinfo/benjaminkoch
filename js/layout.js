/**
 * Multiview layout — reliable pointer drag/drop + resize
 * Edit mode (E / ⊡): drag any panel header to reorder, corner to resize
 * Reorder saves to CUSTOM desk; sizes persist across desks
 */

const Layout = (() => {
  let editMode = false;
  let currentView = "command";
  let customOrder = null;
  let sizeMap = {};
  let onRender = null;
  let dragId = null;
  let ghostEl = null;
  let dropTargetId = null;
  let placeBefore = true;

  function load() {
    customOrder = Storage.get("layout_custom");
    sizeMap = Storage.get("layout_sizes") || {};
    currentView = Storage.get("layout_view") || "command";
  }
  function saveCustom(order) {
    customOrder = order;
    Storage.set("layout_custom", order);
  }
  function saveSizes() {
    Storage.set("layout_sizes", sizeMap);
  }

  function resolveId(id) {
    return (typeof WIDGET_ALIASES !== "undefined" && WIDGET_ALIASES[id]) || id;
  }

  function getOrder(view) {
    if (view === "custom" && customOrder?.length) return customOrder.map(resolveId);
    const preset = VIEW_PRESETS[view] || VIEW_PRESETS.command;
    if (view === "custom" && !customOrder?.length) return [...VIEW_PRESETS.command].map(resolveId);
    const raw = [...(preset || VIEW_PRESETS.command)].map(resolveId);
    return [...new Set(raw)];
  }

  function widgetSize(id) {
    if (sizeMap[id]) return sizeMap[id];
    const cat = WIDGET_CATALOG[id];
    return { w: cat?.w || 4, h: cat?.h || 2 };
  }

  function setEditMode(on) {
    editMode = !!on;
    const grid = document.getElementById("widgetGrid");
    const banner = document.getElementById("layoutBanner");
    if (grid) grid.dataset.edit = on ? "true" : "false";
    if (banner) {
      banner.hidden = !on;
      // force-hide even if CSS display:flex fights [hidden]
      banner.style.display = on ? "flex" : "none";
      banner.setAttribute("aria-hidden", on ? "false" : "true");
    }
    document.getElementById("btnLayout")?.setAttribute("aria-pressed", on ? "true" : "false");
    document.body.classList.toggle("layout-edit", editMode);
    grid?.querySelectorAll(".widget").forEach((el) => {
      el.classList.toggle("editable", editMode);
    });
    if (!on) {
      cleanupDrag();
      // Re-pack after leaving edit mode
      scheduleAutoArrange(80);
    }
  }
  function isEditMode() {
    return editMode;
  }
  function setView(view) {
    currentView = view;
    Storage.set("layout_view", view);
    // Always open a desk from the top of the workspace
    scrollWorkspaceTop();
    render();
    // Re-assert after paint (fills / images can shift scroll)
    requestAnimationFrame(scrollWorkspaceTop);
    setTimeout(scrollWorkspaceTop, 50);
    setTimeout(scrollWorkspaceTop, 200);
  }
  function getView() {
    return currentView;
  }

  /** Scroll the desk workspace (and parents) to the top. */
  function scrollWorkspaceTop() {
    const ids = ["workspace", "widgetGrid"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    });
    document.querySelectorAll(".workspace, .main-col, .body-row").forEach((el) => {
      try {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      } catch {
        /* */
      }
    });
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {
      /* */
    }
  }

  function render() {
    const grid = document.getElementById("widgetGrid");
    const tpl = document.getElementById("tpl-widget");
    if (!grid || !tpl) return;
    const order = getOrder(currentView);
    grid.innerHTML = "";
    grid.classList.add("auto-arrange");
    scrollWorkspaceTop();

    order.forEach((id) => {
      const cat = WIDGET_CATALOG[id];
      if (!cat) return;
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = id;
      const { w, h } = widgetSize(id);
      node.dataset.w = String(w);
      node.dataset.h = String(h);
      node.dataset.baseW = String(w);
      node.dataset.baseH = String(h);
      node.querySelector(".widget-title").textContent = cat.title;
      node.querySelector(".widget-meta").textContent = "";
      node.classList.toggle("editable", editMode);
      if (cat.accent) node.style.setProperty("--w-accent", cat.accent);
      node.setAttribute("data-preview-title", cat.title);
      node.setAttribute("data-preview", cat.help || "Panel window");
      node.setAttribute("data-tip", cat.help || cat.title);
      node.querySelector(".widget-help").addEventListener("click", (e) => {
        e.stopPropagation();
        window.UI?.explainWidget?.(id);
      });
      node.querySelector(".widget-collapse").addEventListener("click", (e) => {
        e.stopPropagation();
        node.classList.toggle("collapsed");
        // Manual collapse wins until next content-driven arrange
        node.dataset.userCollapse = node.classList.contains("collapsed") ? "1" : "0";
        scheduleAutoArrange(40);
        setTimeout(() => window.Map3D?.resize?.(), 50);
      });
      bindPointerDrag(node);
      bindResize(node);
      grid.appendChild(node);
    });

    if (typeof onRender === "function") onRender(order);
    // Content fills run in onRender — arrange + pin top after they paint
    queueMicrotask(() => {
      autoArrange();
      scrollWorkspaceTop();
    });
    setTimeout(() => {
      autoArrange();
      scrollWorkspaceTop();
      window.Map3D?.resize?.();
    }, 80);
    setTimeout(() => {
      autoArrange();
      scrollWorkspaceTop();
    }, 280);
    setTimeout(() => autoArrange(), 600);
  }

  /** Detect panels with no real content (empty / loading shell only). */
  function isWidgetEmpty(widget) {
    if (!widget) return true;
    if (widget.dataset.userCollapse === "1") return true;
    const id = widget.dataset.id || "";
    // Map and structural panels always keep their footprint
    if (id === "map" || id === "layers" || id === "controls") return false;
    const body = widget.querySelector(".widget-body");
    if (!body) return true;

    const text = (body.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return true;

    // Explicit empty() shell — sole or banner + empty only
    const emptyEl = body.querySelector(".w-empty");
    if (emptyEl) {
      const kids = [...body.children];
      const meaningful = kids.filter((c) => {
        if (c.classList?.contains("w-empty")) return false;
        const cls = String(c.className || "");
        if (/panel-banner|afford-foot|warn-empty/.test(cls)) return false;
        return (c.textContent || "").trim().length > 8;
      });
      if (!meaningful.length) return true;
    }

    // Placeholder-only strings
    if (
      /^(—|-|\.|n\/a|none|loading…?|waiting for|no data|empty)/i.test(text) &&
      text.length < 64
    )
      return true;

    // Real content: anything with substance stays filled
    if (text.length >= 24) return false;
    if (body.querySelector("canvas, svg, table, img, video")) return false;
    if (body.children.length >= 2 && text.length >= 12) return false;
    if (text.length < 10) return true;
    return false;
  }

  /** Expand widgets so each grid row uses the full 12 columns (no trailing gap). */
  function expandRowsToFill(widgets) {
    if (!widgets.length) return;
    let row = [];
    let used = 0;
    const flush = () => {
      if (!row.length) return;
      const gap = 12 - used;
      if (gap > 0 && gap < 12) {
        // Prefer growing the last item; if last is already wide, split across row
        const last = row[row.length - 1];
        const cur = parseInt(last.dataset.w, 10) || 4;
        const nextW = Math.min(12, cur + gap);
        last.dataset.w = String(Math.max(3, nextW));
      }
      row = [];
      used = 0;
    };
    widgets.forEach((w) => {
      let span = parseInt(w.dataset.w, 10) || 4;
      span = Math.max(3, Math.min(12, span));
      if (used + span > 12) flush();
      if (span > 12 - used && used > 0) flush();
      span = Math.min(span, 12 - used);
      if (span < 3 && used > 0) {
        flush();
        span = parseInt(w.dataset.w, 10) || 4;
      }
      w.dataset.w = String(Math.max(3, Math.min(12, span)));
      row.push(w);
      used += parseInt(w.dataset.w, 10);
      if (used >= 12) flush();
    });
    flush();
  }

  /**
   * Fit each filled window height to its content so the body is not a tall black void.
   * Uses data-h spans only as a soft ceiling for map / tall boards.
   */
  function fitContentHeights(filled) {
    filled.forEach((w) => {
      const id = w.dataset.id || "";
      const body = w.querySelector(".widget-body");
      const head = w.querySelector(".widget-head");
      if (!body) return;

      // Clear previous forced sizes so measurement is honest
      w.style.height = "";
      w.style.minHeight = "";
      body.style.minHeight = "";
      body.style.height = "";
      body.style.maxHeight = "";

      if (id === "map") {
        w.dataset.h = String(Math.max(3, parseInt(w.dataset.baseH, 10) || 3));
        w.style.minHeight = "min(42vh, 320px)";
        body.style.minHeight = "260px";
        return;
      }

      // Measure natural content
      const prevOverflow = body.style.overflow;
      body.style.overflow = "visible";
      const contentH = Math.max(body.scrollHeight, body.offsetHeight, 0);
      const headH = head ? head.offsetHeight : 28;
      body.style.overflow = prevOverflow || "";

      const total = headH + contentH + 4;
      const baseH = parseInt(w.dataset.baseH, 10) || 2;

      // Map content height → grid row span (no oversized empty rows)
      let h;
      if (total < 96) h = 1;
      else if (total < 170) h = 2;
      else if (total < 260) h = Math.min(3, Math.max(2, baseH));
      else if (total < 360) h = Math.min(4, Math.max(3, baseH));
      else h = Math.min(5, Math.max(3, baseH));

      // Don't force taller than content needs (except map handled above)
      if (baseH > h + 1 && total < baseH * 90) {
        h = Math.max(h, Math.min(baseH, h + 1));
      }
      w.dataset.h = String(h);

      // Lock height to content — kills internal empty black band
      w.style.minHeight = "0";
      w.style.height = "auto";
      body.style.minHeight = "0";
      body.style.flex = "0 1 auto";
    });
  }

  /**
   * Auto-arrange desk windows:
   * - empty panels collapse (header chip only — no black body)
   * - filled panels restore width, fit height to content, fill row gaps
   * Skipped while layout edit mode is on.
   */
  let arrangeTimer = null;
  function autoArrange(opts = {}) {
    if (editMode && !opts.force) return;
    const grid = document.getElementById("widgetGrid");
    if (!grid) return;

    const widgets = [...grid.querySelectorAll(".widget")];
    if (!widgets.length) return;

    widgets.forEach((w) => {
      if (!w.dataset.baseW) {
        w.dataset.baseW = w.dataset.w || "4";
        w.dataset.baseH = w.dataset.h || "2";
      }
    });

    const filled = [];
    const empty = [];
    widgets.forEach((w) => {
      // User-collapsed stays compact
      if (w.dataset.userCollapse === "1") {
        w.classList.add("is-empty", "collapsed");
        empty.push(w);
        return;
      }
      if (isWidgetEmpty(w)) empty.push(w);
      else filled.push(w);
    });

    // Restore filled to preferred width footprint
    filled.forEach((w) => {
      w.classList.remove("is-empty", "collapsed");
      w.classList.add("is-filled");
      w.dataset.w = w.dataset.baseW || w.dataset.w || "4";
      w.dataset.h = w.dataset.baseH || w.dataset.h || "2";
      delete w.dataset.autoEmpty;
      w.style.display = "";
    });

    // Empty windows → header-only chips (no black body / no tall grid hole)
    empty.forEach((w) => {
      w.classList.add("is-empty");
      w.classList.remove("is-filled");
      w.dataset.autoEmpty = "1";
      w.dataset.w = "3";
      w.dataset.h = "1";
      w.style.height = "auto";
      w.style.minHeight = "0";
      const body = w.querySelector(".widget-body");
      if (body) {
        body.style.minHeight = "0";
        body.style.height = "0";
        body.style.maxHeight = "0";
        body.style.padding = "0";
        body.style.overflow = "hidden";
      }
    });

    // Few filled panels: give them more width so the desk doesn't look sparse
    if (filled.length === 1) {
      filled[0].dataset.w = "12";
    } else if (filled.length === 2) {
      filled.forEach((w) => {
        const bw = parseInt(w.dataset.baseW, 10) || 6;
        w.dataset.w = String(Math.max(6, Math.min(12, bw >= 8 ? 6 : Math.max(bw, 6))));
      });
      const a = parseInt(filled[0].dataset.w, 10);
      filled[1].dataset.w = String(12 - a);
    } else if (filled.length === 3) {
      filled.forEach((w) => {
        const bw = parseInt(w.dataset.baseW, 10) || 4;
        w.dataset.w = String(bw >= 6 ? 4 : Math.max(4, bw));
      });
      expandRowsToFill(filled);
    }

    expandRowsToFill(filled);
    // Pack empty chips on their own trailing row(s)
    expandRowsToFill(empty);

    // Height follows content — removes empty black bands inside panels
    fitContentHeights(filled);

    // Move empty chips after filled in DOM so dense flow doesn't leave mid-grid holes
    // (does not change saved custom order — only live DOM for packing)
    if (empty.length && filled.length) {
      empty.forEach((w) => grid.appendChild(w));
    }

    grid.dataset.filled = String(filled.length);
    grid.dataset.empty = String(empty.length);
    grid.classList.toggle("has-empty", empty.length > 0);
    grid.classList.toggle("all-filled", empty.length === 0);

    if (!opts.silent) {
      setTimeout(() => window.Map3D?.resize?.(), 30);
    }
  }

  function scheduleAutoArrange(delay = 60) {
    clearTimeout(arrangeTimer);
    arrangeTimer = setTimeout(() => {
      autoArrange();
    }, delay);
  }

  function cleanupDrag() {
    dragId = null;
    dropTargetId = null;
    document.querySelectorAll(".widget.dragging, .widget.drag-over, .widget.drop-before, .widget.drop-after").forEach((el) => {
      el.classList.remove("dragging", "drag-over", "drop-before", "drop-after");
    });
    if (ghostEl) {
      ghostEl.remove();
      ghostEl = null;
    }
    document.body.classList.remove("is-dragging");
  }

  /** Hit-test by geometry — works even if CSS sets pointer-events:none on siblings */
  function hitTestWidget(x, y, excludeId) {
    const grid = document.getElementById("widgetGrid");
    if (!grid) return null;
    const widgets = [...grid.querySelectorAll(".widget")];
    let best = null;
    let bestArea = Infinity;
    for (const w of widgets) {
      if (w.dataset.id === excludeId) continue;
      const r = w.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        const area = r.width * r.height;
        if (area < bestArea) {
          bestArea = area;
          best = { el: w, rect: r, before: y < r.top + r.height / 2 };
        }
      }
    }
    // if not inside any, find nearest by center distance
    if (!best) {
      let minD = 120;
      for (const w of widgets) {
        if (w.dataset.id === excludeId) continue;
        const r = w.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(x - cx, y - cy);
        if (d < minD) {
          minD = d;
          best = { el: w, rect: r, before: y < cy };
        }
      }
    }
    return best;
  }

  function clearDropMarkers() {
    document.querySelectorAll(".widget.drag-over, .widget.drop-before, .widget.drop-after").forEach((el) => {
      el.classList.remove("drag-over", "drop-before", "drop-after");
    });
  }

  function bindPointerDrag(widget) {
    const head = widget.querySelector(".widget-head");
    const grip = widget.querySelector(".widget-grip");
    if (!head) return;

    let startX = 0;
    let startY = 0;
    let active = false;
    let moved = false;
    let pointerId = null;

    const onMove = (e) => {
      if (!active || !editMode) return;
      // support both pointer and mouse events
      const x = e.clientX;
      const y = e.clientY;
      if (!moved && Math.hypot(x - startX, y - startY) < 5) return;

      if (!moved) {
        moved = true;
        dragId = widget.dataset.id;
        widget.classList.add("dragging");
        document.body.classList.add("is-dragging");
        ghostEl = document.createElement("div");
        ghostEl.className = "widget-ghost";
        ghostEl.innerHTML = `<span class="widget-title">${widget.querySelector(".widget-title")?.textContent || dragId}</span><span class="ghost-hint">Drop on another panel</span>`;
        ghostEl.style.width = Math.min(280, widget.offsetWidth) + "px";
        document.body.appendChild(ghostEl);
      }

      if (ghostEl) {
        ghostEl.style.left = x + 14 + "px";
        ghostEl.style.top = y + 14 + "px";
      }

      clearDropMarkers();
      const hit = hitTestWidget(x, y, dragId);
      if (hit) {
        dropTargetId = hit.el.dataset.id;
        placeBefore = hit.before;
        hit.el.classList.add("drag-over");
        hit.el.classList.add(placeBefore ? "drop-before" : "drop-after");
      } else {
        dropTargetId = null;
      }
    };

    const onUp = (e) => {
      if (!active) return;
      active = false;
      const x = e.clientX ?? startX;
      const y = e.clientY ?? startY;

      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      if (pointerId != null && head.releasePointerCapture) {
        try {
          head.releasePointerCapture(pointerId);
        } catch {
          /* */
        }
      }

      if (moved && dragId) {
        const hit = hitTestWidget(x, y, dragId);
        const toId = hit?.el?.dataset?.id || dropTargetId;
        if (toId && toId !== dragId) {
          reorder(dragId, toId, hit ? hit.before : placeBefore);
        } else {
          window.UI?.toast?.("Drop on another panel to reorder");
        }
      }
      cleanupDrag();
    };

    const onDown = (e) => {
      if (!editMode) return;
      if (e.button != null && e.button !== 0) return;
      if (e.target.closest("button")) return;
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      active = true;
      moved = false;
      dropTargetId = null;
      pointerId = e.pointerId;

      // Prefer document listeners (more reliable than capture alone)
      if (e.pointerId != null) {
        try {
          head.setPointerCapture(e.pointerId);
        } catch {
          /* */
        }
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onUp);
      } else {
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      }
    };

    // Drag from entire header + grip (easier target)
    head.addEventListener("pointerdown", onDown);
    grip?.addEventListener("pointerdown", onDown);
  }

  function reorder(fromId, toId, before = true) {
    let order = getOrder(currentView);
    const fi = order.indexOf(fromId);
    let ti = order.indexOf(toId);
    if (fi < 0 || ti < 0 || fromId === toId) return;
    order.splice(fi, 1);
    // recompute to index after removal
    ti = order.indexOf(toId);
    if (ti < 0) return;
    const insertAt = before ? ti : ti + 1;
    order.splice(insertAt, 0, fromId);
    saveCustom(order);
    if (currentView !== "custom") {
      currentView = "custom";
      Storage.set("layout_view", "custom");
      document.querySelectorAll(".nav-item").forEach((t) => {
        t.classList.toggle("active", t.dataset.view === "custom");
      });
    }
    render();
    window.UI?.toast?.("Layout saved · CUSTOM desk");
  }

  function bindResize(widget) {
    const handle = widget.querySelector(".widget-resize");
    if (!handle) return;
    let startX, startY, startW, startH;
    const onMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let w = startW + Math.round(dx / 72);
      let h = startH + Math.round(dy / 64);
      w = Math.max(3, Math.min(12, w));
      h = Math.max(1, Math.min(5, h));
      const allowed = [3, 4, 5, 6, 8, 12];
      w = allowed.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
      widget.dataset.w = String(w);
      widget.dataset.h = String(h);
      if (widget.dataset.id === "map") window.Map3D?.resize?.();
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      const w = parseInt(widget.dataset.w, 10);
      const h = parseInt(widget.dataset.h, 10);
      sizeMap[widget.dataset.id] = { w, h };
      widget.dataset.baseW = String(w);
      widget.dataset.baseH = String(h);
      widget.classList.remove("is-empty");
      widget.classList.add("is-filled");
      saveSizes();
      window.UI?.toast?.("Size saved");
      window.Map3D?.resize?.();
      scheduleAutoArrange(100);
    };
    handle.addEventListener("pointerdown", (e) => {
      // Corner resize always available (edit mode optional) for reliable UX
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      startW = parseInt(widget.dataset.w, 10) || 4;
      startH = parseInt(widget.dataset.h, 10) || 2;
      try {
        handle.setPointerCapture?.(e.pointerId);
      } catch {
        /* */
      }
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    });
  }

  function resetLayout() {
    customOrder = null;
    sizeMap = {};
    Storage.remove("layout_custom");
    Storage.remove("layout_sizes");
    currentView = "command";
    Storage.set("layout_view", "command");
    setEditMode(false);
    render();
    document.querySelectorAll(".nav-item").forEach((t) => {
      t.classList.toggle("active", t.dataset.view === "command");
    });
    window.UI?.toast?.("Layout reset · COMMAND desk");
  }

  /** Restore current desk to its factory preset (clears custom only if on custom) */
  function resetCurrentDesk() {
    if (currentView === "custom") {
      resetLayout();
      return;
    }
    // drop any size overrides for widgets on this desk? keep sizes, just re-render preset
    render();
    window.UI?.toast?.(`Desk · ${(VIEW_META[currentView] || {}).title || currentView}`);
  }

  function listDesks() {
    return typeof DESK_CATALOG !== "undefined"
      ? DESK_CATALOG
      : Object.keys(VIEW_PRESETS)
          .filter((k) => k !== "custom" || true)
          .map((id) => ({
            id,
            title: (VIEW_META[id] || {}).title || id,
            desc: (VIEW_META[id] || {}).desc || "",
          }));
  }

  function init(renderCb) {
    onRender = renderCb;
    load();
    render();
  }
  function bodyEl(id) {
    return document.querySelector(`.widget[data-id="${id}"] .widget-body`);
  }
  function metaEl(id) {
    return document.querySelector(`.widget[data-id="${id}"] .widget-meta`);
  }

  return {
    init,
    render,
    setView,
    getView,
    setEditMode,
    isEditMode,
    resetLayout,
    resetCurrentDesk,
    listDesks,
    bodyEl,
    metaEl,
    getOrder,
    autoArrange,
    scheduleAutoArrange,
    scrollWorkspaceTop,
  };
})();
