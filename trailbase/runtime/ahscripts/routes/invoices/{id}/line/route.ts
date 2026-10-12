// POST /invoices/<id>/line — add a line, from a route FOLDER (tb-0030 step 5).
//
// An item typed into the quick-create panel is made here and used for this very line, so "create the
// item" and "add the line" are one submit.
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    const match = /^\/invoices\/([^\/]+)\/line$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const idB64 = match[1];
    const hex = routeKit.b64ToHex(String(idB64));
    const userHex = routeKit.userHex(req);

    if (!(await A.invoicing.takeLock(db, hex, userHex, ""))) return routeKit.locked();
    await routeKit.write(async () => {
      const createdItem = await A.quickCreate.itemFromForm(db, form);
      const itemId = createdItem ? routeKit.hexToB64(createdItem) : String(form.item || "");
      if (!itemId) throw new Error("A line needs an item");
      // An empty price or cost falls back to the item's own, so the mobile form can be short.
      const item = await db.all(
        'SELECT "cost_price", "sale_price" FROM items WHERE "id" = unhex(?)',
        [routeKit.b64ToHex(itemId)]
      );
      const cost = item && item.length ? Number(item[0][0]) || 0 : 0;
      const price = item && item.length ? Number(item[0][1]) || 0 : 0;
      // ⚠️ The form ships `price` with a default of "0", so "empty" is not the only way the operator can
      // decline to name one. For an item made in this same submit the 0 is the form's own default, not a
      // price, and taking it literally would add every newly created item to its invoice at zero — the
      // one thing a create-and-add must not do. So the create path yields to the new item's own price
      // when the field is absent OR still at its default; a number the operator actually typed wins, as
      // it does everywhere else. The existing-item path is left exactly as it was, because that is money
      // behaviour nobody asked to change.
      const submittedPrice = form.price === undefined ? "" : String(form.price);
      const priceIsUnset = submittedPrice === "" || Number(submittedPrice) === 0;
      const linePrice = createdItem
        ? (priceIsUnset ? String(price) : submittedPrice)
        : (submittedPrice === "" ? String(price) : submittedPrice);
      await A.invoicing.addLine(
        db,
        hex,
        {
          item: itemId,
          qty: String(form.qty || "0"),
          price: linePrice,
          cost_price: form.cost_price === undefined || form.cost_price === "" ? String(cost) : String(form.cost_price),
          discount_1: String(form.discount_1 || "0"),
          discount_2: String(form.discount_2 || "0"),
          discount_rs: String(form.discount_rs || "0"),
          scheme: String(form.scheme || "0"),
        },
        String(form.opKey || "")
      );
    });
    // htmx write: re-render the screen that made it — the console (`surface=console`) or the entry
    // screen. One field, so the write's screen cannot drift from the GET that rendered it.
    if (A.http.isFragment(req)) {
      if (String(form.surface || "") === "console") {
        const state = await A.lifecycle.readState(db, hex);
        const view = await A.invoices.consoleView(A, req, { type: state ? state.type : 1, invoiceId: idB64, message: "Line added", status: "ok" });
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      const view = await A.invoices.entryView(A, idB64, "Saved");
      if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
    }
    return { redirect: "/invoices/" + idB64 + "?status=ok", status: 303 };
  };
})();
