#!/usr/bin/env python3
"""ePaper times and evening updates. Every time written here is the real Berlin time at the moment you run it.

  python3 insidedesk/tools/update_epaper.py add-extra 2026-10-19-pm energy short the-slug
      scaffold an ePaper-only piece (kind: second | short | brief) and list it under epaper.extras.
      It is a draft (validate.py refuses DRAFT) until you write it and stamp it.
  python3 insidedesk/tools/update_epaper.py stamp 2026-10-19-pm
      give every draft extra its real published time (now). Use when the issue first goes out.
  python3 insidedesk/tools/update_epaper.py update 2026-10-19-pm "What changed, one line" [--piece slug]
      evening ePaper only, until 22:30 Berlin: stamps draft extras, appends an update (shown as "Updated hh:mm"
      in the toolbar and on the Latest page). Then rebuild (build.py), validate, release.
Never backdate: there is no option to pass a time."""
import argparse, datetime as dt, os, re, sys
from zoneinfo import ZoneInfo
import yaml

TZ = ZoneInfo("Europe/Berlin")
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "content", "editions")
DESKS = ["markets", "geoecon", "politics", "psych", "energy", "money", "ordinary", "tech", "health", "security", "climate"]
CLOSE = (22, 30)

def load(key):
    p = os.path.join(ROOT, key, "edition.yaml")
    if not os.path.exists(p): sys.exit(f"no edition {key}")
    txt = open(p, encoding="utf-8").read()
    if not re.search(r"^epaper:.*\n", txt, re.M): sys.exit(f"{key} has no epaper: block (new_edition.py adds one)")
    head, tail = re.split(r"^epaper:.*\n", txt, maxsplit=1, flags=re.M)
    if re.search(r"^\S", tail, re.M): sys.exit("the epaper: block must be the last block of edition.yaml")
    return p, head, yaml.safe_load(txt), yaml.safe_load(txt)["epaper"]

def save(p, head, ep):
    ep.setdefault("extras", []); ep.setdefault("updates", [])
    body = yaml.safe_dump({"epaper": ep}, sort_keys=False, allow_unicode=True, width=200)
    body = re.sub(r"^(\s*(?:available|time): )'?([0-9T:+\-]+)'?$", r'\1"\2"', body, flags=re.M)
    open(p, "w", encoding="utf-8").write(head + body)

def stamp(key, now):
    xdir = os.path.join(ROOT, key, "epaper"); n = 0
    for f in sorted(os.listdir(xdir)) if os.path.isdir(xdir) else []:
        fp = os.path.join(xdir, f); t = open(fp, encoding="utf-8").read()
        if re.search(r"^published: (DRAFT|PUBLISHED_AT)\b.*$", t, re.M):
            if "DRAFT:" in t: sys.exit(f"{f} is still a draft (body contains DRAFT:). Write it, or delete it and remove it from epaper.extras.")
            open(fp, "w", encoding="utf-8").write(re.sub(r"^published: (DRAFT|PUBLISHED_AT)\b.*$", f'published: "{now.isoformat()}"', t, flags=re.M)); n += 1
    return n

ap = argparse.ArgumentParser(); sub = ap.add_subparsers(dest="cmd", required=True)
a1 = sub.add_parser("add-extra"); a1.add_argument("key"); a1.add_argument("desk", choices=DESKS); a1.add_argument("kind", choices=["second", "short", "brief"]); a1.add_argument("slug")
a2 = sub.add_parser("stamp"); a2.add_argument("key")
a3 = sub.add_parser("update"); a3.add_argument("key"); a3.add_argument("text"); a3.add_argument("--piece")
args = ap.parse_args()
now = dt.datetime.now(TZ).replace(microsecond=0)
p, head, ed, ep = load(args.key)
if args.cmd == "add-extra":
    xdir = os.path.join(ROOT, args.key, "epaper"); os.makedirs(xdir, exist_ok=True)
    fp = os.path.join(xdir, args.slug + ".md")
    if os.path.exists(fp): sys.exit(f"{fp} exists")
    size = {"second": "350-500 words", "short": "150-250 words", "brief": "60-120 words"}[args.kind]
    open(fp, "w", encoding="utf-8").write(f'''---
title: "Headline"
dek: "One-sentence dek in the desk voice."
desk: {args.desk}
kind: {args.kind}
published: DRAFT    # stamped with the real time by update_epaper.py stamp/update
sources:
  - {{n: 1, title: "", publisher: "", url: "", date: ""}}
---
DRAFT: {args.kind}, {size}. Real, fresh news or data, checked at the source today, cited with [1]. Delete this line.
''')
    ep.setdefault("extras", []).append(args.slug); save(p, head, ep)
    print("created", os.path.relpath(fp), "and listed it under epaper.extras")
elif args.cmd == "stamp":
    print(f"stamped {stamp(args.key, now)} extra(s) with {now.isoformat()}")
else:
    if ed["slot"] != "pm": sys.exit("updates are for the evening ePaper only")
    d = dt.date.fromisoformat(str(ed["date"]))
    close = dt.datetime(d.year, d.month, d.day, *CLOSE, tzinfo=TZ)
    pub = dt.datetime.fromisoformat(str(ed["published"])).astimezone(TZ)
    if now < pub: sys.exit("the evening ePaper is not out yet")
    if now > close: sys.exit(f"updates closed at {CLOSE[0]:02d}:{CLOSE[1]:02d} Berlin time. Tomorrow's edition carries it.")
    if args.piece and args.piece not in (ep.get("extras") or []) + ed["articles"]: sys.exit(f"unknown piece {args.piece}")
    n = stamp(args.key, now)
    u = {"time": now.isoformat(), "text": args.text}
    if args.piece: u["piece"] = args.piece
    ep.setdefault("updates", []).append(u); save(p, head, ep)
    print(f"update recorded at {now:%H:%M %Z}" + (f", {n} extra(s) stamped" if n else "") + ". Now: build.py, validate.py, release.")
