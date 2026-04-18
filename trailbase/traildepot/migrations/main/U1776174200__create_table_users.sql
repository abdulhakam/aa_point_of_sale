CREATE TABLE "users" (
    'id' BLOB PRIMARY KEY REFERENCES '_user'('id') NOT NULL,
    'email' TEXT REFERENCES '_user'('email'),
    'name' TEXT NOT NULL DEFAULT '',
    'username' TEXT NOT NULL DEFAULT '',
    'created' INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
) STRICT;

CREATE TRIGGER update_users_updated AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated = strftime('%s', 'now') WHERE id = NEW.id;
END;