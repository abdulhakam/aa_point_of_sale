/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("66ecr15eclkktys");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "66ecr15eclkktys",
    "created": "2024-03-03 11:55:04.181Z",
    "updated": "2024-03-03 14:23:36.069Z",
    "name": "payments_by_company",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "dfnvegff",
        "name": "invoice",
        "type": "relation",
        "required": true,
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
        "id": "uefoupu7",
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
        "id": "jyna988h",
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
        "id": "z6209kzc",
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
        "id": "pnlsebx2",
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
        "id": "o32cx8iz",
        "name": "company",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "106aq516rbyoq0q",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "elxk7rtn",
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
        "id": "9xqsej9d",
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
        "id": "2civxcxl",
        "name": "type",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "purchase",
            "sale",
            "return"
          ]
        }
      },
      {
        "system": false,
        "id": "z8t3foec",
        "name": "amount",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 1
        }
      },
      {
        "system": false,
        "id": "0uvskoxy",
        "name": "paid",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 1
        }
      },
      {
        "system": false,
        "id": "uom8tmb8",
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
        "id": "xxlgasmh",
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
        "id": "hmc7baz8",
        "name": "description",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSize": 1
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
      "query": "SELECT\n        (ROW_NUMBER() OVER()) AS id,\n        transactions_report.created,\n        transactions_report.updated,\n        transactions_report.invoice,\n        invoices_return_reference.original_invoices,\n        transactions_report.invoiceNo,\n        invoice_view.invoice_maker,\n        invoice_view.booker,\n        transactions_report.company,\n        transactions_report.party,\n        transactions_report.party_type,\n        transactions_report.type,\n        SUM(transactions_report.net_amount) amount,\n        FALSE AS paid,\n        parties.area,\n        areas.section,\n        \"-\" AS description\n    FROM\n        transactions_report\n    LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n    LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    LEFT JOIN parties ON transactions_report.party = parties.id\n    LEFT JOIN areas ON parties.area = areas.id\nGROUP BY invoice, transactions_report.company"
    }
  });

  return Dao(db).saveCollection(collection);
})
