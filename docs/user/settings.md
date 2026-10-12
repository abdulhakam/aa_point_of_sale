# AA Point of Sale — User Guide: Settings & Configuration

## Settings Page (`/settings`)

Access via navigation rail → **Settings** (gear icon)

The Settings page has three tabs:
1. **Preferences** — Per-browser UI settings
2. **Data Management** — Import, refresh, cache controls
3. **Account** — Password change

---

## Preferences Tab

All preferences stored in **browser localStorage** (per-device, per-browser).

### Invoice Picker Scope

| Option | Behavior | Best For |
|--------|----------|----------|
| **All Invoices** | Shows all invoices in picker (12,000+) | Invoice lookup, audit |
| **Open Only** | Shows only unpaid invoices | Payment entry, collection |

**Default:** All Invoices

**Performance:** "Open Only" loads faster (fewer rows). Switch based on task.

### Theme

| Option | Description |
|--------|-------------|
| **Light** | Light mode (default) |
| **Dark** | Dark mode |
| **System** | Follows OS preference |

**Applies immediately** — no reload needed.

### Items Per Page

| Option | Rows per page |
|--------|---------------|
| 100 | Compact |
| 300 | **Default** |
| 500 | Medium |
| 1000 | Large (slower render) |

Applies to: Invoice List, Reports, Management tables, Ledgers.

---

## Data Management Tab

### Import from v1 (Legacy Migration)

**One-time migration** from legacy v1 database.

**Steps:**
1. Click **Choose File** → Select legacy database file
2. Click **Import**
3. Progress bar shows: Records processed / Invoices imported
4. On complete: Summary with counts

**What imports:**
- ~60,000 records
- ~8,900 invoices
- Parties, items, areas, sections, companies, bookers
- Payments, transactions, expenses
- Legacy categories → mapped to companies

**What does NOT import:**
- Orders (feature removed)
- Documents (stored as file uploads now)
- Legacy views (replaced by SQL reports)

**After import:**
- All invoices have `completed = 0` (legacy flag meaningless)
- Invoice maker attributed to logged-in user
- Run **Refresh Data** to sync reference cache

**⚠️ Warning:** Import is **destructive** — run on fresh database only.

### Refresh Data

Forces **full data fingerprint refresh**:

1. Probes all 17 tables for `count:newest_updated`
2. Updates shared KV stamp (`aa:data-stamp`)
3. Invalidates all page caches
4. Triggers client refdb reload on next page load

**When to use:**
- After direct database edits
- After import
- If reference dropdowns show stale data
- If report totals seem stale

**Alternative:** Click navbar version indicator (dot) → same action.

### Clear Caches

Clears **all IndexedDB caches** in this browser:

| Cache | Purpose | Effect of Clear |
|-------|---------|-----------------|
| **RefDB** | Reference lists (parties, items, etc.) | Next page load re-fetches all |
| **PageCache** | Rendered HTML fragments | Next nav fetches from server |
| **InvoiceDB** | Invoice number lookup | Console picker re-fetches |

**When to use:**
- After major data changes
- If UI shows stale data
- "Nuclear option" for cache issues

---

## Account Tab

### Change Password

**Fields:**
- Current Password
- New Password (min 8 chars)
- Confirm New Password

**Requirements:**
- Minimum 8 characters
- At least one letter and one number
- Different from current password

**On success:** Session refreshed, stays logged in.

---

## Configuration Files (Admin)

### Business Information

**File:** `traildepot/runtime/app/config/business.json`

```json
{
  "name": "YOUR BUSINESS NAME",
  "address": "Your Full Address",
  "phone": "Your Phone Number"
}
```

**Appears on:**
- All printed invoices (A5)
- All printed reports (A4)
- All vouchers/DA
- Dashboard header

**Change requires:** Server restart.

### Renderer Selection

**File:** `traildepot/runtime/app/config/renderer.json`

```json
{
  "renderer": "component"
}
```

| Value | Description |
|-------|-------------|
| `component` | **Default** — Uses separate `tb-ah-render-jinja` WASM component |
| `in-process` | Renders in main guest (debugging only) |

**Change requires:** Server restart.

### Server Configuration

**File:** `traildepot/config.textproto`

```textproto
http {
  address: "0.0.0.0:8090"  # Host:port
  # tls_cert: "path/to/cert.pem"
  # tls_key: "path/to/key.pem"
}

database {
  path: "traildepot/data/main.db"
}

auth {
  token_secret: "CHANGE-THIS-IN-PRODUCTION"
  token_expiry: "24h"
}
```

**Key settings:**
- `address` — `0.0.0.0` for LAN access, `127.0.0.1` for localhost only
- `token_secret` — **Must change** in production (used for JWT signing)
- `token_expiry` — Session lifetime
- TLS — Uncomment for HTTPS

**Change requires:** Server restart.

### Entity Definitions (Management Screens)

**File:** `traildepot/runtime/app/manifests/entities.json`

**Generated from:** `app/lib/entities.js` (developer edit only)

**Controls:** Management screen fields, columns, relations.

**Do not edit manually** — regenerated on code change.

### Page Presets (Paper Size)

**File:** `traildepot/runtime/app/manifests/page-presets.json`

```json
{
  "invoices/document": "a5",
  "invoices/entry": "a5",
  "cashmemo/da": "a4",
  "cashmemo/vouchers": "a5",
  "reports/*": "a4",
  "reports/ledgers/*": "a4"
}
```

**Values:** `"a5"` | `"a4"` | `""` (default)

**Change requires:** Server restart.

### Static Mounts

**File:** `traildepot/runtime/app/manifests/static-mounts.json`

