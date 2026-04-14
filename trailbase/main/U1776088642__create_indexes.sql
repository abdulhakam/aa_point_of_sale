DROP INDEX IF EXISTS "__pb_users_auth__email_idx";
CREATE UNIQUE INDEX "__pb_users_auth__email_idx" ON "users" (
	"email"
) WHERE "email" != '';
DROP INDEX IF EXISTS "__pb_users_auth__tokenKey_idx";
CREATE UNIQUE INDEX "__pb_users_auth__tokenKey_idx" ON "users" (
	"tokenKey"
);
DROP INDEX IF EXISTS "__pb_users_auth__username_idx";
CREATE UNIQUE INDEX "__pb_users_auth__username_idx" ON "users" (
	"username"
);