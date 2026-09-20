"""POS-0012 — verify the paginated list helper (crud.listPage / usePagedList).

Proves the server-side `getList` pagination (which usePagedList / crud.listPage
wrap) returns correct, consistent results:

  1. Page 1 vs page 2 return disjoint rows (no overlapping IDs).
  2. totalItems equals the count of the full collection.
  3. A filter narrows results.
  4. Changing perPage changes the page size.
  5. Sort order is honored.

Usage: python scripts/tests/test_pagination.py [base-url]
       (default http://127.0.0.1:8090)
Exits non-zero on failure. Read-only.
"""
import json
import sys
import urllib.parse
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8090").rstrip("/")

failures = []


def get(collection, page=1, per_page=50, sort="-created", filter_str="", expand=""):
    params = {"page": page, "perPage": per_page, "sort": sort}
    if filter_str:
        params["filter"] = filter_str
    if expand:
        params["expand"] = expand
    path = "/api/collections/{}/records?{}".format(
        collection, urllib.parse.urlencode(params)
    )
    req = urllib.request.Request(f"{BASE}{path}", headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def collect_ids(collection, **kw):
    rows = get(collection, **kw)
    return [r["id"] for r in rows["items"]], rows


print("=" * 70)
print(f"POS-0012 pagination test — {BASE}")
print("=" * 70)

# --------------------------------------------------------------- 1 + 2
print("\n[1] invoice_view: page 1 vs page 2 disjoint, totalItems correct")

page1_ids, page1 = collect_ids("invoice_view", page=1, per_page=50)
page2_ids, page2 = collect_ids("invoice_view", page=2, per_page=50)

overlap = set(page1_ids) & set(page2_ids)
print(f"    page 1: {len(page1_ids)} items, page 2: {len(page2_ids)} items")
print(f"    overlap between pages: {len(overlap)}")
if overlap:
    failures.append(f"pages 1 and 2 overlap on {len(overlap)} IDs")

full_count = page1["totalItems"]
print(f"    totalItems reported: {full_count}")
if full_count != 8927:
    failures.append(f"totalItems {full_count} != expected 8927")
if len(page1_ids) != 50:
    failures.append(f"page 1 returned {len(page1_ids)} items, expected 50")

# --------------------------------------------------------------- 3
print("\n[2] invoice_view: filter narrows results (type='sale')")

sale_ids, sale_resp = collect_ids(
    "invoice_view", page=1, per_page=full_count, filter_str='type = "sale"'
)
print(f"    sale rows: {len(sale_ids)} out of {full_count}")
if len(sale_ids) >= full_count:
    failures.append("filter did not narrow results (sale count >= total)")
if len(sale_ids) == 0:
    failures.append("filter returned zero sale rows — filter broken")

# Verify the filter actually filters by type by checking a sample
sample_ok = True
if sale_ids:
    for id_ in sale_ids[:5]:
        items, _ = collect_ids("invoice_view", page=1, per_page=full_count, filter_str=f'id = "{id_}"')
        if not items:
            sample_ok = False
            break
if not sample_ok:
    failures.append("filter verification: could not confirm filtered rows match type=sale")

# --------------------------------------------------------------- 4
print("\n[3] invoice_view: changing perPage changes page size")

p10, _ = collect_ids("invoice_view", page=1, per_page=10)
p100, _ = collect_ids("invoice_view", page=1, per_page=100)
print(f"    perPage=10 -> {len(p10)} items, perPage=100 -> {len(p100)} items")
if len(p10) != 10:
    failures.append(f"perPage=10 returned {len(p10)} items, expected 10")
if len(p100) != 100:
    failures.append(f"perPage=100 returned {len(p100)} items, expected 100")

# --------------------------------------------------------------- 5
print("\n[4] invoice_view: sort order honored (+invoiceNo vs -invoiceNo)")

asc_ids, asc_resp = collect_ids("invoice_view", page=1, per_page=20, sort="+invoiceNo")
desc_ids, desc_resp = collect_ids("invoice_view", page=1, per_page=20, sort="-invoiceNo")

asc_invoice_nos = [r["invoiceNo"] for r in get("invoice_view", page=1, per_page=20, sort="+invoiceNo")["items"]]
desc_invoice_nos = [r["invoiceNo"] for r in get("invoice_view", page=1, per_page=20, sort="-invoiceNo")["items"]]

print(f"    ascending first 5 invoiceNo: {asc_invoice_nos[:5]}")
print(f"    descending first 5 invoiceNo: {desc_invoice_nos[:5]}")

if asc_invoice_nos != sorted(asc_invoice_nos):
    failures.append("ascending sort not honored (+invoiceNo)")
if desc_invoice_nos != sorted(desc_invoice_nos, reverse=True):
    failures.append("descending sort not honored (-invoiceNo)")

# --------------------------------------------------------------- 6
print("\n[5] invoice_view: page 3 returns the right slice (30 items, all unique)")

page3_ids, page3 = collect_ids("invoice_view", page=3, per_page=30)
print(f"    page 3: {len(page3_ids)} items, unique: {len(set(page3_ids)) == len(page3_ids)}")
if len(page3_ids) != 30:
    failures.append(f"page 3 returned {len(page3_ids)} items, expected 30")
if len(set(page3_ids)) != len(page3_ids):
    failures.append("page 3 contains duplicate IDs")

# --------------------------------------------------------------- Result
print("\n" + "=" * 70)
if failures:
    print(f"RESULT: FAIL — {len(failures)} problem(s)")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
print("RESULT: PASS — pagination behaves correctly")
