/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.options = {
    "query": "SELECT id, created, description, transaction_type, account_type, amount, paid FROM (\nSELECT id, created, description, (CASE WHEN paid == TRUE THEN 'payment' ELSE 'invoice' END) AS transaction_type, type AS account_type, amount AS amount, paid\nFROM payments_view\nUNION ALL\nSELECT id, created, name AS description, 'expense' AS transaction_type, 'cash' AS account_type, amount AS amount, true AS paid\nFROM expenses)"
  }

  // remove
  collection.schema.removeField("fp8r0xi4")

  // remove
  collection.schema.removeField("wz3l0xhz")

  // remove
  collection.schema.removeField("yrc8lytj")

  // remove
  collection.schema.removeField("qacddo0p")

  // remove
  collection.schema.removeField("ryi9n09s")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.options = {
    "query": "SELECT id, created, description, transaction_type, account_type, amount, paid FROM (\nSELECT id, created, description, 'payment' AS transaction_type, type AS account_type, amount AS amount, paid\nFROM payments_view\nUNION ALL\nSELECT id, created, name AS description, 'expense' AS transaction_type, 'cash' AS account_type, amount AS amount, true AS paid\nFROM expenses)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fp8r0xi4",
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
    "id": "wz3l0xhz",
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
    "id": "yrc8lytj",
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
    "id": "qacddo0p",
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
    "id": "ryi9n09s",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

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

  return dao.saveCollection(collection)
})
