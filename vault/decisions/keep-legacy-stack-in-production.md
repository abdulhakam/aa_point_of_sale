---
title: Keep the legacy stack live until the new pair reaches parity
type: decision
status: accepted
decided_on: 2026-09-26
created: 2026-09-26
updated: 2026-10-03
tags: [strategy, migration, legacy, production, risk]
belongs_to: "[[trailbase-migration]]"
related_to: ["[[backend]]", "[[frontend]]", "[[pos-0028-decide-cutover-plan]]", "[[cutover-is-guest-only]]"]
---

# Keep the legacy stack live until the new pair reaches parity

> **PARTLY OBLIGATED 2026-10-03 by [[cutover-is-guest-only]].** This note stays **accepted** — its
> core policy is what is happening: the legacy stack runs in production until the guest reaches
> parity. Two things change:
>
> 1. **The clause "until a cutover is explicitly decided" is spent.** The cutover *has* been decided,
>    and it decided shape B (guest only). The end state is settled; the waiting is not.
> 2. **Its guardrails name paths that no longer exist.** `backend/` and `frontend/` were deleted from
>    git on 2026-09-29 (`c167d311`) and now live at `legacyforparity/`. The rules restate as: never
>    edit `legacyforparity/` — it is frozen.
>
> ⚠️ **It is NOT superseded, and marking it superseded would be wrong.** An earlier correction in this
> session (commit `dfc2ec98`) set it to `superseded` on the reasoning that the legacy stack was "not in
> production use". That was incorrect: `legacyforparity/RUN MINI.BAT` launches it and the owner
> confirms the shop runs on it. Only the *end state* moved; the *interim policy* stands.
>
> Premise 3 below — "the old stack is the only executable specification of the report arithmetic" —
> survives **narrowed**: the frozen bundle can still be *run*, so it remains an oracle, but it cannot
> be *changed*, and there is no git copy of it.

The body below is preserved as the record of what was decided on 2026-09-26 and why.

## Context

There are two complete stacks in this workspace: PocketBase + Next.js
([[backend]] + [[frontend]]) holding the production data and serving staff, and TrailBase + the
guest frontend ([[trailbase]] + [[runtime-js-guest-platform]]) which is new and covers only
dashboard, reports and management.

The obvious "clean" move — point one at the other and delete the loser — is not available, for
three concrete reasons:

1. **The new pair cannot do the job yet.** Invoicing, orders, cash memo, expenses and printing
   have no guest equivalent; those are the screens staff use to make money
   ([[guest-frontend-feature-parity-gaps]]).
2. **The old API is world-readable, and that cannot be fixed in place safely.** Every PocketBase
   collection rule is `""`. Tightening them changes live behaviour for whatever currently relies
   on open access, with no test suite proving it is safe. TrailBase's authenticated-only default
   is the *fix*, which means the fix is a migration rather than an edit
   ([[trailbase]]).
3. **The old stack is the only executable specification of the report arithmetic.** It has to
   stay runnable while the new engine's output is compared against it
   ([[reports-and-ledgers]]).

## Decision

Treat the legacy pair as **production and read source-of-truth until a cutover is explicitly
decided**, and make every change on the new side **additive**:

- Do not modify `backend/pb_migrations/` for TrailBase's benefit, and do not repoint
  `frontend/.env.local` at TrailBase.
- Add new capability on the new side; do not "fix" the old side by removing what the new side
  replaced.
- Keep the legacy views and the preserved view SQL intact precisely so old and new output can be
  compared.
- Any behaviour change to the legacy stack happens on its own merits, with its own ticket, exactly
  as the `pos-*` series did (POS-0009, POS-0011, POS-0013, POS-0017, POS-0026 — see
  [[previous-vault-recovery]]).

The cutover itself is a **separate, explicit decision** with its own note:
[[pos-0028-decide-cutover-plan]]. This note does not make it.

## Consequences

**Accepted**

- Two stacks coexist, and the workspace carries two frontends for overlapping screens (see
  [[route-map]]). That duplication is deliberate and temporary.
- Real improvements landed on the legacy side during the transition because that is where the
  users are — the performance programme's SQL work (`add_performance_indexes`, `ledger_party` as a
  window function, `payments_summary`) is all on PocketBase
  ([[performance-and-caching]]). That work is not wasted: those views are the specification the
  JavaScript engine was written against.
- Documentation has to be explicit about which system is live, which is why every system note here
  carries `status: production` or `status: experimental` in its frontmatter and why
  [[system-status-overview]] leads with the distinction.

**Given up**

- No single source of truth for the UI, so a fix may need applying twice or deliberately only once.
- Nothing forces the new pair to keep up, so parity can drift silently —
  [[guest-frontend-feature-parity-gaps]] exists to make that visible.
- The migration's clock is not started, because the stack that would retire is also the stack that
  is still earning.

## Evidence

- `legacyforparity/backend/pb_migrations/1789890189_add_performance_indexes.js`,
  `1789890300_ledger_party_window_function.js`, `1789890310_payments_summary_view.js` — the
  performance programme, on the legacy side, after the TrailBase rewrite had begun. Dated
  epoch-`1789890xxx` (2026), i.e. contemporaneous with, not before, the new work.
  ⚠️ **Path corrected 2026-10-03**: these were at `backend/pb_migrations/`, which `c167d311` removed
  from git; they are readable at `legacyforparity/backend/pb_migrations/`.
- `trailbase/config.textproto` — the comment contrasting PocketBase's `""` rules with TrailBase's
  authenticated-only default.
- `legacyforparity/backend/DEV.BAT`, `RUN NEXTJS.BAT`, `RUN SERVE.BAT` — the legacy pair is still
  scripted, though the Next.js half can no longer build ([[build-and-run]]).
- The former Node frontend's `frontend-ssr/README.md` § *Known gaps* (removed 2026-09-27,
  [[guest-app-host-port]]) — "Invoices, cash memo, expenses and printing are **out of scope** by
  request." The guest's current gap list is [[guest-frontend-feature-parity-gaps]].
- The prior vault's `decisions/use-pocketbase-and-nextjs.md` is the original stack choice; this
  decision is its deliberate continuation rather than its reversal. See
  [[previous-vault-recovery]].
