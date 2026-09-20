"""Print PocketBase collection API rules and view SQL length.

Usage: python scripts/inspect_rules.py [path-to-data.db]
Read-only. Helps decide whether unauthenticated fetches can be timed.
"""
import json
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else "backend/pb_data/data.db"
con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)

for name, ctype, opts in con.execute(
    "SELECT name, type, options FROM _collections ORDER BY type, name"
):
    o = json.loads(opts)
    mark = lambda k: "set " if o.get(k) is not None else "null"
    print(
        f"{ctype:5} {name:28} list={mark('listRule')} "
        f"view={mark('viewRule')} create={mark('createRule')} "
        f"update={mark('updateRule')} delete={mark('deleteRule')}"
    )

con.close()
