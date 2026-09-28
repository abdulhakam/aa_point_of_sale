// Management CRUD check for the guest app: create → list → update → verify → delete → verify,
// for a hard-deleted entity (sections) and a relation/number entity (items).
//
//   node trailbase/tools/management-check.mjs
//
// Mutates the depot it points at (GUEST_BASE); run it against a throw-away depot.

const GUEST_BASE = process.env.GUEST_BASE || "http://127.0.0.1:4003";
const EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
const PASSWORD = process.env.ADMIN_PASSWORD || "administrator-0ne";

let cookie = "";

async function req(path, { method = "GET", body, follow = false } = {}) {
  const res = await fetch(`${GUEST_BASE}${path}`, {
    method,
    headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
    body,
    redirect: follow ? "follow" : "manual",
  });
  const text = await res.text();
  return { status: res.status, location: res.headers.get("location"), text };
}

async function list(entity) {
  const { text } = await req(`/management/${entity}`);
  return text;
}

/** The id of the row whose cells contain `needle`, from its delete form. */
function rowId(html, entity, needle) {
  for (const block of html.split("<tr>")) {
    if (!block.includes(needle)) continue;
    const m = new RegExp(`action="/management/${entity}/([^"/]+)/delete"`).exec(block);
    if (m) return m[1];
    const edit = new RegExp(`/management/${entity}\\?edit=([^"&]+)`).exec(block);
    if (edit) return edit[1];
  }
  return null;
}

let failures = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failures++;
};

// login
{
  const res = await fetch(`${GUEST_BASE}/api/auth/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `email_or_username=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`,
  });
  const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  check("login", Boolean(cookie));
}

// --- sections (hard delete) ---
{
  const before = await list("sections");
  check("sections: no pre-existing ZZ TEST", !before.includes("ZZ TEST"));

  const created = await req(`/management/sections/create`, { method: "POST", body: "name=ZZ+TEST" });
  check("sections: create redirects", created.status === 303, `status=${created.status}`);

  const afterCreate = await list("sections");
  const id = rowId(afterCreate, "sections", "ZZ TEST");
  check("sections: created row visible", Boolean(id), `id=${id}`);

  if (id) {
    const updated = await req(`/management/sections/${id}/update`, { method: "POST", body: "name=ZZ+TEST+UPDATED" });
    check("sections: update redirects", updated.status === 303, `status=${updated.status}`);
    const afterUpdate = await list("sections");
    check("sections: updated value visible", afterUpdate.includes("ZZ TEST UPDATED"));
    check("sections: row id stable", rowId(afterUpdate, "sections", "ZZ TEST UPDATED") === id);

    const deleted = await req(`/management/sections/${id}/delete`, { method: "POST" });
    check("sections: delete redirects", deleted.status === 303, `status=${deleted.status}`);
    const afterDelete = await list("sections");
    check("sections: row gone", !afterDelete.includes("ZZ TEST"));
  }
}

// --- items (relation + numbers, hard delete) ---
{
  const html = await list("items");
  const cat = /<option value="([^"]+)"/.exec(html)?.[1] ?? "";
  check("items: category option available", Boolean(cat), cat ? "" : "(no options)");

  const body = `name=ZZ+ITEM&category=${encodeURIComponent(cat)}&cost_price=1.5&sale_price=2.5&box_size_qty=12`;
  const created = await req(`/management/items/create`, { method: "POST", body });
  check("items: create redirects", created.status === 303, `status=${created.status}`);

  const afterCreate = await list("items");
  const id = rowId(afterCreate, "items", "ZZ ITEM");
  check("items: created row visible", Boolean(id), `id=${id}`);
  check("items: cost price written", afterCreate.includes(">1.5<"), "");
  check("items: carton size written", afterCreate.includes(">12<"), "");

  if (id) {
    const deleted = await req(`/management/items/${id}/delete`, { method: "POST" });
    check("items: delete redirects", deleted.status === 303, `status=${deleted.status}`);
    const afterDelete = await list("items");
    check("items: row gone", !afterDelete.includes("ZZ ITEM"));
  }
}

console.log(`\n== management CRUD: ${failures ? `${failures} failure(s)` : "all checks passed"} ==`);
process.exit(failures ? 1 : 0);
