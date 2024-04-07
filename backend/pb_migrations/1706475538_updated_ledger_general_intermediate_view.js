/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.options = {
    "query": "SELECT id, created, description, transaction_type, account_type,stock_amount, amount, paid FROM (\nSELECT id, created, description, (CASE WHEN paid == TRUE THEN 'payment' ELSE 'invoice' END) AS transaction_type, type AS account_type,stock_price AS stock_amount, amount AS amount, paid\nFROM payments_view\nUNION ALL\nSELECT id, created, name AS description, 'expense' AS transaction_type, 'cash' AS account_type,0 AS stock_amount, amount AS amount, true AS paid\nFROM expenses)"
  }

  // remove
  collection.schema.removeField("e6ilmn7c")

  // remove
  collection.schema.removeField("lfpvs5r0")

  // remove
  collection.schema.removeField("h6br45hh")

  // remove
  collection.schema.removeField("tqjjndwh")

  // remove
  collection.schema.removeField("iy77wg73")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "u0wy8pry",
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
    "id": "naz16pyr",
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
    "id": "ybrh7jya",
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
    "id": "xh1gm4nk",
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
    "id": "tsowukee",
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
    "id": "javsaz0n",
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
    "query": "SELECT id, created, description, transaction_type, account_type, amount, paid FROM (\nSELECT id, created, description, (CASE WHEN paid == TRUE THEN 'payment' ELSE 'invoice' END) AS transaction_type, type AS account_type, amount AS amount, paid\nFROM payments_view\nUNION ALL\nSELECT id, created, name AS description, 'expense' AS transaction_type, 'cash' AS account_type, amount AS amount, true AS paid\nFROM expenses)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "e6ilmn7c",
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
    "id": "lfpvs5r0",
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
    "id": "h6br45hh",
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
    "id": "tqjjndwh",
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
    "id": "iy77wg73",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("u0wy8pry")

  // remove
  collection.schema.removeField("naz16pyr")

  // remove
  collection.schema.removeField("ybrh7jya")

  // remove
  collection.schema.removeField("xh1gm4nk")

  // remove
  collection.schema.removeField("tsowukee")

  // remove
  collection.schema.removeField("javsaz0n")

  return dao.saveCollection(collection)
})
