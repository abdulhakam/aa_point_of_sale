// Guest route helpers
//
// ⚠️ CORRECTED 2026-10-04. This line read `// Guest route helpersABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij…-_`
// — the base64 alphabet pasted onto the end of the comment. Harmless to the runtime, and invisible to
// every check, because it is a comment. It is the same family as the collapsed lines in `route.ts`
// and the vault documents: an edit that went somewhere unintended, with nothing watching. Third
// instance today; see vault/notes/vault-code-drift-audit-2026-10-03.md.
//
// These exist because the same four things were written by hand at ~80 call sites, and two of
// them were correctness rules rather than conveniences:
//
//   write()      a write must invalidate the report snapshot, or the next report is stale
//                ([[reports.no_precomputation]]). It was enforced by remembering to add
//                `A.service.invalidate()` after every mutation; this makes it the call's type.
//   refs()       the reference lists from `app/sql/refs.sql`, null-coalesced for a template.
//   renderRoute() the `page(req, shell(user, active, title), tpl, data)` triple-nest.
//   hex/b64      the base64/hex pair, which must agree with itself.
//
// ID ENCODING. The app shows base64 everywhere; SQLite stores BLOB ids, which are matched with
// `unhex(?)` rather than against a base64 text parameter. Both directions live here and nowhere
// else, because a base64 decoder that gets the tail wrong does not fail — it returns an id that
// silently matches nothing, which is how a whole invoice document once rendered with empty item
// names ([[materialise-once-resolve-never]]).
//
// Base64 is 3 bytes -> 4 sextets and the final partial group is PADDED, not filled: a 16-byte id
// is 22 characters plus "=". Verified: 01A0EBFD3E2176D294C5C5797E90A6E5 -> AaDr_T4hdtKUxcV5fpCm5Q

import { invalidate, fingerprint } from "./reports.js";

/**
 * Resolve a static mount from `/app/manifests/static-mounts.json`.
 *
 * Returns `{ dir, rel, indexFallback }` for the mount that owns `path`, `{ single: true, rel }` for a
 * declared single file, `{ refused: true }` for an attempt to escape, or null. The caller does the
 * reading; this only decides *where from*.
 *
 * The `..` refusal lives here rather than at each call site because it is a security property, not a
 * per-route detail: a mount that does not reject `..` serves the whole depot to anyone who asks for
 * `/static/../../data/main.db`. The dispatcher had three branches that each repeated the guard, which is
 * exactly how a guard ends up present twice and absent once.
 */
export function resolveMount(manifest, path) {
  const mounts = (manifest && manifest.mounts) || [];
  for (const mount of mounts) {
    if (!String(path).startsWith(mount.prefix)) continue;
    const rel = String(path).slice(mount.prefix.length);
    if (!rel || rel.includes("..")) return { refused: true };
    return { dir: mount.dir, rel, indexFallback: Boolean(mount.indexFallback) };
  }
  const single = ((manifest && manifest.singleFiles) || []).find((f) => f.path === path);
  if (single) return { rel: single.file, single: true };
  return null;
}

/** The lowercased extension of a path, or "". */
function extOf(p) {
  const i = String(p).lastIndexOf(".");
  return i < 0 ? "" : String(p).slice(i).toLowerCase();
}

/**
 * The Content-Type for a file, from `/app/manifests/content-types.json`.
 *
 * It reads `__AA_APP__` rather than closing over the bundle, so `readStatic` stays callable from a
 * module with no app bundle — which is how a route folder uses it.
 */
async function contentTypeFor(fsPath) {
  const app = globalThis.__AA_APP__;
  if (!app || !app.manifests) return null;
  const table = (await app.manifests.contentTypes()).byExtension;
  return table[extOf(fsPath)] ?? null;
}

/** Read a static file with its Content-Type, or a 404 response. Used by the `[...path]` mount folders. */
export async function readStatic(fsPath) {
  try {
    const body = await fs.readFile(fsPath);
    return { body, contentType: (await contentTypeFor(fsPath)) || "application/octet-stream" };
  } catch {
    return { text: "Not found", status: 404 };
  }
}
import * as refsModule from "./refs.js";
import { page } from "./http.js";

// Exactly the 64-character URL-safe base64 alphabet: A-Z a-z 0-9 then `-` (62) and `_` (63).
// A short or misordered alphabet here does not throw — sextet 63 indexes past the end and reads
// `undefined`, and every value ≥ 48 decodes to the wrong byte, which is how a whole invoice
// document once rendered with empty item names.
const B64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const B64_STANDARD = { "+": 62, "/": 63 };

/**
 * Run a mutation and drop the report snapshot when it commits.
 *
 * Invalidation is on the SUCCESS path only: a write that threw may still have committed part of
 * itself, but reporting a snapshot that is stale-but-plausible is worse than reporting one that
 * is merely late, and the retry is the caller's. A handler that writes outside this MUST call
 * `invalidate()` itself, and `invalidate` is exported so that stays possible.
 */
