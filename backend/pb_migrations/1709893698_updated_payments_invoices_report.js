/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH split_inv AS ( \n  SELECT \n  invoice,\n  company,\n  SUM(transactions_report.net_amount) AS amount,\n  SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n  \nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(\n  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  p.created,\n  p.updated,\n  payment_date AS dated,\n  p.invoice,\n  COALESCE(p.original_invoices,\"\") AS original_invoices,\n  p.invoiceNo,\n  p.invoice_maker,\n  p.booker,\n  split_inv.company,\n  p.party,\n  p.party_type,\n  (CASE \n    WHEN p.type = \"recieving\" THEN \"sale\"\n    WHEN p.type = \"sending\" THEN \"purchase\"\n    WHEN p.type = \"return\" THEN \"return\"\n  END) AS type,\n  p.amount * split_inv.ratio as amount,\n  p.paid,\n  p.area,\n  p.section,\n  p.description\nFROM payments_view p\n  LEFT JOIN split_inv ON p.invoice = split_inv.invoice\n  GROUP BY split_inv.company,p.invoice, p.paid, p.created\n  )"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1t4ful1v",
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
    "id": "9umpdzas",
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
    "id": "7522jtjz",
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
    "id": "6dzwphzv",
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
    "id": "pjxoqldp",
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
    "id": "ni1bh54m",
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
    "id": "gpsyj8eo",
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
    "id": "vlx7jpos",
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
    "id": "ji6ngnqi",
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
    "id": "lryketid",
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
    "id": "chygjcrt",
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
    "id": "ndobut0p",
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
    "id": "kdnzu0rh",
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
    "id": "lv2elr0t",
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
    "id": "p9hfqruu",
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
    "query": "WITH split_inv AS ( \n  SELECT \n  invoice,\n  company,\n  SUM(transactions_report.net_amount) amount,\n  SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio,\n  \"-\" AS description\n  FROM transactions_report\n  LEFT JOIN invoice_view ON invoice = invoice_view.id\n  LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n  GROUP BY company, invoice\n  )\n  \nSELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  type,\n  amount,\n  paid,\n  COALESCE(area,\"\") AS area,\n  COALESCE(section,\"\") AS section,\n  description\nFROM\n(\n  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  p.created,\n  p.updated,\n  payment_date AS dated,\n  p.invoice,\n  COALESCE(p.original_invoices,\"\") AS original_invoices,\n  p.invoiceNo,\n  p.invoice_maker,\n  p.booker,\n  split_inv.company,\n  p.party,\n  p.party_type,\n  (CASE \n    WHEN p.type = \"recieving\" THEN \"sale\"\n    WHEN p.type = \"sending\" THEN \"purchase\"\n    WHEN p.type = \"return\" THEN \"return\"\n  END) AS type,\n  p.amount * split_inv.ratio as amount,\n  p.paid,\n  p.area,\n  p.section,\n  p.description\nFROM payments_view p\n  LEFT JOIN split_inv ON p.invoice = split_inv.invoice\n  GROUP BY split_inv.company,p.invoice, p.paid, p.created\n  )"
  }

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

  // remove
  collection.schema.removeField("1t4ful1v")

  // remove
  collection.schema.removeField("9umpdzas")

  // remove
  collection.schema.removeField("7522jtjz")

  // remove
  collection.schema.removeField("6dzwphzv")

  // remove
  collection.schema.removeField("pjxoqldp")

  // remove
  collection.schema.removeField("ni1bh54m")

  // remove
  collection.schema.removeField("gpsyj8eo")

  // remove
  collection.schema.removeField("vlx7jpos")

  // remove
  collection.schema.removeField("ji6ngnqi")

  // remove
  collection.schema.removeField("lryketid")

  // remove
  collection.schema.removeField("chygjcrt")

  // remove
  collection.schema.removeField("ndobut0p")

  // remove
  collection.schema.removeField("kdnzu0rh")

  // remove
  collection.schema.removeField("lv2elr0t")

  // remove
  collection.schema.removeField("p9hfqruu")

  return dao.saveCollection(collection)
})
