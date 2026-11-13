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

# ---- Chart headline budget (Desk Plate, 960px wide)
# The title is drawn at 30px Newsreader SemiBold, x=32. A title wider than the
# plate used to clip mid-word (e.g. "a working week that more than ha").
# Writers: at most TITLE_MAX_CHARS characters, and at most TITLE_MAX_PX pixels.
# The renderer wraps as a last-resort safety net so nothing is ever clipped;
# a title that needs wrapping still fails validate.py — shorten it.
TITLE_MAX_CHARS = 60
TITLE_MAX_PX = 900          # 30px Newsreader SemiBold; 32px left, 28px right pad
TITLE_CLIP_PX = 928         # wrap only when a line would run past this (near the edge)
TITLE_SIZE = 30
TITLE_LINE = 36             # line-height when a title wraps
SUB_SIZE = 15
SUB_LINE = 20
# Charts published before the 13 Nov 2026 headline rule, whose titles exceed
# the budget. Their already-published plates are left unchanged. Do not copy
# these titles; new specs (and any revision of today's charts) must pass.
HEADLINE_GRANDFATHERED = frozenset({
    # Already published before 13 Nov 2026; titles may exceed the budget or
    # (in a few cases) clip on the plate. Do not copy these titles.
    "asia-monday-open-09nov",
    "asia-thursday-12nov",
    "asia-wednesday-11nov",
    "china-pmi-falls-02nov",
    "de-october-mix-29pm",
    "de-power-day-ahead-08nov",
    "de-power-day-ahead-09nov",
    "de-power-day-ahead-10pm",
    "de-power-day-ahead-11pm",
    "de-power-day-ahead-22oct",
    "europe-results-movers-12pm",
    "europe-sectors-11pm",
    "madeira-rain-6h-11nov",
    "measles-infant-seropositive-23oct",
    "us-poll-closings-03nov",
    "ust-vote-vs-october-05nov",
})

# Newsreader SemiBold (wght 600, opsz 30) advance widths at 30px, in CSS pixels.
# Packed as "codepoint:width,..." so the validator and the renderer share one ruler.
_NW30 = {int(k): float(v) for k, v in (p.split(":") for p in """32:6.42,33:8.21,34:11.29,35:18.11,36:18.11,37:24.55,38:21.99,39:6.0,40:8.46,41:8.46,42:12.54,43:15.49,44:7.35,45:10.32,46:7.18,47:11.73,48:18.11,49:18.11,50:18.11,51:18.11,52:18.11,53:18.11,54:18.11,55:18.11,56:18.11,57:18.11,58:7.88,59:8.14,60:15.49,61:15.49,62:15.49,63:13.74,64:26.62,65:22.12,66:20.32,67:21.15,68:23.25,69:19.8,70:18.25,71:22.79,72:24.7,73:10.81,74:13.44,75:22.91,76:18.77,77:30.32,78:22.86,79:23.5,80:19.21,81:23.5,82:20.7,83:17.1,84:20.82,85:23.2,86:21.36,87:30.36,88:22.2,89:21.3,90:19.44,91:9.24,92:11.73,93:9.24,94:15.49,95:12.3,96:15.0,97:14.38,98:16.75,99:13.53,100:17.04,101:14.12,102:10.96,103:15.21,104:17.25,105:8.76,106:8.04,107:16.91,108:8.47,109:25.48,110:17.55,111:16.0,112:17.16,113:16.71,114:12.6,115:11.85,116:11.1,117:16.75,118:16.11,119:23.07,120:15.66,121:16.18,122:13.54,123:9.11,124:6.86,125:9.11,126:15.49,163:18.11,165:18.11,171:14.7,176:11.21,177:15.49,181:17.67,183:7.58,187:15.39,192:22.12,193:22.12,195:22.12,196:22.12,197:22.12,198:30.61,200:19.8,201:19.8,204:10.81,205:10.81,210:23.5,211:23.5,213:23.5,214:23.5,215:15.49,216:23.86,217:23.2,218:23.2,220:23.2,223:19.39,224:14.38,225:14.38,226:14.38,227:14.38,228:14.38,229:14.38,230:21.52,231:13.53,232:14.12,233:14.12,234:14.12,235:14.12,237:8.76,238:8.76,239:8.76,241:17.55,243:16.0,244:16.0,245:16.0,246:16.0,247:15.49,248:16.48,249:16.75,250:16.75,251:16.75,252:16.75,338:32.31,339:24.48,8211:14.89,8212:19.84,8216:7.21,8217:7.26,8220:13.21,8221:13.24,8226:12.18,8230:20.67,8240:36.15,8364:18.11,8722:15.49""".split(","))}
_NW_FALLBACK = 30.36  # capital W; used for a missing glyph (conservative)

