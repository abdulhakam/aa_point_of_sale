/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("g4oxt9ptisuyhnf")

  collection.options = {
    "query": "SELECT\n  id,\n  invoiceNo,\n  created,\n  description,\n  transaction_type,\n  account_type,\n  party_type,\n  (\n    CASE\n      WHEN account_type == 'recieving'\n      THEN (CASE WHEN paid == TRUE THEN -amount ELSE amount END)\n      ELSE 0 END\n  ) AS accounts_recievable,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      THEN (CASE WHEN paid == TRUE THEN -amount ELSE amount END)\n      ELSE 0 END\n  ) AS accounts_payable,\n  (\n    CASE\n      WHEN paid IS TRUE THEN (\n        CASE\n          WHEN account_type == 'recieving' THEN amount\n          ELSE -amount\n        END\n      )\n      ELSE 0 END\n  ) AS cash,\n  0 AS stock\nFROM\n  (\n    SELECT\n      id,\n      invoiceNo,\n      created,\n      description,\n      transaction_type,\n      account_type,\n      party_type,\n      stock_amount,\n      amount,\n      paid\n    FROM\n      (\n        SELECT\n          id,\n          invoiceNo,\n          created,\n          description,\n          (\n            CASE\n              WHEN paid == TRUE THEN 'payment'\n              ELSE 'invoice'\n            END\n          ) AS transaction_type,\n          party_type,\n          type AS account_type,\n          --stock_price \n          0 AS stock_amount,\n          amount AS amount,\n          paid\n        FROM\n          payments_view\n        UNION ALL\n        SELECT\n          id,\n          'N/A' AS invoiceNo,\n          created,\n          description AS description,\n          'expense' AS transaction_type,\n          'cash' AS account_type,\n          NULL AS party_type,\n          0 AS stock_amount,\n          amount AS amount,\n          true AS paid\n        FROM\n          expenses\n      )\n  )"
  }

  // remove
  collection.schema.removeField("i9bv6gtz")

  // remove
  collection.schema.removeField("79h8saby")

  // remove
  collection.schema.removeField("2hrad9mz")

  // remove
  collection.schema.removeField("lflpolij")

  // remove
  collection.schema.removeField("oyaluimk")

  // remove
  collection.schema.removeField("3mkjzvmc")

  // remove
  collection.schema.removeField("qwxwfhoo")

  // remove
  collection.schema.removeField("2t1afy0f")

  // remove
  collection.schema.removeField("tyeokyjx")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "bwq8rhes",
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
    "id": "dmdigu6c",
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
    "id": "04xy7gcn",
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
    "id": "pcjlqzxp",
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
    "id": "aifepsqn",
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
    "id": "iojwa56b",
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
    "id": "x9db7qrt",
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
    "id": "9yfrnidh",
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
    "id": "rbsqq3ht",
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
    "query": "SELECT\n  id,\n  invoiceNo,\n  created,\n  description,\n  transaction_type,\n  account_type,\n  party_type,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE\n          OR account_type == 'return' THEN (\n            CASE\n              WHEN party_type == 'customer'\n              OR paid == TRUE THEN (\n                CASE WHEN account_type==NULL THEN 0 \n                  ELSE - amount\n                END\n              )\n              ELSE 0\n            END\n          )\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_recievable,\n  (\n    CASE\n      WHEN account_type == 'recieving'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE\n          OR account_type == 'return' THEN (\n            CASE\n              WHEN party_type == 'supplier'\n              OR paid == TRUE THEN (\n                CASE WHEN account_type==NULL THEN 0\n                  ELSE - amount\n                END\n              )\n              ELSE 0\n            END\n          )\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_payable,\n  (\n    CASE\n      WHEN paid IS TRUE THEN (\n        CASE\n          WHEN account_type == 'recieving' THEN amount\n          ELSE (\n                CASE WHEN account_type=='expense' THEN 0\n                  ELSE - amount \n                END \n                )\n        END\n      )\n      ELSE 0\n    END\n  ) AS cash,\n  (\n    CASE\n      WHEN stock_amount <> 0 THEN (\n        CASE\n          WHEN transaction_type == 'invoice' THEN (\n            CASE\n              WHEN account_type == 'recieving' THEN - stock_amount\n              ELSE stock_amount\n            END\n          )\n          ELSE 0\n        END\n      )\n      ELSE 0\n    END\n  ) AS stock\nFROM\n  (\n    SELECT\n      id,\n      invoiceNo,\n      created,\n      description,\n      transaction_type,\n      account_type,\n      party_type,\n      stock_amount,\n      amount,\n      paid\n    FROM\n      (\n        SELECT\n          id,\n          invoiceNo,\n          created,\n          description,\n          (\n            CASE\n              WHEN paid == TRUE THEN 'payment'\n              ELSE 'invoice'\n            END\n          ) AS transaction_type,\n          party_type,\n          type AS account_type,\n          --stock_price \n          0 AS stock_amount,\n          amount AS amount,\n          paid\n        FROM\n          payments_view\n        UNION ALL\n        SELECT\n          id,\n          'N/A' AS invoiceNo,\n          created,\n          description AS description,\n          'expense' AS transaction_type,\n          'cash' AS account_type,\n          NULL AS party_type,\n          0 AS stock_amount,\n          amount AS amount,\n          true AS paid\n        FROM\n          expenses\n      )\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "i9bv6gtz",
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
    "id": "79h8saby",
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
    "id": "2hrad9mz",
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
    "id": "lflpolij",
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
    "id": "oyaluimk",
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
    "id": "3mkjzvmc",
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
    "id": "qwxwfhoo",
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
    "id": "2t1afy0f",
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
    "id": "tyeokyjx",
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
  collection.schema.removeField("bwq8rhes")

  // remove
  collection.schema.removeField("dmdigu6c")

  // remove
  collection.schema.removeField("04xy7gcn")

  // remove
  collection.schema.removeField("pcjlqzxp")

  // remove
  collection.schema.removeField("aifepsqn")

  // remove
  collection.schema.removeField("iojwa56b")

  // remove
  collection.schema.removeField("x9db7qrt")

  // remove
  collection.schema.removeField("9yfrnidh")

  // remove
  collection.schema.removeField("rbsqq3ht")

  return dao.saveCollection(collection)
})
