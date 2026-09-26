import sqlite3, sys
db = sys.argv[1] if len(sys.argv) > 1 else "backend/pb_data/data.db"
con = sqlite3.connect("file:" + db + "?mode=ro", uri=True)
cur = con.cursor()
cols = [r[0] for r in cur.execute(
    "SELECT name FROM _collections WHERE type='base' ORDER BY name"
)]
total = 0
for t in cols:
    try:
        n = cur.execute('SELECT count(*) FROM "%s"' % t).fetchone()[0]
    except Exception as e:
        n = -1
    total += max(n, 0)
    print("%-22s %6d" % (t, n))
print("%-22s %6d" % ("TOTAL", total))
con.close()
