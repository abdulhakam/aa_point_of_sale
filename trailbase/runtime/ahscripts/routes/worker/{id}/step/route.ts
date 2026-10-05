// POST /worker/<id>/step — execute one already-claimed queue step, from a route FOLDER (tb-0030 step 5).
//
// Internal: the fan-out call is server-to-self and carries no cookie, and re-running a step is
// idempotent, so it is reachable without a session. It cannot create work.
(function () {
  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;

    const work = routeKit.jsonBody(req);
    const stepId = String(work.stepId || "").toUpperCase();
    if (!/^[0-9A-F]+$/.test(stepId)) return { text: "bad step id", status: 400 };
    return await A.jobs.executeStep(db, stepId);
  };
})();
