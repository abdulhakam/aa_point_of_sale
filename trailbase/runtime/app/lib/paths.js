// Posix-ish path helpers for the guest (no node:path).

export function normalize(p) {
  const abs = String(p).startsWith("/");
  const parts = String(p).replace(/\\/g, "/").split("/");
  const out = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return (abs ? "/" : "") + out.join("/");
}

export function join(a, b) {
  return normalize(String(a).replace(/\/+$/, "") + "/" + String(b));
}
