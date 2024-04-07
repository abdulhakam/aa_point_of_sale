/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("qhdujcbptsh2v29")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "c4rk4wrt",
    "name": "company",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "106aq516rbyoq0q",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("qhdujcbptsh2v29")

  // remove
  collection.schema.removeField("c4rk4wrt")

  return dao.saveCollection(collection)
})
