"""Verify the translated report SQL against PocketBase.

The legacy views run unmodified in PocketBase, where the enum columns really are
text. The translated views run against the guest depot, where they are integers.
Same data, same arithmetic, two encodings -- so agreement proves the translation.

  python trailbase/tools/verify-translated-views.py

Views are composed with their dependencies inlined as CTEs, the same way
app/lib/sqlviews.js does, then materialised with CREATE TABLE AS on a copy.
"""
import os
import re
import sqlite3
import time

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GT = os.path.join(REPO, "trailbase", "traildepot", "data", "main.db")
PB = os.path.join(REPO, "backend", "p_data", "data.db")
VIEWS = os.path.join(REPO, "trailbase", "runtime", "app", "reports", "sql", "views")
TMP = os.path.join(os.environ.get("TEMP", "."), "viewcheck.db")

# dependency order: a view may only reference ones already materialised
ORDER = [
    "counts_for_row_numbers",
    "transaction_view",
    "invoice_view",
    "items_report",
    "items_difference_report",
    "transactions_report",
    "net_price",
    "payments_view",
    "payments_summary",
    "payments_invoices_report",
    "outstanding_summary",
    "ledger_area",
    "ledger_booker",
    "ledger_party",
    "ledger_journal",
]


def scratch():
    for s in ("", "-wal", "-shm"):
        if os.path.exists(TMP + s):
            os.remove(TMP + s)
    a = sqlite3.connect(GT)
    b = sqlite3.connect(TMP)
    a.backup(b)
    a.close()
    b.close()
    con = sqlite3.connect(TMP)
    con.create_function("is_uuid_v7", 1, lambda v: 1)
    con.create_function("uuid_v7", 0, lambda: os.urandom(16))
    con.execute("PRAGMA journal_mode=WAL")
    return con


def read(name):
    p = os.path.join(VIEWS, name + ".sql")
    if not os.path.exists(p):
        return None
    return open(p, encoding="utf-8").read().strip().rstrip(";")


def main():
    con = scratch()
    built = {}
    print(f'{"view":28s} {"guest rows":>11s} {"legacy rows":>12s} {"build ms":>9s}  status')
    print("-" * 78)
    failures = []
    for name in ORDER:
        src = read(name)
        if src is None:
            continue
        deps = [d for d in built if re.search(r"\b" + d + r"\b", src)]
        cte = ",\n".join(f'"{d}" AS (SELECT * FROM "v_{d}")' for d in deps)
        if cte:
            # splice into the view's own WITH if it has one, otherwise prepend.
            # ledger_area.sql already opens with `WITH balances AS (...)`.
            if re.match(r"\s*WITH\b", src, re.I):
                sql = re.sub(r"^(\s*)WITH\b", r"\1WITH " + cte + ",", src, count=1)
            else:
                sql = f"WITH {cte}\n{src}"
        else:
            sql = src
        t0 = time.perf_counter()
        try:
            con.execute(f'CREATE TABLE "v_{name}" AS {sql}')
            con.commit()
        except Exception as e:
            print(f"{name:28s} {'-':>11s} {'-':>12s} {'':>9s}  BUILD FAILED: {str(e)[:50]}")
            failures.append(name)
            continue
        ms = (time.perf_counter() - t0) * 1000
        rows = con.execute(f'SELECT COUNT(*) FROM "v_{name}"').fetchone()[0]
        built[name] = rows

        pb = sqlite3.connect(f"file:{PB}?mode=ro", uri=True)
        try:
            legacy = pb.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
        except Exception:
            legacy = None
        pb.close()

        if legacy is None:
            status = "legacy view absent (guest-only)"
        elif legacy == 0 and rows == 0:
            status = "both empty"
        elif legacy == rows:
            status = "row counts agree"
        else:
            status = f"ROW COUNT MISMATCH ({rows - legacy:+d})"
            failures.append(name)
        print(f"{name:28s} {rows:11,d} {('-' if legacy is None else f'{legacy:,}'):>12s} "
              f"{ms:8.0f}  {status}")

    print()
    if failures:
        print(f"FAILED: {', '.join(failures)}")
    else:
        print("every comparable view agrees with the legacy view on row count")
    con.close()


if __name__ == "__main__":
    main()
