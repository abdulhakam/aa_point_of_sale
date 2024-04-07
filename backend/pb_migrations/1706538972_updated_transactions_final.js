/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("wp4hrm6f5uduwak")

  collection.options = {
    "query": "SELECT zz_trans_inv_d1t.id,\n  invoice,\n  item,\n  zz_trans_inv_d1t.type,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))/(qty+scheme)\n  AS net_cptransTot,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))/(qty+scheme) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  zz_trans_inv_d1t.discount_1,\n  zz_trans_inv_d1t.discount_2,\n  total,\n  zz_trans_inv_d1t.deleted,\n  zz_trans_inv_d1t.created,\n  zz_trans_inv_d1t.updated\n  FROM \n  zz_trans_inv_d1t\nLEFT JOIN invoices ON zz_trans_inv_d1t.invoice = invoices.id"
  }

  // remove
  collection.schema.removeField("phknz2vf")

  // remove
  collection.schema.removeField("ljyoy2qw")

  // remove
  collection.schema.removeField("d0mgmvco")

  // remove
  collection.schema.removeField("ib9r6ydq")

  // remove
  collection.schema.removeField("qga2crng")

  // remove
  collection.schema.removeField("t3snl7fc")

  // remove
  collection.schema.removeField("pynut1h0")

  // remove
  collection.schema.removeField("u9qxfefv")

  // remove
  collection.schema.removeField("kkaymipo")

  // remove
  collection.schema.removeField("nj61jzne")

  // remove
  collection.schema.removeField("qtkit9vw")

  // remove
  collection.schema.removeField("zq9f0kcb")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hawjuk4t",
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
    "id": "mqrdpqwo",
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
    "id": "yrelthgq",
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
    "id": "gkisikti",
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
    "id": "wej7wsaf",
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
    "id": "icvc2efn",
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
    "id": "l7qaqa4x",
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
    "id": "cm7skd4c",
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
    "id": "skqyywgx",
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
    "id": "iwreutcm",
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
    "id": "vm5jezph",
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
    "id": "l2qh3ktt",
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
    "query": "SELECT zz_trans_inv_d1t.id,\n  invoice,\n  item,\n  zz_trans_inv_d1t.type,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))/(qty)\n  AS net_cptransTot,\n  (net_CPCPCPTrans-(net_CPCPCPTrans*zz_trans_inv_d1t.discount_2/100))/(qty+scheme) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  zz_trans_inv_d1t.discount_1,\n  zz_trans_inv_d1t.discount_2,\n  total,\n  zz_trans_inv_d1t.deleted,\n  zz_trans_inv_d1t.created,\n  zz_trans_inv_d1t.updated\n  FROM \n  zz_trans_inv_d1t\nLEFT JOIN invoices ON zz_trans_inv_d1t.invoice = invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "phknz2vf",
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
    "id": "ljyoy2qw",
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
    "id": "d0mgmvco",
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
    "id": "ib9r6ydq",
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
    "id": "qga2crng",
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
    "id": "t3snl7fc",
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
    "id": "pynut1h0",
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
    "id": "u9qxfefv",
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
    "id": "kkaymipo",
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
    "id": "nj61jzne",
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
    "id": "qtkit9vw",
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
    "id": "zq9f0kcb",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("hawjuk4t")

  // remove
  collection.schema.removeField("mqrdpqwo")

  // remove
  collection.schema.removeField("yrelthgq")

  // remove
  collection.schema.removeField("gkisikti")

  // remove
  collection.schema.removeField("wej7wsaf")

  // remove
  collection.schema.removeField("icvc2efn")

  // remove
  collection.schema.removeField("l7qaqa4x")

  // remove
  collection.schema.removeField("cm7skd4c")

  // remove
  collection.schema.removeField("skqyywgx")

  // remove
  collection.schema.removeField("iwreutcm")

  // remove
  collection.schema.removeField("vm5jezph")

  // remove
  collection.schema.removeField("l2qh3ktt")

  return dao.saveCollection(collection)
})
