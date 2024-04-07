/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("96j09f15ve0kh9v")

  collection.options = {
    "query": "SELECT \n  invoices.id,\n  invoices.type,\n  invoiceNo,\n  party,\n  booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n(COALESCE(SUM(transaction_view.stock_price), 0)-(COALESCE(SUM(transaction_view.stock_price), 0)*invoices.discount_1/100)) AS stock_price,\n  COALESCE(SUM(transaction_view.total),0) AS total,\n  (COALESCE(SUM(transaction_view.total), 0)-(COALESCE(SUM(transaction_view.total), 0)*invoices.discount_1/100)) AS d1t,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n invoices\nLEFT JOIN\n transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY invoices.id"
  }

  // remove
  collection.schema.removeField("xyhb8qwd")

  // remove
  collection.schema.removeField("srvfyl33")

  // remove
  collection.schema.removeField("z4uel1zu")

  // remove
  collection.schema.removeField("nvjbr9ae")

  // remove
  collection.schema.removeField("sq69vgdw")

  // remove
  collection.schema.removeField("7bzkecs2")

  // remove
  collection.schema.removeField("hbqenqre")

  // remove
  collection.schema.removeField("eb3xuflc")

  // remove
  collection.schema.removeField("dfd9qh3s")

  // remove
  collection.schema.removeField("phhfqrmv")

  // remove
  collection.schema.removeField("oljl5dfs")

  // remove
  collection.schema.removeField("540onvq3")

  // remove
  collection.schema.removeField("qpy4t3tb")

  // remove
  collection.schema.removeField("fpnxzdsx")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nol1q9qn",
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
    "id": "9lcp6cve",
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
    "id": "dscqb1o2",
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
    "id": "wgcsokdq",
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
    "id": "wmustisk",
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
    "id": "3aiztsm7",
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
    "id": "tdrcpaw7",
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
    "id": "wtwuwetz",
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
    "id": "jririzdr",
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
    "id": "fhnn5fdg",
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
    "id": "a25ygffn",
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
    "id": "w5ej3pva",
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
    "id": "ugydyaib",
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
    "id": "rcyjhpk0",
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
    "query": "SELECT \n  invoices.id,\n  invoices.type,\n  invoiceNo,\n  party,\n  booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n(COALESCE(SUM(transaction_view.stock_price),0)*(invoices.discount_1/100)) AS stock_price,\n  COALESCE(SUM(transaction_view.total),0) AS total,\n  (COALESCE(SUM(transaction_view.total), 0)-(COALESCE(SUM(transaction_view.total), 0)*invoices.discount_1/100)) AS d1t,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n invoices\nLEFT JOIN\n transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xyhb8qwd",
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
    "id": "srvfyl33",
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
    "id": "z4uel1zu",
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
    "id": "nvjbr9ae",
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
    "id": "sq69vgdw",
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
    "id": "7bzkecs2",
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
    "id": "hbqenqre",
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
    "id": "eb3xuflc",
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
    "id": "dfd9qh3s",
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
    "id": "phhfqrmv",
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
    "id": "oljl5dfs",
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
    "id": "540onvq3",
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
    "id": "qpy4t3tb",
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
    "id": "fpnxzdsx",
    "name": "completed",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("nol1q9qn")

  // remove
  collection.schema.removeField("9lcp6cve")

  // remove
  collection.schema.removeField("dscqb1o2")

  // remove
  collection.schema.removeField("wgcsokdq")

  // remove
  collection.schema.removeField("wmustisk")

  // remove
  collection.schema.removeField("3aiztsm7")

  // remove
  collection.schema.removeField("tdrcpaw7")

  // remove
  collection.schema.removeField("wtwuwetz")

  // remove
  collection.schema.removeField("jririzdr")

  // remove
  collection.schema.removeField("fhnn5fdg")

  // remove
  collection.schema.removeField("a25ygffn")

  // remove
  collection.schema.removeField("w5ej3pva")

  // remove
  collection.schema.removeField("ugydyaib")

  // remove
  collection.schema.removeField("rcyjhpk0")

  return dao.saveCollection(collection)
})
