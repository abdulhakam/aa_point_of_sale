// /healthz — a liveness JSON, from a route FOLDER (tb-0030 step 5).
//
// Deliberately UNGATED: the dispatcher answered it before its auth gate, so it stays reachable to a
// monitor. It reports the report worker pool's status.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    return { ok: true, workers: A.service.status() };
  };
})();
