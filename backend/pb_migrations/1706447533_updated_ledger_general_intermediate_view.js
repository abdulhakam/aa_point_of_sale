/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.options = {
    "query": "SELECT\n    p.id,\n    p.created,\n    (CASE WHEN p.invoice > 0 THEN 'invoice' ELSE 'expense' END) AS type,\n    (COALESCE(p.description,e.description)) AS name,\n    (CASE p.type WHEN 'sending' THEN 'Debit' ELSE 'Credit' END) AS transaction_type,\n    p.paid AS is_paid,\n    (CASE WHEN p.paid THEN 0 ELSE p.amount END) AS unpaid_amount,\n    p.amount AS recieved,\n    p.amount as not_recieved,\n    p.amount as sent,\n    p.amount as not_sent\nFROM payments_view p\n JOIN expenses e ON p.description = e.description\nWHERE p.type IS NULL OR e.name IS NOT NULL;"
  }

  // remove
  collection.schema.removeField("xrbfjgrf")

  // remove
  collection.schema.removeField("5nxzxyiz")

  // remove
  collection.schema.removeField("14susc06")

  // remove
  collection.schema.removeField("zvkgp1la")

  // remove
  collection.schema.removeField("cojsfpsr")

  // remove
  collection.schema.removeField("9ly1gyoq")

  // remove
  collection.schema.removeField("ggqjwv53")

  // remove
  collection.schema.removeField("sflrq5se")

  // remove
  collection.schema.removeField("gmv07orw")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0lukptj3",
    "name": "type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "7960i7ch",
    "name": "name",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1wwvw8c7",
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
    "id": "kyjox70h",
    "name": "is_paid",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jqnkovmd",
    "name": "unpaid_amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8stqxlff",
    "name": "recieved",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uuarltzc",
    "name": "not_recieved",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "o6g3tdfx",
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
    "id": "blddcrlv",
    "name": "not_sent",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("csrrp810ygcegwz")

  collection.options = {
    "query": "SELECT\n    p.id,\n    p.created,\n    (CASE WHEN p.invoice > 0 THEN 'invoice' ELSE 'expense' END) AS type,\n    (COALESCE(p.description,e.description)) AS name,\n    (CASE p.type WHEN 'sending' THEN 'Debit' ELSE 'Credit' END) AS transaction_type,\n    p.paid AS is_paid,\n    (CASE WHEN p.paid THEN 0 ELSE p.amount END) AS unpaid_amount,\n    p.amount AS recieved,\n    p.amount as not_recieved,\n    p.amount as sent,\n    p.amount as not_sent\nFROM payments_view p\n  LEFT JOIN expenses e ON p.description = e.description\nWHERE p.type IS NULL OR e.name IS NOT NULL;"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xrbfjgrf",
    "name": "type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "5nxzxyiz",
    "name": "name",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "14susc06",
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
    "id": "zvkgp1la",
    "name": "is_paid",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cojsfpsr",
    "name": "unpaid_amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9ly1gyoq",
    "name": "recieved",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ggqjwv53",
    "name": "not_recieved",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sflrq5se",
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
    "id": "gmv07orw",
    "name": "not_sent",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("0lukptj3")

  // remove
  collection.schema.removeField("7960i7ch")

  // remove
  collection.schema.removeField("1wwvw8c7")

  // remove
  collection.schema.removeField("kyjox70h")

  // remove
  collection.schema.removeField("jqnkovmd")

  // remove
  collection.schema.removeField("8stqxlff")

  // remove
  collection.schema.removeField("uuarltzc")

  // remove
  collection.schema.removeField("o6g3tdfx")

  // remove
  collection.schema.removeField("blddcrlv")

  return dao.saveCollection(collection)
})
