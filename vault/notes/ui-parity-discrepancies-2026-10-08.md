---
title: UI parity discrepancies, 2026-10-08 (1-1 against the live legacy bundle)
type: note
status: active
created: 2026-10-08
updated: 2026-10-08
tags: [guest, ui, parity, legacy, evidence, restyle, discrepancies]
related_to: ["[[ui-parity-discrepancies-2026-10-05]]", "[[ui-parity-restyle-progress-2026-10-08]]", "[[tb-0023-guest-feature-parity]]", "[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[legacy-ui-reference-captures]]", "[[features-as-native-web-components]]"]
---

# UI parity discrepancies, 2026-10-08 (1-1 against the live legacy bundle)

The first comparison where **both apps were captured live**, side by side, so this supersedes the
guest-only vs stored-legacy diffs. Operator-supplied legacy credentials (`user` / `admin`) unblocked
the legacy arm — the earlier note's "the live legacy app needs credentials held by the operator" is now
spent.

## How it was produced

```sh
node trailbase/tools/ui-capture.mjs --system both --legacy-user user --legacy-password admin
node trailbase/tools/ui-parity-report.mjs --json vault/attachments/ui-capture/parity.json
```

- legacy `:3000` (`legacyforparity/RUN MINI.BAT`, PocketBase `:8090`), guest `:4000`.
- 28 screens × 2 = 56 captures at 1600×900; the raw machine diff is
  `vault/attachments/ui-capture/parity.json`.
- Result: **28 screens compared, 28 still differ** — but most groups are known carve-outs or data
  windows; the real look differences are listed below.

The extractor gained a **rail** field (`nav a[href], nav button`, in DOM order, each as
`seg:<last path segment>` / `btn:<label>`) so the rail's **membership and order** are compared, and the
link metric was split into `navLinkColor` / `contentLinkColor` / `rawAnchorColor`.

## ⚠️ Corrections to earlier notes

| earlier claim | what the live capture shows |
|---|---|
| the legacy rail carries **five** destinations ([[ui-parity-discrepancies-2026-10-05]]) | it carries **six**: dashboard, reports, **orders**, invoices, cashmemo, management — `Orders` sits between Reports and Invoices |
| [[guest-ui-is-a-direct-shift-of-legacy]] ported the rail faithfully | the guest rail is **missing Orders**, and puts Payments/Inventory/Print/Pages/Plugins behind a foot menu |
| legacy `/app/invoices` is a list | it is a **hub of five tiles** (purchase, sale, print invoices, return, difference); the guest `/invoices` is a filter + table |

## 1. The rail (every screen)

| | order |
|---|---|
| legacy | dashboard · reports · **orders** · invoices · cashmemo · management · *(logout, unlabelled icon)* |
| guest | dashboard · reports · invoices · cashmemo · management · *(foot menu)* payments · inventory · print · pages · plugins · *(refresh)* · logout |

- **only legacy:** `orders` (and its trailing logout button carries no label).
- **only guest:** payments, inventory, print, pages, plugins, the background-refresh button (labelled
  "0 rows in memory"), and Logout (labelled).
- The five shared destinations are in the **same relative order**; Orders is absent because it was
  withdrawn ([[no-draft-invoices-published-on-save]]), so this is a capability difference, not a
  mis-ordering. **Ruled 2026-10-08: Orders is not needed** — the legacy `orders` destination is an
  **accepted divergence**, and the guest keeps its foot menu as it is.

## 2. Hubs and grids — item order

| hub | legacy order | guest order | kind |
|---|---|---|---|
| dashboard | reports, invoices, cash memo, management | reports, invoices, cash memo, management, **payments, inventory** | guest adds two tiles |
| reports | 11 tiles (unified payments … daily sale) | same 11 **in the same order** + **supply summary** | guest adds one report |
| management | **sections, areas, parties, companies, bookers, items** | **items, parties, order bookers, companies, areas, sections** | **reversed order** + "order bookers" vs "bookers" |
| cashmemo | da entry - purchases, crv - cash recieve voucher, cpv - cash payment voucher, payments, expenses | payment vouchers, receive vouchers, da entry, expenses | **different set and labels** (guest merges/splits differently) |
| invoices | purchase, sale, print invoices, return, difference (a **hub**) | none — the page is a filter + table | **structural**: hub vs list |

## 3. Report screens (all 14 reports + 4 ledgers)

- **Values look (carve-out, keep).** Legacy report tables have **no `<th>`** (`thCount 0`, `thTransform
  null`), so the guest's real `<th>` cells and `uppercase` are intentional
  ([[parity-reinstates-the-legacy-look-with-defect-fixes]]).
