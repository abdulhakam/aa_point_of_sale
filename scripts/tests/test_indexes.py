"""POS-0008 — verify the performance indexes exist and are used by hot queries.

Usage: python scripts/tests/test_indexes.py [path-to-data.db]

Exits non-zero on failure. Read-only.
"""
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else "backend/pb_data/data.db"

EXPECTED = [
    "idx_transactions_invoice",
    "idx_transactions_item",
    "idx_invoices_party",
    "idx_invoices_booker",
    "idx_invoices_type",
    "idx_invoices_dated",
    "idx_invoices_created",
    "idx_invoices_type_created",
    "idx_payments_party",
    "idx_payments_paid",
    "idx_payments_type",
    "idx_payments_invoice",
    "idx_payments_created",
    "idx_payments_type_paid",
    "idx_payments_party_paid_type",
    "idx_parties_area",
    "idx_parties_type",
    "idx_items_category",
]

# (label, sql that must not fall back to a full SCAN of the big table)
PLAN_CASES = [
    (
        "transactions join by invoice",
        "SELECT * FROM transactions WHERE invoice = 'x'",
        "transactions",
    ),
    (
        "transactions join by item",
        "SELECT * FROM transactions WHERE item = 'x'",
        "transactions",
    ),
    (
        "payments by party+paid+type",
        "SELECT * FROM payments WHERE party = 'x' AND paid = 0 AND type = 'recieving'",
        "payments",
    ),
    (
        "invoices by party",
        "SELECT * FROM invoices WHERE party = 'x'",
        "invoices",
    ),
    (
        "invoices by type sorted by created",
        "SELECT * FROM invoices WHERE type = 'sale' ORDER BY created DESC",
        "invoices",
    ),
    (
        "parties by area",
        "SELECT * FROM parties WHERE area = 'x'",
        "parties",
    ),
]

con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
cur = con.cursor()
failures = []

print("=" * 70)
print(f"POS-0008 index verification — {DB}")
print("=" * 70)

present = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='index'")}
print("\n--- index presence ---")
for name in EXPECTED:
    ok = name in present
    print(f"{'OK  ' if ok else 'MISS'} {name}")
    if not ok:
        failures.append(f"missing index {name}")

print("\n--- query plans (must not SCAN the big table) ---")
for label, sql, tbl in PLAN_CASES:
    plan = [r[-1] for r in cur.execute("EXPLAIN QUERY PLAN " + sql)]
    full_scan = any(p.startswith("SCAN " + tbl) and "USING" not in p for p in plan)
    used = [p for p in plan if "USING INDEX" in p or "USING COVERING INDEX" in p]
    status = "FAIL(SCAN)" if full_scan and not used else "OK"
    print(f"{status:10} {label}")
    for p in plan:
        print(f"             {p}")
    if full_scan and not used:
        failures.append(f"{label}: full scan of {tbl}")

con.close()

print("\n" + "=" * 70)
if failures:
    print(f"RESULT: FAIL — {len(failures)} problem(s)")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("RESULT: PASS — all indexes present and used")
