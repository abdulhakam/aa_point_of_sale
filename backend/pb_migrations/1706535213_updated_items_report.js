/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("b6k9q4y6o24gff3")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  transaction_view.net_cptrans AS net_cp,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum((CASE WHEN transaction_view.type='sale' THEN -transaction_view.qty-transaction_view.scheme ELSE transaction_view.qty+transaction_view.scheme END)) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nGROUP BY items.id"
  }

  // remove
  collection.schema.removeField("nebrpd6f")

  // remove
  collection.schema.removeField("a9et5d4c")

  // remove
  collection.schema.removeField("ibf47hx9")

  // remove
  collection.schema.removeField("ghdhzrqg")

  // remove
  collection.schema.removeField("pbfxomal")

  // remove
  collection.schema.removeField("z5yodias")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "slwynizt",
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
    "id": "joarzh1i",
    "name": "net_cp",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cy9761ys",
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
    "id": "zaug82ff",
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
    "id": "czqtppax",
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
    "id": "6hv0htj5",
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
    "id": "1u7ugvw4",
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
  const collection = dao.findCollectionByNameOrId("b6k9q4y6o24gff3")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated, \n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum((CASE WHEN transaction_view.type='sale' THEN -transaction_view.qty-transaction_view.scheme ELSE transaction_view.qty+transaction_view.scheme END)) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nGROUP BY items.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nebrpd6f",
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
    "id": "a9et5d4c",
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
    "id": "ibf47hx9",
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
    "id": "ghdhzrqg",
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
    "id": "pbfxomal",
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
    "id": "z5yodias",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("slwynizt")

  // remove
  collection.schema.removeField("joarzh1i")

  // remove
  collection.schema.removeField("cy9761ys")

  // remove
  collection.schema.removeField("zaug82ff")

  // remove
  collection.schema.removeField("czqtppax")

  // remove
  collection.schema.removeField("6hv0htj5")

  // remove
  collection.schema.removeField("1u7ugvw4")

  return dao.saveCollection(collection)
})
