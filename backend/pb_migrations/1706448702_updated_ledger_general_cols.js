/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1")

  collection.options = {
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n  amount,\n  paid,\n ( CASE account_type WHEN 'sending' THEN 0 END) AS received,\n  amount AS to_recieve,\n  amount AS sent,\n  amount AS to_send\n  FROM ledger_general_intermediate_view"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pteeqjoo",
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
    "id": "yhobprwx",
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
    "id": "wbo3uzjf",
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
    "id": "162slukv",
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
    "id": "o8pafsbj",
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
    "id": "nxgncvfq",
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
    "id": "diiz9hsd",
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
    "id": "z0gftgzx",
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
    "id": "rugroghq",
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
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n  amount,\n  paid,\n  amount AS received,\n  amount AS to_recieve,\n  amount AS sent,\n  amount AS to_send\n  FROM ledger_general_intermediate_view"
  }

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

  // remove
  collection.schema.removeField("pteeqjoo")

  // remove
  collection.schema.removeField("yhobprwx")

  // remove
  collection.schema.removeField("wbo3uzjf")

  // remove
  collection.schema.removeField("162slukv")

  // remove
  collection.schema.removeField("o8pafsbj")

  // remove
  collection.schema.removeField("nxgncvfq")

  // remove
  collection.schema.removeField("diiz9hsd")

  // remove
  collection.schema.removeField("z0gftgzx")

  // remove
  collection.schema.removeField("rugroghq")

  return dao.saveCollection(collection)
})
