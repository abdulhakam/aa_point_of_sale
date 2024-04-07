/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("0t5ray71eq50ajq")

  collection.options = {
    "query": "SELECT \n  transactions.id,\n  invoice,\n  invoices.type,\n  item,\n  (cost_price*qty)-((qty*cost_price)*transactions.discount_1/100) AS cost_price,\n  ((cost_price*qty)-((qty*cost_price)*transactions.discount_1/100)/(qty+scheme)) AS net_cp,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (qty*price)-((qty*price)*transactions.discount_1/100) AS d1t,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\n  FROM transactions\nJOIN invoices ON transactions.invoice = invoices.id"
  }

  // remove
  collection.schema.removeField("uyhoxzt3")

  // remove
  collection.schema.removeField("n6bxfwrj")

  // remove
  collection.schema.removeField("ztl8pyku")

  // remove
  collection.schema.removeField("ftdbyum4")

  // remove
  collection.schema.removeField("mv3yckaz")

  // remove
  collection.schema.removeField("gtlv4jgv")

  // remove
  collection.schema.removeField("h6u0xjcc")

  // remove
  collection.schema.removeField("qpfhefc6")

  // remove
  collection.schema.removeField("amqlzoqx")

  // remove
  collection.schema.removeField("w0ugen5c")

  // remove
  collection.schema.removeField("i25uqen5")

  // remove
  collection.schema.removeField("z1s5wvht")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vyfwahks",
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
    "id": "zfjp9xuv",
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
    "id": "w22lrtmt",
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
    "id": "oso2zw04",
    "name": "cost_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "v4d8t32u",
    "name": "net_cp",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9uvb2sd1",
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
    "id": "t9uzz7wq",
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
    "id": "ivckfedn",
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
    "id": "1imaacvl",
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
    "id": "6bzafytz",
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
    "id": "ggywyspx",
    "name": "d1t",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "172fdqp8",
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
  const collection = dao.findCollectionByNameOrId("0t5ray71eq50ajq")

  collection.options = {
    "query": "SELECT \n  transactions.id,\n  invoice,\n  invoices.type,\n  item,\n  (cost_price*qty)-((qty*cost_price)*transactions.discount_1/100) AS cost_price,\n  ((cost_price*qty)-((qty*cost_price)*transactions.discount_1/100)/qty+scheme) AS net_cp,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (qty*price)-((qty*price)*transactions.discount_1/100) AS d1t,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\n  FROM transactions\nJOIN invoices ON transactions.invoice = invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "uyhoxzt3",
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
    "id": "n6bxfwrj",
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
    "id": "ztl8pyku",
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
    "id": "ftdbyum4",
    "name": "cost_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mv3yckaz",
    "name": "net_cp",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gtlv4jgv",
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
    "id": "h6u0xjcc",
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
    "id": "qpfhefc6",
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
    "id": "amqlzoqx",
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
    "id": "w0ugen5c",
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
    "id": "i25uqen5",
    "name": "d1t",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "z1s5wvht",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("vyfwahks")

  // remove
  collection.schema.removeField("zfjp9xuv")

  // remove
  collection.schema.removeField("w22lrtmt")

  // remove
  collection.schema.removeField("oso2zw04")

  // remove
  collection.schema.removeField("v4d8t32u")

  // remove
  collection.schema.removeField("9uvb2sd1")

  // remove
  collection.schema.removeField("t9uzz7wq")

  // remove
  collection.schema.removeField("ivckfedn")

  // remove
  collection.schema.removeField("1imaacvl")

  // remove
  collection.schema.removeField("6bzafytz")

  // remove
  collection.schema.removeField("ggywyspx")

  // remove
  collection.schema.removeField("172fdqp8")

  return dao.saveCollection(collection)
})
