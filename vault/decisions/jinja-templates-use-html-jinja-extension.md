---
title: Jinja templates carry the .html.jinja extension
type: decision
status: accepted
decided_on: 2026-10-12
created: 2026-10-12
updated: 2026-10-12
tags: [runtime-js, minijinja, templates, authoring, convention, decision]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-guest-platform]]", "[[runtime-js-minimal-file-authoring-contract]]", "[[one-manifest-is-the-page-definition]]"]
---

# Jinja templates carry the `.html.jinja` extension

**Accepted 2026-10-12.** Every Jinja template on the guest is named `<name>.html.jinja` — on
2026-10-12 the view templates (`app/views/**`), the declarative page templates
(`app/pages/**/page.html.jinja`) and every reference to them were renamed from `.html`.

## Decision

A file a person authors as a Jinja template ends in **`.html.jinja`** (so `layout.html.jinja`,
`partials/page_body.html.jinja`, `invoices/entry.html.jinja`). Static HTML that is served as-is — the
plugin pages under `app/plugins/<name>/index.html` — keeps the plain `.html` extension.

## Why

- **A template is not an HTML file.** `views/invoices/document.html` read as "a document page" while
  it is a minijinja source that must be rendered; `.html.jinja` says which of the two it is. The
  loader takes the name literally, so the extension is the only signal a reader gets before opening it.
- **Editors and tooling key off the extension.** `.jinja` selects Jinja/HTML-templating syntax
  highlighting, linting and formatting, while a plain `.html` does not.
- **The static/templated split is now visible.** The one HTML file that is *not* a template (the
  `import-from-v1` plugin page) is the only `.html` left under the app, so "is this rendered?" is
  answered by the name.
- **The rename is free at run time.** `tb-ah-run-js/src/render.rs`'s loader resolves the name it is
  given against the views root then the pages root — it never filters by extension — so the only
  change is the strings passed to `render.html`/`render.spooled`, the page manifests' `template`/`view`
  fields, and the `extends`/`include`/`import` names inside the templates themselves. No Rust or wasm
  change was needed.

## Consequences

- Every template name is a literal that must be kept in step; there is no extension fallback. A stale
  name is a render-time 500, which is why the rename updated all reference sites at once.
- `app/manifests/content-types.json` still maps `.html` for the static server; it is unrelated to
  templates (they are rendered, never served by extension) and was left alone.

See [[runtime-js-minimal-file-authoring-contract]] for the page-authoring contract this extends and
[[runtime-js-guest-platform]] for how the renderer loads a template.
