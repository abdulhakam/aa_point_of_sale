/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n  items.id,\n  items.name,\n  items.created,\n  items.sale_price,\n  items.box_size_qty,\n  items.category,\n  --items.qty,\n  COALESCE(\n    (\n      transaction_view.price\n      *(1-(transaction_view.discount_1/100.0))\n      *(1-(transaction_view.discount_2/100.0))\n      *(1-(invoice_view.discount_1/100.0))\n      *(1-(invoice_view.discount_2/100.0))\n    )/(transaction_view.qty+transaction_view.scheme), \n    0\n  ) AS net_price\nFROM \n  items\nLEFT JOIN \n  transaction_view ON transaction_view.item = items.id AND transaction_view.type='purchase'\nLEFT JOIN \n  invoice_view ON invoice_view.id = transaction_view.invoice\nGROUP BY \n  items.id"
  }

  // remove
  collection.schema.removeField("1d4dtcpn")

  // remove
  collection.schema.removeField("fxrhq1im")

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "ymgpdqbg",
    "name": "name",
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
    "id": "dys4ilvm",
    "name": "sale_price",
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
    "id": "qp8h3ya4",
    "name": "box_size_qty",
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
    "id": "zvisfwpl",
    "name": "category",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "106aq516rbyoq0q",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os57yo93",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  return dao.saveCollection(collection)
}, (db) => {
  const dao = new Dao(db)
  const collection = dao.findCollectionByNameOrId("cv8cjsz3y8cvkex")

  collection.options = {
    "query": "SELECT \n    t.item AS id,\n    (t.price * (1- t.discount_1 / 100) * (1- t.discount_2 / 100) * (1- i.discount_1 / 100) * (1- i.discount_2 / 100))/(t.qty) AS net_price,\n    SUM(CASE WHEN i.type = 'purchase' THEN t.qty ELSE -t.qty END) AS qty\nFROM \n    transactions t\nJOIN \n    invoices i ON t.invoice = i.id\nWHERE \n    i.id IN (SELECT id FROM invoices WHERE type = 'purchase' ORDER BY created DESC LIMIT 1)\nGROUP BY \n    t.item;"
  }

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "1d4dtcpn",
    "name": "net_price",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // add
  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "fxrhq1im",
    "name": "qty",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {}
  }))

  // remove
  collection.schema.removeField("ymgpdqbg")

  // remove
  collection.schema.removeField("dys4ilvm")

  // remove
  collection.schema.removeField("qp8h3ya4")

  // remove
  collection.schema.removeField("zvisfwpl")

  // remove
  collection.schema.removeField("os57yo93")

  return dao.saveCollection(collection)
})
