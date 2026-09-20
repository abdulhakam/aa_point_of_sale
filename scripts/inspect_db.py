"""Read-only inspection of the PocketBase SQLite database.

Usage: python scripts/inspect_db.py [path-to-data.db]
Prints row counts, existing indexes on hot tables, view collections, and
missing-index suggestions. Never writes to the database.
"""
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else "backend/pb_data/data.db"
con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
cur = con.cursor()

print("--- row counts ---")
for t in [
    "transactions", "invoices", "payments", "parties", "items",
    "areas", "sections", "categories", "order_bookers", "expenses",
    "invoices_return_reference",
]:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(f"{t}: {cur.fetchone()[0]}")
    except Exception as e:
        print(f"{t}: ERR {e}")

print("\n--- indexes on hot tables ---")
rows = list(cur.execute(
    "SELECT name, tbl_name FROM sqlite_master WHERE type='index' "
    "AND tbl_name IN ('transactions','invoices','payments','parties','items') "
    "ORDER BY tbl_name, name"
))
if not rows:
    print("(none)")
for name, tbl in rows:
    print(f"{tbl} -> {name}")

print("\n--- view collections ---")
for name, in cur.execute("SELECT name FROM _collections WHERE type='view' ORDER BY name"):
    print(name)

print("\n--- table SQL for hot tables ---")
for tbl in ("transactions", "invoices", "payments"):
    (sql,) = cur.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (tbl,)
    ).fetchone()
    print(sql, "\n")

con.close()
