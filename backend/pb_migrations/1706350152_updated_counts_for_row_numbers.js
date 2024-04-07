/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("5nbtbhpd34w03qd")

  collection.options = {
    "query": "SELECT cast(`id` as text) `id`,`areas`,`sections`,`categories`,`purchase_invoices`,`sale_invoices`,`items`,`order_bookers`,`parties`,`recieving_payments`,`sending_payments` FROM (SELECT (ROW_NUMBER() OVER()) as id,\n(SELECT COUNT (id) FROM areas) as areas,\n(SELECT COUNT (id) FROM sections) as sections,\n(SELECT COUNT (id) FROM categories) as categories,\n(SELECT COUNT (id) FROM invoices WHERE type='purchase') as purchase_invoices,\n(SELECT COUNT (id) FROM invoices WHERE type='sale') as sale_invoices,\n(SELECT COUNT (id) FROM items) as items,\n(SELECT COUNT (id) FROM order_bookers) as order_bookers,\n(SELECT COUNT (id) FROM parties) as parties,\n(SELECT COUNT (id) FROM payments WHERE type = 'recieving') as recieving_payments,\n(SELECT COUNT (id) FROM payments WHERE type = 'sending') as sending_payments)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jqm1w6yo",
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
    "id": "eqj0mlmk",
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
    "id": "rtnz4drx",
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
    "id": "cpkxljmm",
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
    "id": "widkhjsq",
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
    "id": "rs66srqh",
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
    "id": "0a16uj3v",
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
    "id": "blzeqhop",
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
    "id": "l3nd9idr",
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
    "id": "wk5cywhp",
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
  const collection = dao.findCollectionByNameOrId("5nbtbhpd34w03qd")

  collection.options = {
    "query": "SELECT id from invoices"
  }

  // remove
  collection.schema.removeField("jqm1w6yo")

  // remove
  collection.schema.removeField("eqj0mlmk")

  // remove
  collection.schema.removeField("rtnz4drx")

  // remove
  collection.schema.removeField("cpkxljmm")

  // remove
  collection.schema.removeField("widkhjsq")

  // remove
  collection.schema.removeField("rs66srqh")

  // remove
  collection.schema.removeField("0a16uj3v")

  // remove
  collection.schema.removeField("blzeqhop")

  // remove
  collection.schema.removeField("l3nd9idr")

  // remove
  collection.schema.removeField("wk5cywhp")

  return dao.saveCollection(collection)
})
