"""Print PocketBase collection API rules and view SQL length.

Usage: python scripts/inspect_rules.py [path-to-data.db]
Read-only. Helps decide whether unauthenticated fetches can be timed.
"""
import json
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else "backend/pb_data/data.db"
con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)

# In PocketBase v0.22 the API rules are columns on _collections
# (null = locked to superusers, '' = public, otherwise a rule expression).
for name, ctype, lr, vr, cr, ur, dr in con.execute(
    "SELECT name, type, listRule, viewRule, createRule, updateRule, deleteRule "
    "FROM _collections ORDER BY type, name"
):
    show = lambda v: "PUBLIC" if v == "" else ("locked" if v is None else v)
    print(f"{ctype:5} {name:28} list={show(lr):38} view={show(vr):38} create={show(cr):38}")

con.close()

