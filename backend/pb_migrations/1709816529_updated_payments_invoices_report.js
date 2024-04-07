/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "WITH\n  company_invoice AS (\n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n  ),\n  payments_view AS (\n    SELECT\n      payments.id,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      company_invoice.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )\nSELECT\n  id,\n  dated,\n  created,\n  updated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  (\n    CASE\n      WHEN type = \"sale\" || \"purchase\" THEN type\n      ELSE (\n        CASE\n          WHEN type = \"sending\" THEN \"purchase\"\n          ELSE (\n            CASE\n              WHEN type = \"recieving\" THEN \"sale\"\n              ELSE type\n            END\n          )\n        END\n      )\n    END\n  ) as type,\n  ratio,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n  (\n    \n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n    UNION ALL\n    SELECT\n      id,\n      created,\n      updated,\n      dated,\n      invoice,\n      original_invoices,\n      invoiceNo,\n      invoice_maker,\n      booker,\n      company,\n      party,\n      party_type,\n      type,\n      amount AS ratio,\n      amount,\n      paid,\n      area,\n      section,\n      description\n    FROM\n      payments_view\n  )"
  }

  // remove
  collection.schema.removeField("uc2giuju")

  // remove
  collection.schema.removeField("ao5hnhvb")

  // remove
  collection.schema.removeField("tmytjznk")

  // remove
  collection.schema.removeField("i5yf9vfp")

  // remove
  collection.schema.removeField("iuq0qwpn")

  // remove
  collection.schema.removeField("5gwni69d")

  // remove
  collection.schema.removeField("dbajiqc6")

  // remove
  collection.schema.removeField("jnhszjmv")

  // remove
  collection.schema.removeField("xzgmmjog")

  // remove
  collection.schema.removeField("0bzzsifr")

  // remove
  collection.schema.removeField("7r8vef5m")

  // remove
  collection.schema.removeField("ugonoftg")

  // remove
  collection.schema.removeField("xg7que0q")

  // remove
  collection.schema.removeField("qb9uqubk")

  // remove
  collection.schema.removeField("aho6j9cr")

  // remove
  collection.schema.removeField("dnpmygps")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kphl9siu",
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
    "id": "4agj9dv6",
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
    "id": "kcqpphmr",
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
    "id": "3pttjuh8",
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
    "id": "t3nhnf7y",
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
    "id": "b63eblya",
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
    "id": "4xgplcij",
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
    "id": "yusk2ygi",
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
    "id": "y72qpw1l",
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
    "id": "gllqzvuj",
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
    "id": "57n68vp9",
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
    "id": "u0fqvisu",
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
    "id": "3owcxtcj",
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
    "id": "mzp7vdgj",
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
    "id": "mtseacvr",
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
    "id": "rbuws5if",
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
    "query": "WITH\n  company_invoice AS (\n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n  ),\n  payments_view AS (\n    SELECT\n      payments.id,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS dated,\n      payments.created,\n      payments.updated,\n      (\n        CASE\n          WHEN payments.payment_date = \"\" THEN payments.created\n          ELSE payments.payment_date\n        END\n      ) AS payment_date,\n      payments.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      company_invoice.company,\n      payments.party AS party,\n      parties.type AS party_type,\n      payments.type AS type,\n      company_invoice.ratio,\n      COALESCE(\n        (\n          CASE\n            WHEN payments.amount <> 0 THEN payments.amount\n            ELSE invoice_view.final_total\n          END\n        ),\n        0\n      ) * company_invoice.ratio AS amount,\n      payments.paid,\n      parties.area,\n      areas.section,\n      payments.description\n    FROM\n      payments\n      LEFT JOIN invoice_view ON payments.invoice = invoice_view.id\n      LEFT JOIN parties ON payments.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN sections ON areas.section = sections.id\n      LEFT JOIN order_bookers ON invoice_view.booker = order_bookers.id\n      LEFT JOIN invoices_return_reference ON invoices_return_reference.id = payments.id\n      LEFT JOIN company_invoice ON payments.invoice = company_invoice.invoice\n    WHERE\n      payments.description = \"payment\"\n  )\nSELECT\n  id,\n  dated,\n  created,\n  updated,\n  invoice,\n  original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  company,\n  party,\n  party_type,\n  (\n    CASE\n      WHEN type = \"sale\" || \"purchase\" THEN type\n      ELSE (\n        CASE\n          WHEN type = \"sending\" THEN \"purchase\"\n          ELSE (\n            CASE\n              WHEN type = \"recieving\" THEN \"sale\"\n              ELSE type\n            END\n          )\n        END\n      )\n    END\n  ) as type,\n  ratio,\n  amount,\n  paid,\n  area,\n  section,\n  description\nFROM\n  (\n    \n    SELECT\n      (ROW_NUMBER() OVER ()) as id,\n      invoice_view.dated,\n      invoice_view.created,\n      invoice_view.updated,\n      transactions_report.invoice,\n      invoices_return_reference.original_invoices,\n      invoice_view.invoiceNo,\n      invoice_view.invoice_maker,\n      invoice_view.booker,\n      transactions_report.company,\n      invoice_view.party,\n      transactions_report.party_type,\n      invoice_view.type,\n      SUM(transactions_report.net_amount) / invoice_view.unrounded_total AS ratio,\n      SUM(transactions_report.net_amount) - (\n        SUM(transactions_report.net_amount) / invoice_view.unrounded_total * invoice_view.discount_rs\n      ) AS amount,\n      FALSE AS paid,\n      parties.area,\n      areas.section,\n      \"-\" AS description\n    FROM\n      transactions_report\n      LEFT JOIN invoices_return_reference ON transactions_report.invoice = invoices_return_reference.id\n      LEFT JOIN parties ON transactions_report.party = parties.id\n      LEFT JOIN areas ON parties.area = areas.id\n      LEFT JOIN invoice_view ON transactions_report.invoice = invoice_view.id\n    GROUP BY\n      transactions_report.company,\n      transactions_report.invoice\n    UNION ALL\n    SELECT\n      id,\n      created,\n      updated,\n      dated,\n      invoice,\n      original_invoices,\n      invoiceNo,\n      invoice_maker,\n      booker,\n      company,\n      party,\n      party_type,\n      type,\n      amount AS ratio,\n      amount,\n      paid,\n      area,\n      section,\n      description\n    FROM\n      payments_view\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uc2giuju",
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
    "id": "ao5hnhvb",
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
    "id": "tmytjznk",
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
    "id": "i5yf9vfp",
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
    "id": "iuq0qwpn",
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
    "id": "5gwni69d",
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
    "id": "dbajiqc6",
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
    "id": "jnhszjmv",
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
    "id": "xzgmmjog",
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
    "id": "0bzzsifr",
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
    "id": "7r8vef5m",
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
    "id": "ugonoftg",
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
    "id": "xg7que0q",
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
    "id": "qb9uqubk",
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
    "id": "aho6j9cr",
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
    "id": "dnpmygps",
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
  collection.schema.removeField("kphl9siu")

  // remove
  collection.schema.removeField("4agj9dv6")

  // remove
  collection.schema.removeField("kcqpphmr")

  // remove
  collection.schema.removeField("3pttjuh8")

  // remove
  collection.schema.removeField("t3nhnf7y")

  // remove
  collection.schema.removeField("b63eblya")

  // remove
  collection.schema.removeField("4xgplcij")

  // remove
  collection.schema.removeField("yusk2ygi")

  // remove
  collection.schema.removeField("y72qpw1l")

  // remove
  collection.schema.removeField("gllqzvuj")

  // remove
  collection.schema.removeField("57n68vp9")

  // remove
  collection.schema.removeField("u0fqvisu")

  // remove
  collection.schema.removeField("3owcxtcj")

  // remove
  collection.schema.removeField("mzp7vdgj")

  // remove
  collection.schema.removeField("mtseacvr")

  // remove
  collection.schema.removeField("rbuws5if")

  return dao.saveCollection(collection)
})
