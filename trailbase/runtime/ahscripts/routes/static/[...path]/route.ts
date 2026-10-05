// /static/<path> — a static mount, from a route FOLDER (tb-0030 step 5).
//
// Static assets are served WITHOUT the auth gate: the login page needs its CSS and JS. The mount table
// is `app/manifests/static-mounts.json`, resolved by `routeKit.resolveMount` so the `..` guard stays in
// one place.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const path = routeKit.normalizePath(String(req.path || "/"));

    const mount = routeKit.resolveMount(await A.manifests.staticMounts(), path);
    if (!mount || mount.refused) return { text: "Not found", status: 404 };
    if (mount.single) return routeKit.readStatic(mount.rel);
    if (mount.indexFallback) {
      // Directory-style URL -> its index.html. `path` arrives with the trailing slash normalised away,
      // so treat any extension-less rel as a directory (not as a file).
      if (mount.rel.endsWith("/") || mount.rel.indexOf(".") < 0) {
        const res = await routeKit.readStatic(mount.dir + "/" + mount.rel.replace(/\/$/, "") + "/index.html");
        if (res && res.status !== 404) return res;
      }
    }
    return routeKit.readStatic(mount.dir + "/" + mount.rel);
  };
})();
