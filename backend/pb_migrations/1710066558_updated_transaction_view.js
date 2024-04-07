/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("uziwrzw36sr7n6b")

  collection.options = {
    "query": "WITH trans_totals AS (\n  SELECT id,\n  invoice,\n  price,\n  qty,\n  discount_1,\n  discount_2,\n  discount_rs,\n  ((price*qty)\n  *(1-discount_1/100.00)\n  *(1-discount_2/100.00))\n  -discount_rs AS total,\n  (((price*qty)\n  *(1-discount_1/100.00)\n  *(1-discount_2/100.00))\n  -discount_rs)/invoice_view.total AS ratio\n  FROM transactions\n  LEFT JOIN invoice_view ON transactions.invoice = invoice_view.id\n),\n  net_amounts AS (\n  SELECT\n  id,\n  invoice,\n  invoice_view.discount_rs*ratio AS inv_drs,\n  trans_total.total\n  *(1-invoice_view.discount_1/100.00)\n  *(1-invoice_view.discount_2/100.00)\n  -invoice_view.discount_rs*ratio AS ftrans_total\n  FROM trans_totals\n  LEFT JOIN invoice_view ON transactions.invoice = invoice_view.id\n  GROUP BY transactions.id\n) \n\nSELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.party,\n  parties.type AS party_type,\n  parties.area,\n  areas.section,\n  invoices.invoiceNo,\n  item,\n  transactions.cost_price,\n  price,\n  transactions.qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  transactions.discount_rs,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0)))-transactions.discount_rs\n  AS total,\n  invoices.discount_1 AS inv_d1,\n  invoices.discount_2 AS inv_d2,\n  invoices.discount_rs AS inv_drs,\n  printf(\"%.2f\",((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0))-transactions.discount_rs)\n  *(1 - (invoices.discount_1 / 100.0))\n  *(1 - (invoices.discount_2 / 100.0))) AS net_amount,\n  printf(\"%.2f\",(cost_price*transactions.qty)) AS profit,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  LEFT JOIN invoices ON transactions.invoice = invoices.id\n  LEFT JOIN parties ON invoices.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\nGROUP BY transactions.id"
  }

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

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kg6oyvlx",
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
    "id": "oysj8mac",
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
    "id": "sesxdmqo",
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
    "id": "musvli16",
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
    "id": "1suzdqgg",
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
    "id": "otvqv8in",
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
    "id": "ixsusm2x",
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
    "id": "31mmd5lc",
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
    "id": "tqjrikgb",
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
    "id": "s9cu0y8x",
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
    "id": "iqysjofj",
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
    "id": "f8nuerbx",
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
    "id": "assoqdmb",
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
    "id": "hxasndbb",
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
    "id": "io5qpkrc",
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
    "id": "vf6xncuf",
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
    "id": "rniffoku",
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
    "id": "je0facwa",
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
    "id": "9ouhslui",
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
    "id": "wahh3sw3",
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
    "id": "md9isnew",
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
    "id": "bt8pe5ja",
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
    "query": "WITH trans_totals AS (\n  SELECT id,\n  invoice,\n  price,\n  qty,\n  discount_1,\n  discount_2,\n  discount_rs,\n  ((price*qty)*(1-discount_1/100.00)*(1-discount_2/100.00))-discount_rs AS total\n  FROM transactions\n),\n  net_amounts AS (\n  SELECT\n  id,\n  invoice,\n  invoice_view.discount_1 AS inv_d1,\n  invoice_view.discount_2 AS inv_d2,\n  invoice_view.discount_rs AS inv_drs,\n  0 AS ratio\n  FROM trans_totals\n  LEFT JOIN invoice_view ON transactions.invoice = invoice_view.id\n  GROUP BY transactions.id\n) \n\nSELECT\n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.party,\n  parties.type AS party_type,\n  parties.area,\n  areas.section,\n  invoices.invoiceNo,\n  item,\n  transactions.cost_price,\n  price,\n  transactions.qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  transactions.discount_rs,\n  ((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0)))-transactions.discount_rs\n  AS total,\n  invoices.discount_1 AS inv_d1,\n  invoices.discount_2 AS inv_d2,\n  invoices.discount_rs AS inv_drs,\n  printf(\"%.2f\",((price*transactions.qty)\n  *(1 - (transactions.discount_1 / 100.0))\n  *(1 - (transactions.discount_2 / 100.0))-transactions.discount_rs)\n  *(1 - (invoices.discount_1 / 100.0))\n  *(1 - (invoices.discount_2 / 100.0))) AS net_amount,\n  printf(\"%.2f\",(cost_price*transactions.qty)) AS profit,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\nFROM\n  transactions\n  LEFT JOIN invoices ON transactions.invoice = invoices.id\n  LEFT JOIN parties ON invoices.party = parties.id\n  LEFT JOIN areas ON parties.area = areas.id\nGROUP BY transactions.id"
  }

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

  // remove
  collection.schema.removeField("kg6oyvlx")

  // remove
  collection.schema.removeField("oysj8mac")

  // remove
  collection.schema.removeField("sesxdmqo")

  // remove
  collection.schema.removeField("musvli16")

  // remove
  collection.schema.removeField("1suzdqgg")

  // remove
  collection.schema.removeField("otvqv8in")

  // remove
  collection.schema.removeField("ixsusm2x")

  // remove
  collection.schema.removeField("31mmd5lc")

  // remove
  collection.schema.removeField("tqjrikgb")

  // remove
  collection.schema.removeField("s9cu0y8x")

  // remove
  collection.schema.removeField("iqysjofj")

  // remove
  collection.schema.removeField("f8nuerbx")

  // remove
  collection.schema.removeField("assoqdmb")

  // remove
  collection.schema.removeField("hxasndbb")

  // remove
  collection.schema.removeField("io5qpkrc")

  // remove
  collection.schema.removeField("vf6xncuf")

  // remove
  collection.schema.removeField("rniffoku")

  // remove
  collection.schema.removeField("je0facwa")

  // remove
  collection.schema.removeField("9ouhslui")

  // remove
  collection.schema.removeField("wahh3sw3")

  // remove
  collection.schema.removeField("md9isnew")

  // remove
  collection.schema.removeField("bt8pe5ja")

  return dao.saveCollection(collection)
})
