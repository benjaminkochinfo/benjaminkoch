"""Inside Desk — primary-data fetchers.

Every fetcher returns a list of (date_string 'YYYY-MM-DD', float) tuples, oldest first.
Only open / public-domain sources are wired in on purpose. Each source carries the
attribution + licence text that must appear under any chart that uses it.
"""
import csv, io, json, urllib.request, urllib.parse

UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64; compatible; InsideDesk-build/1.1; +https://benjaminkoch.info/InsideDesk.html)",
      "Accept": "text/csv,application/json,text/plain;q=0.9,*/*;q=0.5", "Accept-Language": "en"}

LICENCES = {
    "fred-eia": "EIA spot prices via FRED, Federal Reserve Bank of St. Louis. U.S. government data, public domain.",
    "fred-h15": "Board of Governors of the Federal Reserve System (H.15) via FRED. Public domain.",
    "fred-bea": "U.S. Bureau of Economic Analysis via FRED, Federal Reserve Bank of St. Louis. U.S. government data, public domain.",
    "eurostat": "Eurostat. Reuse authorised under CC BY 4.0 (Commission Decision 2011/833/EU).",
    "ecb": "European Central Bank Data Portal. Reuse permitted with source acknowledgement.",
    "worldbank": "World Bank Open Data. CC BY 4.0.",
    "fred-ecb": "European Central Bank deposit facility rate (ECBDFR) via FRED, Federal Reserve Bank of St. Louis. © European Central Bank; reuse permitted with source acknowledgement.",
    "smard": "Bundesnetzagentur | SMARD.de, market data. CC BY 4.0.",
    "meteofrance": "Météo-France, Données climatologiques de base quotidiennes (meteo.data.gouv.fr). Licence Ouverte / Etalab 2.0.",
    "pegelonline": "Wasserstraßen- und Schifffahrtsverwaltung des Bundes (WSV), PEGELONLINE. Datenlizenz Deutschland – Zero – Version 2.0.",
    "reported": "Figures as reported by the named organisations; facts cited with attribution.",
}

def _get(url, timeout=40, expect_data=True):
    """GET with one retry. A data endpoint that answers with an HTML page (bot check, maintenance page) is a failure,
    so build.py falls back to the last saved CSV instead of parsing a web page as data."""
    import time
    last = None
    for attempt in (1, 2):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                ctype = r.headers.get("Content-Type", "")
                txt = r.read().decode("utf-8")
            head = txt.lstrip()[:300].lower()
            if expect_data and ("text/html" in ctype or head.startswith("<!doctype html") or head.startswith("<html") or "<html" in head):
                raise ValueError(f"HTML page instead of data from {url.split('?')[0]} (bot check or maintenance?)")
            if expect_data and not txt.strip():
                raise ValueError(f"empty response from {url.split('?')[0]}")
            return txt
        except Exception as ex:
            last = ex
            if attempt == 1: time.sleep(3)
    raise last

