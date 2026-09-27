import { defineConfig, addPeriodicCallback } from "trailbase-wasm";
import { HttpHandler, HttpResponse } from "trailbase-wasm/http";
import type { HttpRequest } from "trailbase-wasm/http";
import { query, execute, Transaction } from "trailbase-wasm/db";
import { readFileSync } from "trailbase-wasm/fs";
import { open as openKv } from "trailbase-wasm/kv";

const enc = (s: string) => new TextEncoder().encode(s);

async function jsonResult(fn: () => unknown | Promise<unknown>): Promise<HttpResponse> {
  try {
    const value = await fn();
    return HttpResponse.json({ ok: true, value } as object);
  } catch (err) {
    return HttpResponse.json({
      ok: false,
      error: String(err),
      kind: err instanceof Error ? err.name : typeof err,
      stack: err instanceof Error ? err.stack : undefined,
    } as object);
  }
}

const FS_PROBES = [
  "/config.json",
  "/pages/demo/meta.json",
  "/compute/hello.js",
  "/config.textproto",
  "/package.json",
  "/../config.textproto",
  "/pages/../config.json",
];

export const { initEndpoint, incomingHandler, sqliteFunctionEndpoint } = defineConfig({
  metadata: {
    display_name: "AA POS Phase-0 Spike",
    description: "Throw-away capability spike guest for the wasm app platform plan",
    version: "0.0.1",
  },
  httpHandlers: [
    // S1 — baseline
    HttpHandler.get("/spike/health", () => "ok"),

    // S2 — auth
    HttpHandler.get("/spike/user", (req) => {
      const user = req.user();
      return HttpResponse.json({
        user,
        cookie: req.headers().some(([k, v]) => k.toLowerCase() === "cookie" && v.length > 0),
        authorization: req.headers().some(([k]) => k.toLowerCase() === "authorization"),
        xCsrf: req.headers().find(([k]) => k.toLowerCase() === "x-csrf-token")?.[1] ?? null,
      } as object);
    }),
    HttpHandler.post("/spike/echo", (req) => {
      const body = req.body();
      const text = body ? new TextDecoder().decode(body) : "";
      return HttpResponse.json({
        method: req.method(),
        contentType: req.headers().find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? null,
        csrfHeader: req.headers().find(([k]) => k.toLowerCase() === "x-csrf-token")?.[1] ?? null,
        len: text.length,
        text,
        user: req.user(),
      } as object);
    }),

    // S3 — filesystem preopen
    HttpHandler.get("/spike/read", (req) =>
      jsonResult(() => {
        const p = req.getQueryParam("p") ?? "/config.json";
        const bytes = readFileSync(p);
        return { path: p, size: bytes.length, text: new TextDecoder().decode(bytes) };
      }),
    ),
    HttpHandler.get("/spike/fs", () =>
      jsonResult(() => {
        const results: Record<string, unknown> = {};
        for (const p of FS_PROBES) {
          try {
            const bytes = readFileSync(p);
            const preview = new TextDecoder().decode(bytes.slice(0, 80));
            results[p] = { ok: true, size: bytes.length, preview };
          } catch (err) {
            results[p] = { ok: false, error: String(err) };
          }
        }
        return results;
      }),
    ),

    // S4 — runtime JS eval
    HttpHandler.get("/spike/eval", () =>
      jsonResult(() => {
        const out: Record<string, unknown> = {};
        try {
          const fn = new Function("a", "b", "return a + b");
          out.newFunction = (fn as (a: number, b: number) => number)(2, 3);
        } catch (err) {
          out.newFunctionError = String(err);
        }
        try {
          // eslint-disable-next-line no-eval
          out.eval = (0, eval)("6 * 7");
        } catch (err) {
          out.evalError = String(err);
        }
        try {
          const factory = new Function("cfg", "return cfg.fn(cfg.arg)");
          out.factory = (factory as (c: { fn: (a: number) => number; arg: number }) => number)({
            fn: (a) => a * 10,
            arg: 7,
          });
        } catch (err) {
          out.factoryError = String(err);
        }
        return out;
      }),
    ),

    // S4b — load business JS from the app dir and eval it at runtime (the D2 mechanism)
    HttpHandler.get("/spike/eval-file", (req) =>
      jsonResult(() => {
        const p = req.getQueryParam("p") ?? "/compute/hello.js";
        const src = new TextDecoder().decode(readFileSync(p));
        const body = src
          .replace(/\bexport\s+function\b/g, "function")
          .replace(/\bexport\s+(const|let|var)\b/g, "$1");
        const factory = new Function(
          `${body}\nreturn typeof greet === "function" ? greet : undefined;`,
        );
        const greet = factory() as (() => string) | undefined;
        return { path: p, sourceBytes: src.length, evaluated: greet ? greet() : null };
      }),
    ),

    // S5 — concurrency: blocking CPU vs async
    HttpHandler.get("/spike/cpu", (req) => {
      const n = parseInt(req.getQueryParam("n") ?? "20000000");
      let acc = 0;
      for (let i = 0; i < n; i++) acc = (acc + Math.sqrt(i)) % 1000003;
      return `cpu n=${n} acc=${acc.toFixed(3)}`;
    }),
    HttpHandler.get("/spike/sleep", async (req) => {
      const ms = parseInt(req.getQueryParam("ms") ?? "1000");
      const start = Date.now();
      await new Promise((r) => setTimeout(r, ms));
      return `sleep ${ms}ms elapsed ${Date.now() - start}ms at ${new Date().toISOString()}`;
    }),
    HttpHandler.get("/spike/now", () =>
      HttpResponse.json({ t0: Date.now(), iso: new Date().toISOString() } as object),
    ),
    HttpHandler.get("/spike/busy", (req) => {
      const n = parseInt(req.getQueryParam("n") ?? "100000000");
      let acc = 0;
      for (let i = 0; i < n; i++) acc = (acc + (i % 7)) | 0;
      return `busy n=${n} acc=${acc} t=${Date.now()}`;
    }),
    HttpHandler.get("/spike/timer", () => {
      addPeriodicCallback(100, () => {});
      return "timer registered";
    }),

    // S6 — outbound fetch to self
    HttpHandler.get("/spike/fetch", (req) =>
      jsonResult(async () => {
        const url = req.getQueryParam("url") ?? "http://127.0.0.1:4001/spike/health";
        const res = await fetch(url);
        const body = await res.text();
        return { url, status: res.status, body: body.slice(0, 200) };
      }),
    ),
    HttpHandler.get("/spike/fetch-self-relative", (req) =>
      jsonResult(async () => {
        const authority = req.authority();
        const scheme = (req.scheme() ?? "HTTP").toLowerCase();
        const url = `${scheme}://${authority}/spike/health`;
        const res = await fetch(url);
        return { url, status: res.status, body: (await res.text()).slice(0, 200) };
      }),
    ),

    // S7 — Transaction + UPDATE ... RETURNING
    HttpHandler.post("/spike/tx", () =>
      jsonResult(() => {
        const out: Record<string, unknown> = {};
        try {
          out.globalQuery = typeof query;
        } catch (err) {
          out.globalQueryError = String(err);
        }
        // Set up scratch table (committed separately).
        const setup = new Transaction();
        try {
          setup.execute("CREATE TABLE IF NOT EXISTS _spike_claim(id INTEGER PRIMARY KEY, state TEXT, lease_until INTEGER)", []);
          setup.execute("DELETE FROM _spike_claim", []);
          setup.execute("INSERT INTO _spike_claim(id,state,lease_until) VALUES (1,'queued',0)", []);
          setup.commit();
          out.setup = "ok";
        } catch (err) {
          try { setup.rollback(); } catch {}
          out.setupError = String(err);
        }

        // Claim attempt 1 should win.
        const claim = (label: string) => {
          const tx = new Transaction();
          try {
            const rows = tx.query(
              "UPDATE _spike_claim SET state='leased', lease_until=? WHERE id=1 AND state='queued' RETURNING id, state, lease_until",
              [Date.now() + 60000],
            );
            tx.commit();
            out[label] = { rows };
          } catch (err) {
            try { tx.rollback(); } catch {}
            out[label] = { error: String(err) };
          }
        };
        claim("claim1");
        claim("claim2");

        // Constraint error string.
        const bad = new Transaction();
        try {
          bad.execute("INSERT INTO _spike_claim(id,state) VALUES (1,'dup')", []);
          bad.commit();
          out.dupInsert = "unexpected-ok";
        } catch (err) {
          try { bad.rollback(); } catch {}
          out.dupInsertError = String(err);
        }

        // Cleanup.
        const cleanup = new Transaction();
        try {
          cleanup.execute("DROP TABLE IF EXISTS _spike_claim", []);
          cleanup.commit();
        } catch {}
        return out;
      }),
    ),

    // KV + metadata sanity
    HttpHandler.get("/spike/kv", () =>
      jsonResult(() => {
        const store = openKv();
        const key = `spike-${Date.now()}`;
        store.set(key, enc("hello"));
        const got = store.get(key);
        const exists = store.exists(key);
        store.delete(key);
        return { got: got ? new TextDecoder().decode(got) : null, exists, afterDelete: store.exists(key) };
      }),
    ),
    HttpHandler.get("/spike/err", () =>
      jsonResult(() => {
        const out: Record<string, unknown> = {};
        const setup = new Transaction();
        try {
          setup.execute("CREATE TABLE IF NOT EXISTS _spike_err(id INTEGER PRIMARY KEY)", []);
          setup.execute("DELETE FROM _spike_err", []);
          setup.execute("INSERT INTO _spike_err(id) VALUES (1)", []);
          setup.commit();
        } catch (err) {
          try { setup.rollback(); } catch {}
          out.setupError = String(err);
        }
        const dup = new Transaction();
        try {
          dup.execute("INSERT INTO _spike_err(id) VALUES (1)", []);
          dup.commit();
          out.dup = "ok-unexpected";
        } catch (err) {
          try { dup.rollback(); } catch {}
          const e = err as { name?: string; message?: string; payload?: unknown };
          out.s = String(err);
          out.name = e?.name ?? null;
          out.message = e?.message ?? null;
          try { out.payload = JSON.stringify(e?.payload); } catch { out.payload = String(e?.payload); }
          try { out.keys = Object.keys(err as object); } catch { out.keys = "n/a"; }
        }
        const drop = new Transaction();
        try { drop.execute("DROP TABLE IF EXISTS _spike_err", []); drop.commit(); } catch {}
        return out;
      }),
    ),
    HttpHandler.get("/spike/query", () =>
      jsonResult(async () => {
        const rows = await query("SELECT COUNT(*) FROM items", []);
        return { items: String(rows[0][0]) };
      }),
    ),
    HttpHandler.get("/spike/execute", () =>
      jsonResult(async () => {
        const changes = await execute("UPDATE items SET barcode = barcode WHERE 0", []);
        return { changes };
      }),
    ),
  ],
  jobHandlers: [],
});
