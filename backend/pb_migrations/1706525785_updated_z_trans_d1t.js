/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("0t5ray71eq50ajq")

  collection.options = {
    "query": "SELECT \n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (1.0*cost_price*qty)-((qty*cost_price)*transactions.discount_1/100) AS cost_price,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (1.0*qty*price)-((qty*price)*transactions.discount_1/100) AS d1t,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\n  FROM transactions\nJOIN invoices ON transactions.invoice = invoices.id"
  }

  // remove
  collection.schema.removeField("bhjcacsj")

  // remove
  collection.schema.removeField("5nr64c1s")

  // remove
  collection.schema.removeField("ejvqp6z2")

  // remove
  collection.schema.removeField("6xe6krhx")

  // remove
  collection.schema.removeField("8ivt7mof")

  // remove
  collection.schema.removeField("f8pvsmyo")

  // remove
  collection.schema.removeField("qq6ets0x")

  // remove
  collection.schema.removeField("qbkfewid")

  // remove
  collection.schema.removeField("kpqq9v65")

  // remove
  collection.schema.removeField("3bnery8q")

  // remove
  collection.schema.removeField("mkke4cut")

  // remove
  collection.schema.removeField("jdwriyln")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "khe8zkgp",
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
    "id": "j1s0rmfx",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jrf60xab",
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
    "id": "wo08tssw",
    "name": "item",
    "type": "relation",
    "required": false,
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
    "id": "kkfgmviq",
    "name": "cost_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0hlircvl",
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
    "id": "tnhugtve",
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
    "id": "izsw8hgp",
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
    "id": "rqmj7nln",
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
    "id": "glz76rzh",
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
    "id": "o09mj0ml",
    "name": "d1t",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xr47xjxw",
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
  const collection = dao.findCollectionByNameOrId("0t5ray71eq50ajq")

  collection.options = {
    "query": "SELECT \n  transactions.id,\n  invoice,\n  invoices.type,\n  invoices.invoiceNo,\n  item,\n  (1.0*cost_price*qty)-((qty*cost_price)*transactions.discount_1/100) AS cost_price,\n  price,\n  qty,\n  scheme,\n  transactions.discount_1,\n  transactions.discount_2,\n  (qty*price)-((qty*price)*transactions.discount_1/100) AS d1t,\n  transactions.deleted,\n  transactions.created,\n  transactions.updated\n  FROM transactions\nJOIN invoices ON transactions.invoice = invoices.id"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bhjcacsj",
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
    "id": "5nr64c1s",
    "name": "type",
    "type": "select",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSelect": 1,
      "values": [
        "purchase",
        "sale"
      ]
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ejvqp6z2",
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
    "id": "6xe6krhx",
    "name": "item",
    "type": "relation",
    "required": false,
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
    "id": "8ivt7mof",
    "name": "cost_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "f8pvsmyo",
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
    "id": "qq6ets0x",
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
    "id": "qbkfewid",
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
    "id": "kpqq9v65",
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
    "id": "3bnery8q",
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
    "id": "mkke4cut",
    "name": "d1t",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "jdwriyln",
    "name": "deleted",
    "type": "bool",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("khe8zkgp")

  // remove
  collection.schema.removeField("j1s0rmfx")

  // remove
  collection.schema.removeField("jrf60xab")

  // remove
  collection.schema.removeField("wo08tssw")

  // remove
  collection.schema.removeField("kkfgmviq")

  // remove
  collection.schema.removeField("0hlircvl")

  // remove
  collection.schema.removeField("tnhugtve")

  // remove
  collection.schema.removeField("izsw8hgp")

  // remove
  collection.schema.removeField("rqmj7nln")

  // remove
  collection.schema.removeField("glz76rzh")

  // remove
  collection.schema.removeField("o09mj0ml")

  // remove
  collection.schema.removeField("xr47xjxw")

  return dao.saveCollection(collection)
})
