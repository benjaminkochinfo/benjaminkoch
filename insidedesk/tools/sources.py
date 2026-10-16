"""Inside Desk — primary-data fetchers.

Every fetcher returns a list of (date_string 'YYYY-MM-DD', float) tuples, oldest first.
Only open / public-domain sources are wired in on purpose. Each source carries the
attribution + licence text that must appear under any chart that uses it.
"""
import csv, io, json, urllib.request, urllib.parse

UA = {"User-Agent": "InsideDesk-build/1.0 (+https://benjaminkoch.info/InsideDesk.html)"}

LICENCES = {
    "fred-eia": "EIA spot prices via FRED, Federal Reserve Bank of St. Louis. U.S. government data, public domain.",
    "fred-h15": "Board of Governors of the Federal Reserve System (H.15) via FRED. Public domain.",
    "fred-bea": "U.S. Bureau of Economic Analysis via FRED, Federal Reserve Bank of St. Louis. U.S. government data, public domain.",
    "eurostat": "Eurostat. Reuse authorised under CC BY 4.0 (Commission Decision 2011/833/EU).",
    "ecb": "European Central Bank Data Portal. Reuse permitted with source acknowledgement.",
    "worldbank": "World Bank Open Data. CC BY 4.0.",
    "reported": "Figures as reported by the named organisations; facts cited with attribution.",
}

def _get(url, timeout=40):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8")

def fred(series_id, start=None):
    """FRED CSV download. Use ONLY for series whose originating agency is public domain
    (e.g. EIA, Treasury, Fed H.15). Check the series' copyright note before adding new ones."""
    txt = _get("https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + urllib.parse.quote(series_id))
    out = []
    for row in csv.DictReader(io.StringIO(txt)):
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
