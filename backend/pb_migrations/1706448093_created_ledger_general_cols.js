/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "jfgvmw91um4ivy1",
    "created": "2024-01-28 13:21:33.627Z",
    "updated": "2024-01-28 13:21:33.627Z",
    "name": "ledger_general_cols",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "tpzxi8oj",
        "name": "description",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "m70x0dig",
        "name": "transaction_type",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "evhbkb6w",
        "name": "account_type",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "a83cdrkh",
        "name": "amount",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "jbjk04nr",
        "name": "paid",
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
      "query": "SELECT id, created, description, transaction_type, account_type, amount, paid FROM (\nSELECT id, created, description, 'payment' AS transaction_type, type AS account_type, amount AS amount, paid\nFROM payments_view\nUNION ALL\nSELECT id, created, name AS description, 'expense' AS transaction_type, 'cash' AS account_type, amount AS amount, true AS paid\nFROM expenses)"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1");

  return dao.deleteCollection(collection);
})
