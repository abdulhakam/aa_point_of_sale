/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("bbhgknkuvqiyhsa")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  --transaction_view.net_cptrans AS net_cp,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum(\n  CASE WHEN transaction_view.type == 'return' \n  THEN (CASE WHEN transaction_view.party_type == 'customer' \n    THEN -transaction_view.qty+transaction_view.scheme \n    ELSE transaction_view.qty-transaction_view.scheme END) \n  ELSE (CASE WHEN transaction_view.type='sale' \n    THEN -transaction_view.qty-transaction_view.scheme \n    ELSE transaction_view.qty+transaction_view.scheme END) END) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nLEFT JOIN invoices on transaction_view.invoice = invoices.id\nGROUP BY items.id"
  }

  // remove
  collection.schema.removeField("7awvsciv")

  // remove
  collection.schema.removeField("i5jpbljx")

  // remove
  collection.schema.removeField("so1aoanm")

  // remove
  collection.schema.removeField("pdcidk4c")

  // remove
  collection.schema.removeField("iif4gzji")

  // remove
  collection.schema.removeField("cn0inwuj")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "851amnvx",
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
    "id": "1qjpb8ev",
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
    "id": "mdf61wxa",
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
    "id": "ddfmmvh0",
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
    "id": "tofidzel",
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
    "id": "8diq4xa3",
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
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.updated,\n  --transaction_view.net_cptrans AS net_cp,\n  items.cost_price, \n  items.sale_price, \n  items.box_size_qty, \n  items.category, \n  sum(\n  CASE WHEN transaction_view.type == 'return' \n  THEN (CASE WHEN parties.type == 'customer' \n    THEN -transaction_view.qty+transaction_view.scheme \n    ELSE transaction_view.qty-transaction_view.scheme END) \n  ELSE (CASE WHEN transaction_view.type='sale' \n    THEN -transaction_view.qty-transaction_view.scheme \n    ELSE transaction_view.qty+transaction_view.scheme END) END) as qty\nFROM items\nLEFT JOIN transaction_view on transaction_view.item = items.id\nLEFT JOIN invoices on transaction_view.invoice = invoices.id\nLEFT JOIN parties on invoices.party = parties.id\nGROUP BY items.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "7awvsciv",
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
    "id": "i5jpbljx",
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
    "id": "so1aoanm",
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
    "id": "pdcidk4c",
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
    "id": "iif4gzji",
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
    "id": "cn0inwuj",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("851amnvx")

  // remove
  collection.schema.removeField("1qjpb8ev")

  // remove
  collection.schema.removeField("mdf61wxa")

  // remove
  collection.schema.removeField("ddfmmvh0")

  // remove
  collection.schema.removeField("tofidzel")

  // remove
  collection.schema.removeField("8diq4xa3")

  return dao.saveCollection(collection)
})
