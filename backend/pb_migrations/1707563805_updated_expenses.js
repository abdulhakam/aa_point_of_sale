/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("72cq7pys91u4c13")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "omgrnzb0",
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
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("72cq7pys91u4c13")

  // remove
  collection.schema.removeField("omgrnzb0")

  return dao.saveCollection(collection)
})
