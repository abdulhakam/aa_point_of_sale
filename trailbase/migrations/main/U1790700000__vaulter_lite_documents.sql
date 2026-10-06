-- vaulter-lite: the generated document store (tb-0034).
--
-- One row per generated Markdown document, the bytes held in TrailBase's OBJECT STORE through a
-- `std.FileUpload` column. This replaces the filesystem store the task first proposed: the guest fs
-- root is mounted read-only, and the object store is the only file sink TrailBase offers. The bytes are
-- written by the RECORD API (`POST /api/records/v1/documents`), never by raw SQL — see
-- `app/lib/vaulter-lite.js`, which uploads through it.
--
-- NOT a cache the app reads back: nothing serves a screen from here, so a document an hour old cannot
-- make a report stale (`reports.no_precomputation` is untouched). The `documents` record API is declared
-- in config.textproto.

CREATE TABLE "documents" (
  "id"             BLOB PRIMARY KEY NOT NULL DEFAULT (uuid_v7()) CHECK (is_uuid_v7("id")),
  -- The collection the document came from ('invoices', 'payments', ...) and the SOURCE record's UUID.
  -- Together they identify the document; `slug` is also the human filename stem.
  "collection"     TEXT NOT NULL,
  "slug"           TEXT NOT NULL,
  -- The source row's `updated`, so a run can skip a document that has not changed.
  "source_updated" TEXT NOT NULL DEFAULT '',
  -- The document itself, as a file in the object store.
  "doc"            TEXT CHECK (jsonschema('std.FileUpload', "doc")),
  "created"        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("created") IS NOT NULL),
  "updated"        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ','now')) CHECK (datetime("updated") IS NOT NULL),
  UNIQUE ("collection", "slug")
) STRICT;

-- SQLite has no ON UPDATE, so the row timestamp is maintained by a trigger, as every other table here.
CREATE TRIGGER "documents__updated" AFTER UPDATE ON "documents"
BEGIN
  UPDATE "documents" SET "updated" = strftime('%Y-%m-%d %H:%M:%fZ','now') WHERE "id" = NEW."id";
END;
