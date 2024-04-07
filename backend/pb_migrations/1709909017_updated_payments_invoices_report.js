/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  payments_view.created,\n  payments_view.updated,\n  payment_date AS dated,\n  payments_view.invoice,\n  payments_view.original_invoices AS original_invoice,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  split_inv.company,\n  party,\n  area,\n  section,\n  party_type,\n  (CASE \n    WHEN payments_view.type = \"sending\" THEN \"purchase\"\n    WHEN payments_view.type = \"recieving\" THEN \"sale\"\n    WHEN payments_view.type = \"return\" THEN \"return\" END) AS type,\n  split_inv.ratio*payments_view.amount as amount,\n  paid,\n  payments_view.description\nFROM payments_view\n  LEFT JOIN \n  (\n    SELECT \n    invoice,\n    transactions_report.company,\n    SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio\n    FROM transactions_report\n    LEFT JOIN invoice_view ON invoice = invoice_view.id\n    LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n    GROUP BY company, invoice\n  ) AS split_inv ON payments_view.invoice = split_inv.invoice\n  GROUP BY split_inv.company,payments_view.invoice,payments_view.created\n"
  }

  // remove
  collection.schema.removeField("vylz7tne")

  // remove
  collection.schema.removeField("dbqzambb")

  // remove
  collection.schema.removeField("sd7yxnk5")

  // remove
  collection.schema.removeField("6xlksl0y")

  // remove
  collection.schema.removeField("oj4pd4sn")

  // remove
  collection.schema.removeField("lnhnswbj")

  // remove
  collection.schema.removeField("twahmmvj")

  // remove
  collection.schema.removeField("snxspdsj")

  // remove
  collection.schema.removeField("pzp6i7b6")

  // remove
  collection.schema.removeField("eb15hzyb")

  // remove
  collection.schema.removeField("g7o3nqso")

  // remove
  collection.schema.removeField("v8wohmgm")

  // remove
  collection.schema.removeField("y3qmcwwr")

  // remove
  collection.schema.removeField("uw1udrl4")

  // remove
  collection.schema.removeField("pzc1jmil")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "f3w48j75",
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
    "id": "w7npjvo4",
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
    "id": "yymud6mx",
    "name": "original_invoice",
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
    "id": "sfkr5tyo",
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
    "id": "szpqx9c5",
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
    "id": "6sb65kea",
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
    "id": "nekv4erl",
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
    "id": "u15oear6",
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
    "id": "z7hkfbcu",
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
    "id": "bww3olns",
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
    "id": "vszgpftg",
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
    "id": "tbe2aupe",
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
    "id": "cxcxtcde",
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
    "id": "bd2vq4ck",
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
    "id": "ts4s99bf",
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
    "query": "  SELECT\n  (ROW_NUMBER() OVER()) as id,\n  payments_view.created,\n  payments_view.updated,\n  payment_date AS dated,\n  payments_view.invoice,\n  payments_view.original_invoices AS original_invoice,\n  invoiceNo,\n  invoice_maker,\n  booker,\n  split_inv.company,\n  party,\n  split_inv.area,\n  split_inv.section,\n  party_type,\n  (CASE \n    WHEN payments_view.type = \"sending\" THEN \"purchase\"\n    WHEN payments_view.type = \"recieving\" THEN \"sale\"\n    WHEN payments_view.type = \"return\" THEN \"return\" END) AS type,\n  split_inv.ratio*payments_view.amount as amount,\n  paid,\n  payments_view.description\nFROM payments_view\n  LEFT JOIN \n  (\n    SELECT \n    invoice,\n    transactions_report.company,\n    area,\n    section,\n    SUM(transactions_report.net_amount)/invoice_view.unrounded_total as ratio\n    FROM transactions_report\n    LEFT JOIN invoice_view ON invoice = invoice_view.id\n    LEFT JOIN invoices_return_reference ON invoice = invoices_return_reference.id\n    GROUP BY company, invoice\n  ) AS split_inv ON payments_view.invoice = split_inv.invoice\n  GROUP BY split_inv.company,payments_view.invoice,payments_view.created\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vylz7tne",
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
    "id": "dbqzambb",
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
    "id": "sd7yxnk5",
    "name": "original_invoice",
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
    "id": "6xlksl0y",
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
    "id": "oj4pd4sn",
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
    "id": "lnhnswbj",
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
    "id": "twahmmvj",
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
    "id": "snxspdsj",
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
    "id": "pzp6i7b6",
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
    "id": "eb15hzyb",
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
    "id": "g7o3nqso",
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
    "id": "v8wohmgm",
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
    "id": "y3qmcwwr",
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
    "id": "uw1udrl4",
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
    "id": "pzc1jmil",
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
  collection.schema.removeField("f3w48j75")

  // remove
  collection.schema.removeField("w7npjvo4")

  // remove
  collection.schema.removeField("yymud6mx")

  // remove
  collection.schema.removeField("sfkr5tyo")

  // remove
  collection.schema.removeField("szpqx9c5")

  // remove
  collection.schema.removeField("6sb65kea")

  // remove
  collection.schema.removeField("nekv4erl")

  // remove
  collection.schema.removeField("u15oear6")

  // remove
  collection.schema.removeField("z7hkfbcu")

  // remove
  collection.schema.removeField("bww3olns")

  // remove
  collection.schema.removeField("vszgpftg")

  // remove
  collection.schema.removeField("tbe2aupe")

  // remove
  collection.schema.removeField("cxcxtcde")

  // remove
  collection.schema.removeField("bd2vq4ck")

  // remove
  collection.schema.removeField("ts4s99bf")

  return dao.saveCollection(collection)
})
