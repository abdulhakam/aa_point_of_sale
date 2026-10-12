---
title: TrailBase migration
type: project
status: active
created: 2026-09-26
updated: 2026-10-10
tags: [pos, trailbase, migration, workstream]
belongs_to: "[[aa-point-of-sale]]"
related_to: ["[[trailbase]]", "[[runtime-js-guest-platform]]", "[[cutover-is-guest-only]]", "[[smoke-count-is-not-a-hard-coded-number]]", "[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[reference-lists-come-from-indexeddb]]", "[[ui-parity-restyle-progress-2026-10-08]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[features-as-native-web-components]]"]
---

# TrailBase migration

The active workstream: replace the PocketBase backend ([[backend]]) and the Next.js client
([[frontend]]) with TrailBase ([[trailbase]]) and the guest-WASM frontend
([[runtime-js-guest-platform]]).

> **Sequence and body rewritten 2026-10-03.** Two reasons, and both are corrections rather than
> cosmetics:
>
> 1. **The Sequence was describing a migration that could not happen as written.** Steps 11 and 12
>    were "repoint or retire the legacy Next.js client" and "recover the dropped-view endpoints on the
>    legacy side" — both presuppose `frontend/` source, which was deleted from git on 2026-09-29
>    (`c167d311`). They are now marked superseded, with the decision that superseded them:
>    [[cutover-is-guest-only]].
> 2. **Parts of the body had lost their line structure** — three whole sections were single
>    6,000–10,000-character lines, and one contained a corrupted byte where `app/lib/reports.js`
>    should have been. See [[three-reference-docs-lost-their-line-structure]].

## Definition of done

1. **Production data lives in a TrailBase depot**, migrated with ids and enum codes translated
   ([[pos-0027-migrate-production-data-to-trailbase]]).
2. **A UI that staff accept covers the whole working day** — invoices, printing and cash memo
   included — and **looks and behaves like the legacy UI**, with the legacy's own defects fixed rather
   than copied ([[parity-reinstates-the-legacy-look-with-defect-fixes]], 2026-10-07). The capability
   test is still an inventory — everything legacy could do has a home — but the visual half is
   required again. ⚠️ **History:** 2026-10-05 → 2026-10-07 this was "functionally equal, may look
   however it does the job better" ([[parity-is-functional-not-visual]]); before that, "looks like the
   legacy UI" ([[guest-ui-is-a-direct-shift-of-legacy]]). The current rule is the 2026-10-07 decision:
   match the look, fix the defects (`BOX_SIZE_QTY` headers and `<th>`-less tables are still not copied).
3. **The legacy pair is no longer a live system**, and what remains is documented as a frozen oracle
   with its rollback stated.

- Step 1 is **done and verified (2026-09-29)**: the guest import plugin was run through the browser
  UI at `/plugins/import-from-v1/` — 60,245 / 60,245 records, 0 failures, per collection
  `read == created` — and per-table money and quantity sums match PocketBase exactly
  ([[reports-parity-and-e2e-2026-09-29]], [[clean-slate-benchmark-cycle]]). The depot currently holds
  that data. An earlier revision of this note said the depot had been reset and no data was loaded;
  that was stale.
- **This step now has a second, file-to-file path (2026-10-06).** `trailbase/tools/import-v1-tui.mjs`
  writes `traildepot/data/main.db` directly instead of through the record API, so `created` and
  `updated` are preserved from the source rather than stamped at import time, and `invoice_maker` is
  attributed to a chosen `_user` without a session. Verified on a depot copy: 60,245 / 60,245, 0
  failures, 31 s, with per-collection counts and dates matching
  ([[v1-direct-import-tool]], [[tb-0035-direct-sqlite-v1-importer]]).
- Step 2 is **mostly done**: the read-heavy surfaces, the management screens, invoice entry for all
  four types, payments, inventory, the cash-memo module and the print queue all exist. What remains
  is that the guest UI is **not yet the legacy look**. Orders were **withdrawn, not deferred**
  ([[no-draft-invoices-published-on-save]]). ⚠️ **Corrected 2026-10-09:** this line read "return and
  difference invoice entry are unbuilt"; that was stale — the 2026-10-08 legacy-hub restyle made all
  four `invoice_types` creatable ([[invoice-hub-offers-four-types]]), and their write path is now
  verified by `tools/invoice-check.mjs` ([[invoice-type-write-verification-2026-10-09]]).
- Step 3 was **resolved differently than planned** on 2026-10-03. The plan assumed the legacy stack
  would stay live until parity and then be retired by a cutover. Instead its source was deleted, so
  there was nothing to retire: the legacy stack keeps running from `legacyforparity/` as the frozen,
  untracked **production** system, and the guest is what it becomes at the cutover. See
  [[cutover-is-guest-only]].

## Sequence

**2026-10-12 — invoice-view field styles, and the invoice-# picker for short types.**

Owner-reported: "fix the styles of some of the input fields … invoice views" and "make it so the
dropdowns for invoice numbers show the full list … still not loading the invoice list properly when I
enter the invoice numbers." Three fixes, verified in headless Chrome against the production depot:

1. **The plain invoice-bar controls were unstyled.** `.ih-field` (used only by the invoice entry view
   and the console) had no base rule, so its text/number/select controls fell back to the browser
   default (21px, `2px inset`, radius 0) beside the styled `<aa-date-input>` and comboboxes. The
   `.field` control styling now covers `.ih-field` too. [[invoice-view-ih-field-controls-unstyled]].
2. **The console invoice-# picker was a native select for any type with fewer than `MIN_OPTIONS`
   (12) invoices** (type 3 "difference" has 2), so `invoice-remote.js` never found a combobox input
   and typing did nothing. The picker now opts into `data-force-combo`. Also hardened
   `invoice-remote.js` to normalise a non-digit query (`#3000`) so the combobox no longer reported
   "No match" for a row the server had just returned.
3. **The opened picker showed only the first 50** of its server-rendered rows; it now renders the
   full 200 (`data-ac-limit`), and a searched option reads identically to a resting one
   (`#no · party · date · total`). [[console-invoice-picker-was-native-for-short-types]].

Task [[tb-0045-invoice-view-fields-and-picker]]. `tools/invoice-view-check.mjs` passes in full.

**2026-10-12 — optional `_not-found` / `_error` / `_global-error` pages (Next.js-style).**

Added three optional reserved handlers the host dispatches: a no-route path runs `_not-found`, a
thrown handler runs `_error` then `_global-error`, and a failed error handler falls back to a host
page. `_`-prefixed route folders are private and never routed. Decision
[[runtime-js-special-pages]], task [[tb-0044-special-pages]]. The wasm rebuild is done (2026-10-12);
`route-snapshot.mjs` re-baseline and `guest-smoke.mjs` remain.

**2026-10-12 — the runtime collapses to one `ahscripts/` root, templates colocated per route.**

The operator asked to fold the two sibling directories (`ahscripts/` + `app/`) into one, "like Next.js
but Jinja", with each route's template beside its handler. Done:
[[tb-0043-colocate-app-into-ahscripts]], decision [[runtime-js-single-root-ahscripts]]. 28 route
templates moved into their route folders as `page.html.jinja`; the 14 genuinely shared files stayed
under `ahscripts/views/`; the declarative pages stay a separate `ahscripts/pages/` tree (moving them
into `routes/<slug>/` would shadow the `{key}` route folders). The renderer now searches
`[routes, views, pages]`. The wasm was rebuilt and the app boots (2026-10-12) — the first build
exposed a compile error in the new host `lib.rs` and the deployed components had been stale, so the
app was 404ing every page until the rebuild; see [[runtime-refactor-shipped-unrebuilt-wasm]].

**2026-10-11 — print-sheet column order, the console picker's missing invoices, and a distributable.**
Four things, all operator-reported or operator-asked:

1. **Print sheet: TOTAL before DISCOUNTS.** The owner reported the printed totals looked pre-discount.
   The real defect was column order: the guest put `TOTAL` **before** the `DISCOUNTS` group, while the
   compiled legacy bundle puts `DISCOUNTS` before a `rowSpan=2` `TOTAL` (the last column). Reordered in
   `partials/invoice-sheet.html.jinja` and verified live. [[invoice-print-total-column-before-discounts]].
2. **Console invoice-# picker only listed the newest 200.** `consoleView` capped the picker
   server-side; typing filtered only those. Fixed with a **debounced server-side number search** —
   `GET /data/invoices/search?type=N&q=<digits>` + `public/js/invoice-remote.js` — after rejecting the
   two expensive alternatives (inline the whole type; reuse the 2.08 MB/4.4 s client cache). Decision
   [[console-invoice-number-search-is-server-side]]; issue
   [[console-invoice-picker-listed-only-newest-200]]; task [[tb-0041-console-invoice-number-search]].
