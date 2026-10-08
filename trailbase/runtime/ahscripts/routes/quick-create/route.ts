// POST /quick-create — create a party or item from the combobox's panel, answering JSON.
//
// WHY THIS IS NOT THE INVOICE FORM POST. The panel used to ride in the invoice's own submit, so
// "create the item" and "add the line" were one POST that redirected. That works, but it is a page
// load: the new row is only in a select after the page re-renders. The client cache
// (`app/public/js/refdb.js`) can put a new row into an already-open control with no reload, and the
// legacy screen created-and-selected rather than created-and-redirected. This route is the create-only
// write that lets the panel do that.
//
// The form path is KEPT: the panel is still a submittable part of the invoice form, so with no
// JavaScript — or if this fetch fails — the create rides in the invoice submit exactly as before
// ([[quick-create-rides-in-the-form-that-needed-it]]).
//
// It goes through `A.quickCreate.*FromForm`, the same calls the invoice routes make, so the party
// type translation, the supplier's find-or-create company and the item's 2-decimal money rounding are
// not re-implemented here ([[guest-writes-via-sql]], [[money-is-2dp-everywhere]]).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const form = routeKit.parsePairs(String(req.body || ""));
    const text = (v: any) => (Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "")).trim();
    const kind = text(form.kind);
    const json = (body: any, status = 200) => ({
      body: JSON.stringify(body),
      contentType: "application/json; charset=utf-8",
      status,
    });

    if (kind !== "party" && kind !== "item") return json({ error: "unknown kind", kind }, 400);
    const name = text(kind === "party" ? form.party_new_name : form.item_new_name);
    if (!name) return json({ error: "name is required" }, 400);

    let hex = "";
    await routeKit.write(async () => {
      hex = kind === "party" ? await A.quickCreate.partyFromForm(db, form) : await A.quickCreate.itemFromForm(db, form);
    });
    if (!hex) return json({ error: "nothing created" }, 400);

    // The row the client's cache stores, in the refs keys' shape so `refdb.js` can list it directly.
    // Built by `quickCreate.refRow` beside the writers, so the invoice→party translation and the item
    // columns are not re-derived here ([[guest-writes-via-sql]]).
    const row = A.quickCreate.refRow(kind, form, routeKit.hexToB64(hex), name);
    return json({ ok: true, table: kind === "party" ? "parties" : "items", kind, id: row.id, row });
  };
})();
