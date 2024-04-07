/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ajarcu2lmondmea")

  collection.options = {
    "query": "SELECT t1.id,\nt1.invoice,\nt1.type,\nt1.invoiceNo,\nt1.item,\nt1.price,\nt1.qty,\nt1.scheme,\nt1.discount_1,\nt1.discount_2,\nt1.total,\nt1.deleted,\nt1.created,\nt1.updated\nFROM (SELECT\n  transactions.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100\n        )\n      ) * 1.0 * transactions.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)) * 1.0 * transactions.discount_2 / 100\n    )\n  ) AS total,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id) t1\nLEFT JOIN (SELECT\n  transactions.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100\n        )\n      ) * 1.0 * transactions.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)) * 1.0 * transactions.discount_2 / 100\n    )\n  ) AS total,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id) t2\nON (t1.item = t2.item AND t1.ROWID < t2.ROWID)\nWHERE t2.ROWID IS NULL"
  }

  // remove
  collection.schema.removeField("umsdapgm")

  // remove
  collection.schema.removeField("omvda3uz")

  // remove
  collection.schema.removeField("tooppvux")

  // remove
  collection.schema.removeField("m8ytispr")

  // remove
  collection.schema.removeField("71dunpde")

  // remove
  collection.schema.removeField("uu9rnbl2")

  // remove
  collection.schema.removeField("e5m9dl3v")

  // remove
  collection.schema.removeField("u2qycut0")

  // remove
  collection.schema.removeField("mrhiofbw")

  // remove
  collection.schema.removeField("tr99audf")

  // remove
  collection.schema.removeField("49qpr1gi")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "klaw0swa",
    "name": "invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "7nrjcclq",
    "name": "type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "5t5nmrhd",
    "name": "invoiceNo",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "eghg8zin",
    "name": "item",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ygmcygvr",
    "name": "price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rcagyyql",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8mzloq2k",
    "name": "scheme",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zjge6yhx",
    "name": "discount_1",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "c00yyqws",
    "name": "discount_2",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "z6khtszk",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "teunj5ru",
    "name": "deleted",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ajarcu2lmondmea")

  collection.options = {
    "query": "SELECT t1.id,\nt1.invoice,\nt1.type,\nt1.invoiceNo,\nt1.item,\nt1.price,\nt1.qty,\nt1.scheme,\nt1.discount_1,\nt1.discount_2,\nt1.total,\nt1.deleted,\nt1.created,\nt1.updated\nFROM (SELECT\n  transactions.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100\n        )\n      ) * 1.0 * transactions.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)) * 1.0 * transactions.discount_2 / 100\n    )\n  ) AS total,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id) t1\nLEFT JOIN (SELECT\n  transactions.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100\n        )\n      ) * 1.0 * transactions.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)) * 1.0 * transactions.discount_2 / 100\n    )\n  ) AS total,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id) t2\nON (t1.item = t2.item AND t1.ROWID < t2.ROWID)\nWHERE t2.ROWID IS NULL & t1.type == 'sending'"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "umsdapgm",
    "name": "invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "omvda3uz",
    "name": "type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tooppvux",
    "name": "invoiceNo",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "m8ytispr",
    "name": "item",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "71dunpde",
    "name": "price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uu9rnbl2",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "e5m9dl3v",
    "name": "scheme",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "u2qycut0",
    "name": "discount_1",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mrhiofbw",
    "name": "discount_2",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tr99audf",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "49qpr1gi",
    "name": "deleted",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("klaw0swa")

  // remove
  collection.schema.removeField("7nrjcclq")

  // remove
  collection.schema.removeField("5t5nmrhd")

  // remove
  collection.schema.removeField("eghg8zin")

  // remove
  collection.schema.removeField("ygmcygvr")

  // remove
  collection.schema.removeField("rcagyyql")

  // remove
  collection.schema.removeField("8mzloq2k")

  // remove
  collection.schema.removeField("zjge6yhx")

  // remove
  collection.schema.removeField("c00yyqws")

  // remove
  collection.schema.removeField("z6khtszk")

  // remove
  collection.schema.removeField("teunj5ru")

  return dao.saveCollection(collection)
})
