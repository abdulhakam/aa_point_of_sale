/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n  items.cost_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty,\n  ((transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(COALESCE(invoices.discount_1,0)/100.0))\n  *(1-(COALESCE(invoices.discount_2,0)/100.0))\n  )/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item\nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase'"
  }

  // remove
  collection.schema.removeField("i1qkbxxm")

  // remove
  collection.schema.removeField("duyt4chj")

  // remove
  collection.schema.removeField("ckddxcmx")

  // remove
  collection.schema.removeField("jbinl2uz")

  // remove
  collection.schema.removeField("hxtkebyp")

  // remove
  collection.schema.removeField("qtx45ww8")

  // remove
  collection.schema.removeField("j3jnkgpw")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wofwjplk",
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
    "id": "emoawie7",
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
    "id": "tt2kt7xa",
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
    "id": "ugmv3ad2",
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
    "id": "hvjirncb",
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
    "id": "zzbhhglh",
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
    "id": "chhvlenp",
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
    "query": "SELECT \n   items.id,\n   items.name,\n   items.created,\n   items.sale_price,\n  items.cost_price,\n   items.box_size_qty,\n   items.category,\n   IFNULL(transactions.qty, 0) AS qty,\n  ((transactions.price\n  *transactions.qty\n  *(1-(transactions.discount_1/100.0))\n  *(1-(transactions.discount_2/100.0))\n  *(1-(COALESCE(invoices.discount_1,0)/100.0))\n  *(1-(COALESCE(invoices.discount_2,0)/100.0))\n  )/(transactions.qty+transactions.scheme)) AS net_price\nFROM \n   items\nLEFT JOIN \n   transactions ON items.id = transactions.item \nLEFT JOIN \n   invoices ON transactions.invoice = invoices.id AND invoices.type = 'purchase'"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "i1qkbxxm",
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
    "id": "duyt4chj",
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
    "id": "ckddxcmx",
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
    "id": "jbinl2uz",
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
    "id": "hxtkebyp",
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
    "id": "qtx45ww8",
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
    "id": "j3jnkgpw",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("wofwjplk")

  // remove
  collection.schema.removeField("emoawie7")

  // remove
  collection.schema.removeField("tt2kt7xa")

  // remove
  collection.schema.removeField("ugmv3ad2")

  // remove
  collection.schema.removeField("hvjirncb")

  // remove
  collection.schema.removeField("zzbhhglh")

  // remove
  collection.schema.removeField("chhvlenp")

  return dao.saveCollection(collection)
})
