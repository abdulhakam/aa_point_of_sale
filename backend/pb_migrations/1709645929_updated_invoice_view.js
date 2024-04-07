/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("228mbdx8pheecly")

  collection.options = {
    "query": "SELECT\n  invoices.id,\n  (CASE WHEN invoices.dated == \"\" THEN invoices.created ELSE invoices.dated END) AS dated,\n  invoices.type,\n  invoices.invoiceNo,\n  invoices.party,\n  invoices.booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  --transactions_view.net_cptrans*qty AS stock_price,\n  printf(\"%.2f\",COALESCE(SUM(printf(\"%.2f\",transaction_view.total)), 0)) AS total,\nprintf(\"%.2f\",(COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100)) AS unrounded_total,\n  invoices.discount_rs,\n  printf(\"%.2f\",(COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100) - invoices.discount_rs) AS final_total,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n  invoices\n  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY\n  invoices.id"
  }

  // remove
  collection.schema.removeField("osbhdkmb")

  // remove
  collection.schema.removeField("qacddiip")

  // remove
  collection.schema.removeField("xwpi0ckl")

  // remove
  collection.schema.removeField("zaw3zymt")

  // remove
  collection.schema.removeField("yh8hws7l")

  // remove
  collection.schema.removeField("8zs9poma")

  // remove
  collection.schema.removeField("bkewtwmv")

  // remove
  collection.schema.removeField("pzh2pcik")

  // remove
  collection.schema.removeField("gydm3rxb")

  // remove
  collection.schema.removeField("hzbto0tl")

  // remove
  collection.schema.removeField("vsinhyop")

  // remove
  collection.schema.removeField("9qydpdcj")

  // remove
  collection.schema.removeField("grphdjf3")

  // remove
  collection.schema.removeField("5h3mmdsg")

  // remove
  collection.schema.removeField("smbt0vb8")

  // remove
  collection.schema.removeField("ubcsji3v")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sh0wn4fp",
    "name": "dated",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "irptmsrv",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale",
        "return"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xo1lzqzi",
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
    "id": "qi4rztf9",
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
    "id": "ks3as2zn",
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
    "id": "cropl877",
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
    "id": "2wdleoef",
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
    "id": "t2qsjdar",
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
    "id": "qxuuwd0f",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "aanw8jhy",
    "name": "unrounded_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pxfpyvyo",
    "name": "discount_rs",
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
    "id": "hje0rbfo",
    "name": "final_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jxutoeej",
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
    "id": "vrv9gbds",
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
    "id": "t68xm9gh",
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
    "id": "1lxpu6zb",
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
    "query": "SELECT\n  invoices.id,\n  (CASE WHEN invoices.dated == \"\" THEN invoices.created ELSE invoices.dated END) AS dated,\n  invoices.type,\n  invoices.invoiceNo,\n  invoices.party,\n  invoices.booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  --transactions_view.net_cptrans*qty AS stock_price,\n  printf(\"%.2f\",COALESCE(SUM(transaction_view.total), 0)) AS total,\nprintf(\"%.2f\",(COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100)) AS unrounded_total,\n  invoices.discount_rs,\n  printf(\"%.2f\",(COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100) - invoices.discount_rs) AS final_total,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n  invoices\n  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY\n  invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "osbhdkmb",
    "name": "dated",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qacddiip",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale",
        "return"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xwpi0ckl",
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
    "id": "zaw3zymt",
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
    "id": "yh8hws7l",
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
    "id": "8zs9poma",
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
    "id": "bkewtwmv",
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
    "id": "pzh2pcik",
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
    "id": "gydm3rxb",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hzbto0tl",
    "name": "unrounded_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vsinhyop",
    "name": "discount_rs",
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
    "id": "9qydpdcj",
    "name": "final_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "grphdjf3",
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
    "id": "5h3mmdsg",
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
    "id": "smbt0vb8",
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
    "id": "ubcsji3v",
    "name": "completed",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("sh0wn4fp")

  // remove
  collection.schema.removeField("irptmsrv")

  // remove
  collection.schema.removeField("xo1lzqzi")

  // remove
  collection.schema.removeField("qi4rztf9")

  // remove
  collection.schema.removeField("ks3as2zn")

  // remove
  collection.schema.removeField("cropl877")

  // remove
  collection.schema.removeField("2wdleoef")

  // remove
  collection.schema.removeField("t2qsjdar")

  // remove
  collection.schema.removeField("qxuuwd0f")

  // remove
  collection.schema.removeField("aanw8jhy")

  // remove
  collection.schema.removeField("pxfpyvyo")

  // remove
  collection.schema.removeField("hje0rbfo")

  // remove
  collection.schema.removeField("jxutoeej")

  // remove
  collection.schema.removeField("vrv9gbds")

  // remove
  collection.schema.removeField("t68xm9gh")

  // remove
  collection.schema.removeField("1lxpu6zb")

  return dao.saveCollection(collection)
})
