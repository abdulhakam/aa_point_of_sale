/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("d4v5zih90ef0eye")

  collection.options = {
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN -amount ELSE +amount END) END) AS received,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) END) AS accounts_recievable,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) ELSE 0 END) AS sent,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) ELSE 0 END) AS accounts_payable,\n  (CASE WHEN stock_amount <> 0 THEN (CASE WHEN transaction_type == 'invoice' THEN (CASE WHEN account_type == 'recieving' THEN -stock_amount ELSE stock_amount END) ELSE 0 END) ELSE 0 END) AS stock\n  FROM z_ledger_transactions_intermediate"
  }

  // remove
  collection.schema.removeField("jbbtrmi8")

  // remove
  collection.schema.removeField("co3mmskd")

  // remove
  collection.schema.removeField("ckrbtdyf")

  // remove
  collection.schema.removeField("getmvl5l")

  // remove
  collection.schema.removeField("csecxjge")

  // remove
  collection.schema.removeField("k0uwdtyb")

  // remove
  collection.schema.removeField("wajwmxhc")

  // remove
  collection.schema.removeField("0ttsur0c")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "he5hlzso",
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
    "id": "y3soue4f",
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
    "id": "hjacegev",
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
    "id": "aw95belu",
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
    "id": "qfdazsv7",
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
    "id": "bnknv9ii",
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
    "id": "sagt0uxe",
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
    "id": "um2v1zfv",
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
  const collection = dao.findCollectionByNameOrId("d4v5zih90ef0eye")

  collection.options = {
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) END) AS received,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) END) AS accounts_recievable,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) ELSE 0 END) AS sent,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) ELSE 0 END) AS accounts_payable,\n  (CASE WHEN stock_amount <> 0 THEN (CASE WHEN transaction_type == 'invoice' THEN (CASE WHEN account_type == 'recieving' THEN -stock_amount ELSE stock_amount END) ELSE 0 END) ELSE 0 END) AS stock\n  FROM z_ledger_transactions_intermediate"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jbbtrmi8",
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
    "id": "co3mmskd",
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
    "id": "ckrbtdyf",
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
    "id": "getmvl5l",
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
    "id": "csecxjge",
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
    "id": "k0uwdtyb",
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
    "id": "wajwmxhc",
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
    "id": "0ttsur0c",
    "name": "stock",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("he5hlzso")

  // remove
  collection.schema.removeField("y3soue4f")

  // remove
  collection.schema.removeField("hjacegev")

  // remove
  collection.schema.removeField("aw95belu")

  // remove
  collection.schema.removeField("qfdazsv7")

  // remove
  collection.schema.removeField("bnknv9ii")

  // remove
  collection.schema.removeField("sagt0uxe")

  // remove
  collection.schema.removeField("um2v1zfv")

  return dao.saveCollection(collection)
})
