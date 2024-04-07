/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tdeikttss6upezc")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8ymnumfv",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tdeikttss6upezc")

  // remove
  collection.schema.removeField("8ymnumfv")

  return dao.saveCollection(collection)
})
