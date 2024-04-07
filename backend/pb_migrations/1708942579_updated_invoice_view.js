/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("228mbdx8pheecly")

  collection.options = {
    "query": "SELECT\n  invoices.id,\n  (CASE WHEN invoices.dated == \"\" THEN invoices.created ELSE invoices.dated END) AS dated,\n  invoices.type,\n  invoices.invoiceNo,\n  invoices.party,\n  invoices.booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  invoices.discount_rs,\n  --transactions_view.net_cptrans*qty AS stock_price,\n  COALESCE(SUM(transaction_view.total), 0) AS total,\n\n  printf(\"%.2f\",(COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100) - invoices.discount_rs) AS final_total,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n  invoices\n  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY\n  invoices.id"
  }

  // remove
  collection.schema.removeField("twds5w47")

  // remove
  collection.schema.removeField("4vgnymar")

  // remove
  collection.schema.removeField("wvauqmgx")

  // remove
  collection.schema.removeField("uso4o0rc")

  // remove
  collection.schema.removeField("mjy54nhc")

  // remove
  collection.schema.removeField("xsw016hv")

  // remove
  collection.schema.removeField("9t5ypmay")

  // remove
  collection.schema.removeField("kgd7gaax")

  // remove
  collection.schema.removeField("nqz9ftl3")

  // remove
  collection.schema.removeField("58sf8knv")

  // remove
  collection.schema.removeField("ul1wshmb")

  // remove
  collection.schema.removeField("bac5pnn4")

  // remove
  collection.schema.removeField("qlan8ovh")

  // remove
  collection.schema.removeField("lbgofpzl")

  // remove
  collection.schema.removeField("3p8stcgh")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2n6eivty",
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
    "id": "fscxyrea",
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
    "id": "af02io8x",
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
    "id": "ghznnszg",
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
    "id": "xtt3p98p",
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
    "id": "mtmd5zxq",
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
    "id": "c45b7zbh",
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
    "id": "j3ptubyh",
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
    "id": "96smmqqh",
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
    "id": "ysry3adr",
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
    "id": "o7f42j4d",
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
    "id": "xuwfpkt3",
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
    "id": "5y1jfdvg",
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
    "id": "z6bnergn",
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
    "id": "zqqc5svt",
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
    "query": "SELECT\n  invoices.id,\n  (CASE WHEN invoices.dated == \"\" THEN invoices.created ELSE invoices.dated END) AS dated,\n  invoices.type,\n  invoices.invoiceNo,\n  invoices.party,\n  invoices.booker,\n  invoice_maker,\n  invoices.discount_1,\n  invoices.discount_2,\n  invoices.discount_rs,\n  --transactions_view.net_cptrans*qty AS stock_price,\n  COALESCE(SUM(transaction_view.total), 0) AS total,\n\n  ((COALESCE(SUM(transaction_view.total), 0)\n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))\n  - ((COALESCE(SUM(transaction_view.total), 0) \n  - (COALESCE(SUM(transaction_view.total), 0) * invoices.discount_1 / 100))*invoices.discount_2 / 100) - invoices.discount_rs) AS final_total,\n  duedate,\n  description,\n  invoices.created,\n  invoices.updated,\n  invoices.deleted,\n  invoices.completed\nFROM\n  invoices\n  LEFT JOIN transaction_view ON transaction_view.invoice = invoices.id\nGROUP BY\n  invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "twds5w47",
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
    "id": "4vgnymar",
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
    "id": "wvauqmgx",
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
    "id": "uso4o0rc",
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
    "id": "mjy54nhc",
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
    "id": "xsw016hv",
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
    "id": "9t5ypmay",
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
    "id": "kgd7gaax",
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
    "id": "nqz9ftl3",
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
    "id": "58sf8knv",
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
    "id": "ul1wshmb",
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
    "id": "bac5pnn4",
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
    "id": "qlan8ovh",
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
    "id": "lbgofpzl",
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
    "id": "3p8stcgh",
    "name": "completed",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("2n6eivty")

  // remove
  collection.schema.removeField("fscxyrea")

  // remove
  collection.schema.removeField("af02io8x")

  // remove
  collection.schema.removeField("ghznnszg")

  // remove
  collection.schema.removeField("xtt3p98p")

  // remove
  collection.schema.removeField("mtmd5zxq")

  // remove
  collection.schema.removeField("c45b7zbh")

  // remove
  collection.schema.removeField("j3ptubyh")

  // remove
  collection.schema.removeField("96smmqqh")

  // remove
  collection.schema.removeField("ysry3adr")

  // remove
  collection.schema.removeField("o7f42j4d")

  // remove
  collection.schema.removeField("xuwfpkt3")

  // remove
  collection.schema.removeField("5y1jfdvg")

  // remove
  collection.schema.removeField("z6bnergn")

  // remove
  collection.schema.removeField("zqqc5svt")

  return dao.saveCollection(collection)
})
