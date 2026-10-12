// GET — the app's error boundary. The host dispatches here when a route handler throws, instead of
// answering a bare 404. `req.error` carries the handler's failure message.
//
// OPTIONAL. Delete this folder and the host tries `_global-error`, then its own minimal page. See
// vault/decisions/runtime-js-special-pages.md.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const user = routeKit.userOf(req);
    const res = await routeKit.renderRoute(
      req,
      { user, active: "", title: "Something went wrong", template: "_error/page.html.jinja" },
      { path, error: String((req && req.error) || "") }
    );
    return { ...res, status: 500 };
  };
})();
