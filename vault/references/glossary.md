---
title: Glossary
type: reference
status: active
system: both
created: 2026-09-26
tags: [pos, glossary, domain, terminology]
related_to: ["[[data-model]]", "[[route-map]]"]
---

# Glossary

Domain and code vocabulary, including the deliberate misspellings that must not be "fixed".

## Domain terms

| Term | Meaning |
|---|---|
| **Party** | A customer or a supplier. `parties.type` is `0` customer / `1` supplier, `NULL` when unset. One table, two roles. |
| **Section** | The top level of the party geography: `sections` → `areas` → `parties`. |
| **Area** | The middle level of that hierarchy; `areas.section` points up. |
| **Order Booker** | The salesperson / agent who books orders; `order_bookers`, linked to companies via `order_booker_companies`. |
| **Company** | A trading company the party or booker is associated with. `companies`, reached through the link tables. Distinct from **Item Company**. |
| **Item Company** | `categories` — the label the UI uses for it in both frontends ("Item Companies" in Management). See [[tb-0014-point-company-fields-at-companies]]. |
| **Item** | A product: `name`, `category`, `barcode`, `display_id`, `cost_price`, `sale_price`, `box_size_qty`. |
| **Carton Size** | `items.box_size_qty` — units per carton. Label is "Carton Size" in the UI, not "Box Size". |
| **Invoice** | A document with a type: purchase, sale, return or difference. |
| **Difference** | Not a sale or a purchase — a stock adjustment / write-off. `invoice_types` code `3`. |
| **Transaction** | One **line** of an invoice (`transactions`), not a payment. This is the single most confusable word in the schema. |
| **Payment** | Money in or out (`payments`). |
| **Sending** | Money paid **out** to a supplier. `payment_types` code `0`. |
| **Recieving** | Money taken **in** from a customer. `payment_types` code `1`. See the spelling note below. |
| **Scheme** | Free quantity on an invoice line: `transactions.scheme`. Rendered as the "Free" column. |
| **Discount 1 / Discount 2** | Two **multiplicative** percentage discounts, applied in sequence, on both `transactions` and `invoices`. |
| **`discount_rs`** | A flat rupee amount, subtracted **after** the two percentages. |
| **Dated / due date** | `invoices.dated` (the document date, falling back to `created`) and `invoices.duedate`. |
| **Cash memo** | The legacy module holding the payment vouchers, receive vouchers, DA entry and expenses screens. No SSR equivalent. |
| **DA entry** | "Daily allowance"-style expense entry inside the cash-memo module. |
| **Ledger** | A running statement: party, booker, area or general. |
| **Outstanding** | What a party still owes or is owed — `outstanding_summary`. |
| **Display ID** | A human-friendly item identifier (`items.display_id`), separate from `barcode`. |
| **Booker** | Shorthand for order booker, used in report column names and route slugs (`/management/bookers`, `reportLedgerBooker`). |

## Terminology traps

| Word | Means here |
|---|---|
| `transactions` | **invoice lines**, never payments |
| "Transaction" (UI) | a ledger entry, in the General Ledger |
| `receiving` | ✅ — the correct spelling. **Not** the one used in the schema. |
| `recieving` | the spelling **actually used** across PocketBase, the old views, the ledger logic and the TrailBase migration. Keeping it is deliberate; renaming it would break the old data and the ledger arithmetic. |
| "Company" in the Items form | means **`categories`** (item company), not `companies` |
| `profit` inside `transaction_view` | **total cost**, not margin — the old SQL misnamed it |
| `amount` in `payments` | a single positive magnitude; direction comes from `type`, not from the sign |

`'recieving'` deserves emphasis: the TrailBase migration carries an explicit comment that it is
spelled the way PocketBase spelled it, because "the frontend, the old views and the ledger
logic all used that spelling". A future cleanup must change all of them at once, or none.

## Code and platform vocabulary

