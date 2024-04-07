/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "dvhoo1r9nb2nfam",
    "created": "2024-03-03 11:49:13.755Z",
    "updated": "2024-03-03 11:49:13.755Z",
    "name": "payments_report",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "ku2sw4um",
        "name": "payment_date",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "3av8ogca",
        "name": "invoice",
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
        "id": "ckhv0k1w",
        "name": "original_invoices",
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
        "id": "gxzrsk9k",
        "name": "invoiceNo",
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
        "id": "gps7xm71",
        "name": "invoice_maker",
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
        "id": "zp0s53su",
        "name": "booker",
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
        "id": "0sipnsqf",
        "name": "company",
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
        "id": "tmrciikk",
        "name": "party",
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
        "id": "pvctlfpv",
        "name": "party_type",
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
        "id": "mchdjmw7",
        "name": "type",
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
        "id": "kr6ggq88",
        "name": "amount",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "00ggdiaw",
        "name": "paid",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "9dcn3c8l",
        "name": "area",
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
        "id": "rojudod1",
        "name": "section",
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
        "id": "1bvqwqx0",
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": "",
    "viewRule": "",
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {
      "query": "SELECT\n  payments.id,\n  payments.created,\n  payments.updated,\n  (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n  payments.invoice,\n  invoices_return_reference.original_invoices,\n  invoice_view.invoiceNo,\n  invoice_view.invoice_maker,\n  invoice_view.booker,\n  order_bookers.company,\n  payments.party AS party,\n  parties.type AS party_type,\n  payments.type AS type,\nCOALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) AS amount,\n  --invoice_view.stock_price,\n  payments.paid,\n  parties.area,\n  areas.section,\n  payments.description\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id\nLEFT JOIN parties ON payments.party = parties.id\nLEFT JOIN areas ON parties.area = areas.id\nLEFT JOIN sections ON areas.section = sections.id\nLEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\nLEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("dvhoo1r9nb2nfam");

  return dao.deleteCollection(collection);
})
