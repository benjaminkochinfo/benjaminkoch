# Inside Desk — publishing pipeline

Everything Inside Desk needs lives in `InsideDesk.html` (front page, generated) and `insidedesk/`.
Nothing here touches any other page of benjaminkoch.info. `q7c/` (the old text generator) is retired.

## One command
```bash
insidedesk/tools/publish.sh            # fetch data → charts (SVG+PNG+CSV) → pages → feed → sitemap → validate → path guard
insidedesk/tools/publish.sh --offline  # rebuild from committed CSVs, no network
insidedesk/tools/publish.sh --no-png   # skip PNG/OG images (no Chrome needed)
insidedesk/tools/serve.sh 8765         # preview at http://127.0.0.1:8765/InsideDesk.html
```
Requirements: Python 3.11+, `pip install pyyaml markdown`, Google Chrome/Chromium for PNG and OG images.

## Writing an edition
**House rule: every edition covers all eleven desks.** Markets & Macro · Geo-economics · Politics & Institutions ·
Psychology & Behaviour · Energy & Industry · Money, FX & Committees · Ordinary & Inherited Life · Tech & Compute ·
Health & Care · Security & Order · Climate & Weather (harvests, heat, storms, insurance costs, water,
energy-weather links). Shape: **one lead + ten desk notes** (a note may use the `podium-vs-print` or
`annex` format instead of `note`).
* Lead: 600–900 words, the day's main argument, a chart if one carries it.
* Notes: 3–6 short paragraphs each. A quiet desk still gets a brief note: brief is fine, empty is not.
* Rotating depth: the lead desk rotates (the scaffold picks one by date and slot; override with a third argument),
  so each desk leads about once a week (eleven desks, two weekday slots). Give one or two notes extra depth per edition, preferably
  desks that ran brief last time.
* Every note: real news or data from the last day or two, checked at the source, cited; `watch` and `comment` filled.
* `build.py` stops with an error if an edition is missing a desk.
* A note added after the edition went out gets its own real `published:` time in its front matter. Never backdate.
* **Closing section** (`closing:` in `edition.yaml`, rendered after the desk notes): plain, warm, optimistic but
  grounded. (a) *One thing you can do this week*: one small calm habit, marked "not advice". (b) *What went right*:
  one sourced piece of good news from data. (c) *The day in one sentence*: repeatable at dinner. (d) *In euros at
  home*: only when the news touches prices; sourced figures, with the calculation labelled desk arithmetic.
  (e) *Small words*: one term from the edition, explained plainly. Its own `sources` and real `published` time.
  No mailbag.

1. `python3 insidedesk/tools/new_edition.py 2026-10-19 am [lead-desk]` creates `insidedesk/content/editions/2026-10-19-am/`
   with `edition.yaml` (including the closing template), a lead and ten note templates, one per desk.
2. Edit `edition.yaml` (title, standfirst, article order: first = lead) and one Markdown file per piece.
   Front matter: `title, dek, desk, format (lead | note | podium-vs-print | sunday | annex), charts, sources, watch, comment`.
   `podium-vs-print` pieces also take `podium: {who, when, quote, url}` and `print: {who, when, figure, line, url}`.
3. Cite with `[1]`, `[2]` (numbers from `sources`). Put a chart on its own line: `[[chart:<id>]]`.
4. Run `publish.sh`, read every page in the preview, then commit **only** the paths the guard lists.

Publication time: `published` in `edition.yaml` (ISO with offset). CET/CEST labels are derived from the
Europe/Berlin tz database, so they are always correct for the date.

## Archive and permanence (house rule)
* Every morning, evening and Sunday edition keeps its permanent page `insidedesk/YYYY/MM/DD/{morning|evening|sunday}.html`
  after a newer edition takes the front page. Never delete or rename an edition folder; corrections go into the same
  folder (added notes carry their own real `published:` time).
* An edition page is the complete edition on its own: lead, every desk note, the closing section, and a
  "Charts and data" list linking each chart's SVG, PNG and CSV. It links to the previous and next edition.
* `archive.html` is a timeline grouped by month (with a month jump bar). Under each edition it lists every piece, the
  closing section (`#cl-h`) and the charts and data (`#data-h`). If it grows too long, split it by year
  (`archive/2027.html`) and keep month grouping; do not drop entries.
* The front page links the current edition's permanent page and the previous edition.
* `validate.py` fails the build if an edition folder, edition page, article, closing section or chart CSV is
  missing from the archive, the feed, the sitemap or its edition page, if a feed or sitemap URL has no page, if an
  edition page has no source folder, or if any internal link or anchor is broken. Never commit past a failure.

## Charts (house style "Desk Plate")
* One YAML per chart in `insidedesk/content/charts/`. Kinds: `line` (time series, optional `step`, `panel`,
  `derive: brent - wti`, `annotations`) and `hbar` (a few figures; `derived: true` bars are hatched = desk arithmetic).
* Sources (`tools/sources.py`): `fred` (only public-domain originators such as EIA, Treasury, Fed H.15),
  `ecb`, `eurostat`, `worldbank`, `static` (reported figures, with attribution). Each spec names a `licence` key; the
  licence text is printed under the chart and written into the CSV header.
* Output: `insidedesk/charts/<id>.svg` (standalone, fonts embedded by URL), `<id>.png` (2×), `insidedesk/data/<id>.csv`.
  In articles the SVG is inlined with `<title>/<desc>`, a written description, a values table and download links.
* Rules: a chart only where it carries the argument; no projections drawn as data; no Yahoo/Bloomberg/index-vendor
  data or anything whose terms forbid redistribution; never restyle per article — change `charts.py` once.

## Guard
`insidedesk/tools/check_paths.sh` fails if any changed path is outside `InsideDesk.html`, `q7c/`, `insidedesk/`.
Modes: git (working tree + index + untracked + commits since `BASE`, default `origin/main`), `--tree DIR`, `--stdin`.
`build.py` also refuses to write anywhere else.

Suggested CI (owner adds it; `.github/` is outside the Inside Desk paths, so it needs explicit approval):
```yaml
on: pull_request
jobs:
  guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: BASE=origin/${{ github.base_ref }} insidedesk/tools/check_paths.sh
```

## SEO notes
* `insidedesk/sitemap.xml` lists only `/insidedesk/` URLs (a sitemap may only list URLs under its own folder).
  Submit it and the front page `InsideDesk.html` in Google Search Console. A root `robots.txt` line is prepared in
  `insidedesk/robots-snippet.txt` but not created, because a root file affects every site on the domain.
* RSS: `insidedesk/feed.xml` (full text, chart PNGs, sources).
