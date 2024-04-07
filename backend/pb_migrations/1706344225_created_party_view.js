/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "9xf7lc99kwyh3zg",
    "created": "2024-01-27 08:30:25.369Z",
    "updated": "2024-01-27 08:30:25.369Z",
    "name": "party_view",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "bzq77gmq",
        "name": "party",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "qhdujcbptsh2v29",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "xx5yndoa",
        "name": "party_type",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "supplier",
            "customer",
            "both"
          ]
        }
      },
      {
        "system": false,
        "id": "26yo9ia2",
        "name": "area",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "tdeikttss6upezc",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "aq2cyzse",
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
    "options": {
      "query": "SELECT \n  parties.id as id,\n  parties.id as party, \n  parties.type as party_type, \n  parties.area, \n  areas.section,\n  parties.created,\n  parties.updated\nFROM parties\nJOIN areas ON parties.area = areas.id"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("9xf7lc99kwyh3zg");

  return dao.deleteCollection(collection);
})
