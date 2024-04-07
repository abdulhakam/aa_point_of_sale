/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("h8ducv09yl30a7m")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wrtzsbdx",
    "name": "discout_rs",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("h8ducv09yl30a7m")

  // remove
  collection.schema.removeField("wrtzsbdx")

  return dao.saveCollection(collection)
})
