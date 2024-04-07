/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("b6k9q4y6o24gff3")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated, \n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum((CASE WHEN transaction_view.type='sale' THEN -transaction_view.qty-transaction_view.scheme ELSE transaction_view.qty+transaction_view.scheme END)) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nGROUP BY items.id"
  }

  // remove
  collection.schema.removeField("jlh1mj7t")

  // remove
  collection.schema.removeField("wnvkioi7")

  // remove
  collection.schema.removeField("ctyb3btt")

  // remove
  collection.schema.removeField("ynaavho1")

  // remove
  collection.schema.removeField("ejkxajgq")

  // remove
  collection.schema.removeField("gusyucsm")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "lywrgy57",
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
    "id": "24kfxlmz",
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
    "id": "8yrfp8mk",
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
    "id": "a67equnb",
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
    "id": "fyyyqnqp",
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
    "id": "s4war2pl",
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
    "query": "SELECT items.id, items.name,items.created,items.updated, items.cost_price, items.sale_price, items.box_size_qty, items.category, \n  sum((CASE WHEN transaction_view.type='sale' THEN -transaction_view.qty-transaction_view.scheme ELSE transaction_view.qty+transaction_view.scheme END)) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nGROUP BY items.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jlh1mj7t",
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
    "id": "wnvkioi7",
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
    "id": "ctyb3btt",
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
    "id": "ynaavho1",
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
    "id": "ejkxajgq",
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
    "id": "gusyucsm",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("lywrgy57")

  // remove
  collection.schema.removeField("24kfxlmz")

  // remove
  collection.schema.removeField("8yrfp8mk")

  // remove
  collection.schema.removeField("a67equnb")

  // remove
  collection.schema.removeField("fyyyqnqp")

  // remove
  collection.schema.removeField("s4war2pl")

  return dao.saveCollection(collection)
})
