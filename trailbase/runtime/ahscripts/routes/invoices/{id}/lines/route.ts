// POST /invoices/<id>/lines — the grid's save, from a route FOLDER (tb-0030 step 5).
//
// A `remove:` op is a single action; a `save` posts the whole sheet, which the form sends as parallel
// arrays, so this zips them back into lines.
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const form = routeKit.parsePairs(String(req.body || ""));

    const match = /^\/invoices\/([^\/]+)\/lines$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const idB64 = match[1];
    const hex = routeKit.b64ToHex(String(idB64));
    const userHex = routeKit.userHex(req);

    let step = "lease";
    try {
      await A.lifecycle.requireLease(db, hex, userHex, String(form.device || ""));
      await routeKit.write(async () => {
        step = "op";
        const op = String(form.op || "save");
        if (op.startsWith("remove:")) {
          const lineId = routeKit.b64ToHex(op.slice(7));
          await A.lifecycle.removeLine(db, hex, lineId, "rm-" + op.slice(7) + "-" + Date.now().toString(36));
        } else {
          const items = [].concat(form.item ?? []);
          const qty = [].concat(form.qty ?? []);
          const price = [].concat(form.price ?? []);
          const d1 = [].concat(form.discount_1 ?? []);
          const d2 = [].concat(form.discount_2 ?? []);
          const drs = [].concat(form.discount_rs ?? []);
          const scheme = [].concat(form.scheme ?? []);
          const ids = [].concat(form.line ?? []);
          for (let i = 0; i < items.length; i++) {
            if (!items[i]) continue;
            step = `line ${i}`;
            const line = {
              item: items[i],
              qty: qty[i] ?? "0",
              price: price[i] ?? "0",
              cost_price: "0",
              discount_1: d1[i] ?? "0",
              discount_2: d2[i] ?? "0",
              discount_rs: drs[i] ?? "0",
              scheme: scheme[i] ?? "0",
            };
            // A row that carries its own id is an EDIT of that line; a row with an empty id is an APPEND,
            // which is how a return is entered. Both are valid on a saved invoice
            // (vault/decisions/no-draft-invoices-published-on-save.md). The guard lives in
            // editLine, not here — deciding by invoice state instead turned an edit into a
            // silent extra line.
            const existing = ids[i] ? routeKit.b64ToHex(String(ids[i])) : null;
            if (existing) {
              await A.lifecycle.editLine(db, hex, existing, line);
            } else {
              await A.lifecycle.appendLine(db, hex, line, "line-" + idB64 + "-" + i + "-" + Date.now().toString(36));
            }
          }
        }
      });
      // htmx save: re-render the grid (flash included) into `#app-main`; the grid's client recalc
      // re-inits on the swap. A plain POST still 303-redirects to the grid.
      if (A.http.isFragment(req)) {
        const view = await A.invoices.gridView(A, req, idB64, "Saved", "");
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      return { redirect: "/invoices/" + idB64 + "/grid?status=ok", status: 303 };
    } catch (e: any) {
      const why = e && e.message ? e.message : typeof e === "string" ? e : Object.prototype.toString.call(e);
      // htmx error: re-render the grid with the message as the flash (`status: "error"` paints it red)
      // rather than a bare 409 body, which htmx does not swap by default — the operator must see why.
      if (A.http.isFragment(req)) {
        const view = await A.invoices.gridView(A, req, idB64, `Cannot save the line [${step}]: ${why}`, "error");
        if (view) return routeKit.renderRoute(req, { user, ...view.options }, view.data);
      }
      return { text: `Cannot save the line [${step}]: ${why}`, status: e?.status ?? 409 };
    }
  };
})();
