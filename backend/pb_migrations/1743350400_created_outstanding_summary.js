/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const dao = new Dao(db);

  const collection = new Collection();
  collection.name = "outstanding_summary";
  collection.type = "view";
  collection.system = false;
  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = null;
  collection.updateRule = null;
  collection.deleteRule = null;

  collection.options = {
    "query": `SELECT id, party, party_name, invoice_nos, booker, area, section, invoice_total, paid_total, return_total, balance FROM (
  SELECT
    pv.party AS id,
    pv.party,
    MAX(parties.name) AS party_name,
    GROUP_CONCAT(DISTINCT CAST(CAST(inv_outstanding.invoiceNo AS INTEGER) AS TEXT)) AS invoice_nos,
    MAX(pv.booker) AS booker,
    MAX(parties.area) AS area,
    MAX(areas.section) AS section,
    COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 0 THEN pv.amount ELSE 0 END), 0) AS invoice_total,
    COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 1 THEN pv.amount ELSE 0 END), 0) AS paid_total,
    COALESCE(SUM(CASE WHEN pv.type = 'return' AND parties.type = 'customer' THEN pv.amount ELSE 0 END), 0) AS return_total,
    COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 0 THEN pv.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv.type = 'recieving' AND pv.paid = 1 THEN pv.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv.type = 'return' AND parties.type = 'customer' THEN pv.amount ELSE 0 END), 0) AS balance
  FROM payments_view pv
  LEFT JOIN parties ON pv.party = parties.id
  LEFT JOIN areas ON parties.area = areas.id
  LEFT JOIN (
    SELECT pv2.party, pv2.invoice, pv2.invoiceNo
    FROM payments_view pv2
    WHERE pv2.type = 'recieving' AND pv2.invoice != ''
    GROUP BY pv2.party, pv2.invoice
    HAVING
      COALESCE(SUM(CASE WHEN pv2.paid = 0 THEN pv2.amount ELSE 0 END), 0)
      - COALESCE(SUM(CASE WHEN pv2.paid = 1 THEN pv2.amount ELSE 0 END), 0) > 0.1
  ) inv_outstanding ON inv_outstanding.party = pv.party
  WHERE pv.type IN ('recieving', 'return') AND pv.party != ''
  GROUP BY pv.party
) t WHERE ABS(t.balance) > 0.1`
  };

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os_party",
    "name": "party",
    "type": "relation",
    "required": false,
    "presentable": true,
    "unique": false,
    "options": {
      "collectionId": "qhdujcbptsh2v29",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }));

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os_party_name",
    "name": "party_name",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": { "min": null, "max": null, "pattern": "" }
  }));

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os_invoice_nos",
    "name": "invoice_nos",
    "type": "text",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": { "min": null, "max": null, "pattern": "" }
  }));

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os_booker",
    "name": "booker",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "3dz9ii2wo8d5q8g",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }));

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os_area",
    "name": "area",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "tdeikttss6upezc",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }));

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os_section",
    "name": "section",
    "type": "relation",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": {
      "collectionId": "nlwqqfyu1ur5lpo",
      "cascadeDelete": false,
      "minSelect": null,
      "maxSelect": 1,
      "displayFields": null
    }
  }));

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os_invoice_total",
    "name": "invoice_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": { "maxSize": 1 }
  }));

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os_paid_total",
    "name": "paid_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": { "maxSize": 1 }
  }));

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os_return_total",
    "name": "return_total",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": { "maxSize": 1 }
  }));

  collection.schema.addField(new SchemaField({
    "system": false,
    "id": "os_balance",
    "name": "balance",
    "type": "json",
    "required": false,
    "presentable": false,
    "unique": false,
    "options": { "maxSize": 1 }
  }));

  return dao.saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("outstanding_summary");
  return dao.deleteCollection(collection);
});
