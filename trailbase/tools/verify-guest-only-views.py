"""The two guest-only views have no legacy counterpart, so compare them against
the JS builders that are the guest's current source of truth.

  python trailbase/tools/verify-guest-only-views.py

payments_summary and outstanding_summary are the numbers the cash-memo screens
show, so a silent divergence here is the expensive kind.
"""
import base64
import json
import os
import re
import sqlite3

REPO = r"D:\1Aeid4nI3hdH92f3D\abdulhakam\WORK\AA\ERP_DB\aa_point_of_sale\PRODUCTION\PRODUCTION_FULL\aa_point_of_sale"
VIEWS = os.path.join(REPO, "trailbase", "runtime", "app", "reports", "sql", "views")
TMP = os.path.join(os.environ.get("TEMP", "."), "guestonly.db")
MVIEW = os.path.join(REPO, "trailbase", "traildepot", "data", "main.db")

DEPS = ["transaction_view", "invoice_view", "transactions_report", "payments_view"]


def build_sql(name, con):
    src = open(os.path.join(VIEWS, name + ".sql"), encoding="utf-8").read().strip().rstrip(";")
    cte = ",\n".join(f'"{d}" AS (SELECT * FROM "v_{d}")' for d in DEPS
                     if re.search(r"\b" + d + r"\b", src))
    if cte:
        if re.match(r"\s*WITH\b", src, re.I):
            sql = re.sub(r"^(\s*)WITH\b", r"\1WITH " + cte + ",", src, count=1)
        else:
            sql = f"WITH {cte}\n{src}"
    else:
        sql = src
    con.execute(f'CREATE TABLE "v_{name}" AS {sql}')
    con.commit()
    return con.execute(f'SELECT COUNT(*) FROM "v_{name}"').fetchone()[0]


def js_key(v):
    """The guest's JS views emit ids as URL-SAFE base64 (note the '-' characters);
    the SQL path yields raw BLOBs. Normalise both to lowercase hex so they compare.
    Standard b64decode rejects '-' under validate=True and silently loses 208 of the
    602 outstanding parties, which looks exactly like a data divergence."""
    if isinstance(v, bytes):
        return v.hex().lower()
    if isinstance(v, str):
        try:
            return base64.urlsafe_b64decode(v).hex().lower()
        except Exception:
            return v.lower()
    return v


def main():
    for s in ("", "-wal", "-shm"):
        if os.path.exists(TMP + s):
            os.remove(TMP + s)
    a = sqlite3.connect(MVIEW)
    b = sqlite3.connect(TMP)
    a.backup(b)
    a.close()
    b.close()
    con = sqlite3.connect(TMP)
    con.create_function("is_uuid_v7", 1, lambda v: 1)
    con.create_function("uuid_v7", 0, lambda: os.urandom(16))
    for d in DEPS:
        build_sql(d, con)

    live = sqlite3.connect(f"file:{MVIEW}?mode=ro", uri=True)
    names = [n for (n,) in live.execute("SELECT name FROM mview")]
    print("mview views:", ", ".join(sorted(names)))
    print()

    # ---- outstanding: SQL vs the JS buildOutstanding ----
    sql_rows = build_sql("outstanding_summary", con)
    con.execute('ALTER TABLE "v_outstanding_summary" RENAME TO outstanding_summary')
    js = json.loads(live.execute(
        "SELECT data FROM mview WHERE name='outstanding'").fetchone()[0])
    print(f"outstanding_summary   SQL {sql_rows:,} rows   JS {len(js):,} rows")
    if sql_rows == len(js):
        sql_sum = con.execute("SELECT ROUND(SUM(balance),2) FROM outstanding_summary").fetchone()[0]
        js_sum = round(sum(float(d['balance']) for d in js), 2)
        print(f"  total balance       SQL {sql_sum:>16,.2f}   JS {js_sum:>16,.2f}")
        print(f"  balance agrees      {abs(sql_sum - js_sum) <= 0.01}  (1c float accumulation order)")
        # per-party check
        js_map = {js_key(d['party']): round(float(d['balance']), 2) for d in js}
        sql_map = {r[0].hex().lower(): round(r[1], 2) for r in con.execute(
            "SELECT party, balance FROM outstanding_summary")}
        only_js = set(js_map) - set(sql_map)
        only_sql = set(sql_map) - set(js_map)
        differ = [p for p in set(js_map) & set(sql_map)
                  if abs(js_map[p] - sql_map[p]) > 0.005]
        print(f"  parties only in JS  {len(only_js)}")
        print(f"  parties only in SQL {len(only_sql)}")
        print(f"  parties compared   {len(set(js_map) & set(sql_map))}")
        print(f"  parties differing  {len(differ)}")
        for p in differ[:3]:
            print(f"     {p.upper()}: JS {js_map[p]} vs SQL {sql_map[p]}")
    else:
        print("  ROW COUNT MISMATCH")

    # ---- payments_summary ----
    print()
    sql_rows = build_sql("payments_summary", con)
    con.execute('ALTER TABLE "v_payments_summary" RENAME TO payments_summary')
    jsname = "paymentsSummary" if "paymentsSummary" in names else None
    if jsname:
        js2 = json.loads(live.execute(
            "SELECT data FROM mview WHERE name=?", (jsname,)).fetchone()[0])
        print(f"payments_summary      SQL {sql_rows:,} rows   JS {len(js2):,} rows")
        if sql_rows == len(js2):
            for col in ("sent", "sending", "recieved", "recieving",
                        "recieving_returns", "sending_returns"):
                s = con.execute(
                    f'SELECT ROUND(SUM("{col}"),2) FROM payments_summary').fetchone()[0] or 0
                j = round(sum(float(d.get(col, 0) or 0) for d in js2), 2)
                print(f"  {col:20s} SQL {s:>16,.2f}   JS {j:>16,.2f}   "
                      f"{'ok' if abs(s - j) < 0.005 else 'DIFFER'}")
        else:
            print("  ROW COUNT MISMATCH")
    else:
        print(f"payments_summary      SQL {sql_rows:,} rows   JS view not in mview "
              f"(available: paymentsView, paymentsInvoicesReport)")
    con.close()


if __name__ == "__main__":
    main()
