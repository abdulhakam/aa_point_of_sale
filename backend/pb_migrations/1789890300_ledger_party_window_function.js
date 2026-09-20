/// <reference path="../pb_data/types.d.ts" />

// POS-0013 — move aggregation server-side.
//
// (1) ledger_party: the running `balance` was computed with a correlated subquery
//     per row:
//         (SELECT SUM(...) FROM payments_view p2
//           WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)
//     That is O(n^2) over 26,526 payments; a full scan aborted after 180s in the
//     POS-0005 baseline. It is replaced by a window function, which is O(n log n).
//
//     RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW is used (not ROWS) so that
//     rows sharing the same payment_date are all included together — this preserves
//     the original `<=` semantics exactly (all peers get the same running value).
//     The selected columns and their order/types are unchanged, so no schema edit
//     is required.
//
// (2) payments_summary: a single-row aggregate so the payment/sales reports can read
//     totals from SQL instead of looping over ~26k raw payment rows in the browser.
//     Clients apply their normal filter; the view aggregates whatever subset is
//     returned. The column meanings match the frontend's previous JS computation.

var LEDGER_PARTY_SQL =
  "SELECT \n" +
  "  p1.id,\n" +
  "  p1.description,\n" +
  "  p1.created,\n" +
  "  p1.updated,\n" +
  "  p1.payment_date AS dated,\n" +
  "  p1.invoice,\n" +
  "  p1.party,\n" +
  "  p1.type,\n" +
  "  p1.paid,\n" +
  "  (CASE WHEN p1.type = 'recieving' THEN \n" +
  "      (CASE WHEN p1.paid = TRUE THEN p1.amount\n" +
  "       ELSE 0 \n" +
  "       END) \n" +
  "   ELSE (CASE WHEN p1.type = 'sending' THEN \n" +
  "           (CASE WHEN p1.paid = FALSE THEN p1.amount\n" +
  "            ELSE 0 \n" +
  "            END) \n" +
  "         ELSE 0 -- return case missing\n" +
  "         END)\n" +
  "   END) AS credit,\n" +
  "  (CASE WHEN p1.type = 'sending' THEN \n" +
  "      (CASE WHEN p1.paid = TRUE THEN p1.amount\n" +
  "       ELSE 0 \n" +
  "       END) \n" +
  "   ELSE (CASE WHEN p1.type = 'recieving' THEN \n" +
  "           (CASE WHEN p1.paid = FALSE THEN p1.amount\n" +
  "            ELSE 0 \n" +
  "            END) \n" +
  "         ELSE 0 -- return case missing\n" +
  "         END)\n" +
  "   END) AS debit,\n" +
  "  printf(\"%.2f\", SUM(\n" +
  "    CASE WHEN p1.paid = FALSE THEN p1.amount ELSE -p1.amount END)\n" +
  "    OVER (PARTITION BY p1.party ORDER BY p1.payment_date\n" +
  "          RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS balance\n" +
  "FROM payments_view p1 ORDER BY p1.payment_date\n";

var LEDGER_PARTY_SQL_ORIGINAL =
  "SELECT \n" +
  "  p1.id,\n" +
  "  p1.description,\n" +
  "  p1.created,\n" +
  "  p1.updated,\n" +
  "  p1.payment_date AS dated,\n" +
  "  p1.invoice,\n" +
  "  p1.party,\n" +
  "  p1.type,\n" +
  "  p1.paid,\n" +
  "  (CASE WHEN p1.type = 'recieving' THEN \n" +
  "      (CASE WHEN p1.paid = TRUE THEN p1.amount\n" +
  "       ELSE 0 \n" +
  "       END) \n" +
  "   ELSE (CASE WHEN p1.type = 'sending' THEN \n" +
  "           (CASE WHEN p1.paid = FALSE THEN p1.amount\n" +
  "            ELSE 0 \n" +
  "            END) \n" +
  "         ELSE 0 -- return case missing\n" +
  "         END)\n" +
  "   END) AS credit,\n" +
  "  (CASE WHEN p1.type = 'sending' THEN \n" +
  "      (CASE WHEN p1.paid = TRUE THEN p1.amount\n" +
  "       ELSE 0 \n" +
  "       END) \n" +
  "   ELSE (CASE WHEN p1.type = 'recieving' THEN \n" +
  "           (CASE WHEN p1.paid = FALSE THEN p1.amount\n" +
  "            ELSE 0 \n" +
  "            END) \n" +
  "         ELSE 0 -- return case missing\n" +
  "         END)\n" +
  "   END) AS debit,\n" +
  "  printf(\"%.2f\",(SELECT SUM(\n" +
  "    CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END)\n" +
  "  FROM payments_view p2\n" +
  "  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)) AS balance\n" +
  "FROM payments_view p1 ORDER BY p1.payment_date\n";

migrate(
  (db) => {
    var dao = new Dao(db);
    var collection = dao.findCollectionByNameOrId("ledger_party");
    collection.options = { query: LEDGER_PARTY_SQL };
    return dao.saveCollection(collection);
  },
  (db) => {
    var dao = new Dao(db);
    var collection = dao.findCollectionByNameOrId("ledger_party");
    collection.options = { query: LEDGER_PARTY_SQL_ORIGINAL };
    return dao.saveCollection(collection);
  }
);
