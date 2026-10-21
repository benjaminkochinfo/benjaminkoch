"""Inside Desk ePaper. Called by build.py; renders every edition that has an `epaper:` block.

Output per issue:  insidedesk/epaper/YYYY/MM/DD/<morning|evening|sunday>/
  index.html   all pages server-rendered (works without JS, readable by screen readers) + reading-view articles
  edition.json search index + chart data for the interactive charts + update log
  thumbs/pNN.png, inside-desk-YYYY-MM-DD-<slot>.pdf   rendered by headless Chrome (tools/epaper/render.mjs)
Shared:  insidedesk/epaper/assets/{epaper.css,epaper.js}, insidedesk/epaper/sw.js (scope: insidedesk/epaper/ only),
         insidedesk/epaper/manifest.webmanifest.  The ePaper front page (insidedesk/epaper/index.html) is built by build.py.

Content: the website edition (lead + one note per desk + closing) plus ePaper-only extras in
content/editions/<key>/epaper/*.md (kind: second | short | brief), each with its own real `published:` time.
No placeholders: a desk page shows only pieces that exist."""
import csv, datetime as dt, hashlib, html, json, os, re, shutil, subprocess
import markdown, yaml

e = lambda s: html.escape(str(s if s is not None else ""), quote=True)
EP_SLOT = {"am": ("Morning ePaper", "morning"), "pm": ("Evening ePaper", "evening"), "sun": ("Sunday Magazine", "sunday")}
KIND = {"second": "Second story", "short": "Short item", "brief": "Brief"}
ORDER = ["geoecon", "markets", "politics", "psych", "energy", "money", "ordinary", "tech", "health", "security", "climate"]
DATA_SPREAD = ["brent-wti-spot", "ust10-above-five", "policy-rates-fed-ecb", "ea-hicp-vs-dfr"]   # fixed spread, Sunday 18 Oct 2026 only
SPREAD_FIXED_UNTIL = dt.date(2026, 10, 18)   # later Sundays pick their "week in data" from the week's own editions
SPREAD_FALLBACK = ["de-power-day-ahead", "rates-fed-ecb-21oct", "ea-hicp-dfr-21oct", "ust10-21oct"]   # top-up if the week had < 3 line charts

def week_spread(ed, cfg, have):
    """Line charts used by the editions of the week ending this Sunday (newest first), not already in `have`."""
    specs, out = cfg["specs"], []
    eds = sorted([x for x in cfg.get("EDS", []) if 0 < (ed["d"] - x["d"]).days <= 6], key=lambda x: x["pub"], reverse=True)
    for c in [c for x in eds for a in x["arts"] for c in a.charts] + SPREAD_FALLBACK:
        if c in specs and specs[c]["kind"] == "line" and c not in have and c not in out \
                and os.path.exists(os.path.join(cfg["DESK"], "data", c + ".csv")):
            out.append(c)
    return out

def bar_model(cid, spec, cfg, page_dir):
    return {"id": cid, "kind": "hbar", "title": spec["title"], "subtitle": spec.get("subtitle", ""), "kicker": spec.get("kicker", ""),
            "unit": spec.get("unit", ""), "source": spec.get("source_line", ""), "alt": spec.get("alt", ""),
            "rows": [{"label": r["label"], "value": r["value"], "derived": bool(r.get("derived")), "note": r.get("note", "")} for r in spec["rows"]],
            "csv": cfg["rel"](page_dir + "/index.html", f"insidedesk/data/{cid}.csv")}
UPDATE_CLOSE = (22, 30)   # evening ePaper: live updates until 22:30 Berlin time
HERE = os.path.dirname(os.path.abspath(__file__))
ASSET_SRC = os.path.join(HERE, "epaper")

def strip_refs(s): return re.sub(r"\s?(?:\[\d+\])+", "", str(s))
def refs(s, slug):
    def one(m):
        return '<sup class="ref">' + ",".join(f'<a href="#{slug}-s{n}">{n}</a>' for n in re.findall(r"\d+", m.group(0))) + "</sup>"
    return re.sub(r"\s?(?:\[\d+\])+", one, s)

def blocks_of(body):
    out = []
    for chunk in re.split(r"\n\s*\n", body.strip()):
        m = re.match(r"^\[\[chart:([a-z0-9\-]+)\]\]$", chunk.strip())
        out.append(("chart", m.group(1)) if m else ("p", markdown.markdown(chunk, extensions=["extra", "smarty"])))
    return out

def clip_blocks(blocks, limit, keep_charts=True):
    """Leading blocks up to ~limit characters of text; the last paragraph may be cut at a sentence end.
    Returns (blocks, clipped?). The full text is always in the reading view."""
    out, n = [], 0
    for k, v in blocks:
        if k == "chart":
            if keep_charts and n + 1400 <= limit: out.append((k, v)); n += 1400
            elif out: return out, True
            continue
        ln = len(re.sub("<[^>]+>", "", v))
        if n + ln <= limit or not out and ln <= limit:
            out.append((k, v)); n += ln; continue
        inner = re.match(r"^<p>(.*)</p>$", v.strip(), re.S)
        if inner:
            parts = re.split(r"(?<=[.!?”])\s+(?=[A-Z“‘\d])", inner.group(1))
            take, m = [], n
            for sp in parts:
                sl = len(re.sub("<[^>]+>", "", sp))
                if take and m + sl > limit: break
                if not take and m + sl > limit and out: break
                take.append(sp); m += sl
                if len(re.findall(r"<(?!/)\w", " ".join(take))) != len(re.findall(r"</\w", " ".join(take))): continue
            if take and len(re.findall(r"<(?!/)\w", " ".join(take))) == len(re.findall(r"</\w", " ".join(take))) and len(take) < len(parts):
                out.append((k, "<p>" + " ".join(take) + " …</p>"))
        return out, True
    return out, False

