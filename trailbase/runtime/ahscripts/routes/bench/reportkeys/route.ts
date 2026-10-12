// GET /bench/reportkeys — the report keys the sweep should cover, from a route FOLDER (tb-0030 step 5).
// Taken from the app's own registry, so the bench cannot drift from the reports that actually exist.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    return { keys: (await A.spooled.names()).slice().sort() };
  };
})();
