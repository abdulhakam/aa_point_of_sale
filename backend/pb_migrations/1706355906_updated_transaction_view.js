/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("5ljhl7bd6h7xflw")

  collection.options = {
    "query": "SELECT id,\n  invoice,\n  item,\n  type,\n  price,\n  qty,\n  scheme,\n  discount_1,\n  discount_2,\n  (d1t-(d1t*discount_2/100)) AS total,\n  deleted,\n  created,\n  updated\n  FROM\n(SELECT \n  transactions.id,\n  invoice,\n  invoices.type,\n  item,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (qty*price)-((qty*price)*transactions.discount_1/100) AS d1t,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\n  FROM transactions\nJOIN invoices ON transactions.invoice = invoices.id)"
  }

  // remove
  collection.schema.removeField("a2u7kyg9")

  // remove
  collection.schema.removeField("brlm9pwj")

  // remove
  collection.schema.removeField("9kcjrhot")

  // remove
  collection.schema.removeField("cczgn9sz")

  // remove
  collection.schema.removeField("oibraimv")

  // remove
  collection.schema.removeField("n2bhqdsd")

  // remove
  collection.schema.removeField("j26gscnq")

  // remove
  collection.schema.removeField("zbinnuby")

  // remove
  collection.schema.removeField("y3hzmepu")

  // remove
  collection.schema.removeField("d1crsp4w")

  // remove
  collection.schema.removeField("g4r9tr4o")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "z8ag3jdz",
    "name": "invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9ornpj0x",
    "name": "item",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fd6v2dv5",
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
    "id": "tui0s4ev",
    "name": "price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bkqvb0h5",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "phwxf939",
    "name": "scheme",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1f7trrbx",
    "name": "discount_1",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8anby76w",
    "name": "discount_2",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "a1g1slan",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zjhvqmfr",
    "name": "deleted",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("5ljhl7bd6h7xflw")

  collection.options = {
    "query": "SELECT id,\n  invoice,\n  item,\n  type,\n  price,\n  qty,\n  scheme,\n  discount_1,\n  discount_2,\n  maxtot,\n  (d1t-(d1t*discount_2/100)) AS total,\n  deleted,\n  created,\n  updated\n  FROM\n(SELECT \n  transactions.id,\n  invoice,\n  invoices.type,\n  item,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (qty*price) AS maxtot,\n  (qty*price)-((qty*price)*transactions.discount_1/100) AS d1t,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\n  FROM transactions\nJOIN invoices ON transactions.invoice = invoices.id)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "a2u7kyg9",
    "name": "invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "brlm9pwj",
    "name": "item",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9kcjrhot",
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
    "id": "cczgn9sz",
    "name": "price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "oibraimv",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "n2bhqdsd",
    "name": "scheme",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "j26gscnq",
    "name": "discount_1",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zbinnuby",
    "name": "discount_2",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "y3hzmepu",
    "name": "maxtot",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "d1crsp4w",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "g4r9tr4o",
    "name": "deleted",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("z8ag3jdz")

  // remove
  collection.schema.removeField("9ornpj0x")

  // remove
  collection.schema.removeField("fd6v2dv5")

  // remove
  collection.schema.removeField("tui0s4ev")

  // remove
  collection.schema.removeField("bkqvb0h5")

  // remove
  collection.schema.removeField("phwxf939")

  // remove
  collection.schema.removeField("1f7trrbx")

  // remove
  collection.schema.removeField("8anby76w")

  // remove
  collection.schema.removeField("a1g1slan")

  // remove
  collection.schema.removeField("zjhvqmfr")

  return dao.saveCollection(collection)
})
