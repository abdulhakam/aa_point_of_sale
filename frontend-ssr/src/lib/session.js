import crypto from "node:crypto";

/**
 * Stateless signed-cookie session. The cookie carries the TrailBase JWT
 * (`auth_token`) plus the opaque `refresh_token`, HMAC-SHA256 signed so the
 * browser cannot forge or tamper with them.
 */

const COOKIE = "tbpos.sid";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const b64 = (buf) => Buffer.from(buf).toString("base64url");
const sign = (payload, secret) => crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export function readSession(req, secret) {
  const raw = req.cookies?.[COOKIE];
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(payload, secret);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function writeSession(res, data, secret) {
  const payload = b64(JSON.stringify(data));
  const value = `${payload}.${sign(payload, secret)}`;
  res.cookie(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_MS,
    secure: process.env.COOKIE_SECURE === "true",
  });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { path: "/" });
}

/** Decode a JWT payload without verifying (the signature is TrailBase's concern). */
export function decodeJwt(token) {
  try {
    const part = token.split(".")[1];
    return JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/** Seconds until expiry; 0 when unknown/expired. */
export function tokenSecondsLeft(token) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return 0;
  return payload.exp - Math.floor(Date.now() / 1000);
}
