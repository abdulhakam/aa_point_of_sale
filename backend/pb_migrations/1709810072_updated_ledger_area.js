/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("l486go6o2qlqmgk")

  collection.options = {
    "query": "WITH balances AS (\n  SELECT\n  id,\n  created,\n  updated,\n  party,\n  type,\n  paid,\n  SUM(CASE WHEN paid = TRUE THEN amount ELSE 0 END) -- return case missing\n      AS credit,\n  SUM(CASE WHEN paid = FALSE THEN amount ELSE 0 END)-- return case missing\n      AS debit\nFROM payments_view GROUP BY party\n)\n\n\nSELECT \n  p1.id,\n  p1.description,\n  p1.created,\n  p1.updated,\n  p1.payment_date AS dated,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  p1.paid,\n  SUM(CASE WHEN p1.type = 'recieving' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'sending' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS credit,\n  SUM(CASE WHEN p1.type = 'sending' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'recieving' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS debit,\n  printf(\"%.2f\",(b.credit-b.debit)) AS balance\nFROM payments_view p1\n  LEFT JOIN balances b ON p1.party = b.party\n  GROUP BY p1.party\n"
  }

  // remove
  collection.schema.removeField("g0hbrsle")

  // remove
  collection.schema.removeField("esnqbgko")

  // remove
  collection.schema.removeField("tkjtpn9x")

  // remove
  collection.schema.removeField("ukbj9tax")

  // remove
  collection.schema.removeField("cthvc103")

  // remove
  collection.schema.removeField("jcfxuifb")

  // remove
  collection.schema.removeField("b8xegff2")

  // remove
  collection.schema.removeField("xqy65lp9")

  // remove
  collection.schema.removeField("wq7ax9gu")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pceq3eaq",
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
    "id": "sqfpqjrt",
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
    "id": "dtkgzg4t",
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
    "id": "14vhtc7b",
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
    "id": "ccwp3cr6",
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
    "id": "5a8n3lq3",
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
    "id": "uxa2ezgs",
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
    "id": "xa7vrtjs",
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
    "id": "fwnw5vfa",
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
    "query": "WITH balances AS (\n  SELECT\n  id,\n  created,\n  updated,\n  party,\n  type,\n  paid,\n  SUM(CASE WHEN paid = TRUE THEN amount ELSE 0 END) -- return case missing\n      AS credit,\n  SUM(CASE WHEN paid = FALSE THEN amount ELSE 0 END)-- return case missing\n      AS debit\nFROM payments_view GROUP BY party\n)\n\n\nSELECT \n  p1.id,\n  p1.description,\n  p1.created,\n  p1.updated,\n  p1.payment_date AS dated,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  p1.paid,\n  SUM(CASE WHEN p1.type = 'recieving' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'sending' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS credit,\n  SUM(CASE WHEN p1.type = 'sending' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'recieving' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS debit,\n  printf(\"%.2f\",(SELECT SUM(\n    CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END)\n  FROM payments_view p2\n  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)) AS balance\nFROM payments_view p1\n  LEFT JOIN balances b ON p1.party = b.party\n  GROUP BY p1.party\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "g0hbrsle",
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
    "id": "esnqbgko",
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
    "id": "tkjtpn9x",
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
    "id": "ukbj9tax",
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
    "id": "cthvc103",
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
    "id": "jcfxuifb",
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
    "id": "b8xegff2",
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
    "id": "xqy65lp9",
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
    "id": "wq7ax9gu",
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
  collection.schema.removeField("pceq3eaq")

  // remove
  collection.schema.removeField("sqfpqjrt")

  // remove
  collection.schema.removeField("dtkgzg4t")

  // remove
  collection.schema.removeField("14vhtc7b")

  // remove
  collection.schema.removeField("ccwp3cr6")

  // remove
  collection.schema.removeField("5a8n3lq3")

  // remove
  collection.schema.removeField("uxa2ezgs")

  // remove
  collection.schema.removeField("xa7vrtjs")

  // remove
  collection.schema.removeField("fwnw5vfa")

  return dao.saveCollection(collection)
})
