---
type: Reference
status: Active
created: 2026-09-26T00:00:00.000Z
updated: 2026-09-26T00:00:00.000Z
belongs_to:
  - "[[TrailBase Backend]]"
related_to:
  - "[[Frontend — TrailBase Server-Rendered App]]"
  - "[[Reports vs Pages — Implementation and Performance]]"
  - "[[Backend — TrailBase Server]]"
  - "[[Decision — Declarative pages: a folder is a page, the server is a generic host]]"
  - "[[Decision — Refresh the report snapshot incrementally from table fingerprints]]"
tags:
  - trailbase
  - frontend
  - diagrams
  - architecture
  - reference
---

# TrailBase Frontend System Diagrams

Four interactive, self-contained HTML diagrams of the TrailBase / frontend-ssr system, generated with the
Archify skill. They are the visual companion to
[[Reports vs Pages — Implementation and Performance]]; that note is authoritative for the numbers, and the
code is authoritative over both.

## The set

| Diagram | Type | Shows |
|---|---|---|
| `docs/diagrams/system-architecture.html` | architecture | Components and boundaries: browser, the Express app with its two report surfaces and report service, TrailBase and its SQLite depot |
| `docs/diagrams/sequence-report-route.html` | sequence | The legacy path: `GET /reports/<report>` from the browser to HTML, reading the warm snapshot and dispatching to the worker pool |
| `docs/diagrams/sequence-page-host.html` | sequence | The page host: shell + manifest, then `GET /p/<slug>/data`, the named report result, gzip JSON and the browser render |
| `docs/diagrams/dataflow-snapshot-pipeline.html` | dataflow | The incremental snapshot: probe → fetch changed → rebuild views → serve the two consumers |

Each `.html` sits beside the `.json` specification that produced it, and a `.visual-check.html` contact
sheet with light/dark screenshots at the smallest and largest desktop sizes.

Open an `.html` file directly in a browser: it carries its own styles, theme switch, pan/zoom, search,
focus and export controls.

## What each diagram answers

- **system-architecture** — how the pieces relate, and where the two report implementations sit: both are
  routes inside the one Express process, both call the same report service, and both read one TrailBase.
- **sequence-report-route / sequence-page-host** — the contrast the project is about. The legacy route
  renders the whole table server-side on every request and ships it uncompressed; the page host fetches a
  manifest-selected named result as gzipped JSON and lets the browser render, with no client-side report
  math.
- **dataflow-snapshot-pipeline** — why the server side is cheap: only tables whose fingerprint
  (`row count + newest updated`) moved are re-read, only their views are rebuilt, and one snapshot feeds
  both consumers.

## Authority and caveats

- The diagrams are **derived** views. If one disagrees with a Task/Decision/Issue or with the source under
  `frontend-ssr/`, the source wins and the diagram is regenerated.
- Deliberately omitted for readability: the plugins hub internals, the management write path, auth/token
  refresh, and the Import from v1 plugin's PocketBase leg. Those live in
  [[Frontend — TrailBase Server-Rendered App]] and [[Import from v1 Plugin]].
- The diagrams were trimmed to fit a desktop first screen without scrolling; the sequence diagrams show the
  main path rather than every return message.

## Regenerating

The skill lives outside the repo; run it by absolute path from the project root.

```sh
node "<archify>/bin/archify.mjs" validate  <type> docs/diagrams/<name>.json --quality showcase --json
node "<archify>/bin/archify.mjs" deliver   <type> docs/diagrams/<name>.json docs/diagrams/<name>.html --quality showcase --json
node "<archify>/bin/archify.mjs" visual-check docs/diagrams/<name>.html --json
```

`validate` and `deliver` must report **9/9 checks, 0 errors, 0 warnings**; `visual-check` must exit 0.
Types are `architecture`, `sequence` and `dataflow` for the four files above.

## Related

- [[Reports vs Pages — Implementation and Performance]] — the numbers these diagrams illustrate.
- [[Frontend — TrailBase Server-Rendered App]] — the subsystem.
- [[Backend — TrailBase Server]] — the API the snapshot reads.
- [[TB-0008 Serve report results from the page host instead of whole views]] — the change that made the
  page path cheap.
