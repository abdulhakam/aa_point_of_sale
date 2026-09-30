// Guest route helpersABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_
//
// These exist because the same four things were written by hand at ~80 call sites, and two of
// them were correctness rules rather than conveniences:
//
//   write()      a write must invalidate the report snapshot, or the next report is stale
//                ([[reports.no_precomputation]]). It was enforced by remembering to add
//                `A.service.invalidate()` after every mutation; this makes it the call's type.
//   refs()       `getViews(["refs"])` then null-coalesce each list a template wants.
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

import { getViews, invalidate } from "./reports.js";
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
  invalidate();
  return result;
}

export { invalidate };

/**
 * The reference snapshot (`parties`, `bookers`, `areas`, `sections`, `companies`, `items`, …).
 *
 * This is NOT a cache: `getViews` already holds `state.views.refs` and rebuilds only when it is
 * missing or invalidated. The win is that a handler stops writing `refs.parties ?? []` per list —
 * nine handlers each open with `getViews(["refs"])` and then null-coalesce the two or three lists
 * their template reads. Every list is an array here, always.
 */
export async function refs() {
  const snap = await getViews(["refs"]);
  return snap.views.refs ?? {};
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