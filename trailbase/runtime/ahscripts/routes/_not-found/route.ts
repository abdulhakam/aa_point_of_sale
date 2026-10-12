// GET — the app's custom 404. The host dispatches ANY path with no route folder here (instead of
// its JSON `no_route_folder` answer) and stamps `x-aa-not-found: no_route_folder` on the response.
//
// OPTIONAL. Delete this folder and the host falls back to its own JSON 404. See
// vault/decisions/runtime-js-special-pages.md.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    const res = await routeKit.renderRoute(
      req,
      { user, active: "", title: "Page not found", template: "_not-found/page.html.jinja" },
      { path }
    );
    return { ...res, status: 404 };
  };
})();
