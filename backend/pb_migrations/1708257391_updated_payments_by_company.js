/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "WITH transaction_totals AS (\n  SELECT\n    items.category AS company,\n    transaction_view.invoice AS invoice,\n    SUM(transaction_view.net_amount) AS total_payment\n  FROM\n    transaction_view\n  LEFT JOIN items ON transaction_view.item = items.id\n  GROUP BY\n    items.category, transaction_view.invoice\n)\n\nSELECT\n  (ROW_NUMBER() OVER()) as id,\n  pv.id AS payment_id,\n  pv.invoice AS payment_invoice,\n  pv.original_invoices AS payment_original_invoices,\n  pv.invoiceNo AS payment_invoiceNo,\n  pv.invoice_maker AS payment_invoice_maker,\n  pv.booker AS payment_booker,\n  pv.company AS payment_company,\n  pv.party AS payment_party,\n  pv.party_type AS payment_party_type,\n  pv.type AS payment_type,\n  pv.amount AS payment_amount,\n  pv.paid AS payment_paid,\n  pv.area AS payment_area,\n  pv.section AS payment_section,\n  pv.description AS payment_description,\n  COALESCE(tt.total_payment, 0) AS total_payment_for_invoice,\n  pv.created AS payment_created,\n  pv.updated AS payment_updated\nFROM\n  payments_view pv\nLEFT JOIN transaction_totals tt ON pv.company = tt.company AND pv.invoice = tt.invoice\n"
  }

  // remove
  collection.schema.removeField("fxw4wtft")

  // remove
  collection.schema.removeField("daomddqf")

  // remove
  collection.schema.removeField("5jfvkjot")

  // remove
  collection.schema.removeField("jfwdhyju")

  // remove
  collection.schema.removeField("tdyej3yl")

  // remove
  collection.schema.removeField("jsyana87")

  // remove
  collection.schema.removeField("eb5udz0w")

  // remove
  collection.schema.removeField("xqspxymi")

  // remove
  collection.schema.removeField("tviis588")

  // remove
  collection.schema.removeField("fyykxqsy")

  // remove
  collection.schema.removeField("ndvb4nwh")

  // remove
  collection.schema.removeField("pcw1qlzr")

  // remove
  collection.schema.removeField("o8lwmbms")

  // remove
  collection.schema.removeField("6agf3jz6")

  // remove
  collection.schema.removeField("w10g9idw")

  // remove
  collection.schema.removeField("bknstwis")

  // remove
  collection.schema.removeField("cudwwgkt")

  // remove
  collection.schema.removeField("qn3kbbha")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vz8srnki",
    "name": "payment_id",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "k11cqs87kjiwr45",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ba2zd28i",
    "name": "payment_invoice",
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
    "id": "gnfscnsh",
    "name": "payment_original_invoices",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "0pwj3vph7ag7nc2",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": null,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0eec0yix",
    "name": "payment_invoiceNo",
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
    "id": "2wgqmuah",
    "name": "payment_invoice_maker",
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
    "id": "k9hjsd1q",
    "name": "payment_booker",
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
    "id": "tbqgy2vc",
    "name": "payment_company",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "106aq516rbyoq0q",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": null,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "b17rsqp7",
    "name": "payment_party",
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
    "id": "wcsunwge",
    "name": "payment_party_type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "supplier",
        "customer"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ncjqhely",
    "name": "payment_type",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "p3yfmdif",
    "name": "payment_amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jufpfliw",
    "name": "payment_paid",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "u7jh9xwd",
    "name": "payment_area",
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
    "id": "pxwwdnbc",
    "name": "payment_section",
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
    "id": "plh2ve0m",
    "name": "payment_description",
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
    "id": "0lzic5xg",
    "name": "total_payment_for_invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tvjwe7dw",
    "name": "payment_created",
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
    "id": "salrqcip",
    "name": "payment_updated",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "WITH transaction_totals AS (\n  SELECT\n    items.category AS company,\n    transaction_view.invoice AS invoice,\n    SUM(transaction_view.net_amount) AS total_payment\n  FROM\n    transaction_view\n  LEFT JOIN items ON transaction_view.item = items.id\n  GROUP BY\n    items.category, transaction_view.invoice\n)\n\nSELECT\n  (ROW_NUMBER() OVER()) as id,\n  pv.id AS payment_id,\n  pv.created AS payment_created,\n  pv.updated AS payment_updated,\n  pv.invoice AS payment_invoice,\n  pv.original_invoices AS payment_original_invoices,\n  pv.invoiceNo AS payment_invoiceNo,\n  pv.invoice_maker AS payment_invoice_maker,\n  pv.booker AS payment_booker,\n  pv.company AS payment_company,\n  pv.party AS payment_party,\n  pv.party_type AS payment_party_type,\n  pv.type AS payment_type,\n  pv.amount AS payment_amount,\n  pv.paid AS payment_paid,\n  pv.area AS payment_area,\n  pv.section AS payment_section,\n  pv.description AS payment_description,\n  COALESCE(tt.total_payment, 0) AS total_payment_for_invoice\nFROM\n  payments_view pv\nLEFT JOIN transaction_totals tt ON pv.company = tt.company AND pv.invoice = tt.invoice\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fxw4wtft",
    "name": "payment_id",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "k11cqs87kjiwr45",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "daomddqf",
    "name": "payment_created",
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
    "id": "5jfvkjot",
    "name": "payment_updated",
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
    "id": "jfwdhyju",
    "name": "payment_invoice",
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
    "id": "tdyej3yl",
    "name": "payment_original_invoices",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "0pwj3vph7ag7nc2",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": null,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jsyana87",
    "name": "payment_invoiceNo",
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
    "id": "eb5udz0w",
    "name": "payment_invoice_maker",
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
    "id": "xqspxymi",
    "name": "payment_booker",
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
    "id": "tviis588",
    "name": "payment_company",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "106aq516rbyoq0q",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": null,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fyykxqsy",
    "name": "payment_party",
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
    "id": "ndvb4nwh",
    "name": "payment_party_type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "supplier",
        "customer"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pcw1qlzr",
    "name": "payment_type",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "o8lwmbms",
    "name": "payment_amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6agf3jz6",
    "name": "payment_paid",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "w10g9idw",
    "name": "payment_area",
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
    "id": "bknstwis",
    "name": "payment_section",
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
    "id": "cudwwgkt",
    "name": "payment_description",
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
    "id": "qn3kbbha",
    "name": "total_payment_for_invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("vz8srnki")

  // remove
  collection.schema.removeField("ba2zd28i")

  // remove
  collection.schema.removeField("gnfscnsh")

  // remove
  collection.schema.removeField("0eec0yix")

  // remove
  collection.schema.removeField("2wgqmuah")

  // remove
  collection.schema.removeField("k9hjsd1q")

  // remove
  collection.schema.removeField("tbqgy2vc")

  // remove
  collection.schema.removeField("b17rsqp7")

  // remove
  collection.schema.removeField("wcsunwge")

  // remove
  collection.schema.removeField("ncjqhely")

  // remove
  collection.schema.removeField("p3yfmdif")

  // remove
  collection.schema.removeField("jufpfliw")

  // remove
  collection.schema.removeField("u7jh9xwd")

  // remove
  collection.schema.removeField("pxwwdnbc")

  // remove
  collection.schema.removeField("plh2ve0m")

  // remove
  collection.schema.removeField("0lzic5xg")

  // remove
  collection.schema.removeField("tvjwe7dw")

  // remove
  collection.schema.removeField("salrqcip")

  return dao.saveCollection(collection)
})
