/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "59aj32jofufhcby",
    "created": "2024-02-17 14:41:26.913Z",
    "updated": "2024-02-17 14:41:26.913Z",
    "name": "invoices_return_reference",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "wkyzuob3",
        "name": "return_invoice",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "0pwj3vph7ag7nc2",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "sctsbahw",
        "name": "original_invoice",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "0pwj3vph7ag7nc2",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("59aj32jofufhcby");

  return dao.deleteCollection(collection);
})
