"""POS-0015 — prove trimming the deep server expand is value-equivalent.

The report pages used to request a per-row server `expand` (e.g.
`item,company,party,party.area.section,booker`). POS-0015 removes the expand and
resolves the names client-side from the reference collections (see useAPI.ts
`useHydratedRefs`). This test fetches the same rows both ways and asserts the
resolved names are identical, then reports the payload reduction.

Usage: python scripts/tests/test_expand_trim.py [base-url] [sample-size]
       (default http://127.0.0.1:8090, 300)
Exits non-zero on any mismatch. Read-only.
"""
import json
import sys
import urllib.parse
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8090").rstrip("/")
SAMPLE = int(sys.argv[2]) if len(sys.argv) > 2 else 300

failures = []


def fetch(collection, **params):
    """Return (parsed_json, payload_bytes)."""
    query = urllib.parse.urlencode(params)
    path = f"/api/collections/{collection}/records?{query}"
    req = urllib.request.Request(f"{BASE}{path}", headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        body = r.read()
    return json.loads(body), len(body)


def index_list(collection):
    out = {}
    page = 1
    while True:
        data, _ = fetch(collection, page=page, perPage=1000)
        for rec in data.get("items", []):
            out[rec["id"]] = rec
        if page >= data.get("totalPages", 1):
            break
        page += 1
    return out


print("=" * 74)
print(f"POS-0015 expand-trim equivalence — {BASE} (sample={SAMPLE})")
print("=" * 74)

sys.stdout.write("\n[0] loading reference collections...")
areas = index_list("areas")
sections = index_list("sections")
categories = index_list("categories")
items = index_list("items")
parties = index_list("parties")
bookers = index_list("order_bookers")
print(
    f" areas={len(areas)} sections={len(sections)} categories={len(categories)}"
    f" items={len(items)} parties={len(parties)} bookers={len(bookers)}"
)


def nm(mapping, rec_id):
    rec = mapping.get(rec_id)
    return rec.get("name") if rec else None


# ---------------------------------------------------------------- case defs
def old_transactions(row):
    ex = row.get("expand") or {}
    party = ex.get("party") or {}
    area = (party.get("expand") or {}).get("area") or {}
    section = (area.get("expand") or {}).get("section") or {}
    return {
        "item": (ex.get("item") or {}).get("name"),
        "company": (ex.get("company") or {}).get("name"),
        "party": party.get("name"),
        "area": area.get("name"),
        "section": section.get("name"),
        "booker": (ex.get("booker") or {}).get("name"),
    }


def new_transactions(row):
    return {
        "item": nm(items, row.get("item")),
        "company": nm(categories, row.get("company")),
        "party": nm(parties, row.get("party")),
        "area": nm(areas, row.get("area")),
        "section": nm(sections, row.get("section")),
        "booker": nm(bookers, row.get("booker")),
    }


def old_payments(row):
    ex = row.get("expand") or {}
    comp = ex.get("company")
    comp_name = "|".join(c.get("name") or "" for c in comp) if isinstance(comp, list) else None
    return {
        "party": (ex.get("party") or {}).get("name"),
        "area": (ex.get("area") or {}).get("name"),
        "section": (ex.get("section") or {}).get("name"),
        "booker": (ex.get("booker") or {}).get("name"),
        "invoiceNo": (ex.get("invoice") or {}).get("invoiceNo"),
        # payments_view.company is a MULTIPLE relation; the server expands it as an array.
        "company": comp_name,
    }


def new_payments(row):
    comp = row.get("company")
    comp_name = "|".join(nm(categories, c) or "" for c in comp) if isinstance(comp, list) else None
    return {
        "party": nm(parties, row.get("party")),
        "area": nm(areas, row.get("area")),
        "section": nm(sections, row.get("section")),
        "booker": nm(bookers, row.get("booker")),
        "invoiceNo": row.get("invoiceNo"),
        "company": comp_name,
    }


def old_pic(row):
    # NB `company` is excluded here: on this view it is a scalar that PocketBase does
    # NOT expand (the page resolves it from categories itself, before and after).
    ex = row.get("expand") or {}
    return {
        "party": (ex.get("party") or {}).get("name"),
        "area": (ex.get("area") or {}).get("name"),
        "section": (ex.get("section") or {}).get("name"),
        "booker": (ex.get("booker") or {}).get("name"),
    }


def new_pic(row):
    return {
        "party": nm(parties, row.get("party")),
        "area": nm(areas, row.get("area")),
        "section": nm(sections, row.get("section")),
        "booker": nm(bookers, row.get("booker")),
    }


CASES = [
    (
        "transactions_report",
        "transactions_report",
        "item,company,party,party.area.section,booker",
        '(type = "sale" || type = "return")',
        old_transactions,
        new_transactions,
    ),
    (
        "payments_view",
        "payments_view",
        "invoice,party,area,section,booker,company",
        "",
        old_payments,
        new_payments,
    ),
    (
        "payments_invoices_report",
        "payments_invoices_report",
        "area,section,company,party,booker",
        '(type = "sale" || type = "return" || type = "recieving")',
        old_pic,
        new_pic,
    ),
]

for name, collection, expand, filter_str, old_fn, new_fn in CASES:
    print(f"\n[{name}] with and without expand={expand}")
    old, old_bytes = fetch(
        collection, perPage=SAMPLE, sort="-created", filter=filter_str, expand=expand
    )
    new, new_bytes = fetch(collection, perPage=SAMPLE, sort="-created", filter=filter_str)
    print(f"    with expand:    {len(old['items'])} rows, {old_bytes/1024:9.1f} KB")
    print(f"    without expand: {len(new['items'])} rows, {new_bytes/1024:9.1f} KB")
    print(f"    payload reduction: {(1 - new_bytes/old_bytes)*100:.1f}%")

    old_by_id = {r["id"]: r for r in old["items"]}
    new_by_id = {r["id"]: r for r in new["items"]}
    common = [rid for rid in new_by_id if rid in old_by_id]

    mismatches = 0
    checked = 0
    for rid in common:
        expected = old_fn(old_by_id[rid])
        actual = new_fn(new_by_id[rid])
        for field in expected:
            checked += 1
            if (expected[field] or None) != (actual[field] or None):
                mismatches += 1
                if mismatches <= 5:
                    print(
                        f"      MISMATCH {rid} {field}: expand={expected[field]!r}"
                        f" resolved={actual[field]!r}"
                    )
    print(f"    compared {checked} field values across {len(common)} rows; mismatches={mismatches}")
    if mismatches:
        failures.append(f"{name}: {mismatches} resolved name(s) differ from the server expand")
    else:
        print("    OK - every resolved name matches the old deep expand")

print("\n" + "=" * 74)
if failures:
    print(f"RESULT: FAIL — {len(failures)} problem(s)")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
print("RESULT: PASS — client-resolved names are equivalent to the removed deep expand")
