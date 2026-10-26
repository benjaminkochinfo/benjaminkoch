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
Health & Care · Security & Order · Climate & Weather. Shape: **one lead + ten desk notes** (a note may use the `podium-vs-print` or
`annex` format instead of `note`).
* **Desk mix (owner, 26 Oct 2026):** Climate & Weather and Health & Care must rotate topics. Do not keep returning to
  the same few stories (for example Ebola, or Rhine/Kaub water levels). Prefer a wider mix of *current* and
  *forward-looking* pieces: for Climate, harvests, heat/cold snaps, storms, insurance and reinsurance costs, drought
  and flood elsewhere, air quality, seasonal outlooks, energy–weather links, COP/adaptation policy; for Health,
  vaccines and seroprevalence, hospital capacity, drug shortages, occupational health, mental-health data, new
  approvals or guidelines, and non-outbreak infectious disease when it is genuinely news. A Rhine or outbreak piece
  is fine when it is the day's real story; it must not be the default.
* Lead: 600–900 words, the day's main argument, a chart if one carries it.
* **Charts (house rule): every edition carries at least one chart, usually 2–3**, on the pieces where data carries the
  story (never decoration). Pick from `/workspace/insidedesk/charts-ready.md` or the existing dated specs
  (`*-21oct` style), or create a new open-data spec. Prefer a **new dated id** (`rates-fed-ecb-21oct`) over refreshing
  a shared one, because refreshing a shared id redraws every published page that uses it.
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

## Chart data refresh
An online `publish.sh` fetches only the charts used by the newest edition (plus any chart without a CSV). A chart
shared with older pieces will update there too, so after any fetch check that each refreshed chart's `alt` text still
describes the latest value. `--fetch id1,id2` narrows the fetch; `--fetch-all` refreshes everything.

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
* Quantity: at least one chart per edition, usually 2–3 (see "Writing an edition"). The coordinator or a writer may add
  new open-data specs at any time: new dated id, `source_line`, `licence`, `alt` written against the latest value.
* More sources: `smard` (Bundesnetzagentur day-ahead power etc., CC BY 4.0), FRED `ECBDFR` with licence `fred-ecb`
  (the ECB Data Portal API is unreachable from the box, so prefer this for the ECB deposit rate), `static` with
  licence `meteofrance` (Météo-France open data, Licence Ouverte 2.0). AGSI+ gas storage needs an API key (none set up).
* Fetch failures never stop a build: if a source cannot be reached, `build.py` prints `! WARNING: fetch failed …` and
  draws the chart from the last saved CSV. Only a brand-new chart without any CSV stops the build. After a warning, check
  that the chart's `alt` text still matches the data it shows.

## ePaper

Built by `build.py` (module `epaper.py`, assets in `tools/epaper/`) for every edition whose `edition.yaml` ends with an
`epaper:` block. It starts with Sunday 18 October 2026; earlier editions have no ePaper.

- Output: `insidedesk/epaper/YYYY/MM/DD/<morning|evening|sunday>/` with `index.html` (all pages server-rendered, works
  without JS), `edition.json` (search, chart data, updates), `thumbs/pNN.png` and `inside-desk-YYYY-MM-DD-<slot>.pdf`.
  `insidedesk/epaper/index.html` shows the latest issue and the ePaper archive. Shared: `epaper/assets/`, `epaper/sw.js`
  (service worker, scope `insidedesk/epaper/` only, caches an issue for offline reading once opened), `manifest.webmanifest`.
- Content: the website edition (lead + one note per desk + closing) plus ePaper-only extras in
  `content/editions/<key>/epaper/*.md` (`kind: second | short | brief`), listed under `epaper.extras`. Aim for 3-4 pieces
  per desk. Each extra carries its own real `published:` time and is shown as "ePaper extra, added hh:mm". No
  placeholders: a desk with nothing fresh gets fewer pieces, never padding. `validate.py` refuses drafts.
