/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("228mbdx8pheecly")

  collection.options = {
    "query": "SELECT\n  invoices.id,\n  invoices.date,\n  invoices.type,\n  invoices.invoiceNo,\n  party,\n  booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  --transactions_view.net_cptrans*qty AS stock_price,\n  COALESCE(SUM(transaction_view.total), 0) AS total,\n\n  ((COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100)) AS final_total,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n  invoices\n  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY\n  invoices.id"
  }

  // remove
  collection.schema.removeField("crhetjq5")

  // remove
  collection.schema.removeField("6febjd1k")

  // remove
  collection.schema.removeField("eoc0zygy")

  // remove
  collection.schema.removeField("gfgmtyp4")

  // remove
  collection.schema.removeField("lmtncnax")

  // remove
  collection.schema.removeField("xbmb8x8t")

  // remove
  collection.schema.removeField("6zqdjnsn")

  // remove
  collection.schema.removeField("hgwmhq6v")

  // remove
  collection.schema.removeField("0bqnibmh")

  // remove
  collection.schema.removeField("fyyda0cf")

  // remove
  collection.schema.removeField("lz8bnqk2")

  // remove
  collection.schema.removeField("4unl7jut")

  // remove
  collection.schema.removeField("u60jfdak")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hnqp7ei2",
    "name": "date",
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
    "id": "hfqhdx9n",
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
    "id": "9anjp05d",
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
    "id": "x6w1xhry",
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
    "id": "nnyd5boh",
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
    "id": "zaskkfzz",
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
    "id": "figqdndh",
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
    "id": "rjkhst4e",
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
    "id": "ty9r4gq9",
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
    "id": "2a61sjcc",
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
    "id": "vdi7tgrg",
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
    "id": "7wchci9h",
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
    "id": "livfrvtn",
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
    "id": "s4z3ksg0",
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
    "query": "SELECT\n  invoices.id,\n  invoices.type,\n  invoices.invoiceNo,\n  party,\n  booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  --transactions_view.net_cptrans*qty AS stock_price,\n  COALESCE(SUM(transaction_view.total), 0) AS total,\n\n  ((COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100)) AS final_total,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n  invoices\n  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY\n  invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "crhetjq5",
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
    "id": "6febjd1k",
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
    "id": "eoc0zygy",
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
    "id": "gfgmtyp4",
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
    "id": "lmtncnax",
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
    "id": "xbmb8x8t",
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
    "id": "6zqdjnsn",
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
    "id": "hgwmhq6v",
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
    "id": "0bqnibmh",
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
    "id": "fyyda0cf",
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
    "id": "lz8bnqk2",
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
    "id": "4unl7jut",
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
    "id": "u60jfdak",
    "name": "completed",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("hnqp7ei2")

  // remove
  collection.schema.removeField("hfqhdx9n")

  // remove
  collection.schema.removeField("9anjp05d")

  // remove
  collection.schema.removeField("x6w1xhry")

  // remove
  collection.schema.removeField("nnyd5boh")

  // remove
  collection.schema.removeField("zaskkfzz")

  // remove
  collection.schema.removeField("figqdndh")

  // remove
  collection.schema.removeField("rjkhst4e")

  // remove
  collection.schema.removeField("ty9r4gq9")

  // remove
  collection.schema.removeField("2a61sjcc")

  // remove
  collection.schema.removeField("vdi7tgrg")

  // remove
  collection.schema.removeField("7wchci9h")

  // remove
  collection.schema.removeField("livfrvtn")

  // remove
  collection.schema.removeField("s4z3ksg0")

  return dao.saveCollection(collection)
})
