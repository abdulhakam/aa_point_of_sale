CREATE TABLE "erpnext_sync_settings" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'deviceID' TEXT NOT NULL DEFAULT '',
    'baseURL' TEXT NOT NULL DEFAULT '',
    'authToken' TEXT NOT NULL DEFAULT '',
    'initialSyncData' INTEGER NOT NULL DEFAULT 0,
    'integrationAppVersion' TEXT NOT NULL DEFAULT '',
    'isEnabled' INTEGER NOT NULL DEFAULT 0,
    'dataSyncInterval' TEXT NOT NULL DEFAULT '',
    'registerInstance' TEXT NOT NULL DEFAULT '',
    'syncSettings' TEXT NOT NULL DEFAULT '',
    'syncDataToERPNext' TEXT NOT NULL DEFAULT '',
    'fetchFromERPNextQueue' TEXT NOT NULL DEFAULT '',
    'clearSyncedDocsFromErpNextSyncQueue' TEXT NOT NULL DEFAULT '',
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;