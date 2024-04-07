/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "SELECT\n    (ROW_NUMBER() OVER()) as id,\n    id AS `payment_id`,\n    payments_view.created,\n    payments_view.updated,\n    payments_view.invoice,\n    payments_view.original_invoices,\n    payments_view.invoiceNo,\n    payments_view.invoice_maker,\n    payments_view.booker,\n    payments_view.company,\n    payments_view.party,\n    payments_view.party_type,\n    payments_view.type,\n    payments_view.amount,\n    payments_view.paid,\n    payments_view.area,\n    payments_view.section,\n    payments_view.description\nFROM payments_view\nLEFT JOIN (\n    SELECT\n        (ROW_NUMBER() OVER()) as payment_id,\n        transactions_report.created,\n        transactions_report.updated,\n        transactions_report.invoice,\n        invoices_return_reference.original_invoices,\n        transactions_report.invoiceNo,\n        invoices.invoice_maker,\n        invoices.booker,\n        transactions_report.company,\n        transactions_report.party,\n        transactions_report.party_type,\n        transactions_report.type,\n        SUM(transactions_report.net_amount) AS amount,\n        FALSE AS paid,\n        parties.area,\n        areas.section,\n        \"-\" AS description\n    FROM\n        transactions_report\n    LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n    LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n    LEFT JOIN parties ON transactions_report.party = parties.id\n    LEFT JOIN areas ON parties.area = areas.id\n  )"
  }

  // remove
  collection.schema.removeField("xjjhyqpp")

  // remove
  collection.schema.removeField("i6isxnxd")

  // remove
  collection.schema.removeField("51kjflnl")

  // remove
  collection.schema.removeField("iwcclewl")

  // remove
  collection.schema.removeField("ciwnx4n9")

  // remove
  collection.schema.removeField("tu0jwus8")

  // remove
  collection.schema.removeField("xrjgvlmc")

  // remove
  collection.schema.removeField("ybfo3e7i")

  // remove
  collection.schema.removeField("dltukpzz")

  // remove
  collection.schema.removeField("cc6xojle")

  // remove
  collection.schema.removeField("sfnkupe3")

  // remove
  collection.schema.removeField("cibgetry")

  // remove
  collection.schema.removeField("rum0cii5")

  // remove
  collection.schema.removeField("lgxpknan")

  // remove
  collection.schema.removeField("xujpvagd")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ufji20mo",
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
    "id": "jbmpmcp7",
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
    "id": "ntc7hvf5",
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
    "id": "gkwiijnu",
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
    "id": "iihsukzx",
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
    "id": "jmqdufbk",
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
    "id": "s5f3c2kh",
    "name": "company",
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
    "id": "nyrji7wn",
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
    "id": "zvl4vfn4",
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
    "id": "grpwuhte",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dn0txmf3",
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
    "id": "jhk7nnmy",
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
    "id": "jgkupezq",
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
    "id": "t8zgzrim",
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
    "id": "tqkze2rt",
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
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "SELECT\n    (ROW_NUMBER() OVER()) as id,\n    `payment_id`,\n    `created`,\n    `updated`,\n    `invoice`,\n    `original_invoices`,\n    `invoiceNo`,\n    `invoice_maker`,\n    `booker`,\n    `company`,\n    `party`,\n    `party_type`,\n    `type`,\n    `amount`,\n    `paid`,\n    `area`,\n    `section`,\n    `description`\nFROM\n    (\n        SELECT\n            payments.id AS payment_id,\n            payments.created,\n            payments.updated,\n            payments.invoice,\n            invoices_return_reference.original_invoices,\n            invoice_view.invoiceNo,\n            invoice_view.invoice_maker,\n            invoice_view.booker,\n            order_bookers.company, -- is actually an array in TEXT to hold multiple company ids\n            payments.party AS party,\n            parties.type AS party_type,\n            payments.type AS type,\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            ) AS amount,\n            payments.paid,\n            parties.area,\n            areas.section,\n            payments.description\n        FROM\n            payments\n        LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n        LEFT JOIN parties ON payments.party = parties.id\n        LEFT JOIN areas ON parties.area = areas.id\n        LEFT JOIN sections ON areas.section = sections.id\n        LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n        LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n        WHERE\n            payments.description <> 'Sale Invoice Created'\n    ) AS payments_view\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xjjhyqpp",
    "name": "payment_id",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "i6isxnxd",
    "name": "invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "51kjflnl",
    "name": "original_invoices",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "iwcclewl",
    "name": "invoiceNo",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ciwnx4n9",
    "name": "invoice_maker",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tu0jwus8",
    "name": "booker",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xrjgvlmc",
    "name": "company",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ybfo3e7i",
    "name": "party",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dltukpzz",
    "name": "party_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cc6xojle",
    "name": "type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sfnkupe3",
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
    "id": "cibgetry",
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
    "id": "rum0cii5",
    "name": "area",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lgxpknan",
    "name": "section",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xujpvagd",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("ufji20mo")

  // remove
  collection.schema.removeField("jbmpmcp7")

  // remove
  collection.schema.removeField("ntc7hvf5")

  // remove
  collection.schema.removeField("gkwiijnu")

  // remove
  collection.schema.removeField("iihsukzx")

  // remove
  collection.schema.removeField("jmqdufbk")

  // remove
  collection.schema.removeField("s5f3c2kh")

  // remove
  collection.schema.removeField("nyrji7wn")

  // remove
  collection.schema.removeField("zvl4vfn4")

  // remove
  collection.schema.removeField("grpwuhte")

  // remove
  collection.schema.removeField("dn0txmf3")

  // remove
  collection.schema.removeField("jhk7nnmy")

  // remove
  collection.schema.removeField("jgkupezq")

  // remove
  collection.schema.removeField("t8zgzrim")

  // remove
  collection.schema.removeField("tqkze2rt")

  return dao.saveCollection(collection)
})