```json
{
  "mounts": [
    { "prefix": "/static/", "dir": "public", "indexFallback": true }
  ],
  "singleFiles": [
    { "path": "/favicon.ico", "file": "public/favicon.svg" }
  ]
}
```

**Change requires:** Server restart.

---

## User Management (Admin)

### TrailBase Admin UI

Access: `http://your-host:8090/_/`

**Default credentials:** Set via `TR_BASE_ADMIN_EMAIL` / `TR_BASE_ADMIN_PASSWORD` env vars or first-run prompt.

**Admin UI provides:**
- User management (create, edit, delete, roles)
- Collection schema viewer
- Database query tool
- Logs viewer
- Backup/restore

### Creating Users

1. Open Admin UI → **Users**
2. Click **New User**
3. Fill: Email, Password, Name
4. **Role:** `editor` (full access) or `viewer` (read-only)
5. Save

### Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full admin UI + app access |
| `editor` | App: create/edit/delete all |
| `viewer` | App: read-only |

---

## Backup & Restore (Admin)

### Manual Backup

```bash
# Stop server
systemctl stop aa-pos  # or Ctrl+C

# Backup database + WAL
cp traildepot/data/main.db backups/main-$(date +%Y%m%d-%H%M).db
cp traildepot/data/main.db-wal backups/
cp traildepot/data/main.db-shm backups/

# Backup config
cp -r traildepot/runtime/app/config backups/config-$(date +%Y%m%d)

# Start server
systemctl start aa-pos
```

### Automated Backup (systemd timer)

**File:** `/etc/systemd/system/aa-pos-backup.service`

```ini
[Unit]
Description=AA POS Database Backup

[Service]
Type=oneshot
ExecStart=/opt/aa-pos/backup.sh
User=aa-pos
```

**File:** `/etc/systemd/system/aa-pos-backup.timer`

```ini
[Unit]
Description=Daily AA POS Backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

**File:** `/opt/aa-pos/backup.sh`

```bash
#!/bin/bash
set -e
DATE=$(date +%Y%m%d-%H%M)
BACKUP_DIR="/opt/aa-pos/backups"
DB_DIR="/opt/aa-pos/traildepot/data"

# Stop server (optional but safer)
systemctl stop aa-pos

# Copy database
cp "$DB_DIR/main.db" "$BACKUP_DIR/main-$DATE.db"
cp "$DB_DIR/main.db-wal" "$BACKUP_DIR/" 2>/dev/null || true
cp "$DB_DIR/main.db-shm" "$BACKUP_DIR/" 2>/dev/null || true

# Keep last 30 days
find "$BACKUP_DIR" -name "main-*.db" -mtime +30 -delete

# Start server
systemctl start aa-pos
```

Enable:
```bash
chmod +x /opt/aa-pos/backup.sh
systemctl enable --now aa-pos-backup.timer
```

### Restore

```bash
# Stop server
systemctl stop aa-pos

# Restore database
cp backups/main-20261012-0200.db traildepot/data/main.db
rm -f traildepot/data/main.db-wal traildepot/data/main.db-shm

# Restore config (if needed)
cp -r backups/config-20261012/* traildepot/runtime/app/config/

# Start server
systemctl start aa-pos
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TR_BASE_ADMIN_EMAIL` | Admin UI email | — |
| `TR_BASE_ADMIN_PASSWORD` | Admin UI password | — |
| `RUST_LOG` | Log level | `info` |
| `TRAILBASE_CONFIG` | Config file path | `traildepot/config.textproto` |

---

## Logs & Monitoring

### Log Locations

| Log | Location |
|-----|----------|
| **Server logs** | `traildepot/data/logs.db` (SQLite) |
| **Access logs** | Stdout (systemd journal) |
| **Error logs** | Stdout + `logs.db` |

### Viewing Logs

```bash
# Systemd journal
journalctl -u aa-pos -f

# SQLite logs (if needed)
sqlite3 traildepot/data/logs.db "SELECT * FROM logs ORDER BY time DESC LIMIT 50;"
```

### Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /api/health` | TrailBase health |
| `GET /reports/status` | Report engine status (fingerprint, build, last refresh) |

### Monitoring Alerts

**Recommended alerts:**
- Server process down
- Disk space < 10%
- Database size > 500MB
- Report status `ready: false` for > 5 min
- Job indicator stuck in `error` phase

---

## Performance Tuning

### Database

```sql
-- Run periodically (monthly)
ANALYZE;

-- Check index usage
EXPLAIN QUERY PLAN SELECT * FROM invoices WHERE party = ? AND dated >= ?;
```

### Server Resources

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 2 GB | 4+ GB |
| Disk | SSD | NVMe SSD |

### Report Performance

- Narrow date ranges
- Use "Unpaid Only" for outstanding
- Avoid "All" type filter on large reports
- Background refresh runs minutely

---

## Troubleshooting Configuration

| Issue | Check |
|-------|-------|
| **Can't access from LAN** | `http.address = "0.0.0.0:8090"` in config.textproto |
| **HTTPS not working** | `tls_cert`/`tls_key` paths correct? Cert valid? |
| **Business info not on prints** | `business.json` valid JSON? Server restarted? |
| **Theme not applying** | Browser cache? Hard refresh (Ctrl+F5) |
| **Import fails** | Legacy DB accessible? Permissions? Disk space? |
| **Users can't login** | `token_secret` matches? Clock sync? |

---

## Security Checklist

- [ ] Change `auth.token_secret` in `config.textproto`
- [ ] Use HTTPS in production (TLS cert/key)
- [ ] Restrict admin UI (`/_/`) to VPN/localhost
- [ ] Strong admin passwords
- [ ] Regular database backups
- [ ] Monitor disk space
- [ ] Keep TrailBase updated
- [ ] Review user roles quarterly