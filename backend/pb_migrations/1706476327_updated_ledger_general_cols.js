/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1")

  collection.options = {
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) END) AS received,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) END) AS to_recieve,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) ELSE 0 END) AS sent,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) ELSE 0 END) AS to_send,\n  ledger_general_intermediate_view.stock_amount\n  FROM ledger_general_intermediate_view"
  }

  // remove
  collection.schema.removeField("wkkpwb1s")

  // remove
  collection.schema.removeField("7n28qmxe")

  // remove
  collection.schema.removeField("gxbc4xhq")

  // remove
  collection.schema.removeField("igzczo7g")

  // remove
  collection.schema.removeField("6psrh2fg")

  // remove
  collection.schema.removeField("ifudlunz")

  // remove
  collection.schema.removeField("d0rienzu")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jsxcr4gu",
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
    "id": "0ixnm2ek",
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
    "id": "ccsexgs9",
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
    "id": "bgtnfueh",
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
    "id": "tzcggptc",
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
    "id": "ma7p2rtn",
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
    "id": "erdrtsep",
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
    "id": "pt1yixyh",
    "name": "stock_amount",
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
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) END) AS received,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) END) AS to_recieve,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) ELSE 0 END) AS sent,\n  ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN (CASE WHEN paid IS TRUE THEN 0 ELSE amount END) ELSE 0 END) AS to_send\n  FROM ledger_general_intermediate_view"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wkkpwb1s",
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
    "id": "7n28qmxe",
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
    "id": "gxbc4xhq",
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
    "id": "igzczo7g",
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
    "id": "6psrh2fg",
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
    "id": "ifudlunz",
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
    "id": "d0rienzu",
    "name": "to_send",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("jsxcr4gu")

  // remove
  collection.schema.removeField("0ixnm2ek")

  // remove
  collection.schema.removeField("ccsexgs9")

  // remove
  collection.schema.removeField("bgtnfueh")

  // remove
  collection.schema.removeField("tzcggptc")

  // remove
  collection.schema.removeField("ma7p2rtn")

  // remove
  collection.schema.removeField("erdrtsep")

  // remove
  collection.schema.removeField("pt1yixyh")

  return dao.saveCollection(collection)
})
