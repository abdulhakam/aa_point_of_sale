---
$schema: "./decisions.schema.json"
title: Parity carve-outs reconfirmed 2026-10-08
type: decision
status: accepted
decided_on: 2026-10-08
created: 2026-10-08
updated: 2026-10-08
tags: [guest, ui, parity, legacy, decisions, reconfirmation]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[tb-0023-guest-feature-parity]]", "[[parity-reinstates-the-legacy-look-with-defect-fixes]]", "[[ui-parity-discrepancies-2026-10-08]]", "[[ui-parity-restyle-progress-2026-10-08]]", "[[guest-frontend-feature-parity-gaps]]"]
---

# Parity carve-outs reconfirmed 2026-10-08

The owner restated the mandate — the guest UI must be **1-1 with the legacy app except for the cases
already discussed** — and asked that each of those cases be reconfirmed one by one. They were, in a
batch of dialogs on 2026-10-08. This note is the record of the answers; it narrows
[[parity-reinstates-the-legacy-look-with-defect-fixes]] rather than replacing it.

## Rulings

| case | ruling |
|---|---|
| **"invoice(all) view"** | the owner meant the **purchase / sale / return / difference invoice entry views**, not a separate all-invoices list. Those four must match the legacy entry screen. |
| **Report table headers and labels** | **keep the fix** — real `<th>` cells, uppercase, friendly labels (`Carton Size`, not `BOX_SIZE_QTY`). |
| **Searchable autocomplete** | **keep** — one searchable combobox replaces the legacy select + injected filter box. |
| **Create-from-invoice** | **keep, but as a separate dialog with its own submit** — replicate the legacy flow (its own form, its own request), not an inline panel riding the invoice submit. |
| **"Find in this report" + "show all"** | **keep both** (guest-only report controls). |
| **Report invoice link** | **keep** — the invoice number is a blue link to the document. |
| **Rail** | **keep as ruled 2026-10-08** — five destinations + Logout, no Orders; Payments / Inventory / Print / Pages / Plugins / refresh behind the foot menu. |
| **Dashboard tiles** | **remove the guest's Payments and Inventory tiles** — the dashboard is exactly the legacy four. |
| **Extra reports + tile** | **keep** — Supply Summary tile and the guest-only Outstanding / Product Sale / Daily Sale reports. |
| **Guest-only screens** | **keep** — Companies, `/p`, `/plugins`. |
| **Management create control** | use the legacy **`add new`** button label. |
| **Date inputs** | **keep `<aa-date-input>`** (Mantine-look control, no browser calendar glyph). |

## Consequence

"1-1 with legacy" now means: everything **except** the rows above is matched to the legacy
captured/live rendering. The rows above are the complete, explicitly-ruled carve-out set; a new
divergence is a defect until the owner rules on it.

## Related

- [[parity-reinstates-the-legacy-look-with-defect-fixes]] — the mandate this refines.
- [[ui-parity-restyle-progress-2026-10-08]] — the increment that applied these rulings.
- [[tb-0023-guest-feature-parity]] — the owning work item.
