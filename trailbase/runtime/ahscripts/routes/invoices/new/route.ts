// /invoices/new — start an invoice, from a route FOLDER (tb-0030 step 5).
//
// GET renders the entry screen; POST creates the invoice. Both need the auth gate. The `type` comes
// from the query (`?type=0` is a purchase), as it did in the dispatcher.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    // 0 purchase, 1 sale, 2 return, 3 difference — the four `invoice_types`. The legacy hub leads with
    // a tile for each, and choosing one starts that entry screen, so all four are accepted here
    // ([[ui-parity-discrepancies-2026-10-08]]). Anything else falls back to a sale.
    const rawType = Number(routeKit.pick(query.type, "1"));
    const type = rawType in A.invoices.INVOICE_TYPES ? rawType : 1;
    const refs = await routeKit.refs();

    return routeKit.renderRoute(
      req,
      { user, active: "invoices", title: "New invoice", template: "invoices/entry.html" },
      {
        isNew: true,
        type,
        typeLabel: A.invoices.typeLabel(type),
        today: A.format.dateOnly(new Date().toISOString()),
        parties: refs.parties ?? [],
        bookers: refs.bookers ?? [],
        items: routeKit.editorItems(refs),
        // The quick-create panels' option lists: the party's area and the item's company. The party's
        // TYPE is the invoice's own type, and the item's numbers are typed, so neither needs a list.
        areas: refs.areas ?? [],
        companies: refs.companies ?? [],
      }
    );
  };

  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    const form = routeKit.parsePairs(String(req.body || ""));
    // The entry form carries its type in a hidden field (`entry.html`); the tile links pass it in the
    // query. Both are accepted, so a purchase started from the tile is created as a purchase rather
    // than the sale this used to default to (it read only the query, which the form's action omits).
    const rawType = Number(routeKit.pick(form.type, routeKit.pick(query.type, "1")));
    const type = rawType in A.invoices.INVOICE_TYPES ? rawType : 1;
    const userHex = routeKit.userHex(req);

    // A key from the form makes a repeated submit return the same invoice instead of a second one.
    const created = await routeKit.write(async () => {
      // The party first: if it cannot be made, no invoice is created. A purchase's new party is a
      // supplier and carries a company of its own name; see `lib/quick-create.js`.
      const newParty = await A.quickCreate.partyFromForm(db, form);
      const invoice = await A.invoicing.createInvoice(db, {
        type,
        key: String(form.key || ""),
        userHex,
        device: String(form.device || ""),
      });
      const createdHex = routeKit.b64ToHex(String(invoice.id));
      // The legacy entry bar collects the date and (on a sale) the booker at create time, so the same
      // fields are honoured here; a missing date falls back to today, which is what the bar shows.
      await A.invoicing.patchHeader(db, createdHex, {
        party: newParty ? routeKit.hexToB64(newParty) : String(form.party || ""),
        booker: String(form.booker || ""),
        dated: String(form.dated || "") || A.format.dateOnly(new Date().toISOString()),
      });
      return invoice;
    });
    return { redirect: "/invoices/" + created.id, status: 303 };
  };
})();
