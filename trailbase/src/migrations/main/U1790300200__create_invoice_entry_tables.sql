-- Invoice entry support: an edit lease and create-idempotency.
--
-- The design (vault/decisions/invoice-entry-freshness-and-writes.md) is immediate-push: the
-- invoice row is created (completed=0) and patched as the operator works, so two tills must not
-- edit the same invoice and a retried create must not double-post.
--
--   * `invoice_lock`   — one row per invoice being edited; a lease that expires so a crashed
--                        device cannot strand an invoice (atomic take/renew, reclaim when stale).
--   * `invoice_create_key` — the client's idempotency key for a create; a retry returns the same
--                        invoice instead of making a second one.
--
-- Invoice numbers are NOT stored here: they are allocated by the INSERT itself
-- (`(SELECT COUNT(*) FROM invoices WHERE type = ?) + 1`, preserving the legacy `count+1` scheme)
-- in one atomic statement, and record ids are `uuid_v7()`.

CREATE TABLE "invoice_lock" (
  "invoice"     BLOB PRIMARY KEY NOT NULL CHECK (is_uuid_v7("invoice")),
  -- TrailBase user ids are UUIDv4 (verified on `_user`), so no uuid_v7 check here.
  "user"        BLOB NOT NULL,
  "device"      TEXT NOT NULL DEFAULT '',
  "lease_until" TEXT NOT NULL CHECK (datetime("lease_until") IS NOT NULL),
  "created"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL)
) STRICT;

CREATE TABLE "invoice_create_key" (
  "key"     TEXT PRIMARY KEY NOT NULL,
  "invoice" BLOB NOT NULL CHECK (is_uuid_v7("invoice")),
  "created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL)
) STRICT;

-- A line add is idempotent too (F3): the client's op key maps to the line it created, so a retry
-- after a lost response cannot add the line twice.
CREATE TABLE "invoice_line_op" (
  "key"     TEXT PRIMARY KEY NOT NULL,
  "line"    BLOB NOT NULL CHECK (is_uuid_v7("line")),
  "created" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL)
) STRICT;
