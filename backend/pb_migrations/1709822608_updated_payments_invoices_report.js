/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH\n  company_invoice AS (\n    SELECT\n      transactions_report.invoice,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      FALSE AS paid\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n  )\nSELECT\n  id,\n  dated,\n  created,\n  updated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  (\n    CASE\n      WHEN type = \"sale\" || \"purchase\" THEN type\n      ELSE (\n        CASE\n          WHEN type = \"sending\" THEN \"purchase\"\n          ELSE (\n            CASE\n              WHEN type = \"recieving\" THEN \"sale\"\n              ELSE type\n            END\n          )\n        END\n      )\n    END\n  ) as type,\n  ratio,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n  (\n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n    UNION\n    \n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN transactions_report ON payments.invoice = transactions_report.invoice\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )"
  }

  // remove
  collection.schema.removeField("tlcw0gqa")

  // remove
  collection.schema.removeField("0cqq2ks8")

  // remove
  collection.schema.removeField("oxohxhsm")

  // remove
  collection.schema.removeField("j8ppo6ku")

  // remove
  collection.schema.removeField("sfvxswol")

  // remove
  collection.schema.removeField("yug4bubk")

  // remove
  collection.schema.removeField("wwwzttdd")

  // remove
  collection.schema.removeField("3xfwithk")

  // remove
  collection.schema.removeField("m36flflc")

  // remove
  collection.schema.removeField("q9hyi2up")

  // remove
  collection.schema.removeField("shjku5ec")

  // remove
  collection.schema.removeField("astyjmyd")

  // remove
  collection.schema.removeField("dmbxhdbm")

  // remove
  collection.schema.removeField("8o68mju4")

  // remove
  collection.schema.removeField("gmfmhv2r")

  // remove
  collection.schema.removeField("idzdvcjr")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rnw7vkzl",
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
    "id": "1soetvlp",
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
    "id": "efel453b",
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
    "id": "tmpjrsfo",
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
    "id": "tnsa2nin",
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
    "id": "yhpjyvoq",
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
    "id": "pziirip7",
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
    "id": "8zbk8mqk",
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
    "id": "lgacbfgf",
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
    "id": "f09fnx0g",
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
    "id": "cb1sslu4",
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
    "id": "8ucwqofa",
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
    "id": "q5awd9la",
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
    "id": "vmggxyog",
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
    "id": "2qwemkgw",
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
    "id": "i4zwnzc5",
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
    "query": "WITH\n  company_invoice AS (\n    SELECT\n      transactions_report.invoice,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      FALSE AS paid\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n  )\nSELECT\n  id,\n  dated,\n  created,\n  updated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  (\n    CASE\n      WHEN type = \"sale\" || \"purchase\" THEN type\n      ELSE (\n        CASE\n          WHEN type = \"sending\" THEN \"purchase\"\n          ELSE (\n            CASE\n              WHEN type = \"recieving\" THEN \"sale\"\n              ELSE type\n            END\n          )\n        END\n      )\n    END\n  ) as type,\n  ratio,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n  (\n    \n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n    UNION ALL\n    \n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN transactions_report ON payments.invoice = transactions_report.invoice\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tlcw0gqa",
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
    "id": "0cqq2ks8",
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
    "id": "oxohxhsm",
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
    "id": "j8ppo6ku",
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
    "id": "sfvxswol",
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
    "id": "yug4bubk",
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
    "id": "wwwzttdd",
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
    "id": "3xfwithk",
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
    "id": "m36flflc",
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
    "id": "q9hyi2up",
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
    "id": "shjku5ec",
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
    "id": "astyjmyd",
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
    "id": "dmbxhdbm",
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
    "id": "8o68mju4",
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
    "id": "gmfmhv2r",
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
    "id": "idzdvcjr",
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
  collection.schema.removeField("rnw7vkzl")

  // remove
  collection.schema.removeField("1soetvlp")

  // remove
  collection.schema.removeField("efel453b")

  // remove
  collection.schema.removeField("tmpjrsfo")

  // remove
  collection.schema.removeField("tnsa2nin")

  // remove
  collection.schema.removeField("yhpjyvoq")

  // remove
  collection.schema.removeField("pziirip7")

  // remove
  collection.schema.removeField("8zbk8mqk")

  // remove
  collection.schema.removeField("lgacbfgf")

  // remove
  collection.schema.removeField("f09fnx0g")

  // remove
  collection.schema.removeField("cb1sslu4")

  // remove
  collection.schema.removeField("8ucwqofa")

  // remove
  collection.schema.removeField("q5awd9la")

  // remove
  collection.schema.removeField("vmggxyog")

  // remove
  collection.schema.removeField("2qwemkgw")

  // remove
  collection.schema.removeField("i4zwnzc5")

  return dao.saveCollection(collection)
})
