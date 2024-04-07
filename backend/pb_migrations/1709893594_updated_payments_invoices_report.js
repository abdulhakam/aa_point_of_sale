/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH split_inv AS ( \n  SELECT \n  invoice,\n  company,\n  SUM(transactions_report.net_amount) amount,\n  SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n  \nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(\n  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  p.created,\n  p.updated,\n  payment_date AS dated,\n  p.invoice,\n  COALESCE(p.original_invoices,\"\") AS original_invoices,\n  p.invoiceNo,\n  p.invoice_maker,\n  p.booker,\n  split_inv.company,\n  p.party,\n  p.party_type,\n  (CASE \n    WHEN p.type = \"recieving\" THEN \"sale\"\n    WHEN p.type = \"sending\" THEN \"purchase\"\n    WHEN p.type = \"return\" THEN \"return\"\n  END) AS type,\n  p.amount * split_inv.ratio as amount,\n  p.paid,\n  p.area,\n  p.section,\n  p.description\nFROM payments_view p\n  LEFT JOIN split_inv ON p.invoice = split_inv.invoice\n  GROUP BY split_inv.company,p.invoice, p.paid, p.created\n  )"
  }

  // remove
  collection.schema.removeField("eaxe0vcg")

  // remove
  collection.schema.removeField("wpljjwja")

  // remove
  collection.schema.removeField("6ddzn7bu")

  // remove
  collection.schema.removeField("ttfklck0")

  // remove
  collection.schema.removeField("6eesrdr3")

  // remove
  collection.schema.removeField("wnj1dpq1")

  // remove
  collection.schema.removeField("wjgfmu2y")

  // remove
  collection.schema.removeField("3mnmuwdu")

  // remove
  collection.schema.removeField("dgh38ptl")

  // remove
  collection.schema.removeField("sngz8bam")

  // remove
  collection.schema.removeField("pbotjook")

  // remove
  collection.schema.removeField("x1odct9t")

  // remove
  collection.schema.removeField("pidmanvp")

  // remove
  collection.schema.removeField("osgpzywr")

  // remove
  collection.schema.removeField("ady6fzpx")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hohcwppi",
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
    "id": "kxfkf6ay",
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
    "id": "ge4wvzog",
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
    "id": "lj9hfq0m",
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
    "id": "d0oei9gs",
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
    "id": "xf1vae11",
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
    "id": "jatcgzyv",
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
    "id": "vz9uvve5",
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
    "id": "d2lgzxrl",
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
    "id": "elemmabd",
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
    "id": "szygahhh",
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
    "id": "f5olosq9",
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
    "id": "eurfchf0",
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
    "id": "xvyeycif",
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
    "id": "ebjrkqhi",
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
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(\n  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  p.created,\n  p.updated,\n  payment_date AS dated,\n  p.invoice,\n  COALESCE(p.original_invoices,\"\") AS original_invoices,\n  p.invoiceNo,\n  p.invoice_maker,\n  p.booker,\n  split_inv.company,\n  p.party AS party,\n  p.party_type,\n  (CASE \n  WHEN p.type = \"recieving\" THEN \"sale\"\n  WHEN p.type = \"sending\" THEN \"purchase\"\n  WHEN p.type = \"return\" THEN \"return\"\n  END) AS type,\n  p.amount * split_inv.ratio as amount,\n  p.paid,\n  p.area,\n  p.section,\n  p.description\nFROM payments_view p\n  LEFT JOIN split_inv ON p.invoice = split_inv.invoice\n  GROUP BY split_inv.company,p.invoice, p.paid, p.created\n-- UNION ALL\n-- SELECT\n--   id,\n--   created,\n--   updated,\n--   dated,\n--   invoice,\n--   original_invoices,\n--   invoiceNo,\n--   invoice_maker,\n--   booker,\n--   company,\n--   party AS party,\n--   party_type,\n--   type,\n--   amount,\n--   paid,\n--   area,\n--   section,\n--   description\n-- FROM split_inv\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "eaxe0vcg",
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
    "id": "wpljjwja",
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
    "id": "6ddzn7bu",
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
    "id": "ttfklck0",
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
    "id": "6eesrdr3",
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
    "id": "wnj1dpq1",
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
    "id": "wjgfmu2y",
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
    "id": "3mnmuwdu",
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
    "id": "dgh38ptl",
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
    "id": "sngz8bam",
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
    "id": "pbotjook",
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
    "id": "x1odct9t",
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
    "id": "pidmanvp",
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
    "id": "osgpzywr",
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
    "id": "ady6fzpx",
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
  collection.schema.removeField("hohcwppi")

  // remove
  collection.schema.removeField("kxfkf6ay")

  // remove
  collection.schema.removeField("ge4wvzog")

  // remove
  collection.schema.removeField("lj9hfq0m")

  // remove
  collection.schema.removeField("d0oei9gs")

  // remove
  collection.schema.removeField("xf1vae11")

  // remove
  collection.schema.removeField("jatcgzyv")

  // remove
  collection.schema.removeField("vz9uvve5")

  // remove
  collection.schema.removeField("d2lgzxrl")

  // remove
  collection.schema.removeField("elemmabd")

  // remove
  collection.schema.removeField("szygahhh")

  // remove
  collection.schema.removeField("f5olosq9")

  // remove
  collection.schema.removeField("eurfchf0")

  // remove
  collection.schema.removeField("xvyeycif")

  // remove
  collection.schema.removeField("ebjrkqhi")

  return dao.saveCollection(collection)
})
