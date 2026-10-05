// POST /jobs — enqueue a durable job, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const body = routeKit.jsonBody(req);
    // Validate before enqueueing. `queue.enqueue` throws `Unknown job: <name>` for a name it does not
    // know, which reached the client as an opaque `500 Guest error: Unknown job: ` — so a request with a
    // typo in the job name, or with no body at all, looked like a server fault. It is a bad request and
    // it is now answered as one. Found by `tools/route-coverage.mjs`.
    const name = String(body.name || "");
    if (!A.jobs.isKnown(name)) {
      return { error: "unknown job", name, known: A.jobs.known() };
    }
    const jobHex = await A.jobs.enqueue(db, name, body.input || {});
    await A.jobs.reconcile(db);
    const view = await A.jobs.jobView(db, jobHex);
    return { id: view.id, state: view.state };
  };
})();
