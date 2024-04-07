/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.sale_price,\n  items.box_size_qty,\n  items.category,\n  --items.qty,\n  COALESCE(\n    (\n      (transaction_view.price*transaction_view.qty)\n      *(1-(transaction_view.discount_1/100.0))\n      *(1-(transaction_view.discount_2/100.0))\n      *(1-(invoice_view.discount_1/100.0))\n      *(1-(invoice_view.discount_2/100.0))\n    ), \n    0\n  ) AS net_price\nFROM \n  items\nLEFT JOIN \n  transaction_view ON transaction_view.item = items.id AND transaction_view.type='purchase'\nLEFT JOIN \n  invoice_view ON invoice_view.id = transaction_view.invoice\nGROUP BY \n  items.id"
  }

  // remove
  collection.schema.removeField("fd0huy2n")

  // remove
  collection.schema.removeField("jmjei7uc")

  // remove
  collection.schema.removeField("3vn21is5")

  // remove
  collection.schema.removeField("m7nluhfu")

  // remove
  collection.schema.removeField("9jcjmovm")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0k93dcv0",
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
    "id": "alk5vmwf",
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
    "id": "shtztgm3",
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
    "id": "3prx8cdx",
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
    "id": "6navktnm",
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
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.sale_price,\n  items.box_size_qty,\n  items.category,\n  --items.qty,\n  COALESCE(\n    (\n      transaction_view.price\n      *(1-(transaction_view.discount_1/100.0))\n      *(1-(transaction_view.discount_2/100.0))\n      *(1-(invoice_view.discount_1/100.0))\n      *(1-(invoice_view.discount_2/100.0))\n    ), \n    0\n  ) AS net_price\nFROM \n  items\nLEFT JOIN \n  transaction_view ON transaction_view.item = items.id AND transaction_view.type='purchase'\nLEFT JOIN \n  invoice_view ON invoice_view.id = transaction_view.invoice\nGROUP BY \n  items.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fd0huy2n",
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
    "id": "jmjei7uc",
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
    "id": "3vn21is5",
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
    "id": "m7nluhfu",
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
    "id": "9jcjmovm",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("0k93dcv0")

  // remove
  collection.schema.removeField("alk5vmwf")

  // remove
  collection.schema.removeField("shtztgm3")

  // remove
  collection.schema.removeField("3prx8cdx")

  // remove
  collection.schema.removeField("6navktnm")

  return dao.saveCollection(collection)
})
