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
- [x] `views/layout.html.jinja`: guard the full-document shell with `{% if not fragment %}` around a single
      unconditional `{% block body %}`; add `id="app-main"`; send `X-Requested-With` via `hx-headers`
      on `<body>` (the host's header allowlist drops `HX-Request`).
- [x] `app/lib/route-kit.js` + `app/lib/report-render.js`: set `fragment` from the request, and add it
      to the rendered-page cache key.
- [x] `views/partials/nav.html.jinja` + `views/partials/topbar.html.jinja`: `hx-boost="true" hx-target="#app-main"
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

## Slice 3 — report filters as fragments + a modal-swap fix (2026-10-09)

- [x] Both report filter forms (inline and `filtersModal`) APPLY via `hx-get` into `#app-main` with
      `hx-push-url`, so applying a filter swaps the report instead of reloading the document and the
      URL stays shareable.
- [x] The "Show all" and "latest period" notice links are boosted (fragment, not a reload). A windowed
      **"Load more"** was added in Slice 9; true offset paging is still not done.
- [x] **Fixed a swap bug the navigation exposed:** `<aa-modal>` moves its children into a
      `<body>`-level overlay, so removing its host (which any htmx swap of the page does) left the
      overlay behind — a stuck backdrop when the dialog was open. `disconnectedCallback` now removes
      the overlay with the host.
- [x] Browser-verified: inline APPLY (profit) and modal APPLY (stock report) swap the body, push the
      URL, keep the shell live and close the modal with **no orphan overlay**; navigating away from an
      open modal leaves **0 overlays**; no console errors.
- [x] Gates green: `guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check` 12/12,
      `autocomplete-check` 39/39, `hotkey-check` 62/62 (one transient first-run timeout on the
      Ctrl+Enter check, green on re-run), `grid-preview-check` 14/14, `print-queue-check` 14/14.

## Slice 4 — management write surface (2026-10-09)

- [x] Extracted `management.listView(A, entity, entityKey, query)` — the list screen as
      `{ options, data }` — shared by the GET route and the write routes so the write's list and the
      GET's list cannot drift.
- [x] The create/update/delete routes answer an htmx request with the list **fragment** (flash
      included) instead of a 303; a plain POST still 303-redirects, so the forms work without JS.
- [x] `management/list.html.jinja`: the entity form and the row delete form are `hx-boost` into `#app-main`
      with `hx-push-url="false"`; the delete uses htmx's own `hx-confirm` (replacing `data-confirm`, so
      the cancel happens before the request rather than as a listener racing htmx's submit).
- [x] Browser-verified: create → list row appears, panel closes, flash "Created", shell node stays live,
      navigation count stays 1, URL does **not** become the POST action; delete (confirm auto-accepted)
      → row removed, flash "Deleted", no reload. Test rows cleaned up. HTTP-verified the plain POST
      still 303s.
- [x] Gates green: `guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check` 12/12,
      `autocomplete-check` 39/39, `hotkey-check` 62/62, `grid-preview-check` 14/14,
      `print-queue-check` 14/14.

## Slice 5 — invoice entry writes (2026-10-09)

- [x] Extracted `invoices.entryView(A, idB64, message)` — the `/invoices/<id>` entry screen as
      `{ options, data }` — shared by the entry GET route and the entry write routes.
- [x] `/invoices/<id>/line` (add), `…/line/<lineId>/delete`, `…/header` and `…/complete` answer an
      htmx request by re-rendering the entry screen (flash included) instead of a 303; a plain POST
      still 303-redirects. These are exactly the writes that redirected to the entry page, which is
      where `/invoices/new` lands.
- [x] `views/invoices/entry.html.jinja`: the header form, the ADD LINE form, the per-line delete form and the
      complete/reopen form are `hx-boost` into `#app-main` with `hx-push-url="false"`; the line delete
      uses htmx's `hx-confirm`.
- [x] Browser-verified on a real invoice: header save → flash "Saved", shell node live, navigation
      count 1, URL unchanged; add a line then remove it → line count 21 → 22 → 21 (net zero; the line
      delete is a hard `DELETE`, so the test left the ledger lines unchanged), shell live throughout.
      No console errors.
- [x] Gates green: `guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check` 12/12,
      `autocomplete-check` 39/39, `hotkey-check` 62/62, `grid-preview-check` 14/14,
      `print-queue-check` 14/14.

## Slice 6 — invoice grid save (2026-10-09)

- [x] Extracted `invoices.gridView(A, req, idB64, message, status)` — the `/invoices/<id>/grid` screen
      (lease/`canWrite`/`heldBy` resolved inside) — shared by the grid GET route and the grid save.
- [x] `/invoices/<id>/lines` answers an htmx request by re-rendering the grid (flash included) instead
      of a 303; the **error** path re-renders the grid with the message as a red flash
      (`status: "error"`) because htmx does not swap a bare 4xx body. A plain POST still 303-redirects.
- [x] `views/invoices/grid.html.jinja`: the grid form is `hx-boost` into `#app-main` with `hx-push-url="false"`;
      the grid's client recalc re-inits on the swap via `htmx:afterSwap` (already wired). No submit
      listener existed in `enhanceGrid`, so htmx and the recalc do not conflict.
- [x] Browser-verified on a real difference invoice: SAVE LINES → flash "Saved", shell node live,
      navigation count 1, URL unchanged, `[data-grid]` still present. Captured the POST body: htmx
      **includes the clicked submitter** (`op=save`), so the row `remove:…` buttons carry their `op`
      too (the remove path was **not** run destructively — it appends a cancelling row, so it was left
      to the gate rather than polluting the ledger).
- [x] Gates green: `guest-smoke` 116/116, `route-snapshot` 50/0, `grid-preview-check` 14/14,
      `refdb-check` 12/12, `autocomplete-check` 39/39, `hotkey-check` 62/62, `print-queue-check` 14/14.

## Slice 7 — payments writes (2026-10-09)

- [x] Extracted `payments.listView()` (the `/payments` list) and `payments.newView()` (the new-payment
      form), shared by their GET routes and the write routes.
- [x] `POST /payments` (create) answers an htmx request with the list fragment (flash included); a bad
      value re-renders the **new form** with the error rather than a bare 400 htmx would not swap.
      `/payments/<id>/delete` re-renders the list. Plain POSTs still 303.
- [x] `views/payments/index.html.jinja`: the filter form APPLYs via `hx-get` into `#app-main` with
      `hx-push-url`; the row delete is `hx-boost` + `hx-confirm`. `views/payments/new.html.jinja`: the form is
      `hx-boost` with `hx-push-url="/payments"`.
- [x] **Fixed the URL residue from earlier slices:** management and payments write forms now push the
      **list** URL (`hx-push-url="/management/<entity>"`, `"/payments"`) instead of leaving the POST
      action or `?new=1` in the address bar; invoice entry/grid keep `hx-push-url="false"` (same screen).
- [x] Browser-verified: create → flash "Payment saved", list shown, shell node live, navigation count 1,
      URL becomes `/payments` (the pushed list); delete → flash "Deleted", row gone, net zero; filter
      APPLY → URL `/payments?type=1…`, no reload. Test rows cleaned up. No console errors.
- [x] Gates green: `guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check` 12/12,
      `autocomplete-check` 39/39, `hotkey-check` 62/62, `grid-preview-check` 14/14,
      `print-queue-check` 14/14.

## Slice 8 — cash-memo expenses writes; write surface complete (2026-10-09)

- [x] Extracted `expenses.listView()` (the `/cashmemo/expenses` screen) shared by its GET route and the
      write routes.
- [x] `/cashmemo/expenses/save` (create/update) answers an htmx request with the list fragment (flash
      included); a bad value re-renders the list with a red flash rather than a bare 400.
      `/cashmemo/expenses/<id>/delete` re-renders the list. Plain POSTs still 303.
- [x] `views/cashmemo/expenses.html.jinja`: the filter APPLYs as a fragment, the row delete is
      `hx-boost` + `hx-confirm`, the row edit link is boosted, and the save form is `hx-boost` with
      `hx-push-url="/cashmemo/expenses"`.
- [x] Browser-verified: add expense → flash "Saved", row present, shell node live, navigation count 1,
      URL `/cashmemo/expenses`; delete → flash "Deleted", row gone (net zero; the table has no `deleted`
      column, so remove means remove). No console errors.
- [x] Gates green: `guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check` 12/12,
      `autocomplete-check` 39/39, `hotkey-check` 62/62, `grid-preview-check` 14/14,
      `print-queue-check` 14/14.
- [x] **This completes the write surface ("C"):** management, invoice entry, invoice grid, payments and
      cash-memo expenses all write over htmx. The only write still on a full load is the invoice **new**
      create, which navigates to the entry page.

## Slice 9 — report "Load more" (2026-10-09)

- [x] `report-render.js` adds `rowInfo.moreHref`: the current window plus one `RENDER_MAX_ROWS`, with
      the existing `maxRows`/`all` dropped from the query first so a second click does not append a
      second `maxRows`.
- [x] `views/reports/report.html.jinja`: the truncated notice is now **"Load N more" · "Show all"**; "Load
      more" is `hx-boost` into `#app-main`, so it swaps the body (filters + notice + table) with the
      larger window and pushes the URL.
- [x] Browser-verified on the general ledger (wide period, 26,613 rows): Load more → rows 1000 → 2000,
      shell node live, navigation count 1, URL gains `maxRows=2000`, a new "Load more" appears. The
      HTTP path matches (`maxRows=2000` → "Showing first 2000 …", next `maxRows=3000`).
- [x] Gates green: `guest-smoke` 116/116, `route-snapshot` 50/0, `verify-spool-reports` (75 binds, 16
      totals proven exact), `refdb-check` 12/12, `autocomplete-check` 39/39, `hotkey-check` 62/62,
      `grid-preview-check` 14/14, `print-queue-check` 14/14.
- [ ] **Not offset paging.** "Load more" re-renders the whole window (1000 → 2000 → …), so it is bounded
      per click but not O(1) in total; true offset append (a rows-only fragment + `LIMIT n OFFSET m`)
      remains a follow-up. It replaces the single "SHOW ALL" cliff, which rendered every row at once.

## Follow-ups (not done)

- [x] **Stale document title** — fixed 2026-10-09: the fragment emits a hidden `data-aa-title` marker
      (`views/layout.html.jinja`) and `app.js` copies it onto `document.title` on `htmx:afterSwap`.
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
- [x] **Convert the writes** — done across slices 4–8 (management, invoice entry, invoice grid,
      payments, cash-memo expenses). The only write still on a full load is the invoice **new** create,
      which navigates to the entry page; leaving it is acceptable.
- [ ] Decide whether to grow the host's header allowlist to include `hx-request`, so the
      `X-Requested-With` workaround can be retired.
- [ ] **Measure** the render-time saved vs a full page (the change is currently justified by structure
      and behaviour, not by a before/after Jinja timing).

## Related

- [[htmx-navigation-with-html-fragments]] — the decision and evidence.
- [[runtime-js-guest-platform]] — the system.
