/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8zru1ik12ki465e")

  collection.options = {
    "query": "SELECT \n  p1.id,\n  p1.description,\n  p1.created,\n  p1.updated,\n  p1.payment_date AS dated,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  p1.paid,\n  (CASE WHEN p1.type = 'recieving' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'sending' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS credit,\n  (CASE WHEN p1.type = 'sending' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'recieving' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS debit,\n  printf(\"%.2f\",(SELECT SUM(\n    CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END)\n  FROM payments_view p2\n  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)) AS balance\nFROM payments_view p1 ORDER BY p1.payment_date\n"
  }

  // remove
  collection.schema.removeField("dgmpr9j3")

  // remove
  collection.schema.removeField("wt1sx4bf")

  // remove
  collection.schema.removeField("wt8rwpeg")

  // remove
  collection.schema.removeField("gztzagxz")

  // remove
  collection.schema.removeField("uull4dfi")

  // remove
  collection.schema.removeField("qjzxocyn")

  // remove
  collection.schema.removeField("7buskdqf")

  // remove
  collection.schema.removeField("jz7lz6xm")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jttnnags",
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
    "id": "saznqyeg",
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
    "id": "lkvfuccq",
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
    "id": "onjpt1io",
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
    "id": "dkwxxmp3",
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
    "id": "eltwegar",
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
    "id": "bdchxquy",
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
    "id": "wflxevvb",
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
    "id": "wylqhblu",
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
  const collection = dao.findCollectionByNameOrId("8zru1ik12ki465e")

  collection.options = {
    "query": "SELECT \n  p1.id,\n  p1.created,\n  p1.updated,\n  p1.payment_date AS dated,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  p1.paid,\n  (CASE WHEN p1.type = 'recieving' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'sending' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS credit,\n  (CASE WHEN p1.type = 'sending' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'recieving' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS debit,\n  printf(\"%.2f\",(SELECT SUM(\n    CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END)\n  FROM payments_view p2\n  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)) AS balance\nFROM payments_view p1 ORDER BY p1.payment_date\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dgmpr9j3",
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
    "id": "wt1sx4bf",
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
    "id": "wt8rwpeg",
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
    "id": "gztzagxz",
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
    "id": "uull4dfi",
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
    "id": "qjzxocyn",
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
    "id": "7buskdqf",
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
    "id": "jz7lz6xm",
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
  collection.schema.removeField("jttnnags")

  // remove
  collection.schema.removeField("saznqyeg")

  // remove
  collection.schema.removeField("lkvfuccq")

  // remove
  collection.schema.removeField("onjpt1io")

  // remove
  collection.schema.removeField("dkwxxmp3")

  // remove
  collection.schema.removeField("eltwegar")

  // remove
  collection.schema.removeField("bdchxquy")

  // remove
  collection.schema.removeField("wflxevvb")

  // remove
  collection.schema.removeField("wylqhblu")

  return dao.saveCollection(collection)
})
