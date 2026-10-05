// /favicon.svg — a single-file mount, from a route FOLDER (tb-0030 step 5).
//
// Same mount table and guard as `/static/*`; the `singleFiles` entry resolves to the file. Served
// without the auth gate.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));

    const mount = routeKit.resolveMount(await A.manifests.staticMounts(), path);
    if (!mount || mount.refused) return { text: "Not found", status: 404 };
    if (mount.single) return routeKit.readStatic(mount.rel);
    return { text: "Not found", status: 404 };
  };
})();
