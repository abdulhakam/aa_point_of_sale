// /logout — end the session, from a route FOLDER (tb-0030 step 5).
//
// Both methods, because the rail's logout is a POST form and a bare link is a GET.
//
// The app's own `/login` sets the `auth_token` / `refresh_token` cookies itself (from TrailBase's
// JSON login), so logout must BOTH revoke the refresh token at the host and clear those cookies on its
// own response. The old version redirected to `/_/auth/logout`, which does not exist (404) — so the
// cookies survived and the session stayed live. The host's JSON logout is `POST /api/auth/v1/logout`
// with a `{ "refresh_token": "…" }` body (verified: 200), and it does NOT set cookies, so the clearing
// happens here.
(function () {
  const cleared = [
    "auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
    "refresh_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
  ];

  const handler = async (req: any) => {
    const origin = (String(req.url || "").match(/^https?:\/\/[^/]+/) || [""])[0];
    const cookie = String((req && req.headers && req.headers.cookie) || "");
    const hit = cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/);
    // Revocation is best-effort: even if the host call fails, clearing the cookies below logs the
    // browser out. The 1-hour access token is left to expire; the refresh token dies with this call.
    if (origin && hit) {
      try {
        await (globalThis as any).http.postJson(
          origin + "/api/auth/v1/logout",
          JSON.stringify({ refresh_token: decodeURIComponent(hit[1]) })
        );
      } catch { /* best-effort */ }
    }
    return { redirect: "/login", status: 303, headers: { "set-cookie": cleared } };
  };

  (globalThis as any).GET = handler;
  (globalThis as any).POST = handler;
})();
