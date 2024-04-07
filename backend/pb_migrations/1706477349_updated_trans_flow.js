/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1")

  collection.name = "z_ledger_transactions"
  collection.options = {
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) END) AS received,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) END) AS to_recieve,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) ELSE 0 END) AS sent,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) ELSE 0 END) AS to_send,\n  (CASE WHEN stock_amount <> 0 THEN (CASE WHEN transaction_type == 'invoice' THEN (CASE WHEN account_type == 'recieving' THEN -stock_amount ELSE stock_amount END) ELSE 0 END) ELSE 0 END) AS stock\n  FROM z_ledger_transactions_intermediate"
  }

  // remove
  collection.schema.removeField("bie1ptnd")

  // remove
  collection.schema.removeField("ee4yt0sy")

  // remove
  collection.schema.removeField("ey5lp9zr")

  // remove
  collection.schema.removeField("aswbx4i5")

  // remove
  collection.schema.removeField("ivd4rgnv")

  // remove
  collection.schema.removeField("mrvamtuj")

  // remove
  collection.schema.removeField("wmux5e1h")

  // remove
  collection.schema.removeField("iinlau1t")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mnlri24s",
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
    "id": "suiosath",
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
    "id": "prqaulzy",
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
    "id": "g5batszu",
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
    "id": "cd6glljz",
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
    "id": "0rownmpw",
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
    "id": "zjxfifhj",
    "name": "to_send",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vefqc97i",
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
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1")

  collection.name = "trans_flow"
  collection.options = {
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) END) AS received,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) END) AS to_recieve,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) ELSE 0 END) AS sent,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) ELSE 0 END) AS to_send,\n  (CASE WHEN stock_amount <> 0 THEN (CASE WHEN transaction_type == 'invoice' THEN (CASE WHEN account_type == 'recieving' THEN -stock_amount ELSE stock_amount END) ELSE 0 END) ELSE 0 END) AS stock\n  FROM trans_flow_intermediate_view"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bie1ptnd",
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
    "id": "ee4yt0sy",
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
    "id": "ey5lp9zr",
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
    "id": "aswbx4i5",
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
    "id": "ivd4rgnv",
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
    "id": "mrvamtuj",
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
    "id": "wmux5e1h",
    "name": "to_send",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "iinlau1t",
    "name": "stock",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("mnlri24s")

  // remove
  collection.schema.removeField("suiosath")

  // remove
  collection.schema.removeField("prqaulzy")

  // remove
  collection.schema.removeField("g5batszu")

  // remove
  collection.schema.removeField("cd6glljz")

  // remove
  collection.schema.removeField("0rownmpw")

  // remove
  collection.schema.removeField("zjxfifhj")

  // remove
  collection.schema.removeField("vefqc97i")

  return dao.saveCollection(collection)
})
