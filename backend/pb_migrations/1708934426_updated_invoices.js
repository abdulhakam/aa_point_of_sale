/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("0pwj3vph7ag7nc2")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lqjysasp",
    "name": "discount_rs",
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
  const collection = dao.findCollectionByNameOrId("0pwj3vph7ag7nc2")

  // remove
  collection.schema.removeField("lqjysasp")

  return dao.saveCollection(collection)
})
