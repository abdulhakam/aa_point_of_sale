/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("g4oxt9ptisuyhnf")

  collection.options = {
    "query": "SELECT\n  id,\n  invoiceNo,\n  created,\n  description,\n  transaction_type,\n  account_type,\n  party_type,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE\n          OR account_type == 'return' THEN (\n            CASE\n              WHEN party_type == 'customer'\n              OR paid == TRUE THEN - amount\n              ELSE 0\n            END\n          )\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_recievable,\n  (\n    CASE\n      WHEN account_type == 'recieving'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE\n          OR account_type == 'return' THEN (\n            CASE\n              WHEN party_type == 'supplier'\n              OR paid == TRUE THEN - amount\n              ELSE 0\n            END\n          )\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_payable,\n  (\n    CASE\n      WHEN paid IS TRUE THEN (\n        CASE\n          WHEN account_type == 'recieving' THEN amount\n          ELSE - amount\n        END\n      )\n      ELSE 0\n    END\n  ) AS cash,\n  (\n    CASE\n      WHEN stock_amount <> 0 THEN (\n        CASE\n          WHEN transaction_type == 'invoice' THEN (\n            CASE\n              WHEN account_type == 'recieving' THEN - stock_amount\n              ELSE stock_amount\n            END\n          )\n          ELSE 0\n        END\n      )\n      ELSE 0\n    END\n  ) AS stock\nFROM\n  (\n    SELECT\n      id,\n      invoiceNo,\n      created,\n      description,\n      transaction_type,\n      account_type,\n      party_type,\n      stock_amount,\n      amount,\n      paid\n    FROM\n      (\n        SELECT\n          id,\n          invoiceNo,\n          created,\n          description,\n          (\n            CASE\n              WHEN paid == TRUE THEN 'payment'\n              ELSE 'invoice'\n            END\n          ) AS transaction_type,\n          party_type,\n          type AS account_type,\n          --stock_price \n          0 AS stock_amount,\n          amount AS amount,\n          paid\n        FROM\n          payments_view\n        UNION ALL\n        SELECT\n          id,\n          'N/A' AS invoiceNo,\n          created,\n          name AS description,\n          'expense' AS transaction_type,\n          'cash' AS account_type,\n          NULL AS party_type,\n          0 AS stock_amount,\n          amount AS amount,\n          true AS paid\n        FROM\n          expenses\n      )\n  )"
  }

  // remove
  collection.schema.removeField("fergjiyt")

  // remove
  collection.schema.removeField("w6ai7blg")

  // remove
  collection.schema.removeField("vzdr8xuc")

  // remove
  collection.schema.removeField("afeivmju")

  // remove
  collection.schema.removeField("pi7cyfxd")

  // remove
  collection.schema.removeField("6zshutta")

  // remove
  collection.schema.removeField("hkiakndu")

  // remove
  collection.schema.removeField("ruqy8kj3")

  // remove
  collection.schema.removeField("pmry6wza")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "gjfp3uay",
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
    "id": "u9n5dppo",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "rcgr162u",
    "name": "transaction_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ebkhzn2v",
    "name": "account_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "nqejfvee",
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
    "id": "u2geebsg",
    "name": "accounts_recievable",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "r8usx6dq",
    "name": "accounts_payable",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tyrccprb",
    "name": "cash",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "mkxkeer4",
    "name": "stock",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("g4oxt9ptisuyhnf")

  collection.options = {
    "query": "SELECT\n  id,\n  invoiceNo,\n  created,\n  description,\n  transaction_type,\n  account_type,\n  party_type,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE OR account_type == 'return' THEN (CASE WHEN party_type == 'customer' OR paid == TRUE THEN - amount ELSE 0 END)\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_recievable,\n  (\n    CASE\n      WHEN account_type == 'sending'\n       THEN (\n        CASE\n          WHEN paid IS TRUE THEN - amount\n          ELSE amount\n        END\n      )\n      ELSE 0\n    END\n  ) AS accounts_payable,\n  (\n    CASE\n      WHEN paid IS TRUE THEN (\n        CASE\n          WHEN account_type == 'recieving' THEN amount\n          ELSE - amount\n        END\n      )\n      ELSE 0\n    END\n  ) AS cash,\n  (\n    CASE\n      WHEN stock_amount <> 0 THEN (\n        CASE\n          WHEN transaction_type == 'invoice' THEN (\n            CASE\n              WHEN account_type == 'recieving' THEN - stock_amount\n              ELSE stock_amount\n            END\n          )\n          ELSE 0\n        END\n      )\n      ELSE 0\n    END\n  ) AS stock\nFROM\n  (SELECT\n      id,\n      invoiceNo,\n      created,\n      description,\n      transaction_type,\n      account_type,\n  party_type,\n      stock_amount,\n      amount,\n      paid\n    FROM\n      (\n        SELECT\n          id,\n          invoiceNo,\n          created,\n          description,\n          (\n            CASE\n              WHEN paid == TRUE THEN 'payment'\n              ELSE 'invoice'\n            END\n          ) AS transaction_type,\n  party_type,\n          type AS account_type,\n          --stock_price \n  0 AS stock_amount,\n          amount AS amount,\n          paid\n        FROM\n          payments_view\n        UNION ALL\n        SELECT\n          id,\n          'N/A' AS invoiceNo,\n          created,\n          name AS description,\n          'expense' AS transaction_type,\n          'cash' AS account_type,\n  NULL AS party_type,\n          0 AS stock_amount,\n          amount AS amount,\n          true AS paid\n        FROM\n          expenses\n      ))"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fergjiyt",
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
    "id": "w6ai7blg",
    "name": "description",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "vzdr8xuc",
    "name": "transaction_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "afeivmju",
    "name": "account_type",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pi7cyfxd",
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
    "id": "6zshutta",
    "name": "accounts_recievable",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "hkiakndu",
    "name": "accounts_payable",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ruqy8kj3",
    "name": "cash",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "pmry6wza",
    "name": "stock",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("gjfp3uay")

  // remove
  collection.schema.removeField("u9n5dppo")

  // remove
  collection.schema.removeField("rcgr162u")

  // remove
  collection.schema.removeField("ebkhzn2v")

  // remove
  collection.schema.removeField("nqejfvee")

  // remove
  collection.schema.removeField("u2geebsg")

  // remove
  collection.schema.removeField("r8usx6dq")

  // remove
  collection.schema.removeField("tyrccprb")

  // remove
  collection.schema.removeField("mkxkeer4")

  return dao.saveCollection(collection)
})
