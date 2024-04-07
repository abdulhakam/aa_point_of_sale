/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("5ljhl7bd6h7xflw")

  collection.name = "transaction_view"
  collection.options = {
    "query": "SELECT zz_trans_inv_d1t.id,\n  invoice,\n  item,\n  zz_trans_inv_d1t.type,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))\n  AS net_cptransTot,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))/(qty+scheme) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  zz_trans_inv_d1t.discount_1,\n  zz_trans_inv_d1t.discount_2,\n  total,\n  zz_trans_inv_d1t.deleted,\n  zz_trans_inv_d1t.created,\n  zz_trans_inv_d1t.updated\n  FROM \n  zz_trans_inv_d1t\nLEFT JOIN invoices ON zz_trans_inv_d1t.invoice = invoices.id"
  }

  // remove
  collection.schema.removeField("uwxowkwq")

  // remove
  collection.schema.removeField("z8oajrm3")

  // remove
  collection.schema.removeField("s56az2dq")

  // remove
  collection.schema.removeField("9k6ylazr")

  // remove
  collection.schema.removeField("gm89aqg3")

  // remove
  collection.schema.removeField("j0n18ysh")

  // remove
  collection.schema.removeField("illz8lgp")

  // remove
  collection.schema.removeField("h9zq2htd")

  // remove
  collection.schema.removeField("erfowvp5")

  // remove
  collection.schema.removeField("escmlue4")

  // remove
  collection.schema.removeField("zuuejlkv")

  // remove
  collection.schema.removeField("mz1pbxle")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jpcycx0u",
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
    "id": "rxhp9edu",
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
    "id": "aaia4cgx",
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
    "id": "qi0pufjq",
    "name": "net_cptransTot",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "k3rlnusa",
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
    "id": "jpinmlle",
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
    "id": "tzm4ci8g",
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
    "id": "b7ctdp7r",
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
    "id": "mbc9mtzr",
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
    "id": "fcmxdei8",
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
    "id": "kywn7i2d",
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
    "id": "8ifaa32j",
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
  const collection = dao.findCollectionByNameOrId("5ljhl7bd6h7xflw")

  collection.name = "transaction_viev"
  collection.options = {
    "query": "SELECT id,\n  invoice,\n  item,\n  type,\n  ((cp_d1t-(cp_d1t*discount_2/100))/(qty+scheme)) AS net_CPCPCPTrans,\n  ((cp_d1t-(cp_d1t*discount_2/100))/(qty+scheme)) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  discount_1,\n  discount_2,\n  (1.0*d1t-(d1t*discount_2/100)) AS total,\n  deleted,\n  created,\n  updated\n  FROM \n  z_trans_d1t"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uwxowkwq",
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
    "id": "z8oajrm3",
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
    "id": "s56az2dq",
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
    "id": "9k6ylazr",
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
    "id": "gm89aqg3",
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
    "id": "j0n18ysh",
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
    "id": "illz8lgp",
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
    "id": "h9zq2htd",
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
    "id": "erfowvp5",
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
    "id": "escmlue4",
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
    "id": "zuuejlkv",
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
    "id": "mz1pbxle",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("jpcycx0u")

  // remove
  collection.schema.removeField("rxhp9edu")

  // remove
  collection.schema.removeField("aaia4cgx")

  // remove
  collection.schema.removeField("qi0pufjq")

  // remove
  collection.schema.removeField("k3rlnusa")

  // remove
  collection.schema.removeField("jpinmlle")

  // remove
  collection.schema.removeField("tzm4ci8g")

  // remove
  collection.schema.removeField("b7ctdp7r")

  // remove
  collection.schema.removeField("mbc9mtzr")

  // remove
  collection.schema.removeField("fcmxdei8")

  // remove
  collection.schema.removeField("kywn7i2d")

  // remove
  collection.schema.removeField("8ifaa32j")

  return dao.saveCollection(collection)
})
