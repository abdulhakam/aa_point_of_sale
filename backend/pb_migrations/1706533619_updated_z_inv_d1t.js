/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("96j09f15ve0kh9v")

  collection.options = {
    "query": "SELECT \n  invoices.id,\n  invoices.type,\n  invoiceNo,\n  party,\n  booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  transaction_view.cp_d2t AS cost_price,\n  COALESCE(SUM(transaction_view.total),0) AS total,\n  (COALESCE(SUM(transaction_view.total), 0)-(COALESCE(SUM(transaction_view.total), 0)*invoices.discount_1/100)) AS d1t,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n invoices\nLEFT JOIN\n transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY invoices.id"
  }

  // remove
  collection.schema.removeField("x3dtxrxq")

  // remove
  collection.schema.removeField("pmrltiqd")

  // remove
  collection.schema.removeField("ozhfpjca")

  // remove
  collection.schema.removeField("g6ue4jt9")

  // remove
  collection.schema.removeField("e63qidie")

  // remove
  collection.schema.removeField("7hfqywib")

  // remove
  collection.schema.removeField("fupoc1ew")

  // remove
  collection.schema.removeField("r0xpnwiv")

  // remove
  collection.schema.removeField("y0vkhl1x")

  // remove
  collection.schema.removeField("l0azethk")

  // remove
  collection.schema.removeField("s39buh2y")

  // remove
  collection.schema.removeField("7msl9pz7")

  // remove
  collection.schema.removeField("4ckp9z1e")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "iaboqfnc",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jwixkgyf",
    "name": "invoiceNo",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "i8kn4nlm",
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
    "id": "fwxmbjtz",
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
    "id": "z9gffrmg",
    "name": "invoice_maker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "_pb_users_auth_",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uol6trse",
    "name": "discount_1",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "b49wwsef",
    "name": "discount_2",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1apiivcg",
    "name": "cost_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "us7fddop",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bumoxwbv",
    "name": "d1t",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ifqcchd2",
    "name": "duedate",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tfccgyfl",
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
    "id": "v9g7dvhl",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "isrznjlk",
    "name": "completed",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("96j09f15ve0kh9v")

  collection.options = {
    "query": "SELECT \n  invoices.id,\n  invoices.type,\n  invoiceNo,\n  party,\n  booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  COALESCE(SUM(transaction_view.total),0) AS total,\n  (COALESCE(SUM(transaction_view.total), 0)-(COALESCE(SUM(transaction_view.total), 0)*invoices.discount_1/100)) AS d1t,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n invoices\nLEFT JOIN\n transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "x3dtxrxq",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pmrltiqd",
    "name": "invoiceNo",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ozhfpjca",
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
    "id": "g6ue4jt9",
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
    "id": "e63qidie",
    "name": "invoice_maker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "_pb_users_auth_",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "7hfqywib",
    "name": "discount_1",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fupoc1ew",
    "name": "discount_2",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "r0xpnwiv",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "y0vkhl1x",
    "name": "d1t",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "l0azethk",
    "name": "duedate",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "s39buh2y",
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
    "id": "7msl9pz7",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4ckp9z1e",
    "name": "completed",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("iaboqfnc")

  // remove
  collection.schema.removeField("jwixkgyf")

  // remove
  collection.schema.removeField("i8kn4nlm")

  // remove
  collection.schema.removeField("fwxmbjtz")

  // remove
  collection.schema.removeField("z9gffrmg")

  // remove
  collection.schema.removeField("uol6trse")

  // remove
  collection.schema.removeField("b49wwsef")

  // remove
  collection.schema.removeField("1apiivcg")

  // remove
  collection.schema.removeField("us7fddop")

  // remove
  collection.schema.removeField("bumoxwbv")

  // remove
  collection.schema.removeField("ifqcchd2")

  // remove
  collection.schema.removeField("tfccgyfl")

  // remove
  collection.schema.removeField("v9g7dvhl")

  // remove
  collection.schema.removeField("isrznjlk")

  return dao.saveCollection(collection)
})