def front_matter(p):
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", open(p, encoding="utf-8").read(), re.S)
    return yaml.safe_load(m.group(1)), m.group(2)

def issue_dir(ed): return f"insidedesk/epaper/{ed['d']:%Y/%m/%d}/{EP_SLOT[ed['slot']][1]}"
def pdf_name(ed): return f"inside-desk-{ed['d']:%Y-%m-%d}-{EP_SLOT[ed['slot']][1]}.pdf"

def load_issue(ed, cfg):
    """Return the ePaper model for an edition, or None if it has no `epaper:` block."""
    ep = ed.get("epaper")
    if not ep: return None
    TZ, CONTENT = cfg["TZ"], cfg["CONTENT"]
    avail = dt.datetime.fromisoformat(str(ep.get("available") or ed["published"])).astimezone(TZ)
    close = dt.datetime(ed["d"].year, ed["d"].month, ed["d"].day, *UPDATE_CLOSE, tzinfo=TZ) if ed["slot"] == "pm" else None
    arts = []
    for a in ed["arts"]:
        arts.append(dict(slug=a.slug, title=a.title, dek=a.dek, desk=a.desk, desk_name=a.desk_name, format=a.format,
                         blocks=blocks_of(a.body_md), minutes=a.minutes, sources=a.sources, watch=getattr(a, "watch", None) or [],
                         comment=getattr(a, "comment", ""), podium=getattr(a, "podium", None), print=getattr(a, "print", None),
                         charts=a.charts, pub=a.pub, web=a.path, extra=False, kind="main"))
    extras = []
    xdir = os.path.join(CONTENT, "editions", ed["key"], "epaper")
    for slug in ep.get("extras") or []:
        fm, body = front_matter(os.path.join(xdir, slug + ".md"))
        assert fm["kind"] in KIND, f"{slug}: kind must be one of {list(KIND)}"
        assert fm["desk"] in cfg["DESKS"], f"{slug}: unknown desk"
        words = len(re.sub(r"\[\d+\]", "", body).split())
        extras.append(dict(slug=slug, title=fm["title"], dek=fm.get("dek", ""), desk=fm["desk"], desk_name=cfg["DESKS"][fm["desk"]][0],
                           format="extra", blocks=blocks_of(body), minutes=max(1, round(words / 220)), words=words, sources=fm["sources"],
                           watch=[], comment="", charts=[], pub=dt.datetime.fromisoformat(str(fm["published"])).astimezone(TZ),
                           web=None, extra=True, kind=fm["kind"]))
    updates = sorted([dict(u, t=dt.datetime.fromisoformat(str(u["time"])).astimezone(TZ)) for u in ep.get("updates") or []], key=lambda u: u["t"], reverse=True)
    return dict(ed=ed, avail=avail, close=close, arts=arts, extras=extras, updates=updates, dir=issue_dir(ed), pdf=pdf_name(ed),
                updated=updates[0]["t"] if updates else None,
                extras_added=max((x["pub"] for x in extras), default=None))

def chart_model(cid, spec, cfg, page_dir):
    rows = [r for r in csv.reader(open(os.path.join(cfg["DESK"], "data", cid + ".csv"), encoding="utf-8")) if r and not r[0].startswith("#")]
    head, data = rows[0], rows[1:]
    labels = {s["key"]: s["label"] for s in spec.get("series", [])}
    panel = (spec.get("panel") or {}).get("key")
    if spec.get("panel"): labels[panel] = spec["panel"]["label"]
    series = []
    for j, k in enumerate(head[1:], 1):
        pts = [[r[0], float(r[j])] for r in data if len(r) > j and r[j] not in ("", ".")]
        series.append({"key": k, "label": labels.get(k, k), "points": pts, "panel": k == panel})
    return {"id": cid, "kind": spec["kind"], "title": spec["title"], "subtitle": spec.get("subtitle", ""), "kicker": spec.get("kicker", ""),
            "unit": spec.get("unit", ""), "decimals": spec.get("label_decimals", 1), "step": bool(spec.get("step")),
            "source": spec.get("source_line", ""), "alt": spec.get("alt", ""), "series": series, "annotations": spec.get("annotations", []),
            "csv": cfg["rel"](page_dir + "/index.html", f"insidedesk/data/{cid}.csv")}

