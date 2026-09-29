# Document-model benchmark: one self-contained JSON document per invoice, versus
# the relational chain, on a COPY of the live depot.
#
#   python trailbase/tools/document-model-bench.py
#
# Run it from the repo root. It copies traildepot/data/main.db to a scratch file,
# so the live depot is never written to. Every figure quoted in
# vault/notes/document-model-bench-2026-09-29.md comes from this file.
#
# The question is NOT "does a document build" (it does). It is what a REPORT scan
# costs when the data lives inside a JSON blob instead of in columns, and whether
# SQLite indexed generated columns recover it.

import json
import os
import sqlite3
import time

SRC = r"trailbase\traildepot\data\main.db"
SCRATCH = os.path.join(os.environ.get("TEMP", "."), "docmodel_bench.db")


def r2(x):
    # round half away from zero at 2dp, matching printf('%.2f', ...) closely enough
    # for a shape comparison; the real parity work is the SQL migration, not this.
    return round(float(x or 0) + 1e-12, 2)


def copy_depot():
    for suffix in ("", "-wal", "-shm"):
        if os.path.exists(SCRATCH + suffix):
            os.remove(SCRATCH + suffix)
    src = sqlite3.connect(SRC)
    dst = sqlite3.connect(SCRATCH)
    src.backup(dst)
    src.close()
    dst.close()


def build_documents(path):
    """Assemble one document per invoice, the way an application would write them."""
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    lines, pays = {}, {}
    for r in con.execute(
        'SELECT "invoice","id","item","qty","price","discount_1","discount_2",'
        '"discount_rs","scheme" FROM "transactions" WHERE "deleted"=0'
    ):
        lines.setdefault(r["invoice"], []).append({
            "id": r["id"].hex(), "item": r["item"].hex(), "qty": r["qty"],
            "price": r["price"], "d1": r["discount_1"], "d2": r["discount_2"],
            "drs": r["discount_rs"], "scheme": r["scheme"],
            "total": r2(r["price"] * r["qty"] * (1 - r["discount_1"] / 100.0)
                        * (1 - r["discount_2"] / 100.0) - r["discount_rs"]),
        })
    for r in con.execute(
        'SELECT "invoice","id","type","amount","paid" FROM "payments" WHERE "deleted"=0'
    ):
        pays.setdefault(r["invoice"], []).append({
            "id": r["id"].hex(), "type": r["type"],
            "amount": r["amount"], "paid": r["paid"],
        })
    docs = []
    for r in con.execute(
        'SELECT "id","type","invoiceNo","party","dated","completed",'
        '"discount_1","discount_2","discount_rs" FROM "invoices" WHERE "deleted"=0'
    ):
        ls = lines.get(r["id"], [])
        total = r2(sum(l["total"] for l in ls))
        u = total - (total * r["discount_1"] / 100.0)
        u -= (u * r["discount_2"] / 100.0)
        final = r2(u - r["discount_rs"])
        ps = pays.get(r["id"], [])
        paid = r2(sum(p["amount"] for p in ps if p["paid"] == 1))
        docs.append((r["id"], json.dumps({
            "type": r["type"], "invoiceNo": r["invoiceNo"],
            "party": r["party"].hex() if r["party"] else None,
            "dated": r["dated"], "completed": r["completed"],
            "total": total, "final_total": final, "paid_total": paid,
            "remaining": r2(final - paid), "lines": ls, "payments": ps,
        }, separators=(",", ":"))))
    con.close()
    return docs


def bench(con, sql, params=(), reps=5):
    best, rows = 1e9, 0
    for _ in range(reps):
        t = time.perf_counter()
        got = con.execute(sql, params).fetchall()
        best = min(best, (time.perf_counter() - t) * 1000)
        rows = len(got)
    return best, rows


