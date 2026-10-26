#!/usr/bin/env python3
"""Inside Desk — one-command publisher.

  python3 insidedesk/tools/build.py            # fetch data, draw charts, build every page
  python3 insidedesk/tools/build.py --offline  # reuse committed CSVs (no network)
  python3 insidedesk/tools/build.py --no-png   # skip PNG/OG rendering (no Chrome needed)

Run from the repository root. Writes ONLY to InsideDesk.html and insidedesk/**.
"""
import sys; sys.dont_write_bytecode = True
import argparse, csv, datetime as dt, hashlib, html, json, os, posixpath, re, shutil, subprocess, sys, tempfile
from zoneinfo import ZoneInfo
from email.utils import format_datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import yaml, markdown  # pip install pyyaml markdown
import sources, charts, epaper, proc

ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))      # repo root
# Box Chrome hangs headless since 23 Oct 2026; prefer the build-only Chrome-for-Testing copy when present.
_CHS = "/workspace/chs/bin"
if os.path.isdir(_CHS) and os.access(os.path.join(_CHS, "google-chrome"), os.X_OK):
    os.environ["PATH"] = _CHS + os.pathsep + os.environ.get("PATH", "")
DESK = os.path.join(ROOT, "insidedesk")
CONTENT = os.path.join(DESK, "content")
BASE = "https://benjaminkoch.info/"
HOME = "InsideDesk.html"
TZ = ZoneInfo("Europe/Berlin")
SUPPORT_URL = "https://www.paypal.me/quietcontinuity"
SUPPORT_HANDLE = "quietcontinuity"
AMOUNTS = [3, 8, 25]
AUTHOR = "Dr. Benjamin Koch"
DESCRIPTION = ("A twice-daily brief on markets, geo-economics, politics, psychology and ordinary life. "
               "Optimistic by habit. Data first. Commentary, not advice.")
PUBLISHER = dict(name="Dr. Benjamin Koch", service="Inside Desk", careOf="c/o MDC Management #1409",
                 street="Welserstraße 3", zip="87463", city="Dietmannsried",
                 country="Germany (managed business address; letters only; no parcels)",
                 visdp="Dr. Benjamin Koch", email="insidedesk@benjaminkoch.info")
DESKS = {
    "markets": ("Markets & Macro", "MARKETS"), "geoecon": ("Geo-economics", "GEO-ECON"),
    "politics": ("Politics & Institutions", "POLITICS"), "psych": ("Psychology & Behaviour", "PSYCHOLOGY"),
    "energy": ("Energy & Industry", "ENERGY"), "money": ("Money, FX & Committees", "MONEY"),
    "ordinary": ("Ordinary & Inherited Life", "ORDINARY"), "tech": ("Tech & Compute", "TECH"),
    "health": ("Health & Care", "HEALTH"), "security": ("Security & Order", "SECURITY"),
    "climate": ("Climate & Weather", "CLIMATE"),
}
FORMATS = {"lead": "Lead", "note": "Desk note", "podium-vs-print": "Podium vs Print", "sunday": "Sunday long-read", "annex": "The Annex"}
SLOTS = {"am": ("Morning edition", "morning", "08:30"), "pm": ("Evening edition", "evening", "17:30"), "sun": ("Sunday long-read", "sunday", "10:00")}
INSIGHTS = [
    ("Price is the judge, time is the jury", "Stories are the audience. They are allowed to stay if they buy a ticket in cash flow."),
    ("Optimism is a risk limit", "Not a mood. A rule: we will not rent our nervous system to people who profit from our panic."),
    ("Institutions beat influencers", "On any horizon longer than a week, the annex outperforms the clip."),
    ("The inherited and the ordinary rhyme", "Both are one sequence away from needing a plan. Write for the sequence."),
    ("Physics, then politics", "Energy, food, housing, sleep. After those, you may have a take."),
    ("No public comment board", "Not because we fear argument. Because we refuse to host harm."),
    ("One desk, many time zones", "Precision over performance. The letter is written once, read everywhere."),
    ("Weekdays for the pulse, Sunday for the week", "Morning to aim. Evening to admit. Sunday to keep the sequence honest."),
]
e = lambda s: html.escape(str(s if s is not None else ""), quote=True)

# ----------------------------------------------------------------- helpers
def write(rel_path, text):
    path = os.path.join(ROOT, rel_path)
    assert rel_path == HOME or rel_path.startswith("insidedesk/"), "refusing to write outside Inside Desk: " + rel_path
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)

def rel(from_page, to_path):
    d = posixpath.dirname(from_page) or "."
    return posixpath.relpath(to_path, d)

def tzlabel(t): return t.strftime("%Z")  # CET / CEST, correct for the date
def pretty_day(d): return d.strftime("%A, %-d %B %Y")
def short_day(d): return d.strftime("%-d %b %Y")

def load_yaml(p):
    with open(p, encoding="utf-8") as f: return yaml.safe_load(f)

def front_matter(p):
    txt = open(p, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", txt, re.S)
    return yaml.safe_load(m.group(1)), m.group(2)

# ----------------------------------------------------------------- data + charts
def chart_specs():
    out = {}
    d = os.path.join(CONTENT, "charts")
    for fn in sorted(os.listdir(d)):
        if fn.endswith(".yaml"):
            s = load_yaml(os.path.join(d, fn)); out[s["id"]] = s
    return out

def fetch_chart_data(spec):
    if spec["kind"] == "hbar":
        return None
    cols = {}
    for s in spec["series"]:
        src = dict(s["source"]); src.setdefault("start", spec.get("start"))
        pts = sources.fetch(src)
        if s.get("transform") == "month_end": pts = sources.month_end(pts)
        if not pts: raise ValueError(f"source returned no data for series {s['key']!r}")
        cols[s["key"]] = pts
    for dv in spec.get("derive", []):
        a, op, b = dv["expr"].split()
        A, B = dict(cols[a]), dict(cols[b])
        cols[dv["key"]] = [(d, round(A[d] - B[d] if op == "-" else A[d] + B[d], 4)) for d in sorted(A) if d in B]
    dates = sorted({d for pts in cols.values() for d, _ in pts})
    keys = list(cols)
    lookup = {k: dict(v) for k, v in cols.items()}
    path = os.path.join(DESK, "data", spec["id"] + ".csv")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["# Inside Desk chart data: " + spec["id"]])
        w.writerow(["# Source: " + spec["source_line"]])
        w.writerow(["# Licence: " + sources.LICENCES[spec["licence"]] + (" " + sources.LICENCES[spec["licence_extra"]] if spec.get("licence_extra") else "")])
        w.writerow(["# Retrieved: " + dt.datetime.now(TZ).isoformat(timespec="minutes")])
        w.writerow(["date"] + keys)
        for d in dates:
            w.writerow([d] + [lookup[k].get(d, "") for k in keys])

def read_chart_csv(spec):
    path = os.path.join(DESK, "data", spec["id"] + ".csv")
    rows = [r for r in csv.reader(open(path, encoding="utf-8")) if r and not r[0].startswith("#")]
    head, body = rows[0], rows[1:]
    cols = {k: [] for k in head[1:]}
    for r in body:
        for k, v in zip(head[1:], r[1:]):
            if v != "": cols[k].append((r[0], float(v)))
    meta = [r[0] for r in csv.reader(open(path, encoding="utf-8")) if r and r[0].startswith("#")]
    return cols, meta

def write_hbar_csv(spec):
    path = os.path.join(DESK, "data", spec["id"] + ".csv")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["# Inside Desk chart data: " + spec["id"]]); w.writerow(["# Source: " + spec["source_line"]])
        w.writerow(["# Licence: " + sources.LICENCES[spec["licence"]]])
        w.writerow(["label", "value", "derived_by_inside_desk", "note"])
        for r in spec["rows"]:
            w.writerow([r["label"], r["value"], "yes" if r.get("derived") else "no", r.get("note", "")])

def render_chart(spec):
    """Returns (svg, summary_rows) and writes insidedesk/charts/<id>.svg"""
    if spec["kind"] == "hbar":
        write_hbar_csv(spec)
        svg = charts.hbar_chart({**spec, "alt_full": spec["alt"]}, spec["rows"], uid=spec["id"])
        table = [("", "Value")] + [(r["label"] + (" (Inside Desk arithmetic)" if r.get("derived") else ""), f'{r["value"]:g}{spec.get("unit","")}') for r in spec["rows"]]
    else:
        cols, _ = read_chart_csv(spec)
        last = []
        for s in spec["series"]:
            d, v = cols[s["key"]][-1]; last.append(f'{s["label"]} {v:g}{spec.get("unit","")} ({d[:7] if d.endswith("-01") and spec.get("unit")=="%" else d})')
        alt_full = spec["alt"] + " Latest values: " + "; ".join(last) + "."
        svg = charts.line_chart({**spec, "alt_full": alt_full}, cols, uid=spec["id"])
        keys = [s["key"] for s in spec["series"]] + ([spec["panel"]["key"]] if spec.get("panel") else [])
        labels = [s["label"] for s in spec["series"]] + ([spec["panel"]["label"]] if spec.get("panel") else [])
        allrows = sorted({d for k in keys for d, _ in cols[k]})[-6:]
        lk = {k: dict(cols[k]) for k in keys}
        table = [("Date",) + tuple(labels)] + [(d,) + tuple((f"{lk[k][d]:g}" if d in lk[k] else "–") for k in keys) for d in allrows]
    standalone = svg.replace('<defs>', '<defs><style>@font-face{font-family:Newsreader;font-weight:600;src:url(../assets/fonts/newsreader-disp.woff2) format("woff2")}'
                                        '@font-face{font-family:"Familjen Grotesk";src:url(../assets/fonts/familjen.woff2) format("woff2")}'
                                        '@font-face{font-family:"JetBrains Mono";src:url(../assets/fonts/jetbrains-mono.woff2) format("woff2")}</style>', 1)
    write(f"insidedesk/charts/{spec['id']}.svg", '<?xml version="1.0" encoding="UTF-8"?>\n' + standalone)
    return svg, table

FONT_CSS_FILE = None
def font_css_abs():
    f = os.path.join(DESK, "assets", "fonts")
    return (f'@font-face{{font-family:Newsreader;font-weight:400;src:url(file://{f}/newsreader-text.woff2)}}'
            f'@font-face{{font-family:Newsreader;font-weight:600;src:url(file://{f}/newsreader-disp.woff2)}}'
            f'@font-face{{font-family:"Familjen Grotesk";font-weight:500 700;src:url(file://{f}/familjen.woff2)}}'
            f'@font-face{{font-family:"JetBrains Mono";font-weight:400 600;src:url(file://{f}/jetbrains-mono.woff2)}}')

