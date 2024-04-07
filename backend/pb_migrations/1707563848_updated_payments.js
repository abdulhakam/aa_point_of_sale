/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("px1b1xx26o06obx")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "omvz0bfl",
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
  const collection = dao.findCollectionByNameOrId("px1b1xx26o06obx")

  // remove
  collection.schema.removeField("omvz0bfl")

  return dao.saveCollection(collection)
})
