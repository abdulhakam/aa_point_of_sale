/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("wp4hrm6f5uduwak")

  collection.options = {
    "query": "SELECT zz_trans_inv_d1t.id,\n  invoice,\n  item,\n  zz_trans_inv_d1t.type,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))\n  --(net_CPCPCPTrans*invoices.discount_1/100) \n  AS net_CPCPCPTrans,\n  net_cptrans,\n  price,\n  qty,\n  scheme,\n  zz_trans_inv_d1t.discount_1,\n  zz_trans_inv_d1t.discount_2,\n  total,\n  zz_trans_inv_d1t.deleted,\n  zz_trans_inv_d1t.created,\n  zz_trans_inv_d1t.updated\n  FROM \n  zz_trans_inv_d1t\nLEFT JOIN invoices ON zz_trans_inv_d1t.invoice = invoices.id"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "n49xx1cf",
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
    "id": "mcwtsyrg",
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
    "id": "vwuwwcpd",
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
    "id": "rf2yfmlc",
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
    "id": "kiprmixi",
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
    "id": "7qhu8nu2",
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
    "id": "8hmvujzi",
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
    "id": "7y3pcxvx",
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
    "id": "rcmhhy47",
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
    "id": "ggxpgznq",
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
    "id": "naj3lksp",
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
    "id": "wyohnqjb",
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
    "query": "SELECT zz_trans_inv_d1t.id,\n  invoice,\n  item,\n  zz_trans_inv_d1t.type,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))-(net_CPCPCPTrans*invoices.discount_1/100) AS net_CPCPCPTrans,\n  net_cptrans,\n  price,\n  qty,\n  scheme,\n  zz_trans_inv_d1t.discount_1,\n  zz_trans_inv_d1t.discount_2,\n  total,\n  zz_trans_inv_d1t.deleted,\n  zz_trans_inv_d1t.created,\n  zz_trans_inv_d1t.updated\n  FROM \n  zz_trans_inv_d1t\nLEFT JOIN invoices ON zz_trans_inv_d1t.invoice = invoices.id"
  }

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

  // remove
  collection.schema.removeField("n49xx1cf")

  // remove
  collection.schema.removeField("mcwtsyrg")

  // remove
  collection.schema.removeField("vwuwwcpd")

  // remove
  collection.schema.removeField("rf2yfmlc")

  // remove
  collection.schema.removeField("kiprmixi")

  // remove
  collection.schema.removeField("7qhu8nu2")

  // remove
  collection.schema.removeField("8hmvujzi")

  // remove
  collection.schema.removeField("7y3pcxvx")

  // remove
  collection.schema.removeField("rcmhhy47")

  // remove
  collection.schema.removeField("ggxpgznq")

  // remove
  collection.schema.removeField("naj3lksp")

  // remove
  collection.schema.removeField("wyohnqjb")

  return dao.saveCollection(collection)
})
