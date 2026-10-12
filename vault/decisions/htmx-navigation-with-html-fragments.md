---
title: "Navigation is htmx, over server-rendered HTML fragments — the shell renders once"
type: decision
status: accepted
decided_on: 2026-10-09
created: 2026-10-09
updated: 2026-10-09
tags: [guest, ui, frontend, htmx, hypermedia, performance, fragments, rendering]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[runtime-js-guest-platform]]", "[[features-as-native-web-components]]", "[[minimise-client-side-calculation]]", "[[trailbase-declarative-page-host]]", "[[rendering-is-a-component-behind-an-envelope]]", "[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[tb-0036-htmx-navigation]]"]
---

# Navigation is htmx, over server-rendered HTML fragments — the shell renders once

## Context

The guest renders every page server-side through minijinja, one template per route, each extending
`views/layout.html.jinja` (`runtime-js-guest-platform`, `trailbase-declarative-page-host`). A normal
navigation is a full document: doctype, head, topbar, nav, the `#app-main` body, and eight deferred
`<script>` tags — re-rendered and re-parsed on every click even though only the body changed.

The owner asked whether the SSR rendering could be replaced by a React SPA (keeping SQL reads), or by
**htmx**, "which pairs well with Jinja". Read against the platform's decisions, the SPA is a reversal
(a bundler + client runtime, a new JSON API for the whole write surface, a re-built parity suite);
htmx is an evolution — the app is already HTML-over-the-wire, and a fragment is just a template.

## Decision

**Navigation is htmx `hx-boost`, and the server answers a boosted request with the body block only.**

- **Vendored, not CDN.** `app/public/js/htmx.min.js` (2.0.4) — the deployment is offline.
- **The shell renders once.** `views/layout.html.jinja` wraps everything except `{% block body %}` in
  `{% if not fragment %}`. `fragment` comes from `app/lib/http.js` `isFragment(req)`.
- **The swap target is `#app-main`**, so a boosted nav click replaces the body and leaves the topbar,
  nav, head and script tags untouched.
- **Only the rail and the topbar brand are boosted** in this first slice. The two forms in the rail
  (logout, refresh) opt out with `hx-boost="false"`, because a boosted POST would swap a redirect's
  body into `#app-main` instead of navigating.
- **Swapped content is re-enhanced.** `app.js` scopes its content enhancers to a root and re-runs them
  on `htmx:afterSwap`; `autocomplete.js` exposes `enhanceAll(root)` for the same hook. Custom elements
  (`<aa-date-input>`, `<aa-modal>`) upgrade themselves on insertion.
- **The no-JS path is unchanged.** A browser without htmx, a direct GET, or a plain XHR from `app.js`
  sends none of the fragment signals and gets the whole document exactly as before.

### The header constraint (the one real wrinkle)

The host exposes a **fixed header allowlist** (`tb-ah-run-js/src/lib.rs`):
`content-type, accept, accept-encoding, if-none-match, cookie, host, referer, x-csrf-token,
x-requested-with`. htmx's own `HX-Request` is **not** copied through, so `isFragment` would never see
it. Rather than rebuild the wasm component, the layout sends `X-Requested-With: XMLHttpRequest` via
`hx-headers` on `<body>` (which htmx inherits), and `isFragment` accepts **either** header — `HX-Request`
for the day the allowlist grows to include it, `X-Requested-With` for today.

## Why

- **It is the same architecture, one hop shallower.** The server still owns rendering and the data
  contract; nothing binds a client framework to a page, so the declarative-page and
  manifest decisions are untouched. A React SPA would reintroduce per-page imperative code, which is
  exactly what `[[trailbase-declarative-page-host]]` removes.
- **It composes with the enhancement discipline.** `[[features-as-native-web-components]]` requires an
  enhancement to leave working markup when JavaScript is absent; a fragment response *is* working
  markup, and htmx is inert without its script.
- **It is not a client-calculation path.** `[[minimise-client-side-calculation]]` keeps arithmetic in
  SQL; htmx adds no arithmetic — it swaps server-rendered bytes.
- **It is the cheapest answer to "stop re-rendering the shell".** Measured on the production depot
  (below), the shell is ~7 KB of the document and the swap keeps the shell node, its event listeners
  and the script set alive. It also composes with `[[rendering-is-a-component-behind-an-envelope]]`:
  the fragment is just another renderer output.

## Consequences

**Accepted**

- The rendered-page cache key now includes `fragment`, so a boosted report request cannot be served
  the cached full page or the reverse.
- `app.js` content enhancers take a `root` and are re-run after a swap; the shell-only work (clock,
  job indicator) deliberately is **not** re-run, so no second `setInterval` stacks.
- A new verification surface exists: the same route answers two shapes.

**Given up / to watch**

- **The document title** was stale after a boosted nav (the fragment carries no `<title>` and the head
  is not swapped). **Fixed 2026-10-09**: the fragment emits a hidden `data-aa-title` marker that
  `app.js` copies onto `document.title` in its `htmx:afterSwap` hook.
- **`<meta name="aa-refdb-version">` was stale after a boosted nav.** **Fixed 2026-10-09**: the head
  meta carries an id, the fragment emits an out-of-band copy, and `app.js` calls the new
  `__AA_REFDB__.reload()` when the version moves (serialised behind the initial load).
- **Content links were full-load.** **Partly fixed 2026-10-09**: the link-only hubs and indexes
  (dashboard, reports, ledgers, invoices, cash memo, management) are `hx-boost`-ed. List rows,
  crumbs and table links still full-load — they sit beside write forms, so they need per-anchor
  opt-in, not a blanket `hx-boost` on `#app-main` (which would capture the write `<form>`s).
