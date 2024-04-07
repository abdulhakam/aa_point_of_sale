/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7m69mlejf9bwr69")

  collection.options = {
    "query": "SELECT cast(`id` as text) `id`,`areas`,`sections`,`categories`,`purchase_invoices`,`sale_invoices`,`items`,`order_bookers`,`parties`,`recieving_payments`,`sending_payments` FROM (SELECT (ROW_NUMBER() OVER()) as id,\n(SELECT COUNT (id) FROM invoices WHERE type='return') as return_invoices,\n(SELECT COUNT (id) FROM areas) as areas,\n(SELECT COUNT (id) FROM sections) as sections,\n(SELECT COUNT (id) FROM categories) as categories,\n(SELECT COUNT (id) FROM invoices WHERE type='purchase') as purchase_invoices,\n(SELECT COUNT (id) FROM invoices WHERE type='sale') as sale_invoices,\n(SELECT COUNT (id) FROM items) as items,\n(SELECT COUNT (id) FROM order_bookers) as order_bookers,\n(SELECT COUNT (id) FROM parties) as parties,\n(SELECT COUNT (id) FROM payments WHERE type = 'recieving') as recieving_payments,\n(SELECT COUNT (id) FROM payments WHERE type = 'sending') as sending_payments)"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xxn9zss5",
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
    "id": "ymbt3dbo",
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
    "id": "o1zoa0im",
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
    "id": "7q6wjyd6",
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
    "id": "ivtnenni",
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
    "id": "s1eryq1w",
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
    "id": "ywqtpb7e",
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
    "id": "biu9oukh",
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
    "id": "aubcjsga",
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
    "id": "tu4if9b7",
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

  // remove
  collection.schema.removeField("xxn9zss5")

  // remove
  collection.schema.removeField("ymbt3dbo")

  // remove
  collection.schema.removeField("o1zoa0im")

  // remove
  collection.schema.removeField("7q6wjyd6")

  // remove
  collection.schema.removeField("ivtnenni")

  // remove
  collection.schema.removeField("s1eryq1w")

  // remove
  collection.schema.removeField("ywqtpb7e")

  // remove
  collection.schema.removeField("biu9oukh")

  // remove
  collection.schema.removeField("aubcjsga")

  // remove
  collection.schema.removeField("tu4if9b7")

  return dao.saveCollection(collection)
})