def render_issue(iss, cfg, se=None, web_live=True, now=None, fit=None):
    """Build index.html and edition.json text for one issue. Returns (index_html, edition_json_text, meta)."""
    ed, TZ, rel = iss["ed"], cfg["TZ"], cfg["rel"]
    page_path = iss["dir"] + "/index.html"
    R = lambda p: rel(page_path, p)
    slot_name = EP_SLOT[ed["slot"]][0]
    d, pub = ed["d"], ed["pub"]
    tz = lambda t: t.strftime("%Z")
    arts, extras = iss["arts"], iss["extras"]
    lead = arts[0]
    by_desk = {a["desk"]: a for a in arts}
    xs_by = {}
    for x in extras: xs_by.setdefault(x["desk"], []).append(x)
    for k in xs_by: xs_by[k].sort(key=lambda x: list(KIND).index(x["kind"]))
    specs = cfg["specs"]
    chart_ids = []
    for a in arts:
        for c in a["charts"]:
            if c not in chart_ids: chart_ids.append(c)
    fixed_spread = ed["slot"] == "sun" and ed["d"] <= SPREAD_FIXED_UNTIL
    if fixed_spread:
        for c in DATA_SPREAD:
            if c in specs and c not in chart_ids and os.path.exists(os.path.join(cfg["DESK"], "data", c + ".csv")): chart_ids.append(c)
    elif ed["slot"] == "sun":
        chart_ids += week_spread(ed, cfg, chart_ids)
    charts = {c: chart_model(c, specs[c], cfg, iss["dir"]) for c in chart_ids if specs[c]["kind"] != "hbar"}
    bars = {c: bar_model(c, specs[c], cfg, iss["dir"]) for c in chart_ids if specs[c]["kind"] == "hbar"}

    def chart_fig(cid, size="m"):
        if cid not in charts and cid not in bars: return ""
        c = charts.get(cid) or bars[cid]
        return f'''<figure class="ichart ichart-{size}" data-chart="{e(cid)}">
  <figcaption><span class="ic-kicker">{e(c["kicker"])}</span><b class="ic-title">{e(c["title"])}</b><span class="ic-sub">{e(c["subtitle"])}</span></figcaption>
  <div class="ic-plot" role="img" aria-label="{e(c["alt"])}"><img class="ic-static" src="{R(f"insidedesk/charts/{cid}.svg")}" alt="" loading="lazy" decoding="async"><p class="ic-nojs">{e(c["alt"])}</p></div>
  <p class="ic-src">Source: {e(c["source"])} · <a href="{e(c["csv"])}">CSV</a></p>
</figure>'''

    def body(a, blocks):
        return "".join(chart_fig(v) if k == "chart" else refs(v, a["slug"]) for k, v in blocks)

    def open_btn(a, label="Read in reading view"):
        return f'<button class="open-a" data-open="{e(a["slug"])}" aria-label="{e(label)}: {e(a["title"])}">{e(label)} →</button>'

    def kicker(a):
        if a["extra"]:
            return f'{e(a["desk_name"])} · {KIND[a["kind"]]} · <span class="xk">ePaper extra, added <time datetime="{a["pub"].isoformat()}">{a["pub"]:%H:%M} {tz(a["pub"])}</time></span>'
        f = {"podium-vs-print": " · Podium vs Print", "sunday": " · The Sunday Sequence", "lead": " · Lead"}.get(a["format"], "")
        return f'{e(a["desk_name"])}{f} · {a["minutes"]} min'

    def pvp(a):
        if a["format"] != "podium-vs-print" or not a.get("podium"): return ""
        p, q = a["podium"], a["print"]
        return f'''<div class="pvp"><div class="pvp-pod"><span>Podium</span><blockquote>“{e(p["quote"])}”</blockquote><small>{e(p["who"])}, {e(p["when"])}</small></div>
<div class="pvp-print"><span>Print</span><b>{e(q["figure"])}</b><p>{e(q["line"])}</p><small>{e(q["who"])}, {e(q["when"])}</small></div></div>'''

    def story(a, cols=3, limit=None, size="l", charts_ok=True):
        blocks = a["blocks"] if charts_ok else [b for b in a["blocks"] if b[0] != "chart"]
        shown, more = clip_blocks(blocks, limit) if limit else (blocks, False)
        return f'''<article class="story story-{size}" data-article="{e(a["slug"])}" aria-labelledby="h-{e(a["slug"])}">
  <div class="st-kicker">{kicker(a)}</div>
  <h3 class="st-h" id="h-{e(a["slug"])}"><button class="hl" data-open="{e(a["slug"])}">{e(a["title"])}</button></h3>
  <p class="st-dek">{e(a["dek"])}</p>{pvp(a)}
  <div class="st-body cols-{cols}">{body(a, shown)}{"<p class='st-more'>" + open_btn(a, "Continue in reading view") + "</p>" if more else ""}</div>
</article>'''

    fit = fit or {}
    def xbox(x):
        cols = 2 if x["kind"] == "second" else 1
        lim = fit.get(x["desk"], {}).get(x["kind"])
        shown, more = clip_blocks(x["blocks"], lim) if lim else (x["blocks"], False)
        return f'''<article class="xa xa-{x["kind"]}" data-fit="{x["kind"]}" data-article="{e(x["slug"])}" aria-labelledby="h-{e(x["slug"])}">
  <div class="st-kicker">{kicker(x)}</div>
  <h3 class="xa-h" id="h-{e(x["slug"])}"><button class="hl" data-open="{e(x["slug"])}">{e(x["title"])}</button></h3>
  {f'<p class="st-dek">{e(x["dek"])}</p>' if x["kind"] != "brief" else ""}
  <div class="st-body cols-{cols}">{body(x, shown)}{"<p class='st-more'>" + open_btn(x, "Continue in reading view") + "</p>" if more else ""}</div>
</article>'''

    def watch_box(a):
        if not a["watch"]: return ""
        return f'<aside class="watch-box" aria-label="What to watch: {e(a["desk_name"])}"><h4>What to watch</h4><ul>{"".join(f"<li>{e(strip_refs(w))}</li>" for w in a["watch"])}</ul></aside>'

    def comment_box(a):
        return f'<aside class="pull" aria-label="Desk comment"><span>Desk comment</span><p>{e(a["comment"])}</p></aside>' if a.get("comment") else ""

    def extras_grid(xs):
        if not xs: return ""
        second = [x for x in xs if x["kind"] == "second"]; rest = [x for x in xs if x["kind"] != "second"]
        if second and rest:
            return f'<div class="xg xg-sr"><div class="xg-l" data-fit="second">{"".join(xbox(x) for x in second)}</div><div class="xg-r" data-fit="{"short" if any(x["kind"] == "short" for x in rest) else "brief"}">{"".join(xbox(x) for x in rest)}</div></div>'
        return f'<div class="xg xg-{min(3, len(xs))}">{"".join(xbox(x) for x in xs)}</div>'

    pages = []
    def page(title, section, inner, kind="std"):
        pages.append({"title": title, "section": section, "inner": inner, "kind": kind}); return len(pages)

    c = ed.get("closing") or {}
    page("Cover", "Cover", "COVER", "cover")
    page("Contents", "Contents", "CONTENTS", "contents")
    if ed["slot"] == "pm": page("Latest", "Latest", "LATEST", "latest")
    lead_pages = []
    lead_long = sum(len(re.sub("<[^>]+>", "", v)) for k, v in lead["blocks"] if k == "p") > 4200
    lead_charts = [v for k, v in lead["blocks"] if k == "chart"] or lead["charts"]
    if lead_long:
        bl = [b for b in lead["blocks"] if b[0] != "chart"]; half = (len(bl) + 1) // 2
        lead_pages.append(page(lead["title"], "The Sunday Sequence" if ed["slot"] == "sun" else "Lead", f'''<div class="cs-open"><span class="cv-k">{kicker(lead)}</span>
<h2 class="cs-h"><button class="hl" data-open="{e(lead["slug"])}">{e(lead["title"])}</button></h2><p class="cs-dek">{e(lead["dek"])}</p></div>
<div class="st-body cols-3 cs-body" data-article="{e(lead["slug"])}">{body(lead, bl[:half])}</div>''', "spread-l"))
        lead_pages.append(page(lead["title"] + ", continued", "The Sunday Sequence" if ed["slot"] == "sun" else "Lead", f'''{chart_fig(lead_charts[0], "l") if lead_charts else ""}
<div class="st-body cols-3 cs-body" data-article="{e(lead["slug"])}">{body(lead, bl[half:])}<p class="st-more">{open_btn(lead, "Whole piece in reading view")}</p></div>
<div class="row-2">{watch_box(lead)}{comment_box(lead)}</div>''', "spread-r"))
    else:
        lead_pages.append(page(lead["title"], "Lead", f'''{story(lead, cols=3, size="xl", limit=fit.get("_lead", {}).get("main"))}<div class="row-2">{watch_box(lead)}{comment_box(lead)}</div>''', "lead"))
    desk_page, desk_cont = {}, {}
    for k in ORDER:
        a = by_desk.get(k); xs = xs_by.get(k, [])
        if a is lead:
            if not xs: continue
            inner = f'''<p class="desk-note">This desk's lead is on page {lead_pages[0]}: <a href="#page-{lead_pages[0]}">{e(lead["title"])}</a>.</p>{extras_grid(xs)}'''
        else:
            xchars = sum(len(re.sub("<[^>]+>", "", v)) for x in xs for kk, v in x["blocks"] if kk == "p")
            limit = fit.get(k, {}).get("main") or (4600 if not xs else max(1500, 4300 - int(xchars * 0.95)))
            if fit.get(k, {}).get("split") and len(xs) > 1:
                first, rest = [x for x in xs if x["kind"] == "second"][:1] or xs[:1], None
                rest = [x for x in xs if x not in first]
                inner = f'''{story(a, cols=3, limit=limit, size="xl" if a["format"] == "podium-vs-print" else "l")}{extras_grid(first)}'''
                desk_page[k] = page(cfg["DESKS"][k][0], cfg["DESKS"][k][0], inner, "desk")
                desk_cont[k] = page(cfg["DESKS"][k][0] + ", continued", cfg["DESKS"][k][0], f'''<div class="row-2">{watch_box(a)}{comment_box(a)}</div>{extras_grid(rest)}''', "desk")
                continue
            inner = f'''{story(a, cols=3, limit=limit, size="xl" if a["format"] == "podium-vs-print" else "l")}
<div class="row-2">{watch_box(a)}{comment_box(a)}</div>{extras_grid(xs)}'''
        desk_page[k] = page(cfg["DESKS"][k][0], cfg["DESKS"][k][0], inner, "desk")
    if ed["slot"] == "sun" and se:
        items = "".join(f'<li><span>{e(x.event_label)} · {e(x.desk_name)}</span><a href="{R(x.path)}">{e(x.title)}</a><small>{e(x.dek)}</small></li>' for x in se["arts"])
        comments = "".join(f'<li><span>{e(a["desk_name"])}</span><button class="hl" data-open="{e(a["slug"])}">{e(a["comment"])}</button></li>' for a in arts if a.get("comment"))
        page("Weekend reading", "Weekend reading", f'''<h2 class="sec-big">Weekend reading</h2>
<div class="wr-grid"><section class="wr-ledger" aria-labelledby="wr-l"><h3 id="wr-l" class="wr-h">{e(se["title"])}</h3><p class="st-dek">{e(se["dek"])}</p><ol class="wr-list">{items}</ol></section>
<section class="wr-side" aria-labelledby="wr-c"><h3 id="wr-c" class="wr-h">The week in desk comments</h3><p class="st-dek">One line from each desk. Tap to read the piece behind it.</p><ol class="wr-comments">{comments}</ol></section></div>''', "weekend")
    def latest_table(ids, per_chart=None):
        rows = []
        for cid in ids:
            ch = charts[cid]
            for s in [x for x in ch["series"] if not (per_chart and x["panel"])][:per_chart]:
                if not s["points"]: continue
                dd, v = s["points"][-1]
                rows.append(f'<tr><th scope="row">{e(s["label"])}</th><td>{v:,.{ch["decimals"]}f}{e(ch["unit"])}</td><td>{dt.date.fromisoformat(dd):%-d %b %Y}</td><td>{e(ch["title"])}</td></tr>')
        return f'''<section class="ds-table" aria-labelledby="dst-h"><h3 id="dst-h" class="wr-h">Latest values</h3><table><thead><tr><th scope="col">Series</th><th scope="col">Value</th><th scope="col">Date</th><th scope="col">Chart</th></tr></thead><tbody>{"".join(rows)}</tbody></table>
<p class="faint">Last data point of {"the main series in each chart" if per_chart else "each series in the charts"} above, from the Inside Desk data archive. Sources under each chart.</p></section>'''
    ds = [x for x in chart_ids if x in charts]
    if ed["slot"] == "sun" and len(ds) >= 3:
        ds = (ds[-4:] if len(ds) > 4 else ds) if fixed_spread else ds[:4]
        page("The week in data", "Data spread", f'''<h2 class="sec-big">The week in data</h2><p class="st-dek">Interactive: hover or tap for values, switch series on and off, change the time range.</p>
<div class="ds-grid">{"".join(chart_fig(x, "ds") for x in ds[:2])}</div>''', "spread-l")
        page("The week in data, continued", "Data spread", f'''<div class="ds-grid">{"".join(chart_fig(x, "ds") for x in ds[2:4])}</div>{latest_table(ds, None if fixed_spread else 2)}''', "spread-r")
    elif ds:
        page("Charts and data", "Charts and data", f'''<h2 class="sec-big">Charts and data</h2><div class="ds-grid">{"".join(chart_fig(x, "ds") for x in ds[:2])}</div>{latest_table(ds[:2])}''', "data")
    if c:
        def cl_part(key, label):
            p = c.get(key)
            if not p: return ""
            if isinstance(p, str): p = {"text": p}
            term = f'<b class="cl-term">{e(p["term"])}</b>' if p.get("term") else ""
            note = f'<small>{e(strip_refs(p["note"]))}</small>' if p.get("note") else ""
            txt = re.sub(r"\[(\d+)\]", lambda m: f'<sup class="ref"><a href="#cl-s{m.group(1)}">{m.group(1)}</a></sup>', e(p["text"]))
            return f'<div class="cl-card cl-{key}"><h4>{e(label)}</h4>{term}<p>{txt}</p>{note}</div>'
        cl_src = "".join(f'<li id="cl-s{s["n"]}"><a href="{e(s["url"])}">{e(s["title"])}</a> — {e(s["publisher"])}, {e(s["date"])}</li>' for s in c.get("sources", []))
        page(c.get("title", "Before you close the tab"), "Back page", f'''<h2 class="sec-big">{e(c.get("title", "Before you close the tab"))}</h2>
<div class="cl-grid">{cl_part("sentence", "The day in one sentence")}{cl_part("habit", "One thing you can do this week")}{cl_part("went_right", "What went right")}{cl_part("euros", "In euros at home")}{cl_part("small_words", "Small words")}</div>
<ol class="cl-src">{cl_src}</ol>
<p class="fine">Commentary for information only. Not investment, legal, tax, medical or political advice. Inside Desk is free and reader-supported. Every number is sourced in the piece it appears in.</p>''', "back")

    N = len(pages)
    # ---- cover
    lead_chart = (lead["charts"] or [None])[0]
    inside = [k for k in ORDER if k in desk_page and k not in ("geoecon", "markets", "energy", "climate")][:4]
    xcount = len(extras)
    cover_lines = [by_desk[k] for k in ("geoecon", "markets", "energy", "climate") if k in by_desk and by_desk[k] is not lead][:4]
    day_label = f"{d:%A}, {d:%-d %B %Y}"
    status = (f"Available {iss['avail']:%H:%M} {tz(iss['avail'])}" if ed["slot"] == "am" else f"Published {pub:%H:%M} {tz(pub)}")
    cl = (fit or {}).get("_cover", 0)   # cover tightening level, set by fit_issue only when page 1 overflows
    has_chart = bool(lead_chart and lead_chart in charts)
    if cl >= 2 or (cl >= 1 and has_chart): inside = inside[:2]
    inside_nav = f'''<nav class="cv-inside" aria-label="Also in this issue"><h3>Also inside · {len(arts) + xcount} pieces</h3><ol>{"".join(f'<li><a href="#page-{desk_page[k]}"><span>{desk_page[k]}</span>{e(cfg["DESKS"][k][0])}<b>{e(by_desk[k]["title"] if by_desk.get(k) and by_desk[k] is not lead else xs_by[k][0]["title"])}</b></a></li>' for k in inside)}</ol></nav>'''
    nav_right = cl >= 1 and not has_chart   # no cover chart: the list moves under the quote in the right column
    pages[0]["inner"] = f'''<header class="cv-mast"><div class="cv-top"><span>{e(day_label)}</span><span>Always free</span></div>
  <h1 class="cv-title">Inside Desk</h1><div class="cv-sub"><span>{e("The Sunday Magazine" if ed["slot"] == "sun" else slot_name)}</span><span>{e(status)} · Berlin</span></div></header>
<div class="cv-grid">
  <div class="cv-story" data-article="{e(lead["slug"])}"><span class="cv-k">{"Cover story" if ed["slot"] == "sun" else "Lead"} · {e(lead["desk_name"])}</span>
    <h2 class="cv-h"><button class="hl" data-open="{e(lead["slug"])}">{e(lead["title"])}</button></h2>
    {"" if cl >= 3 else f'<p class="cv-dek">{e(lead["dek"])}</p>'}
    <p class="cv-stand">{e(ed["standfirst"])}</p>
    <div>{open_btn(lead, "Read the cover story" if ed["slot"] == "sun" else "Read the lead")} <a class="cv-jump" href="#page-{lead_pages[0]}">Go to page {lead_pages[0]} →</a></div>
    {"" if nav_right else inside_nav}</div>
  <div class="cv-art">{chart_fig(lead_chart, "cover") if lead_chart and lead_chart in charts else f'<div class="cv-quote"><p>{e(c.get("sentence", ed["standfirst"]))}</p></div>'}{f'<div class="cv-inside-r" style="margin-top:30px">{inside_nav}</div>' if nav_right else ""}</div>
</div>
<div class="cv-lines">{"".join(f'<div class="cv-line" data-article="{e(a["slug"])}"><span>{e(a["desk_name"])} · p. {desk_page[a["desk"]]}</span><button class="hl" data-open="{e(a["slug"])}">{e(a["title"])}</button></div>' for a in cover_lines)}</div>
{f'<p class="cv-sentence"><span>The {"week" if ed["slot"] == "sun" else "day"} in one sentence</span>{e(c["sentence"])}</p>' if c.get("sentence") else ""}'''
    # ---- contents
    toc = []
    for i, p in enumerate(pages, 1):
        if p["kind"] in ("cover", "contents") or p["title"].endswith("continued"): continue
        names = [a["title"] for a in arts + extras if f'data-article="{a["slug"]}"' in p["inner"] and f'id="h-{a["slug"]}"' in p["inner"]]
        if p["kind"] in ("spread-l", "lead"): names = [lead["title"]]
        if p["kind"] == "desk": names = [x["title"] for x in sorted([x for x in arts + extras if x["desk_name"] == p["section"]], key=lambda x: x["extra"])]
        sub = f' · {len(names)} pieces' if p["kind"] == "desk" and len(names) > 1 else ""
        toc.append(f'<li><a href="#page-{i}"><span class="tc-n">{i}</span><span class="tc-s">{e(p["section"])}{sub}</span><b>{e(names[0] if names else p["title"])}</b></a></li>')
    xline = f'<p class="faint">{xcount} ePaper extras, added <time datetime="{iss["extras_added"].isoformat()}">{iss["extras_added"]:%H:%M} {tz(iss["extras_added"])}</time>, {iss["extras_added"]:%-d %B}. They appear only in the ePaper and carry their own time.</p>' if xcount else ""
    pages[1]["inner"] = f'''<h2 class="sec-big">In this issue</h2>
<div class="tc-grid"><ol class="toc-list">{"".join(toc)}</ol>
<div class="tc-side"><div class="tc-box"><h4>This issue</h4><p>{e(ed["standfirst"])}</p><p class="faint">{len(arts)} edition pieces · {len(cfg["DESKS"])} desks · {e(status)}, {d:%-d %B %Y}</p>{xline}
{f'<p><a href="{R(ed["path"])}">The website edition</a></p>' if web_live else f'<p class="faint">The website edition follows at {ed["pub"]:%H:%M}.</p>'}</div>
<div class="tc-box"><h4>The ePaper rhythm</h4><ul class="rhythm"><li><b>06:30</b> Morning ePaper (website edition at 08:30)</li><li><b>17:30</b> Evening ePaper, updated live until 22:30 with an “Updated” time and a Latest page</li><li><b>Sun</b> 10:00 The Sunday Magazine</li></ul><p class="faint">Berlin time. Every issue is free.</p></div>
<div class="tc-box"><h4>How to read it</h4><p>Swipe, use the arrow keys or the page strip. Tap any headline for the reading view. Press <kbd>/</kbd> to search, <kbd>t</kbd> for contents, <kbd>+</kbd>/<kbd>−</kbd> to zoom. <a href="{R(iss["dir"] + "/" + iss["pdf"])}" download>Download the PDF</a>.</p></div></div></div>'''
    # ---- latest (evening)
    for p in pages:
        if p["kind"] == "latest":
            now = now or dt.datetime.now(TZ)
            state = (f"Live: this page and the issue are updated until {UPDATE_CLOSE[0]:02d}:{UPDATE_CLOSE[1]:02d} Berlin time." if iss["close"] and now < iss["close"]
                     else f"Final. Updates closed at {UPDATE_CLOSE[0]:02d}:{UPDATE_CLOSE[1]:02d} Berlin time.")
            rows = "".join(f'<li><time datetime="{u["t"].isoformat()}">{u["t"]:%H:%M}</time><p>{e(u["text"])}' + (f' <button class="hl" data-open="{e(u["piece"])}">Read →</button>' if u.get("piece") else "") + '</p></li>' for u in iss["updates"])
            p["inner"] = f'''<h2 class="sec-big">Latest</h2><p class="st-dek">{e(state)}</p>
<ol class="latest-list">{rows or f'<li><time datetime="{pub.isoformat()}">{pub:%H:%M}</time><p>Evening ePaper published. No updates yet.</p></li>'}</ol>'''
    # ---- reader + page numbers per piece
    def first_page(slug):
        for i, p in enumerate(pages, 1):
            if p["kind"] != "cover" and f'id="h-{slug}"' in p["inner"]: return i
        for i, p in enumerate(pages, 1):
            if p["kind"] != "cover" and f'data-article="{slug}"' in p["inner"]: return i
        return 1
    order = sorted(arts + extras, key=lambda a: (first_page(a["slug"]), 0 if not a["extra"] else 1 + list(KIND).index(a["kind"])))
    def reader_article(a):
        src = "".join(f'<li id="{e(a["slug"])}-s{s["n"]}"><a href="{e(s["url"])}">{e(s["title"])}</a> — {e(s["publisher"])}, {e(s["date"])}</li>' for s in a["sources"] or [])
        meta = (f'{e(a["desk_name"])} · {KIND[a["kind"]]} · ePaper extra, added <time datetime="{a["pub"].isoformat()}">{a["pub"]:%H:%M} {tz(a["pub"])}</time>' if a["extra"]
                else f'{e(a["desk_name"])} · {a["minutes"]} min read')
        web = f'<a href="{R(a["web"])}">This piece on the website</a> · ' if a["web"] and web_live else ("Appears only in the ePaper · " if a["extra"] else "")
        return f'''<article class="ra" id="a-{e(a["slug"])}" data-slug="{e(a["slug"])}" aria-labelledby="ra-{e(a["slug"])}">
  <p class="ra-k">{meta}</p>
  <h2 id="ra-{e(a["slug"])}">{e(a["title"])}</h2><p class="ra-dek">{e(a["dek"])}</p>{pvp(a)}
  <div class="ra-body">{body(a, a["blocks"])}</div>
  {f'<aside class="ra-watch"><h3>What to watch</h3><ul>{"".join(f"<li>{e(strip_refs(w))}</li>" for w in a["watch"])}</ul></aside>' if a["watch"] else ""}
  {f'<p class="ra-comment"><span>Desk comment</span> {e(a["comment"])}</p>' if a.get("comment") else ""}
  <h3 class="ra-sh">Sources</h3><ol class="ra-src">{src}</ol>
  <p class="ra-web">{web}Commentary for information only. Not advice.</p>
</article>'''
    pages_html = "".join(f'''<section class="page page-{p["kind"]}" id="page-{i}" data-n="{i}" data-title="{e(p["title"])}" aria-label="Page {i} of {N}: {e(p["title"])}" tabindex="-1">
  {"" if p["kind"] == "cover" else f'<header class="pg-head"><span class="pg-sec">{e(p["section"])}</span><span class="pg-brand">Inside Desk · {e(slot_name)}</span><span class="pg-date">{d:%-d %B %Y}</span></header>'}
  <div class="pg-inner">{p["inner"]}</div>
  <footer class="pg-foot"><span>{i}</span><span>Inside Desk · {e(slot_name)} · {d:%d.%m.%Y}</span></footer>
</section>''' for i, p in enumerate(pages, 1))
    idx = {}
    for a in order:
        txt = re.sub(r"<[^>]+>", " ", " ".join(v for k, v in a["blocks"] if k == "p"))
        idx[a["slug"]] = {"title": a["title"], "dek": a["dek"], "desk": a["desk_name"], "text": html.unescape(re.sub(r"\s+", " ", txt)).strip(),
                          "page": first_page(a["slug"]), "extra": a["extra"], "kind": a["kind"], "published": a["pub"].isoformat()}
    meta = {"key": ed["key"], "slot": ed["slot"], "slotName": slot_name, "date": d.isoformat(), "published": pub.isoformat(),
            "available": iss["avail"].isoformat(), "updated": iss["updated"].isoformat() if iss["updated"] else None,
            "updatesUntil": iss["close"].isoformat() if iss["close"] else None,
            "updates": [{"time": u["t"].isoformat(), "text": u["text"], "piece": u.get("piece")} for u in iss["updates"]],
            "title": ed["title"], "pages": [{"n": i, "title": p["title"], "section": p["section"], "kind": p["kind"]} for i, p in enumerate(pages, 1)],
            "articles": idx, "charts": charts, "pdf": iss["pdf"]}
    if bars: meta["bars"] = bars   # horizontal bar charts, drawn by epaper-bars.js (only issues that have one load it)
    thumbs = "".join(f'<li><button class="th" data-goto="{i}" aria-label="Page {i}: {e(p["title"])}"><img src="thumbs/p{i:02d}.png" alt="" width="100" height="141" loading="lazy" decoding="async"><span>{i}</span></button></li>' for i, p in enumerate(pages, 1))
    upd = f' · <b class="upd" id="upd">Updated <time datetime="{iss["updated"].isoformat()}">{iss["updated"]:%H:%M}</time></b>' if iss["updated"] else ' <b class="upd" id="upd" hidden></b>'
    xadd = f' · extras added {iss["extras_added"]:%H:%M}' if xcount and ed["slot"] == "sun" else ""
    tpl = open(os.path.join(ASSET_SRC, "shell.tpl"), encoding="utf-8").read()
    if bars: tpl = tpl.replace("</body>", '<script src="{{ASSETS}}epaper-bars.js" defer></script>\n</body>', 1)
    title = f"Inside Desk ePaper · {slot_name} · {d:%-d %B %Y}"
    desc = f"{slot_name}, {d:%-d %B %Y}: {ed['title']} {ed['standfirst']}"
    out = (tpl.replace("{{TITLE}}", e(title)).replace("{{DESC}}", e(desc)).replace("{{CANONICAL}}", e(cfg["BASE"] + iss["dir"] + "/"))
              .replace("{{EP_ROOT}}", R("insidedesk/epaper/index.html")[:-len("index.html")] or "./")
              .replace("{{ASSETS}}", R("insidedesk/epaper/assets/epaper.css")[:-len("epaper.css")])
              .replace("{{FONTS}}", R("insidedesk/assets/fonts/newsreader-text.woff2")[:-len("newsreader-text.woff2")])
              .replace("{{HOME}}", R(cfg["HOME"])).replace("{{EP_INDEX}}", R("insidedesk/epaper/index.html"))
              .replace("{{WEB_ED}}", f'<a class="tb" href="{R(ed["path"])}" id="b-web"><span>Website edition</span></a>' if web_live else "")
              .replace("{{EDITION_LABEL}}", e(f"{slot_name} · {d:%a %-d %b %Y}"))
              .replace("{{STATUS}}", e(status) + xadd + upd)
              .replace("{{SLOT}}", ed["slot"]).replace("{{UNTIL}}", iss["close"].isoformat() if iss["close"] else "")
              .replace("{{PAGES}}", pages_html).replace("{{READER}}", "".join(reader_article(a) for a in order)).replace("{{THUMBS}}", thumbs)
              .replace("{{N}}", str(N)).replace("{{PDF}}", iss["pdf"]))
    assert "{{" not in out, "unfilled template slot"
    return out, json.dumps(meta, ensure_ascii=False, separators=(",", ":")), {"pages": N, "pieces": len(arts) + xcount,
            "per_desk": {k: (1 if k in by_desk else 0) + len(xs_by.get(k, [])) for k in cfg["DESKS"]},
            "desk_pages": {**{k + "+": n for k, n in desk_cont.items()}, **desk_page, **({"_lead": lead_pages[0]} if not lead_long else {})}, "limits": {k: fit.get(k, {}) for k in desk_page}}

