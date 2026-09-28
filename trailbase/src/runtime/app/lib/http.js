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
    ...(data || {}),
  };
  return render.html(name, JSON.stringify(ctx));
}

export function qs(value) {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value);
}

export const qsb = (value) => ["on", "true", "1", "yes"].includes(String(qs(value)).toLowerCase());
