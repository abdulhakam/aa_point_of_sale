/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("0pwj3vph7ag7nc2")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yu2ihhxx",
    "name": "dated",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("0pwj3vph7ag7nc2")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yu2ihhxx",
    "name": "date",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))

  return dao.saveCollection(collection)
})
