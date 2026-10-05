// GET /bench/sqlfn — probe the GUEST's SQLite functions, from a route FOLDER (tb-0030 step 5).
//
// The depot DB is read through TrailBase's own bundled SQLite, which is NOT the same build as
// node:sqlite's. `floor` is present in one and ABSENT in the other, and every `round2` site in the
// prelude depends on it — so the port was verified green against the WRONG engine. This reports what
// the guest can really evaluate.
(function () {
  (globalThis as any).GET = async (req: any) => {
    const A = await (await (globalThis as any).__AA_LOAD__("/app/lib/context.js")).app();
    const routeKit = A.routeKit;
    const db = (globalThis as any).sqlite;
    const path = routeKit.normalizePath(String(req.path || "/"));
    const query = routeKit.parsePairs(String(req.query || ""));

    const names = ["floor", "ceil", "trunc", "round", "abs", "sign", "printf", "iif", "mod", "nullif", "cast"];
    const out: any = {};
    for (const fn of names) {
      try {
        await db.all(`SELECT ${fn}(1)`);
        out[fn] = "ok";
      } catch (e: any) {
        out[fn] = "MISSING: " + String(e && e.message ? e.message : e).slice(0, 80);
      }
    }
    // Evaluate a candidate round2 over a fixed set of values, INCLUDING the exact negative halves that
    // the JS `Math.round` semantics turn on.
    const expr = String(query.expr || "");
    let sample: any = null;
    if (expr) {
      try {
        const values = ["2.5", "-2.5", "-50.625", "-2.675", "-0.01", "1.115", "-1.5", "18731.385"];
        sample = [];
        for (const v of values) {
          const row = await db.all(`SELECT (${expr.replaceAll("$v", v)}) AS r`);
          const got = row && row.length
            ? (row[0].r !== undefined ? row[0].r : (Array.isArray(row[0]) ? row[0][0] : undefined))
            : undefined;
          sample.push({ v: Number(v), got });
        }
      } catch (e: any) {
        sample = { error: String(e && e.message ? e.message : e).slice(0, 200) };
      }
    }

    // STRING/NUMBER FORMATTING, a separate question from round2: does `printf('%.2f')` keep TRAILING
    // ZEROES? That is the property the ledger text columns depend on. `want` is JS `toFixed(2)`.
    let fmt: any = null;
    if (String(query.fmt || "") !== "") {
      const cases: [string, string, string][] = [
        ["printf('%.2f', 3.5)", "3.50", "printf %.2f on a half"],
        ["printf('%.2f', 3.0)", "3.00", "printf %.2f on a WHOLE number"],
        ["printf('%.2f', 0.0)", "0.00", "printf %.2f on zero"],
        ["printf('%.2f', 540.0)", "540.00", "printf %.2f on 540"],
        ["printf('%.2f', 47531.0)", "47531.00", "printf %.2f on 47531"],
        ["printf('%.2f', -2.5)", "-2.50", "printf %.2f on a negative half"],
        ["printf('%.2f', -3.0)", "-3.00", "printf %.2f on a negative whole"],
        ["printf('%.2f', 0.25)", "0.25", "printf %.2f on 0.25"],
        ["printf('%!.2f', 3.5)", "3.5", "printf %!.2f (NO trailing zeroes)"],
        ["format('%.2f', 47531.0)", "47531.00", "format %.2f on 47531"],
        ["format('%d', 5)", "5", "format %d"],
        ["json_group_array(1)", "[1]", "JSON1 json_group_array"],
        ["json_extract('{\"a\":1}', '$.a')", "1", "JSON1 json_extract"],
      ];
      fmt = [];
      for (const [q, want, label] of cases) {
        try {
          const row = await db.all(`SELECT ${q} AS r`);
          const got = row && row.length
            ? (row[0].r !== undefined ? row[0].r : (Array.isArray(row[0]) ? row[0][0] : undefined))
            : undefined;
          fmt.push({ label, want, got, match: String(got) === want });
        } catch (e: any) {
          fmt.push({ label, want, got: undefined, match: false, err: String(e && e.message ? e.message : e).slice(0, 70) });
        }
      }
    }

    return { functions: out, sample, fmt };
  };
})();
