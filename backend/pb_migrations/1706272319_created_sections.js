/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "nlwqqfyu1ur5lpo",
    "created": "2024-01-26 12:31:59.554Z",
    "updated": "2024-01-26 12:31:59.554Z",
    "name": "sections",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "jvfqy5dt",
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
  const collection = dao.findCollectionByNameOrId("nlwqqfyu1ur5lpo");

  return dao.deleteCollection(collection);
})
