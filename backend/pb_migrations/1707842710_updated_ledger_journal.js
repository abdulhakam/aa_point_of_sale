/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("g4oxt9ptisuyhnf")

  collection.options = {
    "query": "SELECT\n  id,\n  invoiceNo,\n  created,\n  description,\n  transaction_type,\n  account_type,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE OR account_type == 'return' THEN - amount\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_recievable,\n  (\n    CASE\n      WHEN account_type == 'sending'\n       THEN (\n        CASE\n          WHEN paid IS TRUE THEN - amount\n          ELSE amount\n        END\n      )\n      ELSE 0\n    END\n  ) AS accounts_payable,\n  (\n    CASE\n      WHEN paid IS TRUE THEN (\n        CASE\n          WHEN account_type == 'recieving' THEN amount\n          ELSE - amount\n        END\n      )\n      ELSE 0\n    END\n  ) AS cash,\n  (\n    CASE\n      WHEN stock_amount <> 0 THEN (\n        CASE\n          WHEN transaction_type == 'invoice' THEN (\n            CASE\n              WHEN account_type == 'recieving' THEN - stock_amount\n              ELSE stock_amount\n            END\n          )\n          ELSE 0\n        END\n      )\n      ELSE 0\n    END\n  ) AS stock\nFROM\n  (SELECT\n      id,\n      invoiceNo,\n      created,\n      description,\n      transaction_type,\n      account_type,\n      stock_amount,\n      amount,\n      paid\n    FROM\n      (\n        SELECT\n          id,\n          invoiceNo,\n          created,\n          description,\n          (\n            CASE\n              WHEN paid == TRUE THEN 'payment'\n              ELSE 'invoice'\n            END\n          ) AS transaction_type,\n          type AS account_type,\n          --stock_price \n  0 AS stock_amount,\n          amount AS amount,\n          paid\n        FROM\n          payments_view\n        UNION ALL\n        SELECT\n          id,\n          'N/A' AS invoiceNo,\n          created,\n          name AS description,\n          'expense' AS transaction_type,\n          'cash' AS account_type,\n          0 AS stock_amount,\n          amount AS amount,\n          true AS paid\n        FROM\n          expenses\n      ))"
  }

  // remove
  collection.schema.removeField("fpnbgyci")

  // remove
  collection.schema.removeField("pc67son3")

  // remove
  collection.schema.removeField("ovinig2q")

  // remove
  collection.schema.removeField("ih3j4doe")

  // remove
  collection.schema.removeField("jet8cvga")

  // remove
  collection.schema.removeField("5pusqrkd")

  // remove
  collection.schema.removeField("gmp3aasx")

  // remove
  collection.schema.removeField("kssvwbpc")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "alie84nk",
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
    "id": "bpnn84sf",
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
    "id": "etomvwki",
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
    "id": "b86hszfz",
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
    "id": "eq0z9mfm",
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
    "id": "mfoblr20",
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
    "id": "abvsrjqg",
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
    "id": "t2yolm0z",
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
    "query": "SELECT\n  id,\n  invoiceNo,\n  created,\n  description,\n  transaction_type,\n  account_type,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE OR account_type == 'return' THEN - amount\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_recievable,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      OR account_type == 'cash' THEN (\n        CASE\n          WHEN paid IS TRUE THEN - amount\n          ELSE amount\n        END\n      )\n      ELSE 0\n    END\n  ) AS accounts_payable,\n  (\n    CASE\n      WHEN paid IS TRUE THEN (\n        CASE\n          WHEN account_type == 'recieving' THEN amount\n          ELSE - amount\n        END\n      )\n      ELSE 0\n    END\n  ) AS cash,\n  (\n    CASE\n      WHEN stock_amount <> 0 THEN (\n        CASE\n          WHEN transaction_type == 'invoice' THEN (\n            CASE\n              WHEN account_type == 'recieving' THEN - stock_amount\n              ELSE stock_amount\n            END\n          )\n          ELSE 0\n        END\n      )\n      ELSE 0\n    END\n  ) AS stock\nFROM\n  (SELECT\n      id,\n      invoiceNo,\n      created,\n      description,\n      transaction_type,\n      account_type,\n      stock_amount,\n      amount,\n      paid\n    FROM\n      (\n        SELECT\n          id,\n          invoiceNo,\n          created,\n          description,\n          (\n            CASE\n              WHEN paid == TRUE THEN 'payment'\n              ELSE 'invoice'\n            END\n          ) AS transaction_type,\n          type AS account_type,\n          --stock_price \n  0 AS stock_amount,\n          amount AS amount,\n          paid\n        FROM\n          payments_view\n        UNION ALL\n        SELECT\n          id,\n          'N/A' AS invoiceNo,\n          created,\n          name AS description,\n          'expense' AS transaction_type,\n          'cash' AS account_type,\n          0 AS stock_amount,\n          amount AS amount,\n          true AS paid\n        FROM\n          expenses\n      ))"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fpnbgyci",
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
    "id": "pc67son3",
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
    "id": "ovinig2q",
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
    "id": "ih3j4doe",
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
    "id": "jet8cvga",
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
    "id": "5pusqrkd",
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
    "id": "gmp3aasx",
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
    "id": "kssvwbpc",
    "name": "stock",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("alie84nk")

  // remove
  collection.schema.removeField("bpnn84sf")

  // remove
  collection.schema.removeField("etomvwki")

  // remove
  collection.schema.removeField("b86hszfz")

  // remove
  collection.schema.removeField("eq0z9mfm")

  // remove
  collection.schema.removeField("mfoblr20")

  // remove
  collection.schema.removeField("abvsrjqg")

  // remove
  collection.schema.removeField("t2yolm0z")

  return dao.saveCollection(collection)
})
