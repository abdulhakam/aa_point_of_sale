/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  created,\n  updated,\n  payment_date AS dated,\n  payments_view.invoice,\n  payments_view.original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  split_inv.company,\n  party,\n  party_type,\n  type AS type,\n  split_inv.ratio*payments_view.amount as amount,\n  paid,\n  area,\n  section,\n  description\nFROM payments_view\n  LEFT JOIN \n  (\n    SELECT \n    invoice,\n    transactions_report.company,\n    SUM(transactions_report.net_amount) AS amount,\n    SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio\n    FROM transactions_report\n    LEFT JOIN invoice_view ON invoice = invoice_view.id\n    LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n    GROUP BY company, invoice\n  ) AS split_inv ON payments_view.invoice = split_inv.invoice\n  GROUP BY split_inv.company,payments_view.invoice,created\n"
  }

  // remove
  collection.schema.removeField("dborecll")

  // remove
  collection.schema.removeField("llemchmo")

  // remove
  collection.schema.removeField("rw6pmzkk")

  // remove
  collection.schema.removeField("5vhmhvda")

  // remove
  collection.schema.removeField("uys948wy")

  // remove
  collection.schema.removeField("mov4cyga")

  // remove
  collection.schema.removeField("qn6mi0aj")

  // remove
  collection.schema.removeField("ar8h6ics")

  // remove
  collection.schema.removeField("gtcmmg9d")

  // remove
  collection.schema.removeField("rmu1mo9u")

  // remove
  collection.schema.removeField("v9ryloxt")

  // remove
  collection.schema.removeField("htehoxsg")

  // remove
  collection.schema.removeField("dqn142pt")

  // remove
  collection.schema.removeField("dckzynbj")

  // remove
  collection.schema.removeField("o90by5dx")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8gmnd7gr",
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
    "id": "qr0cpb5b",
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
    "id": "nydql8vk",
    "name": "original_invoices",
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
    "id": "zjj2d8zi",
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
    "id": "rmvqmbom",
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
    "id": "yxzbtn4h",
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
    "id": "m4bvgwf5",
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
    "id": "7ncd9zyl",
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
    "id": "sidwx2qi",
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
    "id": "2wreltyr",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "sending",
        "recieving",
        "return"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "e9ttf1m6",
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
    "id": "emytyfe0",
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
    "id": "uzzb46fs",
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
    "id": "ab5ezx49",
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
    "id": "pcpbvmgl",
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
    "query": "  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  created,\n  updated,\n  payment_date AS dated,\n  payments_view.invoice,\n  payments_view.original_invoices,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  split_inv.company,\n  party,\n  party_type,\n  type AS type,\n  split_inv.ratio*payments_view.amount as amount,\n  paid,\n  split_inv.area,\n  section,\n  description\nFROM payments_view\n  LEFT JOIN \n  (\n    SELECT \n    invoice,\n    transactions_report.area,\n    transactions_report.company,\n    SUM(transactions_report.net_amount) AS amount,\n    SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio\n    FROM transactions_report\n    LEFT JOIN invoice_view ON invoice = invoice_view.id\n    LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n    GROUP BY company, invoice\n  ) AS split_inv ON payments_view.invoice = split_inv.invoice\n  GROUP BY split_inv.company,payments_view.invoice,created\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dborecll",
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
    "id": "llemchmo",
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
    "id": "rw6pmzkk",
    "name": "original_invoices",
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
    "id": "5vhmhvda",
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
    "id": "uys948wy",
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
    "id": "mov4cyga",
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
    "id": "qn6mi0aj",
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
    "id": "ar8h6ics",
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
    "id": "gtcmmg9d",
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
    "id": "rmu1mo9u",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "sending",
        "recieving",
        "return"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "v9ryloxt",
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
    "id": "htehoxsg",
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
    "id": "dqn142pt",
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
    "id": "dckzynbj",
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
    "id": "o90by5dx",
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
  collection.schema.removeField("8gmnd7gr")

  // remove
  collection.schema.removeField("qr0cpb5b")

  // remove
  collection.schema.removeField("nydql8vk")

  // remove
  collection.schema.removeField("zjj2d8zi")

  // remove
  collection.schema.removeField("rmvqmbom")

  // remove
  collection.schema.removeField("yxzbtn4h")

  // remove
  collection.schema.removeField("m4bvgwf5")

  // remove
  collection.schema.removeField("7ncd9zyl")

  // remove
  collection.schema.removeField("sidwx2qi")

  // remove
  collection.schema.removeField("2wreltyr")

  // remove
  collection.schema.removeField("e9ttf1m6")

  // remove
  collection.schema.removeField("emytyfe0")

  // remove
  collection.schema.removeField("uzzb46fs")

  // remove
  collection.schema.removeField("ab5ezx49")

  // remove
  collection.schema.removeField("pcpbvmgl")

  return dao.saveCollection(collection)
})
