/// <reference path="../pb_data/types.d.ts" />

// POS-0013 (part 2) — payments_summary: pre-aggregated payment totals.
//
// The payment/sales reports previously fetched every matching row of payments_view
// and summed them in the browser (PaymentsView.tsx `calculator()`). This view moves
// that SUM into SQL: rows are grouped by day + filter dimensions, so a filtered
// report reads dozens of summary rows instead of tens of thousands of raw ones.
//
// Clients keep using their normal filter, but on `day` (and the dimension columns)
// instead of the raw `created` timestamp, then sum the 8 category columns over the
// returned groups. Column meanings mirror the previous JS computation exactly:
//
//   sending            - unpaid 'sending' amounts
//   sent               - paid 'sending' amounts
//   recieving          - unpaid 'recieving' amounts
//   recieved           - paid 'recieving' amounts
//   sending_returns    - 'return' amounts whose party is not a customer
//   recieving_returns  - 'return' amounts whose party is a customer
//   invoice_total      - unpaid amounts (all types)
//   total_paid         - paid amounts (all types)
//
// (total_sending / total_recieving / total are derived from these on the client; they
// are trivial subtractions, kept in JS to keep every column here a single function
// call, which is all PocketBase's view parser accepts.)

var SUMMARY_QUERY =
  "SELECT\n" +
  "  cast(id as text) AS id,\n" +
  "  day,\n" +
  "  party,\n" +
  "  area,\n" +
  "  section,\n" +
  "  booker,\n" +
  "  party_type,\n" +
  "  type,\n" +
  "  paid,\n" +
  "  entries,\n" +
  "  sent,\n" +
  "  sending,\n" +
  "  recieved,\n" +
  "  recieving,\n" +
  "  recieving_returns,\n" +
  "  sending_returns,\n" +
  "  invoice_total,\n" +
  "  total_paid\n" +
  "FROM (\n" +
  "  SELECT\n" +
  "    (ROW_NUMBER() OVER()) AS id,\n" +
  "    substr(created, 1, 10) AS day,\n" +
  "    party,\n" +
  "    area,\n" +
  "    section,\n" +
  "    booker,\n" +
  "    party_type,\n" +
  "    type,\n" +
  "    paid,\n" +
  "    COUNT(*) AS entries,\n" +
  "    COALESCE(SUM(CASE WHEN type = 'sending' AND paid = TRUE THEN amount ELSE 0 END), 0) AS sent,\n" +
  "    COALESCE(SUM(CASE WHEN type = 'sending' AND paid = FALSE THEN amount ELSE 0 END), 0) AS sending,\n" +
  "    COALESCE(SUM(CASE WHEN type = 'recieving' AND paid = TRUE THEN amount ELSE 0 END), 0) AS recieved,\n" +
  "    COALESCE(SUM(CASE WHEN type = 'recieving' AND paid = FALSE THEN amount ELSE 0 END), 0) AS recieving,\n" +
  "    COALESCE(SUM(CASE WHEN type = 'return' AND party_type = 'customer' THEN amount ELSE 0 END), 0) AS recieving_returns,\n" +
  "    COALESCE(SUM(CASE WHEN type = 'return' AND (party_type IS NULL OR party_type <> 'customer') THEN amount ELSE 0 END), 0) AS sending_returns,\n" +
  "    COALESCE(SUM(CASE WHEN paid = FALSE THEN amount ELSE 0 END), 0) AS invoice_total,\n" +
  "    COALESCE(SUM(CASE WHEN paid = TRUE THEN amount ELSE 0 END), 0) AS total_paid\n" +
  "  FROM payments_view\n" +
  "  GROUP BY day, party, area, section, booker, party_type, type, paid\n" +
  ")\n";

var TEXT_FIELDS = ["day", "party", "area", "section", "booker", "party_type", "type"];
var BOOL_FIELDS = ["paid"];
var NUMERIC_FIELDS = [
  "entries",
  "sent",
  "sending",
  "recieved",
  "recieving",
  "recieving_returns",
  "sending_returns",
  "invoice_total",
  "total_paid",
];

var FIELD_IDS = [
  "psa00001",
  "psa00002",
  "psa00003",
  "psa00004",
  "psa00005",
  "psa00006",
  "psa00007",
  "psa00008",
  "psa00009",
  "psa00010",
  "psa00011",
  "psa00012",
  "psa00013",
  "psa00014",
  "psa00015",
  "psa00016",
  "psa00017",
  "psa00018",
];

function buildSummaryCollection() {
  var collection = new Collection({
    name: "payments_summary",
    type: "view",
    listRule: "",
    viewRule: "",
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });

  collection.options = { query: SUMMARY_QUERY };

  var idCursor = 0;

  for (var t = 0; t < TEXT_FIELDS.length; t++) {
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: FIELD_IDS[idCursor++],
        name: TEXT_FIELDS[t],
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, pattern: "" },
      })
    );
  }

  for (var b = 0; b < BOOL_FIELDS.length; b++) {
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: FIELD_IDS[idCursor++],
        name: BOOL_FIELDS[b],
        type: "bool",
        required: false,
        presentable: false,
        unique: false,
        options: {},
      })
    );
  }

  for (var i = 0; i < NUMERIC_FIELDS.length; i++) {
    collection.schema.addField(
      new SchemaField({
        system: false,
        id: FIELD_IDS[idCursor++],
        name: NUMERIC_FIELDS[i],
        type: "number",
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, noDecimal: false },
      })
    );
  }

  return collection;
}

migrate(
  (db) => {
    var dao = new Dao(db);
    return dao.saveCollection(buildSummaryCollection());
  },
  (db) => {
    var dao = new Dao(db);
    var collection = dao.findCollectionByNameOrId("payments_summary");
    return dao.deleteCollection(collection);
  }
);
