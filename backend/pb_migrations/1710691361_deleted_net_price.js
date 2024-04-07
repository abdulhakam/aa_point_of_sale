/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "cv8cjsz3y8cvkex",
    "created": "2024-01-30 09:10:25.474Z",
    "updated": "2024-03-12 20:01:57.521Z",
    "name": "net_price",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "h2zs229p",
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
        "id": "pwmc3nra",
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
        "id": "hfw0rw17",
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
        "id": "yiq3x4lg",
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
        "id": "ksrp8jlm",
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
        "id": "tpoonybp",
        "name": "qty",
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
        "id": "ymnjbfuy",
        "name": "net_price",
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
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {
      "query": "SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n  items.cost_price,\n   items.box_size_qty,\n   items.category AS company,\n   IFNULL(transactions.qty, 0) AS qty,\n  ((transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(COALESCE(invoices.discount_1,0)/100.0))\n  *(1-(COALESCE(invoices.discount_2,0)/100.0))\n  )/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n   items\nLEFT JOIN \n  transactions ON items.id = transactions.item\nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id"
    }
  });

  return Dao(db).saveCollection(collection);
})