def chrome_shot(html_text, out_path, w, h, scale=1):
    chrome = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome: print("  ! no Chrome found, skipping", out_path); return False
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    work = tempfile.mkdtemp(prefix="shot-")   # inside the per-run dir (proc.run_dir sets TMPDIR); removed below
    try:
        tmp = os.path.join(work, "page.html")
        with open(tmp, "w", encoding="utf-8") as t: t.write(html_text)
        proc.run([chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
                  f"--user-data-dir={os.path.join(work, 'profile')}",
                  f"--force-device-scale-factor={scale}", f"--window-size={w},{h}", "--virtual-time-budget=3000",
                  f"--screenshot={out_path}", "file://" + tmp], timeout=90)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    return os.path.exists(out_path)

def chart_png(spec, svg, force=False):
    """Rasterise the SVG. Skipped when the PNG is already present and still matches this SVG (sha sidecar),
    so a release does not relaunch Chrome ~40 times for unchanged older charts."""
    out = os.path.join(DESK, "charts", spec["id"] + ".png")
    hf = out + ".sha256"
    dig = hashlib.sha256(svg.encode()).hexdigest()
    if not force and os.path.exists(out) and os.path.exists(hf) and open(hf).read().strip() == dig:
        return False
    m = re.search(r'viewBox="0 0 (\d+) (\d+)"', svg); w, h = int(m.group(1)), int(m.group(2))
    page = f'<!doctype html><meta charset=utf-8><style>{font_css_abs()}html,body{{margin:0;background:#0D1015}}svg{{display:block}}</style>{svg}'
    ok = chrome_shot(page, out, w, h, scale=2)
    if ok: open(hf, "w").write(dig + "\n")
    return ok

# ----------------------------------------------------------------- content model
class Article:
    pass

def load_editions(specs):
    eds = []
    root = os.path.join(CONTENT, "editions")
    for name in sorted(os.listdir(root)):
        ed = load_yaml(os.path.join(root, name, "edition.yaml"))
        ed["key"] = name
        ed["pub"] = dt.datetime.fromisoformat(ed["published"]).astimezone(TZ)
        d = dt.date.fromisoformat(ed["date"])
        ed["d"] = d
        ed["slot_name"], ed["slot_slug"], ed["slot_time"] = SLOTS[ed["slot"]]
        ed["path"] = f"insidedesk/{d:%Y/%m/%d}/{ed['slot_slug']}.html"
        arts = []
        for i, slug in enumerate(ed["articles"]):
            fm, body = front_matter(os.path.join(root, name, slug + ".md"))
            a = Article(); a.__dict__.update(fm)
            a.slug = slug; a.edition = ed; a.order = i
            a.path = f"insidedesk/{d:%Y/%m/%d}/{slug}.html"
            a.url = BASE + a.path
            # a note added to an edition after it went out carries its own, real publish time
            a.pub = dt.datetime.fromisoformat(str(fm["published"])).astimezone(TZ) if fm.get("published") else ed["pub"]
            a.body_md = body
            a.charts = fm.get("charts") or []
            words = len(re.sub(r"\[\[.*?\]\]|\[\d+\]", "", body).split())
            a.minutes = max(2, round(words / 220))
            a.desk_name, a.kicker = DESKS[a.desk]
            a.format_name = FORMATS.get(a.format, "Desk note")
            a.og = f"insidedesk/og/{d:%Y-%m-%d}-{slug}.png"
            a.ledger = None
            arts.append(a)
        ed["arts"] = arts
        if ed.get("closing"):
            c = ed["closing"]
            c["pub"] = dt.datetime.fromisoformat(str(c["published"])).astimezone(TZ) if c.get("published") else ed["pub"]
        missing = [k for k in DESKS if k not in {x.desk for x in arts}]
        if missing:  # house rule: every edition covers every desk (one lead + notes)
            sys.exit(f"edition {name} is missing desk(s): {', '.join(missing)}")
        eds.append(ed)
    eds.sort(key=lambda x: x["pub"], reverse=True)
    return eds

def load_ledger():
    """Look-back series. Pieces are filed under their EVENT date; machine metadata uses the real publish time."""
    root = os.path.join(CONTENT, "ledger")
    if not os.path.exists(os.path.join(root, "series.yaml")):
        return None
    se = load_yaml(os.path.join(root, "series.yaml"))
    se["pub"] = dt.datetime.fromisoformat(se["published"]).astimezone(TZ)
    arts = []
    for i, key in enumerate(se["pieces"]):
        fm, body = front_matter(os.path.join(root, key + ".md"))
        a = Article(); a.__dict__.update(fm)
        a.ledger = se; a.edition = None; a.order = i; a.format = "ledger"; a.format_name = se["title"]
        a.event_d = dt.date.fromisoformat(str(fm["event_date"]))
        a.path = f"insidedesk/{a.event_d:%Y/%m/%d}/{a.slug}.html"
        a.url = BASE + a.path
        a.pub = se["pub"]
        a.body_md = body
        a.charts = fm.get("charts") or []
        words = len(re.sub(r"\[\[.*?\]\]|\[\d+\]", "", body).split())
        a.minutes = max(2, round(words / 220))
        a.desk_name, a.kicker = DESKS[a.desk]
        a.og = f"insidedesk/og/ledger-{a.event_d:%Y-%m}-{a.slug}.png"
        arts.append(a)
    se["arts"] = arts
    return se

# ----------------------------------------------------------------- page chrome
def head(page, title, desc, canonical, og_image, og_type="website", jsonld=None, extra=""):
    css = rel(page, "insidedesk/assets/desk.css"); js = rel(page, "insidedesk/assets/desk.js")
    fav = rel(page, "insidedesk/assets/favicon.svg"); fav32 = rel(page, "insidedesk/assets/favicon-32.png")
    apple = rel(page, "insidedesk/assets/apple-touch-icon.png"); feed = rel(page, "insidedesk/feed.xml")
    fonts = rel(page, "insidedesk/assets/fonts/newsreader-text.woff2"); fonts2 = rel(page, "insidedesk/assets/fonts/familjen.woff2")
    ld = f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>' if jsonld else ""
    return f'''<!doctype html>
<html lang="en-GB" data-theme="terminal">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="author" content="{e(AUTHOR)}">
<link rel="canonical" href="{e(canonical)}">
<meta name="theme-color" content="#0D1015">
<meta name="color-scheme" content="dark light">
<meta property="og:site_name" content="Inside Desk">
<meta property="og:type" content="{og_type}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(canonical)}">
<meta property="og:image" content="{e(BASE + og_image)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{e(BASE + og_image)}">
<link rel="icon" href="{fav}" type="image/svg+xml">
<link rel="icon" href="{fav32}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{apple}">
<link rel="alternate" type="application/rss+xml" title="Inside Desk" href="{feed}">
<link rel="preload" href="{fonts}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{fonts2}" as="font" type="font/woff2" crossorigin>
<script>(function(){{var t;try{{t=localStorage.getItem("it.theme")}}catch(e){{}}if(t!=="paper"&&t!=="terminal"){{t=window.matchMedia&&matchMedia("(prefers-color-scheme: light)").matches?"paper":"terminal"}}document.documentElement.dataset.theme=t;if(t==="paper"){{var m=document.querySelector('meta[name="theme-color"]');if(m)m.content="#F6F1E7"}}}})()</script>
<link rel="stylesheet" href="{css}">
<script src="{js}" defer></script>
{ld}{extra}
</head>
<body>
<a class="skip" href="#main">Skip to the brief</a>
<div class="progress" aria-hidden="true"><span></span></div>
'''

EP = {}   # edition key -> ePaper issue model (filled in main before any page is written)
EP_SCHEDULE = ("Morning ePaper 06:30 (website 08:30) · Evening ePaper 17:30, updated until 22:30 · Sunday Magazine 10:00, Berlin time")

def ep_links(page, ed, cls="ep-link"):
    iss = EP.get(ed["key"])
    if not iss: return ""
    return (f'<a class="{cls}" href="{rel(page, iss["dir"] + "/index.html")}">Read this edition as ePaper →</a>'
            f' <a class="ep-pdf" href="{rel(page, iss["dir"] + "/" + iss["pdf"])}" download>PDF</a>')

def masthead(page, current=""):
    def nav(label, path, key):
        cur = ' aria-current="page"' if key == current else ""
        return f'<a href="{rel(page, path)}"{cur}>{label}</a>'
    home = rel(page, HOME)
    return f'''<header class="mast">
  <div class="wrap mast-row">
    <a class="brand" href="{home}" aria-label="Inside Desk, front page">
      <span class="logo" aria-hidden="true"><span class="cursor"></span>ID</span>
      <span class="brand-txt"><span class="name">Inside Desk</span><span class="anywhere">ANYWHERE</span></span>
    </a>
    <p class="tag">Twice-daily brief for people who prefer incentives to applause.</p>
    <div class="mast-meta">
      <span class="chip clock" data-clock aria-live="off">Berlin time</span>
      <button class="theme-btn" type="button" data-theme-toggle title="Switch between the dark terminal and the light paper theme"><span class="sr">Switch to </span><span class="t-paper"><svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/></svg><span class="lbl">Paper</span> <span class="sr">theme</span></span><span class="t-term"><svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z"/></svg><span class="lbl">Terminal</span> <span class="sr">theme</span></span></button>
      <a class="btn btn-amber" href="{rel(page, 'insidedesk/support.html')}">Support <span class="hide-s">(keeps it free)</span></a>
    </div>
  </div>
  <nav class="wrap nav" aria-label="Sections">
    {nav("Today", HOME, "home")}{nav("Archive", "insidedesk/archive.html", "archive")}{nav("ePaper", "insidedesk/epaper/index.html", "epaper")}{nav("Method", "insidedesk/method.html", "method")}{nav("Shelf", "insidedesk/shelf.html", "shelf")}{nav("Support", "insidedesk/support.html", "support")}<a href="{rel(page, 'insidedesk/feed.xml')}">RSS</a>
  </nav>
</header>
'''

def footer(page):
    r = lambda p: rel(page, p)
    return f'''<footer class="foot">
  <div class="wrap foot-grid">
    <div>
      <p><strong>Inside Desk</strong> is a private editorial desk, not a broker, bank, party, or intelligence service. “Inside” is a brand metaphor for a kept reading habit — never a claim of inside information.</p>
      <p class="disclaimer">Commentary for information only. Not investment, legal, tax, medical or political advice. Not an offer or solicitation. Analysis may be incomplete or wrong. You decide; you comply with the law where you live. <a href="{r('insidedesk/legal.html')}">Full legal</a></p>
    </div>
    <div>
      <h2 class="foot-h">House rules</h2>
      <ul class="rules"><li>No public comment board</li><li>No tips, no solicitation</li><li>No trackers</li><li>Your shelf stays in your browser</li></ul>
    </div>
    <div>
      <h2 class="foot-h">Desk</h2>
      <ul class="rules">
        <li><a href="{r('insidedesk/imprint.html')}">Imprint</a> · <a href="{r('insidedesk/legal.html')}">Terms of use</a></li>
        <li><a href="/imprint.html">benjaminkoch.info imprint</a> · <a href="/privacy.html">Privacy</a></li>
        <li><a href="mailto:insidedesk@benjaminkoch.info">insidedesk@benjaminkoch.info</a></li>
        <li>Privacy: <a href="mailto:privacy@benjaminkoch.info">privacy@benjaminkoch.info</a></li>
        <li><a href="{r('insidedesk/feed.xml')}">RSS feed</a> · <a href="{r('insidedesk/method.html')}">Method &amp; corrections</a></li>
      </ul>
    </div>
  </div>
  <div class="wrap foot-base">© 2026 Inside Desk · Dr. Benjamin Koch · <a href="{r('insidedesk/imprint.html')}">Imprint</a></div>
</footer>
</body>
</html>
'''

