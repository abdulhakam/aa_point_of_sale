"""Server-side benchmark: legacy /reports/<x> vs page host /p/<x>/data, median of N.
Logs in with the TrailBase scaffold credential from the E2E_TB_PASSWORD env var (no secret in this file).
Usage: E2E_TB_PASSWORD=... python e2e-logs/server-bench.py
"""
import os, sys, time, gzip, io, json, statistics
import urllib.request, urllib.parse, http.cookiejar

BASE = "http://127.0.0.1:3100"
PW = os.environ.get("E2E_TB_PASSWORD")
N = 5

CASES = [
    ("payments",          "/reports/payments",          "/p/reports/payments",          "from=2026-09-01&to=2026-09-26"),
    ("salesreport",       "/reports/salesreport",       "/p/reports/salesreport",       "from=2026-09-01&to=2026-09-26"),
    ("paymentsbycompany", "/reports/paymentsbycompany", "/p/reports/paymentsbycompany", "from=2026-09-01&to=2026-09-26&applyDate=on"),
    ("itemsales",         "/reports/itemsales",         "/p/reports/itemsales",         "from=2026-09-01&to=2026-09-26"),
    ("profit",            "/reports/profit",            "/p/reports/profit",            "from=2026-09-01&to=2026-09-26"),
    ("stock",             "/reports/stockreport",       "/p/reports/stock",             ""),
    ("difference",        "/reports/difference",        "/p/reports/difference",        ""),
    ("dailysale",         "/reports/dailysale",         "/p/reports/dailysale",         "from=2026-09-26&to=2026-09-26"),
    ("outstanding",       "/reports/outstanding",       "/p/reports/outstanding",       ""),
    ("productsale",       "/reports/productsale",       "/p/reports/productsale",       "from=2026-09-26&to=2026-09-26"),
    ("ledgers/area",      "/reports/ledgers/area",      "/p/ledgers/area",              "from=2026-01-01&to=2026-09-26"),
    ("ledgers/general",   "/reports/ledgers/general",   "/p/ledgers/general",           "from=2026-09-01&to=2026-09-26&openingRecievables=0&openingPayables=0&openingCash=0"),
]

cj = http.cookiejar.CookieJar()
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def login():
    body = urllib.parse.urlencode({"email": "admin@localhost", "password": PW, "next": "/dashboard"}).encode()
    r = op.open(BASE + "/login", body)
    r.read()
    return r.status

def fetch(path):
    req = urllib.request.Request(BASE + path)
    req.add_header("Accept-Encoding", "gzip")
    t0 = time.perf_counter()
    with op.open(req) as r:
        raw = r.read()
        enc = r.headers.get("Content-Encoding", "")
    dt = (time.perf_counter() - t0) * 1000
    if enc == "gzip":
        dec = len(gzip.decompress(raw))
    else:
        dec = len(raw)
    return dt, len(raw), dec

def main():
    if not PW:
        print("set E2E_TB_PASSWORD"); return 1
    print("login:", login())
    rows = []
    print(f"{'report':20} {'legacy ms':>10} {'page ms':>9} {'speedup':>8} {'legacy wire':>12} {'page wire':>10} {'legacy dec':>11} {'page dec':>10}")
    for name, lp, pp, q in CASES:
        lu = lp + ("?" + q if q else "")
        pu = pp + "/data" + ("?" + q if q else "")
        fetch(lu); fetch(pu)  # warm
        lt, lw, ld = [], [], []
        pt, pw_, pd = [], [], []
        for _ in range(N):
            a = fetch(lu); lt.append(a[0]); lw.append(a[1]); ld.append(a[2])
            b = fetch(pu); pt.append(b[0]); pw_.append(b[1]); pd.append(b[2])
        lm, pm = statistics.median(lt), statistics.median(pt)
        rows.append(dict(report=name, legacy_ms=round(lm), page_ms=round(pm), legacy_wire=round(statistics.median(lw)), page_wire=round(statistics.median(pw_)), legacy_dec=round(statistics.median(ld)), page_dec=round(statistics.median(pd))))
        print(f"{name:20} {lm:10.0f} {pm:9.0f} {lm/pm:8.2f} {statistics.median(lw):12.0f} {statistics.median(pw_):10.0f} {statistics.median(ld):11.0f} {statistics.median(pd):10.0f}")
    json.dump(rows, open(os.path.join(os.path.dirname(__file__), "server-bench.json"), "w"), indent=2)
    print(f"\nmedian server time: legacy {statistics.median([r['legacy_ms'] for r in rows]):.0f} ms | page {statistics.median([r['page_ms'] for r in rows]):.0f} ms")
    print(f"median wire bytes : legacy {statistics.median([r['legacy_wire'] for r in rows]):.0f} | page {statistics.median([r['page_wire'] for r in rows]):.0f}")
    return 0

sys.exit(main())
