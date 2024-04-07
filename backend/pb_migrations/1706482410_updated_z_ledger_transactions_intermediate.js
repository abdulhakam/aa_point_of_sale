/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.options = {
    "query": "SELECT id,invoiceNo, created, description, transaction_type, account_type,stock_amount, amount, paid FROM (\nSELECT id,invoiceNo, created, description, (CASE WHEN paid == TRUE THEN 'payment' ELSE 'invoice' END) AS transaction_type, type AS account_type,stock_price AS stock_amount, amount AS amount, paid\nFROM payments_view\nUNION ALL\nSELECT id,'N/A' AS invoiceNo, created, name AS description, 'expense' AS transaction_type, 'cash' AS account_type,0 AS stock_amount, amount AS amount, true AS paid\nFROM expenses)"
  }

  // remove
  collection.schema.removeField("hgxg6rnq")

  // remove
  collection.schema.removeField("nyfbn5id")

  // remove
  collection.schema.removeField("iduk2u4d")

  // remove
  collection.schema.removeField("c3jkf0sk")

  // remove
  collection.schema.removeField("rclg5sy9")

  // remove
  collection.schema.removeField("v75xhqh1")

  // remove
  collection.schema.removeField("mxrl15xx")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wpey0l31",
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
    "id": "hrmlw0jn",
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
    "id": "tth826tw",
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
    "id": "sooaxqlu",
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
    "id": "gdiflzse",
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
    "id": "yvuxcw6a",
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
    "id": "dqtzvgcy",
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
    "query": "SELECT id,invoiceNo, created, description, transaction_type, account_type,stock_amount, amount, paid FROM (\nSELECT id,invoiceNo, created, description, (CASE WHEN paid == TRUE THEN 'payment' ELSE 'invoice' END) AS transaction_type, type AS account_type,stock_price AS stock_amount, amount AS amount, paid\nFROM payments_view\nUNION ALL\nSELECT id,NULL AS invoiceNo, created, name AS description, 'expense' AS transaction_type, 'cash' AS account_type,0 AS stock_amount, amount AS amount, true AS paid\nFROM expenses)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hgxg6rnq",
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
    "id": "nyfbn5id",
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
    "id": "iduk2u4d",
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
    "id": "c3jkf0sk",
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
    "id": "rclg5sy9",
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
    "id": "v75xhqh1",
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
    "id": "mxrl15xx",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("wpey0l31")

  // remove
  collection.schema.removeField("hrmlw0jn")

  // remove
  collection.schema.removeField("tth826tw")

  // remove
  collection.schema.removeField("sooaxqlu")

  // remove
  collection.schema.removeField("gdiflzse")

  // remove
  collection.schema.removeField("yvuxcw6a")

  // remove
  collection.schema.removeField("dqtzvgcy")

  return dao.saveCollection(collection)
})
