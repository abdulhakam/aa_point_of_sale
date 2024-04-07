/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("g4oxt9ptisuyhnf")

  collection.options = {
    "query": "SELECT\n  id,\n  invoiceNo,\n  created,\n  description,\n  transaction_type,\n  account_type,\n  party_type,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE\n          OR account_type == 'return' THEN (\n            CASE\n              WHEN party_type == 'customer'\n              OR paid == TRUE THEN (\n                CASE WHEN account_type==NULL THEN 0 \n                  ELSE - amount\n                END\n              )\n              ELSE 0\n            END\n          )\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_recievable,\n  (\n    CASE\n      WHEN account_type == 'recieving'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE\n          OR account_type == 'return' THEN (\n            CASE\n              WHEN party_type == 'supplier'\n              OR paid == TRUE THEN (\n                CASE WHEN account_type==NULL THEN 0\n                  ELSE - amount\n                END\n              )\n              ELSE 0\n            END\n          )\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_payable,\n  (\n    CASE\n      WHEN paid IS TRUE THEN (\n        CASE\n          WHEN account_type == 'recieving' THEN amount\n          ELSE (\n                CASE WHEN account_type=='expense' THEN 0\n                  ELSE - amount \n                END \n                )\n        END\n      )\n      ELSE 0\n    END\n  ) AS cash,\n  (\n    CASE\n      WHEN stock_amount <> 0 THEN (\n        CASE\n          WHEN transaction_type == 'invoice' THEN (\n            CASE\n              WHEN account_type == 'recieving' THEN - stock_amount\n              ELSE stock_amount\n            END\n          )\n          ELSE 0\n        END\n      )\n      ELSE 0\n    END\n  ) AS stock\nFROM\n  (\n    SELECT\n      id,\n      invoiceNo,\n      created,\n      description,\n      transaction_type,\n      account_type,\n      party_type,\n      stock_amount,\n      amount,\n      paid\n    FROM\n      (\n        SELECT\n          id,\n          invoiceNo,\n          created,\n          description,\n          (\n            CASE\n              WHEN paid == TRUE THEN 'payment'\n              ELSE 'invoice'\n            END\n          ) AS transaction_type,\n          party_type,\n          type AS account_type,\n          --stock_price \n          0 AS stock_amount,\n          amount AS amount,\n          paid\n        FROM\n          payments_view\n        UNION ALL\n        SELECT\n          id,\n          'N/A' AS invoiceNo,\n          created,\n          description AS description,\n          'expense' AS transaction_type,\n          'cash' AS account_type,\n          NULL AS party_type,\n          0 AS stock_amount,\n          amount AS amount,\n          true AS paid\n        FROM\n          expenses\n      )\n  )"
  }

  // remove
  collection.schema.removeField("tcxjtegy")

  // remove
  collection.schema.removeField("quxlutye")

  // remove
  collection.schema.removeField("rgu63esz")

  // remove
  collection.schema.removeField("hyfqwqb7")

  // remove
  collection.schema.removeField("seyvsomy")

  // remove
  collection.schema.removeField("c7fk1vu1")

  // remove
  collection.schema.removeField("mhq1ifxb")

  // remove
  collection.schema.removeField("usri3esy")

  // remove
  collection.schema.removeField("xqanfk3i")

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

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("g4oxt9ptisuyhnf")

  collection.options = {
    "query": "SELECT\n  id,\n  invoiceNo,\n  created,\n  description,\n  transaction_type,\n  account_type,\n  party_type,\n  (\n    CASE\n      WHEN account_type == 'sending'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE\n          OR account_type == 'return' THEN (\n            CASE\n              WHEN party_type == 'customer'\n              OR paid == TRUE THEN (\n                CASE WHEN account_type=='expense' THEN 0 \n                  ELSE - amount\n                END\n              )\n              ELSE 0\n            END\n          )\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_recievable,\n  (\n    CASE\n      WHEN account_type == 'recieving'\n      OR account_type == 'cash' THEN 0\n      ELSE (\n        CASE\n          WHEN paid == TRUE\n          OR account_type == 'return' THEN (\n            CASE\n              WHEN party_type == 'supplier'\n              OR paid == TRUE THEN (\n                CASE WHEN account_type=='expense' THEN 0\n                  ELSE - amount\n                END\n              )\n              ELSE 0\n            END\n          )\n          ELSE amount\n        END\n      )\n    END\n  ) AS accounts_payable,\n  (\n    CASE\n      WHEN paid IS TRUE THEN (\n        CASE\n          WHEN account_type == 'recieving' THEN amount\n          ELSE (\n                CASE WHEN account_type=='expense' THEN 0\n                  ELSE - amount \n                END \n                )\n        END\n      )\n      ELSE 0\n    END\n  ) AS cash,\n  (\n    CASE\n      WHEN stock_amount <> 0 THEN (\n        CASE\n          WHEN transaction_type == 'invoice' THEN (\n            CASE\n              WHEN account_type == 'recieving' THEN - stock_amount\n              ELSE stock_amount\n            END\n          )\n          ELSE 0\n        END\n      )\n      ELSE 0\n    END\n  ) AS stock\nFROM\n  (\n    SELECT\n      id,\n      invoiceNo,\n      created,\n      description,\n      transaction_type,\n      account_type,\n      party_type,\n      stock_amount,\n      amount,\n      paid\n    FROM\n      (\n        SELECT\n          id,\n          invoiceNo,\n          created,\n          description,\n          (\n            CASE\n              WHEN paid == TRUE THEN 'payment'\n              ELSE 'invoice'\n            END\n          ) AS transaction_type,\n          party_type,\n          type AS account_type,\n          --stock_price \n          0 AS stock_amount,\n          amount AS amount,\n          paid\n        FROM\n          payments_view\n        UNION ALL\n        SELECT\n          id,\n          'N/A' AS invoiceNo,\n          created,\n          description AS description,\n          'expense' AS transaction_type,\n          'cash' AS account_type,\n          NULL AS party_type,\n          0 AS stock_amount,\n          amount AS amount,\n          true AS paid\n        FROM\n          expenses\n      )\n  )"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "tcxjtegy",
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
    "id": "quxlutye",
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
    "id": "rgu63esz",
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
    "id": "hyfqwqb7",
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
    "id": "seyvsomy",
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
    "id": "c7fk1vu1",
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
    "id": "mhq1ifxb",
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
    "id": "usri3esy",
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
    "id": "xqanfk3i",
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

  return dao.saveCollection(collection)
})
