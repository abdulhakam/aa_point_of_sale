/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("wp4hrm6f5uduwak")

  collection.options = {
    "query": "SELECT zz_trans_inv_d1t.id,\n  invoice,\n  item,\n  zz_trans_inv_d1t.type,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))-(net_CPCPCPTrans*invoices.discount_1/100) AS net_CPCPCPTrans,\n  net_cptrans,\n  price,\n  qty,\n  scheme,\n  zz_trans_inv_d1t.discount_1,\n  zz_trans_inv_d1t.discount_2,\n  total,\n  zz_trans_inv_d1t.deleted,\n  zz_trans_inv_d1t.created,\n  zz_trans_inv_d1t.updated\n  FROM \n  zz_trans_inv_d1t\nLEFT JOIN invoices ON zz_trans_inv_d1t.invoice = invoices.id"
  }

  // remove
  collection.schema.removeField("8otznsbq")

  // remove
  collection.schema.removeField("hhcnjzlo")

  // remove
  collection.schema.removeField("boziffac")

  // remove
  collection.schema.removeField("pog3j8hh")

  // remove
  collection.schema.removeField("yp0p96t3")

  // remove
  collection.schema.removeField("tgdb6pxo")

  // remove
  collection.schema.removeField("7ixuyjpr")

  // remove
  collection.schema.removeField("cv5kyasn")

  // remove
  collection.schema.removeField("ccqlcund")

  // remove
  collection.schema.removeField("bfenwyci")

  // remove
  collection.schema.removeField("t6dmscfc")

  // remove
  collection.schema.removeField("wv41tiph")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zogmxjdo",
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
    "id": "p1rnnm8a",
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
    "id": "ymozjhsr",
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
    "id": "wuvcud0y",
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
    "id": "q4vqybh3",
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
    "id": "qmftyl5v",
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
    "id": "86luxrfv",
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
    "id": "bl8jk5gq",
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
    "id": "nroqot4y",
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
    "id": "1t6rldta",
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
    "id": "h5quwpjv",
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
    "id": "xpsgpvhv",
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
  const collection = dao.findCollectionByNameOrId("wp4hrm6f5uduwak")

  collection.options = {
    "query": "SELECT z_trans_d1t.id,\n  invoice,\n  item,\n  z_trans_d1t.type,\n  (cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))-(cp_d1t*invoices.discount_1/100) AS net_CPCPCPTrans,\n  ((cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))/(qty+scheme)) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  z_trans_d1t.discount_1,\n  z_trans_d1t.discount_2,\n  (1.0*d1t-(d1t*z_trans_d1t.discount_2/100)) AS total,\n  z_trans_d1t.deleted,\n  z_trans_d1t.created,\n  z_trans_d1t.updated\n  FROM \n  z_trans_d1t\nLEFT JOIN invoices ON z_trans_d1t.invoice = invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8otznsbq",
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
    "id": "hhcnjzlo",
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
    "id": "boziffac",
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
    "id": "pog3j8hh",
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
    "id": "yp0p96t3",
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
    "id": "tgdb6pxo",
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
    "id": "7ixuyjpr",
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
    "id": "cv5kyasn",
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
    "id": "ccqlcund",
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
    "id": "bfenwyci",
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
    "id": "t6dmscfc",
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
    "id": "wv41tiph",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("zogmxjdo")

  // remove
  collection.schema.removeField("p1rnnm8a")

  // remove
  collection.schema.removeField("ymozjhsr")

  // remove
  collection.schema.removeField("wuvcud0y")

  // remove
  collection.schema.removeField("q4vqybh3")

  // remove
  collection.schema.removeField("qmftyl5v")

  // remove
  collection.schema.removeField("86luxrfv")

  // remove
  collection.schema.removeField("bl8jk5gq")

  // remove
  collection.schema.removeField("nroqot4y")

  // remove
  collection.schema.removeField("1t6rldta")

  // remove
  collection.schema.removeField("h5quwpjv")

  // remove
  collection.schema.removeField("xpsgpvhv")

  return dao.saveCollection(collection)
})
