/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("106aq516rbyoq0q")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pq1eevxh",
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
  const collection = dao.findCollectionByNameOrId("106aq516rbyoq0q")

  // remove
  collection.schema.removeField("pq1eevxh")

  return dao.saveCollection(collection)
})
