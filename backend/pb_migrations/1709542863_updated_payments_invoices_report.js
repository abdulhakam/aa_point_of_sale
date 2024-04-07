/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH all_transactions AS (\n SELECT\n    (ROW_NUMBER() OVER()) AS id,\n    transactions_report.created,\n    transactions_report.updated,\n    transactions_report.invoice,\n    invoices_return_reference.original_invoices,\n    transactions_report.invoiceNo,\n    invoices.invoice_maker,\n    invoices.booker,\n    transactions_report.company,\n    transactions_report.party,\n    transactions_report.party_type,\n    transactions_report.type,\n    transactions_report.net_amount amount,\n    FALSE AS paid,\n    parties.area,\n    areas.section,\n    \"-\" AS description\n  FROM\n    transactions_report\n  LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n  LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n  LEFT JOIN parties ON transactions_report.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n SELECT\n    (ROW_NUMBER() OVER()) as id,\n    invoice_view.created,\n    invoice_view.updated,\n    invoice,\n    original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    company,\n    invoice_view.party,\n    party_type,\n    invoice_view.type,\n    SUM(amount) AS amount,\n    amount/invoice_view.final_total AS ratio,\n    paid,\n    area,\n    section,\n    invoice_view.description\n  FROM\n    all_transactions\n LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n GROUP BY company, invoice\n),\n  split_payments AS (\n  SELECT\n  payments.id,\n  payments.created,\n  payments.updated,\n  (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n  payments.invoice,\n  invoices_return_reference.original_invoices,\n  invoice_view.invoiceNo,\n  invoice_view.invoice_maker,\n  invoice_view.booker,\n  company_invoice.company,\n  payments.party AS party,\n  parties.type AS party_type,\n  payments.type AS type,\n  COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) * company_invoice.ratio AS amount,\n  payments.paid,\n  parties.area,\n  areas.section,\n  payments.description\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id\nLEFT JOIN parties ON payments.party = parties.id\nLEFT JOIN areas ON parties.area = areas.id\nLEFT JOIN sections ON areas.section = sections.id\nLEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\nLEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\nLEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n  WHERE payments.description == \"payment\"\n),\npayments_view AS (\n SELECT\n    split_payments.id,\n    split_payments.created,\n    split_payments.updated,\n    (CASE WHEN split_payments.payment_date = \"\" THEN split_payments.created ELSE split_payments.payment_date END) AS payment_date,\n    split_payments.invoice,\n    split_payments.original_invoices,\n    split_payments.invoiceNo,\n    split_payments.invoice_maker,\n    split_payments.booker,\n    split_payments.company,\n    split_payments.party AS party,\n    split_payments.party_type,\n    split_payments.type AS type,\n    split_payments.amount,\n    split_payments.paid,\n    split_payments.area,\n    split_payments.section,\n    split_payments.description\n FROM split_payments\n)\n\nSELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    (CASE WHEN type == \"sale\" || \"purchase\" THEN type ELSE (\n     CASE WHEN type == \"sending\" THEN \"purchase\" ELSE (\n     CASE WHEN type == \"recieving\" THEN \"sale\" ELSE type\n     END) END) END) as type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n   (SELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    company_invoice\n  UNION ALL\n  SELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    amount AS ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    payments_view\n   )\n"
  }

  // remove
  collection.schema.removeField("uk5v89fu")

  // remove
  collection.schema.removeField("cfv7rsvw")

  // remove
  collection.schema.removeField("8t3ddofw")

  // remove
  collection.schema.removeField("qcvbuoq5")

  // remove
  collection.schema.removeField("xqg4xu1b")

  // remove
  collection.schema.removeField("yasti3ms")

  // remove
  collection.schema.removeField("rernolnm")

  // remove
  collection.schema.removeField("fujquzjg")

  // remove
  collection.schema.removeField("6l0zce0p")

  // remove
  collection.schema.removeField("jybpzy2k")

  // remove
  collection.schema.removeField("egrsrd8z")

  // remove
  collection.schema.removeField("ipurddbb")

  // remove
  collection.schema.removeField("fccsk3v2")

  // remove
  collection.schema.removeField("2ay3sw3k")

  // remove
  collection.schema.removeField("cir7h4cn")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mhnmkjmr",
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
    "id": "dlnysgbq",
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
    "id": "5jrjxl86",
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
    "id": "7alar5nc",
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
    "id": "x8temoyy",
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
    "id": "zfqmldtj",
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
    "id": "lfms928s",
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
    "id": "tsbqheqi",
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
    "id": "l0yrmle1",
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
    "id": "phpue5hp",
    "name": "ratio",
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
    "id": "wtf7svmi",
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
    "id": "qgweqior",
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
    "id": "2l5ehjlh",
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
    "id": "ycn3s2cn",
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
    "id": "gfok709k",
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
    "query": "WITH all_transactions AS (\n SELECT\n    (ROW_NUMBER() OVER()) AS id,\n    transactions_report.created,\n    transactions_report.updated,\n    transactions_report.invoice,\n    invoices_return_reference.original_invoices,\n    transactions_report.invoiceNo,\n    invoices.invoice_maker,\n    invoices.booker,\n    transactions_report.company,\n    transactions_report.party,\n    transactions_report.party_type,\n    transactions_report.type,\n    transactions_report.net_amount amount,\n    FALSE AS paid,\n    parties.area,\n    areas.section,\n    \"-\" AS description\n  FROM\n    transactions_report\n  LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n  LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n  LEFT JOIN parties ON transactions_report.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n SELECT\n    (ROW_NUMBER() OVER()) as id,\n    invoice_view.created,\n    invoice_view.updated,\n    invoice,\n    original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    company,\n    invoice_view.party,\n    party_type,\n    invoice_view.type,\n    amount,\n    amount/invoice_view.final_total AS ratio,\n    paid,\n    area,\n    section,\n    invoice_view.description\n  FROM\n    all_transactions\n LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n GROUP BY company, invoice\n),\n  split_payments AS (\n  SELECT\n  payments.id,\n  payments.created,\n  payments.updated,\n  (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n  payments.invoice,\n  invoices_return_reference.original_invoices,\n  invoice_view.invoiceNo,\n  invoice_view.invoice_maker,\n  invoice_view.booker,\n  company_invoice.company,\n  payments.party AS party,\n  parties.type AS party_type,\n  payments.type AS type,\n  COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) * company_invoice.ratio AS amount,\n  payments.paid,\n  parties.area,\n  areas.section,\n  payments.description\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id\nLEFT JOIN parties ON payments.party = parties.id\nLEFT JOIN areas ON parties.area = areas.id\nLEFT JOIN sections ON areas.section = sections.id\nLEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\nLEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\nLEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n  WHERE payments.description == \"payment\"\n),\npayments_view AS (\n SELECT\n    split_payments.id,\n    split_payments.created,\n    split_payments.updated,\n    (CASE WHEN split_payments.payment_date = \"\" THEN split_payments.created ELSE split_payments.payment_date END) AS payment_date,\n    split_payments.invoice,\n    split_payments.original_invoices,\n    split_payments.invoiceNo,\n    split_payments.invoice_maker,\n    split_payments.booker,\n    split_payments.company,\n    split_payments.party AS party,\n    split_payments.party_type,\n    split_payments.type AS type,\n    split_payments.amount,\n    split_payments.paid,\n    split_payments.area,\n    split_payments.section,\n    split_payments.description\n FROM split_payments\n)\n\nSELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    (CASE WHEN type == \"sale\" || \"purchase\" THEN type ELSE (\n     CASE WHEN type == \"sending\" THEN \"purchase\" ELSE (\n     CASE WHEN type == \"recieving\" THEN \"sale\" ELSE type\n     END) END) END) as type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n   (SELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    company_invoice\n  UNION ALL\n  SELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    amount AS ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    payments_view\n   )\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uk5v89fu",
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
    "id": "cfv7rsvw",
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
    "id": "8t3ddofw",
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
    "id": "qcvbuoq5",
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
    "id": "xqg4xu1b",
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
    "id": "yasti3ms",
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
    "id": "rernolnm",
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
    "id": "fujquzjg",
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
    "id": "6l0zce0p",
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
    "id": "jybpzy2k",
    "name": "ratio",
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
    "id": "egrsrd8z",
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
    "id": "ipurddbb",
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
    "id": "fccsk3v2",
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
    "id": "2ay3sw3k",
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
    "id": "cir7h4cn",
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
  collection.schema.removeField("mhnmkjmr")

  // remove
  collection.schema.removeField("dlnysgbq")

  // remove
  collection.schema.removeField("5jrjxl86")

  // remove
  collection.schema.removeField("7alar5nc")

  // remove
  collection.schema.removeField("x8temoyy")

  // remove
  collection.schema.removeField("zfqmldtj")

  // remove
  collection.schema.removeField("lfms928s")

  // remove
  collection.schema.removeField("tsbqheqi")

  // remove
  collection.schema.removeField("l0yrmle1")

  // remove
  collection.schema.removeField("phpue5hp")

  // remove
  collection.schema.removeField("wtf7svmi")

  // remove
  collection.schema.removeField("qgweqior")

  // remove
  collection.schema.removeField("2l5ehjlh")

  // remove
  collection.schema.removeField("ycn3s2cn")

  // remove
  collection.schema.removeField("gfok709k")

  return dao.saveCollection(collection)
})
