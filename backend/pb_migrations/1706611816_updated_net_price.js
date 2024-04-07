/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n    items.id,\n    items.name,\n    items.created,\n    items.sale_price,\n    items.box_size_qty,\n    items.category,\n    (CASE \n        WHEN transactions.price IS NULL THEN 0\n        ELSE (((transactions.price*transactions.qty)*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n    END) AS net_price\nFROM \n    items\nLEFT JOIN \n    transactions ON items.id = transactions.item\nLEFT JOIN \n    invoices ON transactions.invoice = invoices.id\nWHERE \n    invoices.type = 'purchase'"
  }

  // remove
  collection.schema.removeField("rbjn1vmp")

  // remove
  collection.schema.removeField("yne7b89m")

  // remove
  collection.schema.removeField("tgcz1qsz")

  // remove
  collection.schema.removeField("br1b31al")

  // remove
  collection.schema.removeField("5uclcbyo")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6l8o3qtz",
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
    "id": "kfka4v26",
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
    "id": "4n8unzxx",
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
    "id": "j8t3qsd7",
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
    "id": "uhregbfy",
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
    "query": "SELECT \n    items.id,\n    items.name,\n    items.created,\n    items.sale_price,\n    items.box_size_qty,\n    items.category,\n    (CASE \n        WHEN transactions.price IS NULL THEN 0\n        ELSE ((transactions.price*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n    END) AS net_price\nFROM \n    items\nLEFT JOIN \n    transactions ON items.id = transactions.item\nLEFT JOIN \n    invoices ON transactions.invoice = invoices.id\nWHERE \n    invoices.type = 'purchase'"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rbjn1vmp",
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
    "id": "yne7b89m",
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
    "id": "tgcz1qsz",
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
    "id": "br1b31al",
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
    "id": "5uclcbyo",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("6l8o3qtz")

  // remove
  collection.schema.removeField("kfka4v26")

  // remove
  collection.schema.removeField("4n8unzxx")

  // remove
  collection.schema.removeField("j8t3qsd7")

  // remove
  collection.schema.removeField("uhregbfy")

  return dao.saveCollection(collection)
})
