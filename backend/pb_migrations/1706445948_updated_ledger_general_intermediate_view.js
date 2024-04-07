/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.options = {
    "query": "SELECT\n    id,\n    created,\n    (CASE WHEN payments_view.invoice > 0 THEN 'invoice' ELSE 'expense' END) AS type,\n    description AS name,\n    amount AS recieved,\n    amount as not_recieved,\n    amount as sent,\n    amount as not_sent\nFROM payments_view"
  }

  // remove
  collection.schema.removeField("zv8qqch2")

  // remove
  collection.schema.removeField("7goi8sgx")

  // remove
  collection.schema.removeField("szmeytb5")

  // remove
  collection.schema.removeField("haed96my")

  // remove
  collection.schema.removeField("qltlnnae")

  // remove
  collection.schema.removeField("gc494gxc")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ftsmqdxy",
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
    "id": "hm8sejjw",
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
    "id": "qcdfma7q",
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
    "id": "szheocac",
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
    "id": "tfnebopd",
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
    "id": "uutlcx43",
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
    "query": "SELECT\n    id,\n    created,\n    (CASE WHEN payments_view.invoice THEN 'invoice' ELSE 'expense' END) AS type,\n    description AS name,\n    amount AS recieved,\n    amount as not_recieved,\n    amount as sent,\n    amount as not_sent\nFROM payments_view"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zv8qqch2",
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
    "id": "7goi8sgx",
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
    "id": "szmeytb5",
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
    "id": "haed96my",
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
    "id": "qltlnnae",
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
    "id": "gc494gxc",
    "name": "not_sent",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("ftsmqdxy")

  // remove
  collection.schema.removeField("hm8sejjw")

  // remove
  collection.schema.removeField("qcdfma7q")

  // remove
  collection.schema.removeField("szheocac")

  // remove
  collection.schema.removeField("tfnebopd")

  // remove
  collection.schema.removeField("uutlcx43")

  return dao.saveCollection(collection)
})
