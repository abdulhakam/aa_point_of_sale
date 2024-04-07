/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n  items.cost_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty,\n  invoices.discount_2 AS test,\n  ((transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(invoices.discount_1/100.0))\n  *(1-(invoices.discount_2/100.0))\n  )/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase'"
  }

  // remove
  collection.schema.removeField("nbv85sfc")

  // remove
  collection.schema.removeField("ppecnx41")

  // remove
  collection.schema.removeField("qgvuiqbe")

  // remove
  collection.schema.removeField("xrlieuay")

  // remove
  collection.schema.removeField("ougskoae")

  // remove
  collection.schema.removeField("r7qoyaxk")

  // remove
  collection.schema.removeField("ionnslwi")

  // remove
  collection.schema.removeField("tt0a2agw")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gozjympl",
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
    "id": "s4vhrora",
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
    "id": "kmvlpqyp",
    "name": "cost_price",
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
    "id": "omoty9eo",
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
    "id": "beyocur2",
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
    "id": "aqsq9lbk",
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
    "id": "1thkrtri",
    "name": "test",
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
    "id": "dbc1t6mh",
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
    "query": "SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n  items.cost_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty,\n  transactions.discount_2 AS test,\n  ((transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(invoices.discount_1/100.0))\n  *(1-(invoices.discount_2/100.0))\n  )/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase'"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nbv85sfc",
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
    "id": "ppecnx41",
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
    "id": "qgvuiqbe",
    "name": "cost_price",
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
    "id": "xrlieuay",
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
    "id": "ougskoae",
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
    "id": "r7qoyaxk",
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
    "id": "ionnslwi",
    "name": "test",
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
    "id": "tt0a2agw",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("gozjympl")

  // remove
  collection.schema.removeField("s4vhrora")

  // remove
  collection.schema.removeField("kmvlpqyp")

  // remove
  collection.schema.removeField("omoty9eo")

  // remove
  collection.schema.removeField("beyocur2")

  // remove
  collection.schema.removeField("aqsq9lbk")

  // remove
  collection.schema.removeField("1thkrtri")

  // remove
  collection.schema.removeField("dbc1t6mh")

  return dao.saveCollection(collection)
})
