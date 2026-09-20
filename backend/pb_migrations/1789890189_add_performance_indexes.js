/// <reference path="../pb_data/types.d.ts" />

// POS-0007 — add secondary indexes for the report/ledger joins.
//
// These are declared on the collections (not via raw SQL) so PocketBase manages
// them and they show up in the admin UI, and so they survive later schema edits.
//
// The views read these base tables with no usable index (only the primary-key
// sqlite_autoindex_*_1 existed), which made every report a full scan:
//   transactions = 23,413 rows, payments = 26,526, invoices = 8,927.
//
// Idempotent: an index expression already present on the collection is skipped.

var PERF_INDEXES = [
  [
    "transactions",
    [
      "CREATE INDEX `idx_transactions_invoice` ON `transactions` (`invoice`)",
      "CREATE INDEX `idx_transactions_item` ON `transactions` (`item`)",
    ],
  ],
  [
    "invoices",
    [
      "CREATE INDEX `idx_invoices_party` ON `invoices` (`party`)",
      "CREATE INDEX `idx_invoices_booker` ON `invoices` (`booker`)",
      "CREATE INDEX `idx_invoices_type` ON `invoices` (`type`)",
      "CREATE INDEX `idx_invoices_dated` ON `invoices` (`dated`)",
      "CREATE INDEX `idx_invoices_created` ON `invoices` (`created`)",
      "CREATE INDEX `idx_invoices_type_created` ON `invoices` (`type`, `created`)",
    ],
  ],
  [
    "payments",
    [
      "CREATE INDEX `idx_payments_party` ON `payments` (`party`)",
      "CREATE INDEX `idx_payments_paid` ON `payments` (`paid`)",
      "CREATE INDEX `idx_payments_type` ON `payments` (`type`)",
      "CREATE INDEX `idx_payments_invoice` ON `payments` (`invoice`)",
      "CREATE INDEX `idx_payments_created` ON `payments` (`created`)",
      "CREATE INDEX `idx_payments_type_paid` ON `payments` (`type`, `paid`)",
      "CREATE INDEX `idx_payments_party_paid_type` ON `payments` (`party`, `paid`, `type`)",
    ],
  ],
  [
    "parties",
    [
      "CREATE INDEX `idx_parties_area` ON `parties` (`area`)",
      "CREATE INDEX `idx_parties_type` ON `parties` (`type`)",
    ],
  ],
  [
    "items",
    ["CREATE INDEX `idx_items_category` ON `items` (`category`)"],
  ],
];

migrate(
  (db) => {
    var dao = new Dao(db);
    for (var i = 0; i < PERF_INDEXES.length; i++) {
      var name = PERF_INDEXES[i][0];
      var wanted = PERF_INDEXES[i][1];
      var collection = dao.findCollectionByNameOrId(name);
      var merged = [];
      var current = collection.indexes || [];
      for (var j = 0; j < current.length; j++) {
        merged.push(current[j]);
      }
      for (var k = 0; k < wanted.length; k++) {
        if (merged.indexOf(wanted[k]) === -1) {
          merged.push(wanted[k]);
        }
      }
      collection.indexes = merged;
      dao.saveCollection(collection);
    }
  },
  (db) => {
    var dao = new Dao(db);
    for (var i = 0; i < PERF_INDEXES.length; i++) {
      var name = PERF_INDEXES[i][0];
      var unwanted = PERF_INDEXES[i][1];
      var collection = dao.findCollectionByNameOrId(name);
      var kept = [];
      var current = collection.indexes || [];
      for (var j = 0; j < current.length; j++) {
        if (unwanted.indexOf(current[j]) === -1) {
          kept.push(current[j]);
        }
      }
      collection.indexes = kept;
      dao.saveCollection(collection);
    }
  }
);
