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
    if (!on) cleanupDrag();
  }
  function isEditMode() {
    return editMode;
  }
  function setView(view) {
    currentView = view;
    Storage.set("layout_view", view);
    render();
  }
  function getView() {
    return currentView;
  }

  function render() {
    const grid = document.getElementById("widgetGrid");
    const tpl = document.getElementById("tpl-widget");
    if (!grid || !tpl) return;
    const order = getOrder(currentView);
    grid.innerHTML = "";

    order.forEach((id) => {
      const cat = WIDGET_CATALOG[id];
      if (!cat) return;
      const node = tpl.content.firstElementChild.cloneNode(true);
      node.dataset.id = id;
      const { w, h } = widgetSize(id);
      node.dataset.w = String(w);
      node.dataset.h = String(h);
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
        setTimeout(() => window.Map3D?.resize?.(), 50);
      });
      bindPointerDrag(node);
      bindResize(node);
      grid.appendChild(node);
    });

    if (typeof onRender === "function") onRender(order);
    setTimeout(() => window.Map3D?.resize?.(), 80);
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
      sizeMap[widget.dataset.id] = {
        w: parseInt(widget.dataset.w, 10),
        h: parseInt(widget.dataset.h, 10),
      };
      saveSizes();
      window.UI?.toast?.("Size saved");
      window.Map3D?.resize?.();
    };
    handle.addEventListener("pointerdown", (e) => {
      if (!editMode && e.shiftKey === false) {
        // allow resize always when edit mode, or always via corner for usability
      }
      e.preventDefault();
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      startW = parseInt(widget.dataset.w, 10) || 4;
      startH = parseInt(widget.dataset.h, 10) || 2;
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
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
  };
})();
