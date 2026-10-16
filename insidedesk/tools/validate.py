#!/usr/bin/env python3
"""Inside Desk — post-build checks. Exit 1 on any problem.
Checks: internal links/assets resolve, feed + sitemap are well-formed XML, JSON-LD parses,
every article lists sources, every chart has SVG+CSV(+PNG), no unrendered shortcodes,
no references to the retired generator (q7c/)."""
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
    if "/20" in rp.replace(os.sep, "/") and "evening" not in rp and "morning" not in rp and "sunday" not in rp:
        if 'id="s-h"' not in txt: problems.append(f"{rp}: article without sources")
for x in ("insidedesk/feed.xml", "insidedesk/sitemap.xml"):
    try: xml.dom.minidom.parse(os.path.join(ROOT, x))
    except Exception as ex: problems.append(f"{x}: invalid XML {ex}")
cd = os.path.join(ROOT, "insidedesk", "content", "charts")
for f in os.listdir(cd):
    cid = f[:-5]
    for ext, d in ((".svg", "charts"), (".png", "charts"), (".csv", "data")):
        if not os.path.exists(os.path.join(ROOT, "insidedesk", d, cid + ext)): problems.append(f"chart {cid}: missing {d}/{cid}{ext}")
print("\n".join(problems) if problems else f"✓ validate ok — {len(pages)} pages checked")
sys.exit(1 if problems else 0)
