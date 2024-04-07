/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH\n  company_invoice AS (\n    SELECT\n      transactions_report.invoice,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      FALSE AS paid\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n  )\nSELECT\n  id,\n  dated,\n  created,\n  updated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  (\n    CASE\n      WHEN type = \"sale\" || \"purchase\" THEN type\n      ELSE (\n        CASE\n          WHEN type = \"sending\" THEN \"purchase\"\n          ELSE (\n            CASE\n              WHEN type = \"recieving\" THEN \"sale\"\n              ELSE type\n            END\n          )\n        END\n      )\n    END\n  ) as type,\n  ratio,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n  (\n    -- SELECT\n    --   (ROW_NUMBER() OVER ()) as id,\n    --   invoice_view.dated,\n    --   invoice_view.created,\n    --   invoice_view.updated,\n    --   transactions_report.invoice,\n    --   invoices_return_reference.original_invoices,\n    --   invoice_view.invoiceNo,\n    --   invoice_view.invoice_maker,\n    --   invoice_view.booker,\n    --   transactions_report.company,\n    --   invoice_view.party,\n    --   transactions_report.party_type,\n    --   invoice_view.type,\n    --   SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n    --   SUM(transactions_report.net_amount) - (\n    --     SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n    --   ) AS amount,\n    --   FALSE AS paid,\n    --   parties.area,\n    --   areas.section,\n    --   \"-\" AS description\n    -- FROM\n    --   transactions_report\n    --   LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n    --   LEFT JOIN parties ON transactions_report.party = parties.id\n    --   LEFT JOIN areas ON parties.area = areas.id\n    --   LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    -- GROUP BY\n    --   transactions_report.company,\n    --   transactions_report.invoice\n    -- UNION ALL\n    \n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN transactions_report ON payments.invoice = transactions_report.invoice\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )"
  }

  // remove
  collection.schema.removeField("4krd5dzo")

  // remove
  collection.schema.removeField("rvtt2euk")

  // remove
  collection.schema.removeField("crirgfzw")

  // remove
  collection.schema.removeField("zlbokbmh")

  // remove
  collection.schema.removeField("x68z1yq5")

  // remove
  collection.schema.removeField("ibzza6na")

  // remove
  collection.schema.removeField("rsvvelvb")

  // remove
  collection.schema.removeField("4k1mmrrs")

  // remove
  collection.schema.removeField("xsa33jdg")

  // remove
  collection.schema.removeField("2l7fwtvu")

  // remove
  collection.schema.removeField("qzjt6515")

  // remove
  collection.schema.removeField("1smcvuaz")

  // remove
  collection.schema.removeField("e2sodrwf")

  // remove
  collection.schema.removeField("ksvauche")

  // remove
  collection.schema.removeField("qdahbaj5")

  // remove
  collection.schema.removeField("hwwyqjbv")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nzub8kwt",
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
    "id": "ftpvagyf",
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
    "id": "awzsp4oa",
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
    "id": "f2zbj1bk",
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
    "id": "5abgaej9",
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
    "id": "7ohfhd92",
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
    "id": "nfvxns3t",
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
    "id": "iagpzic2",
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
    "id": "dnreqgt4",
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
    "id": "1ssaw3vy",
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
    "id": "hnyvvola",
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
    "id": "ups7ilzc",
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
    "id": "syqhs69k",
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
    "id": "xkjvhdpa",
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
    "id": "dwxs9i1n",
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
    "id": "kxolebyv",
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
    "query": "WITH\n  company_invoice AS (\n    SELECT\n      transactions_report.invoice,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      FALSE AS paid\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n  )\nSELECT\n  id,\n  dated,\n  created,\n  updated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  (\n    CASE\n      WHEN type = \"sale\" || \"purchase\" THEN type\n      ELSE (\n        CASE\n          WHEN type = \"sending\" THEN \"purchase\"\n          ELSE (\n            CASE\n              WHEN type = \"recieving\" THEN \"sale\"\n              ELSE type\n            END\n          )\n        END\n      )\n    END\n  ) as type,\n  ratio,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n  (\n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n    UNION ALL\n    \n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN transactions_report ON payments.invoice = transactions_report.invoice\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4krd5dzo",
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
    "id": "rvtt2euk",
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
    "id": "crirgfzw",
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
    "id": "zlbokbmh",
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
    "id": "x68z1yq5",
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
    "id": "ibzza6na",
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
    "id": "rsvvelvb",
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
    "id": "4k1mmrrs",
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
    "id": "xsa33jdg",
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
    "id": "2l7fwtvu",
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
    "id": "qzjt6515",
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
    "id": "1smcvuaz",
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
    "id": "e2sodrwf",
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
    "id": "ksvauche",
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
    "id": "qdahbaj5",
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
    "id": "hwwyqjbv",
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
  collection.schema.removeField("nzub8kwt")

  // remove
  collection.schema.removeField("ftpvagyf")

  // remove
  collection.schema.removeField("awzsp4oa")

  // remove
  collection.schema.removeField("f2zbj1bk")

  // remove
  collection.schema.removeField("5abgaej9")

  // remove
  collection.schema.removeField("7ohfhd92")

  // remove
  collection.schema.removeField("nfvxns3t")

  // remove
  collection.schema.removeField("iagpzic2")

  // remove
  collection.schema.removeField("dnreqgt4")

  // remove
  collection.schema.removeField("1ssaw3vy")

  // remove
  collection.schema.removeField("hnyvvola")

  // remove
  collection.schema.removeField("ups7ilzc")

  // remove
  collection.schema.removeField("syqhs69k")

  // remove
  collection.schema.removeField("xkjvhdpa")

  // remove
  collection.schema.removeField("dwxs9i1n")

  // remove
  collection.schema.removeField("kxolebyv")

  return dao.saveCollection(collection)
})
