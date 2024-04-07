/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("uziwrzw36sr7n6b")

  collection.options = {
    "query": "WITH trans_totals AS (\n  SELECT id,\n  invoice,\n  price,\n  qty,\n  discount_1,\n  discount_2,\n  discount_rs,\n  ((price*qty)*(1-discount_1/100.00)*(1-discount_2/100.00))-discount_rs AS total\n  FROM transactions\n),\n  net_amounts AS (\n  SELECT\n  id,\n  invoice,\n  invoice_view.discount_1 AS inv_d1,\n  invoice_view.discount_2 AS inv_d2,\n  invoice_view.discount_rs AS inv_drs,\n  0 AS ratio\n  FROM trans_totals\n  LEFT JOIN invoice_view ON transactions.invoice = invoice_view.id\n  GROUP BY transactions.id\n) \n\nSELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.party,\n  parties.type AS party_type,\n  parties.area,\n  areas.section,\n  invoices.invoiceNo,\n  item,\n  transactions.cost_price,\n  price,\n  transactions.qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  transactions.discount_rs,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0)))-transactions.discount_rs\n  AS total,\n  invoices.discount_1 AS inv_d1,\n  invoices.discount_2 AS inv_d2,\n  invoices.discount_rs AS inv_drs,\n  printf(\"%.2f\",((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0))-transactions.discount_rs)\n  *(1 - (invoices.discount_1 / 100.0))\n  *(1 - (invoices.discount_2 / 100.0))) AS net_amount,\n  printf(\"%.2f\",(cost_price*transactions.qty)) AS profit,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  LEFT JOIN invoices ON transactions.invoice = invoices.id\n  LEFT JOIN parties ON invoices.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\nGROUP BY transactions.id"
  }

  // remove
  collection.schema.removeField("2rpmanmh")

  // remove
  collection.schema.removeField("c1amnf2c")

  // remove
  collection.schema.removeField("ptwda17a")

  // remove
  collection.schema.removeField("8env3wwh")

  // remove
  collection.schema.removeField("qnwsrgdp")

  // remove
  collection.schema.removeField("efch127k")

  // remove
  collection.schema.removeField("rq2p2hrm")

  // remove
  collection.schema.removeField("ims0pon6")

  // remove
  collection.schema.removeField("bvixeyrm")

  // remove
  collection.schema.removeField("oqbakzeo")

  // remove
  collection.schema.removeField("dtxjotse")

  // remove
  collection.schema.removeField("50uqjuwp")

  // remove
  collection.schema.removeField("bcjpl0hw")

  // remove
  collection.schema.removeField("esasj24s")

  // remove
  collection.schema.removeField("rwlii8bc")

  // remove
  collection.schema.removeField("ileialmy")

  // remove
  collection.schema.removeField("kks5tnia")

  // remove
  collection.schema.removeField("25binfrz")

  // remove
  collection.schema.removeField("qv62omzl")

  // remove
  collection.schema.removeField("d34f7sck")

  // remove
  collection.schema.removeField("iaxgibuh")

  // remove
  collection.schema.removeField("imapbfct")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yhzvtu4s",
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
    "id": "lup295zo",
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
    "id": "64o6shyo",
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
    "id": "wgylkvlb",
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
    "id": "sofhmh2v",
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
    "id": "pcasj1un",
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
    "id": "v5lvnwsy",
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
    "id": "fkjonpw8",
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
    "id": "yj26c6fw",
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
    "id": "wnnvpbcu",
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
    "id": "l9004jpv",
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
    "id": "r7nzkeov",
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
    "id": "mexebeum",
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
    "id": "hcexehgw",
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
    "id": "zw3b9klb",
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
    "id": "n4yh46il",
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
    "id": "zsjx34uz",
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
    "id": "o6ptyjhc",
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
    "id": "w1cw2kmy",
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
    "id": "5ah2j8fc",
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
    "id": "vop2ngfc",
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
    "id": "vhjb6koc",
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
    "query": "WITH trans_totals AS (\n  SELECT id,\n  invoice,\n  price,\n  qty,\n  discount_1,\n  discount_2,\n  discount_rs,\n  ((price*qty)*(1-discount_1/100.00)*(1-discount_2/100.00))-discount_rs AS total\n  FROM transactions\n),\n  net_amounts AS (\n  SELECT\n  id,\n  invoice,\n  invoice_view.discount_1 AS inv_d1,\n  invoice_view.discount_2 AS inv_d2,\n  invoice_view.discount_rs AS inv_drs,\n  0 AS ratio,\n  transactions.cost_price,\n  price,\n  transactions.qty\n  FROM transactions\n  LEFT JOIN invoice_view ON transactions.invoice = invoice_view.id\n  GROUP BY transactions.id\n) \n\nSELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.party,\n  parties.type AS party_type,\n  parties.area,\n  areas.section,\n  invoices.invoiceNo,\n  item,\n  transactions.cost_price,\n  price,\n  transactions.qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  transactions.discount_rs,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0)))-transactions.discount_rs\n  AS total,\n  invoices.discount_1 AS inv_d1,\n  invoices.discount_2 AS inv_d2,\n  invoices.discount_rs AS inv_drs,\n  printf(\"%.2f\",((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0))-transactions.discount_rs)\n  *(1 - (invoices.discount_1 / 100.0))\n  *(1 - (invoices.discount_2 / 100.0))) AS net_amount,\n  printf(\"%.2f\",(cost_price*transactions.qty)) AS profit,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  LEFT JOIN invoices ON transactions.invoice = invoices.id\n  LEFT JOIN parties ON invoices.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\nGROUP BY transactions.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "2rpmanmh",
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
    "id": "c1amnf2c",
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
    "id": "ptwda17a",
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
    "id": "8env3wwh",
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
    "id": "qnwsrgdp",
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
    "id": "efch127k",
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
    "id": "rq2p2hrm",
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
    "id": "ims0pon6",
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
    "id": "bvixeyrm",
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
    "id": "oqbakzeo",
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
    "id": "dtxjotse",
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
    "id": "50uqjuwp",
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
    "id": "bcjpl0hw",
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
    "id": "esasj24s",
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
    "id": "rwlii8bc",
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
    "id": "ileialmy",
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
    "id": "kks5tnia",
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
    "id": "25binfrz",
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
    "id": "qv62omzl",
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
    "id": "d34f7sck",
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
    "id": "iaxgibuh",
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
    "id": "imapbfct",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("yhzvtu4s")

  // remove
  collection.schema.removeField("lup295zo")

  // remove
  collection.schema.removeField("64o6shyo")

  // remove
  collection.schema.removeField("wgylkvlb")

  // remove
  collection.schema.removeField("sofhmh2v")

  // remove
  collection.schema.removeField("pcasj1un")

  // remove
  collection.schema.removeField("v5lvnwsy")

  // remove
  collection.schema.removeField("fkjonpw8")

  // remove
  collection.schema.removeField("yj26c6fw")

  // remove
  collection.schema.removeField("wnnvpbcu")

  // remove
  collection.schema.removeField("l9004jpv")

  // remove
  collection.schema.removeField("r7nzkeov")

  // remove
  collection.schema.removeField("mexebeum")

  // remove
  collection.schema.removeField("hcexehgw")

  // remove
  collection.schema.removeField("zw3b9klb")

  // remove
  collection.schema.removeField("n4yh46il")

  // remove
  collection.schema.removeField("zsjx34uz")

  // remove
  collection.schema.removeField("o6ptyjhc")

  // remove
  collection.schema.removeField("w1cw2kmy")

  // remove
  collection.schema.removeField("5ah2j8fc")

  // remove
  collection.schema.removeField("vop2ngfc")

  // remove
  collection.schema.removeField("vhjb6koc")

  return dao.saveCollection(collection)
})
