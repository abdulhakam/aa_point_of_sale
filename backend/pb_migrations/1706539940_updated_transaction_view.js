/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("5ljhl7bd6h7xflw")

  collection.options = {
    "query": "SELECT zz_trans_inv_d1t.id,\n  invoice,\n  item,\n  zz_trans_inv_d1t.type,\n  price,\n  qty,\n  scheme,\n  zz_trans_inv_d1t.discount_1,\n  zz_trans_inv_d1t.discount_2,\n  total,\n  zz_trans_inv_d1t.deleted,\n  zz_trans_inv_d1t.created,\n  zz_trans_inv_d1t.updated\n  FROM \n  zz_trans_inv_d1t\nLEFT JOIN invoices ON zz_trans_inv_d1t.invoice = invoices.id"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gltuvmuv",
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
    "id": "kr4fxcyh",
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
    "id": "lg4xv43t",
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
    "id": "veripver",
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
    "id": "waokwmki",
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
    "id": "mtysgbe4",
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
    "id": "lhd9wceb",
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
    "id": "qvslrybz",
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
    "id": "9xvxn9ee",
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
    "id": "9btw4pte",
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

  collection.options = {
    "query": "SELECT zz_trans_inv_d1t.id,\n  invoice,\n  item,\n  zz_trans_inv_d1t.type,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))\n  AS net_cptransTot,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))/(qty+scheme) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  zz_trans_inv_d1t.discount_1,\n  zz_trans_inv_d1t.discount_2,\n  total,\n  zz_trans_inv_d1t.deleted,\n  zz_trans_inv_d1t.created,\n  zz_trans_inv_d1t.updated\n  FROM \n  zz_trans_inv_d1t\nLEFT JOIN invoices ON zz_trans_inv_d1t.invoice = invoices.id"
  }

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

  // remove
  collection.schema.removeField("gltuvmuv")

  // remove
  collection.schema.removeField("kr4fxcyh")

  // remove
  collection.schema.removeField("lg4xv43t")

  // remove
  collection.schema.removeField("veripver")

  // remove
  collection.schema.removeField("waokwmki")

  // remove
  collection.schema.removeField("mtysgbe4")

  // remove
  collection.schema.removeField("lhd9wceb")

  // remove
  collection.schema.removeField("qvslrybz")

  // remove
  collection.schema.removeField("9xvxn9ee")

  // remove
  collection.schema.removeField("9btw4pte")

  return dao.saveCollection(collection)
})
