/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "SELECT\n    (ROW_NUMBER() OVER()) as id,\n    `payment_id`,\n    `created`,\n    `updated`,\n    `invoice`,\n    `original_invoices`,\n    `invoiceNo`,\n    `invoice_maker`,\n    `booker`,\n    `company`,\n    `party`,\n    `party_type`,\n    `type`,\n    `amount`,\n    `paid`,\n    `area`,\n    `section`,\n    `description`\nFROM\n    (\n        SELECT\n            payments.id AS payment_id,\n            payments.created,\n            payments.updated,\n            payments.invoice,\n            invoices_return_reference.original_invoices,\n            invoice_view.invoiceNo,\n            invoice_view.invoice_maker,\n            invoice_view.booker,\n            order_bookers.company, -- is actually an array in TEXT to hold multiple company ids\n            payments.party AS party,\n            parties.type AS party_type,\n            payments.type AS type,\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            ) AS amount,\n            payments.paid,\n            parties.area,\n            areas.section,\n            payments.description\n        FROM\n            payments\n        LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n        LEFT JOIN parties ON payments.party = parties.id\n        LEFT JOIN areas ON parties.area = areas.id\n        LEFT JOIN sections ON areas.section = sections.id\n        LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n        LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n        WHERE\n            payments.description <> 'Sale Invoice Created'\n    ) AS payments_view\n"
  }

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("f469c5jeke25hfw")

  collection.options = {
    "query": "SELECT\n    `id`,\n    `created`,\n    `updated`,\n    `invoice`,\n    `original_invoices`,\n    `invoiceNo`,\n    `invoice_maker`,\n    `booker`,\n    `company`,\n    `party`,\n    `party_type`,\n    `type`,\n    `amount`,\n    `paid`,\n    `area`,\n    `section`,\n    `description`\nFROM\n    (\n        SELECT\n            payments.id,\n            payments.created,\n            payments.updated,\n            payments.invoice,\n            invoices_return_reference.original_invoices,\n            invoice_view.invoiceNo,\n            invoice_view.invoice_maker,\n            invoice_view.booker,\n            order_bookers.company, -- is actually an array in TEXT to hold multiple company ids\n            payments.party AS party,\n            parties.type AS party_type,\n            payments.type AS type,\n            COALESCE(\n                (\n                    CASE\n                        WHEN payments.amount <> 0 THEN payments.amount\n                        ELSE invoice_view.final_total\n                    END\n                ),\n                0\n            ) AS amount,\n            payments.paid,\n            parties.area,\n            areas.section,\n            payments.description\n        FROM\n            payments\n        LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n        LEFT JOIN parties ON payments.party = parties.id\n        LEFT JOIN areas ON parties.area = areas.id\n        LEFT JOIN sections ON areas.section = sections.id\n        LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n        LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n        WHERE\n            payments.description <> 'Sale Invoice Created'\n    ) AS payments_view\n"
  }

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

  return dao.saveCollection(collection)
})
