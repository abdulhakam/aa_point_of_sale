CREATE TABLE "users" (
    'id' BLOB PRIMARY KEY REFERENCES '_user'('id') NOT NULL,
    'email' TEXT REFERENCES '_user'('email'),
    'name' TEXT NOT NULL DEFAULT '',
    'username' TEXT UNIQUE NOT NULL DEFAULT '',
    'created' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ')),
    'updated' INTEGER NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%fZ'))
) STRICT;

CREATE TRIGGER update_users_updated AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated = strftime('%Y-%m-%d %H:%M:%fZ') WHERE id = NEW.id;
END;