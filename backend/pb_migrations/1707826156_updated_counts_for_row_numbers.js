/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7m69mlejf9bwr69")

  collection.options = {
    "query": "SELECT cast(`id` as text) `id`,`areas`,`sections`,`categories`,`purchase_invoices`,`sale_invoices`,`items`,`order_bookers`,`parties`,`recieving_payments`,`sending_payments` FROM (SELECT (ROW_NUMBER() OVER()) as id,\n(SELECT COUNT (id) FROM areas) as areas,\n(SELECT COUNT (id) FROM sections) as sections,\n(SELECT COUNT (id) FROM categories) as categories,\n(SELECT COUNT (id) FROM invoices WHERE type='purchase') as purchase_invoices,\n(SELECT COUNT (id) FROM invoices WHERE type='sale') as sale_invoices,\n(SELECT COUNT (id) FROM invoices WHERE type='return') as return_invoices,\n(SELECT COUNT (id) FROM items) as items,\n(SELECT COUNT (id) FROM order_bookers) as order_bookers,\n(SELECT COUNT (id) FROM parties) as parties,\n(SELECT COUNT (id) FROM payments WHERE type = 'recieving') as recieving_payments,\n(SELECT COUNT (id) FROM payments WHERE type = 'sending') as sending_payments)"
  }

  // remove
  collection.schema.removeField("db3nuhm8")

  // remove
  collection.schema.removeField("ewb70iad")

  // remove
  collection.schema.removeField("sf3xt44o")

  // remove
  collection.schema.removeField("6iyqwzvg")

  // remove
  collection.schema.removeField("pq2d33ih")

  // remove
  collection.schema.removeField("7lxuk8rc")

  // remove
  collection.schema.removeField("xq9plir0")

  // remove
  collection.schema.removeField("txzqzpu6")

  // remove
  collection.schema.removeField("xrrtmr6z")

  // remove
  collection.schema.removeField("aqnpy1n2")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0pic35qy",
    "name": "areas",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "aka0bieb",
    "name": "sections",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1ae0jwmu",
    "name": "categories",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8sqirecs",
    "name": "purchase_invoices",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ns0utrdr",
    "name": "sale_invoices",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bv9a3pis",
    "name": "items",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "necohfiv",
    "name": "order_bookers",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uquebbl9",
    "name": "parties",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bfhxiion",
    "name": "recieving_payments",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tjv13b2w",
    "name": "sending_payments",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7m69mlejf9bwr69")

  collection.options = {
    "query": "SELECT cast(`id` as text) `id`,`areas`,`sections`,`categories`,`purchase_invoices`,`sale_invoices`,`items`,`order_bookers`,`parties`,`recieving_payments`,`sending_payments` FROM (SELECT (ROW_NUMBER() OVER()) as id,\n(SELECT COUNT (id) FROM areas) as areas,\n(SELECT COUNT (id) FROM sections) as sections,\n(SELECT COUNT (id) FROM categories) as categories,\n(SELECT COUNT (id) FROM invoices WHERE type='purchase') as purchase_invoices,\n(SELECT COUNT (id) FROM invoices WHERE type='sale') as sale_invoices,\n(SELECT COUNT (id) FROM items) as items,\n(SELECT COUNT (id) FROM order_bookers) as order_bookers,\n(SELECT COUNT (id) FROM parties) as parties,\n(SELECT COUNT (id) FROM payments WHERE type = 'recieving') as recieving_payments,\n(SELECT COUNT (id) FROM payments WHERE type = 'sending') as sending_payments)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "db3nuhm8",
    "name": "areas",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ewb70iad",
    "name": "sections",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sf3xt44o",
    "name": "categories",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6iyqwzvg",
    "name": "purchase_invoices",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pq2d33ih",
    "name": "sale_invoices",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "7lxuk8rc",
    "name": "items",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xq9plir0",
    "name": "order_bookers",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "txzqzpu6",
    "name": "parties",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xrrtmr6z",
    "name": "recieving_payments",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "aqnpy1n2",
    "name": "sending_payments",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("0pic35qy")

  // remove
  collection.schema.removeField("aka0bieb")

  // remove
  collection.schema.removeField("1ae0jwmu")

  // remove
  collection.schema.removeField("8sqirecs")

  // remove
  collection.schema.removeField("ns0utrdr")

  // remove
  collection.schema.removeField("bv9a3pis")

  // remove
  collection.schema.removeField("necohfiv")

  // remove
  collection.schema.removeField("uquebbl9")

  // remove
  collection.schema.removeField("bfhxiion")

  // remove
  collection.schema.removeField("tjv13b2w")

  return dao.saveCollection(collection)
})
