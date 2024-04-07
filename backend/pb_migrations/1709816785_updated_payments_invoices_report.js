/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH\n  company_invoice AS (\n    SELECT\n      -- (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      -- invoice_view.created,\n      -- invoice_view.updated,\n      transactions_report.invoice,\n      -- invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      -- invoice_view.invoice_maker,\n      -- invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid\n      -- parties.area,\n      -- areas.section,\n      -- \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n  ),\n  payments_view AS (\n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      company_invoice.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )\nSELECT\n  id,\n  dated,\n  created,\n  updated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  (\n    CASE\n      WHEN type = \"sale\" || \"purchase\" THEN type\n      ELSE (\n        CASE\n          WHEN type = \"sending\" THEN \"purchase\"\n          ELSE (\n            CASE\n              WHEN type = \"recieving\" THEN \"sale\"\n              ELSE type\n            END\n          )\n        END\n      )\n    END\n  ) as type,\n  ratio,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n  (\n    \n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n    UNION ALL\n    \n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      company_invoice.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )"
  }

  // remove
  collection.schema.removeField("lj2xp7uq")

  // remove
  collection.schema.removeField("noxcisuf")

  // remove
  collection.schema.removeField("q62uaprp")

  // remove
  collection.schema.removeField("dgkpwxko")

  // remove
  collection.schema.removeField("3wqomjg4")

  // remove
  collection.schema.removeField("obzw4bky")

  // remove
  collection.schema.removeField("jknw7di2")

  // remove
  collection.schema.removeField("1ctllbzu")

  // remove
  collection.schema.removeField("nkrpyooi")

  // remove
  collection.schema.removeField("otf7gp1v")

  // remove
  collection.schema.removeField("doosf7xk")

  // remove
  collection.schema.removeField("ptog48if")

  // remove
  collection.schema.removeField("pkfkmcix")

  // remove
  collection.schema.removeField("g0gs1zwu")

  // remove
  collection.schema.removeField("ml0l1qwl")

  // remove
  collection.schema.removeField("t3lcbmvc")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH\n  company_invoice AS (\n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n  ),\n  payments_view AS (\n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      company_invoice.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )\nSELECT\n  id,\n  dated,\n  created,\n  updated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  (\n    CASE\n      WHEN type = \"sale\" || \"purchase\" THEN type\n      ELSE (\n        CASE\n          WHEN type = \"sending\" THEN \"purchase\"\n          ELSE (\n            CASE\n              WHEN type = \"recieving\" THEN \"sale\"\n              ELSE type\n            END\n          )\n        END\n      )\n    END\n  ) as type,\n  ratio,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n  (\n    \n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n    UNION ALL\n    \n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      company_invoice.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lj2xp7uq",
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
    "id": "noxcisuf",
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
    "id": "q62uaprp",
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
    "id": "dgkpwxko",
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
    "id": "3wqomjg4",
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
    "id": "obzw4bky",
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
    "id": "jknw7di2",
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
    "id": "1ctllbzu",
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
    "id": "nkrpyooi",
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
    "id": "otf7gp1v",
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
    "id": "doosf7xk",
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
    "id": "ptog48if",
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
    "id": "pkfkmcix",
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
    "id": "g0gs1zwu",
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
    "id": "ml0l1qwl",
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
    "id": "t3lcbmvc",
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

  return dao.saveCollection(collection)
})
