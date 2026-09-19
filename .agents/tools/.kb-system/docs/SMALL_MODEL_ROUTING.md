# Small-Model Routing

Micro-skills are intentionally narrow so inexpensive/local models can perform deterministic knowledgebase operations.

## Give small models

- explicit file paths or object titles
- the relevant current document(s)
- one operation
- expected output location
- validation criteria

## Do not delegate without stronger context

- ontology redesign
- ambiguous requirement extraction
- architectural decisions
- conflict resolution across many concurrent edits
- inference of missing project facts
- secret handling

## Good dispatch examples

- Normalize this Task frontmatter using `kb-frontmatter`.
- Add this verified blocker using `kb-task-dependencies`.
- Regenerate this Project's flowchart from these five Task files using `kb-progress-diagram`.
- Turn these factual updates into a resumable Checkpoint using `kb-checkpoint`.
- Decide whether a flowchart or sequence diagram best represents this supplied description using `kb-mermaid-select`.

The orchestrator remains responsible for whether the operation should happen at all.
