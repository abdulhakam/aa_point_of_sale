"""Live check of the manual refresh trigger. Password comes from E2E_TB_PASSWORD (no secret in this file)."""
import os, sys, json, urllib.request, urllib.parse, http.cookiejar, urllib.error

BASE = "http://127.0.0.1:3100"
PW = os.environ.get("E2E_TB_PASSWORD")

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

cj = http.cookiejar.CookieJar()
plain = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
nored = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), NoRedirect)

def status():
    return json.load(plain.open(BASE + "/reports/status"))

def post(path, accept=None, referer=None):
    req = urllib.request.Request(BASE + path, data=b"", method="POST")
    if accept: req.add_header("accept", accept)
    if referer: req.add_header("referer", referer)
    opener = plain if accept else nored
    try:
        r = opener.open(req)
        return r.status, r.headers.get("Location"), r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Location"), e.read().decode()

def main():
    if not PW:
        print("set E2E_TB_PASSWORD"); return 1
    plain.open(BASE + "/login", urllib.parse.urlencode({"email": "admin@localhost", "password": PW, "next": "/dashboard"}).encode()).read()
    before = status()
    print(f"before : build={before['build']} ready={before['ready']} phase={before['phase']} lastChecked={before['lastCheckedAt']}")

    code, loc, _ = post("/reports/refresh", referer=BASE + "/p/reports/stock")
    print(f"POST /reports/refresh (no JS, referer=/p/reports/stock) -> {code} Location={loc}")
    print("  redirect back:", "PASS" if code == 303 and loc == "/p/reports/stock" else "FAIL")

    code, _, body = post("/reports/refresh", accept="application/json", referer=BASE + "/p/reports/stock")
    d = json.loads(body)
    print(f"POST /reports/refresh (accept json) -> {code} ready={d['ready']} phase={d['phase']} changed={d.get('changed')}")
    print("  json answer:", "PASS" if code == 200 and d["ready"] and d["phase"] == "idle" else "FAIL")

    code, _, body = post("/reports/refresh?full=1", accept="application/json")
    d2 = json.loads(body)
    print(f"POST /reports/refresh?full=1 -> {code} build={d2['build']} (was {before['build']}) rows={d2['rows']} rebuiltViews={len(d2.get('rebuiltViews') or [])}")
    print("  full rebuild advanced the snapshot:", "PASS" if d2["build"] > before["build"] else "FAIL")

    after = status()
    print(f"after  : build={after['build']} ready={after['ready']} rows={after['rows']} phase={after['phase']}")
    return 0

sys.exit(main())
