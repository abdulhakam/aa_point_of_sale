/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("tbv9b26tskt16p8");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "tbv9b26tskt16p8",
    "created": "2024-01-27 08:07:55.131Z",
    "updated": "2024-01-27 08:37:58.459Z",
    "name": "z_inv_d1_t",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "ugyelxa4",
        "name": "type",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "purchase",
            "sale"
          ]
        }
      },
      {
        "system": false,
        "id": "ma0flby1",
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
        "id": "k1evqryc",
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
        "id": "aorehzp6",
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
        "id": "13qpxk1p",
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
        "id": "sxrkyrjj",
        "name": "discount_1",
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
        "id": "xpymp9qe",
        "name": "discount_2",
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
        "id": "1iusvtwo",
        "name": "total",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "ywmt2sxt",
        "name": "d1t",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "u0htazhf",
        "name": "duedate",
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
        "id": "ms9srut5",
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
      },
      {
        "system": false,
        "id": "txnmbxfx",
        "name": "deleted",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "u00uxc2n",
        "name": "completed",
        "type": "bool",
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
      "query": "SELECT \n  invoices.id,\n  invoices.type,\n  invoiceNo,\n  party,\n  booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  COALESCE(SUM(transaction_view.total),0) AS total,\n  (COALESCE(SUM(transaction_view.total), 0)-(COALESCE(SUM(transaction_view.total), 0)*invoices.discount_1/100)) AS d1t,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n invoices\nLEFT JOIN\n transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY invoices.id;"
    }
  });

  return Dao(db).saveCollection(collection);
})
