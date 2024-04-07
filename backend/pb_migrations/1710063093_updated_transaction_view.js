/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("uziwrzw36sr7n6b")

  collection.options = {
    "query": "WITH net_amounts AS (\n  SELECT\n  id,\n  invoice\n  FROM transactions\n)\n\nSELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.party,\n  parties.type AS party_type,\n  parties.area,\n  areas.section,\n  invoices.invoiceNo,\n  item,\n  transactions.cost_price,\n  price,\n  transactions.qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  transactions.discount_rs,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0)))-transactions.discount_rs\n  AS total,\n  invoices.discount_1 AS inv_d1,\n  invoices.discount_2 AS inv_d2,\n  invoices.discount_rs AS inv_drs,\n  printf(\"%.2f\",((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0))-transactions.discount_rs)\n  *(1 - (invoices.discount_1 / 100.0))\n  *(1 - (invoices.discount_2 / 100.0))) AS net_amount,\n  printf(\"%.2f\",(cost_price*transactions.qty)) AS profit,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  LEFT JOIN invoices ON transactions.invoice = invoices.id\n  LEFT JOIN parties ON invoices.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\nGROUP BY transactions.id"
  }

  // remove
  collection.schema.removeField("vgwcens7")

  // remove
  collection.schema.removeField("k6qjj67y")

  // remove
  collection.schema.removeField("dstpniwl")

  // remove
  collection.schema.removeField("y7d0ipwq")

  // remove
  collection.schema.removeField("t5wbhied")

  // remove
  collection.schema.removeField("ltnfcveq")

  // remove
  collection.schema.removeField("rjyymawr")

  // remove
  collection.schema.removeField("alzfdeb4")

  // remove
  collection.schema.removeField("toljikxi")

  // remove
  collection.schema.removeField("h6cw43uv")

  // remove
  collection.schema.removeField("gnrtuapr")

  // remove
  collection.schema.removeField("kokksyog")

  // remove
  collection.schema.removeField("swfzhoxs")

  // remove
  collection.schema.removeField("axwomhdk")

  // remove
  collection.schema.removeField("bticpqcx")

  // remove
  collection.schema.removeField("oihwxyc6")

  // remove
  collection.schema.removeField("2ljrutqv")

  // remove
  collection.schema.removeField("mujk5fzy")

  // remove
  collection.schema.removeField("nxsyayb7")

  // remove
  collection.schema.removeField("1zjgur7u")

  // remove
  collection.schema.removeField("wjfabdc2")

  // remove
  collection.schema.removeField("wsntono9")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "z1lgkr6d",
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
    "id": "wbex5mtc",
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
    "id": "npxoj7dt",
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
    "id": "kxuzrxeu",
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
    "id": "gjlmyjju",
    "name": "area",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "tdeikttss6upezc",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vl1tbyhl",
    "name": "section",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "nlwqqfyu1ur5lpo",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9ohqmucb",
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
    "id": "qi93irpi",
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
    "id": "ahfcn59o",
    "name": "cost_price",
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
    "id": "fpe3kadc",
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
    "id": "uhan1www",
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
    "id": "ugdcaqd9",
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
    "id": "vlc6yvuh",
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
    "id": "p8npxnru",
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
    "id": "zrpcvctv",
    "name": "discount_rs",
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
    "id": "ddgkdktn",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "sqcmfwpf",
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
    "id": "en5bdvzl",
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
    "id": "l0ud4yzt",
    "name": "inv_drs",
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
    "id": "njic9lq7",
    "name": "net_amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "urmlsrn3",
    "name": "profit",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8lelxc8d",
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
    "query": "SELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.party,\n  parties.type AS party_type,\n  parties.area,\n  areas.section,\n  invoices.invoiceNo,\n  item,\n  transactions.cost_price,\n  price,\n  transactions.qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  transactions.discount_rs,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0)))-transactions.discount_rs\n  AS total,\n  invoices.discount_1 AS inv_d1,\n  invoices.discount_2 AS inv_d2,\n  invoices.discount_rs AS inv_drs,\n  printf(\"%.2f\",((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0))-transactions.discount_rs)\n  *(1 - (invoices.discount_1 / 100.0))\n  *(1 - (invoices.discount_2 / 100.0))) AS net_amount,\n  printf(\"%.2f\",net_price.net_price*transactions.qty) AS profit,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  LEFT JOIN invoices ON transactions.invoice = invoices.id\n  LEFT JOIN parties ON invoices.party = parties.id\n  LEFT JOIN net_price ON transactions.item = net_price.id\n  LEFT JOIN areas ON parties.area = areas.id\nGROUP BY transactions.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vgwcens7",
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
    "id": "k6qjj67y",
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
    "id": "dstpniwl",
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
    "id": "y7d0ipwq",
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
    "id": "t5wbhied",
    "name": "area",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "tdeikttss6upezc",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ltnfcveq",
    "name": "section",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "nlwqqfyu1ur5lpo",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rjyymawr",
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
    "id": "alzfdeb4",
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
    "id": "toljikxi",
    "name": "cost_price",
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
    "id": "h6cw43uv",
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
    "id": "gnrtuapr",
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
    "id": "kokksyog",
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
    "id": "swfzhoxs",
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
    "id": "axwomhdk",
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
    "id": "bticpqcx",
    "name": "discount_rs",
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
    "id": "oihwxyc6",
    "name": "total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2ljrutqv",
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
    "id": "mujk5fzy",
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
    "id": "nxsyayb7",
    "name": "inv_drs",
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
    "id": "1zjgur7u",
    "name": "net_amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wjfabdc2",
    "name": "profit",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wsntono9",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("z1lgkr6d")

  // remove
  collection.schema.removeField("wbex5mtc")

  // remove
  collection.schema.removeField("npxoj7dt")

  // remove
  collection.schema.removeField("kxuzrxeu")

  // remove
  collection.schema.removeField("gjlmyjju")

  // remove
  collection.schema.removeField("vl1tbyhl")

  // remove
  collection.schema.removeField("9ohqmucb")

  // remove
  collection.schema.removeField("qi93irpi")

  // remove
  collection.schema.removeField("ahfcn59o")

  // remove
  collection.schema.removeField("fpe3kadc")

  // remove
  collection.schema.removeField("uhan1www")

  // remove
  collection.schema.removeField("ugdcaqd9")

  // remove
  collection.schema.removeField("vlc6yvuh")

  // remove
  collection.schema.removeField("p8npxnru")

  // remove
  collection.schema.removeField("zrpcvctv")

  // remove
  collection.schema.removeField("ddgkdktn")

  // remove
  collection.schema.removeField("sqcmfwpf")

  // remove
  collection.schema.removeField("en5bdvzl")

  // remove
  collection.schema.removeField("l0ud4yzt")

  // remove
  collection.schema.removeField("njic9lq7")

  // remove
  collection.schema.removeField("urmlsrn3")

  // remove
  collection.schema.removeField("8lelxc8d")

  return dao.saveCollection(collection)
})