def share_row(a_url, title, label="Share"):
    from urllib.parse import quote
    u, t = quote(a_url, safe=""), quote(title + " — Inside Desk", safe="")
    links = [
        ("X", f"https://x.com/intent/post?text={t}&url={u}"),
        ("LinkedIn", f"https://www.linkedin.com/sharing/share-offsite/?url={u}"),
        ("WhatsApp", f"https://wa.me/?text={t}%20{u}"),
        ("Telegram", f"https://t.me/share/url?url={u}&text={t}"),
        ("Email", f"mailto:?subject={t}&body={quote('A private letter, not a public comment.', safe='')}%0A%0A{u}"),
    ]
    items = "".join(f'<a class="btn btn-s" href="{e(h)}" target="_blank" rel="noopener noreferrer">{n}</a>' if n != "Email" else f'<a class="btn btn-s" href="{e(h)}">{n}</a>' for n, h in links)
    return (f'<div class="share" role="group" aria-label="{e(label)}"><span class="share-l">{e(label)}</span>{items}'
            f'<button class="btn btn-s" type="button" data-copy="{e(a_url)}">Copy link</button>'
            f'<button class="btn btn-s" type="button" data-native-share data-url="{e(a_url)}" data-title="{e(title)}" hidden>More…</button></div>')

def support_ask(page, compact=False):
    btns = "".join(f'<a class="btn btn-amber" href="{SUPPORT_URL}/{n}EUR" target="_blank" rel="noopener noreferrer">€{n}</a>' for n in AMOUNTS)
    return f'''<aside class="ask" aria-labelledby="ask-h-{'c' if compact else 'f'}">
  <div class="kicker">Quiet continuity</div>
  <h2 id="ask-h-{'c' if compact else 'f'}" class="ask-h">If this saved you an hour, keep it free for the next reader.</h2>
  <p>No paywall, no ads, no trackers, no list sold. Inside Desk runs on voluntary support. A gift does not buy access or influence; it buys the next edition’s time and data work.</p>
  <div class="ask-btns">{btns}<a class="btn" href="{SUPPORT_URL}" target="_blank" rel="noopener noreferrer">Other amount</a></div>
  <p class="faint">Processed by PayPal (handle: {SUPPORT_HANDLE}). <a href="{rel(page, 'insidedesk/support.html')}">Why and how</a> · <a href="{rel(page, 'insidedesk/thanks.html')}">Already gave? Thank you.</a></p>
</aside>'''

# ----------------------------------------------------------------- figures + body
PLATE_VARS = {"#0D1015": "--pl-ink", "#141922": "--pl-panel", "rgba(236,231,220,0.11)": "--pl-rule", "rgba(236,231,220,0.28)": "--pl-rule2",
              "#ECE7DC": "--pl-text", "#9AA3AE": "--pl-muted", "#6B7480": "--pl-faint", "#F2A93B": "--pl-1", "#4CC9B0": "--pl-2",
              "#FF7A5C": "--pl-3", "#A99BFF": "--pl-4", "#C9D1D9": "--pl-5", "#7FB2FF": "--pl-6"}
def themeable(svg):
    """Inline SVG only: move house colours from attributes into CSS variables so the plate follows the page theme.
    Standalone SVG/PNG files keep the dark plate. Fallback value = dark colour."""
    def tag(m):
        t = m.group(0); props = []
        def attr(a):
            nonlocal t
            mm = re.search(r'\s%s="([^"]+)"' % a, t)
            if mm and mm.group(1) in PLATE_VARS:
                props.append(f"{a}:var({PLATE_VARS[mm.group(1)]},{mm.group(1)})"); t = t.replace(mm.group(0), "", 1)
        attr("fill"); attr("stroke")
        if not props: return t
        assert " style=" not in t
        end = "/>" if t.endswith("/>") else ">"
        return t[:-len(end)] + f' style="{";".join(props)}"' + end
    return re.sub(r"<(?!/)[a-zA-Z][^>]*>", tag, svg)

def figure_html(page, spec, svg, table):
    cid = spec["id"]
    lic = sources.LICENCES[spec["licence"]] + (" " + sources.LICENCES[spec["licence_extra"]] if spec.get("licence_extra") else "")
    rows = "".join("<tr>" + "".join((f"<th scope='col'>{e(c)}</th>" if i == 0 else f"<td>{e(c)}</td>") for c in r) + "</tr>" for i, r in enumerate(table))
    return f'''<figure class="plate" id="chart-{cid}">
  <div class="plate-svg">{themeable(svg)}</div>
  <figcaption>
    <p class="plate-alt">{e(spec["alt"])}</p>
    <p class="plate-src"><span>Source</span> {e(spec["source_line"])}. {e(lic)}</p>
    <p class="plate-dl"><a href="{rel(page, f'insidedesk/data/{cid}.csv')}" download>Data (CSV)</a> · <a href="{rel(page, f'insidedesk/charts/{cid}.svg')}">SVG</a> · <a href="{rel(page, f'insidedesk/charts/{cid}.png')}">PNG</a></p>
    <details><summary>Latest values as a table</summary><div class="tbl"><table>{rows}</table></div></details>
  </figcaption>
</figure>'''

def body_html(page, a, rendered):
    md = a.body_md
    tokens = {}
    def sub(m):
        cid = m.group(1); tok = f"CHARTTOKEN{len(tokens)}X"
        tokens[tok] = figure_html(page, *rendered[cid]); return "\n\n" + tok + "\n\n"
    md = re.sub(r"^\[\[chart:([a-z0-9\-]+)\]\]\s*$", sub, md, flags=re.M)
    out = markdown.markdown(md, extensions=["extra", "smarty"], output_format="html")
    out = refs_html(out)
    for tok, fig in tokens.items():
        out = out.replace(f"<p>{tok}</p>", fig).replace(tok, fig)
    return out

def refs_html(s):
    def one(m):
        ns = re.findall(r"\d+", m.group(0))
        links = ",".join(f'<a href="#src-{n}" aria-label="Source {n}">{n}</a>' for n in ns)
        return f'<sup class="ref">{links}</sup>'
    return re.sub(r"\s?(?:\[\d+\])+", one, s)

def inline_refs(s):
    return refs_html(e(s))

def strip_refs(s):
    return re.sub(r"\s?(?:\[\d+\])+", "", s)

def pvp_html(a):
    p, q = a.podium, getattr(a, "print")
    return f'''<section class="pvp" aria-label="Podium versus print">
  <div class="pvp-col pvp-podium"><div class="pvp-tag">Podium</div>
    <blockquote><p>“{e(p["quote"])}”</p></blockquote>
    <p class="pvp-who"><a href="{e(p["url"])}" rel="noopener">{e(p["who"])}</a>, {e(p["when"])}</p></div>
  <div class="pvp-vs" aria-hidden="true">vs</div>
  <div class="pvp-col pvp-print"><div class="pvp-tag">Print</div>
    <p class="pvp-fig">{e(q["figure"])}</p><p class="pvp-line">{e(q["line"])}</p>
    <p class="pvp-who"><a href="{e(q["url"])}" rel="noopener">{e(q["who"])}</a>, {e(q["when"])}</p></div>
</section>'''

def article_page(a, eds, rendered):
    page = a.path; ed = a.edition; se = a.ledger
    t = f"{a.title} — Inside Desk"
    ld = {"@context": "https://schema.org", "@type": "NewsArticle", "headline": a.title, "description": a.dek,
          "datePublished": a.pub.isoformat(), "dateModified": a.pub.isoformat(), "inLanguage": "en-GB",
          "isAccessibleForFree": True, "mainEntityOfPage": a.url, "image": [BASE + a.og],
          "articleSection": a.desk_name, "author": {"@type": "Person", "name": AUTHOR},
          "publisher": {"@type": "NewsMediaOrganization", "name": "Inside Desk", "url": BASE + HOME,
                        "logo": {"@type": "ImageObject", "url": BASE + "insidedesk/assets/icon-512.png"}},
          "citation": [s["url"] for s in a.sources]}
    if se:
        ld["temporalCoverage"] = a.event_d.isoformat()
        ld["isPartOf"] = {"@type": "CreativeWorkSeries", "name": se["title"], "url": BASE + se["path"]}
    srcs = "".join(f'<li id="src-{s["n"]}"><a href="{e(s["url"])}" rel="noopener">{e(s["title"])}</a> — {e(s["publisher"])}, {e(s["date"])}.</li>' for s in a.sources)
    watch = "".join(f"<li>{inline_refs(w)}</li>" for w in a.watch)
    if se:
        others = [x for x in se["arts"] if x is not a]
        more = "".join(f'<li><a href="{rel(page, x.path)}"><span class="k">{e(x.event_label)}</span><b>{e(x.title)}</b></a></li>' for x in others)
        more_h = f'More from {e(se["title"])}'
        crumbs = f'<a href="{rel(page, se["path"])}">{e(se["title"])}</a>'
        stamp = f'<p class="event-line"><span class="event-k">Event</span> <time datetime="{a.event_d.isoformat()}">{e(a.event_label)}</time></p>'
        when = ""
        kick = f'{e(a.kicker)} · {e(se["title"].upper())}'
    else:
        others = [x for x in ed["arts"] if x is not a]
        more = "".join(f'<li><a href="{rel(page, x.path)}"><span class="k">{e(x.kicker)} · {e(x.format_name)}</span><b>{e(x.title)}</b></a></li>' for x in others)
        more_h = "Also in this edition"
        crumbs = f'<a href="{rel(page, ed["path"])}">{e(ed["slot_name"])} · {e(pretty_day(ed["d"]))}</a>'
        stamp = ""
        when = f'<time datetime="{a.pub.isoformat()}">{e(pretty_day(a.pub))}, {a.pub:%H:%M} {tzlabel(a.pub)}</time><span aria-hidden="true">·</span>'
        kick = f'{e(a.kicker)} · {e(a.format_name.upper())}'
    watch_h = e(getattr(a, "watch_title", None) or "What to watch")
    hasd = " · ".join(filter(None, [f"{len(a.charts)} chart" + ("s" if len(a.charts) != 1 else "") if a.charts else "", f"{len(a.sources)} sources"]))
    return (head(page, t, a.dek, a.url, a.og, "article", ld,
                 extra=f'<meta property="article:published_time" content="{a.pub.isoformat()}"><meta property="article:section" content="{e(a.desk_name)}">')
            + masthead(page) +
f'''<main id="main" class="wrap article-wrap">
<article class="article" data-article data-id="{e(a.path)}" data-title="{e(a.title)}" data-url="{e(rel(page, a.path))}" data-dek="{e(a.dek)}">
  <p class="crumbs">{crumbs}</p>
  <div class="kicker">{kick}</div>
  {stamp}
  <h1 class="headline">{e(a.title)}</h1>
  <p class="deck">{e(a.dek)}</p>
  <p class="byline"><span class="badge">{e(a.desk_name)}</span>
    <span>{AUTHOR} / The Desk</span><span aria-hidden="true">·</span>
    {when}
    <span>{a.minutes} min read</span>{f'<span aria-hidden="true">·</span><span>{hasd}</span>' if hasd else ''}</p>
  {share_row(a.url, a.title)}
  {pvp_html(a) if a.format == "podium-vs-print" else ""}
  <div class="prose">{body_html(page, a, rendered)}</div>
  <section class="watch" aria-labelledby="w-h"><h2 id="w-h">{watch_h}</h2><ul>{watch}</ul></section>
  <section class="margin" aria-label="Desk comment"><strong>Desk comment</strong><p>{e(a.comment)}</p></section>
  <section class="sources" aria-labelledby="s-h"><h2 id="s-h">Sources</h2><ol>{srcs}</ol>
    <p class="faint">Every figure in this piece traces to a source above or to the desk’s own arithmetic on those sources, marked as such. Quotations are short and attributed. Spot an error? <a href="mailto:insidedesk@benjaminkoch.info?subject={e('Correction: ' + a.title)}">Write to the desk</a>; corrections are logged on the <a href="{rel(page, 'insidedesk/method.html')}#corrections">method page</a>.</p></section>
  <p class="notice">Commentary for information only. Not investment, legal, tax, medical or political advice. Not an offer or solicitation. Analysis may be incomplete or wrong. Charts show published public data, not a trading feed; binding numbers live with the institutions that publish them.</p>
  {support_ask(page)}
  <div class="tools">{share_row(a.url, a.title, "Pass it on")}<button class="btn btn-s" type="button" data-save>Save for later</button><button class="btn btn-s" type="button" data-print>Print</button></div>
</article>
<aside class="more" aria-labelledby="more-h"><h2 id="more-h" class="section-h">{more_h}</h2><ul class="more-list">{more}</ul></aside>
</main>
''' + footer(page))

