/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH\n  company_invoice AS (\n    SELECT\n      -- (ROW_NUMBER() OVER ()) as id,\n      -- invoice_view.dated,\n      -- invoice_view.created,\n      -- invoice_view.updated,\n      transactions_report.invoice,\n      -- invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      -- invoice_view.invoice_maker,\n      -- invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid\n      -- parties.area,\n      -- areas.section,\n      -- \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n  ),\n  payments_view AS (\n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      company_invoice.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )\nSELECT\n  id,\n  dated,\n  created,\n  updated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  (\n    CASE\n      WHEN type = \"sale\" || \"purchase\" THEN type\n      ELSE (\n        CASE\n          WHEN type = \"sending\" THEN \"purchase\"\n          ELSE (\n            CASE\n              WHEN type = \"recieving\" THEN \"sale\"\n              ELSE type\n            END\n          )\n        END\n      )\n    END\n  ) as type,\n  ratio,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n  (\n    \n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n    UNION ALL\n    \n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      company_invoice.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )"
  }

  // remove
  collection.schema.removeField("yy334vy8")

  // remove
  collection.schema.removeField("ge0qoht6")

  // remove
  collection.schema.removeField("rwjdpzy0")

  // remove
  collection.schema.removeField("g2e8tnus")

  // remove
  collection.schema.removeField("jgmykvfr")

  // remove
  collection.schema.removeField("6ucyzts6")

  // remove
  collection.schema.removeField("getzclrw")

  // remove
  collection.schema.removeField("ztu0txih")

  // remove
  collection.schema.removeField("rdfz3ggi")

  // remove
  collection.schema.removeField("ykt0qerw")

  // remove
  collection.schema.removeField("hmcpnwuj")

  // remove
  collection.schema.removeField("snqdfhk0")

  // remove
  collection.schema.removeField("qpu8zw89")

  // remove
  collection.schema.removeField("x8oyfksq")

  // remove
  collection.schema.removeField("4tljbloj")

  // remove
  collection.schema.removeField("glgt7a7j")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lqujzg7c",
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
    "id": "xltxv4je",
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
    "id": "xcdstikv",
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
    "id": "jpzoxu7q",
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
    "id": "yoylbbcr",
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
    "id": "6vcepqxm",
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
    "id": "5izyibdd",
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
    "id": "k4tsgxwc",
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
    "id": "ibglu584",
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
    "id": "nfbfqcfk",
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
    "id": "exdaext4",
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
    "id": "fusa0mxc",
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
    "id": "11t3ukmi",
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
    "id": "zogfhiti",
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
    "id": "r7bxbtkh",
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
    "id": "kqtru64d",
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
    "query": "WITH\n  company_invoice AS (\n    SELECT\n      -- (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      -- invoice_view.created,\n      -- invoice_view.updated,\n      transactions_report.invoice,\n      -- invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      -- invoice_view.invoice_maker,\n      -- invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid\n      -- parties.area,\n      -- areas.section,\n      -- \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n  ),\n  payments_view AS (\n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      company_invoice.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )\nSELECT\n  id,\n  dated,\n  created,\n  updated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  (\n    CASE\n      WHEN type = \"sale\" || \"purchase\" THEN type\n      ELSE (\n        CASE\n          WHEN type = \"sending\" THEN \"purchase\"\n          ELSE (\n            CASE\n              WHEN type = \"recieving\" THEN \"sale\"\n              ELSE type\n            END\n          )\n        END\n      )\n    END\n  ) as type,\n  ratio,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n  (\n    \n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n    UNION ALL\n    \n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      company_invoice.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yy334vy8",
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
    "id": "ge0qoht6",
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
    "id": "rwjdpzy0",
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
    "id": "g2e8tnus",
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
    "id": "jgmykvfr",
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
    "id": "6ucyzts6",
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
    "id": "getzclrw",
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
    "id": "ztu0txih",
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
    "id": "rdfz3ggi",
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
    "id": "ykt0qerw",
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
    "id": "hmcpnwuj",
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
    "id": "snqdfhk0",
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
    "id": "qpu8zw89",
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
    "id": "x8oyfksq",
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
    "id": "4tljbloj",
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
    "id": "glgt7a7j",
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
  collection.schema.removeField("lqujzg7c")

  // remove
  collection.schema.removeField("xltxv4je")

  // remove
  collection.schema.removeField("xcdstikv")

  // remove
  collection.schema.removeField("jpzoxu7q")

  // remove
  collection.schema.removeField("yoylbbcr")

  // remove
  collection.schema.removeField("6vcepqxm")

  // remove
  collection.schema.removeField("5izyibdd")

  // remove
  collection.schema.removeField("k4tsgxwc")

  // remove
  collection.schema.removeField("ibglu584")

  // remove
  collection.schema.removeField("nfbfqcfk")

  // remove
  collection.schema.removeField("exdaext4")

  // remove
  collection.schema.removeField("fusa0mxc")

  // remove
  collection.schema.removeField("11t3ukmi")

  // remove
  collection.schema.removeField("zogfhiti")

  // remove
  collection.schema.removeField("r7bxbtkh")

  // remove
  collection.schema.removeField("kqtru64d")

  return dao.saveCollection(collection)
})
