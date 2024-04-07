/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n  items.cost_price,\n   items.box_size_qty,\n   items.category AS company,\n   IFNULL(transactions.qty, 0) AS qty,\n  ((transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(COALESCE(invoices.discount_1,0)/100.0))\n  *(1-(COALESCE(invoices.discount_2,0)/100.0))\n  )/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n   items\nLEFT JOIN \n  transactions ON items.id = transactions.item\nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id"
  }

  // remove
  collection.schema.removeField("vgli6czx")

  // remove
  collection.schema.removeField("czxewuvw")

  // remove
  collection.schema.removeField("0grcolti")

  // remove
  collection.schema.removeField("rxcezxuy")

  // remove
  collection.schema.removeField("grpkhdnf")

  // remove
  collection.schema.removeField("o5ceevkp")

  // remove
  collection.schema.removeField("se94lx3p")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "h2zs229p",
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
    "id": "pwmc3nra",
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
    "id": "hfw0rw17",
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
    "id": "yiq3x4lg",
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
    "id": "ksrp8jlm",
    "name": "company",
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
    "id": "tpoonybp",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ymnjbfuy",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n  items.cost_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty,\n  ((transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(COALESCE(invoices.discount_1,0)/100.0))\n  *(1-(COALESCE(invoices.discount_2,0)/100.0))\n  )/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n   items\nLEFT JOIN \n  transactions ON items.id = transactions.item\nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vgli6czx",
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
    "id": "czxewuvw",
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
    "id": "0grcolti",
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
    "id": "rxcezxuy",
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
    "id": "grpkhdnf",
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
    "id": "o5ceevkp",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "se94lx3p",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // remove
  collection.schema.removeField("h2zs229p")

  // remove
  collection.schema.removeField("pwmc3nra")

  // remove
  collection.schema.removeField("hfw0rw17")

  // remove
  collection.schema.removeField("yiq3x4lg")

  // remove
  collection.schema.removeField("ksrp8jlm")

  // remove
  collection.schema.removeField("tpoonybp")

  // remove
  collection.schema.removeField("ymnjbfuy")

  return dao.saveCollection(collection)
})
