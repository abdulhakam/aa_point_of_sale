/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  transactions_report.net_amount/invoice_view.unrounded_total as ratio,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  COALESCE(original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(\n--   SELECT\n--   id,\n--   created,\n--   updated,\n--   payment_date AS dated,\n--   invoice,\n--   original_invoices,\n--   invoiceNo,\n--   invoice_maker,\n--   booker,\n--   company,\n--   party AS party,\n--   party_type,\n--   type,\n--   amount,\n--   paid,\n--   area,\n--   section,\n--   description\n-- FROM payments_view\n-- UNION ALL\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM split_inv)"
  }

  // remove
  collection.schema.removeField("xm2ng0r3")

  // remove
  collection.schema.removeField("qtzaiywk")

  // remove
  collection.schema.removeField("rlamanxm")

  // remove
  collection.schema.removeField("mjuy3trs")

  // remove
  collection.schema.removeField("zu1gjyae")

  // remove
  collection.schema.removeField("lfac6ba9")

  // remove
  collection.schema.removeField("0ejsavbg")

  // remove
  collection.schema.removeField("r28arukg")

  // remove
  collection.schema.removeField("fanam0lc")

  // remove
  collection.schema.removeField("gzez9r18")

  // remove
  collection.schema.removeField("u1qr4bpp")

  // remove
  collection.schema.removeField("dwqdxy9d")

  // remove
  collection.schema.removeField("xw4rz4ev")

  // remove
  collection.schema.removeField("ysf2orfn")

  // remove
  collection.schema.removeField("wyvbwbok")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "irlzgt37",
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
    "id": "gn8vnj3y",
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
    "id": "jobbqrmh",
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
    "id": "rgni9tdr",
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
    "id": "5x8eepv8",
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
    "id": "gtslduij",
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
    "id": "g6f53lbk",
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
    "id": "sumxxcp1",
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
    "id": "egreo1l8",
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
    "id": "7axzdsdn",
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
    "id": "3tv34pfq",
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
    "id": "hypc2zlt",
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
    "id": "7zqt0wzj",
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
    "id": "dfox68o7",
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
    "id": "s1erchwm",
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
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  COALESCE(original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(\n--   SELECT\n--   id,\n--   created,\n--   updated,\n--   payment_date AS dated,\n--   invoice,\n--   original_invoices,\n--   invoiceNo,\n--   invoice_maker,\n--   booker,\n--   company,\n--   party AS party,\n--   party_type,\n--   type,\n--   amount,\n--   paid,\n--   area,\n--   section,\n--   description\n-- FROM payments_view\n-- UNION ALL\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM split_inv)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xm2ng0r3",
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
    "id": "qtzaiywk",
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
    "id": "rlamanxm",
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
    "id": "mjuy3trs",
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
    "id": "zu1gjyae",
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
    "id": "lfac6ba9",
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
    "id": "0ejsavbg",
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
    "id": "r28arukg",
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
    "id": "fanam0lc",
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
    "id": "gzez9r18",
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
    "id": "u1qr4bpp",
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
    "id": "dwqdxy9d",
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
    "id": "xw4rz4ev",
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
    "id": "ysf2orfn",
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
    "id": "wyvbwbok",
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
  collection.schema.removeField("irlzgt37")

  // remove
  collection.schema.removeField("gn8vnj3y")

  // remove
  collection.schema.removeField("jobbqrmh")

  // remove
  collection.schema.removeField("rgni9tdr")

  // remove
  collection.schema.removeField("5x8eepv8")

  // remove
  collection.schema.removeField("gtslduij")

  // remove
  collection.schema.removeField("g6f53lbk")

  // remove
  collection.schema.removeField("sumxxcp1")

  // remove
  collection.schema.removeField("egreo1l8")

  // remove
  collection.schema.removeField("7axzdsdn")

  // remove
  collection.schema.removeField("3tv34pfq")

  // remove
  collection.schema.removeField("hypc2zlt")

  // remove
  collection.schema.removeField("7zqt0wzj")

  // remove
  collection.schema.removeField("dfox68o7")

  // remove
  collection.schema.removeField("s1erchwm")

  return dao.saveCollection(collection)
})
