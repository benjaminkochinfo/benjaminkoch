#!/usr/bin/env python3
"""Scaffold an edition:  python3 insidedesk/tools/new_edition.py 2026-10-19 am [lead-desk]
Creates insidedesk/content/editions/<date>-<slot>/ with edition.yaml, one lead and ten desk notes,
so every edition covers all eleven desks. The lead desk rotates by date and slot unless you name one.
The website edition keeps that shape (lead + one note per desk + closing). The ePaper is built from the same
pieces plus ePaper-only extras in epaper/: two per desk are scaffolded (a short item and a brief), so each desk has
3 pieces; add a second story with update_epaper.py add-extra for 4. Extras are drafts until written; delete one
(and its line under epaper.extras) rather than pad. update_epaper.py stamp gives them their real time."""
import os, sys, datetime as dt
from zoneinfo import ZoneInfo

DESKS = ["markets", "geoecon", "politics", "psych", "energy", "money", "ordinary", "tech", "health", "security", "climate"]
date, slot = sys.argv[1], sys.argv[2]
assert slot in ("am", "pm", "sun")
d = dt.date.fromisoformat(date)
hhmm = {"am": (8, 30), "pm": (17, 30), "sun": (10, 0)}[slot]
pub = dt.datetime(d.year, d.month, d.day, *hhmm, tzinfo=ZoneInfo("Europe/Berlin"))
ep_hhmm = {"am": (6, 30), "pm": (17, 30), "sun": (10, 0)}[slot]   # morning ePaper comes out two hours before the website
ep_avail = dt.datetime(d.year, d.month, d.day, *ep_hhmm, tzinfo=ZoneInfo("Europe/Berlin"))
lead = sys.argv[3] if len(sys.argv) > 3 else DESKS[(d.toordinal() * 2 + (slot == "pm")) % len(DESKS)]
assert lead in DESKS, f"lead desk must be one of {DESKS}"
order = [lead] + [x for x in DESKS if x != lead]

root = os.path.join(os.path.dirname(__file__), "..", "content", "editions", f"{date}-{slot}")
os.makedirs(root, exist_ok=False)
slugs = [f"{x}-{'lead' if i == 0 else 'note'}" for i, x in enumerate(order)]
open(os.path.join(root, "edition.yaml"), "w").write(f'''date: "{date}"
slot: {slot}
published: "{pub.isoformat()}"   # set to the actual Berlin time when it goes live
title: "EDITION HEADLINE"
standfirst: "One or two sentences: what the day did."
closing:    # end-of-edition section, plain and warm; no mailbag
  title: "Before you close the tab"
  habit: {{text: "One small, calm, practical habit for the week.", note: "A habit, not advice."}}
  went_right: {{text: "One sourced piece of genuinely good news from data [1]."}}
  sentence: "The day in one line a non-expert could repeat at dinner."
  euros: {{text: "Only when the news touches prices: what it means for a household's month, from sourced figures [1].", note: "Desk arithmetic on the cited figures."}}
  small_words: {{term: "A term used in this edition", text: "Two or three plain sentences."}}
  sources:
    - {{n: 1, title: "", publisher: "", url: "", date: ""}}
articles:   # lead first, then one note per remaining desk. Rename slugs to the headline. Every desk is required.
''' + "".join(f"  - {s}\n" for s in slugs))
for i, (desk, slug) in enumerate(zip(order, slugs)):
    fmt = "lead" if i == 0 else "note"
    size = ("Lead: 600-900 words, the day's argument, a chart if one carries it."
            if i == 0 else "Desk note: 3-6 short paragraphs. Brief is fine; empty is not.")
    open(os.path.join(root, slug + ".md"), "w").write(f'''---
title: "Headline"
dek: "One-sentence dek in the desk voice."
desk: {desk}
format: {fmt}    # lead | note | podium-vs-print | sunday | annex
charts: []      # chart ids (insidedesk/content/charts/*.yaml) where data carries the story; the edition needs at least one, usually 2-3
sources:
  - {{n: 1, title: "", publisher: "", url: "", date: ""}}
watch:
  - ""
comment: ""
---
{size} Real news or data from the last day or two, checked at the source. Cite with [1].
Charts: every edition carries at least one chart, usually 2-3, on pieces where data carries the story. Pick from
/workspace/insidedesk/charts-ready.md or the dated specs (e.g. rates-fed-ecb-21oct), or create a new open-data spec with a NEW
dated id (never refresh a shared id: published pages would change). Place it on its own line: [[chart:chart-id]]
''')
extras = [f"{x}-{k}" for x in order for k in ("short", "brief")]
open(os.path.join(root, "edition.yaml"), "a").write(f'''epaper:     # keep this block last; update_epaper.py edits it
  available: "{ep_avail.isoformat()}"   # when the ePaper issue goes out (morning 06:30, evening 17:30, Sunday 10:00)
  extras:
''' + "".join(f"    - {x}\n" for x in extras) + "  updates: []\n")
os.makedirs(os.path.join(root, "epaper"))
for x in extras:
    desk, kind = x.rsplit("-", 1)
    size = {"short": "150-250 words", "brief": "60-120 words"}[kind]
    open(os.path.join(root, "epaper", x + ".md"), "w").write(f'''---
title: "Headline"
dek: "One-sentence dek in the desk voice."
desk: {desk}
kind: {kind}       # second | short | brief
published: DRAFT    # update_epaper.py stamp sets the real time when it goes out
sources:
  - {{n: 1, title: "", publisher: "", url: "", date: ""}}
---
DRAFT: ePaper {kind}, {size}. A different story from the desk's website note: fresh news or data, checked at the source, cited with [1]. Delete this line.
''')
print("reminder: at least one chart per edition, usually 2-3, where data carries the story (see tools/README.md, Charts)")
print("created", os.path.relpath(root), "· lead desk:", lead, f"· {len(extras)} ePaper extras (drafts)")
