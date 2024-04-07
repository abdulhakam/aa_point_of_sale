/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7m69mlejf9bwr69")

  collection.listRule = ""
  collection.viewRule = ""

  // remove
  collection.schema.removeField("m16bt0hj")

  // remove
  collection.schema.removeField("qvffpvbi")

  // remove
  collection.schema.removeField("uvitlwmj")

  // remove
  collection.schema.removeField("9vbcaybi")

  // remove
  collection.schema.removeField("mn3r1mbg")

  // remove
  collection.schema.removeField("fiukz4lj")

  // remove
  collection.schema.removeField("hiqr5vn4")

  // remove
  collection.schema.removeField("ukhlgyaq")

  // remove
  collection.schema.removeField("qae3bonf")

  // remove
  collection.schema.removeField("wjuurfck")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("7m69mlejf9bwr69")

  collection.listRule = null
  collection.viewRule = null

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "m16bt0hj",
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
    "id": "qvffpvbi",
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
    "id": "uvitlwmj",
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
    "id": "9vbcaybi",
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
    "id": "mn3r1mbg",
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
    "id": "fiukz4lj",
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
    "id": "hiqr5vn4",
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
    "id": "ukhlgyaq",
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
    "id": "qae3bonf",
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
    "id": "wjuurfck",
    "name": "sending_payments",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

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

  return dao.saveCollection(collection)
})
