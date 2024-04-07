/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("uziwrzw36sr7n6b")

  collection.options = {
    "query": "SELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.party,\n  parties.type AS party_type,\n  invoices.invoiceNo,\n  item,\n  price,\n  transactions.qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  transactions.discout_rs,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0)))-transactions.discout_rs\n  AS total,\n  invoices.discount_1 AS inv_d1,\n  invoices.discount_2 AS inv_d2,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0))\n  *(1 - (invoices.discount_1 / 100.0))\n  *(1 - (invoices.discount_2 / 100.0)))-transactions.discout_rs AS net_amount,\n  net_price.net_price*transactions.qty AS net_cp,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id\n  JOIN parties ON invoices.party = parties.id\n  JOIN net_price ON transactions.item = net_price.id\nGROUP BY transactions.id"
  }

  // remove
  collection.schema.removeField("6tr5vpzw")

  // remove
  collection.schema.removeField("iex21xye")

  // remove
  collection.schema.removeField("y63atpxs")

  // remove
  collection.schema.removeField("trrhxqdt")

  // remove
  collection.schema.removeField("6gn0nrig")

  // remove
  collection.schema.removeField("cr7z9tnm")

  // remove
  collection.schema.removeField("wnec6pzr")

  // remove
  collection.schema.removeField("ffjgvp41")

  // remove
  collection.schema.removeField("qwacrab7")

  // remove
  collection.schema.removeField("xue5ckcz")

  // remove
  collection.schema.removeField("za4ysp73")

  // remove
  collection.schema.removeField("sfujjnp0")

  // remove
  collection.schema.removeField("ypdmhbl2")

  // remove
  collection.schema.removeField("4rbi9uky")

  // remove
  collection.schema.removeField("lthbyzrq")

  // remove
  collection.schema.removeField("vbfpqoer")

  // remove
  collection.schema.removeField("cgspzjcf")

  // remove
  collection.schema.removeField("lmnbn4oe")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jio4bi3h",
    "name": "invoice",
    "type": "relation",
    "required": true,
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
    "id": "lw3mnezq",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale",
        "return"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "snblo3hn",
    "name": "party",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "qhdujcbptsh2v29",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ko2hbvzw",
    "name": "party_type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "supplier",
        "customer"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nczmm0o7",
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
    "id": "p7bl1zqj",
    "name": "item",
    "type": "relation",
    "required": true,
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
    "id": "cqg5hqz7",
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
    "id": "gejisqqk",
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
    "id": "rcqbgoya",
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
    "id": "b9zjaidu",
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
    "id": "cr4zfsqf",
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
    "id": "ufrdkfii",
    "name": "discout_rs",
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
    "id": "mtgzkt2q",
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
    "id": "e9uokrlf",
    "name": "inv_d1",
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
    "id": "fzjv4g3t",
    "name": "inv_d2",
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
    "id": "qkb9wvlt",
    "name": "net_amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "onewlfd5",
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
    "id": "vbmuxqlh",
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
    "query": "SELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.party,\n  parties.type AS party_type,\n  invoices.invoiceNo,\n  item,\n  price,\n  transactions.qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  transactions.discout_rs,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0)))-transactions.discout_rs\n  AS total,\n  invoices.discount_1 AS inv_d1,\n  invoices.discount_2 AS inv_d2,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0))\n  *(1 - (invoices.discount_1 / 100.0))\n  *(1 - (invoices.discount_2 / 100.0))) AS net_amount,\n  net_price.net_price*transactions.qty AS net_cp,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id\n  JOIN parties ON invoices.party = parties.id\n  JOIN net_price ON transactions.item = net_price.id\nGROUP BY transactions.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6tr5vpzw",
    "name": "invoice",
    "type": "relation",
    "required": true,
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
    "id": "iex21xye",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale",
        "return"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "y63atpxs",
    "name": "party",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "qhdujcbptsh2v29",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "trrhxqdt",
    "name": "party_type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "supplier",
        "customer"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "6gn0nrig",
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
    "id": "cr7z9tnm",
    "name": "item",
    "type": "relation",
    "required": true,
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
    "id": "wnec6pzr",
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
    "id": "ffjgvp41",
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
    "id": "qwacrab7",
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
    "id": "xue5ckcz",
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
    "id": "za4ysp73",
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
    "id": "sfujjnp0",
    "name": "discout_rs",
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
    "id": "ypdmhbl2",
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
    "id": "4rbi9uky",
    "name": "inv_d1",
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
    "id": "lthbyzrq",
    "name": "inv_d2",
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
    "id": "vbfpqoer",
    "name": "net_amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cgspzjcf",
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
    "id": "lmnbn4oe",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("jio4bi3h")

  // remove
  collection.schema.removeField("lw3mnezq")

  // remove
  collection.schema.removeField("snblo3hn")

  // remove
  collection.schema.removeField("ko2hbvzw")

  // remove
  collection.schema.removeField("nczmm0o7")

  // remove
  collection.schema.removeField("p7bl1zqj")

  // remove
  collection.schema.removeField("cqg5hqz7")

  // remove
  collection.schema.removeField("gejisqqk")

  // remove
  collection.schema.removeField("rcqbgoya")

  // remove
  collection.schema.removeField("b9zjaidu")

  // remove
  collection.schema.removeField("cr4zfsqf")

  // remove
  collection.schema.removeField("ufrdkfii")

  // remove
  collection.schema.removeField("mtgzkt2q")

  // remove
  collection.schema.removeField("e9uokrlf")

  // remove
  collection.schema.removeField("fzjv4g3t")

  // remove
  collection.schema.removeField("qkb9wvlt")

  // remove
  collection.schema.removeField("onewlfd5")

  // remove
  collection.schema.removeField("vbmuxqlh")

  return dao.saveCollection(collection)
})
