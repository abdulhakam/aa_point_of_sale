/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("bbhgknkuvqiyhsa")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  --transaction_view.net_cptrans AS net_cp,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum((CASE WHEN transaction_view.type='sale' THEN -transaction_view.qty-transaction_view.scheme ELSE transaction_view.qty+transaction_view.scheme END)) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nGROUP BY items.id"
  }

  // remove
  collection.schema.removeField("zaq0rh1j")

  // remove
  collection.schema.removeField("vlcfiypm")

  // remove
  collection.schema.removeField("hufqas2j")

  // remove
  collection.schema.removeField("divcojaz")

  // remove
  collection.schema.removeField("hoezr1qe")

  // remove
  collection.schema.removeField("gjo5vxbo")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ukkhiywb",
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
    "id": "txpi19ek",
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
    "id": "6ypqpzrb",
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
    "id": "ilzj3tai",
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
    "id": "wvv1klt5",
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
    "id": "gc3ky7ke",
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
  const collection = dao.findCollectionByNameOrId("bbhgknkuvqiyhsa")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  --transactions_view.net_cptrans AS net_cp,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum((CASE WHEN transactions_view.type='sale' THEN -transactions_view.qty-transactions_view.scheme ELSE transactions_view.qty+transactions_view.scheme END)) as qty\nFROM items\nLEFT JOIN transactions_view on transactions_view.item = items.id\nGROUP BY items.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zaq0rh1j",
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
    "id": "vlcfiypm",
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
    "id": "hufqas2j",
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
    "id": "divcojaz",
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
    "id": "hoezr1qe",
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
    "id": "gjo5vxbo",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("ukkhiywb")

  // remove
  collection.schema.removeField("txpi19ek")

  // remove
  collection.schema.removeField("6ypqpzrb")

  // remove
  collection.schema.removeField("ilzj3tai")

  // remove
  collection.schema.removeField("wvv1klt5")

  // remove
  collection.schema.removeField("gc3ky7ke")

  return dao.saveCollection(collection)
})
