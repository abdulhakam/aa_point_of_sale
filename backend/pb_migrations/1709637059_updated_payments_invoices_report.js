/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH all_transactions AS (\n SELECT\n    (ROW_NUMBER() OVER()) AS id,\n    transactions_report.invoice,\n    invoices_return_reference.original_invoices,\n    transactions_report.company,\n    transactions_report.party_type,\n    transactions_report.net_amount amount,\n    FALSE AS paid,\n    parties.area,\n    areas.section,\n    \"-\" AS description\n  FROM\n    transactions_report\n  LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n  LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n  LEFT JOIN parties ON transactions_report.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n SELECT\n    (ROW_NUMBER() OVER()) as id,\n    invoice_view.dated,\n    invoice_view.created,\n    invoice_view.updated,\n    invoice,\n    original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    company,\n    invoice_view.party,\n    party_type,\n    invoice_view.type,\n    SUM(amount)-(SUM(amount)/invoice_view.final_total*invoice_view.discount_rs) AS amount,\n    SUM(amount)/invoice_view.final_total AS ratio,\n    paid,\n    area,\n    section,\n    invoice_view.description\n  FROM\n    all_transactions\n LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n GROUP BY company, invoice\n),\n  split_payments AS (\n  SELECT\n  payments.id,\n  payments.payment_date AS dated,\n  payments.created,\n  payments.updated,\n  (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n  payments.invoice,\n  invoices_return_reference.original_invoices,\n  invoice_view.invoiceNo,\n  invoice_view.invoice_maker,\n  invoice_view.booker,\n  company_invoice.company,\n  payments.party AS party,\n  parties.type AS party_type,\n  payments.type AS type,\n  company_invoice.ratio,\n  COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) * company_invoice.ratio AS amount,\n  payments.paid,\n  parties.area,\n  areas.section,\n  payments.description\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id\nLEFT JOIN parties ON payments.party = parties.id\nLEFT JOIN areas ON parties.area = areas.id\nLEFT JOIN sections ON areas.section = sections.id\nLEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\nLEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\nLEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n  WHERE payments.description == \"payment\"\n),\npayments_view AS (\n SELECT\n    split_payments.id,\n    split_payments.dated,\n    split_payments.created,\n    split_payments.updated,\n    (CASE WHEN split_payments.dated = \"\" THEN split_payments.created ELSE split_payments.dated END) AS dated,\n    split_payments.invoice,\n    split_payments.original_invoices,\n    split_payments.invoiceNo,\n    split_payments.invoice_maker,\n    split_payments.booker,\n    split_payments.company,\n    split_payments.party AS party,\n    split_payments.party_type,\n    split_payments.type AS type,\n    split_payments.ratio,\n    split_payments.amount,\n    split_payments.paid,\n    split_payments.area,\n    split_payments.section,\n    split_payments.description\n FROM split_payments\n)\n\nSELECT\n    id,\n    dated,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    (CASE WHEN type == \"sale\" || \"purchase\" THEN type ELSE (\n     CASE WHEN type == \"sending\" THEN \"purchase\" ELSE (\n     CASE WHEN type == \"recieving\" THEN \"sale\" ELSE type\n     END) END) END) as type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n   (SELECT\n    id,\n    created,\n    updated,\n    dated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    company_invoice\n  UNION ALL\n  SELECT\n    id,\n    created,\n    updated,\n    dated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    amount AS ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    payments_view\n   )\n"
  }

  // remove
  collection.schema.removeField("74j00vwo")

  // remove
  collection.schema.removeField("tf16f7qg")

  // remove
  collection.schema.removeField("gpdykquq")

  // remove
  collection.schema.removeField("kamykyhk")

  // remove
  collection.schema.removeField("mn3bw0u7")

  // remove
  collection.schema.removeField("uev3tjga")

  // remove
  collection.schema.removeField("0tiqnzvp")

  // remove
  collection.schema.removeField("xxr4hyrc")

  // remove
  collection.schema.removeField("isievusi")

  // remove
  collection.schema.removeField("vgpzt8tq")

  // remove
  collection.schema.removeField("hagsn3no")

  // remove
  collection.schema.removeField("d7e0wdy9")

  // remove
  collection.schema.removeField("eiwfrqqd")

  // remove
  collection.schema.removeField("edw5nneo")

  // remove
  collection.schema.removeField("fcnz0zoy")

  // remove
  collection.schema.removeField("eszlzynj")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "3wtmzmcf",
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
    "id": "tgohumkp",
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
    "id": "vcqgyrnv",
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
    "id": "91kbmh6y",
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
    "id": "owgvju2w",
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
    "id": "j34utcm8",
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
    "id": "w96evnqj",
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
    "id": "je2x1abn",
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
    "id": "rd8xdclo",
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
    "id": "omvsn1uh",
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
    "id": "vd958zh2",
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
    "id": "2ntfk1lo",
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
    "id": "otci1gdf",
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
    "id": "s8yhlyll",
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
    "id": "ydylkzki",
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
    "id": "6gyia0td",
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
    "query": "WITH all_transactions AS (\n SELECT\n    (ROW_NUMBER() OVER()) AS id,\n    transactions_report.invoice,\n    invoices_return_reference.original_invoices,\n    transactions_report.company,\n    transactions_report.party_type,\n    transactions_report.net_amount amount,\n    FALSE AS paid,\n    parties.area,\n    areas.section,\n    \"-\" AS description\n  FROM\n    transactions_report\n  LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n  LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n  LEFT JOIN parties ON transactions_report.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n SELECT\n    (ROW_NUMBER() OVER()) as id,\n    invoice_view.dated,\n    invoice_view.created,\n    invoice_view.updated,\n    invoice,\n    original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    company,\n    invoice_view.party,\n    party_type,\n    invoice_view.type,\n    SUM(amount) AS amount,\n    SUM(amount)/invoice_view.final_total AS ratio,\n    paid,\n    area,\n    section,\n    invoice_view.description\n  FROM\n    all_transactions\n LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n GROUP BY company, invoice\n),\n  split_payments AS (\n  SELECT\n  payments.id,\n  payments.payment_date AS dated,\n  payments.created,\n  payments.updated,\n  (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n  payments.invoice,\n  invoices_return_reference.original_invoices,\n  invoice_view.invoiceNo,\n  invoice_view.invoice_maker,\n  invoice_view.booker,\n  company_invoice.company,\n  payments.party AS party,\n  parties.type AS party_type,\n  payments.type AS type,\n  company_invoice.ratio,\n  COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) * company_invoice.ratio AS amount,\n  payments.paid,\n  parties.area,\n  areas.section,\n  payments.description\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id\nLEFT JOIN parties ON payments.party = parties.id\nLEFT JOIN areas ON parties.area = areas.id\nLEFT JOIN sections ON areas.section = sections.id\nLEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\nLEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\nLEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n  WHERE payments.description == \"payment\"\n),\npayments_view AS (\n SELECT\n    split_payments.id,\n    split_payments.dated,\n    split_payments.created,\n    split_payments.updated,\n    (CASE WHEN split_payments.dated = \"\" THEN split_payments.created ELSE split_payments.dated END) AS dated,\n    split_payments.invoice,\n    split_payments.original_invoices,\n    split_payments.invoiceNo,\n    split_payments.invoice_maker,\n    split_payments.booker,\n    split_payments.company,\n    split_payments.party AS party,\n    split_payments.party_type,\n    split_payments.type AS type,\n    split_payments.ratio,\n    split_payments.amount,\n    split_payments.paid,\n    split_payments.area,\n    split_payments.section,\n    split_payments.description\n FROM split_payments\n)\n\nSELECT\n    id,\n    dated,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    (CASE WHEN type == \"sale\" || \"purchase\" THEN type ELSE (\n     CASE WHEN type == \"sending\" THEN \"purchase\" ELSE (\n     CASE WHEN type == \"recieving\" THEN \"sale\" ELSE type\n     END) END) END) as type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n   (SELECT\n    id,\n    created,\n    updated,\n    dated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    company_invoice\n  UNION ALL\n  SELECT\n    id,\n    created,\n    updated,\n    dated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    amount AS ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    payments_view\n   )\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "74j00vwo",
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
    "id": "tf16f7qg",
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
    "id": "gpdykquq",
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
    "id": "kamykyhk",
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
    "id": "mn3bw0u7",
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
    "id": "uev3tjga",
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
    "id": "0tiqnzvp",
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
    "id": "xxr4hyrc",
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
    "id": "isievusi",
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
    "id": "vgpzt8tq",
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
    "id": "hagsn3no",
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
    "id": "d7e0wdy9",
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
    "id": "eiwfrqqd",
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
    "id": "edw5nneo",
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
    "id": "fcnz0zoy",
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
    "id": "eszlzynj",
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
  collection.schema.removeField("3wtmzmcf")

  // remove
  collection.schema.removeField("tgohumkp")

  // remove
  collection.schema.removeField("vcqgyrnv")

  // remove
  collection.schema.removeField("91kbmh6y")

  // remove
  collection.schema.removeField("owgvju2w")

  // remove
  collection.schema.removeField("j34utcm8")

  // remove
  collection.schema.removeField("w96evnqj")

  // remove
  collection.schema.removeField("je2x1abn")

  // remove
  collection.schema.removeField("rd8xdclo")

  // remove
  collection.schema.removeField("omvsn1uh")

  // remove
  collection.schema.removeField("vd958zh2")

  // remove
  collection.schema.removeField("2ntfk1lo")

  // remove
  collection.schema.removeField("otci1gdf")

  // remove
  collection.schema.removeField("s8yhlyll")

  // remove
  collection.schema.removeField("ydylkzki")

  // remove
  collection.schema.removeField("6gyia0td")

  return dao.saveCollection(collection)
})
