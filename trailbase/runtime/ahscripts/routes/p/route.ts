// /p — the page index, from a route FOLDER (tb-0030 step 5).
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    if (!user) return routeKit.loginRedirect(req, path);
    const pages = await A.pages.listPages("/app/pages");
    return routeKit.renderRoute(
      req,
      { user, active: "pages", title: "Pages", template: "pages/index.html" },
      { pages }
    );
  };
})();