def copy_assets(cfg):
    for f in ("epaper.css", "epaper.js", "epaper-bars.js"):
        cfg["write"](f"insidedesk/epaper/assets/{f}", open(os.path.join(ASSET_SRC, f), encoding="utf-8").read())
    cfg["write"]("insidedesk/epaper/sw.js", open(os.path.join(ASSET_SRC, "sw.js"), encoding="utf-8").read())
    cfg["write"]("insidedesk/epaper/manifest.webmanifest", json.dumps({
        "name": "Inside Desk ePaper", "short_name": "ID ePaper", "start_url": "./", "scope": "./", "display": "standalone",
        "background_color": "#F3EEE4", "theme_color": "#F3EEE4",
        "icons": [{"src": "../assets/icon-512.png", "sizes": "512x512", "type": "image/png"}, {"src": "../assets/favicon.svg", "sizes": "any", "type": "image/svg+xml"}]}, indent=1))

def render_assets(iss, html_txt, json_txt, cfg, n_pages, force=False):
    """Thumbnails + PDF via headless Chrome (CDP, tools/epaper/render.mjs). Skipped when the inputs have not changed."""
    root = os.path.join(cfg["ROOT"], iss["dir"])
    assets = ("epaper.css", "epaper.js", "render.mjs") + (("epaper-bars.js",) if "epaper-bars.js" in html_txt else ())
    h = hashlib.sha256((html_txt + json_txt + "".join(open(os.path.join(ASSET_SRC, f), encoding="utf-8").read() for f in assets)).encode()).hexdigest()
    hf = os.path.join(root, "render.sha256")
    have = all(os.path.exists(os.path.join(root, "thumbs", f"p{i:02d}.png")) for i in range(1, n_pages + 1)) and os.path.exists(os.path.join(root, iss["pdf"]))
    if not force and have and os.path.exists(hf) and open(hf).read().strip() == h:
        return "cached"
    node, chrome = shutil.which("node"), (shutil.which("google-chrome") or shutil.which("chromium"))
    if not node or not chrome:
        print("  ! node/Chrome missing: ePaper thumbnails and PDF not rendered"); return "skipped"
    if os.path.isdir(os.path.join(root, "thumbs")):
        for f in os.listdir(os.path.join(root, "thumbs")):
            if f.endswith(".png"): os.unlink(os.path.join(root, "thumbs", f))
    r = subprocess.run([node, "--experimental-websocket", os.path.join(ASSET_SRC, "render.mjs"), cfg["ROOT"], iss["dir"], str(n_pages), iss["pdf"], chrome],
                       capture_output=True, text=True, timeout=600)
    print("  " + (r.stdout.strip() or r.stderr.strip()).replace("\n", "\n  "))
    if r.returncode != 0: raise SystemExit(f"ePaper render failed for {iss['dir']}")
    open(hf, "w").write(h + "\n")
    clip, cf = [l for l in r.stdout.splitlines() if l.startswith("CLIPPED:")], os.path.join(root, "render.clip")
    if clip: open(cf, "w").write(clip[0] + "\n")   # validate.py refuses a release while this file exists
    elif os.path.exists(cf): os.unlink(cf)
    return "rendered"

