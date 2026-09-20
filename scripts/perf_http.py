"""POS-0005 HTTP baseline: time real PocketBase REST fetches.

Requires the server to be running (default http://127.0.0.1:8090).
All view collections have PUBLIC list rules, so no auth is needed.

    python scripts/perf_http.py [base-url] [perPage]

Measures the same shape of request the frontend issues: getOne-style page
fetches (perPage rows) plus the full pagination loop that getFullList performs,
and the expand-heavy queries the reports use.
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8090").rstrip("/")
PER = int(sys.argv[2]) if len(sys.argv) > 2 else 500

CASES = [
    ("invoice_view sort=-created", {"sort": "-created"}),
    ("invoice_view single invoice (filter)", {"filter": 'invoiceNo ~ "1"', "perPage": 50}),
    ("transactions_report sort=-created", {"sort": "-created"}),
    ("transactions_report expand item,company,party,party.area.section,booker",
     {"sort": "-created", "expand": "item,company,party,party.area.section,booker", "perPage": 500}),
    ("payments_view sort=-created expand 5", {"sort": "-created", "expand": "invoice,party,area,section,booker"}),
    ("ledger_party sort=+created expand invoice,party", {"sort": "+created", "expand": "invoice,party"}),
    ("ledger_journal sort=+created", {"sort": "+created"}),
    ("counts_for_row_numbers/1", None),
]


def get(path):
    url = f"{BASE}{path}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        body = r.read()
    return json.loads(body), len(body)


print("=" * 72)
print(f"HTTP BASELINE — {BASE}  perPage={PER}")
print("=" * 72)

for label, params in CASES:
    if params is None:
        path = "/api/collections/counts_for_row_numbers/records/1"
    else:
        path = "/api/collections/" + label.split()[0] + "/records?" + urllib.parse.urlencode(params)
    n = 0
    t0 = time.perf_counter()
    try:
        data, size = get(path)
        items = data.get("items", data)
        n = len(items) if isinstance(items, list) else 1
        dt = time.perf_counter() - t0
        print(f"{label[:56]:58} rows={n:6} {size/1024:9.1f}KB {dt:7.2f}s")
    except urllib.error.HTTPError as e:
        dt = time.perf_counter() - t0
        print(f"{label[:56]:58} HTTP {e.code} after {dt:6.2f}s")
    except Exception as e:  # noqa: BLE001
        dt = time.perf_counter() - t0
        print(f"{label[:56]:58} ERROR after {dt:6.2f}s: {e}")

# Full pagination loop = what getFullList does internally.
# NOTE: ledger_party is excluded here — its view is O(n^2) and recomputes the whole
# table per page. It is measured by the single-request case above instead.
print("\n--- getFullList-style full pagination (all pages) ---")
for coll in ("invoice_view", "transactions_report", "payments_view"):
    page, total, t0 = 1, 0, time.perf_counter()
    try:
        while True:
            path = (
                f"/api/collections/{coll}/records?"
                + urllib.parse.urlencode({"page": page, "perPage": PER, "sort": "-created"})
            )
            data, _ = get(path)
            total += len(data.get("items", []))
            if page >= data.get("totalPages", 1) or not data.get("items"):
                break
            page += 1
        dt = time.perf_counter() - t0
        print(f"{coll:24} rows={total:6} pages={page:3} {dt:8.2f}s")
    except Exception as e:  # noqa: BLE001
        dt = time.perf_counter() - t0
        print(f"{coll:24} ERROR after {dt:6.2f}s: {e}")

print("\nDone.")