| Term | Meaning |
|---|---|
| **View** | On the legacy side, a PocketBase SQL view (`payments_view`, `invoice_view`, …). On the new side, a *derived table rebuilt in JavaScript* in `compute/views.js`. Same name, different mechanism — see [[trailbase-drop-sql-views]]. |
| **Snapshot / warm snapshot** | The in-memory copy of the 17 base tables **and** their derived views held by [[frontend-ssr]]'s report service. |
| **Fingerprint / signature** | `{row count, newest updated}` per table, used to decide whether a table must be re-read. |
| **Probe** | The single cheap request per table (`limit=1&order=-updated&count=true`) that produces the fingerprint. |
| **View closure** | The transitive set of views a page needs, resolved from the views it declares (`viewClosure`). |
| **Page host** | The generic `/p/<slug>` runtime: renders a `meta.json`-declared template, serves that page's data, and does not know any specific page. See [[trailbase-declarative-page-host]]. |
| **Declarative page** | A folder `pages/<slug>/` containing `meta.json` + a template. Adding a page is adding a folder. |
| **Plugin** | A folder `plugins/<slug>/` containing `meta.md` + `index.html`, served behind the login and listed by the plugin hub. |
| **Compute module** | A file in `frontend-ssr/compute/` that is environment-neutral and byte-for-byte shared between Node and the browser (served, behind auth, at `/compute/*`). |
| **Warm-up** | Pre-rendering the reports that read a rebuilt view for their default filters, so the first visit after a change is already cached. |
| **Depot** | A TrailBase data directory (`traildepot/`): `config.textproto`, `migrations/`, and the git-ignored runtime state. |
| **Record API** | A TrailBase-exposed table at `/api/records/v1/<name>`, declared inside `config.textproto`'s `record_apis`. |
| **`expand`** | TrailBase's one-hop, opt-in, allow-listed FK inlining. Not nested, unlike PocketBase's `expand`. |
| **`acl_authenticated` / `acl_world`** | TrailBase per-API permission lists. `acl_world` is how you deliberately expose an API anonymously. |
| **Collection** | PocketBase's word for a table/view. Also used for a vault collection — two different things, same word. |
| **`_user`** | TrailBase's hidden built-in user table; can be targeted by a foreign key but never expanded. |
| **Scroll / cursor pagination** | TrailBase's list paging: `?limit=` + the response `cursor`. Not PocketBase's page/perPage. |
| **`getFullList` / `getList`** | PocketBase SDK helpers: fetch everything / fetch one page. Legacy code mixes both; see [[frontend]]. |
| **Standalone build** | `npm run build:standalone` in `frontend/` — the Next.js standalone output copied to `../standalone`. |

## Reporting vocabulary

| Term | Meaning |
|---|---|
| **Unified Payments Report** | The main payments screen; groups payments by direction (sending/recieving) and paid/unpaid. |
| **Payable / Recivable** | Derived totals: payable from unpaid `sending`; recivable from `recieving − recieved − returns`. |
| **Payments By Company** | Distributes payments to companies by **revenue share**, not by direct attribution. |
| **Item Sales Report** | Sales per item line; note the legacy route is `/app/reports/transactions/unified`. |
| **Product Supply Summary** | The report *keyed* `productsale`; its tile is labelled "Product Sale Report". |
| **Profit Report** | Real margin, from `transactions_report.profit` — **not** `transaction_view.profit` (which is cost). |
| **Stock Report** | Quantity on hand derived from transactions; its "total" is a value, not a count. |
| **Difference Report** | Stock adjustments / write-offs from difference invoices. |
| **Area Ledger** | The one report with an intentional behavioural difference from the legacy SQL — see [[reports-and-ledgers]]. |

## Related

- [[data-model]] — the tables and codes these terms map to.
- [[route-map]] — the screens these terms name.
- [[reports-and-ledgers]] — the arithmetic behind the reporting vocabulary.
