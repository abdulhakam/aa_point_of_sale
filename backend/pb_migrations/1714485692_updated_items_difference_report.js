/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ltg0odkfmy47w0a")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum(\n  CASE WHEN transaction_view.type == 'difference'\n  THEN transaction_view.qty+transaction_view.scheme\n  ELSE 0 END) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nLEFT JOIN invoices on transaction_view.invoice = invoices.id\nGROUP BY items.id"
  }

  // remove
  collection.schema.removeField("ko7rqoto")

  // remove
  collection.schema.removeField("lyycotwe")

  // remove
  collection.schema.removeField("b68l77ia")

  // remove
  collection.schema.removeField("gcmy1jdz")

  // remove
  collection.schema.removeField("ayk7zcla")

  // remove
  collection.schema.removeField("gukb9w2d")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wrdozqrd",
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
    "id": "hrvcrf0p",
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
    "id": "ruxk3lfc",
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
    "id": "bvwe79mz",
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
    "id": "etnfvxmx",
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
    "id": "pexoraoj",
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
  const collection = dao.findCollectionByNameOrId("ltg0odkfmy47w0a")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum(\n  CASE WHEN transaction_view.type == 'return' \n  THEN (CASE WHEN transaction_view.party_type == 'customer' \n    THEN transaction_view.qty+transaction_view.scheme \n    ELSE -transaction_view.qty-transaction_view.scheme END) \n  WHEN transaction_view.type == 'difference'\n  THEN transaction_view.qty+transaction_view.scheme\n  ELSE (CASE WHEN transaction_view.type='sale' \n    THEN -transaction_view.qty-transaction_view.scheme \n    ELSE transaction_view.qty+transaction_view.scheme END) END) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nLEFT JOIN invoices on transaction_view.invoice = invoices.id\nGROUP BY items.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ko7rqoto",
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
    "id": "lyycotwe",
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
    "id": "b68l77ia",
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
    "id": "gcmy1jdz",
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
    "id": "ayk7zcla",
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
    "id": "gukb9w2d",
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
  collection.schema.removeField("wrdozqrd")

  // remove
  collection.schema.removeField("hrvcrf0p")

  // remove
  collection.schema.removeField("ruxk3lfc")

  // remove
  collection.schema.removeField("bvwe79mz")

  // remove
  collection.schema.removeField("etnfvxmx")

  // remove
  collection.schema.removeField("pexoraoj")

  return dao.saveCollection(collection)
})
