/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.name = "ledger_general_intermediate_view"
  collection.options = {
    "query": "SELECT\n    id,\n    created,\n    (CASE type WHEN 'sending' THEN 'Expense' ELSE 'Income' END) AS account_type,\n    description,\n    amount,\n    (CASE type WHEN 'sending' THEN 'Debit' ELSE 'Credit' END) AS transaction_type,\n    paid AS is_paid,\n    (CASE WHEN paid THEN 0 ELSE amount END) AS unpaid_amount\nFROM payments_view"
  }

  // remove
  collection.schema.removeField("734hj6az")

  // remove
  collection.schema.removeField("evdizvzg")

  // remove
  collection.schema.removeField("o3myuflf")

  // remove
  collection.schema.removeField("dddgfg8s")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qrnbw6vk",
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
    "id": "qdgjj3xi",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "e6hflkzo",
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
    "id": "w9gmqefs",
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
    "id": "7salpkjb",
    "name": "is_paid",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vjyphsam",
    "name": "unpaid_amount",
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

  collection.name = "ledger_general"
  collection.options = {
    "query": "SELECT\n    id,\n    created,\n    (CASE WHEN type = 'sending' THEN 'Expense' ELSE 'Income' END) AS account_type,\n    description,\n    amount,\n    (CASE WHEN type = 'sending' THEN 'Debit' ELSE 'Credit' END) AS transaction_type\nFROM payments_view\nWHERE paid = TRUE"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "734hj6az",
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
    "id": "evdizvzg",
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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "o3myuflf",
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
    "id": "dddgfg8s",
    "name": "transaction_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("qrnbw6vk")

  // remove
  collection.schema.removeField("qdgjj3xi")

  // remove
  collection.schema.removeField("e6hflkzo")

  // remove
  collection.schema.removeField("w9gmqefs")

  // remove
  collection.schema.removeField("7salpkjb")

  // remove
  collection.schema.removeField("vjyphsam")

  return dao.saveCollection(collection)
})