- Layout is measured, not guessed: the build renders each issue in headless Chrome, shortens the on-page part of an
  over-long piece ("Continue in reading view"; the full text is always in the reading view) or gives a desk a
  continuation page, then renders thumbnails and the PDF. Unchanged issues are not re-rendered (`render.sha256`).
  Needs `node` (20+) and Chrome on the box; `--no-png` skips this step (validate will then report the missing assets).
- Chrome housekeeping (`tools/proc.py`): every headless Chrome of a build keeps its profile and temp files in one
  per-run dir (`$TMPDIR/insidedesk-build-<pid>-*`, exported as `INSIDEDESK_RUN_TMP` and `TMPDIR`). On exit, also on
  error, Ctrl-C or SIGTERM, the build kills any Chrome left from the run and removes that dir.
- Chrome binary: the box's system Google Chrome hangs in headless mode (since ~23 Oct 2026). Builds must use the
  Chrome-for-Testing copy via `PATH=/workspace/chs/bin:$PATH`. `build.py` also prepends that directory itself when
  the shim is present, so a forgotten export cannot fall back to the hanging binary.
- Chart PNG / OG cost: `chart_png` skips when `insidedesk/charts/<id>.png.sha256` still matches the SVG; OG images are
  only re-shot for the newest edition (or when the file is missing). A full release should stay near ~3 minutes.
  Published ePapers stay locked via `fit.sha256` (unchanged issues are not re-measured or re-rendered).
- Detached releases on this box: source `/workspace/insidedesk-release-helper.sh` (heartbeat while waiting, `ensure`
  relaunch if a waiter is frozen after a VM fork, curl `--max-time` on the live check). The 17:25 / 06:25 safety net
  must call `ensure` if the log has no `start` line by two minutes past the slot — a `sleep`ing waiter survives a
  failed writing run, but a VM fork freezes it until wall-clock resumes.
- Charts in the ePaper are interactive: line charts (hover/tap, series toggles, ranges) and, since 21 Oct 2026, bar
  charts (`hbar`, hover/tap/arrow keys; drawn by `epaper/assets/epaper-bars.js`, loaded only by issues that have one).
- Sunday "The week in data": from 25 Oct 2026 the spread is picked automatically: the Sunday pieces' own line charts,
  then line charts used by that week's editions (newest first), topped up from `SPREAD_FALLBACK` in `epaper.py`.
  Sunday 18 Oct keeps its original fixed spread (`DATA_SPREAD`), so the published issue does not change.
- Links: header nav "ePaper", front-page module, "Read this edition as ePaper" on edition pages, archive rows, feed
  items (with the PDF as enclosure) and sitemap entries.

### Schedule (Berlin time)

| Issue | ePaper | Website | Updates |
|---|---|---|---|
| Morning | 06:30 | 08:30 (same pieces) | none |
| Evening | 17:30 | 17:30 | until 22:30, each with its real time |
| Sunday Magazine | 10:00 | 10:00 | none |

Morning: set `epaper.available` to 06:30 and `published` to 08:30. Between the two, the build leaves the website
edition out (it is not due yet) and publishes the ePaper only; the archive marks it "ePaper only until 08:30".
Rebuild and release again after 08:30 so the website edition appears. Saturday is closed.

### Routine

    python3 insidedesk/tools/new_edition.py 2026-10-19 am            # edition + 2 draft extras per desk
    python3 insidedesk/tools/update_epaper.py add-extra 2026-10-19-am energy second the-slug   # optional 4th piece
    # write every piece; delete an extra you cannot source (and its line under epaper.extras)
    python3 insidedesk/tools/update_epaper.py stamp 2026-10-19-am    # real time on every extra, at release
    python3 insidedesk/tools/build.py && python3 insidedesk/tools/validate.py

Evening updates (until 22:30 Berlin; the tool refuses later and has no way to pass a time):

    python3 insidedesk/tools/update_epaper.py update 2026-10-19-pm "Energy: OPEC+ statement added" --piece the-slug
    python3 insidedesk/tools/build.py && python3 insidedesk/tools/validate.py   # then release

The toolbar then shows "Updated hh:mm", the Latest page (page 3 of every evening issue) lists each update, and an
open evening issue checks for updates every five minutes until 22:30 and offers to load them.

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
