/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  transactions_report.net_amount/invoice_view.unrounded_total as ratio,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  COALESCE(original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(\n  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  p.created,\n  p.updated,\n  payment_date AS dated,\n  p.invoice,\n  p.original_invoices,\n  p.invoiceNo,\n  p.invoice_maker,\n  p.booker,\n  split_inv.company,\n  p.party AS party,\n  p.party_type,\n  (CASE \n  WHEN p.type = \"recieving\" THEN \"sale\"\n  WHEN p.type = \"sending\" THEN \"purchase\"\n  WHEN p.type = \"return\" THEN \"return\"\n  END) AS type,\n  p.amount * split_inv.ratio as amount,\n  p.paid,\n  p.area,\n  p.section,\n  p.description\nFROM payments_view p\n  LEFT JOIN split_inv ON p.invoice = split_inv.invoice\n-- UNION ALL\n-- SELECT\n--   id,\n--   created,\n--   updated,\n--   dated,\n--   invoice,\n--   original_invoices,\n--   invoiceNo,\n--   invoice_maker,\n--   booker,\n--   company,\n--   party AS party,\n--   party_type,\n--   type,\n--   amount,\n--   paid,\n--   area,\n--   section,\n--   description\n-- FROM split_inv\n  )"
  }

  // remove
  collection.schema.removeField("3kp8mfbi")

  // remove
  collection.schema.removeField("0yepwahy")

  // remove
  collection.schema.removeField("1b2vgsyz")

  // remove
  collection.schema.removeField("4bf1zg7u")

  // remove
  collection.schema.removeField("liahk8tw")

  // remove
  collection.schema.removeField("1g6pakne")

  // remove
  collection.schema.removeField("mktmzow7")

  // remove
  collection.schema.removeField("2na2ew8e")

  // remove
  collection.schema.removeField("ktljsmpb")

  // remove
  collection.schema.removeField("by2s0eoj")

  // remove
  collection.schema.removeField("hwfkatpj")

  // remove
  collection.schema.removeField("58pfpu5p")

  // remove
  collection.schema.removeField("t0obm14s")

  // remove
  collection.schema.removeField("diltr7rp")

  // remove
  collection.schema.removeField("jiddybyw")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bua0hath",
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
    "id": "69rz3fdj",
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
    "id": "zsgt938r",
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
    "id": "kkj0cbor",
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
    "id": "3bjnppev",
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
    "id": "oq1umqin",
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
    "id": "9g51r9sj",
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
    "id": "8s29oayr",
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
    "id": "osqqnkcp",
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
    "id": "abbuq7ul",
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
    "id": "fxjpyedv",
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
    "id": "sqrwmj94",
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
    "id": "jdswev4j",
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
    "id": "r5ehk4ps",
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
    "id": "scb86s8u",
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
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  transactions_report.net_amount/invoice_view.unrounded_total as ratio,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  COALESCE(original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(\n  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  p.created,\n  p.updated,\n  payment_date AS dated,\n  p.invoice,\n  p.original_invoices,\n  p.invoiceNo,\n  p.invoice_maker,\n  p.booker,\n  split_inv.company,\n  p.party AS party,\n  p.party_type,\n  (CASE \n  WHEN p.type = \"recieving\" THEN \"sale\"\n  WHEN p.type = \"sending\" THEN \"purchase\"\n  WHEN p.type = \"return\" THEN \"return\"\n  END) AS type,\n  p.amount * split_inv.ratio as amount,\n  p.paid,\n  p.area,\n  p.section,\n  p.description\nFROM payments_view p\n  JOIN split_inv ON p.invoice = split_inv.invoice\n-- UNION ALL\n-- SELECT\n--   id,\n--   created,\n--   updated,\n--   dated,\n--   invoice,\n--   original_invoices,\n--   invoiceNo,\n--   invoice_maker,\n--   booker,\n--   company,\n--   party AS party,\n--   party_type,\n--   type,\n--   amount,\n--   paid,\n--   area,\n--   section,\n--   description\n-- FROM split_inv\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "3kp8mfbi",
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
    "id": "0yepwahy",
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
    "id": "1b2vgsyz",
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
    "id": "4bf1zg7u",
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
    "id": "liahk8tw",
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
    "id": "1g6pakne",
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
    "id": "mktmzow7",
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
    "id": "2na2ew8e",
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
    "id": "ktljsmpb",
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
    "id": "by2s0eoj",
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
    "id": "hwfkatpj",
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
    "id": "58pfpu5p",
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
    "id": "t0obm14s",
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
    "id": "diltr7rp",
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
    "id": "jiddybyw",
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
  collection.schema.removeField("bua0hath")

  // remove
  collection.schema.removeField("69rz3fdj")

  // remove
  collection.schema.removeField("zsgt938r")

  // remove
  collection.schema.removeField("kkj0cbor")

  // remove
  collection.schema.removeField("3bjnppev")

  // remove
  collection.schema.removeField("oq1umqin")

  // remove
  collection.schema.removeField("9g51r9sj")

  // remove
  collection.schema.removeField("8s29oayr")

  // remove
  collection.schema.removeField("osqqnkcp")

  // remove
  collection.schema.removeField("abbuq7ul")

  // remove
  collection.schema.removeField("fxjpyedv")

  // remove
  collection.schema.removeField("sqrwmj94")

  // remove
  collection.schema.removeField("jdswev4j")

  // remove
  collection.schema.removeField("r5ehk4ps")

  // remove
  collection.schema.removeField("scb86s8u")

  return dao.saveCollection(collection)
})
