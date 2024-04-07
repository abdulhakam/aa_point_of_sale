/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("3dz9ii2wo8d5q8g")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1qutiy3y",
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
  const collection = dao.findCollectionByNameOrId("3dz9ii2wo8d5q8g")

  // remove
  collection.schema.removeField("1qutiy3y")

  return dao.saveCollection(collection)
})