export async function write(fn) {
  const result = await fn();
  // Awaited: this is also what publishes the cross-thread invalidation stamp, and it has to be in the
  // database before the mutation's response is, or a read on another runtime thread can arrive first and
  // be served from a fingerprint that predates the write. See `probe` in reports.js.
  await invalidate();
  return result;
}

export { invalidate };

/**
 * The reference snapshot (`parties`, `bookers`, `areas`, `sections`, `companies`, `items`, …).
 *
 * This is NOT a cache: `app/lib/refs.js` holds the snapshot and rebuilds only when the data
 * fingerprint moves. The win is that a handler stops writing `refs.parties ?? []` per list — nine
 * handlers each ask for the snapshot and then null-coalesce the two or three lists their template
 * reads. Every list is an array here, always.
 *
 * What refs CONTAINS is defined by `app/sql/refs.sql`, not here and not in `compute/views.js`. That
 * file replaced a definition written twice in JavaScript, and it is step 1 of
 * [[tb-0032-manifest-first-refactor]].
 */
export async function refs() {
  const r = await refsModule.refs(await fingerprint());
  return r ?? {};
}

/** The invoice-editor's item shape. Shared by every screen that offers a line editor. */
export function editorItems(r) {
  return (r?.items ?? []).map((it) => ({
    id: it.id,
    name: it.name ?? "",
    price: Number(it.sale_price) || 0,
    costPrice: Number(it.cost_price) || 0,
    boxSizeQty: Number(it.box_size_qty) || 0,
  }));
}

/**
 * Render a template inside the app shell, returning an HTML response.
 *
 * This collapses the 25-site
 * `return html(await A.http.page(req, shell(user, active, title), template, data))`
 * triple-nest into one call, and returns `{ html }` itself so the caller does not wrap it either.
 *
 * `active` (the nav section) is taken from the caller rather than derived from the path, because a
 * derived value would be a *behaviour* change disguised as a refactor: `/reports/profit` and
 * `/p/reports/profit` have different nav sections on the same shape of path, and only the caller
 * knows which. `tools/route-snapshot.mjs` does not fingerprint the nav, so a wrong `active` would
 * pass the parity gate and quietly move the highlight.
 */
export async function renderRoute(req, options, data) {
  const opts = options ?? {};
  // The header and every printed report carry the business identity. The dispatcher resolves it
  // once from /app/config/business.json and parks it here; the defaults in that file are the legacy
  // values so a direct shift matches what staff know.
  const biz = (globalThis.__AA_BUSINESS__ ?? null) || {
    name: "SAMPLE TRADERS",
    address: "123 Sample Street, Sample City",
    phone: "000-0000000",
  };
  return {
    html: await page(
      req,
      {
        appName: opts.appName ?? biz.name,
        businessName: biz.name,
        businessAddress: biz.address,
        businessPhone: biz.phone,
        user: opts.user ?? null,
        active: opts.active ?? "",
        title: opts.title ?? "",
        paper: opts.paper ?? "",
      },
      opts.template,
      data
    ),
  };
}

/** hex -> the URL-safe base64 the app shows. The inverse of `b64ToHex`. */
export function hexToB64(hex) {
  const bridge = (globalThis).ids;
  if (bridge && typeof bridge.hexToB64 === "function") return bridge.hexToB64(String(hex ?? ""));
  const clean = String(hex ?? "").replace(/[^0-9a-fA-F]/g, "");
  let out = "";
  for (let i = 0; i < clean.length; i += 6) {
    const group = clean.slice(i, i + 6);
    const n = Math.floor(group.length / 2);
    const b = [0, 1, 2].map((k) => (k < n ? parseInt(group.slice(k * 2, k * 2 + 2), 16) : 0));
    out += B64_ALPHABET[b[0] >> 2];
    out += B64_ALPHABET[((b[0] & 3) << 4) | (b[1] >> 4)];
    out += n > 1 ? B64_ALPHABET[((b[1] & 15) << 2) | (b[2] >> 6)] : "=";
    out += n > 2 ? B64_ALPHABET[b[2] & 63] : "=";
  }
  return out.replace(/=+$/, "");
}

/**
 * The URL-safe base64 the app shows -> hex, for `unhex(?)`.
 *
 * Tolerant by design: any character that is not in either alphabet is skipped rather than
 * throwing, and standard `+/` is accepted alongside `-_`. This is the same algorithm the app has
 * always used (`management.base64ToHex`), kept bit-for-bit rather than rewritten, because a
 * decoder that differs by one skipped character returns an id that still *looks* right and matches
 * nothing.
 *
 * The implementations below are the fallback for a guest running without the Rust bridge (the
 * `tb-ah-run-js` component predates it). Both paths are covered by `tools/id-codec-check.mjs`, so
 * the two are held to the same recorded vector rather than assumed equivalent.
 */
