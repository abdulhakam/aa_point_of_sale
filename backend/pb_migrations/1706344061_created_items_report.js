/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "b6k9q4y6o24gff3",
    "created": "2024-01-27 08:27:41.353Z",
    "updated": "2024-01-27 08:27:41.353Z",
    "name": "items_report",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "jlh1mj7t",
        "name": "name",
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
        "id": "wnvkioi7",
        "name": "cost_price",
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
        "id": "ctyb3btt",
        "name": "sale_price",
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
        "id": "ynaavho1",
        "name": "box_size_qty",
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
        "id": "ejkxajgq",
        "name": "category",
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
        "id": "gusyucsm",
        "name": "qty",
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
      "query": "SELECT items.id, items.name,items.created,items.updated, items.cost_price, items.sale_price, items.box_size_qty, items.category, \n  sum((CASE WHEN transaction_view.type='sale' THEN -transaction_view.qty-transaction_view.scheme ELSE transaction_view.qty+transaction_view.scheme END)) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nGROUP BY items.id"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("b6k9q4y6o24gff3");

  return dao.deleteCollection(collection);
})
