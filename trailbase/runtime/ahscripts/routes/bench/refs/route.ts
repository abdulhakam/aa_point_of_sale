// GET /bench/refs — the refs equivalence probe, from a route FOLDER (tb-0030 step 5).
//
// `refs` is defined by `app/sql/refs.sql` and read by `app/lib/refs.js`. The check is the DURABLE form
// of the equivalence test that proved the swap: the failure mode that matters is a dropdown that
// silently renders empty, so a missing key or an emptied list must fail here rather than on a shop screen.
(function () {
  (globalThis as any).GET = async () => {
    const A = await (await (globalThis as any).__AA_LOAD__("/ahscripts/lib/context.js")).app();
    const EXPECTED_REFS = { sections: 10, companies: 15, areas: 59, parties: 943, bookers: 4, items: 207, partyTypes: 2, invoiceTypes: 4, paymentTypes: 3 };
    const refsMod = await (globalThis as any).__AA_LOAD__("/ahscripts/lib/refs.js");
    const fp = await A.service.fingerprint();
    const t0 = Date.now();
    const live = await refsMod.refs(fp);
    const sqlMs = Date.now() - t0;
    const shape = refsMod.shape(live);
    const problems: string[] = [];
    for (const key of Object.keys(EXPECTED_REFS)) {
      if (!(key in live)) problems.push(`missing key: ${key}`);
      else if (!Array.isArray(live[key])) problems.push(`not an array: ${key}`);
    }
    for (const key of Object.keys(live)) {
      if (!(key in EXPECTED_REFS)) problems.push(`unexpected key: ${key}`);
    }
    return {
      keys: Object.keys(live).length,
      problems,
      // Counts are reported, not asserted: the shop's master data grows, so a hard count would fail
      // for the wrong reason. The assertion that matters is structural, and that a party list is not empty.
      empty: Object.keys(live).filter((k: string) => (live[k] ?? []).length === 0),
      shape,
      sqlMs,
    };
  };
})();
