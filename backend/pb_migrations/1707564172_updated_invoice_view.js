/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("228mbdx8pheecly")

  collection.options = {
    "query": "SELECT\n  invoices.id,\n  (CASE WHEN invoices.date == NULL THEN invoices.created ELSE NULL END) AS date,\n  invoices.type,\n  invoices.invoiceNo,\n  party,\n  booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  --transactions_view.net_cptrans*qty AS stock_price,\n  COALESCE(SUM(transaction_view.total), 0) AS total,\n\n  ((COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100)) AS final_total,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n  invoices\n  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY\n  invoices.id"
  }

  // remove
  collection.schema.removeField("puknr5z8")

  // remove
  collection.schema.removeField("vjtdb4qm")

  // remove
  collection.schema.removeField("lhxnh3sv")

  // remove
  collection.schema.removeField("yiehcixq")

  // remove
  collection.schema.removeField("f8yienox")

  // remove
  collection.schema.removeField("yyss7xc0")

  // remove
  collection.schema.removeField("zfhrnakx")

  // remove
  collection.schema.removeField("pflq7oxs")

  // remove
  collection.schema.removeField("xeldf6ig")

  // remove
  collection.schema.removeField("omg2jgnr")

  // remove
  collection.schema.removeField("oreoturi")

  // remove
  collection.schema.removeField("bejhnhw4")

  // remove
  collection.schema.removeField("q3fd1v2i")

  // remove
  collection.schema.removeField("iinz4lq6")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "17rgncnr",
    "name": "date",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9vxmf2zr",
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
    "id": "qk1gkhb7",
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
    "id": "5qxvfh51",
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
    "id": "rlsrszsd",
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
    "id": "camfmse9",
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
    "id": "7rlyu1tl",
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
    "id": "g0mizgpn",
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
    "id": "7cyjwnzm",
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
    "id": "xia5heie",
    "name": "final_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kytgckaf",
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
    "id": "n1s8ciwm",
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
    "id": "mwmbfpva",
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
    "id": "omwv5xsg",
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
  const collection = dao.findCollectionByNameOrId("228mbdx8pheecly")

  collection.options = {
    "query": "SELECT\n  invoices.id,\n  (CASE WHEN invoices.date == 'N/A' THEN invoices.created ELSE NULL END) AS date,\n  invoices.type,\n  invoices.invoiceNo,\n  party,\n  booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  --transactions_view.net_cptrans*qty AS stock_price,\n  COALESCE(SUM(transaction_view.total), 0) AS total,\n\n  ((COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100)) AS final_total,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n  invoices\n  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY\n  invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "puknr5z8",
    "name": "date",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vjtdb4qm",
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
    "id": "lhxnh3sv",
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
    "id": "yiehcixq",
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
    "id": "f8yienox",
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
    "id": "yyss7xc0",
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
    "id": "zfhrnakx",
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
    "id": "pflq7oxs",
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
    "id": "xeldf6ig",
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
    "id": "omg2jgnr",
    "name": "final_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "oreoturi",
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
    "id": "bejhnhw4",
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
    "id": "q3fd1v2i",
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
    "id": "iinz4lq6",
    "name": "completed",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("17rgncnr")

  // remove
  collection.schema.removeField("9vxmf2zr")

  // remove
  collection.schema.removeField("qk1gkhb7")

  // remove
  collection.schema.removeField("5qxvfh51")

  // remove
  collection.schema.removeField("rlsrszsd")

  // remove
  collection.schema.removeField("camfmse9")

  // remove
  collection.schema.removeField("7rlyu1tl")

  // remove
  collection.schema.removeField("g0mizgpn")

  // remove
  collection.schema.removeField("7cyjwnzm")

  // remove
  collection.schema.removeField("xia5heie")

  // remove
  collection.schema.removeField("kytgckaf")

  // remove
  collection.schema.removeField("n1s8ciwm")

  // remove
  collection.schema.removeField("mwmbfpva")

  // remove
  collection.schema.removeField("omwv5xsg")

  return dao.saveCollection(collection)
})
