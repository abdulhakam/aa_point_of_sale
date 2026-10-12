// /invoice-doc/rebuild — rebuild every document, from a route FOLDER (tb-0030 step 5).
//
// A rebuild is seconds, not milliseconds, so it is not something to hide behind a spinner on an
// unauthenticated path — it is an explicit POST that records who asked and why. The automatic path
// (`ahscripts/init/invoice-doc.js`) is the one that runs unattended. GET is the rebuild-in-progress view.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    return await A.invoiceDoc.status({ kind: query.kind || "invoice.build" });
  };

  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const query = routeKit.parsePairs(String(req.query || ""));
    const body = routeKit.jsonBody(req);

    // Enqueue, do not run it here. A full rebuild of the production depot is 3-10 s of SQLite
    // work, and the guest's WASM call deadline is around 20 s — reconciling inline completed the
    // rebuild and then lost the HTTP response to the deadline. The job is durable and the minutely
    // poller runs it; the caller polls `/jobs/{id}` or `GET /invoice-doc` for the outcome.
    // `?reconcile=1` runs it in this call, which is convenient on a small depot and in tests.
    const result = await A.invoiceDoc.requestRebuild({
      kind: String(query.kind || body.kind || "invoice.build"),
      reason: String(query.reason || body.reason || "manual"),
      reconcile: query.reconcile === "1",
    });
    if (!result.ok) {
      return { status: 500, body: JSON.stringify(result), contentType: "application/json; charset=utf-8" };
    }
    return result;
  };
})();
