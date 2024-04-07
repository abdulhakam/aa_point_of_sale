/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "5nbtbhpd34w03qd",
    "created": "2024-01-27 10:07:16.036Z",
    "updated": "2024-01-27 10:07:16.036Z",
    "name": "counts_for_row_numbers",
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
      "query": "SELECT id from invoices"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("5nbtbhpd34w03qd");

  return dao.deleteCollection(collection);
})
