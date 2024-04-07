/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1")

  collection.listRule = ""
  collection.viewRule = ""

  // remove
  collection.schema.removeField("ro9yqn2q")

  // remove
  collection.schema.removeField("7lae3lcp")

  // remove
  collection.schema.removeField("1xikdew6")

  // remove
  collection.schema.removeField("dhay0tys")

  // remove
  collection.schema.removeField("hkplu7jq")

  // remove
  collection.schema.removeField("fadscldl")

  // remove
  collection.schema.removeField("pypqowvp")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mqcnsehz",
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
    "id": "v8scrxyq",
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
    "id": "hxnb7gzq",
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
    "id": "xmb9za4t",
    "name": "received",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "woem0w0h",
    "name": "to_recieve",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hwassihi",
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
    "id": "mkbbevmb",
    "name": "to_send",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1")

  collection.listRule = null
  collection.viewRule = null

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ro9yqn2q",
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
    "id": "7lae3lcp",
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
    "id": "1xikdew6",
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
    "id": "dhay0tys",
    "name": "received",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hkplu7jq",
    "name": "to_recieve",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fadscldl",
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
    "id": "pypqowvp",
    "name": "to_send",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("mqcnsehz")

  // remove
  collection.schema.removeField("v8scrxyq")

  // remove
  collection.schema.removeField("hxnb7gzq")

  // remove
  collection.schema.removeField("xmb9za4t")

  // remove
  collection.schema.removeField("woem0w0h")

  // remove
  collection.schema.removeField("hwassihi")

  // remove
  collection.schema.removeField("mkbbevmb")

  return dao.saveCollection(collection)
})
