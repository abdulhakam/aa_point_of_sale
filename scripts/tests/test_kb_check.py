#!/usr/bin/env python3
"""End-to-end tests for `scripts/kb_check.py`.

Every case drives the real executable as a child process against a real vault on
disk, built from the kit's own template, so the CLI contract, the filesystem and
the reporter are exercised together rather than in isolation.

Run from the kit root:
    python -m unittest discover -s scripts/tests
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

KIT = Path(__file__).resolve().parents[2]
CHECK = KIT / "scripts" / "kb_check.py"
HELPER = KIT / ".agents" / "tools" / "kb-tools" / "kb.py"
EXAMPLE = KIT / ".agents" / "tools" / ".kb-system" / "examples" / "minimal-vault"


def run_check(*args: str) -> tuple[int, str, str]:
    completed = subprocess.run(
        [sys.executable, str(CHECK), *args], capture_output=True, check=False
    )
    # kb_check.py writes UTF-8; decode explicitly so a legacy code page in the
    # parent process can neither mangle nor reject the report.
    return (
        completed.returncode,
        completed.stdout.decode("utf-8", errors="replace"),
        completed.stderr.decode("utf-8", errors="replace"),
    )


def report(*args: str) -> tuple[int, dict, str]:
    code, stdout, stderr = run_check(*args, "--json")
    return code, json.loads(stdout), stderr


def initialise(destination: Path) -> None:
    subprocess.run(
        [sys.executable, str(HELPER), "init", str(destination)],
        capture_output=True,
        check=True,
    )


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


class ExampleVaultTest(unittest.TestCase):
    def test_example_vault_validates_and_reports(self) -> None:
        code, data, stderr = report(str(EXAMPLE))
        self.assertEqual(code, 0, stderr)
        self.assertEqual(data["errors"], [])
        self.assertEqual(data["warnings"], [])

        stats = data["stats"]
        self.assertEqual(stats["objects"], 14)
        self.assertEqual(stats["tasks"], 2)
        self.assertEqual(stats["dependency_edges"], 1)
        self.assertEqual(stats["projects"], 1)
        self.assertEqual(stats["orphans"], 0)
        self.assertEqual(stats["tags"]["distinct"], 2)
        self.assertEqual(stats["unresolved_links"], 0)
        self.assertGreater(stats["relations"], 0)
        self.assertGreater(stats["unique_edges"], 0)

        self.assertEqual(data["quality"]["grade"], "A")
        self.assertEqual(data["quality"]["score"], 100)

    def test_report_is_reproducible_as_text(self) -> None:
        code, stdout, _ = run_check(str(EXAMPLE))
        self.assertEqual(code, 0)
        self.assertIn("RESULT: PASS", stdout)
        self.assertIn("Quality: 100/100 (A)", stdout)
        self.assertIn("Relations:", stdout)
        self.assertIn("Tags:", stdout)


class FreshVaultTest(unittest.TestCase):
    def test_scaffold_is_clean_but_declares_its_core_types(self) -> None:
        with tempfile.TemporaryDirectory(prefix="kb-check-fresh-") as temporary:
            vault = Path(temporary) / "vault"
            initialise(vault)

            code, data, stderr = report(str(vault))
            self.assertEqual(code, 0, stderr)
            self.assertEqual(data["errors"], [])
            self.assertEqual(data["warnings"], [])
            self.assertEqual(data["stats"]["objects"], 7)
            self.assertEqual(data["stats"]["unused_type_documents"],
                             ["Checkpoint", "Decision", "Note", "Project", "Task", "WorkSession"])


class BrokenVaultTest(unittest.TestCase):
    def setUp(self) -> None:
        self._temporary = tempfile.TemporaryDirectory(prefix="kb-check-broken-")
        self.vault = Path(self._temporary.name) / "vault"
        initialise(self.vault)

        write(self.vault / "projects" / "broken-project.md", """---
type: Project
status: Active
---

# Broken Project

## Outcome

A project whose derived views were never generated.
""")
        write(self.vault / "tasks" / "task-a.md", """---
type: Task
status: Done
belongs_to:
  - "[[Broken Project]]"
depends_on:
  - "[[Task B]]"
---

# Task A
""")
        write(self.vault / "tasks" / "task-b.md", """---
type: Task
status: Ready
belongs_to:
  - "[[Broken Project]]"
depends_on:
  - "[[Task A]]"
---

# Task B
""")
        write(self.vault / "notes" / "mismatch.md", """---
type: Task
---

# Mismatched Note
""")
        write(self.vault / "notes" / "untitled.md", """---
type: Note
---
""")
        write(self.vault / "notes" / "dangling.md", """---
type: Note
related_to:
  - "[[Nowhere At All]]"
---

# Dangling
""")

    def tearDown(self) -> None:
        self._temporary.cleanup()

    def test_broken_vault_fails_with_actionable_diagnostics(self) -> None:
        code, data, stderr = report(str(self.vault))
        self.assertEqual(code, 1, stderr)

        errors = "\n".join(data["errors"])
        warnings = "\n".join(data["warnings"])
        self.assertIn("does not match directory type", errors)
        self.assertIn("dependency cycle", errors)
        self.assertIn("missing first H1 title", errors)
        self.assertIn("no Mermaid progress graph", errors)
        self.assertIn("no Verification section content", warnings)
        self.assertIn("unresolved wikilink [[Nowhere At All]]", warnings)
        self.assertLess(data["quality"]["score"], 100)
        self.assertLess(data["quality"]["components"]["structure"], 1.0)


class StrictModeTest(unittest.TestCase):
    def test_strict_promotes_warnings_to_failure(self) -> None:
        with tempfile.TemporaryDirectory(prefix="kb-check-strict-") as temporary:
            vault = Path(temporary) / "vault"
            initialise(vault)
            write(vault / "notes" / "lonely.md", """---
type: Note
related_to:
  - "[[Nowhere At All]]"
---

# Lonely
""")

            lenient, _, _ = run_check(str(vault))
            strict, _, _ = run_check(str(vault), "--strict")
            self.assertEqual(lenient, 0)
            self.assertEqual(strict, 1)


class UsageTest(unittest.TestCase):
    def test_missing_vault_is_a_usage_error(self) -> None:
        with tempfile.TemporaryDirectory(prefix="kb-check-usage-") as temporary:
            code, _, stderr = run_check(str(Path(temporary) / "absent"))
            self.assertEqual(code, 2)
            self.assertIn("vault does not exist", stderr)


if __name__ == "__main__":
    unittest.main()
