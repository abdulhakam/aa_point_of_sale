// Jobs queue check: submit → completion, idempotency under re-dispatch, lease recovery.
//
//   node trailbase/src/tools/jobs-check.mjs
//
// Mutates the depot it points at (GUEST_BASE); run against a throw-away depot.

const GUEST_BASE = process.env.GUEST_BASE || "http://127.0.0.1:4003";
const EMAIL = process.env.ADMIN_EMAIL || "admin@localhost";
const PASSWORD = process.env.ADMIN_PASSWORD || "administrator-0ne";

let cookie = "";
let failures = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failures++;
};

async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(`${GUEST_BASE}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json, text };
}

// login
{
  const res = await fetch(`${GUEST_BASE}/api/auth/v1/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `email_or_username=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASSWORD)}`,
  });
  const setCookie = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  check("login", Boolean(cookie));
}

// submit and complete
const submitted = await call("/jobs", { method: "POST", body: { name: "demo.count", input: { count: 4 } } });
check("submit returns a job id", submitted.status === 200 && Boolean(submitted.json?.id), `${submitted.status} ${submitted.text}`);

const jobId = submitted.json?.id;
if (jobId) {
  // POST already reconciles; poll in case steps are still pending.
  let view = null;
  for (let i = 0; i < 10; i++) {
    view = (await call(`/jobs/${jobId}`)).json;
    if (view?.state === "done" || view?.state === "failed") break;
    await new Promise((r) => setTimeout(r, 100));
  }
  check("job reaches done", view?.state === "done", JSON.stringify(view));
  check("job produced one artifact per step", view?.artifacts === 4, `artifacts=${view?.artifacts}`);
  check("job result is correct", view?.result?.steps === 4 && view?.result?.sum === 10, JSON.stringify(view?.result));

  // idempotency + lease recovery: force a step back to 'running' with an expired lease and
  // re-dispatch. The UNIQUE step key must stop a second artifact.
  const recovered = await call(`/jobs/${jobId}/steps/0/recover`, { method: "POST" });
  check("recover step accepts", recovered.status === 200, `${recovered.status}`);
  const afterRecover = (await call(`/jobs/${jobId}`)).json;
  check("re-dispatch actually re-ran the step", afterRecover?.steps?.[0]?.attempt >= 2, `attempt=${afterRecover?.steps?.[0]?.attempt}`);
  check("re-dispatch is idempotent (no extra artifact)", afterRecover?.artifacts === 4, `artifacts=${afterRecover?.artifacts}`);
  check("job still done after recovery", afterRecover?.state === "done", afterRecover?.state);
  check("result unchanged after recovery", afterRecover?.result?.sum === 10, JSON.stringify(afterRecover?.result));

  const result = await call(`/jobs/${jobId}/result`);
  check("result endpoint returns the merged result", result.status === 200 && result.json?.result?.sum === 10, `${result.status} ${result.text}`);
}

// Worker fan-out: reconcile dispatches claimed steps to /worker/1/step.
{
  const submittedFan = await call("/jobs", { method: "POST", body: { name: "demo.count", input: { count: 6 } } });
  const fanId = submittedFan.json?.id;
  if (fanId) {
    for (const seq of [0, 1, 2]) await call(`/jobs/${fanId}/steps/${seq}/recover`, { method: "POST" });
    const fan = await call("/jobs/reconcile?fanout=1&concurrency=3", { method: "POST" });
    const after = await call(`/jobs/${fanId}?reconcile=0`);
    check("fan-out reconcile dispatched the due steps", fan.json?.reconciled === 3, JSON.stringify(fan.json));
    check("fan-out preserved idempotency", after.json?.artifacts === 6, `artifacts=${after.json?.artifacts}`);
    check("fan-out job is done", after.json?.state === "done", after.json?.state);
  } else {
    check("fan-out reconcile dispatched the due steps", false, submittedFan.text);
  }
}

// error paths
const unknown = await call("/jobs", { method: "POST", body: { name: "does.not.exist", input: {} } });
check("unknown job name is rejected", unknown.status >= 400, `${unknown.status}`);

const missing = await call("/jobs/AaAAAA");
check("unknown job id is 404", missing.status === 404, `${missing.status}`);

const badCookie = await fetch(`${GUEST_BASE}/jobs`, {
  method: "POST",
  redirect: "manual",
  headers: { "content-type": "application/json" },
  body: '{"name":"demo.count"}',
});
check("jobs API requires auth", badCookie.status === 302 || badCookie.status === 303 || badCookie.status === 401, `${badCookie.status}`);

// Optional: prove the background scheduler poller runs a due step with no request. Takes ~75s.
if (process.env.POLLER_TEST) {
  const submitted2 = await call("/jobs", { method: "POST", body: { name: "demo.count", input: { count: 2 } } });
  const id2 = submitted2.json?.id;
  if (id2) {
    await call(`/jobs/${id2}/steps/0/recover`, { method: "POST" });
    const before = await call(`/jobs/${id2}?reconcile=0`);
    console.log(`   waiting ~75s for the scheduler poller (step state=${before.json?.steps?.[0]?.state})`);
    await new Promise((r) => setTimeout(r, 75000));
    const after = await call(`/jobs/${id2}?reconcile=0`);
    check(
      "background poller completed a due step with no request",
      after.json?.state === "done" && after.json?.steps?.[0]?.attempt >= 2,
      `state=${after.json?.state} attempt=${after.json?.steps?.[0]?.attempt}`
    );
  } else {
    check("background poller completed a due step with no request", false, `submit failed: ${submitted2.text}`);
  }
}

console.log(`\n== jobs: ${failures ? `${failures} failure(s)` : "all checks passed"} ==`);
process.exit(failures ? 1 : 0);
