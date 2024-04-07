/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("bbhgknkuvqiyhsa")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum(\n  CASE WHEN transaction_view.type == 'return' \n  THEN (CASE WHEN transaction_view.party_type == 'customer' \n    THEN transaction_view.qty+transaction_view.scheme \n    ELSE -transaction_view.qty-transaction_view.scheme END) \n  ELSE (CASE WHEN transaction_view.type='sale' \n    THEN -transaction_view.qty-transaction_view.scheme \n    ELSE transaction_view.qty+transaction_view.scheme END) END) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nLEFT JOIN invoices on transaction_view.invoice = invoices.id\nGROUP BY items.id"
  }

  // remove
  collection.schema.removeField("mgbolpuj")

  // remove
  collection.schema.removeField("82rkahcp")

  // remove
  collection.schema.removeField("qwvynlhj")

  // remove
  collection.schema.removeField("xkclarwj")

  // remove
  collection.schema.removeField("vaebuc7m")

  // remove
  collection.schema.removeField("wkalmzh7")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dvbcx4av",
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
    "id": "ktauxi4z",
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
    "id": "8pun8ji2",
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
    "id": "w9cyex21",
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
    "id": "74l3yqhh",
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
    "id": "ufvqrxoe",
    "name": "qty",
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
  const collection = dao.findCollectionByNameOrId("bbhgknkuvqiyhsa")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  --transaction_view.net_cptrans AS net_cp,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum(\n  CASE WHEN transaction_view.type == 'return' \n  THEN (CASE WHEN transaction_view.party_type == 'customer' \n    THEN transaction_view.qty+transaction_view.scheme \n    ELSE -transaction_view.qty-transaction_view.scheme END) \n  ELSE (CASE WHEN transaction_view.type='sale' \n    THEN -transaction_view.qty-transaction_view.scheme \n    ELSE transaction_view.qty+transaction_view.scheme END) END) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nLEFT JOIN invoices on transaction_view.invoice = invoices.id\nGROUP BY items.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mgbolpuj",
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
    "id": "82rkahcp",
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
    "id": "qwvynlhj",
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
    "id": "xkclarwj",
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
    "id": "vaebuc7m",
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
    "id": "wkalmzh7",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // remove
  collection.schema.removeField("dvbcx4av")

  // remove
  collection.schema.removeField("ktauxi4z")

  // remove
  collection.schema.removeField("8pun8ji2")

  // remove
  collection.schema.removeField("w9cyex21")

  // remove
  collection.schema.removeField("74l3yqhh")

  // remove
  collection.schema.removeField("ufvqrxoe")

  return dao.saveCollection(collection)
})
