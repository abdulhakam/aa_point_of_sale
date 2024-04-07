/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("t50jyu2rl1dfwgr")

  collection.options = {
    "query": "SELECT z_trans_d1t.id,\n  invoice,\n  invoices.invoiceNo,\n  item,\n  z_trans_d1t.type,\n  ((cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))/(qty+scheme))-(cp_d1t*invoices.discount_2/100) AS net_CPCPCPTrans,\n  ((cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))/(qty+scheme)) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  z_trans_d1t.discount_1,\n  z_trans_d1t.discount_2,\n  (1.0*d1t-(d1t*z_trans_d1t.discount_2/100)) AS total,\n  z_trans_d1t.deleted,\n  z_trans_d1t.created,\n  z_trans_d1t.updated\n  FROM \n  z_trans_d1t\nLEFT JOIN invoices ON z_trans_d1t.invoice = invoices.id"
  }

  // remove
  collection.schema.removeField("9cruxnxo")

  // remove
  collection.schema.removeField("fds3dhf3")

  // remove
  collection.schema.removeField("5aqjertz")

  // remove
  collection.schema.removeField("nlcxxsu8")

  // remove
  collection.schema.removeField("m9rr5v7u")

  // remove
  collection.schema.removeField("oimosyzx")

  // remove
  collection.schema.removeField("b6si1svc")

  // remove
  collection.schema.removeField("lqxno1mg")

  // remove
  collection.schema.removeField("gdvbtqlr")

  // remove
  collection.schema.removeField("i3uxr5bg")

  // remove
  collection.schema.removeField("sdixpskr")

  // remove
  collection.schema.removeField("lbq7mjhd")

  // remove
  collection.schema.removeField("xsnk8jq0")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jmvmcbrr",
    "name": "invoice",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "0pwj3vph7ag7nc2",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xl8qfxva",
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
    "id": "6opxjexa",
    "name": "item",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "t063jextuf7c6he",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1gbgcgqa",
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
    "id": "erdrrwqe",
    "name": "net_CPCPCPTrans",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "odkrr7a0",
    "name": "net_cptrans",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wr5hk3wr",
    "name": "price",
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
    "id": "tnj0nkow",
    "name": "qty",
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
    "id": "osxqramb",
    "name": "scheme",
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
    "id": "otee0vlu",
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
    "id": "o8oov9vs",
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
    "id": "gq5mjj8c",
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
    "id": "bkcfd5za",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("t50jyu2rl1dfwgr")

  collection.options = {
    "query": "SELECT z_trans_d1t.id,\n  invoice,\n  invoices.invoiceNo,\n  item,\n  z_trans_d1t.type,\n  ((cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))/(qty+scheme)) AS net_CPCPCPTrans,\n  ((cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))/(qty+scheme)) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  z_trans_d1t.discount_1,\n  z_trans_d1t.discount_2,\n  (1.0*d1t-(d1t*z_trans_d1t.discount_2/100)) AS total,\n  z_trans_d1t.deleted,\n  z_trans_d1t.created,\n  z_trans_d1t.updated\n  FROM \n  z_trans_d1t\nLEFT JOIN invoices ON z_trans_d1t.invoice = invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9cruxnxo",
    "name": "invoice",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "0pwj3vph7ag7nc2",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fds3dhf3",
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
    "id": "5aqjertz",
    "name": "item",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "t063jextuf7c6he",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nlcxxsu8",
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
    "id": "m9rr5v7u",
    "name": "net_CPCPCPTrans",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "oimosyzx",
    "name": "net_cptrans",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "b6si1svc",
    "name": "price",
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
    "id": "lqxno1mg",
    "name": "qty",
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
    "id": "gdvbtqlr",
    "name": "scheme",
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
    "id": "i3uxr5bg",
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
    "id": "sdixpskr",
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
    "id": "lbq7mjhd",
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
    "id": "xsnk8jq0",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("jmvmcbrr")

  // remove
  collection.schema.removeField("xl8qfxva")

  // remove
  collection.schema.removeField("6opxjexa")

  // remove
  collection.schema.removeField("1gbgcgqa")

  // remove
  collection.schema.removeField("erdrrwqe")

  // remove
  collection.schema.removeField("odkrr7a0")

  // remove
  collection.schema.removeField("wr5hk3wr")

  // remove
  collection.schema.removeField("tnj0nkow")

  // remove
  collection.schema.removeField("osxqramb")

  // remove
  collection.schema.removeField("otee0vlu")

  // remove
  collection.schema.removeField("o8oov9vs")

  // remove
  collection.schema.removeField("gq5mjj8c")

  // remove
  collection.schema.removeField("bkcfd5za")

  return dao.saveCollection(collection)
})
