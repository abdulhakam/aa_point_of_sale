/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n    items.id,\n    items.name,\n    items.created,\n    items.sale_price,\n    items.box_size_qty,\n    items.category,\n    IFNULL(transactions.qty, 0) AS qty,\n  \n  (transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  )\n   AS test,\n  \n    ((transactions.price*transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(invoices.discount_1/100.0))\n  *(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n    items\nLEFT JOIN \n    transactions ON items.id = transactions.item  \nLEFT JOIN \n    invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase' AND invoices.created = (SELECT MAX(created) FROM invoices WHERE transactions.invoice = invoices.id )"
  }

  // remove
  collection.schema.removeField("g3feiqmc")

  // remove
  collection.schema.removeField("hnvlcx4b")

  // remove
  collection.schema.removeField("11usfj6f")

  // remove
  collection.schema.removeField("llht5d61")

  // remove
  collection.schema.removeField("x0gej6n8")

  // remove
  collection.schema.removeField("zjluk8vl")

  // remove
  collection.schema.removeField("bbxaddfp")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "i3q1swru",
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
    "id": "xepa9g1l",
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
    "id": "kwzh0cit",
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
    "id": "oo7ihklk",
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
    "id": "a68ldqy4",
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
    "id": "x6fa3ybo",
    "name": "test",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dtzk0qy2",
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
    "query": "SELECT \n    items.id,\n    items.name,\n    items.created,\n    items.sale_price,\n    items.box_size_qty,\n    items.category,\n    IFNULL(transactions.qty, 0) AS qty,\n  \n  (transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0)))\n   AS test,\n  \n    ((transactions.price*transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(invoices.discount_1/100.0))\n  *(1-(invoices.discount_2/100.0)))/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n    items\nLEFT JOIN \n    transactions ON items.id = transactions.item  \nLEFT JOIN \n    invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase' AND invoices.created = (SELECT MAX(created) FROM invoices WHERE transactions.invoice = invoices.id )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "g3feiqmc",
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
    "id": "hnvlcx4b",
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
    "id": "11usfj6f",
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
    "id": "llht5d61",
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
    "id": "x0gej6n8",
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
    "id": "zjluk8vl",
    "name": "test",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bbxaddfp",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("i3q1swru")

  // remove
  collection.schema.removeField("xepa9g1l")

  // remove
  collection.schema.removeField("kwzh0cit")

  // remove
  collection.schema.removeField("oo7ihklk")

  // remove
  collection.schema.removeField("a68ldqy4")

  // remove
  collection.schema.removeField("x6fa3ybo")

  // remove
  collection.schema.removeField("dtzk0qy2")

  return dao.saveCollection(collection)
})