def card(page, a, big=False, rendered=None):
    cls = "card lead" if big else ("card pvp-card" if a.format == "podium-vs-print" else "card")
    fig = ""
    if big and a.charts and rendered:
        spec, svg, _ = rendered[a.charts[0]]
        fig = f'<a class="lead-plate" href="{rel(page, a.path)}" aria-hidden="true" tabindex="-1">{themeable(svg)}</a>'
    badge = f'<span class="has-chart">Chart</span>' if a.charts else ""
    first = ""
    if big:
        para = re.split(r"\n\s*\n", a.body_md.strip())
        first = "".join(f"<p>{e(strip_refs(x))}</p>" for x in para[:2])
    return f'''<article class="{cls}">
  <div class="kicker">{e(a.kicker)} · {e(a.format_name.upper())} {badge}</div>
  <h{2 if big else 3} class="{'headline' if big else 'card-h'}"><a href="{rel(page, a.path)}">{e(a.title)}</a></h{2 if big else 3}>
  <p class="deck">{e(a.dek)}</p>
  {('<div class="prose lead-ex">' + first + '</div>') if big else ''}
  {fig}
  <p class="meta"><span>{e(a.desk_name)}</span> · <span>{a.minutes} min</span> · <a href="{rel(page, a.path)}">Read the piece →</a></p>
</article>'''

LATEST_SLOT = ""

CLOSING_PARTS = [("habit", "One thing you can do this week"), ("went_right", "What went right"),
                 ("sentence", "The day in one sentence"), ("euros", "In euros at home"), ("small_words", "Small words")]

def closing_html(ed):
    """Edition-level closing section, added after the desk notes. Own sources, own (real) publish time."""
    c = ed.get("closing")
    if not c: return ""
    def para(t):
        return re.sub(r"\[(\d+)\]", lambda m: f'<sup class="ref"><a href="#cl-s{m.group(1)}">{m.group(1)}</a></sup>', e(t))
    cards = []
    for key, label in CLOSING_PARTS:
        part = c.get(key)
        if not part: continue
        if isinstance(part, str): part = {"text": part}
        head = f'<h3>{e(label)}</h3>' + (f'<p class="cl-term">{e(part["term"])}</p>' if part.get("term") else "")
        body = "".join(f"<p>{para(x)}</p>" for x in str(part["text"]).strip().split("\n\n"))
        note = f'<p class="cl-note">{para(part["note"])}</p>' if part.get("note") else ""
        cards.append(f'<div class="cl-item cl-{key.replace("_", "-")}">{head}{body}{note}</div>')
    srcs = "".join(f'<li id="cl-s{x["n"]}"><a href="{e(x["url"])}" rel="noopener">{e(x["title"])}</a> — {e(x["publisher"])}, {e(x["date"])}</li>' for x in c.get("sources", []))
    t = c["pub"]
    return f'''<section class="closing" aria-labelledby="cl-h">
  <div class="closing-head"><div class="kicker">End of edition · added <time datetime="{t.isoformat()}">{t:%H:%M} {tzlabel(t)}</time></div>
  <h2 id="cl-h" class="closing-title">{e(c.get("title", "Before you close the tab"))}</h2></div>
  <div class="cl-grid">{"".join(cards)}</div>
  <div class="cl-foot"><h3 class="rail-h">Sources for this section</h3><ol class="cl-src">{srcs}</ol>
  <p class="faint">Commentary for information only. Not investment, legal, tax, medical or political advice. "Desk arithmetic" is our own calculation from the cited figures.</p></div>
</section>'''

def edition_block(page, ed, rendered, h1=True):
    lead, rest = ed["arts"][0], ed["arts"][1:]
    tag = "h1" if h1 else "h2"
    return f'''<section class="edition-hero" aria-labelledby="ed-h">
  <div class="kicker">{e(ed['slot_name'])} · {e(pretty_day(ed['d']))} · {ed['pub']:%H:%M} {tzlabel(ed['pub'])}</div>
  <{tag} id="ed-h" class="edition-title">{e(ed['title'])}</{tag}>
  <p class="lede-sub">{e(ed['standfirst'])}</p>
  <p class="meta-line"><span data-next data-latest-slot="{LATEST_SLOT}">Morning 08:30 · Evening 17:30 · Sunday 10:00, Berlin time</span></p>
  {f'<p class="ep-line">{ep_links(page, ed)}</p>' if ed["key"] in EP else ""}
</section>
<div class="layout">
  <div class="stack">
    {card(page, lead, True, rendered)}
    <h2 class="section-h">Desk notes</h2>
    <div class="grid">{''.join(card(page, x) for x in rest)}</div>
  </div>
  <aside class="side">
    <div class="rail"><h2 class="rail-h">This edition</h2><ol class="toc">{''.join(f'<li><a href="{rel(page, x.path)}"><b>{e(x.title)}</b><small>{e(x.desk_name)} · {x.minutes} min</small></a></li>' for x in ed['arts'])}</ol></div>
    {support_ask(page, True)}
    <div class="rail"><h2 class="rail-h">The rhythm</h2><ul class="rhythm"><li><b>08:30</b> Morning: order the day before the day orders you.</li><li><b>17:30</b> Evening: admit what the day actually did.</li><li><b>Sun 10:00</b> The week, without the alerts.</li></ul><p class="faint">Berlin time (CET in winter, CEST in summer). Saturday is closed.</p></div>
  </aside>
</div>
{closing_html(ed)}'''

def ledger_module(page, se):
    if not se: return ""
    items = "".join(f'<li><a href="{rel(page, a.path)}"><span class="k">{e(a.event_label)}</span><b>{e(a.title)}</b></a></li>' for a in se["arts"])
    return f'''<section class="ledger-mod" aria-labelledby="lg-h"><h2 id="lg-h" class="section-h">{e(se["title"])}</h2>
<details class="ar-ed ledger-d"><summary><span class="ar-title">{e(se["dek"])}</span><span class="ar-n">{len(se["arts"])} pieces</span></summary>
<div class="ar-body"><ol class="ledger-strip">{items}</ol></div></details>
<p><a href="{rel(page, se["path"])}">The whole series →</a></p></section>'''

def home_page(eds, rendered, se=None):
    page = HOME; ed = eds[0]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "NewsMediaOrganization", "@id": BASE + HOME + "#org", "name": "Inside Desk", "url": BASE + HOME,
         "logo": BASE + "insidedesk/assets/icon-512.png", "founder": {"@type": "Person", "name": AUTHOR},
         "email": PUBLISHER["email"], "publishingPrinciples": BASE + "insidedesk/method.html"},
        {"@type": "WebSite", "name": "Inside Desk", "url": BASE + HOME, "inLanguage": "en-GB", "publisher": {"@id": BASE + HOME + "#org"}},
        {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "url": a.url, "name": a.title} for i, a in enumerate(ed["arts"])]}]}
    prev_link = f' · <a href="{eds[1]["path"]}">Previous edition: {e(eds[1]["slot_name"])}, {e(short_day(eds[1]["d"]))}</a>' if len(eds) > 1 else ""
    theses = "".join(f'<div class="thesis"><h3>{e(t)}</h3><p>{e(d)}</p></div>' for t, d in INSIGHTS[:4])
    return (head(page, "Inside Desk — The twice-daily brief", DESCRIPTION, BASE + HOME, ed["arts"][0].og, "website", ld)
            + masthead(page, "home") + f'''<main id="main" class="wrap">
{edition_block(page, ed, rendered)}
{epaper_module(page)}
{ledger_module(page, se)}
<section class="theses" aria-labelledby="th-h"><h2 id="th-h" class="section-h">What this desk actually believes</h2><div class="thesis-grid">{theses}</div><p><a href="insidedesk/method.html">All standing theses and the method →</a></p></section>
<section class="archive-teaser" aria-labelledby="ar-h"><h2 id="ar-h" class="section-h">Latest in the archive</h2>
<div class="ar-recent">{"".join(edition_row(page, x, False, True) for x in eds[:4])}</div>
<p class="archive-links"><a href="{ed['path']}">This edition's permanent page</a>{prev_link} · <a href="insidedesk/archive.html">Every edition →</a> · <a href="insidedesk/feed.xml">RSS</a></p></section>
</main>
''' + footer(page))

def edition_charts(ed):
    seen = []
    for a in ed["arts"]:
        for c in a.charts:
            if c not in seen: seen.append(c)
    return seen

