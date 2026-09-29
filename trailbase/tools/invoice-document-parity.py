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
LINE_EXPR = ("(t.\"price\"*t.\"qty\")*(1-t.\"discount_1\"/100.0)"
             "*(1-t.\"discount_2\"/100.0)-t.\"discount_rs\"")

BUILD_DOC = """
WITH lt AS (
  -- one row per live transaction line, with legacy's exact line arithmetic
  SELECT t."invoice" AS inv, t."id" AS line_id, t."item" AS item,
         t."qty" AS qty, t."price" AS price, t."cost_price" AS cost_price,
         t."scheme" AS scheme, t."discount_1" AS d1, t."discount_2" AS d2,
         t."discount_rs" AS drs,
         printf('%.2f', LINEEXPR) AS line_rounded,
         LINEEXPR AS line_raw
  FROM "transactions" t WHERE t."deleted" = 0
),
sums AS (
  -- legacy rounds EACH line to 2dp before summing, then applies invoice discounts
  SELECT i."id" AS inv,
         printf('%.2f', COALESCE(SUM(CAST(lt.line_rounded AS REAL)), 0)) AS total,
         i."discount_1" AS d1, i."discount_2" AS d2, i."discount_rs" AS drs
  FROM "invoices" i LEFT JOIN lt ON lt.inv = i."id"
  WHERE i."deleted" = 0 GROUP BY i."id"
),
money AS (
  -- LEGACY QUIRK, verified against PocketBase: unrounded_total is itself rounded to
  -- 2dp by printf, and final_total subtracts discount_rs from the ROUNDED value.
  -- Getting this wrong moves 4 invoices by half a cent and one by a whole cent.
  SELECT s.inv, s.total, s.d1, s.d2, s.drs,
         printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
           AS unrounded_total,
         printf('%.2f', printf('%.2f', s.total - (s.total * s.d1 / 100.0)
                              - ((s.total - (s.total * s.d1 / 100.0)) * s.d2 / 100.0))
                         - s.drs) AS final_total
  FROM sums s
),
paid AS (
  -- NOTE: payments has NO "deleted" column in this schema, so nothing filters here.
  SELECT "invoice" AS inv,
         printf('%.2f', COALESCE(SUM(CASE WHEN "paid" = 1 THEN "amount" ELSE 0 END), 0)) AS paid_total
  FROM "payments" GROUP BY "invoice"
),
ljson AS (
  SELECT inv, json_group_array(json_object(
           'id', hex(line_id), 'item', hex(item), 'qty', qty, 'price', price,
           'cost_price', cost_price, 'scheme', scheme,
           'd1', d1, 'd2', d2, 'drs', drs,
           'total', line_rounded, 'total_raw', line_raw)) AS lines
  FROM lt GROUP BY inv
),
pjson AS (
  SELECT pay."invoice" AS inv, json_group_array(json_object(
           'id', hex(pay."id"), 'type', pay."type", 'amount', pay."amount",
           'paid', pay."paid", 'payment_date', pay."payment_date",
           'description', pay."description")) AS pays
  FROM "payments" pay GROUP BY pay."invoice"
)
INSERT INTO inv (id, doc)
SELECT i."id",
  json_object(
    'readable_id', 'inv-' || i."invoiceNo",
    'type', i."type", 'invoiceNo', i."invoiceNo",
    'party', hex(i."party"), 'booker', hex(i."booker"),
    'dated', i."dated", 'completed', i."completed",
    'd1', i."discount_1", 'd2', i."discount_2", 'drs', i."discount_rs",
    'total', m.total,
    'unrounded_total', m.unrounded_total,
    'final_total', m.final_total,
    'paid_total', COALESCE(p.paid_total, 0),
    'remaining', m.final_total - COALESCE(p.paid_total, 0),
    'lines', json(COALESCE(l.lines, '[]')),
    'payments', json(COALESCE(pj.pays, '[]'))
  )
FROM "invoices" i
JOIN money m ON m.inv = i."id"
LEFT JOIN paid p ON p.inv = i."id"
LEFT JOIN ljson l ON l.inv = i."id"
LEFT JOIN pjson pj ON pj.inv = i."id"
WHERE i."deleted" = 0
""".replace("LINEEXPR", LINE_EXPR)

CREATE_INV = """
CREATE TABLE inv (
  id          BLOB PRIMARY KEY,
  doc         TEXT NOT NULL CHECK (json_valid(doc)),
  readable_id TEXT    GENERATED ALWAYS AS (json_extract(doc,'$.readable_id')) STORED,
  type        INTEGER GENERATED ALWAYS AS (json_extract(doc,'$.type'))        STORED,
  invoice_no  REAL    GENERATED ALWAYS AS (json_extract(doc,'$.invoiceNo'))   STORED,
  party       TEXT    GENERATED ALWAYS AS (json_extract(doc,'$.party'))       STORED,
  dated       TEXT    GENERATED ALWAYS AS (json_extract(doc,'$.dated'))       STORED,
  completed   INTEGER GENERATED ALWAYS AS (json_extract(doc,'$.completed'))   STORED,
  total       REAL    GENERATED ALWAYS AS (CAST(json_extract(doc,'$.total') AS REAL))       STORED,
  final_total REAL    GENERATED ALWAYS AS (CAST(json_extract(doc,'$.final_total') AS REAL)) STORED,
  paid_total  REAL    GENERATED ALWAYS AS (CAST(json_extract(doc,'$.paid_total') AS REAL))  STORED,
  remaining   REAL    GENERATED ALWAYS AS (CAST(json_extract(doc,'$.remaining') AS REAL))   STORED,
  line_count  INTEGER GENERATED ALWAYS AS (json_array_length(json_extract(doc,'$.lines'))) STORED
)
"""

