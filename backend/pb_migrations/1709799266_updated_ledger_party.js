/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8zru1ik12ki465e")

  collection.options = {
    "query": "SELECT \n  p1.id,\n  p1.payment_date,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  (CASE WHEN p1.type = 'recieving' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'sending' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS credit,\n  (CASE WHEN p1.type = 'sending' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'recieving' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS debit,\n  (SELECT SUM(\n    CASE \n      WHEN p2.type = 'recieving' THEN p2.amount\n      WHEN p2.type = 'sending' THEN -p2.amount\n    END)\n  FROM payments_view p2\n  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date) AS balance\nFROM payments_view p1\n"
  }

  // remove
  collection.schema.removeField("8u6kuau5")

  // remove
  collection.schema.removeField("zlg3w6zh")

  // remove
  collection.schema.removeField("tqzxlu4c")

  // remove
  collection.schema.removeField("igo71t7d")

  // remove
  collection.schema.removeField("lsyjs9gj")

  // remove
  collection.schema.removeField("l2cbre2j")

  // remove
  collection.schema.removeField("lgeef8w4")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pacgyqmi",
    "name": "payment_date",
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
    "id": "k5pe4iuv",
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
    "id": "wypxgytj",
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
    "id": "i6o92mbm",
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
    "id": "ibw4rgvx",
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
    "id": "4om22cxr",
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
    "id": "f2o5jaw4",
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
    "query": "SELECT \n  p1.id,\n  p1.payment_date,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  (CASE WHEN p1.type = 'recieving' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'sending' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS credit,\n  (CASE WHEN p1.type = 'sending' THEN \n      (CASE WHEN p1.paid = TRUE THEN p1.amount\n       ELSE 0 \n       END) \n   ELSE (CASE WHEN p1.type = 'recieving' THEN \n           (CASE WHEN p1.paid = FALSE THEN p1.amount\n            ELSE 0 \n            END) \n         ELSE 0 -- return case missing\n         END)\n   END) AS debit,\n  (CASE \n      WHEN p1.type = 'recieving' THEN p1.amount\n      WHEN p1.type = 'sending' THEN -p1.amount\n    END) AS balance\nFROM payments_view p1\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8u6kuau5",
    "name": "payment_date",
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
    "id": "zlg3w6zh",
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
    "id": "tqzxlu4c",
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
    "id": "igo71t7d",
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
    "id": "lsyjs9gj",
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
    "id": "l2cbre2j",
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
    "id": "lgeef8w4",
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
  collection.schema.removeField("pacgyqmi")

  // remove
  collection.schema.removeField("k5pe4iuv")

  // remove
  collection.schema.removeField("wypxgytj")

  // remove
  collection.schema.removeField("i6o92mbm")

  // remove
  collection.schema.removeField("ibw4rgvx")

  // remove
  collection.schema.removeField("4om22cxr")

  // remove
  collection.schema.removeField("f2o5jaw4")

  return dao.saveCollection(collection)
})
