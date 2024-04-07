/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("h8ducv09yl30a7m")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "itff8bln",
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
  const collection = dao.findCollectionByNameOrId("h8ducv09yl30a7m")

  // remove
  collection.schema.removeField("itff8bln")

  return dao.saveCollection(collection)
})
