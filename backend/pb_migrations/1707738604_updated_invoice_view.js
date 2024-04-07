/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("228mbdx8pheecly")

  collection.options = {
    "query": "SELECT\n  invoices.id,\n  (CASE WHEN invoices.dated == \"\" THEN invoices.created ELSE invoices.dated END) AS dated,\n  invoices.type,\n  invoices.invoiceNo,\n  invoices.party,\n  invoices.booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  --transactions_view.net_cptrans*qty AS stock_price,\n  COALESCE(SUM(transaction_view.total), 0) AS total,\n\n  ((COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100)) AS final_total,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n  invoices\n  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY\n  invoices.id"
  }

  // remove
  collection.schema.removeField("zikcvqpe")

  // remove
  collection.schema.removeField("tdzir1h0")

  // remove
  collection.schema.removeField("uif4ppqz")

  // remove
  collection.schema.removeField("l6inzanm")

  // remove
  collection.schema.removeField("ummjog0y")

  // remove
  collection.schema.removeField("ur3i3d9e")

  // remove
  collection.schema.removeField("nmolthaw")

  // remove
  collection.schema.removeField("utrwqsic")

  // remove
  collection.schema.removeField("pyep32wn")

  // remove
  collection.schema.removeField("pnjwzqgf")

  // remove
  collection.schema.removeField("mvrpnvgt")

  // remove
  collection.schema.removeField("4i7qhexf")

  // remove
  collection.schema.removeField("y5iwwrvt")

  // remove
  collection.schema.removeField("ci2mznbg")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tnco40mg",
    "name": "dated",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "t5iyl9iq",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bcxz8ijp",
    "name": "invoiceNo",
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
    "id": "n4wbxizj",
    "name": "party",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "qhdujcbptsh2v29",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ihwgzhyb",
    "name": "booker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "3dz9ii2wo8d5q8g",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ieqbxley",
    "name": "invoice_maker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "_pb_users_auth_",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "f3dguzmz",
    "name": "discount_1",
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
    "id": "qgc4lbtd",
    "name": "discount_2",
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
    "id": "ljaaebel",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sejf48or",
    "name": "final_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "eatstxhb",
    "name": "duedate",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jzevkc2z",
    "name": "description",
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
    "id": "lihm5eqv",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ubljwbk5",
    "name": "completed",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("228mbdx8pheecly")

  collection.options = {
    "query": "SELECT\n  invoices.id,\n  (CASE WHEN invoices.dated == \"\" THEN invoices.created ELSE invoices.dated END) AS dated,\n  invoices.type,\n  invoices.invoiceNo,\n  party,\n  booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  --transactions_view.net_cptrans*qty AS stock_price,\n  COALESCE(SUM(transaction_view.total), 0) AS total,\n\n  ((COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100)) AS final_total,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n  invoices\n  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY\n  invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zikcvqpe",
    "name": "dated",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tdzir1h0",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uif4ppqz",
    "name": "invoiceNo",
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
    "id": "l6inzanm",
    "name": "party",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "qhdujcbptsh2v29",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ummjog0y",
    "name": "booker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "3dz9ii2wo8d5q8g",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ur3i3d9e",
    "name": "invoice_maker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "_pb_users_auth_",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nmolthaw",
    "name": "discount_1",
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
    "id": "utrwqsic",
    "name": "discount_2",
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
    "id": "pyep32wn",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pnjwzqgf",
    "name": "final_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mvrpnvgt",
    "name": "duedate",
    "type": "date",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": "",
      "max": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4i7qhexf",
    "name": "description",
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
    "id": "y5iwwrvt",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ci2mznbg",
    "name": "completed",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("tnco40mg")

  // remove
  collection.schema.removeField("t5iyl9iq")

  // remove
  collection.schema.removeField("bcxz8ijp")

  // remove
  collection.schema.removeField("n4wbxizj")

  // remove
  collection.schema.removeField("ihwgzhyb")

  // remove
  collection.schema.removeField("ieqbxley")

  // remove
  collection.schema.removeField("f3dguzmz")

  // remove
  collection.schema.removeField("qgc4lbtd")

  // remove
  collection.schema.removeField("ljaaebel")

  // remove
  collection.schema.removeField("sejf48or")

  // remove
  collection.schema.removeField("eatstxhb")

  // remove
  collection.schema.removeField("jzevkc2z")

  // remove
  collection.schema.removeField("lihm5eqv")

  // remove
  collection.schema.removeField("ubljwbk5")

  return dao.saveCollection(collection)
})
