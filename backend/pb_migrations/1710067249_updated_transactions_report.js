/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("b0mm2vu3j4tngsg")

  collection.options = {
    "query": "SELECT\n  transaction_view.id,\n  invoice,\n  transaction_view.type,\n  transaction_view.invoiceNo,\n  transaction_view.party,\n  area,\n  section,\n  party_type,\n  invoice_view.booker,\n  items.category AS company,\n  item,\n  price,\n  qty,\n  scheme,\n  transaction_view.discount_1,\n  transaction_view.discount_2,\n  transaction_view.discount_rs,\n  inv_d1,\n  inv_d2,\n  inv_drs,\n  transaction_view.total,\n  net_amount,\n  printf(\"%.2f\",transaction_view.net_amount-(inv_drs*net_amount/invoice_view.unrounded_total)) AS final_amount,\n  transaction_view.net_amount-(inv_drs*net_amount/invoice_view.unrounded_total)-(transaction_view.cost_price*qty) AS profit,\n  transaction_view.deleted,\n  transaction_view.created,\n  transaction_view.updated\nFROM\n  transaction_view\nLEFT JOIN items ON item = items.id\nLEFT JOIN invoice_view ON invoice = invoice_view.id"
  }

  // remove
  collection.schema.removeField("9gikzhiv")

  // remove
  collection.schema.removeField("leyamcyr")

  // remove
  collection.schema.removeField("gye8ejrl")

  // remove
  collection.schema.removeField("4iq0epmh")

  // remove
  collection.schema.removeField("ikqezx57")

  // remove
  collection.schema.removeField("in90pird")

  // remove
  collection.schema.removeField("x01zwua9")

  // remove
  collection.schema.removeField("3cqjsgm5")

  // remove
  collection.schema.removeField("fqphnu8j")

  // remove
  collection.schema.removeField("vh9ljlvn")

  // remove
  collection.schema.removeField("y3ezuxex")

  // remove
  collection.schema.removeField("uax4lhgf")

  // remove
  collection.schema.removeField("bgppzylg")

  // remove
  collection.schema.removeField("atzofarl")

  // remove
  collection.schema.removeField("ojfzgzkw")

  // remove
  collection.schema.removeField("hhvq0ppm")

  // remove
  collection.schema.removeField("w0vccd5r")

  // remove
  collection.schema.removeField("5fcwv4cq")

  // remove
  collection.schema.removeField("ep9h42lb")

  // remove
  collection.schema.removeField("gkfvphs5")

  // remove
  collection.schema.removeField("jq5gjsvo")

  // remove
  collection.schema.removeField("8hwymglh")

  // remove
  collection.schema.removeField("pe7tf0s4")

  // remove
  collection.schema.removeField("cm49p71a")

  // remove
  collection.schema.removeField("obwfmtlb")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "j1b1msfw",
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
    "id": "hfunczyr",
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
    "id": "ccyw4uuf",
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
    "id": "dnsa0szi",
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
    "id": "lrvywhnt",
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
    "id": "d7i3ua0z",
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
    "id": "xajhjv7g",
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
    "id": "1zxylljk",
    "name": "booker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "3dz9ii2wo8d5q8g",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "zbnovexy",
    "name": "company",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "106aq516rbyoq0q",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nozbf1ec",
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
    "id": "vwsmwavm",
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
    "id": "cishh4ar",
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
    "id": "jlleylr3",
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
    "id": "ml7s5ahd",
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
    "id": "pm6bkfrg",
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
    "id": "oosg45qb",
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
    "id": "mabs1e5j",
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
    "id": "pi2hdvxf",
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
    "id": "hgjewkck",
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
    "id": "txczl6k2",
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
    "id": "o22kxbhv",
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
    "id": "5raemxvl",
    "name": "final_amount",
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
    "id": "iew4osg5",
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
    "id": "wpmocfi6",
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
  const collection = dao.findCollectionByNameOrId("b0mm2vu3j4tngsg")

  collection.options = {
    "query": "SELECT\n  transaction_view.id,\n  invoice,\n  transaction_view.type,\n  transaction_view.invoiceNo,\n  transaction_view.party,\n  area,\n  section,\n  party_type,\n  invoice_view.booker,\n  items.category AS company,\n  item,\n  transaction_view.cost_price,\n  price,\n  qty,\n  scheme,\n  transaction_view.discount_1,\n  transaction_view.discount_2,\n  transaction_view.discount_rs,\n  inv_d1,\n  inv_d2,\n  inv_drs,\n  transaction_view.total,\n  net_amount,\n  printf(\"%.2f\",transaction_view.net_amount-(inv_drs*net_amount/invoice_view.unrounded_total)) AS final_amount,\n  transaction_view.net_amount-(inv_drs*net_amount/invoice_view.unrounded_total) AS profit,\n  transaction_view.deleted,\n  transaction_view.created,\n  transaction_view.updated\nFROM\n  transaction_view\nLEFT JOIN items ON item = items.id\nLEFT JOIN invoice_view ON invoice = invoice_view.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9gikzhiv",
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
    "id": "leyamcyr",
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
    "id": "gye8ejrl",
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
    "id": "4iq0epmh",
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
    "id": "ikqezx57",
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
    "id": "in90pird",
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
    "id": "x01zwua9",
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
    "id": "3cqjsgm5",
    "name": "booker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "3dz9ii2wo8d5q8g",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fqphnu8j",
    "name": "company",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "106aq516rbyoq0q",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vh9ljlvn",
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
    "id": "y3ezuxex",
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
    "id": "uax4lhgf",
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
    "id": "bgppzylg",
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
    "id": "atzofarl",
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
    "id": "ojfzgzkw",
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
    "id": "hhvq0ppm",
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
    "id": "w0vccd5r",
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
    "id": "5fcwv4cq",
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
    "id": "ep9h42lb",
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
    "id": "gkfvphs5",
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
    "id": "jq5gjsvo",
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
    "id": "8hwymglh",
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
    "id": "pe7tf0s4",
    "name": "final_amount",
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
    "id": "cm49p71a",
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
    "id": "obwfmtlb",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("j1b1msfw")

  // remove
  collection.schema.removeField("hfunczyr")

  // remove
  collection.schema.removeField("ccyw4uuf")

  // remove
  collection.schema.removeField("dnsa0szi")

  // remove
  collection.schema.removeField("lrvywhnt")

  // remove
  collection.schema.removeField("d7i3ua0z")

  // remove
  collection.schema.removeField("xajhjv7g")

  // remove
  collection.schema.removeField("1zxylljk")

  // remove
  collection.schema.removeField("zbnovexy")

  // remove
  collection.schema.removeField("nozbf1ec")

  // remove
  collection.schema.removeField("vwsmwavm")

  // remove
  collection.schema.removeField("cishh4ar")

  // remove
  collection.schema.removeField("jlleylr3")

  // remove
  collection.schema.removeField("ml7s5ahd")

  // remove
  collection.schema.removeField("pm6bkfrg")

  // remove
  collection.schema.removeField("oosg45qb")

  // remove
  collection.schema.removeField("mabs1e5j")

  // remove
  collection.schema.removeField("pi2hdvxf")

  // remove
  collection.schema.removeField("hgjewkck")

  // remove
  collection.schema.removeField("txczl6k2")

  // remove
  collection.schema.removeField("o22kxbhv")

  // remove
  collection.schema.removeField("5raemxvl")

  // remove
  collection.schema.removeField("iew4osg5")

  // remove
  collection.schema.removeField("wpmocfi6")

  return dao.saveCollection(collection)
})
