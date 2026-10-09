---
title: "htmx boosted navigation over server-rendered fragments"
type: task
status: doing
priority: medium
created: 2026-10-09
updated: 2026-10-09
tags: [guest, ui, frontend, htmx, fragments, navigation]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[htmx-navigation-with-html-fragments]]", "[[runtime-js-guest-platform]]", "[[features-as-native-web-components]]", "[[minimise-client-side-calculation]]", "[[trailbase-declarative-page-host]]"]
---

# htmx boosted navigation over server-rendered fragments

Trial of the htmx style the owner asked for: keep minijinja SSR, stop re-rendering the app shell on
every navigation. Decision and measurements: [[htmx-navigation-with-html-fragments]].

## Slice 1 — done and browser-verified (2026-10-09)

- [x] Vendor htmx 2.0.4 locally (`app/public/js/htmx.min.js`) — offline, no CDN.
- [x] `app/lib/http.js`: `isFragment(req)` (accepted headers `hx-request` or `x-requested-with`) and
      `fragment` in `shellContext`.
- [x] `views/layout.html`: guard the full-document shell with `{% if not fragment %}` around a single
      unconditional `{% block body %}`; add `id="app-main"`; send `X-Requested-With` via `hx-headers`
      on `<body>` (the host's header allowlist drops `HX-Request`).
- [x] `app/lib/route-kit.js` + `app/lib/report-render.js`: set `fragment` from the request, and add it
      to the rendered-page cache key.
- [x] `views/partials/nav.html` + `views/partials/topbar.html`: `hx-boost="true" hx-target="#app-main"
      hx-swap="innerHTML"` on the rail and the brand; `hx-boost="false"` on the two rail forms.
- [x] `public/js/app.js`: scope the content enhancers to a `root`; re-run on `htmx:afterSwap`; expose
      `window.__AA_ENHANCE__`. `public/js/autocomplete.js`: expose `window.__AA_AUTOCOMPLETE__.enhanceAll`.
- [x] Sync `runtime\` → `traildepot\runtime\`; restart the guest; verify full vs fragment responses and
      boosted nav in a real browser (shell node preserved, navigation count stays 1, re-init applies).
- [x] `tools/route-snapshot.mjs` — 50 routes, 0 erroring.

## Slice 2 — navigation breadth + OOB chrome (2026-10-09)

- [x] Boost the six link-only hubs/indexes (`hx-boost hx-target="#app-main"`).
- [x] Job-indicator manual refresh swaps `#app-main` instead of reloading the document.
- [x] `aa-refdb-version` out-of-band meta + `__AA_REFDB__.reload()`, triggered from `htmx:afterSwap`.
- [x] Browser-verified: a hub tile now swaps the body (URL updates, shell node stays live, navigation
      count stays 1, title and reference version stay in sync, autocomplete re-inits); the refresh
      button re-renders content with no document navigation. No console errors.
- [x] Gates re-run green: `guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check` 12/12,
      `autocomplete-check` 39/39, `hotkey-check` 62/62, `grid-preview-check` 14/14,
      `print-queue-check` 14/14.

## Follow-ups (not done)

- [x] **Stale document title** — fixed 2026-10-09: the fragment emits a hidden `data-aa-title` marker
      (`views/layout.html`) and `app.js` copies it onto `document.title` on `htmx:afterSwap`.
- [x] **`aa-refdb-version` meta** — fixed 2026-10-09: the head meta carries an id, the fragment emits
      an out-of-band copy, and `app.js` calls the new `__AA_REFDB__.reload()` when the version moves.
- [x] **Boost the link-only hubs and indexes** (dashboard, reports, ledgers, invoices, cash memo,
      management) — done 2026-10-09. **Still full-load:** list rows, crumbs and table links, which sit
      beside write forms and need per-anchor opt-in.
- [x] **Job indicator manual refresh** — done 2026-10-09: re-renders the current URL as a fragment
      into `#app-main` instead of `window.location.reload()`.
- [x] **Gates run green on this build (2026-10-09):** `guest-smoke` **116/116**, `route-snapshot`
      **50/0**, `refdb-check` **12/12**, `autocomplete-check` **39/39**, `hotkey-check` **62/62**,
      `grid-preview-check` **14/14**, `print-queue-check` **14/14**, `verify-spool-reports` **15/15**,
      `feature-parity` exit 0, `ui-capture` 28 screens none gated. `ui-parity-report` still shows the
      pre-existing 28/28 restyle differences (rail membership, `<th>` styling) — not caused by this
      change. `guest-smoke`/`route-snapshot` were re-run after the title-marker fix.
- [ ] Decide whether to grow the host's header allowlist to include `hx-request`, so the
      `X-Requested-With` workaround can be retired.
- [ ] **Measure** the render-time saved vs a full page (the change is currently justified by structure
      and behaviour, not by a before/after Jinja timing).

## Related

- [[htmx-navigation-with-html-fragments]] — the decision and evidence.
- [[runtime-js-guest-platform]] — the system.
