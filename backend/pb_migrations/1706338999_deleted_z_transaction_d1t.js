/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("bxeylt2cg6qa5ot");

  return dao.deleteCollection(collection);
}, (db) => {
  const collection = new Collection({
    "id": "bxeylt2cg6qa5ot",
    "created": "2024-01-26 14:08:38.466Z",
    "updated": "2024-01-26 14:08:38.466Z",
    "name": "z_transaction_d1t",
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
      "query": "SELECT id FROM transactions;"
    }
  });

  return Dao(db).saveCollection(collection);
})
