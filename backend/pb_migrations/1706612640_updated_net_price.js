/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n    items.id,\n    items.name,\n    items.created,\n    items.sale_price,\n    items.box_size_qty,\n    items.category,\n    -- IFNULL(transactions.qty, 0) AS qty,\n    (CASE \n        WHEN transactions.price IS NULL THEN 0\n        ELSE ((transactions.price*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n    END) AS net_price\nFROM \n    items\nLEFT JOIN \n    transactions ON items.id = transactions.item\nLEFT JOIN \n    invoices ON transactions.invoice = invoices.id AND invoices.updated = (SELECT MAX(updated) FROM invoices WHERE id = transactions.invoice) AND invoices.type = 'purchase'\n"
  }

  // remove
  collection.schema.removeField("nnbf3smt")

  // remove
  collection.schema.removeField("almlv9pd")

  // remove
  collection.schema.removeField("ytvi9u1a")

  // remove
  collection.schema.removeField("jcq149ve")

  // remove
  collection.schema.removeField("a23oaxsn")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "c5onttqt",
    "name": "name",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "473ihgdv",
    "name": "sale_price",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8zpegc9j",
    "name": "box_size_qty",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "clrgj5ad",
    "name": "category",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "106aq516rbyoq0q",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tchgu3p8",
    "name": "net_price",
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
    "query": "SELECT \n    items.id,\n    items.name,\n    items.created,\n    items.sale_price,\n    items.box_size_qty,\n    items.category,\n    -- IFNULL(transactions.qty, 0) AS qty,\n    (CASE \n        WHEN transactions.price IS NULL THEN 0\n        ELSE ((transactions.price*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n    END) AS net_price\nFROM \n    items\nLEFT JOIN \n    transactions ON items.id = transactions.item AND transactions.updated = (SELECT MAX(updated) FROM transactions WHERE item = items.id)\nLEFT JOIN \n    invoices ON transactions.invoice = invoices.id AND invoices.updated = (SELECT MAX(updated) FROM invoices WHERE id = transactions.invoice) AND invoices.type = 'purchase'\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nnbf3smt",
    "name": "name",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "almlv9pd",
    "name": "sale_price",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ytvi9u1a",
    "name": "box_size_qty",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "noDecimal": false
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jcq149ve",
    "name": "category",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "106aq516rbyoq0q",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "a23oaxsn",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("c5onttqt")

  // remove
  collection.schema.removeField("473ihgdv")

  // remove
  collection.schema.removeField("8zpegc9j")

  // remove
  collection.schema.removeField("clrgj5ad")

  // remove
  collection.schema.removeField("tchgu3p8")

  return dao.saveCollection(collection)
})
