"""Inside Desk — house chart renderer ("Desk Plate").

Pure-Python SVG, no third-party chart library, so the look is ours and stable.
Kinds:
  line  — one or more time series (optional step), optional lower 'panel' series,
          vertical event annotations, direct end-labels in a right-hand gutter.
  hbar  — horizontal bars for a handful of figures (derived bars are hatched).
Palette, type and layout are defined once here; never restyle per article.
"""
import datetime as dt, math
from xml.sax.saxutils import escape

INK = "#0D1015"; PANEL = "#141922"; RULE = "rgba(236,231,220,0.11)"; RULE2 = "rgba(236,231,220,0.28)"
TEXT = "#ECE7DC"; MUTED = "#9AA3AE"; FAINT = "#6B7480"; SIGNAL = "#F2A93B"
PALETTE = ["#F2A93B", "#4CC9B0", "#FF7A5C", "#A99BFF", "#C9D1D9", "#7FB2FF"]
SERIF = "Newsreader, 'Iowan Old Style', Georgia, serif"
SANS = "'Familjen Grotesk', 'Helvetica Neue', Arial, sans-serif"
MONO = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace"
MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

def _e(s): return escape(str(s), {'"': "&quot;"})
def _d(s): return dt.date.fromisoformat(s[:10])

def nice_ticks(lo, hi, n=5):
    if hi == lo: hi = lo + 1
    raw = (hi - lo) / n
    mag = 10 ** math.floor(math.log10(raw))
    step = min((m * mag for m in (1, 2, 2.5, 5, 10) if m * mag >= raw), default=10 * mag)
    start = math.floor(lo / step) * step
    ticks, t = [], start
    while t <= hi + step * 0.001:
        ticks.append(round(t, 10)); t += step
    if ticks[-1] < hi: ticks.append(round(ticks[-1] + step, 10))
    return ticks, step

def fmt_num(v, step=None, unit=""):
    dec = 0
    if step is not None and step < 1: dec = 1 if step >= 0.1 else 2
    s = f"{v:,.{dec}f}".replace("-", "−")
    return s + unit

def month_ticks(d0, d1):
    months = (d1.year - d0.year) * 12 + d1.month - d0.month
    for every in (1, 2, 3, 6, 12, 24):
        if months / every <= 8: break
    out, y, m = [], d0.year, d0.month
    if d0.day > 1: m += 1
    while True:
        if m > 12: m -= 12; y += 1
        d = dt.date(y, m, 1)
        if d > d1: break
        if (m - 1) % every == 0: out.append(d)
        m += 1
    return out

def _header(w, spec):
    k = _e(spec.get("kicker", "CHART").upper())
    return (f'<rect x="32" y="22" width="36" height="3" fill="{SIGNAL}"/>'
            f'<text x="80" y="27" font-family="{MONO}" font-size="11" letter-spacing="1.6" fill="{SIGNAL}">{k}</text>'
            f'<text x="32" y="66" font-family="{SERIF}" font-weight="600" font-size="30" fill="{TEXT}">{_e(spec["title"])}</text>'
            f'<text x="32" y="94" font-family="{SANS}" font-size="15" fill="{MUTED}">{_e(spec.get("subtitle",""))}</text>')

def _footer(w, h, spec):
    src = _e(spec.get("source_line", ""))
    return (f'<line x1="32" x2="{w-32}" y1="{h-44}" y2="{h-44}" stroke="{RULE}"/>'
            f'<text x="32" y="{h-22}" font-family="{MONO}" font-size="11" fill="{MUTED}"><tspan fill="{FAINT}">SOURCE </tspan>{src}</text>'
            f'<rect x="{w-140}" y="{h-31}" width="8" height="8" fill="{SIGNAL}"/>'
            f'<text x="{w-32}" y="{h-22}" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="12" letter-spacing="2.2" fill="{TEXT}">INSIDE DESK</text>')

