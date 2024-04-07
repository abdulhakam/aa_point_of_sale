/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "SELECT\n    `id`,\n    `created`,\n    `updated`,\n    `invoice`,\n    `original_invoices`,\n    `invoiceNo`,\n    `invoice_maker`,\n    `booker`,\n    `company`,\n    `party`,\n    `party_type`,\n    `type`,\n    `amount`,\n    `paid`,\n    `area`,\n    `section`,\n    `description`\nFROM\n    (\n        SELECT\n            payments.id,\n            payments.created,\n            payments.updated,\n            payments.invoice,\n            invoices_return_reference.original_invoices,\n            invoice_view.invoiceNo,\n            invoice_view.invoice_maker,\n            invoice_view.booker,\n            order_bookers.company, -- is actually an array in TEXT to hold multiple company ids\n            payments.party AS party,\n            parties.type AS party_type,\n            payments.type AS type,\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            ) AS amount,\n            payments.paid,\n            parties.area,\n            areas.section,\n            payments.description\n        FROM\n            payments\n        LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n        LEFT JOIN parties ON payments.party = parties.id\n        LEFT JOIN areas ON parties.area = areas.id\n        LEFT JOIN sections ON areas.section = sections.id\n        LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n        LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n        WHERE\n            payments.description <> 'Sale Invoice Created'\n    ) AS payments_view\n"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "aalmkybl",
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
    "id": "v53mxzvb",
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
    "id": "quzsfkgo",
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
    "id": "y5ph1xsi",
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
    "id": "oyj5out5",
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
    "id": "xbuwmnm6",
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
    "id": "nbf2ww9x",
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
    "id": "lostvidh",
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
    "id": "ssd47aiy",
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
    "id": "6frx7tm3",
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
    "id": "jljypyw4",
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
    "id": "ehgn4djj",
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
    "id": "fgir4if7",
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
    "id": "h0pxecfa",
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
    "query": "SELECT\n    `id`,\n    `created`,\n    `updated`,\n    `invoice`,\n    `original_invoices`,\n    `invoiceNo`,\n    `invoice_maker`,\n    `booker`,\n    `company`,\n    `party`,\n    `party_type`,\n    `type`,\n    `amount`,\n    `paid`,\n    `area`,\n    `section`,\n    `description`\nFROM\n    (\n        SELECT\n            payments.id,\n            payments.created,\n            payments.updated,\n            payments.invoice,\n            invoices_return_reference.original_invoices,\n            invoice_view.invoiceNo,\n            invoice_view.invoice_maker,\n            invoice_view.booker,\n            order_bookers.company, -- is actually an array in TEXT to hold multiple company ids\n            payments.party AS party,\n            parties.type AS party_type,\n            payments.type AS type,\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            ) AS amount,\n            payments.paid,\n            parties.area,\n            areas.section,\n            payments.description\n        FROM\n            payments\n        LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n        LEFT JOIN parties ON payments.party = parties.id\n        LEFT JOIN areas ON parties.area = areas.id\n        LEFT JOIN sections ON areas.section = sections.id\n        LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n        LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n        WHERE\n            payments.description <> 'Sale Invoice Created'\n    ) AS payments_view\nLEFT JOIN (\n    SELECT\n        payments.invoice AS invoice_id,\n        SUM(\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            )\n        ) AS total_payment\n    FROM\n        payments\n    LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n    WHERE\n        payments.description <> 'Sale Invoice Created'\n    GROUP BY\n        payments.invoice\n) AS invoice_payments ON payments_view.invoice = invoice_payments.invoice_id\n"
  }

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

  // remove
  collection.schema.removeField("aalmkybl")

  // remove
  collection.schema.removeField("v53mxzvb")

  // remove
  collection.schema.removeField("quzsfkgo")

  // remove
  collection.schema.removeField("y5ph1xsi")

  // remove
  collection.schema.removeField("oyj5out5")

  // remove
  collection.schema.removeField("xbuwmnm6")

  // remove
  collection.schema.removeField("nbf2ww9x")

  // remove
  collection.schema.removeField("lostvidh")

  // remove
  collection.schema.removeField("ssd47aiy")

  // remove
  collection.schema.removeField("6frx7tm3")

  // remove
  collection.schema.removeField("jljypyw4")

  // remove
  collection.schema.removeField("ehgn4djj")

  // remove
  collection.schema.removeField("fgir4if7")

  // remove
  collection.schema.removeField("h0pxecfa")

  return dao.saveCollection(collection)
})
