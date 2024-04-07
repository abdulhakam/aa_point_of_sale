/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("ajarcu2lmondmea");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "ajarcu2lmondmea",
    "created": "2024-01-29 16:35:57.385Z",
    "updated": "2024-01-29 16:44:56.814Z",
    "name": "z_item_cost_prices",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "h8xhel0k",
        "name": "invoice",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "maydj3g1",
        "name": "type",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "htkxrffz",
        "name": "invoiceNo",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "yoe9hv1n",
        "name": "item",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "zm68lbr6",
        "name": "price",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "iceyvi3k",
        "name": "qty",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "wmbox5cj",
        "name": "scheme",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "rcg8fxv6",
        "name": "discount_1",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "t5vkg2nz",
        "name": "discount_2",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "3rmztler",
        "name": "total",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "k6pc4dce",
        "name": "deleted",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {
      "query": "SELECT t1.id,\nt1.invoice,\nt1.type,\nt1.invoiceNo,\nt1.item,\nt1.price,\nt1.qty,\nt1.scheme,\nt1.discount_1,\nt1.discount_2,\nt1.total,\nt1.deleted,\nt1.created,\nt1.updated\nFROM (SELECT\n  transaction_view.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  -- (((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100)\n  --   ) - (\n  --     ((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100\n  --       )\n  --     ) * 1.0 * transaction_view.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transaction_view.discount_1,\n  transaction_view.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)) * 1.0 * transaction_view.discount_2 / 100\n    )\n  ) AS total,\n  transaction_view.deleted,\n  transaction_view.created,\n  transaction_view.updated\nFROM\n  transaction_view\n  JOIN invoices ON transaction_view.invoice = invoices.id) t1\nLEFT JOIN (SELECT\n  transaction_view.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  -- (((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100)\n  --   ) - (\n  --     ((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100\n  --       )\n  --     ) * 1.0 * transaction_view.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transaction_view.discount_1,\n  transaction_view.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)) * 1.0 * transaction_view.discount_2 / 100\n    )\n  ) AS total,\n  transaction_view.deleted,\n  transaction_view.created,\n  transaction_view.updated\nFROM\n  transaction_view\n  JOIN invoices ON transaction_view.invoice = invoices.id) t2\nON (t1.item = t2.item AND t1.ROWID < t2.ROWID)\nWHERE t2.ROWID IS NULL "
    }
  });

  return Dao(db).saveCollection(collection);
})
