"""Print the SQL query of every view collection in the live PocketBase DB.

Usage: python scripts/inspect_views.py [path-to-data.db]
Read-only.
"""
import sqlite3, sys, json

DB = sys.argv[1] if len(sys.argv) > 1 else "backend/pb_data/data.db"
con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
cur = con.cursor()
for name, opts in cur.execute(
    "SELECT name, options FROM _collections WHERE type='view' ORDER BY name"
):
    try:
        q = json.loads(opts).get("query", "")
    except Exception:
        q = str(opts)
    print("=" * 60)
    print("VIEW:", name)
    print("-" * 60)
    print(q)
con.close()
