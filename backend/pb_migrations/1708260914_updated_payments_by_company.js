/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "SELECT\n    `id`,\n    `created`,\n    `updated`,\n    `invoice`,\n    `original_invoices`,\n    `invoiceNo`,\n    `invoice_maker`,\n    `booker`,\n    `company`,\n    `party`,\n    `party_type`,\n    `type`,\n    `amount`,\n    `paid`,\n    `area`,\n    `section`,\n    `description`\nFROM\n    (\n        SELECT\n            payments.id,\n            payments.created,\n            payments.updated,\n            payments.invoice,\n            invoices_return_reference.original_invoices,\n            invoice_view.invoiceNo,\n            invoice_view.invoice_maker,\n            invoice_view.booker,\n            order_bookers.company, -- is actually an array in TEXT to hold multiple company ids\n            payments.party AS party,\n            parties.type AS party_type,\n            payments.type AS type,\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            ) AS amount,\n            payments.paid,\n            parties.area,\n            areas.section,\n            payments.description\n        FROM\n            payments\n        LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n        LEFT JOIN parties ON payments.party = parties.id\n        LEFT JOIN areas ON parties.area = areas.id\n        LEFT JOIN sections ON areas.section = sections.id\n        LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n        LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n        WHERE\n            payments.description <> 'Sale Invoice Created'\n    ) AS payments_view\nLEFT JOIN (\n    SELECT\n        payments.invoice AS invoice_id,\n        SUM(\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            )\n        ) AS total_payment\n    FROM\n        payments\n    LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n    WHERE\n        payments.description <> 'Sale Invoice Created'\n    GROUP BY\n        payments.invoice\n) AS invoice_payments ON payments_view.invoice = invoice_payments.invoice_id\n"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ym4cjmse",
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
    "id": "0tm2d2ub",
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
    "id": "tjfzosru",
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
    "id": "wjwtq2kt",
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
    "id": "wzwcs7eg",
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
    "id": "nznecsgu",
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
    "id": "z3ddme5w",
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
    "id": "luttbten",
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
    "id": "l5rq0eeh",
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
    "id": "qbml6j7r",
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
    "id": "esrnbxls",
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
    "id": "sr59khhz",
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
    "id": "hzivqltv",
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
    "id": "mwnlcj7w",
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
    "query": "SELECT\n    payments_view.id,\n    payments_view.created,\n    payments_view.updated,\n    payments_view.invoice,\n    payments_view.original_invoices,\n    payments_view.invoiceNo,\n    payments_view.invoice_maker,\n    payments_view.booker,\n    payments_view.company,\n    payments_view.party,\n    payments_view.party_type,\n    payments_view.type,\n    payments_view.amount,\n    payments_view.paid,\n    payments_view.area,\n    payments_view.section,\n    payments_view.description\nFROM\n    (\n        SELECT\n            payments.id,\n            payments.created,\n            payments.updated,\n            payments.invoice,\n            invoices_return_reference.original_invoices,\n            invoice_view.invoiceNo,\n            invoice_view.invoice_maker,\n            invoice_view.booker,\n            order_bookers.company, -- is actually an array in TEXT to hold multiple company ids\n            payments.party AS party,\n            parties.type AS party_type,\n            payments.type AS type,\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            ) AS amount,\n            payments.paid,\n            parties.area,\n            areas.section,\n            payments.description\n        FROM\n            payments\n        LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n        LEFT JOIN parties ON payments.party = parties.id\n        LEFT JOIN areas ON parties.area = areas.id\n        LEFT JOIN sections ON areas.section = sections.id\n        LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n        LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n        WHERE\n            payments.description <> 'Sale Invoice Created'\n    ) AS payments_view\nLEFT JOIN (\n    SELECT\n        payments.invoice AS invoice_id,\n        SUM(\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            )\n        ) AS total_payment\n    FROM\n        payments\n    LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n    WHERE\n        payments.description <> 'Sale Invoice Created'\n    GROUP BY\n        payments.invoice\n) AS invoice_payments ON payments_view.invoice = invoice_payments.invoice_id\n"
  }

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

  // remove
  collection.schema.removeField("ym4cjmse")

  // remove
  collection.schema.removeField("0tm2d2ub")

  // remove
  collection.schema.removeField("tjfzosru")

  // remove
  collection.schema.removeField("wjwtq2kt")

  // remove
  collection.schema.removeField("wzwcs7eg")

  // remove
  collection.schema.removeField("nznecsgu")

  // remove
  collection.schema.removeField("z3ddme5w")

  // remove
  collection.schema.removeField("luttbten")

  // remove
  collection.schema.removeField("l5rq0eeh")

  // remove
  collection.schema.removeField("qbml6j7r")

  // remove
  collection.schema.removeField("esrnbxls")

  // remove
  collection.schema.removeField("sr59khhz")

  // remove
  collection.schema.removeField("hzivqltv")

  // remove
  collection.schema.removeField("mwnlcj7w")

  return dao.saveCollection(collection)
})
