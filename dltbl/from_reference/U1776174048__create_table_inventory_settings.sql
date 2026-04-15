CREATE TABLE "inventory_settings" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'defaultLocation' BLOB REFERENCES 'locations'('id'),
    'stockInHand' BLOB REFERENCES 'accounts'('id'),
    'stockReceivedButNotBilled' BLOB REFERENCES 'accounts'('id'),
    'costOfGoodsSold' BLOB REFERENCES 'accounts'('id'),
    'enableBarcodes' INTEGER NOT NULL DEFAULT 0,
    'enableBatches' INTEGER NOT NULL DEFAULT 0,
    'enableSerialNumber' INTEGER NOT NULL DEFAULT 0,
    'enableUomConversions' INTEGER NOT NULL DEFAULT 0,
    'enablePointOfSale' INTEGER NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;