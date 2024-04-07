/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("jfgvmw91um4ivy1")

  collection.options = {
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n  amount,\n  paid,\n ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 ELSE (CASE WHEN paid IS TRUE THEN amount ELSE 0 END) END) AS received,\n  amount AS to_recieve,\n  amount AS sent,\n  amount AS to_send\n  FROM ledger_general_intermediate_view"
  }

  // remove
  collection.schema.removeField("ww3odvm5")

  // remove
  collection.schema.removeField("dpvehyk5")

  // remove
  collection.schema.removeField("nob0i5py")

  // remove
  collection.schema.removeField("sfd27fmy")

  // remove
  collection.schema.removeField("5f0lp67l")

  // remove
  collection.schema.removeField("sh5slvk4")

  // remove
  collection.schema.removeField("bciwnemf")

  // remove
  collection.schema.removeField("h6soloyk")

  // remove
  collection.schema.removeField("9zafkobm")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1di9h26p",
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
    "id": "fpaficry",
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
    "id": "jsuwt8jy",
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
    "id": "rymly9kq",
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
    "id": "nzn2heae",
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
    "id": "elnjcmq1",
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
    "id": "979so1ci",
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
    "id": "vxeuowzn",
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
    "id": "iqc79goy",
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
    "query": "SELECT id, created, description,\n  transaction_type,\n  account_type,\n  amount,\n  paid,\n ( CASE WHEN account_type == 'sending' OR account_type == 'cash' THEN 0 END) AS received,\n  amount AS to_recieve,\n  amount AS sent,\n  amount AS to_send\n  FROM ledger_general_intermediate_view"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ww3odvm5",
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
    "id": "dpvehyk5",
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
    "id": "nob0i5py",
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
    "id": "sfd27fmy",
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
    "id": "5f0lp67l",
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
    "id": "sh5slvk4",
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
    "id": "bciwnemf",
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
    "id": "h6soloyk",
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
    "id": "9zafkobm",
    "name": "to_send",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("1di9h26p")

  // remove
  collection.schema.removeField("fpaficry")

  // remove
  collection.schema.removeField("jsuwt8jy")

  // remove
  collection.schema.removeField("rymly9kq")

  // remove
  collection.schema.removeField("nzn2heae")

  // remove
  collection.schema.removeField("elnjcmq1")

  // remove
  collection.schema.removeField("979so1ci")

  // remove
  collection.schema.removeField("vxeuowzn")

  // remove
  collection.schema.removeField("iqc79goy")

  return dao.saveCollection(collection)
})
