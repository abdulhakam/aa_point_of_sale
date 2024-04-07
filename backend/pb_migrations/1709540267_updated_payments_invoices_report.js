/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH all_transactions AS (\n SELECT\n    (ROW_NUMBER() OVER()) AS id,\n    transactions_report.created,\n    transactions_report.updated,\n    transactions_report.invoice,\n    invoices_return_reference.original_invoices,\n    transactions_report.invoiceNo,\n    invoices.invoice_maker,\n    invoices.booker,\n    transactions_report.company,\n    transactions_report.party,\n    transactions_report.party_type,\n    transactions_report.type,\n    transactions_report.net_amount amount,\n    FALSE AS paid,\n    parties.area,\n    areas.section,\n    \"-\" AS description\n  FROM\n    transactions_report\n  LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n  LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n  LEFT JOIN parties ON transactions_report.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n SELECT\n    (ROW_NUMBER() OVER()) as id,\n    invoice_view.created,\n    invoice_view.updated,\n    invoice,\n    original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    company,\n    invoice_view.party,\n    party_type,\n    invoice_view.type,\n    amount,\n    amount/invoice_view.final_total AS ratio,\n    paid,\n    area,\n    section,\n    invoice_view.description\n  FROM\n    all_transactions\n LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n GROUP BY company, invoice\n),\n  split_payments AS (\n  SELECT\n  payments.id,\n  payments.created,\n  payments.updated,\n  (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n  payments.invoice,\n  invoices_return_reference.original_invoices,\n  invoice_view.invoiceNo,\n  invoice_view.invoice_maker,\n  invoice_view.booker,\n  company_invoice.company,\n  payments.party AS party,\n  parties.type AS party_type,\n  payments.type AS type,\n  COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) * company_invoice.ratio AS amount,\n  payments.paid,\n  parties.area,\n  areas.section,\n  payments.description\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id\nLEFT JOIN parties ON payments.party = parties.id\nLEFT JOIN areas ON parties.area = areas.id\nLEFT JOIN sections ON areas.section = sections.id\nLEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\nLEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\nLEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n),\npayments_view AS (\n SELECT\n    payments.id,\n    payments.created,\n    payments.updated,\n    (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n    payments.invoice,\n    invoices_return_reference.original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    order_bookers.company,\n    payments.party AS party,\n    parties.type AS party_type,\n    payments.type AS type,\n    COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) AS amount,\n    payments.paid,\n    parties.area,\n    areas.section,\n    payments.description\n FROM payments\n LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n LEFT JOIN parties ON payments.party = parties.id\n LEFT JOIN areas ON parties.area = areas.id\n LEFT JOIN sections ON areas.section = sections.id\n LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n WHERE payments.description = 'payment'\n)\n\nSELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n   (SELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    company_invoice\n  UNION ALL\n  SELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    amount AS ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    payments_view\n   )\n"
  }

  // remove
  collection.schema.removeField("cxnkeevj")

  // remove
  collection.schema.removeField("sqloqyp7")

  // remove
  collection.schema.removeField("ha5xvpd6")

  // remove
  collection.schema.removeField("clikhawx")

  // remove
  collection.schema.removeField("u3fsbghn")

  // remove
  collection.schema.removeField("y4uava1d")

  // remove
  collection.schema.removeField("enxxnux1")

  // remove
  collection.schema.removeField("h96mtkr9")

  // remove
  collection.schema.removeField("vayitkxs")

  // remove
  collection.schema.removeField("aju7z77u")

  // remove
  collection.schema.removeField("qk6itsdg")

  // remove
  collection.schema.removeField("kforw9eg")

  // remove
  collection.schema.removeField("orzbz2gx")

  // remove
  collection.schema.removeField("fveokx0k")

  // remove
  collection.schema.removeField("6i8ddz8y")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "r6lxzfqm",
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
    "id": "jsmqto7d",
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
    "id": "7jxnadxo",
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
    "id": "kv3yx5mq",
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
    "id": "zdpeqjr2",
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
    "id": "bg28hfuq",
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
    "id": "0k3zpqgc",
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
    "id": "przqqsaw",
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
    "id": "gaccuzqu",
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
    "id": "hclm5zlh",
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
    "id": "vf7qgb2u",
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
    "id": "q9tlklc7",
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
    "id": "afj4d3qj",
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
    "id": "yjp8zwk4",
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
    "id": "u9wvgklq",
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
    "query": "WITH all_transactions AS (\n SELECT\n    (ROW_NUMBER() OVER()) AS id,\n    transactions_report.created,\n    transactions_report.updated,\n    transactions_report.invoice,\n    invoices_return_reference.original_invoices,\n    transactions_report.invoiceNo,\n    invoices.invoice_maker,\n    invoices.booker,\n    transactions_report.company,\n    transactions_report.party,\n    transactions_report.party_type,\n    transactions_report.type,\n    transactions_report.net_amount amount,\n    FALSE AS paid,\n    parties.area,\n    areas.section,\n    \"-\" AS description\n  FROM\n    transactions_report\n  LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n  LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n  LEFT JOIN parties ON transactions_report.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n SELECT\n    (ROW_NUMBER() OVER()) as id,\n    invoice_view.created,\n    invoice_view.updated,\n    invoice,\n    original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    company,\n    invoice_view.party,\n    party_type,\n    invoice_view.type,\n    amount,\n    amount/invoice_view.final_total AS ratio,\n    paid,\n    area,\n    section,\n    invoice_view.description\n  FROM\n    all_transactions\n LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n GROUP BY company, invoice\n),\npayments_view AS (\n SELECT\n    payments.id,\n    payments.created,\n    payments.updated,\n    (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n    payments.invoice,\n    invoices_return_reference.original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    order_bookers.company,\n    payments.party AS party,\n    parties.type AS party_type,\n    payments.type AS type,\n    COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) AS amount,\n    payments.paid,\n    parties.area,\n    areas.section,\n    payments.description\n FROM payments\n LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n LEFT JOIN parties ON payments.party = parties.id\n LEFT JOIN areas ON parties.area = areas.id\n LEFT JOIN sections ON areas.section = sections.id\n LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n WHERE payments.description = 'payment'\n)\n\nSELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n   (SELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    company_invoice\n  UNION ALL\n  SELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    amount AS ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    payments_view\n   )\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cxnkeevj",
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
    "id": "sqloqyp7",
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
    "id": "ha5xvpd6",
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
    "id": "clikhawx",
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
    "id": "u3fsbghn",
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
    "id": "y4uava1d",
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
    "id": "enxxnux1",
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
    "id": "h96mtkr9",
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
    "id": "vayitkxs",
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
    "id": "aju7z77u",
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
    "id": "qk6itsdg",
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
    "id": "kforw9eg",
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
    "id": "orzbz2gx",
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
    "id": "fveokx0k",
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
    "id": "6i8ddz8y",
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
  collection.schema.removeField("r6lxzfqm")

  // remove
  collection.schema.removeField("jsmqto7d")

  // remove
  collection.schema.removeField("7jxnadxo")

  // remove
  collection.schema.removeField("kv3yx5mq")

  // remove
  collection.schema.removeField("zdpeqjr2")

  // remove
  collection.schema.removeField("bg28hfuq")

  // remove
  collection.schema.removeField("0k3zpqgc")

  // remove
  collection.schema.removeField("przqqsaw")

  // remove
  collection.schema.removeField("gaccuzqu")

  // remove
  collection.schema.removeField("hclm5zlh")

  // remove
  collection.schema.removeField("vf7qgb2u")

  // remove
  collection.schema.removeField("q9tlklc7")

  // remove
  collection.schema.removeField("afj4d3qj")

  // remove
  collection.schema.removeField("yjp8zwk4")

  // remove
  collection.schema.removeField("u9wvgklq")

  return dao.saveCollection(collection)
})
