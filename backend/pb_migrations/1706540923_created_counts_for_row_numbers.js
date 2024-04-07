/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "7m69mlejf9bwr69",
    "created": "2024-01-29 15:08:43.385Z",
    "updated": "2024-01-29 15:08:43.385Z",
    "name": "counts_for_row_numbers",
    "type": "view",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "m16bt0hj",
        "name": "areas",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "qvffpvbi",
        "name": "sections",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "uvitlwmj",
        "name": "categories",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "9vbcaybi",
        "name": "purchase_invoices",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "mn3r1mbg",
        "name": "sale_invoices",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "fiukz4lj",
        "name": "items",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "hiqr5vn4",
        "name": "order_bookers",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "ukhlgyaq",
        "name": "parties",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "qae3bonf",
        "name": "recieving_payments",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "system": false,
        "id": "wjuurfck",
        "name": "sending_payments",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {
      "query": "SELECT cast(`id` as text) `id`,`areas`,`sections`,`categories`,`purchase_invoices`,`sale_invoices`,`items`,`order_bookers`,`parties`,`recieving_payments`,`sending_payments` FROM (SELECT (ROW_NUMBER() OVER()) as id,\n(SELECT COUNT (id) FROM areas) as areas,\n(SELECT COUNT (id) FROM sections) as sections,\n(SELECT COUNT (id) FROM categories) as categories,\n(SELECT COUNT (id) FROM invoices WHERE type='purchase') as purchase_invoices,\n(SELECT COUNT (id) FROM invoices WHERE type='sale') as sale_invoices,\n(SELECT COUNT (id) FROM items) as items,\n(SELECT COUNT (id) FROM order_bookers) as order_bookers,\n(SELECT COUNT (id) FROM parties) as parties,\n(SELECT COUNT (id) FROM payments WHERE type = 'recieving') as recieving_payments,\n(SELECT COUNT (id) FROM payments WHERE type = 'sending') as sending_payments)"
    }
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("7m69mlejf9bwr69");

  return dao.deleteCollection(collection);
})
