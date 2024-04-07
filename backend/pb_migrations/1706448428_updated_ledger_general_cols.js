/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1")

  collection.options = {
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n  amount,\n  paid,\n  amount AS received,\n  amount AS to_recieve,\n  amount AS sent,\n  amount AS to_send\n  FROM ledger_general_intermediate_view"
  }

  // remove
  collection.schema.removeField("70hbitsr")

  // remove
  collection.schema.removeField("oawvywbk")

  // remove
  collection.schema.removeField("xzxcanrd")

  // remove
  collection.schema.removeField("mycnlwxs")

  // remove
  collection.schema.removeField("k1kyttg0")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8ch1wq55",
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
    "id": "cwt3u7wd",
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
    "id": "uzpzvayv",
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
    "id": "fqhvsenf",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vfyfq1nk",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vozm1fzj",
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
    "id": "07apkx2r",
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
    "id": "wiumrt0o",
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
    "id": "wwrlcxrv",
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

  collection.options = {
    "query": "SELECT id, created, description, transaction_type, account_type, amount, paid FROM ledger_general_intermediate_view"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "70hbitsr",
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
    "id": "oawvywbk",
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
    "id": "xzxcanrd",
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
    "id": "mycnlwxs",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "k1kyttg0",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("8ch1wq55")

  // remove
  collection.schema.removeField("cwt3u7wd")

  // remove
  collection.schema.removeField("uzpzvayv")

  // remove
  collection.schema.removeField("fqhvsenf")

  // remove
  collection.schema.removeField("vfyfq1nk")

  // remove
  collection.schema.removeField("vozm1fzj")

  // remove
  collection.schema.removeField("07apkx2r")

  // remove
  collection.schema.removeField("wiumrt0o")

  // remove
  collection.schema.removeField("wwrlcxrv")

  return dao.saveCollection(collection)
})
