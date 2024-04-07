/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "cv8cjsz3y8cvkex",
    "created": "2024-01-30 09:10:25.474Z",
    "updated": "2024-01-30 09:10:25.474Z",
    "name": "net_price",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "qnd3gcpb",
        "name": "net_price",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "2a7x0neg",
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
      "query": "SELECT \n    t.item AS id,\n    (t.price * ((1- t.discount_1) / 100) * ((1- t.discount_2) / 100) * ((1- i.discount_1) / 100) * ((1- i.discount_2) / 100)) AS net_price,\n    SUM(CASE WHEN i.type = 'purchase' THEN t.qty ELSE -t.qty END) AS qty\nFROM \n    transactions t\nJOIN \n    invoices i ON t.invoice = i.id\nWHERE \n    i.id IN (SELECT id FROM invoices WHERE type = 'purchase' ORDER BY created DESC LIMIT 1)\nGROUP BY \n    t.item;"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex");

  return dao.deleteCollection(collection);
})
