// /login — the login screen (GET) and the app's own login (POST), from a route FOLDER (tb-0030 step 5).
//
// Ungated: this is the door. The POST exchanges the credentials for tokens via TrailBase's JSON login,
// then sets the same auth cookies its form flow would. No second session layer.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const query = routeKit.parsePairs(String(req.query || ""));
    const user = routeKit.userOf(req);
    return routeKit.renderRoute(
      req,
      { user, active: "", title: "Log in", template: "auth/login.html" },
      { next: query.next || "", expired: query.expired || "", error: "" }
    );
  };

  (globalThis as any).POST = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const query = routeKit.parsePairs(String(req.query || ""));
    const form = routeKit.parsePairs(String(req.body || ""));

    const next = String(form.next || query.next || "/dashboard");
    const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
    let tokens: any = null;
    try {
      const text = await (globalThis as any).http.postJson(
        origin + "/api/auth/v1/login",
        JSON.stringify({ email: String(form.email || ""), password: String(form.password || "") })
      );
      tokens = JSON.parse(text);
    } catch {
      tokens = null;
    }
    if (!tokens || !tokens.auth_token) {
      const res = await routeKit.renderRoute(
        req,
        { user: null, active: "", title: "Log in", template: "auth/login.html" },
        { next, expired: "", error: "Invalid email or password" }
      );
      return { ...res, status: 401 };
    }
    const attrs = "Path=/; HttpOnly; SameSite=Strict";
    return {
      redirect: next,
      status: 303,
      headers: {
        "set-cookie": [
          `auth_token=${tokens.auth_token}; ${attrs}; Max-Age=3600`,
          `refresh_token=${tokens.refresh_token}; ${attrs}; Max-Age=2592000`,
        ],
      },
    };
  };
})();
