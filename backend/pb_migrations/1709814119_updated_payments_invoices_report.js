/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH all_transactions AS (\n SELECT\n    (ROW_NUMBER() OVER()) AS id,\n    transactions_report.invoice,\n    invoices_return_reference.original_invoices,\n    transactions_report.company,\n    transactions_report.party_type,\n    transactions_report.net_amount amount,\n    FALSE AS paid,\n    parties.area,\n    areas.section,\n    \"-\" AS description\n  FROM\n    transactions_report\n  LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n  LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n  LEFT JOIN parties ON transactions_report.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n SELECT\n    (ROW_NUMBER() OVER()) as id,\n    invoice_view.dated,\n    invoice_view.created,\n    invoice_view.updated,\n    invoice,\n    original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    company,\n    invoice_view.party,\n    party_type,\n    invoice_view.type,\n    SUM(amount)-(SUM(amount)/invoice_view.unrounded_total*invoice_view.discount_rs) AS amount,\n    SUM(amount)/invoice_view.unrounded_total AS ratio,\n    paid,\n    area,\n    section,\n    invoice_view.description\n  FROM\n    all_transactions\n LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n GROUP BY company, invoice\n),\n  payments_view AS (\n  SELECT\n  payments.id,\n  (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS dated,\n  payments.created,\n  payments.updated,\n  (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n  payments.invoice,\n  invoices_return_reference.original_invoices,\n  invoice_view.invoiceNo,\n  invoice_view.invoice_maker,\n  invoice_view.booker,\n  company_invoice.company,\n  payments.party AS party,\n  parties.type AS party_type,\n  payments.type AS type,\n  company_invoice.ratio,\n  COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) * company_invoice.ratio AS amount,\n  payments.paid,\n  parties.area,\n  areas.section,\n  payments.description\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id\nLEFT JOIN parties ON payments.party = parties.id\nLEFT JOIN areas ON parties.area = areas.id\nLEFT JOIN sections ON areas.section = sections.id\nLEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\nLEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\nLEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n  WHERE payments.description == \"payment\"\n)\n\nSELECT\n    id,\n    dated,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    (CASE WHEN type == \"sale\" || \"purchase\" THEN type ELSE (\n     CASE WHEN type == \"sending\" THEN \"purchase\" ELSE (\n     CASE WHEN type == \"recieving\" THEN \"sale\" ELSE type\n     END) END) END) as type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n   (SELECT\n    id,\n    created,\n    updated,\n    dated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    company_invoice\n  UNION ALL\n  SELECT\n    id,\n    created,\n    updated,\n    dated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    amount AS ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    payments_view\n   )\n"
  }

  // remove
  collection.schema.removeField("xgggvybb")

  // remove
  collection.schema.removeField("xymte86t")

  // remove
  collection.schema.removeField("w6bkns2a")

  // remove
  collection.schema.removeField("evx2loaa")

  // remove
  collection.schema.removeField("xvfkfgfo")

  // remove
  collection.schema.removeField("muxi5ud5")

  // remove
  collection.schema.removeField("vzhf6tv5")

  // remove
  collection.schema.removeField("5fsmgouu")

  // remove
  collection.schema.removeField("nqkvp14g")

  // remove
  collection.schema.removeField("rynvyzg2")

  // remove
  collection.schema.removeField("xb1g1sph")

  // remove
  collection.schema.removeField("ys1eiz85")

  // remove
  collection.schema.removeField("yn5jlbez")

  // remove
  collection.schema.removeField("b9chfmne")

  // remove
  collection.schema.removeField("pjv5zwxj")

  // remove
  collection.schema.removeField("ia9l81so")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ts3vs2gp",
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
    "id": "iumcbags",
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
    "id": "6argfg5k",
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
    "id": "xjgknoql",
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
    "id": "8g5yerfu",
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
    "id": "ghviwtex",
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
    "id": "qjbqll41",
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
    "id": "gbikifx4",
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
    "id": "bgfbnlaj",
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
    "id": "k0ne9cew",
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
    "id": "tmupz0dz",
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
    "id": "lisscixi",
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
    "id": "pbylzhmv",
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
    "id": "c5y7h369",
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
    "id": "4mblnch2",
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
    "id": "6semmpf0",
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
    "query": "WITH all_transactions AS (\n SELECT\n    (ROW_NUMBER() OVER()) AS id,\n    transactions_report.invoice,\n    invoices_return_reference.original_invoices,\n    transactions_report.company,\n    transactions_report.party_type,\n    transactions_report.net_amount amount,\n    FALSE AS paid,\n    parties.area,\n    areas.section,\n    \"-\" AS description\n  FROM\n    transactions_report\n  LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n  LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n  LEFT JOIN parties ON transactions_report.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n SELECT\n    (ROW_NUMBER() OVER()) as id,\n    invoice_view.dated,\n    invoice_view.created,\n    invoice_view.updated,\n    invoice,\n    original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    company,\n    invoice_view.party,\n    party_type,\n    invoice_view.type,\n    SUM(amount)-(SUM(amount)/invoice_view.unrounded_total*invoice_view.discount_rs) AS amount,\n    SUM(amount)/invoice_view.unrounded_total AS ratio,\n    paid,\n    area,\n    section,\n    invoice_view.description\n  FROM\n    all_transactions\n LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n GROUP BY company, invoice\n),\n  split_payments AS (\n  SELECT\n  payments.id,\n  payments.payment_date AS dated,\n  payments.created,\n  payments.updated,\n  (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n  payments.invoice,\n  invoices_return_reference.original_invoices,\n  invoice_view.invoiceNo,\n  invoice_view.invoice_maker,\n  invoice_view.booker,\n  company_invoice.company,\n  payments.party AS party,\n  parties.type AS party_type,\n  payments.type AS type,\n  company_invoice.ratio,\n  COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) * company_invoice.ratio AS amount,\n  payments.paid,\n  parties.area,\n  areas.section,\n  payments.description\nFROM payments\nLEFT JOIN invoice_view ON payments.invoice = invoice_view.id\nLEFT JOIN parties ON payments.party = parties.id\nLEFT JOIN areas ON parties.area = areas.id\nLEFT JOIN sections ON areas.section = sections.id\nLEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\nLEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\nLEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n  WHERE payments.description == \"payment\"\n),\npayments_view AS (\n SELECT\n    split_payments.id,\n    split_payments.dated,\n    split_payments.created,\n    split_payments.updated,\n    (CASE WHEN split_payments.dated = \"\" THEN split_payments.created ELSE split_payments.dated END) AS dated,\n    split_payments.invoice,\n    split_payments.original_invoices,\n    split_payments.invoiceNo,\n    split_payments.invoice_maker,\n    split_payments.booker,\n    split_payments.company,\n    split_payments.party AS party,\n    split_payments.party_type,\n    split_payments.type AS type,\n    split_payments.ratio,\n    split_payments.amount,\n    split_payments.paid,\n    split_payments.area,\n    split_payments.section,\n    split_payments.description\n FROM split_payments\n)\n\nSELECT\n    id,\n    dated,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    (CASE WHEN type == \"sale\" || \"purchase\" THEN type ELSE (\n     CASE WHEN type == \"sending\" THEN \"purchase\" ELSE (\n     CASE WHEN type == \"recieving\" THEN \"sale\" ELSE type\n     END) END) END) as type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n   (SELECT\n    id,\n    created,\n    updated,\n    dated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    company_invoice\n  UNION ALL\n  SELECT\n    id,\n    created,\n    updated,\n    dated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    amount AS ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    payments_view\n   )\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xgggvybb",
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
    "id": "xymte86t",
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
    "id": "w6bkns2a",
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
    "id": "evx2loaa",
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
    "id": "xvfkfgfo",
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
    "id": "muxi5ud5",
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
    "id": "vzhf6tv5",
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
    "id": "5fsmgouu",
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
    "id": "nqkvp14g",
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
    "id": "rynvyzg2",
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
    "id": "xb1g1sph",
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
    "id": "ys1eiz85",
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
    "id": "yn5jlbez",
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
    "id": "b9chfmne",
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
    "id": "pjv5zwxj",
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
    "id": "ia9l81so",
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
  collection.schema.removeField("ts3vs2gp")

  // remove
  collection.schema.removeField("iumcbags")

  // remove
  collection.schema.removeField("6argfg5k")

  // remove
  collection.schema.removeField("xjgknoql")

  // remove
  collection.schema.removeField("8g5yerfu")

  // remove
  collection.schema.removeField("ghviwtex")

  // remove
  collection.schema.removeField("qjbqll41")

  // remove
  collection.schema.removeField("gbikifx4")

  // remove
  collection.schema.removeField("bgfbnlaj")

  // remove
  collection.schema.removeField("k0ne9cew")

  // remove
  collection.schema.removeField("tmupz0dz")

  // remove
  collection.schema.removeField("lisscixi")

  // remove
  collection.schema.removeField("pbylzhmv")

  // remove
  collection.schema.removeField("c5y7h369")

  // remove
  collection.schema.removeField("4mblnch2")

  // remove
  collection.schema.removeField("6semmpf0")

  return dao.saveCollection(collection)
})
