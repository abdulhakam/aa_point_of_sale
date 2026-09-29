// The materialised-document service: read an invoice document, report on the cache, rebuild it.
//
// A plain script (not an ES module) that installs `globalThis.__AA_INVDOC__`, for the same reason
// `queue.js` is one: the host evaluates `/ahscripts/init/**.js` in a fresh QuickJS context with no
// module loader, and the automatic rebuild at server start has to run exactly the same code the
// request path runs. One implementation, two callers.
//
// Everything here is async. `sqlite.all` / `sqlite.execute` / `kv.get` / `kv.set` are host functions
// declared `Async(...)`, so they return promises; calling one without `await` yields a Promise
// object, and a Promise is truthy and has no `.length`, so a synchronous wrapper silently reads an
// empty database rather than failing. `status()` returning `documents: 0` against a populated
// `inv_doc` is what that looks like from the outside.
//
// Where the documents come from
// -----------------------------
// The statement that builds a document is not written here. It is stored in the depot, in
// `materialised_source.sql`, by the migration that defines it
// (`U1790300500__invoice_document_sync.sql`), and the triggers in that same migration are
// narrowings of that text. So a rebuild here is literally "run the statement the triggers are
// derived from" -- there is no second place for the arithmetic to be correct in.
//
// Rebuild shape
// -------------
// Shadow table, then swap. The obvious `DELETE FROM inv_doc; <build>` is two statements, and the
// guest's DB bridge runs one statement per call, so a concurrent reader could see the table empty
// in between. Building into the shadow table first means the old documents are still there for the
// whole build, and if the build fails they are still there afterwards.
//
// Concurrency
// -----------
// The host has one WASM runtime per thread, and each runs the init scripts, so an in-process
// `running` flag is per runtime and would not stop two of them rebuilding into the same shadow
// table. The lease is therefore in the key-value store, which is shared. A lease older than
// LEASE_MS is treated as abandoned, because a crashed rebuild would otherwise block every later one.

