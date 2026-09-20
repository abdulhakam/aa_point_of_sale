"""POS-0005 baseline: time the heavy report queries and print query plans.

Read-only. Run against the live DB copy:
    python scripts/perf_baseline.py [path-to-data.db]

Times (a) SQL-level view scans the way PocketBase reads them, and
(b) EXPLAIN QUERY PLAN for the hot joins. HTTP-level timings are produced
separately by scripts/perf_http.py once the server is running.
"""
import sqlite3
import sys
import time

DB = sys.argv[1] if len(sys.argv) > 1 else "backend/pb_data/data.db"

# Views the reports fetch with getFullList (worst case: whole view).
HEAVY = [
    "invoice_view",
    "transaction_view",
    "transactions_report",
    "payments_view",
    "payments_invoices_report",
    "items_report",
    "items_difference_report",
    "ledger_booker",
    "ledger_journal",
    "ledger_party",
    "ledger_area",
]

PLANS = [
    ("invoice_view (GROUP BY invoice)",
     "SELECT invoices.id, SUM(transaction_view.total) FROM invoices "
     "LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id "
     "GROUP BY invoices.id"),
    ("transaction_view filtered by invoice",
     "SELECT * FROM transaction_view WHERE invoice = 'r0000000000000'"),
    ("payments filtered by party+paid+type",
     "SELECT * FROM payments WHERE party = 'x' AND paid = 0 AND type = 'recieving'"),
    ("ledger_party running balance (correlated)",
     "SELECT p1.id, (SELECT SUM(CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END) "
     "FROM payments_view p2 WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date) "
     "AS balance FROM payments_view p1 ORDER BY p1.payment_date"),
]

TIMEOUT_S = 180.0


def guarded(con, seconds):
    """Abort a runaway query instead of hanging the baseline run."""
    deadline = time.time() + seconds

    def handler():
        return 1 if time.time() > deadline else 0

    con.set_progress_handler(handler, 10000)


con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
cur = con.cursor()

print("=" * 72)
print(f"BASELINE — {DB}")
print("=" * 72)

print("\n--- row counts ---")
for v in HEAVY:
    cur.execute(f"SELECT COUNT(*) FROM {v}")
    print(f"{v:28} rows={cur.fetchone()[0]}")

print("\n--- full-view scan time (what getFullList pulls) ---")
for v in HEAVY:
    guarded(con, TIMEOUT_S)
    t0 = time.perf_counter()
    try:
        rows = cur.execute(f"SELECT * FROM {v}").fetchall()
        dt = time.perf_counter() - t0
        print(f"{v:28} rows={len(rows):7} {dt:8.2f}s")
    except sqlite3.OperationalError as e:
        dt = time.perf_counter() - t0
        print(f"{v:28} ABORTED after {dt:8.2f}s ({e})")
    finally:
        con.set_progress_handler(None, 0)

print("\n--- EXPLAIN QUERY PLAN (SCAN = no index) ---")
for label, sql in PLANS:
    print(f"\n[{label}]")
    for row in cur.execute("EXPLAIN QUERY PLAN " + sql):
        print("   ", row[-1])

con.close()
print("\nDone.")
