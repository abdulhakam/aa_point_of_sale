/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1")

  collection.options = {
    "query": "SELECT id, created, description, transaction_type, account_type, amount, paid FROM ledger_general_intermediate_view"
  }

  // remove
  collection.schema.removeField("tpzxi8oj")

  // remove
  collection.schema.removeField("m70x0dig")

  // remove
  collection.schema.removeField("evhbkb6w")

  // remove
  collection.schema.removeField("a83cdrkh")

  // remove
  collection.schema.removeField("jbjk04nr")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "70hbitsr",
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
    "id": "oawvywbk",
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
    "id": "xzxcanrd",
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
    "id": "mycnlwxs",
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
    "id": "k1kyttg0",
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
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1")

  collection.options = {
    "query": "SELECT id, created, description, transaction_type, account_type, amount, paid FROM (\nSELECT id, created, description, 'payment' AS transaction_type, type AS account_type, amount AS amount, paid\nFROM payments_view\nUNION ALL\nSELECT id, created, name AS description, 'expense' AS transaction_type, 'cash' AS account_type, amount AS amount, true AS paid\nFROM expenses)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tpzxi8oj",
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
    "id": "m70x0dig",
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
    "id": "evhbkb6w",
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
    "id": "a83cdrkh",
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
    "id": "jbjk04nr",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("70hbitsr")

  // remove
  collection.schema.removeField("oawvywbk")

  // remove
  collection.schema.removeField("xzxcanrd")

  // remove
  collection.schema.removeField("mycnlwxs")

  // remove
  collection.schema.removeField("k1kyttg0")

  return dao.saveCollection(collection)
})
