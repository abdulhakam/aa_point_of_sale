---
title: The feature-parity harness reads every legacy screen as unmatched (fixed)
type: issue
status: resolved
severity: low
created: 2026-10-09
updated: 2026-10-09
tags: [harness, parity, tooling, guest, legacy, resolved]
related_to: ["[[ui-parity-run-2026-10-09]]", "[[route-map]]", "[[settle-structural-claims-with-the-owning-artifact]]"]
---

# The feature-parity harness reads every legacy screen as unmatched (fixed)

## Symptom

`trailbase/tools/feature-parity.mjs` reported **all 44 legacy screens** as `candidate` or `unmapped`
and **none** as `exact` or `renamed`, even for screens the two apps obviously share — `/app/dashboard`
against `/dashboard`, `/app/management` against `/management`. The tool's own comment says a shared
screen should read `renamed` when the path prefix differs, so the all-`candidate` table was a harness
failure, not a real absence of parity.

## Cause

The path normaliser stripped the `/app` prefix *including its trailing slash* from a legacy route but
left the guest's leading slash alone:

```js
const tail = (r) => r.replace(/^\/app\/?/, "").replace(/\/+$/, "").toLowerCase();
```

- `tail("/app/dashboard")` → `"dashboard"` (the `\/app\/?` consumes the `/` after `app`)
- `tail("/dashboard")` → `"/dashboard"` (the pattern does not match, so the leading `/` survives)

The guest-side lookup map was keyed on the second form, so no legacy route ever matched it and the
`exact`/`renamed` branches were dead. Verified directly:

```pwsh
node -e "const t=(r)=>r.replace(/^\/app\/?/, '').replace(/\/+$/, '').toLowerCase(); console.log(JSON.stringify(t('/app/dashboard')), JSON.stringify(t('/dashboard')))"
# native output: "dashboard" "/dashboard"
```

## Fix

Normalise the leading slash and the `app/` prefix on both sides before comparing:

```js
const tail = (r) => r.replace(/^\/+/, "").replace(/^app\/?/, "").replace(/\/+$/, "").toLowerCase();
```

After the fix the same run reads **7 renamed, 32 candidate, 5 unmapped** — the shared shell screens
(`dashboard`, `reports`, `reports/ledgers`, `management`, `invoices`, `cashmemo`,
`cashmemo/expenses`) now match, and the 32 `candidate` rows are the genuinely renamed capabilities the
tool is designed to flag for a human. See [[ui-parity-run-2026-10-09]] §1.

⚠️ This is the same failure mode [[settle-structural-claims-with-the-owning-artifact]] warns about:
a mechanical tool that exits `0` (its `MISSING` counter is never populated, so it never exits `1`) was
one string away from being read as "the guest reaches almost nothing of the legacy app". The tool's
deliberate refusal to print a `MISSING` verdict is what stopped the wrong reading from propagating.

## Related

- [[ui-parity-run-2026-10-09]] — the run that found it.
- [[settle-structural-claims-with-the-owning-artifact]] — the verification rule this is another instance of.
