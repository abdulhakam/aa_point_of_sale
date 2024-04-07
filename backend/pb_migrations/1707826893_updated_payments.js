/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("px1b1xx26o06obx")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mvlyguxb",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "sending",
        "recieving",
        "return"
      ]
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("px1b1xx26o06obx")

  // update
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mvlyguxb",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "sending",
        "recieving"
      ]
    }
  }))

  return dao.saveCollection(collection)
})
