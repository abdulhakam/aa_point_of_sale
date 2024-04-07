/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("uziwrzw36sr7n6b")

  collection.options = {
    "query": "SELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.party,\n  parties.type AS party_type,\n  invoices.invoiceNo,\n  item,\n  price,\n  transactions.qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  -- transactions.discount_rs,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0)))-transactions.discout_rs\n  AS total,\n  invoices.discount_1 AS inv_d1,\n  invoices.discount_2 AS inv_d2,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0))\n  *(1 - (invoices.discount_1 / 100.0))\n  *(1 - (invoices.discount_2 / 100.0)))-transactions.discout_rs AS net_amount,\n  net_price.net_price*transactions.qty AS net_cp,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id\n  JOIN parties ON invoices.party = parties.id\n  JOIN net_price ON transactions.item = net_price.id\nGROUP BY transactions.id"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nxwbg2jz",
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
    "id": "mlxdth9h",
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
    "id": "o5sufgaq",
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
    "id": "x32e6e7o",
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
    "id": "usia2jgm",
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
    "id": "yd3hzhky",
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
    "id": "hffu10mw",
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
    "id": "gwyehwgi",
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
    "id": "upvpqguf",
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
    "id": "pkdiqfjp",
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
    "id": "us3yyk90",
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
    "id": "95cwghcg",
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
    "id": "itma31kg",
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
    "id": "u97fnbrg",
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
    "id": "w5flcxzj",
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
    "id": "nxyv3m9w",
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
    "id": "lnnfijuq",
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
    "query": "SELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.party,\n  parties.type AS party_type,\n  invoices.invoiceNo,\n  item,\n  price,\n  transactions.qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  transactions.discout_rs,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0)))-transactions.discout_rs\n  AS total,\n  invoices.discount_1 AS inv_d1,\n  invoices.discount_2 AS inv_d2,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0))\n  *(1 - (invoices.discount_1 / 100.0))\n  *(1 - (invoices.discount_2 / 100.0)))-transactions.discout_rs AS net_amount,\n  net_price.net_price*transactions.qty AS net_cp,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  JOIN invoices ON transactions.invoice = invoices.id\n  JOIN parties ON invoices.party = parties.id\n  JOIN net_price ON transactions.item = net_price.id\nGROUP BY transactions.id"
  }

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

  // remove
  collection.schema.removeField("nxwbg2jz")

  // remove
  collection.schema.removeField("mlxdth9h")

  // remove
  collection.schema.removeField("o5sufgaq")

  // remove
  collection.schema.removeField("x32e6e7o")

  // remove
  collection.schema.removeField("usia2jgm")

  // remove
  collection.schema.removeField("yd3hzhky")

  // remove
  collection.schema.removeField("hffu10mw")

  // remove
  collection.schema.removeField("gwyehwgi")

  // remove
  collection.schema.removeField("upvpqguf")

  // remove
  collection.schema.removeField("pkdiqfjp")

  // remove
  collection.schema.removeField("us3yyk90")

  // remove
  collection.schema.removeField("95cwghcg")

  // remove
  collection.schema.removeField("itma31kg")

  // remove
  collection.schema.removeField("u97fnbrg")

  // remove
  collection.schema.removeField("w5flcxzj")

  // remove
  collection.schema.removeField("nxyv3m9w")

  // remove
  collection.schema.removeField("lnnfijuq")

  return dao.saveCollection(collection)
})
