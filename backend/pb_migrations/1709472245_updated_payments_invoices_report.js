/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "SELECT \n  id,\n        `created`,\n        `updated`,\n        `invoice`,\n        `original_invoices`,\n        `invoiceNo`,\n        `invoice_maker`,\n        `booker`,\n        `company`,\n        `party`,\n        `party_type`,\n        `type`,\n        `amount`,\n        `paid`,\n        `area`,\n        `section`,\n        `description`\n  FROM\n  (SELECT\n        id,\n        created,\n        updated,\n        invoice,\n        original_invoices,\n        invoiceNo,\n        invoice_maker,\n        booker,\n        company,\n        party,\n        party_type,\n        type,\n        SUM(net_amount) amount,\n        paid,\n        area,\n        section,\n        description\n    FROM\n        payments_by_company\nGROUP BY invoice,company)"
  }

  // remove
  collection.schema.removeField("limueo5l")

  // remove
  collection.schema.removeField("fqgij1rn")

  // remove
  collection.schema.removeField("8pxgbt0t")

  // remove
  collection.schema.removeField("fxptdmdd")

  // remove
  collection.schema.removeField("gw4w3t8u")

  // remove
  collection.schema.removeField("yanwaxc0")

  // remove
  collection.schema.removeField("dzzgipvw")

  // remove
  collection.schema.removeField("4jkth3ix")

  // remove
  collection.schema.removeField("gdkpkzat")

  // remove
  collection.schema.removeField("rfth2vh9")

  // remove
  collection.schema.removeField("h6vaac0w")

  // remove
  collection.schema.removeField("u8w8ez1o")

  // remove
  collection.schema.removeField("p6siuiey")

  // remove
  collection.schema.removeField("z61y88uq")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "wfkzfd7y",
    "name": "invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "kbtvfuxf",
    "name": "original_invoices",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4h6kjudp",
    "name": "invoiceNo",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "0szw3lrt",
    "name": "invoice_maker",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vgjiao1m",
    "name": "booker",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yiiydjnh",
    "name": "company",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gx7qlp6z",
    "name": "party",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "cvsrgfjc",
    "name": "party_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "qa0u36gd",
    "name": "type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "xcamgtfh",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "arg2ibxj",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "atlkhufp",
    "name": "area",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "by3mohvo",
    "name": "section",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4tqhzegi",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "SELECT \n  id,\n        `created`,\n        `updated`,\n        `invoice`,\n        `original_invoices`,\n        `invoiceNo`,\n        `invoice_maker`,\n        `booker`,\n        `company`,\n        `party`,\n        `party_type`,\n        type,\n        amount,\n        paid,\n        `area`,\n        `section`,\n        description\n  FROM\n  (SELECT\n        id,\n        created,\n        updated,\n        invoice,\n        original_invoices,\n        invoiceNo,\n        invoice_maker,\n        booker,\n        company,\n        party,\n        party_type,\n        type,\n        SUM(net_amount) amount,\n        paid,\n        area,\n        section,\n        description\n    FROM\n        payments_by_company\nGROUP BY invoice,company)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "limueo5l",
    "name": "invoice",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fqgij1rn",
    "name": "original_invoices",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "8pxgbt0t",
    "name": "invoiceNo",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fxptdmdd",
    "name": "invoice_maker",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gw4w3t8u",
    "name": "booker",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "yanwaxc0",
    "name": "company",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "dzzgipvw",
    "name": "party",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4jkth3ix",
    "name": "party_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gdkpkzat",
    "name": "type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rfth2vh9",
    "name": "amount",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "h6vaac0w",
    "name": "paid",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "u8w8ez1o",
    "name": "area",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "p6siuiey",
    "name": "section",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "z61y88uq",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("wfkzfd7y")

  // remove
  collection.schema.removeField("kbtvfuxf")

  // remove
  collection.schema.removeField("4h6kjudp")

  // remove
  collection.schema.removeField("0szw3lrt")

  // remove
  collection.schema.removeField("vgjiao1m")

  // remove
  collection.schema.removeField("yiiydjnh")

  // remove
  collection.schema.removeField("gx7qlp6z")

  // remove
  collection.schema.removeField("cvsrgfjc")

  // remove
  collection.schema.removeField("qa0u36gd")

  // remove
  collection.schema.removeField("xcamgtfh")

  // remove
  collection.schema.removeField("arg2ibxj")

  // remove
  collection.schema.removeField("atlkhufp")

  // remove
  collection.schema.removeField("by3mohvo")

  // remove
  collection.schema.removeField("4tqhzegi")

  return dao.saveCollection(collection)
})
