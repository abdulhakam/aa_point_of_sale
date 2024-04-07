/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7m69mlejf9bwr69")

  collection.options = {
    "query": "SELECT cast(`id` as text) `id`,`areas`,`sections`,`categories`,`purchase_invoices`,`sale_invoices`,`items`,`order_bookers`,`parties`,`recieving_payments`,`sending_payments` FROM (SELECT (ROW_NUMBER() OVER()) as id,\n(SELECT COUNT (id) FROM areas) as areas,\n(SELECT COUNT (id) FROM sections) as sections,\n(SELECT COUNT (id) FROM categories) as categories,\n(SELECT COUNT (id) FROM invoices WHERE type='purchase') as purchase_invoices,\n(SELECT COUNT (id) FROM invoices WHERE type='sale') as sale_invoices,\n(SELECT COUNT (id) FROM items) as items,\n(SELECT COUNT (id) FROM order_bookers) as order_bookers,\n(SELECT COUNT (id) FROM parties) as parties,\n(SELECT COUNT (id) FROM payments WHERE type = 'recieving') as recieving_payments,\n(SELECT COUNT (id) FROM payments WHERE type = 'sending') as sending_payments)"
  }

  // remove
  collection.schema.removeField("xvo1oqiv")

  // remove
  collection.schema.removeField("nmbv8kbq")

  // remove
  collection.schema.removeField("hwnlv6bl")

  // remove
  collection.schema.removeField("bbd5pzmm")

  // remove
  collection.schema.removeField("rjajibab")

  // remove
  collection.schema.removeField("asajue28")

  // remove
  collection.schema.removeField("irbiqqek")

  // remove
  collection.schema.removeField("it3zlaza")

  // remove
  collection.schema.removeField("hqeao8jr")

  // remove
  collection.schema.removeField("0bcouzyt")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "djoglqbn",
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
    "id": "qavdagng",
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
    "id": "fhg7umoa",
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
    "id": "s0shalsz",
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
    "id": "nfrxuiao",
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
    "id": "isph08r2",
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
    "id": "xjqibxhx",
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
    "id": "lyh1gw33",
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
    "id": "w2eds5nf",
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
    "id": "omaaskti",
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
    "query": "SELECT cast(`id` as text) `id`,`areas`,`sections`,`categories`,`purchase_invoices`,`sale_invoices`,`items`,`order_bookers`,`parties`,`recieving_payments`,`sending_payments` FROM (SELECT (ROW_NUMBER() OVER()) as id,\n(SELECT COUNT (id) FROM areas) as areas,\n(SELECT COUNT (id) FROM sections) as sections,\n(SELECT COUNT (id) FROM categories) as categories,\n(SELECT COUNT (id) FROM invoices WHERE type='purchase') as purchase_invoices,\n(SELECT COUNT (id) FROM invoices WHERE type='sale') as sale_invoices,\n(SELECT COUNT (id) FROM invoices WHERE type='return') as return_invoices,\n(SELECT COUNT (id) FROM items) as items,\n(SELECT COUNT (id) FROM order_bookers) as order_bookers,\n(SELECT COUNT (id) FROM parties) as parties,\n(SELECT COUNT (id) FROM payments WHERE type = 'recieving') as recieving_payments,\n(SELECT COUNT (id) FROM payments WHERE type = 'sending') as sending_payments)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xvo1oqiv",
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
    "id": "nmbv8kbq",
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
    "id": "hwnlv6bl",
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
    "id": "bbd5pzmm",
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
    "id": "rjajibab",
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
    "id": "asajue28",
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
    "id": "irbiqqek",
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
    "id": "it3zlaza",
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
    "id": "hqeao8jr",
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
    "id": "0bcouzyt",
    "name": "sending_payments",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("djoglqbn")

  // remove
  collection.schema.removeField("qavdagng")

  // remove
  collection.schema.removeField("fhg7umoa")

  // remove
  collection.schema.removeField("s0shalsz")

  // remove
  collection.schema.removeField("nfrxuiao")

  // remove
  collection.schema.removeField("isph08r2")

  // remove
  collection.schema.removeField("xjqibxhx")

  // remove
  collection.schema.removeField("lyh1gw33")

  // remove
  collection.schema.removeField("w2eds5nf")

  // remove
  collection.schema.removeField("omaaskti")

  return dao.saveCollection(collection)
})
