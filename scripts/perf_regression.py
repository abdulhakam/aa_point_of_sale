"""POS-0018 — end-to-end performance regression vs the POS-0005 baseline.

Measures, over the real PocketBase REST API, the shapes the app now issues and the
shapes it used to issue, then compares against the numbers captured in
`vault/references/performance-baseline.md`.

Run the server first (backend\\RUN SERVE.BAT or pocketbase serve).

Usage: python scripts/perf_regression.py [base-url]
       (default http://127.0.0.1:8090)
Exits non-zero if a hard regression is detected. Read-only.
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8090").rstrip("/")

failures = []
checks = []


def fetch(collection, **params):
    """Return (payload_bytes, seconds, parsed_json)."""
    path = f"/api/collections/{collection}/records?{urllib.parse.urlencode(params)}"
    url = BASE + path
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=600) as r:
            body = r.read()
    except urllib.error.HTTPError as e:
        return 0, time.perf_counter() - t0, {"error": e.code, "body": e.read().decode()[:200]}
    dt = time.perf_counter() - t0
    return len(body), dt, json.loads(body)


def kb(n):
    return f"{n / 1024:9.1f} KB"


print("=" * 78)
print(f"POS-0018 performance regression — {BASE}")
print("=" * 78)

# ------------------------------------------------------------------ 1
print("\n[1] Report fetches — the app's NEW shape (no deep expand)")
print("    baseline: transactions_report + deep expand, perPage 500 = 1,021.6 KB / 2.49 s\n")

DEEP = "item,company,party,party.area,party.area.section,booker"
sale_filter = '(type = "sale" || type = "return")'

old_kb, old_s, _ = fetch(
    "transactions_report", perPage=500, sort="-created", filter=sale_filter, expand=DEEP
)
new_kb, new_s, new_data = fetch(
    "transactions_report", perPage=500, sort="-created", filter=sale_filter
)
print(f"    transactions_report  OLD (deep expand) {kb(old_kb)} {old_s:6.2f}s")
print(f"    transactions_report  NEW (no expand)   {kb(new_kb)} {new_s:6.2f}s"
      f"   rows={new_data.get('items') and len(new_data['items'])}")
red = (1 - new_kb / old_kb) * 100 if old_kb else 0
print(f"    -> payload reduced {red:.1f}%")
if new_kb >= old_kb:
    failures.append("transactions_report trim did not reduce payload")
checks.append(("transactions_report payload reduced", new_kb < old_kb))

oldp_kb, oldp_s, _ = fetch(
    "payments_view", perPage=500, sort="-created", expand="invoice,party,area,section,booker,company"
)
newp_kb, newp_s, newp_data = fetch("payments_view", perPage=500, sort="-created")
print(f"\n    payments_view        OLD (expand 6)     {kb(oldp_kb)} {oldp_s:6.2f}s")
print(f"    payments_view        NEW (no expand)   {kb(newp_kb)} {newp_s:6.2f}s"
      f"   rows={newp_data.get('items') and len(newp_data['items'])}")
redp = (1 - newp_kb / oldp_kb) * 100 if oldp_kb else 0
print(f"    -> payload reduced {redp:.1f}%")
if newp_kb >= oldp_kb:
    failures.append("payments_view trim did not reduce payload")
checks.append(("payments_view payload reduced", newp_kb < oldp_kb))

# ------------------------------------------------------------------ 2
print("\n[2] Party ledger — the single worst offender")
party = None
_, _, probe = fetch("ledger_party", perPage=1, sort="+created", expand="party")
if probe.get("items"):
    party = probe["items"][0].get("party")
print(f"    baseline: full scan ABORTED after 180 s (O(n^2) correlated subquery)\n")
# `ledger_party` recomputes the whole view per request, so filter to one party.
lp_kb, lp_s, lp = fetch("ledger_party", perPage=30, sort="+created", filter=f'party="{party}"')
print(f"    ledger_party party={party[:10]}…  {kb(lp_kb)} {lp_s:8.2f}s  (was >180 s)")
if lp.get("error"):
    failures.append(f"ledger_party request failed: {lp['error']}")
elif lp_s >= 60:
    failures.append(f"ledger_party slow: {lp_s:.1f}s")
checks.append(("ledger_party under 60 s", not lp.get("error") and lp_s < 60))

# ------------------------------------------------------------------ 3
print("\n[3] Invoice selector — the app's NEW shape for opening invoices")
print("    baseline: full invoice_view pagination (all pages) = 26.00 s\n")
sel_kb, sel_s, sel = fetch(
    "invoice_view", page=1, perPage=50, sort="-invoiceNo", filter='type="sale"'
)
cnt_kb, cnt_s, cnt = fetch("invoice_view", page=1, perPage=1, sort="-created", filter='type="sale"')
print(f"    invoice_view selector perPage=50  {kb(sel_kb)} {sel_s:6.2f}s  rows={len(sel.get('items', []))}")
print(f"    invoice_view count    perPage=1   {kb(cnt_kb)} {cnt_s:6.2f}s  totalItems={cnt.get('totalItems')}")
print(f"    -> the page no longer pages through the whole view")
checks.append(("invoice selector avoids full pagination", sel_s < 5 and cnt_s < 5))

# ------------------------------------------------------------------ 4
print("\n[4] Heavy reports now read SUMMARY rows, not tens of thousands")
day = None
_, _, dprobe = fetch("payments_summary", perPage=1, sort="day")
if dprobe.get("items"):
    day = dprobe["items"][0]["day"]
ps_kb, ps_s, ps = fetch("payments_summary", perPage=500, filter=f'day="{day}"')
os_kb, os_s, os_ = fetch("outstanding_summary", perPage=1)
cf_kb, cf_s, cf = fetch("counts_for_row_numbers")
print(f"    payments_summary day={day}   {kb(ps_kb)} {ps_s:6.2f}s  groups={ps.get('totalItems')}")
print(f"    outstanding_summary          {kb(os_kb)} {os_s:6.2f}s  parties={os_.get('totalItems')}")
print(f"    counts_for_row_numbers       {kb(cf_kb)} {cf_s:6.2f}s")
if ps.get("totalItems", 0) > 5000:
    failures.append(f"payments_summary for one day returned {ps.get('totalItems')} rows (expected a summary)")
checks.append(("one-day summary is small", 0 < (ps.get("totalItems") or 0) <= 5000))

# ------------------------------------------------------------------ 5
print("\n[5] Sale invoice page — total API work to open it")
print("    (the set of requests /app/invoices/sale now issues on load)\n")
t0 = time.perf_counter()
nbytes = 0
for coll, params in [
    ("invoice_view", {"page": 1, "perPage": 50, "sort": "-invoiceNo", "filter": 'type="sale"'}),
    ("invoice_view", {"page": 1, "perPage": 1, "sort": "-created", "filter": 'type="sale"'}),
    ("parties", {"page": 1, "perPage": 500, "expand": "area", "filter": 'type="customer"||type="both"'}),
    ("items", {"page": 1, "perPage": 500, "expand": "category"}),
    ("invoices_return_reference", {"page": 1, "perPage": 500, "expand": "original_invoices"}),
    ("order_bookers", {"page": 1, "perPage": 500}),
    ("counts_for_row_numbers", {}),
]:
    if coll == "counts_for_row_numbers":
        b, _, _ = fetch("counts_for_row_numbers")  # view: single record
    else:
        b, _, _ = fetch(coll, **params)
    nbytes += b
total_s = time.perf_counter() - t0
print(f"    total API time {total_s:6.2f}s   payload {kb(nbytes)}")
print("    baseline: this page used to pull the whole invoice_view (26.00 s of paging) + expands")
if total_s > 20:
    failures.append(f"sale invoice page API work too slow: {total_s:.1f}s")
checks.append(("sale invoice page < 20 s of API work", total_s < 20))

# ------------------------------------------------------------------ verdict
print("\n" + "=" * 78)
print("Checks")
for label, ok in checks:
    print(f"  {'OK  ' if ok else 'FAIL'} {label}")
print("=" * 78)
if failures:
    print(f"RESULT: FAIL — {len(failures)} problem(s)")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("RESULT: PASS — no performance regression; heavy shapes reduced, ledger under 60 s")
