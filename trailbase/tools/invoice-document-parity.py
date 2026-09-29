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
# U1790300500 is the migration that owns the build statement now: U1790300300 created
# `inv_doc` and its backfill ran against a depot that had no invoices yet, so the table
# shipped empty. U1790300500 is the one that populates it, adds the denormalised names,
# and defines the triggers -- so it is the one whose SQL has to stay pinned to PocketBase.
MIGRATION = os.path.join(REPO, "trailbase", "migrations", "main",
                        "U1790300500__invoice_document_sync.sql")


def read_migration_sql():
    """The build is read OUT OF THE MIGRATION, not restated here.

    The money arithmetic exists in exactly one place in the repository, and the
    migration is that place. Restating it in this harness would create the second
    copy the whole design exists to avoid.

    U1790300500 contains the statement three times on purpose: as a commented block a
    reader can follow, as the text stored in `materialised_source` for the runtime
    rebuild to execute, and as the executable statement in section 4. This takes the
    executable one -- the statement immediately after `DELETE FROM "inv_doc";` -- because
    the other two are the same text and only this one is what actually ran.
    (tools/invoice-doc-check.mjs asserts all three are identical.)
    """
    src = open(MIGRATION, encoding="utf-8").read()
    anchor = src.index('DELETE FROM "inv_doc";') + len('DELETE FROM "inv_doc";')
    start = src.index("WITH lt AS (", anchor)
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
# The triggers are read OUT OF THE MIGRATION, not derived here.
#
# This harness used to derive a trigger of its own from the backfill, and that was right
# when there were no triggers in the repository to read. There are now fourteen, in
# U1790300500, and they are the thing under test -- so deriving a fifteenth here would
# test a copy and leave the shipped one untested, which is the exact failure this whole
# design exists to prevent.
#
# Deriving the scoping here also needed its own substitution table, and that table went
# stale the moment the build statement gained a `LEFT JOIN items`: the substitutions are
# written against specific FROM text, so a changed FROM silently stops matching. The
# substitutions now live in exactly one place, the check tool, and this file has none.
#
# The scoping claim itself -- that a per-invoice trigger is a per-invoice cost and not a
# whole-depot one -- is asserted there, not here.
# --------------------------------------------------------------------------
def read_triggers():
    """The trigger statements, verbatim, out of the migration."""
    src = MIGRATION_TEXT
    out = []
    i = 0
    while True:
        i = src.find('CREATE TRIGGER "inv_doc', i)
        if i < 0:
            return out
        j = src.index("\nEND;", i) + len("\nEND;")
        stmt = src[i:j]
        # the commented section 2 does not contain CREATE TRIGGER, so this is the real one
        assert not stmt.lstrip().startswith("--"), stmt[:80]
        out.append(stmt)
        i = j


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
    triggers = read_triggers()
    # The scratch copy came from a depot that already has the triggers, and dropping `inv_doc`
    # does NOT drop triggers that merely reference it -- so they are still installed. Drop them
    # first, then install the migration's own text. Testing what is already in the database
    # would be testing a copy; the point is to test the committed file.
    for (name,) in con.execute("SELECT name FROM sqlite_master WHERE type='trigger'"
                               " AND name LIKE 'inv_doc%'").fetchall():
        con.execute('DROP TRIGGER "%s"' % name)
    for stmt in triggers:
        con.execute(stmt)
    con.commit()
    installed = con.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger'"
                            " AND name LIKE 'inv_doc%'").fetchone()[0]
    print(f"  installed {installed} trigger(s) read from the migration")
    before, after, ms = test_trigger(con)
    print(f"  a line insert + trigger took {ms:.1f} ms")
    print(f"  total      {before['total']}  ->  {after['total']}")
    print(f"  line count {len(before['lines'])}  ->  {len(after['lines'])}")
    recomputed = round(sum(float(l["total"]) for l in after["lines"]), 2)
    print(f"  sum of embedded line totals = {recomputed}")
    print(f"  document.total agrees with its own lines: "
          f"{abs(recomputed - float(after['total'])) < 0.005}")
    # a rename must reach the documents that quote the old name
    item = con.execute('SELECT "id", "name" FROM "items" LIMIT 1').fetchone()
    worst = con.execute('SELECT "item", COUNT(DISTINCT "invoice") c FROM "transactions"'
                        ' WHERE "deleted"=0 GROUP BY "item" ORDER BY c DESC LIMIT 1').fetchone()
    affected = [r[0] for r in con.execute('SELECT DISTINCT "invoice" FROM "transactions"'
                                          ' WHERE "item"=? AND "deleted"=0', (worst[0],))]
    con.execute('UPDATE "items" SET "name"=? WHERE "id"=?', ("RENAMED", worst[0]))
    con.commit()
    stale = 0
    for i in affected:
        d = json.loads(con.execute('SELECT doc FROM "inv_doc" WHERE "id"=?', (i,)).fetchone()[0])
        stale += sum(1 for l in d["lines"] if l["item"] == worst[0].hex() and l["item_name"] != "RENAMED")
    print(f"  item rename across {len(affected)} documents left {stale} stale line name(s)")
    con.execute('UPDATE "items" SET "name"=? WHERE "id"=?', (item[1], item[0]))
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
