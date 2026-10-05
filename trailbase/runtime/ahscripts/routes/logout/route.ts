// /logout — hand off to TrailBase's own logout, from a route FOLDER (tb-0030 step 5).
//
// Both methods, because the rail's logout is a POST form and a bare link is a GET; the dispatcher
// answered either. The real work is the host's `/_/auth/logout`, which clears the cookies.
(function () {
  const handler = async () => ({ redirect: "/_/auth/logout", status: 303 });
  (globalThis as any).GET = handler;
  (globalThis as any).POST = handler;
})();
