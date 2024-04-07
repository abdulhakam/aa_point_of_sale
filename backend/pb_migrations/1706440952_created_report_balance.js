/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "ykgixcafsxq3poy",
    "created": "2024-01-28 11:22:32.280Z",
    "updated": "2024-01-28 11:22:32.280Z",
    "name": "report_balance",
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
      "query": "SELECT id FROM transaction_view"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("ykgixcafsxq3poy");

  return dao.deleteCollection(collection);
})
