/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT id,net_price,name,created,sale_price,box_size_qty,category,qty FROM (SELECT \n   items.id,\n   (CASE \n       WHEN transactions.price IS NULL THEN 0\n       ELSE ((transactions.price*transactions.qty*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n   END) AS net_price,\n   items.name,\n   items.created,\n   items.sale_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \n  AND transactions.updated = (SELECT MAX(updated) FROM transactions WHERE item = items.id)\nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase' AND invoices.created = (SELECT MAX(created) FROM invoices WHERE transactions.invoice = invoices.id )) WHERE net_price IS NOT NULL"
  }

  // remove
  collection.schema.removeField("x1mvpad3")

  // remove
  collection.schema.removeField("p0jcznpi")

  // remove
  collection.schema.removeField("lrcnmusk")

  // remove
  collection.schema.removeField("qslxmovg")

  // remove
  collection.schema.removeField("1hyjisec")

  // remove
  collection.schema.removeField("ktmkwbmp")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "azciipct",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lfamtsks",
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
    "id": "etdvmube",
    "name": "sale_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2erj1z84",
    "name": "box_size_qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lutjwoiu",
    "name": "category",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fkzisna9",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT id,net_price,name,created,sale_price,box_size_qty,category,qty FROM (SELECT \n   items.id,\n   (CASE \n       WHEN transactions.price IS NULL THEN 0\n       ELSE ((transactions.price*transactions.qty*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n   END) AS net_price,\n   items.name,\n   items.created,\n   items.sale_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \n  -- AND transactions.updated = (SELECT MAX(updated) FROM transactions WHERE item = items.id)\nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase' AND invoices.created = (SELECT MAX(created) FROM invoices WHERE transactions.invoice = invoices.id )) WHERE net_price IS NOT NULL"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "x1mvpad3",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "p0jcznpi",
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
    "id": "lrcnmusk",
    "name": "sale_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qslxmovg",
    "name": "box_size_qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1hyjisec",
    "name": "category",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ktmkwbmp",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("azciipct")

  // remove
  collection.schema.removeField("lfamtsks")

  // remove
  collection.schema.removeField("etdvmube")

  // remove
  collection.schema.removeField("2erj1z84")

  // remove
  collection.schema.removeField("lutjwoiu")

  // remove
  collection.schema.removeField("fkzisna9")

  return dao.saveCollection(collection)
})