def edition_data_html(page, ed, rendered):
    cs = edition_charts(ed)
    if not cs: return ""
    rows = "".join(f'''<li><b>{e(rendered[c][0]["title"])}</b> <small>in <a href="{rel(page, a.path)}">{e(a.title)}</a></small><br>
      <a href="{rel(page, f"insidedesk/charts/{c}.svg")}">SVG</a> · <a href="{rel(page, f"insidedesk/charts/{c}.png")}">PNG</a> · <a href="{rel(page, f"insidedesk/data/{c}.csv")}">CSV</a></li>'''
                   for c in cs for a in [next(x for x in ed["arts"] if c in x.charts)])
    return f'<section class="ed-data" aria-labelledby="data-h"><h2 id="data-h" class="section-h">Charts and data in this edition</h2><ul class="ed-data-list">{rows}</ul></section>'

def edition_nav(page, ed, eds):
    i = eds.index(ed)  # eds is newest first
    older = eds[i + 1] if i + 1 < len(eds) else None
    newer = eds[i - 1] if i > 0 else None
    parts = []
    if older: parts.append(f'<a href="{rel(page, older["path"])}">← Previous: {e(older["slot_name"])}, {e(short_day(older["d"]))}</a>')
    parts.append(f'<a href="{rel(page, "insidedesk/archive.html")}">All editions</a>')
    if newer: parts.append(f'<a href="{rel(page, newer["path"])}">Next: {e(newer["slot_name"])}, {e(short_day(newer["d"]))} →</a>')
    return f'<nav class="ed-nav" aria-label="Editions">{" · ".join(parts)}</nav>'

def ep_latest():
    return max(EP.values(), key=lambda i: i["avail"]) if EP else None

def ep_cover(page, i, cls="ep-cover"):
    return f'<a class="{cls}" href="{rel(page, i["dir"] + "/index.html")}"><img src="{rel(page, i["dir"] + "/thumbs/p01.png")}" alt="Cover of the {e(epaper.EP_SLOT[i["ed"]["slot"]][0])}, {e(pretty_day(i["ed"]["d"]))}" width="200" height="283" loading="lazy"></a>'

def ep_status(i):
    s = (f'Available {i["avail"]:%H:%M} {tzlabel(i["avail"])}' if i["ed"]["slot"] == "am" else f'Published {i["ed"]["pub"]:%H:%M} {tzlabel(i["ed"]["pub"])}')
    if i["extras"]: s += f' · ePaper extras added {i["extras_added"]:%H:%M} {tzlabel(i["extras_added"])}'
    if i["updated"]: s += f' · Updated {i["updated"]:%H:%M} {tzlabel(i["updated"])}'
    return s

def epaper_module(page):
    i = ep_latest()
    if not i: return ""
    return f'''<section class="ep-mod" aria-labelledby="ep-h">{ep_cover(page, i)}<div class="ep-txt"><div class="kicker">ePaper · {e(epaper.EP_SLOT[i["ed"]["slot"]][0])} · {e(short_day(i["ed"]["d"]))}</div>
<h2 id="ep-h" class="ep-title"><a href="{rel(page, i["dir"] + "/index.html")}">The edition as pages</a></h2>
<p>{i["meta"]["pieces"]} pieces on {i["meta"]["pages"]} pages: every desk, interactive charts, a reading view, search and a PDF. {len(i["extras"])} pieces appear only in the ePaper.</p>
<p class="faint">{e(ep_status(i))}</p>
<p class="ep-actions"><a class="btn btn-amber" href="{rel(page, i["dir"] + "/index.html")}">Open the ePaper</a> <a class="btn" href="{rel(page, i["dir"] + "/" + i["pdf"])}" download>PDF</a> <a class="btn" href="{rel(page, "insidedesk/epaper/index.html")}">All issues</a></p></div></section>'''

def epaper_index_page():
    page = "insidedesk/epaper/index.html"
    i = ep_latest()
    rows, month = [], None
    for x in sorted(EP.values(), key=lambda x: x["avail"], reverse=True):
        m = x["ed"]["d"].strftime("%B %Y")
        if m != month:
            if month: rows.append("</ol>")
            rows.append(f'<h3 class="tl-m">{e(m)}</h3><ol class="ep-arch">'); month = m
        web = f' · <a href="{rel(page, x["ed"]["path"])}">Website edition</a>' if x["web_live"] else f' · website edition at {x["ed"]["pub"]:%H:%M}'
        rows.append(f'''<li><span class="ar-day">{e(short_day(x["ed"]["d"]))}</span><span class="ar-slot">{e(epaper.EP_SLOT[x["ed"]["slot"]][0])}</span><a class="ar-title" href="{rel(page, x["dir"] + "/index.html")}">{e(x["ed"]["title"])}</a><span class="ar-n">{x["meta"]["pages"]} pages · {x["meta"]["pieces"]} pieces · <a href="{rel(page, x["dir"] + "/" + x["pdf"])}" download>PDF</a>{web}</span></li>''')
    if month: rows.append("</ol>")
    latest = f'''<section class="ep-mod ep-mod-big" aria-labelledby="ep-l">{ep_cover(page, i)}<div class="ep-txt"><div class="kicker">Latest issue · {e(epaper.EP_SLOT[i["ed"]["slot"]][0])} · {e(pretty_day(i["ed"]["d"]))}</div>
<h2 id="ep-l" class="ep-title"><a href="{rel(page, i["dir"] + "/index.html")}">{e(i["ed"]["title"])}</a></h2><p>{e(i["ed"]["standfirst"])}</p>
<p class="faint">{e(ep_status(i))} · {i["meta"]["pages"]} pages · {i["meta"]["pieces"]} pieces</p>
<p class="ep-actions"><a class="btn btn-amber" href="{rel(page, i["dir"] + "/index.html")}">Open the ePaper</a> <a class="btn" href="{rel(page, i["dir"] + "/" + i["pdf"])}" download>Download the PDF</a>{f' <a class="btn" href="{rel(page, i["dir"] + "/index.html")}#page-3">Latest</a>' if i["ed"]["slot"] == "pm" else ""}</p></div></section>''' if i else ""
    inner = f'''<div class="kicker">ePaper</div><h1 class="headline">Inside Desk, as pages</h1>
<p class="deck">The same edition as the website, laid out as a newspaper: every desk on its own page, interactive charts, a reading view, search, and a PDF to keep. Some pieces appear only here, and each carries the time it was added.</p>
{latest}
<section class="ep-sched" aria-labelledby="ep-s"><h2 id="ep-s" class="section-h">When it appears</h2><ul class="rhythm">
<li><b>06:30</b> Morning ePaper. The website's morning edition follows at 08:30, built from the same pieces.</li>
<li><b>17:30</b> Evening ePaper. It can be updated until 22:30; an “Updated” time and a Latest page show what changed and when.</li>
<li><b>Sun 10:00</b> The Sunday Magazine. Saturday is closed.</li></ul><p class="faint">Berlin time (CET in winter, CEST in summer). Free, like everything here. After you open an issue once, it stays readable offline on that device.</p></section>
<section aria-labelledby="ep-a"><h2 id="ep-a" class="section-h">ePaper archive</h2>{"".join(rows)}<p class="faint">Every issue stays at its own address. The website <a href="{rel(page, "insidedesk/archive.html")}">archive</a> lists them under their day, too.</p></section>'''
    return simple_page(page, "ePaper", "The Inside Desk ePaper: every edition as pages, with interactive charts, a reading view and a PDF. Free.", inner, "epaper")

def edition_page(ed, rendered, eds=None):
    page = ed["path"]
    t = f"{ed['slot_name']}, {pretty_day(ed['d'])} — Inside Desk"
    return (head(page, t, ed["standfirst"], BASE + page, ed["arts"][0].og) + masthead(page, "archive")
            + f'<main id="main" class="wrap">{edition_block(page, ed, rendered)}{edition_data_html(page, ed, rendered)}{edition_nav(page, ed, eds or [ed])}</main>' + footer(page))

def simple_page(page, title, desc, inner, current=""):
    return (head(page, title + " — Inside Desk", desc, BASE + page, "insidedesk/og/default.png") + masthead(page, current)
            + f'<main id="main" class="wrap narrow">{inner}</main>' + footer(page))

def edition_pieces(page, ed):
    """Every piece of an edition, plus its closing section and charts/data, as <li> rows."""
    rows = "".join(f'<li><a href="{rel(page, a.path)}">{e(a.title)}</a> <small>{e(a.desk_name)}{" · lead" if i == 0 else ""}</small></li>' for i, a in enumerate(ed["arts"]))
    if ed.get("closing"):
        rows += f'<li class="tl-closing"><a href="{rel(page, ed["path"])}#cl-h">{e(ed["closing"].get("title", "Before you close the tab"))}</a> <small>End of edition</small></li>'
    if edition_charts(ed):
        rows += f'<li class="tl-closing"><a href="{rel(page, ed["path"])}#data-h">Charts and data</a> <small>SVG · PNG · CSV</small></li>'
    return rows

def edition_row(page, ed, is_open=False, show_day=False):
    n = len(ed["arts"])
    day = f'<span class="ar-day">{e(short_day(ed["d"]))}</span>' if show_day else ""
    return f'''<details class="ar-ed"{" open" if is_open else ""}><summary><span class="ar-slot">{e(ed["slot_name"])}</span>{day}<span class="ar-title">{e(ed["title"])}</span><span class="ar-n">{n} pieces</span></summary>
<div class="ar-body"><p class="ar-open"><a href="{rel(page, ed["path"])}">Open the full edition: {e(ed["slot_name"])}, {e(pretty_day(ed["d"]))} →</a>{" · " + ep_links(page, ed) if ed["key"] in EP else ""}</p><ol class="ar-pieces">{edition_pieces(page, ed)}</ol></div></details>'''

