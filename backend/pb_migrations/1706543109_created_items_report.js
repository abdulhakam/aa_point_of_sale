/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "bbhgknkuvqiyhsa",
    "created": "2024-01-29 15:45:09.703Z",
    "updated": "2024-01-29 15:45:09.703Z",
    "name": "items_report",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "zaq0rh1j",
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
        "id": "vlcfiypm",
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
        "id": "hufqas2j",
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
        "id": "divcojaz",
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
        "id": "hoezr1qe",
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
        "id": "gjo5vxbo",
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
      "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  --transactions_view.net_cptrans AS net_cp,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum((CASE WHEN transactions_view.type='sale' THEN -transactions_view.qty-transactions_view.scheme ELSE transactions_view.qty+transactions_view.scheme END)) as qty\nFROM items\nLEFT JOIN transactions_view on transactions_view.item = items.id\nGROUP BY items.id"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("bbhgknkuvqiyhsa");

  return dao.deleteCollection(collection);
})