- **The job indicator's manual refresh reloaded the whole document.** **Fixed 2026-10-09**: it
  re-renders the current URL as a fragment into `#app-main` instead of `window.location.reload()`.
- **Flash messages** now appear without a reload on **management** and **invoice-entry** writes
  (2026-10-09): an htmx write re-renders the list/entry fragment — which contains the flash region —
  into `#app-main`, so no separate out-of-band swap is needed. **The write surface is converted** —
  management, invoice entry (line add/remove, header, complete), invoice grid save, payments and
  cash-memo expenses all answer htmx with a fragment. The one remaining full load on a write is the
  **invoice new create** (`POST /invoices/new`), which navigates to the entry page and is arguably fine
  as a full load (`tb-0036`).
- **A write re-uses the screen builder.** `management.listView()`, `invoices.entryView()`,
  `invoices.gridView()`, `payments.listView()`, `payments.newView()` and `expenses.listView()` are
  shared by their GET route and their write routes, so a write's screen and the GET's screen cannot
  drift. Converted entry writes: `/invoices/<id>/line` (add), `…/line/<lineId>/delete`, `…/header`,
  `…/complete` (everything that redirected to the entry page, which is what `/invoices/new` lands on);
  the grid save `/invoices/<id>/lines`; the payment create (`POST /payments`, which on a bad value
  re-renders the form with the error rather than a bare 400) and delete (`/payments/<id>/delete`); and
  the expense save (`/cashmemo/expenses/save`, same error handling) and delete
  (`/cashmemo/expenses/<id>/delete`).
- **A grid save's error is a swap, not a bare 409.** The grid save's failure path re-renders the grid
  with the message as the flash (`status: "error"`), because htmx does not swap a 4xx body by default —
  a bare `409` would have shown the operator nothing.
- **A write re-uses the list builder.** `management.listView()` is shared by the GET route and the
  create/update/delete routes, so the write's list and the GET's list cannot drift. An htmx write
  answers with the body fragment; a plain POST still 303s, so the form works with no JavaScript.
- **The write forms set `hx-push-url` explicitly** — a boosted form would otherwise push its POST action
  (`/management/sections/create`) into the address bar. Where the write returns the same screen, the
  forms use `hx-push-url="false"` (invoice entry/grid); where it navigates to a different one, they push
  that URL (`hx-push-url="/management/<entity>"`, `hx-push-url="/payments"`), so a refresh reloads the
  list. This replaces the earlier `?new=1` residue.
- **Report filters APPLY as fragments** and the row-cap "Show all" / "latest period" links are boosted
  (2026-10-09). A windowed **"Load more"** (`rowInfo.moreHref`, the current window + one cap) replaces
  the single "Show all" cliff, which rendered every row at once (2026-10-09). It re-renders the window
  rather than appending, so it is bounded per click but not O(1) in total — **true offset paging is a
  follow-up** (`report-render-row-cap`).
- **`<aa-modal>` is now swap-safe** (2026-10-09): it moves its children into a `<body>`-level overlay,
  and `disconnectedCallback` now removes that overlay with the host. Without this, any htmx swap of a
  modal-bearing page left the overlay behind — a stuck backdrop when the dialog was open. Any future
  component that appends to `<body>` needs the same cleanup to survive a swap.
- **The URL is pushed, the scroll/focus behaviour is htmx's default** — acceptable for a nav rail,
  but a form-heavy screen (invoice entry) is deliberately left on full loads.

## Evidence

Measured 2026-10-09 against the running guest on the imported depot
(`trail --depot=traildepot run --runtime-root-fs=traildepot\runtime`):

| request | full | fragment |
|---|---|---|
| `GET /dashboard` | 10,901 B, `<!doctype`, has `<nav>` | **3,034 B**, starts `<section class="card hub">`, no `<nav>`/doctype |
| `GET /reports/profit` | 94,566 B, doctype + nav | 86,679 B, no doctype/nav |
| `GET /management/parties` | — | 1.7 MB, no doctype, table intact |

Real browser (CDP, isolated context): clicking the rail's **Reports** link changed the URL to
`/reports`, the `nav` element kept a stamp set before the click (`isConnected` true), and
`performance.getEntriesByType('navigation').length` stayed **1** — no document navigation. An
`htmx.ajax` swap of `/reports/profit` into `#app-main` produced 6 `select[data-searchable]`, **4** of
which carried `data-ac-ready="1"`, proving the `afterSwap` re-init ran; the shell stayed live; the
console had no errors or warnings. `tools/route-snapshot.mjs`: **50 routes, 0 erroring**.

Source: `app/lib/http.js` (`isFragment`, `fragment` in `shellContext`), `app/lib/route-kit.js`
(`renderRoute`), `app/lib/report-render.js` (shell + cache key), `views/layout.html.jinja`,
`views/partials/nav.html.jinja`, `views/partials/topbar.html.jinja`, `public/js/app.js`,
`public/js/autocomplete.js`, `public/js/htmx.min.js`.

## Related

- [[tb-0036-htmx-navigation]] — the work item and its remaining follow-ups.
- [[features-as-native-web-components]] — the enhancement contract this keeps.
- [[rendering-is-a-component-behind-an-envelope]] — the renderer-independence decision this composes with.
- [[trailbase-declarative-page-host]] — the page model htmx leaves intact.