def archive_page(eds, se=None):
    """Compact archive: months (jump bar) > days (<details>, newest open) > editions (<details> rows) > pieces.
    Works without JS; every link is in the HTML even when collapsed, so validate.py still sees it."""
    page = "insidedesk/archive.html"
    days = {}
    for ed in eds:
        days.setdefault(ed["d"], {"eds": [], "ledger": []})["eds"].append(ed)
    for i in EP.values():
        days.setdefault(i["ed"]["d"], {"eds": [], "ledger": []})
    if se:
        for a in se["arts"]:
            days.setdefault(a.event_d, {"eds": [], "ledger": []})["ledger"].append(a)
    newest_day = max(days)
    newest_ed = eds[0] if eds else None
    out, month, months = [], None, []
    for d in sorted(days, reverse=True):
        m = d.strftime("%B %Y")
        if m != month:
            if month: out.append("</div></section>")
            mid = d.strftime("m-%Y-%m"); months.append((mid, d.strftime("%b %Y")))
            out.append(f'<section class="ar-month" id="{mid}" aria-labelledby="{mid}-h"><h2 class="tl-m" id="{mid}-h">{e(m)}</h2><div class="ar-days">'); month = m
        g = days[d]
        rows = "".join(edition_row(page, ed, ed is newest_ed) for ed in sorted(g["eds"], key=lambda x: x["slot_time"]))
        rows += "".join(f'''<div class="ar-ledger ar-ep"><span class="ar-slot">{e(epaper.EP_SLOT[i["ed"]["slot"]][0])}</span><a href="{rel(page, i["dir"] + "/index.html")}" class="ar-title">{e(i["ed"]["title"])}</a><span class="ar-n">ePaper only until {i["ed"]["pub"]:%H:%M} · <a href="{rel(page, i["dir"] + "/" + i["pdf"])}" download>PDF</a></span></div>'''
                        for i in EP.values() if i["ed"]["d"] == d and not i["web_live"])
        rows += "".join(f'''<div class="ar-ledger"><span class="ar-slot">{e(se["title"])}</span><a href="{rel(page, a.path)}" class="ar-title">{e(a.title)}</a><span class="ar-n">{e(a.event_label)}</span></div>''' for a in g["ledger"])
        parts = ([f"{len(g['eds'])} edition{'s' if len(g['eds']) != 1 else ''}"] if g["eds"] else []) + ([f"{len(g['ledger'])} Ledger"] if g["ledger"] else [])
        out.append(f'''<details class="ar-day-d"{" open" if d == newest_day else ""}><summary><time datetime="{d.isoformat()}">{e(pretty_day(d))}</time><span class="ar-n">{" · ".join(parts)}</span></summary><div class="ar-rows">{rows}</div></details>''')
    if month: out.append("</div></section>")
    series = f' The Ledger pieces from <a href="{rel(page, se["path"])}">{e(se["title"])}</a> sit under the day they are about.' if se else ""
    inner = f'''<div class="kicker">Archive</div><h1 class="headline">2026, day by day</h1>
<p class="deck">Newest first. Open a day to see its editions, open an edition to see every piece.{series}</p>
<nav class="tl-jump" aria-label="Months">{" · ".join(f'<a href="#{i}">{e(l)}</a>' for i, l in months)}</nav>
<p class="faint">{len(eds)} edition(s) · {sum(len(ed["arts"]) for ed in eds)} edition piece(s){f' · {len(se["arts"])} Ledger piece(s)' if se else ''}{f' · {len(EP)} ePaper issue(s), all in the <a href="{rel(page, "insidedesk/epaper/index.html")}">ePaper archive</a>' if EP else ''}. Every edition stays at its own address.</p>
<div class="archive-c">{"".join(out)}</div>'''
    return simple_page(page, "Archive", "Every Inside Desk edition and The 2026 Ledger, day by day.", inner, "archive")

def ledger_page(se, rendered):
    page = se["path"]
    items = "".join(f'''<li class="tl-item tl-ledger"><a class="arch-head" href="{rel(page, a.path)}"><span class="k">{e(a.event_label)} · {e(a.desk_name)}</span><b>{e(a.title)}</b><span>{e(a.dek)}</span></a></li>''' for a in se["arts"])
    ld = {"@context": "https://schema.org", "@type": "CreativeWorkSeries", "name": se["title"], "url": BASE + page,
          "description": se["dek"], "datePublished": se["pub"].isoformat(), "inLanguage": "en-GB",
          "publisher": {"@type": "NewsMediaOrganization", "name": "Inside Desk", "url": BASE + HOME},
          "hasPart": [{"@type": "NewsArticle", "headline": a.title, "url": a.url, "temporalCoverage": a.event_d.isoformat()} for a in se["arts"]]}
    inner = f'''<div class="kicker">Series</div><h1 class="headline">{e(se["title"])}</h1>
<p class="deck">{e(se["dek"])}</p>
<p class="series-line">{e(se["line"])}</p>
<ol class="tl">{items}</ol>
<p class="faint">Commentary for information only. Not investment, legal, tax or political advice. Every figure is sourced under its piece; quotations are short and attributed.</p>'''
    return (head(page, se["title"] + " — Inside Desk", se["dek"], BASE + page, "insidedesk/og/ledger-2026.png", "website", ld)
            + masthead(page, "archive") + f'<main id="main" class="wrap narrow">{inner}</main>' + footer(page))

def method_page():
    page = "insidedesk/method.html"
    theses = "".join(f'<div class="thesis"><h3>{e(t)}</h3><p>{e(d)}</p></div>' for t, d in INSIGHTS)
    inner = f'''<div class="kicker">Method</div><h1 class="headline">How the desk works</h1>
<p class="deck">Not a manifesto. A set of working rules. They move slowly, on purpose.</p>
<div class="thesis-grid">{theses}</div>
<div class="prose">
<h2>The rhythm</h2>
<p>Morning at 08:30, evening at 17:30, Monday to Friday; the Sunday long-read at 10:00. All times are Berlin time: CET in winter, CEST in summer. Saturday is closed. Each edition carries one lead piece and a few short desk notes. Fewer pieces, more work in each.</p>
<h2>Formats</h2>
<p><strong>Lead.</strong> The one argument of the edition, with the chart that carries it. <strong>Desk note.</strong> One mechanism, one print, a few paragraphs. <strong>Podium vs Print.</strong> What was said, in the speaker’s own short words, set against what the data did. The verdict is about the gap, never about the person. <strong>Sunday long-read.</strong> The week in the order incentives actually moved.</p>
<h2>Sources and numbers</h2>
<p>Every figure traces to a named source, linked under the piece. Primary data comes first: statistical offices, central banks, agencies. Where the desk does its own arithmetic on those numbers, the text says so. Quotations are short, attributed and linked. No anonymous tips, no material non-public information, no claims of special access. “Inside” is a reading habit, not a source.</p>
<h2>Charts</h2>
<p>Charts appear only where they carry the argument. They are drawn at publication from public data with open or public-domain terms, in the desk’s own house style, with the source and licence printed under each, a text description, and the data as CSV. No projections are drawn as if they were data. Charts are not a trading feed.</p>
<h2 id="corrections">Corrections</h2>
<p>Mistakes are corrected in place, with a dated note at the foot of the piece. Write to <a href="mailto:insidedesk@benjaminkoch.info">insidedesk@benjaminkoch.info</a>. There is no public comment board, by design.</p>
<p><em>Corrections log:</em> none yet.</p>
<h2>Independence</h2>
<p>No advertising, no trackers, no sponsored content, no paid placement. Reader gifts keep it free; they do not buy access, advice or influence.</p>
</div>'''
    return simple_page(page, "Method", "How Inside Desk sources, charts and corrects its work.", inner, "method")

def support_page():
    page = "insidedesk/support.html"
    btns = "".join(f'<a class="btn btn-amber btn-l" href="{SUPPORT_URL}/{n}EUR" target="_blank" rel="noopener noreferrer">Give €{n}</a>' for n in AMOUNTS)
    inner = f'''<div class="kicker">Quiet continuity</div><h1 class="headline">The letter stays open</h1>
<p class="deck">Inside Desk is free to read. Voluntary support helps keep the letter independent and open. It does not purchase access, advice, influence, or a subscription. If the desk has earned a coffee, that is enough.</p>
<div class="support-box">
  <p class="support-l">One-off, via PayPal</p>
  <div class="ask-btns">{btns}<a class="btn btn-l" href="{SUPPORT_URL}" target="_blank" rel="noopener noreferrer">Other amount</a></div>
  <p>PayPal handle: <b>{SUPPORT_HANDLE}</b></p>
</div>
<!-- OWNER PLACEHOLDER: monthly support is not set up yet. Replace this box once a recurring option
     (e.g. PayPal subscription button, Ko-fi, Stripe Payment Link or SEPA standing order) exists. -->
<div class="support-box placeholder" role="note">
  <p class="support-l">Monthly support</p>
  <p><strong>Placeholder — not yet available.</strong> A monthly option will appear here once the publisher has set one up. Until then, a one-off gift whenever an edition earns it does the same job.</p>
</div>
<div class="prose">
<h2>Where a gift goes</h2>
<p>Into time and tools: reading primary sources before they become headlines, pulling the data, drawing the charts, checking every number, and publishing twice a day without ads or a paywall. The desk does not publish a funding target it cannot verify; when there is one, it will be shown here with the real figure.</p>
<h2>What a gift never buys</h2>
<p>Coverage, tone, a view, a tip, or early access. There are no paid tiers. Everyone reads the same letter.</p>
</div>
<p class="muted">Processed by PayPal. The publisher does not collect card numbers here. Gifts are voluntary. No consideration is promised. No refund is due for a gift unless PayPal or mandatory law says otherwise. This is not a tax-deductible charity appeal unless a receipt from a recognised charity says so — this desk is an editorial letter, not a registered charity.</p>
<p class="faint">Questions: <a href="mailto:insidedesk@benjaminkoch.info">insidedesk@benjaminkoch.info</a> · <a href="thanks.html">Already gave? Read the thank-you note.</a></p>'''
    return simple_page(page, "Support", "Inside Desk is free. Voluntary support keeps it that way.", inner, "support")

def thanks_page():
    inner = '''<div class="kicker">Quiet continuity</div><h1 class="headline">Thank you.</h1>
<p class="deck">You just paid for the next edition’s slowest hour: the one spent reading the annex nobody else read.</p>
<div class="prose"><p>No list was created, no access unlocked, nothing changes in what you see. That is the point: the letter stays the same for everyone, and you are the reason it can.</p>
<p>If you want to do one more useful thing, pass a piece to one person who would read it properly. That grows the desk more than any algorithm.</p>
<p><a class="btn btn-amber" href="../InsideDesk.html">Back to today’s edition</a></p></div>'''
    return simple_page("insidedesk/thanks.html", "Thank you", "Thank you for supporting Inside Desk.", inner)

def shelf_page():
    inner = '''<div class="kicker">Shelf</div><h1 class="headline">Saved for later</h1>
<p class="deck">Private to your browser. Not a public list.</p>
<div id="shelf" class="shelf" data-shelf-list><p class="muted">Nothing on the shelf yet. Open a piece and save it.</p></div>'''
    return simple_page("insidedesk/shelf.html", "Shelf", "Pieces you saved, stored only in your browser.", inner, "shelf")

