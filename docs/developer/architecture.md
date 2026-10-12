# AA Point of Sale — Developer Documentation: Architecture & System Overview

## Executive Summary

AA Point of Sale is a point-of-sale and inventory management system built on **TrailBase** (a PocketBase-compatible backend) with a **WASM-based guest runtime** for application logic. The system replaces a legacy Node.js/Next.js stack with a Rust/WASM architecture that runs entirely in-process with the TrailBase server.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TrailBase Host Process                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   HTTP      │  │   Job       │  │   Database  │  │   KV Store  │ │
│  │   Router    │  │   Scheduler │  │   (SQLite)  │  │   (Shared)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │
│         │                │                │                │        │
│         ▼                ▼                ▼                ▼        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    WASM Guest Runtime                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │ tb-ah-run-js │  │tb-ah-query-  │  │ tb-ah-render-    │   │   │
│  │  │ (main app)   │  │ tbdb (data)  │  │ jinja (renderer) │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Three WASM Guest Components

### 1. `tb-ah-run-js` (Main Application Guest)
**Location:** `trailbase/tb-ah-run-js/`

The primary application guest that handles:
- **HTTP routing** via file-based conventions (`/ahscripts/routes/**/route.{js,ts}`)
- **Request/response handling** with multiple response shapes (HTML, JSON, redirects, static files)
- **JS execution** via QuickJS (`rquickjs`) with TypeScript transpilation (swc)
- **Jinja2 template rendering** via minijinja
- **Job queue** processing (minutely poller for `/jobs/reconcile`)
- **SQLite access** via TrailBase's `db::query` API
- **KV store** for cross-component handoff (spool files, data fingerprints)

Key files:
- `src/lib.rs` — Guest entry point, HTTP route registration, wildcard handler
- `src/runtime.rs` — JS route execution, module loading, TypeScript transform
- `src/api/sqlite.rs` — SQLite query/spool bindings
- `src/api/kv.rs` — Key-value store operations
- `src/spool.rs` — Row spooling for reports
- `src/render.rs` — Template rendering (delegates to renderer component)
- `src/jobs.rs` — Job queue reconciliation

### 2. `tb-ah-query-tbdb` (Data Acquisition Guest)
**Location:** `trailbase/tb-ah-query-tbdb/`

A specialized guest for **read-only data acquisition** that:
- Exposes `/rpc/payload` and `/rpc/table` endpoints
- Executes SQL queries and writes results to KV store as JSONL
- Returns a **handle** (key) rather than the data itself — "pass an address, not a value"
- Used for benchmarking component-boundary costs

Key design: The component boundary cost is measured by pushing rows through KV rather than returning them directly.

### 3. `tb-ah-render-jinja` (Renderer Guest)
**Location:** `trailbase/tb-ah-render-jinja/`

A separate renderer component implementing a **versioned envelope protocol**:
- `POST /render` — Renders Jinja2 templates with context from KV address
- `GET /render/capabilities` — Advertises supported features (extends, include, filters)
- Context is passed by **KV address**, not inline — keeps large payloads off the wire
- Mandatory diagnostics in every response (template name, timing, byte count)

Envelope v1 request:
```json
{
  "aa_render": 1,
  "request_id": "...",
  "template": { "name": "invoices/document.html" },
  "context": { "address": { "store": "kv", "key": "...", "bytes": 1234, "format": "json" } },
  "options": { "paper": "a5" },
  "requires": ["extends", "filters:money"]
}
```

## JS Runtime Application Structure

**Location:** `trailbase/traildepot/runtime/app/`

```
app/
├── compute/           # Pure computation (format, money math)
├── config/            # Static configuration (business.json, renderer.json)
├── lib/               # Core application logic
│   ├── invoices.js    # Invoice reads, entry/grid/console views
│   ├── reports.js     # Data fingerprinting, refresh job
│   ├── spoolreports.js # Spooled report engine (THE report implementation)
│   ├── route-kit.js   # Route helpers (render, write, refs, b64/hex)
│   ├── http.js        # Template rendering helpers
│   ├── management.js  # Management screen entities
│   ├── invoice-*.js   # Invoice lifecycle, sheet, document
│   ├── payments.js    # Payment operations
│   ├── refs.js        # Reference data (parties, items, etc.)
│   ├── data.js        # Base table reads
│   └── ...
├── manifests/         # Page manifests (meta.json per route)
├── pages/             # Route folders (file-based routing)
│   ├── invoices/      # Invoice routes
│   ├── reports/       # Report routes
│   └── ledgers/       # Ledger routes
├── reports/sql/       # Report SQL statements
│   ├── prelude.sql    # Shared CTE chain (composed once)
│   └── reports/*.sql  # Per-report statements
├── sql/               # Ad-hoc SQL (refs, counts, latest business date)
├── views/             # Jinja2 templates
│   ├── layout.html    # App shell with htmx integration
│   ├── invoices/      # Invoice templates
│   ├── reports/       # Report templates
│   └── partials/      # Reusable template fragments
└── public/            # Static assets
    ├── css/           # app.css, theme.css
    └── js/            # Client-side progressive enhancement
```

