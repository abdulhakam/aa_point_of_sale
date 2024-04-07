/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  COALESCE(original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(\n  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  p.created,\n  p.updated,\n  payment_date AS dated,\n  p.invoice,\n  p.original_invoices,\n  p.invoiceNo,\n  p.invoice_maker,\n  p.booker,\n  split_inv.company,\n  p.party AS party,\n  p.party_type,\n  (CASE \n  WHEN p.type = \"recieving\" THEN \"sale\"\n  WHEN p.type = \"sending\" THEN \"purchase\"\n  WHEN p.type = \"return\" THEN \"return\"\n  END) AS type,\n  p.amount * split_inv.ratio as amount,\n  p.paid,\n  p.area,\n  p.section,\n  p.description\nFROM payments_view p\n  LEFT JOIN split_inv ON p.invoice = split_inv.invoice\n  GROUP BY split_inv.company,p.invoice\n-- UNION ALL\n-- SELECT\n--   id,\n--   created,\n--   updated,\n--   dated,\n--   invoice,\n--   original_invoices,\n--   invoiceNo,\n--   invoice_maker,\n--   booker,\n--   company,\n--   party AS party,\n--   party_type,\n--   type,\n--   amount,\n--   paid,\n--   area,\n--   section,\n--   description\n-- FROM split_inv\n  )"
  }

  // remove
  collection.schema.removeField("in4tvv6b")

  // remove
  collection.schema.removeField("iqi96x5k")

  // remove
  collection.schema.removeField("j2bgsc7p")

  // remove
  collection.schema.removeField("e1vyzjuf")

  // remove
  collection.schema.removeField("awzzlb1f")

  // remove
  collection.schema.removeField("wtp4juje")

  // remove
  collection.schema.removeField("31zwws9k")

  // remove
  collection.schema.removeField("bq8rar5p")

  // remove
  collection.schema.removeField("uspxbxqc")

  // remove
  collection.schema.removeField("3drfucfm")

  // remove
  collection.schema.removeField("qbbwawas")

  // remove
  collection.schema.removeField("zjlgnqel")

  // remove
  collection.schema.removeField("hqdnm8w8")

  // remove
  collection.schema.removeField("kgiqjr4t")

  // remove
  collection.schema.removeField("aytooqex")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0n1eszop",
    "name": "dated",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zwxdval3",
    "name": "invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "h8e96ibx",
    "name": "original_invoices",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6lsxkar5",
    "name": "invoiceNo",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rmkr3pvz",
    "name": "invoice_maker",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "psbsojaf",
    "name": "booker",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "m8xe5rev",
    "name": "company",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "j0zahmkl",
    "name": "party",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dwrwdsei",
    "name": "party_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "s1r9seyk",
    "name": "type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2ldtukax",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rw6x1xgc",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "k75ioldy",
    "name": "area",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zzua4lrk",
    "name": "section",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ulfknkca",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  transactions_report.net_amount/invoice_view.unrounded_total as ratio,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  COALESCE(original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(\n  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  p.created,\n  p.updated,\n  payment_date AS dated,\n  p.invoice,\n  p.original_invoices,\n  p.invoiceNo,\n  p.invoice_maker,\n  p.booker,\n  split_inv.company,\n  p.party AS party,\n  p.party_type,\n  (CASE \n  WHEN p.type = \"recieving\" THEN \"sale\"\n  WHEN p.type = \"sending\" THEN \"purchase\"\n  WHEN p.type = \"return\" THEN \"return\"\n  END) AS type,\n  p.amount * split_inv.ratio as amount,\n  p.paid,\n  p.area,\n  p.section,\n  p.description\nFROM payments_view p\n  LEFT JOIN split_inv ON p.invoice = split_inv.invoice\n  GROUP BY split_inv.company,p.invoice\n-- UNION ALL\n-- SELECT\n--   id,\n--   created,\n--   updated,\n--   dated,\n--   invoice,\n--   original_invoices,\n--   invoiceNo,\n--   invoice_maker,\n--   booker,\n--   company,\n--   party AS party,\n--   party_type,\n--   type,\n--   amount,\n--   paid,\n--   area,\n--   section,\n--   description\n-- FROM split_inv\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "in4tvv6b",
    "name": "dated",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "iqi96x5k",
    "name": "invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "j2bgsc7p",
    "name": "original_invoices",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "e1vyzjuf",
    "name": "invoiceNo",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "awzzlb1f",
    "name": "invoice_maker",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wtp4juje",
    "name": "booker",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "31zwws9k",
    "name": "company",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bq8rar5p",
    "name": "party",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uspxbxqc",
    "name": "party_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "3drfucfm",
    "name": "type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qbbwawas",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zjlgnqel",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hqdnm8w8",
    "name": "area",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kgiqjr4t",
    "name": "section",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "aytooqex",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // remove
  collection.schema.removeField("0n1eszop")

  // remove
  collection.schema.removeField("zwxdval3")

  // remove
  collection.schema.removeField("h8e96ibx")

  // remove
  collection.schema.removeField("6lsxkar5")

  // remove
  collection.schema.removeField("rmkr3pvz")

  // remove
  collection.schema.removeField("psbsojaf")

  // remove
  collection.schema.removeField("m8xe5rev")

  // remove
  collection.schema.removeField("j0zahmkl")

  // remove
  collection.schema.removeField("dwrwdsei")

  // remove
  collection.schema.removeField("s1r9seyk")

  // remove
  collection.schema.removeField("2ldtukax")

  // remove
  collection.schema.removeField("rw6x1xgc")

  // remove
  collection.schema.removeField("k75ioldy")

  // remove
  collection.schema.removeField("zzua4lrk")

  // remove
  collection.schema.removeField("ulfknkca")

  return dao.saveCollection(collection)
})