def legal_page():
    P = {k: e(v) for k, v in PUBLISHER.items()}
    inner = f'''<section class="legal">
    <div class="kicker">Legal</div>
    <h1 class="headline">Terms of use</h1>
    <p>Inside Desk is an independent editorial letter. It is commentary for a general audience. It is not a news agency, broker-dealer, investment adviser, credit institution, law firm, tax practice, medical practice, political party, or intelligence service. Local law where you read still applies to you.</p>

    <h2>1. Publisher</h2>
    <p>The service is published by {P['name']}, {P['careOf']}, {P['street']}, {P['zip']} {P['city']}, {P['country']}. The responsible editor is {P['visdp']}. Full identification is on the <a href="imprint.html">Imprint</a> page.</p>

    <h2>2. What “Inside Desk” is not</h2>
    <p>“Inside” is a brand metaphor for a kept reading habit. It is not a claim of material non-public information, special access, or an invitation to trade. Anyone saying otherwise in our name is wrong. We do not provide tips. We do not solicit the purchase or sale of any security, commodity, currency, or instrument.</p>

    <h2>3. Not advice</h2>
    <p>Nothing here is investment, legal, tax, accounting, medical, or voting advice, and nothing is an offer or solicitation. Text and charts are provided “as is”, without warranties of accuracy or completeness. Commentary can be wrong, incomplete, or late. You alone decide what to do. You alone comply with the laws that apply to you, including securities, sanctions, and election law.</p>

    <h2>4. Charts and data</h2>
    <p>Charts are drawn by the desk at publication time from public and open data released by the institutions named under each chart (for example the U.S. Energy Information Administration via FRED, Eurostat and the European Central Bank), or from figures reported by named organisations. Each chart states its source and licence and offers its data as a CSV file. Charts show published data and the desk’s stated arithmetic only; they contain no forecasts. They are not a licensed broker feed, not official statistics, and not a recommendation. Do not trade off these charts. Binding numbers live with the institutions that publish them.</p>

    <h2>5. Original commentary</h2>
    <p>Third-party names remain their owners’ marks. We are not affiliated with them. Where a piece relies on reporting or statements by others, it names and links the source and quotes only short, attributed passages. Desk titles, commentary, and comments are original and are not a reprint of any wire.</p>

    <h2>6. No public comments</h2>
    <p>There is no public comment board. The shelf stays in your browser and is not uploaded by this service. “Desk comments” are editorial asides. Letters use your own mail client. We do not host user-generated public speech.</p>

    <h2>7. Conduct</h2>
    <p>This desk will not invent crimes, publish sexual content involving minors, target private persons for harassment, or call for violence. We prefer institutions, incentives, and mechanisms to character assassination. If a passage feels personal, read it as a type, not a dossier.</p>

    <h2>8. Liability</h2>
    <p>To the maximum extent permitted by applicable law, {P['name']} and Inside Desk are not liable for any direct, indirect, incidental, or consequential loss arising from use of this service, including decisions about money, politics, travel, or family capital. Mandatory rights that cannot be waived remain untouched. Where liability can be limited, it is limited to amounts you actually paid the publisher in the twelve months before the claim. Voluntary support is not a fee for content and creates no additional duty beyond mandatory law.</p>

    <h2>9. Privacy</h2>
    <p>This service does not run advertising trackers, analytics, or cookies. The pages are static files; fonts are served from this site, and charts are built at publication time, so reading a page makes no requests to data providers or other third parties. Your browser may keep two things in local storage: your theme choice (only once you switch it) and your shelf. You can erase them by clearing site data. The share buttons and the PayPal support links are ordinary links: nothing is sent to those services unless you click one, and then their own terms and privacy notices apply. The site-wide privacy notice of benjaminkoch.info applies.</p>

    <h2>10. Voluntary support</h2>
    <p>The letter is free. The PayPal control “quietcontinuity” accepts voluntary gifts. A gift is not a purchase, not a subscription, and not consideration for access, advice, or influence. Card data is handled by PayPal, not by this letter. No licensed payment for content is offered here. Unless a recognised charity receipt says otherwise, do not treat a gift as tax-deductible.</p>

    <h2>11. Copyright</h2>
    <p>© 2026 Inside Desk / {P['name']}. You may share links and short quotations with attribution for non-commercial reading. You may not republish entire editions as your own, and you may not scrape this service to train a competing desk without written permission.</p>

    <h2>12. Contact</h2>
    <p>Email: <a href="mailto:privacy@benjaminkoch.info">privacy@benjaminkoch.info</a><br>Post: {P['name']}, {P['careOf']}, {P['street']}, {P['zip']} {P['city']}, {P['country']}. We do not promise a reply.</p>
    <p class="faint">See also the site-wide <a href="/imprint.html">imprint</a> and <a href="/privacy.html">privacy notice</a> of benjaminkoch.info.</p>
  </section>'''
    return simple_page("insidedesk/legal.html", "Terms of use", "Terms of use for Inside Desk.", inner)

def imprint_page():
    P = {k: e(v) for k, v in PUBLISHER.items()}
    inner = f'''<section class="legal">
    <div class="kicker">Imprint</div>
    <h1 class="headline">Provider identification</h1>
    <p>Information according to applicable provider-identification rules for digital editorial services.</p>
    <p><strong>Service</strong><br>Inside Desk<br>Independent editorial letter · weekday morning and evening editions · Sunday long-read</p>
    <p><strong>Publisher</strong><br>{P['name']}<br>{P['careOf']}<br>{P['street']}<br>{P['zip']} {P['city']}<br>{P['country']}</p>
    <p><strong>Responsible editor</strong><br>{P['visdp']}<br>{P['careOf']}<br>{P['street']}<br>{P['zip']} {P['city']}<br>{P['country']}</p>
    <p><strong>Contact</strong><br>Email: <a href="mailto:insidedesk@benjaminkoch.info">insidedesk@benjaminkoch.info</a><br>Post: {P['name']}, {P['careOf']}, {P['street']}, {P['zip']} {P['city']}, {P['country']}</p>
    <p><strong>Status</strong><br>No commercial-register number is stated (none is claimed). No VAT identification number is stated (none is claimed). No professional-chamber membership is claimed. This is not a licensed investment service, credit institution, or law practice. Voluntary donations, if you choose to give, are processed by PayPal. The publisher does not take part in consumer arbitration boards.</p>
    <p class="muted">Mandatory consumer and media rights remain unaffected. The <a href="legal.html">Terms of use</a> apply.</p>
    <p class="faint">Site-wide: <a href="/imprint.html">benjaminkoch.info imprint</a> · <a href="/privacy.html">privacy notice</a>.</p>
  </section>'''
    return simple_page("insidedesk/imprint.html", "Imprint", "Provider identification for Inside Desk.", inner)

# ----------------------------------------------------------------- feed, sitemap, OG
def feed_xml(eds, rendered, se=None):
    items = []
    groups = [ed["arts"] for ed in eds] + ([se["arts"]] if se else [])
    groups.sort(key=lambda g: g[0].pub, reverse=True)
    for arts in groups:
        for a in arts:
            body = re.sub(r'<figure class="plate".*?</figure>', lambda m: "", body_html(a.path, a, rendered), flags=re.S)
            imgs = "".join(f'<p><img src="{BASE}insidedesk/charts/{c}.png" alt="{e(rendered[c][0]["alt"])}" width="960"></p>' for c in a.charts)
            srcs = "".join(f'<li><a href="{e(s["url"])}">{e(s["title"])}</a> — {e(s["publisher"])}</li>' for s in a.sources)
            content = f"<p><em>{e(a.dek)}</em></p>{imgs}{body}<h3>Sources</h3><ol>{srcs}</ol><p>Commentary for information only. Not advice.</p>"
            items.append(f'''  <item>
    <title>{e(a.title)}</title>
    <link>{a.url}</link>
    <guid isPermaLink="true">{a.url}</guid>
    <pubDate>{format_datetime(a.pub)}</pubDate>
    <category>{e(a.desk_name)}</category>
    <dc:creator>{e(AUTHOR)}</dc:creator>
    <description>{e(a.dek)}</description>
    <content:encoded><![CDATA[{content.replace("]]>", "]]&gt;")}]]></content:encoded>
  </item>''')
    for i in sorted(EP.values(), key=lambda i: i["avail"], reverse=True):
        url = BASE + i["dir"] + "/"
        xs = f' Includes {len(i["extras"])} ePaper-only pieces, added {i["extras_added"]:%H:%M} {tzlabel(i["extras_added"])}.' if i["extras"] else ""
        items.append(f'''  <item>
    <title>{e(f'ePaper · {epaper.EP_SLOT[i["ed"]["slot"]][0]}, {pretty_day(i["ed"]["d"])}')}</title>
    <link>{url}</link>
    <guid isPermaLink="true">{url}</guid>
    <pubDate>{format_datetime(i["avail"])}</pubDate>
    <category>ePaper</category>
    <dc:creator>{e(AUTHOR)}</dc:creator>
    <description>{e(i["ed"]["title"] + " " + i["ed"]["standfirst"] + xs)}</description>
    <enclosure url="{url}{i["pdf"]}" length="{i.get("pdf_size", 0)}" type="application/pdf"/>
  </item>''')
    now = format_datetime(max([eds[0]["pub"]] + [a.pub for a in eds[0]["arts"]] + ([se["pub"]] if se else []) + [i["last"] for i in EP.values()]))
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Inside Desk</title>
  <link>{BASE}{HOME}</link>
  <atom:link href="{BASE}insidedesk/feed.xml" rel="self" type="application/rss+xml"/>
  <description>{e(DESCRIPTION)}</description>
  <language>en-gb</language>
  <lastBuildDate>{now}</lastBuildDate>
  <image><url>{BASE}insidedesk/assets/icon-512.png</url><title>Inside Desk</title><link>{BASE}{HOME}</link></image>
{chr(10).join(items)}
</channel>
</rss>
'''

def sitemap_xml(eds, se=None):
    latest = max([eds[0]["pub"]] + ([se["pub"]] if se else []))
    urls = [("insidedesk/archive.html", latest), ("insidedesk/method.html", eds[0]["pub"]), ("insidedesk/support.html", eds[0]["pub"])]
    if se:
        urls.append((se["path"], se["pub"]))
        urls += [(a.path, a.pub) for a in se["arts"]]
    for ed in eds:
        urls.append((ed["path"], ed["pub"]))
        urls += [(a.path, a.pub) for a in ed["arts"]]
    if EP:
        urls.append(("insidedesk/epaper/index.html", max(i["last"] for i in EP.values())))
        urls += [(i["dir"] + "/", i["last"]) for i in EP.values()]
    body = "\n".join(f"  <url><loc>{BASE}{p}</loc><lastmod>{t.date().isoformat()}</lastmod></url>" for p, t in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<!-- Inside Desk only. The front page {BASE}{HOME} lives outside /insidedesk/; submit it in Search Console. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n'

def og_card(title, kicker, dek, svg=None):
    chart = f'<div class="ch">{svg}</div>' if svg else ""
    return f'''<!doctype html><meta charset=utf-8><style>{font_css_abs()}
