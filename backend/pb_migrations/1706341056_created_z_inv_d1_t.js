/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "nsurkfrs0ynqotd",
    "created": "2024-01-27 07:37:36.108Z",
    "updated": "2024-01-27 07:37:36.108Z",
    "name": "z_inv_d1_t",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "w3g5h96d",
        "name": "deleted",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "kcrqzpca",
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
        "id": "9sncvtu0",
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
        "id": "tvwzbdr2",
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
        "id": "dqcuuagb",
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
        "id": "e5c7mniv",
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
        "id": "irgxio0k",
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
        "id": "xkpymecc",
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
        "id": "xjg8oy2j",
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
        "id": "wesjyagu",
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
      "query": "SELECT created,\ndeleted,\ndiscount_1,\ndiscount_2,\nid,\nupdated,\nparty,\ninvoice_maker,\ntype,\ninvoiceNo,\nbooker,\nduedate,\ncompleted from invoices;"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("nsurkfrs0ynqotd");

  return dao.deleteCollection(collection);
})
