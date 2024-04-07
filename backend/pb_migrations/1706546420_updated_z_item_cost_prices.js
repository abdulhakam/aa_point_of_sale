/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ajarcu2lmondmea")

  collection.options = {
    "query": "SELECT t1.id,\nt1.invoice,\nt1.type,\nt1.invoiceNo,\nt1.item,\nt1.price,\nt1.qty,\nt1.scheme,\nt1.discount_1,\nt1.discount_2,\nt1.total,\nt1.deleted,\nt1.created,\nt1.updated\nFROM (SELECT\n  transactions.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100\n        )\n      ) * 1.0 * transactions.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)) * 1.0 * transactions.discount_2 / 100\n    )\n  ) AS total,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id) t1\nLEFT JOIN (SELECT\n  transactions.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100\n        )\n      ) * 1.0 * transactions.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)) * 1.0 * transactions.discount_2 / 100\n    )\n  ) AS total,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id) t2\nON (t1.item = t2.item AND t1.ROWID < t2.ROWID)\nWHERE t2.ROWID IS NULL AND t1.type == 'sending'"
  }

  // remove
  collection.schema.removeField("ght0msdm")

  // remove
  collection.schema.removeField("nxtcacbe")

  // remove
  collection.schema.removeField("dgtve7i3")

  // remove
  collection.schema.removeField("0apwpwua")

  // remove
  collection.schema.removeField("pcdspliq")

  // remove
  collection.schema.removeField("h9ayhboh")

  // remove
  collection.schema.removeField("lkya2ssk")

  // remove
  collection.schema.removeField("50d7mag7")

  // remove
  collection.schema.removeField("0l7tegy9")

  // remove
  collection.schema.removeField("ycdjgvh8")

  // remove
  collection.schema.removeField("j4qbwhmz")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gm2iydzm",
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
    "id": "h6lgavzz",
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
    "id": "2gii6ykh",
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
    "id": "3jdqdn4s",
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
    "id": "8wpyidhr",
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
    "id": "z3dmocrx",
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
    "id": "temdx9kz",
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
    "id": "avrlt7lo",
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
    "id": "dtfzxf26",
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
    "id": "4ncjkiin",
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
    "id": "znkxg1no",
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
    "query": "SELECT t1.id,\nt1.invoice,\nt1.type,\nt1.invoiceNo,\nt1.item,\nt1.price,\nt1.qty,\nt1.scheme,\nt1.discount_1,\nt1.discount_2,\nt1.total,\nt1.deleted,\nt1.created,\nt1.updated\nFROM (SELECT\n  transactions.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100\n        )\n      ) * 1.0 * transactions.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)) * 1.0 * transactions.discount_2 / 100\n    )\n  ) AS total,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id) t1\nLEFT JOIN (SELECT\n  transactions.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100\n        )\n      ) * 1.0 * transactions.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)) * 1.0 * transactions.discount_2 / 100\n    )\n  ) AS total,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id) t2\nON (t1.item = t2.item AND t1.ROWID < t2.ROWID)\nWHERE t2.ROWID IS NULL"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ght0msdm",
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
    "id": "nxtcacbe",
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
    "id": "dgtve7i3",
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
    "id": "0apwpwua",
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
    "id": "pcdspliq",
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
    "id": "h9ayhboh",
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
    "id": "lkya2ssk",
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
    "id": "50d7mag7",
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
    "id": "0l7tegy9",
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
    "id": "ycdjgvh8",
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
    "id": "j4qbwhmz",
    "name": "deleted",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("gm2iydzm")

  // remove
  collection.schema.removeField("h6lgavzz")

  // remove
  collection.schema.removeField("2gii6ykh")

  // remove
  collection.schema.removeField("3jdqdn4s")

  // remove
  collection.schema.removeField("8wpyidhr")

  // remove
  collection.schema.removeField("z3dmocrx")

  // remove
  collection.schema.removeField("temdx9kz")

  // remove
  collection.schema.removeField("avrlt7lo")

  // remove
  collection.schema.removeField("dtfzxf26")

  // remove
  collection.schema.removeField("4ncjkiin")

  // remove
  collection.schema.removeField("znkxg1no")

  return dao.saveCollection(collection)
})
