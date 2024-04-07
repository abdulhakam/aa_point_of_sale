/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH all_transactions AS (\n  SELECT\n        (ROW_NUMBER() OVER()) AS id,\n        transactions_report.created,\n        transactions_report.updated,\n        transactions_report.invoice,\n        invoices_return_reference.original_invoices,\n        transactions_report.invoiceNo,\n        invoices.invoice_maker,\n        invoices.booker,\n        transactions_report.company,\n        transactions_report.party,\n        transactions_report.party_type,\n        transactions_report.type,\n        transactions_report.net_amount amount,\n        FALSE AS paid,\n        parties.area,\n        areas.section,\n        \"-\" AS description\n    FROM\n        transactions_report\n    LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n    LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n    LEFT JOIN parties ON transactions_report.party = parties.id\n    LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n  SELECT\n        (ROW_NUMBER() OVER()) as id,\n        invoice_view.created,\n        invoice_view.updated,\n        invoice,\n        original_invoices,\n        invoice_view.invoiceNo,\n        invoice_view.invoice_maker,\n        invoice_view.booker,\n        company,\n        invoice_view.party,\n        party_type,\n        invoice_view.type,\n        amount,\n        amount/invoice_view.final_total AS ratio,\n        paid,\n        area,\n        section,\n        invoice_view.description\n    FROM\n        all_transactions\n  LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n  GROUP BY company, invoice\n)\n\n\nSELECT\n        id,\n        created,\n        updated,\n        invoice,\n        original_invoices,\n        invoiceNo,\n        invoice_maker,\n        booker,\n        company,\n        party,\n        party_type,\n        type,\n        ratio,\n        amount,\n        paid,\n        area,\n        section,\n        description\n    FROM\n        company_invoice"
  }

  // remove
  collection.schema.removeField("qhuw4koq")

  // remove
  collection.schema.removeField("gdngw6il")

  // remove
  collection.schema.removeField("tdmgfd2f")

  // remove
  collection.schema.removeField("23icmn7s")

  // remove
  collection.schema.removeField("85rt0hyy")

  // remove
  collection.schema.removeField("ppyljovo")

  // remove
  collection.schema.removeField("pqrmaq9y")

  // remove
  collection.schema.removeField("8fd8isew")

  // remove
  collection.schema.removeField("z2x0zo7z")

  // remove
  collection.schema.removeField("ow72fpcq")

  // remove
  collection.schema.removeField("d1xpds0o")

  // remove
  collection.schema.removeField("ukxh1tm9")

  // remove
  collection.schema.removeField("tnqbmt2d")

  // remove
  collection.schema.removeField("6b8ogxkc")

  // remove
  collection.schema.removeField("zioye5k1")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rs0iph2v",
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
    "id": "xfiyxfip",
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
    "id": "vquhqhrx",
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
    "id": "y7h2ynlo",
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
    "id": "nm8hrajp",
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
    "id": "zetlbgau",
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
    "id": "pvyh2omt",
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
    "id": "ja4vvk6x",
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
    "id": "oflvztwo",
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
    "id": "lnvelimd",
    "name": "ratio",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yv5t8ati",
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
    "id": "igik7zxr",
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
    "id": "snmtr9uj",
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
    "id": "94r1scv9",
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
    "id": "onwbejbx",
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
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH all_transactions AS (\n  SELECT\n        (ROW_NUMBER() OVER()) AS id,\n        transactions_report.created,\n        transactions_report.updated,\n        transactions_report.invoice,\n        invoices_return_reference.original_invoices,\n        transactions_report.invoiceNo,\n        invoices.invoice_maker,\n        invoices.booker,\n        transactions_report.company,\n        transactions_report.party,\n        transactions_report.party_type,\n        transactions_report.type,\n        transactions_report.net_amount amount,\n        FALSE AS paid,\n        parties.area,\n        areas.section,\n        \"-\" AS description\n    FROM\n        transactions_report\n    LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n    LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n    LEFT JOIN parties ON transactions_report.party = parties.id\n    LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n  SELECT\n        (ROW_NUMBER() OVER()) as id,\n        invoice_view.created,\n        invoice_view.updated,\n        invoice,\n        original_invoices,\n        invoice_view.invoiceNo,\n        invoice_view.invoice_maker,\n        invoice_view.booker,\n        company,\n        invoice_view.party,\n        party_type,\n        invoice_view.type,\n        amount,\n        amount/invoice_view.final_total AS ratio,\n        paid,\n        area,\n        section,\n        invoice_view.description\n    FROM\n        all_transactions\n  LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n  GROUP BY company, invoice\n)\n\n\nSELECT \n  id,\n        `created`,\n        `updated`,\n        `invoice`,\n        `original_invoices`,\n        `invoiceNo`,\n        `invoice_maker`,\n        `booker`,\n        `company`,\n        `party`,\n        `party_type`,\n        `type`,\n        `amount`,\n        `ratio`,\n        `paid`,\n        `area`,\n        `section`,\n        `description`\n  FROM\n  (SELECT\n        id,\n        created,\n        updated,\n        invoice,\n        original_invoices,\n        invoiceNo,\n        invoice_maker,\n        booker,\n        company,\n        party,\n        party_type,\n        type,\n        ratio,\n        amount,\n        paid,\n        area,\n        section,\n        description\n    FROM\n        company_invoice\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qhuw4koq",
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
    "id": "gdngw6il",
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
    "id": "tdmgfd2f",
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
    "id": "23icmn7s",
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
    "id": "85rt0hyy",
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
    "id": "ppyljovo",
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
    "id": "pqrmaq9y",
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
    "id": "8fd8isew",
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
    "id": "z2x0zo7z",
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
    "id": "ow72fpcq",
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
    "id": "d1xpds0o",
    "name": "ratio",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ukxh1tm9",
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
    "id": "tnqbmt2d",
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
    "id": "6b8ogxkc",
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
    "id": "zioye5k1",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("rs0iph2v")

  // remove
  collection.schema.removeField("xfiyxfip")

  // remove
  collection.schema.removeField("vquhqhrx")

  // remove
  collection.schema.removeField("y7h2ynlo")

  // remove
  collection.schema.removeField("nm8hrajp")

  // remove
  collection.schema.removeField("zetlbgau")

  // remove
  collection.schema.removeField("pvyh2omt")

  // remove
  collection.schema.removeField("ja4vvk6x")

  // remove
  collection.schema.removeField("oflvztwo")

  // remove
  collection.schema.removeField("lnvelimd")

  // remove
  collection.schema.removeField("yv5t8ati")

  // remove
  collection.schema.removeField("igik7zxr")

  // remove
  collection.schema.removeField("snmtr9uj")

  // remove
  collection.schema.removeField("94r1scv9")

  // remove
  collection.schema.removeField("onwbejbx")

  return dao.saveCollection(collection)
})
