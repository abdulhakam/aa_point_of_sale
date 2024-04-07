/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("d4v5zih90ef0eye")

  collection.options = {
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) END) AS accounts_recievable,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) ELSE 0 END) AS accounts_payable,\n  amount AS cash,\n  (CASE WHEN stock_amount <> 0 THEN (CASE WHEN transaction_type == 'invoice' THEN (CASE WHEN account_type == 'recieving' THEN -stock_amount ELSE stock_amount END) ELSE 0 END) ELSE 0 END) AS stock\n  FROM z_ledger_transactions_intermediate"
  }

  // remove
  collection.schema.removeField("u5nuzclb")

  // remove
  collection.schema.removeField("u9pszrvz")

  // remove
  collection.schema.removeField("vpkbkdzt")

  // remove
  collection.schema.removeField("auab61xy")

  // remove
  collection.schema.removeField("eyuc1dsh")

  // remove
  collection.schema.removeField("29vlzo4z")

  // remove
  collection.schema.removeField("zykdbzix")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "n8xseqpb",
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
    "id": "wrtdbar2",
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
    "id": "3qcefo1s",
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
    "id": "9rkeepgq",
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
    "id": "zekggoag",
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
    "id": "fdmlp0zb",
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
    "id": "o1jdf7tk",
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
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) END) AS accounts_recievable,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) ELSE 0 END) AS accounts_payable,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN -amount ELSE 0 END) ELSE 0 END) AS cash,\n  (CASE WHEN stock_amount <> 0 THEN (CASE WHEN transaction_type == 'invoice' THEN (CASE WHEN account_type == 'recieving' THEN -stock_amount ELSE stock_amount END) ELSE 0 END) ELSE 0 END) AS stock\n  FROM z_ledger_transactions_intermediate"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "u5nuzclb",
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
    "id": "u9pszrvz",
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
    "id": "vpkbkdzt",
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
    "id": "auab61xy",
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
    "id": "eyuc1dsh",
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
    "id": "29vlzo4z",
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
    "id": "zykdbzix",
    "name": "stock",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("n8xseqpb")

  // remove
  collection.schema.removeField("wrtdbar2")

  // remove
  collection.schema.removeField("3qcefo1s")

  // remove
  collection.schema.removeField("9rkeepgq")

  // remove
  collection.schema.removeField("zekggoag")

  // remove
  collection.schema.removeField("fdmlp0zb")

  // remove
  collection.schema.removeField("o1jdf7tk")

  return dao.saveCollection(collection)
})
