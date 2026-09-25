/**
 * Flat worker pool — the browser twin of `src/lib/reports/pool.js`.
 *
 * Deliberately flat: a worker that spawns workers is a Safari compatibility trap
 * and buys nothing over dispatching every job from here.
 */
// Bump the query when `worker.js` changes: a module worker's script is cached
// aggressively by the browser and a plain revalidation is not enough.
const WORKER_URL = "/static/js/runtime/worker.js?v=2";

export function createPool(size) {
  const count = Math.max(1, Math.min(Number(size) || 1, 8));
  const workers = [];
  const idle = [];
  const queue = [];
  const pending = new Map();
  let seq = 0;

  const drain = () => {
    while (queue.length && idle.length) {
      const task = queue.shift();
      const worker = idle.shift();
      task.worker = worker;
      pending.set(task.id, task);
      worker.postMessage({ id: task.id, job: task.job });
    }
  };

  const spawn = () => {
    const worker = new Worker(WORKER_URL, { type: "module" });
    worker.addEventListener("message", (event) => {
      const entry = pending.get(event.data?.id);
      if (entry) {
        pending.delete(event.data.id);
        if (event.data.ok) entry.resolve(event.data.result);
        else entry.reject(new Error(event.data.error));
      }
      if (!idle.includes(worker)) idle.push(worker);
      drain();
    });
    // A worker that fails to load (or throws outside the handler) must not leave
    // its job hanging forever.
    worker.addEventListener("error", (event) => {
      event.preventDefault?.();
      for (const [id, entry] of [...pending]) {
        if (entry.worker === worker) {
          pending.delete(id);
          entry.reject(new Error(event.message || "worker failed"));
        }
      }
      const at = workers.indexOf(worker);
      if (at !== -1) workers.splice(at, 1);
      const idleAt = idle.indexOf(worker);
      if (idleAt !== -1) idle.splice(idleAt, 1);
      worker.terminate();
      drain();
    });
    workers.push(worker);
    idle.push(worker);
    return worker;
  };

  for (let i = 0; i < count; i++) spawn();

  return {
    size: count,
    run: (job) =>
      new Promise((resolve, reject) => {
        queue.push({ id: ++seq, job, resolve, reject, worker: null });
        drain();
      }),
    close: () => workers.forEach((worker) => worker.terminate()),
  };
}