def fred(series_id, start=None):
    """FRED CSV download. Use ONLY for series whose originating agency is public domain
    (e.g. EIA, Treasury, Fed H.15). Check the series' copyright note before adding new ones."""
    txt = _get("https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + urllib.parse.quote(series_id))
    out = []
    rows = list(csv.DictReader(io.StringIO(txt)))
    if not rows or series_id not in rows[0]:
        raise ValueError(f"FRED {series_id}: response is not the expected CSV")
    for row in rows:
        d = row.get("observation_date") or row.get("DATE")
        v = row.get(series_id)
        if not d or v in (None, "", "."):
            continue
        if start and d < start:
            continue
        out.append((d, float(v)))
    return out

def ecb(flow, key, start=None):
    """ECB Data Portal SDMX REST, csv. e.g. ecb('FM','D.U2.EUR.4F.KR.DFR.LEV')"""
    q = {"format": "csvdata"}
    if start:
        q["startPeriod"] = start
    txt = _get(f"https://data-api.ecb.europa.eu/service/data/{flow}/{key}?" + urllib.parse.urlencode(q))
    out = []
    for row in csv.DictReader(io.StringIO(txt)):
        v = row.get("OBS_VALUE")
        if v in (None, ""):
            continue
        d = row["TIME_PERIOD"]
        if len(d) == 7:
            d += "-01"
        out.append((d, float(v)))
    return out

def eurostat(dataset, start=None, **filters):
    """Eurostat dissemination API (JSON-stat 2.0). Filters must pin every dimension but time."""
    q = [("lang", "EN")] + [(k, v) for k, v in filters.items()]
    if start:
        q.append(("sinceTimePeriod", start[:7]))
    txt = _get(f"https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}?" + urllib.parse.urlencode(q))
    d = json.loads(txt)
    idx = d["dimension"]["time"]["category"]["index"]
    inv = {v: k for k, v in idx.items()}
    out = []
    for k, v in sorted(d["value"].items(), key=lambda kv: int(kv[0])):
        t = inv[int(k)]
        if len(t) == 7:
            t += "-01"
        out.append((t, float(v)))
    return out

def worldbank(country, indicator, start=None):
    txt = _get(f"https://api.worldbank.org/v2/country/{country}/indicator/{indicator}?format=json&per_page=200")
    rows = json.loads(txt)[1] or []
    out = [(r["date"] + "-01-01", float(r["value"])) for r in rows if r["value"] is not None]
    out.sort()
    return [p for p in out if not start or p[0] >= start]

def smard(filter_id, region="DE", resolution="day", start=None):
    """SMARD.de chart data (Bundesnetzagentur, CC BY 4.0). e.g. filter 4169 = day-ahead price DE-LU, EUR/MWh.
    Dates are Berlin delivery days; delivery days after today (next-day auction results) are left out."""
    import datetime as _dt, zoneinfo
    tz = zoneinfo.ZoneInfo("Europe/Berlin")
    base = f"https://www.smard.de/app/chart_data/{filter_id}/{region}/"
    stamps = json.loads(_get(base + f"index_{resolution}.json"))["timestamps"]
    t0 = _dt.datetime.fromisoformat(start).replace(tzinfo=tz).timestamp() * 1000 if start else 0
    # a chunk starting before `start` can still hold points after it: keep the last chunk before start too
    keep = [t for t in stamps if t >= t0]
    prev = [t for t in stamps if t < t0]
    if prev: keep = [prev[-1]] + keep
    today = _dt.datetime.now(tz).date().isoformat()
    pts = {}
    for t in keep:
        for ts, v in json.loads(_get(base + f"{filter_id}_{region}_{resolution}_{t}.json"))["series"]:
            if v is None: continue
            d = _dt.datetime.fromtimestamp(ts / 1000, tz).date().isoformat()
            if (not start or d >= start) and d <= today: pts[d] = float(v)
    return sorted(pts.items())

def fetch(spec):
    """spec: dict with 'type' and parameters (from a chart YAML)."""
    t = spec["type"]
    start = spec.get("start")
    if t == "fred":
        return fred(spec["id"], start)
    if t == "ecb":
        return ecb(spec["flow"], spec["key"], start)
    if t == "eurostat":
        return eurostat(spec["dataset"], start, **spec["filters"])
    if t == "smard":
        return smard(spec["filter"], spec.get("region", "DE"), spec.get("resolution", "day"), start)
    if t == "worldbank":
        return worldbank(spec["country"], spec["indicator"], start)
    if t == "static":
        return [(str(d), float(v)) for d, v in spec["values"]]
    raise ValueError("unknown source type " + t)

def month_end(points):
    """Collapse daily points to the last observation of each month, dated YYYY-MM-01."""
    m = {}
    for d, v in points:
        m[d[:7]] = v
    return [(k + "-01", v) for k, v in sorted(m.items())]
