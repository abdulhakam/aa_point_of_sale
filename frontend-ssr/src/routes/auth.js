import express from "express";
import { writeSession, clearSession, decodeJwt } from "../lib/session.js";
import { safeNext } from "../lib/auth.js";
import { page, qs, qsb, ah } from "../lib/http.js";

/**
 * Login/logout. The credential is TrailBase's own JWT: the browser posts
 * email+password here, we exchange them at `/api/auth/v1/login`, and the returned
 * tokens live in a signed, httpOnly session cookie from then on.
 */
export function authRoutes({ config, tb, render }) {
  const router = express.Router();
  const loginCtx = (extra) => ({ appName: config.appName, render, title: "Login", ...extra });

  router.get("/login", (req, res) => {
    if (req.token) return res.redirect(safeNext(qs(req.query.next)));
    res.send(
      page(loginCtx(), "auth/login.html", {
        next: qs(req.query.next),
        expired: qsb(req.query.expired),
        error: null,
        email: "",
      })
    );
  });

  router.post("/login", ah(async (req, res) => {
    const email = qs(req.body.email);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const next = safeNext(req.body.next);
    if (!email || !password) {
      return res
        .status(400)
        .send(page(loginCtx(), "auth/login.html", { next, expired: false, error: "Email and password are required.", email }));
    }
    try {
      const tokens = await tb.login(email, password);
      if (!tokens?.auth_token) throw new Error("TrailBase returned no auth token");
      const payload = decodeJwt(tokens.auth_token);
      writeSession(
        res,
        {
          auth: tokens.auth_token,
          refresh: tokens.refresh_token,
          email: payload?.email ?? email,
          name: payload?.username ?? payload?.email ?? email,
        },
        config.sessionSecret
      );
      res.redirect(next);
    } catch (error) {
      const badCredentials = error?.status === 401 || /invalid|credential|password/i.test(String(error?.body ?? ""));
      const message = badCredentials ? "Invalid email or password." : `Login failed: ${error.message}`;
      res
        .status(401)
        .send(page(loginCtx(), "auth/login.html", { next, expired: false, error: message, email }));
    }
  }));

  router.post("/logout", (req, res) => {
    clearSession(res);
    res.redirect("/login");
  });

  return router;
}
