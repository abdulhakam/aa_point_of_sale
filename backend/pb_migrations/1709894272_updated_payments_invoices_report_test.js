/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("tqx4y2yr3jtxbc0")

  collection.options = {
    "query": "SELECT\n  id,\n  created,\n  updated,\n  dated,\n  `invoice`,\n  `original_invoices`,\n  invoiceNo,\n  `invoice_maker`,\n  `booker`,\n  `company`,\n  `party`,\n  party_type,\n  type,\n  amount,\n  paid,\n  `area`,\n  `section`,\n  description\nFROM\n(\n  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  created,\n  updated,\n  payment_date AS dated,\n  payments_view.invoice,\n  COALESCE(payments_view.original_invoices,\"\") AS original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  split_inv.company,\n  party,\n  party_type,\n  type AS type,\n  payments_view.amount * split_inv.ratio as amount,\n  paid,\n  area,\n  section,\n  description\nFROM payments_view\n  LEFT JOIN \n  (\n    SELECT \n    invoice,\n    company,\n    SUM(transactions_report.net_amount) AS amount,\n    SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio\n    FROM transactions_report\n    LEFT JOIN invoice_view ON invoice = invoice_view.id\n    LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n    GROUP BY company, invoice\n  ) AS split_inv ON payments_view.invoice = split_inv.invoice\n  GROUP BY split_inv.company,payments_view.invoice, payments_view.paid, payments_view.created\n)\n"
  }

  // remove
  collection.schema.removeField("nukgwil5")

  // remove
  collection.schema.removeField("72u0tbzz")

  // remove
  collection.schema.removeField("ckblsqwf")

  // remove
  collection.schema.removeField("q6bgupgk")

  // remove
  collection.schema.removeField("4tjk6ums")

  // remove
  collection.schema.removeField("oh8x7hpn")

  // remove
  collection.schema.removeField("0bok4zfb")

  // remove
  collection.schema.removeField("qxwj1pyg")

  // remove
  collection.schema.removeField("hnmndkhq")

  // remove
  collection.schema.removeField("n0adssx1")

  // remove
  collection.schema.removeField("gepms5by")

  // remove
  collection.schema.removeField("dmycyq42")

  // remove
  collection.schema.removeField("5ej7egzo")

  // remove
  collection.schema.removeField("qunflkyu")

  // remove
  collection.schema.removeField("5t1ghp4o")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6qope0dj",
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
    "id": "xir0swk1",
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
    "id": "xypvuwm8",
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
    "id": "httlsnf1",
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
    "id": "72t2wrx1",
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
    "id": "ykqt8mbl",
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
    "id": "knhql0rr",
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
    "id": "yrjzsxka",
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
    "id": "thexah8d",
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
    "id": "qb9efrel",
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
    "id": "badv9iq8",
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
    "id": "bsefhcx0",
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
    "id": "ad5sjmit",
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
    "id": "rwtj3zyb",
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
    "id": "vun5ojrt",
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
  const collection = dao.findCollectionByNameOrId("tqx4y2yr3jtxbc0")

  collection.options = {
    "query": "SELECT\n  id,\n  created,\n  updated,\n  dated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  type,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n(\n  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  p.created,\n  p.updated,\n  payment_date AS dated,\n  p.invoice,\n  COALESCE(p.original_invoices,\"\") AS original_invoices,\n  p.invoiceNo,\n  p.invoice_maker,\n  p.booker,\n  split_inv.company,\n  p.party,\n  p.party_type,\n  p.type AS type,\n  p.amount * split_inv.ratio as amount,\n  p.paid,\n  p.area,\n  p.section,\n  p.description\nFROM payments_view p\n  LEFT JOIN \n  (\n    SELECT \n    invoice,\n    company,\n    SUM(transactions_report.net_amount) AS amount,\n    SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio\n    FROM transactions_report\n    LEFT JOIN invoice_view ON invoice = invoice_view.id\n    LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n    GROUP BY company, invoice\n  ) AS split_inv ON p.invoice = split_inv.invoice\n  GROUP BY split_inv.company,p.invoice, p.paid, p.created\n)\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nukgwil5",
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
    "id": "72u0tbzz",
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
    "id": "ckblsqwf",
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
    "id": "q6bgupgk",
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
    "id": "4tjk6ums",
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
    "id": "oh8x7hpn",
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
    "id": "0bok4zfb",
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
    "id": "qxwj1pyg",
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
    "id": "hnmndkhq",
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
    "id": "n0adssx1",
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
    "id": "gepms5by",
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
    "id": "dmycyq42",
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
    "id": "5ej7egzo",
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
    "id": "qunflkyu",
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
    "id": "5t1ghp4o",
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
  collection.schema.removeField("6qope0dj")

  // remove
  collection.schema.removeField("xir0swk1")

  // remove
  collection.schema.removeField("xypvuwm8")

  // remove
  collection.schema.removeField("httlsnf1")

  // remove
  collection.schema.removeField("72t2wrx1")

  // remove
  collection.schema.removeField("ykqt8mbl")

  // remove
  collection.schema.removeField("knhql0rr")

  // remove
  collection.schema.removeField("yrjzsxka")

  // remove
  collection.schema.removeField("thexah8d")

  // remove
  collection.schema.removeField("qb9efrel")

  // remove
  collection.schema.removeField("badv9iq8")

  // remove
  collection.schema.removeField("bsefhcx0")

  // remove
  collection.schema.removeField("ad5sjmit")

  // remove
  collection.schema.removeField("rwtj3zyb")

  // remove
  collection.schema.removeField("vun5ojrt")

  return dao.saveCollection(collection)
})