(function () {
  const SHADOW = "inv_doc__rebuild";
  const KV_PREFIX = "materialised/invoice/";
  const LEASE_MS = 120_000;

  // ---------------------------------------------------------------- helpers

  function txt(v) {
    // The bridge binds text parameters only; a number passed raw fails with an opaque error
    // (issues/guest-db-bridge-text-params-only).
    return String(v);
  }

  async function kvGet(key) {
    try {
      const v = globalThis.kv ? await globalThis.kv.get(key) : null;
      return v === null || v === undefined ? null : String(v);
    } catch {
      return null;
    }
  }

  async function kvSet(key, value) {
    try {
      if (globalThis.kv) await globalThis.kv.set(key, String(value));
      return true;
    } catch {
      return false; // the store is a convenience here, never a correctness dependency
    }
  }

  async function kvJson(key) {
    const raw = await kvGet(key);
    if (!raw) return {};
    try {
      return JSON.parse(raw) || {};
    } catch {
      return {};
    }
  }

  async function rows(sql, params) {
    return await globalThis.sqlite.all(sql, params || []);
  }

  async function scalar(sql, params) {
    const r = await rows(sql, params);
    return r && r.length ? r[0][0] : null;
  }

  async function count(sql, params) {
    const v = await scalar(sql, params);
    return typeof v === "number" ? v : Number(v || 0);
  }

  // ---------------------------------------------------------------- the stored build

  /** The registry row the migration wrote: which statement builds this document type. */
  async function sourceRow(kind) {
    const r = await rows('SELECT "kind", "table_name", "updated", "note" FROM "materialised_source" WHERE "kind" = ?', [
      txt(kind),
    ]);
    if (!r || !r.length) return null;
    return { kind: r[0][0], table: r[0][1], updated: r[0][2], note: r[0][3] };
  }

  /**
   * The build statement for a document kind. Throws when the depot has no row for it, which is the
   * signal that the migration defining the document has not been applied -- reported, not guessed.
   */
  async function buildSql(kind) {
    const sql = await scalar('SELECT "sql" FROM "materialised_source" WHERE "kind" = ?', [txt(kind)]);
    if (!sql) {
      throw new Error(
        `no materialised source registered for kind "${kind}" - the migration that defines it has not been applied`,
      );
    }
    return sql;
  }

  // ---------------------------------------------------------------- the lease

  async function acquireLease(reason) {
    const held = await kvJson(KV_PREFIX + "lease");
    if (held.since && Date.now() - Number(held.since) < LEASE_MS) {
      return { ok: false, held: held };
    }
    const lease = { since: Date.now(), reason: reason, pid: Math.random().toString(36).slice(2) };
    await kvSet(KV_PREFIX + "lease", JSON.stringify(lease));
    // Read it back: another runtime may have written between the read and the write above, and the
    // only way to know which of us won is to compare the token.
    const now = await kvJson(KV_PREFIX + "lease");
    if (now.pid !== lease.pid) return { ok: false, held: now };
    return { ok: true, lease: lease };
  }

  async function releaseLease() {
    await kvSet(KV_PREFIX + "lease", "");
  }

  // ---------------------------------------------------------------- status

  /**
   * What a screen needs to decide whether to trust the cache and whether to rebuild it. Cheap: a
   * handful of aggregate reads over generated columns.
   */
  async function status(options) {
    const kind = (options && options.kind) || "invoice.build";
    const source = await sourceRow(kind);
    const table = source ? source.table : "inv_doc";
    const hasTable = (await scalar('SELECT COUNT(*) FROM sqlite_master WHERE type = ? AND name = ?', [
      "table",
      table,
    ])) !== null;
    if (!hasTable) {
      return {
        kind: kind,
        table: table,
        registered: false,
        source: null,
        sourceUpdated: null,
        present: false,
        documents: 0,
        payloadBytes: 0,
        lines: 0,
        baseInvoices: await count('SELECT COUNT(*) FROM "invoices" WHERE "deleted" = 0'),
        inStepWithBase: false,
        lastRebuild: null,
        running: null,
      };
    }
    const documents = await count(`SELECT COUNT(*) FROM "${table}"`);
    const baseInvoices = await count('SELECT COUNT(*) FROM "invoices" WHERE "deleted" = 0');
    const lease = await kvJson(KV_PREFIX + "lease");
    const leaseLive = lease.since && Date.now() - Number(lease.since) < LEASE_MS;
    return {
      kind: kind,
      table: table,
      registered: !!source,
      present: true,
      source: source,
      sourceUpdated: source ? source.updated : null,
      documents: documents,
      payloadBytes: await count(`SELECT COALESCE(SUM(LENGTH("doc")), 0) FROM "${table}"`),
      lines: await count(`SELECT COALESCE(SUM("line_count"), 0) FROM "${table}"`),
      baseInvoices: baseInvoices,
      // The one number that matters: if these disagree, some write reached the base tables without
      // reaching the document, and the only correct repair is a rebuild.
      inStepWithBase: documents === baseInvoices,
      lastRebuild: await kvJson(KV_PREFIX + "state"),
      // A lease left behind by a crashed rebuild is not a running rebuild, or every later attempt
      // would be refused until the TTL expired.
      running: leaseLive ? lease : null,
    };
  }

  /**
   * Drift between the documents and the base tables. More than a count, because a count can match
   * while the contents are wrong: this re-adds each document's own lines and compares the total it
   * stored. Costs a `json_each` pass over the documents, so it is a report, not a page load.
   */
  async function verify() {
    const problems = [];
    const add = async (check, sql) => {
      const n = await count(sql);
      if (n) problems.push({ check: check, disagreeing: n });
    };
    await add(
      "total does not equal the sum of the document's own lines",
      `SELECT COUNT(*) FROM "inv_doc"
       WHERE ABS(CAST("total" AS REAL)
                 - (SELECT COALESCE(SUM(CAST(json_extract(l.value, '$.total') AS REAL)), 0)
                    FROM json_each("doc", '$.lines') l)) > 0.005`,
    );
    await add(
      "paid_total does not equal the sum of the document's own paid payments",
      `SELECT COUNT(*) FROM "inv_doc"
       WHERE ABS(CAST("paid_total" AS REAL)
                 - (SELECT COALESCE(SUM(CASE WHEN CAST(json_extract(p.value, '$.paid') AS INTEGER) = 1
                                            THEN CAST(json_extract(p.value, '$.amount') AS REAL) ELSE 0 END), 0)
                    FROM json_each("doc", '$.payments') p)) > 0.005`,
    );
    await add(
      "a line has an item id but no item name",
      `SELECT COUNT(*) FROM "inv_doc" d, json_each(d."doc", '$.lines') l
       WHERE json_extract(l.value, '$.item') IS NOT NULL
         AND json_extract(l.value, '$.item_name') IS NULL`,
    );
    await add(
      "a document exists for an invoice that is not live",
      `SELECT COUNT(*) FROM "inv_doc" d
       WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i."id" = d."id" AND i."deleted" = 0)`,
    );
    await add(
      "a live invoice has no document",
      `SELECT COUNT(*) FROM invoices i
       WHERE i."deleted" = 0 AND NOT EXISTS (SELECT 1 FROM inv_doc d WHERE d."id" = i."id")`,
    );
    // A name that is present but WRONG is the one drift a self-consistency check cannot see:
    // a document whose party_name no longer matches the party row is internally consistent and
    // still a lie. So the denormalised names are compared against the base tables.
    //
    // This is the check that would have caught a broken rename trigger. It is a join per
    // document, so it belongs in a report rather than on a page load -- which is where `verify()`
    // already lives.
    await add(
      "the document's party name no longer matches the party row",
      `SELECT COUNT(*) FROM inv_doc d JOIN parties p ON p."id" = unhex(d."party")
       WHERE json_extract(d."doc", '$.party_name') IS NOT p."name"`,
    );
    await add(
      "the document's booker name no longer matches the booker row",
      `SELECT COUNT(*) FROM inv_doc d JOIN order_bookers b ON b."id" = unhex(d."booker")
       WHERE json_extract(d."doc", '$.booker_name') IS NOT b."name"`,
    );
    await add(
      "a line's item name no longer matches the item row",
      `SELECT COUNT(*) FROM inv_doc d, json_each(d."doc", '$.lines') l JOIN items i ON i."id" = unhex(json_extract(l.value, '$.item'))
       WHERE json_extract(l.value, '$.item_name') IS NOT i."name"`,
    );
    await add(
      "a payment's type name no longer matches the payment type row",
      `SELECT COUNT(*) FROM inv_doc d, json_each(d."doc", '$.payments') p
       JOIN payment_types t ON t."id" = json_extract(p.value, '$.type')
       WHERE json_extract(p.value, '$.type_name') IS NOT t."name"`,
    );
    return { ok: problems.length === 0, checkedAt: new Date().toISOString(), problems: problems };
  }

  // ---------------------------------------------------------------- rebuild

  async function dropShadow() {
    try {
      await globalThis.sqlite.execute(`DROP TABLE IF EXISTS "${SHADOW}"`);
    } catch {
      /* never created, or already gone */
    }
  }

  /**
   * Rebuild every document from the base tables.
   *
   * `reason` is recorded so the difference between "the server restarted and healed it" and
   * "somebody pressed the button" is visible afterwards. That distinction is what makes the
   * automatic path safe to have unattended.
   */
  async function rebuild(options) {
    const opts = options || {};
    const kind = opts.kind || "invoice.build";
    const reason = opts.reason || "manual";
    const source = await sourceRow(kind);
    if (!source) return { ok: false, error: `no materialised source registered for kind "${kind}"` };

    const lease = await acquireLease(reason);
    if (!lease.ok) {
      return { ok: false, error: "a rebuild is already running", held: lease.held };
    }

    const table = source.table;
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    await kvSet(KV_PREFIX + "phase", "building");

    try {
      const sql = await buildSql(kind);
      await dropShadow();
      // `CREATE TABLE ... AS SELECT ... WHERE 0` copies the shape without the rows. The STORED
      // generated columns come with it; the indexes are not copied and are not needed for a build.
      await globalThis.sqlite.execute(
        `CREATE TABLE "${SHADOW}" AS SELECT "id", "doc" FROM "${table}" WHERE 0`,
      );
      await globalThis.sqlite.execute(
        sql.replace(new RegExp(`INSERT INTO "${table}"`, "g"), `INSERT INTO "${SHADOW}"`),
      );
      const built = await count(`SELECT COUNT(*) FROM "${SHADOW}"`);
      await kvSet(KV_PREFIX + "phase", "swapping");
      await globalThis.sqlite.execute(`DELETE FROM "${table}"`);
      await globalThis.sqlite.execute(
        `INSERT INTO "${table}" ("id", "doc") SELECT "id", "doc" FROM "${SHADOW}"`,
      );
      await dropShadow();
      await globalThis.sqlite.execute(`ANALYZE "${table}"`);

      const result = {
        ok: true,
        reason: reason,
        kind: kind,
        table: table,
        documents: built,
        durationMs: Date.now() - t0,
        startedAt: startedAt,
        finishedAt: new Date().toISOString(),
      };
      await kvSet(KV_PREFIX + "state", JSON.stringify(result));
      await kvSet(KV_PREFIX + "phase", "idle");
      return result;
    } catch (error) {
      const message = String((error && error.message) || error);
      await dropShadow();
      await kvSet(KV_PREFIX + "state", JSON.stringify({ running: false, error: message, reason: reason, finishedAt: new Date().toISOString() }));
      await kvSet(KV_PREFIX + "phase", "failed");
      return { ok: false, error: message, reason: reason };
    } finally {
      await releaseLease();
    }
  }

  /**
   * Decide whether the documents need rebuilding and rebuild them in this call.
   *
   * Deliberately NOT wired to server start yet. The host runs `/ahscripts/init/**.js` on every
   * WASM runtime (`runtime::init()` in `host/src/runtime.rs` is thread-local), so a rebuild driven
   * from an init script costs up to ten seconds on the first request of each of the four threads
   * after every restart. On-demand rebuild is the current feature; the automatic path is left for
   * when the rebuild can run off the request path, and this function is the piece it will call.
   */
  async function ensureFresh(options) {
    const opts = options || {};
    const before = await status();
    if (!before.present) {
      return { ok: false, skipped: true, reason: `table "${before.table}" does not exist - the migration has not been applied` };
    }
    if (!before.registered) {
      return { ok: false, skipped: true, reason: "no materialised source registered" };
    }
    if (before.running) {
      return { ok: true, skipped: true, reason: "a rebuild is already running", lastRebuild: before.lastRebuild };
    }
    if (opts.force !== true && before.inStepWithBase && before.lastRebuild && before.lastRebuild.finishedAt) {
      return { ok: true, skipped: true, reason: "documents are in step with the base tables", lastRebuild: before.lastRebuild };
    }
    return await rebuild({ reason: opts.reason || "server-start" });
  }

  /**
   * Rebuild on demand, through the durable job queue.
   *
   * A rebuild is a multi-second operation, so it goes on the queue rather than into the request.
   * That is not only for durability -- the guest's WASM call deadline is around 20 s, and a full
   * rebuild of the production depot is 3-10 s, so an inline rebuild finishes its work and then
   * loses the HTTP response to the deadline. Enqueue-only returns immediately with a job id and
   * the minutely poller does the work; `reconcile: true` runs it in the same call, which is
   * convenient on a small depot and in tests.
   *
   * The automatic start-up path would use this too, with a cheap "out of step?" check first. See
   * `ensureFresh()`.
   */
  async function requestRebuild(options) {
    const opts = options || {};
    const kind = opts.kind || "invoice.build";
    const reason = opts.reason || "manual";
    if (opts.inline === true) return await rebuild({ kind: kind, reason: reason });
    if (!globalThis.__AA_QUEUE__) return { ok: false, error: "the job queue is not loaded in this runtime" };
    try {
      const jobHex = await globalThis.__AA_QUEUE__.enqueue(globalThis.sqlite, "invdoc.rebuild", { kind: kind, reason: reason });
      if (opts.reconcile !== false) await globalThis.__AA_QUEUE__.reconcile(globalThis.sqlite);
      const view = await globalThis.__AA_QUEUE__.jobView(globalThis.sqlite, jobHex);
      return { ok: true, queued: true, job: view };
    } catch (error) {
      return { ok: false, error: String((error && error.message) || error) };
    }
  }

  // ---------------------------------------------------------------- reads

  /**
   * TrailBase's record API hands ids out as padded URL-safe base64 (`value_to_json` in
   * `host/src/api.rs`), so that is the form `list()` returns and the form a caller has. Accept
   * plain hex and the human `inv-<no>` id too, because a person reading a log will have those.
   *
   * The padding has to be discarded as *bits*, not just as characters: a 16-byte id is 22 base64
   * characters, which is 132 bits, and the trailing four are not part of the value.
   */
  function b64ToHex(value) {
    const padded = String(value).replace(/-/g, "+").replace(/_/g, "/");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let clean = "";
    for (const ch of padded) {
      if (ch === "=") continue;
      if (alphabet.indexOf(ch) < 0) return null;
      clean += ch;
    }
    if (clean.length < 2) return null;
    let bits = "";
    for (const ch of clean) bits += alphabet.indexOf(ch).toString(2).padStart(6, "0");
    bits = bits.slice(0, Math.floor(bits.length / 8) * 8);
    let hex = "";
    for (let i = 0; i < bits.length; i += 8) hex += parseInt(bits.slice(i, i + 8), 2).toString(16).padStart(2, "0");
    return hex;
  }

  /** One whole document, by base64 id, hex id, or the human `inv-<no>` id. */
  async function read(ref) {
    const key = String(ref === undefined || ref === null ? "" : ref);
    // Each candidate is matched on its own so a base64 id containing "-" is not mangled by a
    // "strip the dashes from a hex id" step meant for the other form.
    const candidates = [key];
    if (/^[0-9a-fA-F]{8,}$/.test(key)) candidates.push(key);
    const fromB64 = b64ToHex(key);
    if (fromB64) candidates.push(fromB64);
    const ors = candidates.map(() => '("id" = unhex(?) OR "readable_id" = ?)').join(" OR ");
    const params = [];
    for (const c of candidates) params.push(c, c);
    const r = await rows(`SELECT "doc" FROM "inv_doc" WHERE ${ors} LIMIT 1`, params);
    if (!r || !r.length) return null;
    try {
      return JSON.parse(r[0][0]);
    } catch (error) {
      return { error: "document is not valid JSON: " + String((error && error.message) || error) };
    }
  }

  /**
   * Invoice summaries from the generated columns -- no JSON parsing, no joins. This is the read that
   * turns an invoice list or an outstanding report from a five-table join into one indexed scan.
   *
   * Filters are bound parameters, never interpolated. The bridge binds text only, and a caller
   * passing a number would fail with an opaque error, so `txt()` is applied uniformly.
   */
  async function list(query) {
    const q = query || {};
    const where = [];
    const params = [];
    const eq = (col, value) => {
      if (value === undefined || value === null || value === "") return;
      where.push(`"${col}" = ?`);
      params.push(txt(value));
    };
    const between = (col, from, to) => {
      if (from) {
        where.push(`"${col}" >= ?`);
        params.push(txt(from));
      }
      if (to) {
        where.push(`"${col}" <= ?`);
        params.push(txt(to));
      }
    };
    eq("inv_type", q.type);
    eq("party", q.party);
    eq("booker", q.booker);
    eq("completed", q.completed);
    between("dated", q.datedFrom, q.datedTo);
    if (q.unpaid === true || q.unpaid === "true") where.push('"remaining" <> 0');
    const limit = Math.max(1, Math.min(1000, Number(q.limit) || 100));
    const offset = Math.max(0, Number(q.offset) || 0);
    const order = q.order === "asc" ? "ASC" : "DESC";
    const orderCol = ["dated", "total", "remaining", "invoice_no"].includes(q.orderBy) ? q.orderBy : "invoice_no";
    const clause = where.length ? "WHERE " + where.join(" AND ") : "";
    const data = await rows(
      `SELECT "id", "readable_id", "inv_type", "invoice_no", "party", "booker", "dated", "completed",
              "total", "final_total", "paid_total", "remaining", "line_count"
       FROM "inv_doc" ${clause}
       ORDER BY "${orderCol}" ${order}, "id" DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    return {
      total: await count(`SELECT COUNT(*) FROM "inv_doc" ${clause}`, params),
      limit: limit,
      offset: offset,
      rows: (data || []).map((x) => ({
        id: x[0],
        readableId: x[1],
        type: x[2],
        invoiceNo: x[3],
        party: x[4],
        booker: x[5],
        dated: x[6],
        completed: x[7],
        total: x[8],
        finalTotal: x[9],
        paidTotal: x[10],
        remaining: x[11],
        lineCount: x[12],
      })),
    };
  }

  const b64ToHexRef = b64ToHex;
  globalThis.__AA_INVDOC__ = {
    SHADOW: SHADOW,
    LEASE_MS: LEASE_MS,
    status: status,
    verify: verify,
    rebuild: rebuild,
    requestRebuild: requestRebuild,
    ensureFresh: ensureFresh,
    read: read,
    list: list,
    buildSql: buildSql,
    sourceRow: sourceRow,
    b64ToHex: b64ToHexRef,
    kvGet: kvGet,
    kvSet: kvSet,
    kvJson: kvJson,
  };
})();
