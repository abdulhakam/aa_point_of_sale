/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("5nbtbhpd34w03qd")

  collection.listRule = ""
  collection.viewRule = ""

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ujr6u5cg",
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
    "id": "ssn1i2r7",
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
    "id": "bs0etgzt",
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
    "id": "m0iyi5u1",
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
    "id": "himowyod",
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
    "id": "jkf9bsot",
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
    "id": "hg1isom3",
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
    "id": "rhccpt3m",
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
    "id": "ybrzoojd",
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
    "id": "juhsezi1",
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

  collection.listRule = null
  collection.viewRule = null

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

  // remove
  collection.schema.removeField("ujr6u5cg")

  // remove
  collection.schema.removeField("ssn1i2r7")

  // remove
  collection.schema.removeField("bs0etgzt")

  // remove
  collection.schema.removeField("m0iyi5u1")

  // remove
  collection.schema.removeField("himowyod")

  // remove
  collection.schema.removeField("jkf9bsot")

  // remove
  collection.schema.removeField("hg1isom3")

  // remove
  collection.schema.removeField("rhccpt3m")

  // remove
  collection.schema.removeField("ybrzoojd")

  // remove
  collection.schema.removeField("juhsezi1")

  return dao.saveCollection(collection)
})
