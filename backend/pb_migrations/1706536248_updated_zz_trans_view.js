/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("t50jyu2rl1dfwgr")

  collection.options = {
    "query": "SELECT z_trans_d1t.id,\n  invoice,\n  invoices.invoiceNo,\n  item,\n  z_trans_d1t.type,\n  (cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))-(cp_d1t*invoices.discount_1/100) AS net_CPCPCPTrans,\n  ((cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))/(qty+scheme)) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  z_trans_d1t.discount_1,\n  z_trans_d1t.discount_2,\n  (1.0*d1t-(d1t*z_trans_d1t.discount_2/100)) AS total,\n  z_trans_d1t.deleted,\n  z_trans_d1t.created,\n  z_trans_d1t.updated\n  FROM \n  z_trans_d1t\nLEFT JOIN invoices ON z_trans_d1t.invoice = invoices.id"
  }

  // remove
  collection.schema.removeField("7vq9eq4v")

  // remove
  collection.schema.removeField("yzty1ebz")

  // remove
  collection.schema.removeField("kod0auqv")

  // remove
  collection.schema.removeField("pniadilu")

  // remove
  collection.schema.removeField("ylwymu2u")

  // remove
  collection.schema.removeField("sk6azgnm")

  // remove
  collection.schema.removeField("eybn6urw")

  // remove
  collection.schema.removeField("pj9cozyq")

  // remove
  collection.schema.removeField("e5m0bwsj")

  // remove
  collection.schema.removeField("ujdrkfkv")

  // remove
  collection.schema.removeField("gadostar")

  // remove
  collection.schema.removeField("ycyvuxlh")

  // remove
  collection.schema.removeField("j294cj4q")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jybbob99",
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
    "id": "yqborrbq",
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
    "id": "mww050uo",
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
    "id": "kmuf0p3e",
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
    "id": "mx1f3o2f",
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
    "id": "nvr3h31w",
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
    "id": "ifeqjwfk",
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
    "id": "xwt6cxnx",
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
    "id": "feqpxxbq",
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
    "id": "piebef5m",
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
    "id": "pibojfyn",
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
    "id": "ybayotda",
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
    "id": "sdwwqxqp",
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
    "query": "SELECT z_trans_d1t.id,\n  invoice,\n  invoices.invoiceNo,\n  item,\n  z_trans_d1t.type,\n  ((cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))/(qty+scheme))-(cp_d1t*invoices.discount_1/100) AS net_CPCPCPTrans,\n  ((cp_d1t-(cp_d1t*z_trans_d1t.discount_2/100))/(qty+scheme)) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  z_trans_d1t.discount_1,\n  z_trans_d1t.discount_2,\n  (1.0*d1t-(d1t*z_trans_d1t.discount_2/100)) AS total,\n  z_trans_d1t.deleted,\n  z_trans_d1t.created,\n  z_trans_d1t.updated\n  FROM \n  z_trans_d1t\nLEFT JOIN invoices ON z_trans_d1t.invoice = invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "7vq9eq4v",
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
    "id": "yzty1ebz",
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
    "id": "kod0auqv",
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
    "id": "pniadilu",
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
    "id": "ylwymu2u",
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
    "id": "sk6azgnm",
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
    "id": "eybn6urw",
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
    "id": "pj9cozyq",
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
    "id": "e5m0bwsj",
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
    "id": "ujdrkfkv",
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
    "id": "gadostar",
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
    "id": "ycyvuxlh",
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
    "id": "j294cj4q",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("jybbob99")

  // remove
  collection.schema.removeField("yqborrbq")

  // remove
  collection.schema.removeField("mww050uo")

  // remove
  collection.schema.removeField("kmuf0p3e")

  // remove
  collection.schema.removeField("mx1f3o2f")

  // remove
  collection.schema.removeField("nvr3h31w")

  // remove
  collection.schema.removeField("ifeqjwfk")

  // remove
  collection.schema.removeField("xwt6cxnx")

  // remove
  collection.schema.removeField("feqpxxbq")

  // remove
  collection.schema.removeField("piebef5m")

  // remove
  collection.schema.removeField("pibojfyn")

  // remove
  collection.schema.removeField("ybayotda")

  // remove
  collection.schema.removeField("sdwwqxqp")

  return dao.saveCollection(collection)
})
