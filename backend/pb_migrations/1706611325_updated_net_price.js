/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n    items.id,\n    items.name,\n    items.created,\n    items.sale_price,\n    items.box_size_qty,\n    items.category,\n    IFNULL(transactions.qty, 0) AS qty,\n    (CASE \n        WHEN transactions.price IS NULL THEN 0\n        ELSE ((transactions.price*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n    END) AS net_price\nFROM \n    items\nLEFT JOIN \n    transactions ON items.id = transactions.item\nLEFT JOIN \n    invoices ON transactions.invoice = invoices.id\nWHERE \n    invoices.type = 'purchase'\nAND \n    transactions.updated = (SELECT MAX(updated) FROM transactions WHERE item = items.id)\nAND \n    invoices.updated = (SELECT MAX(updated) FROM invoices WHERE id = transactions.invoice);"
  }

  // remove
  collection.schema.removeField("rancjupo")

  // remove
  collection.schema.removeField("sy90xpwu")

  // remove
  collection.schema.removeField("os4giu1r")

  // remove
  collection.schema.removeField("qzvxbam9")

  // remove
  collection.schema.removeField("tt0q0qdd")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bddfacos",
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
    "id": "bxl5yqwg",
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
    "id": "xy2vrkfk",
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
    "id": "kzclg3hp",
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
    "id": "vp38h6kf",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bwnkaz71",
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
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.sale_price,\n  items.box_size_qty,\n  items.category,\n  --items.qty,\n  COALESCE(\n    (\n      ((transaction_view.price*transaction_view.qty)\n      *(1-(transaction_view.discount_1/100.0))\n      *(1-(transaction_view.discount_2/100.0))\n      *(1-(invoice_view.discount_1/100.0))\n      *(1-(invoice_view.discount_2/100.0))/(transaction_view.qty+transaction_view.scheme))\n    ), \n    0\n  ) AS net_price\nFROM \n  items\nLEFT JOIN \n  transaction_view ON transaction_view.item = items.id AND transaction_view.type='purchase'\nLEFT JOIN \n  invoice_view ON invoice_view.id = transaction_view.invoice\nGROUP BY \n  items.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rancjupo",
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
    "id": "sy90xpwu",
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
    "id": "os4giu1r",
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
    "id": "qzvxbam9",
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
    "id": "tt0q0qdd",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("bddfacos")

  // remove
  collection.schema.removeField("bxl5yqwg")

  // remove
  collection.schema.removeField("xy2vrkfk")

  // remove
  collection.schema.removeField("kzclg3hp")

  // remove
  collection.schema.removeField("vp38h6kf")

  // remove
  collection.schema.removeField("bwnkaz71")

  return dao.saveCollection(collection)
})