def title_width(text, size=TITLE_SIZE):
    """Pixel width of `text` at Newsreader SemiBold `size` (default 30px), no kerning.
    A 2% safety margin is applied so we do not under-estimate against Chrome."""
    if not text:
        return 0.0
    raw = sum(_NW30.get(ord(ch), _NW_FALLBACK) for ch in text) * (size / TITLE_SIZE)
    return raw * 1.02

def wrap_headline(text, max_px=TITLE_MAX_PX, size=TITLE_SIZE):
    """Word-wrap `text` so each line is at most max_px wide. A single overlong
    word is placed on its own line (the validator then fails it)."""
    words = text.split()
    if not words:
        return [""]
    lines, cur = [], words[0]
    for w_ in words[1:]:
        trial = cur + " " + w_
        if title_width(trial, size) <= max_px:
            cur = trial
        else:
            lines.append(cur)
            cur = w_
    lines.append(cur)
    return lines

def headline_problems(spec):
    """Return a list of validator messages; empty if the title is within budget.
    Grandfathered published charts are skipped. The pixel check is the one that
    matches what the plate actually clips."""
    cid = spec.get("id", "?")
    if cid in HEADLINE_GRANDFATHERED:
        return []
    title = spec.get("title") or ""
    out = []
    n = len(title)
    w = title_width(title)
    if n > TITLE_MAX_CHARS:
        out.append(
            f"chart {cid}: title is {n} characters (budget {TITLE_MAX_CHARS}). "
            "Shorten the headline so it still carries the key message; put extra context in the subtitle."
        )
    if w > TITLE_MAX_PX:
        out.append(
            f"chart {cid}: title is {w:.0f}px wide at 30px Newsreader SemiBold "
            f"(budget {TITLE_MAX_PX}px) and would be truncated on the plate. Shorten it."
        )
    lines = wrap_headline(title, TITLE_MAX_PX)
    if len(lines) > 2:
        out.append(f"chart {cid}: title would need {len(lines)} lines on the plate (maximum 2). Shorten it.")
    for ln in lines:
        if title_width(ln) > TITLE_CLIP_PX:
            out.append(f"chart {cid}: a word in the title is too wide to fit on the plate without clipping ({ln!r}).")
    return out

# Dark (terminal) colours are the defaults baked into every plate. The paper
# (light) variant is a recolour of the same SVG, used for -paper.svg / -paper.png
# and switched with the reader's theme. Values match --pl-* in desk.css.
PAPER_MAP = {
    "#0D1015": "#FFFCF6",
    "#141922": "#F3ECDF",
    "rgba(236,231,220,0.11)": "rgba(28,26,22,0.12)",
    "rgba(236,231,220,0.28)": "rgba(28,26,22,0.30)",
    "#ECE7DC": "#1A1A1D",
    "#9AA3AE": "#4A4F57",
    "#6B7480": "#62676F",
    "#F2A93B": "#A45A00",
    "#4CC9B0": "#0A7564",
    "#FF7A5C": "#C2401B",
    "#A99BFF": "#6A4FC9",
    "#C9D1D9": "#3F4752",
    "#7FB2FF": "#1F5FAF",
}

def recolour(svg, theme="paper"):
    """Return a copy of a terminal-palette SVG recoloured for `theme` ('paper').
    Longer colour strings are replaced first so they cannot be partially matched."""
    if theme != "paper":
        return svg
    out = svg
    for src, dst in sorted(PAPER_MAP.items(), key=lambda kv: -len(kv[0])):
        out = out.replace(src, dst)
        out = out.replace(src.upper(), dst)
        out = out.replace(src.lower(), dst)
    return out

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
    """Kicker, title and subtitle. Returns (svg, extra_height).

    When the title and subtitle each fit on one line, the markup and the
    height are byte-identical to the original single-line header, so already
    published plates are not redrawn. Longer text is wrapped (never clipped)
    and the plot is shifted down by extra_height.
    """
    k = _e(spec.get("kicker", "CHART").upper())
    title = spec["title"]
    sub = spec.get("subtitle", "") or ""
    t_lines = wrap_headline(title, TITLE_CLIP_PX, TITLE_SIZE)
    s_lines = wrap_headline(sub, TITLE_CLIP_PX, SUB_SIZE) if sub else [""]
    # Single-line path: keep the exact historical markup.
    if len(t_lines) == 1 and len(s_lines) <= 1:
        return ((f'<rect x="32" y="22" width="36" height="3" fill="{SIGNAL}"/>'
                 f'<text x="80" y="27" font-family="{MONO}" font-size="11" letter-spacing="1.6" fill="{SIGNAL}">{k}</text>'
                 f'<text x="32" y="66" font-family="{SERIF}" font-weight="600" font-size="30" fill="{TEXT}">{_e(title)}</text>'
                 f'<text x="32" y="94" font-family="{SANS}" font-size="15" fill="{MUTED}">{_e(sub)}</text>'), 0)
    parts = [f'<rect x="32" y="22" width="36" height="3" fill="{SIGNAL}"/>',
             f'<text x="80" y="27" font-family="{MONO}" font-size="11" letter-spacing="1.6" fill="{SIGNAL}">{k}</text>']
    for i, ln in enumerate(t_lines):
        parts.append(f'<text x="32" y="{66 + i * TITLE_LINE}" font-family="{SERIF}" font-weight="600" font-size="30" fill="{TEXT}">{_e(ln)}</text>')
    extra_t = (len(t_lines) - 1) * TITLE_LINE
    sub_y = 94 + extra_t
    for i, ln in enumerate(s_lines):
        parts.append(f'<text x="32" y="{sub_y + i * SUB_LINE}" font-family="{SANS}" font-size="15" fill="{MUTED}">{_e(ln)}</text>')
    extra_s = max(0, (len(s_lines) - 1) * SUB_LINE)
    # A little air between a wrapped subtitle and the plot.
    extra = extra_t + extra_s + (8 if extra_s or extra_t else 0)
    return "".join(parts), extra

