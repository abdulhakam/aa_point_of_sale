import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workerFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "worker.js");

/**
 * Small worker-thread pool. Each task is a synchronous job inside a worker, so a
 * worker is busy from `postMessage` until it replies; idle workers are recycled
 * round-robin and excess tasks queue.
 */
export function createPool(size) {
  if (!Number.isFinite(size) || size < 1) return null;

  const workers = [];
  const idle = [];
  const queue = [];
  const pending = new Map();
  let seq = 0;
  let closed = false;

  const spawn = () => {
    const worker = new Worker(workerFile);
    worker.on("message", (msg) => {
      const entry = pending.get(msg.id);
      if (entry) {
        pending.delete(msg.id);
        if (msg.ok) entry.resolve(msg.result);
        else entry.reject(Object.assign(new Error(msg.error), { stack: msg.stack }));
      }
      if (!idle.includes(worker)) idle.push(worker);
      drain();
    });
    worker.on("error", (error) => {
      // Replace the crashed worker and fail whatever it was running.
      const index = workers.indexOf(worker);
      if (index !== -1) workers.splice(index, 1);
      const idleIndex = idle.indexOf(worker);
      if (idleIndex !== -1) idle.splice(idleIndex, 1);
      for (const [id, entry] of pending) {
        if (entry.worker === worker) {
          pending.delete(id);
          entry.reject(error);
        }
      }
      if (!closed) workers.push(spawn());
      drain();
    });
    workers.push(worker);
    idle.push(worker);
    return worker;
  };

  const drain = () => {
    while (queue.length && idle.length) {
      const task = queue.shift();
      const worker = idle.shift();
      task.worker = worker;
      pending.set(task.id, task);
      worker.postMessage({ id: task.id, mode: task.mode, payload: task.payload });
    }
  };

  const run = (mode, payload) =>
    new Promise((resolve, reject) => {
      queue.push({ id: ++seq, mode, payload, resolve, reject, worker: null });
      drain();
    });

  for (let i = 0; i < size; i++) spawn();

  return {
    size,
    run,
    stats: () => ({ workers: workers.length, idle: idle.length, queued: queue.length, inFlight: pending.size }),
    async close() {
      closed = true;
      await Promise.all(workers.map((w) => w.terminate()));
    },
  };
}