- **Filter modal.** `reports-stockreport` and `reports-difference` show a legacy **"Filter Data" modal**
  (`h2 filter data`, buttons `stock report`/`difference report` + `ok`); the guest shows inline filters
  and an `apply` button. The other reports show inline filters in both.
- **Filter labels.** Legacy: `select booker`, `select area`, `select section`, `select party`,
  `select payment type`, `date from`, `date to`, `company`, `invoice`. Guest: the autocomplete labels
  carry every option (`booker all attique mohsin …`, `company all sofi traders qarshi f hamdar …`), and
  `from`/`to` instead of `date from`/`date to` on the cash-memo screens. Same fields, different label
  text.
- **"Find in this report".** A guest-only search row (formLabel + `search` input) on every report; no
  legacy counterpart.
- **Buttons.** Legacy `reset`; guest `apply` (plus `reset` on some). Legacy shows `show all`?
  (guest has `show all` on payments/sales/etc.; legacy has none).
- **Content links.** Guest report rows link the invoice (`S 8602`, `.report-link` blue); legacy report
  rows have **no anchors** — guest addition (item F carve-out).

## 4. Management lists

- **`Created` column.** Every legacy list has a `created` column; the guest list does not.
- **Create control.** Legacy `add new` button; guest a `New {singular}` link (`new party`, `new item`,
  …).
- **Items columns.** Legacy `company, name, cost price, sale price, qty, carton size`; guest
  `name, company, display id, barcode, cp, sp, carton size` (labels and set differ; guest adds display
  id/barcode, renames cost/sale price to CP/SP, drops qty).
- **Bookers columns.** Legacy `name, phone, company, created`; guest `name, phone, companies`.
- **Party filter.** Legacy has a `party type` filter; the guest party list has only `search`.
- **Search input type.** Legacy is a `text` input; guest uses `type=search`.

## 5. Colour metrics (exact)

| metric | guest | legacy | note |
|---|---|---|---|
| `navLinkColor` | `rgb(73,80,87)` | `rgb(73,80,87)` | match — **except** the active destination, where the guest paints the icon blue-7 `rgb(24,100,171)` and legacy stays gray |
| `rawAnchorColor` (base `a` rule) | `rgb(73,80,87)` | `rgb(0,0,238)` | legacy sets **no** global anchor colour, so a raw anchor is the browser default blue; the guest's global gray-7 rule differs |
| `contentLinkColor` | varies | `null`/`rgb(0,0,238)` | guest tile `<a>` is gray-7 with a blue-6 `.tile-label`; legacy tile text is the UA blue `rgb(0,0,238)`. Guest report links are blue-6 `rgb(28,126,214)`; legacy report rows have none |
| `tdBorder` (report tables) | `1px solid rgb(0,0,0)` | `0px none` | legacy report cells have **no right border** (row separators only); the guest draws a full black grid. Management tables **do** match (black) |
| `bodyFont`, `bodyBg`, `tdBorder` (management) | — | — | match |

## 6. Data-window differences (not look)

Legacy's report screens default to a small/cold window (3–10 rows), the guest to a capped 1000-row
window, so `rowCount` differs (e.g. profit guest 1001 vs legacy 3). This is a **filter-default**
difference, not a rendering one; see [[report-default-window-comes-from-the-data]].

## The actionable list (real look differences, in fix order)

1. **Report filter modal** — add the legacy "Filter Data" dialog on the report screens (the reopened
   item; the raw captures show exactly which screens have it and its heading/button text).
2. **Report filter labels** — `date from` / `date to`, and see whether the autocomplete label should
   read `select <field>` rather than the option dump.
3. **Management `Created` column** and the **items/bookers column sets**.
4. **Management hub order** — legacy is sections, areas, parties, companies, bookers, items (guest is
   reversed).
5. **Invoices hub vs list** — decide whether guest `/invoices` should be legacy's five-tile hub, with
   the list behind it.
6. **Cash-memo tile set/labels** — legacy da entry-purchases / crv / cpv / payments / expenses.
7. **Rail** — ~~the Orders capability decision~~ **resolved 2026-10-08: Orders is not needed** (accepted
   divergence); the foot-menu extras stay.
8. **Colours** — the active rail link (guest blue, legacy gray) and the raw/tile anchor colour.

## Related

- [[ui-parity-discrepancies-2026-10-05]] — the original nine-item list, now superseded for the rail by
  the live capture here.
- [[ui-parity-restyle-progress-2026-10-08]] — the fixes already shipped this day.
- [[tb-0023-guest-feature-parity]] — the owning work item.
