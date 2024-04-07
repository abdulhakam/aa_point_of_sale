/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ajarcu2lmondmea")

  collection.options = {
    "query": "SELECT t1.id,\nt1.invoice,\nt1.type,\nt1.invoiceNo,\nt1.item,\nt1.price,\nt1.qty,\nt1.scheme,\nt1.discount_1,\nt1.discount_2,\nt1.total,\nt1.deleted,\nt1.created,\nt1.updated\nFROM (SELECT\n  transaction_view.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  -- (((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100)\n  --   ) - (\n  --     ((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100\n  --       )\n  --     ) * 1.0 * transaction_view.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transaction_view.discount_1,\n  transaction_view.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)) * 1.0 * transaction_view.discount_2 / 100\n    )\n  ) AS total,\n  transaction_view.deleted,\n  transaction_view.created,\n  transaction_view.updated\nFROM\n  transaction_view\n  JOIN invoices ON transaction_view.invoice = invoices.id) t1\nLEFT JOIN (SELECT\n  transaction_view.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  -- (((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100)\n  --   ) - (\n  --     ((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100\n  --       )\n  --     ) * 1.0 * transaction_view.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transaction_view.discount_1,\n  transaction_view.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)) * 1.0 * transaction_view.discount_2 / 100\n    )\n  ) AS total,\n  transaction_view.deleted,\n  transaction_view.created,\n  transaction_view.updated\nFROM\n  transaction_view\n  JOIN invoices ON transaction_view.invoice = invoices.id) t2\nON (t1.item = t2.item AND t1.ROWID < t2.ROWID)\nWHERE t2.ROWID IS NULL "
  }

  // remove
  collection.schema.removeField("rhpkdxpj")

  // remove
  collection.schema.removeField("g6s99otv")

  // remove
  collection.schema.removeField("oq0r1kt6")

  // remove
  collection.schema.removeField("yyfo6jbg")

  // remove
  collection.schema.removeField("hscs1syr")

  // remove
  collection.schema.removeField("iivkgy3h")

  // remove
  collection.schema.removeField("kijpwxdn")

  // remove
  collection.schema.removeField("81dfbkdf")

  // remove
  collection.schema.removeField("p7nxgxqj")

  // remove
  collection.schema.removeField("t00neuxd")

  // remove
  collection.schema.removeField("vgnzj0th")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "h8xhel0k",
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
    "id": "maydj3g1",
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
    "id": "htkxrffz",
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
    "id": "yoe9hv1n",
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
    "id": "zm68lbr6",
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
    "id": "iceyvi3k",
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
    "id": "wmbox5cj",
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
    "id": "rcg8fxv6",
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
    "id": "t5vkg2nz",
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
    "id": "3rmztler",
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
    "id": "k6pc4dce",
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
    "query": "SELECT t1.id,\nt1.invoice,\nt1.type,\nt1.invoiceNo,\nt1.item,\nt1.price,\nt1.qty,\nt1.scheme,\nt1.discount_1,\nt1.discount_2,\nt1.total,\nt1.deleted,\nt1.created,\nt1.updated\nFROM (SELECT\n  transaction_view.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  -- (((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100)\n  --   ) - (\n  --     ((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100\n  --       )\n  --     ) * 1.0 * transaction_view.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transaction_view.discount_1,\n  transaction_view.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)) * 1.0 * transaction_view.discount_2 / 100\n    )\n  ) AS total,\n  transaction_view.deleted,\n  transaction_view.created,\n  transaction_view.updated\nFROM\n  transaction_view\n  JOIN invoices ON transaction_view.invoice = invoices.id) t1\nLEFT JOIN (SELECT\n  transaction_view.id,\n  (ROW_NUMBER() OVER()) as ROWID,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  -- (((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100)\n  --   ) - (\n  --     ((cost_price * qty) - ((qty * cost_price) * 1.0 * transaction_view.discount_1 / 100\n  --       )\n  --     ) * 1.0 * transaction_view.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transaction_view.discount_1,\n  transaction_view.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transaction_view.discount_1 / 100)) * 1.0 * transaction_view.discount_2 / 100\n    )\n  ) AS total,\n  transaction_view.deleted,\n  transaction_view.created,\n  transaction_view.updated\nFROM\n  transaction_view\n  JOIN invoices ON transaction_view.invoice = invoices.id) t2\nON (t1.item = t2.item AND t1.ROWID < t2.ROWID)\nWHERE t2.ROWID IS NULL & t1.type == 'sending'"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rhpkdxpj",
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
    "id": "g6s99otv",
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
    "id": "oq0r1kt6",
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
    "id": "yyfo6jbg",
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
    "id": "hscs1syr",
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
    "id": "iivkgy3h",
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
    "id": "kijpwxdn",
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
    "id": "81dfbkdf",
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
    "id": "p7nxgxqj",
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
    "id": "t00neuxd",
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
    "id": "vgnzj0th",
    "name": "deleted",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("h8xhel0k")

  // remove
  collection.schema.removeField("maydj3g1")

  // remove
  collection.schema.removeField("htkxrffz")

  // remove
  collection.schema.removeField("yoe9hv1n")

  // remove
  collection.schema.removeField("zm68lbr6")

  // remove
  collection.schema.removeField("iceyvi3k")

  // remove
  collection.schema.removeField("wmbox5cj")

  // remove
  collection.schema.removeField("rcg8fxv6")

  // remove
  collection.schema.removeField("t5vkg2nz")

  // remove
  collection.schema.removeField("3rmztler")

  // remove
  collection.schema.removeField("k6pc4dce")

  return dao.saveCollection(collection)
})