def audit(iss, cfg):
    """Overflow in px per page (headless Chrome). {} when everything fits."""
    node, chrome = shutil.which("node"), (shutil.which("google-chrome") or shutil.which("chromium"))
    if not node or not chrome: return {}
    r = subprocess.run([node, "--experimental-websocket", os.path.join(ASSET_SRC, "render.mjs"), cfg["ROOT"], iss["dir"], "0", "-", chrome, "audit"],
                       capture_output=True, text=True, timeout=300)
    line = [l for l in r.stdout.splitlines() if l.startswith("{")]
    return {int(k): v for k, v in json.loads(line[-1]).items()} if line else {}

def cover_overflow(iss, cfg):
    """Pixels by which the cover (page 1) overflows; 0 when it fits (headless Chrome)."""
    node, chrome = shutil.which("node"), (shutil.which("google-chrome") or shutil.which("chromium"))
    if not node or not chrome: return 0
    r = subprocess.run([node, "--experimental-websocket", os.path.join(ASSET_SRC, "cover-audit.mjs"), cfg["ROOT"], iss["dir"], chrome],
                       capture_output=True, text=True, timeout=120)
    line = [l for l in r.stdout.splitlines() if l.startswith("{")]
    return json.loads(line[-1]).get("cover", 0) if line else 0

