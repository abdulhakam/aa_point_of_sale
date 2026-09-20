"""A/B pagination benchmark: OFFSET/LIMIT over a view, exactly as PocketBase pages it.

Usage: python scripts/bench_pagination.py <db> [view] [perPage] [maxPages]

Reports per-page times and the total, plus the COUNT(*) cost and the query plan.
Read-only.
"""
import sqlite3
import sys
import time

DB = sys.argv[1]
VIEW = sys.argv[2] if len(sys.argv) > 2 else "invoice_view"
PER = int(sys.argv[3]) if len(sys.argv) > 3 else 500
MAX = int(sys.argv[4]) if len(sys.argv) > 4 else 18

con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
cur = con.cursor()

t0 = time.perf_counter()
total = cur.execute(f"SELECT COUNT(*) FROM {VIEW}").fetchone()[0]
count_t = time.perf_counter() - t0

pages = (total + PER - 1) // PER
pages = min(pages, MAX)
print(f"{DB}")
print(f"  {VIEW}: rows={total} count(*)={count_t:.2f}s pages={pages} perPage={PER}")

times = []
t_all = time.perf_counter()
for p in range(pages):
    off = p * PER
    t0 = time.perf_counter()
    n = len(
        cur.execute(
            f"SELECT * FROM {VIEW} ORDER BY created DESC LIMIT {PER} OFFSET {off}"
        ).fetchall()
    )
    dt = time.perf_counter() - t0
    times.append(dt)
    print(f"    page {p + 1:3} offset {off:6} rows {n:4}  {dt:6.2f}s")
t_all = time.perf_counter() - t_all
print(f"  TOTAL {t_all:.2f}s   (first page {times[0]:.2f}s, last page {times[-1]:.2f}s)")

print("  plan (LIMIT/OFFSET page):")
for row in cur.execute(f"EXPLAIN QUERY PLAN SELECT * FROM {VIEW} ORDER BY created DESC LIMIT {PER} OFFSET 500"):
    print("    ", row[-1])

con.close()
