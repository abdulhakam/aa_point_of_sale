// Durable job queue engine — a plain script that installs `globalThis.__AA_QUEUE__`.
//
// It is loaded two ways: the dispatcher evaluates it on first use, and the scheduled
// `ahscripts/jobs/reconcile.js` evaluates it in the scheduler's fresh runtime. Keeping it a
// plain script (not an ES module) is what lets both runtimes share one engine without a loader.
//
// Steps are leased (claim = one atomic UPDATE … RETURNING), retried with backoff, and every
// step's effect is recorded in `job_artifact` under a UNIQUE key, so at-least-once dispatch
// cannot double-apply.

(function () {
  const MAX_ATTEMPTS = 5;
  const LEASE_MS = 15_000;
  const BACKOFF_MS = 200;

  function nowIso(offsetMs = 0) {
    const d = new Date(Date.now() + offsetMs);
    const p = (n, w = 2) => String(n).padStart(w, "0");
    return (
      `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
      `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}.${p(d.getUTCMilliseconds(), 3)}Z`
    );
  }

  const uuidHex = async (db) => (await db.all("SELECT hex(uuid_v7()) AS hx", []))[0][0];

  /** A job spec turns an input into steps and executes one step (idempotently). */
  const JOBS = {
    "demo.count": {
      steps(input) {
        const count = Math.max(1, Math.min(50, Number(input?.count) || 3));
        return Array.from({ length: count }, (_, i) => ({ name: "count", input: { i } }));
      },
      async runStep(step, ctx) {
        const i = Number(step.input?.i) || 0;
        await ctx.record(`${i + 1}`);
        return { i, value: i + 1 };
      },
      reduce(results) {
        return { steps: results.length, sum: results.reduce((n, r) => n + (Number(r?.value) || 0), 0) };
      },
    },

    // Rebuild the materialised documents (tb-0027). One step, because a rebuild is a single
    // statement: splitting it would mean two steps that could each fail with the cache half-built.
    //
    // On the queue rather than inline in the request because a full rebuild is seconds of SQLite
    // work against a guest call deadline of about 20 s: run inline, the rebuild finishes and the
    // HTTP response is lost to the deadline. The route enqueues and returns a job id; the minutely
    // poller runs it, and `?reconcile=1` runs it in the same call for tests and small depots.
    //
    // The one step records its outcome under a UNIQUE key, so a redelivery after a crash cannot
    // rebuild twice. `rebuild()` is idempotent anyway, but a duplicate that costs seconds is
    // exactly what this path exists to avoid.
    "invdoc.rebuild": {
      steps(input) {
        return [{ name: "rebuild", input: { kind: input?.kind || "invoice.build", reason: input?.reason || "manual" } }];
      },
      async runStep(step, ctx) {
        if (!globalThis.__AA_INVDOC__) {
          const source = await fs.readFile("/app/lib/invoice-doc.js");
          (0, eval)(source);
        }
        const result = await globalThis.__AA_INVDOC__.rebuild({
          kind: step.input?.kind,
          reason: step.input?.reason,
        });
        if (!result.ok) throw new Error(result.error || "rebuild failed");
        await ctx.record(JSON.stringify({ documents: result.documents, durationMs: result.durationMs }));
        return { documents: result.documents, durationMs: result.durationMs, reason: result.reason };
      },
      reduce(results) {
        return { rebuilt: results.length, documents: results[0]?.documents ?? 0, durationMs: results[0]?.durationMs ?? 0 };
      },
    },
  };

  async function enqueue(db, name, input) {
    const spec = JOBS[name];
    if (!spec) throw new Error(`Unknown job: ${name}`);
    const jobHex = await uuidHex(db);
    await db.execute('INSERT INTO "job" ("id", "name", "input") VALUES (unhex(?), ?, ?)', [
      jobHex,
      name,
      JSON.stringify(input ?? {}),
    ]);
    const steps = spec.steps(input ?? {}, jobHex);
    for (let seq = 0; seq < steps.length; seq++) {
      const step = steps[seq];
      await db.execute(
        'INSERT INTO "job_step" ("job", "seq", "name", "idempotency_key", "input") VALUES (unhex(?), ?, ?, ?, ?)',
        [jobHex, String(seq), step.name ?? "step", `${jobHex}:${seq}`, JSON.stringify(step.input ?? {})]
      );
    }
    return jobHex;
  }

  async function claimDue(db, now, leaseUntil) {
    const rows = await db.all(
      `UPDATE "job_step" SET "state" = 'running', "attempt" = "attempt" + 1, "lease_until" = ?
       WHERE "id" = (
         SELECT s."id" FROM "job_step" s JOIN "job" j ON j."id" = s."job"
         WHERE j."state" IN ('pending','running')
           AND ( (s."state" = 'pending' AND (s."lease_until" = '' OR s."lease_until" <= ?))
              OR (s."state" = 'running' AND s."lease_until" <> '' AND s."lease_until" <= ?) )
         ORDER BY s."seq" LIMIT 1
       )
       RETURNING hex("id") AS id_hex, hex("job") AS job_hex, "seq", "name", "idempotency_key", "input", "attempt"`,
      [leaseUntil, now, now]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return { idHex: r[0], jobHex: r[1], seq: r[2], name: r[3], key: r[4], input: JSON.parse(r[5] || "{}"), attempt: r[6] };
  }

  function recordEffect(db, jobHex, key, value) {
    return db.execute('INSERT OR IGNORE INTO "job_artifact" ("job", "step_key", "value") VALUES (unhex(?), ?, ?)', [
      jobHex,
      key,
      String(value ?? ""),
    ]);
  }

  async function runStep(db, spec, step) {
    try {
      const effect = await spec.runStep(step, {
        record: (value) => recordEffect(db, step.jobHex, step.key, value),
      });
      await db.execute('UPDATE "job_step" SET "state" = \'done\', "lease_until" = \'\', "result" = ? WHERE "id" = unhex(?)', [
        JSON.stringify(effect ?? null),
        step.idHex,
      ]);
      return true;
    } catch (error) {
      const failed = step.attempt >= MAX_ATTEMPTS;
      await db.execute(
        'UPDATE "job_step" SET "state" = ?, "lease_until" = ?, "result" = ? WHERE "id" = unhex(?)',
        [failed ? "failed" : "pending", nowIso(BACKOFF_MS * step.attempt), JSON.stringify({ error: String(error) }), step.idHex]
      );
      return false;
    }
  }

  async function finalizeJob(db, jobHex) {
    const rows = await db.all('SELECT "state", "result" FROM "job_step" WHERE "job" = unhex(?) ORDER BY "seq"', [jobHex]);
    const states = (rows ?? []).map((r) => r[0]);
    const results = (rows ?? []).map((r) => (r[1] ? JSON.parse(r[1]) : null));
    const nameRow = await db.all('SELECT "name" FROM "job" WHERE "id" = unhex(?)', [jobHex]);
    const name = nameRow && nameRow[0] ? nameRow[0][0] : "";
    const spec = JOBS[name];
    let state = "done";
    if (states.includes("failed")) state = "failed";
    else if (states.some((s) => s === "pending" || s === "running")) state = "running";
    const result = state === "done" && spec ? spec.reduce(results.filter((r) => r && r.error === undefined)) : {};
    await db.execute('UPDATE "job" SET "state" = ?, "result" = ? WHERE "id" = unhex(?)', [
      state,
      JSON.stringify(result ?? {}),
      jobHex,
    ]);
    return state;
  }

  async function reconcile(db, options = {}) {
    const maxSteps = options.maxSteps ?? 200;
    // `origin` turns reconcile into a dispatcher: claimed steps are POSTed to the worker route
    // (which may run on another runtime thread). Without it, steps run inline.
    const origin = options.origin || "";
    const concurrency = Math.max(1, Math.min(4, Number(options.concurrency) || 1));
    let processed = 0;
    const touched = new Set();
    while (processed < maxSteps) {
      const batch = [];
      for (let i = 0; i < concurrency; i++) {
        const step = await claimDue(db, nowIso(), nowIso(LEASE_MS));
        if (!step) break;
        batch.push(step);
      }
      if (!batch.length) break;
      if (origin) {
        await Promise.all(
          batch.map(async (step) => {
            try {
              const res = await globalThis.http.request({
                method: "POST",
                url: `${origin}/worker/1/step`,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ stepId: step.idHex }),
              });
              if (res.status !== 200) throw new Error(`worker status ${res.status}`);
            } catch {
              // Leave it pending with backoff so a later tick retries it.
              await db.execute('UPDATE "job_step" SET "state" = \'pending\', "lease_until" = ? WHERE "id" = unhex(?)', [
                nowIso(BACKOFF_MS * Math.max(1, step.attempt)),
                step.idHex,
              ]);
            }
          })
        );
      } else {
        for (const step of batch) {
          const nameRows = await db.all('SELECT "name" FROM "job" WHERE "id" = unhex(?)', [step.jobHex]);
          const spec = JOBS[nameRows?.[0]?.[0]];
          if (!spec) {
            await db.execute('UPDATE "job_step" SET "state" = \'failed\' WHERE "id" = unhex(?)', [step.idHex]);
          } else {
            await runStep(db, spec, step);
          }
        }
      }
      for (const step of batch) touched.add(step.jobHex);
      processed += batch.length;
    }
    for (const jobHex of touched) await finalizeJob(db, jobHex);
    return processed;
  }

  /** Execute one already-claimed step by id — the worker endpoint's unit of work. Idempotent. */
  async function executeStep(db, idHex) {
    const rows = await db.all(
      'SELECT hex("job") AS job_hex, "seq", "name", "idempotency_key", "input", "attempt" FROM "job_step" WHERE "id" = unhex(?)',
      [idHex]
    );
    if (!rows || rows.length === 0) return { ok: false, error: "unknown step" };
    const r = rows[0];
    const step = { idHex, jobHex: r[0], seq: r[1], name: r[2], key: r[3], input: JSON.parse(r[4] || "{}"), attempt: r[5] };
    const nameRows = await db.all('SELECT "name" FROM "job" WHERE "id" = unhex(?)', [step.jobHex]);
    const spec = JOBS[nameRows?.[0]?.[0]];
    if (!spec) {
      await db.execute('UPDATE "job_step" SET "state" = \'failed\' WHERE "id" = unhex(?)', [idHex]);
      return { ok: false, error: "unknown job" };
    }
    const ok = await runStep(db, spec, step);
    await finalizeJob(db, step.jobHex);
    return { ok };
  }

  async function recoverStep(db, jobHex, seq, options = {}) {
    const expired = options.expired !== false;
    const lease = expired ? nowIso(-60_000) : nowIso(60_000);
    await db.execute(
      'UPDATE "job_step" SET "state" = \'running\', "lease_until" = ? WHERE "job" = unhex(?) AND "seq" = ?',
      [lease, jobHex, String(seq)]
    );
    // The job must be claimable again, or the claim query (which joins on job state) skips it.
    await db.execute('UPDATE "job" SET "state" = \'running\' WHERE "id" = unhex(?)', [jobHex]);
  }

  function cancelJob(db, jobHex) {
    return db.execute('UPDATE "job" SET "state" = \'cancelled\' WHERE "id" = unhex(?)', [jobHex]);
  }

  async function jobView(db, jobHex) {
    const jobRows = await db.all('SELECT "id", "name", "state", "input", "result" FROM "job" WHERE "id" = unhex(?)', [jobHex]);
    if (!jobRows || jobRows.length === 0) return null;
    const [id, name, state, input, result] = jobRows[0];
    const stepRows = await db.all(
      'SELECT "seq", "name", "state", "attempt", "idempotency_key" FROM "job_step" WHERE "job" = unhex(?) ORDER BY "seq"',
      [jobHex]
    );
    const artifacts = await db.all('SELECT COUNT(*) FROM "job_artifact" WHERE "job" = unhex(?)', [jobHex]);
    return {
      id,
      name,
      state,
      input: input ? JSON.parse(input) : {},
      result: result ? JSON.parse(result) : {},
      artifacts: artifacts && artifacts[0] ? artifacts[0][0] : 0,
      steps: (stepRows ?? []).map((r) => ({ seq: r[0], name: r[1], state: r[2], attempt: r[3], key: r[4] })),
    };
  }

  function status() {
    return { specs: Object.keys(JOBS) };
  }

  globalThis.__AA_QUEUE__ = {
    JOBS,
    enqueue,
    reconcile,
    executeStep,
    jobView,
    cancelJob,
    recoverStep,
    finalizeJob,
    status,
  };
})();
