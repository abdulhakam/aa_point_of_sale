/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "tdeikttss6upezc",
    "created": "2024-01-26 12:32:13.659Z",
    "updated": "2024-01-26 12:32:13.659Z",
    "name": "areas",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "zpsts03j",
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
        "id": "8fab7612",
        "name": "section",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "nlwqqfyu1ur5lpo",
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
  const collection = dao.findCollectionByNameOrId("tdeikttss6upezc");

  return dao.deleteCollection(collection);
})
