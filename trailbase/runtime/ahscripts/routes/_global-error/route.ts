// GET — the last boundary. The host dispatches here only when the `_error` handler itself failed to
// run, so this must NOT touch the app bundle or the shared shell: it uses the host's own `render`
// bridge and a standalone document, exactly like Next.js's global-error needing its own <html>.
//
// OPTIONAL. Delete this folder and the host answers its own minimal error page. See
// vault/decisions/runtime-js-special-pages.md.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const html = (globalThis as any).render.html("_global-error/page.html.jinja", {
      path: String((req && req.path) || ""),
    });
    return { html, status: 500 };
  };
})();
