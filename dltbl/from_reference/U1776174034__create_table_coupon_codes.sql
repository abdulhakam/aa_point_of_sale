CREATE TABLE "coupon_codes" (
    'id' BLOB PRIMARY KEY CHECK (is_uuid_v7(id)) NOT NULL,
    'name' TEXT NOT NULL DEFAULT '',
    'couponName' TEXT NOT NULL DEFAULT '',
    'isEnabled' INTEGER NOT NULL DEFAULT 0,
    'pricingRule' BLOB REFERENCES 'pricing_rules'('id'),
    'minAmount' REAL NOT NULL DEFAULT 0,
    'maxAmount' REAL NOT NULL DEFAULT 0,
    'validFrom' TEXT NOT NULL DEFAULT '',
    'validTo' TEXT NOT NULL DEFAULT '',
    'maximumUse' INTEGER NOT NULL DEFAULT 0,
    'used' INTEGER NOT NULL DEFAULT 0,
    'created' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(created) IS NOT NULL),
    'updated' TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (datetime(updated) IS NOT NULL)
) STRICT;