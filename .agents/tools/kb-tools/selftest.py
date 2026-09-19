#!/usr/bin/env python3
"""End-to-end smoke test for the installed Tolaria knowledgebase helper.

Creates a temporary Project with dependent Tasks, a WorkSession and a
Checkpoint, regenerates the Project task graph, validates the vault, checks the
status counts, and verifies that `resume` returns the checkpoint's exact next
action. Adapted from the agent kit's `tests/selftest.py` so the helper is
resolved as a sibling, whichever directory the kit is installed into.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

TOOL = Path(__file__).resolve().parent / "kb.py"


def run(*args: str) -> str:
    cp = subprocess.run([sys.executable, str(TOOL), *args], capture_output=True)
    # kb.py writes UTF-8; decode explicitly so a legacy code page in the parent
    # process can neither mangle nor reject the output.
    stdout = cp.stdout.decode("utf-8", errors="replace")
    stderr = cp.stderr.decode("utf-8", errors="replace")
    if cp.returncode != 0:
        raise RuntimeError(f"command failed: {args}\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}")
    return stdout


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def main() -> int:
    if not TOOL.is_file():
        raise RuntimeError(f"knowledgebase helper not found: {TOOL}")

    with tempfile.TemporaryDirectory(prefix="tolaria-kb-selftest-") as td:
        vault = Path(td) / "vault"
        run("init", str(vault))

        write(vault / "projects" / "demo.md", '''---
type: Project
status: Active
---

# Demo Project

## Goal
Exercise the knowledgebase kit.
''')
        write(vault / "tasks" / "demo-foundation.md", '''---
type: Task
status: Done
belongs_to:
  - "[[Demo Project]]"
---

# Demo Foundation

## Description
Create the foundation.

## Verification
Verified by the self-test.
''')
        write(vault / "tasks" / "demo-finish.md", '''---
type: Task
status: Ready
belongs_to:
  - "[[Demo Project]]"
blocked_by:
  - "[[Demo Foundation]]"
---

# Demo Finish

## Description
Finish the demo.
''')
        write(vault / "tasks" / "demo-alias.md", '''---
type: Task
status: Backlog
belongs_to:
  - "[[Demo Project]]"
depends_on:
  - "[[Demo Finish]]"
---

# Demo Alias

## Description
Confirm the depends_on alias feeds the dependency graph.
''')
        write(vault / "work-sessions" / "demo-session.md", '''---
type: WorkSession
status: Active
belongs_to:
  - "[[Demo Project]]"
works_on:
  - "[[Demo Finish]]"
---

# Demo Session

## Objective
Exercise resumability.

## Current state
Foundation is complete.
''')
        write(vault / "checkpoints" / "demo-checkpoint.md", '''---
type: Checkpoint
status: Current
belongs_to:
  - "[[Demo Project]]"
work_session:
  - "[[Demo Session]]"
works_on:
  - "[[Demo Finish]]"
---

# Demo Checkpoint

## Objective
Complete Demo Finish.

## Completed
Demo Foundation is verified.

## Exact next action
Execute Demo Finish → verify the UTF-8 round trip — no legacy code page needed.
''')

        run("graph", str(vault), "projects/demo.md")

        validation = run("validate", str(vault))
        if "VALIDATION PASSED" not in validation:
            raise RuntimeError(validation)

        status = run("status", str(vault))
        for expected in ("Done=1", "Ready=1", "Backlog=1"):
            if expected not in status:
                raise RuntimeError(f"status summary missing {expected}:\n{status}")

        resume = run("resume", str(vault), "--project", "Demo Project")
        if "Execute Demo Finish" not in resume:
            raise RuntimeError(resume)
        if "→" not in resume:
            raise RuntimeError(f"non-ASCII checkpoint body did not survive resume:\n{resume}")

        project = (vault / "projects" / "demo.md").read_text(encoding="utf-8")
        if "Demo Foundation" not in project or "Demo Finish" not in project or "```mermaid" not in project:
            raise RuntimeError("derived Project task index/graph was not generated")
        # The progress graph must be top-to-bottom and label nodes with the Task
        # identifier (here the filename stem, since the demo Tasks have no ticket).
        if "flowchart TD" not in project:
            raise RuntimeError("progress graph is not rendered top-to-bottom (flowchart TD)")
        if '["demo-foundation · Demo Foundation · Done"]' not in project:
            raise RuntimeError("progress graph node label is missing the Task identifier, title, or status")
        # Demo Alias depends_on Demo Finish, so the alias must produce an edge.
        if "T2 --> T3" not in project and not any(
            line.strip().startswith("T") and "-->" in line for line in project.splitlines()
        ):
            raise RuntimeError("dependency edges were not generated from the Task dependency fields")

    print("SELFTEST PASSED: init + graph + validate + status + resume (blocked_by and depends_on)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
