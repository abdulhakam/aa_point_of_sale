/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.options = {
    "query": "SELECT\n    id,\n    created,\n    amount AS type,\n    description AS name,\n    amount AS recieved,\n    amount as not_recieved,\n    amount as sent,\n    amount as not_sent\nFROM payments_view"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qv0jtsw1",
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
    "id": "ex9mifu8",
    "name": "name",
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
    "id": "t2qwnvfa",
    "name": "recieved",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "imvazeij",
    "name": "not_recieved",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "a7aajbc8",
    "name": "sent",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jkcdbvdl",
    "name": "not_sent",
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
    "query": "SELECT\n    id,\n    created,\n    (CASE type WHEN 'sending' THEN 'Expense' ELSE 'Income' END) AS account_type,\n    description,\n    amount,\n    (CASE type WHEN 'sending' THEN 'Debit' ELSE 'Credit' END) AS transaction_type,\n    paid AS is_paid,\n    (CASE WHEN paid THEN 0 ELSE amount END) AS unpaid_amount\nFROM payments_view"
  }

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

  // remove
  collection.schema.removeField("qv0jtsw1")

  // remove
  collection.schema.removeField("ex9mifu8")

  // remove
  collection.schema.removeField("t2qwnvfa")

  // remove
  collection.schema.removeField("imvazeij")

  // remove
  collection.schema.removeField("a7aajbc8")

  // remove
  collection.schema.removeField("jkcdbvdl")

  return dao.saveCollection(collection)
})
