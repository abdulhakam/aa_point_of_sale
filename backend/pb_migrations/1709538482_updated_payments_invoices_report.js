/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH all_transactions AS (\n SELECT\n    (ROW_NUMBER() OVER()) AS id,\n    transactions_report.created,\n    transactions_report.updated,\n    transactions_report.invoice,\n    invoices_return_reference.original_invoices,\n    transactions_report.invoiceNo,\n    invoices.invoice_maker,\n    invoices.booker,\n    transactions_report.company,\n    transactions_report.party,\n    transactions_report.party_type,\n    transactions_report.type,\n    transactions_report.net_amount amount,\n    FALSE AS paid,\n    parties.area,\n    areas.section,\n    \"-\" AS description\n  FROM\n    transactions_report\n  LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n  LEFT JOIN invoices ON transactions_report.invoice = invoices.id\n  LEFT JOIN parties ON transactions_report.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\n),\ncompany_invoice AS (\n SELECT\n    (ROW_NUMBER() OVER()) as id,\n    invoice_view.created,\n    invoice_view.updated,\n    invoice,\n    original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    company,\n    invoice_view.party,\n    party_type,\n    invoice_view.type,\n    amount,\n    amount/invoice_view.final_total AS ratio,\n    paid,\n    area,\n    section,\n    invoice_view.description\n  FROM\n    all_transactions\n LEFT JOIN invoice_view ON all_transactions.invoice = invoice_view.id\n GROUP BY company, invoice\n),\npayments_view AS (\n SELECT\n    payments.id,\n    payments.created,\n    payments.updated,\n    (CASE WHEN payments.payment_date = \"\" THEN payments.created ELSE payments.payment_date END) AS payment_date,\n    payments.invoice,\n    invoices_return_reference.original_invoices,\n    invoice_view.invoiceNo,\n    invoice_view.invoice_maker,\n    invoice_view.booker,\n    order_bookers.company,\n    payments.party AS party,\n    parties.type AS party_type,\n    payments.type AS type,\n    COALESCE((CASE WHEN payments.amount <> 0 THEN payments.amount ELSE invoice_view.final_total END),0) AS amount,\n    payments.paid,\n    parties.area,\n    areas.section,\n    payments.description\n FROM payments\n LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n LEFT JOIN parties ON payments.party = parties.id\n LEFT JOIN areas ON parties.area = areas.id\n LEFT JOIN sections ON areas.section = sections.id\n LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n WHERE payments.description = 'payment'\n  GROUP BY order_bookers.company\n)\n\nSELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n   (SELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    company_invoice\n  UNION ALL\n  SELECT\n    id,\n    created,\n    updated,\n    invoice,\n    original_invoices,\n    invoiceNo,\n    invoice_maker,\n    booker,\n    company,\n    party,\n    party_type,\n    type,\n    amount AS ratio,\n    amount,\n    paid,\n    area,\n    section,\n    description\n  FROM\n    payments_view\n   )\n"
  }

  // remove
  collection.schema.removeField("d28ddhaq")

  // remove
  collection.schema.removeField("q1mt0mxg")

  // remove
  collection.schema.removeField("tdijumxg")

  // remove
  collection.schema.removeField("utidx3zf")

  // remove
  collection.schema.removeField("mt4gs6zr")

  // remove
  collection.schema.removeField("tjqeumhs")

  // remove
  collection.schema.removeField("ofnn3e0q")

  // remove
  collection.schema.removeField("zz3y4ywl")

  // remove
  collection.schema.removeField("exwa2xc0")

  // remove
  collection.schema.removeField("lfc50rdd")

  // remove
  collection.schema.removeField("ak1btucp")

  // remove
  collection.schema.removeField("ydmus0in")

  // remove
  collection.schema.removeField("noevpah4")

  // remove
  collection.schema.removeField("1dqhlhzk")

  // remove
  collection.schema.removeField("rp9zl3vj")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nqz0fixk",
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
    "id": "nxofu3e3",
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
    "id": "zpx5gcqf",
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
    "id": "rxkznfzb",
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
    "id": "zlluka2z",
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
    "id": "dwdiesdv",
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
    "id": "tjzaqi7z",
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
    "id": "xqyylh0t",
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
    "id": "hwc4rckv",
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
    "id": "8vgkrxlo",
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
    "id": "tiiiv5fz",
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
    "id": "1cknxyyg",
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
    "id": "v9qgu9fl",
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
    "id": "nz0or4aw",
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
    "id": "jwqkhdrc",
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
    "id": "d28ddhaq",
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
    "id": "q1mt0mxg",
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
    "id": "tdijumxg",
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
    "id": "utidx3zf",
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
    "id": "mt4gs6zr",
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
    "id": "tjqeumhs",
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
    "id": "ofnn3e0q",
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
    "id": "zz3y4ywl",
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
    "id": "exwa2xc0",
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
    "id": "lfc50rdd",
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
    "id": "ak1btucp",
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
    "id": "ydmus0in",
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
    "id": "noevpah4",
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
    "id": "1dqhlhzk",
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
    "id": "rp9zl3vj",
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
  collection.schema.removeField("nqz0fixk")

  // remove
  collection.schema.removeField("nxofu3e3")

  // remove
  collection.schema.removeField("zpx5gcqf")

  // remove
  collection.schema.removeField("rxkznfzb")

  // remove
  collection.schema.removeField("zlluka2z")

  // remove
  collection.schema.removeField("dwdiesdv")

  // remove
  collection.schema.removeField("tjzaqi7z")

  // remove
  collection.schema.removeField("xqyylh0t")

  // remove
  collection.schema.removeField("hwc4rckv")

  // remove
  collection.schema.removeField("8vgkrxlo")

  // remove
  collection.schema.removeField("tiiiv5fz")

  // remove
  collection.schema.removeField("1cknxyyg")

  // remove
  collection.schema.removeField("v9qgu9fl")

  // remove
  collection.schema.removeField("nz0or4aw")

  // remove
  collection.schema.removeField("jwqkhdrc")

  return dao.saveCollection(collection)
})
