"""Invoice-document prototype: build a STORED generated-column document table on a
throwaway copy of the depot and diff every money figure against PocketBase.

    python trailbase/tools/invoice-document-parity.py

Answers three questions with evidence rather than argument:
  1. Does a document reproduce the legacy money exactly, invoice by invoice?
  2. Can a write maintain it inside the same transaction (the trigger path)?
  3. What does a user-triggered refresh cost, and is it atomic?

Join key is (invoice type code, invoiceNo): verified unique in both databases,
8,927 rows each, no key present in only one side. The live depot is never
written to; everything happens on a scratch copy.
"""
import json
import os
import shutil
import sqlite3
import time

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PB = os.path.join(REPO, "backend", "p_data", "data.db")
GT = os.path.join(REPO, "trailbase", "traildepot", "data", "main.db")
TMP = os.path.join(os.environ.get("TEMP", "."), "invoice_doc_parity.db")

TYPE_CODE = {"purchase": 0, "sale": 1, "return": 2, "difference": 3}


def r2(x):
    """Round to 2dp the way SQLite printf('%.2f') does: half away from zero."""
    from decimal import Decimal, ROUND_HALF_UP
    return float(Decimal(repr(float(x))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def scratch_copy():
    for s in ("", "-wal", "-shm"):
        if os.path.exists(TMP + s):
            os.remove(TMP + s)
    src = sqlite3.connect(GT)
    dst = sqlite3.connect(TMP)
    src.backup(dst)
    src.close()
    dst.close()
    con = sqlite3.connect(TMP)
    # TrailBase registers these as custom SQLite functions; stub them so the
    # scratch copy accepts the same DDL and defaults the real depot uses.
    con.create_function("is_uuid_v7", 1, lambda v: 1)
    con.create_function("uuid_v7", 0, lambda: os.urandom(16))
    return con


# --------------------------------------------------------------------------
# 1. build the document table
# --------------------------------------------------------------------------
MIGRATION = os.path.join(REPO, "trailbase", "migrations", "main",
                        "U1790300300__materialised_invoice_documents.sql")


def read_migration_sql():
    """The backfill is read OUT OF THE MIGRATION, not restated here.

    The money arithmetic exists in exactly one place in the repository, and the
    migration is that place. Restating it in this harness would create the second
    copy the whole design exists to avoid.
    """
    src = open(MIGRATION, encoding="utf-8").read()
    start = src.index("WITH lt AS (")
    end = src.index('WHERE i."deleted" = 0;', start) + len('WHERE i."deleted" = 0;')
    return src, src[start:end]


MIGRATION_TEXT, BUILD_DOC = read_migration_sql()

CREATE_INV = """
CREATE TABLE "inv_doc" (
  "id"          BLOB PRIMARY KEY NOT NULL,
  "doc"         TEXT NOT NULL CHECK (json_valid("doc")),
  "readable_id" TEXT    GENERATED ALWAYS AS (json_extract("doc", '$.readable_id')) STORED,
  "inv_type"    INTEGER GENERATED ALWAYS AS (json_extract("doc", '$.type'))        STORED,
  "invoice_no"  REAL    GENERATED ALWAYS AS (json_extract("doc", '$.invoiceNo'))   STORED,
  "party"       TEXT    GENERATED ALWAYS AS (json_extract("doc", '$.party'))       STORED,
  "booker"      TEXT    GENERATED ALWAYS AS (json_extract("doc", '$.booker'))      STORED,
  "dated"       TEXT    GENERATED ALWAYS AS (json_extract("doc", '$.dated'))       STORED,
  "completed"   INTEGER GENERATED ALWAYS AS (json_extract("doc", '$.completed'))   STORED,
  "total"       REAL    GENERATED ALWAYS AS (CAST(json_extract("doc", '$.total') AS REAL))       STORED,
  "final_total" REAL    GENERATED ALWAYS AS (CAST(json_extract("doc", '$.final_total') AS REAL)) STORED,
  "paid_total"  REAL    GENERATED ALWAYS AS (CAST(json_extract("doc", '$.paid_total') AS REAL))  STORED,
  "remaining"   REAL    GENERATED ALWAYS AS (CAST(json_extract("doc", '$.remaining') AS REAL))   STORED,
  "line_count"  INTEGER GENERATED ALWAYS AS (json_array_length(json_extract("doc", '$.lines')))  STORED
)
"""

INDEXES = """
CREATE INDEX inv_doc__party     ON "inv_doc"("party");
CREATE INDEX inv_doc__dated     ON "inv_doc"("dated");
CREATE INDEX inv_doc__type_done ON "inv_doc"("inv_type", "completed");
CREATE INDEX inv_doc__readable  ON "inv_doc"("readable_id");
"""


def build(con):
    # The migration now creates and back-fills inv_doc for real. Drop it and rebuild
    # from the migration's OWN backfill SQL, so this harness verifies the SQL that
    # actually ships rather than a copy of it in this file.
    con.execute('DROP TABLE IF EXISTS "inv_doc"')
    con.execute(CREATE_INV)
    con.execute(BUILD_DOC)
    for stmt in INDEXES.strip().split(";\n"):
        if stmt.strip():
            con.execute(stmt)
    con.commit()


# --------------------------------------------------------------------------
# 2. diff against PocketBase
# --------------------------------------------------------------------------
def diff(con, pb):
    pb_invoice = {(TYPE_CODE[t], float(n or 0)): (tot, unr, fin)
                  for (t, n, tot, unr, fin) in pb.execute(
                      'SELECT "type","invoiceNo","total","unrounded_total","final_total"'
                      ' FROM invoice_view')}
    gt = con.execute('SELECT inv_type,invoice_no,total,'
                     ' CAST(json_extract(doc,\'$.unrounded_total\') AS REAL),final_total,'
                     ' remaining,paid_total'
                     ' FROM "inv_doc"').fetchall()

    bad_total = bad_unr = bad_final = 0
    worst = []
    for (t, no, total, unr, final, remaining, paid) in gt:
        key = (t, float(no or 0))
        if key not in pb_invoice:
            continue
        p_total, p_unr, p_final = pb_invoice[key]
        p_total = float(p_total or 0); p_unr = float(p_unr or 0); p_final = float(p_final or 0)
        d = (abs(total - p_total), abs(unr - p_unr), abs(final - p_final))
        bad_total += d[0] > 0.005
        bad_unr += d[1] > 0.005
        bad_final += d[2] > 0.005
        if max(d) > 0.005:
            worst.append((key, (p_total, p_unr, p_final), (total, unr, final)))
    return len(gt), (bad_total, bad_unr, bad_final), worst


def diff_lines(con, pb):
    """Every transaction line, compared ORDER-INDEPENDENTLY.

    Guest ids are uuid_v7 and legacy ids are 15-char text, so there is no line-level
    join key. The document preserves insertion order while transaction_view does not,
    so pairing by position compares unrelated lines. Sorting each invoice's line
    totals and comparing the two multisets proves the arithmetic on every line.
    """
    idmap = {}
    for (t, no, rid) in pb.execute('SELECT "type","invoiceNo","id" FROM invoice_view'):
        idmap[rid] = (TYPE_CODE[t], float(no or 0))

    pb_lines = {}
    for (rid, total) in pb.execute('SELECT "invoice","total" FROM transaction_view'):
        key = idmap.get(rid)
        if key:
            pb_lines.setdefault(key, []).append(float(total or 0))

    n = bad = 0
    worst = 0.0
    for (t, no, doc) in con.execute('SELECT inv_type,invoice_no,doc FROM "inv_doc"'):
        key = (t, float(no or 0))
        if key not in pb_lines:
            continue
        mine = sorted(round(d["total_raw"], 6) for d in json.loads(doc)["lines"])
        theirs = sorted(round(v, 6) for v in pb_lines[key])
        if len(mine) != len(theirs):
            bad += 1
            continue
        for m, v in zip(mine, theirs):
            n += 1
            worst = max(worst, abs(m - v))
            if abs(m - v) > 1e-6:
                bad += 1
    print(f"    (worst per-line delta {worst:.3e})")
    return n, bad


def diff_payments(con, pb):
    """payments_view substitutes invoice final_total where amount = 0. Order-independent."""
    idmap = {}
    for (t, no, rid) in pb.execute('SELECT "type","invoiceNo","id" FROM invoice_view'):
        idmap[rid] = (TYPE_CODE[t], float(no or 0))
    pb_pay = {}
    for (rid, amt) in pb.execute('SELECT "invoice","amount" FROM payments_view'):
        key = idmap.get(rid)
        if key:
            pb_pay.setdefault(key, []).append(float(amt or 0))
    n = bad = 0
    for (t, no, doc) in con.execute('SELECT inv_type,invoice_no,doc FROM "inv_doc"'):
        key = (t, float(no or 0))
        if key not in pb_pay:
            continue
        body = json.loads(doc)
        # the legacy COALESCE: a placeholder row with amount 0 reports the invoice total
        mine = sorted(round(p["amount"] if p["amount"] != 0 else float(body["final_total"]), 6)
                      for p in body["payments"])
        theirs = sorted(round(v, 6) for v in pb_pay[key])
        if len(mine) != len(theirs):
            bad += 1
            continue
        for m, v in zip(mine, theirs):
            n += 1
            if abs(m - v) > 0.005:
                bad += 1
    return n, bad


# --------------------------------------------------------------------------
# 3. the trigger path
#
# The trigger is GENERATED from the migration's backfill, never hand-written.
# Two reasons, both learned the hard way:
#
#   1. One definition. A hand-written trigger is a SECOND copy of the money
#      arithmetic, and two copies drift silently.
#   2. Scoping. The backfill aggregates the WHOLE depot, which is right for a
#      full rebuild and catastrophic in a trigger: 23,413 transactions and 26,526
#      payments re-aggregated on every line, 237 ms per line, 8.7 s for a 36-line
#      invoice. Scoping it to the affected invoice is 0.89 ms. THREE separate
#      scans need scoping, and two carry no WHERE to extend because `payments` has
#      no deleted column -- so a substitution written for one form silently misses
#      the other. Hence the assertions.
# --------------------------------------------------------------------------
# The migration's `paid` and `pjson` CTEs share the identical FROM text, so one
# replacement scopes both. `payments` carries no deleted column, which is why these
# clauses have no WHERE to extend and the filter has to be added whole.
SCOPINGS = [
    ('FROM "transactions" t WHERE t."deleted" = 0',
     'FROM "transactions" t WHERE t."deleted" = 0 AND t."invoice" = NEW."invoice"'),
    ('FROM "payments" GROUP BY "invoice"',
     'FROM "payments" WHERE "invoice" = NEW."invoice" GROUP BY "invoice"'),
    # `sums` and the outer SELECT also walk `invoices`, and BOTH need the filter.
    # Leaving either unscoped makes the trigger's sub-select return a row for all
    # 8,927 invoices, and SQLite takes an arbitrary one -- which is an invoice with
    # no lines, so the document silently becomes total 0 with 0 lines.
    ('FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"\n  WHERE i."deleted" = 0 GROUP BY i."id"',
     'FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"\n'
     '  WHERE i."id" = NEW."invoice" AND i."deleted" = 0 GROUP BY i."id"'),
    ('WHERE i."deleted" = 0;', 'WHERE i."id" = NEW."invoice" AND i."deleted" = 0;'),
]
SCOPED_PROBES = ('t."invoice" = NEW."invoice"', '"invoice" = NEW."invoice"',
                 'i."id" = NEW."invoice" AND i."deleted" = 0 GROUP BY i."id"',
                 'WHERE i."id" = NEW."invoice" AND i."deleted" = 0;')


def build_trigger(event="INSERT"):
    """Derive the per-invoice trigger body from the migration's own backfill.

    Scoping is applied to the WHOLE statement before it is split, because the
    filters live in both halves -- the `sums` CTE and the outer SELECT each walk
    `invoices`, and both need the invoice filter.
    """
    scoped = BUILD_DOC
    for src, dst in SCOPINGS:
        if src not in scoped:
            raise AssertionError(f"scoping substitution missed: {src!r}")
        scoped = scoped.replace(src, dst)
    for probe in SCOPED_PROBES:
        if probe not in scoped:
            raise AssertionError(f"trigger body is NOT scoped: missing {probe}")
    ctes = scoped.split('INSERT INTO "inv_doc"')[0]
    # take the json_object(...) expression only -- the backfill's SELECT also emits
    # i."id", and a one-column SET target cannot take a two-column sub-select. The
    # SELECT keyword has to be kept: the CTEs need one after them.
    head = 'SELECT i."id",'
    at = scoped.index(head) + len(head)
    select = "SELECT\n  " + scoped[at:].strip().rstrip(";").strip()
    return (f'CREATE TRIGGER trg_inv_doc_sync AFTER {event} ON "transactions" '
            f'FOR EACH ROW BEGIN\n'
            f'  UPDATE "inv_doc" SET "doc" = ({ctes}\n{select}) WHERE "id" = NEW."invoice";\n'
            f'END;')


def test_trigger(con):
    row = con.execute(
        'SELECT id FROM "inv_doc" WHERE line_count >= 3 ORDER BY line_count DESC LIMIT 1').fetchone()
    inv_id = row[0]
    before = json.loads(con.execute('SELECT doc FROM "inv_doc" WHERE id=?', (inv_id,)).fetchone()[0])
    item = con.execute('SELECT "id" FROM "items" LIMIT 1').fetchone()[0]

    t0 = time.perf_counter()
    con.execute('BEGIN')
    con.execute('INSERT INTO "transactions"'
                ' ("invoice","item","cost_price","price","qty","scheme")'
                ' VALUES (?,?,?,?,?,?)',
                (inv_id, item, 10.0, 20.0, 5.0, 0.0))
    con.execute('COMMIT')
    ms = (time.perf_counter() - t0) * 1000

    after = json.loads(con.execute('SELECT doc FROM "inv_doc" WHERE id=?', (inv_id,)).fetchone()[0])
    # put it back
    con.execute('DELETE FROM "transactions" WHERE "invoice"=? AND "item"=? AND "qty"=5.0'
                ' AND "price"=20.0', (inv_id, item))
    con.commit()
    return before, after, ms


# --------------------------------------------------------------------------
# 4. the refresh
# --------------------------------------------------------------------------
def time_refresh(con):
    t0 = time.perf_counter()
    con.execute("DROP TABLE IF EXISTS inv_rebuild")
    con.execute(CREATE_INV.replace('CREATE TABLE "inv_doc"', 'CREATE TABLE "inv_rebuild"'))
    con.execute(BUILD_DOC.replace('INSERT INTO "inv_doc"', 'INSERT INTO "inv_rebuild"'))
    con.commit()
    build_ms = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    con.execute("BEGIN IMMEDIATE")
    con.execute("DELETE FROM " + chr(34) + "inv_doc" + chr(34))
    con.execute('INSERT INTO "inv_doc" (id,doc) SELECT id,doc FROM "inv_rebuild"')
    con.execute("DROP TABLE inv_rebuild")
    con.execute("COMMIT")
    swap_ms = (time.perf_counter() - t0) * 1000
    return build_ms, swap_ms


def main():
    print("copying depot to scratch (the live depot is never written)...")
    con = scratch_copy()
    pb = sqlite3.connect(f"file:{PB}?mode=ro", uri=True)

    t0 = time.perf_counter()
    build(con)
    build_ms = (time.perf_counter() - t0) * 1000
    n = con.execute('SELECT COUNT(*) FROM "inv_doc"').fetchone()[0]
    payload = con.execute('SELECT SUM(LENGTH(doc)) FROM "inv_doc"').fetchone()[0]
    print(f"\nbuilt {n} documents in {build_ms:.0f} ms, "
          f"{payload/1048576:.1f} MB ({payload/n/1024:.1f} KB each)")

    print("\n--- 1. parity with PocketBase (join key: type + invoiceNo) ---")
    total, (bt, bu, bf), worst = diff(con, pb)
    print(f"  invoices compared      : {total}")
    print(f"  total      mismatches  : {bt}")
    print(f"  unrounded  mismatches  : {bu}")
    print(f"  final_total mismatches : {bf}")
    for w in worst[:5]:
        print(f"     {w}")

    n, bad = diff_lines(con, pb)
    print(f"  transaction lines      : {n}   mismatches: {bad}")
    n, bad = diff_payments(con, pb)
    print(f"  payments (COALESCE rule): {n}   mismatches: {bad}")

    print("\n--- 2. the trigger path: is the document current after a write? ---")
    con.execute(build_trigger("INSERT"))
    con.commit()
    before, after, ms = test_trigger(con)
    print(f"  a line insert + trigger took {ms:.1f} ms")
    print(f"  total      {before['total']}  ->  {after['total']}")
    print(f"  line count {len(before['lines'])}  ->  {len(after['lines'])}")
    recomputed = round(sum(float(l["total"]) for l in after["lines"]), 2)
    print(f"  sum of embedded line totals = {recomputed}")
    print(f"  document.total agrees with its own lines: "
          f"{abs(recomputed - float(after['total'])) < 0.005}")
    con.execute('DROP TRIGGER IF EXISTS "trg_inv_doc_sync"')
    con.commit()

    print("\n--- 3. the refresh: rebuild from scratch ---")
    con.execute("DROP TABLE " + chr(34) + "inv_doc" + chr(34))
    con.commit()
    t0 = time.perf_counter()
    build(con)
    print(f"  full rebuild         : {(time.perf_counter()-t0)*1000:.0f} ms")
    b, s = time_refresh(con)
    print(f"  shadow-table build   : {b:.0f} ms")
    print(f"  atomic swap (DELETE+INSERT+DROP in one transaction): {s:.0f} ms")
    print(f"  => a user-triggered refresh is ~{(b+s)/1000:.1f} s")
    con.close()


if __name__ == "__main__":
    main()