# ---- Source line vs the INSIDE DESK wordmark (Desk Plate footer)
# JetBrains Mono is 0.6em wide (6.6px at 11px). The wordmark's amber square sits at
# x=w-140 (820 on a 960px plate). A long source_line used to run into the wordmark
# (e.g. "...(Friday 13 Nov €1...INSIDE DESK...r 12"). The renderer truncates with
# an ellipsis so the source never reaches the square; the full line stays in the
# figcaption and the CSV. Wrapping would change the plate height, so we ellipsis.
SOURCE_SIZE = 11
SOURCE_PREFIX = "SOURCE "
MONO_ADVANCE = 0.6          # em, JetBrains Mono
WORDMARK_SQUARE = 140       # square at x=w-140
SOURCE_GAP = 8              # px between the source and the square

def mono_width(text, size=SOURCE_SIZE):
    """Pixel width of JetBrains Mono `text` at `size` (default 11px). No kerning."""
    return len(text) * MONO_ADVANCE * size

def source_max_px(w=960):
    """Rightmost width allowed for 'SOURCE ' + source text, left inset 32px."""
    return (w - WORDMARK_SQUARE) - SOURCE_GAP - 32  # 780 on a 960px plate

def fit_source_line(src, w=960):
    """Source text as drawn after 'SOURCE '. Unchanged when it already fits
    (so published plates with a short source stay byte-identical); otherwise
    truncated at a word boundary and ended with an ellipsis."""
    src = src or ""
    avail = source_max_px(w)
    if mono_width(SOURCE_PREFIX + src) <= avail:
        return src
    ell = "…"
    # Characters of src that leave room for the prefix and the ellipsis.
    n = int((avail - mono_width(SOURCE_PREFIX + ell)) / (MONO_ADVANCE * SOURCE_SIZE))
    n = max(0, min(n, len(src)))
    cut = src[:n]
    # Walk back only when the cut is mid-word, so a source that lands on a
    # boundary keeps the last whole word (e.g. "Friday 13 Nov…" not "Friday 13…").
    mid_word = n < len(src) and cut and cut[-1] not in " ,;:·|/" and src[n] not in " ,;:·|/"
    if mid_word:
        for i in range(len(cut) - 1, int(n * 0.6), -1):
            if cut[i] in " ,;:·|/":
                cut = cut[:i]
                break
    return cut.rstrip(" ,;:·|/") + ell

def source_line_problems(spec, w=960):
    """Validator: the fitted footer source must never reach the wordmark."""
    cid = spec.get("id", "?")
    fitted = fit_source_line(spec.get("source_line") or "", w)
    width = mono_width(SOURCE_PREFIX + fitted)
    avail = source_max_px(w)
    if width > avail:
        return [f"chart {cid}: fitted source line is {width:.0f}px (budget {avail}px) and would collide with the INSIDE DESK wordmark."]
    return []

def _footer(w, h, spec):
    raw = spec.get("source_line", "") or ""
    fitted = fit_source_line(raw, w)
    src = _e(fitted)
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
    w = spec.get("width", 960)
    hdr, extra = _header(w, spec)
    h = spec.get("height", 600 if panel else 540) + extra
    x0, x1 = 32, w - 168
    y_top = 132 + extra; y_bot = h - (230 if panel else 92)
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
    o = [_open(w, h, spec, uid), hdr]
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
    hdr, extra = _header(w, spec)
    row_h = 74; top = 140 + extra; h = spec.get("height", 140 + n * row_h + 70) + extra
    lab_w = 0; x0 = 32; x1 = w - 120
    vmax = max(r["value"] for r in rows) * 1.05
    ticks, step = nice_ticks(0, vmax, 4)
    X = lambda v: x0 + v / ticks[-1] * (x1 - x0)
    o = [_open(w, h, spec, uid), hdr]
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
