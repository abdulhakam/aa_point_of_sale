// GET /invoices/<id>/view — the standalone document, from a route FOLDER (tb-0030 step 5).
//
// Rendered from the materialised inv_doc JSON via the shared `app/lib/invoice-sheet.js` builder, so the
// screen, the single printout and the queued-batch printout are the SAME artefact. `?print=1` is the
// print mode: the same document, with the navigation and the action bar dropped and A5 selected, so
// the printed sheet and the on-screen document cannot diverge.
//
// The sheet mirrors the LEGACY print (`/app/invoices/print?invoiceId=…`); the two legacy actions on it
// are "Print Invoice Now" (this page in print mode) and "Add to Print Queue" (the localStorage queue in
// `app/public/js/print-queue.js`). See `vault/notes/print-queue-is-the-legacy-picker-and-queue.md`.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;

    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));

    const match = /^\/invoices\/([^\/]+)\/view$/.exec(path);
    if (!match) return { text: "Not found", status: 404 };
    const print = String(query.print ?? "") === "1";
    // A5 unless the caller names another sheet, so a till slip and a filed A4 copy are both one
    // link away and neither needs its own renderer.
    const paper = String(query.paper ?? "") || "a5";
    const id = String(routeKit.decode(match[1]));

    // `?source=live` builds the sheet from the BASE TABLES (`buildSheetFresh` -> `readInvoice`),
    // bypassing the materialised `inv_doc` document. The console's view dialog and its finish-flow
    // print tab use it so the preview is always the latest data, not the trigger-maintained copy.
    // Everything else (`/print`, `/print/queue`, a plain bookmark) stays on the materialised tier.
    const live = String(query.source ?? "") === "live";
    const sheetMod = await (globalThis as any).__AA_LOAD__("/app/lib/invoice-sheet.js");
    const sheet = live
      ? await sheetMod.buildSheetFresh(A, id)
      : await sheetMod.buildSheet(A, id);
    if (!sheet) {
      return {
        text: live ? "No such invoice" : "No materialised document for this invoice yet",
        status: 404,
      };
    }

    return routeKit.renderRoute(
      req,
      {
        user,
        active: "invoices",
        title: "Invoice " + sheet.invoiceNo,
        paper: print ? paper : "",
        template: "invoices/document.html.jinja",
      },
      {
        sheet: sheet.data,
        print,
        // The action bar's links need the id/no/type even when the document is not in print mode.
        actions: { id: sheet.data.invoice.id, invoiceNo: sheet.invoiceNo, type: sheet.type },
      }
    );
  };
})();
