/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated as payment_date,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  payment_date,\n  invoice,\n  COALESCE(original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(SELECT\n  id,\n  created,\n  updated,\n  payment_date,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM payments_view\nUNION ALL\nSELECT\n  id,\n  created,\n  updated,\n  payment_date,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM split_inv)"
  }

  // remove
  collection.schema.removeField("maa4ry9a")

  // remove
  collection.schema.removeField("bzd1nzip")

  // remove
  collection.schema.removeField("bbtznjtx")

  // remove
  collection.schema.removeField("y2gqf5q5")

  // remove
  collection.schema.removeField("dmjio5te")

  // remove
  collection.schema.removeField("b90dnplh")

  // remove
  collection.schema.removeField("b9nc9ozt")

  // remove
  collection.schema.removeField("nyjvm4wu")

  // remove
  collection.schema.removeField("fhiewhul")

  // remove
  collection.schema.removeField("ipzteej2")

  // remove
  collection.schema.removeField("hlth7ynn")

  // remove
  collection.schema.removeField("hf12r1lm")

  // remove
  collection.schema.removeField("fmnq72zf")

  // remove
  collection.schema.removeField("wxp5u2ot")

  // remove
  collection.schema.removeField("q29hlsto")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hbcrdjhc",
    "name": "payment_date",
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
    "id": "i64o4q0y",
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
    "id": "gxbaetrs",
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
    "id": "43clpw9o",
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
    "id": "mhco0rj7",
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
    "id": "4byozxmw",
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
    "id": "ro0z8xjb",
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
    "id": "ncs5el4e",
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
    "id": "m9jebzpf",
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
    "id": "aksifav0",
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
    "id": "9prnxskm",
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
    "id": "zebxwwzl",
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
    "id": "3jqxgzx3",
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
    "id": "8kvgdne2",
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
    "id": "kqa0ylh4",
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
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated as payment_date,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  payment_date,\n  invoice,\n  COALESCE(original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n(SELECT\n  id,\n  created,\n  updated,\n  payment_date,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM payments_view\nUNION ALL\nSELECT\n  id,\n  created,\n  updated,\n  payment_date,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM split_inv)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "maa4ry9a",
    "name": "payment_date",
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
    "id": "bzd1nzip",
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
    "id": "bbtznjtx",
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
    "id": "y2gqf5q5",
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
    "id": "dmjio5te",
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
    "id": "b90dnplh",
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
    "id": "b9nc9ozt",
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
    "id": "nyjvm4wu",
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
    "id": "fhiewhul",
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
    "id": "ipzteej2",
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
    "id": "hlth7ynn",
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
    "id": "hf12r1lm",
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
    "id": "fmnq72zf",
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
    "id": "wxp5u2ot",
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
    "id": "q29hlsto",
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
  collection.schema.removeField("hbcrdjhc")

  // remove
  collection.schema.removeField("i64o4q0y")

  // remove
  collection.schema.removeField("gxbaetrs")

  // remove
  collection.schema.removeField("43clpw9o")

  // remove
  collection.schema.removeField("mhco0rj7")

  // remove
  collection.schema.removeField("4byozxmw")

  // remove
  collection.schema.removeField("ro0z8xjb")

  // remove
  collection.schema.removeField("ncs5el4e")

  // remove
  collection.schema.removeField("m9jebzpf")

  // remove
  collection.schema.removeField("aksifav0")

  // remove
  collection.schema.removeField("9prnxskm")

  // remove
  collection.schema.removeField("zebxwwzl")

  // remove
  collection.schema.removeField("3jqxgzx3")

  // remove
  collection.schema.removeField("8kvgdne2")

  // remove
  collection.schema.removeField("kqa0ylh4")

  return dao.saveCollection(collection)
})
