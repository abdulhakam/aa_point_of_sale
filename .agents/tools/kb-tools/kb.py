#!/usr/bin/env python3
"""Tolaria project-knowledgebase helper.

Dependency-free utilities for initializing, validating, summarizing, resuming,
and regenerating a project's derived task index/progress graph.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

# Windows consoles default to a legacy code page that cannot encode the arrows,
# dashes, and box-drawing characters that appear in real notes. Without this,
# `resume` raises UnicodeEncodeError while printing a checkpoint body.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_PATH = Path(__file__).resolve()
SCRIPT_DIR = SCRIPT_PATH.parent
# Bundle layout: <kit>/tools/kb.py. Installed layout: <project>/.kb-tools/kb.py.
PACKAGE_ROOT = SCRIPT_PATH.parents[1]

def first_existing(*candidates: Path) -> Path:
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]

CONFIG_PATH = first_existing(
    SCRIPT_DIR / "kb-config.json",
    PACKAGE_ROOT / "kb-config.json",
    PACKAGE_ROOT / ".kb-system" / "kb-config.json",
)
TEMPLATE_ROOT = first_existing(
    PACKAGE_ROOT / "templates" / "vault",
    PACKAGE_ROOT / ".kb-system" / "templates" / "vault",
)
AGENT_SOURCE = first_existing(
    PACKAGE_ROOT / "AGENT.md",
    PACKAGE_ROOT / ".kb-system" / "AGENT.md",
)

DEFAULT_TYPE_DIRS = {
    "Type": "types", "Project": "projects", "Operation": "operations",
    "Responsibility": "responsibilities", "Task": "tasks", "Event": "events",
    "Note": "notes", "Topic": "topics", "Person": "people", "Decision": "decisions",
    "Requirement": "requirements", "Issue": "issues", "Test": "tests",
    "Artifact": "artifacts", "WorkSession": "work-sessions", "Checkpoint": "checkpoints",
    "Worksheet": "worksheets", "Diagram": "diagrams", "Source": "sources",
}

WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]")
SECRET_RE = re.compile(
    r"(?i)(api[_-]?key|access[_-]?token|secret|password|private[_-]?key)\s*[:=]\s*['\"]?([A-Za-z0-9_./+=-]{16,})"
)


def load_config() -> dict[str, Any]:
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"type_directories": DEFAULT_TYPE_DIRS}


TYPE_DIRS = load_config().get("type_directories", DEFAULT_TYPE_DIRS)
DIR_TYPES = {v: k for k, v in TYPE_DIRS.items()}


@dataclass
class Note:
    path: Path
    rel: str
    frontmatter: dict[str, Any]
    body: str
    title: str | None


def split_frontmatter(text: str) -> tuple[dict[str, Any], str, list[str]]:
    errors: list[str] = []
    if not text.startswith("---\n") and not text.startswith("---\r\n"):
        return {}, text, ["missing YAML frontmatter"]
    lines = text.splitlines()
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return {}, text, ["unterminated YAML frontmatter"]

    fm_lines = lines[1:end]
    fm: dict[str, Any] = {}
    current_key: str | None = None
    for raw in fm_lines:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        if raw.startswith((" ", "\t")):
            m = re.match(r"\s*-\s*(.*)$", raw)
            if m and current_key:
                if not isinstance(fm.get(current_key), list):
                    fm[current_key] = []
                fm[current_key].append(_unquote(m.group(1).strip()))
            continue
        if ":" not in raw:
            errors.append(f"unparsed frontmatter line: {raw}")
            current_key = None
            continue
        key, val = raw.split(":", 1)
        key = key.strip()
        val = val.strip()
        if key in fm:
            errors.append(f"duplicate frontmatter key: {key}")
        current_key = key
        if not val:
            fm[key] = []
        elif val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            fm[key] = [] if not inner else [_unquote(x.strip()) for x in inner.split(",")]
        else:
            fm[key] = _unquote(val)
    body = "\n".join(lines[end + 1:]).lstrip("\n")
    return fm, body, errors


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


def read_note(path: Path, vault: Path) -> tuple[Note, list[str]]:
    text = path.read_text(encoding="utf-8", errors="replace")
    fm, body, errors = split_frontmatter(text)
    title = first_h1(body)
    if not title:
        errors.append("missing first H1 title")
    else:
        first_content = next((line.strip() for line in body.splitlines() if line.strip()), "")
        if not first_content.startswith("# "):
            errors.append("first non-empty body line must be the H1 title")
    return Note(path, path.relative_to(vault).as_posix(), fm, body, title), errors


def managed_md_files(vault: Path):
    managed_dirs = set(DIR_TYPES)
    for d in managed_dirs:
        base = vault / d
        if base.exists():
            yield from base.rglob("*.md")


def scalar_links(value: Any) -> list[str]:
    vals = value if isinstance(value, list) else [value]
    out: list[str] = []
    for v in vals:
        if not isinstance(v, str):
            continue
        out.extend(m.group(1).strip() for m in WIKILINK_RE.finditer(v))
    return out


# Dependency field aliases. `blocked_by` is the kit standard; `depends_on` is the
# accepted alias a vault may use instead. Both are honored so the dependency
# graph, cycle detection, and validation work without rewriting every Task.
DEPENDENCY_FIELDS = ("blocked_by", "depends_on")


def dependency_links(note: Note) -> list[str]:
    out: list[str] = []
    for field in DEPENDENCY_FIELDS:
        out.extend(scalar_links(note.frontmatter.get(field, [])))
    return out


def all_links(note: Note) -> list[str]:
    out: list[str] = []
    for value in note.frontmatter.values():
        if isinstance(value, list):
            for x in value:
                if isinstance(x, str):
                    out += [m.group(1).strip() for m in WIKILINK_RE.finditer(x)]
        elif isinstance(value, str):
            out += [m.group(1).strip() for m in WIKILINK_RE.finditer(value)]
    out += [m.group(1).strip() for m in WIKILINK_RE.finditer(note.body)]
    return out


def build_index(notes: list[Note]):
    index: dict[str, list[Note]] = defaultdict(list)
    for n in notes:
        index[n.path.stem.casefold()].append(n)
        if n.title:
            index[n.title.casefold()].append(n)
    return index


def resolve_link(name: str, index) -> list[Note]:
    key = name.strip()
    if key.lower().endswith(".md"):
        key = key[:-3]
    # A note is indexed by filename stem and H1 title, so the same object can
    # appear twice. De-duplicate by relative path instead of object hashing.
    # Try the full link text first, because titles may legitimately contain a
    # "/" (e.g. "Authenticated HTTP/SSE server"); only then fall back to the
    # last path segment, which is what path-style links like [[tasks/foo]] need.
    out: list[Note] = []
    seen: set[str] = set()
    for candidate in (key, key.replace("\\", "/").split("/")[-1]):
        for note in index.get(candidate.casefold(), []):
            if note.rel not in seen:
                seen.add(note.rel)
                out.append(note)
    return out


def section(body: str, heading: str) -> str:
    pat = re.compile(rf"(?ms)^## {re.escape(heading)}\s*\n(.*?)(?=^##\s|\Z)")
    m = pat.search(body)
    return m.group(1).strip() if m else ""


def replace_section(body: str, heading: str, content: str) -> str:
    block = f"## {heading}\n{content.rstrip()}\n"
    pat = re.compile(rf"(?ms)^## {re.escape(heading)}\s*\n.*?(?=^##\s|\Z)")
    if pat.search(body):
        return pat.sub(block + "\n", body, count=1).rstrip() + "\n"
    return body.rstrip() + "\n\n" + block


def init_vault(vault: Path) -> int:
    vault.mkdir(parents=True, exist_ok=True)
    if not TEMPLATE_ROOT.exists():
        print(f"ERROR: template not found: {TEMPLATE_ROOT}", file=sys.stderr)
        return 2
    for src in TEMPLATE_ROOT.rglob("*"):
        rel = src.relative_to(TEMPLATE_ROOT)
        dst = vault / rel
        if src.is_dir():
            dst.mkdir(parents=True, exist_ok=True)
        elif not dst.exists():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
    agent_dst = vault / "AGENT.md"
    if AGENT_SOURCE.exists() and not agent_dst.exists():
        shutil.copy2(AGENT_SOURCE, agent_dst)
    print(f"Initialized vault without overwriting existing files: {vault}")
    return validate_vault(vault)


def validate_vault(vault: Path) -> int:
    errors: list[str] = []
    warnings: list[str] = []
    notes: list[Note] = []
    by_path: dict[Path, Note] = {}

    if not vault.exists():
        print(f"ERROR: vault does not exist: {vault}")
        return 2

    for p in managed_md_files(vault):
        n, errs = read_note(p, vault)
        notes.append(n); by_path[p] = n
        for e in errs:
            errors.append(f"{n.rel}: {e}")
        expected_type = DIR_TYPES.get(p.relative_to(vault).parts[0])
        actual_type = n.frontmatter.get("type")
        if actual_type != expected_type:
            errors.append(f"{n.rel}: type {actual_type!r} does not match directory type {expected_type!r}")

    index = build_index(notes)

    # Ensure type documents exist.
    type_titles = {n.title for n in notes if n.frontmatter.get("type") == "Type" and n.title}
    used_types = {n.frontmatter.get("type") for n in notes if n.frontmatter.get("type")}
    for typ in sorted(used_types - {"Type"}):
        if typ not in type_titles:
            errors.append(f"missing type document for {typ!r} under types/")

    # Link resolution.
    for n in notes:
        for target in all_links(n):
            matches = resolve_link(target, index)
            if not matches:
                warnings.append(f"{n.rel}: unresolved wikilink [[{target}]]")
            elif len(matches) > 1:
                unique = {m.rel for m in matches}
                if len(unique) > 1:
                    warnings.append(f"{n.rel}: ambiguous wikilink [[{target}]] -> {sorted(unique)}")

    # Secret-ish patterns.
    for n in notes:
        raw = n.path.read_text(encoding="utf-8", errors="replace")
        if SECRET_RE.search(raw):
            warnings.append(f"{n.rel}: possible credential/secret pattern; review manually")

    # Task graph and membership.
    tasks = [n for n in notes if n.frontmatter.get("type") == "Task"]
    title_to_task = {n.title: n for n in tasks if n.title}
    deps: dict[str, list[str]] = defaultdict(list)
    for t in tasks:
        if not scalar_links(t.frontmatter.get("belongs_to", [])):
            warnings.append(f"{t.rel}: Task has no belongs_to relationship")
        for dep_name in dependency_links(t):
            matches = resolve_link(dep_name, index)
            task_matches = [m for m in matches if m.frontmatter.get("type") == "Task"]
            if len(task_matches) != 1:
                errors.append(f"{t.rel}: dependency [[{dep_name}]] does not resolve to exactly one Task")
            elif t.title:
                deps[t.title].append(task_matches[0].title or dep_name)
        if t.frontmatter.get("status") == "Done" and not section(t.body, "Verification"):
            warnings.append(f"{t.rel}: Done Task has no Verification section content")

    # Cycle detection: edges task -> prerequisite.
    visiting, visited = set(), set()
    def dfs(node: str, stack: list[str]):
        if node in visiting:
            cyc = stack[stack.index(node):] + [node] if node in stack else stack + [node]
            errors.append("Task dependency cycle: " + " -> ".join(cyc))
            return
        if node in visited:
            return
        visiting.add(node); stack.append(node)
        for dep in deps.get(node, []):
            dfs(dep, stack)
        stack.pop(); visiting.remove(node); visited.add(node)
    for t in list(deps):
        dfs(t, [])

    # Project derived task index presence/coverage.
    projects = [n for n in notes if n.frontmatter.get("type") == "Project"]
    for p in projects:
        if not p.title:
            continue
        p_tasks = []
        for t in tasks:
            parents = scalar_links(t.frontmatter.get("belongs_to", []))
            if any(x.casefold() in {p.title.casefold(), p.path.stem.casefold()} for x in parents):
                p_tasks.append(t)
        if p_tasks:
            idx_sec = section(p.body, "Tasks")
            graph_sec = section(p.body, "Task dependency and progress")
            if not idx_sec:
                errors.append(f"{p.rel}: Project has Tasks but no ## Tasks section")
            if "```mermaid" not in graph_sec:
                errors.append(f"{p.rel}: Project has Tasks but no Mermaid progress graph")
            idx_links = {x.casefold() for x in WIKILINK_RE.findall(idx_sec)}
            for t in p_tasks:
                keys = {t.path.stem.casefold(), (t.title or "").casefold()}
                if not (keys & idx_links):
                    errors.append(f"{p.rel}: task index missing {t.title or t.path.stem!r}")

    if errors:
        print(f"VALIDATION FAILED: {len(errors)} error(s), {len(warnings)} warning(s)")
        for e in errors: print("ERROR:", e)
        for w in warnings: print("WARN: ", w)
        return 1
    print(f"VALIDATION PASSED: {len(notes)} managed note(s), {len(warnings)} warning(s)")
    for w in warnings: print("WARN: ", w)
    return 0


def project_tasks(vault: Path, project: Note, notes: list[Note]) -> list[Note]:
    out=[]
    if not project.title: return out
    keys={project.title.casefold(), project.path.stem.casefold()}
    for n in notes:
        if n.frontmatter.get("type") != "Task": continue
        parents=scalar_links(n.frontmatter.get("belongs_to", []))
        if any(p.casefold() in keys for p in parents): out.append(n)
    return out


def load_all(vault: Path) -> list[Note]:
    out=[]
    for p in managed_md_files(vault):
        n,_=read_note(p,vault); out.append(n)
    return out


def status(vault: Path) -> int:
    notes=load_all(vault)
    projects=[n for n in notes if n.frontmatter.get("type")=="Project"]
    if not projects:
        print("No Projects found.")
        return 0
    for p in sorted(projects, key=lambda x:(x.title or x.rel).casefold()):
        tasks=project_tasks(vault,p,notes)
        counts=defaultdict(int)
        for t in tasks: counts[str(t.frontmatter.get('status','Unspecified'))]+=1
        summary=", ".join(f"{k}={v}" for k,v in sorted(counts.items())) or "no tasks"
        print(f"{p.title or p.rel} [{p.frontmatter.get('status','Unspecified')}] — {summary}")
    return 0


def resume(vault: Path, project_query: str | None) -> int:
    notes=load_all(vault)
    cps=[n for n in notes if n.frontmatter.get("type")=="Checkpoint" and n.frontmatter.get("status")!="Superseded"]
    if project_query:
        q=project_query.casefold()
        cps=[c for c in cps if any(q in x.casefold() for x in scalar_links(c.frontmatter.get('belongs_to',[])))]
    if not cps:
        print("No current checkpoint found.")
        return 1
    cp=max(cps,key=lambda n:n.path.stat().st_mtime)
    print(f"Latest checkpoint: {cp.rel}\n")
    print(cp.body)
    return 0


def graph(vault: Path, project_path: Path) -> int:
    if not project_path.is_absolute():
        project_path=vault/project_path
    if not project_path.exists():
        print(f"ERROR: project not found: {project_path}", file=sys.stderr); return 2
    project,errs=read_note(project_path,vault)
    if errs or project.frontmatter.get('type')!='Project':
        print("ERROR: target is not a valid Project note", file=sys.stderr); return 2
    notes=load_all(vault); idx=build_index(notes); tasks=project_tasks(vault,project,notes)
    tasks.sort(key=lambda t: ((t.frontmatter.get('status') in {'Done','Cancelled'}), (t.title or t.rel).casefold()))
    task_lines=[]; nodes=[]; ids={}
    for i,t in enumerate(tasks,1):
        tid=f"T{i}"; ids[t.rel]=tid
        title=t.title or t.path.stem; status_=str(t.frontmatter.get('status','Unspecified'))
        ident=str(t.frontmatter.get('ticket') or t.path.stem)
        checked='x' if status_=='Done' else ' '
        task_lines.append(f"- [{checked}] [[{title}]] — {status_}")
        label=(ident + ' · ' + title + ' · ' + status_).replace('"','\\"')
        nodes.append(f'  {tid}["{label}"]')
    edges=[]
    for t in tasks:
        target_id=ids[t.rel]
        for dep_name in dependency_links(t):
            matches=[m for m in resolve_link(dep_name,idx) if m.frontmatter.get('type')=='Task']
            if len(matches)==1 and matches[0].rel in ids:
                edges.append(f"  {ids[matches[0].rel]} --> {target_id}")
    task_content='\n'.join(task_lines) if task_lines else '_No actionable tasks currently recorded._'
    graph_content=(
        "Task frontmatter is authoritative; this diagram is derived from `blocked_by` "
        "(or its `depends_on` alias).\n\n"
        "```mermaid\nflowchart TD\n" + "\n".join(nodes+edges) + "\n```"
    )
    new_body=replace_section(project.body,'Tasks',task_content)
    new_body=replace_section(new_body,'Task dependency and progress',graph_content)
    raw=project.path.read_text(encoding='utf-8')
    lines=raw.splitlines(); end=next(i for i in range(1,len(lines)) if lines[i].strip()=='---')
    prefix='\n'.join(lines[:end+1])+'\n\n'
    project.path.write_text(prefix+new_body.lstrip('\n'),encoding='utf-8')
    print(f"Updated task index and progress graph: {project.rel}")
    return 0


def main() -> int:
    ap=argparse.ArgumentParser(description="Tolaria project knowledgebase helper")
    sub=ap.add_subparsers(dest='cmd',required=True)
    p=sub.add_parser('init'); p.add_argument('vault',type=Path)
    p=sub.add_parser('validate'); p.add_argument('vault',type=Path)
    p=sub.add_parser('status'); p.add_argument('vault',type=Path)
    p=sub.add_parser('resume'); p.add_argument('vault',type=Path); p.add_argument('--project')
    p=sub.add_parser('graph'); p.add_argument('vault',type=Path); p.add_argument('project_path',type=Path)
    a=ap.parse_args()
    vault=a.vault.expanduser().resolve()
    if a.cmd=='init': return init_vault(vault)
    if a.cmd=='validate': return validate_vault(vault)
    if a.cmd=='status': return status(vault)
    if a.cmd=='resume': return resume(vault,a.project)
    if a.cmd=='graph': return graph(vault,a.project_path)
    return 2

if __name__=='__main__':
    raise SystemExit(main())
