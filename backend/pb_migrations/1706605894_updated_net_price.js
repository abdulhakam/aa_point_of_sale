/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n    t.item AS id,\n    (t.price * (1- t.discount_1 / 100) * (1- t.discount_2 / 100) * (1- i.discount_1 / 100) * (1- i.discount_2 / 100))/(t.qty+t.scheme) AS net_price,\n    SUM(CASE WHEN i.type = 'purchase' THEN t.qty ELSE -t.qty END) AS qty\nFROM \n    transactions t\nJOIN \n    invoices i ON t.invoice = i.id\nWHERE \n    i.id IN (SELECT id FROM invoices WHERE type = 'purchase' ORDER BY created DESC LIMIT 1)\nGROUP BY \n    t.item;"
  }

  // remove
  collection.schema.removeField("wed5z9rf")

  // remove
  collection.schema.removeField("vqk7nxgq")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2iogg3np",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2loxuccj",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n    t.item AS id,\n    (t.price * (1- t.discount_1 / 100) * (1- t.discount_2 / 100) * (1- i.discount_1 / 100) * (1- i.discount_2 / 100)) AS net_price,\n    SUM(CASE WHEN i.type = 'purchase' THEN t.qty ELSE -t.qty END) AS qty\nFROM \n    transactions t\nJOIN \n    invoices i ON t.invoice = i.id\nWHERE \n    i.id IN (SELECT id FROM invoices WHERE type = 'purchase' ORDER BY created DESC LIMIT 1)\nGROUP BY \n    t.item;"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wed5z9rf",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vqk7nxgq",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("2iogg3np")

  // remove
  collection.schema.removeField("2loxuccj")

  return dao.saveCollection(collection)
})
