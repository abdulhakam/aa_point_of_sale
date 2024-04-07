/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT id,name,created,sale_price,cost_price,box_size_qty,category,qty,net_price FROM (SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n  items.cost_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty,\n  ((transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(invoices.discount_1/100.0))\n  *(1-(invoices.discount_2/100.0))\n  )/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase')"
  }

  // remove
  collection.schema.removeField("d2juqgk6")

  // remove
  collection.schema.removeField("xom7ukcq")

  // remove
  collection.schema.removeField("cydijfha")

  // remove
  collection.schema.removeField("rlhm1fsi")

  // remove
  collection.schema.removeField("h4p6cwme")

  // remove
  collection.schema.removeField("a1tohnun")

  // remove
  collection.schema.removeField("kmlyd3uf")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zwi0ia8m",
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
    "id": "0lnbmz3j",
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
    "id": "0d5wmt3b",
    "name": "cost_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1km798f0",
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
    "id": "3lm0wkcs",
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
    "id": "u6xzhveh",
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
    "id": "p9zkempx",
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
    "query": "SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n  items.cost_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty,\n  ((transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(invoices.discount_1/100.0))\n  *(1-(invoices.discount_2/100.0))\n  )/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase'"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "d2juqgk6",
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
    "id": "xom7ukcq",
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
    "id": "cydijfha",
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
    "id": "rlhm1fsi",
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
    "id": "h4p6cwme",
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
    "id": "a1tohnun",
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
    "id": "kmlyd3uf",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("zwi0ia8m")

  // remove
  collection.schema.removeField("0lnbmz3j")

  // remove
  collection.schema.removeField("0d5wmt3b")

  // remove
  collection.schema.removeField("1km798f0")

  // remove
  collection.schema.removeField("3lm0wkcs")

  // remove
  collection.schema.removeField("u6xzhveh")

  // remove
  collection.schema.removeField("p9zkempx")

  return dao.saveCollection(collection)
})
