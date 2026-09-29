"""clean-slate.py — the mandatory starting state for every run, test and benchmark.

Owner rule (2026-09-29): for EVERY run/test/benchmark of the new system, delete the
existing TrailBase database, start from scratch, then import from the legacy system.
The legacy PocketBase server stays RUNNING and is the source of truth for money,
speed and UI parity. This script never touches it.

    python trailbase/tools/clean-slate.py            # reset the depot and start it
    python trailbase/tools/clean-slate.py --stop     # reset only, leave it stopped

What it does, in order:
  1. refuses to run if anything under backend/ would be touched
  2. stops any running trail server
  3. deletes traildepot/{data,secrets,uploads,backups}   -- the DATABASE
  4. re-mirrors migrations/ and runtime/ from source, so the depot matches the repo
     exactly (this is what picks up a NEW migration)
  5. keeps wasm/ if present, so no Rust rebuild is needed; rebuilds via build.bat
     only when it is missing
  6. re-initialises the database (runs migrations, creates the admin user)
  7. starts the server and waits for the listener

The import itself is BROWSER-SIDE by design -- the plugin page at
/plugins/import-from-v1/ fetches PocketBase directly and POSTs to the record APIs --
so step 5 of the cycle is done through the browser, then:
  WAL checkpoint + ANALYZE, via --post-import
"""
import os
import re
import shutil
import socket
import subprocess
import sys
import time

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TRAILBASE = os.path.join(REPO, "trailbase")
DEPOT = os.path.join(TRAILBASE, "traildepot")
BACKEND = os.path.join(REPO, "backend")
ADDRESS = "127.0.0.1:4000"
ADMIN_USER = "admin@localhost"
ADMIN_PASSWORD = "administrator-0ne"
PB_URL = "http://127.0.0.1:8090"


def refuse_if_backend_at_risk():
    """This script is destructive by design. The one thing it must never do is
    touch the legacy system, because that is the parity oracle for everything."""
    real = os.path.realpath
    if real(DEPOT).startswith(real(BACKEND) + os.sep) or real(BACKEND).startswith(real(DEPOT) + os.sep):
        sys.exit("REFUSING TO RUN: the depot and backend/ paths overlap.")
    if not os.path.isdir(DEPOT):
        sys.exit(f"no depot at {DEPOT}")
    print(f"  legacy source of truth : {real(BACKEND)}   (never touched)")
    print(f"  depot to be destroyed : {real(DEPOT)}")


def stop_server():
    killed = 0
    try:
        out = subprocess.run(["tasklist", "/FI", "IMAGENAME eq trail.exe", "/FO", "CSV", "/NH"],
                             capture_output=True, text=True, timeout=30).stdout
        pids = re.findall(r'trail\.exe","(\d+)"', out)
        for pid in pids:
            subprocess.run(["taskkill", "/PID", pid, "/F"], capture_output=True)
            killed += 1
    except Exception as e:
        print(f"  (stop_server: {e})")
    # wait for the port to be free
    host, port = ADDRESS.split(":")
    for _ in range(30):
        with socket.socket() as s:
            s.settimeout(0.3)
            if s.connect_ex((host, int(port))) != 0:
                break
        time.sleep(0.5)
    print(f"  stopped {killed} trail process(es); :{port} is free")


def delete_database():
    gone = []
    for d in ("data", "secrets", "uploads", "backups"):
        p = os.path.join(DEPOT, d)
        if os.path.isdir(p):
            shutil.rmtree(p, ignore_errors=True)
            gone.append(d)
    print(f"  deleted depot/{', depot/'.join(gone) if gone else '(nothing)'}")
    if "data" not in gone:
        print("  NOTE: depot/data did not exist, so the database was already absent")


