// Invoice-entry check: context + ETag, idempotent create and line add, header patch, complete.
//
//   node trailbase/tools/invoice-check.mjs
//
// Mutates the depot it points at (GUEST_BASE); run against a throw-away depot.

const BASE = process.env.GUEST_BASE || "http://127.0.0.1:4003";
const EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
const PASSWORD = process.env.ADMIN_PASSWORD || "administrator-0ne";

let cookie = "";
let failures = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failures++;
};

async function call(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { status: res.status, etag: res.headers.get("etag"), json, text };
}

// login
{
  const res = await fetch(`${BASE}/api/auth/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `email_or_username=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`,
    // `redirect: 'manual'` is load-bearing. TrailBase answers a successful login with a 303 to /login
    // and puts the tokens in `Set-Cookie` on THAT response; following it returns the login page, whose
    // headers carry no cookie — so `cookie` came back empty and every check below ran unauthenticated.
    // See vault/issues/route-snapshot-was-snapshotting-redirects.md.
    redirect: "manual",
  });
  cookie = (res.headers.getSetCookie ? res.headers.getSetCookie() : []).map((c) => c.split(";")[0]).join("; ");
  check("login", Boolean(cookie));
}

// context + ETag
const context = await call("/invoice/context?type=sale");
check("context returns items with stock", context.status === 200 && Array.isArray(context.json?.items) && context.json.items.length > 0, `${context.status} items=${context.json?.items?.length}`);
check("context exposes the next sale number", Number.isFinite(context.json?.next?.sale), JSON.stringify(context.json?.next));
check("context has an ETag", Boolean(context.etag), context.etag);
// Revalidation must answer 304 for unchanged data. Tolerate one rebuild racing the check
// (a concurrent snapshot bump changes the ETag); require a clean 304 within two attempts.
let revalidated = false;
let etag = context.etag;
for (let attempt = 0; attempt < 2 && !revalidated; attempt++) {
  const res = await call("/invoice/context?type=sale", { headers: { "if-none-match": etag } });
  if (res.status === 304) revalidated = true;
  else etag = res.etag ?? etag;
}
check("context revalidates with 304", revalidated, `etag=${context.etag}`);

const nextSale = Number(context.json?.next?.sale);
const party = context.json?.parties?.[0]?.id;
const item = context.json?.items?.[0];
check("context has a party and an item", Boolean(party && item?.id));

// idempotent create
const key = `check-${Date.now()}`;
const created = await call("/invoice", { method: "POST", body: { type: 1, key, device: "check" } });
check("create returns id + number", created.status === 200 && Boolean(created.json?.id), `${created.status} ${created.text}`);
check("number is the next sale number", Number(created.json?.invoiceNo) === nextSale, `${created.json?.invoiceNo} vs ${nextSale}`);
const again = await call("/invoice", { method: "POST", body: { type: 1, key, device: "check" } });
check("create is idempotent (same id)", again.json?.id === created.json?.id, `${again.json?.id} vs ${created.json?.id}`);

const id = created.json?.id;

// header patch (leases, 2dp money)
const patched = await call(`/invoice/${id}`, {
  method: "PATCH",
  body: { device: "check", party, dated: "2026-09-20", discount_1: 5.005, discount_2: 0, discount_rs: 1.005 },
});
check("header patch applies", patched.status === 200 && patched.json?.updated === 1, `${patched.status} ${patched.text}`);

// idempotent line add
const line1 = await call(`/invoice/${id}/line`, {
  method: "POST",
  body: { opKey: `${key}:1`, device: "check", item: item.id, qty: 10, price: item.sale_price, cost_price: item.cost_price, discount_1: 0, discount_2: 0, discount_rs: 0, scheme: 0 },
});
check("line add returns a line id", line1.status === 200 && Boolean(line1.json?.line), `${line1.status} ${line1.text}`);
const line1Again = await call(`/invoice/${id}/line`, {
  method: "POST",
  body: { opKey: `${key}:1`, device: "check", item: item.id, qty: 10, price: item.sale_price, cost_price: item.cost_price, discount_1: 0, discount_2: 0, discount_rs: 0, scheme: 0 },
});
check("line add is idempotent (same line)", line1Again.json?.line === line1.json?.line, `${line1Again.json?.line} vs ${line1.json?.line}`);

await call(`/invoice/${id}/line`, {
  method: "POST",
  body: { opKey: `${key}:2`, device: "check", item: item.id, qty: 3, price: item.sale_price, cost_price: item.cost_price, discount_1: 0, discount_2: 0, discount_rs: 0, scheme: 0 },
});

// read back
const read = await call(`/invoice/${id}`);
check("invoice has exactly 2 lines", read.json?.lines?.length === 2, `lines=${read.json?.lines?.length}`);
const atMost2dp = (v) => typeof v === "number" && Number(v.toFixed(2)) === v;
check(
  "header money stored at 2dp",
  atMost2dp(read.json?.invoice?.discount_1) && atMost2dp(read.json?.invoice?.discount_rs),
  JSON.stringify({ d1: read.json?.invoice?.discount_1, drs: read.json?.invoice?.discount_rs })
);
check("party was set", Boolean(read.json?.invoice?.party));

// a line delete removes one
const deleted = await call(`/invoice/${id}/line/${line1.json?.line}`, { method: "DELETE" });
check("line delete applies", deleted.status === 200 && deleted.json?.deleted === 1, `${deleted.status} ${deleted.text}`);
const afterDelete = await call(`/invoice/${id}`);
check("one line remains", afterDelete.json?.lines?.length === 1, `lines=${afterDelete.json?.lines?.length}`);

// complete releases the lease
//
// `completed` is a legacy column the import never populated and the app never reads for behaviour
// (vault/issues/imported-completed-flag-carries-no-information.md), and the draft lifecycle was
// withdrawn (vault/decisions/no-draft-invoices-published-on-save.md). `completeInvoice` therefore
// releases the edit lease and does NOT persist a state, so this asserts that the endpoint answers
// and the invoice survives — not a `completed = 1` the design no longer writes. (This check used to
// assert the persisted flag and had been red since the lifecycle was withdrawn.)
const completed = await call(`/invoice/${id}/complete`, { method: "POST", body: {} });
check("complete applies", completed.status === 200 && completed.json?.completed === 1, `${completed.status} ${completed.text}`);
const afterComplete = await call(`/invoice/${id}`);
check("complete keeps the invoice (no lifecycle state)", afterComplete.status === 200 && Boolean(afterComplete.json?.invoice), `${afterComplete.status}`);

// lease: re-open a lock, then a second invoice's lifecycle is independent
const second = await call("/invoice", { method: "POST", body: { type: 1, key: `${key}:b`, device: "check" } });
check("second create allocates the following number", Number(second.json?.invoiceNo) === nextSale + 1, `${second.json?.invoiceNo} vs ${nextSale + 1}`);
const released = await call(`/invoice/${second.json?.id}/release`, { method: "POST", body: {} });
check("release applies", released.status === 200 && released.json?.released === 1, `${released.status} ${released.text}`);

// The sale counter as it stands after every sale invoice above, so the return/difference section
// can prove its creates do not move the sale sequence without hard-coding how many were created.
const saleNextAfterWrites = Number((await call("/invoice/context?type=sale")).json?.next?.sale);

// ---------------------------------------------------------------------------
// return (2) and difference (3) — the two invoice types the legacy hub offers but this tool never
// exercised. The screens were built 2026-10-08 (vault/tasks/tb-0023-guest-feature-parity.md), which
// reversed the earlier "purchase and sale only" ruling (vault/decisions/invoice-hub-offers-four-types.md),
// and nothing verified the write path until this section. Each type numbers in its OWN count+1
// sequence (legacy scheme), and a return carries a NEGATIVE quantity, which the line write must store
// verbatim — a sign flip is invisible to a status-only check and would corrupt stock and money
// (vault/decisions/returns-are-negative-quantities.md).
// ---------------------------------------------------------------------------
for (const { code, name } of [
  { code: 2, name: "return" },
  { code: 3, name: "difference" },
]) {
  const ctx = await call(`/invoice/context?type=${name}`);
  check(`${name}: context exposes next.${name}`, ctx.status === 200 && Number.isFinite(ctx.json?.next?.[name]), `${ctx.status} ${JSON.stringify(ctx.json?.next)}`);
  const nextNo = Number(ctx.json?.next?.[name]);

  const tKey = `${key}:${name}`;
  const created = await call("/invoice", { method: "POST", body: { type: code, key: tKey, device: "check" } });
  check(`${name}: create returns id + number`, created.status === 200 && Boolean(created.json?.id), `${created.status} ${created.text}`);
  check(`${name}: number is the type's own next`, Number(created.json?.invoiceNo) === nextNo, `${created.json?.invoiceNo} vs ${nextNo}`);

  const tid = created.json?.id;
  const tParty = ctx.json?.parties?.[0]?.id;
  const tItem = ctx.json?.items?.[0];
  // A return takes a party; the difference screen deliberately does not (entry.html hides the party
  // field for type 3), so exercising no-party create proves the difference path.
  if (code === 2) {
    const patched = await call(`/invoice/${tid}`, { method: "PATCH", body: { device: "check", party: tParty, dated: "2026-10-08" } });
    check(`${name}: header patch applies`, patched.status === 200 && patched.json?.updated === 1, `${patched.status} ${patched.text}`);
  }

  const tQty = code === 2 ? -4 : 4;
  const tLine = await call(`/invoice/${tid}/line`, {
    method: "POST",
    body: { opKey: tKey, device: "check", item: tItem?.id, qty: tQty, price: tItem?.sale_price, cost_price: tItem?.cost_price, discount_1: 0, discount_2: 0, discount_rs: 0, scheme: 0 },
  });
  check(`${name}: line add`, tLine.status === 200 && Boolean(tLine.json?.line), `${tLine.status} ${tLine.text}`);

  const tRead = await call(`/invoice/${tid}`);
  check(`${name}: read-back type`, Number(tRead.json?.invoice?.type) === code, JSON.stringify(tRead.json?.invoice?.type));
  // The difference branch is the only one that runs create with no party (see the note above); assert
  // the invoice really has none, so a regression that defaulted one cannot pass silently.
  if (code === 3) {
    check(`${name}: created with no party`, tRead.json?.invoice?.party == null, JSON.stringify(tRead.json?.invoice?.party));
  }
  check(`${name}: qty stored verbatim (${tQty})`, Number(tRead.json?.lines?.[0]?.qty) === tQty, JSON.stringify(tRead.json?.lines?.[0]?.qty));
  check(`${name}: price stored at 2dp`, atMost2dp(Number(tRead.json?.lines?.[0]?.price)), JSON.stringify(tRead.json?.lines?.[0]?.price));

  // The next number advanced by exactly one, and the sale sequence did not move.
  const after = await call(`/invoice/context?type=${name}`);
  check(`${name}: sequence advanced by one`, Number(after.json?.next?.[name]) === nextNo + 1, `${after.json?.next?.[name]} vs ${nextNo + 1}`);
  check(`${name}: sale sequence untouched`, Number(after.json?.next?.sale) === saleNextAfterWrites, `${after.json?.next?.sale} vs ${saleNextAfterWrites}`);
}

console.log(`\n== invoice entry: ${failures ? `${failures} failure(s)` : "all checks passed"} ==`);
process.exit(failures ? 1 : 0);