export function b64ToHex(value) {
  const bridge = (globalThis).ids;
  if (bridge && typeof bridge.b64ToHex === "function") return bridge.b64ToHex(String(value ?? ""));
  let bits = 0;
  let acc = 0;
  let hex = "";
  for (const ch of String(value ?? "")) {
    if (ch === "=") break;
    const inUrlSafe = B64_ALPHABET.indexOf(ch);
    const idx = inUrlSafe >= 0 ? inUrlSafe : B64_STANDARD[ch];
    if (idx === undefined || idx < 0) continue;
    acc = ((acc << 6) | idx) >>> 0;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      hex += ((acc >>> bits) & 0xff).toString(16).padStart(2, "0");
    }
  }
  return hex.toUpperCase();
}

/**
 * The host's wildcard path, collapsed: `//management/parties` -> `/management/parties`.
 *
 * A route FOLDER receives the host's raw `req`, whose `path` may carry a leading double slash (the
 * wildcard `/{*wildcard}` capture). Shared here because every route folder needs it and a route file
 * cannot import — it reaches this through `A.routeKit`. The dispatcher keeps its own copy until step 6
 * deletes it; see vault/tasks/tb-0030-retire-the-route-ts-dispatcher.md.
 */
export function normalizePath(p) {
  const abs = String(p).startsWith("/");
  const out = String(p)
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== ".");
  return (abs ? "/" : "") + out.join("/");
}

/**
 * Query/form decoding into pairs. `URLSearchParams` does not exist in the guest (QuickJS), so this is
 * hand-rolled. A repeated key collects into an array, matching HTML form semantics for multi-selects.
 */
export function parsePairs(qs) {
  const decode = (s) => {
    try {
      return decodeURIComponent(String(s).replace(/\+/g, " "));
    } catch (e) {
      return String(s);
    }
  };
  const out = {};
  for (const part of String(qs || "").split("&")) {
    if (!part) continue;
    const i = part.indexOf("=");
    const k = decode(i < 0 ? part : part.slice(0, i));
    const v = i < 0 ? "" : decode(part.slice(i + 1));
    if (out[k] === undefined) out[k] = v;
    else if (Array.isArray(out[k])) out[k].push(v);
    else out[k] = [out[k], v];
  }
  return out;
}

/**
 * The resolved TrailBase user in the shell's shape, or null.
 *
 * ⚠️ THE AUTH GATE IS THE CALLER'S, and a route folder MUST apply it. The dispatcher gated every
 * authenticated route at one point before its branches; a route folder bypasses the dispatcher, so
 * without this call the folder would serve an anonymous request. `loginRedirect` is the matching
 * redirect. Together they are the "auth gate" tb-0030 step 6 moves into `app/lib/router.js`.
 */
export function userOf(req) {
  const u = req && req.user;
  if (!u || !u.id) return null;
  return { name: u.username || u.email || "User", email: u.email || "" };
}

/** The `/login?next=…` redirect an unauthenticated request to a gated route gets. */
export function loginRedirect(req, path) {
  const next = encodeURIComponent(path + (req && req.query ? "?" + req.query : ""));
  return { redirect: "/login?next=" + next, status: 303 };
}

/** A query value with its empty-value fallback — the dispatcher's `pick`. */
export const pick = (value, fallback) =>
  value === undefined || value === null || value === "" ? fallback : value;

/** The dispatcher's checkbox coercion: the truthy spellings become `"on"`, everything else `""`. */
export const flag = (value) => (value === "1" || value === "on" || value === "true" ? "on" : "");

/** `{0:"Purchase",…}` -> `[{code:0,label:"Purchase"},…]`, the shape the type selects render. */
export const typeOptions = (map) =>
  Object.keys(map).map((code) => ({ code: Number(code), label: map[code] }));

/**
 * The logged-in user's id as canonical UUID hex, for the invoice lease and creator columns.
 *
 * The host resolves `req.user.id` as a UUID string; this normalises it to the uppercase hex the
 * schema stores. Used by the invoice-entry family (lease owner, creator), so it lives here rather
 * than in each route folder.
 */
export function userHex(req) {
  const id = String((req && req.user && req.user.id) || "");
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)
    ? id.replace(/-/g, "").toUpperCase()
    : b64ToHex(id);
}

/** Tolerant percent-decoding for a single value (a route id), the dispatcher's `decode`. */
export function decode(value) {
  try {
    return decodeURIComponent(String(value).replace(/\+/g, " "));
  } catch (e) {
    return String(value);
  }
}

/** The 409 the invoice-entry routes return when another device holds the invoice's lease. */
export const locked = () => ({
  body: JSON.stringify({ error: "locked", holder: "another device" }),
  contentType: "application/json; charset=utf-8",
  status: 409,
});

/** Parse a JSON request body, or `{}` when the content type is not JSON or the body is malformed. */
export function jsonBody(req) {
  const contentType = String((req && req.headers && req.headers["content-type"]) || "");
  if (!contentType.includes("application/json")) return {};
  try {
    return JSON.parse(String((req && req.body) || "{}"));
  } catch {
    return {};
  }
}

/** `db.all` returns rows as value arrays against a known column order; this names them. */
export const rowsToObjects = (columns, rows) =>
  (rows ?? []).map((values) => Object.fromEntries(columns.map((c, i) => [c, values[i]])));