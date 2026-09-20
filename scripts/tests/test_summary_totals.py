"""POS-0015 — payments_summary totals equivalence.

The cash memo payments list now sources its totals from the `payments_summary` view
(usePagedList + summaryCalculator) instead of summing the raw payments. This proves at
the DB level that summing the summary's grouped rows matches the previous JS calculator
over `payments_view`, for the filter shapes that page uses.

Note: `payments_summary.day` is `created` truncated to 10 chars, so timestamp date
bounds translate to whole days.

Usage: python scripts/tests/test_summary_totals.py [path-to-data.db]
Exits non-zero on mismatch. Read-only.
"""
import sqlite3
import sys

DB = sys.argv[1] if len(sys.argv) > 1 else "backend/pb_data/data.db"
con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
cur = con.cursor()
failures = []

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

print("=" * 74)
print(f"POS-0015 payments_summary totals equivalence — {DB}")
print("=" * 74)


def js_calculator(rows):
    """Mirror of the cash memo calculator() (PaymentsView.jsx)."""
    sending = sent = recieving = recieved = 0.0
    sending_returns = recieving_returns = 0.0
    invoice_total = total_paid = 0.0
    for ptype, paid, amount, party_type in rows:
        amount = float(amount) if amount not in (None, "") else 0.0
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
    for ptype, paid, amount, party_type in rows:
        amount = float(amount) if amount not in (None, "") else 0.0
        if paid:
            total_paid += amount
        else:
            invoice_total += amount
    return {
        "sending": sending,
        "sent": sent,
        "recieving": recieving,
        "recieved": recieved,
        "sending_returns": sending_returns,
        "recieving_returns": recieving_returns,
        "invoice_total": invoice_total,
        "total_paid": total_paid,
    }


def sample(col):
    row = cur.execute(
        f"SELECT {col} FROM payments_view WHERE {col} IS NOT NULL AND {col} <> '' LIMIT 1"
    ).fetchone()
    return row[0] if row else ""


sp = sample("party")
sa = sample("area")
ss = sample("section")
sb = sample("booker")

# (label, raw WHERE on payments_view, raw params, summary WHERE, summary params)
CASES = [
    ("all rows", "", [], "", []),
    ("type = recieving", "WHERE type = ?", ["recieving"], "WHERE type = ?", ["recieving"]),
    ("type = sending", "WHERE type = ?", ["sending"], "WHERE type = ?", ["sending"]),
    ("type = return", "WHERE type = ?", ["return"], "WHERE type = ?", ["return"]),
    ("party filter", "WHERE party = ?", [sp], "WHERE party = ?", [sp]),
    ("area filter", "WHERE area = ?", [sa], "WHERE area = ?", [sa]),
    ("section filter", "WHERE section = ?", [ss], "WHERE section = ?", [ss]),
    ("booker filter", "WHERE booker = ?", [sb], "WHERE booker = ?", [sb]),
    (
        "date range + type=recieving",
        "WHERE created >= ? AND created <= ? AND type = ?",
        ["2025-01-01 00:00:00", "2027-01-01 23:59:59", "recieving"],
        "WHERE day >= ? AND day <= ? AND type = ?",
        ["2025-01-01", "2027-01-01", "recieving"],
    ),
]

print("\nsampled filters: party=%r area=%r section=%r booker=%r" % (sp[:8], sa[:8], ss[:8], sb[:8]))

for label, raw_where, raw_params, sum_where, sum_params in CASES:
    raw = cur.execute(
        f"SELECT type, paid, amount, party_type FROM payments_view {raw_where}", raw_params
    ).fetchall()
    if not raw:
        print(f"  {label}: SKIP (no raw rows)")
        continue
    expected = js_calculator(raw)

    groups = cur.execute(
        "SELECT " + ", ".join(NUMERIC_COLS) + f" FROM payments_summary {sum_where}", sum_params
    ).fetchall()
    if not groups:
        failures.append(f"{label}: payments_summary returned no rows")
        print(f"  RESULT: FAIL {label} — summary returned no rows")
        continue

    actual = {col: sum(g[i] or 0 for g in groups) for i, col in enumerate(NUMERIC_COLS)}
    bad = []
    if actual["entries"] != len(raw):
        bad.append(f"entries {actual['entries']} != {len(raw)}")
    for key, value in expected.items():
        if abs(float(actual[key]) - float(value)) > 0.011:
            bad.append(f"{key}: sql={round(float(actual[key]), 2)} js={round(value, 2)}")

    status = "OK" if not bad else "MISMATCH: " + "; ".join(bad)
    print(
        f"  {status:60} {label} (raw rows={len(raw)}, groups={len(groups)})"
    )
    if bad:
        failures.append(f"{label}: {'; '.join(bad)}")

con.close()

print("\n" + "=" * 74)
if failures:
    print(f"RESULT: FAIL — {len(failures)} problem(s)")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
print("RESULT: PASS — payments_summary totals match the payments calculator")
