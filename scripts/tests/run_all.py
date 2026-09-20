"""POS-0018 — run every POS test companion and the perf regression, then summarise.

Consolidates the per-change verifications into one command:
  - POS-0008  index verification            (SQLite, no server)
  - POS-0014  report SQL equivalence        (SQLite, no server)
  - POS-0018  summary-totals equivalence    (SQLite, no server)
  - POS-0012  pagination behaviour          (live API)
  - POS-0010  cache config + write/read     (live API)
  - POS-0016  expand-trim equivalence       (live API)
  - POS-0018  performance regression        (live API)

Server-side checks are skipped (and reported as such) when PocketBase is not reachable.

Usage: python scripts/tests/run_all.py [base-url]
"""
import json
import os
import subprocess
import sys
import time
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8090").rstrip("/")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

# (label, relative script path, needs_server)
SUITES = [
    ("POS-0008  index verification", "scripts/tests/test_indexes.py", False),
    ("POS-0014  report SQL equivalence", "scripts/tests/test_report_sql.py", False),
    ("POS-0018  summary-totals equivalence", "scripts/tests/test_summary_totals.py", False),
    ("POS-0012  pagination behaviour", "scripts/tests/test_pagination.py", True),
    ("POS-0010  cache config + write/read", "scripts/tests/test_cache_behavior.py", True),
    ("POS-0016  expand-trim equivalence", "scripts/tests/test_expand_trim.py", True),
    ("POS-0018  performance regression", "scripts/perf_regression.py", True),
]


def server_up():
    try:
        with urllib.request.urlopen(f"{BASE}/api/health", timeout=5) as r:
            return json.loads(r.read()).get("code") == 200
    except Exception:
        return False


print("=" * 78)
print(f"POS-0018 consolidated suite — {ROOT}")
print("=" * 78)

up = server_up()
print(f"PocketBase at {BASE}: {'reachable' if up else 'NOT reachable'}"
      f" — {'running all suites' if up else 'server-side suites will be skipped'}\n")

results = []
for label, rel, needs_server in SUITES:
    if needs_server and not up:
        results.append((label, "SKIP", "server not reachable"))
        print(f"  SKIP  {label}")
        continue
    args = [sys.executable, rel]
    if needs_server:
        args.append(BASE)
    t0 = time.perf_counter()
    proc = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    dt = time.perf_counter() - t0
    out = proc.stdout or ""
    tail = ""
    for line in out.splitlines():
        if line.startswith("RESULT"):
            tail = line.strip()
    status = "PASS" if proc.returncode == 0 else "FAIL"
    results.append((label, status, tail or (proc.stderr or "").strip().splitlines()[-1:] and (proc.stderr or "").strip().splitlines()[-1] or ""))
    print(f"  {status:4}  {label:44} {dt:6.1f}s   {tail}")

print("\n" + "=" * 78)
print("Summary")
for label, status, note in results:
    print(f"  {status:4}  {label}")
failed = [r for r in results if r[1] == "FAIL"]
skipped = [r for r in results if r[1] == "SKIP"]
print("=" * 78)
if failed:
    print(f"RESULT: FAIL — {len(failed)} suite(s) failed"
          + (f" ({len(skipped)} skipped)" if skipped else ""))
    sys.exit(1)
print(f"RESULT: PASS — {len(results) - len(skipped)} suite(s) passed"
      + (f", {len(skipped)} skipped (no server)" if skipped else ""))
