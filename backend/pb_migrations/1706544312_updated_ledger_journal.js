/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("g4oxt9ptisuyhnf")

  collection.listRule = ""
  collection.viewRule = ""

  // remove
  collection.schema.removeField("46qivdlz")

  // remove
  collection.schema.removeField("1odtz12h")

  // remove
  collection.schema.removeField("e14eq0y2")

  // remove
  collection.schema.removeField("bzvyb5nj")

  // remove
  collection.schema.removeField("uo040ihx")

  // remove
  collection.schema.removeField("j9nbala8")

  // remove
  collection.schema.removeField("hqgiebtz")

  // remove
  collection.schema.removeField("p99e9rsl")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sgps259h",
    "name": "invoiceNo",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ea2v9l5c",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lvg3lfzi",
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
    "id": "6ujxfxb3",
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
    "id": "zgrnydlr",
    "name": "accounts_recievable",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "r249dmh8",
    "name": "accounts_payable",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pwpstwgj",
    "name": "cash",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bp3ejarx",
    "name": "stock",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("g4oxt9ptisuyhnf")

  collection.listRule = null
  collection.viewRule = null

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "46qivdlz",
    "name": "invoiceNo",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1odtz12h",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "e14eq0y2",
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
    "id": "bzvyb5nj",
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
    "id": "uo040ihx",
    "name": "accounts_recievable",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "j9nbala8",
    "name": "accounts_payable",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hqgiebtz",
    "name": "cash",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "p99e9rsl",
    "name": "stock",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("sgps259h")

  // remove
  collection.schema.removeField("ea2v9l5c")

  // remove
  collection.schema.removeField("lvg3lfzi")

  // remove
  collection.schema.removeField("6ujxfxb3")

  // remove
  collection.schema.removeField("zgrnydlr")

  // remove
  collection.schema.removeField("r249dmh8")

  // remove
  collection.schema.removeField("pwpstwgj")

  // remove
  collection.schema.removeField("bp3ejarx")

  return dao.saveCollection(collection)
})
