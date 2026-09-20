"""Quick live-DB verification after the performance migrations.

Usage: python scripts/verify_live.py
Read-only. Prints view collections and the performance index count.
"""
import sqlite3

con = sqlite3.connect("file:backend/pb_data/data.db?mode=ro", uri=True)
cur = con.cursor()

views = [r[0] for r in cur.execute(
    "SELECT name FROM _collections WHERE type='view' ORDER BY name"
)]
print("views:", views)
assert "payments_summary" in views, "payments_summary view is missing"

idx = [r[0] for r in cur.execute(
    "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name"
)]
print(f"performance indexes: {len(idx)}")
assert len(idx) >= 18, f"expected >=18 perf indexes, found {len(idx)}"

lp = cur.execute(
    "SELECT options FROM _collections WHERE name='ledger_party'"
).fetchone()[0]
assert "RANGE BETWEEN UNBOUNDED PRECEDING" in lp, "ledger_party window SQL missing"
print("ledger_party: window-function SQL confirmed")

print("\nLIVE DB OK")
con.close()
