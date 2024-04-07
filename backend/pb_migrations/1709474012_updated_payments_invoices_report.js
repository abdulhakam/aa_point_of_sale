/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH all_transactions AS (\n  SELECT\n        (ROW_NUMBER() OVER()) AS id,\n        transactions_report.created,\n        transactions_report.updated,\n        transactions_report.invoice,\n        invoices_return_reference.original_invoices,\n        transactions_report.invoiceNo,\n        invoices.invoice_maker,\n        invoices.booker,\n        transactions_report.company,\n        transactions_report.party,\n        transactions_report.party_type,\n        transactions_report.type,\n        transactions_report.net_amount amount,\n        FALSE AS paid,\n        parties.area,\n        areas.section,\n        \"-\" AS description\n    FROM\n        transactions_report\n    LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n    LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n    LEFT JOIN parties ON transactions_report.party = parties.id\n    LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n  SELECT\n        (ROW_NUMBER() OVER()) as id,\n        invoice_view.created,\n        invoice_view.updated,\n        invoice,\n        original_invoices,\n        invoice_view.invoiceNo,\n        invoice_view.invoice_maker,\n        invoice_view.booker,\n        company,\n        invoice_view.party,\n        party_type,\n        invoice_view.type,\n        amount,\n        amount/invoice_view.final_total AS ratio,\n        paid,\n        area,\n        section,\n        invoice_view.description\n    FROM\n        all_transactions\n  LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n  GROUP BY company, invoice\n)\n\n\nSELECT \n  id,\n        `created`,\n        `updated`,\n        `invoice`,\n        `original_invoices`,\n        `invoiceNo`,\n        `invoice_maker`,\n        `booker`,\n        `company`,\n        `party`,\n        `party_type`,\n        `type`,\n        `amount`,\n        `paid`,\n        `area`,\n        `section`,\n        `description`\n  FROM\n  (SELECT\n        id,\n        created,\n        updated,\n        invoice,\n        original_invoices,\n        invoiceNo,\n        invoice_maker,\n        booker,\n        company,\n        party,\n        party_type,\n        type,\n        ratio,\n        amount,\n        paid,\n        area,\n        section,\n        description\n    FROM\n        company_invoice\n  )"
  }

  // remove
  collection.schema.removeField("9jcasvft")

  // remove
  collection.schema.removeField("asrz65ua")

  // remove
  collection.schema.removeField("galcc2b9")

  // remove
  collection.schema.removeField("sbu5uykm")

  // remove
  collection.schema.removeField("sfr2dfez")

  // remove
  collection.schema.removeField("k0ylo3rg")

  // remove
  collection.schema.removeField("wags8fsj")

  // remove
  collection.schema.removeField("mgmgs1sh")

  // remove
  collection.schema.removeField("0gnjypq8")

  // remove
  collection.schema.removeField("y9icm3ei")

  // remove
  collection.schema.removeField("mwtzrjg1")

  // remove
  collection.schema.removeField("la4vau78")

  // remove
  collection.schema.removeField("5857ueob")

  // remove
  collection.schema.removeField("wu7sjxzj")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wpokhiva",
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
    "id": "wc3bwftq",
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
    "id": "p4eoji3j",
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
    "id": "j2g3v6fk",
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
    "id": "kfcntdym",
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
    "id": "pmcwdwyq",
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
    "id": "ddx6gdhn",
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
    "id": "qbp8cxlm",
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
    "id": "ed5wybcj",
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
    "id": "phvhoavj",
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
    "id": "eencrac8",
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
    "id": "omzp1fxm",
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
    "id": "e0wzgelo",
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
    "id": "k3nhlcar",
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
    "query": "WITH all_transactions AS (\n  SELECT\n        (ROW_NUMBER() OVER()) AS id,\n        transactions_report.created,\n        transactions_report.updated,\n        transactions_report.invoice,\n        invoices_return_reference.original_invoices,\n        transactions_report.invoiceNo,\n        invoices.invoice_maker,\n        invoices.booker,\n        transactions_report.company,\n        transactions_report.party,\n        transactions_report.party_type,\n        transactions_report.type,\n        transactions_report.net_amount amount,\n        FALSE AS paid,\n        parties.area,\n        areas.section,\n        \"-\" AS description\n    FROM\n        transactions_report\n    LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n    LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n    LEFT JOIN parties ON transactions_report.party = parties.id\n    LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n  SELECT\n        id,\n        created,\n        updated,\n        invoice,\n        original_invoices,\n        invoiceNo,\n        invoice_maker,\n        booker,\n        company,\n        party,\n        party_type,\n        type,\n        amount,\n        paid,\n        area,\n        section,\n        description\n    FROM\n        payments_by_company\n)\n\nSELECT \n  id,\n        `created`,\n        `updated`,\n        `invoice`,\n        `original_invoices`,\n        `invoiceNo`,\n        `invoice_maker`,\n        `booker`,\n        `company`,\n        `party`,\n        `party_type`,\n        `type`,\n        `amount`,\n        `paid`,\n        `area`,\n        `section`,\n        `description`\n  FROM\n  (SELECT\n        id,\n        created,\n        updated,\n        invoice,\n        original_invoices,\n        invoiceNo,\n        invoice_maker,\n        booker,\n        company,\n        party,\n        party_type,\n        type,\n        amount,\n        paid,\n        area,\n        section,\n        description\n    FROM\n        company_invoice\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9jcasvft",
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
    "id": "asrz65ua",
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
    "id": "galcc2b9",
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
    "id": "sbu5uykm",
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
    "id": "sfr2dfez",
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
    "id": "k0ylo3rg",
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
    "id": "wags8fsj",
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
    "id": "mgmgs1sh",
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
    "id": "0gnjypq8",
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
    "id": "y9icm3ei",
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
    "id": "mwtzrjg1",
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
    "id": "la4vau78",
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
    "id": "5857ueob",
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
    "id": "wu7sjxzj",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("wpokhiva")

  // remove
  collection.schema.removeField("wc3bwftq")

  // remove
  collection.schema.removeField("p4eoji3j")

  // remove
  collection.schema.removeField("j2g3v6fk")

  // remove
  collection.schema.removeField("kfcntdym")

  // remove
  collection.schema.removeField("pmcwdwyq")

  // remove
  collection.schema.removeField("ddx6gdhn")

  // remove
  collection.schema.removeField("qbp8cxlm")

  // remove
  collection.schema.removeField("ed5wybcj")

  // remove
  collection.schema.removeField("phvhoavj")

  // remove
  collection.schema.removeField("eencrac8")

  // remove
  collection.schema.removeField("omzp1fxm")

  // remove
  collection.schema.removeField("e0wzgelo")

  // remove
  collection.schema.removeField("k3nhlcar")

  return dao.saveCollection(collection)
})
