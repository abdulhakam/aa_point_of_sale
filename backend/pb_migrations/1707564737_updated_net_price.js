/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty,\n   (CASE WHEN transactions.price ISNULL THEN 0 \n  ELSE ((transactions.price*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n   END) AS net_price\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase'"
  }

  // remove
  collection.schema.removeField("ioycpxod")

  // remove
  collection.schema.removeField("ad60ywgi")

  // remove
  collection.schema.removeField("j3rh9cal")

  // remove
  collection.schema.removeField("emfklk4p")

  // remove
  collection.schema.removeField("g8ruuxxz")

  // remove
  collection.schema.removeField("r3dlkt87")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "euxq7iuj",
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
    "id": "v4arbjhk",
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
    "id": "ejhqhs2e",
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
    "id": "9hole8ft",
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
    "id": "8qrnkj3l",
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
    "id": "wzm4haw4",
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
    "query": "SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty,\n   (CASE WHEN transactions.price IS NULL THEN 0 \n  ELSE ((transactions.price*(1-(transactions.discount_1/100.0))*(1-(transactions.discount_2/100.0))*(1-(invoices.discount_1/100.0))*(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme))\n   END) AS net_price\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase'"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ioycpxod",
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
    "id": "ad60ywgi",
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
    "id": "j3rh9cal",
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
    "id": "emfklk4p",
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
    "id": "g8ruuxxz",
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
    "id": "r3dlkt87",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("euxq7iuj")

  // remove
  collection.schema.removeField("v4arbjhk")

  // remove
  collection.schema.removeField("ejhqhs2e")

  // remove
  collection.schema.removeField("9hole8ft")

  // remove
  collection.schema.removeField("8qrnkj3l")

  // remove
  collection.schema.removeField("wzm4haw4")

  return dao.saveCollection(collection)
})
