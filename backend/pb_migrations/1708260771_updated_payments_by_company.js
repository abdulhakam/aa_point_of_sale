/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "SELECT\n    payments_view.id,\n    payments_view.created,\n    payments_view.updated,\n    payments_view.invoice,\n    payments_view.original_invoices,\n    payments_view.invoiceNo,\n    payments_view.invoice_maker,\n    payments_view.booker,\n    payments_view.company,\n    payments_view.party,\n    payments_view.party_type,\n    payments_view.type,\n    payments_view.amount,\n    payments_view.paid,\n    payments_view.area,\n    payments_view.section,\n    payments_view.description\nFROM\n    (\n        SELECT\n            payments.id,\n            payments.created,\n            payments.updated,\n            payments.invoice,\n            invoices_return_reference.original_invoices,\n            invoice_view.invoiceNo,\n            invoice_view.invoice_maker,\n            invoice_view.booker,\n            order_bookers.company, -- is actually an array in TEXT to hold multiple company ids\n            payments.party AS party,\n            parties.type AS party_type,\n            payments.type AS type,\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            ) AS amount,\n            payments.paid,\n            parties.area,\n            areas.section,\n            payments.description\n        FROM\n            payments\n        LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n        LEFT JOIN parties ON payments.party = parties.id\n        LEFT JOIN areas ON parties.area = areas.id\n        LEFT JOIN sections ON areas.section = sections.id\n        LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n        LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n        WHERE\n            payments.description <> 'Sale Invoice Created'\n    ) AS payments_view\nLEFT JOIN (\n    SELECT\n        payments.invoice AS invoice_id,\n        SUM(\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            )\n        ) AS total_payment\n    FROM\n        payments\n    LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n    WHERE\n        payments.description <> 'Sale Invoice Created'\n    GROUP BY\n        payments.invoice\n) AS invoice_payments ON payments_view.invoice = invoice_payments.invoice_id\n"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qsxfj9us",
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
    "id": "jmofgiop",
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
    "id": "4idrhofu",
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
    "id": "jognnjvf",
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
    "id": "awofsnfl",
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
    "id": "cbantabq",
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
    "id": "crfyhwzq",
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
    "id": "kwvjfzho",
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
    "id": "x6cro5xu",
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
    "id": "jok8hkgp",
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
    "id": "p0sizkup",
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
    "id": "b2ljpuij",
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
    "id": "9xjutekv",
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
    "id": "i2lhm73k",
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
    "query": "WITH transaction_totals AS (\n  SELECT\n    items.category AS company,\n    transaction_view.invoice AS invoice,\n    SUM(transaction_view.net_amount) AS total_payment\n  FROM\n    transaction_view\n  LEFT JOIN items ON transaction_view.item = items.id\n  GROUP BY\n    items.category, transaction_view.invoice\n)\n\nSELECT\n  (ROW_NUMBER() OVER()) as id,\n  pv.id AS payment_id,\n  pv.invoice AS payment_invoice,\n  pv.original_invoices AS payment_original_invoices,\n  pv.invoiceNo AS payment_invoiceNo,\n  pv.invoice_maker AS payment_invoice_maker,\n  pv.booker AS payment_booker,\n  pv.company AS payment_company,\n  pv.party AS payment_party,\n  pv.party_type AS payment_party_type,\n  pv.type AS payment_type,\n  pv.amount AS payment_amount,\n  pv.paid AS payment_paid,\n  pv.area AS payment_area,\n  pv.section AS payment_section,\n  pv.description AS payment_description,\n  COALESCE(tt.total_payment, 0) AS total_payment_for_invoice,\n  pv.created AS payment_created,\n  pv.updated AS payment_updated\nFROM\n  payments_view pv\nLEFT JOIN transaction_totals tt ON pv.company = tt.company AND pv.invoice = tt.invoice\n"
  }

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

  // remove
  collection.schema.removeField("qsxfj9us")

  // remove
  collection.schema.removeField("jmofgiop")

  // remove
  collection.schema.removeField("4idrhofu")

  // remove
  collection.schema.removeField("jognnjvf")

  // remove
  collection.schema.removeField("awofsnfl")

  // remove
  collection.schema.removeField("cbantabq")

  // remove
  collection.schema.removeField("crfyhwzq")

  // remove
  collection.schema.removeField("kwvjfzho")

  // remove
  collection.schema.removeField("x6cro5xu")

  // remove
  collection.schema.removeField("jok8hkgp")

  // remove
  collection.schema.removeField("p0sizkup")

  // remove
  collection.schema.removeField("b2ljpuij")

  // remove
  collection.schema.removeField("9xjutekv")

  // remove
  collection.schema.removeField("i2lhm73k")

  return dao.saveCollection(collection)
})
