/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT `id`,`net_price`,`name`,`created`,`sale_price`,`box_size_qty`,`category`,`qty` FROM (SELECT \n   items.id,\n   (CASE \n       WHEN transactions.price IS NULL THEN 0\n       ELSE ((transactions.price*transactions.qty*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n   END) AS net_price,\n   items.name,\n   items.created,\n   items.sale_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \n  -- AND transactions.updated = (SELECT MAX(updated) FROM transactions WHERE item = items.id)\n  AND net_price IS NOT NULL\nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase' \n  AND invoices.created = (SELECT MAX(created) FROM invoices WHERE transactions.invoice = invoices.id ))"
  }

  // remove
  collection.schema.removeField("4gscsbfw")

  // remove
  collection.schema.removeField("xanhxxxm")

  // remove
  collection.schema.removeField("jeoz83rc")

  // remove
  collection.schema.removeField("hbwpt1bj")

  // remove
  collection.schema.removeField("ahkabdhd")

  // remove
  collection.schema.removeField("sxxfafoa")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "r2rr7yrv",
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
    "id": "ylioakhc",
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
    "id": "mhuwkevv",
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
    "id": "fll0zwst",
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
    "id": "w0otdacf",
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
    "id": "nfjtg4ob",
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
    "query": "SELECT `id`,`net_price`,`name`,`created`,`sale_price`,`box_size_qty`,`category`,`qty` FROM (SELECT \n   items.id,\n   (CASE \n       WHEN transactions.price IS NULL THEN 0\n       ELSE ((transactions.price*transactions.qty*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n   END) AS net_price,\n   items.name,\n   items.created,\n   items.sale_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \n  -- AND transactions.updated = (SELECT MAX(updated) FROM transactions WHERE item = items.id)\n  AND net_price IS NOT NULL\nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase' \n  AND invoices.created = (SELECT MAX(created) FROM invoices WHERE transactions.invoice = invoices.id )) WHERE net_price IS NOT NULL"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4gscsbfw",
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
    "id": "xanhxxxm",
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
    "id": "jeoz83rc",
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
    "id": "hbwpt1bj",
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
    "id": "ahkabdhd",
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
    "id": "sxxfafoa",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("r2rr7yrv")

  // remove
  collection.schema.removeField("ylioakhc")

  // remove
  collection.schema.removeField("mhuwkevv")

  // remove
  collection.schema.removeField("fll0zwst")

  // remove
  collection.schema.removeField("w0otdacf")

  // remove
  collection.schema.removeField("nfjtg4ob")

  return dao.saveCollection(collection)
})
