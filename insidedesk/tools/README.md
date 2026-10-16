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
1. `python3 insidedesk/tools/new_edition.py 2026-10-19 am` creates `insidedesk/content/editions/2026-10-19-am/`.
2. Edit `edition.yaml` (title, standfirst, article order: first = lead) and one Markdown file per piece.
   Front matter: `title, dek, desk, format (lead | note | podium-vs-print | sunday | annex), charts, sources, watch, comment`.
   `podium-vs-print` pieces also take `podium: {who, when, quote, url}` and `print: {who, when, figure, line, url}`.
3. Cite with `[1]`, `[2]` (numbers from `sources`). Put a chart on its own line: `[[chart:<id>]]`.
4. Run `publish.sh`, read every page in the preview, then commit **only** the paths the guard lists.

Publication time: `published` in `edition.yaml` (ISO with offset). CET/CEST labels are derived from the
Europe/Berlin tz database, so they are always correct for the date.

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
