# AA Point of Sale — User Guide: Getting Started & Installation

## Overview

AA Point of Sale is a **point-of-sale and inventory management system** designed for wholesale and retail businesses. It handles:

- **Invoice Management** — Purchase, Sale, Return, and Difference invoices
- **Payment Tracking** — Receivables, payables, and cash flow
- **Inventory Control** — Stock levels, item master, carton/unit quantities
- **Reporting** — Sales, purchases, profit, outstanding, stock, ledgers
- **Party Management** — Customers, suppliers, areas, sections, order bookers
- **Print & Queue** — A5 invoice prints, A4 reports, browser print queue

## System Requirements

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10+, Linux (x64), macOS (x64/ARM64) |
| **Memory** | 2 GB RAM minimum (4 GB recommended) |
| **Disk** | 1 GB for application + database |
| **Network** | Local network access (LAN) |
| **Browser** | Chrome 90+, Firefox 88+, Edge 90+, Safari 14+ |

## Installation

### Option 1: Pre-built Binary (Recommended)

1. **Download** the latest release for your platform
2. **Extract** to a folder (e.g., `C:\AA-POS` or `/opt/aa-pos`)
3. **Configure** `traildepot/config.textproto` (see Configuration below)
4. **Run** the server:
   ```bash
   # Windows
   trailbase.exe serve --config traildepot/config.textproto
   
   # Linux/macOS
   ./trailbase serve --config traildepot/config.textproto
   ```

### Option 2: Build from Source

**Prerequisites:**
- Rust 1.80+ (`rustup install stable`)
- Node.js 20+ (for frontend assets, optional)
- WASM target: `rustup target add wasm32-wasip2`

**Build:**
```bash
cd trailbase
cargo build --release --target wasm32-wasip2
# Copy WASM files to traildepot/wasm/
cp target/wasm32-wasip2/release/tb_ah_*.wasm ../traildepot/wasm/
# Build host
cargo build --release
# Run
./target/release/trailbase serve --config traildepot/config.textproto
```

## Configuration

### Main Config: `traildepot/config.textproto`

```textproto
http {
  address: "0.0.0.0:8090"  # Listen on all interfaces, port 8090
  # tls_cert: "path/to/cert.pem"
  # tls_key: "path/to/key.pem"
}

database {
  path: "traildepot/data/main.db"
  # Auto-migrates on startup
}

auth {
  # Token settings
  token_secret: "your-secret-key-here"  # Change in production!
  token_expiry: "24h"
}

# Optional: rate limiting, cors, etc.
```

### Business Info & Logo: `traildepot/runtime/app/config/business.json`

```json
{
  "name": "YOUR BUSINESS NAME",
  "address": "Your Full Address",
  "phone": "Your Phone Number",
  "logo": ""
}
```

