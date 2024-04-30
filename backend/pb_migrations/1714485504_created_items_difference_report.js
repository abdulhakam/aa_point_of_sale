/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "ltg0odkfmy47w0a",
    "created": "2024-04-30 13:58:24.993Z",
    "updated": "2024-04-30 13:58:24.993Z",
    "name": "items_difference_report",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "ko7rqoto",
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
        "id": "lyycotwe",
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
        "id": "b68l77ia",
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
        "id": "gcmy1jdz",
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
        "id": "ayk7zcla",
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
        "id": "gukb9w2d",
        "name": "qty",
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
      "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum(\n  CASE WHEN transaction_view.type == 'return' \n  THEN (CASE WHEN transaction_view.party_type == 'customer' \n    THEN transaction_view.qty+transaction_view.scheme \n    ELSE -transaction_view.qty-transaction_view.scheme END) \n  WHEN transaction_view.type == 'difference'\n  THEN transaction_view.qty+transaction_view.scheme\n  ELSE (CASE WHEN transaction_view.type='sale' \n    THEN -transaction_view.qty-transaction_view.scheme \n    ELSE transaction_view.qty+transaction_view.scheme END) END) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nLEFT JOIN invoices on transaction_view.invoice = invoices.id\nGROUP BY items.id"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("ltg0odkfmy47w0a");

  return dao.deleteCollection(collection);
})
