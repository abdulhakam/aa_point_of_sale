/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("8zru1ik12ki465e")

  collection.options = {
    "query": "SELECT \n  p1.id,\n  p1.payment_date,\n  p1.invoice,\n  p1.party,\n  p1.type,\n  (CASE \n    WHEN p1.type = 'recieving' THEN p1.amount\n    ELSE 0\n  END) AS credit,\n  (CASE \n    WHEN p1.type = 'sending' THEN p1.amount\n    ELSE 0\n  END) AS debit,\n  (SELECT SUM(\n    CASE \n      WHEN p2.type = 'recieving' THEN p2.amount\n      WHEN p2.type = 'sending' THEN -p2.amount\n    END)\n  FROM payments_view p2\n  WHERE p2.party = p1.party AND p2.payment_date <= p1.payment_date) AS balance\nFROM payments_view p1\n"
  }

  // remove
  collection.schema.removeField("hpp16qc3")

  // remove
  collection.schema.removeField("xcfl72c2")

  // remove
  collection.schema.removeField("b2r9e87q")

  // remove
  collection.schema.removeField("p3wn3dh6")

  // remove
  collection.schema.removeField("13qvl1v1")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bexhqzq0",
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
    "id": "frmjaqkw",
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
    "id": "ynro6uyu",
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
    "id": "w34meauu",
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
    "id": "nvtsrjdy",
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
    "id": "yvbny7ez",
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
    "id": "lfjwez7p",
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
    "query": "SELECT \n  id,\n  payment_date,\n  payments_view.invoice,\n  payments_view.party,\n  payments_view.type,\n  payments_view.amount FROM payments_view"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hpp16qc3",
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
    "id": "xcfl72c2",
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
    "id": "b2r9e87q",
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
    "id": "p3wn3dh6",
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
    "id": "13qvl1v1",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // remove
  collection.schema.removeField("bexhqzq0")

  // remove
  collection.schema.removeField("frmjaqkw")

  // remove
  collection.schema.removeField("ynro6uyu")

  // remove
  collection.schema.removeField("w34meauu")

  // remove
  collection.schema.removeField("nvtsrjdy")

  // remove
  collection.schema.removeField("yvbny7ez")

  // remove
  collection.schema.removeField("lfjwez7p")

  return dao.saveCollection(collection)
})