def _open(w, h, spec, uid):
    title = _e(spec["title"]); desc = _e(spec.get("alt_full", spec.get("alt", "")))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" '
            f'aria-labelledby="{uid}-t {uid}-d" class="desk-plate" style="max-width:100%;height:auto">'
            f'<title id="{uid}-t">{title}</title><desc id="{uid}-d">{desc}</desc>'
            f'<defs><pattern id="{uid}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
            f'<rect width="6" height="6" fill="none"/><line x1="0" y1="0" x2="0" y2="6" stroke="{SIGNAL}" stroke-width="2.2" opacity=".9"/></pattern></defs>'
            f'<rect width="{w}" height="{h}" rx="14" fill="{INK}"/>')

def _path(pts, step=False):
    if not pts: return ""
    out = [f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if step: out.append(f"H{x1:.1f}V{y1:.1f}")
        else: out.append(f"L{x1:.1f},{y1:.1f}")
    return "".join(out)

def _wrap(text, n):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        if cur and len(cur) + 1 + len(w_) > n: lines.append(cur); cur = w_
        else: cur = (cur + " " + w_).strip()
    if cur: lines.append(cur)
    return lines[:3]

def _spread_labels(items, top, bottom, gap):
    items = sorted(items, key=lambda it: it["y"])
    for i in range(1, len(items)):
        if items[i]["y"] - items[i-1]["y"] < gap: items[i]["y"] = items[i-1]["y"] + gap
    over = items[-1]["y"] - bottom if items else 0
    if over > 0:
        for it in items: it["y"] -= over
    for i in range(len(items) - 2, -1, -1):
        if items[i+1]["y"] - items[i]["y"] < gap: items[i]["y"] = items[i+1]["y"] - gap
    for it in items: it["y"] = max(top, it["y"])
    return items

def line_chart(spec, data, uid="c"):
    """data: {series_key: [(date, value), ...]}"""
    series = spec["series"]; panel = spec.get("panel")
    w = spec.get("width", 960); h = spec.get("height", 600 if panel else 540)
    x0, x1 = 32, w - 168
    y_top = 132; y_bot = h - (230 if panel else 92)
    unit = spec.get("unit", "")
    all_pts = [p for s in series for p in data[s["key"]]]
    d0 = min(_d(p[0]) for p in all_pts); d1 = max(_d(p[0]) for p in all_pts)
    vals = [p[1] for p in all_pts]
    lo, hi = min(vals), max(vals)
    if spec.get("y_min") is not None: lo = min(lo, spec["y_min"])
    pad = (hi - lo) * 0.06
    ticks, step = nice_ticks(lo if spec.get("y_min") is not None else lo - pad, hi + pad, spec.get("y_ticks", 5))
    ylo, yhi = ticks[0], ticks[-1]
    span = (d1 - d0).days or 1
    X = lambda d: x0 + (_d(d) - d0).days / span * (x1 - x0) if isinstance(d, str) else x0 + (d - d0).days / span * (x1 - x0)
    Y = lambda v: y_bot - (v - ylo) / (yhi - ylo) * (y_bot - y_top)
    o = [_open(w, h, spec, uid), _header(w, spec)]
    for t in ticks:
        y = Y(t); zero = abs(t) < 1e-9
        o.append(f'<line x1="{x0}" x2="{x1}" y1="{y:.1f}" y2="{y:.1f}" stroke="{RULE2 if zero else RULE}"/>')
        o.append(f'<text x="{x0}" y="{y-6:.1f}" font-family="{MONO}" font-size="12" fill="{MUTED}" paint-order="stroke" stroke="{INK}" stroke-width="5" stroke-linejoin="round">{fmt_num(t, step, unit)}</text>')
    xt_y = (h - 204) if panel else (h - 70)
    mts = month_ticks(d0, d1)
    for d in mts:
        x = X(d)
        anc = "start" if x - x0 < 26 else "middle"
        lab = MONTHS[d.month-1] + (f" ’{str(d.year)[2:]}" if d.month == 1 or d == mts[0] else "")
        o.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{y_bot}" y2="{y_bot+5}" stroke="{RULE2}"/>')
        o.append(f'<text x="{x:.1f}" y="{xt_y}" text-anchor="{anc}" font-family="{MONO}" font-size="12" fill="{MUTED}">{lab}</text>')
    for a in spec.get("annotations", []):
        x = X(a["date"])
        o.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{y_top-4}" y2="{y_bot}" stroke="{SIGNAL}" stroke-opacity=".55" stroke-dasharray="3 4"/>')
        anchor = a.get("anchor", "start"); dx = 6 if anchor == "start" else -6
        o.append(f'<text x="{x+dx:.1f}" y="{y_top+8}" text-anchor="{anchor}" font-family="{MONO}" font-size="11" fill="{SIGNAL}">{_e(a["text"])}</text>')
    labels = []
    for i, s in enumerate(series):
        pts = [(X(d), Y(v)) for d, v in data[s["key"]]]
        col = s.get("color", PALETTE[i % len(PALETTE)])
        wdt = s.get("width", 2.4 if i == 0 else 2)
        dash = ' stroke-dasharray="6 5"' if s.get("dashed") else ""
        o.append(f'<path d="{_path(pts, s.get("step"))}" fill="none" stroke="{col}" stroke-width="{wdt}" stroke-linejoin="round" stroke-linecap="round"{dash}/>')
        lx, ly = pts[-1]
        if s.get("step"): lx = x1
        o.append(f'<circle cx="{lx:.1f}" cy="{ly:.1f}" r="3.6" fill="{col}" stroke="{INK}" stroke-width="1.5"/>')
        last = data[s["key"]][-1]
        dec = spec.get("label_decimals", 1)
        labels.append({"y": ly, "col": col, "name": s["label"], "val": f"{last[1]:,.{dec}f}".replace("-", "−") + unit, "ly": ly, "lx": lx})
    for it in labels: it["lines"] = _wrap(it["name"], 20)
    gap = 36 + 15 * max(len(it["lines"]) - 1 for it in labels)
    for it in _spread_labels(labels, y_top + 4, y_bot - 15 * max(len(it["lines"]) - 1 for it in labels), gap):
        tx = x1 + 14
        o.append(f'<path d="M{it["lx"]+5:.1f},{it["ly"]:.1f} L{tx-3},{it["y"]:.1f}" stroke="{it["col"]}" stroke-opacity=".5" fill="none"/>')
        tw = 9 + 7.4 * len(it["val"])
        o.append(f'<rect x="{tx}" y="{it["y"]-11:.1f}" width="{tw:.1f}" height="20" rx="3" fill="{it["col"]}"/>')
        o.append(f'<text x="{tx+5}" y="{it["y"]+4:.1f}" font-family="{MONO}" font-weight="600" font-size="12.5" fill="{INK}">{_e(it["val"])}</text>')
        for li, ln in enumerate(it["lines"]):
            o.append(f'<text x="{tx}" y="{it["y"]+24+15*li:.1f}" font-family="{SANS}" font-size="12.5" fill="{it["col"]}">{_e(ln)}</text>')
    if panel:
        pk = panel["key"]; pts_raw = data[pk]
        py_top, py_bot = h - 176, h - 72
        pv = [v for _, v in pts_raw]; plo = min(pv) if min(pv) < -0.08 * max(pv) else 0
        pt, pstep = nice_ticks(plo, max(pv), 2)
        PY = lambda v: py_bot - (v - pt[0]) / (pt[-1] - pt[0]) * (py_bot - py_top)
        o.append(f'<text x="{x0}" y="{py_top-14}" font-family="{SANS}" font-weight="700" font-size="13" fill="{TEXT}">{_e(panel["label"])}</text>')
        for t in pt:
            y = PY(t)
            o.append(f'<line x1="{x0}" x2="{x1}" y1="{y:.1f}" y2="{y:.1f}" stroke="{RULE2 if abs(t)<1e-9 else RULE}"/>')
            o.append(f'<text x="{x1+8}" y="{y+4:.1f}" font-family="{MONO}" font-size="11" fill="{MUTED}">{fmt_num(t, pstep, unit)}</text>')
        pts = [(X(d), PY(v)) for d, v in pts_raw]
        col = panel.get("color", PALETTE[2])
        area = _path(pts) + f"L{pts[-1][0]:.1f},{PY(0):.1f}L{pts[0][0]:.1f},{PY(0):.1f}Z"
        o.append(f'<path d="{area}" fill="{col}" fill-opacity=".18"/>')
        o.append(f'<path d="{_path(pts)}" fill="none" stroke="{col}" stroke-width="1.8"/>')
        lv = pts_raw[-1][1]
        dec = spec.get("label_decimals", 1); val = f"{lv:,.{dec}f}".replace("-", "−") + unit
        tw = 9 + 7.4 * len(val); ty = pts[-1][1]
        o.append(f'<circle cx="{pts[-1][0]:.1f}" cy="{ty:.1f}" r="3.2" fill="{col}" stroke="{INK}" stroke-width="1.5"/>')
        o.append(f'<rect x="{x1+46}" y="{ty-10:.1f}" width="{tw:.1f}" height="20" rx="3" fill="{col}"/>')
        o.append(f'<text x="{x1+51}" y="{ty+4:.1f}" font-family="{MONO}" font-weight="600" font-size="12.5" fill="{INK}">{_e(val)}</text>')
        for a in spec.get("annotations", []):
            x = X(a["date"])
            o.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{py_top}" y2="{py_bot}" stroke="{SIGNAL}" stroke-opacity=".35" stroke-dasharray="3 4"/>')
    o.append(_footer(w, h, spec)); o.append("</svg>")
    return "".join(o)

def hbar_chart(spec, rows, uid="c"):
    """rows: [{label, value, derived?, color?, note?}]"""
    w = spec.get("width", 960); n = len(rows)
    row_h = 74; top = 140; h = spec.get("height", top + n * row_h + 70)
    lab_w = 0; x0 = 32; x1 = w - 120
    vmax = max(r["value"] for r in rows) * 1.05
    ticks, step = nice_ticks(0, vmax, 4)
    X = lambda v: x0 + v / ticks[-1] * (x1 - x0)
    o = [_open(w, h, spec, uid), _header(w, spec)]
    for t in ticks:
        x = X(t)
        o.append(f'<line x1="{x:.1f}" x2="{x:.1f}" y1="{top-6}" y2="{top + n*row_h - 14}" stroke="{RULE2 if t==0 else RULE}"/>')
        o.append(f'<text x="{x:.1f}" y="{top + n*row_h + 4}" text-anchor="middle" font-family="{MONO}" font-size="12" fill="{MUTED}">{fmt_num(t, step)}</text>')
    unit = spec.get("unit", "")
    for i, r in enumerate(rows):
        y = top + i * row_h
        col = r.get("color", PALETTE[i % len(PALETTE)])
        o.append(f'<text x="{x0}" y="{y+12}" font-family="{SANS}" font-weight="700" font-size="14" fill="{TEXT}">{_e(r["label"])}</text>')
        if r.get("note"):
            o.append(f'<text x="{x1+88}" y="{y+12}" text-anchor="end" font-family="{MONO}" font-size="11" fill="{FAINT}">{_e(r["note"])}</text>')
        bw = X(r["value"]) - x0
        fill = f'url(#{uid}-hatch)' if r.get("derived") else col
        o.append(f'<rect x="{x0}" y="{y+22}" width="{bw:.1f}" height="26" rx="2" fill="{fill}"' + (f' stroke="{SIGNAL}" stroke-width="1.2"' if r.get("derived") else '') + '/>')
        o.append(f'<text x="{x0+bw+10:.1f}" y="{y+41}" font-family="{MONO}" font-weight="600" font-size="15" fill="{col if not r.get("derived") else SIGNAL}">{fmt_num(r["value"], 0.1)}{_e(unit)}</text>')
    o.append(_footer(w, h, spec)); o.append("</svg>")
    return "".join(o)
