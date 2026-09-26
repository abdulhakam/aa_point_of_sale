import sqlite3, sys
db = sys.argv[1] if len(sys.argv) > 1 else "trailbase/traildepot/data/main.db"
con = sqlite3.connect("file:" + db + "?mode=ro", uri=True)
cur = con.cursor()
tables = [r[0] for r in cur.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_*' ORDER BY name"
)]
total = 0
for t in tables:
    n = cur.execute('SELECT count(*) FROM "%s"' % t).fetchone()[0]
    total += n
    print("%-22s %6d" % (t, n))
print("%-22s %6d" % ("TOTAL", total))
con.close()
