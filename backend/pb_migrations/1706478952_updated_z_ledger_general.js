/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("d4v5zih90ef0eye")

  collection.options = {
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) END) AS accounts_recievable,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) ELSE 0 END) AS accounts_payable,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN -amount ELSE 89 END) ELSE 0 END) AS cash,\n  (CASE WHEN stock_amount <> 0 THEN (CASE WHEN transaction_type == 'invoice' THEN (CASE WHEN account_type == 'recieving' THEN -stock_amount ELSE stock_amount END) ELSE 0 END) ELSE 0 END) AS stock\n  FROM z_ledger_transactions_intermediate"
  }

  // remove
  collection.schema.removeField("7x66zvgi")

  // remove
  collection.schema.removeField("nvptuaru")

  // remove
  collection.schema.removeField("fntyiwne")

  // remove
  collection.schema.removeField("mp3f6yb2")

  // remove
  collection.schema.removeField("e8ivlxoo")

  // remove
  collection.schema.removeField("gcvu8ndr")

  // remove
  collection.schema.removeField("kapx50pi")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0o9yqsky",
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
    "id": "0nukqmrc",
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
    "id": "hosogb4k",
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
    "id": "i5fz87xk",
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
    "id": "znp83yoz",
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
    "id": "uzgycj53",
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
    "id": "hhh2trzm",
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
    "id": "7x66zvgi",
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
    "id": "nvptuaru",
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
    "id": "fntyiwne",
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
    "id": "mp3f6yb2",
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
    "id": "e8ivlxoo",
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
    "id": "gcvu8ndr",
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
    "id": "kapx50pi",
    "name": "stock",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("0o9yqsky")

  // remove
  collection.schema.removeField("0nukqmrc")

  // remove
  collection.schema.removeField("hosogb4k")

  // remove
  collection.schema.removeField("i5fz87xk")

  // remove
  collection.schema.removeField("znp83yoz")

  // remove
  collection.schema.removeField("uzgycj53")

  // remove
  collection.schema.removeField("hhh2trzm")

  return dao.saveCollection(collection)
})