def fit_issue(iss, cfg, se, web_live, now):
    """Render, measure in headless Chrome, and shorten the on-page part of over-long desk pages (the whole text is
    always in the reading view), repeat. A desk that cannot fit on one page gets a continuation page instead."""
    fit = {}
    for _ in range(10):
        h, j, m = render_issue(iss, cfg, se, web_live, now, fit)
        cfg["write"](iss["dir"] + "/index.html", h); cfg["write"](iss["dir"] + "/edition.json", j)
        over = audit(iss, cfg)
        bad = {k: over[n] for k, n in m["desk_pages"].items() if over.get(n)}
        if not bad:
            # cover: only an issue whose page 1 actually overflows gets a tighter cover, so covers that fit never change
            if fit.get("_cover", 0) < 3 and cover_overflow(iss, cfg):
                fit["_cover"] = fit.get("_cover", 0) + 1; continue
            return h, j, m, {}
        for key, o in bad.items():
            k = key.rstrip("+"); f = fit.setdefault(k, {})
            cols = o.get("cols", {})
            if k != "_lead" and not f.get("split") and (sum(cols.values()) > 260 or o.get("page", 0) > 260):
                f.clear(); f["split"] = True; continue
            for kind, px in cols.items():
                cur = min(f.get(kind) or 4000, o.get("len", {}).get(kind, 4000))
                f[kind] = max(350, cur - int(px * (8 if kind == "second" else 4)) - 60)
            if o.get("page") and not key.endswith("+"):
                f["main"] = max(1200, (f.get("main") or 4300) - int(o["page"] * 6) - 120)
    return h, j, m, over
