---
title: "The theme is one file of tokens (theme.css)"
type: decision
status: accepted
created: 2026-10-11
updated: 2026-10-11
tags: [ui, css, theme, tokens, design-system, guest, decision]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[guest-ui-is-a-direct-shift-of-legacy]]", "[[components-consume-server-descriptors]]", "[[ui-parity-discrepancies-2026-10-08]]"]
---

# The theme is one file of tokens (theme.css)

**Decided 2026-10-11**, at the owner's request: a single global stylesheet that keeps the theme as CSS
variables (Mantine-style), so the whole look is changed by editing one file, and every component,
element and custom element draws from it.

## Decision

- `app/public/css/theme.css` holds the design tokens only: the Mantine 7 light palette (`--gray-0…9`,
  `--blue-0…9`, `--red`, `--green`, `--yellow`, `--orange`, `--pink`, `--grape`, `--violet`,
  `--indigo`, `--cyan`, `--teal`), the semantic tokens the UI actually uses (`--text`, `--muted`,
  `--surface`, `--surface-2`, `--border`, `--line`, `--table-border`, `--accent*`, `--on-accent`,
  `--danger*`, `--ok*`, `--warn*`, document ink), type (`--font`, `--font-mono`), shape (`--radius`) and
  chrome dimensions (`--header-h`, `--nav-w`).
- `app/public/css/app.css` holds component LAYOUT only and references the tokens — it carries **no**
  colour literal (`grep '#[0-9a-f]{3,8}' app.css` → 0).
- `views/layout.html` loads `theme.css` before `app.css`.
- Components and custom elements are light-DOM ([[components-consume-server-descriptors]]), so the one
  stylesheet styles all of them; there is no shadow-DOM CSS to duplicate.

## Consequences

- Retheming is editing `theme.css` (or overriding it with a later stylesheet) — no component change.
- The palette values are the legacy/Mantine defaults, so the default theme is the 1:1 shift
  ([[guest-ui-is-a-direct-shift-of-legacy]]); the tokenization was mechanical (91 colour literals →
  token references) and changes no rendered colour.
- A new colour in `app.css` is now a theming bug; the convention is to add a token instead.
- The two mobile `--header-h`/`--nav-w` overrides live in `theme.css`, since where the two screen sizes
  meet is theme, not a component's private business.
