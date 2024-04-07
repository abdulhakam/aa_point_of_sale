/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8zru1ik12ki465e")

  collection.options = {
    "query": "SELECT \n  p1.id,\n  p1.description,\n  p1.created,\n  p1.updated,\n  p1.payment_date AS dated,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  p1.paid,\n  (CASE WHEN p1.type = 'recieving' & p1.paid = TRUE THEN p1.amount ELSE\n   (CASE WHEN p1.type = 'sending' & p1.paid = FALSE THEN p1.amount ELSE\n    (CASE WHEN p1.type = 'return' & p1.party_type = 'customer' THEN p1.amount\n        ELSE 0 END) END) END) AS credit,\n  (CASE WHEN p1.type = 'recieving' & p1.paid = FALSE THEN p1.amount\n        WHEN p1.type = 'sending' & p1.paid = TRUE THEN p1.amount\n        WHEN p1.type = 'return' & p1.party_type = 'supplier' THEN p1.amount\n        ELSE 0 END) AS debit,\n  printf(\"%.2f\",(SELECT SUM(\n    CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END)\n  FROM payments_view p2\n  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)) AS balance\nFROM payments_view p1 ORDER BY p1.payment_date\n"
  }

  // remove
  collection.schema.removeField("ksbxyfub")

  // remove
  collection.schema.removeField("qkeuh6pd")

  // remove
  collection.schema.removeField("1sougnmj")

  // remove
  collection.schema.removeField("3rkanbdd")

  // remove
  collection.schema.removeField("fstd622s")

  // remove
  collection.schema.removeField("g0o0g8t3")

  // remove
  collection.schema.removeField("4yslmqcq")

  // remove
  collection.schema.removeField("9j0t6j51")

  // remove
  collection.schema.removeField("v0lw91lr")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "q2q3xlor",
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
    "id": "lw7wvtxy",
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
    "id": "hnrdxxjt",
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
    "id": "qohfvnqc",
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
    "id": "doclbdk7",
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
    "id": "2rbj2plg",
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
    "id": "upnjeebw",
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
    "id": "7jpr9hvr",
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
    "id": "yrrgpwsu",
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
    "query": "SELECT \n  p1.id,\n  p1.description,\n  p1.created,\n  p1.updated,\n  p1.payment_date AS dated,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  p1.paid,\n  (CASE WHEN p1.type = 'recieving' & p1.paid = TRUE THEN p1.amount\n        WHEN p1.type = 'sending' & p1.paid = FALSE THEN p1.amount\n        -- WHEN p1.type = 'return' & p1.party_type = 'customer' THEN p1.amount\n        ELSE 0 END) AS credit,\n  (CASE WHEN p1.type = 'recieving' & p1.paid = FALSE THEN p1.amount\n        WHEN p1.type = 'sending' & p1.paid = TRUE THEN p1.amount\n        -- WHEN p1.type = 'return' & p1.party_type = 'supplier' THEN p1.amount\n        ELSE 0 END) AS debit,\n  printf(\"%.2f\",(SELECT SUM(\n    CASE WHEN p2.paid = FALSE THEN p2.amount ELSE -p2.amount END)\n  FROM payments_view p2\n  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date)) AS balance\nFROM payments_view p1 ORDER BY p1.payment_date\n"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ksbxyfub",
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
    "id": "qkeuh6pd",
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
    "id": "1sougnmj",
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
    "id": "3rkanbdd",
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
    "id": "fstd622s",
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
    "id": "g0o0g8t3",
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
    "id": "4yslmqcq",
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
    "id": "9j0t6j51",
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
    "id": "v0lw91lr",
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
  collection.schema.removeField("q2q3xlor")

  // remove
  collection.schema.removeField("lw7wvtxy")

  // remove
  collection.schema.removeField("hnrdxxjt")

  // remove
  collection.schema.removeField("qohfvnqc")

  // remove
  collection.schema.removeField("doclbdk7")

  // remove
  collection.schema.removeField("2rbj2plg")

  // remove
  collection.schema.removeField("upnjeebw")

  // remove
  collection.schema.removeField("7jpr9hvr")

  // remove
  collection.schema.removeField("yrrgpwsu")

  return dao.saveCollection(collection)
})
