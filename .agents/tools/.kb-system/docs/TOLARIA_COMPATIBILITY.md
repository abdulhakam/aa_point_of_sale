# Tolaria Compatibility Notes

This kit intentionally follows Tolaria's public file-first conventions while adding stricter project-management rules.

## Native Tolaria conventions used

- Markdown files are durable notes.
- YAML frontmatter stores structured properties.
- A leading H1 is the primary display title convention for managed notes; current Tolaria title resolution also has legacy/fallback behavior.
- Wikilinks connect notes.
- `belongs_to`, `has`, and `related_to` are standard relationships.
- Custom frontmatter fields containing wikilinks can act as relationships.
- Type documents are Markdown notes with `type: Type`.
- `views/` is the conventional saved-view folder.
- `attachments/` stores normal attached files.
- Mermaid code blocks render as diagrams.
- `_display: sheet` opens a Markdown note as a spreadsheet while preserving frontmatter.
- `_sheet` is system-oriented spreadsheet presentation metadata.
- Fenced HTML blocks can render sandboxed previews and read vault expressions.
- Tolaria MCP supports vault context/search/read/create/update/append operations in current public builds.
- Root `AGENTS.md` instructions can be included in Tolaria MCP vault context.

## Deliberate stricter layer in this kit

Tolaria determines type from `type:` frontmatter rather than folder location. The Portent starter vault is also flat. This kit deliberately imposes one canonical directory per type because the user requested a filesystem-partitioned document-graph ODM and because deterministic paths make tiny-agent routing simpler. `type:` remains authoritative to Tolaria; directory placement is an additional kit invariant.

Dependency edges accept `depends_on` as an alias for `blocked_by`, so a vault that already used `depends_on` keeps a working dependency graph and cycle check without rewriting every Task.

## Vault-declared extension types

The base schema names nineteen types, but the kit's template materializes only the core subset a vault actually uses. A vault may add recurring types through the extension procedure in `AGENT.md` section 4: a `type: Type` document under `types/`, a `kb-config.json` mapping, the directory itself, and documentation. An extension type is declared when its first real object is created, and it should be removed once its last object is gone — an unused type directory or type document is a defect, not scaffolding. Tolaria is unaffected, because it resolves type from frontmatter rather than from a fixed type list.

## Public references

- https://tolaria.md/concepts/notes
- https://tolaria.md/concepts/types
- https://tolaria.md/concepts/relationships
- https://tolaria.md/reference/frontmatter-fields
- https://tolaria.md/reference/file-layout
- https://tolaria.md/concepts/files-and-media
- https://tolaria.md/concepts/editor
- https://tolaria.md/templates/portent
- https://github.com/refactoringhq/portent-vault-template
- https://github.com/refactoringhq/tolaria/blob/main/docs/ARCHITECTURE.md
