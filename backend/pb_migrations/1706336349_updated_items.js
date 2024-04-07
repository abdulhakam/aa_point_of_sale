/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("t063jextuf7c6he")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xugi0spg",
    "name": "box_size_qty",
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
  const collection = dao.findCollectionByNameOrId("t063jextuf7c6he")

  // remove
  collection.schema.removeField("xugi0spg")

  return dao.saveCollection(collection)
})