html,body{{margin:0;width:1200px;height:630px;background:#0D1015;color:#ECE7DC;overflow:hidden}}
.w{{position:absolute;inset:0;padding:56px 64px;display:flex;gap:40px}}
.t{{flex:1.05;display:flex;flex-direction:column}}
.k{{font:600 17px "JetBrains Mono";letter-spacing:.14em;color:#F2A93B;text-transform:uppercase}}
.k:before{{content:"";display:inline-block;width:36px;height:4px;background:#F2A93B;margin-right:14px;vertical-align:middle}}
h1{{font:600 {56 if len(title) < 50 else 44}px/1.06 Newsreader;margin:26px 0 18px;letter-spacing:-.01em}}
p{{font:500 22px/1.4 "Familjen Grotesk";color:#9AA3AE;margin:0}}
.b{{margin-top:auto;font:700 18px "Familjen Grotesk";letter-spacing:.22em}} .b i{{display:inline-block;width:12px;height:12px;background:#F2A93B;margin-right:12px}}
.b span{{font:400 15px "JetBrains Mono";letter-spacing:0;color:#6B7480;margin-left:14px}}
.ch{{flex:1;display:flex;align-items:center}} .ch svg{{width:100%;height:auto;border-radius:12px;box-shadow:0 0 0 1px rgba(236,231,220,.12)}}
</style><div class="w"><div class="t"><div class="k">{e(kicker)}</div><h1>{e(title)}</h1><p>{e(dek)}</p>
<div class="b"><i></i>INSIDE DESK<span>benjaminkoch.info/InsideDesk</span></div></div>{chart}</div>'''

def favicons(no_png):
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    src = "/usr/share/fonts/truetype/sand-box/google/Familjen Grotesk/FamiljenGrotesk-VariableFont_wght.ttf"
    path_d = None
    if os.path.exists(src):
        try:
            from fontTools.varLib import instancer
            f = instancer.instantiateVariableFont(TTFont(src), {"wght": 700})
            gs = f.getGlyphSet(); cmap = f.getBestCmap(); upm = f["head"].unitsPerEm
            pen = SVGPathPen(gs); x = 0; s = 34 / upm
            for ch in "ID":
                g = cmap[ord(ch)]
                gs[g].draw(TransformPen(pen, (s, 0, 0, -s, 9 + x, 44)))
                x += gs[g].width * s + 1
            path_d = pen.getCommands()
        except Exception as ex:
            print("  ! favicon glyphs:", ex)
    mark = f'<path d="{path_d}" fill="#ECE7DC"/>' if path_d else '<text x="32" y="44" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="30" fill="#ECE7DC">ID</text>'
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0D1015"/>{mark}<rect x="50" y="17" width="5" height="27" fill="#F2A93B"/></svg>'
    write("insidedesk/assets/favicon.svg", svg)
    if not no_png:
        for n, out in ((32, "favicon-32.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")):
            chrome_shot(f'<!doctype html><style>html,body{{margin:0;background:transparent}}svg{{width:{n}px;height:{n}px;display:block}}</style>{svg}', os.path.join(DESK, "assets", out), n, n)

# ----------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true"); ap.add_argument("--no-png", action="store_true")
    ap.add_argument("--fetch-all", action="store_true", help="refresh every chart, including ones only used by older pieces")
    ap.add_argument("--fetch", default="", help="comma list: fetch only these chart ids (others read local CSV)")
    args = ap.parse_args()
    specs = chart_specs()
    eds = load_editions(specs)
    now = dt.datetime.now(TZ)
    # Morning concept: the ePaper can be available (06:30) before the website edition (08:30). An edition whose
    # `published` time is still ahead is not built for the website yet; its ePaper is, once `epaper.available` has passed.
    embargo = [x for x in eds if x["pub"] > now]
    eds = [x for x in eds if x["pub"] <= now]
    if embargo: print("  website edition not yet due:", ", ".join(x["key"] for x in embargo))
    global LATEST_SLOT
    LATEST_SLOT = max(f"{x['d'].isoformat()} {x['slot_time']}" for x in eds)  # Berlin wall time of the newest covered slot
    se = load_ledger()
    used = {c for ed in eds for a in ed["arts"] for c in a.charts} | ({c for a in se["arts"] for c in a.charts} if se else set())
    # An embargoed edition's ePaper can already be out (06:30 before the 08:30 website): its charts need data too.
    used |= {c for ed in embargo for a in ed["arts"] for c in a.charts}
    print(f"Inside Desk build · {len(eds)} edition(s) · {sum(len(x['arts']) for x in eds)} article(s) · {len(used)} chart(s) · {dt.datetime.now().astimezone(TZ).strftime('%H:%M:%S %Z')}")
    # Online fetch scope: charts used by the newest edition, plus charts with no CSV yet. Charts that only serve
    # older pieces stay as published. --fetch a,b narrows it; --fetch-all refreshes everything.
    newest = {c for a in eds[0]["arts"] for c in a.charts}
    no_csv = {c for c in used if not os.path.exists(os.path.join(DESK, "data", c + ".csv"))}
    fetch_ids = set(used) if args.fetch_all else (set(args.fetch.split(",")) if args.fetch else newest | no_csv)
    rendered = {}
    for cid in sorted(used):
        spec = specs[cid]
        if not args.offline and spec["kind"] != "hbar" and cid in fetch_ids:
            print("  fetch", cid)
            try:
                fetch_chart_data(spec)
            except Exception as ex:   # one unreachable source must never stop a release: keep the last saved CSV
                if not os.path.exists(os.path.join(DESK, "data", cid + ".csv")):
                    raise SystemExit(f"  ! fetch failed for {cid} and there is no saved CSV to fall back on: {ex!r}")
                print(f"  ! WARNING: fetch failed for {cid} ({type(ex).__name__}: {ex}); using the last saved CSV")
        svg, table = render_chart(spec)
        rendered[cid] = (spec, svg, table)
        if not args.no_png: chart_png(spec, svg)
        print("  chart", cid)
    cfg = dict(TZ=TZ, CONTENT=CONTENT, DESK=DESK, ROOT=ROOT, BASE=BASE, HOME=HOME, DESKS=DESKS, rel=rel, write=write, specs=specs, EDS=eds + embargo)
    for ed in sorted(eds + embargo, key=lambda x: x["pub"]):
        iss = epaper.load_issue(ed, cfg)
        if not iss or iss["avail"] > now: continue
        iss["web_live"] = ed in eds
        for c in epaper.DATA_SPREAD + epaper.SPREAD_FALLBACK + [c for a in ed["arts"] for c in a.charts]:
            if c not in rendered and c in specs and os.path.exists(os.path.join(DESK, "data", c + ".csv")):
                svg, table = render_chart(specs[c]); rendered[c] = (specs[c], svg, table)
                if not args.no_png: chart_png(specs[c], svg)
        iss["args"] = (se if ed["slot"] == "sun" else None, iss["web_live"], now)
        iss["html"], iss["json"], iss["meta"] = epaper.render_issue(iss, cfg, *iss["args"])
        iss["last"] = max([iss["avail"]] + [x["pub"] for x in iss["extras"]] + [u["t"] for u in iss["updates"]])
        pdf = os.path.join(ROOT, iss["dir"], iss["pdf"])
        iss["pdf_size"] = os.path.getsize(pdf) if os.path.exists(pdf) else 0
        EP[ed["key"]] = iss
    for ed in eds:
        write(ed["path"], edition_page(ed, rendered, eds))
        for a in ed["arts"]:
            write(a.path, article_page(a, eds, rendered))
            if not args.no_png:
                svg = rendered[a.charts[0]][1] if a.charts else None
                og_path = os.path.join(ROOT, a.og)
                # Only re-shoot OG for the newest edition (or a missing file). Older cards stay as published.
                if ed is eds[0] or not os.path.exists(og_path):
                    chrome_shot(og_card(a.title, f"{a.kicker} · {a.format_name}", a.dek, svg), og_path, 1200, 630)
            print("  page", a.path)
    if se:
        for a in se["arts"]:
            write(a.path, article_page(a, eds, rendered))
            if not args.no_png:
                svg = rendered[a.charts[0]][1] if a.charts else None
                og_path = os.path.join(ROOT, a.og)
                if not os.path.exists(og_path):
                    chrome_shot(og_card(a.title, f"{se['title']} · {a.event_label}", a.dek, svg), og_path, 1200, 630)
            print("  ledger", a.path)
        write(se["path"], ledger_page(se, rendered))
        if not args.no_png:
            chrome_shot(og_card(se["title"], "Inside Desk · Series", se["dek"], rendered.get("ledger-brent-2026", (None, None))[1]), os.path.join(DESK, "og", "ledger-2026.png"), 1200, 630)
    write(HOME, home_page(eds, rendered, se))
    write("insidedesk/archive.html", archive_page(eds, se))
    write("insidedesk/method.html", method_page())
    write("insidedesk/support.html", support_page())
    write("insidedesk/thanks.html", thanks_page())
    write("insidedesk/shelf.html", shelf_page())
    write("insidedesk/legal.html", legal_page())
    write("insidedesk/imprint.html", imprint_page())
    write("insidedesk/feed.xml", feed_xml(eds, rendered, se))
    write("insidedesk/sitemap.xml", sitemap_xml(eds, se))
    write("insidedesk/robots-snippet.txt", f"# Not a live robots.txt. If the owner approves a root robots.txt, add this line:\nSitemap: {BASE}insidedesk/sitemap.xml\n")
    if EP:
        epaper.copy_assets(cfg)
        for iss in EP.values():
            kept = None if args.no_png else epaper.kept_fit(iss, cfg)   # unchanged issue: keep its fitted pages
            if kept:
                iss["html"], iss["json"], iss["meta"] = kept
            else:
                pre = epaper.fit_key(iss)
                write(iss["dir"] + "/index.html", iss["html"]); write(iss["dir"] + "/edition.json", iss["json"])
            if not args.no_png and not kept:   # fit pass: measured in headless Chrome, so no page is clipped
                iss["html"], iss["json"], iss["meta"], over = epaper.fit_issue(iss, cfg, *iss["args"])
                if over: print("  ! ePaper overflow (px by page):", over)
                write(iss["dir"] + "/fit.sha256", pre + "\n")
            print("  epaper", iss["dir"], f'{iss["meta"]["pages"]} pages, {iss["meta"]["pieces"]} pieces')
            if not args.no_png:
                epaper.render_assets(iss, iss["html"], iss["json"], cfg, iss["meta"]["pages"])
        write("insidedesk/epaper/index.html", epaper_index_page())
        if not args.no_png:   # PDF size for the feed enclosure, now that it exists
            for iss in EP.values(): iss["pdf_size"] = os.path.getsize(os.path.join(ROOT, iss["dir"], iss["pdf"]))
            write("insidedesk/feed.xml", feed_xml(eds, rendered, se))
    favicons(args.no_png)
    if not args.no_png:
        chrome_shot(og_card("The twice-daily brief", "Inside Desk", "Markets, geo-economics, politics, psychology and ordinary life. Optimistic by habit. Data first. Commentary, not advice."),
                    os.path.join(DESK, "og", "default.png"), 1200, 630)
    print(f"done. · {dt.datetime.now().astimezone(TZ).strftime('%H:%M:%S %Z')}")

if __name__ == "__main__":
    with proc.run_dir():   # all headless-Chrome profiles/temp files of this run; removed (and Chrome killed) on exit
        main()
