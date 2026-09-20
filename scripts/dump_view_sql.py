"""Print the SQL of one or more view collections.

Usage: python scripts/dump_view_sql.py <view> [view ...] [--db path]
Read-only.
"""
import json
import sqlite3
import sys

args = [a for a in sys.argv[1:]]
db = "backend/pb_data/data.db"
if "--db" in args:
    i = args.index("--db")
    db = args[i + 1]
    del args[i : i + 2]

con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
cur = con.cursor()
for view in args:
    row = cur.execute(
        "SELECT options FROM _collections WHERE name=? AND type='view'", (view,)
    ).fetchone()
    if not row:
        print(f"!! no view named {view}")
        continue
    print(f"===== {view} =====")
    print(json.loads(row[0])["query"])
con.close()
