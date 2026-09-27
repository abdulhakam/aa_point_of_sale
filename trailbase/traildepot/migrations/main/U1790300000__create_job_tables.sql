-- AA Point of Sale — durable job queue.
--
-- `job` is the submitted unit; `job_step` is the unit of work (leased, retried, idempotent);
-- `job_artifact` records a step's effect with a UNIQUE idempotency key, so re-running a step
-- (after a crash or an expired lease) cannot double-apply it.
--
-- The guest executes steps in-process because it has no usable outbound HTTP client (the host's
-- `fetch` is a stub); the queue is nevertheless durable and lease-based, so a restart resumes
-- pending work.

CREATE TABLE "job" (
  "id"      BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "name"    TEXT NOT NULL,
  "state"   TEXT NOT NULL DEFAULT 'pending' CHECK ("state" IN ('pending','running','done','failed','cancelled')),
  "input"   TEXT NOT NULL DEFAULT '{}',
  "result"  TEXT NOT NULL DEFAULT '',
  "created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "job_step" (
  "id"              BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "job"             BLOB NOT NULL REFERENCES "job"("id") ON DELETE CASCADE,
  "seq"             INTEGER NOT NULL,
  "name"            TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL UNIQUE,
  "state"           TEXT NOT NULL DEFAULT 'pending' CHECK ("state" IN ('pending','running','done','failed')),
  "attempt"         INTEGER NOT NULL DEFAULT 0,
  "lease_until"     TEXT NOT NULL DEFAULT '',
  "input"           TEXT NOT NULL DEFAULT '{}',
  "result"          TEXT NOT NULL DEFAULT '',
  "created"         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE INDEX "job_step_job_idx" ON "job_step" ("job", "seq");
CREATE INDEX "job_step_due_idx" ON "job_step" ("state", "lease_until");

CREATE TABLE "job_artifact" (
  "id"       BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("id")) DEFAULT (uuid_v7()),
  "job"      BLOB NOT NULL REFERENCES "job"("id") ON DELETE CASCADE,
  "step_key" TEXT NOT NULL UNIQUE,
  "value"    TEXT NOT NULL DEFAULT '',
  "created"  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL)
) STRICT;

CREATE TRIGGER "job_updated" AFTER UPDATE ON "job" BEGIN
  UPDATE "job" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = NEW."id";
END;

CREATE TRIGGER "job_step_updated" AFTER UPDATE ON "job_step" BEGIN
  UPDATE "job_step" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = NEW."id";
END;