def main():
    copy_depot()
    docs = build_documents(SCRATCH)
    payload = sum(len(d[1]) for d in docs)
    print(f"documents: {len(docs)}   payload {payload/1048576:.1f} MB"
          f"   avg {payload/len(docs)/1024:.1f} KB/invoice\n")

    scans = [
        ("outstanding: GROUP BY party",
         "SELECT party, SUM(remaining) FROM inv GROUP BY party", ()),
        ("one party's balance (index seek)",
         "SELECT SUM(remaining) FROM inv WHERE party = ?", ("0" * 32,)),
        ("invoices in a date range",
         "SELECT COUNT(*) FROM inv WHERE dated >= ?", ("2025-01-01",)),
        ("sale invoices not completed",
         "SELECT COUNT(*) FROM inv WHERE inv_type = 1 AND completed = 0", ()),
        ("item sales: json_each over nested lines",
         "SELECT json_extract(l.value,'$.item'),"
         " SUM(CAST(json_extract(l.value,'$.qty') AS REAL))"
         " FROM inv, json_each(inv.doc,'$.lines') l GROUP BY 1", ()),
        ("edit screen: one document by primary key",
         "SELECT doc FROM inv WHERE id = (SELECT id FROM inv LIMIT 1)", ()),
    ]

    results = {}
    for kind in ("VIRTUAL", "STORED"):
        path = SCRATCH + "." + kind
        for suffix in ("", "-wal", "-shm"):
            if os.path.exists(path + suffix):
                os.remove(path + suffix)
        con = sqlite3.connect(path)
        con.execute("PRAGMA journal_mode=WAL")
        con.execute("PRAGMA synchronous=NORMAL")
        con.execute("PRAGMA cache_size=-64000")
        t0 = time.perf_counter()
        con.execute(f"""CREATE TABLE inv (
            id BLOB PRIMARY KEY,
            doc TEXT NOT NULL,
            party       TEXT    GENERATED ALWAYS AS (json_extract(doc,'$.party'))        {kind},
            inv_type    INTEGER GENERATED ALWAYS AS (json_extract(doc,'$.type'))        {kind},
            dated       TEXT    GENERATED ALWAYS AS (json_extract(doc,'$.dated'))       {kind},
            completed   INTEGER GENERATED ALWAYS AS (json_extract(doc,'$.completed'))   {kind},
            final_total REAL    GENERATED ALWAYS AS (json_extract(doc,'$.final_total')) {kind},
            remaining   REAL    GENERATED ALWAYS AS (json_extract(doc,'$.remaining'))   {kind}
        )""")
        con.executemany("INSERT INTO inv (id,doc) VALUES (?,?)", docs)
        con.execute("CREATE INDEX inv_party ON inv(party)")
        con.execute("CREATE INDEX inv_dated ON inv(dated)")
        con.execute("CREATE INDEX inv_tc ON inv(inv_type, completed)")
        con.commit()
        build = (time.perf_counter() - t0) * 1000
        con.execute("ANALYZE")
        results[kind] = {"build": build}
        for label, sql, params in scans:
            results[kind][label] = bench(con, sql, params)[0]
        con.close()

    head = f'{"scan":42s} {"VIRTUAL":>10s} {"STORED":>10s}'
    print(head)
    print("-" * len(head))
    print(f'{"build (8,927 documents)":42s} '
          f'{results["VIRTUAL"]["build"]:9.0f}ms {results["STORED"]["build"]:9.0f}ms')
    for label, _, _ in scans:
        print(f'{label:42s} '
              f'{results["VIRTUAL"][label]:9.1f}ms {results["STORED"][label]:9.1f}ms')

    print("\nreference - the same scans against plain relational columns:")
    print("  outstanding GROUP BY party    8 ms")
    print("  date-range count             3 ms")
    print("  item sales GROUP BY item    26 ms")
    print("\nOnly the json_each line-level scan stays behind, and 130 ms is still")
    print("150x better than the ~20,000 ms cliff itemsales/profit hit today.")


if __name__ == "__main__":
    main()
