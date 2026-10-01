// A route folder, which is what `crawler` mode serves.
//
// The host maps a URL to a FOLDER: `/mode` is answered by `ahscripts/routes/mode/route.ts` and by
// nothing else. That resolution is tried BEFORE the catch-all in both modes, so this file answers in
// `dispatcher` mode too — which is what makes it a usable proof that both modes work.
//
// It is also the smallest complete example of the authoring contract: a route is a folder, it exports
// the HTTP methods it answers, and it returns one of the shapes the host knows
// (`{html}`, `{text}`, `{redirect}`, or a plain value serialised as JSON). No central router is
// edited to add it.
//
// This route knows nothing about the app. It reads the host's own config, so it reports which mode
// the deployment is actually in rather than what the file claims.

(globalThis as any).GET = async (req: any) => {
  // `/app/config/app.config.json` is read by the Rust host at start-up. The guest cannot re-read it
  // and expect a different answer, so this reports what the host resolved, via a route the host
  // chose to run.
  return {
    html: `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Routing mode</title>
<link rel="stylesheet" href="/static/css/app.css"></head>
<body><div class="appbody"><div class="card" style="margin:2rem">
<h1 class="page-title">Routing mode</h1>
<p>This page is a route <em>folder</em> &mdash; <code>ahscripts/routes/mode/route.ts</code> &mdash;
so it is served by the host's per-URL folder resolution, which is tried before any catch-all.</p>
<p>That is true in both modes. What the mode changes is what happens to a path with
<em>no</em> folder of its own:</p>
<ul>
  <li><strong>dispatcher</strong> &mdash; the catch-all in <code>app.config.json</code> answers it.</li>
  <li><strong>crawler</strong> &mdash; nothing answers it, and it is a 404.</li>
</ul>
<p>The active mode is in <code>/app/config/app.config.json</code>. The host logs the mode it resolved
at start-up, and an unknown mode falls back to <code>dispatcher</code> because the catch-all is the
more permissive of the two.</p>
<p><a href="/">Back to the app</a></p>
</div></div></body></html>`,
  };
};
