/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  COALESCE(original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(SELECT\n  id,\n  created,\n  updated,\n  payment_date AS dated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM payments_view\nUNION ALL\nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM split_inv)"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "flfughza",
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
    "id": "h7nmjmj9",
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
    "id": "gsmgotko",
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
    "id": "ienfovm2",
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
    "id": "0xcijyve",
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
    "id": "aeaydrql",
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
    "id": "2saxl5ds",
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
    "id": "ku06nbji",
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
    "id": "jr4haz5m",
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
    "id": "vzvrgn19",
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
    "id": "1yzuft3j",
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
    "id": "hf54krms",
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
    "id": "ifmdkrxo",
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
    "id": "3wfcqy7w",
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
    "id": "tf2sxpf1",
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
    "query": "WITH split_inv AS ( \n  SELECT \n  transactions_report.id,\n  transactions_report.created,\n  transactions_report.updated,\n  invoice_view.dated as payment_date,\n  invoice,\n  invoices_return_reference.original_invoices,\n  transactions_report.invoiceNo,\n  invoice_view.invoice_maker,\n  transactions_report.booker,\n  company,\n  transactions_report.party,\n  party_type,\n  transactions_report.type,\n  SUM(transactions_report.net_amount) amount,\n  FALSE AS paid,\n  transactions_report.area,\n  transactions_report.section,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n\nSELECT\n  id,\n  created,\n  updated,\n  payment_date,\n  invoice,\n  COALESCE(original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  COALESCE(company,\"\")AS company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(SELECT\n  id,\n  created,\n  updated,\n  payment_date,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM payments_view\nUNION ALL\nSELECT\n  id,\n  created,\n  updated,\n  payment_date,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party AS party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM split_inv)"
  }

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

  // remove
  collection.schema.removeField("flfughza")

  // remove
  collection.schema.removeField("h7nmjmj9")

  // remove
  collection.schema.removeField("gsmgotko")

  // remove
  collection.schema.removeField("ienfovm2")

  // remove
  collection.schema.removeField("0xcijyve")

  // remove
  collection.schema.removeField("aeaydrql")

  // remove
  collection.schema.removeField("2saxl5ds")

  // remove
  collection.schema.removeField("ku06nbji")

  // remove
  collection.schema.removeField("jr4haz5m")

  // remove
  collection.schema.removeField("vzvrgn19")

  // remove
  collection.schema.removeField("1yzuft3j")

  // remove
  collection.schema.removeField("hf54krms")

  // remove
  collection.schema.removeField("ifmdkrxo")

  // remove
  collection.schema.removeField("3wfcqy7w")

  // remove
  collection.schema.removeField("tf2sxpf1")

  return dao.saveCollection(collection)
})
