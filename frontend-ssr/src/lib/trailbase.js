import { relId } from "./uuid.js";

/**
 * Minimal TrailBase client. TrailBase is used for CRUD + auth only; every other
 * concern (report arithmetic, reference resolution) lives in this app.
 *
 * Verified against `trail v0.33.22`:
 *  - `POST /api/auth/v1/login`  {email,password} -> {auth_token, refresh_token, csrf_token}
 *  - `Authorization: Bearer <auth_token>` works for reads and writes (no CSRF header).
 *  - List: `{records, cursor}` (+ `total_count` with `?count=true`); paging via `cursor`.
 *  - Filter: `?filter[col][$eq]=…` (`$ne $gt $gte $lt $lte $is $like $re $in` unsupported).
 *  - Relation columns read as `{id}` / `null`; writes take canonical UUID text.
 *  - Unauthenticated requests are answered `403`.
 */

export class TrailBaseError extends Error {
  constructor(status, body, path) {
    super(`TrailBase ${status} on ${path}: ${typeof body === "string" ? body : JSON.stringify(body)}`);
    this.name = "TrailBaseError";
    this.status = status;
    this.body = body;
    this.path = path;
  }
}

const MAX_LIMIT = 1024;

export function createTrailBase(baseUrl) {
  const request = async (method, path, { token, body, query, text = false } = {}) => {
    const url = new URL(baseUrl + path);
    for (const [k, v] of Object.entries(query || {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.append(k, String(v));
    }
    const headers = {};
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";
    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = await res.text();
    if (!res.ok) throw new TrailBaseError(res.status, raw, path);
    if (text) return raw;
    return raw ? JSON.parse(raw) : null;
  };

  /** Turn `{col: op-or-value, ...}` into `filter[col][$op]=value` query entries. */
  const buildFilter = (filter) => {
    const out = {};
    if (!filter) return out;
    for (const [col, spec] of Object.entries(filter)) {
      if (spec === undefined || spec === null || spec === "") continue;
      if (typeof spec === "object" && !Array.isArray(spec)) {
        for (const [op, val] of Object.entries(spec)) {
          if (val === undefined || val === null || val === "") continue;
          out[`filter[${col}][$${op.replace(/^\$/, "")}]`] = val;
        }
      } else {
        out[`filter[${col}][$eq]`] = spec;
      }
    }
    return out;
  };

  return {
    TrailBaseError,

    async login(email, password) {
      return request("POST", "/api/auth/v1/login", { body: { email, password } });
    },

    async refresh(refreshToken) {
      return request("POST", "/api/auth/v1/refresh", { body: { refresh_token: refreshToken } });
    },

    /**
     * One page of a record API.
     * @returns {Promise<{records: any[], cursor?: string, totalCount?: number}>}
     */
    async listPage(api, { token, limit = MAX_LIMIT, cursor, order, filter, expand, count } = {}) {
      const res = await request("GET", `/api/records/v1/${api}`, {
        token,
        query: {
          limit,
          cursor,
          order,
          expand,
          count: count ? "true" : undefined,
          ...buildFilter(filter),
        },
      });
      return {
        records: res?.records ?? [],
        cursor: res?.cursor,
        totalCount: res?.total_count,
      };
    },

    /**
     * Every row of a record API, paged with the response cursor.
     * @returns {Promise<any[]>}
     */
    async listAll(api, { token, order, filter, expand, max = 200000 } = {}) {
      const rows = [];
      let cursor;
      for (let guard = 0; guard < 1000; guard++) {
        const page = await this.listPage(api, { token, limit: MAX_LIMIT, cursor, order, filter, expand });
        rows.push(...page.records);
        if (rows.length >= max) break;
        if (page.records.length < MAX_LIMIT || !page.cursor || page.cursor === cursor) break;
        cursor = page.cursor;
      }
      return rows;
    },

    async count(api, { token, filter } = {}) {
      const page = await this.listPage(api, { token, limit: 1, filter, count: true });
      return page.totalCount ?? page.records.length;
    },

    async getOne(api, id, { token, expand } = {}) {
      return request("GET", `/api/records/v1/${api}/${encodeURIComponent(id)}`, { token, query: { expand } });
    },

    /** @returns {Promise<string>} the new record id (base64 form). */
    async create(api, body, token) {
      const res = await request("POST", `/api/records/v1/${api}`, { token, body });
      return Array.isArray(res?.ids) ? res.ids[0] : undefined;
    },

    async update(api, id, body, token) {
      return request("PATCH", `/api/records/v1/${api}/${encodeURIComponent(id)}`, { token, body });
    },

    async remove(api, id, token) {
      return request("DELETE", `/api/records/v1/${api}/${encodeURIComponent(id)}`, { token });
    },

    async schema(api, token) {
      return request("GET", `/api/records/v1/${api}/schema`, { token });
    },
  };
}

export { relId };
