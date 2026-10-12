// GET /bench/render — what renderer answered the last page, and the render A/B, from a route FOLDER
// (tb-0030 step 5). `?arm=component` is the measurement the envelope decision names as the deliverable:
// the +71% on record is for ACQUISITION with rows crossing the hop as a value, and this is a render with
// a context that does not have to.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const query = routeKit.parsePairs(String(req.query || ""));

    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);

    const refs = await routeKit.refs();
    const rows = (refs.parties ?? []).slice(0, 200).map((p: any, i: number) => ({
      id: p.id,
      name: p.name,
      company: (refs.companies ?? [])[i % Math.max(1, (refs.companies ?? []).length)]?.name ?? "",
      amount: i * 13.37,
    }));
    const result = await A.renderClient.benchRender(req, "bench/payload.html.jinja", { rows }, Number(query.rounds ?? 5));
    return { ...(result || {}), renderer: await A.renderClient.rendererStatus(req) };
  };
})();
