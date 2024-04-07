/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.options = {
    "query": "SELECT id,invoiceNo, created, description, transaction_type, account_type,stock_amount, amount, paid FROM (\nSELECT id,\n  invoiceNo,\n  created,\n  description,\n  (CASE WHEN paid == TRUE THEN 'payment' ELSE 'invoice' END) AS \n  transaction_type,\n  type AS account_type,\n  stock_price AS stock_amount,\n  amount AS amount,\n  paid\nFROM payments_view\nUNION ALL\nSELECT id,\n  'N/A' AS invoiceNo,\n   created,\n   name AS description,\n   'expense' AS transaction_type,\n   'cash' AS account_type,\n   0 AS stock_amount, \n   amount AS amount, \n   true AS paid\nFROM expenses)"
  }

  // remove
  collection.schema.removeField("nvjp4p7r")

  // remove
  collection.schema.removeField("uannui8e")

  // remove
  collection.schema.removeField("hbk2uby4")

  // remove
  collection.schema.removeField("kfhp3xqw")

  // remove
  collection.schema.removeField("1ql7ke1l")

  // remove
  collection.schema.removeField("fndy48nj")

  // remove
  collection.schema.removeField("rbdarfdp")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gqdfrcw9",
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
    "id": "rulo8ks5",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lcrsotus",
    "name": "transaction_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vqcsg3gk",
    "name": "account_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "x2i6mucy",
    "name": "stock_amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zyhziz7c",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "x2rpkjh7",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.options = {
    "query": "SELECT id,invoiceNo, created, description, transaction_type, account_type,stock_amount, amount, paid FROM (\nSELECT id,\n  invoiceNo,\n  created,\n  description,\n  (CASE WHEN paid == TRUE THEN (CASE WHEN type == 'sending' THEN \n  'payment(sending)'ELSE 'payment(receiving)'END) ELSE 'invoice' END) AS \n  transaction_type,\n  type AS account_type,\n  stock_price AS stock_amount,\n  amount AS amount,\n  paid\nFROM payments_view\nUNION ALL\nSELECT id,\n  'N/A' AS invoiceNo,\n   created,\n   name AS description,\n   'expense' AS transaction_type,\n   'cash' AS account_type,\n   0 AS stock_amount, \n   amount AS amount, \n   true AS paid\nFROM expenses)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nvjp4p7r",
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
    "id": "uannui8e",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hbk2uby4",
    "name": "transaction_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kfhp3xqw",
    "name": "account_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1ql7ke1l",
    "name": "stock_amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fndy48nj",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rbdarfdp",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("gqdfrcw9")

  // remove
  collection.schema.removeField("rulo8ks5")

  // remove
  collection.schema.removeField("lcrsotus")

  // remove
  collection.schema.removeField("vqcsg3gk")

  // remove
  collection.schema.removeField("x2i6mucy")

  // remove
  collection.schema.removeField("zyhziz7c")

  // remove
  collection.schema.removeField("x2rpkjh7")

  return dao.saveCollection(collection)
})
