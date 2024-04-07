/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ykgixcafsxq3poy")

  collection.options = {
    "query": "SELECT \n  id,\n  type,\n  party,\n  area,\n  section,\n  SUM(amount) AS amount\nFROM payments_view \n  GROUP BY party"
  }

  // remove
  collection.schema.removeField("27roueoq")

  // remove
  collection.schema.removeField("k1waxnc8")

  // remove
  collection.schema.removeField("i6mldz00")

  // remove
  collection.schema.removeField("gs8bpaw4")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "7cqwlvcr",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ovkjnjor",
    "name": "party",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "qhdujcbptsh2v29",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "o5w8jl2e",
    "name": "area",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "tdeikttss6upezc",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jul6m7gw",
    "name": "section",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "nlwqqfyu1ur5lpo",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zdqjggzg",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ykgixcafsxq3poy")

  collection.options = {
    "query": "SELECT id,type, party, area,section FROM payments_view GROUP BY party"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "27roueoq",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "k1waxnc8",
    "name": "party",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "qhdujcbptsh2v29",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "i6mldz00",
    "name": "area",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "tdeikttss6upezc",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gs8bpaw4",
    "name": "section",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "nlwqqfyu1ur5lpo",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // remove
  collection.schema.removeField("7cqwlvcr")

  // remove
  collection.schema.removeField("ovkjnjor")

  // remove
  collection.schema.removeField("o5w8jl2e")

  // remove
  collection.schema.removeField("jul6m7gw")

  // remove
  collection.schema.removeField("zdqjggzg")

  return dao.saveCollection(collection)
})
