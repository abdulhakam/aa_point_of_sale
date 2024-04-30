/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("g4oxt9ptisuyhnf")

  collection.options = {
    "query": "SELECT\n  id,\n  invoiceNo,\n  created,\n  description,\n  transaction_type,\n  account_type,\n  party_type,\n  (\n    CASE\n      WHEN account_type == 'recieving'\n      THEN (CASE WHEN paid == TRUE THEN -amount ELSE amount END)\n      WHEN account_type == 'return'\n      THEN (CASE WHEN party_type == 'customer' THEN -amount ELSE 0 END)\n      ELSE 0 END\n  ) AS accounts_recievable,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      THEN (CASE WHEN paid == TRUE THEN -amount ELSE amount END)\n      WHEN account_type == 'return'\n      THEN (CASE WHEN party_type == 'supplier' THEN -amount ELSE 0 END)\n      ELSE 0 END\n  ) AS accounts_payable,\n  (\n    CASE\n      WHEN paid IS TRUE THEN (\n        CASE\n          WHEN account_type == 'recieving' THEN amount\n          ELSE -amount\n        END\n      )\n      ELSE 0 END\n  ) AS cash,\n  0 AS stock\nFROM\n  (\n    SELECT\n      id,\n      invoiceNo,\n      created,\n      description,\n      transaction_type,\n      account_type,\n      party_type,\n      stock_amount,\n      amount,\n      paid\n    FROM\n      (\n        SELECT\n          id,\n          invoiceNo,\n          payment_date as created,\n          description,\n          (\n            CASE\n              WHEN paid == TRUE THEN 'payment'\n              ELSE 'invoice'\n            END\n          ) AS transaction_type,\n          party_type,\n          type AS account_type,\n          --stock_price \n          0 AS stock_amount,\n          amount AS amount,\n          paid\n        FROM\n          payments_view\n        UNION ALL\n        SELECT\n          id,\n          'N/A' AS invoiceNo,\n          created,\n          description AS description,\n          'expense' AS transaction_type,\n          'cash' AS account_type,\n          NULL AS party_type,\n          0 AS stock_amount,\n          amount AS amount,\n          true AS paid\n        FROM\n          expenses\n      )\n  )"
  }

  // remove
  collection.schema.removeField("4xhnzxnw")

  // remove
  collection.schema.removeField("stblokxf")

  // remove
  collection.schema.removeField("xxfjmlct")

  // remove
  collection.schema.removeField("2rbxfyvq")

  // remove
  collection.schema.removeField("ygelzxnl")

  // remove
  collection.schema.removeField("gkwk8m3n")

  // remove
  collection.schema.removeField("99anerk7")

  // remove
  collection.schema.removeField("uolqtnlo")

  // remove
  collection.schema.removeField("wkptf9zg")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pdn1pkt5",
    "name": "invoiceNo",
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
    "id": "ds3rqffs",
    "name": "description",
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
    "id": "rwvgg2a5",
    "name": "transaction_type",
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
    "id": "nbbhecfr",
    "name": "account_type",
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
    "id": "fba7wb42",
    "name": "party_type",
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
    "id": "eeuual3x",
    "name": "accounts_recievable",
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
    "id": "duytwojn",
    "name": "accounts_payable",
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
    "id": "jiemfro1",
    "name": "cash",
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
    "id": "l17jk3uk",
    "name": "stock",
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
  const collection = dao.findCollectionByNameOrId("g4oxt9ptisuyhnf")

  collection.options = {
    "query": "SELECT\n  id,\n  invoiceNo,\n  created,\n  description,\n  transaction_type,\n  account_type,\n  party_type,\n  (\n    CASE\n      WHEN account_type == 'recieving'\n      THEN (CASE WHEN paid == TRUE THEN -amount ELSE amount END)\n      ELSE 0 END\n  ) AS accounts_recievable,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      THEN (CASE WHEN paid == TRUE THEN -amount ELSE amount END)\n      ELSE 0 END\n  ) AS accounts_payable,\n  (\n    CASE\n      WHEN paid IS TRUE THEN (\n        CASE\n          WHEN account_type == 'recieving' THEN amount\n          ELSE -amount\n        END\n      )\n      ELSE 0 END\n  ) AS cash,\n  0 AS stock\nFROM\n  (\n    SELECT\n      id,\n      invoiceNo,\n      created,\n      description,\n      transaction_type,\n      account_type,\n      party_type,\n      stock_amount,\n      amount,\n      paid\n    FROM\n      (\n        SELECT\n          id,\n          invoiceNo,\n          payment_date as created,\n          description,\n          (\n            CASE\n              WHEN paid == TRUE THEN 'payment'\n              ELSE 'invoice'\n            END\n          ) AS transaction_type,\n          party_type,\n          type AS account_type,\n          --stock_price \n          0 AS stock_amount,\n          amount AS amount,\n          paid\n        FROM\n          payments_view\n        UNION ALL\n        SELECT\n          id,\n          'N/A' AS invoiceNo,\n          created,\n          description AS description,\n          'expense' AS transaction_type,\n          'cash' AS account_type,\n          NULL AS party_type,\n          0 AS stock_amount,\n          amount AS amount,\n          true AS paid\n        FROM\n          expenses\n      )\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "4xhnzxnw",
    "name": "invoiceNo",
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
    "id": "stblokxf",
    "name": "description",
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
    "id": "xxfjmlct",
    "name": "transaction_type",
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
    "id": "2rbxfyvq",
    "name": "account_type",
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
    "id": "ygelzxnl",
    "name": "party_type",
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
    "id": "gkwk8m3n",
    "name": "accounts_recievable",
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
    "id": "99anerk7",
    "name": "accounts_payable",
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
    "id": "uolqtnlo",
    "name": "cash",
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
    "id": "wkptf9zg",
    "name": "stock",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "maxSize": 1
    }
  }))

  // remove
  collection.schema.removeField("pdn1pkt5")

  // remove
  collection.schema.removeField("ds3rqffs")

  // remove
  collection.schema.removeField("rwvgg2a5")

  // remove
  collection.schema.removeField("nbbhecfr")

  // remove
  collection.schema.removeField("fba7wb42")

  // remove
  collection.schema.removeField("eeuual3x")

  // remove
  collection.schema.removeField("duytwojn")

  // remove
  collection.schema.removeField("jiemfro1")

  // remove
  collection.schema.removeField("l17jk3uk")

  return dao.saveCollection(collection)
})