## File-Based Routing

The application uses **folder-per-route** conventions under `/ahscripts/routes/`:

```
/ahscripts/routes/
├── invoices/
│   ├── entry/route.js          → GET /invoices/{id}/entry
│   ├── grid/route.js           → GET /invoices/{id}/grid
│   ├── console/route.js        → GET /invoices/new?type=N
│   ├── lines/route.js          → POST /invoices/{id}/lines
│   └── ...
├── reports/
│   ├── profit/route.js         → GET /reports/profit
│   ├── payments/route.js       → GET /reports/payments
│   └── ...
└── static/[...path]/route.js   → GET /static/** (catch-all)
```

**Precedence:** literal → `{param}` → `[...rest]` (catch-all only as last segment)

## Data Flow Architecture

### Report Generation (Spool Pattern)

```
1. JS (spoolreports.js)          2. Rust (tb-ah-run-js/spool.rs)    3. Rust (tb-ah-render-jinja)
─────────────────────            ─────────────────────────────      ─────────────────────────────
compose SQL                      Execute SQL                      Read KV by key
params = filters                 Serialize rows → JSONL           Splice rows into context
call sql.spool()                 Write to KV store                Render Jinja2 template
get { key, rows, bytes }         Return handle                    Return HTML
```

**Key insight:** Rows **never enter QuickJS**. The spool writes JSONL to KV; the renderer reads it back and splices into the template context. This avoids the ~1.4s/60k rows component boundary cost.

### Invoice Entry/Console Flow

```
GET /invoices/new?type=1
    → route folder resolves
    → consoleView() builds { options, data }
    → renderRoute() → page() → render.html()
    → Jinja2 template (invoices/console.html)
    → HTML response with htmx attributes
    
POST /invoices/new (create)
    → write() wrapper
    → invoicing.js createInvoice()
    → invalidate() → bumps KV stamp
    → consoleView() re-renders same screen
    → htmx swaps #app-main
```

## Configuration Files

| File | Purpose |
|------|---------|
| `app/config/business.json` | Business name, address, phone for printed docs |
| `app/config/renderer.json` | `"renderer": "component"` or `"in-process"` |
| `app/manifests/entities.json` | Management screen definitions (generated) |
| `app/manifests/page-presets.json` | Paper size per route (A4/A5) |
| `app/manifests/static-mounts.json` | Static file serving mounts |
| `traildepot/config.textproto` | TrailBase server config |

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **No precomputed views** | Freshness required; reports run on demand (SQL executes on current data) |
| **Spool + KV handoff** | Avoids pushing 60k rows through QuickJS; component boundary cost ~1.4s |
| **File-based routing** | No dispatcher; every URL is a folder; enables hot edits without restart |
| **Money = integer paisa** | Float accumulation error; round2 PER LINE before sum |
| **Renderer as component** | Swappable; versioned envelope; capability negotiation |
| **Data fingerprint + KV stamp** | Cross-thread cache invalidation (1.5s TTL + stamp) |
| **htmx + fragment rendering** | Shell rendered once; only #app-main swaps |
| **Progressive enhancement** | All forms work without JS; web components upgrade markup |

## Deployment Model

- **Single binary:** `trailbase` (Rust) with embedded WASM guests
- **Database:** SQLite (`traildepot/data/main.db` ~90MB with 8,927 invoices)
- **Static assets:** Served from `/app/public` via static mounts
- **Offline-first:** No CDN dependencies; htmx, minijinja, all vendors local
- **WASM guests:** Pre-compiled to `traildepot/wasm/*.wasm`

## Legacy vs New System

| Aspect | Legacy (backend/frontend) | New (TrailBase + Guests) |
|--------|---------------------------|--------------------------|
| Runtime | Node.js + Next.js | Rust + WASM (QuickJS) |
| Reports | JS views + materialized | SQL + spool + KV handoff |
| Routing | Express-style | File-based folder routes |
| Templates | React/Next.js | Jinja2 (minijinja) |
| Auth | Custom | TrailBase built-in |
| Deployment | PM2 + Nginx | Single binary |
| Data freshness | Precomputed/cached | On-demand SQL |