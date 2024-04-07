/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("5ljhl7bd6h7xflw")

  collection.options = {
    "query": "SELECT id,\n  invoice,\n  item,\n  type,\n  (cp_d1t-(cp_d1t*discount_2/100)) AS cp_d2t,\n  (CASE WHEN type=='sale' THEN cp_d1t ELSE ((cp_d1t-(cp_d1t*discount_2/100))/(qty+scheme))END) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  discount_1,\n  discount_2,\n  (1.0*d1t-(d1t*discount_2/100)) AS total,\n  deleted,\n  created,\n  updated\n  FROM \n  z_trans_d1t"
  }

  // remove
  collection.schema.removeField("gzeanrie")

  // remove
  collection.schema.removeField("xcisak6o")

  // remove
  collection.schema.removeField("oqxg7m5d")

  // remove
  collection.schema.removeField("nticlz03")

  // remove
  collection.schema.removeField("ejoyatto")

  // remove
  collection.schema.removeField("nurcgfgl")

  // remove
  collection.schema.removeField("abc8sgzd")

  // remove
  collection.schema.removeField("mtvxgfa9")

  // remove
  collection.schema.removeField("65quowjq")

  // remove
  collection.schema.removeField("wo26okyh")

  // remove
  collection.schema.removeField("bnnx83g2")

  // remove
  collection.schema.removeField("nsyd57oy")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hksuucoz",
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
    "id": "xzpplf2a",
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
    "id": "usg6i2ii",
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
    "id": "uysjkkbw",
    "name": "cp_d2t",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "osvm3n2g",
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
    "id": "wvpuhrfz",
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
    "id": "ufjbkpjp",
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
    "id": "b8l5zg1e",
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
    "id": "beh1whxd",
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
    "id": "9cz3hdgi",
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
    "id": "budofhlu",
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
    "id": "zlsimqnv",
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
    "query": "SELECT id,\n  invoice,\n  item,\n  type,\n  (cost_price-(cost_price*discount_2/100)) AS stock_price,\n  (CASE WHEN type=='sale' THEN cost_price ELSE ((cost_price-(cost_price*discount_2/100))/(qty+scheme))END) AS net_cptrans,\n  price,\n  qty,\n  scheme,\n  discount_1,\n  discount_2,\n  (1.0*d1t-(d1t*discount_2/100)) AS total,\n  deleted,\n  created,\n  updated\n  FROM \n  z_trans_d1t"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gzeanrie",
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
    "id": "xcisak6o",
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
    "id": "oqxg7m5d",
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
    "id": "nticlz03",
    "name": "stock_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ejoyatto",
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
    "id": "nurcgfgl",
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
    "id": "abc8sgzd",
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
    "id": "mtvxgfa9",
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
    "id": "65quowjq",
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
    "id": "wo26okyh",
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
    "id": "bnnx83g2",
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
    "id": "nsyd57oy",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("hksuucoz")

  // remove
  collection.schema.removeField("xzpplf2a")

  // remove
  collection.schema.removeField("usg6i2ii")

  // remove
  collection.schema.removeField("uysjkkbw")

  // remove
  collection.schema.removeField("osvm3n2g")

  // remove
  collection.schema.removeField("wvpuhrfz")

  // remove
  collection.schema.removeField("ufjbkpjp")

  // remove
  collection.schema.removeField("b8l5zg1e")

  // remove
  collection.schema.removeField("beh1whxd")

  // remove
  collection.schema.removeField("9cz3hdgi")

  // remove
  collection.schema.removeField("budofhlu")

  // remove
  collection.schema.removeField("zlsimqnv")

  return dao.saveCollection(collection)
})
