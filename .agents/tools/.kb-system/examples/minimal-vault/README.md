# Minimal Example Vault

A hand-sized, complete knowledgebase. Read it to learn the model; copy nothing from it
into real work except the patterns.

It is the output of `kb.py init` plus one object of each core type, so it doubles as the
answer to "what does a valid vault actually look like?".

## What each file demonstrates

| File | Shows |
|---|---|
| `projects/example-project.md` | Project contract: outcome, success criteria, generated task index, generated `flowchart TD` progress graph |
| `tasks/example-0001-create-the-vault.md` | A `Done` Task with the required `## Verification` evidence and a `ticket` |
| `tasks/example-0002-write-the-first-note.md` | A `Ready` Task using the `depends_on` alias to declare a hard prerequisite |
| `decisions/example-adopt-a-tolaria-vault.md` | A durable Decision with context, consequences and `Revisit when` |
| `notes/example-welcome.md` | A general knowledge record, unrelated to project execution, with `tags` |
| `work-sessions/2026-01-01-example-session.md` | The running execution journal |
| `checkpoints/2026-01-01-0900-example-project.md` | The resumable snapshot a fresh session starts from |
| `types/*.md` | One `type: Type` document per type the vault actually uses |

## Try it

From the kit root, with Python available:

```sh
python .agents/tools/kb-tools/kb.py validate .agents/tools/.kb-system/examples/minimal-vault
python .agents/tools/kb-tools/kb.py status   .agents/tools/.kb-system/examples/minimal-vault
python .agents/tools/kb-tools/kb.py resume   .agents/tools/.kb-system/examples/minimal-vault --project "Example Project"
python scripts/kb_check.py .agents/tools/.kb-system/examples/minimal-vault
```

Then edit a Task's `status:` and re-run `kb.py graph` on the Project to watch the index
and the flowchart follow the frontmatter.

## Notes

`vault/AGENT.md` is the full contract that `kb.py init` copies into every new vault; it
is here only because `init` put it here.
