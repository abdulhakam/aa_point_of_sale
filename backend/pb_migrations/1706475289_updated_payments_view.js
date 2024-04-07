/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4a49mdbu0igd28u")

  collection.options = {
    "query": "SELECT\n  payments.id,\n  payments.created,\n  payments.updated,\n  payments.invoice,\n  invoice_view.booker,\n  payments.party AS party,\n  payments.type AS type,\n(CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END) AS amount,\n  invoice_view.stock_price,\n  payments.paid,\n  payments.description,\n  party_view.area,\n  party_view.section\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id\nLEFT JOIN party_view ON payments.party = party_view.party"
  }

  // remove
  collection.schema.removeField("70bypjzk")

  // remove
  collection.schema.removeField("hskfei6j")

  // remove
  collection.schema.removeField("y1wxtezr")

  // remove
  collection.schema.removeField("w2gl44si")

  // remove
  collection.schema.removeField("3l9l5ame")

  // remove
  collection.schema.removeField("lsuvnban")

  // remove
  collection.schema.removeField("9iyu6dbw")

  // remove
  collection.schema.removeField("6htkspwu")

  // remove
  collection.schema.removeField("on60jlij")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4elmhr03",
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
    "id": "h5tcfddh",
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
    "id": "ydhec7qr",
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
    "id": "u6yme6tt",
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
    "id": "yorgijwh",
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
    "id": "occ8jx0x",
    "name": "stock_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "o3sn14po",
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
    "id": "7n6trhgu",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "3bhaaonm",
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
    "id": "c5pnctk7",
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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("4a49mdbu0igd28u")

  collection.options = {
    "query": "SELECT\n  payments.id,\n  payments.created,\n  payments.updated,\n  payments.invoice,\n  invoice_view.booker,\n  payments.party AS party,\n  payments.type AS type,\n(CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END) AS amount,\n  payments.paid,\n  payments.description,\n  party_view.area,\n  party_view.section\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id\nLEFT JOIN party_view ON payments.party = party_view.party"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "70bypjzk",
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
    "id": "hskfei6j",
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
    "id": "y1wxtezr",
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
    "id": "w2gl44si",
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
    "id": "3l9l5ame",
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
    "id": "lsuvnban",
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
    "id": "9iyu6dbw",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6htkspwu",
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
    "id": "on60jlij",
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
  collection.schema.removeField("4elmhr03")

  // remove
  collection.schema.removeField("h5tcfddh")

  // remove
  collection.schema.removeField("ydhec7qr")

  // remove
  collection.schema.removeField("u6yme6tt")

  // remove
  collection.schema.removeField("yorgijwh")

  // remove
  collection.schema.removeField("occ8jx0x")

  // remove
  collection.schema.removeField("o3sn14po")

  // remove
  collection.schema.removeField("7n6trhgu")

  // remove
  collection.schema.removeField("3bhaaonm")

  // remove
  collection.schema.removeField("c5pnctk7")

  return dao.saveCollection(collection)
})
