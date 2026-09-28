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
const completed = await call(`/invoice/${id}/complete`, { method: "POST", body: {} });
check("complete applies", completed.status === 200 && completed.json?.completed === 1, `${completed.status} ${completed.text}`);
const afterComplete = await call(`/invoice/${id}`);
check("invoice is completed", Number(afterComplete.json?.invoice?.completed) === 1, JSON.stringify(afterComplete.json?.invoice?.completed));

// lease: re-open a lock, then a second invoice's lifecycle is independent
const second = await call("/invoice", { method: "POST", body: { type: 1, key: `${key}:b`, device: "check" } });
check("second create allocates the following number", Number(second.json?.invoiceNo) === nextSale + 1, `${second.json?.invoiceNo} vs ${nextSale + 1}`);
const released = await call(`/invoice/${second.json?.id}/release`, { method: "POST", body: {} });
check("release applies", released.status === 200 && released.json?.released === 1, `${released.status} ${released.text}`);

console.log(`\n== invoice entry: ${failures ? `${failures} failure(s)` : "all checks passed"} ==`);
process.exit(failures ? 1 : 0);
