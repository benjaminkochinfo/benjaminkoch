#!/usr/bin/env python3
"""Inside Desk — post-build checks. Exit 1 on any problem.
Checks: internal links/assets resolve, feed + sitemap are well-formed XML, JSON-LD parses,
every article lists sources, every chart has SVG+CSV(+PNG), no unrendered shortcodes,
no references to the retired generator (q7c/),
and completeness: every edition, its pieces, closing section and chart CSVs are reachable from archive.html,
feed.xml, sitemap.xml and the edition page; the front page links the latest and the previous edition."""
import json, os, re, sys, xml.dom.minidom
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
problems = []
class P(HTMLParser):
    def __init__(s): super().__init__(); s.refs = []; s.ld = []; s._ld = False; s.ids = set()
    def handle_starttag(s, tag, a):
        a = dict(a)
        if "id" in a: s.ids.add(a["id"])
        for k in ("href", "src"):
            if k in a and a[k]: s.refs.append(a[k])
        s._ld = tag == "script" and a.get("type") == "application/ld+json"
    def handle_data(s, d):
        if s._ld: s.ld.append(d)
    def handle_endtag(s, tag): s._ld = False
pages = [os.path.join(ROOT, "InsideDesk.html")] + [os.path.join(dp, f) for dp, _, fs in os.walk(os.path.join(ROOT, "insidedesk")) for f in fs if f.endswith(".html")]
for p in pages:
    txt = open(p, encoding="utf-8").read(); rp = os.path.relpath(p, ROOT)
    if "[[chart:" in txt: problems.append(f"{rp}: unrendered chart shortcode")
    if "q7c/" in txt: problems.append(f"{rp}: still references q7c/")
    pr = P(); pr.feed(txt)
    for blob in pr.ld:
        try: json.loads(blob)
        except Exception as ex: problems.append(f"{rp}: bad JSON-LD {ex}")
    for r in pr.refs:
        u = urlparse(r)
        if u.scheme or r.startswith("//") or r.startswith("mailto:"): continue
        if r.startswith("#"):
            if r[1:] and r[1:] not in pr.ids: problems.append(f"{rp}: missing anchor {r}")
            continue
        path = unquote(u.path)
        target = os.path.join(ROOT, path.lstrip("/")) if path.startswith("/") else os.path.normpath(os.path.join(os.path.dirname(p), path))
        if path.startswith("/") and not (path.startswith("/insidedesk/") or path == "/InsideDesk.html"):
            continue  # site-wide pages owned by other parts of the repo (e.g. /imprint.html, /privacy.html)
        if not os.path.exists(target): problems.append(f"{rp}: broken link {r}")
    if re.search(r"insidedesk/20\d\d/\d\d/\d\d/", rp.replace(os.sep, "/")) and "evening" not in rp and "morning" not in rp and "sunday" not in rp:
        if 'id="s-h"' not in txt: problems.append(f"{rp}: article without sources")
for x in ("insidedesk/feed.xml", "insidedesk/sitemap.xml"):
    try: xml.dom.minidom.parse(os.path.join(ROOT, x))
    except Exception as ex: problems.append(f"{x}: invalid XML {ex}")
cd = os.path.join(ROOT, "insidedesk", "content", "charts")
for f in os.listdir(cd):
    cid = f[:-5]
    for ext, d in ((".svg", "charts"), (".png", "charts"), (".csv", "data")):
        if not os.path.exists(os.path.join(ROOT, "insidedesk", d, cid + ext)): problems.append(f"chart {cid}: missing {d}/{cid}{ext}")
# ---- completeness: every edition and every piece is reachable from archive, feed and sitemap
import datetime as _dt, yaml
BASE = "https://benjaminkoch.info/"
SLOT_SLUG = {"am": "morning", "pm": "evening", "sun": "sunday"}
def _fm(path):
    m = re.match(r"^---\n(.*?)\n---\n", open(path, encoding="utf-8").read(), re.S)
    return yaml.safe_load(m.group(1)) if m else {}
def _hrefs(rel_page):
    pr = P(); pr.feed(open(os.path.join(ROOT, rel_page), encoding="utf-8").read())
    out = set()
    for r in pr.refs:
        u = urlparse(r)
        if u.scheme: continue
        out.add(os.path.relpath(os.path.normpath(os.path.join(os.path.dirname(os.path.join(ROOT, rel_page)), unquote(u.path))), ROOT).replace(os.sep, "/") + ("#" + u.fragment if u.fragment else ""))
    return out
arch = _hrefs("insidedesk/archive.html")
feed_txt = open(os.path.join(ROOT, "insidedesk/feed.xml"), encoding="utf-8").read()
feed_links = set(re.findall(r"<link>([^<]+)</link>", feed_txt))
smap = set(re.findall(r"<loc>([^<]+)</loc>", open(os.path.join(ROOT, "insidedesk/sitemap.xml"), encoding="utf-8").read()))
for loc in smap | {l for l in feed_links if l.startswith(BASE + "insidedesk/")}:
    if not os.path.exists(os.path.join(ROOT, loc[len(BASE):])): problems.append(f"feed/sitemap URL has no page: {loc}")
