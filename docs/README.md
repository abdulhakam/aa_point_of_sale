# AA Point of Sale — Documentation Index

This directory contains comprehensive documentation for the AA Point of Sale system, generated from code analysis.

## Developer Documentation (`docs/developer/`)

| Document | Description |
|----------|-------------|
| [Architecture & System Overview](developer/architecture.md) | High-level architecture, three WASM guests, data flow, routing, key decisions |
| [Data Models & Database Schema](developer/data-models.md) | Complete schema with tables, indexes, triggers, conventions, migrations |
| [API Reference & Runtime](developer/api-reference.md) | Host endpoints, guest APIs, JS runtime globals, route kit, web components, hotkeys |
| [Frontend Components & Views](developer/frontend.md) | Template system, layout, partials, web components, CSS, htmx integration |
| [Reports & SQL Engine](developer/reports.md) | Spool architecture, prelude CTEs, report manifests, totals engine, parity verification |
| [Guide: Creating New Reports](developer/creating-reports.md) | Step-by-step report creation: SQL, manifests, calculations, filters, totals, JSON output |
| [Guide: Creating New UI / Views](developer/creating-views.md) | Step-by-step screen creation: routes, templates, declarative pages, components, CSS |
| [Guide: Editing Print Layouts](developer/print-layouts.md) | Editing layouts of reports, invoices and vouchers/receipts: paper sizes, columns, totals, print queue |

## User Documentation (`docs/user/`)

| Document | Description |
|----------|-------------|
| [Getting Started & Installation](user/getting-started.md) | Requirements, installation, configuration, first run, backup, troubleshooting |
| [Core Features Guide](user/core-features.md) | Navigation, dashboard, invoices, reports, ledgers, payments, cash memo, inventory, management, settings, print, search |
| [Invoice Management](user/invoice-management.md) | Invoice types, lifecycle, creation methods, header/line fields, discounts, editing, console, printing, workflows |
| [Reports & Ledgers](user/reports-ledgers.md) | All 14 reports + 4 ledgers with filters, columns, totals, use cases, printing, common patterns |
| [Settings & Configuration](user/settings.md) | User preferences, data management, admin config files, user management, backup/restore, monitoring |

## Quick Navigation

### For Developers
- **Start here:** [Architecture](developer/architecture.md) → [API Reference](developer/api-reference.md)
- **Database:** [Data Models](developer/data-models.md)
- **Reports:** [Reports Engine](developer/reports.md) → **[Guide: Creating New Reports](developer/creating-reports.md)**
- **Frontend:** [Components](developer/frontend.md) → **[Guide: Creating New UI / Views](developer/creating-views.md)**
- **Print / paper:** **[Guide: Editing Print Layouts](developer/print-layouts.md)**

### For Users
- **Start here:** [Getting Started](user/getting-started.md)
- **Daily work:** [Core Features](user/core-features.md) → [Invoice Management](user/invoice-management.md)
- **Analysis:** [Reports & Ledgers](user/reports-ledgers.md)
- **Admin:** [Settings](user/settings.md)

## System Overview

**Tech Stack:**
- **Backend:** TrailBase (Rust) + SQLite
- **Runtime:** 3 WASM guests (QuickJS + minijinja)
- **Frontend:** Jinja2 templates + htmx + vanilla JS (progressive enhancement)
- **Architecture:** File-based routing, spool-based reports, KV handoff

**Key Directories:**
```
trailbase/
├── tb-ah-run-js/          # Main app guest
├── tb-ah-query-tbdb/      # Data acquisition guest
├── tb-ah-render-jinja/    # Renderer guest
└── traildepot/
    ├── runtime/app/       # JS application
    │   ├── lib/           # Core logic (invoices, reports, etc.)
    │   ├── reports/sql/   # Report SQL + prelude
    │   ├── views/         # Jinja2 templates
    │   └── public/        # Static assets (CSS, JS components)
    └── data/main.db       # SQLite database (~90MB)
```

## Conventions

- **Money:** Integer paisa (×100, round half-up, ÷100) — round PER LINE before sum
- **IDs:** UUIDv7 BLOB in DB, URL-safe base64 in transport
- **Dates:** Business date (`dated`) falls back to `created`; PocketBase format
- **Soft delete:** `deleted = 0/1` flag, never hard delete
- **No precomputation:** Reports run on-demand SQL on live data

## Parity & Verification

- **Functional parity** with legacy (not visual)
- **Verification tools:** `tools/verify-spool-reports.mjs` (EXACT/SOUND/CORROBORATED)
- **Report totals:** Paisa arithmetic verified against independent construction
- **UI parity:** Visual regression via `tools/ui-parity-report.mjs`

---

*Generated from code analysis — no vault access used.*