import { readSession, writeSession, tokenSecondsLeft } from "./session.js";

/**
 * Attach the signed session, and refresh the TrailBase access token when it is
 * close to expiry. The refresh token is rotated into the new session cookie.
 */
export function sessionMiddleware({ tb, config, logger = console }) {
  return async (req, res, next) => {
    try {
      const session = readSession(req, config.sessionSecret);
      req.session = session;
      if (session?.auth) {
        if (tokenSecondsLeft(session.auth) < 60 && session.refresh) {
          try {
            const tokens = await tb.refresh(session.refresh);
            if (tokens?.auth_token) {
              const rotated = { ...session, auth: tokens.auth_token, refresh: tokens.refresh_token ?? session.refresh };
              writeSession(res, rotated, config.sessionSecret);
              req.session = rotated;
            }
          } catch (error) {
            logger.debug?.(`[auth] refresh failed: ${error.message}`);
          }
        }
        req.token = req.session.auth;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAuth(req, res, next) {
  if (!req.token) {
    const next = encodeURIComponent(req.originalUrl || "/dashboard");
    return res.redirect(`/login?next=${next}`);
  }
  next();
}

/** Where to land after login: only same-site absolute paths are honoured. */
export function safeNext(value) {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}
