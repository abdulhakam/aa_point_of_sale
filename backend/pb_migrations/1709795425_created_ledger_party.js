/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "8zru1ik12ki465e",
    "created": "2024-03-07 07:10:25.603Z",
    "updated": "2024-03-07 07:10:25.603Z",
    "name": "ledger_party",
    "type": "view",
    "system": false,
    "schema": [],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {
      "query": "SELECT id FROM payments_view"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("8zru1ik12ki465e");

  return dao.deleteCollection(collection);
})
