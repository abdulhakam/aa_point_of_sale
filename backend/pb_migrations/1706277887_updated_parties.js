/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("qhdujcbptsh2v29")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6qrb3su9",
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
  const collection = dao.findCollectionByNameOrId("qhdujcbptsh2v29")

  // remove
  collection.schema.removeField("6qrb3su9")

  return dao.saveCollection(collection)
})
