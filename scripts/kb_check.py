#!/usr/bin/env python3
"""Validate a Tolaria-style knowledgebase and report its overall state.

Generic by design: every structural rule comes from the vault's ``kb-config.json``
(plus a built-in default), so the same script works unchanged in any project or in
a personal knowledgebase. It carries no project-specific required-file or
forbidden-path lists.

It answers two questions in one pass:

1. Is the vault structurally sound? (frontmatter, H1, type/directory match, type
   documents, resolvable links, acyclic Task dependencies, synchronized Project
   views, verified Done Tasks.)
2. What does the vault contain, and how healthy is it overall? (object counts by
   type, relation edges, tag vocabulary, hubs, orphans, and a weighted quality
   score.)

Exit codes: 0 = no errors, 1 = errors (or any warning under ``--strict``),
2 = the check could not run.

Usage:
    python scripts/kb_check.py [VAULT] [--config PATH] [--json] [--strict]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# Windows consoles default to a legacy code page that cannot encode the arrows,
# dashes and box-drawing characters real notes contain.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

DEFAULT_TYPE_DIRS: dict[str, str] = {
    "Type": "types",
    "Project": "projects",
    "Operation": "operations",
    "Responsibility": "responsibilities",
    "Task": "tasks",
    "Event": "events",
    "Note": "notes",
    "Topic": "topics",
    "Person": "people",
    "Decision": "decisions",
    "Requirement": "requirements",
    "Issue": "issues",
    "Test": "tests",
    "Artifact": "artifacts",
    "WorkSession": "work-sessions",
    "Checkpoint": "checkpoints",
    "Worksheet": "worksheets",
    "Diagram": "diagrams",
    "Source": "sources",
    "Reference": "references",
    "Subsystem": "subsystems",
    "Risk": "risks",
    "Milestone": "milestones",
    "Status Report": "status-reports",
    "Procedure": "procedures",
}

# `blocked_by` is the kit standard; `depends_on` is an accepted alias.
DEPENDENCY_FIELDS = ("blocked_by", "depends_on")
TAG_FIELDS = ("tags", "tag")

WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]")
SECRET_RE = re.compile(
    r"(?i)\b(api[_-]?key|access[_-]?token|secret|password|private[_-]?key)\b"
    r"\s*[:=]\s*['\"]?([A-Za-z0-9_./+=-]{16,})"
)

QUALITY_WEIGHTS = {
    "structure": 0.30,
    "links": 0.20,
    "type_discipline": 0.15,
    "connectivity": 0.15,
    "verification": 0.10,
    "continuity": 0.10,
}
GRADE_CUTOFFS = (("A", 90), ("B", 80), ("C", 70), ("D", 60))


@dataclass
class Note:
    path: Path
    rel: str
    directory: str
    frontmatter: dict[str, Any]
    body: str
    title: str | None
    frontmatter_links: list[str]
    body_links: list[str]
    dependencies: list[str]
    tags: list[str]

    @property
    def type(self) -> str | None:
        value = self.frontmatter.get("type")
        return value if isinstance(value, str) and value else None

    @property
    def status(self) -> str | None:
        value = self.frontmatter.get("status")
        return value if isinstance(value, str) and value else None

    @property
    def is_type_document(self) -> bool:
        return self.type == "Type"


def config_candidates(vault: Path, explicit: Path | None) -> list[Path]:
    if explicit is not None:
        return [explicit]
    root = Path(__file__).resolve().parent.parent
    return [
        vault / "kb-config.json",
        vault.parent / ".kb-system" / "kb-config.json",
        vault.parent / ".kb-tools" / "kb-config.json",
        root / ".agents" / "tools" / ".kb-system" / "kb-config.json",
        root / ".agents" / "tools" / "kb-tools" / "kb-config.json",
        root / ".kb-system" / "kb-config.json",
        root / "kb-config.json",
    ]


def load_config(vault: Path, explicit: Path | None) -> tuple[dict[str, str], Path | None]:
    for candidate in config_candidates(vault, explicit):
        if candidate.is_file():
            try:
                data = json.loads(candidate.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            mapping = data.get("type_directories")
            if isinstance(mapping, dict) and mapping:
                merged = dict(DEFAULT_TYPE_DIRS)
                merged.update({str(k): str(v) for k, v in mapping.items()})
                return merged, candidate
    return dict(DEFAULT_TYPE_DIRS), None


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str, list[str]]:
    errors: list[str] = []
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return {}, text, ["missing YAML frontmatter"]
    lines = text.splitlines()
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return {}, text, ["unterminated YAML frontmatter"]

    frontmatter: dict[str, Any] = {}
    current_key: str | None = None
    for raw in lines[1:end]:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        if raw.startswith((" ", "\t")):
            item = re.match(r"\s*-\s*(.*)$", raw)
            if item and current_key:
                if not isinstance(frontmatter.get(current_key), list):
                    frontmatter[current_key] = []
                frontmatter[current_key].append(_unquote(item.group(1).strip()))
            continue
        if ":" not in raw:
            errors.append(f"unparsed frontmatter line: {raw}")
            current_key = None
            continue
        key, value = raw.split(":", 1)
        key, value = key.strip(), value.strip()
        if key in frontmatter:
            errors.append(f"duplicate frontmatter key: {key}")
        current_key = key
        if not value:
            frontmatter[key] = []
        elif value.startswith("[") and value.endswith("]"):
            inner = value[1:-1].strip()
            frontmatter[key] = [] if not inner else [_unquote(x.strip()) for x in inner.split(",")]
        else:
            frontmatter[key] = _unquote(value)
    return frontmatter, "\n".join(lines[end + 1:]).lstrip("\n"), errors


def _unquote(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def first_h1(body: str) -> str | None:
    in_fence = False
    for line in body.splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence and line.startswith("# "):
            return line[2:].strip()
    return None


def section(body: str, heading: str) -> str:
    pattern = re.compile(rf"(?ms)^## {re.escape(heading)}\s*\n(.*?)(?=^##\s|\Z)")
    match = pattern.search(body)
    return match.group(1).strip() if match else ""


def link_targets(value: Any) -> list[str]:
    values = value if isinstance(value, list) else [value]
    targets: list[str] = []
    for item in values:
        if isinstance(item, str):
            targets.extend(m.group(1).strip() for m in WIKILINK_RE.finditer(item))
    return targets


def frontmatter_links(frontmatter: dict[str, Any], fields: tuple[str, ...]) -> list[str]:
    targets: list[str] = []
    for field in fields:
        targets.extend(link_targets(frontmatter.get(field, [])))
    return targets


def all_frontmatter_links(frontmatter: dict[str, Any]) -> list[str]:
    targets: list[str] = []
    for value in frontmatter.values():
        targets.extend(link_targets(value))
    return targets


def collect_tags(frontmatter: dict[str, Any]) -> list[str]:
    tags: list[str] = []
    for field in TAG_FIELDS:
        value = frontmatter.get(field)
        if isinstance(value, str) and value:
            tags.append(value)
        elif isinstance(value, list):
            tags.extend(str(v) for v in value if str(v))
    return tags


def scan(vault: Path, dir_types: dict[str, str]) -> tuple[list[Note], int]:
    notes: list[Note] = []
    total_markdown = sum(1 for _ in vault.rglob("*.md"))
    for directory in sorted(set(dir_types.values())):
        base = vault / directory
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*.md")):
            text = path.read_text(encoding="utf-8", errors="replace")
            frontmatter, body, _ = parse_frontmatter(text)
            notes.append(
                Note(
                    path=path,
                    rel=path.relative_to(vault).as_posix(),
                    directory=directory,
                    frontmatter=frontmatter,
                    body=body,
                    title=first_h1(body),
                    frontmatter_links=all_frontmatter_links(frontmatter),
                    body_links=[m.group(1).strip() for m in WIKILINK_RE.finditer(body)],
                    dependencies=frontmatter_links(frontmatter, DEPENDENCY_FIELDS),
                    tags=collect_tags(frontmatter),
                )
            )
    return notes, total_markdown


def build_index(notes: list[Note]) -> dict[str, list[Note]]:
    index: dict[str, list[Note]] = defaultdict(list)
    for note in notes:
        index[note.path.stem.casefold()].append(note)
        if note.title:
            index[note.title.casefold()].append(note)
    return index


def resolve(name: str, index: dict[str, list[Note]]) -> list[Note]:
    key = name.strip()
    if key.lower().endswith(".md"):
        key = key[:-3]
    found: list[Note] = []
    seen: set[str] = set()
    for candidate in (key, key.replace("\\", "/").split("/")[-1]):
        for note in index.get(candidate.casefold(), []):
            if note.rel not in seen:
                seen.add(note.rel)
                found.append(note)
    return found


def check(notes: list[Note], dir_types: dict[str, str]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    index = build_index(notes)
    directory_types = {directory: name for name, directory in dir_types.items()}

    for note in notes:
        _, _, frontmatter_errors = parse_frontmatter(
            note.path.read_text(encoding="utf-8", errors="replace")
        )
        for problem in frontmatter_errors:
            errors.append(f"{note.rel}: {problem}")
        if not note.title:
            errors.append(f"{note.rel}: missing first H1 title")
        else:
            first_content = next((l.strip() for l in note.body.splitlines() if l.strip()), "")
            if not first_content.startswith("# "):
                errors.append(f"{note.rel}: first non-empty body line must be the H1 title")
        expected = directory_types.get(note.directory)
        if note.type != expected:
            errors.append(
                f"{note.rel}: type {note.type!r} does not match directory type {expected!r}"
            )

    type_titles = {n.title for n in notes if n.is_type_document and n.title}
    used_types = {n.type for n in notes if n.type}
    for used in sorted(used_types - {"Type"}):
        if used not in type_titles:
            errors.append(f"missing type document for {used!r} under types/")
    # A freshly initialized vault legitimately declares its core types before any
    # object exists, so only flag unused type documents once content is present.
    if any(not n.is_type_document for n in notes):
        for title in sorted(t for t in type_titles if t not in used_types):
            warnings.append(
                f"unused type document: types/ declares {title!r} but no object uses that type"
            )

    for note in notes:
        for target in note.frontmatter_links + note.body_links:
            matches = resolve(target, index)
            if not matches:
                warnings.append(f"{note.rel}: unresolved wikilink [[{target}]]")
            elif len({m.rel for m in matches}) > 1:
                warnings.append(
                    f"{note.rel}: ambiguous wikilink [[{target}]] -> {sorted({m.rel for m in matches})}"
                )

    tasks = [n for n in notes if n.type == "Task"]
    dependencies: dict[str, list[str]] = defaultdict(list)
    for task in tasks:
        if not link_targets(task.frontmatter.get("belongs_to", [])):
            warnings.append(f"{task.rel}: Task has no belongs_to relationship")
        for dependency in task.dependencies:
            matches = [m for m in resolve(dependency, index) if m.type == "Task"]
            if len(matches) != 1:
                errors.append(
                    f"{task.rel}: dependency [[{dependency}]] does not resolve to exactly one Task"
                )
            elif task.title:
                dependencies[task.title].append(matches[0].title or dependency)
        if task.status == "Done" and not section(task.body, "Verification"):
            warnings.append(f"{task.rel}: Done Task has no Verification section content")

    visiting: set[str] = set()
    visited: set[str] = set()

    def walk(node: str, stack: list[str]) -> None:
        if node in visiting:
            cycle = stack[stack.index(node):] + [node] if node in stack else stack + [node]
            errors.append("Task dependency cycle: " + " -> ".join(cycle))
            return
        if node in visited:
            return
        visiting.add(node)
        stack.append(node)
        for dependency in dependencies.get(node, []):
            walk(dependency, stack)
        stack.pop()
        visiting.discard(node)
        visited.add(node)

    for task_title in list(dependencies):
        walk(task_title, [])

    projects = [n for n in notes if n.type == "Project"]
    for project in projects:
        if not project.title:
            continue
        members = [
            t for t in tasks
            if any(
                p.casefold() in {project.title.casefold(), project.path.stem.casefold()}
                for p in link_targets(t.frontmatter.get("belongs_to", []))
            )
        ]
        if not members:
            continue
        index_section = section(project.body, "Tasks")
        graph_section = section(project.body, "Task dependency and progress")
        if not index_section:
            errors.append(f"{project.rel}: Project has Tasks but no ## Tasks section")
        if "```mermaid" not in graph_section:
            errors.append(f"{project.rel}: Project has Tasks but no Mermaid progress graph")
        indexed = {x.casefold() for x in WIKILINK_RE.findall(index_section)}
        for member in members:
            keys = {member.path.stem.casefold(), (member.title or "").casefold()}
            if not (keys & indexed):
                errors.append(f"{project.rel}: task index missing {member.title or member.path.stem!r}")

    for note in notes:
        if SECRET_RE.search(note.path.read_text(encoding="utf-8", errors="replace")):
            warnings.append(f"{note.rel}: possible credential/secret pattern; review manually")

    return errors, warnings


def summarize(notes: list[Note], total_markdown: int, index: dict[str, list[Note]]) -> dict[str, Any]:
    by_type = Counter(n.type or "Untyped" for n in notes)
    by_directory = Counter(n.directory for n in notes)
    used_types = {n.type for n in notes if n.type}

    frontmatter_link_count = sum(len(n.frontmatter_links) for n in notes)
    body_link_count = sum(len(n.body_links) for n in notes)
    edges: set[tuple[str, str]] = set()
    inbound = Counter()
    resolved = unresolved = ambiguous = 0
    for note in notes:
        for target in note.frontmatter_links + note.body_links:
            matches = resolve(target, index)
            if not matches:
                unresolved += 1
                continue
            if len({m.rel for m in matches}) > 1:
                ambiguous += 1
            resolved += 1
            for match in matches:
                edges.add((note.rel, match.rel))
                inbound[match.rel] += 1

    content_notes = [n for n in notes if not n.is_type_document]
    outbound = Counter()
    for source, _ in edges:
        outbound[source] += 1
    orphans = [n.rel for n in content_notes if inbound[n.rel] == 0 and outbound[n.rel] == 0]
    hubs = sorted(
        ((inbound[n.rel] + outbound[n.rel], n.title or n.path.stem) for n in content_notes),
        reverse=True,
    )[:5]

    tags = Counter(tag for n in notes for tag in n.tags)
    tasks = [n for n in notes if n.type == "Task"]
    done = [t for t in tasks if t.status == "Done"]
    verified = [t for t in done if section(t.body, "Verification")]
    project_titles = {n.title for n in notes if n.type == "Project" and n.title}

    continuity_hits = 0
    continuity_total = 0
    for project in (n for n in notes if n.type == "Project"):
        members = [
            t for t in tasks
            if any(
                p.casefold() in {project.title.casefold(), project.path.stem.casefold()}
                for p in link_targets(t.frontmatter.get("belongs_to", []))
            )
        ]
        if not any(t.status not in {"Done", "Cancelled"} for t in members):
            continue
        continuity_total += 1
        keys = {project.title.casefold(), project.path.stem.casefold()}
        has_session = any(
            n.type == "WorkSession"
            and keys & {p.casefold() for p in link_targets(n.frontmatter.get("belongs_to", []))}
            for n in notes
        )
        has_checkpoint = any(
            n.type == "Checkpoint"
            and n.status != "Superseded"
            and keys & {p.casefold() for p in link_targets(n.frontmatter.get("belongs_to", []))}
            for n in notes
        )
        if has_session and has_checkpoint:
            continuity_hits += 1

    dependency_edges = 0
    for task in tasks:
        dependency_edges += sum(1 for d in task.dependencies if resolve(d, index))

    return {
        "files": total_markdown,
        "objects": len(notes),
        "by_type": dict(sorted(by_type.items())),
        "by_directory": dict(sorted(by_directory.items())),
        "types_used": len(used_types - {"Type"}),
        "type_documents": by_type.get("Type", 0),
        "unused_type_documents": sorted(
            n.title for n in notes if n.is_type_document and n.title and n.title not in used_types
        ),
        "relations": frontmatter_link_count,
        "body_links": body_link_count,
        "unique_edges": len(edges),
        "resolved_links": resolved,
        "unresolved_links": unresolved,
        "ambiguous_links": ambiguous,
        "tasks": len(tasks),
        "done_tasks": len(done),
        "verified_done_tasks": len(verified),
        "dependency_edges": dependency_edges,
        "projects": len(project_titles),
        "tags": {
            "distinct": len(tags),
            "total": sum(tags.values()),
            "objects_tagged": sum(1 for n in notes if n.tags),
            "top": tags.most_common(8),
        },
        "orphans": len(orphans),
        "orphan_list": sorted(orphans),
        "hubs": [{"object": name, "degree": degree} for degree, name in hubs if degree],
        "continuity": {"satisfied": continuity_hits, "needed": continuity_total},
    }


def quality(errors: list[str], warnings: list[str], stats: dict[str, Any]) -> dict[str, Any]:
    total_links = stats["resolved_links"] + stats["unresolved_links"]
    objects = stats["objects"] or 1
    continuity_needed = stats["continuity"]["needed"]

    sub = {
        "structure": max(0.0, 1.0 - len(errors) / 5.0),
        "links": 1.0 if total_links == 0 else stats["resolved_links"] / total_links,
        "type_discipline": (
            1.0
            if stats["types_used"] == 0
            else min(1.0, stats["type_documents"] / stats["types_used"])
        ),
        "connectivity": max(0.0, 1.0 - stats["orphans"] / objects),
        "verification": (
            1.0 if not stats["done_tasks"] else stats["verified_done_tasks"] / stats["done_tasks"]
        ),
        "continuity": (
            1.0 if continuity_needed == 0 else stats["continuity"]["satisfied"] / continuity_needed
        ),
    }
    score = round(100 * sum(sub[k] * QUALITY_WEIGHTS[k] for k in QUALITY_WEIGHTS) / sum(QUALITY_WEIGHTS.values()))
    grade = next((letter for letter, floor in GRADE_CUTOFFS if score >= floor), "F")
    return {"score": score, "grade": grade, "components": {k: round(v, 3) for k, v in sub.items()}}


def render(report: dict[str, Any]) -> None:
    stats = report["stats"]
    print(f"Knowledgebase check — {report['vault']}")
    print(f"Config: {report['config'] or 'built-in defaults'}")
    print()
    print(
        f"Objects: {stats['objects']} managed note(s) across {stats['types_used']} type(s); "
        f"{stats['files']} Markdown file(s) in the vault"
    )
    if stats["by_type"]:
        print("By type:")
        width = max(len(k) for k in stats["by_type"])
        for name, count in stats["by_type"].items():
            print(f"  {name.ljust(width)}  {count}")
    print()
    print(
        f"Relations: {stats['unique_edges']} edge(s) from {stats['relations']} frontmatter link(s) "
        f"and {stats['body_links']} body link(s)"
    )
    print(
        f"Links: {stats['resolved_links']} resolved, {stats['unresolved_links']} unresolved, "
        f"{stats['ambiguous_links']} ambiguous"
    )
    tags = stats["tags"]
    if tags["distinct"]:
        top = ", ".join(f"{name}({count})" for name, count in tags["top"])
        print(
            f"Tags: {tags['distinct']} distinct across {tags['objects_tagged']} object(s) — {top}"
        )
    else:
        print("Tags: none used")
    print(
        f"Tasks: {stats['tasks']} ({stats['done_tasks']} Done, "
        f"{stats['verified_done_tasks']} of those verified); {stats['dependency_edges']} dependency edge(s)"
    )
    print(f"Projects: {stats['projects']}")
    print(f"Orphans: {stats['orphans']} object(s) with no link in or out")
    if stats["hubs"]:
        hubs = ", ".join(f"{h['object']}({h['degree']})" for h in stats["hubs"])
        print(f"Most connected: {hubs}")
    if stats["unused_type_documents"]:
        print(f"Declared types without objects: {', '.join(stats['unused_type_documents'])}")
    print()
    print(f"Quality: {report['quality']['score']}/100 ({report['quality']['grade']})")
    for name, value in report["quality"]["components"].items():
        print(f"  {name.ljust(16)} {value:.2f}   (weight {QUALITY_WEIGHTS[name]:.2f})")
    print()

    for warning in report["warnings"]:
        print(f"WARN:  {warning}")
    for error in report["errors"]:
        print(f"ERROR: {error}")
    if report["errors"]:
        print(f"RESULT: FAIL — {len(report['errors'])} error(s), {len(report['warnings'])} warning(s)")
    elif report["warnings"]:
        print(f"RESULT: PASS with {len(report['warnings'])} warning(s)")
    else:
        print("RESULT: PASS")


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a knowledgebase and report its state.")
    parser.add_argument("vault", nargs="?", type=Path, default=None,
                        help="vault directory (default: ./vault, else the only candidate)")
    parser.add_argument("--config", type=Path, default=None, help="explicit kb-config.json")
    parser.add_argument("--json", action="store_true", help="emit the report as JSON")
    parser.add_argument("--strict", action="store_true", help="treat warnings as failure")
    args = parser.parse_args()

    vault = (args.vault or Path("vault")).expanduser().resolve()
    if args.vault is None and not vault.is_dir():
        print("usage error: no vault given and ./vault does not exist", file=sys.stderr)
        return 2
    if not vault.is_dir():
        print(f"usage error: vault does not exist: {vault}", file=sys.stderr)
        return 2

    dir_types, config_path = load_config(vault, args.config)
    notes, total_markdown = scan(vault, dir_types)
    index = build_index(notes)
    errors, warnings = check(notes, dir_types)
    stats = summarize(notes, total_markdown, index)

    report = {
        "vault": str(vault),
        "config": str(config_path) if config_path else None,
        "errors": errors,
        "warnings": warnings,
        "stats": stats,
        "quality": quality(errors, warnings, stats),
    }

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        render(report)

    if errors or (args.strict and warnings):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