This appears on **all printed documents**: invoices (A5), reports (A4), and vouchers/receipts.
See **[Set Up Business Information & Logo (for prints)](#set-up-business-information--logo-for-prints)**
below for the full walkthrough.

### Renderer: `traildepot/runtime/app/config/renderer.json`

```json
{
  "renderer": "component"
}
```
- `"component"` — Uses separate `tb-ah-render-jinja` WASM component (default)
- `"in-process"` — Renders in main guest (for debugging)

## First Run

1. **Start the server** (see Installation)
2. **Open browser** to `http://localhost:8090` (or your configured host:port)
3. **Login** with default credentials:
   - **Email:** `admin@example.com`
   - **Password:** `changeme`
4. **Change password** immediately via Settings → Change Password
5. **Set your business information and logo** (see the next section) so your name and logo appear on
   every printed invoice, report and voucher.

## Set Up Business Information & Logo (for prints)

Every printed document — the A5 invoice, the A5 voucher/receipt, and the A4 report — carries a business
header built from one small config file. Set it once and all prints use it.

### 1. Edit `business.json`

Open `traildepot/runtime/app/config/business.json` (in a distribution, this is
`<dist>\runtime\app\config\business.json`) and set your details:

```json
{
  "name": "YOUR BUSINESS NAME",
  "address": "Shop / street, area, city",
  "phone": "0300-0000000",
  "logo": ""
}
```

| Field | Where it appears on the print |
|-------|-------------------------------|
| `name` | Centered header title (invoices & reports), business name on a voucher |
| `address` | Under the name (invoices & reports), address line on a voucher |
| `phone` | `Contact:` line under the address, phone line on a voucher |
| `logo` | Left of the invoice header / above the report title / top of the voucher (optional) |

### 2. Add a logo (optional)

The logo is **optional**. Leave `"logo": ""` for no logo — this is the default and matches the original
prints.

To add one:

1. **Place the image** in the app's public folder:
   - Source/running-from-repo: `traildepot/runtime/app/public/`
   - Distribution: `<dist>\traildepot\runtime\app\public\`
   - Name it something simple, e.g. `logo.png`.
2. **Point `logo` at it** with the `/static/` URL (the `/static/` prefix serves that public folder):

```json
{
  "name": "YOUR BUSINESS NAME",
  "address": "Shop / street, area, city",
  "phone": "0300-0000000",
  "logo": "/static/logo.png"
}
```

**Logo recommendations**

| Aspect | Guidance |
|--------|----------|
| Format | PNG (transparent background prints cleanest) or JPG/SVG |
| Width | ~200–400 px; it is scaled down and capped at **150 px wide × 56 px tall** |
| Shape | Horizontal/wide logos fit the header band best; square logos also work |
| Filename | No spaces (use `logo.png`, not `my logo.png`) |

> The image is capped by the stylesheet (`max-width: 150px; max-height: 56px`), so an oversized upload
> cannot break the layout. If your logo looks squashed, crop it to a wide aspect ratio before uploading.

### 3. Restart the server

`business.json` is read **once at start-up** (into the app's cached business identity), so a change
takes effect only after a restart. Restart the server (or the control panel's TrailBase **Stop** →
**Start**).

### 4. Verify on a print

1. Open any invoice → **Print** (or a report → printer glyph). The header should show your name, address,
   phone, and — if set — your logo.
2. The logo appears **on the printed sheet** for invoices and reports. On a voucher it is also visible on
   screen (the voucher *is* the printable receipt).

### Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| Old name still prints | Server not restarted, or you edited the depot copy of `runtime` (edit the source and restart) |
| Logo does not appear | `logo` empty/typo; file not in `app/public/`; URL missing the `/static/` prefix; wrong filename case |
| Logo broken-image icon | File not found at the URL — check the path and that the filename has no spaces |
| Logo too large / squashed | Crop to a wide aspect ratio (~200×60); it is capped at 150×56 |

## Default Data

On first run, the database is created with:
- **Party types:** Customer, Supplier
- **Invoice types:** Purchase, Sale, Return, Difference
- **Payment types:** Sending, Receiving, Return
- **Empty tables** for parties, items, areas, sections, companies, bookers

## Importing Legacy Data

If migrating from the legacy v1 system:

1. **Open** `/import` in browser (or navigate via Settings → Import)
2. **Select** the legacy database file
3. **Run** import — processes ~60,000 records, ~8,900 invoices
4. **Verify** data via Reports → Outstanding / Stock Report

**Note:** Import is one-way. Test on a copy first.

## Accessing from Network

### LAN Access
1. Ensure `http.address` is `0.0.0.0:8090` (not `127.0.0.1`)
2. Allow port 8090 in firewall
3. Access via `http://<server-ip>:8090`

### HTTPS (Production)
1. Obtain SSL certificate
2. Update `config.textproto`:
```textproto
http {
  address: "0.0.0.0:443"
  tls_cert: "/path/to/cert.pem"
  tls_key: "/path/to/key.pem"
}
```
3. Restart server

## Backup & Restore

### Backup Database
```bash
# Stop server first!
cp traildepot/data/main.db backups/main-$(date +%Y%m%d).db
# Also backup WAL/SHM if present
cp traildepot/data/main.db-wal backups/
cp traildepot/data/main.db-shm backups/
```

### Restore Database
```bash
# Stop server
cp backups/main-20261012.db traildepot/data/main.db
# Remove WAL/SHM
rm -f traildepot/data/main.db-wal traildepot/data/main.db-shm
# Start server
```

### Automated Backup (cron/systemd)
```bash
# Daily at 2 AM
0 2 * * * /path/to/backup-script.sh
```

## Upgrading

1. **Backup** database (see above)
2. **Stop** server
3. **Replace** binary and WASM files
4. **Start** server — migrations run automatically
5. **Verify** via `/reports/status` and spot-check reports

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8090 in use | Change `http.address` in config.textproto |
| Database locked | Ensure no other process uses `main.db`; remove `.db-wal/.db-shm` |
| Login fails | Check `auth.token_secret` matches; clear browser cookies |
| Print layout wrong | Check `data-paper` attribute; verify `business.json` |
| Slow reports | Run `ANALYZE` on database; check indexes |
| Import fails | Ensure legacy DB is accessible; check logs at `/logs` |

## Logs

- **Server logs:** `traildepot/data/logs.db` (SQLite)
- **Access logs:** Console output (stdout/stderr)
- **Error details:** Browser DevTools → Network → failed requests

## Support

- **Documentation:** This guide + Developer docs in `docs/developer/`
- **Issues:** Check `vault/issues/` for known issues
- **Parity tests:** Run `tools/guest-smoke.mjs` for health check

## Keyboard Shortcuts (Global)

| Key | Action |
|-----|--------|
| `?` | Show help overlay |
| `Alt+N` | New invoice |
| `Alt+P` | Open print queue |
| `Alt+R` | Refresh data |
| `Escape` | Close modal/dropdown |

## Invoice Console Shortcuts

| Keys | Action |
|------|--------|
| `0` | Open invoice picker |
| `999` | New invoice |
| `000` | Advanced item search |
| `↑/↓` | Navigate fields |
| `Enter` | Save / Next field |