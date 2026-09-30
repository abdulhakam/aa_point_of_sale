// Guest HTTP/template helpers — `page`/`qs`/`qsb`,
// rendering through the host's Rust minijinja bridge (`render.html`).

export function page(shell, name, data) {
  const ctx = {
    appName: shell.appName,
    // Printed reports carry the legacy business header (PrintHead parity).
    businessName: shell.businessName ?? shell.appName,
    businessAddress: shell.businessAddress ?? "",
    businessPhone: shell.businessPhone ?? "",
    user: shell.user ?? null,
    active: shell.active ?? "",
    title: shell.title ?? shell.appName,
    flash: shell.flash ?? null,
    nav: shell.nav ?? {},
    // Which paper this page prints on. A5 for an invoice or a voucher, A4 landscape for a report,
    // and blank for everything else so the print media query does not apply a size to, say, the
    // dashboard. The stylesheet keys off this attribute rather than guessing from the route.
    paper: shell.paper ?? "",
    ...(data || {}),
  };
  // NOTE: a direct JS→serde bridge exists (`render.html(name, ctx)` with an object is accepted and
  // converted without a JSON string), but it measured no better and worse for large contexts than
  // QuickJS `JSON.stringify` + Rust parse, so the proven string path is kept
  // ([[direct-js-serde-bridge-no-win]]). Pass the object to use the direct path.
  return render.html(name, JSON.stringify(ctx));
}

export function qs(value) {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value);
}

export const qsb = (value) => ["on", "true", "1", "yes"].includes(String(qs(value)).toLowerCase());
