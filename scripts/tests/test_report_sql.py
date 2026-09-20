"""POS-0014 — equivalence test for the POS-0013 aggregation views.

Proves the new SQL returns the same numbers as the previous implementation:

  1. ledger_party `balance`: window function (new) vs correlated subquery (old),
     compared row-by-row.
  2. payments_summary totals: SQL aggregate (new) vs the frontend's previous
     JS `calculator()` logic (reimplemented here over the raw rows).

Usage: python scripts/tests/test_report_sql.py <data.db>
Exits non-zero on mismatch. Read-only.
"""
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else "backend/pb_data/data.db"
con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
cur = con.cursor()
failures = []

print("=" * 74)
print(f"POS-0014 report SQL equivalence — {DB}")
print("=" * 74)

# ---------------------------------------------------------------- ledger_party
OLD_BALANCE = """
SELECT p1.id, printf("%.2f", (SELECT SUM(
         CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END)
       FROM payments_view p2
       WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)) AS balance
FROM payments_view p1
"""

NEW_BALANCE = """
SELECT p1.id, printf("%.2f", SUM(
         CASE WHEN p1.paid = FALSE THEN p1.amount ELSE -p1.amount END)
       OVER (PARTITION BY p1.party ORDER BY p1.payment_date
             RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS balance
FROM payments_view p1
"""

print("\n[1] ledger_party running balance: window function vs correlated subquery")
# Compared by record id, not row position: the two plans may order equal
# payment_dates differently, and the client sorts the ledger itself.
old = dict((r[0], r[1]) for r in cur.execute(OLD_BALANCE))
new = dict((r[0], r[1]) for r in cur.execute(NEW_BALANCE))
missing = [k for k in old if k not in new]
diff = [k for k in old if k in new and old[k] != new[k]]
print(f"    rows: old={len(old)} new={len(new)}")
print(f"    missing from new view: {len(missing)}   mismatched values: {len(diff)}")
if missing or diff:
    failures.append(f"ledger_party balance mismatch on {len(diff)} row(s)")
    for k in diff[:5]:
        print(f"      {k}: old={old[k]} new={new[k]}")
else:
    print("    OK - identical balance for every record id")

# ------------------------------------------------------------ payments_summary
# The client sums the category columns over the returned GROUP rows.
NUMERIC_COLS = [
    "entries",
    "sent",
    "sending",
    "recieved",
    "recieving",
    "recieving_returns",
    "sending_returns",
    "invoice_total",
    "total_paid",
]
SUMMARY_SQL = "SELECT " + ", ".join(NUMERIC_COLS) + " FROM payments_summary"


def js_calculator(rows):
    """Mirror of the previous frontend calculator() in PaymentsView.tsx."""
    sending = sent = recieving = recieved = 0.0
    sending_returns = recieving_returns = 0.0
    for r in rows:
        ptype, paid, amount, party_type = r["type"], r["paid"], r["amount"], r["party_type"]
        if ptype == "sending":
            if paid:
                sent += amount
            else:
                sending += amount
        elif ptype == "recieving":
            if paid:
                recieved += amount
            else:
                recieving += amount
        else:
            if party_type == "customer":
                recieving_returns += amount
            else:
                sending_returns += amount
    invoice_total = sum(r["amount"] for r in rows if not r["paid"])
    total_paid = sum(r["amount"] for r in rows if r["paid"])
    return {
        "sent": sent,
        "sending": sending,
        "recieved": recieved,
        "recieving": recieving,
        "recieving_returns": recieving_returns,
        "sending_returns": sending_returns,
        "invoice_total": invoice_total,
        "total_paid": total_paid,
        "total_sending": sending - sent - sending_returns,
        "total_recieving": recieving - recieved - recieving_returns,
        "total": invoice_total - total_paid,
    }


sample_party = cur.execute(
    "SELECT party FROM payments_view WHERE party <> '' LIMIT 1"
).fetchone()[0]

# (label, raw-row WHERE on payments_view, equivalent WHERE on payments_summary, params)
# payments_view filters on `created` timestamps; payments_summary exposes `day`
# (created truncated to 10 chars), so date bounds shift to whole days.
CASES = [
    ("all rows", "", "", []),
    (
        "date range + unpaid recieving/return (sales report filter)",
        "WHERE created >= ? AND created <= ?"
        " AND paid = 0 AND (type = 'recieving' OR type = 'return')",
        "WHERE day >= ? AND day <= ?"
        " AND paid = 0 AND (type = 'recieving' OR type = 'return')",
        ["2025-01-01 00:00:00", "2027-01-01 00:00:00", "2025-01-01", "2027-01-01"],
    ),
    (
        "one party + unpaid recieving/return",
        "WHERE paid = 0 AND (type = 'recieving' OR type = 'return') AND party = ?",
        "WHERE paid = 0 AND (type = 'recieving' OR type = 'return') AND party = ?",
        [sample_party, sample_party],
    ),
]

print("\n[2] payments_summary totals: SQL aggregate vs JS calculator()")
for label, raw_where, sum_where, raw_params in CASES:
    # params are positional; split them between the two queries by counting '?'.
    n_raw = raw_where.count("?")
    params_raw, params_sum = raw_params[:n_raw], raw_params[n_raw:]

    raw = cur.execute(
        f"SELECT type, paid, amount, party_type FROM payments_view {raw_where}",
        params_raw,
    ).fetchall()
    rows = [
        {
            "type": r[0],
            "paid": bool(r[1]),
            # payments_view.amount falls back to invoice_view.final_total, which the
            # old view formatted with printf() — i.e. a STRING for unset amounts.
            # The old JS calculator concatenated those strings (a latent bug); coerce
            # to float here so both sides do real arithmetic.
            "amount": float(r[2]) if r[2] not in (None, "") else 0.0,
            "party_type": r[3],
        }
        for r in raw
    ]
    expected = js_calculator(rows)

    groups = cur.execute(f"{SUMMARY_SQL} {sum_where}", params_sum).fetchall()
    if not groups:
        failures.append(f"payments_summary returned no rows for: {label}")
        continue
    actual = {col: sum(g[i] or 0 for g in groups) for i, col in enumerate(NUMERIC_COLS)}

    bad = []
    if actual["entries"] != len(rows):
        bad.append(f"entries {actual['entries']} != {len(rows)}")
    for k in NUMERIC_COLS[1:]:
        if abs(float(actual[k]) - float(expected[k])) > 0.011:
            bad.append(f"{k}: sql={round(actual[k], 2)} js={round(expected[k], 2)}")
    print(f"    {label}")
    print(
        f"      raw rows={len(rows)} -> summary groups={len(groups)}"
        f" -> {'OK' if not bad else 'MISMATCH: ' + '; '.join(bad)}"
    )
    if bad:
        failures.append(f"{label}: {'; '.join(bad)}")

con.close()

print("\n" + "=" * 74)
if failures:
    print(f"RESULT: FAIL — {len(failures)} problem(s)")
    for f in failures:
        print("  -", f)
    sys.exit(1)
print("RESULT: PASS — aggregated SQL matches the previous implementation")

