/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4a49mdbu0igd28u")

  collection.options = {
    "query": "SELECT id from (SELECT\n  payments.id,\n  payments.created,\n  payments.updated,\n  payments.invoice,\n  invoice_view.booker,\n  payments.party AS party,\n  payments.type AS type,\n(CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END) AS amount,\n  paid,\n  payments.description\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id)"
  }

  // remove
  collection.schema.removeField("bx1peo4p")

  // remove
  collection.schema.removeField("ft19ok1k")

  // remove
  collection.schema.removeField("wf4ntdc0")

  // remove
  collection.schema.removeField("rw6momlb")

  // remove
  collection.schema.removeField("yh6aznwg")

  // remove
  collection.schema.removeField("9vniah0q")

  // remove
  collection.schema.removeField("xnpbnfzl")

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4a49mdbu0igd28u")

  collection.options = {
    "query": "SELECT\n  payments.id,\n  payments.created,\n  payments.updated,\n  payments.invoice,\n  invoice_view.booker,\n  payments.party AS party,\n  payments.type AS type,\n(CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END) AS amount,\n  paid,\n  payments.description\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bx1peo4p",
    "name": "invoice",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "0pwj3vph7ag7nc2",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ft19ok1k",
    "name": "booker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "3dz9ii2wo8d5q8g",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wf4ntdc0",
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
    "id": "rw6momlb",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "sending",
        "receiving"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yh6aznwg",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9vniah0q",
    "name": "paid",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xnpbnfzl",
    "name": "description",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
})