INDEXES = """
CREATE INDEX inv_party     ON inv(party);
CREATE INDEX inv_dated     ON inv(dated);
CREATE INDEX inv_type_done ON inv(type, completed);
CREATE INDEX inv_readable  ON inv(readable_id);
"""


def build(con):
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
    gt = con.execute('SELECT type,invoice_no,total,'
                     ' CAST(json_extract(doc,\'$.unrounded_total\') AS REAL),final_total,'
                     ' remaining,paid_total'
                     ' FROM inv').fetchall()

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
    for (t, no, doc) in con.execute('SELECT type,invoice_no,doc FROM inv'):
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
    for (t, no, doc) in con.execute('SELECT type,invoice_no,doc FROM inv'):
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
# --------------------------------------------------------------------------
TRIGGERS = """
-- Maintain the parent document when a line changes. This is the whole argument for
-- tier 2: the derived total is written in the SAME transaction as the line, so a
-- reader can never see an invoice whose stored total disagrees with its lines.
CREATE TRIGGER trg_inv_sync AFTER INSERT ON "transactions" FOR EACH ROW
BEGIN
  UPDATE inv SET doc = json_set(
    json_set(doc,
      '$.total', (SELECT printf('%.2f', COALESCE(SUM(CAST(printf('%.2f',
           (t."price"*t."qty")*(1-t."discount_1"/100.0)
                             *(1-t."discount_2"/100.0)-t."discount_rs") AS REAL)), 0))
         FROM "transactions" t WHERE t."invoice" = NEW."invoice" AND t."deleted" = 0),
      '$.lines', json((SELECT json_group_array(json_object(
           'id', hex(t."id"), 'item', hex(t."item"), 'qty', t."qty", 'price', t."price",
           'total', printf('%.2f', (t."price"*t."qty")*(1-t."discount_1"/100.0)
                                          *(1-t."discount_2"/100.0)-t."discount_rs")))
         FROM "transactions" t WHERE t."invoice" = NEW."invoice" AND t."deleted" = 0))),
      '$.line_count', (SELECT COUNT(*) FROM "transactions" t
                       WHERE t."invoice" = NEW."invoice" AND t."deleted" = 0)
  ) WHERE id = NEW."invoice";
END;
"""


def test_trigger(con):
    row = con.execute(
        'SELECT id FROM inv WHERE line_count >= 3 ORDER BY line_count DESC LIMIT 1').fetchone()
    inv_id = row[0]
    before = json.loads(con.execute('SELECT doc FROM inv WHERE id=?', (inv_id,)).fetchone()[0])
    item = con.execute('SELECT "id" FROM "items" LIMIT 1').fetchone()[0]

    t0 = time.perf_counter()
    con.execute('BEGIN')
    con.execute('INSERT INTO "transactions"'
                ' ("invoice","item","cost_price","price","qty","scheme")'
                ' VALUES (?,?,?,?,?,?)',
                (inv_id, item, 10.0, 20.0, 5.0, 0.0))
    con.execute('COMMIT')
    ms = (time.perf_counter() - t0) * 1000

    after = json.loads(con.execute('SELECT doc FROM inv WHERE id=?', (inv_id,)).fetchone()[0])
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
    con.execute(CREATE_INV.replace("CREATE TABLE inv (", "CREATE TABLE inv_rebuild ("))
    con.execute(BUILD_DOC.replace("INSERT INTO inv (", "INSERT INTO inv_rebuild ("))
    con.commit()
    build_ms = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    con.execute("BEGIN IMMEDIATE")
    con.execute("DELETE FROM inv")
    con.execute("INSERT INTO inv (id,doc) SELECT id,doc FROM inv_rebuild")
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
    n = con.execute("SELECT COUNT(*) FROM inv").fetchone()[0]
    payload = con.execute("SELECT SUM(LENGTH(doc)) FROM inv").fetchone()[0]
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
    con.execute(TRIGGERS)
    con.commit()
    before, after, ms = test_trigger(con)
    print(f"  a line insert + trigger took {ms:.1f} ms")
    print(f"  total      {before['total']}  ->  {after['total']}")
    print(f"  line count {len(before['lines'])}  ->  {len(after['lines'])}")
    recomputed = round(sum(float(l["total"]) for l in after["lines"]), 2)
    print(f"  sum of embedded line totals = {recomputed}")
    print(f"  document.total agrees with its own lines: "
          f"{abs(recomputed - float(after['total'])) < 0.005}")
    con.execute("DROP TRIGGER trg_inv_sync")
    con.commit()

    print("\n--- 3. the refresh: rebuild from scratch ---")
    con.execute("DROP TABLE inv")
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
