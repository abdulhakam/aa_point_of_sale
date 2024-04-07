/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("t50jyu2rl1dfwgr")

  collection.options = {
    "query": "SELECT z_trans_d1t.id,\n  invoice,\n  item,\n  z_trans_d1t.type,\n  (cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))-(cp_d1t*invoices.discount_1/100) AS net_CPCPCPTrans,\n  ((cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))/(qty+scheme)) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  z_trans_d1t.discount_1,\n  z_trans_d1t.discount_2,\n  (1.0*d1t-(d1t*z_trans_d1t.discount_2/100)) AS total,\n  z_trans_d1t.deleted,\n  z_trans_d1t.created,\n  z_trans_d1t.updated\n  FROM \n  z_trans_d1t\nLEFT JOIN invoices ON z_trans_d1t.invoice = invoices.id"
  }

  // remove
  collection.schema.removeField("ikhsty7x")

  // remove
  collection.schema.removeField("6zcpennb")

  // remove
  collection.schema.removeField("osx3ksz6")

  // remove
  collection.schema.removeField("j6lawqxw")

  // remove
  collection.schema.removeField("ydalvuub")

  // remove
  collection.schema.removeField("n7e1edph")

  // remove
  collection.schema.removeField("kkptwju7")

  // remove
  collection.schema.removeField("bnmla51w")

  // remove
  collection.schema.removeField("ytppgurw")

  // remove
  collection.schema.removeField("mu01umet")

  // remove
  collection.schema.removeField("v7tg2yfn")

  // remove
  collection.schema.removeField("82gbpybs")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kksxgrk1",
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
    "id": "bdqkds0j",
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
    "id": "zkrt2tly",
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
    "id": "idcrtoxt",
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
    "id": "zkhn85qr",
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
    "id": "smp8uqqh",
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
    "id": "4phcqhe6",
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
    "id": "cobegnwz",
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
    "id": "aoeva5wl",
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
    "id": "bwkrvejt",
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
    "id": "pmscycoj",
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
    "id": "bvp9kbmh",
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
    "query": "SELECT id,invoice,item,type,net_CPCPCPTrans,net_cptrans,price,qty,scheme,discount_1,discount_2,total,deleted,created,updated\nFROM (SELECT z_trans_d1t.id,\n  invoice,\n  item,\n  z_trans_d1t.type,\n  (cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))-(cp_d1t*invoices.discount_1/100) AS net_CPCPCPTrans,\n  ((cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))/(qty+scheme)) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  z_trans_d1t.discount_1,\n  z_trans_d1t.discount_2,\n  (1.0*d1t-(d1t*z_trans_d1t.discount_2/100)) AS total,\n  z_trans_d1t.deleted,\n  z_trans_d1t.created,\n  z_trans_d1t.updated\n  FROM \n  z_trans_d1t\nLEFT JOIN invoices ON z_trans_d1t.invoice = invoices.id)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ikhsty7x",
    "name": "invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6zcpennb",
    "name": "item",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "osx3ksz6",
    "name": "type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "j6lawqxw",
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
    "id": "ydalvuub",
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
    "id": "n7e1edph",
    "name": "price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kkptwju7",
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
    "id": "bnmla51w",
    "name": "scheme",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ytppgurw",
    "name": "discount_1",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mu01umet",
    "name": "discount_2",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "v7tg2yfn",
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
    "id": "82gbpybs",
    "name": "deleted",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("kksxgrk1")

  // remove
  collection.schema.removeField("bdqkds0j")

  // remove
  collection.schema.removeField("zkrt2tly")

  // remove
  collection.schema.removeField("idcrtoxt")

  // remove
  collection.schema.removeField("zkhn85qr")

  // remove
  collection.schema.removeField("smp8uqqh")

  // remove
  collection.schema.removeField("4phcqhe6")

  // remove
  collection.schema.removeField("cobegnwz")

  // remove
  collection.schema.removeField("aoeva5wl")

  // remove
  collection.schema.removeField("bwkrvejt")

  // remove
  collection.schema.removeField("pmscycoj")

  // remove
  collection.schema.removeField("bvp9kbmh")

  return dao.saveCollection(collection)
})
