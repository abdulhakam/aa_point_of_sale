/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "SELECT\n        (ROW_NUMBER() OVER()) AS id,\n        transactions_report.created,\n        transactions_report.updated,\n        transactions_report.invoice,\n        invoices_return_reference.original_invoices,\n        transactions_report.invoiceNo,\n        invoices.invoice_maker,\n        invoices.booker,\n        transactions_report.company,\n        transactions_report.party,\n        transactions_report.party_type,\n        transactions_report.type,\n        transactions_report.net_amount amount,\n        FALSE AS paid,\n        parties.area,\n        areas.section,\n        \"-\" AS description\n    FROM\n        transactions_report\n    LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n    LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n    LEFT JOIN parties ON transactions_report.party = parties.id\n    LEFT JOIN areas ON parties.area = areas.id\nGROUP BY transactions_report.type"
  }

  // remove
  collection.schema.removeField("fklwkwe2")

  // remove
  collection.schema.removeField("fn38eci3")

  // remove
  collection.schema.removeField("wwb3k9lx")

  // remove
  collection.schema.removeField("z4lvgw5y")

  // remove
  collection.schema.removeField("r0qpb0sf")

  // remove
  collection.schema.removeField("rodt2t6r")

  // remove
  collection.schema.removeField("uvpnbqne")

  // remove
  collection.schema.removeField("8xouu2hz")

  // remove
  collection.schema.removeField("0ksbzjy4")

  // remove
  collection.schema.removeField("kto0k4fv")

  // remove
  collection.schema.removeField("baertxkd")

  // remove
  collection.schema.removeField("cysfsvmr")

  // remove
  collection.schema.removeField("lrbkbg62")

  // remove
  collection.schema.removeField("wvc5uqli")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "11dgz3qz",
    "name": "invoice",
    "type": "relation",
    "required": true,
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
    "id": "mtzivkdz",
    "name": "original_invoices",
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
    "id": "4kzyijnj",
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
    "id": "1bsqyspg",
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
    "id": "gsi4uijr",
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
    "id": "ogf7ab7r",
    "name": "company",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "106aq516rbyoq0q",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zdc7zvxm",
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
    "id": "rx2jtl1k",
    "name": "party_type",
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
    "id": "mtnxssab",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale",
        "return"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kqzf4sjk",
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
    "id": "8y5z1ali",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "peuiokib",
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
    "id": "dpxywvtt",
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
    "id": "v3yurwgv",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "SELECT\n        (ROW_NUMBER() OVER()) AS id,\n        transactions_report.created,\n        transactions_report.updated,\n        transactions_report.invoice,\n        invoices_return_reference.original_invoices,\n        transactions_report.invoiceNo,\n        invoices.invoice_maker,\n        invoices.booker,\n        transactions_report.company,\n        transactions_report.party,\n        transactions_report.party_type,\n        transactions_report.type,\n        transactions_report.net_amount amount,\n        FALSE AS paid,\n        parties.area,\n        areas.section,\n        \"-\" AS description\n    FROM\n        transactions_report\n    LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n    LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n    LEFT JOIN parties ON transactions_report.party = parties.id\n    LEFT JOIN areas ON parties.area = areas.id\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fklwkwe2",
    "name": "invoice",
    "type": "relation",
    "required": true,
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
    "id": "fn38eci3",
    "name": "original_invoices",
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
    "id": "wwb3k9lx",
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
    "id": "z4lvgw5y",
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
    "id": "r0qpb0sf",
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
    "id": "rodt2t6r",
    "name": "company",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "106aq516rbyoq0q",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uvpnbqne",
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
    "id": "8xouu2hz",
    "name": "party_type",
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
    "id": "0ksbzjy4",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale",
        "return"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kto0k4fv",
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
    "id": "baertxkd",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cysfsvmr",
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
    "id": "lrbkbg62",
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
    "id": "wvc5uqli",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("11dgz3qz")

  // remove
  collection.schema.removeField("mtzivkdz")

  // remove
  collection.schema.removeField("4kzyijnj")

  // remove
  collection.schema.removeField("1bsqyspg")

  // remove
  collection.schema.removeField("gsi4uijr")

  // remove
  collection.schema.removeField("ogf7ab7r")

  // remove
  collection.schema.removeField("zdc7zvxm")

  // remove
  collection.schema.removeField("rx2jtl1k")

  // remove
  collection.schema.removeField("mtnxssab")

  // remove
  collection.schema.removeField("kqzf4sjk")

  // remove
  collection.schema.removeField("8y5z1ali")

  // remove
  collection.schema.removeField("peuiokib")

  // remove
  collection.schema.removeField("dpxywvtt")

  // remove
  collection.schema.removeField("v3yurwgv")

  return dao.saveCollection(collection)
})
