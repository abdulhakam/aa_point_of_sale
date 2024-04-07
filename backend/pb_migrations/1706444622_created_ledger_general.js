/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "csrrp810ygcegwz",
    "created": "2024-01-28 12:23:42.074Z",
    "updated": "2024-01-28 12:23:42.074Z",
    "name": "ledger_general",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "734hj6az",
        "name": "account_type",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "evdizvzg",
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
        "id": "o3myuflf",
        "name": "amount",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "dddgfg8s",
        "name": "transaction_type",
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
      "query": "SELECT\n    id,\n    created,\n    (CASE WHEN type = 'sending' THEN 'Expense' ELSE 'Income' END) AS account_type,\n    description,\n    amount,\n    (CASE WHEN type = 'sending' THEN 'Debit' ELSE 'Credit' END) AS transaction_type\nFROM payments_view\nWHERE paid = TRUE"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz");

  return dao.deleteCollection(collection);
})