3. **Invoice view/preview controls trimmed** to `Back · Print · Add to Queue · Edit` (the A4-copy link
   removed; paper size is the browser dialog's job). [[invoice-view-actions-are-back-print-queue-edit]].
4. **A review of the uncommitted changes** (5 fixes applied, builds/vets clean) hardened the Go control
   panel — a bypassable same-file guard on `--wipe` (**critical**, data loss), an unbacked wipe, a
   progress-accounting bug, and a false "listening" check — plus an out-of-order fix in the new picker
   script. See [[pos-0030-control-panel-gui-importer]] "Post-review hardening".

**Distributable (owner's ask).** `trailbase/dist.ps1` / `dist.bat` assemble a minimal runnable `dist\`
(control panel + `trail.exe` + config/migrations/runtime/wasm + launcher) at **126.3 MB**, excluding
`target\` (~6 GB) and the depot data. Smoke-tested by booting a server from it. Task
[[pos-0031-distributable-build]].

A re-run visual parity test (guest vs the known legacy captures) stayed at **28/28 differ, same
carve-outs, no new regression**: [[ui-parity-run-2026-10-11]].

**UI parity: the four residues fixed (owner's ask).** All four were closed the same day and verified
against the live guest (`guest-smoke` 116/116): item drill-down links on `difference`/`stockreport`
(235 links each, `table.html.jinja` `link: "item"` → item sales); the cash-memo **payments** columns and
`Select Section/Area/Booker` filters (which surfaced and fixed a real defect — the relation filters
compared a BLOB to base64 text and matched nothing, [[payments-relation-filters-matched-nothing]]); the
shared filter labels (`Select Party/Booker/Area/Section`); and a `RESET`/`CLEAR` control restored per
manifest (`resetLabel`). `/payments` also stopped stopping at 300 rows — a "Show all" window like the
reports. Details and what stayed an artefact: [[ui-parity-run-2026-10-11]].

**The theme is now one file of tokens.** `app/public/css/theme.css` holds the palette + semantic tokens
(Mantine 7 defaults) and `app.css` references them — 91 colour literals tokenised, no colour literal
left in `app.css`, so editing one file rethemes everything. Decision
[[theme-is-one-file-of-tokens]].

**Pagination on every report, and a readable Supply Summary.** The reports' growing "Load more"
window became **LIMIT/OFFSET paging** (`?page=k`, Prev/Next + `Show all`) across all fifteen
report/ledger screens; the totals/count stayed exact ([[reports-page-by-offset]]). Supply Summary's
invoice picker, which had **no CSS** and rendered every checkbox on one line, is now a scrollable
multi-column list with **Select all / Clear**, and its result gained a **Total Items** figure — the
number of items in the summary (the product-row count; an earlier `ints` "total units" attempt was
reverted as not what was meant). [[supply-summary-picker-and-total-items]]. Verified:
`verify-spool-reports` 15/15, `check-report-pages` all ok, `guest-smoke` 116/116, `route-snapshot` 50/0.

**Logout fixed.** `/logout` redirected to `/_/auth/logout`, which 404s, and cleared nothing — the
session stayed live. It now revokes the refresh token at the host (`POST /api/auth/v1/logout`) and
clears the app's own `auth_token`/`refresh_token` cookies, redirecting to `/login`.
[[logout-left-the-session-live]]. (Found while the guest was briefly hosted publicly for remote
testing; that tunnel and server were closed again.)

**Next: the headless-Chrome keyboard gate, retiring `invoicing.js`, `runtime-revision-is-unstable`,
`<aa-dirty-guard>`, then the deferred money pass; and the parity candidates (`management-parties`
`party type` filter, cash-memo expenses columns).**

**2026-10-10 — imports were failing because `import.bat` destroyed `main.db`.** The symptom was
`open destination: file is not a database` from *any* importer (Node TUI or the new Go control
panel). The cause was not the importer: `import.bat`'s progress `echo` contained an **un-escaped
`>`** in `-> "%DEST%"`, so `cmd` parsed `> "%DEST%"` as a **stdout redirect** and wrote the echo
line *over* `traildepot\data\main.db` (122 bytes of text) before the import ran. Fixed by escaping
it (`-^>`); a repo-wide scan found that one line. The depot was restored: corrupt file backed up,
schema re-initialised, and a full `--wipe` import returned **all 11 collections verified, 0
failures (792 s)**. See [[import-bat-clobbers-main-db]].

**2026-10-10 — the importer is now a native Go control panel (with a monitor).** The direct-import
TUI was recreated in **Go** and folded into a **startup control panel** the owner asked for: a
go-gui window whose **TrailBase** tab starts/stops/attaches the `trail` server and shows the
process's CPU/RAM (and the machine's), and whose **Import** tab drives the v1→TrailBase import with
live progress, per-collection stats and verification. The GUI toolkit ended up **go-gui (pure Go),
not Fyne** — Fyne is CGO/GL-only and its first build did not finish in a 20-minute budget on this
compiler-less machine; the choice is recorded in [[control-panel-gui-is-pure-go]] (with
[[go-module-proxy-blocked]] as the related environment finding). Rebuilt as a Go port of
`tools/import-v1-tui.mjs`, and it is **schema-aware**: `Open` reads the real source and destination
column lists and refuses to run on a destination missing any column it writes. Verified against the
**real** databases: dry-run read counts match the source exactly; a full `--wipe` import returns
**all 11 collections verified, 0 failures** (575 s), and an independent diff finds equal counts,
money sums equal at whole paisas, `created`/`updated` **byte-identical**, `invoice_maker` on all
12,791 invoices and `inv_doc` 12,791. System reference: [[control-panel]]; task:
[[pos-0030-control-panel-gui-importer]].

**2026-10-10 — full-app UI sweep: three real defects.** Drove the whole guest app in Chrome against a
seeded throw-away depot (every route 200; create/read/update/delete/navigate exercised). Found and fixed
three bugs no HTTP gate saw: **`readInvoice` dropped per-line discounts from the invoice total**
(critical — grid/console read 797.50 where the list/document read 731.00;
[[guest-invoice-total-dropped-line-discounts]]); a **plain `<aa-entity-form>` submit button was cancelled
on click**, leaving the Inventory CREATE/SAVE buttons dead ([[plain-entity-form-submit-cancelled]]); and a
**duplicate blank `—` option** in management relation/enum selects
([[management-select-duplicate-blank-option]]). `tools/invoice-view-check.mjs` gained a line-discount
assertion (315.00). Evidence: [[full-app-ui-sweep-2026-10-10]]. Gates after the fixes: `guest-smoke`
**116/116**, `invoice-view-check` **all green**.

**2026-10-10 — the invoice console: one keyboard-first surface.** `GET /invoices/new?type=N` is now
the keyboard console (`views/invoices/console.html.jinja` + `components/invoice-view.js` `<aa-invoice-view>`
+ `components/item-search.js`), with `grid.html.jinja` kept as the no-JS fallback. The state machine
(picker → booker → party → date → create → line entry → `999` finish) and the `0`/`999`/`000`/`up`
code contract are the decision [[invoice-console-keyboard-state-machine]]. Backend enablers: a
**fragment create** on `POST /invoices/new` (the write re-renders the same console), a new
**`PATCH /invoice/<id>/line/<lineId>`** wired to `lifecycle.editLine`, **`buildSheetFresh` +
`?source=live`** on the view route ([[invoice-console-preview-is-live-not-materialised]]),
**composite party labels** (`name - area - section`), and **soft delete** via
`invoices.deleted` ([[invoices-are-soft-deleted]]). Print parity: A5 margins `0.5cm 0.9cm 0.9cm 0.9cm`
and `BOX SIZE = 2em` / `UNTS = 1em` ([[invoice-print-sheet-legacy-metrics]]). The console routes its
writes through the canonical `invoice-lifecycle.js`; `invoicing.js` remains for the older entry
routes (reconciliation incomplete). Gates: `guest-smoke` **116/116**, new `tools/invoice-view-check.mjs`
**all green**. Evidence: [[invoice-console-build-2026-10-10]], task [[tb-0040-invoice-console-keyboard-surface]].
**Next: the headless-Chrome keyboard gate, retiring `invoicing.js`, and the composite label through
refdb's spec.** A **manual Chrome pass** over the console then corrected **8 UI defects** the HTTP
gate could not see (nonexistent NEW Enter, unwired walk chains, focus/combobox timing, the missing
picker action dialog, `000` precedence) — the argument for promoting that pass to an automated gate.

**2026-10-10 — non-report interaction parity: keys and dialogs.** New probe `tools/ui-interaction-capture.mjs`
(headless CDP) recorded, per non-report screen, what each of `? Esc / j k g G f Ctrl+K : Alt+↓` does and
which controls open a dialog vs navigate. **The guest has a full keyboard layer (help overlay, command
palette, row/tile cursor, field moves); legacy has none** — a guest-only addition, by design, not a gap.
Dialog parity is near: both open a modal from the invoice party `+`; the one real divergence is
**management create** — legacy opens an "Add New" modal, the guest navigates to an inline `?new=1` panel.
Legacy live capture was partial (its Mantine app hydrates/re-gates variably); guest is complete. Evidence:
[[ui-interaction-parity-2026-10-10]].

**2026-10-10 — 1:1 UI parity re-run (28 screens, both systems live).** A fresh `ui-capture --system both`
against the running pair (guest `:4000`, legacy `:3000`) plus `ui-parity-report`: **28/28 screens still
differ**, almost entirely accepted carve-outs (rail incl. the withdrawn `orders`; anchor colour; report
`<th>`; data-window) and two extractor artefacts (option-dump labels, Mantine input counts). The
actionable residue is the **same four** as 2026-10-09 — item drill-down links on difference/stockreport,
cash-memo payments filters/columns, report filter label text, and reset/clear — plus two candidates
(party-list `party type` filter; cash-memo expenses column set). Full evidence and the settle-budget
operational note: [[ui-parity-run-2026-10-10]].

**2026-10-10 — the client page cache: a repeat nav no longer fetches its page.** `pagecache.js` holds
rendered fragments in IndexedDB keyed on `(CACHE_REV, identity, data version, url)`; a hit intercepts
the click and performs the swap htmx would, a miss is left to htmx and then cached. Freshness stays
fingerprint-keyed — a write's OOB meta clears it, `BroadcastChannel` clears other tabs, and a
`/data/version` probe clears on focus/30 s — so it complements the server's rendered-page cache
([[rendered-page-cache]]) rather than reintroducing a TTL. Decision: [[guest-page-cache]]; task
[[tb-0038-client-page-cache]]. Two things fell out: htmx 2.0.4 cancels a boosted link's request only at
the **click**, not at `beforeRequest` (and has no 304 handling), and **`runtimeRevision()` is unstable
per request** in this environment ([[runtime-revision-is-unstable]]) — so the client key uses the data
version, and the server cache deserves a re-measure. Gate `pagecache-check` **14/14**; full suite green
(`guest-smoke` 116/116, `route-snapshot` 50/0, the rest unchanged). Also added (the owner's ask): a
**loading spinner** (`#aa-loading`) driven by `hx-indicator` on `<body>`, shown after a ~150 ms delay
for any htmx request and hidden on settle — a cache hit shows nothing, because it is instant. **Next:
fix [[runtime-revision-is-unstable]] (it may be defeating the server cache), then re-add the code
revision to the client key; `<aa-dirty-guard>`; true offset paging.**

**2026-10-09 — the component slice: `<aa-money>`, `<aa-entity-form>`, `<aa-flash>`,
`<aa-invoice-entry>`.** The component work named as next. Four light-DOM custom elements, one file
each, consuming server descriptors ([[components-consume-server-descriptors]]). `<aa-money>` has two
modes so a **rate** is never rounded to 2 dp while an **amount** is — the historical-precision rule
from [[minimise-client-side-calculation]] is now enforced by a component, not by convention
([[money-inputs-distinguish-amounts-from-rates]]); it also fixes a latent no-JS `stepMismatch` on rate
inputs. `<aa-entity-form>` wraps every write form (inline validation, in-flight disable).
`<aa-invoice-entry>` replaces `app.js`'s `enhanceLineEditor` and consumes the server `type` descriptor
without a client type→table switch. A new gate `tools/component-check.mjs` found **two defects** the
moment it ran (the money decimals default; the entity-form message never appearing). Gates: 
`component-check` 19/19, `guest-smoke` 116/116, `grid-preview-check` 14/14, `autocomplete-check` 39/39,
`refdb-check` 12/12, `hotkey-check` 62/62, `print-queue-check` 14/14, `route-snapshot` 50/0. Evidence:
[[component-library-2026-10-09]], [[tb-0037-component-library]]. **Next: `<aa-dirty-guard>` (deferred
pending harness dialog handling), true offset paging, and the render-time measurement.**

**2026-10-09 — return (2) and difference (3) invoice entry verified; a stale gate corrected.** The
2026-10-08 legacy-hub restyle made all four `invoice_types` creatable, but `tools/invoice-check.mjs`
only ever created `type = 1`, so the return/difference write path was unverified and the vault
contradicted itself about whether these were built. Extended the tool with 16 checks over both types
(own `count+1` sequence, negative quantity stored verbatim, difference creates with no party, prices
at 2 dp) — **all green** against a throw-away depot built from a fresh `trail backups trigger`
snapshot. The tool also had a pre-existing red check asserting a persisted `completed` flag that the
withdrawn lifecycle no longer writes; corrected to assert what the design guarantees. Recorded the
2026-10-08 reversal of [[returns-are-negative-quantities]] as a decision
([[invoice-hub-offers-four-types]]) and corrected the stale route comment. Evidence:
[[invoice-type-write-verification-2026-10-09]].

**2026-10-09 — invoice lookup cache (the `invoices` slice).** The owner recalled the deferred
`invoices` cache from [[reference-lists-come-from-indexeddb]]; built it now that the payment picker
lists all invoices. `GET /data/invoices` (ETag/version, 8,931 rows, auth-gated) + `public/js/invoicedb.js`
(IndexedDB `aa-pos-invoices`, lazy, version-keyed) populate the picker; the payment form renders only a
200-invoice fallback, so `/payments/new` dropped **925 KB → 91 KB**. Second load uses the cache
(`data-invoicedb-source="cache"`); the `invoicePickerScope` setting trims it live. Gates green
(`guest-smoke` 116/116, `route-snapshot` 50/0, `autocomplete-check` 39/39, `refdb-check` 12/12,
`hotkey-check` 62/62, `grid-preview-check` 14/14, `print-queue-check` 14/14).
[[browser-settings-are-client-side]], [[tb-0039-settings]].

**2026-10-09 — per-browser settings; the payment picker lists all invoices.** Added a `localStorage`
settings store (`public/js/settings.js`) and a **Settings** screen at `/settings` (linked from the
management hub) — no backend, per the owner's request ([[browser-settings-are-client-side]]). First
preference `invoicePickerScope` (default **all**): the payment form's invoice picker now lists every
non-deleted invoice (8,931; `invoices.pickerInvoices` pages past the 1,000 cap) and the client trims to
open-only when set. Gates green (`guest-smoke` 116/116, `route-snapshot` 50/0, `autocomplete-check`
39/39, `refdb-check` 12/12, `hotkey-check` 62/62, `grid-preview-check` 14/14, `print-queue-check`
14/14). Follow-up in [[tb-0039-settings]]: the ~0.9 MB inline picker should load lazily; the report
"Invoice" filter is still a text box.

**2026-10-09 — print queue now syncs across tabs; "searchable select" explained.** Fixed the print queue
not updating on an open `/print` page until a reload: `print-queue.js` now listens for the `storage`
event (it fires in every other same-origin window, including a parent from the preview iframe) and
repaints ([[print-queue-no-cross-context-sync]]). Also answered the "why isn't this a searchable select"
report: the `autocomplete.js` component is fine — a caused-by-declaration/threshold/scoping note is in
[[why-some-selects-are-not-comboboxes]] (the report's Invoice filter is a text field by declaration; the
print picker is one invoice type and native below 12 options; the report Party filter *is* a combobox).
Gates green (`guest-smoke` 116/116, `route-snapshot` 50/0, `print-queue-check` 14/14).

**2026-10-09 — reports get a windowed "Load more".** The truncated report notice now offers "Load more"
(the current row window plus one cap) beside "Show all", both swapping the body; `reportInfo.moreHref`
reuses the existing `maxRows` query, so no server or spool change was needed. Browser-verified on the
general ledger (26,613 rows): Load more took the table 1000 → 2000 rows with the shell kept and the URL
pushed. It is a windowed step, not offset paging — true append remains a follow-up. Gates green
(`guest-smoke` 116/116, `route-snapshot` 50/0, `verify-spool-reports` 75 binds, `refdb-check` 12/12,
`autocomplete-check` 39/39, `hotkey-check` 62/62, `grid-preview-check` 14/14, `print-queue-check`
14/14). **Next: the component work is done (`<aa-money>`, `<aa-entity-form>`, `<aa-flash>`,
`<aa-invoice-entry>`) and so is the client page cache ([[tb-0038-client-page-cache]]); what remains is
[[runtime-revision-is-unstable]] (may be defeating the server cache), `<aa-dirty-guard>` (deferred
pending harness dialog handling), true offset paging, and the render-time measurement.**
[[htmx-navigation-with-html-fragments]], [[tb-0036-htmx-navigation]].

**2026-10-09 — cash-memo expenses writes are htmx; the write surface is complete.** Extracted
`expenses.listView()` and made the expense save (`/cashmemo/expenses/save`) and delete
(`/cashmemo/expenses/<id>/delete`) re-render the expenses list on an htmx request (the save's error
path shows a red flash rather than a bare 400). With this, management, invoice entry, invoice grid,
payments and cash-memo expenses all write over htmx; the only write still on a full load is the invoice
**new** create, which navigates to the entry page. Gates green (`guest-smoke` 116/116, `route-snapshot`
50/0, `refdb-check` 12/12, `autocomplete-check` 39/39, `hotkey-check` 62/62, `grid-preview-check`
14/14, `print-queue-check` 14/14). **Next: the component work — `<aa-money>`, then `<aa-entity-form>`
and the invoice-entry component (consuming server descriptors); plus report load-more pagination and
the render-time measurement.** [[htmx-navigation-with-html-fragments]], [[tb-0036-htmx-navigation]],
[[tb-0037-component-library]].

**2026-10-09 — payments writes are htmx (no reload).** Extracted `payments.listView()`/`newView()` and
made the payment create (`POST /payments`) and delete (`/payments/<id>/delete`) re-render the list on
an htmx request — the create's failure path re-renders the new form with the error rather than a bare
400. The payments filter APPLYs as a fragment. Also fixed the earlier URL residue: management and
payments write forms now push the list URL, so a refresh reloads the list instead of the POST action
or `?new=1`. Gates green (`guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check` 12/12,
`autocomplete-check` 39/39, `hotkey-check` 62/62, `grid-preview-check` 14/14, `print-queue-check`
14/14). **Next: the cash-memo writes (last of "C"); then `<aa-money>` and the invoice-entry component.**
[[htmx-navigation-with-html-fragments]], [[tb-0036-htmx-navigation]].

**2026-10-09 — invoice grid save is htmx (no reload).** Extracted `invoices.gridView()` and made the
grid save `/invoices/<id>/lines` (SAVE LINES and the row remove op) re-render the grid fragment on an
htmx request, with the failure path re-rendering the grid and showing the message as a red flash (htmx
does not swap a bare 4xx body). The grid's client recalc re-inits on the swap. Browser-verified a
no-op save on a real invoice (flash, shell live, navigation count 1, URL unchanged); the request body
confirmed htmx includes the clicked submitter, so the remove op travels too. Gates green
(`guest-smoke` 116/116, `route-snapshot` 50/0, `grid-preview-check` 14/14, `refdb-check` 12/12,
`autocomplete-check` 39/39, `hotkey-check` 62/62, `print-queue-check` 14/14). **Next: payments and cash
memo writes; then `<aa-money>` and the invoice-entry component.**
[[htmx-navigation-with-html-fragments]], [[tb-0036-htmx-navigation]].

**2026-10-09 — invoice entry writes are htmx (no reload).** Extracted `invoices.entryView()` and made
the entry writes — line add, line remove, header save, complete/reopen — re-render the entry screen
(flash included) on an htmx request instead of a 303; a plain POST still 303-redirects. The entry page
is what `/invoices/new` lands on, so this covers the create-then-edit flow. Gates green (`guest-smoke`
116/116, `route-snapshot` 50/0, `refdb-check` 12/12, `autocomplete-check` 39/39, `hotkey-check` 62/62,
`grid-preview-check` 14/14, `print-queue-check` 14/14). **Next: the invoice grid save (`/lines`, needs
the client recalc re-init), then payments and cash memo; then `<aa-money>` and the invoice-entry
component.** [[htmx-navigation-with-html-fragments]], [[tb-0036-htmx-navigation]], [[tb-0037-component-library]].

**2026-10-09 — management write surface is htmx (create/update/delete without a reload).** The
create/update/delete routes now answer an htmx request with the list **fragment** (flash included)
instead of a 303, sharing one `management.listView()` builder with the GET route so the write's list
and the GET's list cannot drift; a plain POST still 303-redirects. The entity form and row delete form
are `hx-boost` into `#app-main` with `hx-push-url="false"` and htmx's own `hx-confirm`. Flash now
appears without a reload on management writes. Gates green (`guest-smoke` 116/116, `route-snapshot`
50/0, `refdb-check` 12/12, `autocomplete-check` 39/39, `hotkey-check` 62/62, `grid-preview-check`
14/14, `print-queue-check` 14/14). **Next: convert the invoice/payments/cash-memo writes the same way
and build `<aa-entity-form>` on it, then `<aa-money>`.**
[[htmx-navigation-with-html-fragments]], [[tb-0036-htmx-navigation]], [[tb-0037-component-library]].

**2026-10-09 — native component library started; entity field conditions.** The owner proposed
schema-driven, reusable components; the platform already declares entities in `entities.json`, so the
work is to extend that model and add thin light-DOM components that consume server descriptors
([[components-consume-server-descriptors]]). Shipped: **`<aa-live-time>`** replacing the `app.js`
clock that painted seconds on a 30 s interval; **entity field `hidden`/`disabled` mode predicates**
resolved in `management.formFields()`; and a **read-only `view` mode** (`?view=<id>`, the eye icon)
that disables every field. Gates green (`guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check`
12/12, `autocomplete-check` 39/39, `hotkey-check` 62/62 — harness now polls the APPLY URL instead of
sleeping, `grid-preview-check` 14/14, `print-queue-check` 14/14). **Next: `<aa-entity-form>` with the
write surface (C) + flash OOB, then `<aa-money>` and the invoice entry component.**
[[tb-0037-component-library]].

**2026-10-09 — htmx slice 3: report filters as fragments, plus a modal-swap fix.** Applying a report
filter (inline and the `stockreport`/`difference` Filter Data dialog) now swaps the report into
`#app-main` with `hx-push-url` instead of reloading, and the "Show all" / "latest period" notice links
are boosted. The work surfaced a real component bug: `<aa-modal>` appends its overlay to `<body>`, so
any htmx swap of the page left the overlay behind (a stuck backdrop when the dialog was open);
`disconnectedCallback` now removes it with the host. All gates green (`guest-smoke` 116/116,
`route-snapshot` 50/0, `refdb-check` 12/12, `autocomplete-check` 39/39, `hotkey-check` 62/62,
`grid-preview-check` 14/14, `print-queue-check` 14/14). **Next: true load-more pagination (the "Show
all" cliff), then measure render time before converting the write surface.**
[[htmx-navigation-with-html-fragments]], [[tb-0036-htmx-navigation]].

**2026-10-09 — htmx slice 2: navigation breadth + OOB chrome.** The link-only hubs and indexes
(dashboard, reports, ledgers, invoices, cash memo, management) are now `hx-boost`-ed, so tile clicks
swap the body instead of reloading the document; the job indicator's manual refresh re-renders the
current page as a fragment rather than `window.location.reload()`; and the `aa-refdb-version` meta is
updated out-of-band by each fragment, with `__AA_REFDB__.reload()` re-syncing the IndexedDB cache when
it moves. All gates re-run green (`guest-smoke` 116/116, `route-snapshot` 50/0, `refdb-check` 12/12,
`autocomplete-check` 39/39, `hotkey-check` 62/62, `grid-preview-check` 14/14, `print-queue-check`
14/14). Decision and remaining work: [[htmx-navigation-with-html-fragments]], [[tb-0036-htmx-navigation]].
**Next: report filter APPLY + pagination as fragments, then measure render time before converting the
write surface.**

**2026-10-09 — navigation is htmx over server-rendered fragments (first slice).** Asked whether SSR
could become a React SPA or htmx, the owner chose **htmx** — it keeps minijinja and the declarative
page model, adds no build step, and stops the app shell re-rendering on every navigation
([[htmx-navigation-with-html-fragments]]). Built and browser-verified: `views/layout.html.jinja` renders the
body block only when the request carries `X-Requested-With` (htmx's own `HX-Request` is not in the
host's header allowlist, so the layout sends `X-Requested-With` via `hx-headers`); the rail and topbar
brand are boosted into `#app-main`; `app.js` scopes its content enhancers to a root and re-runs them on
`htmx:afterSwap`, and `autocomplete.js` exposes `enhanceAll(root)`. Measured `/dashboard` 10,901 B →
**3,034 B** fragment, `/reports/profit` 94,566 → 86,679 B; a real-browser nav click left the shell node
live and the navigation count at 1; `route-snapshot` **50 routes, 0 erroring**. `tb-0036` carries the
follow-ups: stale document title, the un-swapped `aa-refdb-version` meta, boosting safe content links,
and the remaining gates. **Next: those follow-ups, plus the migration's existing UI work.**

**2026-10-08 — the print queue was rebuilt to match legacy.** `/print` is now the legacy picker
(Invoice Type + Invoice No → View Invoice, a preview iframe, and a Queue rail) and `/print/queue` is
the legacy queue page; the queue is **browser-local** (`localStorage` `print-queue`), exactly as
legacy's was, and the sheet carries the legacy "Print Invoice Now" + "Add to Print Queue" actions.
The old server-side batch (the `print.run` durable job and the "Recent runs" form) was removed. The
single view and the queued batch now render from one sheet builder (`app/lib/invoice-sheet.js` +
`partials/invoice-sheet.html.jinja`), so a printed sheet cannot diverge from the on-screen one. `guest-smoke`
**116/116**, `route-snapshot` **50/0**, and a new real-browser harness
`tools/print-queue-check.mjs` **14/14** drives the whole flow (preview, add, dedupe, rail, print, remove,
clear). Evidence: [[print-queue-parity-fix-2026-10-08]]; the decision:
[[print-queue-is-browser-local-like-legacy]]. **Next: A2 continues — the report filter modal and the
per-screen shape differences — plus the unbuilt return/difference invoice entry.**

**2026-10-08 — restyle increment A0/A1 + the cheap A2 items.** Part B was committed first (the
IndexedDB ref store; gates re-run green: `guest-smoke` 115/115, `refdb-check` 12/12). Then: the guest
capture set was refreshed and diffed against the frozen legacy captures (`ui-parity-report` — 28
screens, 28 still differing, but the specific groups narrowed); the shared shell was aligned (link
colour `gray-7`, the emoji font faces, black management table borders); the rail was cut to the five
legacy destinations + Logout with the extras behind the foot menu; the management list became a bare
search row + table with create behind `?new=1`; the dashboard `Overview` card was removed and the Cash
Memo tile glyph corrected; and report dates became `<aa-date-input>`
([[features-as-native-web-components]]). All gates green (`autocomplete-check` 39, `hotkey-check` 62,
`grid-preview-check` 14, `route-snapshot` 49/0). Evidence and the residual list:
[[ui-parity-restyle-progress-2026-10-08]]. **Next: A2 continues — the report filter modal and the
per-screen shape differences — plus the unbuilt return/difference invoice entry.**

**2026-10-08 (later) — the UI was diffed 1-1 against the live legacy bundle.** Operator-supplied
credentials (`user`/`admin`) let `ui-capture.mjs --system both` capture all 28 screens from BOTH apps
for the first time, so the comparison is no longer guest-vs-stored-capture. The rail is now compared by
membership and order: the live legacy rail carries **six** destinations including **Orders** (the
earlier "five" was wrong), the management hub is ordered the **reverse** of the guest's, and legacy
`/app/invoices` is a **five-tile hub** where the guest has a list. Exact list and the actionable
residuals: [[ui-parity-discrepancies-2026-10-08]]; raw diff
`vault/attachments/ui-capture/parity.json`.

**2026-10-07 — the mandate changed and Part B shipped.** [[parity-reinstates-the-legacy-look-with-defect-fixes]]
puts the legacy look back on the critical path (step 7 reopened), and
[[reference-lists-come-from-indexeddb]] adds a client IndexedDB reference store. Built and verified:
`GET /data/refs` (98 KB, ETag/304), `public/js/refdb.js`, the `autocomplete.js` in-place refresh,
`data-ref` on every searchable select, `POST /quick-create` + `public/js/refdb-create.js` for the
no-reload create, and `tools/refdb-check.mjs` (**11 passed**); `autocomplete-check` 39 passed and
`route-snapshot` 49 routes / 0 erroring after. Next: **A0** (rebuild the UI capture diff against the
live legacy bundle), then **A1** (shared shell), then the screen-by-screen restyle. Plan:
`.kilo/plans/1791404570000-legacy-look-and-indexeddb-refs.md`.

**Step 7 is the live work and is now effectively complete** (2026-10-05). Every requested item and every
capability gap in [[tb-0023-guest-feature-parity]] has a guest equivalent: the create-from-the-invoice
affordance ([[quick-create-rides-in-the-form-that-needed-it]]), the searchable autocomplete, the "fewer
rail buttons" menu, sortable management tables plus a view action (item B), the report invoice column as
a type-lettered link (item F), and sale-price adjustment as a per-line edit with the list price shown
beside it (reading (a), [[sale-price-adjustment]]). The category-5 ruling is "keep the extra screens as
additions". What is left is not work against a screen: the report-filter-gating question (legacy filter
modal vs the guest's inline row) and two "take or leave" suggestions (remember the last filters; show the
sale price wherever the cost is shown). The invoice **grid** still lacks the create-from-the-invoice
affordance because its item selects are repeated-name arrays in one form — per-row work, recorded rather
than half-built.

**Step 15 is DONE (2026-10-05)** — [[tb-0030-retire-the-route-ts-dispatcher]]. Every route is a folder
(~73 `route.ts` files), `_app/route.ts` is deleted, and `app/config/app.config.json` is `mode: crawler`;
the dispatcher's `router.js` role is `app/lib/route-kit.js`, and page manifests now use filter/column
presets. `tools/guest-smoke.mjs` is at **112 checks**, all green. Deferrals (all recorded in tb-0030): the
host poller now resolves `/jobs/reconcile` through the generic router (a Rust change, wasm rebuilt), and
the config-driven scheduler plus a folder-aware `feature-parity`/`route-inventory` rewrite remain
follow-ups.

**Next: step 16** (three generic artifacts) — **step 17 is SKIPPED (2026-10-06)**. Its premise was
wrong: the report SQL runs in **~0.05–1.2 s** and never approached the 20 s deadline (`node
tools/report-sql-time.mjs --repeat 5`: "no statement exceeds 20 s on its own"). The slowness measured
on 2026-10-04 was **JS reprocessing in the route handlers** — the `[mview] hydrate` of views the route
never read — removed **2026-10-03** in `d8b5a8e3`; the SQL was never changed. See the correction in
[[report-cost-on-a-whole-database]] and the skipped task [[tb-0033-trigger-maintained-report-tables]].

The other open items in the sequence: ~~**step 17** (trigger-maintained Tier 2 materialised tables)~~
**skipped 2026-10-06**; ~~**step 15** (retire `route.ts`)~~ **done**; **step 19** was the measurement
that produced step 17, so its premise is the same wrong one and it needs revisiting rather than acting
on.

```text
[x] 1. Design and validate the TrailBase schema          -> 17 tables, 17 record APIs
[x] 2. Decide where report arithmetic lives              -> SQL in runtime .sql files (was: JS under app/compute/)
[x] 3. Build the guest read screens                      -> dashboard, 10 reports, 4 ledgers
[x] 4. Build the guest management screens                -> 7 entities
[x] 5. Prove the numbers match the old views             -> differential 14/14 (no longer re-runnable; see open decision 5)
[x] 6. Adopt the guest-WASM app platform                 -> runtime-js host (Phase 0 + app host port)
[x] 6a. Flatten the layout, drop the guests spike        -> [[tb-0024-flatten-new-system-layout]]
[x] 7. Guest feature parity, plus a better UI   -> [[tb-0023-guest-feature-parity]] (retitled 2026-10-05 from "Direct-shift the legacy UI"; the mandate is now [[parity-is-functional-not-visual]]; every requested item and capability gap addressed 2026-10-05 — residual: the report-filter-gating question, two take-or-leave suggestions, and the invoice grid's create affordance)[x] 7a. Invoice / payment / inventory screens + mobile   -> [[tb-0028-guest-transactional-screens-and-mobile]] (done 2026-09-29)
[x] 8. Build invoices / cash memos / printing on the guest -> [[tb-0021-invoices-cashmemos-printing]] (done 2026-09-29)
[x] 8a. Invoice lifecycle, spreadsheet grid, standalone document -> [[guest-invoice-lifecycle]] (done 2026-09-29)
[x] 9. Verify and finish the guest v1 (PocketBase) import -> done 2026-09-29, 60,245/60,245, sums match
[x] 10. Decide the cutover shape                          -> [[cutover-is-guest-only]] — SHAPE B, GUEST ONLY (2026-10-03)
[--] 11. Repoint or retire the legacy Next.js client     -> SUPERSEDED by [[cutover-is-guest-only]]: no source exists
[--] 12. Recover the dropped-view endpoints on the legacy side -> SUPERSEDED: there are no legacy screens left
[x] 13. Migrate the production data                       -> [[pos-0027-migrate-production-data-to-trailbase]] (done 2026-09-29)
[--] 14. Gate the component split on a parity oracle      -> gate WAIVED by [[legacy-parity-checks-waived]]; became [[tb-0032-manifest-first-refactor]]
[x] 15. Retire the route.ts dispatcher (file-router conventions, no data DAG) -> [[tb-0030-retire-the-route-ts-dispatcher]] (done 2026-10-05: ~73 route folders, dispatcher deleted, mode: crawler; guest-smoke 112)
[--] 16. Three generic artifacts: composer + separate      -> [[component-split-and-sql-materialised-tables]] (SKIPPED 2026-10-06 by the operator: its driver was the report perf cliff, which was a wrong measurement — the SQL runs in ~0.05-1.2 s; see [[report-cost-on-a-whole-database]]. It is now a pure architecture/packaging goal, not a fix, and the operator chose not to spend the Rust/build effort on it)
[--] 17. Trigger-maintained Tier 2 materialised tables    -> [[tb-0033-trigger-maintained-report-tables]] (SKIPPED 2026-10-06: the premise was wrong — the SQL runs in ~0.05-1.2 s and the slowness was JS reprocessing in the route handlers, fixed 2026-10-03)
[x] 18. Remove the code the reference graph proves dead  -> [[tb-0031-remove-proven-dead-code]] (done 2026-10-01: 13 guest exports, 5 Rust items, 5 orphaned tools; `jobs.rs` kept, see open decision 6)
[--] 19. Measure and bound report cost on a whole database -> [[report-cost-on-a-whole-database]] (measured 2026-10-04; its SQL claim was WRONG — see the note's correction — so the step-17 promotion it caused is withdrawn and this step needs revisiting)
[x] 20. Second dead-code sweep (dashboard counts, orphan manifest seam, orphan template) -> [[tb-0042-dead-code-sweep-2026-10-11]] (done 2026-10-11: `baseviews.counts`+`counts.sql`, `manifests.jobs/all/invalidate`, `partials/report_meta.html`, one Rust `unused_mut`; open candidates listed, not actioned)
```

**Step 19 is new, and it reorders 16 and 17.** On 2026-10-04 the depot was rebuilt and re-imported
from the legacy oracle (60,245/60,245, 0 failed — [[fresh-import-and-whole-database-digest-2026-10-04]])
and the report path measured against it for the first time. ~~The result: every one of the fourteen
report screens answers **200** and the slowest page is **186 ms**, but **six of the fourteen SQL
statements exceed the ~20 s WASM call deadline on their own**, best-of-3, with no host overhead at all
(`ledgers/booker` 29.1 s, `ledgers/party` 20.6 s). The cost is in the shared `prelude.sql`, which
every payments report pays, so the fix is the one already chosen for open decision 2 — **step 17
before step 16**.~~ **CORRECTED 2026-10-06:** the page figures stand, but the SQL claim does not — the
statements run in ~0.05–1.2 s and the slowness was JS reprocessing in the route handlers, removed
2026-10-03 (`d8b5a8e3`). Neither ordering nor step 17 survives this; see
[[report-cost-on-a-whole-database]]. One O(rows × dates) term was removed along the way, and the
account of how much it was worth had to be corrected from 3× to 9%:
[[ledger-party-correlated-balance-was-the-whole-cost]].

**Step 10 used to gate steps 11 and 13.** It no longer gates anything in the way it was written,
because its answer made both of them impossible rather than shaping them. Step 13 turned out not to
depend on the cutover at all — the data was already imported on 2026-09-29, before the question was
answered, which is why this sequence was stale for so long.

**Step 7a was a demonstration slice, not steps 7 or 8.** On 2026-09-29 the guest gained `/invoices`
(sale + purchase entry), `/payments` (invoice-linked and standalone DA) and `/inventory` (live
stock, item edit), plus a mobile layout for every page. See
[[mobile-layout-is-additive-to-the-legacy-look]] for the one decision it settled.

**Step 7 is still open, and it is now harder.** The guest UI is still not the legacy look, and the
legacy look can no longer be read from source. It has to come from the captured screenshots in
[[legacy-ui-reference-captures]] and from rendering the frozen bundle.

**Step 16 is measured and decided (2026-09-28).** The all-reports sweep priced the cross-component
handoff at **+71% (median) on like-for-like acquisition, slower in 14/14 reports**, so the request
path is **composed into one component** and separate components are reserved for off-request work.
The apparent −31% end-to-end win came from skipping normalisation the guest still has to perform, not
from the boundary. See [[component-split-and-sql-materialised-tables]].

**Step 14's parity gate is waived (2026-10-02).** The condition this paragraph used to impose — a
golden-output corpus and an N-way differ — was waived in [[legacy-parity-checks-waived]], and the
legacy views and their parity gates are deleted. It survives as [[tb-0032-manifest-first-refactor]],
high priority: `meta.json` names the SQL files, `spoolreports.js` becomes a loader instead of a
registry, `compute/views.js` and `app/lib/reports.js` retire behind a SQL manifest, and the
dispatcher learns manifest-declared handlers. It still gates 15–17 in the sense that the component
split should follow it rather than precede it.

## Report performance

> **STALE as a current measurement — kept as history.** The 2026-09-28 numbers below were measured on
> a JavaScript report engine. The engine has since been **replaced by SQL**, which is what fixed the
> deadline cliff: `profit`, `itemsales`, `paymentsbycompany` and `ledgers/general` all return **200 in
> 100–165 ms** on the production depot today. See [[heavy-report-blocks-runtime-threads]] and
> [[paymentsbycompany-performance-2026-10-02]]. Do not read the "20 s → 500" rows as current.

**Fresh-import baseline, measured 2026-09-28** on a depot rebuilt from the production copy (60,245
records, 0 import errors), `--runtime-threads=4`, cold = first view of a filter. Reproduce with
`trailbase/tools/report-bench.mjs "auth_token=<jwt>"`:

| report | cold | warm | payload |
|---|---|---|---|
| difference | 35 ms | 69 ms | 35 KB |
| dailysale | 63 ms | 102 ms | 165 KB |
| stockreport | 383 ms | 78 ms | 47 KB |
| payments | 2,344 ms | 171 ms | 310 KB |
| ledgers/area | 8,907 ms | 93 ms | 136 KB |
| salesreport | 9,900 ms | 83 ms | 306 KB |
| ledgers/booker | 15,510 ms | — | 5 KB |
| **itemsales** | **20,024 ms → 500** | 20,051 ms | deadline |
| **profit** | 500 | 20,021 ms | deadline |
| **paymentsbycompany** | 20,029 ms → 500 | 500 | deadline |
| **ledgers/general** | 20,038 ms → 500 | 500 | deadline |

Four reports at the deadline, matching the previously recorded cliff. A single
`POST /reports/refresh?full=1` that rebuilds **all** views also exceeds it (20.03 s → 500), so the
snapshot must be built **lazily per report** — individual report builds do fit (11.0 s stockreport,
7.2 s dailysale).

Two new findings came out of this run:

- [[persisted-snapshot-can-be-stamped-current-while-empty]] — a **new defect**. After the import every
  report rendered "No data" while the guest had all 60,245 rows. The persisted snapshot is stamped
  with the whole-database fingerprint even when the views inside it are empty, and `?full=1` cannot
  recover because `invalidate()` is in-memory only. Needs an out-of-band
  `DELETE FROM mview/mview_meta/pagecache` plus a restart.
- The import itself is verified end-to-end: 60,245 / 60,245, 0 failed, per-collection
  `read == created`, and the link counts (5 booker, 13 party) plus the 8,927 dropped
  `invoice_maker` match the recorded reference exactly.

Shipped since: a fingerprint-keyed **materialised view snapshot** shared through SQLite
([[snapshot-persistence-hits-the-20s-deadline]]), a **rendered-page cache** for repeat views
([[rendered-page-cache]]), and a **render row cap** (1,000 rows/page, `?all=1` for the full page,
[[report-render-row-cap]]). Baseline + comparison: [[report-performance-baseline]].

## Open decisions (2026-10-03)

The questions that are actually blocking, each with the note that holds the options. Nothing here is
being worked around silently.

| # | Question | Options on the table | Note |
|---|---|---|---|
| 1 | ~~**Cutover shape**~~ — **DECIDED 2026-10-03: shape B, guest only.** Shape A was never available, because `frontend/` was deleted from git on 2026-09-29 | settled | [[cutover-is-guest-only]] |
| 2 | ~~**Report cold path**~~ — **decided 2026-09-28.** SQL aggregation won: report results move into trigger-maintained materialised tables, which also satisfies `reports.no_precomputation` because Tier 2 cannot disagree with its base table. ⚠️ **2026-10-06: the 2026-10-04 promotion is WITHDRAWN.** The measurement behind it was wrong — the report SQL runs in ~0.05–1.2 s and never neared the 20 s deadline; the slowness was JS reprocessing in the route handlers, removed 2026-10-03 (see [[report-cost-on-a-whole-database]]'s correction). Step 17 ([[tb-0033-trigger-maintained-report-tables]]) is **skipped**, and this decision is not on the critical path | chosen: SQL aggregation + trigger maintenance | [[component-split-and-sql-materialised-tables]], [[report-cost-on-a-whole-database]] |
| 3 | **Date defaults on report routes** — three named options, none chosen | declared, code, or per-request | [[report-routes-ignore-date-defaults]] → **resolved 2026-10-02**, see [[report-default-window-comes-from-the-data]] |
| 4 | **General Ledger opening balances** are not persisted anywhere, so the ledger cannot reproduce a historical balance | carry forward, compute, or persist | [[guest-frontend-feature-parity-gaps]] §4 |
| 5 | **The 14/14 parity gate is gone** and nothing replaced it. Re-baseline against a fresh import, mark it historical, or rebuild a differential | **partly answered 2026-10-02**: exact output parity is **waived**, and `verify-spool-reports.mjs` is now a self-consistency gate | [[legacy-parity-checks-waived]], [[guest-parity-differential-not-reproducible]] |
| 6 | ~~**The host's `jobs` surface**~~ — **decided 2026-10-01: KEEP `jobs.rs`.** A dead-code sweep confirmed the module is unreachable (the host never calls it) and still holds scratch working notes, but it is the only record of the intended TrailBase scheduler design, so it stays along with `init.rs::ensure_global_init`, whose only caller is `jobs.rs:29`. Their nine `dead_code` warnings are expected — a future sweep must **not** delete them | keep, unchanged | [[tb-0031-remove-proven-dead-code]], [[trailbase-host-jobs-module-never-called]] |
| 7 | ~~**Integer cents for money**~~ — **split into two stages 2026-09-28.** SQL now owns the rounding site using the same `printf('%.2f')` legacy used, so float parity is achievable and comparable line for line. The `INTEGER` cents migration follows only after the float path is verified and finalised, as a separately-verified change. `qty` and `box_size_qty` stay `REAL` — they are legitimately fractional. ⚠️ **Note: integer cents was DECLINED on 2026-10-01**; money is 2 dp everywhere | stage 1: `REAL` + `printf` (parity); stage 2: declined | [[money-is-2dp-everywhere]], [[tb-0015-integer-cents-for-money]] |
| 8 | **Licensing — two separate findings.** (a) The `trailbase-wasm` **dependency** declares `OSL-3.0`, not a permissive licence, and vendors no `LICENSE` file — this was assumed to be MIT and is not. (b) The **host crate's own upstream** publishes no LICENSE, as its README has always warned. The component split makes both blocking, because splitting means distributing | confirm upstream terms, or add a LICENSE | [[trailbase-wasm-osl-3-0-licence]], [[trailbase-host-upstream-crate-license-unresolved]] |
| 9 | **Leftover host endpoints** — `/count/{table}` (unauthenticated, SQL injection), the `/api` 200 mock, 404-for-everything, `/getscripts` | delete vs gate | [[tb-0025-host-endpoint-hygiene]] |

Two vault hygiene issues surfaced alongside: `tb-0020` is `status: done` with three unticked boxes
(KV cache eviction, materialised views, a background refresh job), and **no task in the vault has a
`due` field at all**.

## What has already been decided

| Decision | Note |
|---|---|
| Drop SQL views; aggregate in the client | [[trailbase-drop-sql-views]] |
| Enumerations are integer codes + FK | [[trailbase-encode-enums-as-integer-codes]] |
| Multi-valued relations become link tables | [[trailbase-link-tables-over-json]] |
| Split the host into generic components; SQL owns report arithmetic | [[component-split-and-sql-materialised-tables]] |
| Money is 2 dp everywhere (**supersedes** integer cents) | [[money-is-2dp-everywhere]] |
| Retire `route.ts` with file-router conventions; the JSON data DAG is withdrawn | [[file-router-conventions-not-a-data-dag]] |
| Keep the PocketBase timestamp format | [[trailbase-pocketbase-data-compatibility]] |
| Pages are declarative manifests | [[trailbase-declarative-page-host]] |
| Reports refresh incrementally from a warm snapshot | [[trailbase-incremental-report-refresh]] |
| Data migration is a browser-side plugin | [[trailbase-client-side-migration-plugin]] |
| The legacy stack stays live until parity — **still accepted**; its "until a cutover is explicitly decided" clause is spent | [[keep-legacy-stack-in-production]], [[cutover-is-guest-only]] |
| The app platform is TrailBase guest-WASM, business JS evaluated at runtime | [[trailbase-guest-wasm-runtime-defaults]] |
| The app host is the runtime-js QuickJS component; rendering is folded in | [[runtime-js-single-host]] |
| Guest reads by SQL ordered `-id` and sorts with `compareText` | [[deterministic-sort-and-sql-reads-in-guest]] |
| Guest writes go through `db.execute`; ids URL-safe base64, BLOBs via `unhex(hex)` | [[guest-writes-via-sql]] |
| The hex/base64 id codec is Rust (`api/ids.rs`), exposed as a sync `Function::new` bridge | [[guest-helpers-pure-vs-cached]], [[guest-bridges-are-function-new-not-export]] |
| Jobs run in-process on a durable, leased, idempotent SQLite queue | [[jobs-in-process-durable-queue]] |
| Guest data refresh is fingerprint-based and incremental | [[guest-fingerprint-refresh]] |
| Report results are cached in the KV store | [[guest-report-result-cache]] |
| Convert the base views to SQL | [[convert-base-views-not-derivations]] |
| Guest has an outbound HTTP bridge; the app's own `/login` sets the cookies | [[guest-outbound-http-and-login]] |
| The guest UI is a direct shift of the legacy UI, not a redesign | [[guest-ui-is-a-direct-shift-of-legacy]] |
| Compiled artifacts are generic capabilities; all app/data logic stays in runtime files | [[compiled-artifacts-are-generic-capabilities]] |
| Rendered report pages are cached by the live data fingerprint | [[rendered-page-cache]] |
| Report pages cap rendered rows (1,000; `?all=1` for the full page) | [[report-render-row-cap]] |
| Parity reinstates the legacy look, with legacy defects fixed rather than copied (**supersedes** the visual-freedom half of [[parity-is-functional-not-visual]]) | [[parity-reinstates-the-legacy-look-with-defect-fixes]] |
| Dropdown reference lists come from an IndexedDB store synced from the server | [[reference-lists-come-from-indexeddb]] |
| Interactive features are reusable native web components that enhance working markup | [[features-as-native-web-components]] |
| Navigation is htmx `hx-boost` over server-rendered HTML fragments; the shell renders once | [[htmx-navigation-with-html-fragments]] |
| UI components are light-DOM custom elements that consume server descriptors (never own schemas) | [[components-consume-server-descriptors]] |
| Per-browser UI preferences live in localStorage (no backend), edited at `/settings` | [[browser-settings-are-client-side]] |
| The import tool is recreated as a native **Go GUI** control panel, toolkit **go-gui** (pure Go, not Fyne); SQLite driver stays CGO | [[control-panel-gui-is-pure-go]] |

## Known friction in the migration

- **⚠️ The legacy stack has no source.** `backend/` and `frontend/` were deleted from git on
  2026-09-29 (`c167d311`); `legacyforparity/` is untracked, git-ignored, and (for the frontend) a
  compiled bundle with no `src/`. Any plan in this vault that reads, edits or rebuilds them is
  describing something that cannot be done. See [[cutover-is-guest-only]].
- **Views are gone, so view-shaped endpoints are gone.** `transaction_view`, `invoice_view`,
  `items_report`, `ledger_*`, `payments_view`, `net_price` and `outstanding_summary` have no
  TrailBase equivalent; their arithmetic moved into the guest and has since moved to SQL. No legacy
  screen is left to break — [[tb-0013-rework-report-screens-without-views]] is superseded, not
  unfinished.
- **Ids change shape.** PocketBase's 15-character `'r…'` ids become UUIDv7. Anything that stored an id
  outside the database — printed invoices, QR payloads — needs remapping, or the migration must
  insert with `uuid_parse()` and keep the old ids. Migration writes take canonical UUID text; reads
  and URL paths use url-safe base64. That asymmetry is a real footgun; see [[api-contract-trailbase]].
- **Naming is unresolved.** `items.category` renders as "Company", and there is now a real
  `companies` table. [[tb-0014-point-company-fields-at-companies]] — ⚠️ and
  [[categories-is-the-company-list]], which reverses an earlier claim about which table the label
  means.
- **The old scaffold's frontend is in git but not in the tree.** `frontend-tb/` was written against
  the *earlier* TrailBase scaffold (names `products`, `companies2parties`, `partiesEnumType`, TEXT
  enums) and is deleted from the working tree but still in history; it needs renaming before it
  could talk to this schema. See [[previous-vault-recovery]].
- **Two wrong path references.** `trailbase/README.md` cites `../full_database_schema.sql`, and the
  preserved-view SQL path points at a directory that does not contain it. Corrected in the README on
  2026-10-03 with a pointer here; the underlying issue is [[stale-schema-sql-paths]].
- **The old Node frontend is gone.** `frontend-ssr/` was deleted on 2026-09-27
  ([[guest-ui-is-a-direct-shift-of-legacy]]); the guest's `trailbase/runtime/` is now the app.
  Anything that pointed at `frontend-ssr/` is superseded.

## Open tasks

| Task | What |
|---|---|
| [[tb-0012-wire-nextjs-frontend-to-trailbase]] | **BLOCKED — impossible.** No `frontend/` source exists to give a data layer |
| [[tb-0013-rework-report-screens-without-views]] | **BLOCKED — impossible.** No legacy screens left to rework |
| [[tb-0014-point-company-fields-at-companies]] | resolve the "Company" naming collision — ⚠️ [[categories-is-the-company-list]] probably settles it |
| [[tb-0017-adopt-trail-runtime-js]] | adopt the QuickJS runtime-JS host as the platform engine — host items remain |
| [[tb-0018-port-app-host-on-runtime-js]] | port the app host (reports parity; management/invoices left) |
| [[tb-0020-guest-fingerprint-refresh]] | fingerprint-based incremental data refresh — done, but three boxes unticked |
| [[tb-0022-move-reports-to-sql]] | move report arithmetic into runtime SQL files — largely done |
| [[tb-0023-guest-feature-parity]] | make the guest UI match legacy, screen for screen — ⚠️ no legacy source to compare against |
| [[tb-0025-host-endpoint-hygiene]] | leftover host endpoints |
| [[tb-0030-retire-the-route-ts-dispatcher]] | retire `route.ts` |
| [[tb-0032-manifest-first-refactor]] | manifest-first reports; gate it on `route-snapshot.mjs` |
| [[tb-0026-attribute-imported-invoice-maker-to-logged-in-user]] | attribute imported invoice authorship |
| [[tb-0035-direct-sqlite-v1-importer]] | **done 2026-10-06** — standalone TUI that writes `main.db` directly, preserving `created`/`updated` and attributing `invoice_maker` to a chosen `_user` ([[v1-direct-import-tool]]) |
| [[tb-0036-htmx-navigation]] | **doing 2026-10-09** — htmx boosted navigation over server-rendered fragments; slice 1 built and browser-verified, follow-ups open |
| [[tb-0037-component-library]] | **doing 2026-10-09** — `<aa-money>`, `<aa-entity-form>`, `<aa-flash>` and `<aa-invoice-entry>` built, wired and gated ([[component-library-2026-10-09]]); `<aa-dirty-guard>` deferred |
| [[tb-0038-client-page-cache]] | **done 2026-10-10** — client fragment cache keyed on the data version ([[guest-page-cache]]); `pagecache-check` 14/14 |
| ~~[[tb-0015-integer-cents-for-money]]~~ | **declined**; money is 2 dp everywhere |
| ~~[[pos-0027-migrate-production-data-to-trailbase]]~~ | **done** 2026-09-29 |
| ~~[[pos-0028-decide-cutover-plan]]~~ | **done** 2026-10-03 — [[cutover-is-guest-only]] |
| ~~[[pos-0029-rebuild-v1-import-on-guest]]~~ | **done** 2026-09-29 |

### 2026-10-01 — framework complete, SQL-only

The authoring work is done and the app runs entirely on SQL. What changed, in order:

| | before | after |
|---|---|---|
| report definitions | two copies, already divergent on money | one `meta.json` |
| `/p/<slug>` | shell + 171-line client driver + 8,242 KB JSON | server-rendered, 465 KB HTML |
| client JavaScript | 504 lines, 2 files | 378 lines, 1 file |
| report engine | 577-line JS engine + `useJs` escape hatch | SQL only |
| report verification | JS-vs-SQL parity, unreproducible | self-consistency, absolute standard |
| SQL surface | `sqlite.*`, JSON string round-trip | `sql.*`, statement guard, no round-trip |
| routing | hard-coded catch-all | `app.config.json`: crawler or dispatcher |
| `/count/{table}` | unauthenticated, injected, wrong count | authenticated, identifier-constrained, correct |
| `/` | app's job | host's, redirects by auth state |

Two money bugs were fixed as a side effect of the unification, both because the two definitions had
drifted: `/reports/payments` showed a "Payable Amount" that was not the sum of the three rows above
it (10,852,251.43 against 6,950,631.20), and the `/p` company filter offered zero options because it
read an empty table.

**What is deliberately not done.** The money pass. `productsale`'s footer is 2 paisa above the sum of
its own column, because the statement renders that column with `printf('%.2f')` (round-half-to-even)
while the app's money rule is round-half-up — a real statement defect, now that there is no JS to
match. That and the rest of the arithmetic want the production data and an agreed reference, which is
deferred to the end of the migration by decision ([[legacy-parity-checks-waived]] waives exact
parity, not correctness of the output the replacement produces).

**The gates**, and what each is for:

- `tools/verify-pages.ps1` — drives the running app over HTTP; every page renders, every filter
  narrows, `/p` is server-rendered and capped. 44 checks.
- `tools/verify-spool-reports.mjs` — SQL self-consistency. Every page column exists in the
  projection, every totals key is produced, every filter narrows, each total is EXACT/SOUND/
  CORROBORATED. 14/14, 72 binds.
- `tools/guest-smoke.mjs` — see [[smoke-count-is-not-a-hard-coded-number]]; the harness prints the
  figure at runtime and it has moved repeatedly.
- `tools/route-snapshot.mjs` — **added to the gate list 2026-10-03**, after it was found to have been
  snapshotting login redirects rather than routes. See
  [[route-snapshot-was-snapshotting-redirects]].

**Traps worth knowing before editing anything.** `trailbase/runtime/` is the source and
`traildepot/runtime/` is a generated, git-ignored copy that the server actually loads — `RUN.BAT`
syncs it on every start, and if you run the server any other way, sync it yourself or you will debug
code that is not being served. The rendered-page cache does not key on code, so a manifest or
template change serves stale HTML until the data fingerprint moves — though
`f50d0554 refactor(trailbase): the rendered-page cache keys on the code revision, not only the data`
(2026-10-02) appears to have since fixed that; verify before relying on either behaviour.

## Reference material

- [[report-numbers-come-from-sqlite]] — **the reports' arithmetic, filters and ordering are SQLite, proven
  row for row** (10 of 14 pages byte-identical; the rest differ only by 15-significant-digit transport and
  one float sum), plus the one place JavaScript *does* calculate money.
- [[screen-parity-against-the-legacy-bundle-2026-10-04]] — all 44 legacy screens against the guest's 68 routes,
  settled screen by screen, with the five that have no counterpart and why.
- [[keyboard-layer-and-the-two-bugs-a-real-keystroke-found]] — the app is keyboard-first (`?` lists it),
  and the two dead-key defects only a real keystroke could find.
- [[minimise-client-side-calculation]] — per-keystroke cost cut 5× (worst 6.7 ms → 1.4 ms), and the
  measurement found three wrong numbers in the invoice grid, including an editable price that rounded the
  stored value on save.
- [[fresh-import-and-whole-database-digest-2026-10-04]] — the 2026-10-04 fresh import, `db-digest.mjs`, the
  money comparison that must be per-value, and the `p_data`-is-an-empty-stub trap.
- [[report-cost-on-a-whole-database]] — every report's cost on a whole database, and the legacy comparison.
- [[ledger-party-correlated-balance-was-the-whole-cost]] — the O(rows × dates) term removed from the party
  ledger, and the overclaim corrected.
- [[guest-report-500-not-always-the-deadline]] and [[legacy-view-filter-quotes-400]] — open, both found by
  this sweep.
- [[data-model]] — tables, codes, value translation.
- [[api-contract-trailbase]] — every endpoint shape and the id/encoding rules.
- [[reports-and-ledgers]] — the arithmetic and its inherited quirks.
- [[build-and-run]] — starting the system.
- [[route-map]] — every route, verified against a live server 2026-10-03.
- [[cutover-is-guest-only]] — why the guest is the end state.
- [[smoke-count-is-not-a-hard-coded-number]] — why no harness count is quoted in this note.
- [[trailbase-guest-wasm-spike-results]] — Phase 0 spike evidence.
- [[trail-runtime-js-reference]] — the existing Rust+QuickJS runtime-JS guest this was built on.
- [[guest-app-host-port]] — the app-host port and the 14/14 report parity result.
- [[guest-vs-node-performance]] — measured guest latency.
- [[invoice-entry-freshness-and-writes]] — the invoice/cash-memo freshness and write design.
- [[guest-report-performance-options]] — ranked options to speed report generation.
- [[report-logic-stays-runtime-file-based]] — why moving arithmetic to SQL keeps the no-build goal.
- [[dispatcher-transpiled-per-request]] — the per-request transpile that shapes the guest baseline.
- [[trailbase-runtime-js-scheduler-not-running-jobs]] — why there is no background job poller.
- [[legacy-ui-reference-captures]] — the captured legacy UI.
- `trailbase/README.md` — the long-form evidence, including the validation table.
- `trailbase/tb-ah-run-js/README.md` — the app-host inventory and check commands.