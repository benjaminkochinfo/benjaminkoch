#!/usr/bin/env python3
"""Scaffold an edition:  python3 insidedesk/tools/new_edition.py 2026-10-19 am
Creates insidedesk/content/editions/<date>-<slot>/edition.yaml and a lead article template."""
import os, sys, datetime as dt
from zoneinfo import ZoneInfo
date, slot = sys.argv[1], sys.argv[2]
assert slot in ("am", "pm", "sun")
hhmm = {"am": (8, 30), "pm": (17, 30), "sun": (10, 0)}[slot]
d = dt.date.fromisoformat(date)
pub = dt.datetime(d.year, d.month, d.day, *hhmm, tzinfo=ZoneInfo("Europe/Berlin"))
root = os.path.join(os.path.dirname(__file__), "..", "content", "editions", f"{date}-{slot}")
os.makedirs(root, exist_ok=False)
eds = os.path.join(os.path.dirname(__file__), "..", "content", "editions")
issue = len([x for x in os.listdir(eds) if os.path.isdir(os.path.join(eds, x))])
open(os.path.join(root, "edition.yaml"), "w").write(f'''date: "{date}"
slot: {slot}
issue: {issue}
published: "{pub.isoformat()}"
title: "EDITION HEADLINE"
standfirst: "One or two sentences: what the day did."
articles:
  - lead-slug
''')
open(os.path.join(root, "lead-slug.md"), "w").write('''---
title: "Headline"
dek: "One-sentence dek in the desk voice."
desk: markets   # markets geoecon politics psych energy money ordinary tech health security
format: lead    # lead | note | podium-vs-print | sunday | annex
charts: []      # ids from insidedesk/content/charts/*.yaml, only where a chart carries the argument
sources:
  - {n: 1, title: "", publisher: "", url: "", date: ""}
watch:
  - ""
comment: ""
---
Body in Markdown. Cite with [1]. Place a chart on its own line: [[chart:chart-id]]
''')
print("created", os.path.relpath(root))
