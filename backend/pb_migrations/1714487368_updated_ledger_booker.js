/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("vpuhx1oo254tbm8")

  collection.options = {
    "query": "SELECT \n  p1.id,\n  p1.description,\n  p1.created,\n  p1.updated,\n  p1.payment_date AS dated,\n  p1.invoice,\n  p1.party,-- pty.type,\n  p1.type,\n  p1.paid,\n  (CASE WHEN p1.type = 'recieving' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'sending' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS credit,\n  (CASE WHEN p1.type = 'sending' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'recieving' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS debit\nFROM payments_view p1 \n  LEFT JOIN parties pty ON p1.party = pty.id\n  ORDER BY p1.payment_date\n"
  }

  // remove
  collection.schema.removeField("h5ebrwe1")

  // remove
  collection.schema.removeField("8dmpe1ky")

  // remove
  collection.schema.removeField("ycmmoiwq")

  // remove
  collection.schema.removeField("o4ox40fy")

  // remove
  collection.schema.removeField("oycvp0ql")

  // remove
  collection.schema.removeField("fknvpcb5")

  // remove
  collection.schema.removeField("awiadwu5")

  // remove
  collection.schema.removeField("eiul0t20")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nz5ft0tf",
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
    "id": "781tiqxh",
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
    "id": "gzddeum6",
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
    "id": "purqbntb",
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
    "id": "6lkld2b9",
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
    "id": "lukqxovv",
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
    "id": "jbksac3s",
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
    "id": "ejfocgb4",
    "name": "debit",
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
  const collection = dao.findCollectionByNameOrId("vpuhx1oo254tbm8")

  collection.options = {
    "query": "SELECT \n  p1.id,\n  p1.description,\n  p1.created,\n  p1.updated,\n  p1.payment_date AS dated,\n  p1.invoice,\n  p1.party,-- parties.type,\n  p1.type,\n  p1.paid,\n  (CASE WHEN p1.type = 'recieving' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'sending' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS credit,\n  (CASE WHEN p1.type = 'sending' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'recieving' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS debit\nFROM payments_view p1 \n  JOIN parties ON p1.party = parties.id\n  ORDER BY p1.payment_date\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "h5ebrwe1",
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
    "id": "8dmpe1ky",
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
    "id": "ycmmoiwq",
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
    "id": "o4ox40fy",
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
    "id": "oycvp0ql",
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
    "id": "fknvpcb5",
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
    "id": "awiadwu5",
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
    "id": "eiul0t20",
    "name": "debit",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // remove
  collection.schema.removeField("nz5ft0tf")

  // remove
  collection.schema.removeField("781tiqxh")

  // remove
  collection.schema.removeField("gzddeum6")

  // remove
  collection.schema.removeField("purqbntb")

  // remove
  collection.schema.removeField("6lkld2b9")

  // remove
  collection.schema.removeField("lukqxovv")

  // remove
  collection.schema.removeField("jbksac3s")

  // remove
  collection.schema.removeField("ejfocgb4")

  return dao.saveCollection(collection)
})
