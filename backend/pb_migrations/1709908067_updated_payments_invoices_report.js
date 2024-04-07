/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  created,\n  updated,\n  payment_date AS dated,\n  payments_view.invoice,\n  payments_view.original_invoices AS original_invoice,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  split_inv.company,\n  party,\n  area,\n  section,\n  party_type,\n  (CASE \n    WHEN type = \"sending\" THEN \"purchase\"\n    WHEN type = \"recieving\" THEN \"sale\"\n    WHEN type = \"return\" THEN \"return\" END) AS type,\n  split_inv.ratio*payments_view.amount as amount,\n  paid,\n  description\nFROM payments_view\n  LEFT JOIN \n  (\n    SELECT \n    invoice,\n    transactions_report.company,\n    SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio\n    FROM transactions_report\n    LEFT JOIN invoice_view ON invoice = invoice_view.id\n    LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n    GROUP BY company, invoice\n  ) AS split_inv ON payments_view.invoice = split_inv.invoice\n  GROUP BY split_inv.company,payments_view.invoice,created\n"
  }

  // remove
  collection.schema.removeField("zblpnp0n")

  // remove
  collection.schema.removeField("ysgkhqt4")

  // remove
  collection.schema.removeField("sasnmqlv")

  // remove
  collection.schema.removeField("xpfg8jmt")

  // remove
  collection.schema.removeField("k9n0uobo")

  // remove
  collection.schema.removeField("bn1mhiko")

  // remove
  collection.schema.removeField("zh5hn6pj")

  // remove
  collection.schema.removeField("wp7skdxs")

  // remove
  collection.schema.removeField("jdyxf4zc")

  // remove
  collection.schema.removeField("pqhtvz29")

  // remove
  collection.schema.removeField("daelbnjd")

  // remove
  collection.schema.removeField("hz0ybdz0")

  // remove
  collection.schema.removeField("cphp3w4x")

  // remove
  collection.schema.removeField("0qvags4y")

  // remove
  collection.schema.removeField("jrnxesje")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gjtqsuds",
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
    "id": "slol5ylk",
    "name": "invoice",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "0pwj3vph7ag7nc2",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "i51pfh4t",
    "name": "original_invoice",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "0pwj3vph7ag7nc2",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": null,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vi1zgnpz",
    "name": "invoiceNo",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "52dlinom",
    "name": "invoice_maker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "_pb_users_auth_",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "87gr02mk",
    "name": "booker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "3dz9ii2wo8d5q8g",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "logevere",
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
    "id": "d1drwncr",
    "name": "party",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "qhdujcbptsh2v29",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "e2uuxret",
    "name": "area",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "tdeikttss6upezc",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fse5huuf",
    "name": "section",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "nlwqqfyu1ur5lpo",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hjhgafeg",
    "name": "party_type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "supplier",
        "customer"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vedph86m",
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
    "id": "rybieyhu",
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
    "id": "vpwnebff",
    "name": "paid",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "istnwvmk",
    "name": "description",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  created,\n  updated,\n  payment_date AS dated,\n  payments_view.invoice,\n  payments_view.original_invoices AS original_invoice,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  split_inv.company,\n  party,\n  party_type,\n  (CASE \n    WHEN type = \"sending\" THEN \"purchase\"\n    WHEN type = \"recieving\" THEN \"sale\"\n    WHEN type = \"return\" THEN \"return\" END) AS type,\n  split_inv.ratio*payments_view.amount as amount,\n  paid,\n  area,\n  section,\n  description\nFROM payments_view\n  LEFT JOIN \n  (\n    SELECT \n    invoice,\n    transactions_report.company,\n    SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio\n    FROM transactions_report\n    LEFT JOIN invoice_view ON invoice = invoice_view.id\n    LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n    GROUP BY company, invoice\n  ) AS split_inv ON payments_view.invoice = split_inv.invoice\n  GROUP BY split_inv.company,payments_view.invoice,created\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zblpnp0n",
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
    "id": "ysgkhqt4",
    "name": "invoice",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "0pwj3vph7ag7nc2",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sasnmqlv",
    "name": "original_invoice",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "0pwj3vph7ag7nc2",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": null,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xpfg8jmt",
    "name": "invoiceNo",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "k9n0uobo",
    "name": "invoice_maker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "_pb_users_auth_",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bn1mhiko",
    "name": "booker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "3dz9ii2wo8d5q8g",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zh5hn6pj",
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
    "id": "wp7skdxs",
    "name": "party",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "qhdujcbptsh2v29",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jdyxf4zc",
    "name": "party_type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "supplier",
        "customer"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pqhtvz29",
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
    "id": "daelbnjd",
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
    "id": "hz0ybdz0",
    "name": "paid",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cphp3w4x",
    "name": "area",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "tdeikttss6upezc",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0qvags4y",
    "name": "section",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "nlwqqfyu1ur5lpo",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jrnxesje",
    "name": "description",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // remove
  collection.schema.removeField("gjtqsuds")

  // remove
  collection.schema.removeField("slol5ylk")

  // remove
  collection.schema.removeField("i51pfh4t")

  // remove
  collection.schema.removeField("vi1zgnpz")

  // remove
  collection.schema.removeField("52dlinom")

  // remove
  collection.schema.removeField("87gr02mk")

  // remove
  collection.schema.removeField("logevere")

  // remove
  collection.schema.removeField("d1drwncr")

  // remove
  collection.schema.removeField("e2uuxret")

  // remove
  collection.schema.removeField("fse5huuf")

  // remove
  collection.schema.removeField("hjhgafeg")

  // remove
  collection.schema.removeField("vedph86m")

  // remove
  collection.schema.removeField("rybieyhu")

  // remove
  collection.schema.removeField("vpwnebff")

  // remove
  collection.schema.removeField("istnwvmk")

  return dao.saveCollection(collection)
})
