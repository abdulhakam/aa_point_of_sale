/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("l486go6o2qlqmgk")

  collection.options = {
    "query": "WITH balances AS (\n  SELECT\n  id,\n  created,\n  updated,\n  party,\n  type,\n  paid,\n  SUM(CASE WHEN paid = TRUE THEN amount ELSE 0 END) -- return case missing\n      AS credit,\n  SUM(CASE WHEN paid = FALSE THEN amount ELSE 0 END)-- return case missing\n      AS debit\nFROM payments_view GROUP BY party\n)\n\n\nSELECT \n  p1.id,\n  p1.description,\n  p1.created,\n  p1.updated,\n  p1.payment_date AS dated,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  p1.paid,\n  SUM(CASE WHEN p1.type = 'recieving' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'sending' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS credit,\n  SUM(CASE WHEN p1.type = 'sending' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'recieving' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS debit,\n  printf(\"%.2f\",(SELECT SUM(\n    CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END)\n  FROM payments_view p2\n  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)) AS balance\nFROM payments_view p1\n  LEFT JOIN balances ON p1.party = balances.party\n  GROUP BY p1.party\n"
  }

  // remove
  collection.schema.removeField("gy4jk5js")

  // remove
  collection.schema.removeField("dvlukfmm")

  // remove
  collection.schema.removeField("p9aamqwt")

  // remove
  collection.schema.removeField("xmeab4lf")

  // remove
  collection.schema.removeField("eprzngd4")

  // remove
  collection.schema.removeField("r5gcoqso")

  // remove
  collection.schema.removeField("ufv2l8zn")

  // remove
  collection.schema.removeField("tdjoaadp")

  // remove
  collection.schema.removeField("emfq0t85")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0mmk339k",
    "name": "description",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ojif0xcf",
    "name": "dated",
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
    "id": "14p4ta5v",
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
    "id": "lpt725s0",
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
    "id": "wwfgyoxp",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "sending",
        "recieving",
        "return"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "9juedtyy",
    "name": "paid",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xplxptn3",
    "name": "credit",
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
    "id": "uhrujptk",
    "name": "debit",
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
    "id": "vix7okfm",
    "name": "balance",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("l486go6o2qlqmgk")

  collection.options = {
    "query": "WITH balances AS (\n  SELECT\n  p1.id,\n  p1.created,\n  p1.updated,\n  p1.party,\n  p1.type,\n  p1.paid,\n  SUM(CASE WHEN p1.paid = TRUE THEN p1.amount ELSE 0 END) -- return case missing\n      AS credit,\n  SUM(CASE WHEN p1.paid = FALSE THEN p1.amount ELSE 0 END)-- return case missing\n      AS debit\nFROM payments_view GROUP BY party\n)\n\n\nSELECT \n  p1.id,\n  p1.description,\n  p1.created,\n  p1.updated,\n  p1.payment_date AS dated,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  p1.paid,\n  SUM(CASE WHEN p1.type = 'recieving' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'sending' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS credit,\n  SUM(CASE WHEN p1.type = 'sending' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'recieving' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS debit,\n  printf(\"%.2f\",(SELECT SUM(\n    CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END)\n  FROM payments_view p2\n  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)) AS balance\nFROM payments_view p1\n  GROUP BY p1.party\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gy4jk5js",
    "name": "description",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "min": null,
      "max": null,
      "pattern": ""
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dvlukfmm",
    "name": "dated",
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
    "id": "p9aamqwt",
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
    "id": "xmeab4lf",
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
    "id": "eprzngd4",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "sending",
        "recieving",
        "return"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "r5gcoqso",
    "name": "paid",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ufv2l8zn",
    "name": "credit",
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
    "id": "tdjoaadp",
    "name": "debit",
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
    "id": "emfq0t85",
    "name": "balance",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // remove
  collection.schema.removeField("0mmk339k")

  // remove
  collection.schema.removeField("ojif0xcf")

  // remove
  collection.schema.removeField("14p4ta5v")

  // remove
  collection.schema.removeField("lpt725s0")

  // remove
  collection.schema.removeField("wwfgyoxp")

  // remove
  collection.schema.removeField("9juedtyy")

  // remove
  collection.schema.removeField("xplxptn3")

  // remove
  collection.schema.removeField("uhrujptk")

  // remove
  collection.schema.removeField("vix7okfm")

  return dao.saveCollection(collection)
})
