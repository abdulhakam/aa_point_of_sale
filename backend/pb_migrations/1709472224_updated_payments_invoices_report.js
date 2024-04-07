/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "SELECT \n  id,\n        `created`,\n        `updated`,\n        `invoice`,\n        `original_invoices`,\n        `invoiceNo`,\n        `invoice_maker`,\n        `booker`,\n        `company`,\n        `party`,\n        `party_type`,\n        type,\n        amount,\n        paid,\n        `area`,\n        `section`,\n        description\n  FROM\n  (SELECT\n        id,\n        created,\n        updated,\n        invoice,\n        original_invoices,\n        invoiceNo,\n        invoice_maker,\n        booker,\n        company,\n        party,\n        party_type,\n        type,\n        SUM(net_amount) amount,\n        paid,\n        area,\n        section,\n        description\n    FROM\n        payments_by_company\nGROUP BY invoice,company)"
  }

  // remove
  collection.schema.removeField("ahvepand")

  // remove
  collection.schema.removeField("2bq2t58h")

  // remove
  collection.schema.removeField("9hoiqzpi")

  // remove
  collection.schema.removeField("30zels9a")

  // remove
  collection.schema.removeField("wmaz3eym")

  // remove
  collection.schema.removeField("h7ccr8rn")

  // remove
  collection.schema.removeField("xlixjvhn")

  // remove
  collection.schema.removeField("vhmv0tkw")

  // remove
  collection.schema.removeField("kiah1sv9")

  // remove
  collection.schema.removeField("e9f383ih")

  // remove
  collection.schema.removeField("cvn1kue6")

  // remove
  collection.schema.removeField("mf2bcdy7")

  // remove
  collection.schema.removeField("kyd9hlm7")

  // remove
  collection.schema.removeField("uf6xtk1o")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("ynlpdg9bmi6uoki")

  collection.options = {
    "query": "SELECT \n  id,\n        created,\n        updated,\n        invoice,\n        original_invoices,\n        invoiceNo,\n        invoice_maker,\n        booker,\n        company,\n        party,\n        party_type,\n        type,\n        amount,\n        paid,\n        area,\n        section,\n        description\n  FROM\n  (SELECT\n        id,\n        created,\n        updated,\n        invoice,\n        original_invoices,\n        invoiceNo,\n        invoice_maker,\n        booker,\n        company,\n        party,\n        party_type,\n        type,\n        SUM(net_amount) amount,\n        paid,\n        area,\n        section,\n        description\n    FROM\n        payments_by_company\nGROUP BY invoice,company)"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ahvepand",
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
    "id": "2bq2t58h",
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
    "id": "9hoiqzpi",
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
    "id": "30zels9a",
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
    "id": "wmaz3eym",
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
    "id": "h7ccr8rn",
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
    "id": "xlixjvhn",
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
    "id": "vhmv0tkw",
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
    "id": "kiah1sv9",
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
    "id": "e9f383ih",
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
    "id": "cvn1kue6",
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
    "id": "mf2bcdy7",
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
    "id": "kyd9hlm7",
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
    "id": "uf6xtk1o",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

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

  return dao.saveCollection(collection)
})
