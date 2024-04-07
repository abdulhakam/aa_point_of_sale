/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("uziwrzw36sr7n6b")

  collection.options = {
    "query": "SELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  ((price * qty)\n    *(1.0 - (transactions.discount_1 / 100))\n    *(1.0 - (transactions.discount_2 / 100)))\n   AS trans_total,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)) * 1.0 * transactions.discount_2 / 100\n    )\n  ) AS total,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id"
  }

  // remove
  collection.schema.removeField("vt8571sv")

  // remove
  collection.schema.removeField("0idpeodd")

  // remove
  collection.schema.removeField("eqw4jfdg")

  // remove
  collection.schema.removeField("vcfan4ii")

  // remove
  collection.schema.removeField("tyea4skf")

  // remove
  collection.schema.removeField("gdtqzqma")

  // remove
  collection.schema.removeField("cn0c44lk")

  // remove
  collection.schema.removeField("mbvkt4fy")

  // remove
  collection.schema.removeField("ohb9xhsi")

  // remove
  collection.schema.removeField("2ckfn7s3")

  // remove
  collection.schema.removeField("nw3y9jey")

  // remove
  collection.schema.removeField("wblsilig")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tc49u8sc",
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
    "id": "odugfwam",
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
    "id": "ree0gga4",
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
    "id": "nprv87ne",
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
    "id": "f6leqzx5",
    "name": "trans_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hfrrj0y7",
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
    "id": "slousfoz",
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
    "id": "4ztv5cd1",
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
    "id": "8cllkc8p",
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
    "id": "my560i1l",
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
    "id": "3abhbv5v",
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
    "id": "0cfwfnbf",
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
  const collection = dao.findCollectionByNameOrId("uziwrzw36sr7n6b")

  collection.options = {
    "query": "SELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((cost_price * qty) - ((qty * cost_price) * 1.0 * transactions.discount_1 / 100\n        )\n      ) * 1.0 * transactions.discount_2 / 100)) AS cp_transtotal,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)\n    ) - (\n      ((qty * price) - ((qty * price) * 1.0 * transactions.discount_1 / 100)) * 1.0 * transactions.discount_2 / 100\n    )\n  ) AS total,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vt8571sv",
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
    "id": "0idpeodd",
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
    "id": "eqw4jfdg",
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
    "id": "vcfan4ii",
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
    "id": "tyea4skf",
    "name": "cp_transtotal",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gdtqzqma",
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
    "id": "cn0c44lk",
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
    "id": "mbvkt4fy",
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
    "id": "ohb9xhsi",
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
    "id": "2ckfn7s3",
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
    "id": "nw3y9jey",
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
    "id": "wblsilig",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("tc49u8sc")

  // remove
  collection.schema.removeField("odugfwam")

  // remove
  collection.schema.removeField("ree0gga4")

  // remove
  collection.schema.removeField("nprv87ne")

  // remove
  collection.schema.removeField("f6leqzx5")

  // remove
  collection.schema.removeField("hfrrj0y7")

  // remove
  collection.schema.removeField("slousfoz")

  // remove
  collection.schema.removeField("4ztv5cd1")

  // remove
  collection.schema.removeField("8cllkc8p")

  // remove
  collection.schema.removeField("my560i1l")

  // remove
  collection.schema.removeField("3abhbv5v")

  // remove
  collection.schema.removeField("0cfwfnbf")

  return dao.saveCollection(collection)
})
