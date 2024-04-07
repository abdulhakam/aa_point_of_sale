/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ykgixcafsxq3poy")

  collection.options = {
    "query": "SELECT \n  payments_view.id,\n  payments_view.type,\n  payments_view.party,\n  payments_view.area,\n  payments_view.section,\n  parties.address,\n  SUM( CASE WHEN paid == TRUE THEN -amount ELSE amount END) AS amount\nFROM payments_view\n  JOIN parties ON payments_view.party = parties.id\n  GROUP BY party"
  }

  // remove
  collection.schema.removeField("hhtyaipw")

  // remove
  collection.schema.removeField("x4tfq2qj")

  // remove
  collection.schema.removeField("zekmfbpk")

  // remove
  collection.schema.removeField("uccitxp2")

  // remove
  collection.schema.removeField("28fvnneq")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "abpws6k0",
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
    "id": "hk61mqlk",
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
    "id": "qxzre1x5",
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
    "id": "5jkhxowf",
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
    "id": "1zp5rtve",
    "name": "address",
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
    "id": "dm9jpiow",
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
    "query": "SELECT \n  payments_view.id,\n  payments_view.type,\n  payments_view.party,\n  payments_view.area,\n  payments_view.section,\n  SUM( CASE WHEN paid == TRUE THEN -amount ELSE amount END) AS amount\nFROM payments_view\n  GROUP BY party"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hhtyaipw",
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
    "id": "x4tfq2qj",
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
    "id": "zekmfbpk",
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
    "id": "uccitxp2",
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
    "id": "28fvnneq",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("abpws6k0")

  // remove
  collection.schema.removeField("hk61mqlk")

  // remove
  collection.schema.removeField("qxzre1x5")

  // remove
  collection.schema.removeField("5jkhxowf")

  // remove
  collection.schema.removeField("1zp5rtve")

  // remove
  collection.schema.removeField("dm9jpiow")

  return dao.saveCollection(collection)
})
