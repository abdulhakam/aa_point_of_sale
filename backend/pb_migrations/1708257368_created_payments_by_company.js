/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "f469c5jeke25hfw",
    "created": "2024-02-18 11:56:08.346Z",
    "updated": "2024-02-18 11:56:08.346Z",
    "name": "payments_by_company",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "fxw4wtft",
        "name": "payment_id",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "k11cqs87kjiwr45",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "daomddqf",
        "name": "payment_created",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "5jfvkjot",
        "name": "payment_updated",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      },
      {
        "system": false,
        "id": "jfwdhyju",
        "name": "payment_invoice",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "0pwj3vph7ag7nc2",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "tdyej3yl",
        "name": "payment_original_invoices",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "0pwj3vph7ag7nc2",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": null,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "jsyana87",
        "name": "payment_invoiceNo",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "eb5udz0w",
        "name": "payment_invoice_maker",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "xqspxymi",
        "name": "payment_booker",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "3dz9ii2wo8d5q8g",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "tviis588",
        "name": "payment_company",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "106aq516rbyoq0q",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": null,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "fyykxqsy",
        "name": "payment_party",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "qhdujcbptsh2v29",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "ndvb4nwh",
        "name": "payment_party_type",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "supplier",
            "customer"
          ]
        }
      },
      {
        "system": false,
        "id": "pcw1qlzr",
        "name": "payment_type",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "sending",
            "recieving",
            "return"
          ]
        }
      },
      {
        "system": false,
        "id": "o8lwmbms",
        "name": "payment_amount",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "6agf3jz6",
        "name": "payment_paid",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "w10g9idw",
        "name": "payment_area",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "tdeikttss6upezc",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "bknstwis",
        "name": "payment_section",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "nlwqqfyu1ur5lpo",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "cudwwgkt",
        "name": "payment_description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "system": false,
        "id": "qn3kbbha",
        "name": "total_payment_for_invoice",
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
      "query": "WITH transaction_totals AS (\n  SELECT\n    items.category AS company,\n    transaction_view.invoice AS invoice,\n    SUM(transaction_view.net_amount) AS total_payment\n  FROM\n    transaction_view\n  LEFT JOIN items ON transaction_view.item = items.id\n  GROUP BY\n    items.category, transaction_view.invoice\n)\n\nSELECT\n  (ROW_NUMBER() OVER()) as id,\n  pv.id AS payment_id,\n  pv.created AS payment_created,\n  pv.updated AS payment_updated,\n  pv.invoice AS payment_invoice,\n  pv.original_invoices AS payment_original_invoices,\n  pv.invoiceNo AS payment_invoiceNo,\n  pv.invoice_maker AS payment_invoice_maker,\n  pv.booker AS payment_booker,\n  pv.company AS payment_company,\n  pv.party AS payment_party,\n  pv.party_type AS payment_party_type,\n  pv.type AS payment_type,\n  pv.amount AS payment_amount,\n  pv.paid AS payment_paid,\n  pv.area AS payment_area,\n  pv.section AS payment_section,\n  pv.description AS payment_description,\n  COALESCE(tt.total_payment, 0) AS total_payment_for_invoice\nFROM\n  payments_view pv\nLEFT JOIN transaction_totals tt ON pv.company = tt.company AND pv.invoice = tt.invoice\n"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw");

  return dao.deleteCollection(collection);
})
