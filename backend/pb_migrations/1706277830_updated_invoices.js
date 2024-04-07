/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("0pwj3vph7ag7nc2")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zgl7ph6b",
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
  const collection = dao.findCollectionByNameOrId("0pwj3vph7ag7nc2")

  // remove
  collection.schema.removeField("zgl7ph6b")

  return dao.saveCollection(collection)
})
