/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("h8ducv09yl30a7m")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pvehorpx",
    "name": "stock_price",
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
  collection.schema.removeField("pvehorpx")

  return dao.saveCollection(collection)
})