def mirror_sources():
    """Re-mirror the editable sources so the depot matches the repo. This is what
    makes a NEW migration visible; skipping it silently tests the previous schema."""
    for name in ("migrations", "runtime"):
        src = os.path.join(TRAILBASE, name)
        dst = os.path.join(DEPOT, name)
        r = subprocess.run(["robocopy", src, dst, "/MIR", "/NFL", "/NDL", "/NJH", "/NJS", "/NP"],
                           capture_output=True, text=True)
        if r.returncode >= 8:
            sys.exit(f"robocopy {name} failed with {r.returncode}")
    for f in ("config.textproto", "metadata.textproto"):
        shutil.copy2(os.path.join(TRAILBASE, f), os.path.join(DEPOT, f))
    added = [f for f in os.listdir(os.path.join(DEPOT, "migrations", "main"))
             if f.startswith("U") and f.endswith(".sql")]
    print(f"  mirrored migrations/ ({len(added)} migration files) and runtime/ from source")


def ensure_wasm():
    w = os.path.join(DEPOT, "wasm")
    have = os.path.isdir(w) and any(f.endswith(".wasm") for f in os.listdir(w))
    if not have:
        print("  no wasm component in the depot -- running build.bat (needs the Rust toolchain)")
        r = subprocess.run([os.path.join(TRAILBASE, "build.bat")], cwd=TRAILBASE,
                           capture_output=True, text=True)
        if r.returncode != 0:
            sys.exit(f"build.bat failed:\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}")
    print("  wasm component present (no Rust rebuild needed)")


def init_database():
    r = subprocess.run(["trail", f"--depot={DEPOT}", "user", "change-password",
                        ADMIN_USER, ADMIN_PASSWORD], cwd=TRAILBASE,
                       capture_output=True, text=True)
    out = (r.stdout or "") + (r.stderr or "")
    if r.returncode != 0 and "already exists" not in out.lower():
        sys.exit(f"init failed:\n{out[-2000:]}")
    print("  database re-initialised: migrations applied, admin user created")


def start_server():
    proc = subprocess.Popen(
        ["trail", f"--depot={DEPOT}", "run", f"--address={ADDRESS}",
         f"--runtime-root-fs={os.path.join(DEPOT, 'runtime')}"],
        cwd=TRAILBASE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    host, port = ADDRESS.split(":")
    for _ in range(60):
        with socket.socket() as s:
            s.settimeout(0.3)
            if s.connect_ex((host, int(port))) == 0:
                print(f"  server up on http://{ADDRESS}  (pid {proc.pid})")
                return proc
        if proc.poll() is not None:
            sys.exit(f"server exited immediately:\n{proc.stdout.read()[-2000:]}")
        time.sleep(0.5)
    sys.exit("server did not become reachable within 30s")


def post_import():
    """After the browser-driven import: checkpoint the WAL and ANALYZE, so timings
    are not measuring a 100 MB write-ahead log."""
    import sqlite3
    db = os.path.join(DEPOT, "data", "main.db")
    con = sqlite3.connect(db)
    con.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    con.execute("ANALYZE")
    con.commit()
    pages = con.execute("pragma page_count").fetchone()[0]
    size = con.execute("pragma page_size").fetchone()[0]
    con.close()
    print(f"  WAL checkpointed + ANALYZE done; database {pages * size / 1048576:.1f} MB")


def main():
    args = sys.argv[1:]
    if "--post-import" in args:
        print("post-import:")
        post_import()
        return
    print("CLEAN SLATE -- this destroys the TrailBase depot database.")
    print(f"  legacy PocketBase at {PB_URL} stays running and is NOT touched")
    print()
    refuse_if_backend_at_risk()
    print()
    stop_server()
    delete_database()
    mirror_sources()
    ensure_wasm()
    init_database()
    print()
    if "--stop" in args:
        print("depot reset; server left stopped. Start it with trailbase/RUN.BAT")
        return
    start_server()
    print()
    print("NEXT: open http://127.0.0.1:4000/plugins/import-from-v1/ in the browser,")
    print("      log in as " + PB_URL + " superuser, and run the import (not dry run).")
    print("      Then:  python trailbase/tools/clean-slate.py --post-import")


if __name__ == "__main__":
    main()