ed_root = os.path.join(ROOT, "insidedesk", "content", "editions")
known_ed_pages, n_eds = set(), 0
editions = sorted(os.listdir(ed_root)) if os.path.isdir(ed_root) else []
latest = None
for name in editions:
    yf = os.path.join(ed_root, name, "edition.yaml")
    if not os.path.exists(yf): problems.append(f"edition folder {name}: no edition.yaml"); continue
    ed = yaml.safe_load(open(yf, encoding="utf-8")); n_eds += 1
    d = _dt.date.fromisoformat(str(ed["date"]))
    ep = f"insidedesk/{d:%Y/%m/%d}/{SLOT_SLUG[ed['slot']]}.html"; known_ed_pages.add(ep)
    if latest is None or str(ed["published"]) > str(latest[1]): latest = (ep, ed["published"])
    if not os.path.exists(os.path.join(ROOT, ep)): problems.append(f"{name}: edition page {ep} missing"); continue
    if ep not in arch: problems.append(f"{name}: edition page not linked from archive.html")
    if BASE + ep not in smap: problems.append(f"{name}: edition page not in sitemap")
    ed_links = _hrefs(ep)
    if ed.get("closing"):
        if 'id="cl-h"' not in open(os.path.join(ROOT, ep), encoding="utf-8").read(): problems.append(f"{name}: closing section missing from edition page")
        if ep + "#cl-h" not in arch: problems.append(f"{name}: closing section not linked from archive.html")
    for slug in ed["articles"]:
        mf = os.path.join(ed_root, name, slug + ".md")
        if not os.path.exists(mf): problems.append(f"{name}: article file {slug}.md missing"); continue
        ap = f"insidedesk/{d:%Y/%m/%d}/{slug}.html"
        if not os.path.exists(os.path.join(ROOT, ap)): problems.append(f"{name}: article page {ap} missing"); continue
        if ap not in arch: problems.append(f"{ap}: not in archive.html")
        if ap not in ed_links: problems.append(f"{ap}: not linked from its edition page")
        if BASE + ap not in feed_links: problems.append(f"{ap}: not in feed.xml")
        if BASE + ap not in smap: problems.append(f"{ap}: not in sitemap.xml")
        for c in _fm(mf).get("charts") or []:
            if f"insidedesk/data/{c}.csv" not in ed_links: problems.append(f"{ep}: no CSV link for chart {c}")
    for f in os.listdir(os.path.join(ed_root, name)):
        if f.endswith(".md") and f[:-3] not in ed["articles"]: problems.append(f"{name}: {f} exists but is not listed in edition.yaml")
# rendered edition pages that have no source folder (would silently drop out of the archive)
for dp, _, fs in os.walk(os.path.join(ROOT, "insidedesk")):
    for f in fs:
        rp = os.path.relpath(os.path.join(dp, f), ROOT).replace(os.sep, "/")
        if re.fullmatch(r"insidedesk/20\d\d/\d\d/\d\d/(morning|evening|sunday)\.html", rp) and rp not in known_ed_pages:
            problems.append(f"{rp}: edition page without an edition folder")
if latest and latest[0] not in _hrefs("InsideDesk.html"): problems.append("front page does not link the latest edition's permanent page")
# with more than one edition, the front page must also link the previous one
if n_eds > 1:
    pubs = sorted(((str(yaml.safe_load(open(os.path.join(ed_root, n, "edition.yaml")))["published"]), n) for n in editions), reverse=True)
    pn = pubs[1][1]; pe = yaml.safe_load(open(os.path.join(ed_root, pn, "edition.yaml")))
    pp = f"insidedesk/{_dt.date.fromisoformat(str(pe['date'])):%Y/%m/%d}/{SLOT_SLUG[pe['slot']]}.html"
    if pp not in _hrefs("InsideDesk.html"): problems.append("front page does not link the previous edition")
ser = os.path.join(ROOT, "insidedesk", "content", "ledger", "series.yaml")
if os.path.exists(ser):
    se = yaml.safe_load(open(ser, encoding="utf-8"))
    if se["path"] not in arch: problems.append("ledger series page not linked from archive.html")
    for key in se["pieces"]:
        fm = _fm(os.path.join(os.path.dirname(ser), key + ".md"))
        d = _dt.date.fromisoformat(str(fm["event_date"]))
        ap = f"insidedesk/{d:%Y/%m/%d}/{fm['slug']}.html"
        for label, ok in (("archive.html", ap in arch), ("feed.xml", BASE + ap in feed_links), ("sitemap.xml", BASE + ap in smap), ("page", os.path.exists(os.path.join(ROOT, ap)))):
            if not ok: problems.append(f"ledger {ap}: missing from {label}")
print("\n".join(problems) if problems else f"✓ validate ok — {len(pages)} pages checked · {n_eds} edition(s) complete in archive, feed and sitemap")
sys.exit(1 if problems else 0)
